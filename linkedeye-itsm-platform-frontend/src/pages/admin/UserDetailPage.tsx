/**
 * Architect User Detail Console
 * High-fidelity identity profile with dark/light mode support.
 */

import { useState, useEffect, useCallback } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Edit, Trash2, Mail, Phone, Calendar, Shield, Building,
  Briefcase, Users, Key, Activity, ChevronRight, Plus, X
} from 'lucide-react';
import { motion } from 'framer-motion';
import { Avatar, Badge, StatusBadge, Modal, Input, Select, Spinner, Button } from '@/components/ui';
import { useAppSelector } from '@/hooks/useRedux';
import { userService } from '@/services/userService';
import { User, Role, Group } from '@/types';
import toast from 'react-hot-toast';
import clsx from 'clsx';

const UserDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { theme } = useAppSelector((state: any) => state.ui);
  const isDark = theme === 'dark';
  const [user, setUser] = useState<User | null>(null);
  const [allRoles, setAllRoles] = useState<Role[]>([]);
  const [allGroups, setAllGroups] = useState<Group[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);

  const fetchUser = useCallback(async () => {
    if (!id) return;
    try {
      setIsLoading(true);
      const [userData, rolesData, groupsData] = await Promise.all([
        userService.getUserById(id),
        userService.getRoles(),
        userService.getGroups(),
      ]);
      setUser(userData);
      setAllRoles(rolesData);
      setAllGroups(groupsData);
    } catch (error) {
      console.error('Failed to fetch user:', error);
      toast.error('Failed to load user details');
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => { fetchUser(); }, [fetchUser]);

  const handleEditUser = () => {
    if (user) { setEditingUser({ ...user }); setIsEditModalOpen(true); }
  };

  const handleSaveUser = async () => {
    if (!editingUser || !id) return;
    try {
      setIsSaving(true);
      await userService.updateUser(id, {
        firstName: editingUser.firstName, lastName: editingUser.lastName,
        email: editingUser.email, department: editingUser.department,
        jobTitle: editingUser.jobTitle, phone: editingUser.phone, status: editingUser.status,
      });
      toast.success('User updated successfully');
      setIsEditModalOpen(false);
      fetchUser();
    } catch (error) {
      toast.error('Failed to update user');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteUser = async () => {
    if (!id || !confirm('Are you sure you want to delete this user?')) return;
    try {
      await userService.deleteUser(id);
      toast.success('User deleted successfully');
      navigate('/users');
    } catch (error) {
      toast.error('Failed to delete user');
    }
  };

  const handleAssignRole = async (roleId: string) => {
    if (!id) return;
    try {
      await userService.assignRole(id, roleId);
      toast.success('Role assigned successfully');
      fetchUser();
    } catch (error) {
      toast.error('Failed to assign role');
    }
  };

  const handleRemoveRole = async (roleId: string) => {
    if (!id || !confirm('Remove this role?')) return;
    try {
      await userService.removeRole(id, roleId);
      toast.success('Role removed');
      fetchUser();
    } catch (error) {
      toast.error('Failed to remove role');
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-20 min-h-screen" style={{ background: isDark ? 'linear-gradient(180deg, #030712 0%, #0a0f1a 100%)' : '#f9fafb' }}>
        <Spinner size="lg" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center" style={{ background: isDark ? 'linear-gradient(180deg, #030712 0%, #0a0f1a 100%)' : '#f9fafb' }}>
        <h2 className={clsx("text-xl font-bold", isDark ? "text-white" : "text-gray-900")}>User not found</h2>
        <Link to="/users" className="mt-4 text-indigo-500 hover:text-indigo-400 text-sm font-bold uppercase tracking-widest">Back to Directory</Link>
      </div>
    );
  }

  const displayName = user.displayName || `${user.firstName} ${user.lastName}`;
  const initials = displayName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  const userRoleIds = new Set(user.roles?.map((r) => r.id) || []);
  const availableRoles = allRoles.filter((r) => !userRoleIds.has(r.id));

  const contactItems = [
    { icon: <Mail size={16} />, label: 'Email', value: user.email },
    user.phone ? { icon: <Phone size={16} />, label: 'Phone', value: user.phone } : null,
    user.department ? { icon: <Building size={16} />, label: 'Department', value: user.department } : null,
    user.jobTitle ? { icon: <Briefcase size={16} />, label: 'Position', value: user.jobTitle } : null,
    { icon: <Calendar size={16} />, label: 'Joined', value: new Date(user.createdAt).toLocaleDateString() },
  ].filter(Boolean) as { icon: React.ReactNode; label: string; value: string }[];

  return (
    <div className="space-y-8 reveal-stagger min-h-screen -m-6 p-6" style={{ background: isDark ? 'linear-gradient(180deg, #030712 0%, #0a0f1a 100%)' : '#f9fafb' }}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link to="/users" className={clsx(
            "w-10 h-10 rounded-xl flex items-center justify-center transition-all",
            isDark ? "bg-white/5 border border-white/10 text-slate-400 hover:text-white" : "bg-white border border-gray-200 text-gray-500 hover:text-gray-900 shadow-sm"
          )}>
            <ArrowLeft size={18} />
          </Link>
          <div>
            <h1 className="text-3xl font-bold heading-architect tracking-tighter">Identity Profile</h1>
            <p className={clsx("text-sm mt-0.5 uppercase tracking-widest font-bold", isDark ? "text-slate-500" : "text-gray-400")}>
              Entity Biometrics & Authorization State
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={handleEditUser} className={clsx(
            "w-10 h-10 rounded-xl flex items-center justify-center transition-all",
            isDark ? "bg-white/5 border border-white/10 text-slate-400 hover:text-white" : "bg-white border border-gray-200 text-gray-500 hover:text-gray-900 shadow-sm"
          )}>
            <Edit size={16} />
          </button>
          <button onClick={handleDeleteUser} className={clsx(
            "w-10 h-10 rounded-xl flex items-center justify-center transition-all",
            isDark ? "bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20" : "bg-red-50 border border-red-200 text-red-500 hover:bg-red-100"
          )}>
            <Trash2 size={16} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Profile Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className={clsx(
            "rounded-2xl border p-8 text-center",
            isDark ? "bg-white/[0.02] border-white/10" : "bg-white border-gray-200 shadow-sm"
          )}
        >
          {/* Avatar */}
          <div className={clsx(
            "w-20 h-20 rounded-2xl mx-auto flex items-center justify-center text-2xl font-bold text-white border shadow-lg mb-5",
            user.status === 'active'
              ? "bg-gradient-to-br from-indigo-500 to-purple-600 border-indigo-500/30"
              : "bg-slate-700 border-slate-600"
          )}>
            {initials}
          </div>

          <h2 className={clsx("text-xl font-bold uppercase tracking-tight", isDark ? "text-white" : "text-gray-900")}>
            {displayName}
          </h2>
          <p className={clsx("text-xs font-mono mt-1", isDark ? "text-slate-500" : "text-gray-400")}>
            {user.jobTitle || 'No position assigned'}
          </p>

          <div className="flex justify-center gap-2 mt-4">
            <StatusBadge status={user.status} />
            {user.roles && user.roles.length > 0 && (
              <span className={clsx(
                "px-3 py-1 rounded-lg text-[9px] font-bold uppercase tracking-widest",
                isDark ? "bg-indigo-500/10 text-indigo-400 border border-indigo-500/20" : "bg-indigo-50 text-indigo-600 border border-indigo-200"
              )}>
                {user.roles[0].name}
              </span>
            )}
          </div>

          {/* Contact Details */}
          <div className={clsx("mt-6 pt-6 border-t space-y-3", isDark ? "border-white/5" : "border-gray-100")}>
            {contactItems.map((item, idx) => (
              <div key={idx} className="flex items-center gap-3 text-left">
                <div className={clsx(
                  "w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0",
                  isDark ? "bg-white/5 text-slate-400" : "bg-gray-100 text-gray-400"
                )}>
                  {item.icon}
                </div>
                <div className="min-w-0">
                  <div className={clsx("text-[9px] font-bold uppercase tracking-widest", isDark ? "text-slate-600" : "text-gray-400")}>{item.label}</div>
                  <div className={clsx("text-sm font-medium truncate", isDark ? "text-white" : "text-gray-900")}>{item.value}</div>
                </div>
              </div>
            ))}
          </div>

          <button onClick={handleEditUser} className="w-full mt-6 px-4 py-3 bg-indigo-500 text-white rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-indigo-600 transition-all shadow-lg shadow-indigo-500/20 flex items-center justify-center gap-2">
            <Edit size={14} />
            Edit Profile
          </button>
        </motion.div>

        {/* Right Column */}
        <div className="lg:col-span-2 space-y-8">
          {/* Roles & Permissions */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className={clsx(
              "rounded-2xl border overflow-hidden",
              isDark ? "bg-white/[0.02] border-white/10" : "bg-white border-gray-200 shadow-sm"
            )}
          >
            <div className={clsx(
              "px-6 py-4 flex items-center justify-between border-b",
              isDark ? "border-white/5 bg-white/[0.02]" : "border-gray-100 bg-gray-50/50"
            )}>
              <div className="flex items-center gap-3">
                <Key size={18} className="text-indigo-400" />
                <span className={clsx("text-xs font-bold uppercase tracking-widest", isDark ? "text-white" : "text-gray-900")}>
                  Clearance Levels
                </span>
              </div>
              {availableRoles.length > 0 && (
                <select
                  value=""
                  onChange={(e) => e.target.value && handleAssignRole(e.target.value)}
                  className={clsx(
                    "px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-widest focus:ring-0 appearance-none",
                    isDark ? "bg-white/5 border border-white/10 text-white" : "bg-gray-100 border border-gray-200 text-gray-700"
                  )}
                >
                  <option value="">+ Add Role</option>
                  {availableRoles.map((role) => (
                    <option key={role.id} value={role.id} className={isDark ? "bg-slate-900" : ""}>{role.name}</option>
                  ))}
                </select>
              )}
            </div>
            <div className="p-6">
              {user.roles && user.roles.length > 0 ? (
                <div className="space-y-3">
                  {user.roles.map((role) => (
                    <div key={role.id} className={clsx(
                      "flex items-center justify-between p-4 rounded-xl border transition-all",
                      isDark ? "bg-white/[0.02] border-white/5 hover:border-indigo-500/30" : "bg-gray-50 border-gray-100 hover:border-indigo-200"
                    )}>
                      <div className="flex items-center gap-3">
                        <div className={clsx(
                          "w-9 h-9 rounded-lg flex items-center justify-center",
                          isDark ? "bg-indigo-500/10 text-indigo-400" : "bg-indigo-50 text-indigo-600"
                        )}>
                          <Shield size={16} />
                        </div>
                        <div>
                          <span className={clsx("font-bold text-sm uppercase tracking-tight", isDark ? "text-white" : "text-gray-900")}>{role.name}</span>
                          {role.description && (
                            <p className={clsx("text-xs mt-0.5", isDark ? "text-slate-500" : "text-gray-400")}>{role.description}</p>
                          )}
                        </div>
                      </div>
                      <button onClick={() => handleRemoveRole(role.id)} className={clsx(
                        "p-2 rounded-lg transition-all",
                        isDark ? "text-slate-500 hover:text-red-400 hover:bg-red-500/10" : "text-gray-400 hover:text-red-500 hover:bg-red-50"
                      )}>
                        <X size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className={clsx("text-center py-8 font-bold uppercase tracking-widest text-sm", isDark ? "text-slate-700" : "text-gray-300")}>
                  No clearance levels assigned
                </div>
              )}
            </div>
          </motion.div>

          {/* Group Memberships */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className={clsx(
              "rounded-2xl border overflow-hidden",
              isDark ? "bg-white/[0.02] border-white/10" : "bg-white border-gray-200 shadow-sm"
            )}
          >
            <div className={clsx(
              "px-6 py-4 flex items-center gap-3 border-b",
              isDark ? "border-white/5 bg-white/[0.02]" : "border-gray-100 bg-gray-50/50"
            )}>
              <Users size={18} className="text-emerald-400" />
              <span className={clsx("text-xs font-bold uppercase tracking-widest", isDark ? "text-white" : "text-gray-900")}>
                Unit Assignments
              </span>
            </div>
            <div className="p-6">
              {user.groups && user.groups.length > 0 ? (
                <div className="space-y-3">
                  {user.groups.map((group) => (
                    <Link
                      key={group.id}
                      to={`/groups/${group.id}`}
                      className={clsx(
                        "flex items-center justify-between p-4 rounded-xl border transition-all group",
                        isDark ? "bg-white/[0.02] border-white/5 hover:border-emerald-500/30" : "bg-gray-50 border-gray-100 hover:border-emerald-200"
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <div className={clsx(
                          "w-9 h-9 rounded-lg flex items-center justify-center",
                          isDark ? "bg-emerald-500/10 text-emerald-400" : "bg-emerald-50 text-emerald-600"
                        )}>
                          <Users size={16} />
                        </div>
                        <span className={clsx("font-bold text-sm uppercase tracking-tight group-hover:text-emerald-400 transition-colors", isDark ? "text-white" : "text-gray-900")}>
                          {group.name}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={clsx(
                          "px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-widest",
                          isDark ? "bg-white/5 text-slate-400" : "bg-gray-100 text-gray-500"
                        )}>
                          {group.groupType}
                        </span>
                        <ChevronRight size={14} className={isDark ? "text-slate-600" : "text-gray-300"} />
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <div className={clsx("text-center py-8 font-bold uppercase tracking-widest text-sm", isDark ? "text-slate-700" : "text-gray-300")}>
                  Not assigned to any units
                </div>
              )}
            </div>
          </motion.div>
        </div>
      </div>

      {/* Edit User Modal */}
      <Modal isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} title="MODIFY IDENTITY BIOMETRICS" size="md">
        {editingUser && (
          <div className="space-y-6 pt-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 block">First Segment</label>
                <input type="text" className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:ring-1 focus:ring-indigo-500" value={editingUser.firstName} onChange={e => setEditingUser({...editingUser, firstName: e.target.value})} />
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 block">Last Segment</label>
                <input type="text" className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:ring-1 focus:ring-indigo-500" value={editingUser.lastName} onChange={e => setEditingUser({...editingUser, lastName: e.target.value})} />
              </div>
            </div>
            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 block">Primary Comms</label>
              <input type="email" className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:ring-1 focus:ring-indigo-500" value={editingUser.email} onChange={e => setEditingUser({...editingUser, email: e.target.value})} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 block">Phone Vector</label>
                <input type="text" className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:ring-1 focus:ring-indigo-500" value={editingUser.phone || ''} onChange={e => setEditingUser({...editingUser, phone: e.target.value})} />
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 block">Unit</label>
                <input type="text" className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:ring-1 focus:ring-indigo-500" value={editingUser.department || ''} onChange={e => setEditingUser({...editingUser, department: e.target.value})} />
              </div>
            </div>
            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 block">Position</label>
              <input type="text" className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:ring-1 focus:ring-indigo-500" value={editingUser.jobTitle || ''} onChange={e => setEditingUser({...editingUser, jobTitle: e.target.value})} />
            </div>
            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 block">Handshake State</label>
              <select className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:ring-1 focus:ring-indigo-500 appearance-none" value={editingUser.status} onChange={e => setEditingUser({...editingUser, status: e.target.value as any})}>
                <option value="active" className="bg-slate-900">OPERATIONAL</option>
                <option value="inactive" className="bg-slate-900">DEACTIVATED</option>
                <option value="pending" className="bg-slate-900">PENDING VERIFICATION</option>
              </select>
            </div>
            <div className="flex justify-end gap-3 pt-6 border-t border-white/5">
              <Button variant="outline" onClick={() => setIsEditModalOpen(false)} className="rounded-xl font-bold uppercase text-[10px] tracking-widest">Cancel</Button>
              <Button onClick={handleSaveUser} isLoading={isSaving} className="bg-indigo-500 rounded-xl font-bold uppercase text-[10px] tracking-widest">Apply Changes</Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default UserDetailPage;
