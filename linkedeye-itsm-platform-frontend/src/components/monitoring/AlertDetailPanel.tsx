/**
 * AlertDetailPanel Component
 *
 * Displays comprehensive alert details including:
 * - Device information (IP, hostname, friendly name)
 * - Alert category with visual indicators
 * - Metrics visualization
 * - Logs preview
 * - Virtualization details
 * - Pause/Resume controls
 *
 * Supports iDRAC, iLO, and Node Exporter alerts.
 */

import { useState, useEffect } from 'react';
import {
  Server,
  Cpu,
  MemoryStick,
  HardDrive,
  Thermometer,
  Fan,
  Zap,
  Network,
  Activity,
  AlertTriangle,
  AlertCircle,
  CheckCircle,
  Clock,
  Play,
  Pause,
  RefreshCw,
  ExternalLink,
  FileText,
  Settings,
  Shield,
  Database,
  Box,
  Globe,
  Wifi,
  WifiOff,
  ChevronDown,
  ChevronRight,
  Eye,
  EyeOff,
  Terminal,
  BarChart3,
  TrendingUp,
  TrendingDown,
  Info,
} from 'lucide-react';
import clsx from 'clsx';
import toast from 'react-hot-toast';

// =============================================================================
// Types
// =============================================================================

interface AlertDetail {
  id: string;
  integrationId: string;
  name: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  status: 'firing' | 'acknowledged' | 'resolved';
  source: string;
  message: string;
  labels: Record<string, string>;
  annotations: Record<string, string>;
  startsAt: string;
  endsAt?: string;
  fingerprint: string;
  incidentId?: string;
  acknowledgedBy?: string;
  acknowledgedAt?: string;
  createdAt: string;
  // Pause status
  isPaused: boolean;
  pausedUntil?: string;
  pausedBy?: string;
  // Hardware alert details
  category?: string;
  categoryIcon?: string;
  sourceDisplayName?: string;
  description?: string;
  resolutionHint?: string;
  autoCreateIncident?: boolean;
  runbookUrl?: string;
}

interface DeviceInfo {
  ip: string;
  hostname: string;
  friendlyName: string;
  manufacturer?: string;
  model?: string;
  serialNumber?: string;
  osType?: string;
  osVersion?: string;
  location?: string;
  datacenter?: string;
  rack?: string;
  virtualization?: {
    type: 'physical' | 'vmware' | 'hyperv' | 'kvm' | 'docker' | 'kubernetes';
    hypervisor?: string;
    cluster?: string;
    pool?: string;
    vmId?: string;
  };
}

interface MetricData {
  name: string;
  value: number;
  unit: string;
  threshold?: number;
  trend?: 'up' | 'down' | 'stable';
  history?: { time: string; value: number }[];
}

interface LogEntry {
  timestamp: string;
  level: 'error' | 'warn' | 'info' | 'debug';
  message: string;
  source?: string;
}

interface AlertDetailPanelProps {
  alert: AlertDetail;
  deviceInfo?: DeviceInfo;
  metrics?: MetricData[];
  logs?: LogEntry[];
  onPause?: (alertId: string, durationMinutes: number, reason?: string) => Promise<void>;
  onResume?: (alertId: string) => Promise<void>;
  onAcknowledge?: (alertId: string) => Promise<void>;
  onCreateIncident?: (alertId: string) => Promise<void>;
  onViewRunbook?: (url: string) => void;
  onClose?: () => void;
  isLoading?: boolean;
}

// =============================================================================
// Category Icon Mapping
// =============================================================================

const getCategoryIcon = (category?: string) => {
  const iconMap: Record<string, React.ReactNode> = {
    power: <Zap size={20} className="text-yellow-500" />,
    fan: <Fan size={20} className="text-blue-500" />,
    temperature: <Thermometer size={20} className="text-red-500" />,
    cpu: <Cpu size={20} className="text-purple-500" />,
    memory: <MemoryStick size={20} className="text-green-500" />,
    disk: <HardDrive size={20} className="text-gray-500" />,
    raid: <Database size={20} className="text-indigo-500" />,
    hardware: <Settings size={20} className="text-orange-500" />,
    system: <Server size={20} className="text-blue-600" />,
    network: <Network size={20} className="text-cyan-500" />,
    load: <Activity size={20} className="text-amber-500" />,
    process: <Terminal size={20} className="text-slate-500" />,
    filesystem: <HardDrive size={20} className="text-teal-500" />,
  };
  return iconMap[category?.toLowerCase() || ''] || <AlertTriangle size={20} className="text-gray-400" />;
};

const getSourceIcon = (source?: string) => {
  const sourceMap: Record<string, React.ReactNode> = {
    idrac: <Server size={18} className="text-blue-600" />,
    ilo: <Server size={18} className="text-green-600" />,
    node_exporter: <Activity size={18} className="text-purple-600" />,
  };
  const sourceLower = source?.toLowerCase() || '';
  if (sourceLower.includes('idrac')) return sourceMap.idrac;
  if (sourceLower.includes('ilo')) return sourceMap.ilo;
  if (sourceLower.includes('node')) return sourceMap.node_exporter;
  return <Server size={18} className="text-gray-500" />;
};

const getVirtualizationIcon = (type?: string) => {
  const icons: Record<string, React.ReactNode> = {
    physical: <Server size={16} />,
    vmware: <Box size={16} />,
    hyperv: <Box size={16} />,
    kvm: <Box size={16} />,
    docker: <Box size={16} />,
    kubernetes: <Globe size={16} />,
  };
  return icons[type || 'physical'] || <Server size={16} />;
};

// =============================================================================
// Component
// =============================================================================

export const AlertDetailPanel: React.FC<AlertDetailPanelProps> = ({
  alert,
  deviceInfo,
  metrics = [],
  logs = [],
  onPause,
  onResume,
  onAcknowledge,
  onCreateIncident,
  onViewRunbook,
  onClose,
  isLoading = false,
}) => {
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    device: true,
    alert: true,
    metrics: true,
    logs: false,
    virtualization: true,
  });

  const [pauseDuration, setPauseDuration] = useState<number>(30);
  const [pauseReason, setPauseReason] = useState<string>('');
  const [showPauseModal, setShowPauseModal] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const toggleSection = (section: string) => {
    setExpandedSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  // Calculate remaining pause time
  const remainingPauseMinutes = alert.isPaused && alert.pausedUntil
    ? Math.max(0, Math.floor((new Date(alert.pausedUntil).getTime() - Date.now()) / 60000))
    : 0;

  // Handle pause action
  const handlePause = async () => {
    if (!onPause) return;
    setActionLoading('pause');
    try {
      await onPause(alert.id, pauseDuration, pauseReason);
      setShowPauseModal(false);
      setPauseReason('');
      toast.success(`Alert paused for ${pauseDuration} minutes`);
    } catch (error) {
      toast.error('Failed to pause alert');
    } finally {
      setActionLoading(null);
    }
  };

  // Handle resume action
  const handleResume = async () => {
    if (!onResume) return;
    setActionLoading('resume');
    try {
      await onResume(alert.id);
      toast.success('Alert resumed');
    } catch (error) {
      toast.error('Failed to resume alert');
    } finally {
      setActionLoading(null);
    }
  };

  // Severity badge styles
  const severityStyles = {
    critical: 'bg-red-100 text-red-800 border-red-200',
    high: 'bg-orange-100 text-orange-800 border-orange-200',
    medium: 'bg-amber-100 text-amber-800 border-amber-200',
    low: 'bg-green-100 text-green-800 border-green-200',
  };

  // Status badge styles
  const statusStyles = {
    firing: 'bg-red-500 text-white',
    acknowledged: 'bg-yellow-500 text-white',
    resolved: 'bg-green-500 text-white',
  };

  if (isLoading) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center justify-center h-64">
          <RefreshCw className="w-8 h-8 text-blue-500 animate-spin" />
          <span className="ml-3 text-gray-500">Loading alert details...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-lg overflow-hidden">
      {/* Header */}
      <div className={clsx(
        'px-6 py-4 border-b',
        alert.isPaused ? 'bg-gray-100 border-gray-300' :
          alert.severity === 'critical' ? 'bg-red-50 border-red-200' :
          alert.severity === 'high' ? 'bg-orange-50 border-orange-200' :
          'bg-blue-50 border-blue-200'
      )}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* Category Icon */}
            <div className={clsx(
              'w-12 h-12 rounded-xl flex items-center justify-center',
              alert.isPaused ? 'bg-gray-200' : 'bg-white shadow-sm'
            )}>
              {getCategoryIcon(alert.category)}
            </div>

            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-gray-900">{alert.name}</h2>
                {alert.isPaused && (
                  <span className="px-2 py-0.5 bg-gray-500 text-white text-xs rounded-full flex items-center gap-1">
                    <Pause size={10} />
                    Paused
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 mt-1">
                <span className={clsx('px-2 py-0.5 text-xs font-medium rounded border', severityStyles[alert.severity])}>
                  {alert.severity.toUpperCase()}
                </span>
                <span className={clsx('px-2 py-0.5 text-xs font-medium rounded', statusStyles[alert.status])}>
                  {alert.status}
                </span>
                {alert.sourceDisplayName && (
                  <span className="text-xs text-gray-500 flex items-center gap-1">
                    {getSourceIcon(alert.source)}
                    {alert.sourceDisplayName}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            {alert.isPaused ? (
              <button
                onClick={handleResume}
                disabled={actionLoading === 'resume'}
                className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium flex items-center gap-2 hover:bg-green-700 disabled:opacity-50 transition-colors"
              >
                {actionLoading === 'resume' ? (
                  <RefreshCw size={16} className="animate-spin" />
                ) : (
                  <Play size={16} />
                )}
                Resume
              </button>
            ) : (
              <button
                onClick={() => setShowPauseModal(true)}
                className="px-4 py-2 bg-gray-600 text-white rounded-lg text-sm font-medium flex items-center gap-2 hover:bg-gray-700 transition-colors"
              >
                <Pause size={16} />
                Pause
              </button>
            )}

            {alert.status === 'firing' && onAcknowledge && (
              <button
                onClick={() => onAcknowledge(alert.id)}
                className="px-4 py-2 bg-yellow-600 text-white rounded-lg text-sm font-medium flex items-center gap-2 hover:bg-yellow-700 transition-colors"
              >
                <CheckCircle size={16} />
                Acknowledge
              </button>
            )}

            {onCreateIncident && !alert.incidentId && (
              <button
                onClick={() => onCreateIncident(alert.id)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium flex items-center gap-2 hover:bg-blue-700 transition-colors"
              >
                <AlertCircle size={16} />
                Create Incident
              </button>
            )}

            {onClose && (
              <button
                onClick={onClose}
                className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <Eye size={18} />
              </button>
            )}
          </div>
        </div>

        {/* Pause status indicator */}
        {alert.isPaused && remainingPauseMinutes > 0 && (
          <div className="mt-3 px-4 py-2 bg-gray-200 rounded-lg flex items-center justify-between">
            <span className="text-sm text-gray-700">
              <Clock size={14} className="inline mr-1" />
              Paused for {remainingPauseMinutes} more minutes
            </span>
            <span className="text-xs text-gray-500">
              Until {new Date(alert.pausedUntil!).toLocaleTimeString()}
            </span>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="divide-y divide-gray-100">
        {/* Device Information Section */}
        {deviceInfo && (
          <CollapsibleSection
            title="Device Information"
            icon={<Server size={18} className="text-blue-500" />}
            isExpanded={expandedSections.device}
            onToggle={() => toggleSection('device')}
          >
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
              {/* IP Address */}
              <InfoCard
                label="IP Address"
                value={deviceInfo.ip}
                icon={<Wifi size={16} className="text-green-500" />}
                copyable
              />

              {/* Hostname */}
              <InfoCard
                label="Hostname"
                value={deviceInfo.hostname}
                icon={<Globe size={16} className="text-blue-500" />}
                copyable
              />

              {/* Friendly Name */}
              <InfoCard
                label="Friendly Name"
                value={deviceInfo.friendlyName}
                icon={<Info size={16} className="text-purple-500" />}
              />

              {/* Manufacturer & Model */}
              {deviceInfo.manufacturer && (
                <InfoCard
                  label="Manufacturer / Model"
                  value={`${deviceInfo.manufacturer} ${deviceInfo.model || ''}`}
                  icon={<Box size={16} className="text-gray-500" />}
                />
              )}

              {/* Serial Number */}
              {deviceInfo.serialNumber && (
                <InfoCard
                  label="Serial Number"
                  value={deviceInfo.serialNumber}
                  icon={<Shield size={16} className="text-amber-500" />}
                  copyable
                />
              )}

              {/* OS */}
              {deviceInfo.osType && (
                <InfoCard
                  label="Operating System"
                  value={`${deviceInfo.osType} ${deviceInfo.osVersion || ''}`}
                  icon={<Terminal size={16} className="text-slate-500" />}
                />
              )}

              {/* Location */}
              {deviceInfo.location && (
                <InfoCard
                  label="Location"
                  value={deviceInfo.location}
                  sublabel={deviceInfo.datacenter ? `DC: ${deviceInfo.datacenter}` : undefined}
                  icon={<Globe size={16} className="text-cyan-500" />}
                />
              )}
            </div>
          </CollapsibleSection>
        )}

        {/* Virtualization Details */}
        {deviceInfo?.virtualization && (
          <CollapsibleSection
            title="Virtualization Details"
            icon={<Box size={18} className="text-purple-500" />}
            isExpanded={expandedSections.virtualization}
            onToggle={() => toggleSection('virtualization')}
          >
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <InfoCard
                label="Type"
                value={deviceInfo.virtualization.type.toUpperCase()}
                icon={getVirtualizationIcon(deviceInfo.virtualization.type)}
              />
              {deviceInfo.virtualization.hypervisor && (
                <InfoCard
                  label="Hypervisor"
                  value={deviceInfo.virtualization.hypervisor}
                  icon={<Server size={16} className="text-blue-500" />}
                />
              )}
              {deviceInfo.virtualization.cluster && (
                <InfoCard
                  label="Cluster"
                  value={deviceInfo.virtualization.cluster}
                  icon={<Database size={16} className="text-green-500" />}
                />
              )}
              {deviceInfo.virtualization.vmId && (
                <InfoCard
                  label="VM ID"
                  value={deviceInfo.virtualization.vmId}
                  icon={<Box size={16} className="text-orange-500" />}
                  copyable
                />
              )}
            </div>
          </CollapsibleSection>
        )}

        {/* Alert Details Section */}
        <CollapsibleSection
          title="Alert Details"
          icon={<AlertTriangle size={18} className="text-amber-500" />}
          isExpanded={expandedSections.alert}
          onToggle={() => toggleSection('alert')}
        >
          <div className="space-y-4">
            {/* Description */}
            {alert.description && (
              <div className="p-4 bg-gray-50 rounded-lg">
                <h4 className="text-sm font-medium text-gray-700 mb-2">Description</h4>
                <p className="text-sm text-gray-600">{alert.description}</p>
              </div>
            )}

            {/* Message */}
            <div className="p-4 bg-blue-50 rounded-lg border border-blue-100">
              <h4 className="text-sm font-medium text-blue-700 mb-2">Alert Message</h4>
              <p className="text-sm text-blue-800 font-mono">{alert.message}</p>
            </div>

            {/* Resolution Hint */}
            {alert.resolutionHint && (
              <div className="p-4 bg-green-50 rounded-lg border border-green-100">
                <h4 className="text-sm font-medium text-green-700 mb-2 flex items-center gap-2">
                  <CheckCircle size={16} />
                  Resolution Hint
                </h4>
                <p className="text-sm text-green-800">{alert.resolutionHint}</p>
              </div>
            )}

            {/* Runbook Link */}
            {alert.runbookUrl && (
              <button
                onClick={() => onViewRunbook?.(alert.runbookUrl!)}
                className="w-full p-3 bg-purple-50 border border-purple-200 rounded-lg text-left hover:bg-purple-100 transition-colors flex items-center justify-between"
              >
                <span className="flex items-center gap-2 text-purple-700">
                  <FileText size={18} />
                  <span className="font-medium">View Runbook</span>
                </span>
                <ExternalLink size={16} className="text-purple-500" />
              </button>
            )}

            {/* Labels */}
            {Object.keys(alert.labels).length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-2">Labels</h4>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(alert.labels).map(([key, value]) => (
                    <span
                      key={key}
                      className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded font-mono"
                    >
                      {key}={value}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Timestamps */}
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 pt-4 border-t border-gray-200">
              <InfoCard
                label="Started At"
                value={new Date(alert.startsAt).toLocaleString()}
                icon={<Clock size={16} className="text-blue-500" />}
              />
              {alert.acknowledgedAt && (
                <InfoCard
                  label="Acknowledged At"
                  value={new Date(alert.acknowledgedAt).toLocaleString()}
                  icon={<CheckCircle size={16} className="text-yellow-500" />}
                />
              )}
              {alert.endsAt && (
                <InfoCard
                  label="Ended At"
                  value={new Date(alert.endsAt).toLocaleString()}
                  icon={<CheckCircle size={16} className="text-green-500" />}
                />
              )}
            </div>
          </div>
        </CollapsibleSection>

        {/* Metrics Section */}
        {metrics.length > 0 && (
          <CollapsibleSection
            title="Live Metrics"
            icon={<BarChart3 size={18} className="text-green-500" />}
            isExpanded={expandedSections.metrics}
            onToggle={() => toggleSection('metrics')}
          >
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {metrics.map((metric, index) => (
                <MetricCard key={index} metric={metric} />
              ))}
            </div>
          </CollapsibleSection>
        )}

        {/* Logs Section */}
        {logs.length > 0 && (
          <CollapsibleSection
            title="Recent Logs"
            icon={<Terminal size={18} className="text-slate-500" />}
            isExpanded={expandedSections.logs}
            onToggle={() => toggleSection('logs')}
            badge={`${logs.length} entries`}
          >
            <div className="bg-gray-900 rounded-lg p-4 max-h-64 overflow-y-auto font-mono text-xs">
              {logs.map((log, index) => (
                <LogLine key={index} log={log} />
              ))}
            </div>
          </CollapsibleSection>
        )}
      </div>

      {/* Pause Modal */}
      {showPauseModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-2xl">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Pause Alert</h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Duration
                </label>
                <select
                  value={pauseDuration}
                  onChange={(e) => setPauseDuration(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value={15}>15 minutes</option>
                  <option value={30}>30 minutes</option>
                  <option value={60}>1 hour</option>
                  <option value={120}>2 hours</option>
                  <option value={240}>4 hours</option>
                  <option value={480}>8 hours</option>
                  <option value={1440}>24 hours</option>
                  <option value={10080}>7 days</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Reason (optional)
                </label>
                <textarea
                  value={pauseReason}
                  onChange={(e) => setPauseReason(e.target.value)}
                  placeholder="Enter reason for pausing this alert..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                  rows={3}
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setShowPauseModal(false)}
                className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handlePause}
                disabled={actionLoading === 'pause'}
                className="px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-800 disabled:opacity-50 transition-colors flex items-center gap-2"
              >
                {actionLoading === 'pause' ? (
                  <RefreshCw size={16} className="animate-spin" />
                ) : (
                  <Pause size={16} />
                )}
                Pause Alert
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// =============================================================================
// Sub-components
// =============================================================================

interface CollapsibleSectionProps {
  title: string;
  icon: React.ReactNode;
  isExpanded: boolean;
  onToggle: () => void;
  badge?: string;
  children: React.ReactNode;
}

const CollapsibleSection: React.FC<CollapsibleSectionProps> = ({
  title,
  icon,
  isExpanded,
  onToggle,
  badge,
  children,
}) => (
  <div>
    <button
      onClick={onToggle}
      className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
    >
      <span className="flex items-center gap-3 font-medium text-gray-800">
        {icon}
        {title}
        {badge && (
          <span className="px-2 py-0.5 bg-gray-200 text-gray-600 text-xs rounded-full">
            {badge}
          </span>
        )}
      </span>
      {isExpanded ? (
        <ChevronDown size={18} className="text-gray-500" />
      ) : (
        <ChevronRight size={18} className="text-gray-500" />
      )}
    </button>
    {isExpanded && <div className="px-6 pb-6">{children}</div>}
  </div>
);

interface InfoCardProps {
  label: string;
  value: string;
  sublabel?: string;
  icon?: React.ReactNode;
  copyable?: boolean;
}

const InfoCard: React.FC<InfoCardProps> = ({ label, value, sublabel, icon, copyable }) => {
  const handleCopy = () => {
    navigator.clipboard.writeText(value);
    toast.success(`${label} copied to clipboard`);
  };

  return (
    <div className="p-3 bg-gray-50 rounded-lg border border-gray-100 group">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">{label}</span>
        {copyable && (
          <button
            onClick={handleCopy}
            className="opacity-0 group-hover:opacity-100 p-1 hover:bg-gray-200 rounded transition-all"
            title="Copy to clipboard"
          >
            <FileText size={12} className="text-gray-500" />
          </button>
        )}
      </div>
      <div className="flex items-center gap-2 mt-1">
        {icon}
        <span className="text-sm font-semibold text-gray-900 truncate">{value}</span>
      </div>
      {sublabel && <span className="text-xs text-gray-500 mt-1">{sublabel}</span>}
    </div>
  );
};

interface MetricCardProps {
  metric: MetricData;
}

const MetricCard: React.FC<MetricCardProps> = ({ metric }) => {
  const isWarning = metric.threshold && metric.value > metric.threshold * 0.8;
  const isCritical = metric.threshold && metric.value > metric.threshold;

  return (
    <div className={clsx(
      'p-4 rounded-lg border',
      isCritical ? 'bg-red-50 border-red-200' :
      isWarning ? 'bg-amber-50 border-amber-200' :
      'bg-gray-50 border-gray-200'
    )}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">{metric.name}</span>
        {metric.trend && (
          metric.trend === 'up' ? <TrendingUp size={14} className="text-red-500" /> :
          metric.trend === 'down' ? <TrendingDown size={14} className="text-green-500" /> :
          <Activity size={14} className="text-gray-400" />
        )}
      </div>
      <div className="flex items-end gap-1">
        <span className={clsx(
          'text-2xl font-bold',
          isCritical ? 'text-red-600' :
          isWarning ? 'text-amber-600' :
          'text-gray-900'
        )}>
          {metric.value}
        </span>
        <span className="text-sm text-gray-500 mb-0.5">{metric.unit}</span>
      </div>
      {metric.threshold && (
        <div className="mt-2">
          <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
            <div
              className={clsx(
                'h-full rounded-full transition-all',
                isCritical ? 'bg-red-500' :
                isWarning ? 'bg-amber-500' :
                'bg-green-500'
              )}
              style={{ width: `${Math.min(100, (metric.value / metric.threshold) * 100)}%` }}
            />
          </div>
          <span className="text-xs text-gray-500 mt-1">Threshold: {metric.threshold}{metric.unit}</span>
        </div>
      )}
    </div>
  );
};

interface LogLineProps {
  log: LogEntry;
}

const LogLine: React.FC<LogLineProps> = ({ log }) => {
  const levelColors = {
    error: 'text-red-400',
    warn: 'text-yellow-400',
    info: 'text-blue-400',
    debug: 'text-gray-400',
  };

  return (
    <div className="flex gap-2 py-1 hover:bg-gray-800 rounded px-2 -mx-2">
      <span className="text-gray-500 flex-shrink-0">
        {new Date(log.timestamp).toLocaleTimeString()}
      </span>
      <span className={clsx('flex-shrink-0 uppercase font-bold w-12', levelColors[log.level])}>
        [{log.level}]
      </span>
      <span className="text-gray-200">{log.message}</span>
    </div>
  );
};

export default AlertDetailPanel;
