/**
 * Architect Advanced Group Management Console
 *
 * Master-detail interface for governing team structures and permissions.
 * Features:
 * - Architect theme with dark/light mode support
 * - Staggered reveal animations
 * - Master-detail layout with tabbed content
 */

import { useState, useEffect, useCallback } from 'react';
import {
  Plus, Search, Edit, Trash2, Code, Server, Cloud, Network, Database,
  Headphones, AlertTriangle, ArrowLeftRight, Gavel, Shield,
  FileUp, UserPlus, X, Layers, Users, Settings, Globe, ChevronRight,
  Activity, Target, Fingerprint, Key
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button, Modal, Spinner } from '@/components/ui';
import { useAppSelector } from '@/hooks/useRedux';
import { userService } from '@/services/userService';
import { Group } from '@/types';
import toast from 'react-hot-toast';
import clsx from 'clsx';

// Group Type Icons and Colors (theme-aware)
const groupTypeConfig: Record<string, { icon: React.ElementType; color: string; darkBg: string; lightBg: string }> = {
  team: { icon: Code, color: 'text-blue-400', darkBg: 'bg-blue-500/15', lightBg: 'bg-blue-100' },
  support: { icon: Headphones, color: 'text-emerald-400', darkBg: 'bg-emerald-500/15', lightBg: 'bg-emerald-100' },
  mgmt: { icon: AlertTriangle, color: 'text-amber-400', darkBg: 'bg-amber-500/15', lightBg: 'bg-amber-100' },
  cab: { icon: Gavel, color: 'text-purple-400', darkBg: 'bg-purple-500/15', lightBg: 'bg-purple-100' },
  sre: { icon: Server, color: 'text-indigo-400', darkBg: 'bg-indigo-500/15', lightBg: 'bg-indigo-100' },
  devops: { icon: Cloud, color: 'text-cyan-400', darkBg: 'bg-cyan-500/15', lightBg: 'bg-cyan-100' },
  network: { icon: Network, color: 'text-blue-400', darkBg: 'bg-blue-500/15', lightBg: 'bg-blue-100' },
  database: { icon: Database, color: 'text-violet-400', darkBg: 'bg-violet-500/15', lightBg: 'bg-violet-100' },
  security: { icon: Shield, color: 'text-red-400', darkBg: 'bg-red-500/15', lightBg: 'bg-red-100' },
};

// Mock groups data for enhanced display
const mockGroups = [
  { id: '1', name: 'Platform Team', code: 'platform-team', description: 'Core platform engineers', groupType: 'team', memberCount: 12 },
  { id: '2', name: 'SRE Team', code: 'sre-team', description: 'Site reliability engineers', groupType: 'sre', memberCount: 8 },
  { id: '3', name: 'DevOps', code: 'devops', description: 'DevOps engineers', groupType: 'devops', memberCount: 6 },
  { id: '4', name: 'Network Team', code: 'network-team', description: 'Network operations', groupType: 'network', memberCount: 5 },
  { id: '5', name: 'Database Team', code: 'database-team', description: 'Database administrators', groupType: 'database', memberCount: 4 },
  { id: '6', name: 'L1 Support', code: 'l1-support', description: 'First line support', groupType: 'support', memberCount: 15 },
  { id: '7', name: 'L2 Support', code: 'l2-support', description: 'Advanced support', groupType: 'support', memberCount: 10 },
  { id: '8', name: 'Incident Management', code: 'incident-mgmt', description: 'Incident managers', groupType: 'mgmt', memberCount: 6 },
  { id: '9', name: 'Change Management', code: 'change-mgmt', description: 'Change coordinators', groupType: 'mgmt', memberCount: 4 },
  { id: '10', name: 'CAB', code: 'cab', description: 'Change Advisory Board', groupType: 'cab', memberCount: 7 },
  { id: '11', name: 'Problem Management', code: 'problem-mgmt', description: 'Root cause analysts', groupType: 'mgmt', memberCount: 3 },
  { id: '12', name: 'Security Team', code: 'security-team', description: 'Security operations', groupType: 'security', memberCount: 4 },
];

// Mock members data
const mockMembers = [
  { id: '1', name: 'Rajkumar Madhu', role: 'Principal Architect', initials: 'RM' },
  { id: '2', name: 'Hoysala Bise', role: 'Tech Lead', initials: 'HB' },
  { id: '3', name: 'Siva Kadirannagari', role: 'Sr. SRE Engineer', initials: 'SK' },
  { id: '4', name: 'Edukondalu P', role: 'DevOps Engineer', initials: 'EP' },
  { id: '5', name: 'Devendrareddy Puppala', role: 'Platform Engineer', initials: 'DP' },
  { id: '6', name: 'Rajkumar Ashokan', role: 'Platform Engineer', initials: 'RA' },
  { id: '7', name: 'Vikram Singh', role: 'Backend Developer', initials: 'VS' },
  { id: '8', name: 'Priya Kumar', role: 'Frontend Developer', initials: 'PK' },
];

const GroupsPage = () => {
  const { theme } = useAppSelector((state) => state.ui);
  const isDark = theme === 'dark';
  const [groups, setGroups] = useState<Group[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);
  const [activeTab, setActiveTab] = useState<'members' | 'permissions' | 'rules' | 'environments'>('members');
  const [editingGroup, setEditingGroup] = useState<Group | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [memberSearchQuery, setMemberSearchQuery] = useState('');
  const [newGroup, setNewGroup] = useState({
    name: '',
    code: '',
    description: '',
    groupType: 'support',
    email: '',
  });

  const fetchGroups = useCallback(async () => {
    try {
      setIsLoading(true);
      const groupsData = await userService.getGroups();
      const enhancedGroups = groupsData.length > 0 ? groupsData : mockGroups;
      setGroups(enhancedGroups as Group[]);
      if (enhancedGroups.length > 0 && !selectedGroup) {
        setSelectedGroup(enhancedGroups[0] as Group);
      }
    } catch (error) {
      console.error('Failed to fetch groups:', error);
      setGroups(mockGroups as any);
      if (mockGroups.length > 0) {
        setSelectedGroup(mockGroups[0] as any);
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchGroups();
  }, [fetchGroups]);

  const handleSaveGroup = async () => {
    if (!editingGroup) return;
    try {
      setIsSaving(true);
      await userService.updateGroup(editingGroup.id, {
        name: editingGroup.name,
        code: editingGroup.code,
        description: editingGroup.description,
        groupType: editingGroup.groupType,
        email: editingGroup.email,
      });
      toast.success('Group updated successfully');
      setIsEditModalOpen(false);
      setEditingGroup(null);
      fetchGroups();
    } catch (error) {
      console.error('Failed to update group:', error);
      toast.error('Failed to update group');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCreateGroup = async () => {
    if (!newGroup.name.trim()) {
      toast.error('Group name is required');
      return;
    }
    try {
      setIsSaving(true);
      await userService.createGroup({
        name: newGroup.name,
        code: newGroup.code || newGroup.name.toLowerCase().replace(/\s+/g, '-'),
        description: newGroup.description,
        groupType: newGroup.groupType,
        email: newGroup.email,
      });
      toast.success('Group created successfully');
      setIsCreateModalOpen(false);
      setNewGroup({ name: '', code: '', description: '', groupType: 'support', email: '' });
      fetchGroups();
    } catch (error) {
      console.error('Failed to create group:', error);
      toast.error('Failed to create group');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteGroup = async (groupId: string) => {
    if (!confirm('Are you sure you want to delete this group?')) return;
    try {
      await userService.deleteGroup(groupId);
      toast.success('Group deleted successfully');
      fetchGroups();
    } catch (error) {
      console.error('Failed to delete group:', error);
      toast.error('Failed to delete group');
    }
  };

  const filteredGroups = groups.filter((group) =>
    group.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    group.code?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const config = selectedGroup ? (groupTypeConfig[selectedGroup.groupType || 'team'] || groupTypeConfig.team) : groupTypeConfig.team;
  const GroupIcon = config.icon;

  const stats = {
    total: groups.length,
    members: groups.reduce((sum, g) => sum + (g.memberCount || 0), 0),
    types: new Set(groups.map(g => g.groupType)).size,
  };

  return (
    <div className="space-y-8 reveal-stagger min-h-screen -m-6 p-6" style={{ background: isDark ? 'linear-gradient(180deg, #030712 0%, #0a0f1a 100%)' : '#f9fafb' }}>
      {/* Header Section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h1 className={clsx("text-3xl font-bold tracking-tighter", isDark ? "heading-architect" : "text-gray-900")}>Group Orchestration</h1>
          <p className={clsx("text-sm mt-1 uppercase tracking-widest font-bold", isDark ? "text-slate-500" : "text-gray-500")}>Team Structures, Permissions & Assignment Rules</p>
        </div>
        <div className="flex items-center gap-3">
          <button className={clsx(
            "w-12 h-12 rounded-2xl flex items-center justify-center transition-all shadow-xl",
            isDark ? "bg-white/5 border border-white/10 text-slate-400 hover:text-white" : "bg-white border border-gray-200 text-gray-400 hover:text-gray-700 shadow-sm"
          )} title="Import Groups">
            <FileUp size={20} />
          </button>
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="px-6 py-3 bg-indigo-500 text-white rounded-2xl text-xs font-bold uppercase tracking-widest hover:bg-indigo-600 transition-all shadow-lg shadow-indigo-500/20 flex items-center gap-2"
          >
            <Plus size={16} />
            Create Group
          </button>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.1 }}
          className={clsx("p-8 rounded-2xl flex items-center justify-between group border overflow-hidden",
            isDark ? "architect-card border-indigo-500/30" : "bg-white border-gray-200 shadow-sm"
          )}>
          <div>
            <h2 className={clsx("text-5xl font-bold tracking-tighter mb-1 font-mono", isDark ? "text-indigo-400" : "text-indigo-600")}>{stats.total}</h2>
            <p className={clsx("text-[10px] font-bold uppercase tracking-[0.2em]", isDark ? "opacity-40 text-white" : "text-gray-500")}>TOTAL GROUPS</p>
          </div>
          <Layers size={32} className={clsx("opacity-30 group-hover:opacity-100 group-hover:scale-110 transition-all", isDark ? "text-indigo-400" : "text-indigo-500")} />
        </motion.div>
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.2 }}
          className={clsx("p-8 rounded-2xl flex items-center justify-between group border overflow-hidden",
            isDark ? "architect-card border-emerald-500/30" : "bg-white border-gray-200 shadow-sm"
          )}>
          <div>
            <h2 className={clsx("text-5xl font-bold tracking-tighter mb-1 font-mono", isDark ? "text-emerald-400" : "text-emerald-600")}>{stats.members}</h2>
            <p className={clsx("text-[10px] font-bold uppercase tracking-[0.2em]", isDark ? "opacity-40 text-white" : "text-gray-500")}>TOTAL MEMBERS</p>
          </div>
          <Users size={32} className={clsx("opacity-30 group-hover:opacity-100 group-hover:scale-110 transition-all", isDark ? "text-emerald-400" : "text-emerald-500")} />
        </motion.div>
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.3 }}
          className={clsx("p-8 rounded-2xl flex items-center justify-between group border overflow-hidden",
            isDark ? "architect-card border-amber-500/30" : "bg-white border-gray-200 shadow-sm"
          )}>
          <div>
            <h2 className={clsx("text-5xl font-bold tracking-tighter mb-1 font-mono", isDark ? "text-amber-400" : "text-amber-600")}>{stats.types}</h2>
            <p className={clsx("text-[10px] font-bold uppercase tracking-[0.2em]", isDark ? "opacity-40 text-white" : "text-gray-500")}>GROUP TYPES</p>
          </div>
          <Target size={32} className={clsx("opacity-30 group-hover:opacity-100 group-hover:scale-110 transition-all", isDark ? "text-amber-400" : "text-amber-500")} />
        </motion.div>
      </div>

      {/* Master-Detail Layout */}
      <div className="grid grid-cols-[340px_1fr] gap-6">
        {/* Group List Panel */}
        <div className={clsx(
          "rounded-2xl overflow-hidden border",
          isDark ? "architect-card border-white/5" : "bg-white border-gray-200 shadow-sm"
        )}>
          <div className={clsx("px-5 py-4 flex items-center justify-between", isDark ? "bg-white/5 border-b border-white/5" : "bg-gray-50 border-b border-gray-200")}>
            <div className="flex items-center gap-2">
              <Fingerprint size={16} className={isDark ? "text-indigo-400" : "text-indigo-500"} />
              <span className={clsx("text-[10px] font-bold uppercase tracking-[0.15em]", isDark ? "text-white" : "text-gray-700")}>Group Directory</span>
            </div>
            <span className={clsx("text-[10px] font-bold uppercase tracking-widest", isDark ? "text-slate-500" : "text-gray-400")}>{groups.length}</span>
          </div>

          {/* Search */}
          <div className={clsx("px-4 py-3", isDark ? "border-b border-white/5" : "border-b border-gray-100")}>
            <div className={clsx(
              "flex items-center px-3 py-2 rounded-xl",
              isDark ? "bg-white/5 border border-white/10" : "bg-gray-50 border border-gray-200"
            )}>
              <Search size={14} className={isDark ? "text-slate-600" : "text-gray-400"} />
              <input
                type="text"
                placeholder="Search groups..."
                className={clsx(
                  "bg-transparent border-none focus:ring-0 text-sm w-full ml-2 placeholder:opacity-40 font-medium",
                  isDark ? "text-white placeholder:text-slate-600" : "text-gray-900 placeholder:text-gray-400"
                )}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          <div className="max-h-[calc(100vh-420px)] overflow-y-auto scrollbar-architect">
            {isLoading ? (
              <div className="flex justify-center py-12">
                <Spinner size="lg" />
              </div>
            ) : filteredGroups.length === 0 ? (
              <div className={clsx("text-center py-12 text-sm", isDark ? "text-slate-600" : "text-gray-400")}>
                No groups found
              </div>
            ) : (
              filteredGroups.map((group, i) => {
                const gc = groupTypeConfig[group.groupType || 'team'] || groupTypeConfig.team;
                const GIcon = gc.icon;
                const isActive = selectedGroup?.id === group.id;
                return (
                  <motion.div
                    key={group.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.03 }}
                    className={clsx(
                      "flex items-center gap-3 px-5 py-3.5 cursor-pointer transition-all",
                      isDark
                        ? isActive ? "bg-indigo-500/15 border-l-[3px] border-l-indigo-500" : "border-l-[3px] border-l-transparent hover:bg-white/5"
                        : isActive ? "bg-indigo-50 border-l-[3px] border-l-indigo-500" : "border-l-[3px] border-l-transparent hover:bg-gray-50"
                    )}
                    style={{ borderBottom: isDark ? '1px solid rgba(255,255,255,0.05)' : '1px solid #f3f4f6' }}
                    onClick={() => setSelectedGroup(group)}
                  >
                    <div className={clsx("w-10 h-10 rounded-xl flex items-center justify-center", isDark ? gc.darkBg : gc.lightBg)}>
                      <GIcon size={18} className={gc.color} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className={clsx("font-semibold text-sm truncate", isDark ? "text-white" : "text-gray-900")}>{group.name}</div>
                      <div className={clsx("text-xs truncate", isDark ? "text-slate-500" : "text-gray-500")}>{group.description}</div>
                    </div>
                    <span className={clsx(
                      "px-2.5 py-1 rounded-full text-[10px] font-bold",
                      isDark ? "bg-white/10 text-slate-400" : "bg-gray-100 text-gray-500"
                    )}>
                      {group.memberCount || 0}
                    </span>
                  </motion.div>
                );
              })
            )}
          </div>
        </div>

        {/* Group Detail Panel */}
        <div className={clsx(
          "rounded-2xl overflow-hidden border",
          isDark ? "architect-card border-white/5" : "bg-white border-gray-200 shadow-sm"
        )}>
          {selectedGroup ? (
            <>
              {/* Group Header */}
              <div className={clsx("p-6", isDark ? "border-b border-white/5" : "border-b border-gray-200")}>
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-4">
                    <div className={clsx("w-14 h-14 rounded-2xl flex items-center justify-center border", isDark ? `${config.darkBg} border-white/10` : `${config.lightBg} border-gray-200`)}>
                      <GroupIcon size={28} className={config.color} />
                    </div>
                    <div>
                      <h2 className={clsx("text-xl font-bold tracking-tight", isDark ? "text-white" : "text-gray-900")}>{selectedGroup.name}</h2>
                      <p className={clsx("text-xs mt-0.5 font-mono", isDark ? "text-slate-500" : "text-gray-500")}>{selectedGroup.code || selectedGroup.name.toLowerCase().replace(/\s+/g, '-')}</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => { setEditingGroup({ ...selectedGroup }); setIsEditModalOpen(true); }}
                      className={clsx("p-2.5 rounded-xl transition-all", isDark ? "bg-white/5 border border-white/10 text-slate-400 hover:text-white" : "bg-gray-50 border border-gray-200 text-gray-400 hover:text-gray-700")}
                    >
                      <Edit size={16} />
                    </button>
                    <button
                      onClick={() => handleDeleteGroup(selectedGroup.id)}
                      className={clsx("p-2.5 rounded-xl transition-all", isDark ? "bg-white/5 border border-white/10 text-slate-400 hover:text-red-400" : "bg-gray-50 border border-gray-200 text-gray-400 hover:text-red-500")}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-4 gap-4">
                  {[
                    { label: 'Members', value: selectedGroup.memberCount || 0, color: isDark ? 'text-indigo-400' : 'text-indigo-600' },
                    { label: 'Permissions', value: 8, color: isDark ? 'text-emerald-400' : 'text-emerald-600' },
                    { label: 'Environments', value: 6, color: isDark ? 'text-cyan-400' : 'text-cyan-600' },
                    { label: 'Rules', value: 3, color: isDark ? 'text-amber-400' : 'text-amber-600' },
                  ].map((stat) => (
                    <div key={stat.label} className={clsx("p-4 rounded-xl text-center", isDark ? "bg-white/5" : "bg-gray-50")}>
                      <div className={clsx("text-2xl font-bold font-mono", stat.color)}>{stat.value}</div>
                      <div className={clsx("text-[10px] mt-1 font-bold uppercase tracking-widest", isDark ? "text-slate-500" : "text-gray-500")}>{stat.label}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Tabs */}
              <div className={clsx("flex px-6", isDark ? "border-b border-white/5" : "border-b border-gray-200")}>
                {([
                  { key: 'members' as const, label: 'Members', icon: Users },
                  { key: 'permissions' as const, label: 'Permissions', icon: Shield },
                  { key: 'rules' as const, label: 'Assignment Rules', icon: Settings },
                  { key: 'environments' as const, label: 'Environments', icon: Globe },
                ]).map((tab) => (
                  <button
                    key={tab.key}
                    className={clsx(
                      "px-5 py-3.5 text-xs font-bold uppercase tracking-widest transition-colors border-b-2 flex items-center gap-2",
                      activeTab === tab.key
                        ? isDark ? "text-indigo-400 border-indigo-400" : "text-indigo-600 border-indigo-600"
                        : isDark ? "text-slate-500 border-transparent hover:text-slate-300" : "text-gray-400 border-transparent hover:text-gray-600"
                    )}
                    onClick={() => setActiveTab(tab.key)}
                  >
                    <tab.icon size={14} />
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* Tab Content */}
              <div className="p-6">
                {activeTab === 'members' && (
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <div className={clsx(
                        "flex items-center gap-2 px-3 py-2 rounded-xl w-64",
                        isDark ? "bg-white/5 border border-white/10" : "bg-gray-50 border border-gray-200"
                      )}>
                        <Search size={14} className={isDark ? "text-slate-600" : "text-gray-400"} />
                        <input
                          type="text"
                          placeholder="Search members..."
                          className={clsx(
                            "border-none outline-none text-sm flex-1 bg-transparent",
                            isDark ? "text-white placeholder-slate-600" : "text-gray-900 placeholder-gray-400"
                          )}
                          value={memberSearchQuery}
                          onChange={(e) => setMemberSearchQuery(e.target.value)}
                        />
                      </div>
                      <button className="px-4 py-2.5 bg-indigo-500 text-white rounded-xl text-[10px] font-bold uppercase tracking-widest hover:bg-indigo-600 transition-all flex items-center gap-2">
                        <UserPlus size={14} />
                        Add Member
                      </button>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      {mockMembers.map((member, i) => (
                        <motion.div
                          key={member.id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: i * 0.05 }}
                          className={clsx(
                            "flex items-center gap-3 p-3 rounded-xl transition-all",
                            isDark ? "bg-white/5 hover:bg-white/10" : "bg-gray-50 hover:bg-gray-100"
                          )}
                        >
                          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold text-xs border border-white/10 shadow-lg">
                            {member.initials}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className={clsx("font-semibold text-sm", isDark ? "text-white" : "text-gray-900")}>{member.name}</div>
                            <div className={clsx("text-xs", isDark ? "text-slate-500" : "text-gray-500")}>{member.role}</div>
                          </div>
                          <div className="flex gap-1">
                            <button className={clsx("w-7 h-7 rounded-lg flex items-center justify-center transition-all", isDark ? "text-slate-500 hover:text-white hover:bg-white/10" : "text-gray-400 hover:text-gray-700 hover:bg-gray-200")}>
                              <Edit size={13} />
                            </button>
                            <button className={clsx("w-7 h-7 rounded-lg flex items-center justify-center transition-all", isDark ? "text-slate-500 hover:text-red-400 hover:bg-red-500/10" : "text-gray-400 hover:text-red-500 hover:bg-red-50")}>
                              <X size={13} />
                            </button>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  </div>
                )}

                {activeTab === 'permissions' && (
                  <div className="space-y-6">
                    {[
                      { title: 'Incident Permissions', icon: AlertTriangle, iconColor: 'text-amber-500', perms: ['View Incidents', 'Create Incidents', 'Resolve Incidents'], checks: [true, true, true] },
                      { title: 'Change Permissions', icon: ArrowLeftRight, iconColor: 'text-blue-500', perms: ['View Changes', 'Create Changes', 'Approve Changes'], checks: [true, true, false] },
                      { title: 'Asset Permissions', icon: Database, iconColor: 'text-purple-500', perms: ['View Assets', 'Edit Assets', 'Delete Assets'], checks: [true, true, false] },
                    ].map((section) => (
                      <div key={section.title}>
                        <h4 className={clsx("font-bold mb-3 flex items-center gap-2 text-sm", isDark ? "text-white" : "text-gray-900")}>
                          <section.icon size={16} className={section.iconColor} />
                          {section.title}
                        </h4>
                        <div className="grid grid-cols-3 gap-3">
                          {section.perms.map((perm, j) => (
                            <div key={perm} className={clsx("flex items-center gap-3 p-3 rounded-xl", isDark ? "bg-white/5" : "bg-gray-50")}>
                              <label className="relative inline-flex items-center cursor-pointer">
                                <input type="checkbox" className="sr-only peer" defaultChecked={section.checks[j]} />
                                <div className={clsx(
                                  "w-10 h-5 rounded-full peer transition-colors",
                                  section.checks[j] ? "bg-indigo-500" : isDark ? "bg-white/20" : "bg-gray-300"
                                )}>
                                  <div className={clsx("w-4 h-4 bg-white rounded-full shadow transform transition-transform mt-0.5", section.checks[j] ? 'translate-x-5' : 'translate-x-0.5')} />
                                </div>
                              </label>
                              <span className={clsx("text-sm", isDark ? "text-slate-300" : "text-gray-700")}>{perm}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {activeTab === 'rules' && (
                  <div className="space-y-3">
                    {[
                      { icon: AlertTriangle, title: 'Auto-assign P1 incidents', desc: 'Automatically assign priority 1 incidents to this group', active: true },
                      { icon: Server, title: 'Infrastructure alerts', desc: 'Route all infrastructure monitoring alerts', active: true },
                      { icon: ArrowLeftRight, title: 'Emergency changes', desc: 'Notify for all emergency change requests', active: false },
                    ].map((rule) => (
                      <div key={rule.title} className={clsx("flex items-center gap-3 p-4 rounded-xl transition-all", isDark ? "bg-white/5 hover:bg-white/10" : "bg-gray-50 hover:bg-gray-100")}>
                        <div className="w-10 h-10 rounded-xl bg-indigo-500 text-white flex items-center justify-center shadow-lg">
                          <rule.icon size={18} />
                        </div>
                        <div className="flex-1">
                          <div className={clsx("font-semibold text-sm", isDark ? "text-white" : "text-gray-900")}>{rule.title}</div>
                          <div className={clsx("text-xs", isDark ? "text-slate-500" : "text-gray-500")}>{rule.desc}</div>
                        </div>
                        <span className={clsx(
                          "px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest",
                          rule.active
                            ? isDark ? "bg-emerald-500/20 text-emerald-400" : "bg-emerald-50 text-emerald-600"
                            : isDark ? "bg-white/10 text-slate-400" : "bg-gray-100 text-gray-500"
                        )}>
                          {rule.active ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                {activeTab === 'environments' && (
                  <div>
                    <h4 className={clsx("font-bold mb-4 text-sm", isDark ? "text-white" : "text-gray-900")}>Environment Access</h4>
                    <div className="flex flex-wrap gap-2">
                      {[
                        { name: 'Production', active: true },
                        { name: 'Staging', active: true },
                        { name: 'Development', active: true },
                        { name: 'QA', active: true },
                        { name: 'UAT', active: true },
                        { name: 'DR Site', active: false },
                      ].map((env) => (
                        <span key={env.name} className={clsx(
                          "px-3 py-2 rounded-xl text-sm flex items-center gap-2 font-medium",
                          isDark ? "bg-white/5 text-slate-300" : "bg-gray-50 text-gray-700 border border-gray-200"
                        )}>
                          <span className={clsx("w-2 h-2 rounded-full", env.active ? "bg-emerald-500 animate-pulse" : "bg-red-500")} />
                          {env.name}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Quick Add Member Section */}
              {activeTab === 'members' && (
                <div className={clsx("p-6", isDark ? "border-t border-white/5" : "border-t border-gray-200")}>
                  <h4 className={clsx("font-bold mb-3 text-xs uppercase tracking-widest", isDark ? "text-slate-400" : "text-gray-500")}>Quick Add Member</h4>
                  <div className="flex gap-3">
                    <div className="flex-1 relative">
                      <Search size={14} className={clsx("absolute left-3 top-1/2 -translate-y-1/2", isDark ? "text-slate-600" : "text-gray-400")} />
                      <input
                        type="text"
                        placeholder="Search users by name or email..."
                        className={clsx(
                          "w-full pl-9 pr-3 py-2.5 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500",
                          isDark ? "bg-white/5 border border-white/10 text-white placeholder-slate-600" : "bg-gray-50 border border-gray-200 text-gray-900 placeholder-gray-400"
                        )}
                      />
                    </div>
                    <select className={clsx(
                      "px-3 py-2.5 rounded-xl text-sm",
                      isDark ? "bg-white/5 border border-white/10 text-white" : "bg-gray-50 border border-gray-200 text-gray-900"
                    )}>
                      <option value="">Select role...</option>
                      <option value="member">Member</option>
                      <option value="lead">Team Lead</option>
                      <option value="manager">Manager</option>
                    </select>
                    <button className="px-5 py-2.5 bg-indigo-500 text-white rounded-xl text-xs font-bold hover:bg-indigo-600 transition-all flex items-center gap-1">
                      <Plus size={14} />
                      Add
                    </button>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className={clsx("flex flex-col items-center justify-center h-96", isDark ? "text-slate-600" : "text-gray-400")}>
              <Layers size={48} className="mb-3 opacity-30" />
              <p className="text-sm font-bold uppercase tracking-widest">Select a group to view details</p>
            </div>
          )}
        </div>
      </div>

      {/* Edit Group Modal */}
      <Modal isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} title="MODIFY GROUP PARAMETERS" size="md">
        {editingGroup && (
          <div className="space-y-5 pt-4">
            {[
              { label: 'Group Name', value: editingGroup.name, key: 'name' },
              { label: 'Code', value: editingGroup.code || '', key: 'code' },
              { label: 'Description', value: editingGroup.description || '', key: 'description' },
              { label: 'Email', value: editingGroup.email || '', key: 'email', type: 'email' },
            ].map((field) => (
              <div key={field.key}>
                <label className={clsx("text-[10px] font-bold uppercase tracking-widest mb-1.5 block", isDark ? "text-slate-500" : "text-gray-500")}>{field.label}</label>
                <input
                  type={field.type || 'text'}
                  className={clsx(
                    "w-full px-4 py-3 rounded-xl text-sm focus:ring-1 focus:ring-indigo-500",
                    isDark ? "bg-white/5 border border-white/10 text-white" : "bg-gray-50 border border-gray-200 text-gray-900"
                  )}
                  value={field.value}
                  onChange={(e) => setEditingGroup({ ...editingGroup, [field.key]: e.target.value })}
                />
              </div>
            ))}
            <div className={clsx("flex justify-end gap-3 pt-5 border-t", isDark ? "border-white/5" : "border-gray-200")}>
              <Button variant="outline" onClick={() => setIsEditModalOpen(false)} className="rounded-xl font-bold uppercase text-[10px] tracking-widest">Cancel</Button>
              <Button onClick={handleSaveGroup} isLoading={isSaving} className="bg-indigo-500 rounded-xl font-bold uppercase text-[10px] tracking-widest">Save Changes</Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Create Group Modal */}
      <Modal isOpen={isCreateModalOpen} onClose={() => setIsCreateModalOpen(false)} title="INITIALIZE GROUP STRUCTURE" size="md">
        <div className="space-y-5 pt-4">
          {[
            { label: 'Group Name', value: newGroup.name, key: 'name', placeholder: 'Enter group name' },
            { label: 'Code', value: newGroup.code, key: 'code', placeholder: 'Auto-generated from name if empty' },
            { label: 'Description', value: newGroup.description, key: 'description', placeholder: 'Brief description of the group' },
            { label: 'Email', value: newGroup.email, key: 'email', placeholder: 'Group email address', type: 'email' },
          ].map((field) => (
            <div key={field.key}>
              <label className={clsx("text-[10px] font-bold uppercase tracking-widest mb-1.5 block", isDark ? "text-slate-500" : "text-gray-500")}>{field.label}</label>
              <input
                type={field.type || 'text'}
                className={clsx(
                  "w-full px-4 py-3 rounded-xl text-sm focus:ring-1 focus:ring-indigo-500",
                  isDark ? "bg-white/5 border border-white/10 text-white placeholder-slate-600" : "bg-gray-50 border border-gray-200 text-gray-900 placeholder-gray-400"
                )}
                value={field.value}
                onChange={(e) => setNewGroup({ ...newGroup, [field.key]: e.target.value })}
                placeholder={field.placeholder}
              />
            </div>
          ))}
          <div className={clsx("flex justify-end gap-3 pt-5 border-t", isDark ? "border-white/5" : "border-gray-200")}>
            <Button variant="outline" onClick={() => setIsCreateModalOpen(false)} className="rounded-xl font-bold uppercase text-[10px] tracking-widest">Cancel</Button>
            <Button onClick={handleCreateGroup} isLoading={isSaving} className="bg-indigo-500 rounded-xl font-bold uppercase text-[10px] tracking-widest">Create Group</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default GroupsPage;
