/**
 * Realistic Device Visual Component
 *
 * Renders photorealistic server and network device visualizations
 * with real-time status indicators, blinking LEDs, and metrics overlay.
 */

import React, { useState, useEffect } from 'react';
import { NetworkLayerType, DeviceVendor } from '../../types';

// =====================================
// Device Image URLs (CDN/Public images)
// =====================================

const DEVICE_IMAGES: Record<string, Record<string, string>> = {
  // Rack Servers
  server: {
    dell: 'https://i.dell.com/is/image/DellContent/content/dam/ss2/product-images/dell-enterprise-products/enterprise-systems/poweredge/r760/media-gallery/server-poweredge-r760-gallery-1.psd?fmt=png-alpha&pscan=auto&scl=1&hei=402&wid=522',
    hp: 'https://ssl-product-images.www8-hp.com/digmedialib/prodimg/lowres/c08468378.png',
    lenovo: 'https://p1-ofp.static.pub/fes/cms/2022/10/07/akpz1fzx56wclwj95sxvcgr0wv9f8l142234.png',
    supermicro: 'https://www.supermicro.com/files_SYS/images/System/SYS-620P-TRT_main.png',
    generic: 'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=400&h=200&fit=crop',
  },
  // Firewalls
  firewall: {
    fortigate: 'https://www.fortinet.com/content/dam/fortinet/images/products/product-images/fg-3700f.png',
    paloalto: 'https://www.paloaltonetworks.com/content/dam/pan/en_US/images/products/hardware/pa-5400-series.png',
    cisco: 'https://www.cisco.com/c/dam/en/us/products/collateral/security/firepower-ngfw/datasheet-c78-742473.docx/_jcr_content/renditions/datasheet-c78-742473_0.png',
    generic: 'https://images.unsplash.com/photo-1544197150-b99a580bb7a8?w=400&h=200&fit=crop',
  },
  // Routers
  router: {
    cisco: 'https://www.cisco.com/c/dam/en/us/products/routers/8000-series-routers/images/8000-series-routers-front.png',
    juniper: 'https://www.juniper.net/content/dam/www/assets/images/products/mx-series/mx480.png',
    huawei: 'https://e.huawei.com/-/mediae/images/products/enterprise-network/routers/ne40e/ne40e.png',
    generic: 'https://images.unsplash.com/photo-1606765962248-7ff407b51667?w=400&h=200&fit=crop',
  },
  // Switches
  switch: {
    cisco: 'https://www.cisco.com/c/dam/en/us/products/collateral/switches/catalyst-9300-series-switches/datasheet-c78-738977.docx/_jcr_content/renditions/datasheet-c78-738977_0.png',
    arista: 'https://www.arista.com/assets/images/product/7280R3/7280R3-product.png',
    huawei: 'https://e.huawei.com/-/mediae/images/products/enterprise-network/switches/datacenter-switches/ce16800/ce16800.png',
    generic: 'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=400&h=200&fit=crop',
  },
};

// Fallback SVG for when images fail to load
const FallbackDeviceSVG: React.FC<{ type: string; className?: string }> = ({ type, className }) => {
  const colors = {
    server: { primary: '#1e40af', secondary: '#3b82f6' },
    firewall: { primary: '#b91c1c', secondary: '#ef4444' },
    router: { primary: '#c2410c', secondary: '#f97316' },
    switch: { primary: '#0369a1', secondary: '#0ea5e9' },
  };

  const color = colors[type as keyof typeof colors] || colors.server;

  return (
    <svg viewBox="0 0 200 80" className={className}>
      {/* Server chassis */}
      <defs>
        <linearGradient id={`grad-${type}`} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#374151" />
          <stop offset="50%" stopColor="#1f2937" />
          <stop offset="100%" stopColor="#111827" />
        </linearGradient>
        <filter id="glow">
          <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
          <feMerge>
            <feMergeNode in="coloredBlur"/>
            <feMergeNode in="SourceGraphic"/>
          </feMerge>
        </filter>
      </defs>

      {/* Main chassis */}
      <rect x="5" y="10" width="190" height="60" rx="3" fill={`url(#grad-${type})`} stroke="#4b5563" strokeWidth="1"/>

      {/* Front bezel */}
      <rect x="10" y="15" width="180" height="50" rx="2" fill="#1f2937" stroke="#374151" strokeWidth="0.5"/>

      {/* Drive bays */}
      {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
        <g key={i}>
          <rect x={15 + i * 20} y="20" width="16" height="40" rx="1" fill="#111827" stroke="#374151" strokeWidth="0.5"/>
          <rect x={17 + i * 20} y="22" width="12" height="2" rx="0.5" fill="#374151"/>
          <circle cx={23 + i * 20} cy="55" r="1.5" fill={color.secondary} opacity="0.8"/>
        </g>
      ))}

      {/* Status LEDs */}
      <circle cx="175" cy="25" r="3" fill="#22c55e" filter="url(#glow)">
        <animate attributeName="opacity" values="1;0.5;1" dur="2s" repeatCount="indefinite"/>
      </circle>
      <circle cx="175" cy="35" r="3" fill={color.secondary} filter="url(#glow)"/>
      <circle cx="175" cy="45" r="3" fill="#facc15"/>

      {/* Vendor badge */}
      <rect x="165" y="50" width="20" height="8" rx="1" fill={color.primary}/>
    </svg>
  );
};

// =====================================
// Blinking LED Component
// =====================================

interface LEDProps {
  color: 'green' | 'red' | 'yellow' | 'blue' | 'orange';
  blinking?: boolean;
  size?: 'sm' | 'md' | 'lg';
  label?: string;
}

const LED: React.FC<LEDProps> = ({ color, blinking = false, size = 'md', label }) => {
  const [isOn, setIsOn] = useState(true);

  useEffect(() => {
    if (blinking) {
      const interval = setInterval(() => setIsOn((prev) => !prev), 500);
      return () => clearInterval(interval);
    }
  }, [blinking]);

  const colors = {
    green: { on: '#22c55e', off: '#166534', glow: 'rgba(34, 197, 94, 0.5)' },
    red: { on: '#ef4444', off: '#991b1b', glow: 'rgba(239, 68, 68, 0.5)' },
    yellow: { on: '#facc15', off: '#a16207', glow: 'rgba(250, 204, 21, 0.5)' },
    blue: { on: '#3b82f6', off: '#1e40af', glow: 'rgba(59, 130, 246, 0.5)' },
    orange: { on: '#f97316', off: '#c2410c', glow: 'rgba(249, 115, 22, 0.5)' },
  };

  const sizes = {
    sm: 'w-2 h-2',
    md: 'w-3 h-3',
    lg: 'w-4 h-4',
  };

  const ledColor = colors[color];
  const currentColor = isOn ? ledColor.on : ledColor.off;

  return (
    <div className="flex items-center gap-1">
      <div
        className={`${sizes[size]} rounded-full transition-all duration-100`}
        style={{
          backgroundColor: currentColor,
          boxShadow: isOn ? `0 0 8px ${ledColor.glow}, 0 0 12px ${ledColor.glow}` : 'none',
        }}
      />
      {label && <span className="text-xs text-gray-400">{label}</span>}
    </div>
  );
};

// =====================================
// Realistic Server Unit Component
// =====================================

interface ServerUnitProps {
  hostname: string;
  vendor?: string;
  model?: string;
  status: 'up' | 'down' | 'warning' | 'maintenance';
  cpuUsage?: number;
  memoryUsage?: number;
  diskUsage?: number;
  temperature?: number;
  networkLayer: NetworkLayerType;
  onClick?: () => void;
  compact?: boolean;
}

export const RealisticServerUnit: React.FC<ServerUnitProps> = ({
  hostname,
  vendor = 'generic',
  model,
  status,
  cpuUsage,
  memoryUsage,
  diskUsage,
  temperature,
  networkLayer,
  onClick,
  compact = false,
}) => {
  const [imageError, setImageError] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  const getDeviceType = () => {
    switch (networkLayer) {
      case NetworkLayerType.F_SWI:
        return 'firewall';
      case NetworkLayerType.R_SWI:
        return 'router';
      case NetworkLayerType.E_SWI:
        return 'switch';
      case NetworkLayerType.S_HW:
      default:
        return 'server';
    }
  };

  const deviceType = getDeviceType();
  const vendorKey = vendor?.toLowerCase() || 'generic';
  const imageUrl = DEVICE_IMAGES[deviceType]?.[vendorKey] || DEVICE_IMAGES[deviceType]?.generic;

  const statusConfig = {
    up: { color: 'green' as const, label: 'Online', ledBlink: false },
    down: { color: 'red' as const, label: 'Offline', ledBlink: true },
    warning: { color: 'yellow' as const, label: 'Warning', ledBlink: true },
    maintenance: { color: 'blue' as const, label: 'Maintenance', ledBlink: false },
  };

  const currentStatus = statusConfig[status] || statusConfig.up;

  if (compact) {
    return (
      <div
        onClick={onClick}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className={`relative bg-gradient-to-b from-gray-700 to-gray-800 rounded border border-gray-600 p-2 cursor-pointer transition-all hover:border-blue-500 hover:shadow-lg hover:shadow-blue-500/20 ${
          isHovered ? 'scale-105' : ''
        }`}
        style={{ height: '40px' }}
      >
        {/* Compact server visualization */}
        <div className="flex items-center justify-between h-full">
          <div className="flex items-center gap-2">
            <LED color={currentStatus.color} blinking={currentStatus.ledBlink} size="sm" />
            <span className="text-xs text-gray-300 truncate max-w-[100px]">{hostname}</span>
          </div>
          <div className="flex gap-1">
            {cpuUsage !== undefined && (
              <div className="w-8 h-2 bg-gray-900 rounded overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-green-500 to-yellow-500"
                  style={{ width: `${cpuUsage}%` }}
                />
              </div>
            )}
          </div>
        </div>

        {/* Activity LEDs */}
        <div className="absolute right-1 top-1 flex gap-0.5">
          <LED color="green" blinking size="sm" />
          <LED color="orange" blinking size="sm" />
        </div>
      </div>
    );
  }

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={`relative bg-gradient-to-b from-gray-800 to-gray-900 rounded-lg border-2 overflow-hidden cursor-pointer transition-all duration-300 ${
        status === 'up'
          ? 'border-gray-700 hover:border-green-500 hover:shadow-lg hover:shadow-green-500/20'
          : status === 'down'
          ? 'border-red-700 shadow-lg shadow-red-500/30'
          : status === 'warning'
          ? 'border-yellow-600 shadow-lg shadow-yellow-500/20'
          : 'border-blue-700'
      } ${isHovered ? 'transform scale-[1.02]' : ''}`}
    >
      {/* Device Image or SVG Fallback */}
      <div className="relative h-32 bg-gray-900 overflow-hidden">
        {!imageError ? (
          <img
            src={imageUrl}
            alt={`${vendor} ${model || deviceType}`}
            className="w-full h-full object-contain p-2"
            onError={() => setImageError(true)}
          />
        ) : (
          <FallbackDeviceSVG type={deviceType} className="w-full h-full p-2" />
        )}

        {/* Status Overlay */}
        <div className="absolute top-2 right-2 flex flex-col gap-1">
          <LED color={currentStatus.color} blinking={currentStatus.ledBlink} size="lg" />
        </div>

        {/* Network Activity LEDs */}
        <div className="absolute bottom-2 right-2 flex gap-1">
          <LED color="green" blinking size="sm" />
          <LED color="orange" blinking size="sm" />
          <LED color="green" blinking size="sm" />
          <LED color="orange" blinking size="sm" />
        </div>

        {/* Hover Metrics Overlay */}
        {isHovered && (
          <div className="absolute inset-0 bg-black/80 flex flex-col justify-center p-4 animate-fadeIn">
            <div className="grid grid-cols-2 gap-2 text-xs">
              {cpuUsage !== undefined && (
                <div>
                  <span className="text-gray-400">CPU</span>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-2 bg-gray-700 rounded overflow-hidden">
                      <div
                        className={`h-full ${cpuUsage > 80 ? 'bg-red-500' : cpuUsage > 60 ? 'bg-yellow-500' : 'bg-green-500'}`}
                        style={{ width: `${cpuUsage}%` }}
                      />
                    </div>
                    <span className="text-white">{cpuUsage}%</span>
                  </div>
                </div>
              )}
              {memoryUsage !== undefined && (
                <div>
                  <span className="text-gray-400">RAM</span>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-2 bg-gray-700 rounded overflow-hidden">
                      <div
                        className={`h-full ${memoryUsage > 80 ? 'bg-red-500' : memoryUsage > 60 ? 'bg-yellow-500' : 'bg-blue-500'}`}
                        style={{ width: `${memoryUsage}%` }}
                      />
                    </div>
                    <span className="text-white">{memoryUsage}%</span>
                  </div>
                </div>
              )}
              {diskUsage !== undefined && (
                <div>
                  <span className="text-gray-400">Disk</span>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-2 bg-gray-700 rounded overflow-hidden">
                      <div
                        className={`h-full ${diskUsage > 80 ? 'bg-red-500' : diskUsage > 60 ? 'bg-yellow-500' : 'bg-purple-500'}`}
                        style={{ width: `${diskUsage}%` }}
                      />
                    </div>
                    <span className="text-white">{diskUsage}%</span>
                  </div>
                </div>
              )}
              {temperature !== undefined && (
                <div>
                  <span className="text-gray-400">Temp</span>
                  <span className={`text-lg font-bold ${temperature > 70 ? 'text-red-500' : temperature > 50 ? 'text-yellow-500' : 'text-green-500'}`}>
                    {temperature}°C
                  </span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Device Info */}
      <div className="p-3 border-t border-gray-700">
        <div className="flex items-center justify-between mb-1">
          <h4 className="text-white font-semibold text-sm truncate">{hostname}</h4>
          <span className={`text-xs px-2 py-0.5 rounded ${
            status === 'up' ? 'bg-green-900/50 text-green-400' :
            status === 'down' ? 'bg-red-900/50 text-red-400' :
            status === 'warning' ? 'bg-yellow-900/50 text-yellow-400' :
            'bg-blue-900/50 text-blue-400'
          }`}>
            {currentStatus.label}
          </span>
        </div>
        <p className="text-gray-400 text-xs">
          {vendor && <span className="capitalize">{vendor}</span>}
          {model && <span> • {model}</span>}
        </p>
      </div>
    </div>
  );
};

// =====================================
// Rack Visualization Component
// =====================================

interface RackUnit {
  id: string;
  hostname: string;
  uPosition: number;
  uHeight: number;
  vendor?: string;
  model?: string;
  status: 'up' | 'down' | 'warning' | 'maintenance';
  cpuUsage?: number;
  memoryUsage?: number;
  networkLayer: NetworkLayerType;
}

interface RackVisualizationProps {
  rackId: string;
  rackName: string;
  totalUnits?: number;
  units: RackUnit[];
  onUnitClick?: (unit: RackUnit) => void;
}

export const RackVisualization: React.FC<RackVisualizationProps> = ({
  rackId,
  rackName,
  totalUnits = 42,
  units,
  onUnitClick,
}) => {
  const [selectedUnit, setSelectedUnit] = useState<string | null>(null);

  // Create empty rack slots
  const rackSlots: (RackUnit | null)[] = Array(totalUnits).fill(null);

  // Fill occupied slots
  units.forEach((unit) => {
    for (let i = 0; i < unit.uHeight; i++) {
      const pos = unit.uPosition + i - 1;
      if (pos >= 0 && pos < totalUnits) {
        rackSlots[pos] = unit;
      }
    }
  });

  const getUnitColor = (unit: RackUnit) => {
    switch (unit.networkLayer) {
      case NetworkLayerType.F_SWI:
        return 'from-red-900 to-red-950';
      case NetworkLayerType.R_SWI:
        return 'from-orange-900 to-orange-950';
      case NetworkLayerType.E_SWI:
        return 'from-blue-900 to-blue-950';
      case NetworkLayerType.S_HW:
      default:
        return 'from-gray-700 to-gray-800';
    }
  };

  return (
    <div className="bg-gray-900 rounded-xl p-4 border border-gray-700">
      {/* Rack Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-white font-bold text-lg">{rackName}</h3>
          <p className="text-gray-400 text-sm">
            {units.length} devices • {totalUnits}U capacity
          </p>
        </div>
        <div className="flex items-center gap-2">
          <LED color="green" size="md" label="PWR" />
          <LED color="blue" blinking size="md" label="NET" />
        </div>
      </div>

      {/* Rack Frame */}
      <div className="relative bg-gradient-to-b from-gray-800 to-gray-900 rounded-lg border-4 border-gray-600 p-2">
        {/* Rail indicators */}
        <div className="absolute left-0 top-0 bottom-0 w-6 bg-gray-700 flex flex-col justify-between py-2 rounded-l">
          {Array.from({ length: Math.ceil(totalUnits / 5) }, (_, i) => (
            <span key={i} className="text-[8px] text-gray-400 text-center">
              {(i + 1) * 5}U
            </span>
          ))}
        </div>

        {/* Rack Units */}
        <div className="ml-8 flex flex-col-reverse gap-0.5">
          {rackSlots.map((slot, index) => {
            if (!slot) {
              // Empty slot
              return (
                <div
                  key={index}
                  className="h-6 bg-gray-950 border border-gray-800 rounded-sm flex items-center justify-center"
                >
                  <span className="text-[8px] text-gray-700">{index + 1}U</span>
                </div>
              );
            }

            // Skip slots that are part of a multi-U device (not the first slot)
            if (index !== slot.uPosition - 1) {
              return null;
            }

            // Render device
            return (
              <div
                key={`${slot.id}-${index}`}
                onClick={() => {
                  setSelectedUnit(slot.id);
                  onUnitClick?.(slot);
                }}
                className={`bg-gradient-to-r ${getUnitColor(slot)} border rounded cursor-pointer transition-all hover:brightness-125 ${
                  selectedUnit === slot.id ? 'ring-2 ring-blue-500' : 'border-gray-600'
                } ${slot.status === 'down' ? 'opacity-50' : ''}`}
                style={{ height: `${slot.uHeight * 24 + (slot.uHeight - 1) * 2}px` }}
              >
                <div className="h-full p-1 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <LED
                      color={slot.status === 'up' ? 'green' : slot.status === 'down' ? 'red' : 'yellow'}
                      blinking={slot.status !== 'up'}
                      size="sm"
                    />
                    <span className="text-[10px] text-white truncate max-w-[80px]">
                      {slot.hostname}
                    </span>
                  </div>

                  {/* Mini metrics */}
                  {slot.cpuUsage !== undefined && (
                    <div className="flex items-center gap-1">
                      <div className="w-12 h-1.5 bg-gray-900 rounded overflow-hidden">
                        <div
                          className={`h-full ${slot.cpuUsage > 80 ? 'bg-red-500' : 'bg-green-500'}`}
                          style={{ width: `${slot.cpuUsage}%` }}
                        />
                      </div>
                      <LED color="green" blinking size="sm" />
                      <LED color="orange" blinking size="sm" />
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Rack Footer - Power/Cooling */}
      <div className="mt-4 flex items-center justify-between text-xs text-gray-400">
        <div className="flex items-center gap-4">
          <span>🔌 2x PSU Redundant</span>
          <span>❄️ 6x Fans Active</span>
        </div>
        <div className="flex items-center gap-2">
          <span>PDU A:</span>
          <LED color="green" size="sm" />
          <span>PDU B:</span>
          <LED color="green" size="sm" />
        </div>
      </div>
    </div>
  );
};

export default RealisticServerUnit;
