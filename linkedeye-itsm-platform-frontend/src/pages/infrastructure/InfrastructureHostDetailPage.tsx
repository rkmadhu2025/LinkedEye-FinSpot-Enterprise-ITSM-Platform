import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import {
  ArrowLeft, Edit, Server, Network, Shield, Router, Box, Database,
  Cpu, HardDrive, Clock, Settings, Save, X, Layers, Wifi, Activity,
  CheckCircle, XCircle, AlertTriangle, Globe, MapPin, RefreshCw,
  Thermometer, ArrowDownCircle, ArrowUpCircle, Gauge, MemoryStick
} from 'lucide-react';
import {
  Card,
  CardHeader,
  CardBody,
  Button,
  Badge,
  StatusBadge,
  Tabs,
  TabList,
  Tab,
  TabPanel,
  PageLoader,
  Modal,
  Input,
  Select,
  Textarea,
} from '@/components/ui';
import {
  infrastructureHostService,
  hostPortService,
  hostMetricsService,
  getStatusColor,
  getLayerColor,
  getLayerDisplayName,
  formatUptime,
  HostMetrics,
  PortMetricsData,
} from '@/services/infrastructureService';
import {
  InfrastructureHost,
  InfrastructureHostUpdate,
  HostPort,
  NetworkConnection,
  NetworkLayerType,
  DeviceVendor,
  ServerType,
} from '@/types';
import toast from 'react-hot-toast';

const InfrastructureHostDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [host, setHost] = useState<InfrastructureHost | null>(null);
  const [ports, setPorts] = useState<HostPort[]>([]);
  const [connections, setConnections] = useState<NetworkConnection[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editForm, setEditForm] = useState<InfrastructureHostUpdate>({});
  const [isSaving, setIsSaving] = useState(false);
  const [metrics, setMetrics] = useState<HostMetrics | null>(null);
  const [metricsLoading, setMetricsLoading] = useState(false);
  const [portMetrics, setPortMetrics] = useState<PortMetricsData[]>([]);

  const fetchMetrics = async () => {
    if (!id) return;
    setMetricsLoading(true);
    try {
      const metricsData = await hostMetricsService.getMetrics(id);
      setMetrics(metricsData);

      // Also fetch port metrics
      const portMetricsData = await hostMetricsService.getPortMetrics(id);
      setPortMetrics(portMetricsData.ports || []);
    } catch (error) {
      console.error('Failed to load metrics:', error);
    } finally {
      setMetricsLoading(false);
    }
  };

  useEffect(() => {
    const fetchHost = async () => {
      if (!id) return;
      setIsLoading(true);
      try {
        const hostData = await infrastructureHostService.getById(id);
        setHost(hostData);

        // Fetch ports
        try {
          const portsData = await hostPortService.list(id);
          setPorts(portsData);
        } catch (portsError) {
          console.error('Failed to load ports:', portsError);
        }

        // Fetch connections
        try {
          const connectionsData = await infrastructureHostService.getConnections(id, 'both');
          setConnections(connectionsData);
        } catch (connectionsError) {
          console.error('Failed to load connections:', connectionsError);
        }

        // Fetch Prometheus metrics
        fetchMetrics();
      } catch (error) {
        console.error('Failed to load host:', error);
        toast.error('Failed to load host details');
        navigate('/infrastructure/hosts');
      } finally {
        setIsLoading(false);
      }
    };

    if (id) {
      fetchHost();
    }
  }, [id, navigate]);

  const getDeviceIcon = (category: string) => {
    const normalized = (category || '').toLowerCase();
    const iconMap: Record<string, React.ReactNode> = {
      firewall: <Shield size={24} className="text-red-500" />,
      router: <Router size={24} className="text-orange-500" />,
      switch: <Network size={24} className="text-blue-500" />,
      server: <Server size={24} className="text-green-500" />,
      virtual_machine: <Box size={24} className="text-purple-500" />,
      storage: <Database size={24} className="text-yellow-500" />,
      access_point: <Wifi size={24} className="text-cyan-500" />,
    };
    return iconMap[normalized] || <Cpu size={24} className="text-gray-500" />;
  };

  const handleEdit = () => {
    if (host) {
      setEditForm({
        hostname: host.hostname,
        display_name: host.display_name || undefined,
        description: host.description || undefined,
        device_category: host.device_category,
        device_vendor: host.device_vendor || undefined,
        device_model: host.device_model || undefined,
        management_ip: host.management_ip || undefined,
        management_mac: host.management_mac || undefined,
        serial_number: host.serial_number || undefined,
        asset_tag: host.asset_tag || undefined,
        firmware_version: host.firmware_version || undefined,
        operating_system: host.operating_system || undefined,
        os_version: host.os_version || undefined,
        data_center: host.data_center || undefined,
        location: host.location || undefined,
        operational_status: host.operational_status || undefined,
        health_status: host.health_status || undefined,
      });
      setIsEditModalOpen(true);
    }
  };

  const handleSave = async () => {
    if (!id || !host) return;
    setIsSaving(true);
    try {
      const updated = await infrastructureHostService.update(id, editForm);
      setHost(updated);
      setIsEditModalOpen(false);
      toast.success('Host updated successfully');
    } catch (error) {
      console.error('Failed to update host:', error);
      toast.error('Failed to update host');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading || !host) {
    return <PageLoader message="Loading host details..." />;
  }

  const isPhysical = host.server_type === 'physical' || !host.hypervisor_id;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link to="/infrastructure/hosts" className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors">
            <ArrowLeft size={20} />
          </Link>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${getLayerColor(host.network_layer)}20` }}>
              {getDeviceIcon(host.device_category)}
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900 dark:text-white">{host.display_name || host.hostname}</h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {host.device_category} - {host.management_ip || 'No IP'}
                <span className="mx-2">|</span>
                <span style={{ color: getLayerColor(host.network_layer) }}>{getLayerDisplayName(host.network_layer)}</span>
              </p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant={isPhysical ? 'primary' : 'secondary'}>
            {isPhysical ? 'Physical' : 'Virtual'}
          </Badge>
          <StatusBadge status={host.operational_status || 'unknown'} />
          <Button
            variant="outline"
            leftIcon={<Edit size={16} />}
            onClick={handleEdit}
          >
            Edit
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="overview" value={activeTab} onChange={setActiveTab}>
        <TabList>
          <Tab value="overview">Overview</Tab>
          <Tab value="metrics">Metrics</Tab>
          <Tab value="ports">Ports ({portMetrics.length > 0 ? portMetrics.length : ports.length})</Tab>
          <Tab value="connections">Connections ({connections.length})</Tab>
          <Tab value="hardware">Hardware</Tab>
        </TabList>

        {/* Overview Tab */}
        <TabPanel value="overview">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              {/* Device Information */}
              <Card>
                <CardHeader>
                  <h2 className="text-lg font-semibold">Device Information</h2>
                </CardHeader>
                <CardBody className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Hostname</label>
                      <p className="mt-1 text-sm font-mono text-gray-900 dark:text-white">{host.hostname}</p>
                    </div>
                    <div>
                      <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Display Name</label>
                      <p className="mt-1 text-sm text-gray-900 dark:text-white">{host.display_name || '-'}</p>
                    </div>
                    <div>
                      <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Category</label>
                      <p className="mt-1 text-sm text-gray-900 dark:text-white capitalize">{host.device_category}</p>
                    </div>
                    <div>
                      <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Vendor</label>
                      <p className="mt-1 text-sm text-gray-900 dark:text-white">{host.device_vendor || '-'}</p>
                    </div>
                    <div>
                      <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Model</label>
                      <p className="mt-1 text-sm text-gray-900 dark:text-white">{host.device_model || '-'}</p>
                    </div>
                    <div>
                      <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Network Layer</label>
                      <p className="mt-1 text-sm font-medium" style={{ color: getLayerColor(host.network_layer) }}>
                        {getLayerDisplayName(host.network_layer)}
                      </p>
                    </div>
                  </div>
                  {host.description && (
                    <div className="pt-4 border-t dark:border-gray-700">
                      <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Description</label>
                      <p className="mt-1 text-sm text-gray-900 dark:text-white">{host.description}</p>
                    </div>
                  )}
                </CardBody>
              </Card>

              {/* Network Information */}
              <Card>
                <CardHeader>
                  <h2 className="text-lg font-semibold flex items-center gap-2">
                    <Globe size={18} className="text-blue-500" />
                    Network Information
                  </h2>
                </CardHeader>
                <CardBody>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Management IP</label>
                      <p className="mt-1 text-sm font-mono text-gray-900 dark:text-white">{host.management_ip || '-'}</p>
                    </div>
                    <div>
                      <label className="text-xs font-medium text-gray-500 dark:text-gray-400">MAC Address</label>
                      <p className="mt-1 text-sm font-mono text-gray-900 dark:text-white">{host.management_mac || '-'}</p>
                    </div>
                    <div>
                      <label className="text-xs font-medium text-gray-500 dark:text-gray-400">VLAN</label>
                      <p className="mt-1 text-sm text-gray-900 dark:text-white">{host.management_vlan || '-'}</p>
                    </div>
                    <div>
                      <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Total Ports</label>
                      <p className="mt-1 text-sm text-gray-900 dark:text-white">{host.total_ports || '-'}</p>
                    </div>
                  </div>
                </CardBody>
              </Card>

              {/* Virtualization Info (for VMs) */}
              {!isPhysical && (
                <Card>
                  <CardHeader>
                    <h2 className="text-lg font-semibold flex items-center gap-2">
                      <Box size={18} className="text-purple-500" />
                      Virtualization
                    </h2>
                  </CardHeader>
                  <CardBody>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Server Type</label>
                        <p className="mt-1 text-sm text-gray-900 dark:text-white capitalize">{host.server_type || 'Virtual'}</p>
                      </div>
                      <div>
                        <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Physical Host IP</label>
                        <p className="mt-1 text-sm font-mono text-gray-900 dark:text-white">{host.physical_host_ip || '-'}</p>
                      </div>
                      <div>
                        <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Hypervisor ID</label>
                        <p className="mt-1 text-sm font-mono text-gray-900 dark:text-white">{host.hypervisor_id || '-'}</p>
                      </div>
                    </div>
                  </CardBody>
                </Card>
              )}
            </div>

            {/* Right Column */}
            <div className="space-y-6">
              {/* Status Card */}
              <Card>
                <CardHeader>
                  <h2 className="text-lg font-semibold">Status</h2>
                </CardHeader>
                <CardBody className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600 dark:text-gray-400">Operational Status</span>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: getStatusColor(host.operational_status || 'unknown') }} />
                      <span className="text-sm font-medium capitalize">{host.operational_status || 'Unknown'}</span>
                    </div>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600 dark:text-gray-400">Health Status</span>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: getStatusColor(host.health_status || 'unknown') }} />
                      <span className="text-sm font-medium capitalize">{host.health_status || 'Unknown'}</span>
                    </div>
                  </div>
                  {host.uptime_seconds && (
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600 dark:text-gray-400 flex items-center gap-2">
                        <Clock size={14} />
                        Uptime
                      </span>
                      <span className="text-sm font-medium text-green-600">{formatUptime(host.uptime_seconds)}</span>
                    </div>
                  )}
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600 dark:text-gray-400">Last Seen</span>
                    <span className="text-sm">
                      {host.last_seen ? format(new Date(host.last_seen), 'MMM d, yyyy HH:mm') : 'Never'}
                    </span>
                  </div>
                </CardBody>
              </Card>

              {/* Location Card */}
              <Card>
                <CardHeader>
                  <h2 className="text-lg font-semibold flex items-center gap-2">
                    <MapPin size={18} className="text-red-500" />
                    Location
                  </h2>
                </CardHeader>
                <CardBody className="space-y-3">
                  <div>
                    <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Data Center</label>
                    <p className="mt-1 text-sm text-gray-900 dark:text-white">{host.data_center || '-'}</p>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Location</label>
                    <p className="mt-1 text-sm text-gray-900 dark:text-white">{host.location || '-'}</p>
                  </div>
                  {host.rack_id && (
                    <div>
                      <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Rack</label>
                      <p className="mt-1 text-sm text-gray-900 dark:text-white">{host.rack_id} {host.rack_unit ? `(U${host.rack_unit})` : ''}</p>
                    </div>
                  )}
                </CardBody>
              </Card>

              {/* Asset Info Card */}
              <Card>
                <CardHeader>
                  <h2 className="text-lg font-semibold">Asset Information</h2>
                </CardHeader>
                <CardBody className="space-y-3">
                  <div>
                    <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Serial Number</label>
                    <p className="mt-1 text-sm font-mono text-gray-900 dark:text-white">{host.serial_number || '-'}</p>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Asset Tag</label>
                    <p className="mt-1 text-sm font-mono text-gray-900 dark:text-white">{host.asset_tag || '-'}</p>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Firmware Version</label>
                    <p className="mt-1 text-sm text-gray-900 dark:text-white">{host.firmware_version || '-'}</p>
                  </div>
                </CardBody>
              </Card>
            </div>
          </div>
        </TabPanel>

        {/* Metrics Tab */}
        <TabPanel value="metrics">
          <div className="space-y-6">
            {/* Refresh Button */}
            <div className="flex justify-end">
              <Button
                variant="outline"
                size="sm"
                leftIcon={<RefreshCw size={16} className={metricsLoading ? 'animate-spin' : ''} />}
                onClick={fetchMetrics}
                disabled={metricsLoading}
              >
                Refresh Metrics
              </Button>
            </div>

            {/* Real-time Metrics Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/30 dark:to-blue-800/30 border-blue-200 dark:border-blue-800">
                <CardBody className="text-center py-4">
                  <Cpu size={28} className="mx-auto mb-2 text-blue-600 dark:text-blue-400" />
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">CPU Usage</p>
                  <p className="text-2xl font-bold text-blue-700 dark:text-blue-300">
                    {metrics?.cpu_usage != null ? `${metrics.cpu_usage.toFixed(1)}%` : '-'}
                  </p>
                </CardBody>
              </Card>

              <Card className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/30 dark:to-purple-800/30 border-purple-200 dark:border-purple-800">
                <CardBody className="text-center py-4">
                  <MemoryStick size={28} className="mx-auto mb-2 text-purple-600 dark:text-purple-400" />
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Memory Usage</p>
                  <p className="text-2xl font-bold text-purple-700 dark:text-purple-300">
                    {metrics?.memory_usage != null ? `${metrics.memory_usage.toFixed(1)}%` : '-'}
                  </p>
                  {metrics?.memory_total_gb && (
                    <p className="text-xs text-gray-500">{metrics.memory_total_gb.toFixed(1)} GB Total</p>
                  )}
                </CardBody>
              </Card>

              <Card className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/30 dark:to-green-800/30 border-green-200 dark:border-green-800">
                <CardBody className="text-center py-4">
                  <HardDrive size={28} className="mx-auto mb-2 text-green-600 dark:text-green-400" />
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Disk Usage</p>
                  <p className="text-2xl font-bold text-green-700 dark:text-green-300">
                    {metrics?.disk_usage != null ? `${metrics.disk_usage.toFixed(1)}%` : '-'}
                  </p>
                </CardBody>
              </Card>

              <Card className="bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-900/30 dark:to-orange-800/30 border-orange-200 dark:border-orange-800">
                <CardBody className="text-center py-4">
                  <Thermometer size={28} className="mx-auto mb-2 text-orange-600 dark:text-orange-400" />
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Temperature</p>
                  <p className="text-2xl font-bold text-orange-700 dark:text-orange-300">
                    {metrics?.temperature != null ? `${metrics.temperature}°C` : '-'}
                  </p>
                </CardBody>
              </Card>
            </div>

            {/* Network Throughput */}
            <Card>
              <CardHeader>
                <h2 className="text-lg font-semibold flex items-center gap-2">
                  <Activity size={18} className="text-cyan-500" />
                  Network Throughput
                </h2>
              </CardHeader>
              <CardBody>
                <div className="grid grid-cols-2 gap-6">
                  <div className="flex items-center gap-4 p-4 bg-green-50 dark:bg-green-900/30 rounded-lg">
                    <ArrowDownCircle size={32} className="text-green-600 dark:text-green-400" />
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Inbound</p>
                      <p className="text-xl font-bold text-green-700 dark:text-green-300">
                        {metrics?.network_in_mbps != null ? `${metrics.network_in_mbps.toFixed(2)} Mbps` : '-'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 p-4 bg-blue-50 dark:bg-blue-900/30 rounded-lg">
                    <ArrowUpCircle size={32} className="text-blue-600 dark:text-blue-400" />
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Outbound</p>
                      <p className="text-xl font-bold text-blue-700 dark:text-blue-300">
                        {metrics?.network_out_mbps != null ? `${metrics.network_out_mbps.toFixed(2)} Mbps` : '-'}
                      </p>
                    </div>
                  </div>
                </div>
              </CardBody>
            </Card>

            {/* VLAN Information */}
            {metrics?.vlans && metrics.vlans.length > 0 && (
              <Card>
                <CardHeader>
                  <h2 className="text-lg font-semibold flex items-center gap-2">
                    <Layers size={18} className="text-indigo-500" />
                    VLAN Configuration
                  </h2>
                </CardHeader>
                <CardBody>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {metrics.vlans.map((vlan, index) => (
                      <div key={index} className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                        <p className="text-lg font-bold text-gray-900 dark:text-white">VLAN {vlan.vlan_id}</p>
                        <p className="text-sm text-gray-500">{vlan.vlan_name || 'Unnamed'}</p>
                      </div>
                    ))}
                  </div>
                </CardBody>
              </Card>
            )}

            {/* Port Metrics from Prometheus */}
            {portMetrics.length > 0 && (
              <Card>
                <CardHeader>
                  <h2 className="text-lg font-semibold flex items-center gap-2">
                    <Network size={18} className="text-blue-500" />
                    Interface Metrics (Live from Prometheus)
                  </h2>
                </CardHeader>
                <CardBody>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
                          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase">Interface</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase">Status</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase">Speed</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase">MAC Address</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase">RX Rate</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase">TX Rate</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase">Errors</th>
                        </tr>
                      </thead>
                      <tbody>
                        {portMetrics.map((port, index) => (
                          <tr key={index} className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800">
                            <td className="px-4 py-3">
                              <div className="font-medium text-gray-900 dark:text-white">{port.port_name}</div>
                              {port.port_description && (
                                <div className="text-xs text-gray-500">{port.port_description}</div>
                              )}
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2">
                                {port.operational_status === 'up' ? (
                                  <CheckCircle size={16} className="text-green-500" />
                                ) : (
                                  <XCircle size={16} className="text-red-500" />
                                )}
                                <span className={port.operational_status === 'up' ? 'text-green-600' : 'text-red-600'}>
                                  {(port.operational_status || 'unknown').toUpperCase()}
                                </span>
                              </div>
                            </td>
                            <td className="px-4 py-3 text-sm">{port.speed_mbps ? `${port.speed_mbps} Mbps` : '-'}</td>
                            <td className="px-4 py-3 font-mono text-sm">{port.mac_address || '-'}</td>
                            <td className="px-4 py-3 text-sm text-green-600">
                              {port.rx_rate_mbps != null ? `${port.rx_rate_mbps.toFixed(2)} Mbps` : '-'}
                            </td>
                            <td className="px-4 py-3 text-sm text-blue-600">
                              {port.tx_rate_mbps != null ? `${port.tx_rate_mbps.toFixed(2)} Mbps` : '-'}
                            </td>
                            <td className="px-4 py-3 text-sm">
                              {port.rx_errors != null || port.tx_errors != null ? (
                                <span className={((port.rx_errors || 0) + (port.tx_errors || 0)) > 0 ? 'text-red-600' : 'text-gray-500'}>
                                  RX: {port.rx_errors || 0} / TX: {port.tx_errors || 0}
                                </span>
                              ) : '-'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardBody>
              </Card>
            )}

            {/* System Info from Prometheus */}
            {metrics?.hardware && Object.keys(metrics.hardware).length > 0 && (
              <Card>
                <CardHeader>
                  <h2 className="text-lg font-semibold flex items-center gap-2">
                    <Server size={18} className="text-gray-500" />
                    System Information (from Prometheus)
                  </h2>
                </CardHeader>
                <CardBody>
                  <div className="grid grid-cols-2 gap-4">
                    {Object.entries(metrics.hardware).map(([key, value]) => (
                      <div key={key} className="flex justify-between items-center p-2 bg-gray-50 dark:bg-gray-800 rounded">
                        <span className="text-sm text-gray-600 dark:text-gray-400 capitalize">{key.replace(/_/g, ' ')}</span>
                        <span className="text-sm font-medium text-gray-900 dark:text-white">{value || '-'}</span>
                      </div>
                    ))}
                  </div>
                </CardBody>
              </Card>
            )}

            {metricsLoading && (
              <div className="flex justify-center py-8">
                <RefreshCw className="animate-spin text-gray-400" size={32} />
              </div>
            )}

            {!metricsLoading && !metrics && (
              <Card>
                <CardBody className="text-center py-8">
                  <AlertTriangle size={48} className="mx-auto text-yellow-500 mb-4" />
                  <p className="text-gray-500">No metrics available. Ensure Prometheus is configured and the host is being monitored.</p>
                </CardBody>
              </Card>
            )}
          </div>
        </TabPanel>

        {/* Ports Tab */}
        <TabPanel value="ports">
          <Card>
            <CardHeader className="flex justify-between items-center">
              <h2 className="text-lg font-semibold">Ports / Interfaces</h2>
              <div className="flex gap-2">
                {portMetrics.length > 0 ? (
                  <>
                    <Badge variant="success">{portMetrics.filter(p => p.operational_status === 'up').length} Up</Badge>
                    <Badge variant="danger">{portMetrics.filter(p => p.operational_status === 'down').length} Down</Badge>
                    <Badge variant="secondary">From Prometheus</Badge>
                  </>
                ) : (
                  <>
                    <Badge variant="success">{ports.filter(p => p.operational_status === 'up').length} Up</Badge>
                    <Badge variant="danger">{ports.filter(p => p.operational_status === 'down').length} Down</Badge>
                  </>
                )}
              </div>
            </CardHeader>
            <CardBody>
              {portMetrics.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase">Port</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase">Status</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase">Speed</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase">IP Address</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase">MAC Address</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase">VLAN</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase">RX Rate</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase">TX Rate</th>
                      </tr>
                    </thead>
                    <tbody>
                      {portMetrics.map((port, index) => (
                        <tr key={index} className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800">
                          <td className="px-4 py-3">
                            <div className="font-medium text-gray-900 dark:text-white">{port.port_name}</div>
                            {port.port_description && (
                              <div className="text-xs text-gray-500">{port.port_description}</div>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              {port.operational_status === 'up' ? (
                                <CheckCircle size={16} className="text-green-500" />
                              ) : (
                                <XCircle size={16} className="text-red-500" />
                              )}
                              <span className={port.operational_status === 'up' ? 'text-green-600' : 'text-red-600'}>
                                {(port.operational_status || 'unknown').toUpperCase()}
                              </span>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-sm">{port.speed_mbps ? `${port.speed_mbps} Mbps` : '-'}</td>
                          <td className="px-4 py-3 font-mono text-sm">{port.ip_address || '-'}</td>
                          <td className="px-4 py-3 font-mono text-sm">{port.mac_address || '-'}</td>
                          <td className="px-4 py-3 text-sm">{port.vlan_id || '-'}</td>
                          <td className="px-4 py-3 text-sm text-green-600">
                            {port.rx_rate_mbps != null ? `${port.rx_rate_mbps.toFixed(2)} Mbps` : '-'}
                          </td>
                          <td className="px-4 py-3 text-sm text-blue-600">
                            {port.tx_rate_mbps != null ? `${port.tx_rate_mbps.toFixed(2)} Mbps` : '-'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : ports.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase">Port</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase">Status</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase">Type</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase">IP Address</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase">MAC Address</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase">VLAN</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase">Speed</th>
                      </tr>
                    </thead>
                    <tbody>
                      {ports.map((port) => (
                        <tr key={port.id} className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800">
                          <td className="px-4 py-3">
                            <div className="font-medium text-gray-900 dark:text-white">{port.port_display_name || port.port_name}</div>
                            {port.port_description && (
                              <div className="text-xs text-gray-500">{port.port_description}</div>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              {port.operational_status === 'up' ? (
                                <CheckCircle size={16} className="text-green-500" />
                              ) : (
                                <XCircle size={16} className="text-red-500" />
                              )}
                              <span className={port.operational_status === 'up' ? 'text-green-600' : 'text-red-600'}>
                                {(port.operational_status || 'unknown').toUpperCase()}
                              </span>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-sm capitalize">{port.port_type}</td>
                          <td className="px-4 py-3 font-mono text-sm">{port.ip_address || '-'}</td>
                          <td className="px-4 py-3 font-mono text-sm">{port.mac_address || '-'}</td>
                          <td className="px-4 py-3 text-sm">{port.vlan_id || '-'}</td>
                          <td className="px-4 py-3 text-sm">{port.speed_mbps ? `${port.speed_mbps} Mbps` : '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-gray-500 text-center py-8">No ports configured for this host</p>
              )}
            </CardBody>
          </Card>
        </TabPanel>

        {/* Connections Tab */}
        <TabPanel value="connections">
          <Card>
            <CardHeader>
              <h2 className="text-lg font-semibold">Network Connections</h2>
            </CardHeader>
            <CardBody>
              {connections.length > 0 ? (
                <div className="space-y-4">
                  {connections.map((conn) => (
                    <div key={conn.id} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center">
                          <Network size={20} className="text-blue-600 dark:text-blue-400" />
                        </div>
                        <div>
                          <div className="font-medium text-gray-900 dark:text-white">
                            {conn.source_host_id === id ? 'Outgoing' : 'Incoming'} Connection
                          </div>
                          <div className="text-sm text-gray-500">
                            {conn.relationship_type} - {conn.connection_status}
                          </div>
                        </div>
                      </div>
                      <Badge variant={conn.connection_status === 'active' ? 'success' : 'secondary'}>
                        {conn.connection_status}
                      </Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 text-center py-8">No network connections found</p>
              )}
            </CardBody>
          </Card>
        </TabPanel>

        {/* Hardware Tab */}
        <TabPanel value="hardware">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <h2 className="text-lg font-semibold flex items-center gap-2">
                  <Cpu size={18} className="text-blue-500" />
                  System Information
                </h2>
              </CardHeader>
              <CardBody className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Operating System</label>
                    <p className="mt-1 text-sm text-gray-900 dark:text-white">
                      {metrics?.hardware?.os_name || host.operating_system || '-'}
                    </p>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-500 dark:text-gray-400">OS Version</label>
                    <p className="mt-1 text-sm text-gray-900 dark:text-white">
                      {metrics?.hardware?.os_release || host.os_version || '-'}
                    </p>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Firmware Version</label>
                    <p className="mt-1 text-sm text-gray-900 dark:text-white">{host.firmware_version || '-'}</p>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Device Series</label>
                    <p className="mt-1 text-sm text-gray-900 dark:text-white">{host.device_series || '-'}</p>
                  </div>
                  {metrics?.hardware?.machine && (
                    <div>
                      <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Architecture</label>
                      <p className="mt-1 text-sm text-gray-900 dark:text-white">{metrics.hardware.machine}</p>
                    </div>
                  )}
                  {metrics?.hardware?.nodename && (
                    <div>
                      <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Node Name</label>
                      <p className="mt-1 text-sm text-gray-900 dark:text-white">{metrics.hardware.nodename}</p>
                    </div>
                  )}
                </div>
                {metrics?.hardware?.system_description && (
                  <div className="pt-4 border-t dark:border-gray-700">
                    <label className="text-xs font-medium text-gray-500 dark:text-gray-400">System Description (SNMP)</label>
                    <p className="mt-1 text-sm text-gray-900 dark:text-white">{metrics.hardware.system_description}</p>
                  </div>
                )}
              </CardBody>
            </Card>

            <Card>
              <CardHeader>
                <h2 className="text-lg font-semibold flex items-center gap-2">
                  <HardDrive size={18} className="text-purple-500" />
                  Hardware Specifications
                </h2>
              </CardHeader>
              <CardBody>
                {(host.hardware_specs && Object.keys(host.hardware_specs).length > 0) || metrics ? (
                  <div className="space-y-3">
                    {/* Live metrics from Prometheus */}
                    {metrics?.cpu_usage != null && (
                      <div className="flex justify-between items-center p-2 bg-blue-50 dark:bg-blue-900/30 rounded">
                        <span className="text-sm text-gray-600 dark:text-gray-400 flex items-center gap-2">
                          <Cpu size={14} className="text-blue-500" />
                          CPU Usage (Live)
                        </span>
                        <span className="text-sm font-medium text-blue-700 dark:text-blue-300">{metrics.cpu_usage.toFixed(1)}%</span>
                      </div>
                    )}
                    {metrics?.memory_usage != null && (
                      <div className="flex justify-between items-center p-2 bg-purple-50 dark:bg-purple-900/30 rounded">
                        <span className="text-sm text-gray-600 dark:text-gray-400 flex items-center gap-2">
                          <MemoryStick size={14} className="text-purple-500" />
                          Memory Usage (Live)
                        </span>
                        <span className="text-sm font-medium text-purple-700 dark:text-purple-300">
                          {metrics.memory_usage.toFixed(1)}%
                          {metrics.memory_total_gb && ` of ${metrics.memory_total_gb.toFixed(1)} GB`}
                        </span>
                      </div>
                    )}
                    {metrics?.disk_usage != null && (
                      <div className="flex justify-between items-center p-2 bg-green-50 dark:bg-green-900/30 rounded">
                        <span className="text-sm text-gray-600 dark:text-gray-400 flex items-center gap-2">
                          <HardDrive size={14} className="text-green-500" />
                          Disk Usage (Live)
                        </span>
                        <span className="text-sm font-medium text-green-700 dark:text-green-300">{metrics.disk_usage.toFixed(1)}%</span>
                      </div>
                    )}
                    {metrics?.uptime_seconds != null && (
                      <div className="flex justify-between items-center p-2 bg-gray-50 dark:bg-gray-800 rounded">
                        <span className="text-sm text-gray-600 dark:text-gray-400 flex items-center gap-2">
                          <Clock size={14} className="text-gray-500" />
                          Uptime
                        </span>
                        <span className="text-sm font-medium text-gray-900 dark:text-white">{formatUptime(metrics.uptime_seconds)}</span>
                      </div>
                    )}
                    {/* Static hardware specs from database */}
                    {host.hardware_specs && Object.entries(host.hardware_specs).map(([key, value]) => (
                      <div key={key} className="flex justify-between items-center">
                        <span className="text-sm text-gray-600 dark:text-gray-400 capitalize">{key.replace(/_/g, ' ')}</span>
                        <span className="text-sm font-medium text-gray-900 dark:text-white">{String(value)}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500 text-center py-4">No hardware specifications available</p>
                )}
              </CardBody>
            </Card>

            <Card className="lg:col-span-2">
              <CardHeader>
                <h2 className="text-lg font-semibold">Timestamps</h2>
              </CardHeader>
              <CardBody>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Created At</label>
                    <p className="mt-1 text-sm text-gray-900 dark:text-white">
                      {host.created_at ? format(new Date(host.created_at), 'MMM d, yyyy HH:mm') : '-'}
                    </p>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Updated At</label>
                    <p className="mt-1 text-sm text-gray-900 dark:text-white">
                      {host.updated_at ? format(new Date(host.updated_at), 'MMM d, yyyy HH:mm') : '-'}
                    </p>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Last Seen</label>
                    <p className="mt-1 text-sm text-gray-900 dark:text-white">
                      {host.last_seen ? format(new Date(host.last_seen), 'MMM d, yyyy HH:mm') : '-'}
                    </p>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Last Config Change</label>
                    <p className="mt-1 text-sm text-gray-900 dark:text-white">
                      {host.last_config_change ? format(new Date(host.last_config_change), 'MMM d, yyyy HH:mm') : '-'}
                    </p>
                  </div>
                </div>
              </CardBody>
            </Card>
          </div>
        </TabPanel>
      </Tabs>

      {/* Edit Modal */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title="Edit Infrastructure Host"
        size="lg"
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Hostname"
              value={editForm.hostname || ''}
              onChange={(e) => setEditForm({ ...editForm, hostname: e.target.value })}
            />
            <Input
              label="Display Name"
              value={editForm.display_name || ''}
              onChange={(e) => setEditForm({ ...editForm, display_name: e.target.value })}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Device Category"
              value={editForm.device_category || ''}
              onChange={(e) => setEditForm({ ...editForm, device_category: e.target.value })}
              options={[
                { value: 'firewall', label: 'Firewall' },
                { value: 'router', label: 'Router' },
                { value: 'switch', label: 'Switch' },
                { value: 'server', label: 'Server' },
                { value: 'virtual_machine', label: 'Virtual Machine' },
                { value: 'storage', label: 'Storage' },
                { value: 'access_point', label: 'Access Point' },
              ]}
            />
            <Select
              label="Device Vendor"
              value={editForm.device_vendor || ''}
              onChange={(e) => setEditForm({ ...editForm, device_vendor: e.target.value as DeviceVendor })}
              options={[
                { value: '', label: 'Select Vendor' },
                { value: 'cisco', label: 'Cisco' },
                { value: 'juniper', label: 'Juniper' },
                { value: 'arista', label: 'Arista' },
                { value: 'dell', label: 'Dell' },
                { value: 'hp', label: 'HP' },
                { value: 'fortinet', label: 'Fortinet' },
                { value: 'palo_alto', label: 'Palo Alto' },
                { value: 'vmware', label: 'VMware' },
                { value: 'other', label: 'Other' },
              ]}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Device Model"
              value={editForm.device_model || ''}
              onChange={(e) => setEditForm({ ...editForm, device_model: e.target.value })}
            />
            <Input
              label="Management IP"
              value={editForm.management_ip || ''}
              onChange={(e) => setEditForm({ ...editForm, management_ip: e.target.value })}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="MAC Address"
              value={editForm.management_mac || ''}
              onChange={(e) => setEditForm({ ...editForm, management_mac: e.target.value })}
            />
            <Input
              label="Serial Number"
              value={editForm.serial_number || ''}
              onChange={(e) => setEditForm({ ...editForm, serial_number: e.target.value })}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Operational Status"
              value={editForm.operational_status || ''}
              onChange={(e) => setEditForm({ ...editForm, operational_status: e.target.value })}
              options={[
                { value: 'up', label: 'Up' },
                { value: 'down', label: 'Down' },
                { value: 'degraded', label: 'Degraded' },
                { value: 'maintenance', label: 'Maintenance' },
                { value: 'unknown', label: 'Unknown' },
              ]}
            />
            <Select
              label="Health Status"
              value={editForm.health_status || ''}
              onChange={(e) => setEditForm({ ...editForm, health_status: e.target.value })}
              options={[
                { value: 'healthy', label: 'Healthy' },
                { value: 'warning', label: 'Warning' },
                { value: 'critical', label: 'Critical' },
                { value: 'unknown', label: 'Unknown' },
              ]}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Data Center"
              value={editForm.data_center || ''}
              onChange={(e) => setEditForm({ ...editForm, data_center: e.target.value })}
            />
            <Input
              label="Location"
              value={editForm.location || ''}
              onChange={(e) => setEditForm({ ...editForm, location: e.target.value })}
            />
          </div>
          <Textarea
            label="Description"
            value={editForm.description || ''}
            onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
            rows={3}
          />
          <div className="flex justify-end gap-3 pt-4">
            <Button
              variant="outline"
              leftIcon={<X size={16} />}
              onClick={() => setIsEditModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              leftIcon={<Save size={16} />}
              onClick={handleSave}
              isLoading={isSaving}
            >
              Save Changes
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default InfrastructureHostDetailPage;
