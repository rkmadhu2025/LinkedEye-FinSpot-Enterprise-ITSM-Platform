/**
 * LinkedEye-FinSpot Enterprise Postmortems List Page
 * Architect Design System - Dark Theme
 */

import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FileText,
  Plus,
  Search,
  Filter,
  CheckCircle,
  Clock,
  AlertTriangle,
  Eye,
  Shield,
  TrendingDown,
  ChevronRight,
  BookOpen,
} from 'lucide-react';
import { useAppSelector } from '@/hooks/useRedux';
import clsx from 'clsx';
import toast from 'react-hot-toast';

type PostmortemStatus = 'draft' | 'in_review' | 'published';

interface ActionItem {
  id: string;
  title: string;
  completed: boolean;
}

interface Postmortem {
  id: string;
  title: string;
  incidentRef: string;
  status: PostmortemStatus;
  severity: string;
  ttr: string;
  blameFree: boolean;
  actionItems: ActionItem[];
  createdAt: string;
  updatedAt: string;
  author: string;
}

const MOCK_POSTMORTEMS: Postmortem[] = [
  { id: '1', title: 'Database cluster failover during peak hours', incidentRef: 'INC-1042', status: 'published', severity: 'critical', ttr: '2h 14m', blameFree: true, actionItems: [{ id: '1', title: 'Add replica', completed: true }, { id: '2', title: 'Update runbook', completed: true }, { id: '3', title: 'Add alerting', completed: false }], createdAt: '2025-12-10', updatedAt: '2025-12-15', author: 'Sarah Chen' },
  { id: '2', title: 'API Gateway 502 errors affecting checkout flow', incidentRef: 'INC-1038', status: 'in_review', severity: 'high', ttr: '45m', blameFree: true, actionItems: [{ id: '1', title: 'Circuit breaker', completed: true }, { id: '2', title: 'Load test', completed: false }], createdAt: '2025-12-08', updatedAt: '2025-12-12', author: 'James Park' },
  { id: '3', title: 'CDN cache poisoning incident', incidentRef: 'INC-1035', status: 'draft', severity: 'high', ttr: '1h 30m', blameFree: false, actionItems: [{ id: '1', title: 'Purge flow', completed: false }, { id: '2', title: 'Cache keys', completed: false }, { id: '3', title: 'WAF rule', completed: false }], createdAt: '2025-12-05', updatedAt: '2025-12-05', author: 'Priya Patel' },
  { id: '4', title: 'Kubernetes node OOM kills impacting microservices', incidentRef: 'INC-1029', status: 'published', severity: 'medium', ttr: '3h 05m', blameFree: true, actionItems: [{ id: '1', title: 'Resource limits', completed: true }, { id: '2', title: 'Memory profiling', completed: true }], createdAt: '2025-11-28', updatedAt: '2025-12-02', author: 'Alex Rivera' },
  { id: '5', title: 'SSL certificate expiry causing service outage', incidentRef: 'INC-1025', status: 'published', severity: 'critical', ttr: '25m', blameFree: true, actionItems: [{ id: '1', title: 'Auto-renewal', completed: true }, { id: '2', title: 'Monitoring', completed: true }, { id: '3', title: 'Runbook', completed: true }], createdAt: '2025-11-20', updatedAt: '2025-11-25', author: 'Sarah Chen' },
  { id: '6', title: 'Redis cluster split-brain during network partition', incidentRef: 'INC-1019', status: 'in_review', severity: 'critical', ttr: '4h 12m', blameFree: true, actionItems: [{ id: '1', title: 'Sentinel config', completed: true }, { id: '2', title: 'Partition test', completed: false }, { id: '3', title: 'Failover docs', completed: false }], createdAt: '2025-11-15', updatedAt: '2025-11-18', author: 'James Park' },
];

const statusConfig: Record<PostmortemStatus, { label: string; color: string; bg: string }> = {
  draft: { label: 'Draft', color: '#94a3b8', bg: 'rgba(148,163,184,0.15)' },
  in_review: { label: 'In Review', color: '#f59e0b', bg: 'rgba(245,158,11,0.15)' },
  published: { label: 'Published', color: '#10b981', bg: 'rgba(16,185,129,0.15)' },
};

const severityColors: Record<string, string> = {
  critical: '#ef4444',
  high: '#f59e0b',
  medium: '#6366f1',
  low: '#10b981',
};

const PostmortemsListPage = () => {
  const navigate = useNavigate();
  const { theme } = useAppSelector((state) => state.ui);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<PostmortemStatus | 'all'>('all');

  const filtered = useMemo(() => {
    return MOCK_POSTMORTEMS.filter((p) => {
      if (statusFilter !== 'all' && p.status !== statusFilter) return false;
      if (searchQuery && !p.title.toLowerCase().includes(searchQuery.toLowerCase()) && !p.incidentRef.toLowerCase().includes(searchQuery.toLowerCase())) return false;
      return true;
    });
  }, [searchQuery, statusFilter]);

  const stats = useMemo(() => {
    const all = MOCK_POSTMORTEMS;
    const openActions = all.flatMap((p) => p.actionItems).filter((a) => !a.completed).length;
    const published = all.filter((p) => p.status === 'published').length;
    return { total: all.length, openActions, published, avgTtr: '1h 58m' };
  }, []);

  const cardBg = 'rgba(17, 28, 50, 0.95)';
  const border = 'rgba(255,255,255,0.08)';

  return (
    <div className="min-h-screen p-6" style={{ background: '#0c1426' }}>
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold" style={{ color: '#f8fafc' }}>Incident Reviews</h1>
          <p style={{ color: '#94a3b8' }} className="mt-1">Blameless postmortems and continuous improvement tracking</p>
        </div>
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => { navigate('/postmortems/new'); toast.success('Creating new review...'); }}
          className="flex items-center gap-2 px-5 py-2.5 rounded-lg font-medium"
          style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', color: '#fff' }}
        >
          <Plus size={18} /> Create Review
        </motion.button>
      </motion.div>

      {/* Stats Row */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Total Reviews', value: stats.total, icon: FileText, color: '#6366f1' },
          { label: 'Open Action Items', value: stats.openActions, icon: AlertTriangle, color: '#f59e0b' },
          { label: 'Published', value: stats.published, icon: CheckCircle, color: '#10b981' },
          { label: 'Avg TTR', value: stats.avgTtr, icon: TrendingDown, color: '#ef4444' },
        ].map((s, i) => (
          <motion.div
            key={s.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 + i * 0.05 }}
            className="rounded-xl p-5"
            style={{ background: cardBg, border: `1px solid ${border}` }}
          >
            <div className="flex items-center justify-between mb-3">
              <span style={{ color: '#94a3b8' }} className="text-sm">{s.label}</span>
              <div className="p-2 rounded-lg" style={{ background: `${s.color}20` }}>
                <s.icon size={18} style={{ color: s.color }} />
              </div>
            </div>
            <div className="text-2xl font-bold" style={{ color: '#f8fafc' }}>{s.value}</div>
          </motion.div>
        ))}
      </motion.div>

      {/* Filters */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }} className="flex flex-wrap items-center gap-4 mb-6">
        <div className="relative flex-1 min-w-[250px]">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: '#94a3b8' }} />
          <input
            type="text"
            placeholder="Search reviews or incident references..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-lg text-sm outline-none"
            style={{ background: 'rgba(255,255,255,0.05)', border: `1px solid ${border}`, color: '#f8fafc' }}
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter size={16} style={{ color: '#94a3b8' }} />
          {(['all', 'draft', 'in_review', 'published'] as const).map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={clsx('px-3 py-1.5 rounded-lg text-sm font-medium transition-all')}
              style={{
                background: statusFilter === s ? 'rgba(99,102,241,0.2)' : 'rgba(255,255,255,0.05)',
                color: statusFilter === s ? '#6366f1' : '#94a3b8',
                border: `1px solid ${statusFilter === s ? 'rgba(99,102,241,0.3)' : border}`,
              }}
            >
              {s === 'all' ? 'All' : s === 'in_review' ? 'In Review' : s.charAt(0).toUpperCase() + s.slice(1)}
            </button>
          ))}
        </div>
      </motion.div>

      {/* Postmortem Cards */}
      <AnimatePresence mode="popLayout">
        <div className="space-y-4">
          {filtered.map((pm, i) => {
            const completedActions = pm.actionItems.filter((a) => a.completed).length;
            const totalActions = pm.actionItems.length;
            const progress = totalActions > 0 ? (completedActions / totalActions) * 100 : 0;
            const sc = statusConfig[pm.status];

            return (
              <motion.div
                key={pm.id}
                layout
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ delay: i * 0.04 }}
                onClick={() => navigate(pm.status === 'published' ? `/postmortems/${pm.id}` : `/postmortems/${pm.id}/edit`)}
                className="rounded-xl p-5 cursor-pointer group transition-all hover:translate-x-1"
                style={{ background: cardBg, border: `1px solid ${border}`, borderLeft: `3px solid ${severityColors[pm.severity] || '#6366f1'}` }}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-semibold truncate" style={{ color: '#f8fafc' }}>{pm.title}</h3>
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-medium whitespace-nowrap" style={{ background: sc.bg, color: sc.color }}>{sc.label}</span>
                      {pm.blameFree && (
                        <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs" style={{ background: 'rgba(16,185,129,0.1)', color: '#10b981' }}>
                          <Shield size={12} /> Blame-free
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-4 text-sm" style={{ color: '#94a3b8' }}>
                      <span className="flex items-center gap-1"><BookOpen size={14} /> {pm.incidentRef}</span>
                      <span className="flex items-center gap-1"><Clock size={14} /> TTR: {pm.ttr}</span>
                      <span className="px-2 py-0.5 rounded text-xs font-medium" style={{ background: `${severityColors[pm.severity]}20`, color: severityColors[pm.severity] }}>{pm.severity}</span>
                      <span>by {pm.author}</span>
                      <span>{pm.updatedAt}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 ml-4">
                    {/* Action items progress */}
                    <div className="w-40">
                      <div className="flex items-center justify-between text-xs mb-1" style={{ color: '#94a3b8' }}>
                        <span>Action Items</span>
                        <span>{completedActions}/{totalActions}</span>
                      </div>
                      <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.08)' }}>
                        <motion.div
                          className="h-full rounded-full"
                          style={{ background: progress === 100 ? '#10b981' : '#6366f1' }}
                          initial={{ width: 0 }}
                          animate={{ width: `${progress}%` }}
                          transition={{ duration: 0.8, ease: 'easeOut' }}
                        />
                      </div>
                    </div>
                    <ChevronRight size={18} style={{ color: '#94a3b8' }} className="group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </AnimatePresence>

      {filtered.length === 0 && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-16">
          <Eye size={48} style={{ color: '#94a3b8' }} className="mx-auto mb-4 opacity-50" />
          <p style={{ color: '#94a3b8' }}>No postmortems found matching your criteria.</p>
        </motion.div>
      )}
    </div>
  );
};

export default PostmortemsListPage;
