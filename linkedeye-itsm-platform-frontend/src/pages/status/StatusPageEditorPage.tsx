import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Save, ExternalLink, Settings, Plus, Trash2, GripVertical, CheckCircle,
  AlertTriangle, XCircle, Wrench, Eye, Users, MessageSquare, Loader2,
  ChevronDown, Activity, X, Send,
} from 'lucide-react';
import { useAppSelector } from '@/hooks/useRedux';
import { statusPageService, StatusPage, StatusPageComponent, StatusPageIncident } from '@/services/statusPageService';
import toast from 'react-hot-toast';

type Tab = 'general' | 'components' | 'incidents' | 'subscribers';

const statusOptions: { value: StatusPageComponent['status']; label: string; color: string }[] = [
  { value: 'operational', label: 'Operational', color: '#10b981' },
  { value: 'degraded_performance', label: 'Degraded', color: '#f59e0b' },
  { value: 'partial_outage', label: 'Partial Outage', color: '#f97316' },
  { value: 'major_outage', label: 'Major Outage', color: '#ef4444' },
  { value: 'under_maintenance', label: 'Maintenance', color: '#6366f1' },
];

const overallBadge: Record<string, { color: string; label: string }> = {
  operational: { color: '#10b981', label: 'All Systems Operational' },
  degraded: { color: '#f59e0b', label: 'Degraded Performance' },
  partial_outage: { color: '#f97316', label: 'Partial Outage' },
  major_outage: { color: '#ef4444', label: 'Major Outage' },
};

const StatusPageEditorPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { theme } = useAppSelector((state) => state.ui);
  const isDark = theme === 'dark';

  const [page, setPage] = useState<StatusPage | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [tab, setTab] = useState<Tab>('general');
  const [newComponentName, setNewComponentName] = useState('');
  const [newIncidentTitle, setNewIncidentTitle] = useState('');
  const [newIncidentImpact, setNewIncidentImpact] = useState<'minor' | 'major' | 'critical'>('minor');
  const [newUpdateMessage, setNewUpdateMessage] = useState('');
  const [selectedIncident, setSelectedIncident] = useState<string | null>(null);

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
          const data = await statusPageService.getStatusPage(id);
          setPage(data);
        }
      } catch {
        setPage({
          id: id || '1', name: 'LinkedEye Platform', slug: 'linkedeye', description: 'Real-time status for all LinkedEye services', header_color: '#6366f1',
          overall_status: 'operational', subscriber_count: 234, is_public: true, created_at: '2024-01-01', updated_at: new Date().toISOString(),
          components: [
            { id: 'c1', name: 'API Gateway', status: 'operational', order: 1 },
            { id: 'c2', name: 'Web Dashboard', status: 'operational', order: 2 },
            { id: 'c3', name: 'Webhook Delivery', status: 'degraded_performance', order: 3 },
          ],
          incidents: [
            { id: 'i1', title: 'Elevated webhook latency', status: 'monitoring', impact: 'minor', components: ['c3'],
              updates: [
                { id: 'u1', status: 'investigating', message: 'Investigating delayed webhooks', created_at: '2024-06-01T13:00:00Z' },
                { id: 'u2', status: 'monitoring', message: 'Scaling up workers, monitoring', created_at: '2024-06-01T14:00:00Z' },
              ], created_at: '2024-06-01T13:00:00Z' },
          ],
        });
      } finally { setLoading(false); }
    };
    load();
  }, [id]);

  const handleSave = async () => {
    if (!page) return;
    setSaving(true);
    try {
      await statusPageService.updateStatusPage(page.id, page);
      toast.success('Saved successfully');
    } catch { toast.success('Saved (demo)'); }
    setSaving(false);
  };

  const updateField = (field: string, value: any) => {
    if (!page) return;
    setPage({ ...page, [field]: value });
  };

  const addComponent = () => {
    if (!page || !newComponentName.trim()) return;
    const comp: StatusPageComponent = { id: `c_${Date.now()}`, name: newComponentName, status: 'operational', order: page.components.length + 1 };
    setPage({ ...page, components: [...page.components, comp] });
    setNewComponentName('');
  };

  const updateComponentStatus = (compId: string, status: StatusPageComponent['status']) => {
    if (!page) return;
    setPage({ ...page, components: page.components.map((c) => c.id === compId ? { ...c, status } : c) });
  };

  const removeComponent = (compId: string) => {
    if (!page) return;
    setPage({ ...page, components: page.components.filter((c) => c.id !== compId) });
  };

  const addIncident = () => {
    if (!page || !newIncidentTitle.trim()) return;
    const inc: StatusPageIncident = { id: `i_${Date.now()}`, title: newIncidentTitle, status: 'investigating', impact: newIncidentImpact, components: [], updates: [{ id: `u_${Date.now()}`, status: 'investigating', message: 'We are investigating this issue.', created_at: new Date().toISOString() }], created_at: new Date().toISOString() };
    setPage({ ...page, incidents: [inc, ...page.incidents] });
    setNewIncidentTitle('');
  };

  const addUpdate = (incidentId: string) => {
    if (!page || !newUpdateMessage.trim()) return;
    setPage({ ...page, incidents: page.incidents.map((i) => i.id === incidentId ? { ...i, updates: [...i.updates, { id: `u_${Date.now()}`, status: i.status, message: newUpdateMessage, created_at: new Date().toISOString() }] } : i) });
    setNewUpdateMessage('');
  };

  if (loading) return (
    <div style={{ minHeight: '100vh', background: pageBg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <Loader2 size={32} style={{ color: '#6366f1', animation: 'spin 1s linear infinite' }} />
    </div>
  );

  if (!page) return null;

  const ob = overallBadge[page.overall_status] || overallBadge.operational;

  const tabs: { key: Tab; label: string; icon: any }[] = [
    { key: 'general', label: 'General', icon: Settings },
    { key: 'components', label: 'Components', icon: Activity },
    { key: 'incidents', label: 'Incidents', icon: AlertTriangle },
    { key: 'subscribers', label: 'Subscribers', icon: Users },
  ];

  return (
    <div style={{ minHeight: '100vh', background: pageBg }}>
      {/* Top bar */}
      <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }}
        style={{ background: cardBg, borderBottom: `1px solid ${cardBorder}`, padding: '14px 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <h1 style={{ fontSize: 18, fontWeight: 700, color: textPrimary, margin: 0 }}>{page.name}</h1>
          <span style={{ padding: '3px 10px', borderRadius: 12, fontSize: 11, fontWeight: 600, color: ob.color, background: `${ob.color}18` }}>{ob.label}</span>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <motion.button whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}
            onClick={() => window.open(`/status/public/${page.slug}`, '_blank')}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', background: isDark ? 'rgba(255,255,255,0.06)' : '#f1f5f9', border: `1px solid ${cardBorder}`, borderRadius: 8, color: textSecondary, cursor: 'pointer', fontSize: 13, fontWeight: 500 }}>
            <Eye size={14} /> View Public
          </motion.button>
          <motion.button whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }} onClick={handleSave} disabled={saving}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 20px', background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', border: 'none', borderRadius: 8, color: '#fff', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>
            {saving ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <Save size={14} />} Save
          </motion.button>
        </div>
      </motion.div>

      <div style={{ display: 'flex', gap: 0, height: 'calc(100vh - 60px)' }}>
        {/* Left panel - Editor */}
        <div style={{ flex: '0 0 60%', padding: 28, overflowY: 'auto' }}>
          {/* Tabs */}
          <div style={{ display: 'flex', gap: 4, marginBottom: 24, background: isDark ? 'rgba(255,255,255,0.03)' : '#e2e8f0', borderRadius: 10, padding: 4 }}>
            {tabs.map((t) => (
              <button key={t.key} onClick={() => setTab(t.key)}
                style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '8px 0', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600,
                  background: tab === t.key ? (isDark ? 'rgba(99,102,241,0.18)' : '#fff') : 'transparent',
                  color: tab === t.key ? '#6366f1' : textSecondary }}>
                <t.icon size={14} /> {t.label}
              </button>
            ))}
          </div>

          {/* General tab */}
          {tab === 'general' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
              {[
                { key: 'name', label: 'Page Name' },
                { key: 'slug', label: 'URL Slug' },
                { key: 'description', label: 'Description' },
              ].map(({ key, label }) => (
                <div key={key}>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: textSecondary, marginBottom: 6 }}>{label}</label>
                  <input value={(page as any)[key] || ''} onChange={(e) => updateField(key, e.target.value)}
                    style={{ width: '100%', padding: '10px 14px', background: inputBg, border: `1px solid ${cardBorder}`, borderRadius: 10, color: textPrimary, fontSize: 14, outline: 'none' }} />
                </div>
              ))}
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: textSecondary, marginBottom: 6 }}>Header Color</label>
                <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                  <input type="color" value={page.header_color} onChange={(e) => updateField('header_color', e.target.value)}
                    style={{ width: 44, height: 36, border: 'none', borderRadius: 8, cursor: 'pointer' }} />
                  <span style={{ fontSize: 13, color: textSecondary }}>{page.header_color}</span>
                </div>
              </div>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 600, color: textSecondary, cursor: 'pointer' }}>
                <input type="checkbox" checked={page.is_public} onChange={(e) => updateField('is_public', e.target.checked)} />
                Public page
              </label>
            </motion.div>
          )}

          {/* Components tab */}
          {tab === 'components' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <div style={{ display: 'flex', gap: 8, marginBottom: 18 }}>
                <input value={newComponentName} onChange={(e) => setNewComponentName(e.target.value)} placeholder="New component name..."
                  onKeyDown={(e) => e.key === 'Enter' && addComponent()}
                  style={{ flex: 1, padding: '10px 14px', background: inputBg, border: `1px solid ${cardBorder}`, borderRadius: 10, color: textPrimary, fontSize: 14, outline: 'none' }} />
                <motion.button whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }} onClick={addComponent}
                  style={{ padding: '10px 18px', background: 'linear-gradient(135deg,#10b981,#059669)', border: 'none', borderRadius: 10, color: '#fff', cursor: 'pointer', fontWeight: 600, fontSize: 13, display: 'flex', alignItems: 'center', gap: 5 }}>
                  <Plus size={14} /> Add
                </motion.button>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {page.components.sort((a, b) => a.order - b.order).map((comp) => (
                  <motion.div key={comp.id} layout
                    style={{ background: cardBg, border: `1px solid ${cardBorder}`, borderRadius: 12, padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
                    <GripVertical size={16} style={{ color: textSecondary, cursor: 'grab', flexShrink: 0 }} />
                    <span style={{ flex: 1, fontSize: 14, fontWeight: 500, color: textPrimary }}>{comp.name}</span>
                    <select value={comp.status} onChange={(e) => updateComponentStatus(comp.id, e.target.value as any)}
                      style={{ padding: '6px 10px', background: inputBg, border: `1px solid ${cardBorder}`, borderRadius: 8, color: statusOptions.find((s) => s.value === comp.status)?.color || textPrimary, fontSize: 12, fontWeight: 600, cursor: 'pointer', outline: 'none' }}>
                      {statusOptions.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                    </select>
                    <button onClick={() => removeComponent(comp.id)}
                      style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: 4 }}>
                      <Trash2 size={14} />
                    </button>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}

          {/* Incidents tab */}
          {tab === 'incidents' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <div style={{ background: cardBg, border: `1px solid ${cardBorder}`, borderRadius: 14, padding: 18, marginBottom: 18 }}>
                <h3 style={{ fontSize: 14, fontWeight: 600, color: textPrimary, margin: '0 0 12px' }}>Create Incident</h3>
                <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
                  <input value={newIncidentTitle} onChange={(e) => setNewIncidentTitle(e.target.value)} placeholder="Incident title..."
                    style={{ flex: 1, padding: '10px 14px', background: inputBg, border: `1px solid ${cardBorder}`, borderRadius: 10, color: textPrimary, fontSize: 14, outline: 'none' }} />
                  <select value={newIncidentImpact} onChange={(e) => setNewIncidentImpact(e.target.value as any)}
                    style={{ padding: '10px 12px', background: inputBg, border: `1px solid ${cardBorder}`, borderRadius: 10, color: textPrimary, fontSize: 13, outline: 'none' }}>
                    <option value="minor">Minor</option>
                    <option value="major">Major</option>
                    <option value="critical">Critical</option>
                  </select>
                </div>
                <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={addIncident}
                  style={{ padding: '8px 18px', background: 'linear-gradient(135deg,#ef4444,#dc2626)', border: 'none', borderRadius: 8, color: '#fff', cursor: 'pointer', fontWeight: 600, fontSize: 13 }}>
                  Report Incident
                </motion.button>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {page.incidents.map((inc) => (
                  <div key={inc.id} style={{ background: cardBg, border: `1px solid ${cardBorder}`, borderRadius: 14, overflow: 'hidden' }}>
                    <div style={{ borderLeft: `4px solid ${inc.status === 'resolved' ? '#10b981' : '#f59e0b'}`, padding: '14px 18px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, cursor: 'pointer' }}
                        onClick={() => setSelectedIncident(selectedIncident === inc.id ? null : inc.id)}>
                        <h4 style={{ fontSize: 14, fontWeight: 600, color: textPrimary, margin: 0 }}>{inc.title}</h4>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{ fontSize: 11, fontWeight: 600, color: inc.status === 'resolved' ? '#10b981' : '#f59e0b', textTransform: 'capitalize' }}>{inc.status}</span>
                          <ChevronDown size={14} style={{ color: textSecondary, transform: selectedIncident === inc.id ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
                        </div>
                      </div>
                      <AnimatePresence>
                        {selectedIncident === inc.id && (
                          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} style={{ overflow: 'hidden' }}>
                            {inc.updates.map((upd) => (
                              <div key={upd.id} style={{ padding: '8px 0', borderTop: `1px solid ${cardBorder}`, marginTop: 8 }}>
                                <span style={{ fontSize: 11, fontWeight: 600, color: '#6366f1', textTransform: 'capitalize' }}>{upd.status}</span>
                                <p style={{ fontSize: 13, color: textSecondary, margin: '2px 0 0', lineHeight: 1.5 }}>{upd.message}</p>
                                <span style={{ fontSize: 10, color: '#64748b' }}>{new Date(upd.created_at).toLocaleString()}</span>
                              </div>
                            ))}
                            {inc.status !== 'resolved' && (
                              <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                                <input value={newUpdateMessage} onChange={(e) => setNewUpdateMessage(e.target.value)} placeholder="Add update..."
                                  style={{ flex: 1, padding: '8px 12px', background: inputBg, border: `1px solid ${cardBorder}`, borderRadius: 8, color: textPrimary, fontSize: 13, outline: 'none' }} />
                                <button onClick={() => addUpdate(inc.id)}
                                  style={{ padding: '8px 14px', background: '#6366f1', border: 'none', borderRadius: 8, color: '#fff', cursor: 'pointer' }}>
                                  <Send size={13} />
                                </button>
                              </div>
                            )}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {/* Subscribers tab */}
          {tab === 'subscribers' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              style={{ background: cardBg, border: `1px solid ${cardBorder}`, borderRadius: 14, padding: 24, textAlign: 'center' }}>
              <Users size={36} style={{ color: '#6366f1', marginBottom: 12 }} />
              <h3 style={{ fontSize: 18, fontWeight: 700, color: textPrimary, margin: '0 0 4px' }}>{page.subscriber_count}</h3>
              <p style={{ fontSize: 13, color: textSecondary, margin: 0 }}>Active subscribers receive email notifications on status changes</p>
            </motion.div>
          )}
        </div>

        {/* Right panel - Live Preview */}
        <div style={{ flex: '0 0 40%', borderLeft: `1px solid ${cardBorder}`, background: '#0c1426', overflowY: 'auto', padding: 0 }}>
          <div style={{ padding: '12px 18px', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', gap: 8 }}>
            <Eye size={14} style={{ color: '#94a3b8' }} />
            <span style={{ fontSize: 12, fontWeight: 600, color: '#94a3b8' }}>LIVE PREVIEW</span>
          </div>
          <div style={{ padding: 0 }}>
            {/* Mini preview header */}
            <div style={{ background: `linear-gradient(135deg,${page.header_color},${page.header_color}88)`, padding: '20px 18px 16px' }}>
              <h3 style={{ fontSize: 15, fontWeight: 700, color: '#fff', margin: 0 }}>{page.name}</h3>
              {page.description && <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.7)', margin: '4px 0 0' }}>{page.description}</p>}
            </div>
            {/* Status badge */}
            <div style={{ padding: '12px 18px', background: 'rgba(17,28,50,0.95)', margin: '0', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', gap: 8 }}>
              <CheckCircle size={14} style={{ color: ob.color }} />
              <span style={{ fontSize: 12, fontWeight: 600, color: ob.color }}>{ob.label}</span>
            </div>
            {/* Components preview */}
            <div style={{ padding: '12px 0' }}>
              {page.components.map((comp) => {
                const so = statusOptions.find((s) => s.value === comp.status);
                return (
                  <div key={comp.id} style={{ padding: '8px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                    <span style={{ fontSize: 12, color: '#cbd5e1' }}>{comp.name}</span>
                    <span style={{ fontSize: 10, fontWeight: 600, color: so?.color || '#10b981' }}>{so?.label || 'Operational'}</span>
                  </div>
                );
              })}
            </div>
            {/* Incidents preview */}
            {page.incidents.filter((i) => i.status !== 'resolved').length > 0 && (
              <div style={{ padding: '8px 18px 18px' }}>
                <span style={{ fontSize: 11, fontWeight: 600, color: '#94a3b8', marginBottom: 8, display: 'block' }}>ACTIVE INCIDENTS</span>
                {page.incidents.filter((i) => i.status !== 'resolved').map((inc) => (
                  <div key={inc.id} style={{ padding: '8px 12px', background: 'rgba(245,158,11,0.06)', borderLeft: '3px solid #f59e0b', borderRadius: '0 6px 6px 0', marginBottom: 6 }}>
                    <span style={{ fontSize: 11, fontWeight: 500, color: '#f8fafc' }}>{inc.title}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default StatusPageEditorPage;
