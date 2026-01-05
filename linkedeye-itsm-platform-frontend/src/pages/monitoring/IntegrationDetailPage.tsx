import { useState, useEffect } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Trash2, RefreshCw, CheckCircle, Settings, Activity, AlertCircle, XCircle } from 'lucide-react';
import { Card, CardHeader, CardBody, Button, Badge, StatusBadge, Input, Tabs, TabList, Tab, TabPanel, Modal, Spinner } from '@/components/ui';
import { integrationService } from '@/services/integrationService';
import { Integration, MonitoringAlert } from '@/types';
import toast from 'react-hot-toast';
import { formatDistanceToNow } from 'date-fns';

const IntegrationDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [integration, setIntegration] = useState<Integration | null>(null);
  const [alerts, setAlerts] = useState<MonitoringAlert[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);
  const [editingConfig, setEditingConfig] = useState<Partial<Integration['config']>>({});
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const fetchIntegration = async () => {
      if (!id) return;
      try {
        setIsLoading(true);
        const data = await integrationService.getIntegrationById(id);
        setIntegration(data);
        // Fetch alerts for this integration
        const alertsData = await integrationService.getAlerts({ integrationId: id, limit: 10 });
        setAlerts(alertsData);
      } catch (error) {
        console.error('Failed to fetch integration:', error);
        toast.error('Failed to load integration details');
        navigate('/integrations');
      } finally {
        setIsLoading(false);
      }
    };

    fetchIntegration();
  }, [id, navigate]);

  const handleSync = async () => {
    if (!id) return;
    try {
      setIsSyncing(true);
      await integrationService.syncIntegration(id);
      toast.success('Integration synced successfully');
      // Refresh data
      const data = await integrationService.getIntegrationById(id);
      setIntegration(data);
    } catch (error) {
      console.error('Failed to sync integration:', error);
      toast.error('Failed to sync integration');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleConfigure = () => {
    if (integration) {
      setEditingConfig(integration.config || {});
      setIsConfigModalOpen(true);
    }
  };

  const handleSaveConfig = async () => {
    if (!id) return;
    try {
      setIsSaving(true);
      const updated = await integrationService.updateIntegration(id, { config: editingConfig });
      setIntegration(updated);
      setIsConfigModalOpen(false);
      toast.success('Configuration updated successfully');
    } catch (error) {
      console.error('Failed to update configuration:', error);
      toast.error('Failed to update configuration');
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
    } catch (error) {
      console.error('Failed to disconnect integration:', error);
      toast.error('Failed to disconnect integration');
    }
  };

  const handleToggle = async () => {
    if (!id || !integration) return;
    try {
      const updated = await integrationService.toggleIntegration(id, !integration.enabled);
      setIntegration(updated);
      toast.success(updated.enabled ? 'Integration enabled' : 'Integration disabled');
    } catch (error) {
      console.error('Failed to toggle integration:', error);
      toast.error('Failed to toggle integration');
    }
  };

  const getIntegrationIcon = (type?: string): string => {
    const iconMap: Record<string, string> = {
      prometheus: '🔥',
      grafana: '📊',
      kubernetes: '☸️',
      gitlab: '🦊',
      jenkins: '🔧',
      slack: '💬',
      email: '📧',
    };
    return iconMap[type?.toLowerCase() || ''] || '🔌';
  };

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
        <p className="text-gray-500">Integration not found</p>
        <Link to="/integrations" className="text-primary-600 mt-2 inline-block">Back to Integrations</Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link to="/integrations" className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <ArrowLeft size={20} />
          </Link>
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center">
              <span className="text-2xl">{getIntegrationIcon(integration.type)}</span>
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-xl font-bold text-gray-900">{integration.name}</h1>
                <Badge variant={integration.enabled ? 'success' : 'default'}>
                  {integration.enabled ? 'Active' : 'Disabled'}
                </Badge>
              </div>
              <p className="text-gray-500">{integration.description || integration.type}</p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" leftIcon={<RefreshCw size={16} />} onClick={handleSync} isLoading={isSyncing}>
            Sync Now
          </Button>
          <Button variant="outline" leftIcon={<Settings size={16} />} onClick={handleConfigure}>
            Configure
          </Button>
          <Button variant="danger" leftIcon={<Trash2 size={16} />} onClick={handleDisconnect}>
            Disconnect
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card padding="none">
            <Tabs defaultValue="overview">
              <TabList className="px-5">
                <Tab value="overview">Overview</Tab>
                <Tab value="alerts">Alerts ({alerts.length})</Tab>
                <Tab value="metrics">Metrics</Tab>
                <Tab value="logs">Logs</Tab>
              </TabList>

              <TabPanel value="overview" className="px-5 pb-5">
                <div className="grid grid-cols-3 gap-4 mb-6">
                  <div className="p-4 bg-gray-50 rounded-lg text-center">
                    <p className="text-2xl font-bold text-gray-900">{integration.stats?.targetsCount || 0}</p>
                    <p className="text-sm text-gray-500">Active Targets</p>
                  </div>
                  <div className="p-4 bg-gray-50 rounded-lg text-center">
                    <p className="text-2xl font-bold text-green-600">{integration.stats?.uptime || '99.9'}%</p>
                    <p className="text-sm text-gray-500">Uptime</p>
                  </div>
                  <div className="p-4 bg-gray-50 rounded-lg text-center">
                    <p className="text-2xl font-bold text-gray-900">{integration.stats?.requestsPerSec || 0}</p>
                    <p className="text-sm text-gray-500">Requests/sec</p>
                  </div>
                </div>
                <div className="h-48 bg-gray-100 rounded-lg flex items-center justify-center">
                  <Activity size={48} className="text-gray-400" />
                </div>
              </TabPanel>

              <TabPanel value="alerts" className="px-5 pb-5">
                <div className="space-y-3">
                  {alerts.length === 0 ? (
                    <p className="text-gray-500 text-center py-8">No alerts found</p>
                  ) : (
                    alerts.map((alert) => (
                      <div key={alert.id} className="p-4 border border-gray-200 rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <AlertCircle size={16} className={alert.status === 'firing' ? 'text-red-500' : 'text-gray-400'} />
                            <span className="font-medium">{alert.name}</span>
                          </div>
                          <StatusBadge status={alert.status} />
                        </div>
                        <p className="text-sm text-gray-500">{alert.message}</p>
                      </div>
                    ))
                  )}
                </div>
              </TabPanel>

              <TabPanel value="metrics" className="px-5 pb-5">
                <p className="text-gray-500">Metrics query interface and explorer</p>
              </TabPanel>

              <TabPanel value="logs" className="px-5 pb-5">
                <p className="text-gray-500">Integration activity logs</p>
              </TabPanel>
            </Tabs>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>Connection Details</CardHeader>
            <CardBody className="space-y-4">
              <div>
                <label className="text-xs text-gray-500">Endpoint URL</label>
                <p className="font-mono text-sm break-all">{integration.config?.url || 'Not configured'}</p>
              </div>
              <div>
                <label className="text-xs text-gray-500">Last Sync</label>
                <p className="text-sm">
                  {integration.lastSyncAt
                    ? formatDistanceToNow(new Date(integration.lastSyncAt), { addSuffix: true })
                    : 'Never'}
                </p>
              </div>
              <div>
                <label className="text-xs text-gray-500">Sync Frequency</label>
                <p className="text-sm">{integration.config?.syncInterval || 'Not configured'}</p>
              </div>
              <div>
                <label className="text-xs text-gray-500">Status</label>
                <div className="flex items-center gap-2 mt-1">
                  {integration.status === 'connected' ? (
                    <>
                      <CheckCircle size={16} className="text-green-500" />
                      <span className="text-sm text-green-600">Connected</span>
                    </>
                  ) : (
                    <>
                      <XCircle size={16} className="text-red-500" />
                      <span className="text-sm text-red-600">{integration.status}</span>
                    </>
                  )}
                </div>
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardHeader>Auto-Incident Creation</CardHeader>
            <CardBody>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={integration.config?.autoCreateIncidents || false}
                  onChange={handleToggle}
                  className="w-4 h-4 text-primary-600 rounded"
                />
                <span className="text-sm">Create incidents from alerts</span>
              </label>
              <p className="text-xs text-gray-500 mt-2">
                Automatically create incidents when alerts fire
              </p>
            </CardBody>
          </Card>
        </div>
      </div>

      {/* Configure Modal */}
      <Modal isOpen={isConfigModalOpen} onClose={() => setIsConfigModalOpen(false)} title="Configure Integration" size="md">
        <div className="space-y-4">
          <Input
            label="Endpoint URL"
            value={editingConfig.url || ''}
            onChange={(e) => setEditingConfig({ ...editingConfig, url: e.target.value })}
            placeholder="https://prometheus.example.com"
          />
          <Input
            label="API Key (optional)"
            type="password"
            value={editingConfig.apiKey || ''}
            onChange={(e) => setEditingConfig({ ...editingConfig, apiKey: e.target.value })}
            placeholder="Enter API key"
          />
          <Input
            label="Sync Interval"
            value={editingConfig.syncInterval || ''}
            onChange={(e) => setEditingConfig({ ...editingConfig, syncInterval: e.target.value })}
            placeholder="e.g., Every 30 seconds"
          />
          <div className="flex justify-end gap-3 pt-4">
            <Button variant="outline" onClick={() => setIsConfigModalOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveConfig} isLoading={isSaving}>Save Configuration</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default IntegrationDetailPage;
