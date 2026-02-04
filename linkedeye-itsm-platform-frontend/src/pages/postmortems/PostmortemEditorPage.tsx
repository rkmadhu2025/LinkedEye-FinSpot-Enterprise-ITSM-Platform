/**
 * LinkedEye-FinSpot Enterprise Postmortem Editor Page
 * Flagship innovative rich editor with timeline, metrics, and action items
 * Architect Design System - Dark Theme
 */

import { useState, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Save, Send, Sparkles, FileText, Clock, Target, ThumbsUp, ThumbsDown,
  Lightbulb, CheckSquare, Plus, Trash2, GripVertical, User, Calendar,
  ChevronLeft, AlertCircle, Zap, Shield, Eye, X, Activity,
} from 'lucide-react';
import { useAppSelector } from '@/hooks/useRedux';
import toast from 'react-hot-toast';

type SectionId = 'summary' | 'timeline' | 'root_causes' | 'contributing' | 'went_well' | 'went_wrong' | 'lessons' | 'metrics' | 'actions';
type ActionStatus = 'open' | 'in_progress' | 'completed';

interface TimelineEvent {
  id: string;
  timestamp: string;
  type: 'detection' | 'escalation' | 'mitigation' | 'resolution' | 'communication' | 'custom';
  description: string;
}

interface ActionItem {
  id: string;
  title: string;
  assignee: string;
  dueDate: string;
  status: ActionStatus;
  priority: string;
}

const SECTIONS: { id: SectionId; label: string; icon: React.ElementType }[] = [
  { id: 'summary', label: 'Summary', icon: FileText },
  { id: 'timeline', label: 'Timeline', icon: Clock },
  { id: 'root_causes', label: 'Root Causes', icon: Target },
  { id: 'contributing', label: 'Contributing Factors', icon: AlertCircle },
  { id: 'went_well', label: 'What Went Well', icon: ThumbsUp },
  { id: 'went_wrong', label: 'What Went Wrong', icon: ThumbsDown },
  { id: 'lessons', label: 'Lessons Learned', icon: Lightbulb },
  { id: 'metrics', label: 'Metrics', icon: Activity },
  { id: 'actions', label: 'Action Items', icon: CheckSquare },
];

const EVENT_TYPES: { value: TimelineEvent['type']; label: string; color: string; icon: React.ElementType }[] = [
  { value: 'detection', label: 'Detection', color: '#f59e0b', icon: Eye },
  { value: 'escalation', label: 'Escalation', color: '#ef4444', icon: AlertCircle },
  { value: 'mitigation', label: 'Mitigation', color: '#6366f1', icon: Shield },
  { value: 'resolution', label: 'Resolution', color: '#10b981', icon: CheckSquare },
  { value: 'communication', label: 'Communication', color: '#3b82f6', icon: Send },
  { value: 'custom', label: 'Custom', color: '#94a3b8', icon: Zap },
];

const actionStatusConfig: Record<ActionStatus, { label: string; color: string; bg: string }> = {
  open: { label: 'Open', color: '#ef4444', bg: 'rgba(239,68,68,0.15)' },
  in_progress: { label: 'In Progress', color: '#f59e0b', bg: 'rgba(245,158,11,0.15)' },
  completed: { label: 'Completed', color: '#10b981', bg: 'rgba(16,185,129,0.15)' },
};

const PARTICIPANTS = [
  { id: '1', name: 'Sarah Chen', role: 'Incident Commander', avatar: 'SC' },
  { id: '2', name: 'James Park', role: 'Lead Engineer', avatar: 'JP' },
  { id: '3', name: 'Priya Patel', role: 'SRE', avatar: 'PP' },
  { id: '4', name: 'Alex Rivera', role: 'Product', avatar: 'AR' },
];

const PostmortemEditorPage = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const { theme } = useAppSelector((state) => state.ui);
  const [activeSection, setActiveSection] = useState<SectionId>('summary');
  const [title, setTitle] = useState('Database cluster failover during peak hours');
  const [status, setStatus] = useState<'draft' | 'in_review' | 'published'>('draft');
  const [blameFree, setBlameFree] = useState(true);
  const [summary, setSummary] = useState('On December 10th at 14:32 UTC, the primary database cluster experienced an unexpected failover during peak traffic hours. This caused approximately 2 hours of degraded service for 40% of users accessing write-dependent features.');

  const [timelineEvents, setTimelineEvents] = useState<TimelineEvent[]>([
    { id: '1', timestamp: '14:32', type: 'detection', description: 'Monitoring alerts fired for increased DB latency and connection errors' },
    { id: '2', timestamp: '14:35', type: 'escalation', description: 'On-call SRE paged, incident channel opened' },
    { id: '3', timestamp: '14:48', type: 'communication', description: 'Status page updated, stakeholders notified' },
    { id: '4', timestamp: '15:20', type: 'mitigation', description: 'Traffic redirected to read replicas for non-critical paths' },
    { id: '5', timestamp: '16:46', type: 'resolution', description: 'Primary cluster restored, all services healthy' },
  ]);

  const [rootCauses, setRootCauses] = useState(['Automatic failover misconfigured for multi-AZ setup', 'Connection pool exhaustion triggered cascading failures']);
  const [contributing, setContributing] = useState(['Peak traffic amplified the impact', 'Monitoring gap: no alert for connection pool saturation']);
  const [wentWell, setWentWell] = useState(['Quick detection via automated monitoring', 'Clear communication with stakeholders', 'Effective use of read replica failover path']);
  const [wentWrong, setWentWrong] = useState(['Failover process took too long', 'No automated runbook for this scenario', 'Connection pool limits were not tuned for peak load']);
  const [lessons, setLessons] = useState(['Need automated failover testing in staging', 'Connection pool monitoring should be a P0 alert']);

  const [actionItems, setActionItems] = useState<ActionItem[]>([
    { id: '1', title: 'Add database replica in secondary AZ', assignee: 'James Park', dueDate: '2025-12-30', status: 'in_progress', priority: 'high' },
    { id: '2', title: 'Update failover runbook with new procedure', assignee: 'Sarah Chen', dueDate: '2025-12-20', status: 'completed', priority: 'medium' },
    { id: '3', title: 'Implement connection pool monitoring alerts', assignee: 'Priya Patel', dueDate: '2025-12-25', status: 'open', priority: 'high' },
  ]);

  const sectionRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const cardBg = 'rgba(17, 28, 50, 0.95)';
  const border = 'rgba(255,255,255,0.08)';

  const scrollToSection = (id: SectionId) => {
    setActiveSection(id);
    sectionRefs.current[id]?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const addTimelineEvent = () => {
    setTimelineEvents([...timelineEvents, { id: Date.now().toString(), timestamp: '', type: 'custom', description: '' }]);
  };

  const updateTimelineEvent = (idx: number, field: keyof TimelineEvent, value: string) => {
    const updated = [...timelineEvents];
    (updated[idx] as any)[field] = value;
    setTimelineEvents(updated);
  };

  const removeTimelineEvent = (idx: number) => {
    setTimelineEvents(timelineEvents.filter((_, i) => i !== idx));
  };

  const addListItem = (setter: React.Dispatch<React.SetStateAction<string[]>>) => {
    setter((prev) => [...prev, '']);
  };

  const updateListItem = (setter: React.Dispatch<React.SetStateAction<string[]>>, idx: number, value: string) => {
    setter((prev) => prev.map((item, i) => (i === idx ? value : item)));
  };

  const removeListItem = (setter: React.Dispatch<React.SetStateAction<string[]>>, idx: number) => {
    setter((prev) => prev.filter((_, i) => i !== idx));
  };

  const addActionItem = () => {
    setActionItems([...actionItems, { id: Date.now().toString(), title: '', assignee: '', dueDate: '', status: 'open', priority: 'medium' }]);
  };

  const updateActionItem = (idx: number, field: keyof ActionItem, value: string) => {
    const updated = [...actionItems];
    (updated[idx] as any)[field] = value;
    setActionItems(updated);
  };

  const removeActionItem = (idx: number) => {
    setActionItems(actionItems.filter((_, i) => i !== idx));
  };

  const handleSave = () => toast.success('Postmortem saved as draft');
  const handlePublish = () => { setStatus('published'); toast.success('Postmortem published successfully'); };

  const EditableList = ({ items, setter, accentColor }: { items: string[]; setter: React.Dispatch<React.SetStateAction<string[]>>; accentColor?: string }) => (
    <div className="space-y-2">
      {items.map((item, i) => (
        <motion.div key={i} layout initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} className="flex items-center gap-2 group">
          <GripVertical size={14} style={{ color: '#94a3b8' }} className="opacity-0 group-hover:opacity-100 transition-opacity cursor-grab" />
          <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: accentColor || '#6366f1' }} />
          <input
            value={item}
            onChange={(e) => updateListItem(setter, i, e.target.value)}
            className="flex-1 bg-transparent outline-none text-sm py-1.5 px-2 rounded"
            style={{ color: '#f8fafc', border: `1px solid transparent` }}
            onFocus={(e) => (e.target.style.borderColor = border)}
            onBlur={(e) => (e.target.style.borderColor = 'transparent')}
            placeholder="Enter item..."
          />
          <button onClick={() => removeListItem(setter, i)} className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-red-500/10">
            <X size={14} style={{ color: '#ef4444' }} />
          </button>
        </motion.div>
      ))}
      <button onClick={() => addListItem(setter)} className="flex items-center gap-2 text-sm mt-2 px-2 py-1 rounded hover:bg-white/5 transition-colors" style={{ color: '#6366f1' }}>
        <Plus size={14} /> Add item
      </button>
    </div>
  );

  // Radial gauge for metrics
  const MetricGauge = ({ label, value, max, color, unit }: { label: string; value: number; max: number; color: string; unit: string }) => {
    const pct = Math.min((value / max) * 100, 100);
    const circumference = 2 * Math.PI * 36;
    const offset = circumference - (pct / 100) * circumference;
    return (
      <div className="flex flex-col items-center p-4 rounded-xl" style={{ background: 'rgba(255,255,255,0.03)', border: `1px solid ${border}` }}>
        <svg width="90" height="90" viewBox="0 0 90 90">
          <circle cx="45" cy="45" r="36" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="6" />
          <motion.circle
            cx="45" cy="45" r="36" fill="none" stroke={color} strokeWidth="6" strokeLinecap="round"
            strokeDasharray={circumference} initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset: offset }} transition={{ duration: 1.2, ease: 'easeOut' }}
            transform="rotate(-90 45 45)"
          />
          <text x="45" y="42" textAnchor="middle" fill="#f8fafc" fontSize="16" fontWeight="bold">{value}</text>
          <text x="45" y="56" textAnchor="middle" fill="#94a3b8" fontSize="10">{unit}</text>
        </svg>
        <span className="text-xs mt-2" style={{ color: '#94a3b8' }}>{label}</span>
      </div>
    );
  };

  return (
    <div className="min-h-screen flex flex-col" style={{ background: '#0c1426' }}>
      {/* Sticky Top Bar */}
      <motion.div
        initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
        className="sticky top-0 z-30 flex items-center gap-4 px-6 py-3"
        style={{ background: 'rgba(12,20,38,0.95)', borderBottom: `1px solid ${border}`, backdropFilter: 'blur(12px)' }}
      >
        <button onClick={() => navigate('/postmortems')} className="p-1.5 rounded-lg hover:bg-white/5 transition-colors">
          <ChevronLeft size={20} style={{ color: '#94a3b8' }} />
        </button>
        <input
          value={title} onChange={(e) => setTitle(e.target.value)}
          className="flex-1 bg-transparent text-xl font-bold outline-none" style={{ color: '#f8fafc' }}
        />
        <span className="px-2.5 py-1 rounded-full text-xs font-medium" style={{
          background: status === 'draft' ? 'rgba(148,163,184,0.15)' : status === 'in_review' ? 'rgba(245,158,11,0.15)' : 'rgba(16,185,129,0.15)',
          color: status === 'draft' ? '#94a3b8' : status === 'in_review' ? '#f59e0b' : '#10b981',
        }}>
          {status === 'in_review' ? 'In Review' : status.charAt(0).toUpperCase() + status.slice(1)}
        </span>
        <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={() => toast('Generating from incident data...', { icon: '✨' })}
          className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm" style={{ background: 'rgba(99,102,241,0.15)', color: '#6366f1', border: `1px solid rgba(99,102,241,0.2)` }}>
          <Sparkles size={14} /> Generate from Incident
        </motion.button>
        <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={handleSave}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium" style={{ background: 'rgba(255,255,255,0.08)', color: '#f8fafc', border: `1px solid ${border}` }}>
          <Save size={14} /> Save
        </motion.button>
        <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={handlePublish}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium" style={{ background: 'linear-gradient(135deg, #10b981, #059669)', color: '#fff' }}>
          <Send size={14} /> Publish
        </motion.button>
      </motion.div>

      <div className="flex flex-1 overflow-hidden">
        {/* Left Sidebar - Section Navigator */}
        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}
          className="w-56 flex-shrink-0 p-4 overflow-y-auto" style={{ borderRight: `1px solid ${border}` }}>
          <p className="text-xs font-semibold uppercase tracking-wider mb-4" style={{ color: '#94a3b8' }}>Sections</p>
          <nav className="space-y-1">
            {SECTIONS.map((s) => (
              <button key={s.id} onClick={() => scrollToSection(s.id)}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-left transition-all"
                style={{
                  background: activeSection === s.id ? 'rgba(99,102,241,0.15)' : 'transparent',
                  color: activeSection === s.id ? '#6366f1' : '#94a3b8',
                }}>
                <s.icon size={15} /> {s.label}
              </button>
            ))}
          </nav>
        </motion.div>

        {/* Main Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-8">
          {/* Summary */}
          <motion.div ref={(el) => { sectionRefs.current.summary = el; }} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            className="rounded-xl p-6" style={{ background: cardBg, border: `1px solid ${border}` }}>
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2" style={{ color: '#f8fafc' }}><FileText size={18} style={{ color: '#6366f1' }} /> Summary</h2>
            <textarea
              value={summary} onChange={(e) => setSummary(e.target.value)} rows={5}
              className="w-full bg-transparent outline-none text-sm resize-none rounded-lg p-3"
              style={{ color: '#f8fafc', border: `1px solid ${border}` }}
            />
          </motion.div>

          {/* Timeline */}
          <motion.div ref={(el) => { sectionRefs.current.timeline = el; }} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
            className="rounded-xl p-6" style={{ background: cardBg, border: `1px solid ${border}` }}>
            <h2 className="text-lg font-semibold mb-6 flex items-center gap-2" style={{ color: '#f8fafc' }}><Clock size={18} style={{ color: '#f59e0b' }} /> Incident Timeline</h2>
            <div className="relative ml-8">
              {/* Vertical line */}
              <div className="absolute left-4 top-0 bottom-0 w-0.5" style={{ background: 'rgba(255,255,255,0.1)' }} />
              <AnimatePresence>
                {timelineEvents.map((evt, i) => {
                  const evtType = EVENT_TYPES.find((t) => t.value === evt.type) || EVENT_TYPES[5];
                  return (
                    <motion.div key={evt.id} layout initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
                      transition={{ delay: i * 0.03 }} className="relative flex items-start gap-4 mb-6 group">
                      {/* Node */}
                      <div className="relative z-10 w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 border-2"
                        style={{ background: '#0c1426', borderColor: evtType.color }}>
                        <evtType.icon size={14} style={{ color: evtType.color }} />
                      </div>
                      <div className="flex-1 rounded-lg p-3" style={{ background: 'rgba(255,255,255,0.03)', border: `1px solid ${border}` }}>
                        <div className="flex items-center gap-3 mb-2">
                          <input value={evt.timestamp} onChange={(e) => updateTimelineEvent(i, 'timestamp', e.target.value)} placeholder="HH:MM"
                            className="w-20 bg-transparent outline-none text-sm font-mono font-bold" style={{ color: evtType.color }} />
                          <select value={evt.type} onChange={(e) => updateTimelineEvent(i, 'type', e.target.value)}
                            className="bg-transparent outline-none text-xs rounded px-2 py-1 cursor-pointer" style={{ color: evtType.color, border: `1px solid ${evtType.color}40` }}>
                            {EVENT_TYPES.map((t) => <option key={t.value} value={t.value} style={{ background: '#0c1426' }}>{t.label}</option>)}
                          </select>
                          <button onClick={() => removeTimelineEvent(i)} className="ml-auto opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-red-500/10">
                            <Trash2 size={13} style={{ color: '#ef4444' }} />
                          </button>
                        </div>
                        <input value={evt.description} onChange={(e) => updateTimelineEvent(i, 'description', e.target.value)} placeholder="Describe what happened..."
                          className="w-full bg-transparent outline-none text-sm" style={{ color: '#f8fafc' }} />
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
              <button onClick={addTimelineEvent} className="flex items-center gap-2 ml-12 text-sm px-3 py-1.5 rounded-lg hover:bg-white/5 transition-colors" style={{ color: '#6366f1' }}>
                <Plus size={14} /> Add Event
              </button>
            </div>
          </motion.div>

          {/* Root Causes */}
          <motion.div ref={(el) => { sectionRefs.current.root_causes = el; }} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
            className="rounded-xl p-6" style={{ background: cardBg, border: `1px solid ${border}` }}>
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2" style={{ color: '#f8fafc' }}><Target size={18} style={{ color: '#ef4444' }} /> Root Causes</h2>
            <EditableList items={rootCauses} setter={setRootCauses} accentColor="#ef4444" />
          </motion.div>

          {/* Contributing Factors */}
          <motion.div ref={(el) => { sectionRefs.current.contributing = el; }} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.12 }}
            className="rounded-xl p-6" style={{ background: cardBg, border: `1px solid ${border}` }}>
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2" style={{ color: '#f8fafc' }}><AlertCircle size={18} style={{ color: '#f59e0b' }} /> Contributing Factors</h2>
            <EditableList items={contributing} setter={setContributing} accentColor="#f59e0b" />
          </motion.div>

          {/* Went Well / Went Wrong */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <motion.div ref={(el) => { sectionRefs.current.went_well = el; }} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.14 }}
              className="rounded-xl p-6" style={{ background: cardBg, border: `1px solid ${border}`, borderTop: '2px solid #10b981' }}>
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2" style={{ color: '#f8fafc' }}><ThumbsUp size={18} style={{ color: '#10b981' }} /> What Went Well</h2>
              <EditableList items={wentWell} setter={setWentWell} accentColor="#10b981" />
            </motion.div>
            <motion.div ref={(el) => { sectionRefs.current.went_wrong = el; }} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.16 }}
              className="rounded-xl p-6" style={{ background: cardBg, border: `1px solid ${border}`, borderTop: '2px solid #ef4444' }}>
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2" style={{ color: '#f8fafc' }}><ThumbsDown size={18} style={{ color: '#ef4444' }} /> What Went Wrong</h2>
              <EditableList items={wentWrong} setter={setWentWrong} accentColor="#ef4444" />
            </motion.div>
          </div>

          {/* Lessons Learned */}
          <motion.div ref={(el) => { sectionRefs.current.lessons = el; }} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.18 }}
            className="rounded-xl p-6" style={{ background: cardBg, border: `1px solid ${border}` }}>
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2" style={{ color: '#f8fafc' }}><Lightbulb size={18} style={{ color: '#f59e0b' }} /> Lessons Learned</h2>
            <EditableList items={lessons} setter={setLessons} accentColor="#f59e0b" />
          </motion.div>

          {/* Metrics Panel */}
          <motion.div ref={(el) => { sectionRefs.current.metrics = el; }} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
            className="rounded-xl p-6" style={{ background: cardBg, border: `1px solid ${border}` }}>
            <h2 className="text-lg font-semibold mb-6 flex items-center gap-2" style={{ color: '#f8fafc' }}><Activity size={18} style={{ color: '#6366f1' }} /> Incident Metrics</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <MetricGauge label="Time to Detect (TTD)" value={3} max={60} color="#f59e0b" unit="min" />
              <MetricGauge label="Time to Acknowledge (TTA)" value={6} max={30} color="#3b82f6" unit="min" />
              <MetricGauge label="Time to Resolve (TTR)" value={134} max={480} color="#10b981" unit="min" />
              <MetricGauge label="Impact Duration" value={108} max={480} color="#ef4444" unit="min" />
            </div>
          </motion.div>

          {/* Action Items */}
          <motion.div ref={(el) => { sectionRefs.current.actions = el; }} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.22 }}
            className="rounded-xl p-6" style={{ background: cardBg, border: `1px solid ${border}` }}>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold flex items-center gap-2" style={{ color: '#f8fafc' }}><CheckSquare size={18} style={{ color: '#6366f1' }} /> Action Items</h2>
              <button onClick={addActionItem} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm" style={{ background: 'rgba(99,102,241,0.15)', color: '#6366f1' }}>
                <Plus size={14} /> Add
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ borderBottom: `1px solid ${border}` }}>
                    {['Action Item', 'Assignee', 'Due Date', 'Status', 'Priority', ''].map((h) => (
                      <th key={h} className="text-left py-2 px-3 font-medium" style={{ color: '#94a3b8' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  <AnimatePresence>
                    {actionItems.map((item, i) => {
                      const sc = actionStatusConfig[item.status];
                      return (
                        <motion.tr key={item.id} layout initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                          style={{ borderBottom: `1px solid ${border}` }} className="group">
                          <td className="py-2.5 px-3">
                            <input value={item.title} onChange={(e) => updateActionItem(i, 'title', e.target.value)} placeholder="Action item..."
                              className="bg-transparent outline-none w-full" style={{ color: '#f8fafc' }} />
                          </td>
                          <td className="py-2.5 px-3">
                            <div className="flex items-center gap-2">
                              <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium" style={{ background: 'rgba(99,102,241,0.2)', color: '#6366f1' }}>
                                {item.assignee ? item.assignee.split(' ').map((n) => n[0]).join('') : <User size={12} />}
                              </div>
                              <input value={item.assignee} onChange={(e) => updateActionItem(i, 'assignee', e.target.value)} placeholder="Assignee"
                                className="bg-transparent outline-none w-28" style={{ color: '#f8fafc' }} />
                            </div>
                          </td>
                          <td className="py-2.5 px-3">
                            <input type="date" value={item.dueDate} onChange={(e) => updateActionItem(i, 'dueDate', e.target.value)}
                              className="bg-transparent outline-none" style={{ color: '#f8fafc', colorScheme: 'dark' }} />
                          </td>
                          <td className="py-2.5 px-3">
                            <select value={item.status} onChange={(e) => updateActionItem(i, 'status', e.target.value as ActionStatus)}
                              className="rounded-full px-2.5 py-1 text-xs font-medium outline-none cursor-pointer"
                              style={{ background: sc.bg, color: sc.color, border: 'none' }}>
                              {Object.entries(actionStatusConfig).map(([k, v]) => <option key={k} value={k} style={{ background: '#0c1426' }}>{v.label}</option>)}
                            </select>
                          </td>
                          <td className="py-2.5 px-3">
                            <select value={item.priority} onChange={(e) => updateActionItem(i, 'priority', e.target.value)}
                              className="bg-transparent outline-none text-xs cursor-pointer" style={{ color: '#f8fafc' }}>
                              {['low', 'medium', 'high', 'critical'].map((p) => <option key={p} value={p} style={{ background: '#0c1426' }}>{p}</option>)}
                            </select>
                          </td>
                          <td className="py-2.5 px-3">
                            <button onClick={() => removeActionItem(i)} className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-red-500/10">
                              <Trash2 size={13} style={{ color: '#ef4444' }} />
                            </button>
                          </td>
                        </motion.tr>
                      );
                    })}
                  </AnimatePresence>
                </tbody>
              </table>
            </div>
          </motion.div>
        </div>

        {/* Right Sidebar - Participants */}
        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}
          className="w-60 flex-shrink-0 p-4 overflow-y-auto" style={{ borderLeft: `1px solid ${border}` }}>
          <p className="text-xs font-semibold uppercase tracking-wider mb-4" style={{ color: '#94a3b8' }}>Participants</p>
          <div className="space-y-3 mb-6">
            {PARTICIPANTS.map((p) => (
              <div key={p.id} className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold" style={{ background: 'rgba(99,102,241,0.2)', color: '#6366f1' }}>{p.avatar}</div>
                <div>
                  <div className="text-sm font-medium" style={{ color: '#f8fafc' }}>{p.name}</div>
                  <div className="text-xs" style={{ color: '#94a3b8' }}>{p.role}</div>
                </div>
              </div>
            ))}
          </div>
          <button className="flex items-center gap-2 text-sm w-full px-3 py-2 rounded-lg hover:bg-white/5 transition-colors" style={{ color: '#6366f1' }}>
            <Plus size={14} /> Add Participant
          </button>

          <div className="mt-8" style={{ borderTop: `1px solid ${border}`, paddingTop: '1rem' }}>
            <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: '#94a3b8' }}>Settings</p>
            <label className="flex items-center justify-between cursor-pointer">
              <span className="flex items-center gap-2 text-sm" style={{ color: '#f8fafc' }}>
                <Shield size={15} style={{ color: '#10b981' }} /> Blame-free
              </span>
              <div
                onClick={() => setBlameFree(!blameFree)}
                className="w-10 h-5 rounded-full relative transition-colors cursor-pointer"
                style={{ background: blameFree ? '#10b981' : 'rgba(255,255,255,0.15)' }}
              >
                <motion.div className="w-4 h-4 rounded-full absolute top-0.5" style={{ background: '#fff' }}
                  animate={{ left: blameFree ? '22px' : '2px' }} transition={{ type: 'spring', stiffness: 500, damping: 30 }} />
              </div>
            </label>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default PostmortemEditorPage;
