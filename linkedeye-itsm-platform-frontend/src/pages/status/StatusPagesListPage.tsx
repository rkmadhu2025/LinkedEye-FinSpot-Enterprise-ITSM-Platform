import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Globe, Plus, Search, Edit, ExternalLink, Trash2, Users, CheckCircle,
  AlertTriangle, XCircle, LayoutGrid, Activity, Eye, X, Loader2,
} from 'lucide-react';
import { useAppSelector } from '@/hooks/useRedux';
import { statusPageService, StatusPage, StatusPageCreate } from '@/services/statusPageService';
import toast from 'react-hot-toast';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.06 } },
};
const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: 'easeOut' } },
};

const statusColors: Record<string, { bg: string; text: string; dot: string; label: string }> = {
  operational: { bg: 'rgba(16,185,129,0.12)', text: '#10b981', dot: '#10b981', label: 'Operational' },
  degraded: { bg: 'rgba(245,158,11,0.12)', text: '#f59e0b', dot: '#f59e0b', label: 'Degraded' },
  partial_outage: { bg: 'rgba(249,115,22,0.12)', text: '#f97316', dot: '#f97316', label: 'Partial Outage' },
  major_outage: { bg: 'rgba(239,68,68,0.12)', text: '#ef4444', dot: '#ef4444', label: 'Major Outage' },
};

const StatusPagesListPage = () => {
  const navigate = useNavigate();
  const { theme } = useAppSelector((state) => state.ui);
  const isDark = theme === 'dark';

  const [pages, setPages] = useState<StatusPage[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingPage, setEditingPage] = useState<StatusPage | null>(null);
  const [form, setForm] = useState<StatusPageCreate>({ name: '', slug: '', description: '', header_color: '#6366f1', is_public: true });

  const fetchPages = async () => {
    try {
      setLoading(true);
      const data = await statusPageService.getStatusPages();
      setPages(data);
    } catch {
      // Use mock data for demo
      setPages([
        { id: '1', name: 'LinkedEye Platform', slug: 'linkedeye', description: 'Core platform services status', header_color: '#6366f1', overall_status: 'operational', components: [{ id: 'c1', name: 'API', status: 'operational', order: 1 }, { id: 'c2', name: 'Dashboard', status: 'operational', order: 2 }, { id: 'c3', name: 'Webhooks', status: 'degraded_performance', order: 3 }], incidents: [], subscriber_count: 234, is_public: true, created_at: '2024-01-15', updated_at: '2024-06-01' },
        { id: '2', name: 'FinSpot API', slug: 'finspot-api', description: 'Financial services API status', header_color: '#10b981', overall_status: 'degraded', components: [{ id: 'c4', name: 'REST API', status: 'operational', order: 1 }, { id: 'c5', name: 'GraphQL', status: 'degraded_performance', order: 2 }], incidents: [{ id: 'i1', title: 'Elevated latency', status: 'monitoring', impact: 'minor', components: ['c5'], updates: [], created_at: '2024-06-01' }], subscriber_count: 891, is_public: true, created_at: '2024-02-20', updated_at: '2024-06-01' },
        { id: '3', name: 'Internal Tools', slug: 'internal', description: 'Internal tooling and CI/CD', header_color: '#f59e0b', overall_status: 'partial_outage', components: [{ id: 'c6', name: 'CI/CD Pipeline', status: 'partial_outage', order: 1 }, { id: 'c7', name: 'Monitoring', status: 'operational', order: 2 }], incidents: [], subscriber_count: 56, is_public: false, created_at: '2024-03-10', updated_at: '2024-05-28' },
      ]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchPages(); }, []);

  const filtered = pages.filter((p) => p.name.toLowerCase().includes(search.toLowerCase()) || p.slug.toLowerCase().includes(search.toLowerCase()));

  const stats = {
    total: pages.length,
    operational: pages.filter((p) => p.overall_status === 'operational').length,
    degraded: pages.filter((p) => p.overall_status !== 'operational').length,
    subscribers: pages.reduce((s, p) => s + p.subscriber_count, 0),
  };

  const openCreate = () => { setEditingPage(null); setForm({ name: '', slug: '', description: '', header_color: '#6366f1', is_public: true }); setShowModal(true); };
  const openEdit = (page: StatusPage) => { setEditingPage(page); setForm({ name: page.name, slug: page.slug, description: page.description, header_color: page.header_color, is_public: page.is_public }); setShowModal(true); };

  const handleSave = async () => {
    try {
      if (editingPage) {
        await statusPageService.updateStatusPage(editingPage.id, form);
        toast.success('Status page updated');
      } else {
        await statusPageService.createStatusPage(form);
        toast.success('Status page created');
      }
      setShowModal(false);
      fetchPages();
    } catch { toast.error('Failed to save status page'); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this status page?')) return;
    try { await statusPageService.deleteStatusPage(id); toast.success('Deleted'); fetchPages(); } catch { toast.error('Delete failed'); }
  };

  const cardBg = isDark ? 'rgba(17,28,50,0.95)' : '#ffffff';
  const cardBorder = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)';
  const textPrimary = isDark ? '#f8fafc' : '#1e293b';
  const textSecondary = isDark ? '#94a3b8' : '#64748b';
  const pageBg = isDark ? '#0c1426' : '#f1f5f9';

  const statCards = [
    { label: 'Total Pages', value: stats.total, icon: LayoutGrid, color: '#6366f1' },
    { label: 'Operational', value: stats.operational, icon: CheckCircle, color: '#10b981' },
    { label: 'Degraded', value: stats.degraded, icon: AlertTriangle, color: '#f59e0b' },
    { label: 'Subscribers', value: stats.subscribers.toLocaleString(), icon: Users, color: '#8b5cf6' },
  ];

  return (
    <div style={{ minHeight: '100vh', background: pageBg, padding: '24px 32px' }}>
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
        style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28 }}>
        <div>
          <h1 style={{ fontSize: 28, fontWeight: 700, color: textPrimary, margin: 0, display: 'flex', alignItems: 'center', gap: 10 }}>
            <Globe size={28} style={{ color: '#6366f1' }} /> Status Command Center
          </h1>
          <p style={{ color: textSecondary, marginTop: 4, fontSize: 14 }}>Manage public status pages for your services and infrastructure</p>
        </div>
        <motion.button whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}
          onClick={openCreate}
          style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 20px', background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', color: '#fff', border: 'none', borderRadius: 10, cursor: 'pointer', fontWeight: 600, fontSize: 14 }}>
          <Plus size={18} /> Create Status Page
        </motion.button>
      </motion.div>

      {/* Stats Row */}
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

      {/* Search */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}
        style={{ marginBottom: 24, position: 'relative', maxWidth: 400 }}>
        <Search size={16} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: textSecondary }} />
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search status pages..."
          style={{ width: '100%', padding: '10px 14px 10px 38px', background: cardBg, border: `1px solid ${cardBorder}`, borderRadius: 10, color: textPrimary, fontSize: 14, outline: 'none' }} />
      </motion.div>

      {/* Grid */}
      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}>
          <Loader2 size={32} style={{ color: '#6366f1', animation: 'spin 1s linear infinite' }} />
        </div>
      ) : (
        <motion.div variants={containerVariants} initial="hidden" animate="visible"
          style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(380px,1fr))', gap: 20 }}>
          {filtered.map((page) => {
            const sc = statusColors[page.overall_status] || statusColors.operational;
            return (
              <motion.div key={page.id} variants={itemVariants} whileHover={{ y: -4, boxShadow: '0 12px 40px rgba(0,0,0,0.2)' }}
                style={{ background: cardBg, border: `1px solid ${cardBorder}`, borderRadius: 16, overflow: 'hidden', cursor: 'pointer' }}
                onClick={() => navigate(`/status/${page.id}/edit`)}>
                {/* Color bar */}
                <div style={{ height: 4, background: `linear-gradient(90deg,${page.header_color},${sc.dot})` }} />
                <div style={{ padding: '20px 22px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                    <div>
                      <h3 style={{ fontSize: 17, fontWeight: 600, color: textPrimary, margin: 0 }}>{page.name}</h3>
                      <span style={{ fontSize: 12, color: textSecondary }}>/{page.slug}</span>
                    </div>
                    <span style={{ padding: '4px 12px', borderRadius: 20, fontSize: 11, fontWeight: 600, background: sc.bg, color: sc.text, display: 'flex', alignItems: 'center', gap: 5 }}>
                      <span style={{ width: 6, height: 6, borderRadius: '50%', background: sc.dot }} /> {sc.label}
                    </span>
                  </div>
                  {page.description && <p style={{ fontSize: 13, color: textSecondary, margin: '0 0 16px', lineHeight: 1.5 }}>{page.description}</p>}
                  <div style={{ display: 'flex', gap: 20, marginBottom: 16, fontSize: 13, color: textSecondary }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}><Activity size={14} /> {page.components.length} Components</span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}><Users size={14} /> {page.subscriber_count} Subscribers</span>
                    {!page.is_public && <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}><Eye size={14} /> Private</span>}
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <motion.button whileHover={{ scale: 1.06 }} whileTap={{ scale: 0.95 }}
                      onClick={(e) => { e.stopPropagation(); openEdit(page); }}
                      style={{ flex: 1, padding: '8px 0', background: isDark ? 'rgba(99,102,241,0.12)' : '#eef2ff', border: 'none', borderRadius: 8, color: '#6366f1', cursor: 'pointer', fontWeight: 600, fontSize: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}>
                      <Edit size={13} /> Edit
                    </motion.button>
                    <motion.button whileHover={{ scale: 1.06 }} whileTap={{ scale: 0.95 }}
                      onClick={(e) => { e.stopPropagation(); window.open(`/status/public/${page.slug}`, '_blank'); }}
                      style={{ flex: 1, padding: '8px 0', background: isDark ? 'rgba(16,185,129,0.12)' : '#ecfdf5', border: 'none', borderRadius: 8, color: '#10b981', cursor: 'pointer', fontWeight: 600, fontSize: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}>
                      <ExternalLink size={13} /> Public
                    </motion.button>
                    <motion.button whileHover={{ scale: 1.06 }} whileTap={{ scale: 0.95 }}
                      onClick={(e) => { e.stopPropagation(); handleDelete(page.id); }}
                      style={{ padding: '8px 12px', background: isDark ? 'rgba(239,68,68,0.12)' : '#fef2f2', border: 'none', borderRadius: 8, color: '#ef4444', cursor: 'pointer' }}>
                      <Trash2 size={13} />
                    </motion.button>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </motion.div>
      )}

      {/* Create/Edit Modal */}
      <AnimatePresence>
        {showModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}
            onClick={() => setShowModal(false)}>
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              style={{ background: isDark ? '#111c32' : '#fff', border: `1px solid ${cardBorder}`, borderRadius: 18, padding: 32, width: 480, maxHeight: '80vh', overflow: 'auto' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                <h2 style={{ fontSize: 20, fontWeight: 700, color: textPrimary, margin: 0 }}>{editingPage ? 'Edit Status Page' : 'Create Status Page'}</h2>
                <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', color: textSecondary, cursor: 'pointer' }}><X size={20} /></button>
              </div>
              {[
                { key: 'name', label: 'Page Name', placeholder: 'My Service Status' },
                { key: 'slug', label: 'URL Slug', placeholder: 'my-service' },
                { key: 'description', label: 'Description', placeholder: 'Status page for our services' },
              ].map(({ key, label, placeholder }) => (
                <div key={key} style={{ marginBottom: 18 }}>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: textSecondary, marginBottom: 6 }}>{label}</label>
                  <input value={(form as any)[key] || ''} onChange={(e) => setForm({ ...form, [key]: e.target.value })} placeholder={placeholder}
                    style={{ width: '100%', padding: '10px 14px', background: isDark ? 'rgba(255,255,255,0.04)' : '#f8fafc', border: `1px solid ${cardBorder}`, borderRadius: 10, color: textPrimary, fontSize: 14, outline: 'none' }} />
                </div>
              ))}
              <div style={{ marginBottom: 18 }}>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: textSecondary, marginBottom: 6 }}>Header Color</label>
                <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                  <input type="color" value={form.header_color || '#6366f1'} onChange={(e) => setForm({ ...form, header_color: e.target.value })}
                    style={{ width: 44, height: 36, border: 'none', borderRadius: 8, cursor: 'pointer' }} />
                  <span style={{ fontSize: 13, color: textSecondary }}>{form.header_color}</span>
                </div>
              </div>
              <div style={{ marginBottom: 24 }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 600, color: textSecondary, cursor: 'pointer' }}>
                  <input type="checkbox" checked={form.is_public} onChange={(e) => setForm({ ...form, is_public: e.target.checked })} />
                  Make publicly accessible
                </label>
              </div>
              <div style={{ display: 'flex', gap: 12 }}>
                <button onClick={() => setShowModal(false)}
                  style={{ flex: 1, padding: '10px 0', background: isDark ? 'rgba(255,255,255,0.06)' : '#f1f5f9', border: `1px solid ${cardBorder}`, borderRadius: 10, color: textSecondary, cursor: 'pointer', fontWeight: 600, fontSize: 14 }}>
                  Cancel
                </button>
                <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={handleSave}
                  style={{ flex: 1, padding: '10px 0', background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', border: 'none', borderRadius: 10, color: '#fff', cursor: 'pointer', fontWeight: 600, fontSize: 14 }}>
                  {editingPage ? 'Update' : 'Create'}
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default StatusPagesListPage;
