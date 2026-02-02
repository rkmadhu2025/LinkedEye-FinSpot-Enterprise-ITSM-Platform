import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Plus, Search, CheckCircle, XCircle, Clock, Plug, Settings, RefreshCw,
  ExternalLink, Key, Bell, Play, Info, Flame, BarChart2, ScrollText,
  Bot, MessageSquare, Smartphone, Database, Shield, Server, Ticket, Github
} from 'lucide-react';
import { Card, CardBody, Button, Input, Badge, Spinner, Modal, Select, Textarea } from '@/components/ui';
import { integrationService } from '@/services/integrationService';
import { useAppSelector } from '@/hooks/useRedux';
import { Integration, CreateIntegrationData, IntegrationType } from '@/types';
import toast from 'react-hot-toast';
import { formatDistanceToNow } from 'date-fns';

// Integration Logo/Icon configs
const integrationConfigs: Record<string, { icon: React.ElementType; bgColor: string; color: string }> = {
  prometheus: { icon: Flame, bgColor: 'bg-orange-600', color: 'text-white' },
  grafana: { icon: BarChart2, bgColor: 'bg-orange-500', color: 'text-white' },
  loki: { icon: ScrollText, bgColor: 'bg-amber-500', color: 'text-white' },
  stackstorm: { icon: Bot, bgColor: 'bg-green-500', color: 'text-white' },
  slack: { icon: MessageSquare, bgColor: 'bg-purple-900', color: 'text-white' },
  pagerduty: { icon: Smartphone, bgColor: 'bg-green-600', color: 'text-white' },
  keycloak: { icon: Key, bgColor: 'bg-gray-700', color: 'text-white' },
  kubernetes: { icon: Server, bgColor: 'bg-blue-600', color: 'text-white' },
  postgresql: { icon: Database, bgColor: 'bg-blue-800', color: 'text-white' },
  jira: { icon: Ticket, bgColor: 'bg-blue-600', color: 'text-white' },
  github: { icon: Github, bgColor: 'bg-gray-900', color: 'text-white' },
  servicenow: { icon: Ticket, bgColor: 'bg-teal-500', color: 'text-white' },
  default: { icon: Plug, bgColor: 'bg-gray-600', color: 'text-white' },
};

// Category Tab Component
const CategoryTab = ({ label, isActive, onClick }: { label: string; isActive: boolean; onClick: () => void }) => (
  <button
    className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
      isActive
        ? 'bg-blue-600 text-white shadow-md'
        : 'text-gray-300 hover:text-white'
    }`}
    style={!isActive ? { background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.1)' } : undefined}
    onClick={onClick}
  >
    {label}
  </button>
);

// Stat Card Component
const StatCard = ({ icon: Icon, iconBg, iconColor, value, label }: {
  icon: React.ElementType;
  iconBg: string;
  iconColor: string;
  value: number | string;
  label: string;
}) => (
  <div className="rounded-xl p-5 transition-all" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}>
    <div className="flex items-center justify-between mb-3">
      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${iconBg}`}>
        <Icon size={18} className={iconColor} />
      </div>
    </div>
    <div className="text-3xl font-bold text-white">{value}</div>
    <div className="text-sm text-gray-400 mt-1">{label}</div>
  </div>
);

// Health Indicator Component
const HealthIndicator = ({ health }: { health: number }) => {
  return (
    <div className="flex gap-1">
      {[...Array(5)].map((_, i) => (
        <div
          key={i}
          className={`w-1 h-4 rounded ${
            i < health
              ? health >= 4 ? 'bg-green-500' : health >= 2 ? 'bg-amber-500' : 'bg-red-500'
              : 'bg-gray-200 dark:bg-gray-700'
          }`}
        />
      ))}
    </div>
  );
};

// Integration Card Component
const IntegrationCard = ({
  integration,
  isAvailable = false,
}: {
  integration: {
    id: string;
    name: string;
    provider?: string;
    category: string;
    description: string;
    status: 'connected' | 'error' | 'pending' | 'available';
    stats?: { value: string; label: string }[];
    lastSync?: string;
    health?: number;
  };
  isAvailable?: boolean;
  onConnect?: (provider: string) => void;
}) => {
  const config = integrationConfigs[integration.provider?.toLowerCase() || 'default'] || integrationConfigs.default;
  const Icon = config.icon;

  return (
    <div
      className="rounded-xl overflow-hidden transition-all duration-200 hover:-translate-y-0.5"
      style={{
        background: isAvailable ? 'rgba(255,255,255,0.02)' : 'rgba(255,255,255,0.05)',
        border: isAvailable ? '2px dashed rgba(255,255,255,0.2)' : '1px solid rgba(255,255,255,0.1)',
      }}
    >
      {/* Card Header */}
      <div className="p-5">
        <div className="flex items-start gap-4">
          <div className={`w-14 h-14 rounded-xl flex items-center justify-center shrink-0 ${config.bgColor} shadow-lg`}>
            <Icon size={28} className={config.color} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-semibold text-white">{integration.name}</div>
            <div className="text-xs text-gray-400">{integration.category}</div>
          </div>
          <div className={`flex items-center gap-1.5 text-xs font-medium ${
            integration.status === 'connected' ? 'text-green-400' :
            integration.status === 'error' ? 'text-red-400' :
            integration.status === 'pending' ? 'text-amber-400' :
            'text-gray-500'
          }`}>
            <span className={`w-2 h-2 rounded-full ${
              integration.status === 'connected' ? 'bg-green-500 animate-pulse' :
              integration.status === 'error' ? 'bg-red-500' :
              integration.status === 'pending' ? 'bg-amber-500' :
              'bg-gray-600'
            }`} />
            {integration.status === 'connected' ? 'Connected' :
             integration.status === 'error' ? 'Auth Error' :
             integration.status === 'pending' ? 'Pending' : 'Available'}
          </div>
        </div>
      </div>

      {/* Card Body */}
      <div className="px-5 pb-5">
        <p className="text-sm text-gray-400 leading-relaxed mb-4">{integration.description}</p>

        {/* Stats (for connected integrations) */}
        {integration.stats && integration.stats.length > 0 && (
          <div className="flex gap-4 p-3 rounded-lg mb-4" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}>
            {integration.stats.map((stat, idx) => (
              <div key={idx} className="flex-1 text-center">
                <div className="text-lg font-bold text-white">{stat.value}</div>
                <div className="text-xs text-gray-400">{stat.label}</div>
              </div>
            ))}
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2">
          {isAvailable ? (
            <>
              <button
                onClick={() => onConnect?.(integration.provider || '')}
                className="flex-1 px-3 py-2 rounded-lg text-sm font-medium text-blue-400 flex items-center justify-center gap-2 hover:bg-blue-600 hover:text-white transition-all"
                style={{ background: 'rgba(59, 130, 246, 0.15)', border: '1px solid rgba(59, 130, 246, 0.3)' }}
              >
                <Plug size={14} />
                Connect
              </button>
              <button
                className="flex-1 px-3 py-2 rounded-lg text-sm font-medium text-gray-300 flex items-center justify-center gap-2 hover:text-white transition-all"
                style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.1)' }}
              >
                <Info size={14} />
                Learn More
              </button>
            </>
          ) : integration.status === 'error' ? (
            <button className="flex-1 px-3 py-2 rounded-lg text-sm font-medium text-white bg-gradient-to-r from-blue-600 to-blue-700 flex items-center justify-center gap-2 hover:from-blue-700 hover:to-blue-800 transition-all shadow-md hover:shadow-lg">
              <Key size={14} />
              Re-authenticate
            </button>
          ) : (
            <>
              <Link
                to={`/integrations/${integration.id}`}
                className="flex-1 px-3 py-2 rounded-lg text-sm font-medium text-gray-300 flex items-center justify-center gap-2 hover:text-white transition-all"
                style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.1)' }}
              >
                <Settings size={14} />
                Configure
              </Link>
              <button
                className="flex-1 px-3 py-2 rounded-lg text-sm font-medium text-gray-300 flex items-center justify-center gap-2 hover:text-white transition-all"
                style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.1)' }}
              >
                <RefreshCw size={14} />
                Test
              </button>
            </>
          )}
        </div>
      </div>

      {/* Card Footer (for connected integrations) */}
      {!isAvailable && (
        <div className="px-5 py-3 flex items-center justify-between" style={{ borderTop: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.02)' }}>
          <span className={`text-xs flex items-center gap-1 ${integration.status === 'error' ? 'text-red-400' : 'text-gray-400'}`}>
            <Clock size={12} />
            {integration.status === 'error' ? 'Connection failed' : `Last sync: ${integration.lastSync || 'Never'}`}
          </span>
          <HealthIndicator health={integration.health || 0} />
        </div>
      )}
    </div>
  );
};

// Mock data for enhanced display
const mockIntegrations = [
  {
    id: '550e8400-e29b-41d4-a716-446655440001',
    name: 'Prometheus',
    provider: 'prometheus',
    category: 'Monitoring',
    description: 'Time-series metrics collection and alerting. Auto-creates incidents from Prometheus alerts.',
    status: 'connected' as const,
    stats: [
      { value: '1.2M', label: 'Metrics/min' },
      { value: '847', label: 'Active Rules' },
      { value: '23', label: 'Alerts Today' },
    ],
    lastSync: '12 sec ago',
    health: 5,
  },
  {
    id: '550e8400-e29b-41d4-a716-446655440002',
    name: 'Grafana',
    provider: 'grafana',
    category: 'Visualization',
    description: 'Embedded dashboards and charts. Provides real-time metrics visualization in incident details.',
    status: 'connected' as const,
    stats: [
      { value: '42', label: 'Dashboards' },
      { value: '156', label: 'Panels' },
      { value: '8', label: 'Datasources' },
    ],
    lastSync: '5 min ago',
    health: 5,
  },
  {
    id: '550e8400-e29b-41d4-a716-446655440003',
    name: 'Loki',
    provider: 'loki',
    category: 'Logging',
    description: 'Log aggregation and querying. Shows contextual logs in incident timeline view.',
    status: 'connected' as const,
    stats: [
      { value: '2.4TB', label: 'Logs/Day' },
      { value: '12', label: 'Streams' },
      { value: '30d', label: 'Retention' },
    ],
    lastSync: '8 sec ago',
    health: 5,
  },
  {
    id: '550e8400-e29b-41d4-a716-446655440004',
    name: 'StackStorm',
    provider: 'stackstorm',
    category: 'Automation',
    description: 'Event-driven automation platform. Executes auto-remediation workflows for incidents.',
    status: 'connected' as const,
    stats: [
      { value: '24', label: 'Workflows' },
      { value: '492', label: 'Runs Today' },
      { value: '94%', label: 'Success' },
    ],
    lastSync: '2 min ago',
    health: 5,
  },
  {
    id: '550e8400-e29b-41d4-a716-446655440005',
    name: 'Slack',
    provider: 'slack',
    category: 'Communication',
    description: 'Real-time notifications and incident channels. Enables ChatOps workflows.',
    status: 'connected' as const,
    stats: [
      { value: '12', label: 'Channels' },
      { value: '847', label: 'Messages/Week' },
      { value: '5', label: 'Bots' },
    ],
    lastSync: '1 min ago',
    health: 5,
  },
  {
    id: '550e8400-e29b-41d4-a716-446655440006',
    name: 'PagerDuty',
    provider: 'pagerduty',
    category: 'Alerting',
    description: 'On-call scheduling and escalation. Routes critical incidents to on-call engineers.',
    status: 'error' as const,
    stats: [
      { value: '--', label: 'Schedules' },
      { value: '--', label: 'Escalations' },
      { value: '--', label: 'Alerts' },
    ],
    lastSync: '2h ago',
    health: 2,
  },
  {
    id: '550e8400-e29b-41d4-a716-446655440007',
    name: 'Keycloak',
    provider: 'keycloak',
    category: 'Authentication',
    description: 'SSO and identity management. Handles user authentication and RBAC.',
    status: 'connected' as const,
    stats: [
      { value: '247', label: 'Users' },
      { value: '18', label: 'Roles' },
      { value: '3', label: 'Realms' },
    ],
    lastSync: '30 sec ago',
    health: 5,
  },
  {
    id: '550e8400-e29b-41d4-a716-446655440008',
    name: 'Kubernetes',
    provider: 'kubernetes',
    category: 'Infrastructure',
    description: 'Container orchestration integration. Syncs pod status and enables auto-remediation.',
    status: 'connected' as const,
    stats: [
      { value: '6', label: 'Clusters' },
      { value: '1,247', label: 'Pods' },
      { value: '89', label: 'Services' },
    ],
    lastSync: '15 sec ago',
    health: 5,
  },
  {
    id: '550e8400-e29b-41d4-a716-446655440009',
    name: 'PostgreSQL',
    provider: 'postgresql',
    category: 'Database',
    description: 'Primary database for CMDB and incident data. Stores all operational records.',
    status: 'connected' as const,
    stats: [
      { value: '2', label: 'Clusters' },
      { value: '45GB', label: 'Data Size' },
      { value: '99.9%', label: 'Uptime' },
    ],
    lastSync: '5 sec ago',
    health: 5,
  },
];

const availableIntegrations = [
  {
    id: 'jira',
    name: 'Jira',
    provider: 'jira',
    category: 'Ticketing',
    description: 'Sync incidents with Jira issues. Bidirectional updates between LinkedEye and Jira.',
    status: 'available' as const,
  },
  {
    id: 'github',
    name: 'GitHub',
    provider: 'github',
    category: 'Source Control',
    description: 'Link deployments to changes. Track commits and PRs associated with incidents.',
    status: 'available' as const,
  },
  {
    id: 'servicenow',
    name: 'ServiceNow',
    provider: 'servicenow',
    category: 'ITSM',
    description: 'Bidirectional CMDB sync. Import assets and CIs from ServiceNow instance.',
    status: 'available' as const,
  },
];

const categories = ['All', 'Monitoring', 'Alerting', 'Automation', 'Authentication', 'Ticketing', 'Communication', 'Data'];

const IntegrationsPage = () => {
  const { theme } = useAppSelector((state) => state.ui);
  const isDark = theme === 'dark';
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('All');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [newIntegration, setNewIntegration] = useState<CreateIntegrationData>({
    name: '',
    integration_type: 'monitoring',
    provider: '',
    configuration: {},
    webhook_url: '',
  });

  const fetchIntegrations = async () => {
    try {
      setIsLoading(true);
      const data = await integrationService.getIntegrations();
      setIntegrations(data);
    } catch (error) {
      console.error('Failed to fetch integrations:', error);
      // Use mock data on error
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchIntegrations();
  }, []);

  const handleCreateIntegration = async () => {
    if (!newIntegration.name) {
      toast.error('Please enter an integration name');
      return;
    }

    try {
      setIsSaving(true);
      await integrationService.createIntegration(newIntegration);
      toast.success('Integration created successfully');
      setIsCreateModalOpen(false);
      resetForm();
      fetchIntegrations();
    } catch (error) {
      console.error('Failed to create integration:', error);
      toast.error('Failed to create integration');
    } finally {
      setIsSaving(false);
    }
  };

  const resetForm = () => {
    setNewIntegration({
      name: '',
      integration_type: 'monitoring',
      provider: '',
      configuration: {},
      webhook_url: '',
    });
  };

  const handleConnect = (provider: string) => {
    setNewIntegration({
      ...newIntegration,
      provider: provider,
      name: availableIntegrations.find(i => i.provider === provider)?.name || '',
    });
    setIsCreateModalOpen(true);
  };

  // Use real integrations only - with defensive null checks
  const displayIntegrations = (integrations || []).map(int => {
    if (!int) return null;
    return {
      id: int.id || '',
      name: int.name || 'Unknown',
      provider: int.provider || '',
      category: int.integration_type || 'unknown',
      description: `${int.name || 'Unknown'} integration`,
      status: (int.status?.toLowerCase() === 'active' ? 'connected' : int.status?.toLowerCase() === 'error' ? 'error' : 'pending') as 'connected' | 'error' | 'pending',
      stats: [],
      lastSync: int.last_sync_at ? formatDistanceToNow(new Date(int.last_sync_at), { addSuffix: true }) : 'Never',
      health: int.status?.toLowerCase() === 'active' ? 5 : int.status?.toLowerCase() === 'error' ? 2 : 3,
    };
  }).filter(Boolean);

  // Filter integrations
  const filteredIntegrations = displayIntegrations.filter(int => {
    const matchesSearch = int.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          int.category.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = activeCategory === 'All' || int.category === activeCategory;
    return matchesSearch && matchesCategory;
  });

  // Stats
  const totalIntegrations = displayIntegrations.length;
  const activeIntegrations = displayIntegrations.filter(i => i.status === 'connected').length;
  const errorIntegrations = displayIntegrations.filter(i => i.status === 'error').length;
  const pendingIntegrations = displayIntegrations.filter(i => i.status === 'pending').length;

  return (
    <div className="space-y-6 min-h-screen -m-6 p-6" style={{ background: isDark ? 'linear-gradient(180deg, #030712 0%, #0a0f1a 100%)' : '#f9fafb' }}>
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>Integrations</h1>
          <p className={`mt-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Connect and manage third-party tools and services</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="px-4 py-2.5 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl text-sm font-medium flex items-center gap-2 hover:shadow-lg hover:shadow-blue-500/30 transition-all"
          >
            <Plus size={16} />
            Add Integration
          </button>
        </div>
      </div>

      {/* Category Tabs */}
      <div className="flex flex-wrap gap-2">
        {categories.map(category => (
          <CategoryTab
            key={category}
            label={category}
            isActive={activeCategory === category}
            onClick={() => setActiveCategory(category)}
          />
        ))}
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-4 gap-4">
        <StatCard
          icon={Plug}
          iconBg="bg-blue-100"
          iconColor="text-blue-600"
          value={totalIntegrations}
          label="Total Integrations"
        />
        <StatCard
          icon={CheckCircle}
          iconBg="bg-green-100"
          iconColor="text-green-600"
          value={activeIntegrations}
          label="Active Connections"
        />
        <StatCard
          icon={XCircle}
          iconBg="bg-red-100"
          iconColor="text-red-600"
          value={errorIntegrations}
          label="Needs Attention"
        />
        <StatCard
          icon={Clock}
          iconBg="bg-amber-100"
          iconColor="text-amber-600"
          value={pendingIntegrations}
          label="Pending Setup"
        />
      </div>

      {/* Connected Integrations */}
      <div>
        <h3 className={`text-lg font-semibold mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>Connected Integrations</h3>
        {isLoading ? (
          <div className="flex justify-center items-center py-12">
            <div className="w-10 h-10 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filteredIntegrations.length === 0 ? (
          <div className="text-center py-12 rounded-xl" style={{ background: isDark ? 'rgba(255,255,255,0.05)' : '#ffffff', border: isDark ? '1px solid rgba(255,255,255,0.1)' : '1px solid #e5e8eb' }}>
            <Plug size={48} className="mx-auto text-gray-600 mb-4" />
            <p className="text-gray-400">No integrations found</p>
            <p className="text-sm text-gray-500 mt-1">Add your first integration to get started</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredIntegrations.map(integration => (
              <IntegrationCard key={integration.id} integration={integration} />
            ))}
          </div>
        )}
      </div>

      <div>
        <h3 className={`text-lg font-semibold mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>Available Integrations</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {availableIntegrations.map(integration => (
            <IntegrationCard
              key={integration.id}
              integration={integration}
              isAvailable
              onConnect={handleConnect}
            />
          ))}
        </div>
      </div>

      {/* Create Integration Modal */}
      <Modal isOpen={isCreateModalOpen} onClose={() => { setIsCreateModalOpen(false); resetForm(); }} title="Add New Integration" size="lg">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1.5">Integration Name</label>
            <input
              type="text"
              className="w-full px-4 py-2.5 rounded-xl text-sm text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)' }}
              placeholder="e.g., Prometheus Monitoring"
              value={newIntegration.name}
              onChange={(e) => setNewIntegration({ ...newIntegration, name: e.target.value })}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1.5">Integration Type</label>
              <select
                className="w-full px-4 py-2.5 rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)' }}
                value={newIntegration.integration_type}
                onChange={(e) => setNewIntegration({ ...newIntegration, integration_type: e.target.value as IntegrationType })}
              >
                <option value="monitoring" className="bg-gray-800 text-white">Monitoring</option>
                <option value="ticketing" className="bg-gray-800 text-white">Ticketing</option>
                <option value="notification" className="bg-gray-800 text-white">Notification</option>
                <option value="cloud" className="bg-gray-800 text-white">Cloud</option>
                <option value="api" className="bg-gray-800 text-white">API</option>
                <option value="webhook" className="bg-gray-800 text-white">Webhook</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1.5">Provider</label>
              <select
                className="w-full px-4 py-2.5 rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)' }}
                value={newIntegration.provider || ''}
                onChange={(e) => {
                   const provider = e.target.value;
                   let url = '';
                   // Auto-populate internal cluster URLs
                   if (provider === 'prometheus') url = 'http://prometheus-svc.fs-linkedeye.svc.cluster.local:9090';
                   if (provider === 'grafana') url = 'http://grafana-svc.fs-linkedeye.svc.cluster.local:3000';
                   if (provider === 'kubernetes') url = 'https://kubernetes.default.svc.cluster.local';
                   if (provider === 'loki') url = 'http://loki-svc.fs-linkedeye.svc.cluster.local:3100';

                   setNewIntegration({
                     ...newIntegration,
                     provider,
                     configuration: { ...newIntegration.configuration, url }
                   });
                }}
              >
                <option value="" className="bg-gray-800 text-white">Select Provider</option>
                <option value="prometheus" className="bg-gray-800 text-white">Prometheus</option>
                <option value="grafana" className="bg-gray-800 text-white">Grafana</option>
                <option value="kubernetes" className="bg-gray-800 text-white">Kubernetes</option>
                <option value="gitlab" className="bg-gray-800 text-white">GitLab</option>
                <option value="slack" className="bg-gray-800 text-white">Slack</option>
                <option value="pagerduty" className="bg-gray-800 text-white">PagerDuty</option>
                <option value="loki" className="bg-gray-800 text-white">Loki</option>
                <option value="custom" className="bg-gray-800 text-white">Custom</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1.5">Endpoint URL</label>
            <input
              type="text"
              className="w-full px-4 py-2.5 rounded-xl text-sm text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)' }}
              placeholder="https://monitoring.example.com"
              value={(newIntegration.configuration as Record<string, string>)?.url || ''}
              onChange={(e) => setNewIntegration({
                ...newIntegration,
                configuration: { ...(newIntegration.configuration || {}), url: e.target.value }
              })}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1.5">API Key (optional)</label>
            <input
              type="password"
              className="w-full px-4 py-2.5 rounded-xl text-sm text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)' }}
              placeholder="Enter API key"
              value={newIntegration.api_key || ''}
              onChange={(e) => setNewIntegration({ ...newIntegration, api_key: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1.5">Webhook URL (optional)</label>
            <input
              type="text"
              className="w-full px-4 py-2.5 rounded-xl text-sm text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)' }}
              placeholder="https://webhook.example.com/receive"
              value={newIntegration.webhook_url || ''}
              onChange={(e) => setNewIntegration({ ...newIntegration, webhook_url: e.target.value })}
            />
          </div>
          <div className="flex justify-end gap-3 pt-4" style={{ borderTop: '1px solid rgba(255,255,255,0.1)' }}>
            <button
              onClick={() => { setIsCreateModalOpen(false); resetForm(); }}
              className="px-4 py-2.5 rounded-xl text-sm font-medium text-gray-300 transition-all"
              style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.1)' }}
            >
              Cancel
            </button>
            <button
              onClick={handleCreateIntegration}
              disabled={isSaving}
              className="px-4 py-2.5 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl text-sm font-medium flex items-center gap-2 hover:shadow-lg hover:shadow-blue-500/30 transition-all disabled:opacity-50"
            >
              {isSaving && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
              Create Integration
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default IntegrationsPage;
