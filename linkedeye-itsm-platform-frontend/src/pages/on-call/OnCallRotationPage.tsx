/**
 * LinkedEye-FinSpot Enterprise On-Call Rotation Calendar
 * Visual rotation calendar with coverage gaps and overrides
 * Architect Design System - Dark Theme
 */

import { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Calendar, ChevronLeft, ChevronRight, Phone, Clock, User, Shield,
  AlertTriangle, Plus, X, ArrowRight, Bell, Mail, RefreshCw, Loader
} from 'lucide-react';
import { useAppSelector } from '@/hooks/useRedux';
import { addDays, format, startOfWeek, isSameDay, isWithinInterval, parseISO, endOfWeek } from 'date-fns';
import toast from 'react-hot-toast';
import { onCallService } from '@/services/onCallService';
import { userService } from '@/services/userService';
import { OnCallScheduleEntry, OnCallShift, CurrentOnCallEntry } from '@/services/onCallService';
import { User as UserType } from '@/types';

// Premium color palette for users
const USER_COLORS = ['#f59e0b', '#10b981', '#3b82f6', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#06b6d4'];

const OnCallRotationPage = () => {
  const { theme } = useAppSelector( ( state ) => state.ui );
  const isDark = theme === 'dark';
  const [currentWeekStart, setCurrentWeekStart] = useState( startOfWeek( new Date(), { weekStartsOn: 1 } ) );
  const [selectedSchedule, setSelectedSchedule] = useState<string>( 'all' );
  const [showOverrideModal, setShowOverrideModal] = useState( false );

  // Data State
  const [schedules, setSchedules] = useState<OnCallScheduleEntry[]>( [] );
  const [shifts, setShifts] = useState<OnCallShift[]>( [] );
  const [users, setUsers] = useState<UserType[]>( [] );
  const [currentOnCall, setCurrentOnCall] = useState<CurrentOnCallEntry | null>( null );
  const [loading, setLoading] = useState( true );
  const [refreshing, setRefreshing] = useState( false );

  // Override Form State
  const [overrideData, setOverrideData] = useState( {
    scheduleId: '',
    originalById: '',
    replacementById: '',
    start: '',
    end: '',
    reason: ''
  } );

  const [hoveredCell, setHoveredCell] = useState<{ schedule: string; day: number } | null>( null );

  const cardBg = isDark ? 'rgba(17, 28, 50, 0.95)' : '#ffffff';
  const border = isDark ? 'rgba(255,255,255,0.08)' : '#e2e8f0';
  const textPrimary = isDark ? '#f8fafc' : '#0f172a';
  const textSecondary = isDark ? '#94a3b8' : '#64748b';

  const days = useMemo( () => Array.from( { length: 7 }, ( _, i ) => addDays( currentWeekStart, i ) ), [currentWeekStart] );

  // Fetch Data
  const loadData = async ( isRefresh = false ) => {
    try {
      if ( !isRefresh ) setLoading( true );
      else setRefreshing( true );

      // Fetch Schedules
      const schedRef = await onCallService.getSchedules( 1, 100 );
      setSchedules( schedRef.data );

      // Fetch Users (for dropdowns/legend)
      const usersRef = await userService.getUsers( 1, 50 );
      setUsers( usersRef.data );

      // Fetch Current On-Call
      const currentRef = await onCallService.getCurrentOnCall();
      if ( currentRef && currentRef.length > 0 ) {
        setCurrentOnCall( currentRef[0] );
      }

      // Fetch Shifts for the week
      // We need to fetch shifts for ALL schedules or the selected one
      // For simplicity, we fetch all shifts in the date range
      const startStr = days[0].toISOString();
      const endStr = days[6].toISOString();

      const shiftsRes = await onCallService.getShifts( 1, 200, {
        date_from: startStr,
        date_to: endStr
      } );
      setShifts( shiftsRes.data );

    } catch ( error ) {
      console.error( "Failed to load rotation data", error );
      toast.error( "Failed to load rotation data" );
    } finally {
      setLoading( false );
      setRefreshing( false );
    }
  };

  useEffect( () => {
    loadData();
  }, [currentWeekStart] );

  const handleCreateOverride = async () => {
    if ( !overrideData.replacementById || !overrideData.start || !overrideData.end || !overrideData.scheduleId ) {
      toast.error( "Please fill in all required fields" );
      return;
    }

    try {
      // Since we are creating an override, we need an original_user_id. 
      // Logic: Find who is on call at that time, OR if it's a gap/add-on, require it.
      // For simplicity in this UI, we might default original_user_id to the schedule owner or prompt for it.
      // However, the backend requires original_user_id.
      // If the user selects a slot, we know who is on call.
      // For now, we'll assume the user selects the original user in the form if not pre-filled.

      // Wait, the form state has originalById. Let's make sure we set it.
      if ( !overrideData.originalById ) {
        // Try to infer from schedule/time? Too complex for now, let's just make it required or assume current primary
        // Let's rely on the UI form to populate it, we will add a dropdown for "Original User"
        toast.error( "Please select the user being replaced" );
        return;
      }

      const payload = {
        schedule_id: overrideData.scheduleId,
        original_user_id: overrideData.originalById,
        replacement_user_id: overrideData.replacementById,
        start_time: new Date( overrideData.start ).toISOString(),
        end_time: new Date( overrideData.end ).toISOString(),
        reason: overrideData.reason,
        override_type: 'replacement'
      };

      await onCallService.createOverride( payload );
      toast.success( "Override assigned successfully" );
      setShowOverrideModal( false );
      loadData( true );
    } catch ( error ) {
      console.error( error );
      toast.error( "Failed to assign user (Server Error)" );
    }
  };

  const getUserById = ( id: string ) => users.find( u => u.id === id );
  const getUserColor = ( id: string ) => {
    const idx = users.findIndex( u => u.id === id );
    return USER_COLORS[idx % USER_COLORS.length] || USER_COLORS[0];
  };

  const prevWeek = () => setCurrentWeekStart( addDays( currentWeekStart, -7 ) );
  const nextWeek = () => setCurrentWeekStart( addDays( currentWeekStart, 7 ) );
  const goToday = () => setCurrentWeekStart( startOfWeek( new Date(), { weekStartsOn: 1 } ) );

  const filteredSchedules = selectedSchedule === 'all' ? schedules : schedules.filter( ( s ) => s.id === selectedSchedule );

  // Helper to find who is on shift for a specific schedule and day
  const getShiftForCell = ( scheduleId: string, day: Date ) => {
    return shifts.find( s =>
      s.schedule_id === scheduleId &&
      isWithinInterval( day, { start: parseISO( s.start_time ), end: parseISO( s.end_time ) } )
    );
  };

  if ( loading && !refreshing ) {
    return (
      <div className="flex items-center justify-center min-h-screen" style={ { background: isDark ? '#0c1426' : '#f8fafc' } }>
        <div className="flex flex-col items-center gap-4">
          <Loader className="animate-spin text-primary-500" size={ 32 } />
          <p style={ { color: textSecondary } }>Loading rotation calendar...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6" style={ { background: isDark ? '#0c1426' : '#f8fafc' } }>
      {/* Header */ }
      <motion.div initial={ { opacity: 0, y: -20 } } animate={ { opacity: 1, y: 0 } } className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3" style={ { color: textPrimary } }>
            <div className="p-2.5 rounded-xl" style={ { background: 'linear-gradient(135deg, rgba(245,158,11,0.2), rgba(217,119,6,0.2))' } }>
              <Calendar size={ 24 } style={ { color: '#f59e0b' } } />
            </div>
            Rotation Calendar
          </h1>
          <p className="mt-1" style={ { color: textSecondary } }>On-call schedules, rotations, and overrides</p>
        </div>
        <div className="flex items-center gap-3">
          <select value={ selectedSchedule } onChange={ ( e ) => setSelectedSchedule( e.target.value ) }
            className="px-3 py-2 rounded-lg text-sm outline-none cursor-pointer"
            style={ { background: isDark ? 'rgba(255,255,255,0.05)' : '#fff', border: `1px solid ${border}`, color: textPrimary } }>
            <option value="all">All Schedules</option>
            { schedules.map( ( s ) => <option key={ s.id } value={ s.id }>{ s.notes || s.id }</option> ) }
          </select>
          <motion.button whileHover={ { scale: 1.02 } } whileTap={ { scale: 0.98 } } onClick={ () => loadData( true ) }
            className="p-2 rounded-lg" style={ { background: isDark ? 'rgba(255,255,255,0.05)' : '#fff', border: `1px solid ${border}` } }>
            <RefreshCw size={ 18 } className={ refreshing ? "animate-spin" : "" } style={ { color: textSecondary } } />
          </motion.button>
          <motion.button whileHover={ { scale: 1.02 } } whileTap={ { scale: 0.98 } } onClick={ () => setShowOverrideModal( true ) }
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium"
            style={ { background: 'linear-gradient(135deg, #f59e0b, #d97706)', color: '#fff' } }>
            <Plus size={ 16 } /> Assign User / Override
          </motion.button>
        </div>
      </motion.div>

      {/* Who's On Call Now */ }
      { currentOnCall && (
        <motion.div initial={ { opacity: 0, y: 10 } } animate={ { opacity: 1, y: 0 } } transition={ { delay: 0.05 } }
          className="rounded-xl p-6 mb-8 relative overflow-hidden" style={ { background: cardBg, border: `1px solid ${border}` } }>
          <div className="absolute inset-0 opacity-5" style={ { background: `radial-gradient(circle at 10% 50%, #10b981, transparent 60%)` } } />
          <div className="relative flex items-center gap-6">
            <div className="flex items-center gap-4">
              <div className="relative">
                <div className="w-16 h-16 rounded-full flex items-center justify-center text-xl font-bold bg-emerald-500/10 text-emerald-500">
                  { currentOnCall.user?.firstName?.[0] }{ currentOnCall.user?.lastName?.[0] }
                </div>
                <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center" style={ { background: '#10b981', border: `2px solid ${cardBg}` } }>
                  <Phone size={ 10 } className="text-white" />
                </div>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider mb-1" style={ { color: '#10b981' } }>Currently On Call</p>
                <h2 className="text-xl font-bold" style={ { color: textPrimary } }>{ currentOnCall.user?.displayName }</h2>
                <p className="text-sm" style={ { color: textSecondary } }>{ currentOnCall.schedule_name || "Primary Schedule" }</p>
              </div>
            </div>
            <div className="h-12 w-px" style={ { background: border } } />
            <div className="flex items-center gap-6 text-sm">
              <div className="flex items-center gap-2"><Mail size={ 14 } style={ { color: textSecondary } } /><span style={ { color: textPrimary } }>{ currentOnCall.user?.email }</span></div>
              <div className="flex items-center gap-2"><Clock size={ 14 } style={ { color: textSecondary } } /><span style={ { color: textPrimary } }>Shift ends: { currentOnCall.end_time ? format( parseISO( currentOnCall.end_time ), 'MMM dd HH:mm' ) : 'N/A' }</span></div>
            </div>
          </div>
        </motion.div>
      ) }

      {/* Calendar Navigation */ }
      <motion.div initial={ { opacity: 0 } } animate={ { opacity: 1 } } transition={ { delay: 0.1 } }
        className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <button onClick={ prevWeek } className="p-2 rounded-lg hover:bg-white/5 transition-colors"><ChevronLeft size={ 18 } style={ { color: textSecondary } } /></button>
          <h3 className="text-lg font-semibold" style={ { color: textPrimary } }>
            { format( currentWeekStart, 'MMM dd' ) } - { format( addDays( currentWeekStart, 6 ), 'MMM dd, yyyy' ) }
          </h3>
          <button onClick={ nextWeek } className="p-2 rounded-lg hover:bg-white/5 transition-colors"><ChevronRight size={ 18 } style={ { color: textSecondary } } /></button>
        </div>
        <button onClick={ goToday } className="px-3 py-1.5 rounded-lg text-sm" style={ { background: 'rgba(245,158,11,0.15)', color: '#f59e0b' } }>Today</button>
      </motion.div>

      {/* Calendar Grid */ }
      <motion.div initial={ { opacity: 0, y: 15 } } animate={ { opacity: 1, y: 0 } } transition={ { delay: 0.15 } }
        className="rounded-xl overflow-hidden mb-8" style={ { background: cardBg, border: `1px solid ${border}` } }>
        {/* Day Headers */ }
        <div className="grid grid-cols-[180px_repeat(7,1fr)]" style={ { borderBottom: `1px solid ${border}` } }>
          <div className="p-3 text-xs font-semibold uppercase tracking-wider" style={ { color: textSecondary } }>Schedule</div>
          { days.map( ( day ) => {
            const isToday = isSameDay( day, new Date() );
            return (
              <div key={ day.toISOString() } className="p-3 text-center" style={ { borderLeft: `1px solid ${border}` } }>
                <div className="text-xs" style={ { color: textSecondary } }>{ format( day, 'EEE' ) }</div>
                <div className={ `text-sm font-bold mt-0.5 ${isToday ? 'w-7 h-7 rounded-full flex items-center justify-center mx-auto' : ''}` }
                  style={ { color: isToday ? '#fff' : textPrimary, background: isToday ? '#f59e0b' : 'transparent' } }>
                  { format( day, 'd' ) }
                </div>
              </div>
            );
          } ) }
        </div>

        {/* Schedule Rows */ }
        { filteredSchedules.map( ( schedule ) => (
          <div key={ schedule.id } className="grid grid-cols-[180px_repeat(7,1fr)]" style={ { borderBottom: `1px solid ${border}` } }>
            <div className="p-3 flex items-center">
              <span className="text-sm font-medium" style={ { color: textPrimary } }>{ schedule.notes || "Unnamed Schedule" }</span>
            </div>
            { days.map( ( day, dayIdx ) => {
              const shift = getShiftForCell( schedule.id, day );
              const user = shift ? getUserById( shift.user_id ) : null;
              // If schedule has a user_id directly assigned, it might be a fixed schedule.
              // But strictly speaking, we look at shifts.

              const isHovered = hoveredCell?.schedule === schedule.id && hoveredCell?.day === dayIdx;
              const color = user ? getUserColor( user.id ) : '#94a3b8';

              return (
                <div key={ day.toISOString() }
                  className="relative p-2 min-h-[60px] cursor-pointer transition-colors"
                  style={ { borderLeft: `1px solid ${border}`, background: isHovered ? ( isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)' ) : 'transparent' } }
                  onMouseEnter={ () => setHoveredCell( { schedule: schedule.id, day: dayIdx } ) }
                  onMouseLeave={ () => setHoveredCell( null ) }
                  onClick={ () => {
                    setOverrideData( {
                      ...overrideData,
                      scheduleId: schedule.id,
                      originalById: user?.id || '',
                      start: format( day, "yyyy-MM-dd'T'09:00" ),
                      end: format( day, "yyyy-MM-dd'T'17:00" )
                    } );
                    setShowOverrideModal( true );
                  } }
                >
                  { user ? (
                    <motion.div initial={ { opacity: 0 } } animate={ { opacity: 1 } }
                      className="rounded-lg p-2 h-full flex items-center gap-2"
                      style={ { background: `${color}15`, border: `1px solid ${color}30` } }>
                      <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                        style={ { background: `${color}30`, color: color } }>
                        { user.firstName[0] }{ user.lastName[0] }
                      </div>
                      <span className="text-xs font-medium truncate" style={ { color: color } }>{ user.firstName }</span>
                    </motion.div>
                  ) : (
                    <div className="rounded-lg h-full flex items-center justify-center"
                      style={ {
                        background: 'repeating-linear-gradient(45deg, transparent, transparent 4px, rgba(239,68,68,0.08) 4px, rgba(239,68,68,0.08) 8px)',
                        border: '1px dashed rgba(239,68,68,0.3)',
                      } }>
                      <AlertTriangle size={ 14 } style={ { color: '#ef4444', opacity: 0.5 } } />
                    </div>
                  ) }

                  {/* Tooltip */ }
                  <AnimatePresence>
                    { isHovered && user && (
                      <motion.div initial={ { opacity: 0, y: 5 } } animate={ { opacity: 1, y: 0 } } exit={ { opacity: 0 } }
                        className="absolute z-20 top-full left-1/2 -translate-x-1/2 mt-1 p-3 rounded-lg whitespace-nowrap"
                        style={ { background: isDark ? '#1a2744' : '#fff', border: `1px solid ${border}`, boxShadow: '0 8px 24px rgba(0,0,0,0.2)' } }>
                        <p className="text-sm font-medium" style={ { color: textPrimary } }>{ user.displayName }</p>
                        <p className="text-xs mt-1" style={ { color: textSecondary } }>{ user.email }</p>
                      </motion.div>
                    ) }
                  </AnimatePresence>
                </div>
              );
            } ) }
          </div>
        ) ) }
        { schedules.length === 0 && (
          <div className="p-8 text-center text-gray-500">
            <p>No schedules found.</p>
          </div>
        ) }
      </motion.div>

      {/* Override Modal */ }
      <AnimatePresence>
        { showOverrideModal && (
          <motion.div initial={ { opacity: 0 } } animate={ { opacity: 1 } } exit={ { opacity: 0 } }
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={ () => setShowOverrideModal( false ) }>
            <motion.div initial={ { scale: 0.9, opacity: 0 } } animate={ { scale: 1, opacity: 1 } } exit={ { scale: 0.9, opacity: 0 } }
              className="w-full max-w-md rounded-2xl p-6" style={ { background: isDark ? '#111c32' : '#fff', border: `1px solid ${border}` } } onClick={ ( e ) => e.stopPropagation() }>
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold" style={ { color: textPrimary } }>Assign User / Override</h3>
                <button onClick={ () => setShowOverrideModal( false ) } className="p-1 rounded-lg hover:bg-white/5"><X size={ 18 } style={ { color: textSecondary } } /></button>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="text-sm mb-1 block" style={ { color: textSecondary } }>Schedule</label>
                  <select value={ overrideData.scheduleId } onChange={ ( e ) => setOverrideData( { ...overrideData, scheduleId: e.target.value } ) }
                    className="w-full px-3 py-2.5 rounded-lg text-sm outline-none cursor-pointer"
                    style={ { background: isDark ? 'rgba(255,255,255,0.05)' : '#f8fafc', border: `1px solid ${border}`, color: textPrimary } }>
                    <option value="">Select Schedule...</option>
                    { schedules.map( s => <option key={ s.id } value={ s.id }>{ s.notes || s.id }</option> ) }
                  </select>
                </div>
                <div>
                  <label className="text-sm mb-1 block" style={ { color: textSecondary } }>Original User (to be replaced)</label>
                  <select value={ overrideData.originalById } onChange={ ( e ) => setOverrideData( { ...overrideData, originalById: e.target.value } ) }
                    className="w-full px-3 py-2.5 rounded-lg text-sm outline-none cursor-pointer"
                    style={ { background: isDark ? 'rgba(255,255,255,0.05)' : '#f8fafc', border: `1px solid ${border}`, color: textPrimary } }>
                    <option value="">Select user...</option>
                    { users.map( ( u ) => <option key={ u.id } value={ u.id }>{ u.displayName }</option> ) }
                  </select>
                </div>
                <div>
                  <label className="text-sm mb-1 block" style={ { color: textSecondary } }>Replacement User</label>
                  <select value={ overrideData.replacementById } onChange={ ( e ) => setOverrideData( { ...overrideData, replacementById: e.target.value } ) }
                    className="w-full px-3 py-2.5 rounded-lg text-sm outline-none cursor-pointer"
                    style={ { background: isDark ? 'rgba(255,255,255,0.05)' : '#f8fafc', border: `1px solid ${border}`, color: textPrimary } }>
                    <option value="">Select user...</option>
                    { users.map( ( u ) => <option key={ u.id } value={ u.id }>{ u.displayName }</option> ) }
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm mb-1 block" style={ { color: textSecondary } }>Start</label>
                    <input type="datetime-local" value={ overrideData.start } onChange={ ( e ) => setOverrideData( { ...overrideData, start: e.target.value } ) }
                      className="w-full px-3 py-2.5 rounded-lg text-sm outline-none"
                      style={ { background: isDark ? 'rgba(255,255,255,0.05)' : '#f8fafc', border: `1px solid ${border}`, color: textPrimary, colorScheme: isDark ? 'dark' : 'light' } } />
                  </div>
                  <div>
                    <label className="text-sm mb-1 block" style={ { color: textSecondary } }>End</label>
                    <input type="datetime-local" value={ overrideData.end } onChange={ ( e ) => setOverrideData( { ...overrideData, end: e.target.value } ) }
                      className="w-full px-3 py-2.5 rounded-lg text-sm outline-none"
                      style={ { background: isDark ? 'rgba(255,255,255,0.05)' : '#f8fafc', border: `1px solid ${border}`, color: textPrimary, colorScheme: isDark ? 'dark' : 'light' } } />
                  </div>
                </div>
                <div>
                  <label className="text-sm mb-1 block" style={ { color: textSecondary } }>Reason</label>
                  <textarea value={ overrideData.reason } onChange={ ( e ) => setOverrideData( { ...overrideData, reason: e.target.value } ) }
                    placeholder="Why is this override needed?" rows={ 3 }
                    className="w-full px-3 py-2.5 rounded-lg text-sm outline-none resize-none"
                    style={ { background: isDark ? 'rgba(255,255,255,0.05)' : '#f8fafc', border: `1px solid ${border}`, color: textPrimary } } />
                </div>
              </div>
              <div className="flex items-center gap-3 mt-6">
                <button onClick={ () => setShowOverrideModal( false ) } className="flex-1 px-4 py-2.5 rounded-lg text-sm"
                  style={ { background: isDark ? 'rgba(255,255,255,0.05)' : '#f1f5f9', color: textSecondary, border: `1px solid ${border}` } }>Cancel</button>
                <button onClick={ handleCreateOverride } className="flex-1 px-4 py-2.5 rounded-lg text-sm font-medium"
                  style={ { background: 'linear-gradient(135deg, #f59e0b, #d97706)', color: '#fff' } }>Confirm Assignment</button>
              </div>
            </motion.div>
          </motion.div>
        ) }
      </AnimatePresence>
    </div>
  );
};

export default OnCallRotationPage;
