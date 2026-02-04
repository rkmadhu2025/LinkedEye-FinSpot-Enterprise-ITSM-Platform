/**
 * Clients Management Page
 * Admin page for managing client/tenants in multi-tenant system
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Building2,
  Plus,
  Search,
  Filter,
  MoreVertical,
  Edit,
  Trash2,
  Users,
  AlertTriangle,
  Server,
  Activity,
  MapPin,
  RefreshCw,
} from 'lucide-react';
import {
  Card,
  CardBody,
  Button,
  Input,
  Select,
  Badge,
  Modal,
  Spinner,
  Textarea,
} from '@/components/ui';
import { Client, ClientCreate, ClientUpdate, ClientStatistics } from '@/types';
import clientService from '@/services/clientService';
import { useAppSelector } from '@/hooks/useRedux';
import toast from 'react-hot-toast';

const ClientsPage = () => {
  const navigate = useNavigate();
  const { theme } = useAppSelector((state) => state.ui);
  const isDark = theme === 'dark';
  const [clients, setClients] = useState<Client[]>([]);
  const [statistics, setStatistics] = useState<Record<string, ClientStatistics>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [environmentFilter, setEnvironmentFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Modal states
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Form state
  const [formData, setFormData] = useState<ClientCreate>({
    client_code: '',
    name: '',
    display_name: '',
    environment: 'production',
    location: '',
    sla_tier: 'standard',
    support_hours: '24x7',
    primary_contact_email: '',
    max_users: 100,
    max_assets: 1000,
  });

  useEffect(() => {
    loadClients();
    loadStatistics();
  }, [environmentFilter, statusFilter, searchQuery]);

  const loadClients = async () => {
    setIsLoading(true);
    try {
      const data = await clientService.listClients({
        environment: environmentFilter || undefined,
        status: statusFilter || undefined,
        search: searchQuery || undefined,
      });
      setClients(data);
    } catch (error) {
      console.error('Failed to load clients:', error);
      toast.error('Failed to load clients');
    } finally {
      setIsLoading(false);
    }
  };

  const loadStatistics = async () => {
    try {
      const stats = await clientService.getAllClientStatistics();
      const statsMap: Record<string, ClientStatistics> = {};
      stats.forEach((s) => {
        statsMap[s.client_id] = s;
      });
      setStatistics(statsMap);
    } catch (error) {
      console.error('Failed to load statistics:', error);
    }
  };

  const handleCreate = async () => {
    setIsSaving(true);
    try {
      await clientService.createClient(formData);
      toast.success('Client created successfully');
      setIsCreateModalOpen(false);
      resetForm();
      loadClients();
      loadStatistics();
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Failed to create client');
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpdate = async () => {
    if (!editingClient) return;
    setIsSaving(true);
    try {
      const updateData: ClientUpdate = {
        name: formData.name,
        display_name: formData.display_name,
        environment: formData.environment,
        location: formData.location,
        sla_tier: formData.sla_tier,
        support_hours: formData.support_hours,
        primary_contact_email: formData.primary_contact_email,
        max_users: formData.max_users,
        max_assets: formData.max_assets,
      };
      await clientService.updateClient(editingClient.id, updateData);
      toast.success('Client updated successfully');
      setIsEditModalOpen(false);
      setEditingClient(null);
      resetForm();
      loadClients();
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Failed to update client');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (client: Client) => {
    if (!confirm(`Are you sure you want to deactivate ${client.name}?`)) return;
    try {
      await clientService.deleteClient(client.id);
      toast.success('Client deactivated successfully');
      loadClients();
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Failed to deactivate client');
    }
  };

  const openEditModal = (client: Client) => {
    setEditingClient(client);
    setFormData({
      client_code: client.client_code,
      name: client.name,
      display_name: client.display_name || '',
      environment: client.environment,
      location: client.location || '',
      sla_tier: client.sla_tier,
      support_hours: client.support_hours,
      primary_contact_email: client.primary_contact_email || '',
      max_users: client.max_users,
      max_assets: client.max_assets,
    });
    setIsEditModalOpen(true);
  };

  const resetForm = () => {
    setFormData({
      client_code: '',
      name: '',
      display_name: '',
      environment: 'production',
      location: '',
      sla_tier: 'standard',
      support_hours: '24x7',
      primary_contact_email: '',
      max_users: 100,
      max_assets: 1000,
    });
  };

  const getEnvironmentBadge = (env: string) => {
    const variants: Record<string, 'success' | 'warning' | 'info' | 'default'> = {
      production: 'success',
      dr: 'warning',
      uat: 'info',
      development: 'default',
      staging: 'default',
    };
    return <Badge variant={variants[env] || 'default'}>{env.toUpperCase()}</Badge>;
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'success' | 'warning' | 'danger' | 'info'> = {
      active: 'success',
      inactive: 'default' as any,
      suspended: 'danger',
      onboarding: 'info',
    };
    return <Badge variant={variants[status] || 'default'}>{status}</Badge>;
  };

  return (
    <div className="space-y-6 min-h-screen -m-6 p-6" style={{ background: isDark ? 'linear-gradient(180deg, #030712 0%, #0a0f1a 100%)' : '#f9fafb' }}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className={`text-2xl font-bold flex items-center gap-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
            <Building2 className="text-amber-500" size={28} />
            Clients Management
          </h1>
          <p className={`mt-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
            Manage client organizations and their configurations
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={loadClients}
            className="px-4 py-2.5 rounded-xl text-sm font-medium flex items-center gap-2 transition-all text-gray-300 hover:text-white"
            style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.1)' }}
          >
            <RefreshCw size={16} />
            Refresh
          </button>
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="px-4 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 text-white rounded-xl text-sm font-medium flex items-center gap-2 hover:shadow-lg hover:shadow-amber-500/30 transition-all"
          >
            <Plus size={16} />
            Add Client
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="rounded-xl p-4" style={{ background: isDark ? 'rgba(255,255,255,0.05)' : '#ffffff', border: isDark ? '1px solid rgba(255,255,255,0.1)' : '1px solid #e5e8eb' }}>
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex-1 min-w-[200px] relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search clients..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={`w-full pl-10 pr-4 py-2.5 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20 transition-all placeholder-gray-400 ${isDark ? 'text-white' : 'text-gray-900'}`}
              style={{ background: isDark ? 'rgba(255,255,255,0.1)' : '#f9fafb', border: isDark ? '1px solid rgba(255,255,255,0.1)' : '1px solid #e5e8eb' }}
            />
          </div>
          <select
            value={environmentFilter}
            onChange={(e) => setEnvironmentFilter(e.target.value)}
            className={`px-4 py-2.5 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20 transition-all ${isDark ? 'text-white' : 'text-gray-900'}`}
            style={{ background: isDark ? 'rgba(255,255,255,0.1)' : '#f9fafb', border: isDark ? '1px solid rgba(255,255,255,0.1)' : '1px solid #e5e8eb' }}
          >
            <option value="" className="bg-gray-900 text-white">All Environments</option>
            <option value="production" className="bg-gray-900 text-white">Production</option>
            <option value="dr" className="bg-gray-900 text-white">DR</option>
            <option value="uat" className="bg-gray-900 text-white">UAT</option>
            <option value="development" className="bg-gray-900 text-white">Development</option>
            <option value="staging" className="bg-gray-900 text-white">Staging</option>
          </select>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className={`px-4 py-2.5 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20 transition-all ${isDark ? 'text-white' : 'text-gray-900'}`}
            style={{ background: isDark ? 'rgba(255,255,255,0.1)' : '#f9fafb', border: isDark ? '1px solid rgba(255,255,255,0.1)' : '1px solid #e5e8eb' }}
          >
            <option value="" className="bg-gray-900 text-white">All Statuses</option>
            <option value="active" className="bg-gray-900 text-white">Active</option>
            <option value="inactive" className="bg-gray-900 text-white">Inactive</option>
            <option value="suspended" className="bg-gray-900 text-white">Suspended</option>
            <option value="onboarding" className="bg-gray-900 text-white">Onboarding</option>
          </select>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard isDark={isDark}
          title="Total Clients"
          value={clients.length}
          icon={<Building2 size={24} />}
          color="blue"
        />
        <StatCard isDark={isDark}
          title="Production"
          value={clients.filter((c) => c.environment === 'production').length}
          icon={<Server size={24} />}
          color="green"
        />
        <StatCard isDark={isDark}
          title="Development"
          value={clients.filter((c) => c.environment === 'development').length}
          icon={<Activity size={24} />}
          color="purple"
        />
        <StatCard isDark={isDark}
          title="DR Sites"
          value={clients.filter((c) => c.environment === 'dr').length}
          icon={<AlertTriangle size={24} />}
          color="orange"
        />
      </div>

      {/* Clients Table */}
      <div className="rounded-xl overflow-hidden" style={{ background: isDark ? 'rgba(255,255,255,0.05)' : '#ffffff', border: isDark ? '1px solid rgba(255,255,255,0.1)' : '1px solid #e5e8eb' }}>
        {isLoading ? (
          <div className="flex justify-center items-center py-12">
            <div className="w-10 h-10 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : clients.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <Building2 size={48} className="mx-auto mb-4 opacity-50" />
            <p>No clients found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead style={{ background: isDark ? 'rgba(255,255,255,0.03)' : '#f9fafb', borderBottom: isDark ? '1px solid rgba(255,255,255,0.1)' : '1px solid #e5e8eb' }}>
                <tr>
                  <th className="px-6 py-3 text-left text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
                    Client
                  </th>
                  <th className="px-6 py-3 text-left text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
                    Environment
                  </th>
                  <th className="px-6 py-3 text-left text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
                    Location
                  </th>
                  <th className="px-6 py-3 text-left text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
                    SLA Tier
                  </th>
                  <th className="px-6 py-3 text-left text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
                    Stats
                  </th>
                  <th className="px-6 py-3 text-left text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-right text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {clients.map((client) => {
                  const stats = statistics[client.id];
                  return (
                    <tr
                      key={client.id}
                      className="transition-all cursor-pointer"
                      style={{ borderBottom: isDark ? '1px solid rgba(255,255,255,0.05)' : '1px solid #f0f0f0' }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = isDark ? 'rgba(255,255,255,0.03)' : '#f9fafb')}
                      onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                    >
                      <td className="px-6 py-4">
                        <div>
                          <p className={`font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
                            {client.display_name || client.name}
                          </p>
                          <p className="text-sm text-gray-500 font-mono">
                            {client.client_code}
                          </p>
                        </div>
                      </td>
                      <td className="px-6 py-4">{getEnvironmentBadge(client.environment)}</td>
                      <td className="px-6 py-4">
                        {client.location ? (
                          <span className="flex items-center gap-1 text-gray-300">
                            <MapPin size={14} className="text-gray-500" />
                            {client.location}
                          </span>
                        ) : (
                          <span className="text-gray-500">—</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <Badge
                          variant={
                            client.sla_tier === 'enterprise'
                              ? 'warning'
                              : client.sla_tier === 'premium'
                              ? 'info'
                              : 'default'
                          }
                        >
                          {client.sla_tier}
                        </Badge>
                      </td>
                      <td className="px-6 py-4">
                        {stats ? (
                          <div className="flex items-center gap-3 text-sm text-gray-300">
                            <span className="flex items-center gap-1" title="Users">
                              <Users size={14} className="text-gray-400" />
                              {stats.user_count}
                            </span>
                            <span className="flex items-center gap-1" title="Open Incidents">
                              <AlertTriangle size={14} className="text-amber-500" />
                              {stats.open_incidents}
                            </span>
                            <span className="flex items-center gap-1" title="Assets">
                              <Server size={14} className="text-gray-400" />
                              {stats.asset_count}
                            </span>
                          </div>
                        ) : (
                          <span className="text-gray-500">—</span>
                        )}
                      </td>
                      <td className="px-6 py-4">{getStatusBadge(client.status)}</td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => openEditModal(client)}
                            className="p-1.5 text-gray-400 hover:text-amber-400 rounded-lg transition-all"
                            title="Edit"
                          >
                            <Edit size={16} />
                          </button>
                          <button
                            onClick={() => handleDelete(client)}
                            className="p-1.5 text-gray-400 hover:text-red-400 rounded-lg transition-all"
                            title="Delete"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create Modal */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => {
          setIsCreateModalOpen(false);
          resetForm();
        }}
        title="Add New Client"
        size="lg"
      >
        <ClientForm
          formData={formData}
          setFormData={setFormData}
          onSubmit={handleCreate}
          onCancel={() => {
            setIsCreateModalOpen(false);
            resetForm();
          }}
          isLoading={isSaving}
          isEdit={false}
        />
      </Modal>

      {/* Edit Modal */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setEditingClient(null);
          resetForm();
        }}
        title="Edit Client"
        size="lg"
      >
        <ClientForm
          formData={formData}
          setFormData={setFormData}
          onSubmit={handleUpdate}
          onCancel={() => {
            setIsEditModalOpen(false);
            setEditingClient(null);
            resetForm();
          }}
          isLoading={isSaving}
          isEdit={true}
        />
      </Modal>
    </div>
  );
};

// Stat Card Component
interface StatCardProps {
  title: string;
  value: number;
  icon: React.ReactNode;
  color: 'blue' | 'green' | 'purple' | 'orange';
  isDark?: boolean;
}

const StatCard: React.FC<StatCardProps> = ({ title, value, icon, color, isDark = true }) => {
  const colorConfig = {
    blue: { iconBg: 'rgba(245, 158, 11, 0.15)', iconColor: '#f59e0b' },
    green: { iconBg: 'rgba(16, 185, 129, 0.15)', iconColor: '#10b981' },
    purple: { iconBg: 'rgba(139, 92, 246, 0.15)', iconColor: '#8b5cf6' },
    orange: { iconBg: 'rgba(245, 158, 11, 0.15)', iconColor: '#f59e0b' },
  };

  const config = colorConfig[color];

  return (
    <div className="p-4 rounded-xl transition-all" style={{ background: isDark ? 'rgba(255,255,255,0.05)' : '#ffffff', border: isDark ? '1px solid rgba(255,255,255,0.1)' : '1px solid #e5e8eb' }}>
      <div className="flex items-center justify-between">
        <div>
          <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{title}</p>
          <p className={`text-2xl font-bold mt-1 ${isDark ? 'text-white' : 'text-gray-900'}`}>{value}</p>
        </div>
        <div
          className="w-12 h-12 rounded-xl flex items-center justify-center"
          style={{ background: config.iconBg, color: config.iconColor }}
        >
          {icon}
        </div>
      </div>
    </div>
  );
};

// Client Form Component
interface ClientFormProps {
  formData: ClientCreate;
  setFormData: React.Dispatch<React.SetStateAction<ClientCreate>>;
  onSubmit: () => void;
  onCancel: () => void;
  isLoading: boolean;
  isEdit: boolean;
}

const ClientForm: React.FC<ClientFormProps> = ({
  formData,
  setFormData,
  onSubmit,
  onCancel,
  isLoading,
  isEdit,
}) => {
  const inputStyle = {
    background: 'rgba(255,255,255,0.1)',
    border: '1px solid rgba(255,255,255,0.2)',
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1.5">Client Code *</label>
          <input
            type="text"
            value={formData.client_code}
            onChange={(e) => setFormData({ ...formData, client_code: e.target.value })}
            placeholder="e.g., fs-mum-prod-le"
            disabled={isEdit}
            className="w-full px-4 py-2.5 rounded-xl text-sm text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-500/20 disabled:opacity-50"
            style={inputStyle}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1.5">Name *</label>
          <input
            type="text"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="Client full name"
            className="w-full px-4 py-2.5 rounded-xl text-sm text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-500/20"
            style={inputStyle}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1.5">Display Name</label>
          <input
            type="text"
            value={formData.display_name}
            onChange={(e) => setFormData({ ...formData, display_name: e.target.value })}
            placeholder="Short display name"
            className="w-full px-4 py-2.5 rounded-xl text-sm text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-500/20"
            style={inputStyle}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1.5">Environment</label>
          <select
            value={formData.environment}
            onChange={(e) => setFormData({ ...formData, environment: e.target.value as any })}
            className="w-full px-4 py-2.5 rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-amber-500/20"
            style={inputStyle}
          >
            <option value="production" className="bg-gray-800 text-white">Production</option>
            <option value="dr" className="bg-gray-800 text-white">Disaster Recovery</option>
            <option value="uat" className="bg-gray-800 text-white">UAT</option>
            <option value="development" className="bg-gray-800 text-white">Development</option>
            <option value="staging" className="bg-gray-800 text-white">Staging</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1.5">Location</label>
          <input
            type="text"
            value={formData.location}
            onChange={(e) => setFormData({ ...formData, location: e.target.value })}
            placeholder="e.g., Mumbai, Bangalore"
            className="w-full px-4 py-2.5 rounded-xl text-sm text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-500/20"
            style={inputStyle}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1.5">SLA Tier</label>
          <select
            value={formData.sla_tier}
            onChange={(e) => setFormData({ ...formData, sla_tier: e.target.value as any })}
            className="w-full px-4 py-2.5 rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-amber-500/20"
            style={inputStyle}
          >
            <option value="standard" className="bg-gray-800 text-white">Standard</option>
            <option value="premium" className="bg-gray-800 text-white">Premium</option>
            <option value="enterprise" className="bg-gray-800 text-white">Enterprise</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1.5">Support Hours</label>
          <select
            value={formData.support_hours}
            onChange={(e) => setFormData({ ...formData, support_hours: e.target.value })}
            className="w-full px-4 py-2.5 rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-amber-500/20"
            style={inputStyle}
          >
            <option value="24x7" className="bg-gray-800 text-white">24x7</option>
            <option value="8x5" className="bg-gray-800 text-white">8x5 (Business Hours)</option>
            <option value="12x5" className="bg-gray-800 text-white">12x5 (Extended Hours)</option>
            <option value="16x7" className="bg-gray-800 text-white">16x7</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1.5">Primary Contact Email</label>
          <input
            type="email"
            value={formData.primary_contact_email}
            onChange={(e) => setFormData({ ...formData, primary_contact_email: e.target.value })}
            placeholder="contact@example.com"
            className="w-full px-4 py-2.5 rounded-xl text-sm text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-500/20"
            style={inputStyle}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1.5">Max Users</label>
          <input
            type="number"
            value={formData.max_users?.toString()}
            onChange={(e) => setFormData({ ...formData, max_users: parseInt(e.target.value) || 100 })}
            className="w-full px-4 py-2.5 rounded-xl text-sm text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-500/20"
            style={inputStyle}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1.5">Max Assets</label>
          <input
            type="number"
            value={formData.max_assets?.toString()}
            onChange={(e) => setFormData({ ...formData, max_assets: parseInt(e.target.value) || 1000 })}
            className="w-full px-4 py-2.5 rounded-xl text-sm text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-500/20"
            style={inputStyle}
          />
        </div>
      </div>

      <div className="flex justify-end gap-3 pt-4" style={{ borderTop: '1px solid rgba(255,255,255,0.1)' }}>
        <button
          onClick={onCancel}
          disabled={isLoading}
          className="px-4 py-2.5 rounded-xl text-sm font-medium text-gray-300 transition-all disabled:opacity-50"
          style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.1)' }}
        >
          Cancel
        </button>
        <button
          onClick={onSubmit}
          disabled={isLoading}
          className="px-4 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 text-white rounded-xl text-sm font-medium flex items-center gap-2 hover:shadow-lg hover:shadow-amber-500/30 transition-all disabled:opacity-50"
        >
          {isLoading && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
          {isEdit ? 'Update Client' : 'Create Client'}
        </button>
      </div>
    </div>
  );
};

export default ClientsPage;
