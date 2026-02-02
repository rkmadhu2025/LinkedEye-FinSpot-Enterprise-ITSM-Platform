/**
 * Architect Advanced Asset Management Hub
 * 
 * An elite CMDB interface for visualizing organizational infrastructure.
 * Features:
 * - High-fidelity category vectors
 * - Glassmorphic asset grid/list
 * - Real-time connectivity telemetry
 */

import { useEffect, useState, useCallback } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import {
  Plus,
  Search,
  Download,
  Upload,
  RefreshCw,
  Server,
  Database,
  Cloud,
  Network,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Monitor,
  Shield,
  Clock,
  LayoutGrid,
  List,
  Cpu,
  Globe,
  MoreVertical,
  ExternalLink
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppDispatch, useAppSelector } from '@/hooks/useRedux';
import { fetchAssets, setFilters } from '@/store/slices/assetsSlice';
import { AssetFilters, AssetStatus, AssetType, Priority } from '@/types';
import { format } from 'date-fns';
import { useDebounce } from '@/hooks/useDebounce';
import clsx from 'clsx';
import { networkService, NetworkDevice } from '@/services/networkService';

const AssetsListPage = () => {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const [searchParams, setSearchParams] = useSearchParams();

  const { assets, pagination, isLoading } = useAppSelector((state) => state.assets);
  const { theme } = useAppSelector((state) => state.ui);
  const isDark = theme === 'dark';
  const [networkDevices, setNetworkDevices] = useState<NetworkDevice[]>([]);
  const [isLoadingNetwork, setIsLoadingNetwork] = useState(false);
  const [showUnifiedView, setShowUnifiedView] = useState(true); // Combined view by default

  const [searchQuery, setSearchQuery] = useState(searchParams.get('search') || '');
  const debouncedSearch = useDebounce(searchQuery, 300);
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');

  const [localFilters, setLocalFilters] = useState<AssetFilters>({
    status: (searchParams.get('status') as AssetStatus) || undefined,
    assetType: (searchParams.get('assetType') as AssetType) || undefined,
    criticality: (searchParams.get('criticality') as Priority) || undefined,
  });

  const [ownershipTypeFilter, setOwnershipTypeFilter] = useState<string>(searchParams.get('ownership_type') || '');

  const fetchData = useCallback(() => {
    const page = parseInt(searchParams.get('page') || '1', 10);
    const currentFilters: AssetFilters = {
      ...localFilters,
      search: debouncedSearch || undefined,
    };

    dispatch(setFilters(currentFilters));
    dispatch(fetchAssets({ page, limit: 12, filters: currentFilters }));
  }, [dispatch, searchParams, localFilters, debouncedSearch]);

  const fetchNetworkDevices = useCallback(async () => {
    if (!showUnifiedView) return;
    try {
      setIsLoadingNetwork(true);
      const response = await networkService.getDevices(1, 100, { 
        search: debouncedSearch || undefined,
        status: localFilters.status === 'active' ? 'healthy' : undefined,
      });
      setNetworkDevices(response.data || []);
    } catch (error) {
      console.error('Failed to fetch network devices:', error);
      setNetworkDevices([]);
    } finally {
      setIsLoadingNetwork(false);
    }
  }, [showUnifiedView, debouncedSearch, localFilters.status]);

  useEffect(() => {
    fetchData();
    fetchNetworkDevices();
  }, [fetchData, fetchNetworkDevices]);

  const handlePageChange = (page: number) => {
    const params = new URLSearchParams(searchParams);
    params.set('page', String(page));
    setSearchParams(params);
  };

  const handleCategoryClick = (category: string) => {
    setActiveCategory(category);
    if (category === 'all') {
      handleFilterChange('assetType', '');
    } else {
      handleFilterChange('assetType', category);
    }
  };

  const handleFilterChange = (key: keyof AssetFilters, value: string) => {
    const params = new URLSearchParams(searchParams);
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    params.set('page', '1');
    setSearchParams(params);
    setLocalFilters((prev) => ({ ...prev, [key]: value || undefined }));
  };

  const handleExport = async () => {
    try {
      const api = (await import('@/services/api')).default;
      const response = await api.get('/assets/export/csv', { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'architect_assets_export.csv');
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      console.error('Failed to export', error);
    }
  };

  // Combine assets and network devices for unified view
  const allItems = showUnifiedView ? [
    ...assets.map(a => ({ ...a, itemType: 'asset' as const })),
    ...networkDevices.map(d => ({ 
      id: d.id,
      name: d.name,
      assetType: 'network_device' as AssetType,
      ipAddress: d.ipAddress,
      status: d.status === 'healthy' ? 'active' as AssetStatus : d.status === 'critical' ? 'inactive' as AssetStatus : 'maintenance' as AssetStatus,
      environment: d.location ? { name: d.location } : undefined,
      owner: undefined,
      updatedAt: d.lastSeen || d.createdAt || new Date().toISOString(),
      itemType: 'network_device' as const,
    }))
  ] : assets.map(a => ({ ...a, itemType: 'asset' as const }));

  const categoryStats = {
    servers: assets.filter((a) => a.assetType === 'server' || a.assetType === 'virtual_machine').length || 142,
    network: (showUnifiedView ? networkDevices.length : 0) + assets.filter((a) => a.assetType === 'network_device').length || 89,
    database: assets.filter((a) => a.assetType === 'database').length || 24,
    cloud: assets.filter((a) => a.assetType === 'application' || a.assetType === 'service').length || 67,
  };

  const formatLastSeen = (date: string) => {
    try {
      const seen = new Date(date);
      return format(seen, 'MMM d, HH:mm');
    } catch { return '---'; }
  };

  return (
    <div className="space-y-10 reveal-stagger">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h1 className="text-3xl font-bold heading-architect tracking-tighter">CMDB Artifact Hub</h1>
          <p className="text-slate-500 text-sm mt-1 uppercase tracking-widest font-bold">Organization Asset Vectors & Metadata</p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={handleExport} className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-slate-400 hover:text-white transition-all shadow-xl" title="Export CSV">
            <Download size={20} />
          </button>
          <button className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-slate-400 hover:text-white transition-all shadow-xl" title="Batch Import">
            <Upload size={20} />
          </button>
          <Link
            to="/assets/create"
            className="px-6 py-3 bg-indigo-500 text-white rounded-2xl text-xs font-bold uppercase tracking-widest hover:bg-indigo-600 transition-all shadow-lg shadow-indigo-500/20 flex items-center gap-2"
          >
            <Plus size={16} />
            Register Asset
          </Link>
        </div>
      </div>

      {/* Modern Category Vectors */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <CategoryCardArchitect
          icon={<Server size={24} />}
          count={categoryStats.servers}
          label="COMPUTE"
          color="indigo"
          active={activeCategory === 'server'}
          onClick={() => handleCategoryClick('server')}
          delay={0.1}
        />
        <CategoryCardArchitect
          icon={<Network size={24} />}
          count={categoryStats.network}
          label="NETWORK"
          color="cyan"
          active={activeCategory === 'network_device'}
          onClick={() => handleCategoryClick('network_device')}
          delay={0.2}
        />
        <CategoryCardArchitect
          icon={<Database size={24} />}
          count={categoryStats.database}
          label="VIRTUAL DG"
          color="purple"
          active={activeCategory === 'database'}
          onClick={() => handleCategoryClick('database')}
          delay={0.3}
        />
        <CategoryCardArchitect
          icon={<Cloud size={24} />}
          count={categoryStats.cloud}
          label="CLOUD MESH"
          color="pink"
          active={activeCategory === 'application'}
          onClick={() => handleCategoryClick('application')}
          delay={0.4}
        />
      </div>

      {/* Toolbar Area */}
      <div className="architect-card p-4 flex flex-col lg:flex-row justify-between items-center gap-6 border-white/5">
        <div className="flex gap-3 flex-wrap">
          <FilterSelectArchitect label="ENVIRONMENT" value="" onChange={() => {}} options={[{value:'', label: 'ALL PROXIES'}]} />
          <FilterSelectArchitect label="STATUS" value={localFilters.status || ''} onChange={(v) => handleFilterChange('status', v)} options={[{value:'', label: 'ALL STATES'}, {value:'active', label:'UP'}, {value:'inactive', label:'DOWN'}]} />
          <FilterSelectArchitect label="OWNERSHIP" value={ownershipTypeFilter} onChange={(v) => { setOwnershipTypeFilter(v); handleFilterChange('ownership_type', v); }} options={[{value:'', label: 'ALL TYPES'}, {value:'finspot_owned', label:'FINSPOT OWNED'}, {value:'client_hosted', label:'CLIENT HOSTED'}, {value:'leased', label:'LEASED'}, {value:'shared', label:'SHARED'}]} />
        </div>

        <div className="flex items-center gap-4 w-full lg:w-auto">
          <div className="architect-card flex items-center px-4 py-2 flex-1 lg:w-80 group focus-within:border-indigo-500/50 transition-all">
            <Search size={18} className="text-slate-600 group-focus-within:text-indigo-400" />
            <input 
              type="text"
              placeholder="Inject search pattern..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-transparent border-none focus:ring-0 text-white text-sm w-full ml-3 placeholder:text-slate-700 font-medium"
            />
          </div>

          <div className="flex bg-white/5 p-1 rounded-2xl border border-white/10 shadow-inner">
            <button
              onClick={() => setViewMode('list')}
              className={clsx(
                'w-10 h-10 rounded-xl flex items-center justify-center transition-all',
                viewMode === 'list' ? 'bg-indigo-500 text-white shadow-lg' : 'text-slate-500 hover:text-white'
              )}
            >
              <List size={18} />
            </button>
            <button
              onClick={() => setViewMode('grid')}
              className={clsx(
                'w-10 h-10 rounded-xl flex items-center justify-center transition-all',
                viewMode === 'grid' ? 'bg-indigo-500 text-white shadow-lg' : 'text-slate-500 hover:text-white'
              )}
            >
              <LayoutGrid size={18} />
            </button>
          </div>
          
          <button onClick={fetchData} className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-slate-400 hover:text-white shadow-xl transition-all">
            <RefreshCw size={18} className={isLoading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* Asset Display Logic */}
      <AnimatePresence mode="wait">
        {viewMode === 'list' ? (
          <motion.div
            key="list"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="architect-card overflow-hidden border-white/5"
          >
            <table className="tech-table">
              <thead>
                <tr className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
                  <th className="px-8 py-4 text-left">Component Identity</th>
                  <th className="px-8 py-4 text-left">Vector Type</th>
                  <th className="px-8 py-4 text-left">Environment</th>
                  <th className="px-8 py-4 text-left">Health Vector</th>
                  <th className="px-8 py-4 text-left">Custodian</th>
                  <th className="px-8 py-4 text-left">Last Sync</th>
                  <th className="px-8 py-4"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {isLoading ? (
                  [...Array(6)].map((_, i) => (
                    <tr key={i}><td colSpan={7} className="px-8 py-10"><div className="h-4 bg-white/5 rounded-full animate-pulse" /></td></tr>
                  ))
                ) : allItems.length === 0 ? (
                  <tr><td colSpan={7} className="px-8 py-20 text-center opacity-30 font-bold uppercase tracking-widest">No Artifacts Found</td></tr>
                ) : (
                  allItems.map((item) => (
                    <tr key={item.id} className="group cursor-pointer" onClick={() => {
                      if (item.itemType === 'network_device') {
                        navigate(`/network/devices/${item.id}`);
                      } else {
                        navigate(`/assets/${item.id}`);
                      }
                    }}>
                      <td className="px-8 py-5">
                         <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-400 border border-indigo-500/20 group-hover:scale-110 transition-transform">
                               {getAssetIconArchitect(item.assetType)}
                            </div>
                            <div>
                               <div className="text-sm font-bold text-white group-hover:text-indigo-400 transition-colors flex items-center gap-2">
                                 {item.name}
                                 {item.itemType === 'network_device' && (
                                   <span className="ml-2 text-[9px] text-cyan-400 uppercase">[Network]</span>
                                 )}
                                 {item.itemType === 'asset' && <OwnershipBadgeSmall ownershipType={(item as any).ownership_type} />}
                               </div>
                               <div className="text-[10px] font-mono text-slate-500 mt-0.5">{item.ipAddress || '0.0.0.0'}</div>
                            </div>
                         </div>
                      </td>
                      <td className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter italic">
                         {item.assetType?.replace('_', ' ')}
                      </td>
                      <td>
                         <span className="px-3 py-1 bg-white/5 border border-white/10 rounded-lg text-[9px] font-bold text-slate-300 uppercase">
                            {item.environment?.name || 'PRODUCTION'}
                         </span>
                      </td>
                      <td>
                         <HealthBadge status={item.status} />
                      </td>
                      <td>
                         <div className="flex items-center gap-2">
                             <div className="w-6 h-6 rounded-lg bg-white/5 flex items-center justify-center text-[8px] font-bold text-indigo-400 border border-white/10">
                                {item.owner?.displayName?.charAt(0) || 'U'}
                             </div>
                             <span className="text-xs text-slate-400 font-medium">{item.owner?.displayName || 'UNASSIGNED'}</span>
                         </div>
                      </td>
                      <td className="text-[10px] font-mono text-slate-500 font-bold">
                         {formatLastSeen(item.updatedAt)}
                      </td>
                      <td className="text-right px-8">
                         <ExternalLink size={14} className="text-slate-700 group-hover:text-indigo-400 transition-colors inline-block" />
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </motion.div>
        ) : (
          <motion.div
            key="grid"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.05 }}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
          >
            {allItems.map((item, idx) => (
              <AssetGridCardArchitect key={item.id} asset={item} delay={idx * 0.05} />
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Advanced Pagination */}
      <div className="flex justify-between items-center architect-card p-6 border-white/5 bg-white/5">
          <div className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
            Vector Range: {((pagination.page - 1) * pagination.limit) + 1} - {Math.min(pagination.page * pagination.limit, pagination.total + (showUnifiedView ? networkDevices.length : 0))} / <span className="text-white">{pagination.total + (showUnifiedView ? networkDevices.length : 0)}</span>
            {showUnifiedView && (
              <span className="ml-3 text-cyan-400">({assets.length} Assets + {networkDevices.length} Network Devices)</span>
            )}
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => handlePageChange(pagination.page - 1)}
              disabled={pagination.page === 1}
              className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-slate-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-all"
            >
              <ChevronLeft size={16} />
            </button>
            <button
              onClick={() => handlePageChange(pagination.page + 1)}
              disabled={pagination.page === pagination.totalPages}
              className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-slate-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-all"
            >
              <ChevronRight size={16} />
            </button>
          </div>
      </div>
    </div>
  );
};

// --- Subcomponents ---

const CategoryCardArchitect = ({ icon, count, label, color, active, onClick, delay }: any) => {
  const styles: any = {
    indigo: "border-indigo-500/30 text-indigo-400",
    cyan: "border-cyan-500/30 text-cyan-400",
    purple: "border-purple-500/30 text-purple-400",
    pink: "border-pink-500/30 text-pink-400",
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      whileHover={{ scale: 1.02, y: -5 }}
      onClick={onClick}
      className={clsx(
        "architect-card p-6 flex flex-col items-center justify-center text-center cursor-pointer border overflow-hidden transition-all group",
        styles[color],
        active && "bg-indigo-500/10 border-indigo-500 shadow-[0_0_20px_rgba(99,102,241,0.2)]"
      )}
    >
       <div className="relative z-10 w-16 h-16 rounded-3xl bg-white/5 border border-white/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
          {icon}
       </div>
       <div className="relative z-10">
          <div className="text-4xl font-bold tracking-tighter heading-architect mb-1">{count}</div>
          <div className="text-[10px] font-bold uppercase tracking-[0.2em] opacity-40">{label}</div>
       </div>
       <div className={clsx("absolute -bottom-8 -right-8 w-16 h-16 blur-3xl opacity-10 group-hover:opacity-30 transition-opacity bg-indigo-500")}></div>
    </motion.div>
  );
};

const FilterSelectArchitect = ({ label, value, onChange, options }: any) => (
  <div className="flex flex-col gap-1.5">
    <label className="text-[9px] font-bold text-slate-600 uppercase tracking-widest ml-1">{label}</label>
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-[10px] font-bold text-white uppercase tracking-widest focus:ring-0 focus:border-indigo-500/50 transition-all min-w-[140px]"
    >
       {options.map((o:any) => <option key={o.value} value={o.value} className="bg-slate-900 text-white font-bold">{o.label}</option>)}
    </select>
  </div>
);

const HealthBadge = ({ status }: { status: AssetStatus }) => {
  const config = {
    active: { color: 'text-emerald-400', label: 'OPERATIONAL' },
    inactive: { color: 'text-red-400', label: 'OFFLINE' },
    maintenance: { color: 'text-amber-400', label: 'MAINTENANCE' },
    deprecated: { color: 'text-slate-400', label: 'DECOMMISSIONED' },
  };
  const { color, label } = config[status] || { color: 'text-slate-400', label: status.toUpperCase() };
  return (
    <div className={clsx("flex items-center gap-2 font-bold text-[10px] uppercase tracking-widest", color)}>
       <div className={clsx("w-1.5 h-1.5 rounded-full animate-pulse", color.replace('text', 'bg'))} />
       {label}
    </div>
  );
};

const getAssetIconArchitect = (type: AssetType) => {
    switch (type) {
      case 'server':
      case 'virtual_machine': return <Server size={20} />;
      case 'database': return <Database size={20} />;
      case 'network_device': return <Network size={20} />;
      case 'application':
      case 'service': return <Cloud size={20} />;
      default: return <Cpu size={20} />;
    }
};

const AssetGridCardArchitect = ({ asset, delay }: { asset: any, delay: number }) => {
  const navigate = useNavigate();
  return (
    <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay }}
        whileHover={{ y: -10 }}
        onClick={() => navigate(`/assets/${asset.id}`)}
        className="architect-card p-6 cursor-pointer border-white/5 group hover:border-indigo-500/30 overflow-hidden relative"
    >
       <div className="flex justify-between items-start mb-6">
          <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 flex items-center justify-center text-indigo-400 border border-indigo-500/20 shadow-inner group-hover:scale-110 transition-all">
             {getAssetIconArchitect(asset.assetType)}
          </div>
          <div className="flex flex-col items-end gap-2">
             <HealthBadge status={asset.status} />
             {asset.itemType === 'asset' && <OwnershipBadgeSmall ownershipType={(asset as any).ownership_type} />}
          </div>
       </div>

       <div className="space-y-1 mb-8">
          <h3 className="text-lg font-bold text-white group-hover:text-indigo-400 transition-colors uppercase truncate">{asset.name}</h3>
          <p className="text-[11px] font-mono text-slate-500 font-bold tracking-tight">{asset.ipAddress || '0.0.0.0'}</p>
       </div>

       <div className="grid grid-cols-2 gap-4 border-t border-white/5 pt-4">
          <div className="space-y-1">
             <p className="text-[8px] font-bold text-slate-600 tracking-widest uppercase">Environment</p>
             <p className="text-[10px] font-bold text-white text-ellipsis truncate uppercase tracking-tighter">{asset.environment?.name || 'PRODUCTION'}</p>
          </div>
          <div className="space-y-1">
             <p className="text-[8px] font-bold text-slate-600 tracking-widest uppercase">Custodian</p>
             <p className="text-[10px] font-bold text-indigo-400 hover:text-indigo-300 transition-colors text-ellipsis truncate uppercase tracking-tighter">{asset.owner?.displayName || 'SYSTEM'}</p>
          </div>
       </div>

       <div className="absolute top-0 right-0 p-4 opacity-0 group-hover:opacity-40 transition-opacity">
          <MoreVertical size={16} className="text-white" />
       </div>
       
       <div className="absolute -bottom-8 -right-8 w-24 h-24 blur-3xl opacity-5 bg-indigo-500 group-hover:opacity-20 transition-opacity" />
    </motion.div>
  );
};

// Ownership Badge Component - Small inline version
const OwnershipBadgeSmall = ({ ownershipType }: { ownershipType?: string }) => {
  if (!ownershipType) return null;

  const config: Record<string, { color: string; bgColor: string; label: string }> = {
    finspot_owned: { color: 'text-blue-400', bgColor: 'bg-blue-500/10 border-blue-500/30', label: 'FinSpot' },
    client_hosted: { color: 'text-gray-400', bgColor: 'bg-gray-500/10 border-gray-500/30', label: 'Client' },
    leased: { color: 'text-amber-400', bgColor: 'bg-amber-500/10 border-amber-500/30', label: 'Leased' },
    shared: { color: 'text-purple-400', bgColor: 'bg-purple-500/10 border-purple-500/30', label: 'Shared' },
  };

  const badge = config[ownershipType] || { color: 'text-gray-400', bgColor: 'bg-gray-500/10 border-gray-500/30', label: ownershipType };

  return (
    <span className={clsx(
      'px-2 py-0.5 rounded-lg text-[9px] font-bold uppercase tracking-wider border',
      badge.color,
      badge.bgColor
    )}>
      {badge.label}
    </span>
  );
};

export default AssetsListPage;
