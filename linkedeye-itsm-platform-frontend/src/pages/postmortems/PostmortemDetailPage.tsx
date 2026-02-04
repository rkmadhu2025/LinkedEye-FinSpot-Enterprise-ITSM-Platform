/**
 * LinkedEye-FinSpot Enterprise Postmortem Detail Page
 * Read-only published postmortem view with document-style layout
 * Architect Design System - Dark Theme
 */

import { useNavigate, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ChevronLeft, Printer, Download, FileText, Clock, Target, AlertCircle,
  ThumbsUp, ThumbsDown, Lightbulb, CheckSquare, Activity, Shield, Eye,
  CheckCircle, Circle, User,
} from 'lucide-react';
import { useAppSelector } from '@/hooks/useRedux';
import toast from 'react-hot-toast';

const EVENT_COLORS: Record<string, string> = {
  detection: '#f59e0b', escalation: '#ef4444', mitigation: '#6366f1',
  resolution: '#10b981', communication: '#3b82f6', custom: '#94a3b8',
};

const MOCK = {
  title: 'Database cluster failover during peak hours',
  incidentRef: 'INC-1042',
  status: 'published' as const,
  severity: 'critical',
  blameFree: true,
  author: 'Sarah Chen',
  publishedAt: 'December 15, 2025',
  summary: 'On December 10th at 14:32 UTC, the primary database cluster experienced an unexpected failover during peak traffic hours. This caused approximately 2 hours of degraded service for 40% of users accessing write-dependent features. The root cause was a misconfigured automatic failover mechanism combined with connection pool exhaustion.',
  timeline: [
    { timestamp: '14:32', type: 'detection', description: 'Monitoring alerts fired for increased DB latency and connection errors' },
    { timestamp: '14:35', type: 'escalation', description: 'On-call SRE paged, incident channel opened' },
    { timestamp: '14:48', type: 'communication', description: 'Status page updated, stakeholders notified via Slack' },
    { timestamp: '15:20', type: 'mitigation', description: 'Traffic redirected to read replicas for non-critical paths' },
    { timestamp: '16:46', type: 'resolution', description: 'Primary cluster restored, all services verified healthy' },
  ],
  rootCauses: ['Automatic failover misconfigured for multi-AZ setup', 'Connection pool exhaustion triggered cascading failures'],
  contributing: ['Peak traffic 3x normal load amplified the impact', 'No alert configured for connection pool saturation threshold'],
  wentWell: ['Detection within 3 minutes via automated monitoring', 'Clear communication cadence with stakeholders', 'Effective use of read replica failover path reduced blast radius'],
  wentWrong: ['Failover process took 48 minutes instead of expected 5 minutes', 'No automated runbook for this failure scenario', 'Connection pool limits not tuned for peak traffic patterns'],
  lessons: ['Need automated failover chaos testing in staging monthly', 'Connection pool monitoring should be a P0 alert with auto-scaling', 'Runbook automation can reduce TTR by 60%+'],
  metrics: { ttd: 3, tta: 6, ttr: 134, impact: 108 },
  actionItems: [
    { title: 'Add database replica in secondary AZ', assignee: 'James Park', dueDate: '2025-12-30', status: 'in_progress', priority: 'high' },
    { title: 'Update failover runbook with automated procedure', assignee: 'Sarah Chen', dueDate: '2025-12-20', status: 'completed', priority: 'medium' },
    { title: 'Implement connection pool monitoring and auto-scaling alerts', assignee: 'Priya Patel', dueDate: '2025-12-25', status: 'open', priority: 'high' },
  ],
  participants: [
    { name: 'Sarah Chen', role: 'Incident Commander', avatar: 'SC' },
    { name: 'James Park', role: 'Lead Engineer', avatar: 'JP' },
    { name: 'Priya Patel', role: 'SRE', avatar: 'PP' },
    { name: 'Alex Rivera', role: 'Product', avatar: 'AR' },
  ],
};

const PostmortemDetailPage = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const { theme } = useAppSelector((state) => state.ui);
  const cardBg = 'rgba(17, 28, 50, 0.95)';
  const border = 'rgba(255,255,255,0.08)';
  const pm = MOCK;

  const statusColors: Record<string, { color: string; bg: string }> = {
    open: { color: '#ef4444', bg: 'rgba(239,68,68,0.15)' },
    in_progress: { color: '#f59e0b', bg: 'rgba(245,158,11,0.15)' },
    completed: { color: '#10b981', bg: 'rgba(16,185,129,0.15)' },
  };

  const Section = ({ title, icon: Icon, color, children }: { title: string; icon: React.ElementType; color: string; children: React.ReactNode }) => (
    <motion.div initial={{ opacity: 0, y: 15 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
      className="rounded-xl p-6 mb-6" style={{ background: cardBg, border: `1px solid ${border}` }}>
      <h2 className="text-lg font-semibold mb-4 flex items-center gap-2" style={{ color: '#f8fafc' }}>
        <Icon size={18} style={{ color }} /> {title}
      </h2>
      {children}
    </motion.div>
  );

  const BulletList = ({ items, color }: { items: string[]; color: string }) => (
    <ul className="space-y-2.5">
      {items.map((item, i) => (
        <li key={i} className="flex items-start gap-3 text-sm" style={{ color: '#f8fafc' }}>
          <div className="w-2 h-2 rounded-full mt-1.5 flex-shrink-0" style={{ background: color }} />
          {item}
        </li>
      ))}
    </ul>
  );

  return (
    <div className="min-h-screen" style={{ background: '#0c1426' }}>
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
        className="sticky top-0 z-30 flex items-center gap-4 px-6 py-4" style={{ background: 'rgba(12,20,38,0.95)', borderBottom: `1px solid ${border}`, backdropFilter: 'blur(12px)' }}>
        <button onClick={() => navigate('/postmortems')} className="p-1.5 rounded-lg hover:bg-white/5"><ChevronLeft size={20} style={{ color: '#94a3b8' }} /></button>
        <div className="flex-1">
          <h1 className="text-xl font-bold" style={{ color: '#f8fafc' }}>{pm.title}</h1>
          <div className="flex items-center gap-3 mt-1 text-sm" style={{ color: '#94a3b8' }}>
            <span>{pm.incidentRef}</span>
            <span>Published {pm.publishedAt}</span>
            <span>by {pm.author}</span>
            {pm.blameFree && <span className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full" style={{ background: 'rgba(16,185,129,0.1)', color: '#10b981' }}><Shield size={11} /> Blame-free</span>}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {pm.participants.map((p) => (
            <div key={p.name} className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold" style={{ background: 'rgba(99,102,241,0.2)', color: '#6366f1' }} title={`${p.name} - ${p.role}`}>{p.avatar}</div>
          ))}
        </div>
        <button onClick={() => { window.print(); toast.success('Preparing print view...'); }} className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm" style={{ background: 'rgba(255,255,255,0.08)', color: '#f8fafc', border: `1px solid ${border}` }}>
          <Printer size={14} /> Print
        </button>
        <button onClick={() => toast.success('Exporting PDF...')} className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm" style={{ background: 'rgba(99,102,241,0.15)', color: '#6366f1' }}>
          <Download size={14} /> Export
        </button>
      </motion.div>

      {/* Content */}
      <div className="max-w-4xl mx-auto p-6">
        <Section title="Summary" icon={FileText} color="#6366f1">
          <p className="text-sm leading-relaxed" style={{ color: '#f8fafc' }}>{pm.summary}</p>
        </Section>

        {/* Metrics */}
        <Section title="Incident Metrics" icon={Activity} color="#6366f1">
          <div className="grid grid-cols-4 gap-4">
            {[
              { label: 'Time to Detect', value: `${pm.metrics.ttd}m`, color: '#f59e0b' },
              { label: 'Time to Acknowledge', value: `${pm.metrics.tta}m`, color: '#3b82f6' },
              { label: 'Time to Resolve', value: `${pm.metrics.ttr}m`, color: '#10b981' },
              { label: 'Impact Duration', value: `${pm.metrics.impact}m`, color: '#ef4444' },
            ].map((m) => (
              <div key={m.label} className="text-center p-4 rounded-lg" style={{ background: 'rgba(255,255,255,0.03)', border: `1px solid ${border}` }}>
                <div className="text-2xl font-bold mb-1" style={{ color: m.color }}>{m.value}</div>
                <div className="text-xs" style={{ color: '#94a3b8' }}>{m.label}</div>
              </div>
            ))}
          </div>
        </Section>

        {/* Timeline */}
        <Section title="Incident Timeline" icon={Clock} color="#f59e0b">
          <div className="relative ml-4">
            <div className="absolute left-3 top-0 bottom-0 w-0.5" style={{ background: 'rgba(255,255,255,0.1)' }} />
            {pm.timeline.map((evt, i) => (
              <motion.div key={i} initial={{ opacity: 0, x: -15 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.05 }}
                className="relative flex items-start gap-4 mb-5">
                <div className="relative z-10 w-6 h-6 rounded-full flex items-center justify-center" style={{ background: EVENT_COLORS[evt.type] || '#94a3b8' }}>
                  <div className="w-2 h-2 rounded-full bg-white" />
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-sm font-mono font-bold" style={{ color: EVENT_COLORS[evt.type] }}>{evt.timestamp}</span>
                    <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: `${EVENT_COLORS[evt.type]}20`, color: EVENT_COLORS[evt.type] }}>{evt.type}</span>
                  </div>
                  <p className="text-sm" style={{ color: '#f8fafc' }}>{evt.description}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </Section>

        <Section title="Root Causes" icon={Target} color="#ef4444"><BulletList items={pm.rootCauses} color="#ef4444" /></Section>
        <Section title="Contributing Factors" icon={AlertCircle} color="#f59e0b"><BulletList items={pm.contributing} color="#f59e0b" /></Section>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div className="rounded-xl p-6" style={{ background: cardBg, border: `1px solid ${border}`, borderTop: '2px solid #10b981' }}>
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2" style={{ color: '#f8fafc' }}><ThumbsUp size={18} style={{ color: '#10b981' }} /> What Went Well</h2>
            <BulletList items={pm.wentWell} color="#10b981" />
          </div>
          <div className="rounded-xl p-6" style={{ background: cardBg, border: `1px solid ${border}`, borderTop: '2px solid #ef4444' }}>
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2" style={{ color: '#f8fafc' }}><ThumbsDown size={18} style={{ color: '#ef4444' }} /> What Went Wrong</h2>
            <BulletList items={pm.wentWrong} color="#ef4444" />
          </div>
        </div>

        <Section title="Lessons Learned" icon={Lightbulb} color="#f59e0b"><BulletList items={pm.lessons} color="#f59e0b" /></Section>

        {/* Action Items Table */}
        <Section title="Action Items" icon={CheckSquare} color="#6366f1">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: `1px solid ${border}` }}>
                  {['Status', 'Action Item', 'Assignee', 'Due Date', 'Priority'].map((h) => (
                    <th key={h} className="text-left py-2.5 px-3 font-medium" style={{ color: '#94a3b8' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {pm.actionItems.map((item, i) => {
                  const sc = statusColors[item.status] || statusColors.open;
                  return (
                    <tr key={i} style={{ borderBottom: `1px solid ${border}` }}>
                      <td className="py-3 px-3">
                        <span className="px-2.5 py-1 rounded-full text-xs font-medium" style={{ background: sc.bg, color: sc.color }}>
                          {item.status === 'in_progress' ? 'In Progress' : item.status.charAt(0).toUpperCase() + item.status.slice(1)}
                        </span>
                      </td>
                      <td className="py-3 px-3" style={{ color: '#f8fafc' }}>{item.title}</td>
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs" style={{ background: 'rgba(99,102,241,0.2)', color: '#6366f1' }}>
                            {item.assignee.split(' ').map((n) => n[0]).join('')}
                          </div>
                          <span style={{ color: '#f8fafc' }}>{item.assignee}</span>
                        </div>
                      </td>
                      <td className="py-3 px-3" style={{ color: '#94a3b8' }}>{item.dueDate}</td>
                      <td className="py-3 px-3">
                        <span className="text-xs px-2 py-0.5 rounded" style={{
                          background: item.priority === 'high' ? 'rgba(239,68,68,0.15)' : 'rgba(99,102,241,0.15)',
                          color: item.priority === 'high' ? '#ef4444' : '#6366f1',
                        }}>{item.priority}</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Section>
      </div>
    </div>
  );
};

export default PostmortemDetailPage;
