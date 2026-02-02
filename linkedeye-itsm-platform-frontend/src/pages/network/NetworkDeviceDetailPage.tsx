import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { format, formatDistanceToNow } from 'date-fns';
import {
  ArrowLeft, Edit, Activity, Network, Server, Router, Wifi, Shield,
  Cpu, HardDrive, Thermometer, Fan, Clock, AlertTriangle, Bell,
  Plus, Trash2, Settings, CheckCircle, XCircle,
  TrendingUp, TrendingDown
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
  networkService,
  NetworkDevice,
  DeviceMetricsResponse,
  AlertConfig,
  CreateAlertConfig,
} from '@/services/networkService';
import monitoringService, { MonitoringAlert } from '@/services/monitoringService';
import { useAppSelector } from '@/hooks/useRedux';
import toast from 'react-hot-toast';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart, Legend } from 'recharts';

const NetworkDeviceDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { theme } = useAppSelector((state) => state.ui);
  const isDark = theme === 'dark';
  const [device, setDevice] = useState<NetworkDevice | null>(null);
  const [metricsData, setMetricsData] = useState<DeviceMetricsResponse | null>(null);
  const [alertConfigs, setAlertConfigs] = useState<AlertConfig[]>([]);
  const [monitoringAlerts, setMonitoringAlerts] = useState<MonitoringAlert[]>([]);
  const [monitoringAlertsLoading, setMonitoringAlertsLoading] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingDevice, setEditingDevice] = useState<Partial<NetworkDevice> | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [timeRange, setTimeRange] = useState(6);

  const [isAlertModalOpen, setIsAlertModalOpen] = useState(false);
  const [editingAlert, setEditingAlert] = useState<AlertConfig | null>(null);
  const [alertForm, setAlertForm] = useState<CreateAlertConfig>({
    name: '',
    metric: 'cpu_usage',
    condition: 'gt',
    threshold: 80,
    severity: 'warning',
    enabled: true,
    notification_channels: [],
  });

  useEffect(() => {
    const fetchDevice = async () => {
      if (!id) return;
      setIsLoading(true);
      try {
        const deviceData = await networkService.getDeviceById(id);
        setDevice(deviceData);

        try {
          const metricsResponse = await networkService.getDeviceMetrics(id, timeRange);
          setMetricsData(metricsResponse);
        } catch (metricsError) {
          console.error('Failed to load metrics:', metricsError);
        }

        try {
          const alertsData = await networkService.getAlertConfigs(id);
          setAlertConfigs(alertsData);
        } catch (alertsError) {
          console.error('Failed to load alerts:', alertsError);
        }

        // Load monitoring alerts for this device
        loadMonitoringAlerts(id);
      } catch (error) {
        console.error('Failed to load device:', error);
        toast.error('Failed to load device details');
        navigate('/network/devices');
      } finally {
        setIsLoading(false);
      }
    };

    if (id) {
      fetchDevice();
    }
  }, [id, navigate, timeRange]);

  const loadMonitoringAlerts = async (deviceId: string) => {
    try {
      setMonitoringAlertsLoading(true);
      const alertsData = await monitoringService.getAlertsByDevice(deviceId, { limit: 20 });
      setMonitoringAlerts(alertsData);
    } catch (error) {
      console.error('Failed to load monitoring alerts:', error);
      setMonitoringAlerts([]);
    } finally {
      setMonitoringAlertsLoading(false);
    }
  };

  const getDeviceIcon = (type: string) => {
    const normalized = (type || '').toLowerCase().replace(/\s+/g, '_');
    const iconMap: Record<string, React.ReactNode> = {
      switch: <Network size={24} className="text-primary-600" />,
      router: <Router size={24} className="text-primary-600" />,
      firewall: <Shield size={24} className="text-primary-600" />,
      access_point: <Wifi size={24} className="text-primary-600" />,
      server: <Server size={24} className="text-primary-600" />,
      load_balancer: <Server size={24} className="text-primary-600" />,
      gateway: <Router size={24} className="text-primary-600" />,
    };
    return iconMap[normalized] || <Network size={24} className="text-primary-600" />;
  };

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const handleSaveAlert = async () => {
    if (!id) return;
    setIsSaving(true);
    try {
      if (editingAlert) {
        await networkService.updateAlertConfig(id, editingAlert.id, alertForm);
        toast.success('Alert configuration updated');
      } else {
        await networkService.createAlertConfig(id, alertForm);
        toast.success('Alert configuration created');
      }
      const updatedAlerts = await networkService.getAlertConfigs(id);
      setAlertConfigs(updatedAlerts);
      setIsAlertModalOpen(false);
      setEditingAlert(null);
      resetAlertForm();
    } catch (error) {
      toast.error('Failed to save alert configuration');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteAlert = async (alertId: string) => {
    if (!id) return;
    if (!confirm('Are you sure you want to delete this alert?')) return;
    try {
      await networkService.deleteAlertConfig(id, alertId);
      toast.success('Alert configuration deleted');
      const updatedAlerts = await networkService.getAlertConfigs(id);
      setAlertConfigs(updatedAlerts);
    } catch (error) {
      toast.error('Failed to delete alert configuration');
    }
  };

  const resetAlertForm = () => {
    setAlertForm({
      name: '',
      metric: 'cpu_usage',
      condition: 'gt',
      threshold: 80,
      severity: 'warning',
      enabled: true,
      notification_channels: [],
    });
  };

  const openEditAlert = (alert: AlertConfig) => {
    setEditingAlert(alert);
    setAlertForm({
      name: alert.name,
      metric: alert.metric,
      condition: alert.condition,
      threshold: alert.threshold,
      severity: alert.severity,
      enabled: alert.enabled,
      notification_channels: alert.notification_channels,
    });
    setIsAlertModalOpen(true);
  };

  if (isLoading || !device) {
    return <PageLoader message="Loading device details..." />;
  }

  const chartData = metricsData?.history.map((point) => ({
    time: format(new Date(point.timestamp), 'HH:mm'),
    cpu: point.cpu_usage,
    memory: point.memory_usage,
    temperature: point.temperature,
    networkIn: point.network_in,
    networkOut: point.network_out,
  })) || [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link to="/network/devices" className="p-2 rounded-lg transition-colors" style={{ color: isDark ? '#f8fafc' : undefined }}>
            <ArrowLeft size={20} />
          </Link>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center">
              {getDeviceIcon(device.type)}
            </div>
            <div>
              <h1 className="text-xl font-bold" style={{ color: isDark ? '#f8fafc' : '#0f1c3f' }}>{device.name}</h1>
              <p className="text-sm text-gray-500">{device.type} - {device.ipAddress}</p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            leftIcon={<Edit size={16} />}
            onClick={() => {
              setEditingDevice({ ...device });
              setIsEditModalOpen(true);
            }}
          >
            Edit
          </Button>
        </div>
      </div>

      <Tabs defaultValue="overview" value={activeTab} onChange={setActiveTab}>
        <TabList>
          <Tab value="overview">Overview</Tab>
          <Tab value="interfaces">Interfaces ({metricsData?.interfaces?.length || device.interfaces?.length || 0})</Tab>
          <Tab value="metrics">Metrics & Graphs</Tab>
          <Tab value="alerts">Alerts ({alertConfigs.length})</Tab>
          <Tab value="history">History</Tab>
        </TabList>

        <TabPanel value="overview">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <Card>
                <CardHeader>
                  <h2 className="text-lg font-semibold">Device Information</h2>
                </CardHeader>
                <CardBody className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-medium text-gray-500">Status</label>
                      <div className="mt-1">
                        <StatusBadge status={device.status} />
                      </div>
                    </div>
                    <div>
                      <label className="text-xs font-medium text-gray-500">Uptime</label>
                      <p className="mt-1 text-sm text-gray-900 flex items-center gap-2">
                        <Clock size={14} className="text-green-500" />
                        {metricsData?.current.uptime_formatted || device.uptime}
                      </p>
                    </div>
                    <div>
                      <label className="text-xs font-medium text-gray-500">IP Address</label>
                      <p className="mt-1 text-sm font-mono text-gray-900">{device.ipAddress}</p>
                    </div>
                    {device.macAddress && (
                      <div>
                        <label className="text-xs font-medium text-gray-500">MAC Address</label>
                        <p className="mt-1 text-sm font-mono text-gray-900">{device.macAddress}</p>
                      </div>
                    )}
                    {device.manufacturer && (
                      <div>
                        <label className="text-xs font-medium text-gray-500">Manufacturer</label>
                        <p className="mt-1 text-sm text-gray-900 dark:text-gray-100">{device.manufacturer}</p>
                      </div>
                    )}
                    {device.model && (
                      <div>
                        <label className="text-xs font-medium text-gray-500">Model</label>
                        <p className="mt-1 text-sm text-gray-900 dark:text-gray-100">{device.model}</p>
                      </div>
                    )}
                    {device.firmware && (
                      <div>
                        <label className="text-xs font-medium text-gray-500">Firmware</label>
                        <p className="mt-1 text-sm text-gray-900 dark:text-gray-100">{device.firmware}</p>
                      </div>
                    )}
                    {device.serialNumber && (
                      <div>
                        <label className="text-xs font-medium text-gray-500">Serial Number</label>
                        <p className="mt-1 text-sm font-mono text-gray-900">{device.serialNumber}</p>
                      </div>
                    )}
                    {device.location && (
                      <div className="col-span-2">
                        <label className="text-xs font-medium text-gray-500">Location</label>
                        <p className="mt-1 text-sm text-gray-900 dark:text-gray-100">{device.location}</p>
                      </div>
                    )}
                  </div>
                </CardBody>
              </Card>
            </div>

            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <h2 className="text-lg font-semibold">System Health</h2>
                </CardHeader>
                <CardBody className="space-y-4">
                  <div>
                    <div className="flex justify-between items-center text-sm mb-1">
                      <span className="text-gray-600 flex items-center gap-2">
                        <Cpu size={14} className="text-blue-500" />
                        CPU Usage
                      </span>
                      <span className={`font-bold ${(metricsData?.current.cpu_usage || device.metrics?.cpuUsage || 0) > 80 ? 'text-red-600' : (metricsData?.current.cpu_usage || device.metrics?.cpuUsage || 0) > 60 ? 'text-yellow-600' : 'text-green-600'}`}>
                        {metricsData?.current.cpu_usage || device.metrics?.cpuUsage || 0}%
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full transition-all ${(metricsData?.current.cpu_usage || device.metrics?.cpuUsage || 0) > 80 ? 'bg-red-500' : (metricsData?.current.cpu_usage || device.metrics?.cpuUsage || 0) > 60 ? 'bg-yellow-500' : 'bg-green-500'}`}
                        style={{ width: `${metricsData?.current.cpu_usage || device.metrics?.cpuUsage || 0}%` }}
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between items-center text-sm mb-1">
                      <span className="text-gray-600 flex items-center gap-2">
                        <HardDrive size={14} className="text-purple-500" />
                        Memory Usage
                      </span>
                      <span className={`font-bold ${(metricsData?.current.memory_usage || device.metrics?.memoryUsage || 0) > 85 ? 'text-red-600' : (metricsData?.current.memory_usage || device.metrics?.memoryUsage || 0) > 70 ? 'text-yellow-600' : 'text-green-600'}`}>
                        {metricsData?.current.memory_usage || device.metrics?.memoryUsage || 0}%
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full transition-all ${(metricsData?.current.memory_usage || device.metrics?.memoryUsage || 0) > 85 ? 'bg-red-500' : (metricsData?.current.memory_usage || device.metrics?.memoryUsage || 0) > 70 ? 'bg-yellow-500' : 'bg-green-500'}`}
                        style={{ width: `${metricsData?.current.memory_usage || device.metrics?.memoryUsage || 0}%` }}
                      />
                    </div>
                  </div>

                  <div className="pt-2 border-t">
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-gray-600 flex items-center gap-2">
                        <Thermometer size={14} className="text-red-500" />
                        Temperature
                      </span>
                      <span className={`font-bold ${(metricsData?.current.temperature ?? 0) > 70 ? 'text-red-600' : (metricsData?.current.temperature ?? 0) > 55 ? 'text-yellow-600' : 'text-green-600'}`}>
                        {metricsData?.current.temperature ?? device.metrics?.temperature ?? 0}°C
                      </span>
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-gray-600 flex items-center gap-2">
                        <Fan size={14} className="text-cyan-500" />
                        Fan Status
                      </span>
                      <span className={`font-bold ${metricsData?.current.fan_status === 'high' ? 'text-yellow-600' : 'text-green-600'}`}>
                        {metricsData?.current.fan_status ?? 'Normal'} ({metricsData?.current.fan_rpm ?? 0} RPM)
                      </span>
                    </div>
                  </div>

                  {(metricsData?.current.total_ports || 0) > 0 && (
                    <div className="pt-2 border-t">
                      <div className="flex justify-between items-center text-sm mb-1">
                        <span className="text-gray-600 flex items-center gap-2">
                          <Network size={14} className="text-indigo-500" />
                          Port Utilization
                        </span>
                        <span className="font-bold">
                          {metricsData?.current.used_ports || 0} / {metricsData?.current.total_ports || 0}
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="h-2 rounded-full bg-indigo-500 transition-all"
                          style={{ width: `${metricsData?.current.port_utilization || 0}%` }}
                        />
                      </div>
                    </div>
                  )}
                </CardBody>
              </Card>

              {/* Monitoring Alerts from Database */}
              <Card className="border-l-4 border-l-orange-500">
                <CardHeader className="flex justify-between items-center">
                  <h2 className="text-lg font-semibold flex items-center gap-2">
                    <Bell size={18} className="text-orange-500" />
                    Device Alerts ({monitoringAlerts.length})
                  </h2>
                  <Link to="/monitoring" className="text-xs text-blue-600 hover:underline">View All</Link>
                </CardHeader>
                <CardBody className="space-y-2">
                  {monitoringAlertsLoading ? (
                    <div className="text-center py-4">
                      <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto" />
                      <p className="text-xs text-gray-500 mt-2">Loading alerts...</p>
                    </div>
                  ) : monitoringAlerts.length === 0 ? (
                    <div className="text-center py-4 text-gray-500 text-sm">
                      No alerts for this device
                    </div>
                  ) : (
                    monitoringAlerts.slice(0, 5).map((alert) => (
                      <div
                        key={alert.id}
                        className={`p-3 rounded-lg border-l-[3px] ${
                          alert.severity === 'critical' || alert.severity === 'high'
                            ? 'bg-red-50 border-red-500'
                            : alert.severity === 'medium'
                              ? 'bg-amber-50 border-amber-500'
                              : 'bg-blue-50 border-blue-500'
                        }`}
                      >
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <div className="font-medium text-sm">{alert.name}</div>
                            <div className="text-xs text-gray-500 mt-1">
                              {alert.message || alert.severity} &bull; {formatDistanceToNow(new Date(alert.startsAt), { addSuffix: true })}
                            </div>
                          </div>
                          <span className={`text-[10px] px-2 py-1 rounded-full font-medium ${
                            alert.status === 'firing' ? 'bg-red-100 text-red-700' :
                            alert.status === 'acknowledged' ? 'bg-yellow-100 text-yellow-700' :
                            'bg-green-100 text-green-700'
                          }`}>
                            {alert.status}
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </CardBody>
              </Card>

              {/* Legacy Metrics-based Alerts (if available) */}
              {metricsData?.alerts && metricsData.alerts.filter(a => a.status === 'active').length > 0 && (
                <Card className="border-l-4 border-l-red-500">
                  <CardHeader>
                    <h2 className="text-lg font-semibold flex items-center gap-2">
                      <AlertTriangle size={18} className="text-red-500" />
                      Active Threshold Alerts
                    </h2>
                  </CardHeader>
                  <CardBody className="space-y-2">
                    {metricsData.alerts.filter(a => a.status === 'active').map((alert) => (
                      <div key={alert.id} className={`p-2 rounded text-sm ${alert.severity === 'critical' ? 'bg-red-50 text-red-700' : 'bg-yellow-50 text-yellow-700'}`}>
                        <div className="font-medium">{alert.name}</div>
                        <div className="text-xs opacity-75">{alert.message}</div>
                      </div>
                    ))}
                  </CardBody>
                </Card>
              )}
            </div>
          </div>
        </TabPanel>

        <TabPanel value="interfaces">
          <Card>
            <CardHeader className="flex justify-between items-center">
              <h2 className="text-lg font-semibold">Network Interfaces (NICs)</h2>
              <div className="flex gap-2">
                <Badge variant="success">{metricsData?.interfaces?.filter(i => i.status === 'up').length || 0} Up</Badge>
                <Badge variant="danger">{metricsData?.interfaces?.filter(i => i.status === 'down').length || 0} Down</Badge>
              </div>
            </CardHeader>
            <CardBody>
              {metricsData?.interfaces && metricsData.interfaces.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr style={{ background: isDark ? 'rgba(255,255,255,0.03)' : '#f9fafb', borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : '#e5e8eb'}` }}>
                        <th className={`px-4 py-3 text-left text-xs font-semibold uppercase ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Interface</th>
                        <th className={`px-4 py-3 text-left text-xs font-semibold uppercase ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Status</th>
                        <th className={`px-4 py-3 text-left text-xs font-semibold uppercase ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Speed</th>
                        <th className={`px-4 py-3 text-left text-xs font-semibold uppercase ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>MAC Address</th>
                        <th className={`px-4 py-3 text-left text-xs font-semibold uppercase ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>MTU</th>
                        <th className={`px-4 py-3 text-left text-xs font-semibold uppercase ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Duplex</th>
                        <th className={`px-4 py-3 text-left text-xs font-semibold uppercase ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>RX/TX</th>
                        <th className={`px-4 py-3 text-left text-xs font-semibold uppercase ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Errors</th>
                      </tr>
                    </thead>
                    <tbody>
                      {metricsData.interfaces.map((iface) => (
                        <tr key={iface.id} className="transition-colors" style={{ borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.05)' : '#f3f4f6'}` }}>
                          <td className="px-4 py-3">
                            <div className="font-medium">{iface.name}</div>
                            <div className="text-xs text-gray-500">{iface.type}</div>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              {iface.status === 'up' ? (
                                <CheckCircle size={16} className="text-green-500" />
                              ) : (
                                <XCircle size={16} className="text-red-500" />
                              )}
                              <span className={iface.status === 'up' ? 'text-green-600' : 'text-red-600'}>
                                {iface.status.toUpperCase()}
                              </span>
                            </div>
                            <div className="text-xs text-gray-500">
                              Admin: {iface.admin_status}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-sm">{iface.speed}</td>
                          <td className="px-4 py-3 font-mono text-sm">{iface.mac_address}</td>
                          <td className="px-4 py-3 text-sm">{iface.mtu}</td>
                          <td className="px-4 py-3 text-sm capitalize">{iface.duplex}</td>
                          <td className="px-4 py-3 text-sm">
                            <div className="flex items-center gap-1 text-green-600">
                              <TrendingDown size={12} /> {formatBytes(iface.rx_bytes)}
                            </div>
                            <div className="flex items-center gap-1 text-blue-600">
                              <TrendingUp size={12} /> {formatBytes(iface.tx_bytes)}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-sm">
                            <div className={iface.rx_errors > 0 ? 'text-red-600' : 'text-gray-500'}>
                              RX: {iface.rx_errors}
                            </div>
                            <div className={iface.tx_errors > 0 ? 'text-red-600' : 'text-gray-500'}>
                              TX: {iface.tx_errors}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-gray-500 text-center py-8">No interfaces found</p>
              )}
            </CardBody>
          </Card>
        </TabPanel>

        <TabPanel value="metrics">
          <div className="space-y-6">
            <div className="flex justify-end">
              <Select
                value={String(timeRange)}
                onChange={(e) => setTimeRange(Number(e.target.value))}
                options={[
                  { value: '1', label: 'Last 1 Hour' },
                  { value: '6', label: 'Last 6 Hours' },
                  { value: '12', label: 'Last 12 Hours' },
                  { value: '24', label: 'Last 24 Hours' },
                  { value: '48', label: 'Last 48 Hours' },
                  { value: '168', label: 'Last 7 Days' },
                ]}
                className="w-48"
              />
            </div>

            <Card>
              <CardHeader>
                <h2 className="text-lg font-semibold flex items-center gap-2">
                  <Cpu size={18} className="text-blue-500" />
                  CPU & Memory Usage (Last {timeRange} Hours)
                </h2>
              </CardHeader>
              <CardBody>
                <div className={`h-80 rounded-lg p-4 ${isDark ? 'bg-gradient-to-br from-slate-900 to-slate-800' : 'bg-gradient-to-br from-gray-50 to-white border border-gray-200'}`}>
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData}>
                      <defs>
                        <linearGradient id="cpuGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4}/>
                          <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                        </linearGradient>
                        <linearGradient id="memoryGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.4}/>
                          <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#374151' : '#e5e7eb'} />
                      <XAxis dataKey="time" stroke={isDark ? '#9ca3af' : '#6b7280'} fontSize={11} />
                      <YAxis stroke={isDark ? '#9ca3af' : '#6b7280'} fontSize={11} domain={[0, 100]} tickFormatter={(v) => `${v}%`} />
                      <Tooltip
                        contentStyle={{ backgroundColor: isDark ? '#1f2937' : '#ffffff', border: `1px solid ${isDark ? '#374151' : '#e5e7eb'}`, borderRadius: '8px', color: isDark ? '#fff' : '#111827' }}
                        labelStyle={{ color: isDark ? '#9ca3af' : '#6b7280' }}
                        itemStyle={{ color: '#fff' }}
                      />
                      <Legend wrapperStyle={{ color: isDark ? '#9ca3af' : '#6b7280' }} />
                      <Area type="monotone" dataKey="cpu" name="CPU %" stroke="#3b82f6" fillOpacity={1} fill="url(#cpuGradient)" strokeWidth={2} />
                      <Area type="monotone" dataKey="memory" name="Memory %" stroke="#8b5cf6" fillOpacity={1} fill="url(#memoryGradient)" strokeWidth={2} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </CardBody>
            </Card>

            <Card>
              <CardHeader>
                <h2 className="text-lg font-semibold flex items-center gap-2">
                  <Thermometer size={18} className="text-red-500" />
                  Temperature (Last {timeRange} Hours)
                </h2>
              </CardHeader>
              <CardBody>
                <div className={`h-64 rounded-lg p-4 ${isDark ? 'bg-gradient-to-br from-slate-900 to-slate-800' : 'bg-gradient-to-br from-gray-50 to-white border border-gray-200'}`}>
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#374151' : '#e5e7eb'} />
                      <XAxis dataKey="time" stroke={isDark ? '#9ca3af' : '#6b7280'} fontSize={11} />
                      <YAxis stroke={isDark ? '#9ca3af' : '#6b7280'} fontSize={11} domain={[30, 80]} tickFormatter={(v) => `${v}°C`} />
                      <Tooltip
                        contentStyle={{ backgroundColor: isDark ? '#1f2937' : '#ffffff', border: `1px solid ${isDark ? '#374151' : '#e5e7eb'}`, borderRadius: '8px', color: isDark ? '#fff' : '#111827' }}
                        labelStyle={{ color: isDark ? '#9ca3af' : '#6b7280' }}
                      />
                      <Line type="monotone" dataKey="temperature" name="Temperature" stroke="#ef4444" strokeWidth={2} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardBody>
            </Card>

            <Card>
              <CardHeader>
                <h2 className="text-lg font-semibold flex items-center gap-2">
                  <Network size={18} className="text-green-500" />
                  Network Traffic (Last {timeRange} Hours)
                </h2>
              </CardHeader>
              <CardBody>
                <div className={`h-64 rounded-lg p-4 ${isDark ? 'bg-gradient-to-br from-slate-900 to-slate-800' : 'bg-gradient-to-br from-gray-50 to-white border border-gray-200'}`}>
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData}>
                      <defs>
                        <linearGradient id="networkInGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#10b981" stopOpacity={0.4}/>
                          <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                        </linearGradient>
                        <linearGradient id="networkOutGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.4}/>
                          <stop offset="95%" stopColor="#f59e0b" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#374151' : '#e5e7eb'} />
                      <XAxis dataKey="time" stroke={isDark ? '#9ca3af' : '#6b7280'} fontSize={11} />
                      <YAxis stroke={isDark ? '#9ca3af' : '#6b7280'} fontSize={11} tickFormatter={(v) => `${v} MB/s`} />
                      <Tooltip
                        contentStyle={{ backgroundColor: isDark ? '#1f2937' : '#ffffff', border: `1px solid ${isDark ? '#374151' : '#e5e7eb'}`, borderRadius: '8px', color: isDark ? '#fff' : '#111827' }}
                        labelStyle={{ color: isDark ? '#9ca3af' : '#6b7280' }}
                      />
                      <Legend wrapperStyle={{ color: isDark ? '#9ca3af' : '#6b7280' }} />
                      <Area type="monotone" dataKey="networkIn" name="Inbound" stroke="#10b981" fillOpacity={1} fill="url(#networkInGradient)" strokeWidth={2} />
                      <Area type="monotone" dataKey="networkOut" name="Outbound" stroke="#f59e0b" fillOpacity={1} fill="url(#networkOutGradient)" strokeWidth={2} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </CardBody>
            </Card>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card className={isDark ? 'bg-gradient-to-br from-blue-950/40 to-blue-900/20 border-blue-800/30' : 'bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200'}>
                <CardBody className="text-center">
                  <Cpu size={32} className="mx-auto mb-2 text-blue-500" />
                  <div className={`text-2xl font-bold ${isDark ? 'text-blue-400' : 'text-blue-700'}`}>{metricsData?.current.cpu_usage || 0}%</div>
                  <div className={`text-sm ${isDark ? 'text-blue-400/70' : 'text-blue-600'}`}>CPU Usage</div>
                </CardBody>
              </Card>
              <Card className={isDark ? 'bg-gradient-to-br from-purple-950/40 to-purple-900/20 border-purple-800/30' : 'bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200'}>
                <CardBody className="text-center">
                  <HardDrive size={32} className="mx-auto mb-2 text-purple-500" />
                  <div className={`text-2xl font-bold ${isDark ? 'text-purple-400' : 'text-purple-700'}`}>{metricsData?.current.memory_usage || 0}%</div>
                  <div className={`text-sm ${isDark ? 'text-purple-400/70' : 'text-purple-600'}`}>Memory Usage</div>
                </CardBody>
              </Card>
              <Card className={isDark ? 'bg-gradient-to-br from-red-950/40 to-red-900/20 border-red-800/30' : 'bg-gradient-to-br from-red-50 to-red-100 border-red-200'}>
                <CardBody className="text-center">
                  <Thermometer size={32} className="mx-auto mb-2 text-red-500" />
                  <div className={`text-2xl font-bold ${isDark ? 'text-red-400' : 'text-red-700'}`}>{metricsData?.current.temperature || 0}°C</div>
                  <div className={`text-sm ${isDark ? 'text-red-400/70' : 'text-red-600'}`}>Temperature</div>
                </CardBody>
              </Card>
              <Card className={isDark ? 'bg-gradient-to-br from-green-950/40 to-green-900/20 border-green-800/30' : 'bg-gradient-to-br from-green-50 to-green-100 border-green-200'}>
                <CardBody className="text-center">
                  <Clock size={32} className="mx-auto mb-2 text-green-500" />
                  <div className={`text-2xl font-bold ${isDark ? 'text-green-400' : 'text-green-700'}`}>{metricsData?.current.uptime_formatted || 'N/A'}</div>
                  <div className={`text-sm ${isDark ? 'text-green-400/70' : 'text-green-600'}`}>Uptime</div>
                </CardBody>
              </Card>
            </div>
          </div>
        </TabPanel>

        <TabPanel value="alerts">
          <Card>
            <CardHeader className="flex justify-between items-center">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <Bell size={18} className="text-yellow-500" />
                Alert Configurations
              </h2>
              <Button
                leftIcon={<Plus size={16} />}
                onClick={() => {
                  resetAlertForm();
                  setEditingAlert(null);
                  setIsAlertModalOpen(true);
                }}
              >
                Add Alert
              </Button>
            </CardHeader>
            <CardBody>
              {alertConfigs.length > 0 ? (
                <div className="space-y-3">
                  {alertConfigs.map((alert) => (
                    <div key={alert.id} className={`p-4 rounded-lg border ${alert.enabled ? 'bg-white border-gray-200' : 'bg-gray-50 border-gray-200 opacity-60'}`}>
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold">{alert.name}</span>
                            <Badge variant={alert.severity === 'critical' ? 'danger' : 'warning'}>
                              {alert.severity}
                            </Badge>
                            {!alert.enabled && <Badge variant="secondary">Disabled</Badge>}
                          </div>
                          <div className="text-sm text-gray-600 mt-1">
                            Trigger when <span className="font-mono bg-gray-100 px-1 rounded">{alert.metric}</span>
                            {' '}{alert.condition === 'gt' ? '>' : alert.condition === 'lt' ? '<' : alert.condition === 'eq' ? '=' : '!='}{' '}
                            <span className="font-mono bg-gray-100 px-1 rounded">{alert.threshold}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openEditAlert(alert)}
                          >
                            <Settings size={14} />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteAlert(alert.id)}
                            className="text-red-600 hover:text-red-700"
                          >
                            <Trash2 size={14} />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 text-center py-8">No alert configurations. Click "Add Alert" to create one.</p>
              )}
            </CardBody>
          </Card>
        </TabPanel>

        <TabPanel value="history">
          <Card>
            <CardHeader>
              <h2 className="text-lg font-semibold">Device History & Logs</h2>
            </CardHeader>
            <CardBody>
              <div className="space-y-4">
                <div className="flex items-start gap-3 p-3 bg-green-50 rounded-lg border-l-4 border-green-500">
                  <div className="w-2 h-2 mt-2 bg-green-500 rounded-full"></div>
                  <div className="flex-1">
                    <div className="flex justify-between">
                      <span className="font-medium text-gray-900 dark:text-gray-100">Device Online</span>
                      <span className="text-xs text-gray-500">{device.lastSeen ? new Date(device.lastSeen).toLocaleString() : 'Now'}</span>
                    </div>
                    <p className="text-sm text-gray-600">Device is responding to health checks</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-3 bg-blue-50 rounded-lg border-l-4 border-blue-500">
                  <div className="w-2 h-2 mt-2 bg-blue-500 rounded-full"></div>
                  <div className="flex-1">
                    <div className="flex justify-between">
                      <span className="font-medium text-gray-900 dark:text-gray-100">Metrics Updated</span>
                      <span className="text-xs text-gray-500">{device.lastSeen ? new Date(device.lastSeen).toLocaleString() : 'Recently'}</span>
                    </div>
                    <p className="text-sm text-gray-600">CPU: {metricsData?.current.cpu_usage || device.metrics?.cpuUsage || 0}%, Memory: {metricsData?.current.memory_usage || device.metrics?.memoryUsage || 0}%</p>
                  </div>
                </div>
                {device.createdAt && (
                  <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg border-l-4 border-gray-400">
                    <div className="w-2 h-2 mt-2 bg-gray-400 rounded-full"></div>
                    <div className="flex-1">
                      <div className="flex justify-between">
                        <span className="font-medium text-gray-900 dark:text-gray-100">Device Created</span>
                        <span className="text-xs text-gray-500">{new Date(device.createdAt).toLocaleString()}</span>
                      </div>
                      <p className="text-sm text-gray-600">Device was added to monitoring</p>
                    </div>
                  </div>
                )}
              </div>
            </CardBody>
          </Card>
        </TabPanel>
      </Tabs>

      <Modal
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setEditingDevice(null);
        }}
        title="Edit Network Device"
        size="lg"
      >
        {device && editingDevice && (
          <div className="space-y-4">
            <Input
              label="Device Name"
              value={editingDevice?.name || device.name}
              onChange={(e) => setEditingDevice({ ...(editingDevice || {}), name: e.target.value })}
            />
            <div className="grid grid-cols-2 gap-4">
              <Select
                label="Device Type"
                value={editingDevice?.type || device.type}
                onChange={(e) => setEditingDevice({ ...(editingDevice || {}), type: e.target.value })}
                options={[
                  { value: 'router', label: 'Router' },
                  { value: 'switch', label: 'Switch' },
                  { value: 'firewall', label: 'Firewall' },
                  { value: 'load_balancer', label: 'Load Balancer' },
                  { value: 'access_point', label: 'Access Point' },
                  { value: 'gateway', label: 'Gateway' },
                  { value: 'server', label: 'Server' },
                  { value: 'other', label: 'Other' },
                ]}
              />
              <Select
                label="Status"
                value={editingDevice?.status || device.status}
                onChange={(e) => setEditingDevice({ ...(editingDevice || {}), status: e.target.value as NetworkDevice['status'] })}
                options={[
                  { value: 'healthy', label: 'Healthy' },
                  { value: 'warning', label: 'Warning' },
                  { value: 'critical', label: 'Critical' },
                  { value: 'maintenance', label: 'Maintenance' },
                  { value: 'unknown', label: 'Unknown' },
                ]}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="IP Address"
                value={editingDevice?.ipAddress || device.ipAddress}
                onChange={(e) => setEditingDevice({ ...(editingDevice || {}), ipAddress: e.target.value })}
              />
              <Input
                label="MAC Address"
                value={editingDevice?.macAddress || device.macAddress || ''}
                onChange={(e) => setEditingDevice({ ...(editingDevice || {}), macAddress: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Manufacturer"
                value={editingDevice?.manufacturer || device.manufacturer || ''}
                onChange={(e) => setEditingDevice({ ...(editingDevice || {}), manufacturer: e.target.value })}
              />
              <Input
                label="Model"
                value={editingDevice?.model || device.model || ''}
                onChange={(e) => setEditingDevice({ ...(editingDevice || {}), model: e.target.value })}
              />
            </div>
            <Input
              label="Location"
              value={editingDevice?.location || device.location || ''}
              onChange={(e) => setEditingDevice({ ...(editingDevice || {}), location: e.target.value })}
            />
            <Textarea
              label="Description"
              value={editingDevice?.description || device.description || ''}
              onChange={(e) => setEditingDevice({ ...(editingDevice || {}), description: e.target.value })}
              rows={3}
            />
            <div className="flex justify-end gap-3 pt-4">
              <Button
                variant="outline"
                onClick={() => {
                  setIsEditModalOpen(false);
                  setEditingDevice(null);
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={async () => {
                  try {
                    setIsSaving(true);
                    if (device && editingDevice) {
                      const updated = await networkService.updateDevice(device.id, editingDevice);
                      setDevice(updated);
                      setIsEditModalOpen(false);
                      setEditingDevice(null);
                      toast.success('Device updated successfully');
                    }
                  } catch (error) {
                    toast.error('Failed to update device');
                  } finally {
                    setIsSaving(false);
                  }
                }}
                isLoading={isSaving}
              >
                Save Changes
              </Button>
            </div>
          </div>
        )}
      </Modal>

      <Modal
        isOpen={isAlertModalOpen}
        onClose={() => {
          setIsAlertModalOpen(false);
          setEditingAlert(null);
          resetAlertForm();
        }}
        title={editingAlert ? 'Edit Alert Configuration' : 'Add Alert Configuration'}
        size="md"
      >
        <div className="space-y-4">
          <Input
            label="Alert Name"
            value={alertForm.name}
            onChange={(e) => setAlertForm({ ...alertForm, name: e.target.value })}
            placeholder="e.g., High CPU Alert"
          />
          <Select
            label="Metric"
            value={alertForm.metric}
            onChange={(e) => setAlertForm({ ...alertForm, metric: e.target.value })}
            options={[
              { value: 'cpu_usage', label: 'CPU Usage (%)' },
              { value: 'memory_usage', label: 'Memory Usage (%)' },
              { value: 'disk_usage', label: 'Disk Usage (%)' },
              { value: 'temperature', label: 'Temperature (°C)' },
              { value: 'interface_status', label: 'Interface Status' },
              { value: 'packet_loss', label: 'Packet Loss (%)' },
              { value: 'latency', label: 'Latency (ms)' },
            ]}
          />
          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Condition"
              value={alertForm.condition}
              onChange={(e) => setAlertForm({ ...alertForm, condition: e.target.value as CreateAlertConfig['condition'] })}
              options={[
                { value: 'gt', label: 'Greater than (>)' },
                { value: 'lt', label: 'Less than (<)' },
                { value: 'eq', label: 'Equal to (=)' },
                { value: 'ne', label: 'Not equal to (!=)' },
              ]}
            />
            <Input
              label="Threshold"
              type="number"
              value={alertForm.threshold}
              onChange={(e) => setAlertForm({ ...alertForm, threshold: Number(e.target.value) })}
            />
          </div>
          <Select
            label="Severity"
            value={alertForm.severity}
            onChange={(e) => setAlertForm({ ...alertForm, severity: e.target.value as CreateAlertConfig['severity'] })}
            options={[
              { value: 'warning', label: 'Warning' },
              { value: 'critical', label: 'Critical' },
            ]}
          />
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="alertEnabled"
              checked={alertForm.enabled}
              onChange={(e) => setAlertForm({ ...alertForm, enabled: e.target.checked })}
              className="w-4 h-4 text-blue-600 rounded border-gray-300"
            />
            <label htmlFor="alertEnabled" className="text-sm text-gray-700">Enable this alert</label>
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <Button
              variant="outline"
              onClick={() => {
                setIsAlertModalOpen(false);
                setEditingAlert(null);
                resetAlertForm();
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSaveAlert}
              isLoading={isSaving}
            >
              {editingAlert ? 'Update Alert' : 'Create Alert'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default NetworkDeviceDetailPage;
