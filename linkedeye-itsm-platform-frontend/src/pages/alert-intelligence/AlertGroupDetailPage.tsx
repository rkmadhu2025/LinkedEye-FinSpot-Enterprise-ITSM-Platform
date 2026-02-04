/**
 * LinkedEye-FinSpot Enterprise Alert Group Detail Page
 * Architect Design System - Dark Theme
 */

import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronLeft, AlertTriangle, CheckCircle, Clock, Server, ChevronDown,
  ChevronRight, Eye, Bell, Shield, GitMerge, Plus, XCircle,
} from 'lucide-react';
import { useAppSelector } from '@/hooks/useRedux';
import toast from 'react-hot-toast';

const sevColors: Record<string, string> = { critical: '#ef4444', high: '#f59e0b', medium: '#6366f1', low: '#10b981' };

interface Alert {
  id: string;
  message: string;
  timestamp: string;
  source: string;
  host: string;
  severity: string;
  details: string;
}

const MOCK_GROUP = {
  id: '1',
  title: 'High CPU utilization across web tier',
  severity: 'critical' as const,
  status: 'active',
  alertCount: 23,
  firstSeen: '2025-12-15T12:00:00Z',
  lastSeen: '2025-12-15T14:55:00Z',
  source: 'Prometheus',
  correlationRule: 'CPU Spike Dedup',
  correlations: [
    { id: 'c1', type: 'Related', group: 'Database connection pool exhaustion', severity: 'high', confidence: 85 },
    { id: 'c2', type: 'Causal', group: 'Increased 5xx errors on /api/v2 endpoints', severity: 'high', confidence: 72 },
  ],
};

const MOCK_ALERTS: Alert[] = [
  { id: '1', message: 'web-01: CPU usage exceeded 95% for 10 minutes', timestamp: '14:55', source: 'Prometheus', host: 'web-01', severity: 'critical', details: 'Process: java (PID 2341) consuming 78% CPU. Load average: 12.4, 11.2, 8.7' },
  { id: '2', message: 'web-02: CPU usage exceeded 92% for 8 minutes', timestamp: '14:52', source: 'Prometheus', host: 'web-02', severity: 'critical', details: 'Process: java (PID 1892) consuming 71% CPU. Load average: 10.1, 9.8, 7.2' },
  { id: '3', message: 'web-03: CPU usage exceeded 90% for 12 minutes', timestamp: '14:48', source: 'Prometheus', host: 'web-03', severity: 'high', details: 'Process: node (PID 3201) consuming 65% CPU. Load average: 8.9, 8.5, 6.1' },
  { id: '4', message: 'web-01: CPU usage exceeded 88% for 5 minutes', timestamp: '14:30', source: 'Prometheus', host: 'web-01', severity: 'high', details: 'Autoscaling triggered. New instance launching.' },
  { id: '5', message: 'web-04: CPU usage exceeded 85% for 3 minutes', timestamp: '14:15', source: 'Prometheus', host: 'web-04', severity: 'medium', details: 'Spike correlated with deployment rollout.' },
  { id: '6', message: 'web-02: CPU usage exceeded 80% for 7 minutes', timestamp: '13:45', source: 'Prometheus', host: 'web-02', severity: 'medium', details: 'Garbage collection pause detected. Heap usage: 87%.' },
  { id: '7', message: 'web-01: CPU usage exceeded 75% for 2 minutes', timestamp: '12:30', source: 'Prometheus', host: 'web-01', severity: 'low', details: 'Brief spike during cron job execution.' },
];

const AlertGroupDetailPage = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const { theme } = useAppSelector((state) => state.ui);
  const [expandedAlert, setExpandedAlert] = useState<string | null>(null);
  const cardBg = 'rgba(17, 28, 50, 0.95)';
  const border = 'rgba(255,255,255,0.08)';
  const group = MOCK_GROUP;

  return (
    <div className="min-h-screen p-6" style={{ background: '#0c1426' }}>
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -15 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
        <button onClick={() => navigate('/alert-intelligence')} className="flex items-center gap-2 text-sm mb-4 hover:opacity-80 transition-opacity" style={{ color: '#94a3b8' }}>
          <ChevronLeft size={16} /> Back to Alert Intelligence
        </button>
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-3 h-3 rounded-full" style={{ background: sevColors[group.severity] }} />
              <h1 className="text-2xl font-bold" style={{ color: '#f8fafc' }}>{group.title}</h1>
            </div>
            <div className="flex items-center gap-4 text-sm" style={{ color: '#94a3b8' }}>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-medium" style={{ background: `${sevColors[group.severity]}20`, color: sevColors[group.severity] }}>{group.severity}</span>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-medium" style={{ background: 'rgba(239,68,68,0.15)', color: '#ef4444' }}>Active</span>
              <span>{group.alertCount} alerts</span>
              <span>Source: {group.source}</span>
              <span>Rule: {group.correlationRule}</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={() => toast.success('All alerts acknowledged')}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm" style={{ background: 'rgba(99,102,241,0.15)', color: '#6366f1' }}>
              <CheckCircle size={14} /> Acknowledge All
            </motion.button>
            <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={() => toast.success('All alerts resolved')}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm" style={{ background: 'rgba(16,185,129,0.15)', color: '#10b981' }}>
              <Shield size={14} /> Resolve All
            </motion.button>
            <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={() => { navigate('/incidents/new'); toast.success('Creating incident...'); }}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium" style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', color: '#fff' }}>
              <Plus size={14} /> Create Incident
            </motion.button>
          </div>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Alert Timeline */}
        <div className="lg:col-span-2 space-y-3">
          <h3 className="text-base font-semibold flex items-center gap-2 mb-4" style={{ color: '#f8fafc' }}>
            <Clock size={16} style={{ color: '#6366f1' }} /> Alert Timeline ({MOCK_ALERTS.length} alerts)
          </h3>
          <div className="relative ml-4">
            <div className="absolute left-3 top-0 bottom-0 w-0.5" style={{ background: 'rgba(255,255,255,0.08)' }} />
            {MOCK_ALERTS.map((alert, i) => {
              const isExpanded = expandedAlert === alert.id;
              return (
                <motion.div key={alert.id} initial={{ opacity: 0, x: -15 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.04 }}
                  className="relative flex items-start gap-4 mb-4">
                  <div className="relative z-10 w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: `${sevColors[alert.severity]}30`, border: `2px solid ${sevColors[alert.severity]}` }}>
                    <div className="w-2 h-2 rounded-full" style={{ background: sevColors[alert.severity] }} />
                  </div>
                  <div className="flex-1 rounded-xl overflow-hidden" style={{ background: cardBg, border: `1px solid ${border}` }}>
                    <div className="p-4 cursor-pointer hover:bg-white/[0.02] transition-colors" onClick={() => setExpandedAlert(isExpanded ? null : alert.id)}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <span className="text-sm font-mono font-bold" style={{ color: sevColors[alert.severity] }}>{alert.timestamp}</span>
                          <span className="text-sm" style={{ color: '#f8fafc' }}>{alert.message}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs px-2 py-0.5 rounded" style={{ background: 'rgba(255,255,255,0.05)', color: '#94a3b8' }}>{alert.host}</span>
                          <motion.div animate={{ rotate: isExpanded ? 90 : 0 }}><ChevronRight size={14} style={{ color: '#94a3b8' }} /></motion.div>
                        </div>
                      </div>
                    </div>
                    <AnimatePresence>
                      {isExpanded && (
                        <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                          className="overflow-hidden">
                          <div className="px-4 pb-4 pt-0" style={{ borderTop: `1px solid ${border}` }}>
                            <p className="text-sm mt-3" style={{ color: '#94a3b8' }}>{alert.details}</p>
                            <div className="flex items-center gap-3 mt-3 text-xs" style={{ color: '#94a3b8' }}>
                              <span>Source: {alert.source}</span>
                              <span>Severity: <span style={{ color: sevColors[alert.severity] }}>{alert.severity}</span></span>
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>

        {/* Correlations Sidebar */}
        <div>
          <h3 className="text-base font-semibold flex items-center gap-2 mb-4" style={{ color: '#f8fafc' }}>
            <GitMerge size={16} style={{ color: '#f59e0b' }} /> Related Correlations
          </h3>
          <div className="space-y-3">
            {group.correlations.map((corr) => (
              <motion.div key={corr.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                className="rounded-xl p-4 cursor-pointer hover:bg-white/[0.02] transition-colors"
                style={{ background: cardBg, border: `1px solid ${border}` }}
                onClick={() => navigate(`/alert-intelligence/groups/${corr.id}`)}>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{
                    background: corr.type === 'Causal' ? 'rgba(239,68,68,0.15)' : 'rgba(99,102,241,0.15)',
                    color: corr.type === 'Causal' ? '#ef4444' : '#6366f1',
                  }}>{corr.type}</span>
                  <span className="text-xs" style={{ color: '#94a3b8' }}>{corr.confidence}% confidence</span>
                </div>
                <p className="text-sm font-medium" style={{ color: '#f8fafc' }}>{corr.group}</p>
                <div className="flex items-center gap-2 mt-2">
                  <div className="w-2 h-2 rounded-full" style={{ background: sevColors[corr.severity] }} />
                  <span className="text-xs" style={{ color: sevColors[corr.severity] }}>{corr.severity}</span>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Group Info */}
          <div className="rounded-xl p-4 mt-6" style={{ background: cardBg, border: `1px solid ${border}` }}>
            <h4 className="text-sm font-semibold mb-3" style={{ color: '#f8fafc' }}>Group Info</h4>
            <div className="space-y-2 text-sm">
              {[
                { label: 'First Seen', value: 'Dec 15, 12:30 UTC' },
                { label: 'Last Seen', value: 'Dec 15, 14:55 UTC' },
                { label: 'Duration', value: '2h 25m' },
                { label: 'Source', value: group.source },
                { label: 'Correlation Rule', value: group.correlationRule },
                { label: 'Unique Hosts', value: '4' },
              ].map((item) => (
                <div key={item.label} className="flex items-center justify-between">
                  <span style={{ color: '#94a3b8' }}>{item.label}</span>
                  <span style={{ color: '#f8fafc' }}>{item.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AlertGroupDetailPage;
