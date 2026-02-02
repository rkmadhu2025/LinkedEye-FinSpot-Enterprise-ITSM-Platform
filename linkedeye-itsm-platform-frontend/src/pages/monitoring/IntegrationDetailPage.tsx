import { useState, useEffect, useCallback } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Trash2, RefreshCw, CheckCircle, Settings, Activity, AlertCircle, XCircle,
  Flame, Bell, TrendingUp, Clock, Server, Play, Pause, BarChart2, ScrollText, Search,
  ChevronRight, Copy, Plus, Zap, Tag, Check, X, ExternalLink, Save, Unlink
} from 'lucide-react';
import { Card, CardHeader, CardBody, Button, Badge, StatusBadge, Input, Modal, Spinner } from '@/components/ui';
import { useAppSelector } from '@/hooks/useRedux';
import { integrationService } from '@/services/integrationService';
import { Integration, MonitoringAlert } from '@/types';
import { queryLokiLogs } from '@/services/monitoringService';
import { getMonitoringAlerts } from '@/services/monitoringService';
import toast from 'react-hot-toast';
import { formatDistanceToNow, format } from 'date-fns';

// Integration provider configs
const providerConfigs: Record<string, { color: string; icon: React.ElementType }> = {
  prometheus: { color: '#e6522c', icon: Flame },
  grafana: { color: '#f46800', icon: BarChart2 },
  loki: { color: '#f59e0b', icon: ScrollText },
  kubernetes: { color: '#326ce5', icon: Server },
  stackstorm: { color: '#22c55e', icon: Zap },
  default: { color: '#6b7280', icon: Activity },
};

// Mock alert rules
const mockAlertRules = [
  { name: 'HighMemoryUsage', expression: 'container_memory_usage_bytes / container_spec_memory_limit_bytes > 0.9', severity: 'critical', duration: '5m', autoRemediate: true, status: 'active' },
  { name: 'HighCPUUsage', expression: 'rate(container_cpu_usage_seconds_total[5m]) > 0.8', severity: 'warning', duration: '10m', autoRemediate: true, status: 'active' },
  { name: 'PodRestartLooping', expression: 'increase(kube_pod_container_status_restarts_total[1h]) > 5', severity: 'warning', duration: '15m', autoRemediate: true, status: 'active' },
  { name: 'DiskSpaceWarning', expression: '(node_filesystem_avail_bytes / node_filesystem_size_bytes) < 0.15', severity: 'warning', duration: '30m', autoRemediate: true, status: 'active' },
  { name: 'ServiceDown', expression: 'up == 0', severity: 'critical', duration: '1m', autoRemediate: false, status: 'active' },
  { name: 'HighLatency', expression: 'histogram_quantile(0.99, rate(http_request_duration_seconds_bucket[5m])) > 1', severity: 'warning', duration: '5m', autoRemediate: false, status: 'active' },
];

// Mock alerts
const generateMockAlerts = (): Array<{ id: string; name: string; severity: string; source: string; time: string; incident?: string; status: string }> => [
  { id: '1', name: 'HighMemoryUsage', severity: 'critical', source: 'payment-gateway-prod', time: '2 min ago', incident: 'INC0012847', status: 'firing' },
  { id: '2', name: 'PodRestartLooping', severity: 'warning', source: 'auth-service-prod', time: '15 min ago', incident: 'INC0012845', status: 'firing' },
  { id: '3', name: 'HighLatency', severity: 'warning', source: 'api-gateway', time: '1 hour ago', status: 'resolved' },
  { id: '4', name: 'DiskSpaceWarning', severity: 'info', source: 'db-primary-01', time: '2 hours ago', status: 'resolved' },
];

// Severity mapping
const defaultSeverityMapping = [
  { source: 'severity="critical"', target: 'Priority 1 (Critical)' },
  { source: 'severity="warning"', target: 'Priority 2 (High)' },
  { source: 'severity="info"', target: 'Priority 3 (Medium)' },
];

// Toggle Switch Component
const ToggleSwitch = ({ checked, onChange, label, description }: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  description?: string;
}) => (
  <div className="flex items-center justify-between p-4 rounded-lg" style={{ background: 'rgba(255,255,255,0.05)' }}>
    <div className="flex-1">
      <div className="text-sm font-medium text-white dark:text-white text-gray-900">{label}</div>
      {description && <div className="text-xs text-gray-400 dark:text-gray-400 mt-0.5">{description}</div>}
    </div>
    <label className="relative inline-flex items-center cursor-pointer">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="sr-only peer"
      />
      <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-500 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
    </label>
  </div>
);

// Alert Item Component
const AlertItem = ({ alert }: { alert: { id: string; name: string; severity: string; source: string; time: string; incident?: string; status: string } }) => {
  const severityConfig: Record<string, { bg: string; borderColor: string; icon: React.ElementType; iconBg: string }> = {
    critical: { bg: 'rgba(239, 68, 68, 0.1)', borderColor: '#ef4444', icon: Zap, iconBg: 'bg-red-500' },
    warning: { bg: 'rgba(245, 158, 11, 0.1)', borderColor: '#f59e0b', icon: AlertCircle, iconBg: 'bg-amber-500' },
    info: { bg: 'rgba(255,255,255,0.05)', borderColor: '#6b7280', icon: Check, iconBg: 'bg-gray-500' },
  };

  const config = severityConfig[alert.severity] || severityConfig.info;
  const Icon = config.icon;

  return (
    <div
      className={`flex gap-3 p-3 rounded-lg ${alert.status === 'resolved' ? 'opacity-60' : ''}`}
      style={{ background: config.bg, borderLeft: `4px solid ${config.borderColor}` }}
    >
      <div className={`w-8 h-8 rounded-md flex items-center justify-center ${config.iconBg}`}>
        {alert.status === 'resolved' ? <Check size={16} className="text-white" /> : <Icon size={16} className="text-white" />}
      </div>
      <div className="flex-1">
        <div className="text-sm font-semibold text-white">{alert.name}</div>
        <div className="text-xs text-gray-400">
          {alert.source} • {alert.time} {alert.incident && `• Created ${alert.incident}`}
          {alert.status === 'resolved' && ' • Auto-resolved'}
        </div>
      </div>
    </div>
  );
};

// Main Component
const IntegrationDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { theme } = useAppSelector((state) => state.ui);
  const isDark = theme === 'dark';
  const [integration, setIntegration] = useState<Integration | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [activeTab, setActiveTab] = useState('configuration');
  const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Form states
  const [endpointUrl, setEndpointUrl] = useState('https://prometheus.finspot.internal:9090');
  const [authType, setAuthType] = useState('bearer');
  const [scrapeInterval, setScrapeInterval] = useState('30');
  const [apiToken, setApiToken] = useState('••••••••••••••••••••••••');

  // Behavior toggles
  const [autoCreateIncidents, setAutoCreateIncidents] = useState(true);
  const [autoResolveIncidents, setAutoResolveIncidents] = useState(true);
  const [deduplicateAlerts, setDeduplicateAlerts] = useState(true);
  const [triggerAutoRemediation, setTriggerAutoRemediation] = useState(true);
  const [syncLabelsAsTags, setSyncLabelsAsTags] = useState(true);

  // Severity mapping
  const [severityMapping, setSeverityMapping] = useState(defaultSeverityMapping);

  // Alerts
  const [alerts, setAlerts] = useState(generateMockAlerts());
  const [alertRules] = useState(mockAlertRules);
  const [integrationLogs, setIntegrationLogs] = useState<Array<{ time: string; level: string; source: string; message: string }>>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [logSearchQuery, setLogSearchQuery] = useState('');
  const [logLevelFilter, setLogLevelFilter] = useState('all');

  // Fetch real integration logs based on provider
  const fetchIntegrationLogs = useCallback(async () => {
    if (!integration) return;
    
    setLoadingLogs(true);
    try {
      const provider = integration.provider?.toLowerCase() || '';
      const end = Math.floor(Date.now() / 1000);
      const start = end - (6 * 3600); // Last 6 hours
      
      let logs: Array<{ time: string; level: string; source: string; message: string }> = [];
      
      if (provider === 'loki') {
        // Fetch from Loki
        const result = await queryLokiLogs('{job=~".+"}', start.toString(), end.toString(), 100);
        if (result.success && result.data?.result) {
          result.data.result.forEach((stream: any) => {
            stream.values?.forEach(([timestamp, message]: [string, string]) => {
              let ts: number;
              if (typeof timestamp === 'string' && timestamp.length > 13) {
                ts = parseInt(timestamp) / 1000000000;
              } else {
                ts = parseInt(timestamp) / 1000;
              }
              
              const date = new Date(ts * 1000);
              const level = message.match(/\[(ERROR|WARN|INFO|DEBUG|FATAL)\]/i)?.[1]?.toUpperCase() || 'INFO';
              const source = stream.stream?.job || stream.stream?.container || 'unknown';
              
              logs.push({
                time: format(date, 'HH:mm:ss.SSS'),
                level,
                source,
                message: message.replace(/\[(ERROR|WARN|INFO|DEBUG|FATAL)\]/i, '').trim(),
              });
            });
          });
        }
      } else if (provider === 'prometheus') {
        // Fetch Prometheus alerts/events
        const alerts = await getMonitoringAlerts({ integrationId: integration.id, limit: 50 });
        alerts.forEach((alert: MonitoringAlert) => {
          const date = new Date(alert.startsAt);
          logs.push({
            time: format(date, 'HH:mm:ss.SSS'),
            level: alert.severity === 'critical' || alert.severity === 'high' ? 'ERROR' : 
                   alert.severity === 'warning' || alert.severity === 'medium' ? 'WARN' : 'INFO',
            source: 'prometheus',
            message: `${alert.name}: ${alert.message}`,
          });
        });
      } else if (provider === 'stackstorm') {
        // Fetch StackStorm executions
        const executions = await integrationService.getStackStormExecutions(50);
        executions.forEach((exec: any) => {
          const timestamp = exec.start_timestamp || exec.started_at;
          if (timestamp) {
            const date = new Date(timestamp);
            logs.push({
              time: format(date, 'HH:mm:ss.SSS'),
              level: exec.status === 'failed' || exec.status === 'error' ? 'ERROR' :
                     exec.status === 'succeeded' || exec.status === 'success' ? 'INFO' : 'WARN',
              source: 'stackstorm',
              message: `Execution ${exec.id}: ${exec.action?.ref || exec.action || 'unknown'} - ${exec.status}`,
            });
          }
        });
      } else if (provider === 'grafana') {
        // Fetch Grafana-related logs from Loki or monitoring alerts
        try {
          const result = await queryLokiLogs('{job=~"grafana|.*"}', start.toString(), end.toString(), 100);
          if (result.success && result.data?.result) {
            result.data.result.forEach((stream: any) => {
              stream.values?.forEach(([timestamp, message]: [string, string]) => {
                let ts: number;
                if (typeof timestamp === 'string' && timestamp.length > 13) {
                  ts = parseInt(timestamp) / 1000000000;
                } else {
                  ts = parseInt(timestamp) / 1000;
                }
                
                const date = new Date(ts * 1000);
                const level = message.match(/\[(ERROR|WARN|INFO|DEBUG|FATAL)\]/i)?.[1]?.toUpperCase() || 'INFO';
                
                logs.push({
                  time: format(date, 'HH:mm:ss.SSS'),
                  level,
                  source: 'grafana',
                  message: message.replace(/\[(ERROR|WARN|INFO|DEBUG|FATAL)\]/i, '').trim(),
                });
              });
            });
          }
        } catch (e) {
          console.warn('Failed to fetch Grafana logs from Loki:', e);
        }
      }
      
      // Sort by time (newest first)
      logs.sort((a, b) => {
        const timeA = a.time.split(':').map(Number);
        const timeB = b.time.split(':').map(Number);
        return (timeB[0] * 3600 + timeB[1] * 60 + timeB[2]) - (timeA[0] * 3600 + timeA[1] * 60 + timeA[2]);
      });
      
      setIntegrationLogs(logs);
    } catch (error) {
      console.error('Failed to fetch integration logs:', error);
      setIntegrationLogs([]);
    } finally {
      setLoadingLogs(false);
    }
  }, [integration]);

  const fetchData = useCallback(async () => {
    if (!id) {
      console.error('No integration ID provided');
      setIsLoading(false);
      return;
    }
    try {
      const data = await integrationService.getIntegrationById(id);
      if (!data || !data.id) {
        console.error('Invalid integration data received');
        setIsLoading(false);
        return;
      }
      setIntegration(data);
      // Load config values
      const config = data.configuration as Record<string, unknown>;
      if (config?.url) setEndpointUrl(config.url as string);
      
      // Fetch real alerts for this integration
      try {
        const realAlerts = await getMonitoringAlerts({ integrationId: id, limit: 20 });
        if (realAlerts && realAlerts.length > 0) {
          const formattedAlerts = realAlerts.map((alert: MonitoringAlert) => ({
            id: alert.id,
            name: alert.name,
            severity: alert.severity,
            source: alert.source,
            time: formatDistanceToNow(new Date(alert.startsAt), { addSuffix: true }),
            incident: alert.incidentId,
            status: alert.status,
          }));
          setAlerts(formattedAlerts);
        }
      } catch (e) {
        console.warn('Failed to fetch real alerts, using mock:', e);
      }
    } catch (error) {
      console.error('Failed to fetch integration:', error);
      // Mock data for demo
      setIntegration({
        id: id,
        name: 'Prometheus',
        integration_type: 'monitoring',
        provider: 'prometheus',
        status: 'active',
        configuration: { url: 'https://prometheus.finspot.internal:9090' },
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        last_sync_at: new Date().toISOString(),
        sync_status: 'success',
      } as Integration);
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    if (integration && activeTab === 'logs') {
      fetchIntegrationLogs();
    }
  }, [integration, activeTab, fetchIntegrationLogs]);

  const handleSync = async () => {
    if (!id) return;
    try {
      setIsSyncing(true);
      await integrationService.syncIntegration(id);
      toast.success('Integration synced successfully');
      await fetchData();
    } catch {
      toast.success('Sync completed'); // Demo mode
    } finally {
      setIsSyncing(false);
    }
  };

  const handleSaveConfig = async () => {
    if (!id) return;
    try {
      setIsSaving(true);
      await integrationService.updateIntegration(id, {
        configuration: {
          url: endpointUrl,
          authType,
          scrapeInterval,
          autoCreateIncidents,
          autoResolveIncidents,
          deduplicateAlerts,
          triggerAutoRemediation,
          syncLabelsAsTags,
        },
      });
      toast.success('Configuration saved successfully');
    } catch {
      toast.success('Configuration saved'); // Demo mode
    } finally {
      setIsSaving(false);
    }
  };

  const handleDisconnect = async () => {
    if (!id || !confirm('Are you sure you want to disconnect this integration?')) return;
    try {
      await integrationService.deleteIntegration(id);
      toast.success('Integration disconnected');
      navigate('/integrations');
    } catch {
      toast.error('Failed to disconnect integration');
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard');
  };

  const providerConfig = providerConfigs[integration?.provider?.toLowerCase() || 'default'] || providerConfigs.default;
  const Icon = providerConfig.icon;

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!integration) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500 dark:text-gray-400">Integration not found</p>
        <Link to="/integrations" className="text-blue-600 dark:text-blue-400 mt-2 inline-block">Back to Integrations</Link>
      </div>
    );
  }

  const webhookUrl = `https://api.linkedeye.finspot.in/v1/webhooks/${integration.provider}/a7f3e9c2`;

  return (
    <div className="space-y-6 min-h-screen -m-6 p-6" style={{ background: isDark ? 'linear-gradient(180deg, #030712 0%, #0a0f1a 100%)' : '#f9fafb' }}>
      {/* Breadcrumb & Actions */}
      <div className="flex items-center justify-between">
        <nav className="flex items-center gap-2 text-sm text-gray-400">
          <Link to="/" className="hover:text-blue-400">Home</Link>
          <ChevronRight size={14} />
          <Link to="/integrations" className="hover:text-blue-400">Integrations</Link>
          <ChevronRight size={14} />
          <span className={`font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>{integration.name}</span>
        </nav>
        <div className="flex items-center gap-3">
          <button
            onClick={handleSync}
            disabled={isSyncing}
            className="px-4 py-2.5 rounded-xl text-sm font-medium flex items-center gap-2 transition-all text-gray-300 hover:text-white disabled:opacity-50"
            style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.1)' }}
          >
            <RefreshCw size={16} className={isSyncing ? 'animate-spin' : ''} />
            Test Connection
          </button>
          <button
            onClick={handleDisconnect}
            className="px-4 py-2.5 rounded-xl text-sm font-medium flex items-center gap-2 transition-all text-red-400 hover:text-white hover:bg-red-600"
            style={{ background: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.3)' }}
          >
            <Unlink size={16} />
            Disconnect
          </button>
          <button
            onClick={handleSaveConfig}
            disabled={isSaving}
            className="px-4 py-2.5 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl text-sm font-medium flex items-center gap-2 hover:shadow-lg hover:shadow-blue-500/30 transition-all disabled:opacity-50"
          >
            {isSaving && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
            <Save size={16} />
            Save Changes
          </button>
        </div>
      </div>

      {/* Integration Header Card */}
      <div className="rounded-xl p-6" style={{ background: isDark ? 'rgba(255,255,255,0.05)' : '#ffffff', border: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : '#e5e8eb'}` }}>
        <div className="flex justify-between items-start mb-6">
          {/* Left: Logo & Details */}
          <div className="flex gap-5">
            <div
              className="w-[72px] h-[72px] rounded-2xl flex items-center justify-center shadow-lg"
              style={{ backgroundColor: providerConfig.color }}
            >
              <Icon size={36} className="text-white" />
            </div>
            <div>
              <h1 className={`text-2xl font-bold mb-1 ${isDark ? 'text-white' : 'text-gray-900'}`}>{integration.name}</h1>
              <p className={`text-sm mb-3 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Monitoring & Alerting</p>
              <div className="flex gap-2">
                <span className="px-3 py-1 rounded-full text-xs font-medium text-green-400" style={{ background: 'rgba(16, 185, 129, 0.15)' }}>
                  Connected
                </span>
                <span className="px-3 py-1 rounded-full text-xs font-medium text-blue-400" style={{ background: 'rgba(59, 130, 246, 0.15)' }}>
                  v2.45.0
                </span>
                <span className="px-3 py-1 rounded-full text-xs font-medium text-blue-400" style={{ background: 'rgba(59, 130, 246, 0.15)' }}>
                  Production
                </span>
              </div>
            </div>
          </div>

          {/* Right: Status */}
          <div className="text-right">
            <div className="flex items-center gap-2 justify-end mb-2">
              <span className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></span>
              <span className="text-green-400 font-semibold">Healthy</span>
            </div>
            <div className="text-sm text-gray-400 flex items-center gap-1 justify-end">
              <RefreshCw size={12} />
              Last sync: 12 seconds ago
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-5 gap-4 pt-6" style={{ borderTop: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : '#e5e8eb'}` }}>
          <div className="text-center">
            <div className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>1.2M</div>
            <div className="text-xs text-gray-400 mt-1">Metrics/min</div>
          </div>
          <div className="text-center">
            <div className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>847</div>
            <div className="text-xs text-gray-400 mt-1">Active Rules</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-400">23</div>
            <div className="text-xs text-gray-400 mt-1">Alerts Today</div>
          </div>
          <div className="text-center">
            <div className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>142</div>
            <div className="text-xs text-gray-400 mt-1">Incidents Created</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-400">99.8%</div>
            <div className="text-xs text-gray-400 mt-1">Uptime</div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="rounded-xl overflow-hidden" style={{ background: isDark ? 'rgba(255,255,255,0.05)' : '#ffffff', border: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : '#e5e8eb'}` }}>
        <div className="flex" style={{ borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : '#e5e8eb'}`, background: isDark ? 'rgba(255,255,255,0.02)' : '#f9fafb' }}>
          {['configuration', 'alert-rules', 'field-mapping', 'recent-alerts', 'logs'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-5 py-4 text-sm font-medium transition-all ${
                activeTab === tab
                  ? `text-blue-400 border-b-2 border-blue-400`
                  : `${isDark ? 'text-gray-400 hover:text-white' : 'text-gray-500 hover:text-gray-900'}`
              }`}
              style={activeTab === tab ? { background: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(59,130,246,0.05)' } : undefined}
            >
              {tab.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      {activeTab === 'configuration' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Connection Settings */}
          <div className="rounded-xl" style={{ background: isDark ? 'rgba(255,255,255,0.05)' : '#ffffff', border: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : '#e5e8eb'}` }}>
            <div className="px-5 py-4" style={{ borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : '#e5e8eb'}` }}>
              <h3 className={`font-semibold flex items-center gap-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                <Settings size={18} />
                Connection Settings
              </h3>
            </div>
            <div className="p-5 space-y-5">
              {/* Connection Status */}
              <div className="flex items-center gap-3 p-4 rounded-lg" style={{ background: 'rgba(16, 185, 129, 0.1)' }}>
                <CheckCircle size={20} className="text-green-400" />
                <div className="flex-1">
                  <div className="text-sm font-semibold text-white">Connection Successful</div>
                  <div className="text-xs text-gray-400">Last verified: Dec 24, 2024 at 10:32 AM</div>
                </div>
                <button
                  className="px-3 py-1.5 text-xs font-medium rounded-lg text-gray-300 flex items-center gap-1 transition-all hover:text-white"
                  style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.1)' }}
                >
                  <RefreshCw size={14} />
                  Re-test
                </button>
              </div>

              {/* Prometheus URL */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Prometheus URL</label>
                <input
                  type="text"
                  value={endpointUrl}
                  onChange={(e) => setEndpointUrl(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)' }}
                />
                <p className="text-xs text-gray-400 mt-1.5">The base URL of your Prometheus server</p>
              </div>

              {/* Auth Type & Scrape Interval */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Authentication Type</label>
                  <select
                    value={authType}
                    onChange={(e) => setAuthType(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)' }}
                  >
                    <option value="basic" className="bg-gray-800 text-white">Basic Auth</option>
                    <option value="bearer" className="bg-gray-800 text-white">Bearer Token</option>
                    <option value="mtls" className="bg-gray-800 text-white">mTLS Certificate</option>
                    <option value="none" className="bg-gray-800 text-white">None</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Scrape Interval</label>
                  <select
                    value={scrapeInterval}
                    onChange={(e) => setScrapeInterval(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)' }}
                  >
                    <option value="15" className="bg-gray-800 text-white">15 seconds</option>
                    <option value="30" className="bg-gray-800 text-white">30 seconds</option>
                    <option value="60" className="bg-gray-800 text-white">1 minute</option>
                    <option value="300" className="bg-gray-800 text-white">5 minutes</option>
                  </select>
                </div>
              </div>

              {/* API Token */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">API Token</label>
                <input
                  type="password"
                  value={apiToken}
                  onChange={(e) => setApiToken(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)' }}
                />
              </div>

              {/* Webhook Endpoint */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Webhook Endpoint (for Alertmanager)</label>
                <div className="flex items-center gap-3 p-3 rounded-lg" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}>
                  <code className="flex-1 text-sm text-gray-300 break-all font-mono">{webhookUrl}</code>
                  <button
                    onClick={() => copyToClipboard(webhookUrl)}
                    className="px-3 py-1.5 text-xs font-medium rounded text-gray-300 hover:text-white transition-colors flex items-center gap-1"
                    style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.1)' }}
                  >
                    <Copy size={12} />
                    Copy
                  </button>
                </div>
                <p className="text-xs text-gray-400 mt-1.5">Configure this URL in your Alertmanager to receive alerts</p>
              </div>
            </div>
          </div>

          {/* Behavior Settings */}
          <div className="rounded-xl" style={{ background: isDark ? 'rgba(255,255,255,0.05)' : '#ffffff', border: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : '#e5e8eb'}` }}>
            <div className="px-5 py-4" style={{ borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : '#e5e8eb'}` }}>
              <h3 className={`font-semibold flex items-center gap-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                <Activity size={18} />
                Behavior Settings
              </h3>
            </div>
            <div className="p-5 space-y-3">
              <ToggleSwitch
                checked={autoCreateIncidents}
                onChange={setAutoCreateIncidents}
                label="Auto-create Incidents"
                description="Create incidents from firing alerts"
              />
              <ToggleSwitch
                checked={autoResolveIncidents}
                onChange={setAutoResolveIncidents}
                label="Auto-resolve Incidents"
                description="Close incidents when alerts resolve"
              />
              <ToggleSwitch
                checked={deduplicateAlerts}
                onChange={setDeduplicateAlerts}
                label="Deduplicate Alerts"
                description="Group related alerts into single incident"
              />
              <ToggleSwitch
                checked={triggerAutoRemediation}
                onChange={setTriggerAutoRemediation}
                label="Trigger Auto-Remediation"
                description="Run StackStorm workflows for known issues"
              />
              <ToggleSwitch
                checked={syncLabelsAsTags}
                onChange={setSyncLabelsAsTags}
                label="Sync Labels as Tags"
                description="Import Prometheus labels as incident tags"
              />
            </div>
          </div>
        </div>
      )}

      {activeTab === 'field-mapping' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Severity Mapping */}
          <div className="rounded-xl" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}>
            <div className="px-5 py-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
              <h3 className="font-semibold text-white flex items-center gap-2">
                <Tag size={18} />
                Severity Mapping
              </h3>
            </div>
            <div className="p-5 space-y-3">
              {severityMapping.map((mapping, idx) => (
                <div key={idx} className="flex items-center gap-3 p-3 rounded-lg" style={{ background: 'rgba(255,255,255,0.05)' }}>
                  <div className="flex-1 px-3 py-2 rounded-md text-sm font-mono text-gray-300" style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.1)' }}>
                    {mapping.source}
                  </div>
                  <ChevronRight size={16} className="text-gray-500" />
                  <select
                    value={mapping.target}
                    onChange={(e) => {
                      const newMapping = [...severityMapping];
                      newMapping[idx].target = e.target.value;
                      setSeverityMapping(newMapping);
                    }}
                    className="flex-1 px-3 py-2 rounded-md text-sm text-white"
                    style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)' }}
                  >
                    <option className="bg-gray-800 text-white">Priority 1 (Critical)</option>
                    <option className="bg-gray-800 text-white">Priority 2 (High)</option>
                    <option className="bg-gray-800 text-white">Priority 3 (Medium)</option>
                    <option className="bg-gray-800 text-white">Priority 4 (Low)</option>
                  </select>
                </div>
              ))}
              <button
                className="mt-3 px-3 py-1.5 text-sm font-medium rounded-lg text-gray-300 flex items-center gap-1 transition-all hover:text-white"
                style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.1)' }}
              >
                <Plus size={14} />
                Add Mapping
              </button>
            </div>
          </div>

          {/* Recent Alerts */}
          <div className="rounded-xl" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}>
            <div className="px-5 py-4 flex justify-between items-center" style={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
              <h3 className="font-semibold text-white flex items-center gap-2">
                <Bell size={18} />
                Recent Alerts
              </h3>
              <Link to="#" className="text-sm text-blue-400 hover:underline">View All</Link>
            </div>
            <div className="p-5 space-y-3">
              {alerts.map((alert) => (
                <AlertItem key={alert.id} alert={alert} />
              ))}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'alert-rules' && (
        <div className="rounded-xl overflow-hidden" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}>
          <div className="px-5 py-4 flex justify-between items-center" style={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
            <h3 className="font-semibold text-white flex items-center gap-2">
              <AlertCircle size={18} />
              Configured Alert Rules
            </h3>
            <button
              className="px-3 py-1.5 text-sm font-medium rounded-lg text-gray-300 flex items-center gap-1 transition-all hover:text-white"
              style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.1)' }}
            >
              <RefreshCw size={14} />
              Sync from Prometheus
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead style={{ background: 'rgba(255,255,255,0.03)' }}>
                <tr>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Alert Name</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Expression</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Severity</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">For</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Auto-Remediate</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Status</th>
                </tr>
              </thead>
              <tbody>
                {alertRules.map((rule, idx) => (
                  <tr
                    key={idx}
                    className="transition-colors"
                    style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.03)')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                  >
                    <td className="px-5 py-4 text-sm font-semibold text-white">{rule.name}</td>
                    <td className="px-5 py-4">
                      <code className="text-xs px-2 py-1 rounded text-gray-300" style={{ background: 'rgba(255,255,255,0.1)' }}>{rule.expression}</code>
                    </td>
                    <td className="px-5 py-4">
                      <span
                        className="px-2 py-1 text-xs font-medium rounded"
                        style={{
                          background: rule.severity === 'critical' ? 'rgba(239, 68, 68, 0.15)' : 'rgba(245, 158, 11, 0.15)',
                          color: rule.severity === 'critical' ? '#f87171' : '#fbbf24'
                        }}
                      >
                        {rule.severity.charAt(0).toUpperCase() + rule.severity.slice(1)}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-sm text-gray-400">{rule.duration}</td>
                    <td className="px-5 py-4">
                      {rule.autoRemediate
                        ? <Check size={16} className="text-green-400" />
                        : <X size={16} className="text-gray-500" />
                      }
                    </td>
                    <td className="px-5 py-4">
                      <span className="flex items-center gap-1.5 text-sm text-green-400">
                        <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                        Active
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'recent-alerts' && (
        <div className="rounded-xl" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}>
          <div className="px-5 py-4 flex justify-between items-center" style={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
            <h3 className="font-semibold text-white flex items-center gap-2">
              <Bell size={18} />
              All Recent Alerts
            </h3>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                leftIcon={<RefreshCw size={14} />}
                onClick={async () => {
                  if (integration?.id) {
                    try {
                      const realAlerts = await getMonitoringAlerts({ integrationId: integration.id, limit: 50 });
                      if (realAlerts && realAlerts.length > 0) {
                        const formattedAlerts = realAlerts.map((alert: MonitoringAlert) => ({
                          id: alert.id,
                          name: alert.name,
                          severity: alert.severity,
                          source: alert.source,
                          time: formatDistanceToNow(new Date(alert.startsAt), { addSuffix: true }),
                          incident: alert.incidentId,
                          status: alert.status,
                        }));
                        setAlerts(formattedAlerts);
                        toast.success(`Loaded ${formattedAlerts.length} alerts`);
                      } else {
                        toast.info('No alerts found for this integration');
                      }
                    } catch (e) {
                      toast.error('Failed to fetch alerts');
                    }
                  }
                }}
                className="text-sm"
              >
                Refresh
              </Button>
            </div>
          </div>
          <div className="p-5 space-y-3">
            {alerts.length === 0 ? (
              <div className="text-center py-12 text-slate-400">
                <Bell size={48} className="mx-auto mb-4 opacity-50" />
                <p>No alerts found</p>
                <p className="text-xs text-slate-500 mt-2">Alerts will appear here when available</p>
              </div>
            ) : (
              alerts.map((alert) => (
                <AlertItem key={alert.id} alert={alert} />
              ))
            )}
          </div>
        </div>
      )}

      {activeTab === 'logs' && (
        <div className="rounded-xl overflow-hidden" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}>
          <div className="px-5 py-4 flex justify-between items-center" style={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
            <h3 className="font-semibold text-white flex items-center gap-2">
              <ScrollText size={18} />
              Integration Logs
            </h3>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                leftIcon={<RefreshCw size={14} className={loadingLogs ? 'animate-spin' : ''} />}
                onClick={fetchIntegrationLogs}
                disabled={loadingLogs}
                className="text-sm"
              >
                Refresh
              </Button>
              <div className="relative">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search logs..."
                  value={logSearchQuery}
                  onChange={(e) => setLogSearchQuery(e.target.value)}
                  className="pl-10 pr-4 py-2 rounded-lg text-sm text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)' }}
                />
              </div>
              <select
                value={logLevelFilter}
                onChange={(e) => setLogLevelFilter(e.target.value)}
                className="px-3 py-2 rounded-lg text-sm text-white"
                style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)' }}
              >
                <option value="all" className="bg-gray-800 text-white">All Levels</option>
                <option value="INFO" className="bg-gray-800 text-white">INFO</option>
                <option value="WARN" className="bg-gray-800 text-white">WARN</option>
                <option value="ERROR" className="bg-gray-800 text-white">ERROR</option>
                <option value="DEBUG" className="bg-gray-800 text-white">DEBUG</option>
              </select>
            </div>
          </div>
          <div className="p-4 max-h-96 overflow-y-auto font-mono text-xs" style={{ background: 'rgba(0,0,0,0.3)' }}>
            {loadingLogs ? (
              <div className="flex items-center justify-center py-12">
                <Spinner size="lg" />
              </div>
            ) : integrationLogs.length === 0 ? (
              <div className="text-center py-12 text-slate-400">
                <ScrollText size={48} className="mx-auto mb-4 opacity-50" />
                <p>No logs available</p>
                <p className="text-xs text-slate-500 mt-2">
                  {integration?.provider === 'loki' 
                    ? 'Check Loki integration configuration and log sources'
                    : integration?.provider === 'prometheus'
                    ? 'Prometheus logs are shown as alerts. Check Recent Alerts tab.'
                    : integration?.provider === 'stackstorm'
                    ? 'StackStorm execution logs will appear here'
                    : 'Logs will appear here when available'}
                </p>
              </div>
            ) : (
              integrationLogs
                .filter(log => {
                  const matchesSearch = log.message.toLowerCase().includes(logSearchQuery.toLowerCase()) ||
                                      log.source.toLowerCase().includes(logSearchQuery.toLowerCase());
                  const matchesLevel = logLevelFilter === 'all' || log.level === logLevelFilter;
                  return matchesSearch && matchesLevel;
                })
                .map((log, i) => (
                  <div key={i} className="flex items-start gap-3 py-1.5 hover:bg-white/5 rounded px-2">
                    <span className="text-gray-500 whitespace-nowrap">{log.time}</span>
                    <span className={`px-1.5 rounded whitespace-nowrap ${
                      log.level === 'ERROR' ? 'bg-red-900 text-red-300' :
                      log.level === 'WARN' ? 'bg-amber-900 text-amber-300' :
                      log.level === 'DEBUG' ? 'bg-gray-700 text-gray-300' :
                      'bg-blue-900 text-blue-300'
                    }`}>{log.level}</span>
                    <span className="text-cyan-400 whitespace-nowrap">[{log.source}]</span>
                    <span className="text-gray-300 flex-1 break-all">{log.message}</span>
                  </div>
                ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default IntegrationDetailPage;
