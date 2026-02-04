import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  BookOpen, Plus, Search, Play, Edit, Archive, Filter, LayoutGrid, List,
  Clock, CheckCircle, AlertTriangle, TrendingUp, Zap, Tag, Loader2, BarChart3,
  XCircle,
} from 'lucide-react';
import { useAppSelector } from '@/hooks/useRedux';
import { runbookService, RunbookData } from '@/services/runbookService';
import toast from 'react-hot-toast';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.05 } },
};
const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.35 } },
};

const statusBadge: Record<string, { color: string; bg: string; label: string }> = {
  draft: { color: '#94a3b8', bg: 'rgba(148,163,184,0.12)', label: 'Draft' },
  published: { color: '#10b981', bg: 'rgba(16,185,129,0.12)', label: 'Published' },
  archived: { color: '#64748b', bg: 'rgba(100,116,139,0.12)', label: 'Archived' },
};

const RunbooksListPage = () => {
  const navigate = useNavigate();
  const { theme } = useAppSelector((state) => state.ui);
  const isDark = theme === 'dark';

  const [runbooks, setRunbooks] = useState<RunbookData[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  const cardBg = isDark ? 'rgba(17,28,50,0.95)' : '#ffffff';
  const cardBorder = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)';
  const textPrimary = isDark ? '#f8fafc' : '#1e293b';
  const textSecondary = isDark ? '#94a3b8' : '#64748b';
  const pageBg = isDark ? '#0c1426' : '#f1f5f9';

  useEffect(() => {
    const load = async () => {
      try {
        const res = await runbookService.getRunbooks(0, 50, { status: statusFilter || undefined, category: categoryFilter || undefined, search: search || undefined });
        setRunbooks(res.data);
      } catch {
        setRunbooks([
          { id: '1', name: 'High CPU Auto-Remediation', description: 'Automatically restarts services when CPU exceeds 90% for 5 minutes', status: 'published', version: 3, trigger_conditions: { severity: 'critical', category: 'performance' }, auto_trigger: true, tags: ['cpu', 'auto-remediation', 'performance'], category: 'Performance', last_executed_at: '2024-06-01T10:30:00Z', execution_count: 47, avg_execution_time_seconds: 125, success_rate: 94.2, step_count: 6, created_at: '2024-01-15', updated_at: '2024-06-01' },
          { id: '2', name: 'Disk Space Cleanup', description: 'Cleans temp files and old logs when disk usage exceeds 85%', status: 'published', version: 2, trigger_conditions: { severity: 'high', category: 'storage' }, auto_trigger: true, tags: ['disk', 'cleanup', 'storage'], category: 'Storage', last_executed_at: '2024-05-28T08:00:00Z', execution_count: 32, avg_execution_time_seconds: 89, success_rate: 100, step_count: 4, created_at: '2024-02-20', updated_at: '2024-05-28' },
          { id: '3', name: 'Database Failover', description: 'Orchestrates database failover to standby replica', status: 'published', version: 5, trigger_conditions: { severity: 'critical', category: 'database' }, auto_trigger: false, tags: ['database', 'failover', 'ha'], category: 'Database', last_executed_at: '2024-04-15T14:00:00Z', execution_count: 3, avg_execution_time_seconds: 340, success_rate: 100, step_count: 9, created_at: '2024-01-05', updated_at: '2024-04-15' },
          { id: '4', name: 'SSL Certificate Renewal', description: 'Automated SSL certificate renewal and deployment', status: 'draft', version: 1, trigger_conditions: {}, auto_trigger: false, tags: ['ssl', 'security', 'certificates'], category: 'Security', execution_count: 0, avg_execution_time_seconds: 0, success_rate: 0, step_count: 5, created_at: '2024-05-20', updated_at: '2024-05-20' },
          { id: '5', name: 'Incident Escalation', description: 'Escalates unacknowledged incidents after SLA breach', status: 'published', version: 2, trigger_conditions: { severity: 'high' }, auto_trigger: true, tags: ['escalation', 'sla', 'notification'], category: 'Incident Management', last_executed_at: '2024-06-01T16:00:00Z', execution_count: 156, avg_execution_time_seconds: 12, success_rate: 99.4, step_count: 3, created_at: '2024-01-10', updated_at: '2024-06-01' },
          { id: '6', name: 'Network Health Check', description: 'Comprehensive network connectivity and latency verification', status: 'archived', version: 1, trigger_conditions: {}, auto_trigger: false, tags: ['network', 'health-check'], category: 'Network', execution_count: 12, avg_execution_time_seconds: 200, success_rate: 83, step_count: 7, created_at: '2024-01-01', updated_at: '2024-03-01' },
        ]);
      } finally { setLoading(false); }
    };
    load();
  }, [statusFilter, categoryFilter, search]);

  const filtered = runbooks.filter((r) => {
    if (statusFilter && r.status !== statusFilter) return false;
    if (categoryFilter && r.category !== categoryFilter) return false;
    if (search && !r.name.toLowerCase().includes(search.toLowerCase()) && !r.description?.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const categories = [...new Set(runbooks.map((r) => r.category).filter(Boolean))];
  const stats = {
    total: runbooks.length,
    published: runbooks.filter((r) => r.status === 'published').length,
    executions: runbooks.reduce((s, r) => s + r.execution_count, 0),
    avgSuccess: runbooks.length > 0 ? (runbooks.reduce((s, r) => s + r.success_rate, 0) / runbooks.filter((r) => r.execution_count > 0).length).toFixed(1) : '0',
  };

  const statCards = [
    { label: 'Total Runbooks', value: stats.total, icon: BookOpen, color: '#6366f1' },
    { label: 'Published', value: stats.published, icon: CheckCircle, color: '#10b981' },
    { label: 'Total Executions', value: stats.executions, icon: Zap, color: '#f59e0b' },
    { label: 'Avg Success Rate', value: `${stats.avgSuccess}%`, icon: TrendingUp, color: '#8b5cf6' },
  ];

  const handleExecute = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const res = await runbookService.executeRunbook(id);
      toast.success('Execution started');
      navigate(`/runbooks/executions/${res.data.id}`);
    } catch { toast.error('Failed to execute'); }
  };

  return (
    <div style={{ minHeight: '100vh', background: pageBg, padding: '24px 32px' }}>
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}
        style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28 }}>
        <div>
          <h1 style={{ fontSize: 28, fontWeight: 700, color: textPrimary, margin: 0, display: 'flex', alignItems: 'center', gap: 10 }}>
            <BookOpen size={28} style={{ color: '#6366f1' }} /> Automation Playbooks
          </h1>
          <p style={{ color: textSecondary, marginTop: 4, fontSize: 14 }}>Build, manage, and execute automated runbooks</p>
        </div>
        <motion.button whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}
          onClick={() => navigate('/runbooks/create')}
          style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 20px', background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', color: '#fff', border: 'none', borderRadius: 10, cursor: 'pointer', fontWeight: 600, fontSize: 14 }}>
          <Plus size={18} /> Create Runbook
        </motion.button>
      </motion.div>

      {/* Stats */}
      <motion.div variants={containerVariants} initial="hidden" animate="visible"
        style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 16, marginBottom: 28 }}>
        {statCards.map((s) => (
          <motion.div key={s.label} variants={itemVariants}
            style={{ background: cardBg, border: `1px solid ${cardBorder}`, borderRadius: 14, padding: '20px 22px', display: 'flex', alignItems: 'center', gap: 16 }}>
            <div style={{ width: 46, height: 46, borderRadius: 12, background: `${s.color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <s.icon size={22} style={{ color: s.color }} />
            </div>
            <div>
              <div style={{ fontSize: 24, fontWeight: 700, color: textPrimary }}>{s.value}</div>
              <div style={{ fontSize: 12, color: textSecondary, fontWeight: 500 }}>{s.label}</div>
            </div>
          </motion.div>
        ))}
      </motion.div>

      {/* Filters */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}
        style={{ display: 'flex', gap: 12, marginBottom: 24, alignItems: 'center', flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: '0 0 280px' }}>
          <Search size={16} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: textSecondary }} />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search runbooks..."
            style={{ width: '100%', padding: '10px 14px 10px 38px', background: cardBg, border: `1px solid ${cardBorder}`, borderRadius: 10, color: textPrimary, fontSize: 14, outline: 'none' }} />
        </div>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
          style={{ padding: '10px 14px', background: cardBg, border: `1px solid ${cardBorder}`, borderRadius: 10, color: textPrimary, fontSize: 13, outline: 'none', cursor: 'pointer' }}>
          <option value="">All Status</option>
          <option value="draft">Draft</option>
          <option value="published">Published</option>
          <option value="archived">Archived</option>
        </select>
        <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}
          style={{ padding: '10px 14px', background: cardBg, border: `1px solid ${cardBorder}`, borderRadius: 10, color: textPrimary, fontSize: 13, outline: 'none', cursor: 'pointer' }}>
          <option value="">All Categories</option>
          {categories.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 4, background: isDark ? 'rgba(255,255,255,0.03)' : '#e2e8f0', borderRadius: 8, padding: 3 }}>
          {(['grid', 'list'] as const).map((v) => (
            <button key={v} onClick={() => setViewMode(v)}
              style={{ padding: '6px 10px', borderRadius: 6, border: 'none', cursor: 'pointer', background: viewMode === v ? (isDark ? 'rgba(99,102,241,0.18)' : '#fff') : 'transparent', color: viewMode === v ? '#6366f1' : textSecondary }}>
              {v === 'grid' ? <LayoutGrid size={15} /> : <List size={15} />}
            </button>
          ))}
        </div>
      </motion.div>

      {/* Content */}
      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}>
          <Loader2 size={32} style={{ color: '#6366f1', animation: 'spin 1s linear infinite' }} />
        </div>
      ) : filtered.length === 0 ? (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          style={{ textAlign: 'center', padding: '80px 20px' }}>
          <BookOpen size={56} style={{ color: textSecondary, marginBottom: 16, opacity: 0.4 }} />
          <h3 style={{ fontSize: 18, fontWeight: 600, color: textPrimary, margin: '0 0 8px' }}>No runbooks found</h3>
          <p style={{ color: textSecondary, fontSize: 14 }}>Create your first automation playbook to get started</p>
        </motion.div>
      ) : (
        <motion.div variants={containerVariants} initial="hidden" animate="visible"
          style={{ display: 'grid', gridTemplateColumns: viewMode === 'grid' ? 'repeat(auto-fill,minmax(360px,1fr))' : '1fr', gap: viewMode === 'grid' ? 16 : 8 }}>
          {filtered.map((rb) => {
            const sb = statusBadge[rb.status] || statusBadge.draft;
            return (
              <motion.div key={rb.id} variants={itemVariants}
                whileHover={{ y: -3, boxShadow: '0 8px 32px rgba(0,0,0,0.18)' }}
                onClick={() => navigate(`/runbooks/${rb.id}/edit`)}
                style={{ background: cardBg, border: `1px solid ${cardBorder}`, borderRadius: 14, padding: '20px 22px', cursor: 'pointer', display: viewMode === 'list' ? 'flex' : 'block', alignItems: 'center', gap: 20 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                    <h3 style={{ fontSize: 15, fontWeight: 600, color: textPrimary, margin: 0, flex: 1 }}>{rb.name}</h3>
                    <span style={{ padding: '3px 10px', borderRadius: 12, fontSize: 11, fontWeight: 600, background: sb.bg, color: sb.color }}>{sb.label}</span>
                  </div>
                  {rb.description && <p style={{ fontSize: 13, color: textSecondary, margin: '0 0 12px', lineHeight: 1.5 }}>{rb.description}</p>}
                  <div style={{ display: 'flex', gap: 14, fontSize: 12, color: textSecondary, marginBottom: 12, flexWrap: 'wrap' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><BarChart3 size={13} /> {rb.step_count} steps</span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Zap size={13} /> {rb.execution_count} runs</span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Clock size={13} /> {rb.avg_execution_time_seconds}s avg</span>
                    {rb.success_rate > 0 && (
                      <span style={{ display: 'flex', alignItems: 'center', gap: 4, color: rb.success_rate >= 95 ? '#10b981' : rb.success_rate >= 80 ? '#f59e0b' : '#ef4444' }}>
                        <TrendingUp size={13} /> {rb.success_rate}%
                      </span>
                    )}
                  </div>
                  {rb.tags.length > 0 && (
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: viewMode === 'grid' ? 14 : 0 }}>
                      {rb.tags.map((tag) => (
                        <span key={tag} style={{ padding: '2px 8px', borderRadius: 6, fontSize: 10, fontWeight: 600, background: isDark ? 'rgba(99,102,241,0.1)' : '#eef2ff', color: '#6366f1' }}>{tag}</span>
                      ))}
                    </div>
                  )}
                </div>
                {/* Actions */}
                <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                  {rb.status === 'published' && (
                    <motion.button whileHover={{ scale: 1.08 }} whileTap={{ scale: 0.94 }}
                      onClick={(e) => handleExecute(rb.id, e)}
                      style={{ padding: '7px 14px', background: 'rgba(16,185,129,0.12)', border: 'none', borderRadius: 8, color: '#10b981', cursor: 'pointer', fontWeight: 600, fontSize: 12, display: 'flex', alignItems: 'center', gap: 4 }}>
                      <Play size={13} /> Run
                    </motion.button>
                  )}
                  <motion.button whileHover={{ scale: 1.08 }} whileTap={{ scale: 0.94 }}
                    onClick={(e) => { e.stopPropagation(); navigate(`/runbooks/${rb.id}/edit`); }}
                    style={{ padding: '7px 14px', background: isDark ? 'rgba(99,102,241,0.12)' : '#eef2ff', border: 'none', borderRadius: 8, color: '#6366f1', cursor: 'pointer', fontWeight: 600, fontSize: 12, display: 'flex', alignItems: 'center', gap: 4 }}>
                    <Edit size={13} /> Edit
                  </motion.button>
                </div>
              </motion.div>
            );
          })}
        </motion.div>
      )}
    </div>
  );
};

export default RunbooksListPage;
