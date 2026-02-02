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
  Network,
  RefreshCw,
  Map,
  Server,
  Layers,
  Share2,
  Activity,
  Monitor,
  Shield,
  Plus,
  Box,
  Globe,
  Wifi,
  Lock,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import clsx from 'clsx';
import {
  InfrastructureStats,
  LayerStats,
  NetworkLayerInfo,
  DeviceVendorInfo,
  InfrastructureHost,
} from '../../types';
import { infrastructureStatsService, infrastructureHostService } from '../../services/infrastructureService';
import { useAppSelector } from '@/hooks/useRedux';

// Assets
import neuralGridImg from '@/assets/neural-grid.jpg';
import observabilityCoreImg from '@/assets/observability-core.jpg';

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
      case 'f_swi': return <Shield size={24} />;
      case 'r_swi': return <Network size={24} />;
      case 'e_swi': return <Share2 size={24} />;
      case 's_hw': return <Server size={24} />;
      default: return <Layers size={24} />;
    }
  };

  return (
    <motion.div
      whileHover={{ y: -5, scale: 1.02 }}
      onClick={onClick}
      className="architect-card p-6 cursor-pointer group relative overflow-hidden transition-all duration-300 border-indigo-500/10 hover:border-indigo-500/30"
    >
      <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
      
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center text-indigo-400 border border-white/10 group-hover:scale-110 transition-transform">
          {getLayerIcon()}
        </div>
        <div className="text-right">
          <div className="text-2xl font-bold text-white font-mono tracking-tighter">{stats.total_devices}</div>
          <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wide">Active Devices</div>
        </div>
      </div>

      {/* Title */}
      <h3 className="text-sm font-bold text-white uppercase tracking-wide mb-1 group-hover:text-indigo-400 transition-colors">{layerInfo.name}</h3>
      <p className="text-[11px] text-slate-400 font-medium mb-4">{layerInfo.description}</p>

      {/* Health Status Bar */}
      <div className="space-y-2 mb-6">
        <div className="flex justify-between text-[11px] font-semibold uppercase tracking-wide">
          <span className="text-slate-400">Health Status</span>
          <span className="text-emerald-400">{healthPercentage}%</span>
        </div>
        <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
          <div className="h-full flex">
            <div className="bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" style={{ width: `${(stats.healthy_devices / stats.total_devices) * 100 || 0}%` }} />
            <div className="bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)]" style={{ width: `${(stats.warning_devices / stats.total_devices) * 100 || 0}%` }} />
            <div className="bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]" style={{ width: `${(stats.critical_devices / stats.total_devices) * 100 || 0}%` }} />
          </div>
        </div>
      </div>

      {/* Status segments */}
      <div className="grid grid-cols-3 gap-2">
        <div className="bg-white/5 rounded-xl p-2 text-center border border-white/5">
          <div className="text-sm font-bold text-emerald-400 truncate">{stats.healthy_devices}</div>
          <div className="text-[11px] font-semibold text-slate-500 uppercase">Healthy</div>
        </div>
        <div className="bg-white/5 rounded-xl p-2 text-center border border-white/5">
          <div className="text-sm font-bold text-amber-400 truncate">{stats.warning_devices}</div>
          <div className="text-[11px] font-semibold text-slate-500 uppercase">Warning</div>
        </div>
        <div className="bg-white/5 rounded-xl p-2 text-center border border-white/5">
          <div className="text-sm font-bold text-red-400 truncate">{stats.critical_devices}</div>
          <div className="text-[11px] font-semibold text-slate-500 uppercase">Critical</div>
        </div>
      </div>
    </motion.div>
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
}) => (
  <motion.div
    whileHover={{ y: -5 }}
    className="architect-card p-6 border-indigo-500/10 group cursor-pointer relative overflow-hidden"
  >
    <div className="flex items-start justify-between mb-4">
      <div className="p-3 rounded-2xl bg-white/5 border border-white/10 text-indigo-400 group-hover:scale-110 transition-transform">
        {icon}
      </div>
      {trend && (
        <div className={clsx(
          "px-2 py-1 rounded-lg text-[11px] font-bold border",
          trend.positive ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" : "bg-red-500/10 text-red-500 border-red-500/20"
        )}>
           {trend.positive ? '+' : ''}{trend.value}%
        </div>
      )}
    </div>
    <div>
      <div className="text-3xl font-bold text-white font-mono tracking-tighter mb-1">{value}</div>
      <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wide mb-1">{title}</div>
      {subtitle && <div className="text-xs font-medium text-slate-500">{subtitle}</div>}
    </div>

    {/* Accent light */}
    <div className="absolute -bottom-8 -right-8 w-24 h-24 blur-3xl opacity-5 group-hover:opacity-10 transition-opacity bg-indigo-500" />
  </motion.div>
);

// =====================================
// Vendor Distribution Chart
// =====================================

const VendorDistribution: React.FC<{ layers: LayerStats[] }> = ({ layers }) => {
  const vendorTotals: Record<string, number> = {};
  layers.forEach((layer) => {
    Object.entries(layer.devices_by_vendor).forEach(([vendor, count]) => {
      vendorTotals[vendor] = (vendorTotals[vendor] || 0) + count;
    });
  });

  const total = Object.values(vendorTotals).reduce((a, b) => a + b, 0);
  const sortedVendors = Object.entries(vendorTotals).sort((a, b) => b[1] - a[1]);

  return (
    <div className="architect-card p-6 border-indigo-500/10">
      <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-6">Device Distribution</h3>

      <div className="space-y-4">
        {sortedVendors.map(([vendor, count]) => {
          const percentage = ((count / total) * 100).toFixed(1);
          const vendorInfo = DeviceVendorInfo[vendor as keyof typeof DeviceVendorInfo];

          return (
            <div key={vendor} className="group">
              <div className="flex items-center justify-between text-[11px] font-semibold uppercase mb-1.5">
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.5)]" />
                  <span className="text-slate-300 group-hover:text-white transition-colors">{vendorInfo?.name || vendor}</span>
                </div>
                <div className="text-indigo-400">{count} Devices</div>
              </div>
              <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${percentage}%` }}
                  transition={{ duration: 1, ease: "easeOut" }}
                  className="h-full bg-indigo-500"
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// =====================================
// Network Zones Widget
// =====================================

const NetworkZonesWidget: React.FC<{ zones: Record<string, number> }> = ({ zones }) => {
  const zoneIcons: Record<string, React.ReactNode> = {
    gateway: <Globe size={18} />,
    public: <Wifi size={18} />,
    exchange: <Share2 size={18} />,
  };

  return (
    <div className="architect-card p-6 border-indigo-500/10">
      <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-6">Network Zones</h3>

      <div className="space-y-3">
        {Object.entries(zones).map(([zone, count]) => (
          <div
            key={zone}
            className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/5 hover:bg-white/10 transition-colors group cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-400 group-hover:scale-110 transition-transform">
                {zoneIcons[zone] || <Lock size={18} />}
              </div>
              <div>
                <p className="text-[11px] font-bold text-white uppercase tracking-tight">{zone}</p>
                <p className="text-[8px] font-bold text-slate-500 uppercase tracking-tighter italic">Operational Hub</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-xl font-bold font-mono text-white tracking-tighter">{count}</p>
              <p className="text-[8px] font-bold text-slate-500 uppercase">Nodes</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// =====================================
// VM Physical Ratio Widget
// =====================================

const VMPhysicalWidget: React.FC<{
  data: { physical: number; virtual: number; ratio: string };
}> = ({ data }) => {
  return (
    <div className="architect-card p-6 border-indigo-500/10 relative overflow-hidden">
      <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-8">Virtual Density Vector</h3>

      <div className="flex justify-center mb-8 relative">
        <div className="relative w-32 h-32 flex items-center justify-center">
            <svg className="absolute inset-0 w-full h-full transform -rotate-90">
                <circle cx="64" cy="64" r="58" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="8" />
                <motion.circle 
                    cx="64" cy="64" r="58" fill="none" stroke="#6366f1" strokeWidth="8" 
                    strokeDasharray="364.4"
                    initial={{ strokeDashoffset: 364.4 }}
                    animate={{ strokeDashoffset: 364.4 * (1 - (data.virtual / (data.physical + data.virtual || 1))) }}
                    transition={{ duration: 1.5, ease: "easeOut" }}
                />
            </svg>
            <div className="text-center">
                <div className="text-3xl font-bold text-white tracking-tighter font-mono">{data.ratio}</div>
                <div className="text-[8px] font-bold text-slate-500 uppercase tracking-widest">Ratio</div>
            </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white/5 rounded-xl p-3 border border-white/5 text-center">
            <div className="text-lg font-bold text-emerald-400 font-mono">{data.physical}</div>
            <div className="text-[8px] font-bold text-slate-500 uppercase tracking-widest">Physical</div>
        </div>
        <div className="bg-white/5 rounded-xl p-3 border border-white/5 text-center">
            <div className="text-lg font-bold text-indigo-400 font-mono">{data.virtual}</div>
            <div className="text-[8px] font-bold text-slate-500 uppercase tracking-widest">Virtual</div>
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
    { icon: <Plus size={18} />, label: 'Add Device', path: '/infrastructure/catalog' },
    { icon: <Map size={18} />, label: 'View Topology', path: '/infrastructure/topology' },
    { icon: <Server size={18} />, label: 'Server Racks', path: '/infrastructure/racks' },
    { icon: <Box size={18} />, label: 'VM Mapping', path: '/infrastructure/vm-mapping' },
  ];

  return (
    <div className="architect-card p-6 border-indigo-500/10">
      <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-6 px-1">Tactical Operations</h3>

      <div className="grid grid-cols-2 gap-3">
        {actions.map((action, index) => (
          <Link
            key={index}
            to={action.path}
            className="flex items-center gap-3 p-4 rounded-xl bg-white/5 border border-white/5 hover:bg-indigo-500/10 hover:border-indigo-500/30 transition-all group"
          >
            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-400 group-hover:scale-110 transition-transform">
              {action.icon}
            </div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest group-hover:text-white transition-colors">
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
  const { theme } = useAppSelector((state) => state.ui);
  const isDark = theme === 'dark';
  const [stats, setStats] = useState<InfrastructureStats | null>(null);
  const [recentHosts, setRecentHosts] = useState<InfrastructureHost[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = async () => {
    try {
      const [statsData, hostsData] = await Promise.all([
        infrastructureStatsService.getStats(),
        infrastructureHostService.list(1, 10),
      ]);
      setStats(statsData);
      setRecentHosts(hostsData.data);
    } catch (error) {
      console.error('Failed to fetch infrastructure data:', error);
      toast.error('Sync failure detected');
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
      <div className="architect-root min-h-screen p-8 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <motion.div animate={{ rotate: 360 }} transition={{ duration: 2, repeat: Infinity, ease: "linear" }} className="w-12 h-12 border-2 border-indigo-500/20 border-t-indigo-500 rounded-full" />
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Scanning Grid Integrity...</p>
        </div>
      </div>
    );
  }

  if (!stats) return null;

  return (
    <div className="space-y-10 reveal-stagger relative" style={{ background: isDark ? undefined : '#f9fafb' }}>
       {/* Background Visual Artifact */}
       {isDark && (
       <div className="fixed inset-0 pointer-events-none opacity-5 z-0">
          <img src={neuralGridImg} alt="" className="w-full h-full object-cover grayscale" />
          <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/20 via-transparent to-purple-500/20" />
       </div>
       )}

      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 relative z-10">
        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
          <div className="flex items-center gap-3 mb-1">
             <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 flex items-center justify-center text-indigo-400 border border-indigo-500/20">
                <Network size={20} />
             </div>
             <h1 className={`text-3xl font-bold tracking-tighter uppercase ${isDark ? 'text-white' : 'text-gray-900'}`}>Infrastructure <span className="text-indigo-500">Grid</span></h1>
          </div>
          <p className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-13">Network Flow Architecture Control Matrix</p>
        </motion.div>
        
        <div className="flex items-center gap-3">
          <button
            onClick={handleRefresh}
            title="Refresh Data"
            aria-label="Refresh Data"
            className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-slate-400 hover:text-indigo-400 transition-all group"
          >
            <RefreshCw size={18} className={clsx(refreshing && "animate-spin", "group-hover:rotate-180 transition-transform")} />
          </button>
          <Link
            to="/infrastructure/topology"
            className="px-6 h-12 rounded-2xl bg-indigo-500 text-white font-bold text-[10px] uppercase tracking-widest flex items-center gap-3 hover:bg-indigo-600 transition-all shadow-lg shadow-indigo-500/20"
          >
            <Map size={16} /> Deploy Visual Topology
          </Link>
        </div>
      </div>

      {/* Summary Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 relative z-10">
        <StatsSummaryCard title="Grid Nodes" value={stats.total_hosts} subtitle="ACTIVE_INSTANCES" icon={<Server size={20} />} color="#6366f1" />
        <StatsSummaryCard title="Port Matrix" value={stats.total_ports} subtitle="VIRTUAL_VECTORS" icon={<Layers size={20} />} color="#6366f1" />
        <StatsSummaryCard title="Neural Links" value={stats.total_connections} subtitle="MESH_DYNAMICS" icon={<Share2 size={20} />} color="#6366f1" />
        <StatsSummaryCard 
          title="Grid Integrity" 
          value={`${stats.health_summary.healthy > 0 ? ((stats.health_summary.healthy / stats.total_hosts) * 100).toFixed(0) : 0}%`} 
          subtitle="SYSTEM_RELIABILITY" 
          icon={<Activity size={20} />} 
          color="#6366f1" 
        />
      </div>

      <QuickActions />

      {/* Network Layers - Architect Visualization */}
      <div className="relative z-10">
        <div className="flex items-center gap-3 mb-6 px-1">
          <div className="w-1.5 h-6 bg-indigo-500 rounded-full shadow-[0_0_10px_rgba(99,102,241,0.5)]" />
          <h2 className="text-sm font-bold text-white uppercase tracking-[0.2em]">Architecture Layers</h2>
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

      {/* Visual Data Matrix */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 relative z-10">
        <VendorDistribution layers={stats.layers} />
        <NetworkZonesWidget zones={stats.network_zones} />
        <VMPhysicalWidget data={stats.vm_physical_ratio} />
      </div>

      {/* Real-time Telemetry Repository */}
      <div className="relative z-10">
        <div className="architect-card border-indigo-500/10 overflow-hidden">
          {/* Decorative background image for the table section */}
          <div className="absolute inset-0 opacity-[0.03] pointer-events-none">
             <img src={observabilityCoreImg} alt="" className="w-full h-full object-cover grayscale" />
          </div>

          <div className="p-8 border-b border-white/5 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 relative">
             <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 flex items-center justify-center text-indigo-400 border border-indigo-500/20">
                   <Monitor size={20} />
                </div>
                <div>
                   <h3 className="text-lg font-bold text-white uppercase tracking-tight">Node Telemetry</h3>
                   <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest italic font-mono">Real-time repository sync</p>
                </div>
             </div>
             <Link to="/infrastructure/hosts" className="px-5 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-[10px] font-bold text-slate-400 hover:text-white uppercase tracking-widest transition-all border border-white/10">
                Access Archive
             </Link>
          </div>

          <div className="overflow-x-auto relative">
             <table className="w-full text-left tech-table">
               <thead>
                 <tr className="border-b border-white/5 bg-white/[0.02]">
                   <th className="px-8 py-5 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Hostname_Identifier</th>
                   <th className="px-8 py-5 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Layer_Vector</th>
                   <th className="px-8 py-5 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Entity_Type</th>
                   <th className="px-8 py-5 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Vital_Stats</th>
                   <th className="px-8 py-5 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Network_Address</th>
                 </tr>
               </thead>
               <tbody className="divide-y divide-white/[0.02]">
                 <AnimatePresence>
                   {recentHosts.map((host, idx) => (
                     <motion.tr
                       key={host.id}
                       initial={{ opacity: 0, y: 10 }}
                       animate={{ opacity: 1, y: 0 }}
                       transition={{ delay: idx * 0.05 }}
                       className="group hover:bg-indigo-500/[0.02] cursor-pointer transition-colors"
                       onClick={() => navigate(`/infrastructure/hosts/${host.id}`)}
                     >
                       <td className="px-8 py-5 text-sm font-bold text-white group-hover:text-indigo-400 transition-colors uppercase font-mono tracking-tight">{host.hostname}</td>
                       <td className="px-8 py-5">
                         <span className="px-3 py-1 rounded-lg bg-indigo-500/10 text-indigo-400 text-[10px] font-bold uppercase tracking-widest border border-indigo-500/20">
                           {NetworkLayerInfo[host.network_layer]?.name || host.network_layer}
                         </span>
                       </td>
                       <td className="px-8 py-5 text-[10px] font-bold text-slate-400 uppercase tracking-widest">{host.device_category}</td>
                       <td className="px-8 py-5">
                         <div className={clsx(
                           "flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest",
                           host.health_status === 'healthy' ? 'text-emerald-400' : 
                           host.health_status === 'warning' ? 'text-amber-400' : 'text-red-400'
                         )}>
                           <div className={clsx(
                              "w-1.5 h-1.5 rounded-full shadow-[0_0_8px_currentColor]",
                              host.health_status === 'healthy' ? 'bg-emerald-400 animate-pulse' : 
                              host.health_status === 'warning' ? 'bg-amber-400' : 'bg-red-400 animate-ping'
                           )} />
                           {host.health_status}
                         </div>
                       </td>
                       <td className="px-8 py-5 text-[10px] font-mono text-slate-500 font-bold">{host.management_ip || '---_---_---_---'}</td>
                     </motion.tr>
                   ))}
                 </AnimatePresence>
               </tbody>
             </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InfrastructureDashboardPage;
