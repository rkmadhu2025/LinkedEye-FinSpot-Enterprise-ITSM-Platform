/**
 * LinkedEye-FinSpot Enterprise ChatOps Message Activity Log
 * Architect Design System - Dark Theme
 */

import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  MessageSquare, Hash, Search, Filter, ArrowDownLeft, ArrowUpRight,
  Terminal, Clock, AlertTriangle, Globe, ExternalLink,
} from 'lucide-react';
import { useAppSelector } from '@/hooks/useRedux';

type Direction = 'inbound' | 'outbound';
type MessageType = 'notification' | 'command' | 'response' | 'alert';

interface ChatMessage {
  id: string;
  channel: string;
  platform: 'slack' | 'teams' | 'discord' | 'webhook';
  direction: Direction;
  type: MessageType;
  content: string;
  timestamp: string;
  date: string;
  command?: string;
  commandResponse?: string;
  incidentRef?: string;
}

const platformColors: Record<string, string> = { slack: '#e01e5a', teams: '#5059c9', discord: '#7289da', webhook: '#10b981' };

const MOCK_MESSAGES: ChatMessage[] = [
  { id: '1', channel: '#incidents-critical', platform: 'slack', direction: 'outbound', type: 'alert', content: 'CRITICAL: Database cluster failover detected. Incident INC-1042 auto-created. On-call engineer Sarah Chen has been paged.', timestamp: '14:55', date: '2025-12-15', incidentRef: 'INC-1042' },
  { id: '2', channel: '#incidents-critical', platform: 'slack', direction: 'inbound', type: 'command', content: '/itsm incident ack INC-1042', timestamp: '14:57', date: '2025-12-15', command: 'incident ack', commandResponse: 'Incident INC-1042 acknowledged by Sarah Chen. TTR timer started.', incidentRef: 'INC-1042' },
  { id: '3', channel: '#sre-alerts', platform: 'slack', direction: 'outbound', type: 'notification', content: 'Alert group "High CPU utilization across web tier" updated. 23 alerts correlated. Severity: Critical.', timestamp: '14:52', date: '2025-12-15' },
  { id: '4', channel: '#sre-alerts', platform: 'slack', direction: 'inbound', type: 'command', content: '/itsm oncall who', timestamp: '14:50', date: '2025-12-15', command: 'oncall who', commandResponse: 'Current on-call: Sarah Chen (Primary), James Park (Secondary). Shift ends: 22:00 UTC.' },
  { id: '5', channel: 'IT Operations', platform: 'teams', direction: 'outbound', type: 'notification', content: 'Change CHG-0089 "Database maintenance window" approved. Scheduled: Dec 16, 02:00-04:00 UTC.', timestamp: '14:30', date: '2025-12-15' },
  { id: '6', channel: '#incidents-critical', platform: 'slack', direction: 'inbound', type: 'command', content: '/itsm alert silence "db-*" --duration 2h', timestamp: '14:35', date: '2025-12-15', command: 'alert silence', commandResponse: 'Silenced 8 alerts matching "db-*" for 2 hours. Silence ID: SIL-0042.' },
  { id: '7', channel: '#sre-alerts', platform: 'slack', direction: 'outbound', type: 'alert', content: 'WARNING: Memory usage on redis-01 at 87%. Threshold: 85%. Auto-scaling policy triggered.', timestamp: '13:45', date: '2025-12-15' },
  { id: '8', channel: '#incidents-critical', platform: 'slack', direction: 'outbound', type: 'notification', content: 'Incident INC-1042 escalated to P1. Impact: 40% of users affected. Status page updated.', timestamp: '15:10', date: '2025-12-15', incidentRef: 'INC-1042' },
  { id: '9', channel: 'IT Operations', platform: 'teams', direction: 'inbound', type: 'command', content: '/itsm status', timestamp: '12:00', date: '2025-12-14', command: 'status', commandResponse: 'Platform Status: 3 active incidents (1 P1, 2 P3). 18 alert groups. 2 pending changes. All systems operational except API Gateway (degraded).' },
  { id: '10', channel: 'PagerDuty Webhook', platform: 'webhook', direction: 'inbound', type: 'alert', content: '{"event": "trigger", "incident_key": "cpu-web-01", "description": "CPU > 95% on web-01"}', timestamp: '11:30', date: '2025-12-14' },
];

const ChatOpsMessagesPage = () => {
  const { theme } = useAppSelector((state) => state.ui);
  const [searchQuery, setSearchQuery] = useState('');
  const [channelFilter, setChannelFilter] = useState('all');
  const [directionFilter, setDirectionFilter] = useState<'all' | Direction>('all');

  const cardBg = 'rgba(17, 28, 50, 0.95)';
  const border = 'rgba(255,255,255,0.08)';

  const channels = useMemo(() => [...new Set(MOCK_MESSAGES.map((m) => m.channel))], []);

  const filtered = useMemo(() => {
    return MOCK_MESSAGES.filter((m) => {
      if (channelFilter !== 'all' && m.channel !== channelFilter) return false;
      if (directionFilter !== 'all' && m.direction !== directionFilter) return false;
      if (searchQuery && !m.content.toLowerCase().includes(searchQuery.toLowerCase())) return false;
      return true;
    });
  }, [searchQuery, channelFilter, directionFilter]);

  const groupedByDate = useMemo(() => {
    const groups: Record<string, ChatMessage[]> = {};
    filtered.forEach((m) => {
      if (!groups[m.date]) groups[m.date] = [];
      groups[m.date].push(m);
    });
    return groups;
  }, [filtered]);

  return (
    <div className="min-h-screen p-6" style={{ background: '#0c1426' }}>
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
        <h1 className="text-3xl font-bold flex items-center gap-3" style={{ color: '#f8fafc' }}>
          <div className="p-2.5 rounded-xl" style={{ background: 'linear-gradient(135deg, rgba(245,158,11,0.2), rgba(217,119,6,0.2))' }}>
            <MessageSquare size={24} style={{ color: '#f59e0b' }} />
          </div>
          Message Activity Log
        </h1>
        <p className="mt-1" style={{ color: '#94a3b8' }}>Real-time view of all ChatOps messages across channels</p>
      </motion.div>

      {/* Filter Bar */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }}
        className="flex flex-wrap items-center gap-4 mb-6 p-4 rounded-xl" style={{ background: cardBg, border: `1px solid ${border}` }}>
        <div className="relative flex-1 min-w-[200px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: '#94a3b8' }} />
          <input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search messages..."
            className="w-full pl-9 pr-4 py-2 rounded-lg text-sm outline-none" style={{ background: 'rgba(255,255,255,0.05)', border: `1px solid ${border}`, color: '#f8fafc' }} />
        </div>
        <select value={channelFilter} onChange={(e) => setChannelFilter(e.target.value)}
          className="px-3 py-2 rounded-lg text-sm outline-none cursor-pointer"
          style={{ background: 'rgba(255,255,255,0.05)', border: `1px solid ${border}`, color: '#f8fafc' }}>
          <option value="all" style={{ background: '#0c1426' }}>All Channels</option>
          {channels.map((ch) => <option key={ch} value={ch} style={{ background: '#0c1426' }}>{ch}</option>)}
        </select>
        <div className="flex items-center gap-2">
          {(['all', 'inbound', 'outbound'] as const).map((d) => (
            <button key={d} onClick={() => setDirectionFilter(d)}
              className="px-3 py-1.5 rounded-lg text-sm transition-all"
              style={{
                background: directionFilter === d ? 'rgba(245,158,11,0.2)' : 'rgba(255,255,255,0.05)',
                color: directionFilter === d ? '#f59e0b' : '#94a3b8',
                border: `1px solid ${directionFilter === d ? 'rgba(245,158,11,0.3)' : border}`,
              }}>
              {d === 'all' ? 'All' : d === 'inbound' ? 'Inbound' : 'Outbound'}
            </button>
          ))}
        </div>
      </motion.div>

      {/* Message Timeline */}
      <div className="space-y-6">
        {Object.entries(groupedByDate).map(([date, messages]) => (
          <div key={date}>
            {/* Date separator */}
            <div className="flex items-center gap-4 mb-4">
              <div className="h-px flex-1" style={{ background: border }} />
              <span className="text-xs font-medium px-3 py-1 rounded-full" style={{ background: 'rgba(255,255,255,0.05)', color: '#94a3b8' }}>{date}</span>
              <div className="h-px flex-1" style={{ background: border }} />
            </div>

            <div className="space-y-3">
              {messages.map((msg, i) => {
                const isInbound = msg.direction === 'inbound';
                const isCommand = msg.type === 'command';
                const pColor = platformColors[msg.platform];

                return (
                  <motion.div key={msg.id} initial={{ opacity: 0, x: isInbound ? -20 : 20 }} animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.03 }} className={`flex ${isInbound ? 'justify-start' : 'justify-end'}`}>
                    <div className={`max-w-[70%] ${isInbound ? 'mr-auto' : 'ml-auto'}`}>
                      {/* Channel label */}
                      <div className={`flex items-center gap-2 mb-1 text-xs ${isInbound ? '' : 'justify-end'}`} style={{ color: '#94a3b8' }}>
                        {isInbound && <div className="w-5 h-5 rounded flex items-center justify-center" style={{ background: `${pColor}20` }}>
                          <Hash size={10} style={{ color: pColor }} />
                        </div>}
                        <span>{msg.channel}</span>
                        <span>{msg.timestamp}</span>
                        {isInbound ? <ArrowDownLeft size={10} /> : <ArrowUpRight size={10} />}
                        {!isInbound && <div className="w-5 h-5 rounded flex items-center justify-center" style={{ background: `${pColor}20` }}>
                          <Hash size={10} style={{ color: pColor }} />
                        </div>}
                      </div>

                      {/* Message bubble */}
                      <div className="rounded-xl px-4 py-3" style={{
                        background: isCommand ? 'rgba(245,158,11,0.1)' : isInbound ? 'rgba(255,255,255,0.05)' : 'rgba(245,158,11,0.15)',
                        border: `1px solid ${isCommand ? 'rgba(245,158,11,0.2)' : border}`,
                      }}>
                        {isCommand && (
                          <div className="flex items-center gap-2 mb-2">
                            <Terminal size={12} style={{ color: '#f59e0b' }} />
                            <code className="text-xs px-2 py-0.5 rounded font-mono" style={{ background: 'rgba(245,158,11,0.2)', color: '#f59e0b' }}>{msg.command}</code>
                          </div>
                        )}
                        <p className="text-sm" style={{ color: '#f8fafc' }}>{msg.content}</p>
                        {isCommand && msg.commandResponse && (
                          <div className="mt-2 pt-2" style={{ borderTop: `1px solid ${border}` }}>
                            <p className="text-xs" style={{ color: '#94a3b8' }}>{msg.commandResponse}</p>
                          </div>
                        )}
                        {msg.incidentRef && (
                          <Link to={`/incidents/${msg.incidentRef}`} className="inline-flex items-center gap-1 mt-2 text-xs px-2 py-1 rounded-full hover:opacity-80 transition-opacity"
                            style={{ background: 'rgba(245,158,11,0.15)', color: '#f59e0b' }}>
                            <AlertTriangle size={10} /> {msg.incidentRef} <ExternalLink size={10} />
                          </Link>
                        )}
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {filtered.length === 0 && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-16">
          <MessageSquare size={48} style={{ color: '#94a3b8' }} className="mx-auto mb-4 opacity-50" />
          <p style={{ color: '#94a3b8' }}>No messages found matching your criteria.</p>
        </motion.div>
      )}
    </div>
  );
};

export default ChatOpsMessagesPage;
