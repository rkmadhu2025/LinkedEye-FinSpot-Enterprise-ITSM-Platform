import { useCallback, useEffect, useMemo, useState } from 'react';
import { Clock, Edit, Plus, RefreshCw, Search, Trash2, Calendar, Shield, Activity, Zap, ChevronRight, User as UserIcon } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Button,
  ConfirmModal,
  Modal,
} from '@/components/ui';
import {
  CurrentOnCallEntry,
  OnCallScheduleEntry,
  onCallService,
} from '@/services/onCallService';
import { userService } from '@/services/userService';
import { Group, User } from '@/types';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import { useAppSelector } from '@/hooks/useRedux';
import clsx from 'clsx';
import observabilityCoreImg from '@/assets/observability-core.jpg';

type ScheduleFormState = { userId: string; groupId: string; startTime: string; endTime: string; isPrimary: boolean; notes: string; };
const emptyForm: ScheduleFormState = { userId: '', groupId: '', startTime: '', endTime: '', isPrimary: true, notes: '', };

const pad2 = (value: number) => value.toString().padStart(2, '0');
const toDateTimeLocalValue = (isoValue?: string | null) => {
  if (!isoValue) return '';
  const date = new Date(isoValue);
  if (Number.isNaN(date.getTime())) return '';
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}T${pad2(date.getHours())}:${pad2(date.getMinutes())}`;
};

const formatDateTime = (isoValue?: string | null) => {
  if (!isoValue) return '—';
  const date = new Date(isoValue);
  if (Number.isNaN(date.getTime())) return '—';
  return format(date, 'MMM d, HH:mm');
};

const getScheduleStatus = (schedule: OnCallScheduleEntry): 'active' | 'scheduled' | 'inactive' => {
  if (!schedule.start_time || !schedule.end_time) return 'inactive';
  const start = new Date(schedule.start_time).getTime();
  const end = new Date(schedule.end_time).getTime();
  const now = Date.now();
  if (now < start) return 'scheduled';
  if (now > end) return 'inactive';
  return 'active';
};

const OnCallSchedulesPage = () => {
  const { theme } = useAppSelector((state: any) => state.ui);
  const isDark = theme === 'dark';
  const [schedules, setSchedules] = useState<OnCallScheduleEntry[]>([]);
  const [currentOnCall, setCurrentOnCall] = useState<CurrentOnCallEntry[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [createForm, setCreateForm] = useState<ScheduleFormState>(emptyForm);
  const [editForm, setEditForm] = useState<ScheduleFormState>(emptyForm);
  const [selectedSchedule, setSelectedSchedule] = useState<OnCallScheduleEntry | null>(null);
  const [scheduleToDelete, setScheduleToDelete] = useState<OnCallScheduleEntry | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const userById = useMemo(() => new Map(users.map((user) => [user.id, user])), [users]);
  const groupById = useMemo(() => new Map(groups.map((group) => [group.id, group])), [groups]);

  const userOptions = useMemo(() => [
    { value: '', label: 'Select Entity' },
    ...users.map((user) => {
       const name = user.displayName || `${user.firstName} ${user.lastName}`.trim() || user.email;
       return { value: user.id, label: `${name.toUpperCase()} [${user.email.toLowerCase()}]` };
    }),
  ], [users]);

  const groupOptions = useMemo(() => [
    { value: '', label: 'Global (No Group)' },
    ...groups.map((group) => ({ value: group.id, label: group.name.toUpperCase() })),
  ], [groups]);

  const filteredSchedules = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return schedules;
    return schedules.filter((s) => {
      const u = s.user_id ? userById.get(s.user_id) : undefined;
      const g = s.group_id ? groupById.get(s.group_id) : undefined;
      return `${u?.displayName || ''} ${u?.email || ''} ${g?.name || ''} ${s.notes || ''}`.toLowerCase().includes(query);
    });
  }, [groupById, schedules, searchQuery, userById]);

  const fetchData = useCallback(async () => {
    try {
      setIsLoading(true);
      const [schedulesRes, currentRes, usersRes, groupsRes] = await Promise.all([
        onCallService.getSchedules(1, 100),
        onCallService.getCurrentOnCall(),
        userService.getUsers(1, 200),
        userService.getGroups(),
      ]);
      setSchedules(schedulesRes.data);
      setCurrentOnCall(currentRes);
      setUsers(usersRes.data);
      setGroups(groupsRes);
    } catch (err) { 
      console.error(err);
      toast.error('Failed to load on-call data'); 
    } 
    finally { setIsLoading(false); }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleCreate = async () => {
    if (!createForm.userId || !createForm.startTime || !createForm.endTime) { toast.error('Required fields missing'); return; }
    try {
      setIsSaving(true);
      const startIso = new Date(createForm.startTime).toISOString();
      const endIso = new Date(createForm.endTime).toISOString();
      await onCallService.createSchedule({ user_id: createForm.userId, group_id: createForm.groupId || undefined, start_time: startIso, end_time: endIso, is_primary: createForm.isPrimary, notes: createForm.notes.trim() || undefined });
      toast.success('On-call schedule initialized');
      setIsCreateModalOpen(false); setCreateForm(emptyForm); fetchData();
    } catch (err) { 
      console.error(err);
      toast.error('Failed to create schedule'); 
    } 
    finally { setIsSaving(false); }
  };

  const handleUpdate = async () => {
    if (!selectedSchedule) return;
    try {
      setIsSaving(true);
      const startIso = new Date(editForm.startTime).toISOString();
      const endIso = new Date(editForm.endTime).toISOString();
      await onCallService.updateSchedule(selectedSchedule.id, { user_id: editForm.userId, group_id: editForm.groupId || undefined, start_time: startIso, end_time: endIso, is_primary: editForm.isPrimary, notes: editForm.notes.trim() || undefined });
      toast.success('Schedule updated');
      setIsEditModalOpen(false); setSelectedSchedule(null); fetchData();
    } catch (err) { 
      console.error(err);
      toast.error('Failed to update schedule'); 
    } 
    finally { setIsSaving(false); }
  };

  const handleDelete = async () => {
    if (!scheduleToDelete) return;
    try {
      setIsSaving(true);
      await onCallService.deleteSchedule(scheduleToDelete.id);
      toast.success('Schedule purged');
      setScheduleToDelete(null); fetchData();
    } catch (err) { 
      console.error(err);
      toast.error('Failed to delete schedule'); 
    } 
    finally { setIsSaving(false); }
  };

  const openEditModal = (schedule: OnCallScheduleEntry) => {
     setSelectedSchedule(schedule);
     setEditForm({
        userId: schedule.user_id || '',
        groupId: schedule.group_id || '',
        startTime: toDateTimeLocalValue(schedule.start_time),
        endTime: toDateTimeLocalValue(schedule.end_time),
        isPrimary: schedule.is_primary || false,
        notes: schedule.notes || '',
     });
     setIsEditModalOpen(true);
  };

  return (
    <div className="space-y-10 reveal-stagger min-h-screen -m-6 p-6" style={{ background: isDark ? 'linear-gradient(180deg, #030712 0%, #0a0f1a 100%)' : '#f9fafb' }}>
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h1 className="text-3xl font-bold heading-architect tracking-tighter">Duty Roster Command</h1>
          <p className={clsx("text-sm mt-1 uppercase tracking-widest font-bold", isDark ? "text-slate-500" : "text-gray-400")}>On-Call Rotations & Escalation Vectors</p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={fetchData} 
            title="Refresh Duty Logs"
            className={clsx(
              "w-12 h-12 rounded-2xl flex items-center justify-center transition-all shadow-xl",
              isDark ? "bg-white/5 border border-white/10 text-slate-400 hover:text-white" : "bg-white border border-gray-200 text-gray-400 hover:text-gray-700 shadow-sm"
            )}
          >
             <RefreshCw size={20} className={isLoading ? 'animate-spin' : ''} />
          </button>
          <button
             onClick={() => setIsCreateModalOpen(true)}
             title="Initialize New Shift"
             className="px-6 py-3 bg-indigo-500 text-white rounded-2xl text-xs font-bold uppercase tracking-widest hover:bg-indigo-600 transition-all shadow-lg shadow-indigo-500/20 flex items-center gap-2"
          >
            <Plus size={16} />
            Initialize Shift
          </button>
        </div>
      </div>

      {/* Currently On-Call - Architect Visualizer with Image */}
      <div className={clsx(
        "rounded-2xl border p-8 overflow-hidden relative min-h-[400px] group/viz",
        isDark ? "architect-card border-indigo-500/20 shadow-[0_0_30px_rgba(99,102,241,0.1)]" : "bg-white border-gray-200 shadow-sm"
      )}>
         {/* Premium Observability Background */}
         <div className="absolute inset-0 opacity-10 group-hover/viz:opacity-20 transition-opacity duration-700">
            <img 
               src={observabilityCoreImg} 
               alt="Observability Core" 
               className="w-full h-full object-cover mix-blend-overlay filter grayscale brightness-50"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/80 to-transparent" />
         </div>

         <div className="flex items-center justify-between mb-8 relative z-10">
            <div className="flex items-center gap-4">
               <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 flex items-center justify-center text-indigo-400 border border-indigo-500/20 shadow-[0_0_15px_rgba(99,102,241,0.2)]">
                  <Activity size={24} className="glow-pulse" />
               </div>
               <div>
                  <h2 className={clsx("text-xl font-bold uppercase tracking-tight", isDark ? "text-white" : "text-gray-900")}>Active Handshakes</h2>
                  <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Live On-Call Deployment State</p>
               </div>
            </div>
            <div className="text-right">
               <p className="text-3xl font-bold heading-architect font-mono text-indigo-400">{currentOnCall.length}</p>
               <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Active Units</p>
            </div>
         </div>

         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 relative z-10">
            {currentOnCall.length === 0 ? (
               <div className={clsx("col-span-full py-16 text-center opacity-30 font-bold uppercase tracking-widest border border-dashed rounded-2xl backdrop-blur-sm", isDark ? "border-white/10 bg-white/5" : "border-gray-200 bg-gray-50")}>
                  Digital Silence - No Active Shifts
               </div>
            ) : (
               currentOnCall.map((entry, idx) => (
                  <motion.div 
                     key={entry.id}
                     initial={{ opacity: 0, scale: 0.9, y: 10 }}
                     animate={{ opacity: 1, scale: 1, y: 0 }}
                     transition={{ delay: idx * 0.1 }}
                     className={clsx(
                       "rounded-2xl border p-5 backdrop-blur-md transition-all group",
                       isDark ? "architect-card border-emerald-500/20 hover:border-emerald-500/40 bg-slate-950/60" : "bg-white border-emerald-200 hover:border-emerald-300 shadow-sm"
                     )}
                  >
                     <div className="flex justify-between items-start mb-4">
                        <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-400 border border-emerald-500/20 group-hover:bg-emerald-500/20 transition-colors shadow-[0_0_10px_rgba(16,185,129,0.1)]">
                           <Shield size={20} />
                        </div>
                        <div className="flex items-center gap-2">
                           <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(52,211,153,0.5)]" />
                           <span className="text-[9px] font-bold text-emerald-400 uppercase tracking-widest">Mission Active</span>
                        </div>
                     </div>
                     <h3 className={clsx("text-[15px] font-bold group-hover:text-emerald-300 transition-colors uppercase truncate", isDark ? "text-white" : "text-gray-900")}>
                        {entry.user?.displayName || userById.get(entry.user_id || '')?.displayName || entry.user_id}
                     </h3>
                     <p className="text-[10px] text-slate-500 font-bold uppercase mb-4 tracking-tighter truncate">{entry.schedule_name || 'PRIMARY_ROTATION'}</p>
                     <div className="flex items-center gap-3 text-[10px] font-mono text-emerald-400/60 font-bold pt-4 border-t border-white/5">
                         <Clock size={12} />
                         <span>{formatDateTime(entry.start_time)} – {formatDateTime(entry.end_time)}</span>
                     </div>
                  </motion.div>
               ))
            )}
         </div>
      </div>

      {/* Schedule Repository */}
      <div className={clsx("rounded-2xl border overflow-hidden shadow-2xl", isDark ? "architect-card border-white/5" : "bg-white border-gray-200 shadow-sm")}>
         <div className={clsx("px-8 py-6 border-b flex flex-col lg:flex-row justify-between items-center gap-6", isDark ? "border-white/5 bg-white/[0.02]" : "border-gray-100 bg-gray-50/50")}>
            <div className="flex items-center gap-3">
               <Calendar className="text-indigo-400" size={20} />
               <span className={clsx("text-xs font-bold uppercase tracking-[0.2em]", isDark ? "text-white" : "text-gray-900")}>Chronological Matrix ({filteredSchedules.length})</span>
            </div>
            <div className={clsx("rounded-2xl flex items-center px-4 py-2 w-full lg:w-96 group focus-within:border-indigo-500/50 transition-all", isDark ? "architect-card border-white/10 bg-white/5" : "bg-white border border-gray-200 shadow-sm")}>
               <Search size={18} className={clsx("group-focus-within:text-indigo-400", isDark ? "text-slate-600" : "text-gray-400")} />
               <input
                  type="text"
                  placeholder="Query duty temporalities..."
                  title="Search Schedules"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className={clsx("bg-transparent border-none focus:ring-0 text-sm w-full ml-3 font-medium", isDark ? "text-white placeholder:text-slate-700" : "text-gray-900 placeholder:text-gray-400")}
               />
            </div>
         </div>

         <div className="overflow-x-auto">
            <table className="tech-table">
               <thead>
                  <tr className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
                     <th className="px-8 py-4 text-left">Identity Segment</th>
                     <th className="px-8 py-4 text-left">Assigned Unit</th>
                     <th className="px-8 py-4 text-left">Temporal Start</th>
                     <th className="px-8 py-4 text-left">Temporal End</th>
                     <th className="px-8 py-4 text-left">Priority Tier</th>
                     <th className="px-8 py-4 text-left">Handshake Status</th>
                     <th className="px-8 py-4"></th>
                  </tr>
               </thead>
               <tbody className="divide-y divide-white/5">
                  <AnimatePresence mode="popLayout">
                  {isLoading ? (
                     [...Array(6)].map((_, i) => <tr key={i}><td colSpan={7} className="px-8 py-10"><div className="h-4 bg-white/5 rounded-full animate-pulse" /></td></tr>)
                  ) : filteredSchedules.length === 0 ? (
                     <tr><td colSpan={7} className="px-8 py-20 text-center opacity-30 font-bold uppercase tracking-widest">No duty logs found</td></tr>
                  ) : (
                     filteredSchedules.map((schedule, idx) => {
                        const status = getScheduleStatus(schedule);
                        const user = userById.get(schedule.user_id || '');
                        return (
                           <motion.tr 
                             key={schedule.id} 
                             initial={{ opacity: 0, x: -20 }}
                             animate={{ opacity: 1, x: 0 }}
                             transition={{ delay: idx * 0.05 }}
                             className={clsx("group transition-colors", isDark ? "hover:bg-white/5" : "hover:bg-gray-50")}
                           >
                              <td className="px-8 py-5">
                                 <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 flex items-center justify-center text-indigo-400 border border-indigo-500/20 group-hover:scale-110 transition-transform">
                                       <UserIcon size={18} />
                                    </div>
                                    <div>
                                       <div className={clsx("text-sm font-bold group-hover:text-indigo-400 transition-colors uppercase tracking-tight", isDark ? "text-white" : "text-gray-900")}>
                                          {user?.displayName || user?.firstName || 'NULL_IDENTITY'}
                                       </div>
                                       <div className="text-[9px] font-bold text-slate-500 uppercase tracking-tighter italic max-w-[150px] truncate">{schedule.notes || 'REGULAR_SHIFT'}</div>
                                    </div>
                                 </div>
                              </td>
                              <td className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">
                                 {groupById.get(schedule.group_id || '')?.name || 'GLOBAL_COMMAND'}
                              </td>
                              <td className={clsx("text-[10px] font-mono font-bold", isDark ? "text-slate-300" : "text-gray-600")}>{formatDateTime(schedule.start_time)}</td>
                              <td className={clsx("text-[10px] font-mono font-bold", isDark ? "text-slate-300" : "text-gray-600")}>{formatDateTime(schedule.end_time)}</td>
                              <td>
                                 <span className={clsx(
                                    "px-3 py-1 rounded-lg text-[9px] font-bold uppercase tracking-widest",
                                    schedule.is_primary ? "bg-indigo-500 text-white shadow-[0_0_15px_rgba(99,102,241,0.3)]" : "bg-white/5 text-slate-400 border border-white/10"
                                 )}>
                                    {schedule.is_primary ? 'PRIMARY_V' : 'SECONDARY_V'}
                                 </span>
                              </td>
                              <td>
                                 <div className={clsx(
                                    "flex items-center gap-2 font-bold text-[9px] uppercase tracking-widest",
                                    status === 'active' ? 'text-emerald-400' : status === 'scheduled' ? 'text-indigo-400' : 'text-slate-500'
                                 )}>
                                    <div className={clsx("w-1.5 h-1.5 rounded-full", status === 'active' ? 'bg-emerald-400 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.5)]' : status === 'scheduled' ? 'bg-indigo-400' : 'bg-slate-700')} />
                                    {status.toUpperCase()}
                                 </div>
                              </td>
                              <td className="px-8 py-5 text-right">
                                 <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button 
                                      onClick={() => openEditModal(schedule)} 
                                      title="Edit Duty Vector"
                                      className="p-2 hover:bg-white/10 rounded-lg text-slate-400 hover:text-white transition-all"
                                    >
                                      <Edit size={14} />
                                    </button>
                                    <button 
                                      onClick={() => setScheduleToDelete(schedule)} 
                                      title="Purge Duty Vector"
                                      className="p-2 hover:bg-red-500/10 rounded-lg text-slate-400 hover:text-red-400 transition-all"
                                    >
                                      <Trash2 size={14} />
                                    </button>
                                 </div>
                              </td>
                           </motion.tr>
                        );
                     })
                  )}
                  </AnimatePresence>
               </tbody>
            </table>
         </div>
      </div>

      {/* Architect Modals */}
      <Modal isOpen={isCreateModalOpen} onClose={() => setIsCreateModalOpen(false)} title="INITIALIZE DUTY TEMPORALITY" size="lg">
         <div className="space-y-6 pt-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <SelectArchitect label="TARGET ENTITY" value={createForm.userId} onChange={(v: string) => setCreateForm({...createForm, userId: v})} options={userOptions} />
                <SelectArchitect label="SECTOR GROUP" value={createForm.groupId} onChange={(v: string) => setCreateForm({...createForm, groupId: v})} options={groupOptions} />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <InputArchitect label="TEMPORAL START" type="datetime-local" value={createForm.startTime} onChange={(v: string) => setCreateForm({...createForm, startTime: v})} />
                <InputArchitect label="TEMPORAL END" type="datetime-local" value={createForm.endTime} onChange={(v: string) => setCreateForm({...createForm, endTime: v})} />
            </div>
            <div className="flex items-center gap-4 architect-card p-4 border-white/10 bg-white/5">
                <input 
                   type="checkbox" 
                   id="c_primary" 
                   title="Set as Primary"
                   checked={createForm.isPrimary} 
                   onChange={e => setCreateForm({...createForm, isPrimary: e.target.checked})} 
                   className="w-5 h-5 rounded-lg bg-white/5 border-white/20 text-indigo-500"
                />
                <label htmlFor="c_primary" className="text-xs font-bold text-white uppercase tracking-widest cursor-pointer">Set as Primary Response Vector</label>
            </div>
            <TextareaArchitect label="LOGS & PROTOCOLS (Notes)" value={createForm.notes} onChange={(v: string) => setCreateForm({...createForm, notes: v})} />
            <div className="flex justify-end gap-3 pt-6 border-t border-white/5">
                <Button variant="outline" onClick={() => setIsCreateModalOpen(false)} className="rounded-xl font-bold uppercase text-[10px] tracking-widest">Abort Operation</Button>
                <Button onClick={handleCreate} isLoading={isSaving} className="bg-indigo-500 rounded-xl font-bold uppercase text-[10px] tracking-widest shadow-lg shadow-indigo-500/20">Inject Shift</Button>
            </div>
         </div>
      </Modal>

      {/* Modal Edit Shift */}
      <Modal isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} title="MODIFY DUTY VECTORS" size="lg">
         <div className="space-y-6 pt-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
               <SelectArchitect label="ENTITY" value={editForm.userId} onChange={(v: string) => setEditForm({...editForm, userId: v})} options={userOptions} />
               <SelectArchitect label="SECTOR" value={editForm.groupId} onChange={(v: string) => setEditForm({...editForm, groupId: v})} options={groupOptions} />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
               <InputArchitect label="START T-COORD" type="datetime-local" value={editForm.startTime} onChange={(v: string) => setEditForm({...editForm, startTime: v})} />
               <InputArchitect label="END T-COORD" type="datetime-local" value={editForm.endTime} onChange={(v: string) => setEditForm({...editForm, endTime: v})} />
            </div>
            <div className="flex items-center gap-4 architect-card p-4 border-white/10 bg-white/5">
                <input 
                   type="checkbox" 
                   id="e_primary" 
                   title="Set as Primary"
                   checked={editForm.isPrimary} 
                   onChange={e => setEditForm({...editForm, isPrimary: e.target.checked})} 
                   className="w-5 h-5 rounded-lg bg-white/5 border-white/20 text-indigo-500"
                />
                <label htmlFor="e_primary" className="text-xs font-bold text-white uppercase tracking-widest cursor-pointer">Set as Primary Response Vector</label>
            </div>
            <TextareaArchitect label="PROTOCOL OVERRIDE NOTES" value={editForm.notes} onChange={(v: string) => setEditForm({...editForm, notes: v})} />
            <div className="flex justify-end gap-3 pt-6 border-t border-white/5">
                <Button variant="outline" onClick={() => setIsEditModalOpen(false)} className="rounded-xl uppercase text-[10px] tracking-widest font-bold">Cancel</Button>
                <Button onClick={handleUpdate} isLoading={isSaving} className="bg-indigo-500 rounded-xl uppercase text-[10px] tracking-widest font-bold">Apply T-Shift</Button>
            </div>
         </div>
      </Modal>

      <ConfirmModal
        isOpen={!!scheduleToDelete}
        onClose={() => setScheduleToDelete(null)}
        onConfirm={handleDelete}
        title="PURGE DUTY VECTOR"
        message={`Confirm permanent decommissioning of shift for ${scheduleToDelete ? (userById.get(scheduleToDelete.user_id || '')?.displayName || scheduleToDelete.user_id) : ''}?`}
        confirmLabel="Execute Purge"
        variant="danger"
        isLoading={isSaving}
      />
    </div>
  );
};

/* Architect UI Components */
interface SelectArchitectProps {
  label: string;
  value: string;
  onChange: (val: string) => void;
  options: { value: string; label: string }[];
}

const SelectArchitect = ({ label, value, onChange, options }: SelectArchitectProps) => (
   <div className="space-y-1.5">
      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">{label}</label>
      <div className="relative">
         <select 
            value={value} 
            onChange={e => onChange(e.target.value)} 
            title={label}
            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:ring-1 focus:ring-indigo-500 appearance-none font-bold uppercase tracking-tight"
         >
            {options.map((o) => <option key={o.value} value={o.value} className="bg-slate-900 text-white">{o.label}</option>)}
         </select>
         <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-500">
            <ChevronRight size={14} className="rotate-90" />
         </div>
      </div>
   </div>
);

interface InputArchitectProps {
  label: string;
  type?: string;
  placeholder?: string;
  value: string | number;
  onChange: (val: string) => void;
}

const InputArchitect = ({ label, type = "text", placeholder, value, onChange }: InputArchitectProps) => (
   <div className="space-y-1.5">
      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">{label}</label>
      <input 
         type={type} 
         placeholder={placeholder || label}
         title={label}
         className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:ring-1 focus:ring-indigo-500 placeholder:text-slate-700 font-mono" 
         value={value} 
         onChange={e => onChange(e.target.value)} 
      />
   </div>
);

interface TextareaArchitectProps {
  label: string;
  value: string;
  onChange: (val: string) => void;
}

const TextareaArchitect = ({ label, value, onChange }: TextareaArchitectProps) => (
   <div className="space-y-1.5">
      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">{label}</label>
      <textarea 
         rows={3} 
         title={label}
         placeholder={label}
         className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:ring-1 focus:ring-indigo-500 placeholder:text-slate-700" 
         value={value} 
         onChange={e => onChange(e.target.value)} 
      />
   </div>
);

export default OnCallSchedulesPage;
