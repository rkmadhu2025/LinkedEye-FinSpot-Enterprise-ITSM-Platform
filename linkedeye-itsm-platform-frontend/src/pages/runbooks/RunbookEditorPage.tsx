import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence, Reorder } from 'framer-motion';
import {
  Save, Play, Eye, Plus, Trash2, GripVertical, ChevronDown, Settings,
  Bell, UserCheck, ArrowUpRight, Terminal, Globe, Clock, GitBranch,
  ShieldCheck, Loader2, CheckCircle, X, Zap, AlertTriangle, FileText,
} from 'lucide-react';
import { useAppSelector } from '@/hooks/useRedux';
import { runbookService, RunbookData, RunbookStep } from '@/services/runbookService';
import toast from 'react-hot-toast';

const actionTypes: { value: string; label: string; color: string; icon: any }[] = [
  { value: 'notification', label: 'Send Notification', color: '#3b82f6', icon: Bell },
  { value: 'auto_assign', label: 'Auto Assign', color: '#10b981', icon: UserCheck },
  { value: 'escalate', label: 'Escalate', color: '#f97316', icon: ArrowUpRight },
  { value: 'run_script', label: 'Run Script', color: '#8b5cf6', icon: Terminal },
  { value: 'http_request', label: 'HTTP Request', color: '#06b6d4', icon: Globe },
  { value: 'wait', label: 'Wait / Delay', color: '#94a3b8', icon: Clock },
  { value: 'condition', label: 'Condition', color: '#eab308', icon: GitBranch },
  { value: 'manual_approval', label: 'Manual Approval', color: '#ef4444', icon: ShieldCheck },
];

const getActionMeta = (type: string) => actionTypes.find((a) => a.value === type) || actionTypes[0];

const severityOptions = ['critical', 'high', 'medium', 'low'];
const categoryOptions = ['performance', 'storage', 'database', 'network', 'security', 'application'];

const RunbookEditorPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { theme } = useAppSelector((state) => state.ui);
  const isDark = theme === 'dark';

  const [runbook, setRunbook] = useState<RunbookData | null>(null);
  const [steps, setSteps] = useState<RunbookStep[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedStep, setSelectedStep] = useState<string | null>(null);
  const [editingName, setEditingName] = useState(false);
  const [showAddMenu, setShowAddMenu] = useState<number | null>(null);

  const cardBg = isDark ? 'rgba(17,28,50,0.95)' : '#ffffff';
  const cardBorder = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)';
  const textPrimary = isDark ? '#f8fafc' : '#1e293b';
  const textSecondary = isDark ? '#94a3b8' : '#64748b';
  const pageBg = isDark ? '#0c1426' : '#f1f5f9';
  const inputBg = isDark ? 'rgba(255,255,255,0.04)' : '#f8fafc';

  useEffect(() => {
    const load = async () => {
      try {
        if (id) {
          const res = await runbookService.getRunbook(id);
          setRunbook(res.data);
          setSteps(res.data.steps || []);
        }
      } catch {
        setRunbook({ id: id || 'new', name: 'High CPU Auto-Remediation', description: 'Automatically restarts services when CPU > 90%', status: 'draft', version: 1, trigger_conditions: { severity: ['critical', 'high'], category: ['performance'] }, auto_trigger: true, tags: ['cpu', 'auto-remediation'], category: 'Performance', execution_count: 0, avg_execution_time_seconds: 0, success_rate: 0, step_count: 0, created_at: new Date().toISOString(), updated_at: new Date().toISOString() });
        setSteps([
          { id: 's1', step_order: 1, name: 'Send Alert Notification', description: 'Notify on-call team via Slack and email', action_type: 'notification', configuration: { channels: ['slack', 'email'], template: 'cpu_alert' }, timeout_seconds: 30, retry_count: 2, on_failure: 'continue', is_optional: false },
          { id: 's2', step_order: 2, name: 'Check CPU Metrics', description: 'Verify CPU is still above threshold', action_type: 'condition', configuration: { metric: 'cpu_percent', operator: '>', value: 90 }, timeout_seconds: 15, retry_count: 0, on_failure: 'abort', is_optional: false },
          { id: 's3', step_order: 3, name: 'Restart Application', description: 'Graceful restart of the affected service', action_type: 'run_script', configuration: { script: 'systemctl restart $SERVICE_NAME', run_as: 'root' }, timeout_seconds: 120, retry_count: 1, on_failure: 'abort', is_optional: false },
          { id: 's4', step_order: 4, name: 'Wait for Stabilization', description: 'Wait 60 seconds for service to stabilize', action_type: 'wait', configuration: { duration_seconds: 60 }, timeout_seconds: 90, retry_count: 0, on_failure: 'continue', is_optional: false },
          { id: 's5', step_order: 5, name: 'Verify Health', description: 'Run health check on restarted service', action_type: 'http_request', configuration: { url: 'http://localhost:8080/health', method: 'GET', expected_status: 200 }, timeout_seconds: 30, retry_count: 3, on_failure: 'escalate', is_optional: false },
          { id: 's6', step_order: 6, name: 'Manager Approval', description: 'Require manager sign-off if escalation needed', action_type: 'manual_approval', configuration: { approvers: ['manager@company.com'] }, timeout_seconds: 3600, retry_count: 0, on_failure: 'abort', is_optional: true },
        ]);
      } finally { setLoading(false); }
    };
    load();
  }, [id]);

  const handleSave = async () => {
    if (!runbook) return;
    setSaving(true);
    try {
      if (id) await runbookService.updateRunbook(id, runbook);
      else await runbookService.createRunbook({ name: runbook.name, description: runbook.description, category: runbook.category, tags: runbook.tags, trigger_conditions: runbook.trigger_conditions });
      toast.success('Saved');
    } catch { toast.success('Saved (demo)'); }
    setSaving(false);
  };

  const addStep = (afterIndex: number, actionType: string) => {
    const meta = getActionMeta(actionType);
    const newStep: RunbookStep = {
      id: `s_${Date.now()}`, step_order: afterIndex + 2, name: meta.label,
      description: '', action_type: actionType, configuration: {}, timeout_seconds: 60,
      retry_count: 0, on_failure: 'abort', is_optional: false,
    };
    const updated = [...steps];
    updated.splice(afterIndex + 1, 0, newStep);
    setSteps(updated.map((s, i) => ({ ...s, step_order: i + 1 })));
    setSelectedStep(newStep.id);
    setShowAddMenu(null);
  };

  const removeStep = (stepId: string) => {
    setSteps(steps.filter((s) => s.id !== stepId).map((s, i) => ({ ...s, step_order: i + 1 })));
    if (selectedStep === stepId) setSelectedStep(null);
  };

  const updateStep = (stepId: string, field: string, value: any) => {
    setSteps(steps.map((s) => s.id === stepId ? { ...s, [field]: value } : s));
  };

  const selected = steps.find((s) => s.id === selectedStep);

  if (loading) return (
    <div style={{ minHeight: '100vh', background: pageBg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <Loader2 size={32} style={{ color: '#6366f1', animation: 'spin 1s linear infinite' }} />
    </div>
  );

  if (!runbook) return null;

  const statusBadgeColor = runbook.status === 'published' ? '#10b981' : runbook.status === 'archived' ? '#64748b' : '#f59e0b';

  return (
    <div style={{ minHeight: '100vh', background: pageBg, display: 'flex', flexDirection: 'column' }}>
      {/* Top bar */}
      <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }}
        style={{ background: cardBg, borderBottom: `1px solid ${cardBorder}`, padding: '12px 28px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {editingName ? (
            <input autoFocus value={runbook.name} onChange={(e) => setRunbook({ ...runbook, name: e.target.value })}
              onBlur={() => setEditingName(false)} onKeyDown={(e) => e.key === 'Enter' && setEditingName(false)}
              style={{ fontSize: 18, fontWeight: 700, color: textPrimary, background: 'transparent', border: `1px solid ${cardBorder}`, borderRadius: 8, padding: '4px 10px', outline: 'none', width: 320 }} />
          ) : (
            <h1 onClick={() => setEditingName(true)} style={{ fontSize: 18, fontWeight: 700, color: textPrimary, margin: 0, cursor: 'pointer' }}>{runbook.name}</h1>
          )}
          <span style={{ padding: '3px 10px', borderRadius: 12, fontSize: 11, fontWeight: 600, color: statusBadgeColor, background: `${statusBadgeColor}18`, textTransform: 'capitalize' }}>
            {runbook.status}
          </span>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <motion.button whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }} onClick={handleSave} disabled={saving}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 18px', background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', border: 'none', borderRadius: 8, color: '#fff', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>
            {saving ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <Save size={14} />} Save
          </motion.button>
          <motion.button whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}
            onClick={() => { setRunbook({ ...runbook, status: 'published' }); toast.success('Published'); }}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 18px', background: 'linear-gradient(135deg,#10b981,#059669)', border: 'none', borderRadius: 8, color: '#fff', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>
            <CheckCircle size={14} /> Publish
          </motion.button>
        </div>
      </motion.div>

      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {/* Left panel - Triggers */}
        <div style={{ width: 260, borderRight: `1px solid ${cardBorder}`, padding: 20, overflowY: 'auto', background: isDark ? 'rgba(12,20,38,0.5)' : '#fafafa', flexShrink: 0 }}>
          <h3 style={{ fontSize: 13, fontWeight: 700, color: textSecondary, marginBottom: 16, textTransform: 'uppercase', letterSpacing: 0.5 }}>Trigger Conditions</h3>
          <div style={{ marginBottom: 18 }}>
            <label style={{ fontSize: 12, fontWeight: 600, color: textSecondary, marginBottom: 6, display: 'block' }}>Severity</label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {severityOptions.map((sev) => (
                <label key={sev} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: textPrimary, cursor: 'pointer' }}>
                  <input type="checkbox" checked={runbook.trigger_conditions?.severity?.includes(sev) || false}
                    onChange={(e) => {
                      const cur = runbook.trigger_conditions?.severity || [];
                      const next = e.target.checked ? [...cur, sev] : cur.filter((s: string) => s !== sev);
                      setRunbook({ ...runbook, trigger_conditions: { ...runbook.trigger_conditions, severity: next } });
                    }} />
                  <span style={{ textTransform: 'capitalize' }}>{sev}</span>
                </label>
              ))}
            </div>
          </div>
          <div style={{ marginBottom: 18 }}>
            <label style={{ fontSize: 12, fontWeight: 600, color: textSecondary, marginBottom: 6, display: 'block' }}>Category</label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {categoryOptions.map((cat) => (
                <label key={cat} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: textPrimary, cursor: 'pointer' }}>
                  <input type="checkbox" checked={runbook.trigger_conditions?.category?.includes(cat) || false}
                    onChange={(e) => {
                      const cur = runbook.trigger_conditions?.category || [];
                      const next = e.target.checked ? [...cur, cat] : cur.filter((c: string) => c !== cat);
                      setRunbook({ ...runbook, trigger_conditions: { ...runbook.trigger_conditions, category: next } });
                    }} />
                  <span style={{ textTransform: 'capitalize' }}>{cat}</span>
                </label>
              ))}
            </div>
          </div>
          <div>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 600, color: textSecondary, cursor: 'pointer' }}>
              <input type="checkbox" checked={runbook.auto_trigger}
                onChange={(e) => setRunbook({ ...runbook, auto_trigger: e.target.checked })} />
              Auto-trigger
            </label>
          </div>

          <div style={{ marginTop: 28, paddingTop: 18, borderTop: `1px solid ${cardBorder}` }}>
            <h3 style={{ fontSize: 13, fontWeight: 700, color: textSecondary, marginBottom: 12, textTransform: 'uppercase', letterSpacing: 0.5 }}>Step Types</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {actionTypes.map((at) => {
                const Icon = at.icon;
                return (
                  <div key={at.value} draggable
                    style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', borderRadius: 8, cursor: 'grab', fontSize: 12, fontWeight: 500, color: textPrimary, border: `1px solid transparent` }}
                    onMouseOver={(e) => (e.currentTarget.style.background = isDark ? 'rgba(255,255,255,0.04)' : '#f1f5f9')}
                    onMouseOut={(e) => (e.currentTarget.style.background = 'transparent')}>
                    <div style={{ width: 24, height: 24, borderRadius: 6, background: `${at.color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Icon size={12} style={{ color: at.color }} />
                    </div>
                    {at.label}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Center - Pipeline */}
        <div style={{ flex: 1, padding: '28px 32px', overflowY: 'auto' }}>
          <div style={{ maxWidth: 520, margin: '0 auto' }}>
            {/* Start node */}
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
              style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', borderRadius: 12, padding: '10px 20px', textAlign: 'center', color: '#fff', fontWeight: 600, fontSize: 13, marginBottom: 0 }}>
              <Zap size={14} style={{ verticalAlign: 'middle', marginRight: 6 }} /> Trigger
            </motion.div>

            {steps.map((step, idx) => {
              const meta = getActionMeta(step.action_type);
              const Icon = meta.icon;
              const isSelected = selectedStep === step.id;

              return (
                <div key={step.id}>
                  {/* Connector line with add button */}
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative', height: 44 }}>
                    <motion.div initial={{ height: 0 }} animate={{ height: '100%' }}
                      style={{ width: 2, background: `linear-gradient(180deg,${idx === 0 ? '#6366f1' : getActionMeta(steps[idx - 1]?.action_type).color},${meta.color})`, position: 'absolute', top: 0 }} />
                    <div style={{ position: 'absolute', top: '50%', transform: 'translateY(-50%)', zIndex: 10 }}>
                      <motion.button whileHover={{ scale: 1.2 }} whileTap={{ scale: 0.9 }}
                        onClick={() => setShowAddMenu(showAddMenu === idx ? null : idx)}
                        style={{ width: 22, height: 22, borderRadius: '50%', background: isDark ? '#1e293b' : '#e2e8f0', border: `2px solid ${meta.color}`, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', padding: 0 }}>
                        <Plus size={11} style={{ color: meta.color }} />
                      </motion.button>
                      <AnimatePresence>
                        {showAddMenu === idx && (
                          <motion.div initial={{ opacity: 0, scale: 0.9, y: -4 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9 }}
                            style={{ position: 'absolute', top: 28, left: '50%', transform: 'translateX(-50%)', background: isDark ? '#1e293b' : '#fff', border: `1px solid ${cardBorder}`, borderRadius: 12, padding: 8, zIndex: 20, width: 200, boxShadow: '0 8px 32px rgba(0,0,0,0.3)' }}>
                            {actionTypes.map((at) => {
                              const AI = at.icon;
                              return (
                                <button key={at.value} onClick={() => addStep(idx - 1, at.value)}
                                  style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '7px 10px', border: 'none', borderRadius: 8, background: 'transparent', color: textPrimary, cursor: 'pointer', fontSize: 12, fontWeight: 500, textAlign: 'left' }}
                                  onMouseOver={(e) => (e.currentTarget.style.background = isDark ? 'rgba(255,255,255,0.06)' : '#f1f5f9')}
                                  onMouseOut={(e) => (e.currentTarget.style.background = 'transparent')}>
                                  <AI size={13} style={{ color: at.color }} /> {at.label}
                                </button>
                              );
                            })}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </div>

                  {/* Step card */}
                  <motion.div
                    initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: idx * 0.06 }}
                    whileHover={{ scale: 1.01 }}
                    onClick={() => setSelectedStep(step.id)}
                    style={{ background: cardBg, border: `1px solid ${isSelected ? meta.color : cardBorder}`, borderLeft: `4px solid ${meta.color}`, borderRadius: 12, padding: '14px 18px', cursor: 'pointer', transition: 'border-color 0.2s', position: 'relative' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <GripVertical size={14} style={{ color: textSecondary, cursor: 'grab', flexShrink: 0 }} />
                      <div style={{ width: 30, height: 30, borderRadius: 8, background: `${meta.color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <Icon size={15} style={{ color: meta.color }} />
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 600, color: textPrimary }}>{step.name}</div>
                        <div style={{ fontSize: 11, color: textSecondary, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{step.description || meta.label}</div>
                      </div>
                      <span style={{ fontSize: 10, color: textSecondary, flexShrink: 0 }}>#{step.step_order}</span>
                      <button onClick={(e) => { e.stopPropagation(); removeStep(step.id); }}
                        style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: 4, opacity: 0.6 }}
                        onMouseOver={(e) => (e.currentTarget.style.opacity = '1')}
                        onMouseOut={(e) => (e.currentTarget.style.opacity = '0.6')}>
                        <Trash2 size={13} />
                      </button>
                    </div>
                    {step.is_optional && <span style={{ position: 'absolute', top: 6, right: 8, fontSize: 9, color: textSecondary, fontWeight: 600 }}>OPTIONAL</span>}
                  </motion.div>
                </div>
              );
            })}

            {/* End connector + add */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', height: 44, position: 'relative' }}>
              <div style={{ width: 2, height: '100%', background: steps.length > 0 ? getActionMeta(steps[steps.length - 1]?.action_type).color : '#6366f1' }} />
              <motion.button whileHover={{ scale: 1.2 }} whileTap={{ scale: 0.9 }}
                onClick={() => setShowAddMenu(showAddMenu === steps.length ? null : steps.length)}
                style={{ position: 'absolute', top: '50%', transform: 'translateY(-50%)', width: 22, height: 22, borderRadius: '50%', background: isDark ? '#1e293b' : '#e2e8f0', border: '2px solid #6366f1', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', padding: 0, zIndex: 10 }}>
                <Plus size={11} style={{ color: '#6366f1' }} />
              </motion.button>
              <AnimatePresence>
                {showAddMenu === steps.length && (
                  <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }}
                    style={{ position: 'absolute', top: 34, left: '50%', transform: 'translateX(-50%)', background: isDark ? '#1e293b' : '#fff', border: `1px solid ${cardBorder}`, borderRadius: 12, padding: 8, zIndex: 20, width: 200, boxShadow: '0 8px 32px rgba(0,0,0,0.3)' }}>
                    {actionTypes.map((at) => {
                      const AI = at.icon;
                      return (
                        <button key={at.value} onClick={() => addStep(steps.length - 1, at.value)}
                          style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '7px 10px', border: 'none', borderRadius: 8, background: 'transparent', color: textPrimary, cursor: 'pointer', fontSize: 12, fontWeight: 500, textAlign: 'left' }}
                          onMouseOver={(e) => (e.currentTarget.style.background = isDark ? 'rgba(255,255,255,0.06)' : '#f1f5f9')}
                          onMouseOut={(e) => (e.currentTarget.style.background = 'transparent')}>
                          <AI size={13} style={{ color: at.color }} /> {at.label}
                        </button>
                      );
                    })}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* End node */}
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.3 }}
              style={{ background: 'linear-gradient(135deg,#10b981,#059669)', borderRadius: 12, padding: '10px 20px', textAlign: 'center', color: '#fff', fontWeight: 600, fontSize: 13 }}>
              <CheckCircle size={14} style={{ verticalAlign: 'middle', marginRight: 6 }} /> Complete
            </motion.div>
          </div>
        </div>

        {/* Right panel - Step config */}
        <div style={{ width: 320, borderLeft: `1px solid ${cardBorder}`, padding: 20, overflowY: 'auto', background: isDark ? 'rgba(12,20,38,0.5)' : '#fafafa', flexShrink: 0 }}>
          {selected ? (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} key={selected.id}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <h3 style={{ fontSize: 14, fontWeight: 700, color: textPrimary, margin: 0 }}>Step Configuration</h3>
                <button onClick={() => setSelectedStep(null)} style={{ background: 'none', border: 'none', color: textSecondary, cursor: 'pointer' }}><X size={16} /></button>
              </div>
              {[
                { key: 'name', label: 'Step Name', type: 'text' },
                { key: 'description', label: 'Description', type: 'text' },
              ].map(({ key, label }) => (
                <div key={key} style={{ marginBottom: 14 }}>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: textSecondary, marginBottom: 4 }}>{label}</label>
                  <input value={(selected as any)[key] || ''} onChange={(e) => updateStep(selected.id, key, e.target.value)}
                    style={{ width: '100%', padding: '8px 12px', background: inputBg, border: `1px solid ${cardBorder}`, borderRadius: 8, color: textPrimary, fontSize: 13, outline: 'none' }} />
                </div>
              ))}
              <div style={{ marginBottom: 14 }}>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: textSecondary, marginBottom: 4 }}>Action Type</label>
                <select value={selected.action_type} onChange={(e) => updateStep(selected.id, 'action_type', e.target.value)}
                  style={{ width: '100%', padding: '8px 12px', background: inputBg, border: `1px solid ${cardBorder}`, borderRadius: 8, color: textPrimary, fontSize: 13, outline: 'none' }}>
                  {actionTypes.map((at) => <option key={at.value} value={at.value}>{at.label}</option>)}
                </select>
              </div>
              <div style={{ marginBottom: 14 }}>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: textSecondary, marginBottom: 4 }}>Timeout (seconds)</label>
                <input type="number" value={selected.timeout_seconds} onChange={(e) => updateStep(selected.id, 'timeout_seconds', parseInt(e.target.value) || 0)}
                  style={{ width: '100%', padding: '8px 12px', background: inputBg, border: `1px solid ${cardBorder}`, borderRadius: 8, color: textPrimary, fontSize: 13, outline: 'none' }} />
              </div>
              <div style={{ marginBottom: 14 }}>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: textSecondary, marginBottom: 4 }}>On Failure</label>
                <select value={selected.on_failure} onChange={(e) => updateStep(selected.id, 'on_failure', e.target.value)}
                  style={{ width: '100%', padding: '8px 12px', background: inputBg, border: `1px solid ${cardBorder}`, borderRadius: 8, color: textPrimary, fontSize: 13, outline: 'none' }}>
                  <option value="abort">Abort</option>
                  <option value="continue">Continue</option>
                  <option value="skip_to">Skip To</option>
                </select>
              </div>
              <div style={{ marginBottom: 14 }}>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: textSecondary, marginBottom: 4 }}>Retry Count</label>
                <input type="number" value={selected.retry_count} onChange={(e) => updateStep(selected.id, 'retry_count', parseInt(e.target.value) || 0)}
                  style={{ width: '100%', padding: '8px 12px', background: inputBg, border: `1px solid ${cardBorder}`, borderRadius: 8, color: textPrimary, fontSize: 13, outline: 'none' }} />
              </div>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, fontWeight: 600, color: textSecondary, cursor: 'pointer' }}>
                <input type="checkbox" checked={selected.is_optional} onChange={(e) => updateStep(selected.id, 'is_optional', e.target.checked)} />
                Optional step
              </label>

              {/* Action-specific config */}
              <div style={{ marginTop: 20, paddingTop: 16, borderTop: `1px solid ${cardBorder}` }}>
                <h4 style={{ fontSize: 12, fontWeight: 700, color: textSecondary, marginBottom: 12, textTransform: 'uppercase' }}>Action Config</h4>
                {selected.action_type === 'http_request' && (
                  <>
                    <div style={{ marginBottom: 10 }}>
                      <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: textSecondary, marginBottom: 3 }}>URL</label>
                      <input value={selected.configuration?.url || ''} onChange={(e) => updateStep(selected.id, 'configuration', { ...selected.configuration, url: e.target.value })}
                        style={{ width: '100%', padding: '7px 10px', background: inputBg, border: `1px solid ${cardBorder}`, borderRadius: 8, color: textPrimary, fontSize: 12, outline: 'none' }} />
                    </div>
                    <div style={{ marginBottom: 10 }}>
                      <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: textSecondary, marginBottom: 3 }}>Method</label>
                      <select value={selected.configuration?.method || 'GET'} onChange={(e) => updateStep(selected.id, 'configuration', { ...selected.configuration, method: e.target.value })}
                        style={{ width: '100%', padding: '7px 10px', background: inputBg, border: `1px solid ${cardBorder}`, borderRadius: 8, color: textPrimary, fontSize: 12, outline: 'none' }}>
                        <option>GET</option><option>POST</option><option>PUT</option><option>DELETE</option>
                      </select>
                    </div>
                  </>
                )}
                {selected.action_type === 'run_script' && (
                  <div>
                    <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: textSecondary, marginBottom: 3 }}>Script</label>
                    <textarea value={selected.configuration?.script || ''} onChange={(e) => updateStep(selected.id, 'configuration', { ...selected.configuration, script: e.target.value })}
                      rows={4} style={{ width: '100%', padding: '7px 10px', background: inputBg, border: `1px solid ${cardBorder}`, borderRadius: 8, color: textPrimary, fontSize: 12, outline: 'none', fontFamily: 'monospace', resize: 'vertical' }} />
                  </div>
                )}
                {selected.action_type === 'wait' && (
                  <div>
                    <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: textSecondary, marginBottom: 3 }}>Duration (seconds)</label>
                    <input type="number" value={selected.configuration?.duration_seconds || 0} onChange={(e) => updateStep(selected.id, 'configuration', { ...selected.configuration, duration_seconds: parseInt(e.target.value) || 0 })}
                      style={{ width: '100%', padding: '7px 10px', background: inputBg, border: `1px solid ${cardBorder}`, borderRadius: 8, color: textPrimary, fontSize: 12, outline: 'none' }} />
                  </div>
                )}
                {selected.action_type === 'notification' && (
                  <div>
                    <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: textSecondary, marginBottom: 3 }}>Channels (comma-separated)</label>
                    <input value={(selected.configuration?.channels || []).join(', ')} onChange={(e) => updateStep(selected.id, 'configuration', { ...selected.configuration, channels: e.target.value.split(',').map((s: string) => s.trim()) })}
                      style={{ width: '100%', padding: '7px 10px', background: inputBg, border: `1px solid ${cardBorder}`, borderRadius: 8, color: textPrimary, fontSize: 12, outline: 'none' }} />
                  </div>
                )}
                {selected.action_type === 'condition' && (
                  <>
                    <div style={{ marginBottom: 10 }}>
                      <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: textSecondary, marginBottom: 3 }}>Metric</label>
                      <input value={selected.configuration?.metric || ''} onChange={(e) => updateStep(selected.id, 'configuration', { ...selected.configuration, metric: e.target.value })}
                        style={{ width: '100%', padding: '7px 10px', background: inputBg, border: `1px solid ${cardBorder}`, borderRadius: 8, color: textPrimary, fontSize: 12, outline: 'none' }} />
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <select value={selected.configuration?.operator || '>'} onChange={(e) => updateStep(selected.id, 'configuration', { ...selected.configuration, operator: e.target.value })}
                        style={{ flex: 1, padding: '7px 10px', background: inputBg, border: `1px solid ${cardBorder}`, borderRadius: 8, color: textPrimary, fontSize: 12, outline: 'none' }}>
                        <option value=">">{'>'}</option><option value="<">{'<'}</option><option value="==">{'=='}</option><option value="!=">{'!='}</option>
                      </select>
                      <input type="number" value={selected.configuration?.value || 0} onChange={(e) => updateStep(selected.id, 'configuration', { ...selected.configuration, value: parseInt(e.target.value) || 0 })}
                        style={{ flex: 1, padding: '7px 10px', background: inputBg, border: `1px solid ${cardBorder}`, borderRadius: 8, color: textPrimary, fontSize: 12, outline: 'none' }} />
                    </div>
                  </>
                )}
                {selected.action_type === 'manual_approval' && (
                  <div>
                    <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: textSecondary, marginBottom: 3 }}>Approvers (comma-separated emails)</label>
                    <input value={(selected.configuration?.approvers || []).join(', ')} onChange={(e) => updateStep(selected.id, 'configuration', { ...selected.configuration, approvers: e.target.value.split(',').map((s: string) => s.trim()) })}
                      style={{ width: '100%', padding: '7px 10px', background: inputBg, border: `1px solid ${cardBorder}`, borderRadius: 8, color: textPrimary, fontSize: 12, outline: 'none' }} />
                  </div>
                )}
              </div>
            </motion.div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', opacity: 0.5 }}>
              <Settings size={32} style={{ color: textSecondary, marginBottom: 12 }} />
              <p style={{ fontSize: 13, color: textSecondary, textAlign: 'center' }}>Select a step to configure</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default RunbookEditorPage;
