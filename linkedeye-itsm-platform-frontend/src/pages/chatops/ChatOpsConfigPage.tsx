/**
 * LinkedEye-FinSpot Enterprise ChatOps Configuration Page
 * Architect Design System - Dark Theme
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MessageSquare, Plus, Hash, Settings, Trash2, TestTube, Edit3,
  CheckCircle, XCircle, Clock, Bell, AlertTriangle, Zap, X,
  Send, Wifi, WifiOff, Globe, Terminal,
} from 'lucide-react';
import { useAppSelector } from '@/hooks/useRedux';
import toast from 'react-hot-toast';

type Platform = 'slack' | 'teams' | 'discord' | 'webhook';

interface Channel {
  id: string;
  name: string;
  workspace: string;
  platform: Platform;
  connected: boolean;
  webhookUrl: string;
  messages24h: number;
  lastMessage: string;
  autoCreateIncidents: boolean;
  notificationTypes: string[];
  linkedServices: string[];
}

const platformConfig: Record<Platform, { label: string; color: string; bgColor: string; icon: React.ElementType }> = {
  slack: { label: 'Slack', color: '#e01e5a', bgColor: 'rgba(224,30,90,0.15)', icon: Hash },
  teams: { label: 'Teams', color: '#5059c9', bgColor: 'rgba(80,89,201,0.15)', icon: MessageSquare },
  discord: { label: 'Discord', color: '#7289da', bgColor: 'rgba(114,137,218,0.15)', icon: MessageSquare },
  webhook: { label: 'Webhook', color: '#10b981', bgColor: 'rgba(16,185,129,0.15)', icon: Globe },
};

const MOCK_CHANNELS: Channel[] = [
  { id: '1', name: '#incidents-critical', workspace: 'FinSpot Engineering', platform: 'slack', connected: true, webhookUrl: 'https://hooks.slack.com/...', messages24h: 47, lastMessage: '2 min ago', autoCreateIncidents: true, notificationTypes: ['incidents', 'alerts', 'changes'], linkedServices: ['API Gateway', 'Database', 'Auth Service'] },
  { id: '2', name: '#sre-alerts', workspace: 'FinSpot Engineering', platform: 'slack', connected: true, webhookUrl: 'https://hooks.slack.com/...', messages24h: 128, lastMessage: '30 sec ago', autoCreateIncidents: false, notificationTypes: ['alerts', 'monitoring'], linkedServices: ['All Services'] },
  { id: '3', name: 'IT Operations', workspace: 'FinSpot IT', platform: 'teams', connected: true, webhookUrl: 'https://outlook.office.com/...', messages24h: 23, lastMessage: '15 min ago', autoCreateIncidents: false, notificationTypes: ['incidents', 'changes'], linkedServices: ['Exchange', 'Active Directory'] },
  { id: '4', name: '#devops-notifications', workspace: 'FinSpot DevOps', platform: 'discord', connected: false, webhookUrl: 'https://discord.com/api/webhooks/...', messages24h: 0, lastMessage: '2 days ago', autoCreateIncidents: false, notificationTypes: ['deployments'], linkedServices: ['CI/CD Pipeline'] },
  { id: '5', name: 'PagerDuty Webhook', workspace: 'External', platform: 'webhook', connected: true, webhookUrl: 'https://events.pagerduty.com/...', messages24h: 12, lastMessage: '1 hr ago', autoCreateIncidents: true, notificationTypes: ['alerts', 'incidents'], linkedServices: ['Monitoring Stack'] },
];

const COMMANDS = [
  { command: '/itsm incident create', description: 'Create a new incident from chat', example: '/itsm incident create "API down" --severity critical' },
  { command: '/itsm incident list', description: 'List open incidents', example: '/itsm incident list --status open --limit 5' },
  { command: '/itsm incident ack', description: 'Acknowledge an incident', example: '/itsm incident ack INC-1042' },
  { command: '/itsm oncall who', description: 'Show current on-call engineer', example: '/itsm oncall who --schedule primary' },
  { command: '/itsm alert silence', description: 'Silence alerts for a duration', example: '/itsm alert silence "cpu*" --duration 30m' },
  { command: '/itsm status', description: 'Show platform status summary', example: '/itsm status' },
  { command: '/itsm change list', description: 'List upcoming changes', example: '/itsm change list --window 7d' },
  { command: '/itsm runbook exec', description: 'Execute an automated runbook', example: '/itsm runbook exec restart-service --target api-gw' },
];

const NOTIFICATION_OPTIONS = ['incidents', 'alerts', 'changes', 'monitoring', 'deployments', 'on-call', 'postmortems'];

const ChatOpsConfigPage = () => {
  const { theme } = useAppSelector((state) => state.ui);
  const [channels, setChannels] = useState(MOCK_CHANNELS);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newChannel, setNewChannel] = useState<{ platform: Platform; name: string; workspace: string; webhookUrl: string; notificationTypes: string[] }>({
    platform: 'slack', name: '', workspace: '', webhookUrl: '', notificationTypes: [],
  });

  const cardBg = 'rgba(17, 28, 50, 0.95)';
  const border = 'rgba(255,255,255,0.08)';

  const stats = {
    totalChannels: channels.length,
    messages24h: channels.reduce((sum, c) => sum + c.messages24h, 0),
    activeChannels: channels.filter((c) => c.connected).length,
  };

  const toggleNotificationType = (type: string) => {
    setNewChannel((prev) => ({
      ...prev,
      notificationTypes: prev.notificationTypes.includes(type)
        ? prev.notificationTypes.filter((t) => t !== type)
        : [...prev.notificationTypes, type],
    }));
  };

  const handleAddChannel = () => {
    if (!newChannel.name || !newChannel.webhookUrl) { toast.error('Name and webhook URL are required'); return; }
    const channel: Channel = {
      id: Date.now().toString(), ...newChannel, connected: false, messages24h: 0,
      lastMessage: 'Never', autoCreateIncidents: false, linkedServices: [],
    };
    setChannels([...channels, channel]);
    setShowAddModal(false);
    setNewChannel({ platform: 'slack', name: '', workspace: '', webhookUrl: '', notificationTypes: [] });
    toast.success('Channel added successfully');
  };

  return (
    <div className="min-h-screen p-6" style={{ background: '#0c1426' }}>
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3" style={{ color: '#f8fafc' }}>
            <div className="p-2.5 rounded-xl" style={{ background: 'linear-gradient(135deg, rgba(99,102,241,0.2), rgba(139,92,246,0.2))' }}>
              <Terminal size={24} style={{ color: '#6366f1' }} />
            </div>
            ChatOps Command Center
          </h1>
          <p className="mt-1" style={{ color: '#94a3b8' }}>Manage chat integrations and automated workflows</p>
        </div>
        <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 px-5 py-2.5 rounded-lg font-medium"
          style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', color: '#fff' }}>
          <Plus size={18} /> Add Channel
        </motion.button>
      </motion.div>

      {/* Stats */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        {[
          { label: 'Total Channels', value: stats.totalChannels, icon: MessageSquare, color: '#6366f1' },
          { label: 'Messages (24h)', value: stats.messages24h, icon: Send, color: '#10b981' },
          { label: 'Active Channels', value: stats.activeChannels, icon: Wifi, color: '#f59e0b' },
        ].map((s, i) => (
          <motion.div key={s.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 + i * 0.05 }}
            className="rounded-xl p-5" style={{ background: cardBg, border: `1px solid ${border}` }}>
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm" style={{ color: '#94a3b8' }}>{s.label}</span>
              <div className="p-2 rounded-lg" style={{ background: `${s.color}20` }}><s.icon size={18} style={{ color: s.color }} /></div>
            </div>
            <div className="text-2xl font-bold" style={{ color: '#f8fafc' }}>{s.value}</div>
          </motion.div>
        ))}
      </motion.div>

      {/* Channel Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 mb-10">
        <AnimatePresence>
          {channels.map((ch, i) => {
            const pc = platformConfig[ch.platform];
            return (
              <motion.div key={ch.id} layout initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9 }}
                transition={{ delay: i * 0.04 }} className="rounded-xl p-5 group" style={{ background: cardBg, border: `1px solid ${border}` }}>
                {/* Platform + Name */}
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: pc.bgColor }}>
                    <pc.icon size={20} style={{ color: pc.color }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold truncate" style={{ color: '#f8fafc' }}>{ch.name}</h3>
                      <div className="flex items-center gap-1">
                        <div className="w-2 h-2 rounded-full" style={{ background: ch.connected ? '#10b981' : '#ef4444' }} />
                        <span className="text-xs" style={{ color: ch.connected ? '#10b981' : '#ef4444' }}>{ch.connected ? 'Connected' : 'Disconnected'}</span>
                      </div>
                    </div>
                    <p className="text-xs" style={{ color: '#94a3b8' }}>{ch.workspace} - {pc.label}</p>
                  </div>
                </div>

                {/* Stats Row */}
                <div className="flex items-center gap-4 mb-4 text-sm" style={{ color: '#94a3b8' }}>
                  <span className="flex items-center gap-1"><Send size={12} /> {ch.messages24h} msgs/24h</span>
                  <span className="flex items-center gap-1"><Clock size={12} /> {ch.lastMessage}</span>
                </div>

                {/* Settings */}
                <div className="mb-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs" style={{ color: '#94a3b8' }}>Auto-create incidents</span>
                    <div className="w-8 h-4 rounded-full cursor-pointer" style={{ background: ch.autoCreateIncidents ? '#10b981' : 'rgba(255,255,255,0.15)' }}
                      onClick={() => { const updated = channels.map((c) => c.id === ch.id ? { ...c, autoCreateIncidents: !c.autoCreateIncidents } : c); setChannels(updated); }}>
                      <div className="w-3 h-3 rounded-full bg-white mt-0.5" style={{ marginLeft: ch.autoCreateIncidents ? '18px' : '2px', transition: 'margin-left 0.2s' }} />
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {ch.notificationTypes.map((t) => (
                      <span key={t} className="text-xs px-2 py-0.5 rounded-full" style={{ background: 'rgba(99,102,241,0.1)', color: '#6366f1' }}>{t}</span>
                    ))}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 pt-3" style={{ borderTop: `1px solid ${border}` }}>
                  <button onClick={() => toast.success(`Testing connection to ${ch.name}...`)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs flex-1 justify-center"
                    style={{ background: 'rgba(16,185,129,0.1)', color: '#10b981' }}>
                    <TestTube size={12} /> Test
                  </button>
                  <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs flex-1 justify-center"
                    style={{ background: 'rgba(99,102,241,0.1)', color: '#6366f1' }}>
                    <Edit3 size={12} /> Edit
                  </button>
                  <button onClick={() => { setChannels(channels.filter((c) => c.id !== ch.id)); toast.success('Channel removed'); }}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs flex-1 justify-center"
                    style={{ background: 'rgba(239,68,68,0.1)', color: '#ef4444' }}>
                    <Trash2 size={12} /> Delete
                  </button>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {/* Command Reference */}
      <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
        className="rounded-xl overflow-hidden" style={{ background: cardBg, border: `1px solid ${border}` }}>
        <div className="p-5" style={{ borderBottom: `1px solid ${border}` }}>
          <h3 className="text-lg font-semibold flex items-center gap-2" style={{ color: '#f8fafc' }}>
            <Terminal size={18} style={{ color: '#6366f1' }} /> Command Reference
          </h3>
          <p className="text-sm mt-1" style={{ color: '#94a3b8' }}>Available /itsm commands for all connected channels</p>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr style={{ borderBottom: `1px solid ${border}` }}>
              {['Command', 'Description', 'Example'].map((h) => (
                <th key={h} className="text-left py-3 px-5 font-medium" style={{ color: '#94a3b8' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {COMMANDS.map((cmd) => (
              <tr key={cmd.command} className="hover:bg-white/[0.02] transition-colors" style={{ borderBottom: `1px solid ${border}` }}>
                <td className="py-3 px-5"><code className="text-xs px-2 py-1 rounded font-mono" style={{ background: 'rgba(99,102,241,0.1)', color: '#6366f1' }}>{cmd.command}</code></td>
                <td className="py-3 px-5" style={{ color: '#f8fafc' }}>{cmd.description}</td>
                <td className="py-3 px-5"><code className="text-xs" style={{ color: '#94a3b8' }}>{cmd.example}</code></td>
              </tr>
            ))}
          </tbody>
        </table>
      </motion.div>

      {/* Add Channel Modal */}
      <AnimatePresence>
        {showAddModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setShowAddModal(false)}>
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
              className="w-full max-w-lg rounded-2xl p-6" style={{ background: '#111c32', border: `1px solid ${border}` }} onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold" style={{ color: '#f8fafc' }}>Add Channel</h3>
                <button onClick={() => setShowAddModal(false)} className="p-1 rounded-lg hover:bg-white/5"><X size={18} style={{ color: '#94a3b8' }} /></button>
              </div>

              {/* Platform selector */}
              <p className="text-sm mb-2" style={{ color: '#94a3b8' }}>Platform</p>
              <div className="grid grid-cols-4 gap-2 mb-5">
                {(Object.keys(platformConfig) as Platform[]).map((p) => {
                  const pc = platformConfig[p];
                  return (
                    <button key={p} onClick={() => setNewChannel({ ...newChannel, platform: p })}
                      className="flex flex-col items-center gap-2 p-3 rounded-xl transition-all"
                      style={{
                        background: newChannel.platform === p ? pc.bgColor : 'rgba(255,255,255,0.03)',
                        border: `1px solid ${newChannel.platform === p ? pc.color + '40' : border}`,
                      }}>
                      <pc.icon size={20} style={{ color: pc.color }} />
                      <span className="text-xs" style={{ color: newChannel.platform === p ? pc.color : '#94a3b8' }}>{pc.label}</span>
                    </button>
                  );
                })}
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-sm mb-1 block" style={{ color: '#94a3b8' }}>Channel Name</label>
                  <input value={newChannel.name} onChange={(e) => setNewChannel({ ...newChannel, name: e.target.value })}
                    placeholder="#channel-name" className="w-full px-3 py-2.5 rounded-lg text-sm outline-none"
                    style={{ background: 'rgba(255,255,255,0.05)', border: `1px solid ${border}`, color: '#f8fafc' }} />
                </div>
                <div>
                  <label className="text-sm mb-1 block" style={{ color: '#94a3b8' }}>Workspace</label>
                  <input value={newChannel.workspace} onChange={(e) => setNewChannel({ ...newChannel, workspace: e.target.value })}
                    placeholder="Workspace name" className="w-full px-3 py-2.5 rounded-lg text-sm outline-none"
                    style={{ background: 'rgba(255,255,255,0.05)', border: `1px solid ${border}`, color: '#f8fafc' }} />
                </div>
                <div>
                  <label className="text-sm mb-1 block" style={{ color: '#94a3b8' }}>Webhook URL</label>
                  <input value={newChannel.webhookUrl} onChange={(e) => setNewChannel({ ...newChannel, webhookUrl: e.target.value })}
                    placeholder="https://hooks..." className="w-full px-3 py-2.5 rounded-lg text-sm outline-none font-mono"
                    style={{ background: 'rgba(255,255,255,0.05)', border: `1px solid ${border}`, color: '#f8fafc' }} />
                </div>
                <div>
                  <label className="text-sm mb-2 block" style={{ color: '#94a3b8' }}>Notification Types</label>
                  <div className="flex flex-wrap gap-2">
                    {NOTIFICATION_OPTIONS.map((opt) => (
                      <button key={opt} onClick={() => toggleNotificationType(opt)}
                        className="px-3 py-1.5 rounded-lg text-xs transition-all"
                        style={{
                          background: newChannel.notificationTypes.includes(opt) ? 'rgba(99,102,241,0.2)' : 'rgba(255,255,255,0.05)',
                          color: newChannel.notificationTypes.includes(opt) ? '#6366f1' : '#94a3b8',
                          border: `1px solid ${newChannel.notificationTypes.includes(opt) ? 'rgba(99,102,241,0.3)' : border}`,
                        }}>
                        {opt}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3 mt-6">
                <button onClick={() => setShowAddModal(false)} className="flex-1 px-4 py-2.5 rounded-lg text-sm"
                  style={{ background: 'rgba(255,255,255,0.05)', color: '#94a3b8', border: `1px solid ${border}` }}>Cancel</button>
                <button onClick={handleAddChannel} className="flex-1 px-4 py-2.5 rounded-lg text-sm font-medium"
                  style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', color: '#fff' }}>Add Channel</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ChatOpsConfigPage;
