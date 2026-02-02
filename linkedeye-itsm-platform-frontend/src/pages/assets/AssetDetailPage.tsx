import { useState, useEffect } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { format, toZonedTime } from 'date-fns-tz';
import {
  ArrowLeft,
  Edit,
  Server,
  Database,
  Cloud,
  Network,
  HardDrive,
  RefreshCw,
  History,
  Trash2,
  BellOff,
  Bell,
  Clock,
  Activity,
  AlertTriangle,
  GitBranch,
  ChevronRight,
  Info,
  ArrowUp,
  ArrowDown,
  Check,
  Cpu,
  MemoryStick,
  Wifi,
  Shield,
} from 'lucide-react';
import { Modal, Input, Select, Textarea } from '@/components/ui';
import { AlertSuppressionModal } from '@/components/notifications';
import { useAppSelector } from '@/hooks/useRedux';
import { assetService } from '@/services/assetService';
import alertSuppressionService from '@/services/alertSuppressionService';
import monitoringService, { MonitoringAlert } from '@/services/monitoringService';
import { Asset, AssetSuppressionStatus } from '@/types';
import toast from 'react-hot-toast';
import clsx from 'clsx';
import { formatDistanceToNow } from 'date-fns';

const AssetDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { theme } = useAppSelector((state) => state.ui);
  const isDark = theme === 'dark';
  const [asset, setAsset] = useState<Asset | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingAsset, setEditingAsset] = useState<Partial<Asset> | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isSuppressionModalOpen, setIsSuppressionModalOpen] = useState(false);
  const [suppressionStatus, setSuppressionStatus] = useState<AssetSuppressionStatus | null>(null);
  const [activeTab, setActiveTab] = useState('relationships');
  const [alerts, setAlerts] = useState<MonitoringAlert[]>([]);
  const [alertsLoading, setAlertsLoading] = useState(false);

  useEffect(() => {
    const fetchAsset = async () => {
      if (!id) return;
      try {
        setIsLoading(true);
        const data = await assetService.getAssetById(id);
        setAsset(data);
        loadSuppressionStatus(id);
        loadAlerts(id);
      } catch (error) {
        console.error('Failed to fetch asset:', error);
        toast.error('Failed to load asset details');
        navigate('/assets');
      } finally {
        setIsLoading(false);
      }
    };

    fetchAsset();
  }, [id, navigate]);

  const loadAlerts = async (assetId: string) => {
    try {
      setAlertsLoading(true);
      const alertsData = await monitoringService.getAlertsByAsset(assetId, { limit: 10 });
      setAlerts(alertsData);
    } catch (error) {
      console.error('Failed to load alerts:', error);
      setAlerts([]);
    } finally {
      setAlertsLoading(false);
    }
  };

  const loadSuppressionStatus = async (assetId: string) => {
    try {
      const status = await alertSuppressionService.getAssetSuppressionStatus(assetId);
      setSuppressionStatus(status);
    } catch (error) {
      setSuppressionStatus(null);
    }
  };

  const handleEdit = () => {
    if (asset) {
      setEditingAsset({ ...asset });
      setIsEditModalOpen(true);
    }
  };

  const handleSave = async () => {
    if (!id || !editingAsset) return;

    try {
      setIsSaving(true);
      const updated = await assetService.updateAsset(id, editingAsset);
      setAsset(updated);
      setIsEditModalOpen(false);
      toast.success('Asset updated successfully');
    } catch (error) {
      console.error('Failed to update asset:', error);
      toast.error('Failed to update asset');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!id || !confirm('Are you sure you want to delete this asset?')) return;

    try {
      await assetService.deleteAsset(id);
      toast.success('Asset deleted successfully');
      navigate('/assets');
    } catch (error) {
      console.error('Failed to delete asset:', error);
      toast.error('Failed to delete asset');
    }
  };

  const getAssetIcon = (type?: string) => {
    const iconMap: Record<string, React.ReactNode> = {
      server: <Server size={36} />,
      virtual_machine: <Server size={36} />,
      database: <Database size={36} />,
      network_device: <Network size={36} />,
      storage: <HardDrive size={36} />,
      application: <Cloud size={36} />,
      service: <Cloud size={36} />,
    };
    return iconMap[type?.toLowerCase() || 'server'] || <Server size={36} />;
  };

  const getIconGradient = (type?: string) => {
    const gradientMap: Record<string, string> = {
      server: 'from-blue-500 to-blue-600',
      virtual_machine: 'from-indigo-500 to-indigo-600',
      database: 'from-purple-500 to-purple-600',
      network_device: 'from-green-500 to-green-600',
      storage: 'from-gray-500 to-gray-600',
      application: 'from-amber-500 to-amber-600',
      service: 'from-amber-500 to-amber-600',
    };
    return gradientMap[type?.toLowerCase() || 'server'] || 'from-blue-500 to-blue-600';
  };

  // Sample data (in real app, would come from API)
  const quickStats = {
    cpu: asset?.specifications?.cpu ? 23 : '--',
    cpuAvg: 18,
    memory: asset?.specifications?.memory ? 67 : '--',
    memoryTotal: asset?.specifications?.memory || 64,
    networkIn: 450,
    networkOut: 320,
    openIncidents: 1,
    pendingChanges: 2,
  };

  // Helper function to get alert type for styling
  const getAlertType = (severity: string): 'critical' | 'warning' | 'info' => {
    if (severity === 'critical' || severity === 'high') return 'critical';
    if (severity === 'medium') return 'warning';
    return 'info';
  };

  const sampleRelationships = {
    dependsOn: [
      { id: '2', hostname: 'prod-db-01', type: 'PostgreSQL Database', relation: 'Database' },
      { id: '7', hostname: 'redis-cache-01', type: 'Redis Database', relation: 'Cache' },
    ],
    usedBy: [
      { id: '5', hostname: 'api-gateway', type: 'AWS EKS Cluster', relation: 'API Gateway' },
      { id: '10', hostname: 'k8s-worker-01', type: 'AWS EC2 Instance', relation: 'Worker Node' },
    ],
  };

  const sampleIncidents = [
    { id: 'INC-2024-0456', title: 'High CPU utilization alert', priority: 'high', status: 'resolved', created: '2024-12-20' },
    { id: 'INC-2024-0423', title: 'Memory threshold exceeded', priority: 'medium', status: 'resolved', created: '2024-12-15' },
  ];

  const sampleChanges = [
    { id: 'CHG-2024-0089', title: 'OS security patches', type: 'standard', status: 'completed', scheduled: '2024-12-22' },
    { id: 'CHG-2024-0076', title: 'Application upgrade v2.5', type: 'normal', status: 'scheduled', scheduled: '2025-01-05' },
  ];

  const sampleTimeline = [
    { icon: <Check size={10} />, title: 'Health check passed', time: '2 minutes ago' },
    { icon: <RefreshCw size={10} />, title: 'Metrics collected', time: '5 minutes ago' },
    { icon: <MemoryStick size={10} />, title: 'Memory usage: 67%', time: '10 minutes ago' },
    { icon: <Server size={10} />, title: 'Service restarted', time: '2 hours ago' },
    { icon: <Shield size={10} />, title: 'Security scan completed', time: '6 hours ago' },
  ];

  const tabs = [
    { id: 'relationships', label: 'Relationships' },
    { id: 'incidents', label: 'Related Incidents' },
    { id: 'changes', label: 'Related Changes' },
    { id: 'timeline', label: 'Activity Timeline' },
    { id: 'metrics', label: 'All Metrics' },
  ];

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <div className="flex flex-col items-center">
          <div className="w-10 h-10 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mb-4" />
          <p className="text-gray-500">Loading asset details...</p>
        </div>
      </div>
    );
  }

  if (!asset) {
    return (
      <div className="text-center py-12">
        <Server size={64} className="text-gray-300 mx-auto mb-4" />
        <p className="text-gray-500 text-lg">Asset not found</p>
        <Link to="/assets" className="text-blue-600 mt-4 inline-block hover:underline">
          Back to Assets
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm text-gray-500">
        <Link to="/" className="hover:text-blue-600">Home</Link>
        <ChevronRight size={14} />
        <Link to="/assets" className="hover:text-blue-600">Assets</Link>
        <ChevronRight size={14} />
        <span className="text-gray-900">{asset.name}</span>
      </nav>

      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link
            to="/assets"
            className="w-10 h-10 border rounded-lg flex items-center justify-center hover:text-blue-600 hover:border-blue-500 transition-all"
            style={{ background: isDark ? 'rgba(255,255,255,0.03)' : '#ffffff', borderColor: isDark ? 'rgba(255,255,255,0.08)' : '#e5e8eb', color: isDark ? '#94a3b8' : '#6b7280' }}
          >
            <ArrowLeft size={18} />
          </Link>
          <h1 className="text-2xl font-bold" style={{ color: isDark ? '#f8fafc' : '#0f1c3f' }}>{asset.name}</h1>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => toast.success('Refreshing metrics...')}
            className="px-4 py-2 border border-gray-200 bg-white rounded-lg text-sm font-medium flex items-center gap-2 hover:bg-gray-50 transition-all"
          >
            <RefreshCw size={16} />
            Refresh Metrics
          </button>
          <button className="px-4 py-2 border border-gray-200 bg-white rounded-lg text-sm font-medium flex items-center gap-2 hover:bg-gray-50 transition-all">
            <History size={16} />
            History
          </button>
          <button
            onClick={handleEdit}
            className="px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg text-sm font-medium flex items-center gap-2 hover:shadow-lg hover:shadow-blue-500/30 transition-all"
          >
            <Edit size={16} />
            Edit Asset
          </button>
        </div>
      </div>

      {/* Asset Header Card */}
      <div className="border rounded-xl p-6" style={{ background: isDark ? 'rgba(17, 28, 50, 0.95)' : '#ffffff', borderColor: isDark ? 'rgba(255,255,255,0.08)' : '#e5e8eb' }}>
        <div className="flex justify-between items-start">
          <div className="flex gap-5">
            <div className={clsx(
              'w-20 h-20 rounded-2xl bg-gradient-to-br flex items-center justify-center text-white',
              getIconGradient(asset.assetType)
            )}>
              {getAssetIcon(asset.assetType)}
            </div>
            <div>
              <h2 className="text-2xl font-bold mb-1" style={{ color: isDark ? '#f8fafc' : '#0f1c3f' }}>{asset.name}</h2>
              <p className="text-gray-500 text-sm mb-3">
                {asset.assetType?.replace('_', ' ')} {asset.manufacturer && `• ${asset.manufacturer} ${asset.model || ''}`}
              </p>
              <div className="flex gap-2 flex-wrap">
                <span className={clsx(
                  'px-3 py-1 rounded-full text-xs font-semibold',
                  asset.status === 'active' && 'bg-green-100 text-green-700',
                  asset.status === 'inactive' && 'bg-red-100 text-red-700',
                  asset.status === 'maintenance' && 'bg-amber-100 text-amber-700',
                  !['active', 'inactive', 'maintenance'].includes(asset.status) && 'bg-gray-100 text-gray-700'
                )}>
                  {asset.status === 'active' ? 'Online' : asset.status === 'maintenance' ? 'Maintenance' : asset.status === 'inactive' ? 'Offline' : asset.status}
                </span>
                <OwnershipBadgeLarge ownershipType={(asset as any).ownership_type} />
                <span className="px-3 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-700">
                  {asset.environment?.name || 'Production'}
                </span>
                <span className="px-3 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-600">
                  {asset.location || '-'}
                </span>
              </div>
            </div>
          </div>
          <div className="text-right">
            <div className="flex items-center justify-end gap-2 mb-2">
              <span className={clsx(
                'w-3 h-3 rounded-full',
                asset.status === 'active' && 'bg-green-500 animate-pulse',
                asset.status === 'inactive' && 'bg-red-500',
                asset.status === 'maintenance' && 'bg-amber-500'
              )} />
              <span className={clsx(
                'font-semibold',
                asset.status === 'active' && 'text-green-600',
                asset.status === 'inactive' && 'text-red-600',
                asset.status === 'maintenance' && 'text-amber-600'
              )}>
                {asset.status === 'active' ? 'Operational' : asset.status === 'maintenance' ? 'Under Maintenance' : 'Not Responding'}
              </span>
            </div>
            <div className="text-sm text-gray-500 flex items-center justify-end gap-1.5">
              <Clock size={14} />
              Uptime: N/A
            </div>
            <div className="text-sm text-gray-500 flex items-center justify-end gap-1.5 mt-1">
              <RefreshCw size={14} />
              Last polled: {format(toZonedTime(new Date(asset.updatedAt), 'Asia/Kolkata'), 'MMM d, HH:mm', { timeZone: 'Asia/Kolkata' })}
            </div>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-6 gap-4 mt-6 pt-6 border-t border-gray-200">
          <QuickStat label="CPU Utilization" value={`${quickStats.cpu}%`} />
          <QuickStat label="Memory Usage" value={`${quickStats.memory}%`} />
          <QuickStat label="Network In (Mbps)" value={String(quickStats.networkIn)} variant="success" />
          <QuickStat label="Network Out (Mbps)" value={String(quickStats.networkOut)} />
          <QuickStat label="Open Incidents" value={String(quickStats.openIncidents)} variant="warning" />
          <QuickStat label="Pending Changes" value={String(quickStats.pendingChanges)} />
        </div>
      </div>

      {/* Content Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-[2fr_1fr] gap-6">
        {/* Left Column - Performance Metrics */}
        <div className="border rounded-xl" style={{ background: isDark ? 'rgba(17, 28, 50, 0.95)' : '#ffffff', borderColor: isDark ? 'rgba(255,255,255,0.08)' : '#e5e8eb' }}>
          <div className="p-4 border-b flex justify-between items-center" style={{ borderColor: isDark ? 'rgba(255,255,255,0.08)' : '#e5e8eb' }}>
            <h3 className="font-semibold text-sm flex items-center gap-2" style={{ color: isDark ? '#f8fafc' : '#0f1c3f' }}>
              <Activity size={16} className="text-blue-500" />
              Performance Metrics
            </h3>
            <select className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-500">
              <option>Last 1 Hour</option>
              <option selected>Last 6 Hours</option>
              <option>Last 24 Hours</option>
              <option>Last 7 Days</option>
            </select>
          </div>
          <div className="p-5 space-y-6">
            {/* CPU Chart Placeholder */}
            <div>
              <div className="flex justify-between items-center mb-3">
                <span className="text-sm font-medium text-gray-700">CPU Utilization</span>
                <span className="text-lg font-bold">{quickStats.cpu}% <span className="text-sm text-gray-500 font-normal">avg: {quickStats.cpuAvg}%</span></span>
              </div>
              <div className="h-36 bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg flex items-center justify-center">
                <Cpu size={48} className="text-blue-300" />
              </div>
            </div>

            {/* Memory Chart Placeholder */}
            <div>
              <div className="flex justify-between items-center mb-3">
                <span className="text-sm font-medium text-gray-700">Memory Usage</span>
                <span className="text-lg font-bold">{quickStats.memory}% <span className="text-sm text-gray-500 font-normal">of {quickStats.memoryTotal} GB</span></span>
              </div>
              <div className="h-36 bg-gradient-to-br from-green-50 to-green-100 rounded-lg flex items-center justify-center">
                <MemoryStick size={48} className="text-green-300" />
              </div>
            </div>

            {/* Network Chart Placeholder */}
            <div>
              <div className="flex justify-between items-center mb-3">
                <span className="text-sm font-medium text-gray-700">Network Traffic</span>
                <span className="text-lg font-bold">{quickStats.networkIn} Mbps <span className="text-sm text-gray-500 font-normal">peak: 780 Mbps</span></span>
              </div>
              <div className="h-36 bg-gradient-to-br from-amber-50 to-amber-100 rounded-lg flex items-center justify-center">
                <Wifi size={48} className="text-amber-300" />
              </div>
            </div>
          </div>
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          {/* Asset Information */}
          <div className="border rounded-xl" style={{ background: isDark ? 'rgba(17, 28, 50, 0.95)' : '#ffffff', borderColor: isDark ? 'rgba(255,255,255,0.08)' : '#e5e8eb' }}>
            <div className="p-4 border-b" style={{ borderColor: isDark ? 'rgba(255,255,255,0.08)' : '#e5e8eb' }}>
              <h3 className="font-semibold text-sm flex items-center gap-2" style={{ color: isDark ? '#f8fafc' : '#0f1c3f' }}>
                <Info size={16} className="text-blue-500" />
                Asset Information
              </h3>
            </div>
            <div className="p-4">
              <div className="grid grid-cols-2 gap-3">
                <InfoItem label="IP Address" value={asset.ipAddress || '-'} />
                <InfoItem label="MAC Address" value={asset.macAddress || '-'} />
                <InfoItem label="Serial Number" value={asset.serialNumber || '-'} />
                <InfoItem label="Model" value={asset.model || '-'} />
                <InfoItem label="OS / Version" value={asset.operatingSystem || '-'} />
                <InfoItem label="Location" value={asset.location || '-'} />
                <InfoItem label="Owner" value={asset.assignedTo?.displayName || '-'} />
                <InfoItem label="Environment" value={asset.environment?.name || '-'} />
              </div>
            </div>
          </div>

          {/* Recent Alerts */}
          <div className="border rounded-xl" style={{ background: isDark ? 'rgba(17, 28, 50, 0.95)' : '#ffffff', borderColor: isDark ? 'rgba(255,255,255,0.08)' : '#e5e8eb' }}>
            <div className="p-4 border-b flex justify-between items-center" style={{ borderColor: isDark ? 'rgba(255,255,255,0.08)' : '#e5e8eb' }}>
              <h3 className="font-semibold text-sm flex items-center gap-2">
                <Bell size={16} className="text-blue-500" />
                Recent Alerts ({alerts.length})
              </h3>
              <Link to="/monitoring" className="text-xs text-blue-600 hover:underline">View All</Link>
            </div>
            <div className="p-4 space-y-2">
              {alertsLoading ? (
                <div className="text-center py-4">
                  <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto" />
                  <p className="text-xs text-gray-500 mt-2">Loading alerts...</p>
                </div>
              ) : alerts.length === 0 ? (
                <div className="text-center py-4 text-gray-500 text-sm">
                  No alerts for this asset
                </div>
              ) : (
                alerts.slice(0, 5).map((alert) => {
                  const alertType = getAlertType(alert.severity);
                  return (
                    <div
                      key={alert.id}
                      className={clsx(
                        'flex gap-3 p-3 rounded-lg border-l-[3px]',
                        alertType === 'critical' && 'bg-red-50 border-red-500',
                        alertType === 'warning' && 'bg-amber-50 border-amber-500',
                        alertType === 'info' && 'bg-blue-50 border-blue-500'
                      )}
                    >
                      <div className={clsx(
                        'w-8 h-8 rounded-lg flex items-center justify-center text-white',
                        alertType === 'critical' && 'bg-red-500',
                        alertType === 'warning' && 'bg-amber-500',
                        alertType === 'info' && 'bg-blue-500'
                      )}>
                        <AlertTriangle size={14} />
                      </div>
                      <div className="flex-1">
                        <div className="text-sm font-semibold text-gray-900">{alert.name}</div>
                        <div className="text-xs text-gray-500">
                          {alert.message || alert.severity} &bull; {formatDistanceToNow(new Date(alert.startsAt), { addSuffix: true })}
                        </div>
                      </div>
                      <span className={clsx(
                        'text-[10px] px-2 py-1 rounded-full font-medium self-start',
                        alert.status === 'firing' && 'bg-red-100 text-red-700',
                        alert.status === 'acknowledged' && 'bg-yellow-100 text-yellow-700',
                        alert.status === 'resolved' && 'bg-green-100 text-green-700'
                      )}>
                        {alert.status}
                      </span>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Tabbed Section */}
      <div className="border rounded-xl overflow-hidden" style={{ background: isDark ? 'rgba(17, 28, 50, 0.95)' : '#ffffff', borderColor: isDark ? 'rgba(255,255,255,0.08)' : '#e5e8eb' }}>
        {/* Tabs */}
        <div className="flex border-b" style={{ background: isDark ? 'rgba(255,255,255,0.03)' : '#f9fafb', borderColor: isDark ? 'rgba(255,255,255,0.08)' : '#e5e8eb' }}>
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={clsx(
                'px-5 py-3 text-sm font-medium border-b-2 transition-all',
                activeTab === tab.id
                  ? 'text-blue-600 border-blue-600 bg-white'
                  : 'text-gray-500 border-transparent hover:text-gray-700'
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="p-5">
          {/* Relationships Tab */}
          {activeTab === 'relationships' && (
            <div className="grid grid-cols-2 gap-6">
              <div>
                <h4 className="text-sm font-semibold text-gray-500 mb-3 flex items-center gap-2">
                  <ArrowUp size={14} />
                  Depends On
                </h4>
                <div className="space-y-2">
                  {sampleRelationships.dependsOn.map((rel) => (
                    <RelationshipItem key={rel.id} {...rel} />
                  ))}
                </div>
              </div>
              <div>
                <h4 className="text-sm font-semibold text-gray-500 mb-3 flex items-center gap-2">
                  <ArrowDown size={14} />
                  Used By
                </h4>
                <div className="space-y-2">
                  {sampleRelationships.usedBy.map((rel) => (
                    <RelationshipItem key={rel.id} {...rel} />
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Related Incidents Tab */}
          {activeTab === 'incidents' && (
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 text-[11px] font-semibold text-gray-500 uppercase">Incident ID</th>
                  <th className="text-left py-3 text-[11px] font-semibold text-gray-500 uppercase">Title</th>
                  <th className="text-left py-3 text-[11px] font-semibold text-gray-500 uppercase">Priority</th>
                  <th className="text-left py-3 text-[11px] font-semibold text-gray-500 uppercase">Status</th>
                  <th className="text-left py-3 text-[11px] font-semibold text-gray-500 uppercase">Created</th>
                </tr>
              </thead>
              <tbody>
                {sampleIncidents.map((inc) => (
                  <tr key={inc.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-3"><Link to="#" className="text-blue-600 text-sm hover:underline">{inc.id}</Link></td>
                    <td className="py-3 text-sm">{inc.title}</td>
                    <td className="py-3">
                      <span className={clsx(
                        'px-2 py-1 rounded text-[10px] font-semibold uppercase',
                        inc.priority === 'critical' && 'bg-red-100 text-red-700',
                        inc.priority === 'high' && 'bg-orange-100 text-orange-700',
                        inc.priority === 'medium' && 'bg-amber-100 text-amber-700',
                        inc.priority === 'low' && 'bg-green-100 text-green-700'
                      )}>
                        {inc.priority}
                      </span>
                    </td>
                    <td className="py-3">
                      <span className={clsx(
                        'px-2 py-1 rounded text-[10px] font-medium',
                        inc.status === 'resolved' && 'bg-green-100 text-green-700',
                        inc.status === 'open' && 'bg-blue-100 text-blue-700'
                      )}>
                        {inc.status}
                      </span>
                    </td>
                    <td className="py-3 text-sm text-gray-500">{inc.created}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {/* Related Changes Tab */}
          {activeTab === 'changes' && (
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 text-[11px] font-semibold text-gray-500 uppercase">Change ID</th>
                  <th className="text-left py-3 text-[11px] font-semibold text-gray-500 uppercase">Title</th>
                  <th className="text-left py-3 text-[11px] font-semibold text-gray-500 uppercase">Type</th>
                  <th className="text-left py-3 text-[11px] font-semibold text-gray-500 uppercase">Status</th>
                  <th className="text-left py-3 text-[11px] font-semibold text-gray-500 uppercase">Scheduled</th>
                </tr>
              </thead>
              <tbody>
                {sampleChanges.map((chg) => (
                  <tr key={chg.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-3"><Link to="#" className="text-blue-600 text-sm hover:underline">{chg.id}</Link></td>
                    <td className="py-3 text-sm">{chg.title}</td>
                    <td className="py-3">
                      <span className={clsx(
                        'px-2 py-1 rounded text-[10px] font-medium',
                        chg.type === 'emergency' && 'bg-red-100 text-red-700',
                        chg.type === 'normal' && 'bg-blue-100 text-blue-700',
                        chg.type === 'standard' && 'bg-gray-100 text-gray-700'
                      )}>
                        {chg.type}
                      </span>
                    </td>
                    <td className="py-3">
                      <span className={clsx(
                        'px-2 py-1 rounded text-[10px] font-medium',
                        chg.status === 'completed' && 'bg-green-100 text-green-700',
                        chg.status === 'scheduled' && 'bg-blue-100 text-blue-700'
                      )}>
                        {chg.status}
                      </span>
                    </td>
                    <td className="py-3 text-sm text-gray-500">{chg.scheduled}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {/* Activity Timeline Tab */}
          {activeTab === 'timeline' && (
            <div className="relative pl-7">
              <div className="absolute left-2 top-0 bottom-0 w-0.5 bg-gray-200" />
              {sampleTimeline.map((item, index) => (
                <div key={index} className="relative pb-5 last:pb-0">
                  <div className="absolute -left-5 w-4 h-4 rounded-full bg-white border-2 border-blue-500 flex items-center justify-center text-blue-500">
                    {item.icon}
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3 ml-2">
                    <div className="text-sm font-semibold text-gray-900">{item.title}</div>
                    <div className="text-xs text-gray-500 mt-1">{item.time}</div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* All Metrics Tab */}
          {activeTab === 'metrics' && (
            <div className="grid grid-cols-2 gap-3">
              <MetricItem name="CPU Usage" value={`${quickStats.cpu}%`} />
              <MetricItem name="Memory Usage" value={`${quickStats.memory}%`} />
              <MetricItem name="Disk Usage" value="45%" />
              <MetricItem name="Network In" value={`${quickStats.networkIn} Mbps`} />
              <MetricItem name="Network Out" value={`${quickStats.networkOut} Mbps`} />
              <MetricItem name="Active Connections" value="1,234" />
              <MetricItem name="Process Count" value="156" />
              <MetricItem name="Load Average (1m)" value="2.45" />
              <MetricItem name="Load Average (5m)" value="2.12" />
              <MetricItem name="Load Average (15m)" value="1.89" />
              <MetricItem name="TCP Connections" value="892" />
              <MetricItem name="UDP Connections" value="45" />
            </div>
          )}
        </div>
      </div>

      {/* Edit Modal */}
      <Modal isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} title="Edit Asset" size="lg">
        {editingAsset && (
          <div className="space-y-4">
            <Input
              label="Asset Name"
              value={editingAsset.name || ''}
              onChange={(e) => setEditingAsset({ ...editingAsset, name: e.target.value })}
            />
            <div className="grid grid-cols-2 gap-4">
              <Select
                label="Type"
                value={editingAsset.assetType || ''}
                onChange={(e) => setEditingAsset({ ...editingAsset, assetType: e.target.value as Asset['assetType'] })}
                options={[
                  { value: 'server', label: 'Server' },
                  { value: 'workstation', label: 'Workstation' },
                  { value: 'laptop', label: 'Laptop' },
                  { value: 'network_device', label: 'Network Device' },
                  { value: 'storage', label: 'Storage' },
                  { value: 'virtual_machine', label: 'Virtual Machine' },
                  { value: 'application', label: 'Application' },
                  { value: 'database', label: 'Database' },
                  { value: 'service', label: 'Service' },
                  { value: 'other', label: 'Other' },
                ]}
              />
              <Select
                label="Status"
                value={editingAsset.status || ''}
                onChange={(e) => setEditingAsset({ ...editingAsset, status: e.target.value as Asset['status'] })}
                options={[
                  { value: 'active', label: 'Active' },
                  { value: 'inactive', label: 'Inactive' },
                  { value: 'maintenance', label: 'Maintenance' },
                  { value: 'retired', label: 'Retired' },
                ]}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="IP Address"
                value={editingAsset.ipAddress || ''}
                onChange={(e) => setEditingAsset({ ...editingAsset, ipAddress: e.target.value })}
              />
              <Input
                label="Location"
                value={editingAsset.location || ''}
                onChange={(e) => setEditingAsset({ ...editingAsset, location: e.target.value })}
              />
            </div>
            <Textarea
              label="Description"
              value={editingAsset.description || ''}
              onChange={(e) => setEditingAsset({ ...editingAsset, description: e.target.value })}
              rows={3}
            />
            <div className="flex justify-end gap-3 pt-4">
              <button
                onClick={() => setIsEditModalOpen(false)}
                className="px-4 py-2 border border-gray-200 bg-white rounded-lg text-sm font-medium hover:bg-gray-50 transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg text-sm font-medium hover:shadow-lg transition-all disabled:opacity-50"
              >
                {isSaving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Alert Suppression Modal */}
      {id && asset && (
        <AlertSuppressionModal
          isOpen={isSuppressionModalOpen}
          onClose={() => setIsSuppressionModalOpen(false)}
          targetType="asset"
          targetId={id}
          targetName={asset.name}
          targetIp={asset.ipAddress}
          onStatusChange={(status) => {
            setSuppressionStatus(status);
            if (status.is_suppressed) {
              toast.success('Alert suppression activated');
            } else {
              toast.success('Alert suppression removed');
            }
          }}
        />
      )}
    </div>
  );
};

// Quick Stat Component
interface QuickStatProps {
  label: string;
  value: string;
  variant?: 'default' | 'success' | 'warning' | 'danger';
}

const QuickStat = ({ label, value, variant = 'default' }: QuickStatProps) => (
  <div className="text-center">
    <div className={clsx(
      'text-2xl font-bold',
      variant === 'success' && 'text-green-600',
      variant === 'warning' && 'text-amber-600',
      variant === 'danger' && 'text-red-600',
      variant === 'default' && 'text-gray-900'
    )}>
      {value}
    </div>
    <div className="text-xs text-gray-500 mt-1">{label}</div>
  </div>
);

// Info Item Component
interface InfoItemProps {
  label: string;
  value: string;
}

const InfoItem = ({ label, value }: InfoItemProps) => (
  <div className="p-3 bg-gray-50 rounded-lg">
    <div className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1">{label}</div>
    <div className="text-sm font-medium text-gray-900">{value}</div>
  </div>
);

// Relationship Item Component
interface RelationshipItemProps {
  id: string;
  hostname: string;
  type: string;
  relation: string;
}

const RelationshipItem = ({ id, hostname, type, relation }: RelationshipItemProps) => (
  <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
    <div className="w-10 h-10 bg-gray-200 rounded-lg flex items-center justify-center">
      <Server size={16} className="text-gray-500" />
    </div>
    <div className="flex-1">
      <Link to={`/assets/${id}`} className="text-sm font-semibold text-blue-600 hover:underline">{hostname}</Link>
      <div className="text-xs text-gray-500">{type}</div>
    </div>
    <span className="text-[10px] text-gray-500 bg-gray-200 px-2 py-1 rounded">{relation}</span>
  </div>
);

// Metric Item Component
interface MetricItemProps {
  name: string;
  value: string;
}

const MetricItem = ({ name, value }: MetricItemProps) => (
  <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
    <span className="text-sm text-gray-600">{name}</span>
    <span className="text-sm font-semibold text-gray-900">{value}</span>
  </div>
);

// Ownership Badge Component - Larger version for detail page
interface OwnershipBadgeLargeProps {
  ownershipType?: string;
}

const OwnershipBadgeLarge = ({ ownershipType }: OwnershipBadgeLargeProps) => {
  if (!ownershipType) return null;

  const config: Record<string, { bgColor: string; textColor: string; label: string }> = {
    finspot_owned: { bgColor: 'bg-blue-100', textColor: 'text-blue-700', label: 'FinSpot Owned' },
    client_hosted: { bgColor: 'bg-gray-100', textColor: 'text-gray-700', label: 'Client Hosted' },
    leased: { bgColor: 'bg-amber-100', textColor: 'text-amber-700', label: 'Leased' },
    shared: { bgColor: 'bg-purple-100', textColor: 'text-purple-700', label: 'Shared' },
  };

  const badge = config[ownershipType] || { bgColor: 'bg-gray-100', textColor: 'text-gray-700', label: ownershipType };

  return (
    <span className={clsx(
      'px-3 py-1 rounded-full text-xs font-semibold',
      badge.bgColor,
      badge.textColor
    )}>
      {badge.label}
    </span>
  );
};

export default AssetDetailPage;
