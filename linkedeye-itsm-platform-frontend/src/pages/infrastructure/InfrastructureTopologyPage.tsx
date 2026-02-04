/**
 * Infrastructure Topology Page
 *
 * Interactive network topology visualization with:
 * - 2D/3D device representations
 * - Layer-based grouping (f_swi, r_swi, e_swi, s_hw)
 * - Connection flow visualization
 * - Real-time status updates
 * - Client-wise filtering
 */

import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  ArrowLeft,
  RefreshCw,
  Download,
  Settings,
  Layers,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Grid,
  Filter,
  Search,
  Play,
  Pause,
  RotateCcw,
  Save,
  Eye,
  EyeOff,
  ChevronDown,
  Info,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Activity,
  Network,
} from 'lucide-react';
import toast from 'react-hot-toast';
import NetworkTopologyVisualization from '../../components/infrastructure/NetworkTopologyVisualization';
import {
  TopologyData,
  FullTopologyHost,
  FullTopologyConnection,
  NetworkLayerType,
  NetworkLayerInfo,
} from '../../types';
import { topologyService } from '../../services/infrastructureService';

// =====================================
// Layer Filter Button Component
// =====================================

interface LayerFilterProps {
  layer: NetworkLayerType;
  active: boolean;
  count: number;
  onToggle: () => void;
}

const LayerFilterButton: React.FC<LayerFilterProps> = ({ layer, active, count, onToggle }) => {
  const info = NetworkLayerInfo[layer];

  return (
    <button
      onClick={onToggle}
      className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-all shadow-sm layer-filter-btn ${
        active
          ? 'border-2 active'
          : 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 opacity-80'
      }`}
      style={{
        '--dynamic-color': info.color,
        '--dynamic-color-alpha': `${info.color}20`,
      } as React.CSSProperties}
    >
      <span className="text-lg">{info.icon}</span>
      <span className={active ? 'text-gray-900 dark:text-white font-medium' : 'text-gray-600 dark:text-gray-400'}>{info.label}</span>
      <span
        className={`px-1.5 py-0.5 rounded text-xs font-medium layer-count-badge ${active ? 'active' : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400'}`}
        style={{
          '--dynamic-color': info.color,
        } as React.CSSProperties}
      >
        {count}
      </span>
    </button>
  );
};

// =====================================
// Connection Legend Component
// =====================================

const ConnectionLegend: React.FC = () => {
  const connectionTypes = [
    { type: 'CONNECTS_TO', color: '#60a5fa', label: 'Physical Connection' },
    { type: 'LINKS_TO', color: '#34d399', label: 'Network Link' },
    { type: 'RUNS_ON', color: '#a78bfa', label: 'VM to Host' },
    { type: 'DEPENDS_ON', color: '#fbbf24', label: 'Dependency' },
    { type: 'BACKUP_OF', color: '#f472b6', label: 'Backup' },
  ];

  return (
    <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
      <h4 className="text-white font-medium mb-3 flex items-center gap-2">
        <Network size={16} />
        Connection Types
      </h4>
      <div className="space-y-2">
        {connectionTypes.map((ct) => (
          <div key={ct.type} className="flex items-center gap-2">
            <div
              className="w-8 h-0.5 rounded bg-dynamic"
              style={{ '--dynamic-color': ct.color } as React.CSSProperties}
            />
            <span className="text-gray-600 dark:text-gray-300 text-sm">{ct.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

// =====================================
// Status Legend Component
// =====================================

const StatusLegend: React.FC = () => {
  const statuses = [
    { status: 'up', color: '#22c55e', label: 'Online' },
    { status: 'warning', color: '#f59e0b', label: 'Warning' },
    { status: 'down', color: '#ef4444', label: 'Offline' },
    { status: 'maintenance', color: '#3b82f6', label: 'Maintenance' },
    { status: 'unknown', color: '#6b7280', label: 'Unknown' },
  ];

  return (
    <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
      <h4 className="text-white font-medium mb-3 flex items-center gap-2">
        <Activity size={16} />
        Device Status
      </h4>
      <div className="space-y-2">
        {statuses.map((s) => (
          <div key={s.status} className="flex items-center gap-2">
            <div
              className="w-3 h-3 rounded-full bg-dynamic"
              style={{ '--dynamic-color': s.color } as React.CSSProperties}
            />
            <span className="text-gray-600 dark:text-gray-300 text-sm">{s.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

// =====================================
// Device Info Panel Component
// =====================================

interface DeviceInfoPanelProps {
  device: FullTopologyHost | null;
  connections: FullTopologyConnection[];
  onClose: () => void;
  onViewDetails: (deviceId: string) => void;
}

const DeviceInfoPanel: React.FC<DeviceInfoPanelProps> = ({ device, connections, onClose, onViewDetails }) => {
  if (!device) return null;

  const layerInfo = NetworkLayerInfo[device.network_layer as NetworkLayerType];
  const deviceConnections = connections.filter(
    (c) => c.source_host_id === device.id || c.target_host_id === device.id
  );

  return (
    <div className="w-[340px] bg-white dark:bg-gray-800 border-l border-gray-200 dark:border-gray-700 shadow-xl overflow-y-auto z-20 flex flex-col h-full animate-slide-in-right">
      <div className="flex items-center justify-between p-6 mb-6">
        <h3 className="font-semibold text-[15px] text-[#0f1c3f] dark:text-gray-100">Device Details</h3>
        <button 
          onClick={onClose}
          className="w-[34px] h-[34px] border border-[#e5e8eb] dark:border-gray-600 bg-white dark:bg-gray-700 rounded-lg flex items-center justify-center hover:bg-[#f9fafb] dark:hover:bg-gray-600 transition-colors"
        >
          <XCircle size={18} className="text-[#6b7785] dark:text-gray-400" />
        </button>
      </div>

      <div className="text-center mb-6 px-6">
        <div className="w-[68px] h-[68px] bg-[rgba(16,185,129,0.1)] rounded-2xl flex items-center justify-center mx-auto mb-3.5 text-emerald-500">
           {layerInfo?.icon || <Network size={30} />}
        </div>
        <div className="text-[18px] font-bold text-[#0f1c3f] dark:text-white mb-1">{device.hostname}</div>
        <div className="text-[12px] text-[#6b7785] dark:text-gray-400">{device.device_vendor} {device.device_model}</div>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-6 px-6">
        <div className="bg-[#f9fafb] dark:bg-gray-700/50 p-3.5 rounded-[10px] text-center">
          <div className="text-[22px] font-bold text-emerald-500 leading-none">{device.cpu_usage ? device.cpu_usage.toFixed(0) : 0}%</div>
          <div className="text-[11px] text-[#6b7785] dark:text-gray-400 mt-1.5">CPU Usage</div>
        </div>
        <div className="bg-[#f9fafb] dark:bg-gray-700/50 p-3.5 rounded-[10px] text-center">
          <div className="text-[22px] font-bold text-emerald-500 leading-none">{device.memory_usage ? device.memory_usage.toFixed(0) : 0}%</div>
          <div className="text-[11px] text-[#6b7785] dark:text-gray-400 mt-1.5">Memory</div>
        </div>
      </div>

      <div className="mb-6 px-6">
        <div className="text-[11px] font-bold text-[#6b7785] dark:text-gray-400 uppercase tracking-wider mb-3">Device Information</div>
        <div className="space-y-2.5">
          <div className="flex justify-between border-b border-[#e5e8eb] dark:border-gray-700 pb-2.5 text-[12px]">
            <span className="text-[#6b7785] dark:text-gray-400">IP Address</span>
            <span className="font-semibold text-[#0f1c3f] dark:text-gray-200">{device.management_ip || 'N/A'}</span>
          </div>
          <div className="flex justify-between border-b border-[#e5e8eb] dark:border-gray-700 pb-2.5 text-[12px]">
            <span className="text-[#6b7785] dark:text-gray-400">Layer</span>
            <span className="font-semibold text-[#0f1c3f] dark:text-gray-200">{layerInfo?.label}</span>
          </div>
          <div className="flex justify-between border-b border-[#e5e8eb] dark:border-gray-700 pb-2.5 text-[12px]">
            <span className="text-[#6b7785] dark:text-gray-400">Status</span>
            <span className={`font-semibold capitalize ${device.status === 'up' ? 'text-emerald-500' : 'text-red-500'}`}>{device.status}</span>
          </div>
        </div>
      </div>

      <div className="px-6 pb-6">
         <div className="text-[11px] font-bold text-[#6b7785] dark:text-gray-400 uppercase tracking-wider mb-3">Connections ({deviceConnections.length})</div>
         <div className="space-y-2">
            {deviceConnections.map(conn => (
                <div key={conn.id} className="flex justify-between items-center text-[12px] py-1">
                    <span className="text-[#6b7785] dark:text-gray-400">{conn.relationship_type}</span>
                    <span className="font-mono text-[#0f1c3f] dark:text-gray-300">{conn.bandwidth || '1G'}</span>
                </div>
            ))}
         </div>
      </div>

      <div className="mt-auto p-6 border-t border-[#e5e8eb] dark:border-gray-700">
        <button
          className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium text-sm transition-all shadow-lg shadow-blue-500/30 flex items-center justify-center gap-2"
          onClick={() => onViewDetails(device.id)}
        >
          <Eye size={16} /> View Full Details
        </button>
      </div>
    </div>
  );
};

// =====================================
// Main Page Component
// =====================================

const InfrastructureTopologyPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  // State
  const [topologyData, setTopologyData] = useState<TopologyData | null>(null);
  const [loading, setLoading] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [showLabels, setShowLabels] = useState(true);
  const [showLegend, setShowLegend] = useState(true);
  const [selectedDevice, setSelectedDevice] = useState<FullTopologyHost | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [zoom, setZoom] = useState(1);
  const [activeLayers, setActiveLayers] = useState<Set<NetworkLayerType>>(
    new Set([
      NetworkLayerType.F_SWI,
      NetworkLayerType.R_SWI,
      NetworkLayerType.E_SWI,
      NetworkLayerType.S_HW,
    ])
  );

  const refreshIntervalRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Fetch topology data
  const fetchTopologyData = useCallback(async () => {
    try {
      const clientId = searchParams.get('client_id') || undefined;
      const data = await topologyService.getFullTopology(clientId);
      setTopologyData(data);
    } catch (error) {
      console.error('Failed to fetch topology data:', error);
      toast.error('Failed to load topology data');
    } finally {
      setLoading(false);
    }
  }, [searchParams]);

  useEffect(() => {
    fetchTopologyData();
  }, [fetchTopologyData]);

  // Auto-refresh
  useEffect(() => {
    if (autoRefresh) {
      refreshIntervalRef.current = setInterval(fetchTopologyData, 30000);
    } else {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
      }
    }

    return () => {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
      }
    };
  }, [autoRefresh, fetchTopologyData]);

  // Filter topology by active layers
  const filteredTopology: TopologyData | null = topologyData
    ? {
        ...topologyData,
        hosts: topologyData.hosts.filter((h) =>
          activeLayers.has(h.network_layer as NetworkLayerType)
        ),
        connections: topologyData.connections.filter((c) => {
          const sourceHost = topologyData.hosts.find((h) => h.id === c.source_host_id);
          const targetHost = topologyData.hosts.find((h) => h.id === c.target_host_id);
          return (
            sourceHost &&
            targetHost &&
            activeLayers.has(sourceHost.network_layer as NetworkLayerType) &&
            activeLayers.has(targetHost.network_layer as NetworkLayerType)
          );
        }),
      }
    : null;

  // Search filter
  const searchFilteredTopology: TopologyData | null =
    filteredTopology && searchQuery
      ? {
          ...filteredTopology,
          hosts: filteredTopology.hosts.filter(
            (h) =>
              h.hostname.toLowerCase().includes(searchQuery.toLowerCase()) ||
              (h.management_ip && h.management_ip.includes(searchQuery)) ||
              (h.device_vendor && h.device_vendor.toLowerCase().includes(searchQuery.toLowerCase()))
          ),
        }
      : filteredTopology;

  // Layer counts
  const layerCounts = topologyData?.hosts.reduce(
    (acc: Record<string, number>, h) => {
      acc[h.network_layer as string] = (acc[h.network_layer as string] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  ) || {};

  // Toggle layer
  const toggleLayer = (layer: NetworkLayerType) => {
    setActiveLayers((prev) => {
      const next = new Set(prev);
      if (next.has(layer)) {
        next.delete(layer);
      } else {
        next.add(layer);
      }
      return next;
    });
  };

  // Export topology as PNG
  const handleExport = () => {
    // This would typically use a library like html2canvas
    toast.success('Exporting topology... (Feature coming soon)');
  };

  // Reset view
  const handleResetView = () => {
    setZoom(1);
    setActiveLayers(
      new Set([
        NetworkLayerType.F_SWI,
        NetworkLayerType.R_SWI,
        NetworkLayerType.E_SWI,
        NetworkLayerType.S_HW,
      ])
    );
    setSearchQuery('');
    setSelectedDevice(null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-500 dark:text-gray-400">Loading topology data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4 shadow-sm dark:shadow-none">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/infrastructure')}
              title="Back"
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
            >
              <ArrowLeft size={20} />
            </button>
            <div>
              <h1 className="text-xl font-bold text-gray-900 dark:text-white">Network Topology</h1>
              <p className="text-gray-500 dark:text-gray-400 text-sm">
                {searchFilteredTopology?.hosts.length || 0} devices •{' '}
                {searchFilteredTopology?.connections.length || 0} connections
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Search */}
            <div className="relative">
              <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search devices..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 pr-4 py-2 bg-gray-100 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:border-blue-500 w-48 transition-all"
              />
            </div>

            {/* Auto-refresh toggle */}
            <button
              onClick={() => setAutoRefresh(!autoRefresh)}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors ${
                autoRefresh
                  ? 'bg-green-100 dark:bg-green-600/20 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-500'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              {autoRefresh ? <Pause size={18} /> : <Play size={18} />}
              <span className="text-sm">{autoRefresh ? 'Live' : 'Refresh'}</span>
            </button>

            {/* Manual refresh */}
            <button
              onClick={fetchTopologyData}
              title="Refresh Data"
              className="p-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg text-gray-600 dark:text-gray-300 transition-colors"
            >
              <RefreshCw size={18} />
            </button>

            {/* Export */}
            <button
              onClick={handleExport}
              title="Export Topology"
              className="p-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg text-gray-600 dark:text-gray-300 transition-colors"
            >
              <Download size={18} />
            </button>

            {/* Reset view */}
            <button
              onClick={handleResetView}
              title="Reset View"
              className="p-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg text-gray-600 dark:text-gray-300 transition-colors"
            >
              <RotateCcw size={18} />
            </button>
          </div>
        </div>
      </div>

      {/* Layer Filters */}
      <div className="bg-white dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-700 px-6 py-3 shadow-sm dark:shadow-none">
        <div className="flex items-center gap-3">
          <span className="text-gray-500 dark:text-gray-400 text-sm flex items-center gap-1">
            <Layers size={16} />
            Layers:
          </span>
          {Object.values(NetworkLayerType).map((layer) => (
            <LayerFilterButton
              key={layer}
              layer={layer}
              active={activeLayers.has(layer)}
              count={layerCounts[layer] || 0}
              onToggle={() => toggleLayer(layer)}
            />
          ))}

          <div className="flex-1" />

          {/* View toggles */}
          <button
            onClick={() => setShowLabels(!showLabels)}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors ${
              showLabels ? 'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            {showLabels ? <Eye size={16} /> : <EyeOff size={16} />}
            <span className="text-sm">Labels</span>
          </button>

          <button
            onClick={() => setShowLegend(!showLegend)}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors ${
              showLegend ? 'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            <Info size={16} />
            <span className="text-sm">Legend</span>
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 relative overflow-hidden flex" ref={(el) => {
        if (el) {
          // Dynamic resizing logic could go here, or we pass dimensions
        }
      }}>
        {/* Topology Visualization */}
        {searchFilteredTopology && (
          <div className="flex-1 relative">
            <NetworkTopologyVisualization
                data={searchFilteredTopology}
                width={window.innerWidth - (selectedDevice ? 340 : 0) - 260 /* sidebar offset */} 
                height={window.innerHeight - 150 /* header offset */}
                onNodeClick={(node) => {
                  const device = searchFilteredTopology.hosts.find((h) => h.id === node.id);
                  setSelectedDevice(device || null);
                }}
            />
          </div>
        )}

        {/* Selected Device Info Panel - Now Docked */}
        {selectedDevice && (
          <DeviceInfoPanel
            device={selectedDevice}
            connections={searchFilteredTopology?.connections || []}
            onClose={() => setSelectedDevice(null)}
            onViewDetails={(deviceId) => navigate(`/infrastructure/hosts/${deviceId}`)}
          />
        )}
      </div>

      {/* Status Bar */}
      <div className="bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 px-6 py-2">
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-4 text-gray-500 dark:text-gray-400">
            <span className="flex items-center gap-1">
              <CheckCircle size={14} className="text-green-500" />
              {topologyData?.hosts.filter((h) => h.status.toLowerCase() === 'up').length || 0} online
            </span>
            <span className="flex items-center gap-1">
              <AlertTriangle size={14} className="text-yellow-500" />
              {topologyData?.hosts.filter((h) => h.status.toLowerCase() === 'warning').length || 0} warning
            </span>
            <span className="flex items-center gap-1">
              <XCircle size={14} className="text-red-500" />
              {topologyData?.hosts.filter((h) => h.status.toLowerCase() === 'down').length || 0} offline
            </span>
          </div>
          <div className="text-gray-500 dark:text-gray-500">
            Last updated: {new Date().toLocaleTimeString()}
            {autoRefresh && <span className="ml-2 text-green-500 dark:text-green-400">• Auto-refresh enabled</span>}
          </div>
        </div>
      </div>
    </div>
  );
};

export default InfrastructureTopologyPage;
