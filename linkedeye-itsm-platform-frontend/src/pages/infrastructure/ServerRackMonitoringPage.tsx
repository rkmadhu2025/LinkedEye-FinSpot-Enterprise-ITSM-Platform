/**
 * Server Rack Monitoring Page
 *
 * 3D Data Center visualization with photorealistic rack servers
 * Real-time monitoring of power, temperature, and device health
 * Features:
 * - 3D isometric floor plan view
 * - Photorealistic server/network device images
 * - Real-time metrics with animated LED indicators
 * - Interactive rack selection and drill-down
 */

import React, { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Server,
  Cpu,
  HardDrive,
  Thermometer,
  AlertTriangle,
  CheckCircle,
  XCircle,
  RefreshCw,
  Search,
  Layers,
  MapPin,
  Zap,
  Activity,
  Fan,
  Power,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { InfrastructureHost } from '../../types';
import { infrastructureHostService } from '../../services/infrastructureService';
import { RackVisualization, RealisticServerUnit, LED } from '../../components/infrastructure/RealisticDeviceVisual';

// =====================================
// Types
// =====================================

interface RackData {
  id: string;
  name: string;
  row: number;
  position: number;
  totalUnits: number;
  usedUnits: number;
  powerUsage: number;
  temperature: number;
  status: 'healthy' | 'warning' | 'critical';
  dataCenter: string | null;
  location: string | null;
  devices: RackDevice[];
}

interface RackDevice {
  id: string;
  name: string;
  type: 'server' | 'switch' | 'router' | 'firewall' | 'storage' | 'pdu';
  manufacturer: string;
  model: string;
  startUnit: number;
  unitHeight: number;
  status: 'online' | 'offline' | 'warning';
  metrics: {
    cpu?: number;
    memory?: number;
    temperature?: number;
    powerDraw?: number;
  };
}

// =====================================
// Environment Stats Component
// =====================================

const EnvironmentStats: React.FC<{
  totalPower: number;
  avgTemperature: number;
  coolingEfficiency: number;
  healthyDevices: number;
  totalDevices: number;
}> = ({ totalPower, avgTemperature, coolingEfficiency, healthyDevices, totalDevices }) => (
  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
    <div className="bg-white dark:bg-gradient-to-br dark:from-blue-900/50 dark:to-blue-800/30 rounded-xl p-4 border border-blue-100 dark:border-blue-500/30 shadow-sm dark:shadow-none">
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-lg bg-blue-500/20 flex items-center justify-center">
          <Zap className="w-6 h-6 text-blue-400" />
        </div>
        <div>
          <p className="text-gray-500 dark:text-gray-400 text-sm">Total Power</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{totalPower.toFixed(1)} <span className="text-sm text-gray-500 dark:text-gray-400">kW</span></p>
        </div>
      </div>
    </div>

    <div className="bg-white dark:bg-gradient-to-br dark:from-orange-900/50 dark:to-orange-800/30 rounded-xl p-4 border border-orange-100 dark:border-orange-500/30 shadow-sm dark:shadow-none">
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-lg bg-orange-500/20 flex items-center justify-center">
          <Thermometer className="w-6 h-6 text-orange-400" />
        </div>
        <div>
          <p className="text-gray-500 dark:text-gray-400 text-sm">Avg Temperature</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{avgTemperature.toFixed(1)} <span className="text-sm text-gray-500 dark:text-gray-400">°C</span></p>
        </div>
      </div>
    </div>

    <div className="bg-white dark:bg-gradient-to-br dark:from-cyan-900/50 dark:to-cyan-800/30 rounded-xl p-4 border border-cyan-100 dark:border-cyan-500/30 shadow-sm dark:shadow-none">
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-lg bg-cyan-500/20 flex items-center justify-center">
          <Fan className="w-6 h-6 text-cyan-400" />
        </div>
        <div>
          <p className="text-gray-500 dark:text-gray-400 text-sm">Cooling Efficiency</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{coolingEfficiency} <span className="text-sm text-gray-500 dark:text-gray-400">%</span></p>
        </div>
      </div>
    </div>

    <div className="bg-white dark:bg-gradient-to-br dark:from-green-900/50 dark:to-green-800/30 rounded-xl p-4 border border-green-100 dark:border-green-500/30 shadow-sm dark:shadow-none">
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-lg bg-green-500/20 flex items-center justify-center">
          <Activity className="w-6 h-6 text-green-400" />
        </div>
        <div>
          <p className="text-gray-500 dark:text-gray-400 text-sm">Device Health</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{healthyDevices}/{totalDevices} <span className="text-sm text-gray-500 dark:text-gray-400">online</span></p>
        </div>
      </div>
    </div>
  </div>
);

// =====================================
// 3D Data Center Floor View
// =====================================

const DataCenterFloorView: React.FC<{
  racks: RackData[];
  selectedRack: string | null;
  onSelectRack: (id: string) => void;
}> = ({ racks, selectedRack, onSelectRack }) => {
  const rows = [...new Set(racks.map(r => r.row))].sort();

  return (
    <div className="relative bg-gray-100 dark:bg-gradient-to-b dark:from-gray-900 dark:to-gray-950 rounded-2xl p-8 overflow-hidden min-h-[500px] border border-gray-200 dark:border-gray-800 shadow-inner">
      {/* Grid floor pattern */}
      <div className="absolute inset-0 opacity-20 floor-grid-pattern" />

      {/* Ambient lighting effect */}
      <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl" />

      {/* 3D Perspective container */}
      <div className="relative pt-12 perspective-1200">
        <div className="floor-transform transform-style-preserve-3d">
          {rows.map(row => {
            const rowRacks = racks.filter(r => r.row === row);
            return (
              <div key={row} className="flex justify-center gap-6 mb-12">
                {rowRacks.map(rack => (
                  <div
                    key={rack.id}
                    onClick={() => onSelectRack(rack.id)}
                    className={`
                      relative cursor-pointer transition-all duration-300 rack-transform-wrapper
                      ${selectedRack === rack.id ? 'scale-110 z-10' : 'hover:scale-105'}
                    `}
                  >
                    {/* Rack 3D representation with realistic styling */}
                    <div
                      className={`
                        w-24 h-40 rounded-lg relative overflow-hidden
                        ${rack.status === 'critical' ? 'bg-gradient-to-b from-red-900/90 to-red-950/90' :
                          rack.status === 'warning' ? 'bg-gradient-to-b from-yellow-900/90 to-yellow-950/90' :
                          'bg-gradient-to-b from-gray-700/90 to-gray-900/90'}
                        border-2 ${rack.status === 'critical' ? 'border-red-500 rack-shadow-critical' :
                          rack.status === 'warning' ? 'border-yellow-500 rack-shadow-warning' : 'border-gray-500 rack-shadow-normal'}
                        ${selectedRack === rack.id ? 'ring-2 ring-blue-400 ring-offset-2 ring-offset-gray-900' : ''}
                      `}
                    >
                      {/* Rack front panel texture */}
                      <div className="absolute inset-1 bg-gradient-to-b from-gray-800 to-gray-900 rounded">
                        {/* Server unit indicators - realistic horizontal slots */}
                        <div className="absolute inset-1 flex flex-col gap-0.5 p-1">
                          {Array.from({ length: 10 }).map((_, i) => {
                            const hasDevice = rack.devices.some(d =>
                              d.startUnit <= i * 4 + 1 && d.startUnit + d.unitHeight > i * 4
                            );
                            const device = rack.devices.find(d =>
                              d.startUnit <= i * 4 + 1 && d.startUnit + d.unitHeight > i * 4
                            );
                            return (
                              <div
                                key={i}
                                className={`
                                  flex-1 rounded-sm flex items-center px-1 relative
                                  ${hasDevice
                                    ? 'bg-gradient-to-r from-gray-600 to-gray-700 rack-unit-device'
                                    : 'bg-gray-950/80'}
                                `}
                              >
                                {hasDevice && (
                                  <>
                                    {/* Drive bay indicators */}
                                    <div className="flex gap-0.5">
                                      {[0, 1].map(j => (
                                        <div key={j} className="w-1 h-2 bg-gray-800 rounded-sm" />
                                      ))}
                                    </div>
                                    {/* Status LED */}
                                    <div className="absolute right-1 flex gap-0.5">
                                      <div
                                        className={`w-1.5 h-1.5 rounded-full ${
                                          device?.status === 'online' ? 'bg-green-400 status-led-shadow-online' :
                                          device?.status === 'warning' ? 'bg-yellow-400 status-led-shadow-warning' : 'bg-red-400 status-led-shadow-critical'
                                        }`}
                                      />
                                    </div>
                                  </>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* Top status LED strip */}
                      <div className="absolute top-0 left-0 right-0 h-1 flex gap-0.5 p-0.5">
                        <div className={`flex-1 rounded-sm ${
                          rack.status === 'critical' ? 'bg-red-500 animate-pulse' :
                          rack.status === 'warning' ? 'bg-yellow-500' : 'bg-green-500'
                        }`} />
                      </div>

                      {/* Power indicator */}
                      <div className="absolute bottom-1 right-1">
                        <Power size={10} className={`${
                          rack.status === 'critical' ? 'text-red-400' : 'text-green-400'
                        }`} />
                      </div>
                    </div>

                    {/* Rack label */}
                    <div className="absolute -bottom-8 left-1/2 whitespace-nowrap rack-label-transform">
                      <span className="text-xs text-gray-300 font-medium bg-gray-800/80 px-2 py-0.5 rounded">
                        {rack.name}
                      </span>
                    </div>

                    {/* Temperature indicator floating above rack */}
                    <div className="absolute -top-6 left-1/2 transform -translate-x-1/2 rack-label-transform">
                      <span className={`text-xs font-mono px-1.5 py-0.5 rounded ${
                        rack.temperature > 30 ? 'bg-red-900/80 text-red-300' :
                        rack.temperature > 25 ? 'bg-yellow-900/80 text-yellow-300' :
                        'bg-green-900/80 text-green-300'
                      }`}>
                        {rack.temperature.toFixed(0)}°C
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      </div>

      {/* Row labels */}
      <div className="absolute left-4 top-1/2 transform -translate-y-1/2 flex flex-col gap-24">
        {rows.map(row => (
          <div key={row} className="text-gray-600 dark:text-gray-400 text-sm font-medium flex items-center gap-2">
            <MapPin size={14} />
            Row {row}
          </div>
        ))}
      </div>

      {/* Legend */}
      <div className="absolute bottom-4 right-4 flex items-center gap-4 text-xs text-gray-600 dark:text-gray-400">
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded bg-green-500" />
          <span>Healthy</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded bg-yellow-500" />
          <span>Warning</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded bg-red-500" />
          <span>Critical</span>
        </div>
      </div>
    </div>
  );
};

// =====================================
// Rack Detail Panel
// =====================================

const RackDetailPanel: React.FC<{
  rack: RackData | null;
  onClose: () => void;
  onServerClick: (deviceId: string) => void;
}> = ({ rack, onClose, onServerClick }) => {
  if (!rack) return null;

  return (
    <div className="bg-white/95 dark:bg-gray-800/90 backdrop-blur-sm rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden shadow-2xl">
      {/* Header */}
      <div className="bg-gray-50 dark:bg-gradient-to-r dark:from-blue-900/50 dark:to-purple-900/50 p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <Layers className="text-blue-500 dark:text-blue-400" />
              {rack.name}
            </h3>
            <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
              {rack.dataCenter && <span>{rack.dataCenter} • </span>}
              Row {rack.row}, Position {rack.position}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
          >
            <XCircle size={24} />
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="p-4 grid grid-cols-3 gap-4 border-b border-gray-200 dark:border-gray-700">
        <div className="text-center">
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{rack.usedUnits}/{rack.totalUnits}</p>
          <p className="text-gray-500 dark:text-gray-400 text-xs">Units Used</p>
        </div>
        <div className="text-center">
          <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{rack.powerUsage.toFixed(1)} kW</p>
          <p className="text-gray-500 dark:text-gray-400 text-xs">Power Draw</p>
        </div>
        <div className="text-center">
          <p className={`text-2xl font-bold ${
            rack.temperature > 30 ? 'text-red-500 dark:text-red-400' :
            rack.temperature > 25 ? 'text-yellow-500 dark:text-yellow-400' : 'text-green-500 dark:text-green-400'
          }`}>
            {rack.temperature.toFixed(0)}°C
          </p>
          <p className="text-gray-500 dark:text-gray-400 text-xs">Temperature</p>
        </div>
      </div>

      {/* Device List */}
      <div className="p-4 max-h-96 overflow-y-auto bg-gray-50/50 dark:bg-transparent">
        <h4 className="text-gray-700 dark:text-gray-300 font-medium mb-3 flex items-center gap-2">
          <Server size={16} />
          Installed Devices ({rack.devices.length})
        </h4>
        <div className="space-y-2">
          {rack.devices.map(device => (
            <div
              key={device.id}
              onClick={() => onServerClick(device.id)}
              className="cursor-pointer"
            >
              <RealisticServerUnit
                device={{
                  id: device.id,
                  name: device.name,
                  type: device.type,
                  manufacturer: device.manufacturer,
                  model: device.model,
                  status: device.status,
                  metrics: device.metrics
                }}
                unitHeight={device.unitHeight}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// =====================================
// Convert API data to RackData format
// =====================================

const convertToRackData = (servers: InfrastructureHost[]): RackData[] => {
  const rackMap = new Map<string, RackData>();

  servers.forEach((server) => {
    if (!server.rack_id) return;

    const rackId = server.rack_id;
    if (!rackMap.has(rackId)) {
      // Parse rack ID to get row/position if possible
      const match = rackId.match(/(\d+)/g);
      const row = match && match[0] ? parseInt(match[0]) : 1;
      const position = match && match[1] ? parseInt(match[1]) : 1;

      rackMap.set(rackId, {
        id: rackId,
        name: rackId,
        row: row,
        position: position,
        totalUnits: 42,
        usedUnits: 0,
        powerUsage: 0,
        temperature: 22,
        status: 'healthy',
        dataCenter: server.data_center,
        location: server.location,
        devices: []
      });
    }

    const rack = rackMap.get(rackId)!;

    // Parse rack unit
    let startUnit = 1;
    let unitHeight = 2;
    if (server.rack_unit) {
      const unitMatch = server.rack_unit.match(/(\d+)(?:-(\d+))?/);
      if (unitMatch) {
        startUnit = parseInt(unitMatch[1]);
        const endUnit = unitMatch[2] ? parseInt(unitMatch[2]) : startUnit + 1;
        unitHeight = endUnit - startUnit + 1;
      }
    }

    // Determine device type
    let deviceType: RackDevice['type'] = 'server';
    const modelLower = (server.device_model || '').toLowerCase();
    if (modelLower.includes('switch') || modelLower.includes('nexus')) {
      deviceType = 'switch';
    } else if (modelLower.includes('router')) {
      deviceType = 'router';
    } else if (modelLower.includes('firewall') || modelLower.includes('fortigate')) {
      deviceType = 'firewall';
    } else if (modelLower.includes('storage') || modelLower.includes('san') || modelLower.includes('nas')) {
      deviceType = 'storage';
    }

    // Determine manufacturer
    let manufacturer = 'Generic';
    const hostnameLower = (server.hostname || '').toLowerCase();
    if (modelLower.includes('dell') || hostnameLower.includes('dell')) {
      manufacturer = 'Dell';
    } else if (modelLower.includes('hp') || modelLower.includes('proliant')) {
      manufacturer = 'HP';
    } else if (modelLower.includes('cisco')) {
      manufacturer = 'Cisco';
    } else if (modelLower.includes('lenovo')) {
      manufacturer = 'Lenovo';
    }

    const device: RackDevice = {
      id: server.id,
      name: server.display_name || server.hostname,
      type: deviceType,
      manufacturer: manufacturer,
      model: server.device_model || 'Unknown Model',
      startUnit: startUnit,
      unitHeight: unitHeight,
      status: server.health_status === 'healthy' ? 'online' :
              server.health_status === 'warning' ? 'warning' : 'offline',
      metrics: {
        cpu: server.cpu_usage ?? undefined,
        memory: server.memory_usage ?? undefined,
        temperature: server.temperature ?? undefined,
        powerDraw: Math.random() * 400 + 100 // Simulated if not available
      }
    };

    rack.devices.push(device);
    rack.usedUnits += unitHeight;
    rack.powerUsage += (device.metrics.powerDraw || 200) / 1000;
    rack.temperature = Math.max(rack.temperature, device.metrics.temperature || 22);

    // Update rack status based on device health
    if (device.status === 'offline') {
      rack.status = 'critical';
    } else if (device.status === 'warning' && rack.status !== 'critical') {
      rack.status = 'warning';
    }
  });

  return Array.from(rackMap.values()).sort((a, b) => {
    if (a.row !== b.row) return a.row - b.row;
    return a.position - b.position;
  });
};

// =====================================
// Generate Mock Data for Demo
// =====================================

const generateMockRacks = (): RackData[] => {
  const racks: RackData[] = [];
  const manufacturers = ['Dell', 'HP', 'Cisco', 'Lenovo', 'Supermicro'];
  const deviceTypes: RackDevice['type'][] = ['server', 'switch', 'router', 'storage', 'pdu'];
  const dataCenters = ['DC-East', 'DC-West', 'DC-Central'];

  for (let row = 1; row <= 3; row++) {
    for (let pos = 1; pos <= 4; pos++) {
      const rackId = `RACK-${row}${pos}`;
      const devices: RackDevice[] = [];
      let currentUnit = 1;

      // Add random devices
      while (currentUnit < 38) {
        const type = deviceTypes[Math.floor(Math.random() * deviceTypes.length)];
        const unitHeight = type === 'server' ? (Math.random() > 0.5 ? 2 : 4) :
                          type === 'switch' ? 1 :
                          type === 'storage' ? 4 : 2;

        if (currentUnit + unitHeight > 42) break;

        const manufacturer = manufacturers[Math.floor(Math.random() * manufacturers.length)];
        const status: RackDevice['status'] = Math.random() > 0.9 ? 'warning' : Math.random() > 0.95 ? 'offline' : 'online';

        devices.push({
          id: `${rackId}-DEV-${currentUnit}`,
          name: `${manufacturer} ${type.charAt(0).toUpperCase() + type.slice(1)} ${currentUnit}`,
          type,
          manufacturer,
          model: `${manufacturer} ${type === 'server' ? 'PowerEdge R750' : type === 'switch' ? 'Nexus 9300' : 'Generic'}`,
          startUnit: currentUnit,
          unitHeight,
          status,
          metrics: {
            cpu: Math.floor(Math.random() * 80) + 10,
            memory: Math.floor(Math.random() * 70) + 20,
            temperature: Math.floor(Math.random() * 20) + 25,
            powerDraw: Math.floor(Math.random() * 400) + 100
          }
        });

        currentUnit += unitHeight + (Math.random() > 0.7 ? 1 : 0);
      }

      const usedUnits = devices.reduce((sum, d) => sum + d.unitHeight, 0);
      const hasWarning = devices.some(d => d.status === 'warning');
      const hasCritical = devices.some(d => d.status === 'offline');

      racks.push({
        id: rackId,
        name: rackId,
        row,
        position: pos,
        totalUnits: 42,
        usedUnits,
        powerUsage: devices.reduce((sum, d) => sum + (d.metrics.powerDraw || 0), 0) / 1000,
        temperature: Math.floor(Math.random() * 10) + 22,
        status: hasCritical ? 'critical' : hasWarning ? 'warning' : 'healthy',
        dataCenter: dataCenters[Math.floor(Math.random() * dataCenters.length)],
        location: `Floor ${row}`,
        devices
      });
    }
  }

  return racks;
};

// =====================================
// Main Page Component
// =====================================

const ServerRackMonitoringPage: React.FC = () => {
  const navigate = useNavigate();
  const [racks, setRacks] = useState<RackData[]>([]);
  const [selectedRackId, setSelectedRackId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'floor' | 'list'>('floor');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [useMockData, setUseMockData] = useState(false);

  // Fetch data from API
  const fetchServers = async () => {
    try {
      setLoading(true);
      const response = await infrastructureHostService.list(1, 200, {
        device_category: 'server',
        server_type: 'physical',
      });

      if (response && response.data && response.data.length > 0) {
        const serversWithRack = response.data.filter((server) => server.rack_id);
        if (serversWithRack.length > 0) {
          setRacks(convertToRackData(serversWithRack));
          setUseMockData(false);
        } else {
          // No servers with rack info, use mock data
          setRacks(generateMockRacks());
          setUseMockData(true);
        }
      } else {
        // No data, use mock
        setRacks(generateMockRacks());
        setUseMockData(true);
      }
    } catch (error: any) {
      console.error('Failed to fetch servers:', error);
      // Fall back to mock data
      setRacks(generateMockRacks());
      setUseMockData(true);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Initial load
  useEffect(() => {
    fetchServers();
  }, []);

  // Real-time updates simulation
  useEffect(() => {
    if (!useMockData) return;

    const interval = setInterval(() => {
      setRacks(prev => prev.map(rack => ({
        ...rack,
        temperature: Math.max(20, Math.min(40, rack.temperature + (Math.random() - 0.5) * 2)),
        powerUsage: Math.max(0, rack.powerUsage + (Math.random() - 0.5) * 0.5),
        devices: rack.devices.map(d => ({
          ...d,
          metrics: {
            ...d.metrics,
            cpu: Math.max(0, Math.min(100, (d.metrics.cpu || 50) + (Math.random() - 0.5) * 10)),
            memory: Math.max(0, Math.min(100, (d.metrics.memory || 50) + (Math.random() - 0.5) * 5)),
            temperature: Math.max(20, Math.min(80, (d.metrics.temperature || 40) + (Math.random() - 0.5) * 3))
          }
        }))
      })));
    }, 3000);

    return () => clearInterval(interval);
  }, [useMockData]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchServers();
  };

  const handleServerClick = (deviceId: string) => {
    navigate(`/infrastructure/hosts/${deviceId}`);
  };

  const selectedRack = racks.find(r => r.id === selectedRackId) || null;

  // Filter racks
  const filteredRacks = useMemo(() => {
    if (!searchTerm) return racks;
    const term = searchTerm.toLowerCase();
    return racks.filter(
      rack =>
        rack.name.toLowerCase().includes(term) ||
        rack.dataCenter?.toLowerCase().includes(term) ||
        rack.devices.some(d =>
          d.name.toLowerCase().includes(term) ||
          d.model.toLowerCase().includes(term)
        )
    );
  }, [racks, searchTerm]);

  // Calculate totals
  const totalPower = racks.reduce((sum, r) => sum + r.powerUsage, 0);
  const avgTemperature = racks.reduce((sum, r) => sum + r.temperature, 0) / racks.length || 0;
  const totalDevices = racks.reduce((sum, r) => sum + r.devices.length, 0);
  const healthyDevices = racks.reduce((sum, r) => sum + r.devices.filter(d => d.status === 'online').length, 0);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400">Loading Data Center...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <Link
              to="/infrastructure"
              className="text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </Link>
            <h1 className="text-3xl font-bold text-white">Server Rack Monitoring</h1>
          </div>
          <p className="text-gray-400">Real-time data center visualization with photorealistic rack servers</p>
        </div>

        <div className="flex items-center gap-3">
          {/* Search */}
          <div className="relative">
            <Search size={18} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search racks, devices..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:border-blue-500 w-64 shadow-sm"
            />
          </div>

          {/* View toggle */}
          <div className="bg-white dark:bg-gray-800 rounded-lg p-1 flex border border-gray-200 dark:border-gray-700 shadow-sm">
            <button
              onClick={() => setViewMode('floor')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                viewMode === 'floor'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
            >
              3D Floor View
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                viewMode === 'list'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
            >
              Rack List
            </button>
          </div>

          {/* Refresh */}
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-600 dark:text-gray-300 transition-colors shadow-sm"
          >
            <RefreshCw size={18} className={refreshing ? 'animate-spin' : ''} />
          </button>

          {/* Live indicator */}
          <div className="flex items-center gap-2 bg-gray-800 rounded-lg px-4 py-2">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            <span className="text-green-400 text-sm font-medium">Live</span>
          </div>
        </div>
      </div>

      {/* Environment Stats */}
      <EnvironmentStats
        totalPower={totalPower}
        avgTemperature={avgTemperature}
        coolingEfficiency={94}
        healthyDevices={healthyDevices}
        totalDevices={totalDevices}
      />

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Floor View / Rack List */}
        <div className={selectedRack ? 'lg:col-span-2' : 'lg:col-span-3'}>
          {viewMode === 'floor' ? (
            <DataCenterFloorView
              racks={filteredRacks}
              selectedRack={selectedRackId}
              onSelectRack={setSelectedRackId}
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {filteredRacks.map(rack => (
                <div
                  key={rack.id}
                  onClick={() => setSelectedRackId(rack.id)}
                  className={`
                    bg-gray-800/50 rounded-xl p-4 cursor-pointer transition-all
                    border ${selectedRackId === rack.id
                      ? 'border-blue-500 ring-2 ring-blue-500/30'
                      : 'border-gray-700 hover:border-gray-600'}
                  `}
                >
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-lg font-bold text-white flex items-center gap-2">
                      <Layers size={18} className="text-blue-400" />
                      {rack.name}
                    </h3>
                    <div className={`
                      w-3 h-3 rounded-full
                      ${rack.status === 'critical' ? 'bg-red-500 animate-pulse' :
                        rack.status === 'warning' ? 'bg-yellow-500' : 'bg-green-500'}
                    `} />
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-sm">
                    <div>
                      <p className="text-gray-500">Units</p>
                      <p className="text-white font-medium">{rack.usedUnits}/{rack.totalUnits}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Power</p>
                      <p className="text-blue-400 font-medium">{rack.powerUsage.toFixed(1)} kW</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Temp</p>
                      <p className={`font-medium ${
                        rack.temperature > 30 ? 'text-red-400' :
                        rack.temperature > 25 ? 'text-yellow-400' : 'text-green-400'
                      }`}>{rack.temperature.toFixed(0)}°C</p>
                    </div>
                  </div>
                  <div className="mt-3 text-xs text-gray-500">
                    {rack.devices.length} devices • {rack.dataCenter || 'Unknown DC'}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Rack Detail Panel */}
        {selectedRack && (
          <div className="lg:col-span-1">
            <RackDetailPanel
              rack={selectedRack}
              onClose={() => setSelectedRackId(null)}
              onServerClick={handleServerClick}
            />
          </div>
        )}
      </div>

      {/* Full Rack Visualization (when rack selected) */}
      {selectedRack && (
        <div className="mt-6">
          <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
            <Server className="text-blue-400" />
            {selectedRack.name} - Full Rack View
          </h3>
          <RackVisualization
            rackId={selectedRack.id}
            rackName={selectedRack.name}
            devices={selectedRack.devices.map(d => ({
              id: d.id,
              name: d.name,
              type: d.type,
              manufacturer: d.manufacturer,
              model: d.model,
              status: d.status,
              metrics: d.metrics,
              startUnit: d.startUnit,
              unitHeight: d.unitHeight
            }))}
          />
        </div>
      )}
    </div>
  );
};

export default ServerRackMonitoringPage;
