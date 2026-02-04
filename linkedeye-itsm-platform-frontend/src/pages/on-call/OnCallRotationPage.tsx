/**
 * LinkedEye-FinSpot Enterprise On-Call Rotation Calendar
 * Visual rotation calendar with coverage gaps and overrides
 * Architect Design System - Dark Theme
 */

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Calendar, ChevronLeft, ChevronRight, Phone, Clock, User, Shield,
  AlertTriangle, Plus, X, ArrowRight, Bell, Mail,
} from 'lucide-react';
import { useAppSelector } from '@/hooks/useRedux';
import { addDays, format, startOfWeek, isSameDay, isWithinInterval } from 'date-fns';
import toast from 'react-hot-toast';

const USER_COLORS = ['#f59e0b', '#10b981', '#3b82f6', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#06b6d4'];

interface OnCallUser {
  id: string;
  name: string;
  avatar: string;
  email: string;
  phone: string;
  color: string;
}

interface Rotation {
  userId: string;
  start: Date;
  end: Date;
}

interface Schedule {
  id: string;
  name: string;
  rotations: Rotation[];
}

interface Handoff {
  from: string;
  to: string;
  time: string;
  date: string;
}

const USERS: OnCallUser[] = [
  { id: '1', name: 'Sarah Chen', avatar: 'SC', email: 'sarah@finspot.in', phone: '+1-555-0101', color: USER_COLORS[0] },
  { id: '2', name: 'James Park', avatar: 'JP', email: 'james@finspot.in', phone: '+1-555-0102', color: USER_COLORS[1] },
  { id: '3', name: 'Priya Patel', avatar: 'PP', email: 'priya@finspot.in', phone: '+1-555-0103', color: USER_COLORS[2] },
  { id: '4', name: 'Alex Rivera', avatar: 'AR', email: 'alex@finspot.in', phone: '+1-555-0104', color: USER_COLORS[3] },
  { id: '5', name: 'Maria Santos', avatar: 'MS', email: 'maria@finspot.in', phone: '+1-555-0105', color: USER_COLORS[4] },
];

const now = new Date();
const weekStart = startOfWeek(now, { weekStartsOn: 1 });

const buildSchedules = (baseDate: Date): Schedule[] => {
  const ws = startOfWeek(baseDate, { weekStartsOn: 1 });
  return [
    {
      id: 'primary', name: 'Primary On-Call',
      rotations: [
        { userId: '1', start: ws, end: addDays(ws, 2) },
        { userId: '2', start: addDays(ws, 2), end: addDays(ws, 4) },
        { userId: '3', start: addDays(ws, 4), end: addDays(ws, 7) },
      ],
    },
    {
      id: 'secondary', name: 'Secondary On-Call',
      rotations: [
        { userId: '4', start: ws, end: addDays(ws, 3) },
        { userId: '5', start: addDays(ws, 3), end: addDays(ws, 5) },
        // Gap on days 5-7 intentionally for demo
      ],
    },
    {
      id: 'management', name: 'Management Escalation',
      rotations: [
        { userId: '1', start: ws, end: addDays(ws, 7) },
      ],
    },
  ];
};

const UPCOMING_HANDOFFS: Handoff[] = [
  { from: 'Sarah Chen', to: 'James Park', time: '09:00 UTC', date: format(addDays(weekStart, 2), 'MMM dd') },
  { from: 'James Park', to: 'Priya Patel', time: '09:00 UTC', date: format(addDays(weekStart, 4), 'MMM dd') },
  { from: 'Alex Rivera', to: 'Maria Santos', time: '09:00 UTC', date: format(addDays(weekStart, 3), 'MMM dd') },
];

const OnCallRotationPage = () => {
  const { theme } = useAppSelector((state) => state.ui);
  const [currentWeekStart, setCurrentWeekStart] = useState(weekStart);
  const [selectedSchedule, setSelectedSchedule] = useState('all');
  const [showOverrideModal, setShowOverrideModal] = useState(false);
  const [overrideData, setOverrideData] = useState({ user: '', start: '', end: '', reason: '' });
  const [hoveredCell, setHoveredCell] = useState<{ schedule: string; day: number } | null>(null);

  const cardBg = 'rgba(17, 28, 50, 0.95)';
  const border = 'rgba(255,255,255,0.08)';

  const schedules = useMemo(() => buildSchedules(currentWeekStart), [currentWeekStart]);
  const days = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(currentWeekStart, i)), [currentWeekStart]);

  const prevWeek = () => setCurrentWeekStart(addDays(currentWeekStart, -7));
  const nextWeek = () => setCurrentWeekStart(addDays(currentWeekStart, 7));
  const goToday = () => setCurrentWeekStart(startOfWeek(new Date(), { weekStartsOn: 1 }));

  // Find current on-call
  const currentOnCall = useMemo(() => {
    const primary = schedules.find((s) => s.id === 'primary');
    if (!primary) return null;
    const rotation = primary.rotations.find((r) => isWithinInterval(new Date(), { start: r.start, end: r.end }));
    if (!rotation) return null;
    return USERS.find((u) => u.id === rotation.userId) || null;
  }, [schedules]);

  const getUserForCell = (schedule: Schedule, day: Date): OnCallUser | null => {
    const rotation = schedule.rotations.find((r) => isWithinInterval(day, { start: r.start, end: addDays(r.end, -1) }));
    if (!rotation) return null;
    return USERS.find((u) => u.id === rotation.userId) || null;
  };

  const isCoverageGap = (schedule: Schedule, day: Date): boolean => {
    return !schedule.rotations.some((r) => isWithinInterval(day, { start: r.start, end: addDays(r.end, -1) }));
  };

  const filteredSchedules = selectedSchedule === 'all' ? schedules : schedules.filter((s) => s.id === selectedSchedule);

  return (
    <div className="min-h-screen p-6" style={{ background: '#0c1426' }}>
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3" style={{ color: '#f8fafc' }}>
            <div className="p-2.5 rounded-xl" style={{ background: 'linear-gradient(135deg, rgba(245,158,11,0.2), rgba(217,119,6,0.2))' }}>
              <Calendar size={24} style={{ color: '#f59e0b' }} />
            </div>
            Rotation Calendar
          </h1>
          <p className="mt-1" style={{ color: '#94a3b8' }}>On-call schedules, rotations, and overrides</p>
        </div>
        <div className="flex items-center gap-3">
          <select value={selectedSchedule} onChange={(e) => setSelectedSchedule(e.target.value)}
            className="px-3 py-2 rounded-lg text-sm outline-none cursor-pointer"
            style={{ background: 'rgba(255,255,255,0.05)', border: `1px solid ${border}`, color: '#f8fafc' }}>
            <option value="all" style={{ background: '#0c1426' }}>All Schedules</option>
            {schedules.map((s) => <option key={s.id} value={s.id} style={{ background: '#0c1426' }}>{s.name}</option>)}
          </select>
          <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={() => setShowOverrideModal(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium"
            style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)', color: '#fff' }}>
            <Plus size={16} /> Create Override
          </motion.button>
        </div>
      </motion.div>

      {/* Who's On Call Now */}
      {currentOnCall && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
          className="rounded-xl p-6 mb-8 relative overflow-hidden" style={{ background: cardBg, border: `1px solid ${border}` }}>
          <div className="absolute inset-0 opacity-5" style={{ background: `radial-gradient(circle at 10% 50%, ${currentOnCall.color}, transparent 60%)` }} />
          <div className="relative flex items-center gap-6">
            <div className="flex items-center gap-4">
              <div className="relative">
                <div className="w-16 h-16 rounded-full flex items-center justify-center text-xl font-bold" style={{ background: `${currentOnCall.color}30`, color: currentOnCall.color }}>
                  {currentOnCall.avatar}
                </div>
                <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center" style={{ background: '#10b981', border: '2px solid #0c1426' }}>
                  <Phone size={10} className="text-white" />
                </div>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: '#10b981' }}>Currently On Call</p>
                <h2 className="text-xl font-bold" style={{ color: '#f8fafc' }}>{currentOnCall.name}</h2>
                <p className="text-sm" style={{ color: '#94a3b8' }}>Primary On-Call Engineer</p>
              </div>
            </div>
            <div className="h-12 w-px" style={{ background: border }} />
            <div className="flex items-center gap-6 text-sm">
              <div className="flex items-center gap-2"><Phone size={14} style={{ color: '#94a3b8' }} /><span style={{ color: '#f8fafc' }}>{currentOnCall.phone}</span></div>
              <div className="flex items-center gap-2"><Mail size={14} style={{ color: '#94a3b8' }} /><span style={{ color: '#f8fafc' }}>{currentOnCall.email}</span></div>
              <div className="flex items-center gap-2"><Clock size={14} style={{ color: '#94a3b8' }} /><span style={{ color: '#f8fafc' }}>Shift ends: {format(addDays(currentWeekStart, 2), 'MMM dd')} 09:00 UTC</span></div>
            </div>
          </div>
        </motion.div>
      )}

      {/* Calendar Navigation */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }}
        className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <button onClick={prevWeek} className="p-2 rounded-lg hover:bg-white/5 transition-colors"><ChevronLeft size={18} style={{ color: '#94a3b8' }} /></button>
          <h3 className="text-lg font-semibold" style={{ color: '#f8fafc' }}>
            {format(currentWeekStart, 'MMM dd')} - {format(addDays(currentWeekStart, 6), 'MMM dd, yyyy')}
          </h3>
          <button onClick={nextWeek} className="p-2 rounded-lg hover:bg-white/5 transition-colors"><ChevronRight size={18} style={{ color: '#94a3b8' }} /></button>
        </div>
        <button onClick={goToday} className="px-3 py-1.5 rounded-lg text-sm" style={{ background: 'rgba(245,158,11,0.15)', color: '#f59e0b' }}>Today</button>
      </motion.div>

      {/* Calendar Grid */}
      <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
        className="rounded-xl overflow-hidden mb-8" style={{ background: cardBg, border: `1px solid ${border}` }}>
        {/* Day Headers */}
        <div className="grid grid-cols-[180px_repeat(7,1fr)]" style={{ borderBottom: `1px solid ${border}` }}>
          <div className="p-3 text-xs font-semibold uppercase tracking-wider" style={{ color: '#94a3b8' }}>Schedule</div>
          {days.map((day) => {
            const isToday = isSameDay(day, new Date());
            return (
              <div key={day.toISOString()} className="p-3 text-center" style={{ borderLeft: `1px solid ${border}` }}>
                <div className="text-xs" style={{ color: '#94a3b8' }}>{format(day, 'EEE')}</div>
                <div className={`text-sm font-bold mt-0.5 ${isToday ? 'w-7 h-7 rounded-full flex items-center justify-center mx-auto' : ''}`}
                  style={{ color: isToday ? '#fff' : '#f8fafc', background: isToday ? '#f59e0b' : 'transparent' }}>
                  {format(day, 'd')}
                </div>
              </div>
            );
          })}
        </div>

        {/* Schedule Rows */}
        {filteredSchedules.map((schedule) => (
          <div key={schedule.id} className="grid grid-cols-[180px_repeat(7,1fr)]" style={{ borderBottom: `1px solid ${border}` }}>
            <div className="p-3 flex items-center">
              <span className="text-sm font-medium" style={{ color: '#f8fafc' }}>{schedule.name}</span>
            </div>
            {days.map((day, dayIdx) => {
              const user = getUserForCell(schedule, day);
              const gap = isCoverageGap(schedule, day);
              const isHovered = hoveredCell?.schedule === schedule.id && hoveredCell?.day === dayIdx;

              return (
                <div key={day.toISOString()}
                  className="relative p-2 min-h-[60px] cursor-pointer transition-colors"
                  style={{ borderLeft: `1px solid ${border}`, background: isHovered ? 'rgba(255,255,255,0.03)' : 'transparent' }}
                  onMouseEnter={() => setHoveredCell({ schedule: schedule.id, day: dayIdx })}
                  onMouseLeave={() => setHoveredCell(null)}
                  onClick={() => { setShowOverrideModal(true); toast('Click to create override for this slot'); }}
                >
                  {user ? (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                      className="rounded-lg p-2 h-full flex items-center gap-2"
                      style={{ background: `${user.color}15`, border: `1px solid ${user.color}30` }}>
                      <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                        style={{ background: `${user.color}30`, color: user.color }}>
                        {user.avatar}
                      </div>
                      <span className="text-xs font-medium truncate" style={{ color: user.color }}>{user.name.split(' ')[0]}</span>
                    </motion.div>
                  ) : gap ? (
                    <div className="rounded-lg h-full flex items-center justify-center"
                      style={{
                        background: 'repeating-linear-gradient(45deg, transparent, transparent 4px, rgba(239,68,68,0.08) 4px, rgba(239,68,68,0.08) 8px)',
                        border: '1px dashed rgba(239,68,68,0.3)',
                      }}>
                      <AlertTriangle size={14} style={{ color: '#ef4444', opacity: 0.5 }} />
                    </div>
                  ) : null}

                  {/* Tooltip */}
                  <AnimatePresence>
                    {isHovered && user && (
                      <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                        className="absolute z-20 top-full left-1/2 -translate-x-1/2 mt-1 p-3 rounded-lg whitespace-nowrap"
                        style={{ background: '#1a2744', border: `1px solid ${border}`, boxShadow: '0 8px 24px rgba(0,0,0,0.4)' }}>
                        <p className="text-sm font-medium" style={{ color: '#f8fafc' }}>{user.name}</p>
                        <p className="text-xs mt-1" style={{ color: '#94a3b8' }}>{user.email}</p>
                        <p className="text-xs" style={{ color: '#94a3b8' }}>{user.phone}</p>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>
        ))}
      </motion.div>

      {/* User Legend */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}
        className="flex flex-wrap items-center gap-4 mb-8">
        {USERS.map((u) => (
          <div key={u.id} className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full" style={{ background: u.color }} />
            <span className="text-sm" style={{ color: '#94a3b8' }}>{u.name}</span>
          </div>
        ))}
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded" style={{ background: 'repeating-linear-gradient(45deg, transparent, transparent 1px, rgba(239,68,68,0.3) 1px, rgba(239,68,68,0.3) 2px)' }} />
          <span className="text-sm" style={{ color: '#ef4444' }}>Coverage Gap</span>
        </div>
      </motion.div>

      {/* Upcoming Handoffs */}
      <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}
        className="rounded-xl p-6" style={{ background: cardBg, border: `1px solid ${border}` }}>
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2" style={{ color: '#f8fafc' }}>
          <ArrowRight size={18} style={{ color: '#f59e0b' }} /> Upcoming Handoffs
        </h3>
        <div className="space-y-3">
          {UPCOMING_HANDOFFS.map((h, i) => (
            <motion.div key={i} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 + i * 0.05 }}
              className="flex items-center gap-4 p-3 rounded-lg" style={{ background: 'rgba(255,255,255,0.03)', border: `1px solid ${border}` }}>
              <div className="text-center min-w-[70px]">
                <div className="text-sm font-bold" style={{ color: '#f8fafc' }}>{h.date}</div>
                <div className="text-xs" style={{ color: '#94a3b8' }}>{h.time}</div>
              </div>
              <div className="flex items-center gap-3 flex-1">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold"
                    style={{ background: 'rgba(239,68,68,0.15)', color: '#ef4444' }}>
                    {h.from.split(' ').map((n) => n[0]).join('')}
                  </div>
                  <span className="text-sm" style={{ color: '#f8fafc' }}>{h.from}</span>
                </div>
                <ArrowRight size={14} style={{ color: '#94a3b8' }} />
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold"
                    style={{ background: 'rgba(16,185,129,0.15)', color: '#10b981' }}>
                    {h.to.split(' ').map((n) => n[0]).join('')}
                  </div>
                  <span className="text-sm" style={{ color: '#f8fafc' }}>{h.to}</span>
                </div>
              </div>
              <button className="text-xs px-3 py-1.5 rounded-lg" style={{ background: 'rgba(245,158,11,0.1)', color: '#f59e0b' }}>
                View Notes
              </button>
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* Override Modal */}
      <AnimatePresence>
        {showOverrideModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setShowOverrideModal(false)}>
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
              className="w-full max-w-md rounded-2xl p-6" style={{ background: '#111c32', border: `1px solid ${border}` }} onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold" style={{ color: '#f8fafc' }}>Create Override</h3>
                <button onClick={() => setShowOverrideModal(false)} className="p-1 rounded-lg hover:bg-white/5"><X size={18} style={{ color: '#94a3b8' }} /></button>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="text-sm mb-1 block" style={{ color: '#94a3b8' }}>Replacement User</label>
                  <select value={overrideData.user} onChange={(e) => setOverrideData({ ...overrideData, user: e.target.value })}
                    className="w-full px-3 py-2.5 rounded-lg text-sm outline-none cursor-pointer"
                    style={{ background: 'rgba(255,255,255,0.05)', border: `1px solid ${border}`, color: '#f8fafc' }}>
                    <option value="" style={{ background: '#0c1426' }}>Select user...</option>
                    {USERS.map((u) => <option key={u.id} value={u.id} style={{ background: '#0c1426' }}>{u.name}</option>)}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm mb-1 block" style={{ color: '#94a3b8' }}>Start</label>
                    <input type="datetime-local" value={overrideData.start} onChange={(e) => setOverrideData({ ...overrideData, start: e.target.value })}
                      className="w-full px-3 py-2.5 rounded-lg text-sm outline-none"
                      style={{ background: 'rgba(255,255,255,0.05)', border: `1px solid ${border}`, color: '#f8fafc', colorScheme: 'dark' }} />
                  </div>
                  <div>
                    <label className="text-sm mb-1 block" style={{ color: '#94a3b8' }}>End</label>
                    <input type="datetime-local" value={overrideData.end} onChange={(e) => setOverrideData({ ...overrideData, end: e.target.value })}
                      className="w-full px-3 py-2.5 rounded-lg text-sm outline-none"
                      style={{ background: 'rgba(255,255,255,0.05)', border: `1px solid ${border}`, color: '#f8fafc', colorScheme: 'dark' }} />
                  </div>
                </div>
                <div>
                  <label className="text-sm mb-1 block" style={{ color: '#94a3b8' }}>Reason</label>
                  <textarea value={overrideData.reason} onChange={(e) => setOverrideData({ ...overrideData, reason: e.target.value })}
                    placeholder="Why is this override needed?" rows={3}
                    className="w-full px-3 py-2.5 rounded-lg text-sm outline-none resize-none"
                    style={{ background: 'rgba(255,255,255,0.05)', border: `1px solid ${border}`, color: '#f8fafc' }} />
                </div>
              </div>
              <div className="flex items-center gap-3 mt-6">
                <button onClick={() => setShowOverrideModal(false)} className="flex-1 px-4 py-2.5 rounded-lg text-sm"
                  style={{ background: 'rgba(255,255,255,0.05)', color: '#94a3b8', border: `1px solid ${border}` }}>Cancel</button>
                <button onClick={() => { setShowOverrideModal(false); toast.success('Override created successfully'); }} className="flex-1 px-4 py-2.5 rounded-lg text-sm font-medium"
                  style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)', color: '#fff' }}>Create Override</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default OnCallRotationPage;
