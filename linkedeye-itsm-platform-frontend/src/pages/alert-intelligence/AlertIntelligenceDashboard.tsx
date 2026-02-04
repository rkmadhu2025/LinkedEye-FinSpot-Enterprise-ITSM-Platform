/**
 * LinkedEye-FinSpot Enterprise AIOps Alert Intelligence Dashboard
 * Flagship innovative noise reduction and alert correlation UI
 * Architect Design System - Dark Theme
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Zap, TrendingDown, Filter, Layers, GitMerge, Bell, BellOff,
  ChevronDown, ChevronRight, CheckCircle, AlertTriangle, AlertCircle,
  XCircle, Eye, Plus, Settings, BarChart3, Cpu, Database, Globe,
  Shield, Clock, Search, RefreshCw,
} from 'lucide-react';
import { useAppSelector } from '@/hooks/useRedux';
import { AreaChart, Area, PieChart, Pie, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import toast from 'react-hot-toast';

const NOISE_TREND = [
  { day: 'Mon', total: 342, actionable: 89 }, { day: 'Tue', total: 298, actionable: 76 },
  { day: 'Wed', total: 510, actionable: 102 }, { day: 'Thu', total: 445, actionable: 95 },
  { day: 'Fri', total: 389, actionable: 82 }, { day: 'Sat', total: 210, actionable: 45 },
  { day: 'Sun', total: 178, actionable: 38 },
];

const SEVERITY_DIST = [
  { name: 'Critical', value: 12, color: '#ef4444' }, { name: 'High', value: 34, color: '#f59e0b' },
  { name: 'Medium', value: 89, color: '#3b82f6' }, { name: 'Low', value: 142, color: '#10b981' },
];

const FUNNEL_STAGES = [
  { label: 'Total Alerts', count: 2372, color: '#94a3b8' },
  { label: 'Deduplicated', count: 1580, color: '#f59e0b' },
  { label: 'Grouped', count: 834, color: '#d97706' },
  { label: 'Suppressed', count: 527, color: '#b45309' },
  { label: 'Actionable', count: 527, color: '#10b981' },
];

interface AlertGroup {
  id: string;
  title: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  alertCount: number;
  firstSeen: string;
  lastSeen: string;
  source: string;
  status: 'active' | 'acknowledged' | 'resolved';
  alerts: { id: string; message: string; timestamp: string; source: string }[];
}

const MOCK_GROUPS: AlertGroup[] = [
  { id: '1', title: 'High CPU utilization across web tier', severity: 'critical', alertCount: 23, firstSeen: '2h ago', lastSeen: '5m ago', source: 'Prometheus', status: 'active',
    alerts: [
      { id: '1a', message: 'web-01: CPU > 95% for 10m', timestamp: '5m ago', source: 'Prometheus' },
      { id: '1b', message: 'web-02: CPU > 92% for 8m', timestamp: '8m ago', source: 'Prometheus' },
      { id: '1c', message: 'web-03: CPU > 90% for 12m', timestamp: '12m ago', source: 'Prometheus' },
    ]},
  { id: '2', title: 'Database connection pool exhaustion', severity: 'high', alertCount: 15, firstSeen: '45m ago', lastSeen: '2m ago', source: 'Datadog', status: 'active',
    alerts: [
      { id: '2a', message: 'db-primary: Connection pool at 98%', timestamp: '2m ago', source: 'Datadog' },
      { id: '2b', message: 'db-replica-1: Connection pool at 85%', timestamp: '10m ago', source: 'Datadog' },
    ]},
  { id: '3', title: 'Increased 5xx errors on /api/v2 endpoints', severity: 'high', alertCount: 42, firstSeen: '1h ago', lastSeen: '1m ago', source: 'CloudWatch', status: 'acknowledged',
    alerts: [
      { id: '3a', message: 'POST /api/v2/orders: 503 rate 12%', timestamp: '1m ago', source: 'CloudWatch' },
      { id: '3b', message: 'GET /api/v2/products: 502 rate 8%', timestamp: '3m ago', source: 'CloudWatch' },
    ]},
  { id: '4', title: 'Memory pressure on cache nodes', severity: 'medium', alertCount: 8, firstSeen: '3h ago', lastSeen: '20m ago', source: 'Prometheus', status: 'active',
    alerts: [
      { id: '4a', message: 'redis-01: Memory usage 87%', timestamp: '20m ago', source: 'Prometheus' },
    ]},
  { id: '5', title: 'SSL certificate expiry warnings', severity: 'low', alertCount: 4, firstSeen: '12h ago', lastSeen: '6h ago', source: 'Cert Manager', status: 'resolved',
    alerts: [
      { id: '5a', message: 'api.example.com: Expires in 7 days', timestamp: '6h ago', source: 'Cert Manager' },
    ]},
];

interface Pattern {
  id: string;
  name: string;
  conditions: string;
  matchCount: number;
  autoAction: boolean;
  action: string;
}

const MOCK_PATTERNS: Pattern[] = [
  { id: '1', name: 'CPU Spike Dedup', conditions: 'source=prometheus AND metric=cpu AND value>90', matchCount: 156, autoAction: true, action: 'Group & Deduplicate' },
  { id: '2', name: 'Disk Space Warning', conditions: 'alert_name LIKE "%disk%" AND severity IN (warning, low)', matchCount: 89, autoAction: true, action: 'Suppress for 1h' },
  { id: '3', name: 'Health Check Noise', conditions: 'source=synthetic AND type=health_check', matchCount: 1240, autoAction: true, action: 'Auto-resolve' },
  { id: '4', name: 'Deploy Window', conditions: 'timestamp BETWEEN deploy_start AND deploy_start+30m', matchCount: 312, autoAction: false, action: 'Suppress during deploy' },
];

const sevColors: Record<string, string> = { critical: '#ef4444', high: '#f59e0b', medium: '#6366f1', low: '#10b981' };
const sevIcons: Record<string, React.ElementType> = { critical: XCircle, high: AlertTriangle, medium: AlertCircle, low: Bell };

const PostmortemEditorPage = () => {
  const navigate = useNavigate();
  const { theme } = useAppSelector((state) => state.ui);
  const [activeTab, setActiveTab] = useState<'groups' | 'patterns'>('groups');
  const [expandedGroup, setExpandedGroup] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [animatedNoise, setAnimatedNoise] = useState(0);
  const targetNoise = 77.8;

  const cardBg = 'rgba(17, 28, 50, 0.95)';
  const border = 'rgba(255,255,255,0.08)';

  useEffect(() => {
    let frame: number;
    const start = performance.now();
    const animate = (now: number) => {
      const elapsed = now - start;
      const progress = Math.min(elapsed / 1500, 1);
      setAnimatedNoise(progress * targetNoise);
      if (progress < 1) frame = requestAnimationFrame(animate);
    };
    frame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frame);
  }, []);

  return (
    <div className="min-h-screen p-6" style={{ background: '#0c1426' }}>
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3" style={{ color: '#f8fafc' }}>
            <div className="p-2.5 rounded-xl" style={{ background: 'linear-gradient(135deg, rgba(245,158,11,0.2), rgba(217,119,6,0.2))' }}>
              <Zap size={24} style={{ color: '#f59e0b' }} />
            </div>
            Alert Intelligence
          </h1>
          <p className="mt-1" style={{ color: '#94a3b8' }}>AIOps-powered noise reduction and alert correlation</p>
        </div>
        <div className="flex items-center gap-3">
          <button className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm" style={{ background: 'rgba(255,255,255,0.05)', color: '#94a3b8', border: `1px solid ${border}` }}>
            <RefreshCw size={14} /> Refresh
          </button>
          <button className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm" style={{ background: 'rgba(245,158,11,0.15)', color: '#f59e0b' }}>
            <Settings size={14} /> Configure Rules
          </button>
        </div>
      </motion.div>

      {/* Hero Metrics */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-8">
        {/* Noise Reduced - Large */}
        <motion.div className="md:col-span-2 rounded-xl p-6 relative overflow-hidden" style={{ background: cardBg, border: `1px solid ${border}` }}>
          <div className="absolute inset-0 opacity-5" style={{ background: 'radial-gradient(circle at 80% 20%, #10b981, transparent 60%)' }} />
          <div className="relative">
            <p className="text-sm mb-2" style={{ color: '#94a3b8' }}>Noise Reduced</p>
            <div className="flex items-baseline gap-1">
              <span className="text-5xl font-bold" style={{ color: '#10b981' }}>{animatedNoise.toFixed(1)}</span>
              <span className="text-2xl font-bold" style={{ color: '#10b981' }}>%</span>
            </div>
            <div className="flex items-center gap-2 mt-2">
              <TrendingDown size={14} style={{ color: '#10b981' }} />
              <span className="text-sm" style={{ color: '#10b981' }}>+3.2% from last week</span>
            </div>
          </div>
        </motion.div>

        <motion.div className="rounded-xl p-5" style={{ background: cardBg, border: `1px solid ${border}` }}>
          <p className="text-sm mb-1" style={{ color: '#94a3b8' }}>Total Alerts</p>
          <p className="text-2xl font-bold" style={{ color: '#f8fafc' }}>2,372</p>
          <p className="text-xs mt-1" style={{ color: '#94a3b8' }}>vs 527 actionable</p>
        </motion.div>

        <motion.div className="rounded-xl p-5" style={{ background: cardBg, border: `1px solid ${border}` }}>
          <p className="text-sm mb-1" style={{ color: '#94a3b8' }}>Active Groups</p>
          <p className="text-2xl font-bold" style={{ color: '#f59e0b' }}>18</p>
          <p className="text-xs mt-1" style={{ color: '#94a3b8' }}>across 6 sources</p>
        </motion.div>

        <motion.div className="rounded-xl p-5" style={{ background: cardBg, border: `1px solid ${border}` }}>
          <p className="text-sm mb-1" style={{ color: '#94a3b8' }}>Correlations</p>
          <p className="text-2xl font-bold" style={{ color: '#f59e0b' }}>47</p>
          <p className="text-xs mt-1" style={{ color: '#94a3b8' }}>patterns matched</p>
        </motion.div>
      </motion.div>

      {/* Noise Funnel + Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* Funnel */}
        <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
          className="lg:col-span-2 rounded-xl p-6" style={{ background: cardBg, border: `1px solid ${border}` }}>
          <h3 className="text-base font-semibold mb-6 flex items-center gap-2" style={{ color: '#f8fafc' }}>
            <Filter size={16} style={{ color: '#f59e0b' }} /> Noise Reduction Funnel
          </h3>
          <div className="flex items-center gap-2">
            {FUNNEL_STAGES.map((stage, i) => {
              const widthPct = 20 + (1 - i / (FUNNEL_STAGES.length - 1)) * 80;
              const reduction = i > 0 ? Math.round((1 - stage.count / FUNNEL_STAGES[i - 1].count) * 100) : 0;
              return (
                <motion.div key={stage.label} className="flex-1" initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.2 + i * 0.1 }}>
                  <div className="text-center mb-2">
                    <div className="text-lg font-bold" style={{ color: stage.color }}>{stage.count.toLocaleString()}</div>
                    {i > 0 && <div className="text-xs" style={{ color: '#ef4444' }}>-{reduction}%</div>}
                  </div>
                  <div className="mx-auto rounded-lg overflow-hidden" style={{ width: `${widthPct}%`, height: '40px', background: `${stage.color}30` }}>
                    <motion.div className="h-full rounded-lg" style={{ background: `${stage.color}60` }}
                      initial={{ width: 0 }} animate={{ width: '100%' }} transition={{ duration: 0.8, delay: 0.2 + i * 0.1 }} />
                  </div>
                  <div className="text-center mt-2 text-xs" style={{ color: '#94a3b8' }}>{stage.label}</div>
                </motion.div>
              );
            })}
          </div>
        </motion.div>

        {/* Severity Distribution */}
        <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
          className="rounded-xl p-6" style={{ background: cardBg, border: `1px solid ${border}` }}>
          <h3 className="text-base font-semibold mb-4 flex items-center gap-2" style={{ color: '#f8fafc' }}>
            <BarChart3 size={16} style={{ color: '#f59e0b' }} /> Severity Distribution
          </h3>
          <ResponsiveContainer width="100%" height={180}>
            <PieChart>
              <Pie data={SEVERITY_DIST} cx="50%" cy="50%" innerRadius={45} outerRadius={70} paddingAngle={4} dataKey="value">
                {SEVERITY_DIST.map((entry) => <Cell key={entry.name} fill={entry.color} />)}
              </Pie>
              <Tooltip contentStyle={{ background: '#111c32', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '8px', color: '#f8fafc' }} />
            </PieChart>
          </ResponsiveContainer>
          <div className="flex flex-wrap gap-3 justify-center">
            {SEVERITY_DIST.map((s) => (
              <div key={s.name} className="flex items-center gap-1.5 text-xs">
                <div className="w-2.5 h-2.5 rounded-full" style={{ background: s.color }} />
                <span style={{ color: '#94a3b8' }}>{s.name} ({s.value})</span>
              </div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* Noise Trend Chart */}
      <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}
        className="rounded-xl p-6 mb-8" style={{ background: cardBg, border: `1px solid ${border}` }}>
        <h3 className="text-base font-semibold mb-4 flex items-center gap-2" style={{ color: '#f8fafc' }}>
          <TrendingDown size={16} style={{ color: '#10b981' }} /> 7-Day Noise Reduction Trend
        </h3>
        <ResponsiveContainer width="100%" height={200}>
          <AreaChart data={NOISE_TREND}>
            <defs>
              <linearGradient id="totalGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#94a3b8" stopOpacity={0.3} />
                <stop offset="100%" stopColor="#94a3b8" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="actionGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#10b981" stopOpacity={0.3} />
                <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis dataKey="day" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
            <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
            <Tooltip contentStyle={{ background: '#111c32', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '8px', color: '#f8fafc' }} />
            <Area type="monotone" dataKey="total" stroke="#94a3b8" fill="url(#totalGrad)" strokeWidth={2} name="Total Alerts" />
            <Area type="monotone" dataKey="actionable" stroke="#10b981" fill="url(#actionGrad)" strokeWidth={2} name="Actionable" />
          </AreaChart>
        </ResponsiveContainer>
      </motion.div>

      {/* Tabs */}
      <div className="flex items-center gap-4 mb-6">
        {(['groups', 'patterns'] as const).map((tab) => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            className="px-4 py-2 rounded-lg text-sm font-medium transition-all"
            style={{
              background: activeTab === tab ? 'rgba(245,158,11,0.15)' : 'transparent',
              color: activeTab === tab ? '#f59e0b' : '#94a3b8',
              border: `1px solid ${activeTab === tab ? 'rgba(245,158,11,0.3)' : 'transparent'}`,
            }}>
            {tab === 'groups' ? 'Alert Groups' : 'Patterns & Rules'}
          </button>
        ))}
        <div className="flex-1" />
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: '#94a3b8' }} />
          <input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search..."
            className="pl-9 pr-4 py-2 rounded-lg text-sm outline-none" style={{ background: 'rgba(255,255,255,0.05)', border: `1px solid ${border}`, color: '#f8fafc' }} />
        </div>
      </div>

      {/* Alert Groups */}
      {activeTab === 'groups' && (
        <div className="space-y-3">
          <AnimatePresence>
            {MOCK_GROUPS.filter((g) => !searchQuery || g.title.toLowerCase().includes(searchQuery.toLowerCase())).map((group, i) => {
              const SevIcon = sevIcons[group.severity];
              const isExpanded = expandedGroup === group.id;
              return (
                <motion.div key={group.id} layout initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
                  className="rounded-xl overflow-hidden" style={{ background: cardBg, border: `1px solid ${border}`, borderLeft: `3px solid ${sevColors[group.severity]}` }}>
                  <div className="flex items-center gap-4 p-4 cursor-pointer hover:bg-white/[0.02] transition-colors"
                    onClick={() => setExpandedGroup(isExpanded ? null : group.id)}>
                    <motion.div animate={{ rotate: isExpanded ? 90 : 0 }}><ChevronRight size={16} style={{ color: '#94a3b8' }} /></motion.div>
                    <SevIcon size={18} style={{ color: sevColors[group.severity] }} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3">
                        <span className="font-medium truncate" style={{ color: '#f8fafc' }}>{group.title}</span>
                        <span className="px-2 py-0.5 rounded-full text-xs font-bold" style={{ background: `${sevColors[group.severity]}20`, color: sevColors[group.severity] }}>{group.alertCount}</span>
                        {group.status === 'acknowledged' && <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: 'rgba(245,158,11,0.15)', color: '#f59e0b' }}>Acknowledged</span>}
                        {group.status === 'resolved' && <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: 'rgba(16,185,129,0.15)', color: '#10b981' }}>Resolved</span>}
                      </div>
                      <div className="flex items-center gap-4 text-xs mt-1" style={{ color: '#94a3b8' }}>
                        <span>Source: {group.source}</span>
                        <span>First: {group.firstSeen}</span>
                        <span>Last: {group.lastSeen}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                      <button onClick={() => toast.success('All alerts acknowledged')} className="px-3 py-1.5 rounded-lg text-xs" style={{ background: 'rgba(245,158,11,0.1)', color: '#f59e0b' }}>Ack All</button>
                      <button onClick={() => toast.success('All alerts resolved')} className="px-3 py-1.5 rounded-lg text-xs" style={{ background: 'rgba(16,185,129,0.1)', color: '#10b981' }}>Resolve All</button>
                      <button onClick={() => toast.success('Creating incident from group...')} className="px-3 py-1.5 rounded-lg text-xs" style={{ background: 'rgba(245,158,11,0.1)', color: '#f59e0b' }}>Create Incident</button>
                      <button onClick={() => navigate(`/alert-intelligence/groups/${group.id}`)} className="p-1.5 rounded-lg hover:bg-white/5"><Eye size={14} style={{ color: '#94a3b8' }} /></button>
                    </div>
                  </div>
                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden" style={{ borderTop: `1px solid ${border}` }}>
                        <div className="p-4">
                          <table className="w-full text-sm">
                            <thead>
                              <tr style={{ borderBottom: `1px solid ${border}` }}>
                                {['Alert', 'Source', 'Time'].map((h) => <th key={h} className="text-left py-2 px-3 text-xs font-medium" style={{ color: '#94a3b8' }}>{h}</th>)}
                              </tr>
                            </thead>
                            <tbody>
                              {group.alerts.map((alert) => (
                                <tr key={alert.id} style={{ borderBottom: `1px solid ${border}` }}>
                                  <td className="py-2 px-3" style={{ color: '#f8fafc' }}>{alert.message}</td>
                                  <td className="py-2 px-3" style={{ color: '#94a3b8' }}>{alert.source}</td>
                                  <td className="py-2 px-3" style={{ color: '#94a3b8' }}>{alert.timestamp}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}

      {/* Patterns Tab */}
      {activeTab === 'patterns' && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
          className="rounded-xl overflow-hidden" style={{ background: cardBg, border: `1px solid ${border}` }}>
          <div className="flex items-center justify-between p-4" style={{ borderBottom: `1px solid ${border}` }}>
            <h3 className="font-semibold" style={{ color: '#f8fafc' }}>Alert Patterns & Rules</h3>
            <button className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm" style={{ background: 'rgba(245,158,11,0.15)', color: '#f59e0b' }}>
              <Plus size={14} /> Create Pattern
            </button>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: `1px solid ${border}` }}>
                {['Pattern Name', 'Conditions', 'Matches', 'Auto-Action', 'Action'].map((h) => (
                  <th key={h} className="text-left py-3 px-4 font-medium" style={{ color: '#94a3b8' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {MOCK_PATTERNS.map((p) => (
                <tr key={p.id} className="hover:bg-white/[0.02] transition-colors cursor-pointer" style={{ borderBottom: `1px solid ${border}` }}>
                  <td className="py-3 px-4 font-medium" style={{ color: '#f8fafc' }}>{p.name}</td>
                  <td className="py-3 px-4">
                    <code className="text-xs px-2 py-1 rounded" style={{ background: 'rgba(255,255,255,0.05)', color: '#94a3b8' }}>{p.conditions}</code>
                  </td>
                  <td className="py-3 px-4" style={{ color: '#f8fafc' }}>{p.matchCount.toLocaleString()}</td>
                  <td className="py-3 px-4">
                    <div className="w-8 h-4 rounded-full" style={{ background: p.autoAction ? '#10b981' : 'rgba(255,255,255,0.15)' }}>
                      <div className="w-3 h-3 rounded-full bg-white mt-0.5" style={{ marginLeft: p.autoAction ? '18px' : '2px', transition: 'margin-left 0.2s' }} />
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <span className="text-xs px-2 py-1 rounded-full" style={{ background: 'rgba(245,158,11,0.1)', color: '#f59e0b' }}>{p.action}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </motion.div>
      )}
    </div>
  );
};

export default PostmortemEditorPage;
