/**
 * Architect Advanced Roles & Permissions Console
 *
 * High-fidelity RBAC governance interface with dark/light mode support.
 * Features staggered animations, permission matrix, and architect theme.
 */

import { useState } from 'react';
import {
  Plus, Shield, Check, Lock, Users, Eye, Edit, Trash2,
  Settings, AlertTriangle, ChevronDown, ChevronRight, Search, X
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppSelector } from '@/hooks/useRedux';
import clsx from 'clsx';

interface Permission {
  code: string;
  label: string;
  module: string;
}

interface RoleData {
  id: string;
  name: string;
  code: string;
  description: string;
  users: number;
  isSystem: boolean;
  variant: 'indigo' | 'emerald' | 'amber' | 'red' | 'purple';
  permissions: string[];
}

const allPermissions: Permission[] = [
  { code: 'incidents.read', label: 'View Incidents', module: 'Incidents' },
  { code: 'incidents.write', label: 'Manage Incidents', module: 'Incidents' },
  { code: 'incidents.delete', label: 'Delete Incidents', module: 'Incidents' },
  { code: 'changes.read', label: 'View Changes', module: 'Changes' },
  { code: 'changes.write', label: 'Manage Changes', module: 'Changes' },
  { code: 'changes.approve', label: 'Approve Changes', module: 'Changes' },
  { code: 'assets.read', label: 'View Assets', module: 'Assets' },
  { code: 'assets.write', label: 'Manage Assets', module: 'Assets' },
  { code: 'problems.read', label: 'View Problems', module: 'Problems' },
  { code: 'problems.write', label: 'Manage Problems', module: 'Problems' },
  { code: 'users.manage', label: 'Manage Users', module: 'Admin' },
  { code: 'settings.manage', label: 'System Settings', module: 'Admin' },
];

const roles: RoleData[] = [
  {
    id: '1', name: 'Super Admin', code: 'super_admin',
    description: 'Full unrestricted system access across all modules and configurations',
    users: 2, isSystem: true, variant: 'red',
    permissions: allPermissions.map(p => p.code),
  },
  {
    id: '2', name: 'Administrator', code: 'admin',
    description: 'Manage users, settings, and operational workflows',
    users: 5, isSystem: true, variant: 'indigo',
    permissions: ['incidents.read', 'incidents.write', 'changes.read', 'changes.write', 'assets.read', 'assets.write', 'problems.read', 'problems.write', 'users.manage', 'settings.manage'],
  },
  {
    id: '3', name: 'Incident Manager', code: 'incident_manager',
    description: 'Full incident lifecycle management and escalation authority',
    users: 8, isSystem: false, variant: 'amber',
    permissions: ['incidents.read', 'incidents.write', 'incidents.delete', 'changes.read', 'assets.read', 'problems.read'],
  },
  {
    id: '4', name: 'Change Manager', code: 'change_manager',
    description: 'Approve, schedule, and oversee all change requests',
    users: 4, isSystem: false, variant: 'emerald',
    permissions: ['changes.read', 'changes.write', 'changes.approve', 'incidents.read', 'assets.read'],
  },
  {
    id: '5', name: 'Analyst', code: 'analyst',
    description: 'Create, investigate, and resolve incidents and problems',
    users: 15, isSystem: true, variant: 'purple',
    permissions: ['incidents.read', 'incidents.write', 'changes.read', 'assets.read', 'problems.read', 'problems.write'],
  },
];

const modules = [...new Set(allPermissions.map(p => p.module))];

const variantStyles = {
  indigo: { dark: 'border-indigo-500/30 text-indigo-400', light: 'border-indigo-300 text-indigo-600', bg: 'bg-indigo-500', glow: 'bg-indigo-500' },
  emerald: { dark: 'border-emerald-500/30 text-emerald-400', light: 'border-emerald-300 text-emerald-600', bg: 'bg-emerald-500', glow: 'bg-emerald-500' },
  amber: { dark: 'border-amber-500/30 text-amber-400', light: 'border-amber-300 text-amber-600', bg: 'bg-amber-500', glow: 'bg-amber-500' },
  red: { dark: 'border-red-500/30 text-red-500', light: 'border-red-300 text-red-600', bg: 'bg-red-500', glow: 'bg-red-500' },
  purple: { dark: 'border-purple-500/30 text-purple-400', light: 'border-purple-300 text-purple-600', bg: 'bg-purple-500', glow: 'bg-purple-500' },
};

const RolesPage = () => {
  const { theme } = useAppSelector((state: any) => state.ui);
  const isDark = theme === 'dark';
  const [expandedRole, setExpandedRole] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const totalUsers = roles.reduce((sum, r) => sum + r.users, 0);
  const systemRoles = roles.filter(r => r.isSystem).length;
  const customRoles = roles.filter(r => !r.isSystem).length;

  const filteredRoles = roles.filter(r =>
    r.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    r.code.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div
      className="space-y-10 reveal-stagger min-h-screen -m-6 p-6"
      style={{ background: isDark ? 'linear-gradient(180deg, #030712 0%, #0a0f1a 100%)' : '#f9fafb' }}
    >
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h1 className="text-3xl font-bold heading-architect tracking-tighter">Authorization Matrix</h1>
          <p className={clsx("text-sm mt-1 uppercase tracking-widest font-bold", isDark ? "text-slate-500" : "text-gray-400")}>
            Role-Based Access Control & Permission Governance
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button className={clsx(
            "w-12 h-12 rounded-2xl flex items-center justify-center transition-all shadow-xl",
            isDark ? "bg-white/5 border border-white/10 text-slate-400 hover:text-white" : "bg-white border border-gray-200 text-gray-400 hover:text-gray-700 shadow-sm"
          )} title="Audit Log">
            <Eye size={20} />
          </button>
          <button className="px-6 py-3 bg-indigo-500 text-white rounded-2xl text-xs font-bold uppercase tracking-widest hover:bg-indigo-600 transition-all shadow-lg shadow-indigo-500/20 flex items-center gap-2">
            <Plus size={16} />
            Create Role
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard label="TOTAL ROLES" value={roles.length} variant="indigo" icon={<Shield size={32} />} delay={0.1} isDark={isDark} />
        <StatCard label="SYSTEM ROLES" value={systemRoles} variant="emerald" icon={<Lock size={32} />} delay={0.2} isDark={isDark} />
        <StatCard label="CUSTOM ROLES" value={customRoles} variant="amber" icon={<Settings size={32} />} delay={0.3} isDark={isDark} />
        <StatCard label="TOTAL ASSIGNED" value={totalUsers} variant="purple" icon={<Users size={32} />} delay={0.4} isDark={isDark} />
      </div>

      {/* Search */}
      <div className={clsx(
        "rounded-2xl flex items-center px-5 py-3 gap-3 transition-all",
        isDark ? "architect-card border-white/10 focus-within:border-indigo-500/50" : "bg-white border border-gray-200 shadow-sm focus-within:border-indigo-400"
      )}>
        <Search size={18} className={isDark ? "text-slate-600" : "text-gray-400"} />
        <input
          type="text"
          placeholder="Search roles..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className={clsx(
            "bg-transparent border-none focus:ring-0 text-sm w-full font-medium",
            isDark ? "text-white placeholder:text-slate-700" : "text-gray-900 placeholder:text-gray-400"
          )}
        />
        {searchQuery && (
          <button onClick={() => setSearchQuery('')} className={isDark ? "text-slate-500 hover:text-white" : "text-gray-400 hover:text-gray-700"}>
            <X size={16} />
          </button>
        )}
      </div>

      {/* Roles List */}
      <div className="space-y-4">
        {filteredRoles.map((role, idx) => {
          const vs = variantStyles[role.variant];
          const isExpanded = expandedRole === role.id;
          return (
            <motion.div
              key={role.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.08 }}
              className={clsx(
                "rounded-2xl border overflow-hidden transition-all",
                isDark ? `bg-white/[0.02] ${vs.dark}` : `bg-white shadow-sm ${vs.light}`
              )}
            >
              {/* Role Header */}
              <button
                onClick={() => setExpandedRole(isExpanded ? null : role.id)}
                className="w-full px-6 py-5 flex items-center justify-between group"
              >
                <div className="flex items-center gap-4">
                  <div className={clsx(
                    "w-11 h-11 rounded-xl flex items-center justify-center text-white shadow-lg",
                    vs.bg
                  )}>
                    <Shield size={20} />
                  </div>
                  <div className="text-left">
                    <div className="flex items-center gap-3">
                      <span className={clsx("font-bold uppercase tracking-tight", isDark ? "text-white" : "text-gray-900")}>
                        {role.name}
                      </span>
                      {role.isSystem && (
                        <span className={clsx(
                          "px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-widest",
                          isDark ? "bg-white/10 text-slate-400" : "bg-gray-100 text-gray-500"
                        )}>
                          System
                        </span>
                      )}
                    </div>
                    <p className={clsx("text-xs mt-0.5 font-mono", isDark ? "text-slate-500" : "text-gray-400")}>
                      {role.code}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right mr-2">
                    <div className={clsx("text-lg font-bold font-mono", isDark ? "text-white" : "text-gray-900")}>{role.users}</div>
                    <div className={clsx("text-[9px] font-bold uppercase tracking-widest", isDark ? "text-slate-600" : "text-gray-400")}>Users</div>
                  </div>
                  <div className={clsx(
                    "text-[10px] font-bold px-3 py-1 rounded-lg",
                    isDark ? "bg-white/5 text-slate-400" : "bg-gray-100 text-gray-500"
                  )}>
                    {role.permissions.length}/{allPermissions.length}
                  </div>
                  <motion.div animate={{ rotate: isExpanded ? 90 : 0 }} transition={{ duration: 0.2 }}>
                    <ChevronRight size={18} className={isDark ? "text-slate-500" : "text-gray-400"} />
                  </motion.div>
                </div>
              </button>

              {/* Expanded Permission Matrix */}
              <AnimatePresence>
                {isExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.25 }}
                    className="overflow-hidden"
                  >
                    <div className={clsx("px-6 pb-6 pt-2 border-t", isDark ? "border-white/5" : "border-gray-100")}>
                      <p className={clsx("text-sm mb-4", isDark ? "text-slate-400" : "text-gray-600")}>{role.description}</p>

                      {/* Permission groups by module */}
                      <div className="space-y-3">
                        {modules.map(mod => {
                          const modPerms = allPermissions.filter(p => p.module === mod);
                          return (
                            <div key={mod}>
                              <div className={clsx("text-[10px] font-bold uppercase tracking-widest mb-2", isDark ? "text-slate-600" : "text-gray-400")}>
                                {mod}
                              </div>
                              <div className="flex flex-wrap gap-2">
                                {modPerms.map(perm => {
                                  const has = role.permissions.includes(perm.code);
                                  return (
                                    <div
                                      key={perm.code}
                                      className={clsx(
                                        "flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg font-medium transition-all",
                                        has
                                          ? isDark
                                            ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                                            : "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                          : isDark
                                            ? "bg-white/5 text-slate-600 border border-white/5"
                                            : "bg-gray-50 text-gray-400 border border-gray-200"
                                      )}
                                    >
                                      {has ? <Check size={12} /> : <X size={12} />}
                                      {perm.label}
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {/* Actions */}
                      <div className={clsx("mt-5 pt-4 border-t flex justify-end gap-2", isDark ? "border-white/5" : "border-gray-100")}>
                        {!role.isSystem && (
                          <button className={clsx(
                            "px-4 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all",
                            isDark ? "bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/20" : "bg-red-50 text-red-600 hover:bg-red-100 border border-red-200"
                          )}>
                            <Trash2 size={12} className="inline mr-1.5" />Delete
                          </button>
                        )}
                        <button className={clsx(
                          "px-4 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all",
                          isDark ? "bg-white/5 text-white hover:bg-white/10 border border-white/10" : "bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-200"
                        )}>
                          <Edit size={12} className="inline mr-1.5" />Edit Permissions
                        </button>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          );
        })}
      </div>

      {filteredRoles.length === 0 && (
        <div className={clsx("text-center py-20 font-bold uppercase tracking-widest text-sm", isDark ? "text-slate-700" : "text-gray-300")}>
          No matching roles found
        </div>
      )}
    </div>
  );
};

const StatCard = ({ label, value, variant, icon, delay, isDark }: any) => {
  const vs = variantStyles[variant as keyof typeof variantStyles];
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay }}
      className={clsx(
        "rounded-2xl border p-8 flex items-center justify-between group overflow-hidden relative",
        isDark ? `bg-white/[0.02] ${vs.dark}` : `bg-white shadow-sm ${vs.light}`
      )}
    >
      <div className="relative z-10">
        <h2 className={clsx("text-5xl font-bold tracking-tighter mb-1 font-mono", isDark ? "" : "text-gray-900")}>{value}</h2>
        <p className={clsx("text-[10px] font-bold uppercase tracking-[0.2em]", isDark ? "opacity-40" : "text-gray-400")}>{label}</p>
      </div>
      <div className="relative z-10 opacity-30 group-hover:opacity-100 group-hover:scale-110 transition-all">{icon}</div>
      <div className={clsx("absolute -bottom-8 -right-8 w-16 h-16 blur-3xl opacity-10", vs.glow)} />
    </motion.div>
  );
};

export default RolesPage;
