import { useEffect, useState, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CheckCircle, AlertTriangle, XCircle, Clock, ChevronDown, ChevronUp,
  Mail, Loader2, Shield, Wrench, Activity,
} from 'lucide-react';
import { statusPageService, StatusPage, StatusPageComponent, StatusPageIncident } from '@/services/statusPageService';
import toast from 'react-hot-toast';

const componentStatusMeta: Record<string, { icon: any; color: string; label: string }> = {
  operational: { icon: CheckCircle, color: '#10b981', label: 'Operational' },
  degraded_performance: { icon: AlertTriangle, color: '#f59e0b', label: 'Degraded Performance' },
  partial_outage: { icon: AlertTriangle, color: '#f97316', label: 'Partial Outage' },
  major_outage: { icon: XCircle, color: '#ef4444', label: 'Major Outage' },
  under_maintenance: { icon: Wrench, color: '#6366f1', label: 'Under Maintenance' },
};

const overallStatusMeta: Record<string, { color: string; bg: string; label: string; icon: any }> = {
  operational: { color: '#10b981', bg: 'rgba(16,185,129,0.12)', label: 'All Systems Operational', icon: CheckCircle },
  degraded: { color: '#f59e0b', bg: 'rgba(245,158,11,0.12)', label: 'Degraded Performance', icon: AlertTriangle },
  partial_outage: { color: '#f97316', bg: 'rgba(249,115,22,0.12)', label: 'Partial System Outage', icon: AlertTriangle },
  major_outage: { color: '#ef4444', bg: 'rgba(239,68,68,0.12)', label: 'Major Outage', icon: XCircle },
};

const incidentStatusColors: Record<string, string> = {
  investigating: '#ef4444',
  identified: '#f97316',
  monitoring: '#6366f1',
  resolved: '#10b981',
};

/** Generate mock 90-day uptime for demo */
const generateUptime = (): { date: string; uptime: number }[] => {
  const days: { date: string; uptime: number }[] = [];
  for (let i = 89; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const u = Math.random() > 0.08 ? 99.5 + Math.random() * 0.5 : 90 + Math.random() * 9;
    days.push({ date: d.toISOString().split('T')[0], uptime: parseFloat(u.toFixed(2)) });
  }
  return days;
};

const UptimeBar = ({ history }: { history: { date: string; uptime: number }[] }) => {
  const [tooltip, setTooltip] = useState<{ x: number; date: string; uptime: number } | null>(null);

  const bars = useMemo(() => history.length > 0 ? history : generateUptime(), [history]);

  return (
    <div style={{ position: 'relative', display: 'flex', gap: 1, height: 32, alignItems: 'flex-end' }}>
      {bars.map((b, i) => {
        const color = b.uptime >= 99.5 ? '#10b981' : b.uptime >= 95 ? '#f59e0b' : '#ef4444';
        return (
          <div key={i}
            onMouseEnter={(e) => setTooltip({ x: e.clientX, date: b.date, uptime: b.uptime })}
            onMouseLeave={() => setTooltip(null)}
            style={{ flex: 1, height: '100%', background: color, borderRadius: 2, opacity: 0.85, cursor: 'pointer', transition: 'opacity 0.15s' }}
            onMouseOver={(e) => (e.currentTarget.style.opacity = '1')}
            onMouseOut={(e) => (e.currentTarget.style.opacity = '0.85')}
          />
        );
      })}
      {tooltip && (
        <div style={{ position: 'fixed', left: tooltip.x - 60, top: -45, transform: 'translateY(-100%)', background: '#1e293b', color: '#f8fafc', padding: '6px 12px', borderRadius: 8, fontSize: 12, fontWeight: 500, pointerEvents: 'none', zIndex: 100, whiteSpace: 'nowrap', boxShadow: '0 4px 16px rgba(0,0,0,0.3)' }}>
          {tooltip.date} — {tooltip.uptime}% uptime
        </div>
      )}
    </div>
  );
};

const PublicStatusPage = () => {
  const { slug } = useParams<{ slug: string }>();
  const [page, setPage] = useState<StatusPage | null>(null);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState('');
  const [subscribing, setSubscribing] = useState(false);
  const [expandedIncidents, setExpandedIncidents] = useState<Set<string>>(new Set());
  const [showPast, setShowPast] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const data = await statusPageService.getPublicStatusPage(slug!);
        setPage(data);
      } catch {
        // Mock
        setPage({
          id: '1', name: 'LinkedEye Platform', slug: slug!, description: 'Real-time status of LinkedEye services', header_color: '#6366f1',
          overall_status: 'operational', subscriber_count: 234, is_public: true, created_at: '2024-01-01', updated_at: new Date().toISOString(),
          components: [
            { id: 'c1', name: 'API Gateway', status: 'operational', order: 1, uptime_history: generateUptime() },
            { id: 'c2', name: 'Web Dashboard', status: 'operational', order: 2, uptime_history: generateUptime() },
            { id: 'c3', name: 'Webhook Delivery', status: 'degraded_performance', order: 3, uptime_history: generateUptime() },
            { id: 'c4', name: 'Database Cluster', status: 'operational', order: 4, uptime_history: generateUptime() },
            { id: 'c5', name: 'Background Jobs', status: 'operational', order: 5, uptime_history: generateUptime() },
          ],
          incidents: [
            { id: 'i1', title: 'Elevated webhook delivery latency', status: 'monitoring', impact: 'minor', components: ['c3'],
              updates: [
                { id: 'u3', status: 'monitoring', message: 'Latency is returning to normal levels. Continuing to monitor.', created_at: '2024-06-01T14:00:00Z' },
                { id: 'u2', status: 'identified', message: 'Identified increased queue depth on webhook workers. Scaling up instances.', created_at: '2024-06-01T13:30:00Z' },
                { id: 'u1', status: 'investigating', message: 'We are investigating reports of delayed webhook delivery.', created_at: '2024-06-01T13:00:00Z' },
              ],
              created_at: '2024-06-01T13:00:00Z' },
            { id: 'i2', title: 'Scheduled database maintenance', status: 'resolved', impact: 'minor', components: ['c4'],
              updates: [
                { id: 'u5', status: 'resolved', message: 'Maintenance complete. All systems nominal.', created_at: '2024-05-28T06:00:00Z' },
                { id: 'u4', status: 'monitoring', message: 'Database migration in progress. Brief read-only period expected.', created_at: '2024-05-28T04:00:00Z' },
              ],
              created_at: '2024-05-28T04:00:00Z', resolved_at: '2024-05-28T06:00:00Z' },
          ],
        });
      } finally { setLoading(false); }
    };
    load();
  }, [slug]);

  const handleSubscribe = async () => {
    if (!email || !email.includes('@')) { toast.error('Enter a valid email'); return; }
    setSubscribing(true);
    try {
      await statusPageService.subscribe(slug!, email);
      toast.success('Subscribed successfully');
      setEmail('');
    } catch { toast.success('Subscribed (demo)'); setEmail(''); }
    setSubscribing(false);
  };

  const toggleIncident = (id: string) => {
    setExpandedIncidents((prev) => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  };

  if (loading) return (
    <div style={{ minHeight: '100vh', background: '#0c1426', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <Loader2 size={36} style={{ color: '#6366f1', animation: 'spin 1s linear infinite' }} />
    </div>
  );

  if (!page) return (
    <div style={{ minHeight: '100vh', background: '#0c1426', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#f8fafc', fontSize: 18 }}>
      Status page not found
    </div>
  );

  const os = overallStatusMeta[page.overall_status] || overallStatusMeta.operational;
  const activeIncidents = page.incidents.filter((i) => i.status !== 'resolved');
  const pastIncidents = page.incidents.filter((i) => i.status === 'resolved');

  return (
    <div style={{ minHeight: '100vh', background: '#0c1426' }}>
      {/* Header banner */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.6 }}
        style={{ background: `linear-gradient(135deg,${page.header_color},${page.header_color}88)`, padding: '40px 0 32px' }}>
        <div style={{ maxWidth: 800, margin: '0 auto', padding: '0 24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
            <Shield size={28} style={{ color: '#fff' }} />
            <h1 style={{ fontSize: 26, fontWeight: 700, color: '#fff', margin: 0 }}>{page.name}</h1>
          </div>
          {page.description && <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: 14, margin: 0 }}>{page.description}</p>}
        </div>
      </motion.div>

      <div style={{ maxWidth: 800, margin: '0 auto', padding: '0 24px 60px' }}>
        {/* Overall status badge */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
          style={{ background: 'rgba(17,28,50,0.95)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 14, padding: '20px 24px', marginTop: -24, display: 'flex', alignItems: 'center', gap: 14 }}>
          <os.icon size={28} style={{ color: os.color }} />
          <span style={{ fontSize: 18, fontWeight: 700, color: os.color }}>{os.label}</span>
          <span style={{ marginLeft: 'auto', fontSize: 12, color: '#94a3b8' }}>Updated {new Date(page.updated_at).toLocaleDateString()}</span>
        </motion.div>

        {/* Components */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.35 }}
          style={{ marginTop: 32 }}>
          <h2 style={{ fontSize: 16, fontWeight: 600, color: '#f8fafc', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Activity size={18} style={{ color: '#6366f1' }} /> Components
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2, background: 'rgba(17,28,50,0.95)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 14, overflow: 'hidden' }}>
            {page.components.sort((a, b) => a.order - b.order).map((comp, idx) => {
              const cs = componentStatusMeta[comp.status] || componentStatusMeta.operational;
              const Icon = cs.icon;
              return (
                <motion.div key={comp.id} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.4 + idx * 0.06 }}
                  style={{ padding: '16px 24px', borderBottom: idx < page.components.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                    <span style={{ fontSize: 14, fontWeight: 500, color: '#f8fafc' }}>{comp.name}</span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 600, color: cs.color }}>
                      <Icon size={14} /> {cs.label}
                    </span>
                  </div>
                  <UptimeBar history={comp.uptime_history || []} />
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
                    <span style={{ fontSize: 11, color: '#64748b' }}>90 days ago</span>
                    <span style={{ fontSize: 11, color: '#64748b' }}>Today</span>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </motion.div>

        {/* Active Incidents */}
        {activeIncidents.length > 0 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}
            style={{ marginTop: 36 }}>
            <h2 style={{ fontSize: 16, fontWeight: 600, color: '#f8fafc', marginBottom: 16 }}>Active Incidents</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {activeIncidents.map((inc) => (
                <div key={inc.id} style={{ background: 'rgba(17,28,50,0.95)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 14, overflow: 'hidden' }}>
                  <div style={{ borderLeft: `4px solid ${incidentStatusColors[inc.status] || '#6366f1'}`, padding: '16px 20px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}
                      onClick={() => toggleIncident(inc.id)}>
                      <div>
                        <h3 style={{ fontSize: 15, fontWeight: 600, color: '#f8fafc', margin: 0 }}>{inc.title}</h3>
                        <span style={{ fontSize: 12, color: '#94a3b8', marginTop: 2 }}>{new Date(inc.created_at).toLocaleString()}</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <span style={{ padding: '3px 10px', borderRadius: 12, fontSize: 11, fontWeight: 600, color: incidentStatusColors[inc.status], background: `${incidentStatusColors[inc.status]}18`, textTransform: 'capitalize' }}>
                          {inc.status}
                        </span>
                        {expandedIncidents.has(inc.id) ? <ChevronUp size={16} style={{ color: '#94a3b8' }} /> : <ChevronDown size={16} style={{ color: '#94a3b8' }} />}
                      </div>
                    </div>
                    <AnimatePresence>
                      {expandedIncidents.has(inc.id) && (
                        <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                          style={{ marginTop: 16, overflow: 'hidden' }}>
                          <div style={{ borderLeft: '2px solid rgba(255,255,255,0.08)', marginLeft: 8, paddingLeft: 20 }}>
                            {inc.updates.map((upd) => (
                              <div key={upd.id} style={{ marginBottom: 16, position: 'relative' }}>
                                <div style={{ position: 'absolute', left: -27, top: 4, width: 10, height: 10, borderRadius: '50%', background: incidentStatusColors[upd.status] || '#6366f1' }} />
                                <div style={{ fontSize: 12, fontWeight: 600, color: incidentStatusColors[upd.status], textTransform: 'capitalize', marginBottom: 4 }}>{upd.status}</div>
                                <p style={{ fontSize: 13, color: '#cbd5e1', margin: 0, lineHeight: 1.6 }}>{upd.message}</p>
                                <span style={{ fontSize: 11, color: '#64748b', marginTop: 4, display: 'block' }}>{new Date(upd.created_at).toLocaleString()}</span>
                              </div>
                            ))}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Past Incidents */}
        {pastIncidents.length > 0 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }}
            style={{ marginTop: 36 }}>
            <button onClick={() => setShowPast(!showPast)}
              style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'none', border: 'none', color: '#94a3b8', fontSize: 14, fontWeight: 600, cursor: 'pointer', padding: 0, marginBottom: 12 }}>
              <Clock size={16} /> Past Incidents ({pastIncidents.length})
              {showPast ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>
            <AnimatePresence>
              {showPast && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                  style={{ display: 'flex', flexDirection: 'column', gap: 8, overflow: 'hidden' }}>
                  {pastIncidents.map((inc) => (
                    <div key={inc.id} style={{ background: 'rgba(17,28,50,0.95)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 12, padding: '14px 20px', cursor: 'pointer' }}
                      onClick={() => toggleIncident(inc.id)}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: 14, fontWeight: 500, color: '#cbd5e1' }}>{inc.title}</span>
                        <span style={{ fontSize: 12, color: '#10b981', fontWeight: 600 }}>Resolved</span>
                      </div>
                      <span style={{ fontSize: 11, color: '#64748b' }}>{new Date(inc.created_at).toLocaleDateString()}</span>
                      <AnimatePresence>
                        {expandedIncidents.has(inc.id) && (
                          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                            style={{ marginTop: 12, borderLeft: '2px solid rgba(255,255,255,0.06)', paddingLeft: 16, overflow: 'hidden' }}>
                            {inc.updates.map((upd) => (
                              <div key={upd.id} style={{ marginBottom: 12 }}>
                                <span style={{ fontSize: 11, fontWeight: 600, color: incidentStatusColors[upd.status], textTransform: 'capitalize' }}>{upd.status}</span>
                                <p style={{ fontSize: 12, color: '#94a3b8', margin: '2px 0 0', lineHeight: 1.5 }}>{upd.message}</p>
                              </div>
                            ))}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}

        {/* Subscribe */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.7 }}
          style={{ marginTop: 40, background: 'rgba(17,28,50,0.95)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 14, padding: '28px 24px', textAlign: 'center' }}>
          <Mail size={28} style={{ color: '#6366f1', marginBottom: 8 }} />
          <h3 style={{ fontSize: 16, fontWeight: 600, color: '#f8fafc', margin: '0 0 6px' }}>Subscribe to Updates</h3>
          <p style={{ fontSize: 13, color: '#94a3b8', margin: '0 0 18px' }}>Get notified when something changes</p>
          <div style={{ display: 'flex', gap: 10, maxWidth: 400, margin: '0 auto' }}>
            <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="your@email.com"
              style={{ flex: 1, padding: '10px 16px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, color: '#f8fafc', fontSize: 14, outline: 'none' }} />
            <motion.button whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }} onClick={handleSubscribe} disabled={subscribing}
              style={{ padding: '10px 24px', background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', border: 'none', borderRadius: 10, color: '#fff', fontWeight: 600, fontSize: 14, cursor: 'pointer' }}>
              {subscribing ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> : 'Subscribe'}
            </motion.button>
          </div>
        </motion.div>

        {/* Footer */}
        <div style={{ marginTop: 40, textAlign: 'center', paddingBottom: 24 }}>
          <a href="/" style={{ fontSize: 12, color: '#64748b', textDecoration: 'none' }}>
            Powered by <span style={{ color: '#6366f1', fontWeight: 600 }}>LinkedEye</span>
          </a>
        </div>
      </div>
    </div>
  );
};

export default PublicStatusPage;
