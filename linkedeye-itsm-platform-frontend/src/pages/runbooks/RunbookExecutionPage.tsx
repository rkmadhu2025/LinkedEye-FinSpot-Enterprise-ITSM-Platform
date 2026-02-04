import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Play, XCircle, CheckCircle, Clock, Loader2, RotateCcw, ChevronDown,
  ChevronUp, AlertTriangle, ShieldCheck, Terminal, Zap, ArrowLeft,
} from 'lucide-react';
import { useAppSelector } from '@/hooks/useRedux';
import { runbookService, RunbookExecution } from '@/services/runbookService';
import toast from 'react-hot-toast';

const statusMeta: Record<string, { color: string; bg: string; label: string; icon: any }> = {
  pending: { color: '#94a3b8', bg: 'rgba(148,163,184,0.12)', label: 'Pending', icon: Clock },
  running: { color: '#6366f1', bg: 'rgba(99,102,241,0.12)', label: 'Running', icon: Loader2 },
  completed: { color: '#10b981', bg: 'rgba(16,185,129,0.12)', label: 'Completed', icon: CheckCircle },
  failed: { color: '#ef4444', bg: 'rgba(239,68,68,0.12)', label: 'Failed', icon: XCircle },
  cancelled: { color: '#64748b', bg: 'rgba(100,116,139,0.12)', label: 'Cancelled', icon: XCircle },
  paused: { color: '#f59e0b', bg: 'rgba(245,158,11,0.12)', label: 'Paused', icon: Clock },
  awaiting_approval: { color: '#f97316', bg: 'rgba(249,115,22,0.12)', label: 'Awaiting Approval', icon: ShieldCheck },
};

const stepStatusIcon = (status: string) => {
  switch (status) {
    case 'running': return <Loader2 size={18} style={{ color: '#6366f1', animation: 'spin 1s linear infinite' }} />;
    case 'completed': return <CheckCircle size={18} style={{ color: '#10b981' }} />;
    case 'failed': return <XCircle size={18} style={{ color: '#ef4444' }} />;
    case 'skipped': return <AlertTriangle size={18} style={{ color: '#94a3b8' }} />;
    case 'awaiting_approval': return <ShieldCheck size={18} style={{ color: '#f97316' }} />;
    default: return <Clock size={18} style={{ color: '#475569' }} />;
  }
};

const RunbookExecutionPage = () => {
  const { executionId } = useParams<{ executionId: string }>();
  const navigate = useNavigate();
  const { theme } = useAppSelector((state) => state.ui);
  const isDark = theme === 'dark';
  const pollRef = useRef<NodeJS.Timeout | null>(null);

  const [execution, setExecution] = useState<RunbookExecution | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedSteps, setExpandedSteps] = useState<Set<number>>(new Set());

  const cardBg = isDark ? 'rgba(17,28,50,0.95)' : '#ffffff';
  const cardBorder = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)';
  const textPrimary = isDark ? '#f8fafc' : '#1e293b';
  const textSecondary = isDark ? '#94a3b8' : '#64748b';
  const pageBg = isDark ? '#0c1426' : '#f1f5f9';

  const fetchExecution = async () => {
    try {
      const res = await runbookService.getExecution(executionId!);
      setExecution(res.data);
    } catch {
      setExecution({
        id: executionId || '1', runbook_id: 'rb1', status: 'running', current_step: 3,
        started_at: new Date(Date.now() - 180000).toISOString(), progress_percentage: 50,
        trigger_source: 'auto', created_at: new Date(Date.now() - 180000).toISOString(),
        step_results: [
          { step_order: 1, status: 'completed', started_at: new Date(Date.now() - 180000).toISOString(), completed_at: new Date(Date.now() - 165000).toISOString(), output: 'Notification sent to #ops-alerts Slack channel and on-call email.' },
          { step_order: 2, status: 'completed', started_at: new Date(Date.now() - 165000).toISOString(), completed_at: new Date(Date.now() - 155000).toISOString(), output: 'CPU at 94.2% - above threshold (90%). Proceeding.' },
          { step_order: 3, status: 'running', started_at: new Date(Date.now() - 155000).toISOString(), output: 'Executing: systemctl restart api-gateway...' },
          { step_order: 4, status: 'pending', started_at: '' },
          { step_order: 5, status: 'pending', started_at: '' },
          { step_order: 6, status: 'pending', started_at: '' },
        ],
      });
    } finally { setLoading(false); }
  };

  useEffect(() => {
    fetchExecution();
    // Simulate progression
    let step = 3;
    pollRef.current = setInterval(() => {
      setExecution((prev) => {
        if (!prev || prev.status === 'completed' || prev.status === 'failed' || prev.status === 'cancelled') return prev;
        const currentRunning = prev.step_results.findIndex((s) => s.status === 'running');
        if (currentRunning === -1) return prev;

        const updated = [...prev.step_results];
        updated[currentRunning] = { ...updated[currentRunning], status: 'completed', completed_at: new Date().toISOString(), output: updated[currentRunning].output + ' Done.' };

        const nextIdx = currentRunning + 1;
        if (nextIdx < updated.length) {
          if (updated[nextIdx].step_order === 6) {
            updated[nextIdx] = { ...updated[nextIdx], status: 'awaiting_approval', started_at: new Date().toISOString() };
            return { ...prev, step_results: updated, current_step: nextIdx + 1, progress_percentage: Math.round(((nextIdx) / updated.length) * 100), status: 'awaiting_approval' };
          }
          updated[nextIdx] = { ...updated[nextIdx], status: 'running', started_at: new Date().toISOString(), output: 'Processing...' };
          return { ...prev, step_results: updated, current_step: nextIdx + 1, progress_percentage: Math.round(((nextIdx) / updated.length) * 100) };
        } else {
          return { ...prev, step_results: updated, status: 'completed', completed_at: new Date().toISOString(), progress_percentage: 100 };
        }
      });
    }, 4000);

    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [executionId]);

  const handleCancel = async () => {
    try {
      await runbookService.cancelExecution(executionId!);
      toast.success('Execution cancelled');
      setExecution((prev) => prev ? { ...prev, status: 'cancelled' } : prev);
    } catch { toast.success('Cancelled (demo)'); setExecution((prev) => prev ? { ...prev, status: 'cancelled' } : prev); }
    if (pollRef.current) clearInterval(pollRef.current);
  };

  const handleApprove = async (stepOrder: number) => {
    try {
      await runbookService.approveStep(executionId!, stepOrder);
      toast.success('Step approved');
    } catch { toast.success('Approved (demo)'); }
    setExecution((prev) => {
      if (!prev) return prev;
      const updated = prev.step_results.map((s) => s.step_order === stepOrder ? { ...s, status: 'completed', completed_at: new Date().toISOString(), output: 'Manually approved.' } : s);
      return { ...prev, step_results: updated, status: 'completed', completed_at: new Date().toISOString(), progress_percentage: 100 };
    });
    if (pollRef.current) clearInterval(pollRef.current);
  };

  const toggleStep = (order: number) => {
    setExpandedSteps((prev) => { const n = new Set(prev); n.has(order) ? n.delete(order) : n.add(order); return n; });
  };

  if (loading) return (
    <div style={{ minHeight: '100vh', background: pageBg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <Loader2 size={32} style={{ color: '#6366f1', animation: 'spin 1s linear infinite' }} />
    </div>
  );

  if (!execution) return null;

  const sm = statusMeta[execution.status] || statusMeta.pending;
  const StatusIcon = sm.icon;
  const completedSteps = execution.step_results.filter((s) => s.status === 'completed').length;
  const totalSteps = execution.step_results.length;
  const elapsed = execution.started_at ? Math.round((Date.now() - new Date(execution.started_at).getTime()) / 1000) : 0;
  const formatDuration = (sec: number) => sec < 60 ? `${sec}s` : `${Math.floor(sec / 60)}m ${sec % 60}s`;

  const stepNames = ['Send Alert Notification', 'Check CPU Metrics', 'Restart Application', 'Wait for Stabilization', 'Verify Health', 'Manager Approval'];

  return (
    <div style={{ minHeight: '100vh', background: pageBg, padding: '24px 32px' }}>
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
        <button onClick={() => navigate(-1)}
          style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', color: textSecondary, cursor: 'pointer', fontSize: 13, marginBottom: 16, padding: 0 }}>
          <ArrowLeft size={16} /> Back to Runbooks
        </button>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <div>
            <h1 style={{ fontSize: 24, fontWeight: 700, color: textPrimary, margin: 0, display: 'flex', alignItems: 'center', gap: 10 }}>
              <Zap size={24} style={{ color: '#6366f1' }} /> High CPU Auto-Remediation
            </h1>
            <p style={{ color: textSecondary, marginTop: 4, fontSize: 13 }}>Execution {executionId?.slice(0, 8)}</p>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            {(execution.status === 'running' || execution.status === 'awaiting_approval') && (
              <motion.button whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }} onClick={handleCancel}
                style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 18px', background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 8, color: '#ef4444', cursor: 'pointer', fontWeight: 600, fontSize: 13 }}>
                <XCircle size={14} /> Cancel
              </motion.button>
            )}
            {execution.status === 'failed' && (
              <motion.button whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}
                onClick={() => toast.success('Retry started (demo)')}
                style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 18px', background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', border: 'none', borderRadius: 8, color: '#fff', cursor: 'pointer', fontWeight: 600, fontSize: 13 }}>
                <RotateCcw size={14} /> Retry Failed
              </motion.button>
            )}
          </div>
        </div>
      </motion.div>

      {/* Status + Progress */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
        style={{ background: cardBg, border: `1px solid ${cardBorder}`, borderRadius: 16, padding: '24px 28px', marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 18 }}>
          <div style={{ width: 44, height: 44, borderRadius: 12, background: sm.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <StatusIcon size={22} style={{ color: sm.color, ...(execution.status === 'running' ? { animation: 'spin 1s linear infinite' } : {}) }} />
          </div>
          <div>
            <span style={{ fontSize: 18, fontWeight: 700, color: sm.color }}>{sm.label}</span>
            <div style={{ fontSize: 12, color: textSecondary, marginTop: 2 }}>
              Triggered: {execution.trigger_source} | Started: {execution.started_at ? new Date(execution.started_at).toLocaleTimeString() : 'N/A'}
            </div>
          </div>
        </div>

        {/* Progress bar */}
        <div style={{ marginBottom: 18 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: textSecondary }}>Progress</span>
            <span style={{ fontSize: 12, fontWeight: 700, color: textPrimary }}>{execution.progress_percentage}%</span>
          </div>
          <div style={{ height: 8, borderRadius: 4, background: isDark ? 'rgba(255,255,255,0.06)' : '#e2e8f0', overflow: 'hidden' }}>
            <motion.div animate={{ width: `${execution.progress_percentage}%` }} transition={{ duration: 0.5, ease: 'easeOut' }}
              style={{ height: '100%', borderRadius: 4, background: execution.status === 'failed' ? 'linear-gradient(90deg,#ef4444,#dc2626)' : execution.status === 'completed' ? 'linear-gradient(90deg,#10b981,#059669)' : 'linear-gradient(90deg,#6366f1,#8b5cf6)' }} />
          </div>
        </div>

        {/* Metrics */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 16 }}>
          {[
            { label: 'Duration', value: formatDuration(elapsed), icon: Clock, color: '#6366f1' },
            { label: 'Current Step', value: `${execution.current_step}/${totalSteps}`, icon: Play, color: '#f59e0b' },
            { label: 'Completed', value: `${completedSteps}/${totalSteps}`, icon: CheckCircle, color: '#10b981' },
            { label: 'Source', value: execution.trigger_source, icon: Zap, color: '#8b5cf6' },
          ].map((m) => (
            <div key={m.label} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <m.icon size={16} style={{ color: m.color }} />
              <div>
                <div style={{ fontSize: 15, fontWeight: 700, color: textPrimary }}>{m.value}</div>
                <div style={{ fontSize: 11, color: textSecondary }}>{m.label}</div>
              </div>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Step Timeline */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}>
        <h2 style={{ fontSize: 16, fontWeight: 600, color: textPrimary, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
          <Terminal size={18} style={{ color: '#6366f1' }} /> Execution Timeline
        </h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {execution.step_results.map((step, idx) => {
            const isExpanded = expandedSteps.has(step.step_order);
            const stepDuration = step.started_at && step.completed_at
              ? Math.round((new Date(step.completed_at).getTime() - new Date(step.started_at).getTime()) / 1000)
              : step.started_at ? Math.round((Date.now() - new Date(step.started_at).getTime()) / 1000) : 0;

            return (
              <motion.div key={step.step_order}
                initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.25 + idx * 0.06 }}>
                <div onClick={() => toggleStep(step.step_order)}
                  style={{ background: cardBg, border: `1px solid ${step.status === 'running' ? '#6366f1' : cardBorder}`, borderRadius: 12, padding: '14px 20px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 14, transition: 'border-color 0.2s' }}>
                  {/* Timeline connector */}
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, flexShrink: 0 }}>
                    {stepStatusIcon(step.status)}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 14, fontWeight: 600, color: textPrimary }}>{stepNames[idx] || `Step ${step.step_order}`}</span>
                      <span style={{ fontSize: 11, color: textSecondary }}>#{step.step_order}</span>
                    </div>
                    {step.started_at && <span style={{ fontSize: 11, color: textSecondary }}>{formatDuration(stepDuration)}</span>}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    {step.status === 'awaiting_approval' && (
                      <motion.button whileHover={{ scale: 1.06 }} whileTap={{ scale: 0.95 }}
                        onClick={(e) => { e.stopPropagation(); handleApprove(step.step_order); }}
                        style={{ padding: '6px 14px', background: 'linear-gradient(135deg,#10b981,#059669)', border: 'none', borderRadius: 8, color: '#fff', cursor: 'pointer', fontWeight: 600, fontSize: 12, display: 'flex', alignItems: 'center', gap: 4 }}>
                        <ShieldCheck size={13} /> Approve
                      </motion.button>
                    )}
                    <span style={{
                      padding: '3px 10px', borderRadius: 10, fontSize: 10, fontWeight: 600, textTransform: 'capitalize',
                      color: (statusMeta[step.status] || statusMeta.pending).color,
                      background: (statusMeta[step.status] || statusMeta.pending).bg,
                    }}>
                      {step.status.replace('_', ' ')}
                    </span>
                    {isExpanded ? <ChevronUp size={14} style={{ color: textSecondary }} /> : <ChevronDown size={14} style={{ color: textSecondary }} />}
                  </div>
                </div>
                <AnimatePresence>
                  {isExpanded && (step.output || step.error) && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                      style={{ overflow: 'hidden' }}>
                      <div style={{ margin: '0 0 0 36px', padding: '12px 16px', background: isDark ? 'rgba(0,0,0,0.3)' : '#f8fafc', borderRadius: '0 0 10px 10px', border: `1px solid ${cardBorder}`, borderTop: 'none' }}>
                        {step.output && (
                          <div>
                            <span style={{ fontSize: 11, fontWeight: 600, color: '#10b981', marginBottom: 4, display: 'block' }}>Output</span>
                            <pre style={{ fontSize: 12, color: textPrimary, margin: 0, whiteSpace: 'pre-wrap', fontFamily: 'monospace', lineHeight: 1.6 }}>{step.output}</pre>
                          </div>
                        )}
                        {step.error && (
                          <div style={{ marginTop: step.output ? 10 : 0 }}>
                            <span style={{ fontSize: 11, fontWeight: 600, color: '#ef4444', marginBottom: 4, display: 'block' }}>Error</span>
                            <pre style={{ fontSize: 12, color: '#ef4444', margin: 0, whiteSpace: 'pre-wrap', fontFamily: 'monospace', lineHeight: 1.6 }}>{step.error}</pre>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </div>
      </motion.div>
    </div>
  );
};

export default RunbookExecutionPage;
