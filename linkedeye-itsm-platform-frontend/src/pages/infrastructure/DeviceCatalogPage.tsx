/**
 * Device Catalog Page
 *
 * Displays the complete device catalog organized by network layer:
 * - f_swi: Firewall Layer (FortiGate, Cisco FTD)
 * - r_swi: Router Layer (Cisco ISR)
 * - e_swi: Exchange Switch Layer (Cisco, Huawei, Arista, Aruba)
 * - s_hw: Server Hardware Layer (Physical & Virtual)
 *
 * Features:
 * - Visual 3D device representations
 * - Layer-based categorization
 * - Device specifications
 * - Template selection for onboarding
 */

import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Shield,
  Network,
  Share2,
  Server,
  Box,
  ChevronRight,
  ChevronDown,
  Plus,
  Search,
  Filter,
  Grid,
  List,
  Info,
  Settings,
  ArrowLeft,
} from 'lucide-react';
import {
  NetworkLayerType,
  NetworkLayerInfo,
  DeviceCatalog as StaticDeviceCatalog,
  DeviceVendorInfo,
  DeviceVendor,
  SwitchNetworkType,
} from '../../types';
import { deviceTemplateService, DeviceTemplateCatalog } from '../../services/deviceTemplateService';

// =====================================
// Device Card Component
// =====================================

interface DeviceCardProps {
  vendor: string;
  model: string;
  ports: number;
  series: string;
  layer: NetworkLayerType;
  imageSrc?: string;
  onSelect: () => void;
}

const DeviceCard: React.FC<DeviceCardProps> = ({
  vendor,
  model,
  ports,
  series,
  layer,
  imageSrc,
  onSelect,
}) => {
  const layerInfo = NetworkLayerInfo[layer];
  const vendorInfo = DeviceVendorInfo[vendor as DeviceVendor];
  const vendorColor = vendorInfo?.color || '#6b7280';

  // 3D Device SVG based on layer
  const renderDeviceSVG = () => {
    if (imageSrc) {
      return (
        <div className="w-[120px] h-[80px] flex items-center justify-center overflow-hidden">
           <img 
             src={imageSrc} 
             alt={model} 
             className="max-w-full max-h-full object-contain"
             onError={(e) => {
               (e.target as HTMLImageElement).style.display = 'none'; 
               // Fallback logic could be handled here by setting a state to default back to switch
             }}
           />
        </div>
      );
    }
    switch (layer) {
      case 'f_swi':
        return (
          <svg width="120" height="80" viewBox="0 0 120 80">
            <defs>
              <linearGradient id={`fw-grad-${model}`} x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor={vendorColor} />
                <stop offset="100%" stopColor={vendorColor} stopOpacity="0.6" />
              </linearGradient>
              <filter id="device-shadow">
                <feDropShadow dx="2" dy="4" stdDeviation="4" floodOpacity="0.3" />
              </filter>
            </defs>
            {/* Main body */}
            <rect x="10" y="25" width="100" height="40" rx="3" fill={`url(#fw-grad-${model})`} filter="url(#device-shadow)" />
            {/* 3D top */}
            <polygon points="10,25 20,15 110,15 110,25" fill={vendorColor} opacity="0.8" />
            <polygon points="110,15 120,25 110,25" fill={vendorColor} opacity="0.5" />
            {/* LED indicators */}
            <circle cx="105" cy="32" r="3" fill="#22c55e">
              <animate attributeName="opacity" values="1;0.5;1" dur="2s" repeatCount="indefinite" />
            </circle>
            {/* Ports */}
            {Array.from({ length: Math.min(ports, 8) }).map((_, i) => (
              <rect key={i} x={15 + i * 11} y="55" width="8" height="6" rx="1" fill="#1f2937" />
            ))}
            {/* Vendor logo placeholder */}
            <text x="60" y="45" textAnchor="middle" fill="#fff" fontSize="10" fontWeight="bold" opacity="0.9">
              {model}
            </text>
          </svg>
        );

      case 'r_swi':
        return (
          <svg width="120" height="80" viewBox="0 0 120 80">
            <defs>
              <linearGradient id={`rtr-grad-${model}`} x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor={vendorColor} />
                <stop offset="100%" stopColor={vendorColor} stopOpacity="0.6" />
              </linearGradient>
            </defs>
            {/* Main body */}
            <rect x="10" y="30" width="100" height="35" rx="3" fill={`url(#rtr-grad-${model})`} filter="url(#device-shadow)" />
            {/* 3D top */}
            <polygon points="10,30 18,22 108,22 110,30" fill={vendorColor} opacity="0.8" />
            <polygon points="110,22 118,30 110,30" fill={vendorColor} opacity="0.5" />
            {/* Antennas */}
            <rect x="25" y="8" width="4" height="22" fill="#374151" />
            <rect x="90" y="8" width="4" height="22" fill="#374151" />
            <circle cx="27" cy="8" r="4" fill="#4b5563" />
            <circle cx="92" cy="8" r="4" fill="#4b5563" />
            {/* LEDs */}
            <circle cx="105" cy="38" r="2" fill="#22c55e">
              <animate attributeName="opacity" values="1;0.4;1" dur="1.5s" repeatCount="indefinite" />
            </circle>
            {/* Ports */}
            {Array.from({ length: Math.min(ports, 4) }).map((_, i) => (
              <rect key={i} x={20 + i * 22} y="55" width="15" height="8" rx="1" fill="#1f2937" />
            ))}
            <text x="60" y="48" textAnchor="middle" fill="#fff" fontSize="9" fontWeight="bold" opacity="0.9">
              {model}
            </text>
          </svg>
        );

      case 'e_swi':
        return (
          <svg width="120" height="80" viewBox="0 0 120 80">
            <defs>
              <linearGradient id={`sw-grad-${model}`} x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor={vendorColor} />
                <stop offset="100%" stopColor={vendorColor} stopOpacity="0.6" />
              </linearGradient>
            </defs>
            {/* Rack mount switch */}
            <rect x="5" y="30" width="110" height="30" rx="2" fill={`url(#sw-grad-${model})`} filter="url(#device-shadow)" />
            {/* 3D effect */}
            <polygon points="5,30 10,25 115,25 115,30" fill={vendorColor} opacity="0.8" />
            <polygon points="115,25 120,30 115,30" fill={vendorColor} opacity="0.5" />
            {/* Port bank with LEDs */}
            {Array.from({ length: Math.min(ports / 2, 12) }).map((_, i) => (
              <g key={i}>
                <rect x={10 + i * 8} y="38" width="6" height="16" rx="0.5" fill="#1f2937" />
                <circle cx={13 + i * 8} cy="35" r="1.5" fill={i % 3 === 0 ? '#22c55e' : '#374151'}>
                  {i % 2 === 0 && (
                    <animate attributeName="opacity" values="1;0.3;1" dur={`${0.5 + i * 0.1}s`} repeatCount="indefinite" />
                  )}
                </circle>
              </g>
            ))}
            <text x="60" y="70" textAnchor="middle" fill="#9ca3af" fontSize="8">
              {ports} ports
            </text>
          </svg>
        );

      case 's_hw':
        return (
          <svg width="120" height="80" viewBox="0 0 120 80">
            <defs>
              <linearGradient id={`srv-grad-${model}`} x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#374151" />
                <stop offset="100%" stopColor="#1f2937" />
              </linearGradient>
            </defs>
            {/* Server tower */}
            <rect x="35" y="5" width="50" height="70" rx="3" fill={`url(#srv-grad-${model})`} filter="url(#device-shadow)" />
            {/* 3D top */}
            <polygon points="35,5 40,0 85,0 85,5" fill="#4b5563" />
            <polygon points="85,0 90,5 85,5" fill="#374151" />
            {/* Drive bays */}
            {[0, 1, 2, 3].map((i) => (
              <g key={i}>
                <rect x="40" y={12 + i * 14} width="40" height="10" rx="1" fill="#1f2937" stroke="#4b5563" strokeWidth="0.5" />
                <circle cx="75" cy={17 + i * 14} r="2" fill={i === 0 ? '#22c55e' : '#374151'}>
                  <animate attributeName="opacity" values="1;0.4;1" dur={`${1 + i * 0.3}s`} repeatCount="indefinite" />
                </circle>
              </g>
            ))}
            {/* Ventilation */}
            <rect x="40" y="68" width="40" height="5" fill="#111" />
            <text x="60" y="80" textAnchor="middle" fill="#9ca3af" fontSize="8" className="translate-y-[-3px]">
              {model}
            </text>
          </svg>
        );

      default:
        return null;
    }
  };

  return (
    <div
      onClick={onSelect}
      className="bg-white dark:bg-gray-800 rounded-xl p-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-750 transition-all duration-200 shadow-md hover:shadow-xl border border-gray-200 dark:border-gray-700 hover:border-blue-500 dark:hover:border-gray-600 group relative"
    >
      {/* Device visualization */}
      <div className="flex justify-center mb-4 transform group-hover:scale-105 transition-transform">
        {renderDeviceSVG()}
      </div>

      {/* Device info */}
      <div className="text-center">
        <div
          className="inline-block px-2 py-1 rounded text-xs font-medium mb-2 bg-dynamic-alpha text-dynamic"
          style={{ '--dynamic-color': vendorColor, '--dynamic-color-alpha': `${vendorColor}20` } as React.CSSProperties}
        >
          {vendorInfo?.name || vendor}
        </div>
        <h4 className="text-gray-900 dark:text-white font-semibold">{model}</h4>
        <p className="text-gray-500 dark:text-gray-400 text-sm">{series}</p>
        <p className="text-gray-500 dark:text-gray-500 text-xs mt-1">{ports} ports</p>
      </div>

      {/* Action button */}
      <div className="mt-4 flex justify-center opacity-0 group-hover:opacity-100 transition-opacity">
        <button className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 rounded text-white text-sm">
          <Plus size={14} />
          <span>Use Template</span>
        </button>
      </div>
    </div>
  );
};

// =====================================
// Server Template Card
// =====================================

interface ServerTemplateCardProps {
  os: string;
  type: 'physical' | 'virtual';
  name: string;
  onSelect: () => void;
}

const ServerTemplateCard: React.FC<ServerTemplateCardProps> = ({
  os,
  type,
  name,
  onSelect,
}) => {
  const isPhysical = type === 'physical';
  const osColors: Record<string, string> = {
    'CentOS': '#932279',
    'RHEL': '#EE0000',
    'Ubuntu': '#E95420',
    'Windows': '#0078D4',
  };
  const osKey = Object.keys(osColors).find(k => os.includes(k)) || 'Ubuntu';
  const color = osColors[osKey];

  return (
    <div
      onClick={onSelect}
      className="bg-white dark:bg-gray-800 rounded-xl p-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-750 transition-all duration-200 shadow-md hover:shadow-xl border border-gray-200 dark:border-gray-700 hover:border-blue-500 dark:hover:border-gray-600 group relative"
    >
      {/* Server visualization */}
      <div className="flex justify-center mb-4">
        <svg width="80" height="80" viewBox="0 0 80 80">
          {isPhysical ? (
            <>
              {/* Physical server */}
              <defs>
                <linearGradient id={`phys-srv-${name}`} x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#374151" />
                  <stop offset="100%" stopColor="#1f2937" />
                </linearGradient>
              </defs>
              <rect x="15" y="5" width="50" height="70" rx="3" fill={`url(#phys-srv-${name})`} />
              <polygon points="15,5 20,0 65,0 65,5" fill="#4b5563" />
              <polygon points="65,0 70,5 65,5" fill="#374151" />
              {/* OS logo indicator */}
              <rect x="20" y="25" width="40" height="25" rx="2" fill={color} opacity="0.3" />
              <text x="40" y="42" textAnchor="middle" fill={color} fontSize="10" fontWeight="bold">
                {osKey.substring(0, 3).toUpperCase()}
              </text>
              {/* Drive LEDs */}
              {[0, 1, 2].map((i) => (
                <circle key={i} cx={30 + i * 10} cy={60} r="3" fill="#22c55e" opacity={0.6 + i * 0.2} />
              ))}
            </>
          ) : (
            <>
              {/* Virtual machine */}
              <defs>
                <linearGradient id={`vm-grad-${name}`} x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#8b5cf6" stopOpacity="0.8" />
                  <stop offset="100%" stopColor="#6366f1" stopOpacity="0.6" />
                </linearGradient>
              </defs>
              <rect
                x="15" y="15" width="50" height="50" rx="8"
                fill={`url(#vm-grad-${name})`}
                stroke="#a78bfa"
                strokeWidth="2"
                strokeDasharray="6,3"
              />
              {/* Inner box */}
              <rect x="23" y="23" width="34" height="34" rx="4" fill="#1f2937" opacity="0.8" />
              {/* OS indicator */}
              <text x="40" y="45" textAnchor="middle" fill={color} fontSize="10" fontWeight="bold">
                {osKey.substring(0, 3).toUpperCase()}
              </text>
              {/* VM badge */}
              <circle cx="55" cy="20" r="8" fill="#8b5cf6" />
              <text x="55" y="23" textAnchor="middle" fill="#fff" fontSize="8" fontWeight="bold">VM</text>
            </>
          )}
        </svg>
      </div>

      {/* Template info */}
      <div className="text-center">
        <div
          className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium mb-2 ${
            isPhysical ? 'bg-green-100 dark:bg-green-500/20 text-green-700 dark:text-green-400' : 'bg-purple-100 dark:bg-purple-500/20 text-purple-700 dark:text-purple-400'
          }`}
        >
          {isPhysical ? <Server size={12} /> : <Box size={12} />}
          {isPhysical ? 'Physical' : 'Virtual'}
        </div>
        <h4 className="text-gray-900 dark:text-white font-semibold">{os}</h4>
        <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">{name}</p>
      </div>

      {/* Action button */}
      <div className="mt-4 flex justify-center opacity-0 group-hover:opacity-100 transition-opacity">
        <button className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 rounded text-white text-sm">
          <Plus size={14} />
          <span>Use Template</span>
        </button>
      </div>
    </div>
  );
};

// =====================================
// Layer Section Component
// =====================================

interface LayerSectionProps {
  layer: NetworkLayerType;
  devices: Array<{ vendor: string; items: Array<{ model: string; ports: number; series: string; filename?: string }> }>;
  expanded: boolean;
  onToggle: () => void;
  onSelectDevice: (vendor: string, model: string) => void;
}

const LayerSection: React.FC<LayerSectionProps> = ({
  layer,
  devices,
  expanded,
  onToggle,
  onSelectDevice,
}) => {
  const layerInfo = NetworkLayerInfo[layer];
  const totalDevices = devices.reduce((acc, v) => acc + v.items.length, 0);

  const getLayerIcon = () => {
    switch (layer) {
      case 'f_swi': return <Shield size={24} />;
      case 'r_swi': return <Network size={24} />;
      case 'e_swi': return <Share2 size={24} />;
      case 's_hw': return <Server size={24} />;
      default: return null;
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700 shadow-sm dark:shadow-none transition-shadow hover:shadow-md">
      {/* Header */}
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors"
      >
        <div className="flex items-center gap-4">
          <div
            className="p-3 rounded-lg bg-dynamic-alpha text-dynamic"
            style={{ '--dynamic-color': layerInfo.color, '--dynamic-color-alpha': `${layerInfo.color}20` } as React.CSSProperties}
          >
            {getLayerIcon()}
          </div>
          <div className="text-left">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{layerInfo.name}</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">{layerInfo.description}</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-gray-500 dark:text-gray-400 text-sm">{totalDevices} templates</span>
          {expanded ? (
            <ChevronDown size={20} className="text-gray-400" />
          ) : (
            <ChevronRight size={20} className="text-gray-400" />
          )}
        </div>
      </button>

      {/* Content */}
      {expanded && (
        <div className="p-4 pt-0 border-t border-gray-200 dark:border-gray-700">
          {devices.map(({ vendor, items }) => (
            <div key={vendor} className="mt-4">
              <div className="flex items-center gap-2 mb-3">
                <div
                  className="w-3 h-3 rounded bg-dynamic"
                  style={{ '--dynamic-color': DeviceVendorInfo[vendor as DeviceVendor]?.color || '#6b7280' } as React.CSSProperties}
                />
                <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 capitalize">
                  {DeviceVendorInfo[vendor as DeviceVendor]?.name || vendor}
                </h4>
                <span className="text-xs text-gray-500">({items.length})</span>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                {items.map((item) => (
                  <DeviceCard
                    key={`${vendor}-${item.model}`}
                    vendor={vendor}
                    model={item.model}
                    ports={item.ports}
                    series={item.series}
                    layer={layer}
                    imageSrc={item.filename ? deviceTemplateService.getSvgUrl(item.filename) : undefined}
                    onSelect={() => onSelectDevice(vendor, item.model)}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// =====================================
// Main Component
// =====================================

const DeviceCatalogPage: React.FC = () => {
  const navigate = useNavigate();
  const [expandedLayers, setExpandedLayers] = useState<Set<NetworkLayerType>>(new Set(['f_swi']));
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedVendor, setSelectedVendor] = useState<string>('all');
  const [catalog, setCatalog] = useState<DeviceTemplateCatalog | null>(null);

  React.useEffect(() => {
    const fetchCatalog = async () => {
      const data = await deviceTemplateService.list();
      setCatalog(data);
    };
    fetchCatalog();
  }, []);

  const toggleLayer = (layer: NetworkLayerType) => {
    setExpandedLayers((prev) => {
      const next = new Set(prev);
      if (next.has(layer)) {
        next.delete(layer);
      } else {
        next.add(layer);
      }
      return next;
    });
  };

  const handleSelectDevice = (vendor: string, model: string) => {
    // TODO: Create InfrastructureHostCreatePage component and route
    // For now, show a message about the selected device
    alert(`Device Selected: ${vendor} ${model}\n\nThis feature is coming soon. You can create infrastructure hosts through the Infrastructure Dashboard or API.`);
  };

  // Transform catalog data for display
  const getLayerDevices = (layer: NetworkLayerType) => {
    // Prefer dynamic catalog if loaded, else fallback to static
    const layerData = catalog && catalog[layer] && Object.keys(catalog[layer]).length > 0
      ? catalog[layer] 
      : StaticDeviceCatalog[layer as keyof typeof StaticDeviceCatalog];
      
    if (!layerData) return [];

    if (layer === 's_hw') {
      // Server templates are structured differently
      return [];
    }

    return Object.entries(layerData)
      .filter(([vendor]) => selectedVendor === 'all' || vendor === selectedVendor)
      .map(([vendor, items]) => ({
        vendor,
        items: (items as Array<{ model: string; ports: number; series: string; filename?: string }>).filter(
          (item) =>
            searchQuery === '' ||
            item.model.toLowerCase().includes(searchQuery.toLowerCase()) ||
            item.series.toLowerCase().includes(searchQuery.toLowerCase())
        ),
      }))
      .filter((v) => v.items.length > 0);
  };

  const allVendors = new Set<string>();
  if (catalog) {
    (['f_swi', 'r_swi', 'e_swi'] as NetworkLayerType[]).forEach((layer) => {
      const layerData = catalog[layer];
      if (layerData) {
        Object.keys(layerData).forEach((v) => allVendors.add(v));
      }
    });
  } else {
    (['f_swi', 'r_swi', 'e_swi'] as NetworkLayerType[]).forEach((layer) => {
        const layerData = StaticDeviceCatalog[layer as keyof typeof StaticDeviceCatalog];
        if (layerData) {
        Object.keys(layerData).forEach((v) => allVendors.add(v));
        }
    });
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/infrastructure')}
            className="p-2 hover:bg-gray-200 dark:hover:bg-gray-800 rounded-lg text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Device Catalog</h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1">Browse and select device templates by network layer</p>
          </div>
        </div>

        {/* Search and filters */}
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search devices..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-blue-500 w-64"
            />
          </div>

          <select
            value={selectedVendor}
            onChange={(e) => setSelectedVendor(e.target.value)}
            className="px-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:border-blue-500 shadow-sm"
          >
            <option value="all">All Vendors</option>
            {Array.from(allVendors).map((vendor) => (
              <option key={vendor} value={vendor}>
                {DeviceVendorInfo[vendor as DeviceVendor]?.name || vendor}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Layer Sections */}
      <div className="space-y-4">
        {/* Firewall Layer */}
        <LayerSection
          layer="f_swi"
          devices={getLayerDevices('f_swi')}
          expanded={expandedLayers.has('f_swi')}
          onToggle={() => toggleLayer('f_swi')}
          onSelectDevice={handleSelectDevice}
        />

        {/* Router Layer */}
        <LayerSection
          layer="r_swi"
          devices={getLayerDevices('r_swi')}
          expanded={expandedLayers.has('r_swi')}
          onToggle={() => toggleLayer('r_swi')}
          onSelectDevice={handleSelectDevice}
        />

        {/* Exchange Switch Layer */}
        <LayerSection
          layer="e_swi"
          devices={getLayerDevices('e_swi')}
          expanded={expandedLayers.has('e_swi')}
          onToggle={() => toggleLayer('e_swi')}
          onSelectDevice={handleSelectDevice}
        />

        {/* Server Hardware Layer */}
        <div className="bg-white dark:bg-gray-800 rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md transition-shadow">
          <button
            onClick={() => toggleLayer('s_hw')}
            className="w-full flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors"
          >
            <div className="flex items-center gap-4">
              <div
                className="p-3 rounded-lg bg-dynamic-alpha text-dynamic"
                style={{ '--dynamic-color': NetworkLayerInfo.s_hw.color, '--dynamic-color-alpha': `${NetworkLayerInfo.s_hw.color}20` } as React.CSSProperties}
              >
                <Server size={24} />
              </div>
              <div className="text-left">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{NetworkLayerInfo.s_hw.name}</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">{NetworkLayerInfo.s_hw.description}</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-gray-500 dark:text-gray-400 text-sm">{StaticDeviceCatalog.s_hw.templates.length} templates</span>
              {expandedLayers.has('s_hw') ? (
                <ChevronDown size={20} className="text-gray-400" />
              ) : (
                <ChevronRight size={20} className="text-gray-400" />
              )}
            </div>
          </button>

          {expandedLayers.has('s_hw') && (
            <div className="p-4 pt-0 border-t border-gray-200 dark:border-gray-700">
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 mt-4">
                {StaticDeviceCatalog.s_hw.templates
                  .filter(
                    (t) =>
                      searchQuery === '' ||
                      t.os.toLowerCase().includes(searchQuery.toLowerCase()) ||
                      t.name.toLowerCase().includes(searchQuery.toLowerCase())
                  )
                  .map((template) => (
                    <ServerTemplateCard
                      key={template.name}
                      os={template.os}
                      type={template.type as 'physical' | 'virtual'}
                      name={template.name}
                      onSelect={() => handleSelectDevice('server', template.name)}
                    />
                  ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Switch Template Variants Info */}
      <div className="mt-8 bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700 shadow-sm">
        <div className="flex items-start gap-3">
          <Info size={20} className="text-blue-500 dark:text-blue-400 mt-0.5" />
          <div>
            <h3 className="text-gray-900 dark:text-white font-semibold mb-2">Switch Template Variants</h3>
            <p className="text-gray-600 dark:text-gray-400 text-sm mb-3">
              Each switch model has 6 template variants based on network zone and stack configuration:
            </p>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2">
              {['Gateway', 'Gateway stack', 'Public', 'Public stack', 'Exchange', 'Exchange stack'].map((variant) => (
                <div
                  key={variant}
                  className="px-3 py-2 bg-gray-100 dark:bg-gray-700 rounded text-sm text-gray-700 dark:text-gray-300 text-center"
                >
                  {variant}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DeviceCatalogPage;
