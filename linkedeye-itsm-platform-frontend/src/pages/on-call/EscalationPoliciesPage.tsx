import { useCallback, useEffect, useMemo, useState } from 'react';
import { 
  Edit, 
  Plus, 
  RefreshCw, 
  Search, 
  Trash2, 
  ShieldAlert, 
  Activity, 
  Shield, 
  Layers, 
  Zap, 
  Repeat, 
  ChevronRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Button,
  ConfirmModal,
  Modal,
} from '@/components/ui';
import { onCallService } from '@/services/onCallService';
import { EscalationPolicy, OnCallUrgency } from '@/types';
import toast from 'react-hot-toast';
import clsx from 'clsx';
import neuralGridImg from '@/assets/neural-grid.jpg';

type PolicyFormState = {
  name: string;
  description: string;
  repeatCount: number;
  repeatIntervalMinutes: number;
  defaultUrgency: OnCallUrgency;
  isDefault: boolean;
  isActive: boolean;
};

const emptyForm: PolicyFormState = {
  name: '',
  description: '',
  repeatCount: 1,
  repeatIntervalMinutes: 30,
  defaultUrgency: 'high',
  isDefault: false,
  isActive: true,
};

const urgencyConfig: Record<OnCallUrgency, { color: string; bg: string; border: string; label: string }> = {
  low: { color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', label: 'MINOR_V' },
  high: { color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/20', label: 'ELEVATED_V' },
  critical: { color: 'text-rose-400', bg: 'bg-rose-500/10', border: 'border-rose-500/20', label: 'CRITICAL_V' },
};

const EscalationPoliciesPage = () => {
  const [policies, setPolicies] = useState<EscalationPolicy[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [createForm, setCreateForm] = useState<PolicyFormState>(emptyForm);
  const [editForm, setEditForm] = useState<PolicyFormState>(emptyForm);
  const [selectedPolicy, setSelectedPolicy] = useState<EscalationPolicy | null>(null);
  const [policyToDelete, setPolicyToDelete] = useState<EscalationPolicy | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const fetchPolicies = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await onCallService.getEscalationPolicies(1, 100);
      setPolicies(res.data);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load escalation matrix');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPolicies();
  }, [fetchPolicies]);

  const filteredPolicies = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return policies;

    return policies.filter((policy) => {
      const name = (policy.name || '').toLowerCase();
      const description = (policy.description || '').toLowerCase();
      return name.includes(query) || description.includes(query);
    });
  }, [policies, searchQuery]);

  const handleCreate = async () => {
    const name = createForm.name.trim();
    if (!name) { toast.error('Required fields missing'); return; }

    try {
      setIsSaving(true);
      await onCallService.createEscalationPolicy({
        name,
        description: createForm.description.trim() || undefined,
        repeat_count: createForm.repeatCount,
        repeat_interval_minutes: createForm.repeatIntervalMinutes,
        default_urgency: createForm.defaultUrgency,
        is_default: createForm.isDefault,
      });
      toast.success('Escalation matrix initialized');
      setIsCreateModalOpen(false);
      setCreateForm(emptyForm);
      fetchPolicies();
    } catch (err) {
      console.error(err);
      toast.error('Initialization failure');
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpdate = async () => {
    if (!selectedPolicy) return;
    const name = editForm.name.trim();
    if (!name) { toast.error('Required fields missing'); return; }

    try {
      setIsSaving(true);
      await onCallService.updateEscalationPolicy(selectedPolicy.id, {
        name,
        description: editForm.description.trim() || undefined,
        repeat_count: editForm.repeatCount,
        repeat_interval_minutes: editForm.repeatIntervalMinutes,
        default_urgency: editForm.defaultUrgency,
        is_default: editForm.isDefault,
        is_active: editForm.isActive,
      });
      toast.success('Matrix updated');
      setIsEditModalOpen(false);
      setSelectedPolicy(null);
      fetchPolicies();
    } catch (err) {
      console.error(err);
      toast.error('Update failure');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!policyToDelete) return;
    try {
      setIsSaving(true);
      await onCallService.deleteEscalationPolicy(policyToDelete.id);
      toast.success('Policy decommissioned');
      setPolicyToDelete(null);
      fetchPolicies();
    } catch (err) {
      console.error(err);
      toast.error('Decommission failure');
    } finally {
      setIsSaving(false);
    }
  };

  const openEditModal = (policy: EscalationPolicy) => {
    setSelectedPolicy(policy);
    setEditForm({
      name: policy.name,
      description: policy.description || '',
      repeatCount: policy.repeat_count,
      repeatIntervalMinutes: policy.repeat_interval_minutes,
      defaultUrgency: policy.default_urgency,
      isDefault: policy.is_default,
      isActive: policy.is_active,
    });
    setIsEditModalOpen(true);
  };

  return (
    <div className="space-y-10 reveal-stagger relative min-h-screen -m-6 p-6" style={{ background: 'linear-gradient(180deg, #030712 0%, #0a0f1a 100%)' }}>
       {/* Background Visual Artifact */}
       <div className="fixed inset-0 pointer-events-none opacity-5 z-0">
          <img src={neuralGridImg} alt="" className="w-full h-full object-cover grayscale" />
          <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/20 via-transparent to-purple-500/20" />
       </div>

      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 relative z-10">
        <div>
          <h1 className="text-3xl font-bold heading-architect tracking-tighter">Escalation Protocol Center</h1>
          <p className="text-slate-500 text-sm mt-1 uppercase tracking-widest font-bold">Multi-tier Response Vectors & Policy Control</p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={fetchPolicies} 
            title="Refresh Protocols"
            className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-slate-400 hover:text-white transition-all shadow-xl"
          >
             <RefreshCw size={20} className={isLoading ? 'animate-spin' : ''} />
          </button>
          <button 
             onClick={() => setIsCreateModalOpen(true)}
             title="Create New Policy Vector"
             className="px-6 py-3 bg-indigo-500 text-white rounded-2xl text-xs font-bold uppercase tracking-widest hover:bg-indigo-600 transition-all shadow-lg shadow-indigo-500/20 flex items-center gap-2"
          >
            <Plus size={16} />
            New Policy Vector
          </button>
        </div>
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 relative z-10">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="architect-card p-6 border-indigo-500/20 bg-slate-900/40 backdrop-blur-md">
          <div className="flex items-center gap-4">
             <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 flex items-center justify-center text-indigo-400 border border-indigo-500/20 shadow-[0_0_15px_rgba(99,102,241,0.1)]">
                <Shield size={24} />
             </div>
             <div>
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest leading-none mb-1">Total Policies</p>
                <h3 className="text-2xl font-bold text-white uppercase tracking-tight">{policies.length}</h3>
             </div>
          </div>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="architect-card p-6 border-emerald-500/20 bg-slate-900/40 backdrop-blur-md">
           <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-400 border border-emerald-500/20 shadow-[0_0_15px_rgba(16,185,129,0.1)]">
                 <Activity size={24} className="glow-pulse" />
              </div>
              <div>
                 <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest leading-none mb-1">Active Protocols</p>
                 <h3 className="text-2xl font-bold text-white uppercase tracking-tight">{policies.filter(p => p.is_active).length}</h3>
              </div>
           </div>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="architect-card p-6 border-amber-500/20 bg-slate-900/40 backdrop-blur-md">
           <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/10 flex items-center justify-center text-amber-400 border border-amber-500/20 shadow-[0_0_15px_rgba(245,158,11,0.1)]">
                 <Zap size={24} />
              </div>
              <div>
                 <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest leading-none mb-1">Default Vector</p>
                 <h3 className="text-sm font-bold text-white uppercase tracking-tight truncate max-w-[150px]">
                    {policies.find(p => p.is_default)?.name || 'NONE_SPECIFIED'}
                 </h3>
              </div>
           </div>
        </motion.div>
      </div>

      {/* Main Table Repository */}
      <div className="architect-card overflow-hidden border-white/5 shadow-2xl relative z-10">
         <div className="px-8 py-6 border-b border-white/5 flex flex-col lg:flex-row justify-between items-center gap-6 bg-white/[0.02]">
            <div className="flex items-center gap-3">
               <Layers className="text-indigo-400" size={20} />
               <span className="text-xs font-bold uppercase tracking-[0.2em] text-white">Policy Matrix ({filteredPolicies.length})</span>
            </div>
            <div className="architect-card flex items-center px-4 py-2 w-full lg:w-96 group focus-within:border-indigo-500/50 transition-all border-white/10 bg-white/5">
               <Search size={18} className="text-slate-600 group-focus-within:text-indigo-400" />
               <input 
                  type="text"
                  placeholder="Query response protocols..."
                  title="Search Protocols"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="bg-transparent border-none focus:ring-0 text-white text-sm w-full ml-3 placeholder:text-slate-700 font-medium"
               />
            </div>
         </div>

         <div className="overflow-x-auto">
            <table className="tech-table">
               <thead>
                  <tr className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
                     <th className="px-8 py-4 text-left">Internal Name / Protocol</th>
                     <th className="px-8 py-4 text-left">Default Urgency</th>
                     <th className="px-8 py-4 text-left">Handshake Cycle</th>
                     <th className="px-8 py-4 text-left">Core Status</th>
                     <th className="px-8 py-4 text-left">Level Count</th>
                     <th className="px-8 py-4"></th>
                  </tr>
               </thead>
               <tbody className="divide-y divide-white/5">
                  <AnimatePresence mode="popLayout">
                  {isLoading ? (
                     [...Array(6)].map((_, i) => <tr key={i}><td colSpan={6} className="px-8 py-10"><div className="h-4 bg-white/5 rounded-full animate-pulse" /></td></tr>)
                  ) : filteredPolicies.length === 0 ? (
                     <tr><td colSpan={6} className="px-8 py-20 text-center opacity-30 font-bold uppercase tracking-widest">No policy vectors found</td></tr>
                  ) : (
                     filteredPolicies.map((policy, idx) => {
                        const urgency = urgencyConfig[policy.default_urgency];
                        return (
                           <motion.tr 
                             key={policy.id} 
                             initial={{ opacity: 0, x: -20 }}
                             animate={{ opacity: 1, x: 0 }}
                             transition={{ delay: idx * 0.05 }}
                             className="group hover:bg-white/5 transition-colors"
                           >
                              <td className="px-8 py-5">
                                 <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 flex items-center justify-center text-indigo-400 border border-indigo-500/20 group-hover:scale-110 transition-transform shadow-[0_0_10px_rgba(99,102,241,0.1)]">
                                       <ShieldAlert size={18} />
                                    </div>
                                    <div>
                                       <div className="flex items-center gap-2">
                                          <div className="text-sm font-bold text-white group-hover:text-indigo-400 transition-colors uppercase tracking-tight">
                                             {policy.name}
                                          </div>
                                          {policy.is_default && (
                                             <span className="px-1.5 py-0.5 rounded bg-indigo-500 text-[8px] font-bold text-white uppercase tracking-widest shadow-lg shadow-indigo-500/20">DEFAULT</span>
                                          )}
                                       </div>
                                       <div className="text-[9px] font-bold text-slate-500 uppercase tracking-tighter italic max-w-[250px] truncate">{policy.description || 'GENERIC_PROTOCOL'}</div>
                                    </div>
                                 </div>
                              </td>
                              <td className="px-8 py-5">
                                 <div className={clsx(
                                    "px-3 py-1 rounded-lg text-[9px] font-bold uppercase tracking-widest w-fit border shadow-sm",
                                    urgency.bg, urgency.color, urgency.border
                                 )}>
                                    {urgency.label}
                                 </div>
                              </td>
                              <td className="px-8 py-5">
                                 <div className="flex items-center gap-3 text-[10px] font-mono font-bold text-slate-300">
                                    <Repeat size={12} className="text-slate-500" />
                                    <span>{policy.repeat_count}x @ {policy.repeat_interval_minutes}m</span>
                                 </div>
                              </td>
                              <td className="px-8 py-5">
                                 <div className={clsx(
                                    "flex items-center gap-2 font-bold text-[9px] uppercase tracking-widest",
                                    policy.is_active ? 'text-emerald-400' : 'text-slate-600'
                                 )}>
                                    <div className={clsx("w-1.5 h-1.5 rounded-full", policy.is_active ? 'bg-emerald-400 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-slate-700')} />
                                    {policy.is_active ? 'READY' : 'INACTIVE'}
                                 </div>
                              </td>
                              <td className="px-8 py-5 text-[10px] font-mono text-indigo-400/60 font-bold">
                                 {policy.levels?.length || 0} DEPLOYED
                              </td>
                              <td className="px-8 py-5 text-right">
                                 <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button 
                                      onClick={() => openEditModal(policy)} 
                                      title="Edit Protocol"
                                      className="p-2 hover:bg-white/10 rounded-lg text-slate-400 hover:text-white transition-all"
                                    >
                                      <Edit size={14} />
                                    </button>
                                    <button 
                                      onClick={() => setPolicyToDelete(policy)} 
                                      title="Decommission Protocol"
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

      {/* Initialize Modal */}
      <Modal isOpen={isCreateModalOpen} onClose={() => setIsCreateModalOpen(false)} title="INITIALIZE POLICY VECTOR" size="lg">
         <div className="space-y-6 pt-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <InputArchitect label="PROTOCOL IDENTIFIER (Name)" placeholder="Standard SLA Response..." value={createForm.name} onChange={(v: string) => setCreateForm({...createForm, name: v})} />
                <SelectArchitect 
                   label="INITIAL URGENCY" 
                   value={createForm.defaultUrgency} 
                   onChange={(v: string) => setCreateForm({...createForm, defaultUrgency: v as OnCallUrgency})} 
                   options={[
                     { value: 'low', label: 'LOW_URGENCY' },
                     { value: 'high', label: 'HIGH_URGENCY' },
                     { value: 'critical', label: 'CRITICAL_URGENCY' },
                   ]} 
                />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <InputArchitect label="HANDSHAKE REPEAT COUNT" type="number" value={createForm.repeatCount} onChange={(v: string) => setCreateForm({...createForm, repeatCount: parseInt(v) || 1})} />
                <InputArchitect label="INTERVAL (Minutes)" type="number" value={createForm.repeatIntervalMinutes} onChange={(v: string) => setCreateForm({...createForm, repeatIntervalMinutes: parseInt(v) || 30})} />
            </div>
            <div className="flex flex-col gap-3">
               <div className="flex items-center gap-4 architect-card p-4 border-white/10 bg-white/5">
                   <input 
                      type="checkbox" 
                      id="c_default" 
                      title="Set as Default"
                      checked={createForm.isDefault} 
                      onChange={e => setCreateForm({...createForm, isDefault: e.target.checked})} 
                      className="w-5 h-5 rounded-lg bg-white/5 border-white/20 text-indigo-500"
                   />
                   <label htmlFor="c_default" className="text-xs font-bold text-white uppercase tracking-widest cursor-pointer">Set as Global Default Vector</label>
               </div>
            </div>
            <TextareaArchitect label="CORE DOCUMENTATION (Description)" value={createForm.description} onChange={(v: string) => setCreateForm({...createForm, description: v})} />
            <div className="flex justify-end gap-3 pt-6 border-t border-white/5">
                <Button variant="outline" onClick={() => setIsCreateModalOpen(false)} className="rounded-xl font-bold uppercase text-[10px] tracking-widest">Abort</Button>
                <Button onClick={handleCreate} isLoading={isSaving} className="bg-indigo-500 rounded-xl font-bold uppercase text-[10px] tracking-widest shadow-lg shadow-indigo-500/20">Inject Policy</Button>
            </div>
         </div>
      </Modal>

      {/* Edit Modal */}
      <Modal isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} title="MODIFY RESPONSE MATRIX" size="lg">
         <div className="space-y-6 pt-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
               <InputArchitect label="IDENTIFIER" value={editForm.name} onChange={(v: string) => setEditForm({...editForm, name: v})} />
               <SelectArchitect 
                  label="URGENCY" 
                  value={editForm.defaultUrgency} 
                  onChange={(v: string) => setEditForm({...editForm, defaultUrgency: v as OnCallUrgency})} 
                  options={[
                    { value: 'low', label: 'LOW_URGENCY' },
                    { value: 'high', label: 'HIGH_URGENCY' },
                    { value: 'critical', label: 'CRITICAL_URGENCY' },
                  ]} 
               />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <InputArchitect label="REPEAT" type="number" value={editForm.repeatCount} onChange={(v: string) => setEditForm({...editForm, repeatCount: parseInt(v) || 1})} />
                <InputArchitect label="INTERVAL (min)" type="number" value={editForm.repeatIntervalMinutes} onChange={(v: string) => setEditForm({...editForm, repeatIntervalMinutes: parseInt(v) || 30})} />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
               <div className="flex items-center gap-4 architect-card p-4 border-white/10 bg-white/5">
                   <input 
                      type="checkbox" 
                      id="e_default" 
                      title="Default Vector"
                      checked={editForm.isDefault} 
                      onChange={e => setEditForm({...editForm, isDefault: e.target.checked})} 
                      className="w-5 h-5 rounded-lg bg-white/5 border-white/20 text-indigo-500"
                   />
                   <label htmlFor="e_default" className="text-xs font-bold text-white uppercase tracking-widest cursor-pointer">Default Vector</label>
               </div>
               <div className="flex items-center gap-4 architect-card p-4 border-white/10 bg-white/5">
                   <input 
                      type="checkbox" 
                      id="e_active" 
                      title="Protocol Ready"
                      checked={editForm.isActive} 
                      onChange={e => setEditForm({...editForm, isActive: e.target.checked})} 
                      className="w-5 h-5 rounded-lg bg-white/5 border-white/20 text-indigo-500"
                   />
                   <label htmlFor="e_active" className="text-xs font-bold text-white uppercase tracking-widest cursor-pointer">Protocol Ready</label>
               </div>
            </div>
            <TextareaArchitect label="NOTES" value={editForm.description} onChange={(v: string) => setEditForm({...editForm, description: v})} />
            <div className="flex justify-end gap-3 pt-6 border-t border-white/5">
                <Button variant="outline" onClick={() => setIsEditModalOpen(false)} className="rounded-xl uppercase text-[10px] tracking-widest font-bold">Cancel</Button>
                <Button onClick={handleUpdate} isLoading={isSaving} className="bg-indigo-500 rounded-xl uppercase text-[10px] tracking-widest font-bold">Apply Vector Update</Button>
            </div>
         </div>
      </Modal>

      <ConfirmModal
        isOpen={!!policyToDelete}
        onClose={() => setPolicyToDelete(null)}
        onConfirm={handleDelete}
        title="DECOMMISSION PROTOCOL"
        message={`Confirm permanent destruction of escalation policy "${policyToDelete?.name || ''}"? This action cannot be reversed within the current temporal session.`}
        confirmLabel="Execute Destruction"
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
         className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:ring-1 focus:ring-indigo-500 placeholder:text-slate-700" 
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

export default EscalationPoliciesPage;
