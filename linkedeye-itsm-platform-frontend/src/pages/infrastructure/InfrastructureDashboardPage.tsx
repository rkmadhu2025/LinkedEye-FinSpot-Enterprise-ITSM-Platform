/**
 * Infrastructure Dashboard Page
 *
 * Provides a comprehensive view of the network infrastructure including:
 * - Network layer statistics with visual cards
 * - Health status overview
 * - Device distribution by vendor
 * - VM to Physical ratio
 * - Quick access to topology views
 * - Recent device activity
 */

import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Shield,
  Network,
  Share2,
  Server,
  Activity,
  AlertTriangle,
  CheckCircle,
  XCircle,
  HelpCircle,
  Layers,
  Box,
  ChevronRight,
  RefreshCw,
  Map,
  Plus,
  Search,
  Filter,
  MoreVertical,
  TrendingUp,
  TrendingDown,
  ArrowUpRight,
  Cpu,
  HardDrive,
  Thermometer,
  Wifi,
  Globe,
  Lock,
  Settings,
} from 'lucide-react';
import toast from 'react-hot-toast';
import {
  InfrastructureStats,
  LayerStats,
  NetworkLayerType,
  NetworkLayerInfo,
  DeviceVendorInfo,
  InfrastructureHost,
} from '../../types';
import { infrastructureStatsService, infrastructureHostService } from '../../services/infrastructureService';

// =====================================
// Layer Card Component
// =====================================

interface LayerCardProps {
  stats: LayerStats;
  onClick: () => void;
}

const LayerCard: React.FC<LayerCardProps> = ({ stats, onClick }) => {
  const layerInfo = NetworkLayerInfo[stats.layer];
  const healthPercentage = stats.total_devices > 0
    ? ((stats.healthy_devices / stats.total_devices) * 100).toFixed(0)
    : 0;

  const getLayerIcon = () => {
    switch (stats.layer) {
      case 'f_swi':
        return <Shield size={28} />;
      case 'r_swi':
        return <Network size={28} />;
      case 'e_swi':
        return <Share2 size={28} />;
      case 's_hw':
        return <Server size={28} />;
      default:
        return <Layers size={28} />;
    }
  };

  return (
    <div
      onClick={onClick}
      className="relative bg-white dark:bg-gradient-to-br dark:from-gray-800/90 dark:to-gray-900/90 backdrop-blur-sm rounded-2xl p-6 cursor-pointer hover:scale-[1.02] transition-all duration-300 border border-gray-200 dark:border-gray-700/50 hover:border-blue-400 dark:hover:border-gray-600 shadow-lg hover:shadow-xl dark:shadow-xl dark:hover:shadow-2xl group overflow-hidden"
    >
      {/* Glow effect on hover */}
      <div
        className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-2xl blur-xl"
        style={{ background: `radial-gradient(circle at top right, ${layerInfo.color}15, transparent 70%)` }}
      ></div>

      {/* Header */}
      <div className="relative flex items-start justify-between mb-4">
        <div
          className="p-3 rounded-xl shadow-lg transition-transform duration-300 group-hover:scale-110"
          style={{ backgroundColor: `${layerInfo.color}20`, boxShadow: `0 4px 14px ${layerInfo.color}20` }}
        >
          <div style={{ color: layerInfo.color }}>{getLayerIcon()}</div>
        </div>
        <div className="flex items-center gap-1">
          <span className="text-3xl font-bold text-gray-900 dark:text-white">{stats.total_devices}</span>
          <span className="text-gray-500 dark:text-gray-400 text-sm">devices</span>
        </div>
      </div>

      {/* Title */}
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">{layerInfo.name}</h3>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">{layerInfo.description}</p>

      {/* Health Status Bar */}
      <div className="mb-4">
        <div className="flex items-center justify-between text-xs mb-1">
          <span className="text-gray-500 dark:text-gray-400">Health Status</span>
          <span className="text-green-600 dark:text-green-400 font-medium">{healthPercentage}%</span>
        </div>
        <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
          <div className="h-full flex">
            <div
              className="bg-green-500 transition-all duration-500"
              style={{ width: `${(stats.healthy_devices / stats.total_devices) * 100 || 0}%` }}
            />
            <div
              className="bg-yellow-500 transition-all duration-500"
              style={{ width: `${(stats.warning_devices / stats.total_devices) * 100 || 0}%` }}
            />
            <div
              className="bg-red-500 transition-all duration-500"
              style={{ width: `${(stats.critical_devices / stats.total_devices) * 100 || 0}%` }}
            />
          </div>
        </div>
      </div>

      {/* Status breakdown */}
      <div className="grid grid-cols-3 gap-2 text-center">
        <div className="bg-gray-700/50 rounded-lg p-2">
          <div className="flex items-center justify-center gap-1 mb-1">
            <CheckCircle size={12} className="text-green-400" />
            <span className="text-green-400 font-semibold">{stats.healthy_devices}</span>
          </div>
          <span className="text-xs text-gray-400">Healthy</span>
        </div>
        <div className="bg-gray-700/50 rounded-lg p-2">
          <div className="flex items-center justify-center gap-1 mb-1">
            <AlertTriangle size={12} className="text-yellow-400" />
            <span className="text-yellow-400 font-semibold">{stats.warning_devices}</span>
          </div>
          <span className="text-xs text-gray-400">Warning</span>
        </div>
        <div className="bg-gray-700/50 rounded-lg p-2">
          <div className="flex items-center justify-center gap-1 mb-1">
            <XCircle size={12} className="text-red-400" />
            <span className="text-red-400 font-semibold">{stats.critical_devices}</span>
          </div>
          <span className="text-xs text-gray-400">Critical</span>
        </div>
      </div>

      {/* Vendor distribution */}
      {Object.keys(stats.devices_by_vendor).length > 0 && (
        <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
          <span className="text-xs text-gray-500 dark:text-gray-400 mb-2 block">Vendors</span>
          <div className="flex flex-wrap gap-1">
            {Object.entries(stats.devices_by_vendor).slice(0, 3).map(([vendor, count]) => (
              <span
                key={vendor}
                className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded text-xs text-gray-600 dark:text-gray-300"
              >
                {vendor}: {count}
              </span>
            ))}
            {Object.keys(stats.devices_by_vendor).length > 3 && (
              <span className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded text-xs text-gray-500 dark:text-gray-400">
                +{Object.keys(stats.devices_by_vendor).length - 3} more
              </span>
            )}
          </div>
        </div>
      )}

      {/* View details link */}
      <div className="mt-4 flex items-center justify-end text-sm" style={{ color: layerInfo.color }}>
        <span>View Details</span>
        <ChevronRight size={16} />
      </div>
    </div>
  );
};

// =====================================
// Stats Summary Card Component
// =====================================

interface StatsSummaryCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ReactNode;
  trend?: { value: number; positive: boolean };
  color: string;
}

const StatsSummaryCard: React.FC<StatsSummaryCardProps> = ({
  title,
  value,
  subtitle,
  icon,
  trend,
  color,
}) => (
  <div className="relative bg-white dark:bg-gradient-to-br dark:from-gray-800/90 dark:to-gray-900/90 backdrop-blur-sm rounded-2xl p-6 border border-gray-200 dark:border-gray-700/50 hover:border-blue-400 dark:hover:border-gray-600/50 transition-all duration-300 shadow-lg hover:shadow-xl dark:shadow-xl dark:hover:shadow-2xl group overflow-hidden">
    {/* Glow effect on hover */}
    <div
      className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-2xl blur-xl"
      style={{ background: `radial-gradient(circle at center, ${color}15, transparent 70%)` }}
    ></div>

    <div className="relative flex items-start justify-between">
      <div
        className="p-3 rounded-xl shadow-lg transition-transform duration-300 group-hover:scale-110"
        style={{ backgroundColor: `${color}20`, boxShadow: `0 4px 14px ${color}20` }}
      >
        <div style={{ color }}>{icon}</div>
      </div>
      {trend && (
        <div className={`flex items-center gap-1 text-sm font-medium ${trend.positive ? 'text-green-400' : 'text-red-400'}`}>
          {trend.positive ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
          <span>{trend.value}%</span>
        </div>
      )}
    </div>
    <div className="mt-4">
      <p className="text-3xl font-bold text-gray-900 dark:text-white">{value}</p>
      <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">{title}</p>
      {subtitle && <p className="text-gray-400 dark:text-gray-500 text-xs mt-1">{subtitle}</p>}
    </div>
  </div>
);

// =====================================
// Vendor Distribution Chart
// =====================================

const VendorDistribution: React.FC<{ layers: LayerStats[] }> = ({ layers }) => {
  // Aggregate vendor data across all layers
  const vendorTotals: Record<string, number> = {};
  layers.forEach((layer) => {
    Object.entries(layer.devices_by_vendor).forEach(([vendor, count]) => {
      vendorTotals[vendor] = (vendorTotals[vendor] || 0) + count;
    });
  });

  const total = Object.values(vendorTotals).reduce((a, b) => a + b, 0);
  const sortedVendors = Object.entries(vendorTotals).sort((a, b) => b[1] - a[1]);

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700 shadow-lg dark:shadow-none">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Device Vendors</h3>

      <div className="space-y-3">
        {sortedVendors.map(([vendor, count]) => {
          const percentage = ((count / total) * 100).toFixed(1);
          const vendorInfo = DeviceVendorInfo[vendor as keyof typeof DeviceVendorInfo];
          const color = vendorInfo?.color || '#6b7280';

          return (
            <div key={vendor}>
              <div className="flex items-center justify-between text-sm mb-1">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded" style={{ backgroundColor: color }} />
                  <span className="text-gray-600 dark:text-gray-300 capitalize">{vendorInfo?.name || vendor}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-white font-medium">{count}</span>
                  <span className="text-gray-400">({percentage}%)</span>
                </div>
              </div>
              <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                <div
                  className="h-full transition-all duration-500"
                  style={{ width: `${percentage}%`, backgroundColor: color }}
                />
              </div>
            </div>
          );
        })}
      </div>

      {sortedVendors.length === 0 && (
        <p className="text-gray-500 dark:text-gray-400 text-center py-4">No vendor data available</p>
      )}
    </div>
  );
};

// =====================================
// Network Zones Widget
// =====================================

const NetworkZonesWidget: React.FC<{ zones: Record<string, number> }> = ({ zones }) => {
  const zoneColors: Record<string, string> = {
    gateway: '#ef4444',
    public: '#f59e0b',
    exchange: '#3b82f6',
  };

  const zoneIcons: Record<string, React.ReactNode> = {
    gateway: <Globe size={20} />,
    public: <Wifi size={20} />,
    exchange: <Share2 size={20} />,
  };

  const zoneDescriptions: Record<string, string> = {
    gateway: 'WAN/Internet facing',
    public: 'DMZ/Public services',
    exchange: 'Internal/Core network',
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700 shadow-lg dark:shadow-none">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Network Zones</h3>

      <div className="space-y-4">
        {Object.entries(zones).map(([zone, count]) => (
          <div
            key={zone}
            className="flex items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-gray-700/50 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div
                className="p-2 rounded-lg"
                style={{ backgroundColor: `${zoneColors[zone]}20`, color: zoneColors[zone] }}
              >
                {zoneIcons[zone] || <Lock size={20} />}
              </div>
              <div>
                <p className="text-white font-medium capitalize">{zone}</p>
                <p className="text-xs text-gray-400">{zoneDescriptions[zone]}</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-xl font-bold text-gray-900 dark:text-white">{count}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">switches</p>
            </div>
          </div>
        ))}
      </div>

      {Object.keys(zones).length === 0 && (
        <p className="text-gray-400 text-center py-4">No zone data available</p>
      )}
    </div>
  );
};

// =====================================
// VM Physical Ratio Widget
// =====================================

const VMPhysicalWidget: React.FC<{
  data: { physical: number; virtual: number; ratio: string };
}> = ({ data }) => {
  const total = data.physical + data.virtual;
  const physicalPercent = total > 0 ? ((data.physical / total) * 100).toFixed(0) : 0;
  const virtualPercent = total > 0 ? ((data.virtual / total) * 100).toFixed(0) : 0;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700 shadow-lg dark:shadow-none">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">VM to Physical Ratio</h3>

      {/* Visual representation */}
      <div className="flex justify-center mb-6">
        <div className="relative w-32 h-32">
          {/* Background circle */}
          <svg className="w-full h-full transform -rotate-90">
            <circle
              cx="64"
              cy="64"
              r="56"
              fill="none"
              stroke="#374151"
              strokeWidth="12"
            />
            {/* Physical segment */}
            <circle
              cx="64"
              cy="64"
              r="56"
              fill="none"
              stroke="#22c55e"
              strokeWidth="12"
              strokeDasharray={`${(Number(physicalPercent) / 100) * 352} 352`}
              strokeLinecap="round"
            />
            {/* Virtual segment */}
            <circle
              cx="64"
              cy="64"
              r="56"
              fill="none"
              stroke="#8b5cf6"
              strokeWidth="12"
              strokeDasharray={`${(Number(virtualPercent) / 100) * 352} 352`}
              strokeDashoffset={`-${(Number(physicalPercent) / 100) * 352}`}
              strokeLinecap="round"
            />
          </svg>
          {/* Center text */}
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-2xl font-bold text-white">{data.ratio}</span>
            <span className="text-xs text-gray-400">ratio</span>
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="grid grid-cols-2 gap-4">
        <div className="flex items-center gap-2">
          <Server size={20} className="text-green-400" />
          <div>
            <p className="text-lg font-bold text-gray-900 dark:text-white">{data.physical}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">Physical</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Box size={20} className="text-purple-400" />
          <div>
            <p className="text-lg font-bold text-gray-900 dark:text-white">{data.virtual}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">Virtual</p>
          </div>
        </div>
      </div>
    </div>
  );
};

// =====================================
// Quick Actions Widget
// =====================================

const QuickActions: React.FC = () => {
  const actions = [
    { icon: <Plus size={20} />, label: 'Add Device', path: '/infrastructure/catalog', color: '#3b82f6' },
    { icon: <Map size={20} />, label: 'View Topology', path: '/infrastructure/topology', color: '#22c55e' },
    { icon: <Server size={20} />, label: 'Server Racks', path: '/infrastructure/racks', color: '#f59e0b' },
    { icon: <Box size={20} />, label: 'VM Mapping', path: '/infrastructure/vm-mapping', color: '#8b5cf6' },
  ];

  return (
    <div className="bg-white dark:bg-gradient-to-br dark:from-gray-800/90 dark:to-gray-900/90 backdrop-blur-sm rounded-2xl p-6 border border-gray-200 dark:border-gray-700/50 shadow-lg dark:shadow-xl">
      <div className="flex items-center gap-3 mb-6">
        <div className="h-6 w-1 bg-gradient-to-b from-blue-500 to-purple-500 rounded-full"></div>
        <h3 className="text-lg font-bold text-gray-900 dark:text-white">Quick Actions</h3>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {actions.map((action, index) => (
          <Link
            key={index}
            to={action.path}
            className="flex items-center gap-3 p-4 rounded-xl bg-gray-50 dark:bg-gray-700/30 hover:bg-gray-100 dark:hover:bg-gray-700/50 transition-all duration-200 group border border-gray-200 dark:border-gray-700/50 hover:border-blue-300 dark:hover:border-gray-600/50 hover:shadow-md dark:hover:shadow-lg"
          >
            <div
              className="p-2.5 rounded-lg transition-all duration-200 group-hover:scale-110 shadow-lg"
              style={{ backgroundColor: `${action.color}20`, color: action.color, boxShadow: `0 4px 12px ${action.color}15` }}
            >
              {action.icon}
            </div>
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300 group-hover:text-gray-900 dark:group-hover:text-white transition-colors">
              {action.label}
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
};

// =====================================
// Main Dashboard Component
// =====================================

const InfrastructureDashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState<InfrastructureStats | null>(null);
  const [recentHosts, setRecentHosts] = useState<InfrastructureHost[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = async () => {
    try {
      const [statsData, hostsData] = await Promise.all([
        infrastructureStatsService.getStats(),
        infrastructureHostService.list(1, 5),
      ]);
      setStats(statsData);
      setRecentHosts(hostsData.data);
    } catch (error) {
      console.error('Failed to fetch infrastructure data:', error);
      toast.error('Failed to load infrastructure data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="flex items-center justify-center h-screen text-gray-400">
        <p>Failed to load infrastructure data</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gradient-to-br dark:from-gray-900 dark:via-slate-900 dark:to-gray-900 p-6">
      {/* Decorative Background Elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl"></div>
      </div>

      {/* Header */}
      <div className="relative flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-purple-600 dark:from-blue-400 dark:to-purple-400">
            Infrastructure Dashboard
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-2 text-sm">Network Flow Architecture Overview</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="flex items-center gap-2 px-5 py-2.5 bg-white dark:bg-gray-800/80 backdrop-blur-sm hover:bg-gray-50 dark:hover:bg-gray-700/80 rounded-xl text-gray-700 dark:text-gray-300 transition-all duration-200 border border-gray-200 dark:border-gray-700/50 hover:border-gray-300 dark:hover:border-gray-600/50 shadow-sm dark:shadow-lg hover:shadow-md dark:hover:shadow-blue-500/20"
          >
            <RefreshCw size={18} className={refreshing ? 'animate-spin' : ''} />
            <span>Refresh</span>
          </button>
          <Link
            to="/infrastructure/topology"
            className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 rounded-xl text-white transition-all duration-200 shadow-lg shadow-blue-500/30 hover:shadow-blue-500/50"
          >
            <Map size={18} />
            <span>View Topology</span>
          </Link>
        </div>
      </div>

      {/* Summary Stats Row */}
      <div className="relative grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatsSummaryCard
          title="Total Hosts"
          value={stats.total_hosts}
          subtitle="Across all layers"
          icon={<Server size={24} />}
          color="#3b82f6"
        />
        <StatsSummaryCard
          title="Total Ports"
          value={stats.total_ports}
          subtitle="Active interfaces"
          icon={<Layers size={24} />}
          color="#22c55e"
        />
        <StatsSummaryCard
          title="Connections"
          value={stats.total_connections}
          subtitle="Network links"
          icon={<Share2 size={24} />}
          color="#f59e0b"
        />
        <StatsSummaryCard
          title="Health Score"
          value={`${stats.health_summary.healthy > 0 ? ((stats.health_summary.healthy / stats.total_hosts) * 100).toFixed(0) : 0}%`}
          subtitle={`${stats.health_summary.critical} critical alerts`}
          icon={<Activity size={24} />}
          color={stats.health_summary.critical > 0 ? '#ef4444' : '#22c55e'}
        />
      </div>

      {/* Network Layers Grid */}
      <div className="relative mb-8">
        <div className="flex items-center gap-3 mb-6">
          <div className="h-8 w-1 bg-gradient-to-b from-blue-500 to-purple-500 rounded-full"></div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">Network Layers</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {stats.layers.map((layer) => (
            <LayerCard
              key={layer.layer}
              stats={layer}
              onClick={() => navigate(`/infrastructure/hosts?layer=${layer.layer}`)}
            />
          ))}
        </div>
      </div>

      {/* Secondary Widgets Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Vendor Distribution */}
        <VendorDistribution layers={stats.layers} />

        {/* Network Zones */}
        <NetworkZonesWidget zones={stats.network_zones} />

        {/* VM Physical Ratio */}
        <VMPhysicalWidget data={stats.vm_physical_ratio} />
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
        {/* Quick Actions */}
        <QuickActions />

        {/* Recent Devices */}
        <div className="lg:col-span-2 bg-white dark:bg-gradient-to-br dark:from-gray-800/90 dark:to-gray-900/90 backdrop-blur-sm rounded-2xl p-6 border border-gray-200 dark:border-gray-700/50 shadow-lg dark:shadow-xl">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="h-6 w-1 bg-gradient-to-b from-blue-500 to-purple-500 rounded-full"></div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">Recent Devices</h3>
            </div>
            <Link
              to="/infrastructure/hosts"
              className="text-sm font-medium text-blue-400 hover:text-blue-300 flex items-center gap-1 px-3 py-1.5 rounded-lg hover:bg-blue-500/10 transition-all duration-200"
            >
              View All <ArrowUpRight size={14} />
            </Link>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left text-gray-500 dark:text-gray-400 text-sm">
                  <th className="pb-3 font-medium">Hostname</th>
                  <th className="pb-3 font-medium">Layer</th>
                  <th className="pb-3 font-medium">Type</th>
                  <th className="pb-3 font-medium">Status</th>
                  <th className="pb-3 font-medium">IP Address</th>
                </tr>
              </thead>
              <tbody className="text-sm">
                {recentHosts.map((host) => (
                  <tr
                    key={host.id}
                    className="border-t border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer transition-colors"
                    onClick={() => navigate(`/infrastructure/hosts/${host.id}`)}
                  >
                    <td className="py-3 text-gray-900 dark:text-white font-medium">{host.hostname}</td>
                    <td className="py-3">
                      <span
                        className="px-2 py-1 rounded text-xs"
                        style={{
                          backgroundColor: `${NetworkLayerInfo[host.network_layer]?.color}20`,
                          color: NetworkLayerInfo[host.network_layer]?.color,
                        }}
                      >
                        {NetworkLayerInfo[host.network_layer]?.name || host.network_layer}
                      </span>
                    </td>
                    <td className="py-3 text-gray-600 dark:text-gray-300 capitalize">{host.device_category}</td>
                    <td className="py-3">
                      <span
                        className={`flex items-center gap-1 ${
                          host.health_status === 'healthy'
                            ? 'text-green-400'
                            : host.health_status === 'warning'
                            ? 'text-yellow-400'
                            : 'text-red-400'
                        }`}
                      >
                        {host.health_status === 'healthy' ? (
                          <CheckCircle size={14} />
                        ) : host.health_status === 'warning' ? (
                          <AlertTriangle size={14} />
                        ) : (
                          <XCircle size={14} />
                        )}
                        <span className="capitalize">{host.health_status}</span>
                      </span>
                    </td>
                    <td className="py-3 text-gray-500 dark:text-gray-400 font-mono text-xs">
                      {host.management_ip || '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {recentHosts.length === 0 && (
              <p className="text-gray-500 dark:text-gray-400 text-center py-8">No devices found</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default InfrastructureDashboardPage;
