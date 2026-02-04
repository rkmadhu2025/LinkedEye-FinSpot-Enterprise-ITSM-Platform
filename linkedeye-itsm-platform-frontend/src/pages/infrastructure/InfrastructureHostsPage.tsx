/**
 * Infrastructure Hosts Page
 *
 * Displays all infrastructure hosts (devices) with filtering and search capabilities.
 * Shows hosts organized by network layer with status indicators.
 */

import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import {
  Cpu,
  MonitorUp,
  LayoutGrid,
  List,
  Shield,
  Network,
  Share2,
  Server,
  Box,
  Plus,
  ArrowLeft,
  Activity,
  Search,
  RefreshCw,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { infrastructureHostService, getLayerDisplayName } from '../../services/infrastructureService';
import { InfrastructureHost, NetworkLayerType } from '../../types';
import clsx from 'clsx';

// Assets
import neuralGridImg from '@/assets/neural-grid.jpg';

// Status badge component
const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
  const isHealthy = status === 'healthy' || status === 'active' || status === 'online';
  const isWarning = status === 'warning' || status === 'degraded';
  const isCritical = status === 'critical' || status === 'offline' || status === 'down';

  return (
    <div className={clsx(
      "px-2 py-0.5 rounded-md text-[8px] font-bold uppercase tracking-widest flex items-center gap-1.5 border",
      isHealthy ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" :
      isWarning ? "bg-amber-500/10 text-amber-400 border-amber-500/20" :
      isCritical ? "bg-red-500/10 text-red-500 border-red-500/20" :
      "bg-slate-500/10 text-slate-400 border-slate-500/20"
    )}>
      <div className={clsx(
        "w-1 h-1 rounded-full",
        isHealthy ? "bg-emerald-400 shadow-[0_0_5px_rgba(16,185,129,0.5)] animate-pulse" :
        isWarning ? "bg-amber-400" :
        isCritical ? "bg-red-400 shadow-[0_0_5px_rgba(239,68,68,0.5)] animate-ping" : "bg-slate-500"
      )} />
      {status}
    </div>
  );
};

// Layer icon component
const LayerIcon: React.FC<{ layer: NetworkLayerType; size?: number }> = ({ layer, size = 20 }) => {
  switch (layer) {
    case 'f_swi':
      return <Shield size={size} />;
    case 'r_swi':
      return <Network size={size} />;
    case 'e_swi':
      return <Share2 size={size} />;
    case 's_hw':
      return <Server size={size} />;
    default:
      return <Cpu size={size} />;
  }
};

// Host card component for grid view
const HostCard: React.FC<{ host: InfrastructureHost; onClick: () => void }> = ({ host, onClick }) => {
  const isVM = host.server_type === 'virtual';

  return (
    <motion.div
      whileHover={{ y: -5, scale: 1.02 }}
      onClick={onClick}
      className="architect-card p-5 cursor-pointer group relative overflow-hidden transition-all duration-300 border-indigo-500/10 hover:border-indigo-500/30"
    >
      <div className="flex items-start justify-between mb-4">
        <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-indigo-400 group-hover:scale-110 transition-transform">
          {isVM ? <Box size={18} /> : <LayerIcon layer={host.network_layer} size={18} />}
        </div>
        <div className="flex flex-col gap-1 items-end">
           <StatusBadge status={host.operational_status || 'unknown'} />
           <StatusBadge status={host.health_status || 'unknown'} />
        </div>
      </div>

      <div className="space-y-1 mb-4">
        <h3 className="text-sm font-bold text-white uppercase tracking-tight truncate group-hover:text-indigo-400 transition-colors">
          {host.display_name || host.hostname?.split('.')[0]}
        </h3>
        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-tighter truncate font-mono">
          {host.hostname}
        </p>
      </div>

      <div className="bg-black/20 rounded-xl p-3 border border-white/5 space-y-2">
         <div className="flex justify-between items-center text-[9px] font-bold uppercase tracking-widest text-slate-500">
            <span>management_ip</span>
            <span className="text-indigo-400 font-mono italic">{host.management_ip}</span>
         </div>
         <div className="flex justify-between items-center text-[9px] font-bold uppercase tracking-widest text-slate-500">
            <span>architecture</span>
            <span className="text-white">{getLayerDisplayName(host.network_layer).replace(' Layer', '')}</span>
         </div>
         <div className="flex justify-between items-center text-[9px] font-bold uppercase tracking-widest text-slate-500">
            <span>entity_type</span>
            <span className="text-white">{host.device_category} {isVM ? '(VM)' : ''}</span>
         </div>
      </div>
      
      {/* Detail hint */}
      <div className="mt-4 flex justify-end">
         <span className="text-[8px] font-bold text-indigo-400 uppercase tracking-[0.2em] opacity-0 group-hover:opacity-100 transition-opacity">Access Log →</span>
      </div>
    </motion.div>
  );
};

// Host row component for table view
const HostRow: React.FC<{ host: InfrastructureHost; onClick: () => void }> = ({ host, onClick }) => {
  const isVM = host.server_type === 'virtual';

  return (
    <tr
      onClick={onClick}
      className="group hover:bg-indigo-500/[0.02] cursor-pointer transition-colors"
    >
      <td className="px-8 py-5">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-indigo-400 group-hover:scale-110 transition-transform">
            {isVM ? <Box size={16} /> : <LayerIcon layer={host.network_layer} size={16} />}
          </div>
          <div>
            <div className="text-sm font-bold text-white uppercase tracking-tight group-hover:text-indigo-400 transition-colors">
              {host.display_name || host.hostname?.split('.')[0]}
            </div>
            <div className="text-[10px] font-bold text-slate-500 uppercase tracking-tighter italic font-mono truncate max-w-[150px]">{host.hostname}</div>
          </div>
        </div>
      </td>
      <td className="px-8 py-5 text-[10px] font-mono text-indigo-400/60 font-bold">
        {host.management_ip}
      </td>
      <td className="px-8 py-5">
        <span className="px-3 py-1 rounded-lg bg-indigo-500/10 text-indigo-400 text-[9px] font-bold uppercase tracking-widest border border-indigo-500/20">
          {getLayerDisplayName(host.network_layer).replace(' Layer', '')}
        </span>
      </td>
      <td className="px-8 py-5 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
        {host.device_category} {isVM && <span className="text-indigo-500">(VM)</span>}
      </td>
      <td className="px-8 py-5 text-[10px] font-bold text-slate-500 uppercase tracking-widest italic">
        {host.device_model || '---'}
      </td>
      <td className="px-8 py-5">
        <StatusBadge status={host.operational_status || 'unknown'} />
      </td>
      <td className="px-8 py-5">
        <StatusBadge status={host.health_status || 'unknown'} />
      </td>
    </tr>
  );
};

const InfrastructureHostsPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [hosts, setHosts] = useState<InfrastructureHost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  const [searchQuery, setSearchQuery] = useState('');

  // Initialize filters from URL params
  const layerParam = searchParams.get('layer');
  const typeParam = searchParams.get('type');
  const [selectedLayer, setSelectedLayer] = useState<NetworkLayerType | 'all'>(
    layerParam && ['f_swi', 'r_swi', 'e_swi', 's_hw'].includes(layerParam)
      ? layerParam as NetworkLayerType
      : 'all'
  );
  const [selectedType, setSelectedType] = useState<'all' | 'physical' | 'virtual'>(
    typeParam && ['physical', 'virtual'].includes(typeParam)
      ? typeParam as 'physical' | 'virtual'
      : 'all'
  );

  useEffect(() => {
    fetchHosts();
  }, []);

  // Sync URL params when filters change
  useEffect(() => {
    const newParams = new URLSearchParams();
    if (selectedLayer !== 'all') newParams.set('layer', selectedLayer);
    if (selectedType !== 'all') newParams.set('type', selectedType);
    setSearchParams(newParams, { replace: true });
  }, [selectedLayer, selectedType, setSearchParams]);

  const fetchHosts = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await infrastructureHostService.list(1, 500);
      setHosts(response.data);
    } catch (err: any) {
      console.error('Failed to fetch hosts:', err);
      setError(err.response?.data?.detail || 'Failed to load infrastructure hosts');
    } finally {
      setLoading(false);
    }
  };

  // Filter hosts based on search and filters
  const filteredHosts = hosts.filter((host) => {
    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const matchesSearch =
        host.hostname?.toLowerCase().includes(query) ||
        host.display_name?.toLowerCase().includes(query) ||
        host.management_ip?.includes(query) ||
        host.device_model?.toLowerCase().includes(query) ||
        host.operating_system?.toLowerCase().includes(query);
      if (!matchesSearch) return false;
    }

    // Layer filter
    if (selectedLayer !== 'all' && host.network_layer !== selectedLayer) {
      return false;
    }

    // Type filter (physical/virtual)
    if (selectedType !== 'all') {
      if (selectedType === 'virtual' && host.server_type !== 'virtual') return false;
      if (selectedType === 'physical' && host.server_type === 'virtual') return false;
    }

    return true;
  });

  // Stats
  const stats = {
    total: hosts.length,
    physical: hosts.filter((h) => h.server_type !== 'virtual').length,
    virtual: hosts.filter((h) => h.server_type === 'virtual').length,
    healthy: hosts.filter((h) => h.health_status === 'healthy').length,
    byLayer: {
      f_swi: hosts.filter((h) => h.network_layer === 'f_swi').length,
      r_swi: hosts.filter((h) => h.network_layer === 'r_swi').length,
      e_swi: hosts.filter((h) => h.network_layer === 'e_swi').length,
      s_hw: hosts.filter((h) => h.network_layer === 's_hw').length,
    },
  };

  const handleHostClick = (host: InfrastructureHost) => {
    navigate(`/infrastructure/hosts/${host.id}`);
  };

  if (loading) {
    return (
      <div className="architect-root min-h-screen p-8 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <motion.div animate={{ rotate: 360 }} transition={{ duration: 2, repeat: Infinity, ease: "linear" }} className="w-12 h-12 border-2 border-indigo-500/20 border-t-indigo-500 rounded-full" />
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Hydrating Node Matrix...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 reveal-stagger relative min-h-screen">
       {/* Background Visual Artifact */}
       <div className="fixed inset-0 pointer-events-none opacity-5 z-0">
          <img src={neuralGridImg} alt="" className="w-full h-full object-cover grayscale" />
          <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/10 via-transparent to-purple-500/10" />
       </div>

      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 relative z-10">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/infrastructure')}
            title="Go Back"
            aria-label="Go Back"
            className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/10 transition-all"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tighter uppercase">Host <span className="text-indigo-500">Repository</span></h1>
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em] mt-1 italic">Distributed Infrastructure Control</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchHosts}
            title="Refresh Node Matrix"
            aria-label="Refresh Node Matrix"
            className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-slate-400 hover:text-indigo-400 transition-all group"
          >
            <RefreshCw size={20} className="group-active:rotate-180 transition-transform" />
          </button>
          <Link
            to="/infrastructure/catalog"
            className="px-6 h-12 rounded-2xl bg-indigo-500 text-white font-bold text-[10px] uppercase tracking-widest flex items-center gap-3 hover:bg-indigo-600 transition-all shadow-lg shadow-indigo-500/20"
          >
            <Plus size={18} /> Inject New Node
          </Link>
        </div>
      </div>

      {/* Stats Quick View */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 relative z-10">
         <MetricQuick color="indigo" icon={<MonitorUp size={16}/>} label="Total" value={stats.total} />
         <MetricQuick color="emerald" icon={<Server size={16}/>} label="Physical" value={stats.physical} />
         <MetricQuick color="purple" icon={<Box size={16}/>} label="Virtual" value={stats.virtual} />
         <MetricQuick color="red" icon={<Shield size={16}/>} label="Firewalls" value={stats.byLayer.f_swi} />
         <MetricQuick color="amber" icon={<Network size={16}/>} label="Routers" value={stats.byLayer.r_swi} />
         <MetricQuick color="emerald" icon={<Activity size={16}/>} label="Healthy" value={stats.healthy} />
      </div>

      {/* Filters and Search - Glass Bar */}
      <div className="architect-card p-4 relative z-10 border-indigo-500/10">
        <div className="flex flex-wrap items-center gap-6">
          <div className="relative flex-1 min-w-[300px]">
            <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              placeholder="GLOBAL_SEARCH_QUERY_INIT..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-[10px] font-bold text-white uppercase tracking-widest placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-all"
            />
          </div>

          <div className="flex items-center gap-4">
             <select
                value={selectedLayer}
                title="Filter by Layer"
                aria-label="Filter by Layer"
                onChange={(e) => setSelectedLayer(e.target.value as NetworkLayerType | 'all')}
                className="px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-[10px] font-bold text-white uppercase tracking-widest focus:outline-none focus:ring-1 focus:ring-indigo-500"
              >
                <option value="all">ALL_LAYERS</option>
                <option value="f_swi">FIREWALL_VECTOR</option>
                <option value="r_swi">ROUTING_VECTOR</option>
                <option value="e_swi">EXCHANGE_VECTOR</option>
                <option value="s_hw">SERVER_HW_VECTOR</option>
              </select>

              <select
                value={selectedType}
                title="Filter by Type"
                aria-label="Filter by Type"
                onChange={(e) => setSelectedType(e.target.value as 'all' | 'physical' | 'virtual')}
                className="px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-[10px] font-bold text-white uppercase tracking-widest focus:outline-none focus:ring-1 focus:ring-indigo-500"
              >
                <option value="all">ALL_TYPES</option>
                <option value="physical">PHYSICAL_ONLY</option>
                <option value="virtual">VIRTUAL_ONLY</option>
              </select>

              <div className="flex items-center bg-white/5 border border-white/10 rounded-xl p-1 gap-1">
                <button
                  onClick={() => setViewMode('grid')}
                  title="Grid View"
                  aria-label="Grid View"
                  className={clsx("p-2.5 rounded-lg transition-all", viewMode === 'grid' ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/20' : 'text-slate-500 hover:text-white')}
                >
                  <LayoutGrid size={16} />
                </button>
                <button
                  onClick={() => setViewMode('table')}
                  title="Table View"
                  aria-label="Table View"
                  className={clsx("p-2.5 rounded-lg transition-all", viewMode === 'table' ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/20' : 'text-slate-500 hover:text-white')}
                >
                  <List size={16} />
                </button>
              </div>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="relative z-10 min-h-[400px]">
          <AnimatePresence mode='wait'>
            {!error && filteredHosts.length === 0 ? (
                <motion.div 
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                    key="empty"
                    className="architect-card py-20 text-center border-dashed border-white/10"
                >
                    <Server className="w-16 h-16 text-slate-700 mx-auto mb-6 opacity-20" />
                    <h3 className="text-sm font-bold text-slate-400 uppercase tracking-[0.2em] mb-2">Null Nodes Detected</h3>
                    <p className="text-[10px] font-bold text-slate-600 uppercase tracking-widest">Global filter returned zero results from current sector</p>
                </motion.div>
            ) : viewMode === 'grid' ? (
                <motion.div 
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                    key="grid"
                    className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6"
                >
                  {filteredHosts.map((host) => (
                    <HostCard key={host.id} host={host} onClick={() => handleHostClick(host)} />
                  ))}
                </motion.div>
            ) : (
                <motion.div 
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                    key="table"
                    className="architect-card overflow-hidden border-indigo-500/10"
                >
                  <div className="overflow-x-auto">
                    <table className="w-full text-left tech-table">
                      <thead>
                        <tr className="border-b border-white/5 bg-white/[0.02]">
                          <th className="px-8 py-5 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Hostname_Identifier</th>
                          <th className="px-8 py-5 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Network_Address</th>
                          <th className="px-8 py-5 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Architecture</th>
                          <th className="px-8 py-5 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Category</th>
                          <th className="px-8 py-5 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Hardware_Model</th>
                          <th className="px-8 py-5 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Op_Status</th>
                          <th className="px-8 py-5 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Vitals</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/[0.02]">
                        {filteredHosts.map((host) => (
                          <HostRow key={host.id} host={host} onClick={() => handleHostClick(host)} />
                        ))}
                      </tbody>
                    </table>
                  </div>
                </motion.div>
            )}
          </AnimatePresence>
      </div>

      {/* Pagination / Results Summary */}
      <div className="relative z-10 flex justify-center py-8">
         <div className="px-6 py-2 rounded-full bg-white/5 border border-white/10 text-[9px] font-bold text-slate-500 uppercase tracking-widest italic">
            Repository Sync: Showing {filteredHosts.length} of {hosts.length} active node descriptors
         </div>
      </div>
    </div>
  );
};

// Metric Helper
const MetricQuick: React.FC<{ label: string; value: number; icon: React.ReactNode; color: string }> = ({ label, value, icon, color }) => (
    <div className="architect-card px-4 py-3 flex items-center gap-3 border-indigo-500/10">
        <div className={clsx(
            "w-8 h-8 rounded-lg flex items-center justify-center border",
            color === 'indigo' ? "bg-indigo-500/10 text-indigo-400 border-indigo-500/20" :
            color === 'emerald' ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" :
            color === 'purple' ? "bg-purple-500/10 text-purple-400 border-purple-500/20" :
            color === 'red' ? "bg-red-500/10 text-red-500 border-red-500/20" :
            "bg-amber-500/10 text-amber-400 border-amber-500/20"
        )}>
            {icon}
        </div>
        <div>
            <div className="text-sm font-bold text-white font-mono tracking-tighter leading-none">{value}</div>
            <div className="text-[8px] font-bold text-slate-600 uppercase tracking-widest mt-1">{label}</div>
        </div>
    </div>
);

export default InfrastructureHostsPage;
