/**
 * Architect Advanced User Management Console
 * 
 * A high-fidelity administrative interface for governing organizational identities.
 * Features:
 * - Fluid identity stats with neon glows
 * - Geometric user grid/list with staggered reveal
 * - Advanced bulk operation vectors
 */

import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  Plus, Search, Mail, Shield, Edit, Trash2, X, Users, CheckCircle,
  XCircle, Clock, Key, FileUp, UserPlus, ChevronLeft, ChevronRight,
  UserCheck, UserX, Send, MoreHorizontal, Target, Fingerprint, Activity, RefreshCw
} from 'lucide-react';
import { format } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardBody, Button, Input, Select, Avatar, StatusBadge, Modal, Spinner } from '@/components/ui';
import { useAppSelector } from '@/hooks/useRedux';
import { userService } from '@/services/userService';
import { User, Role, CreateUserData } from '@/types';
import toast from 'react-hot-toast';
import clsx from 'clsx';

const UsersPage = () => {
  const { theme } = useAppSelector((state: any) => state.ui);
  const isDark = theme === 'dark';
  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const [newUser, setNewUser] = useState<CreateUserData>({
    email: '',
    first_name: '',
    last_name: '',
    password: '',
    role: 'user',
    department: '',
    job_title: '',
    phone: '',
  });

  const fetchUsers = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await userService.getUsers(1, 100, searchQuery || undefined);
      setUsers(response.data);
    } catch (error) {
      console.error('Failed to fetch users:', error);
      toast.error('Failed to load users');
    } finally {
      setIsLoading(false);
    }
  }, [searchQuery]);

  const fetchRoles = useCallback(async () => {
    try {
      const rolesData = await userService.getRoles();
      setRoles(rolesData);
    } catch (error) {
      console.error('Failed to fetch roles:', error);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
    fetchRoles();
  }, [fetchUsers, fetchRoles]);

  const handleEditUser = (user: User) => {
    setEditingUser({ ...user });
    setIsEditModalOpen(true);
  };

  const handleSaveUser = async () => {
    if (!editingUser) return;
    try {
      setIsSaving(true);
      await userService.updateUser(editingUser.id, {
        firstName: editingUser.firstName,
        lastName: editingUser.lastName,
        email: editingUser.email,
        department: editingUser.department,
        jobTitle: editingUser.jobTitle,
        status: editingUser.status,
      });
      toast.success('User updated successfully');
      setIsEditModalOpen(false);
      setEditingUser(null);
      fetchUsers();
    } catch (error) {
       toast.error('Failed to update user');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCreateUser = async () => {
    if (!newUser.email || !newUser.first_name || !newUser.last_name || !newUser.password) {
      toast.error('Please fill in all required fields');
      return;
    }
    try {
      setIsSaving(true);
      await userService.createUser(newUser);
      toast.success('User created successfully');
      setIsCreateModalOpen(false);
      resetNewUserForm();
      fetchUsers();
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Failed to create user');
    } finally {
      setIsSaving(false);
    }
  };

  const resetNewUserForm = () => {
    setNewUser({ email: '', first_name: '', last_name: '', password: '', role: 'user', department: '', job_title: '', phone: '' });
  };

  const handleDeleteUser = async (userId: string) => {
    if (!confirm('Are you sure you want to delete this user?')) return;
    try {
      await userService.deleteUser(userId);
      toast.success('User deleted successfully');
      fetchUsers();
    } catch (error) {
      toast.error('Failed to delete user');
    }
  };

  const handleSelectAll = () => {
    if (selectedUsers.length === filteredUsers.length) { setSelectedUsers([]); } 
    else { setSelectedUsers(filteredUsers.map(u => u.id)); }
  };

  const filteredUsers = users.filter((user) => {
    if (statusFilter && user.status !== statusFilter) return false;
    if (roleFilter && !user.roles?.some((r) => r.code === roleFilter)) return false;
    return true;
  });

  const paginatedUsers = filteredUsers.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const stats = {
    total: users.length,
    active: users.filter(u => u.status === 'active').length,
    inactive: users.filter(u => u.status === 'inactive').length,
    pending: users.filter(u => u.status === 'pending').length,
  };

  const getInitials = (user: User): string => {
    const name = user.displayName || `${user.firstName} ${user.lastName}`;
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  return (
    <div className="space-y-10 reveal-stagger min-h-screen -m-6 p-6" style={{ background: isDark ? 'linear-gradient(180deg, #030712 0%, #0a0f1a 100%)' : '#f9fafb' }}>
      {/* Header Section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h1 className="text-3xl font-bold heading-architect tracking-tighter">Identity Governance</h1>
          <p className="text-slate-500 text-sm mt-1 uppercase tracking-widest font-bold">Organizational Directory & Authorization Vectors</p>
        </div>
        <div className="flex items-center gap-3">
          <button className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-slate-400 hover:text-white transition-all shadow-xl" title="Sync Settings">
            <Key size={20} />
          </button>
          <button className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-slate-400 hover:text-white transition-all shadow-xl" title="Batch Import">
            <FileUp size={20} />
          </button>
          <button 
             onClick={() => setIsCreateModalOpen(true)}
             className="px-6 py-3 bg-indigo-500 text-white rounded-2xl text-xs font-bold uppercase tracking-widest hover:bg-indigo-600 transition-all shadow-lg shadow-indigo-500/20 flex items-center gap-2"
          >
            <UserPlus size={16} />
            Onboard Identity
          </button>
        </div>
      </div>

      {/* Identity Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCardArchitect label="TOTAL DIRECTORY" value={stats.total} variant="indigo" icon={<Users size={32} />} delay={0.1} />
        <StatCardArchitect label="ACTIVE HANDSHAKES" value={stats.active} variant="emerald" icon={<CheckCircle size={32} />} delay={0.2} />
        <StatCardArchitect label="DEACTIVATED" value={stats.inactive} variant="red" icon={<XCircle size={32} />} delay={0.3} />
        <StatCardArchitect label="PENDING VERIFICATION" value={stats.pending} variant="amber" icon={<Clock size={32} />} delay={0.4} />
      </div>

      {/* Bulk Operations Vector */}
      <AnimatePresence>
        {selectedUsers.length > 0 && (
          <motion.div 
             initial={{ opacity: 0, scale: 0.95, y: 20 }}
             animate={{ opacity: 1, scale: 1, y: 0 }}
             exit={{ opacity: 0, scale: 0.95, y: 20 }}
             className="architect-card p-4 flex items-center justify-between border-indigo-500/50 bg-indigo-500/10 shadow-[0_0_30px_rgba(99,102,241,0.1)]"
          >
             <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-indigo-500 flex items-center justify-center text-white shadow-lg">
                   <Target size={20} />
                </div>
                <div>
                   <span className="text-sm font-bold text-white uppercase tracking-tight">{selectedUsers.length} Identities Selected</span>
                   <p className="text-[10px] text-indigo-400 font-bold uppercase tracking-widest">Awaiting Batch Vector Injection</p>
                </div>
             </div>
             <div className="flex gap-2">
                <button className="px-4 py-2 bg-white/5 hover:bg-white/10 text-white text-[10px] font-bold uppercase tracking-widest rounded-xl transition-all">Relocate Groups</button>
                <button className="px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-500 text-[10px] font-bold uppercase tracking-widest rounded-xl transition-all border border-red-500/20">Purge Access</button>
                <button onClick={() => setSelectedUsers([])} className="w-10 h-10 flex items-center justify-center text-slate-500 hover:text-white transition-all"><X size={18} /></button>
             </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* User Directory Control */}
      <div className="architect-card overflow-hidden border-white/5">
         <div className="px-8 py-6 border-b border-white/5 flex flex-col lg:flex-row justify-between items-center gap-6 bg-white/5">
            <div className="flex items-center gap-3">
               <Fingerprint className="text-indigo-400" size={20} />
               <span className="text-xs font-bold uppercase tracking-[0.2em] text-white">Identity Stream ({filteredUsers.length})</span>
            </div>
            <div className="flex items-center gap-4 w-full lg:w-auto">
               <div className="architect-card flex items-center px-4 py-2 flex-1 lg:w-72 group focus-within:border-indigo-500/50 transition-all border-white/10">
                  <Search size={18} className="text-slate-600 group-focus-within:text-indigo-400" />
                  <input 
                    type="text"
                    placeholder="Search biometric tags..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="bg-transparent border-none focus:ring-0 text-white text-sm w-full ml-3 placeholder:text-slate-700 font-medium"
                  />
               </div>
               <select 
                  className="px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-[10px] font-bold text-white uppercase tracking-widest focus:ring-0"
                  value={roleFilter}
                  onChange={(e) => setRoleFilter(e.target.value)}
               >
                  <option value="" className="bg-slate-900">ALL PRIVILEGES</option>
                  {roles.map(r => <option key={r.code} value={r.code} className="bg-slate-900">{r.name.toUpperCase()}</option>)}
               </select>
               <button onClick={fetchUsers} className="w-11 h-11 flex items-center justify-center bg-white/5 rounded-xl border border-white/10 text-slate-500 hover:text-white transition-all">
                  <RefreshCw size={16} className={isLoading ? 'animate-spin' : ''} />
               </button>
            </div>
         </div>

         <div className="overflow-x-auto">
            <table className="tech-table">
               <thead>
                  <tr className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
                     <th className="px-8 py-4 text-left w-10">
                        <input 
                           type="checkbox" 
                           className="w-4 h-4 rounded-lg bg-white/5 border-white/10 text-indigo-500 focus:ring-0"
                           checked={selectedUsers.length === filteredUsers.length && filteredUsers.length > 0}
                           onChange={handleSelectAll}
                        />
                     </th>
                     <th className="px-8 py-4 text-left">Entity identity</th>
                     <th className="px-8 py-4 text-left">Clearance</th>
                     <th className="px-8 py-4 text-left">Cell/Unit</th>
                     <th className="px-8 py-4 text-left">Handshake State</th>
                     <th className="px-8 py-4 text-left">Last Transmission</th>
                     <th className="px-8 py-4"></th>
                  </tr>
               </thead>
               <tbody className="divide-y divide-white/5">
                  {isLoading ? (
                     [...Array(6)].map((_, i) => <tr key={i}><td colSpan={7} className="px-8 py-10"><div className="h-4 bg-white/5 rounded-full animate-pulse" /></td></tr>)
                  ) : paginatedUsers.length === 0 ? (
                     <tr><td colSpan={7} className="px-8 py-20 text-center opacity-30 font-bold uppercase tracking-widest">No matching identities found</td></tr>
                  ) : (
                     paginatedUsers.map((user) => (
                        <tr key={user.id} className="group hover:bg-white/5 transition-colors">
                           <td className="px-8 py-5">
                              <input 
                                 type="checkbox" 
                                 className="w-4 h-4 rounded-lg bg-white/5 border-white/10 text-indigo-500 focus:ring-0"
                                 checked={selectedUsers.includes(user.id)}
                                 onChange={() => setSelectedUsers(prev => prev.includes(user.id) ? prev.filter(id => id !== user.id) : [...prev, user.id])}
                              />
                           </td>
                           <td className="px-8 py-5">
                              <Link to={`/users/${user.id}`} className="flex items-center gap-4">
                                 <div className={clsx(
                                    "w-10 h-10 rounded-2xl flex items-center justify-center text-white font-bold text-xs border border-white/10 shadow-lg group-hover:scale-110 transition-transform",
                                    user.status === 'active' ? 'bg-gradient-to-br from-indigo-500 to-purple-600' : 'bg-slate-700'
                                 )}>
                                    {getInitials(user)}
                                 </div>
                                 <div>
                                    <div className="text-sm font-bold text-white group-hover:text-indigo-400 transition-colors uppercase tracking-tight">{user.displayName || `${user.firstName} ${user.lastName}`}</div>
                                    <div className="text-[10px] font-mono text-slate-500 mt-0.5 tracking-tighter">{user.email}</div>
                                 </div>
                              </Link>
                           </td>
                           <td>
                              <span className="px-3 py-1 bg-white/5 border border-white/10 rounded-lg text-[9px] font-bold text-indigo-400 uppercase">
                                 {user.roles?.[0]?.name || 'Viewer'}
                              </span>
                           </td>
                           <td>
                              <div className="text-[10px] font-bold text-slate-400 uppercase italic tracking-tighter">
                                 {user.department || '--'}
                              </div>
                           </td>
                           <td>
                              <div className={clsx(
                                 "flex items-center gap-2 font-bold text-[9px] uppercase tracking-widest",
                                 user.status === 'active' ? 'text-emerald-400' : user.status === 'pending' ? 'text-amber-400' : 'text-red-400'
                              )}>
                                 <div className={clsx("w-1.5 h-1.5 rounded-full animate-pulse", user.status === 'active' ? 'bg-emerald-400' : user.status === 'pending' ? 'bg-amber-400' : 'bg-red-400')} />
                                 {user.status}
                              </div>
                           </td>
                           <td className="text-[10px] font-mono text-slate-500 font-bold uppercase flex items-center gap-2 pt-8">
                               <Activity size={12} className="text-slate-700" />
                               {user.lastLogin ? format(new Date(user.lastLogin), 'MMM d, HH:mm') : 'NULL_PTR'}
                           </td>
                           <td className="px-8 py-5 text-right">
                              <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button onClick={() => handleEditUser(user)} className="p-2 hover:bg-white/10 rounded-lg text-slate-400 hover:text-white transition-all"><Edit size={14} /></button>
                                <button className="p-2 hover:bg-white/10 rounded-lg text-slate-400 hover:text-white transition-all"><Key size={14} /></button>
                                <button onClick={() => handleDeleteUser(user.id)} className="p-2 hover:bg-red-500/10 rounded-lg text-slate-400 hover:text-red-400 transition-all"><Trash2 size={14} /></button>
                              </div>
                           </td>
                        </tr>
                     ))
                  )}
               </tbody>
            </table>
         </div>

         {/* Architect Pagination */}
         <div className="px-8 py-6 border-t border-white/5 flex justify-between items-center bg-white/5">
            <div className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
               Sequential Window: {((currentPage - 1) * itemsPerPage) + 1} - {Math.min(currentPage * itemsPerPage, filteredUsers.length)} / <span className="text-white">{filteredUsers.length}</span>
            </div>
            <div className="flex gap-2">
               <button onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))} disabled={currentPage === 1} className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-slate-400 hover:text-white disabled:opacity-30">
                  <ChevronLeft size={16} />
               </button>
               <button onClick={() => setCurrentPage(prev => prev + 1)} disabled={currentPage * itemsPerPage >= filteredUsers.length} className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-slate-400 hover:text-white disabled:opacity-30">
                  <ChevronRight size={16} />
               </button>
            </div>
         </div>
      </div>

      {/* Reusable Modern Modals - Updated for matching architect layout */}
      <Modal isOpen={isCreateModalOpen} onClose={() => { setIsCreateModalOpen(false); resetNewUserForm(); }} title="INITIALIZE IDENTITY ONBOARDING" size="md">
         <div className="space-y-6 pt-4">
            <div className="grid grid-cols-2 gap-4">
               <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 block">First Segment</label>
                  <input type="text" className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:ring-1 focus:ring-indigo-500" value={newUser.first_name} onChange={e => setNewUser({...newUser, first_name: e.target.value})} />
               </div>
               <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 block">Last Segment</label>
                  <input type="text" className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:ring-1 focus:ring-indigo-500" value={newUser.last_name} onChange={e => setNewUser({...newUser, last_name: e.target.value})} />
               </div>
            </div>
            <div>
               <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 block">Primary Comms (Email)</label>
               <input type="email" className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:ring-1 focus:ring-indigo-500" value={newUser.email} onChange={e => setNewUser({...newUser, email: e.target.value})} />
            </div>
            <div className="grid grid-cols-2 gap-4">
               <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 block">Clearance Level</label>
                  <select className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:ring-1 focus:ring-indigo-500 appearance-none" value={newUser.role} onChange={e => setNewUser({...newUser, role: e.target.value})}>
                     <option value="user" className="bg-slate-900">MEMBER</option>
                     <option value="admin" className="bg-slate-900">OVERSEER</option>
                  </select>
               </div>
               <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 block">Assigned Unit</label>
                  <input type="text" className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:ring-1 focus:ring-indigo-500" value={newUser.department} onChange={e => setNewUser({...newUser, department: e.target.value})} />
               </div>
            </div>
            <div>
               <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 block">Access Keyphrase (Password)</label>
               <input type="password" className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:ring-1 focus:ring-indigo-500" value={newUser.password} onChange={e => setNewUser({...newUser, password: e.target.value})} />
            </div>
            <div className="flex justify-end gap-3 pt-6 border-t border-white/5">
                <Button variant="outline" onClick={() => setIsCreateModalOpen(false)} className="rounded-xl font-bold uppercase text-[10px] tracking-widest">Abort</Button>
                <Button onClick={handleCreateUser} isLoading={isSaving} className="bg-indigo-500 rounded-xl font-bold uppercase text-[10px] tracking-widest">Execute Onboard</Button>
            </div>
         </div>
      </Modal>

      {/* Edit User Modal - Same Theme */}
      <Modal isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} title="MODIFY IDENTITY BIOMETRICS" size="md">
         {editingUser && (
            <div className="space-y-6 pt-4">
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 block">First Name</label>
                        <input type="text" className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white" value={editingUser.firstName} onChange={e => setEditingUser({...editingUser, firstName: e.target.value})} />
                    </div>
                    <div>
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 block">Last Name</label>
                        <input type="text" className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white" value={editingUser.lastName} onChange={e => setEditingUser({...editingUser, lastName: e.target.value})} />
                    </div>
                </div>
                <div>
                   <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 block">Clearance State</label>
                   <select className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white appearance-none" value={editingUser.status} onChange={e => setEditingUser({...editingUser, status: e.target.value as any})}>
                      <option value="active" className="bg-slate-900">OPERATIONAL</option>
                      <option value="inactive" className="bg-slate-900">DEACTIVATED</option>
                      <option value="pending" className="bg-slate-900">AWAITING HANDSHAKE</option>
                   </select>
                </div>
                <div className="flex justify-end gap-3 pt-6 border-t border-white/5">
                    <Button variant="outline" onClick={() => setIsEditModalOpen(false)} className="rounded-xl">Cancel</Button>
                    <Button onClick={handleSaveUser} isLoading={isSaving} className="bg-indigo-500 rounded-xl">Inject Changes</Button>
                </div>
            </div>
         )}
      </Modal>
    </div>
  );
};

const StatCardArchitect = ({ label, value, variant, icon, delay }: any) => {
  const styles: any = {
    indigo: "border-indigo-500/30 text-indigo-400",
    emerald: "border-emerald-500/30 text-emerald-400 font-mono",
    red: "border-red-500/30 text-red-500",
    amber: "border-amber-500/30 text-amber-500",
  };
  return (
    <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay }} className={clsx("architect-card p-8 flex items-center justify-between group border overflow-hidden", styles[variant])}>
       <div className="relative z-10">
          <h2 className="text-5xl font-bold tracking-tighter mb-1 font-mono">{value}</h2>
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] opacity-40">{label}</p>
       </div>
       <div className="relative z-10 opacity-30 group-hover:opacity-100 group-hover:scale-110 transition-all">{icon}</div>
       <div className={clsx("absolute -bottom-8 -right-8 w-16 h-16 blur-3xl opacity-10 bg-indigo-500")} />
    </motion.div>
  );
};

export default UsersPage;
