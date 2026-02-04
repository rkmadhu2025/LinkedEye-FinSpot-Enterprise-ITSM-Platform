/**
 * VM to Physical Mapping Page
 *
 * Visualizes the relationship between Virtual Machines and Physical Servers:
 * - VM → Physical host connections
 * - NIC to Physical NIC links
 * - Hypervisor relationships
 * - Resource utilization comparison
 */

import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Server,
  Box,
  Link2,
  ArrowLeft,
  RefreshCw,
  Search,
  Filter,
  Plus,
  ChevronDown,
  ChevronRight,
  Activity,
  Cpu,
  HardDrive,
  Network,
  Settings,
  CheckCircle,
  AlertTriangle,
  XCircle,
  ExternalLink,
  Layers,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { VMPhysicalMapping, InfrastructureHost } from '../../types';
import { vmPhysicalService, infrastructureHostService } from '../../services/infrastructureService';

// =====================================
// VM Card Component
// =====================================

interface VMCardProps {
  mapping: VMPhysicalMapping;
  onViewDetails: () => void;
  onAssignHost: () => void;
}

const VMCard: React.FC<VMCardProps> = ({ mapping, onViewDetails, onAssignHost }) => {
  const statusColors: Record<string, string> = {
    running: '#22c55e',
    stopped: '#ef4444',
    suspended: '#f59e0b',
    unknown: '#6b7280',
  };

  const statusColor = statusColors[mapping.vm.status.toLowerCase()] || statusColors.unknown;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700 shadow-sm dark:shadow-none hover:shadow-md hover:border-blue-500 dark:hover:border-gray-600 transition-all group">
      {/* VM Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          {/* VM Icon */}
          <div className="relative">
            <svg width="48" height="48" viewBox="0 0 48 48">
              <defs>
                <linearGradient id={`vm-${mapping.vm.id}`} x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#8b5cf6" stopOpacity="0.9" />
                  <stop offset="100%" stopColor="#6366f1" stopOpacity="0.7" />
                </linearGradient>
              </defs>
              <rect
                x="4" y="4" width="40" height="40" rx="8"
                fill={`url(#vm-${mapping.vm.id})`}
                stroke="#a78bfa"
                strokeWidth="2"
                strokeDasharray="4,2"
              />
              <rect x="10" y="10" width="28" height="28" rx="4" fill="#1f2937" opacity="0.8" />
              <Box size={16} className="vm-icon-transform" color="#fff" />
            </svg>
            {/* Status indicator */}
            <div
              className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-gray-800 bg-dynamic"
              style={{ '--dynamic-color': statusColor } as React.CSSProperties}
            />
          </div>

          <div>
            <h4 className="text-gray-900 dark:text-white font-semibold">{mapping.vm.hostname}</h4>
            <p className="text-gray-500 dark:text-gray-400 text-sm">{mapping.vm.os || 'Unknown OS'}</p>
          </div>
        </div>

        <span
          className="px-2 py-1 rounded text-xs font-medium capitalize bg-dynamic-alpha text-dynamic"
          style={{
            '--dynamic-color': statusColor,
            '--dynamic-color-alpha': `${statusColor}20`,
          } as React.CSSProperties}
        >
          {mapping.vm.status}
        </span>
      </div>

      {/* VM Details */}
      <div className="space-y-2 mb-4">
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-500 dark:text-gray-400">IP Address</span>
          <span className="text-gray-900 dark:text-white font-mono">{mapping.vm.ip || 'N/A'}</span>
        </div>
      </div>

      {/* Connection Line */}
      <div className="relative py-4">
        <div className="absolute left-1/2 top-0 bottom-0 w-0.5 bg-gradient-to-b from-purple-500 to-green-500">
          {/* Animated dot */}
          <div
            className={`absolute w-2 h-2 bg-white rounded-full -left-[3px] ${mapping.physical_host ? 'animate-move-down' : ''}`}
          />
        </div>
        <div className="flex justify-center">
          <div className="px-3 py-1 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center gap-1 text-xs text-gray-600 dark:text-gray-300 z-10 border border-gray-200 dark:border-gray-600">
            <Link2 size={12} />
            <span>RUNS_ON</span>
          </div>
        </div>
      </div>

      {/* Physical Host */}
      {mapping.physical_host ? (
        <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3">
          <div className="flex items-center gap-3">
            {/* Physical server icon */}
            <svg width="40" height="40" viewBox="0 0 40 40">
              <defs>
                <linearGradient id={`phys-${mapping.vm.id}`} x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#374151" />
                  <stop offset="100%" stopColor="#1f2937" />
                </linearGradient>
              </defs>
              <rect x="8" y="2" width="24" height="36" rx="2" fill={`url(#phys-${mapping.vm.id})`} />
              {[0, 1, 2].map((i) => (
                <g key={i}>
                  <rect x="11" y={6 + i * 10} width="18" height="6" rx="1" fill="#1f2937" stroke="#4b5563" strokeWidth="0.5" />
                  <circle cx="26" cy={9 + i * 10} r="1.5" fill="#22c55e" />
                </g>
              ))}
            </svg>

            <div className="flex-1">
              <p className="text-gray-900 dark:text-white font-medium">{mapping.physical_host.hostname}</p>
              <p className="text-gray-500 dark:text-gray-400 text-xs">{mapping.physical_host.model || 'Physical Server'}</p>
              <p className="text-gray-500 dark:text-gray-500 text-xs font-mono">{mapping.physical_host.ip || 'No IP'}</p>
            </div>

            <button
              onClick={onViewDetails}
              title="View Physical Host Details"
              className="p-2 hover:bg-gray-200 dark:hover:bg-gray-600 rounded text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
            >
              <ExternalLink size={16} />
            </button>
          </div>
        </div>
      ) : (
        <div className="bg-gray-50 dark:bg-gray-700/30 rounded-lg p-4 border-2 border-dashed border-gray-300 dark:border-gray-600">
          <div className="text-center">
            <Server size={24} className="mx-auto text-gray-400 dark:text-gray-500 mb-2" />
            <p className="text-gray-500 dark:text-gray-400 text-sm mb-2">No physical host assigned</p>
            <button
              onClick={onAssignHost}
              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 rounded text-white text-sm flex items-center gap-1 mx-auto"
            >
              <Plus size={14} />
              <span>Assign Host</span>
            </button>
          </div>
        </div>
      )}

      {/* Physical IP Link */}
      {mapping.connection.physical_ip_link && (
        <div className="mt-3 flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
          <Network size={12} />
          <span>Link: {mapping.connection.physical_ip_link}</span>
        </div>
      )}
    </div>
  );
};

// =====================================
// Physical Host Summary Card
// =====================================

interface PhysicalHostSummaryProps {
  host: InfrastructureHost;
  vmCount: number;
  onClick: () => void;
}

const PhysicalHostSummary: React.FC<PhysicalHostSummaryProps> = ({ host, vmCount, onClick }) => {
  return (
    <div
      onClick={onClick}
      className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700 shadow-sm dark:shadow-none hover:shadow-md hover:border-gray-300 dark:hover:border-gray-600 cursor-pointer transition-all"
    >
      <div className="flex items-center gap-4">
        {/* Server icon */}
        <svg width="60" height="80" viewBox="0 0 60 80">
          <defs>
            <linearGradient id={`host-${host.id}`} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#374151" />
              <stop offset="100%" stopColor="#1f2937" />
            </linearGradient>
          </defs>
          <rect x="10" y="5" width="40" height="70" rx="3" fill={`url(#host-${host.id})`} />
          <polygon points="10,5 15,0 50,0 50,5" fill="#4b5563" />
          {[0, 1, 2, 3].map((i) => (
            <g key={i}>
              <rect x="15" y={12 + i * 14} width="30" height="10" rx="1" fill="#1f2937" stroke="#4b5563" strokeWidth="0.5" />
              <circle cx="40" cy={17 + i * 14} r="2" fill="#22c55e" opacity={0.5 + i * 0.15} />
            </g>
          ))}
        </svg>

        <div className="flex-1">
          <h4 className="text-gray-900 dark:text-white font-semibold">{host.hostname}</h4>
          <p className="text-gray-500 dark:text-gray-400 text-sm">{host.device_model || 'Physical Server'}</p>
          <p className="text-gray-500 dark:text-gray-500 text-xs font-mono mt-1">{host.management_ip || 'No IP'}</p>

          {/* Metrics */}
          <div className="flex items-center gap-4 mt-3">
            {host.cpu_usage !== null && (
              <div className="flex items-center gap-1 text-xs">
                <Cpu size={12} className="text-blue-500 dark:text-blue-400" />
                <span className="text-gray-700 dark:text-gray-300">{host.cpu_usage.toFixed(0)}%</span>
              </div>
            )}
            {host.memory_usage !== null && (
              <div className="flex items-center gap-1 text-xs">
                <HardDrive size={12} className="text-green-500 dark:text-green-400" />
                <span className="text-gray-700 dark:text-gray-300">{host.memory_usage.toFixed(0)}%</span>
              </div>
            )}
          </div>
        </div>

        {/* VM count badge */}
        <div className="text-center">
          <div className="w-12 h-12 rounded-full bg-purple-100 dark:bg-purple-500/20 flex items-center justify-center">
            <span className="text-xl font-bold text-purple-600 dark:text-purple-400">{vmCount}</span>
          </div>
          <span className="text-xs text-gray-500 dark:text-gray-400 mt-1 block">VMs</span>
        </div>
      </div>
    </div>
  );
};

// =====================================
// Assign Host Modal
// =====================================

interface AssignHostModalProps {
  vmId: string;
  vmHostname: string;
  physicalHosts: InfrastructureHost[];
  onAssign: (physicalHostId: string) => void;
  onClose: () => void;
}

const AssignHostModal: React.FC<AssignHostModalProps> = ({
  vmId,
  vmHostname,
  physicalHosts,
  onAssign,
  onClose,
}) => {
  const [selectedHost, setSelectedHost] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredHosts = physicalHosts.filter(
    (h) =>
      h.hostname.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (h.management_ip && h.management_ip.includes(searchQuery))
  );

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 w-full max-w-lg max-h-[80vh] overflow-hidden flex flex-col shadow-2xl border border-gray-200 dark:border-gray-700">
        <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Assign Physical Host</h3>
        <p className="text-gray-500 dark:text-gray-400 text-sm mb-4">
          Select a physical server to host <span className="text-gray-900 dark:text-white font-medium">{vmHostname}</span>
        </p>

        {/* Search */}
        <div className="relative mb-4">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search hosts..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:border-blue-500"
          />
        </div>

        {/* Host list */}
        <div className="flex-1 overflow-y-auto space-y-2 mb-4">
          {filteredHosts.map((host) => (
            <button
              key={host.id}
              onClick={() => setSelectedHost(host.id)}
              className={`w-full flex items-center gap-3 p-3 rounded-lg transition-colors ${
                selectedHost === host.id
                  ? 'bg-blue-50 dark:bg-blue-600/20 border border-blue-200 dark:border-blue-500'
                  : 'bg-gray-50 dark:bg-gray-700 border border-transparent hover:border-gray-300 dark:hover:border-gray-600'
              }`}
            >
              <Server size={20} className={selectedHost === host.id ? 'text-blue-600 dark:text-blue-400' : 'text-gray-400'} />
              <div className="flex-1 text-left">
                <p className={selectedHost === host.id ? 'text-gray-900 dark:text-white font-medium' : 'text-gray-600 dark:text-gray-300'}>
                  {host.hostname}
                </p>
                <p className="text-gray-500 text-xs font-mono">{host.management_ip || 'No IP'}</p>
              </div>
              {selectedHost === host.id && <CheckCircle size={20} className="text-blue-600 dark:text-blue-400" />}
            </button>
          ))}

          {filteredHosts.length === 0 && (
            <p className="text-gray-500 dark:text-gray-400 text-center py-4">No physical hosts found</p>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg text-gray-700 dark:text-gray-300 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => selectedHost && onAssign(selectedHost)}
            disabled={!selectedHost}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed rounded-lg text-white transition-colors"
          >
            Assign Host
          </button>
        </div>
      </div>
    </div>
  );
};

// =====================================
// Main Page Component
// =====================================

const VMPhysicalMappingPage: React.FC = () => {
  const navigate = useNavigate();
  const [mappings, setMappings] = useState<VMPhysicalMapping[]>([]);
  const [physicalHosts, setPhysicalHosts] = useState<InfrastructureHost[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'grid' | 'hierarchy'>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterUnassigned, setFilterUnassigned] = useState(false);
  const [assignModal, setAssignModal] = useState<{ vmId: string; vmHostname: string } | null>(null);

  const fetchData = async () => {
    try {
      const [mappingData, hostsData] = await Promise.all([
        vmPhysicalService.getMappings(),
        infrastructureHostService.list(1, 100, { server_type: 'physical' }),
      ]);
      setMappings(mappingData.mappings);
      setPhysicalHosts(hostsData.data);
    } catch (error) {
      console.error('Failed to fetch VM-Physical mappings:', error);
      toast.error('Failed to load VM mappings');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleAssignHost = async (vmId: string, physicalHostId: string) => {
    try {
      await vmPhysicalService.createMapping(vmId, physicalHostId);
      toast.success('Host assigned successfully');
      setAssignModal(null);
      fetchData();
    } catch (error) {
      console.error('Failed to assign host:', error);
      toast.error('Failed to assign host');
    }
  };

  // Filter mappings
  const filteredMappings = mappings.filter((m) => {
    const matchesSearch =
      searchQuery === '' ||
      m.vm.hostname.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (m.physical_host?.hostname && m.physical_host.hostname.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesFilter = !filterUnassigned || !m.physical_host;

    return matchesSearch && matchesFilter;
  });

  // Group by physical host for hierarchy view
  const hostGroups = physicalHosts.reduce((acc, host) => {
    const vms = mappings.filter((m) => m.physical_host?.id === host.id);
    if (vms.length > 0) {
      acc.push({ host, vms });
    }
    return acc;
  }, [] as Array<{ host: InfrastructureHost; vms: VMPhysicalMapping[] }>);

  // Count unassigned VMs
  const unassignedVMs = mappings.filter((m) => !m.physical_host);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50 dark:bg-gray-900">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/infrastructure')}
            title="Back to Infrastructure"
            className="p-2 hover:bg-gray-200 dark:hover:bg-gray-800 rounded-lg text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">VM to Physical Mapping</h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1">Manage virtual machine to physical server relationships</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => fetchData()}
            className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-600 dark:text-gray-300 transition-colors shadow-sm"
          >
            <RefreshCw size={18} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700 shadow-sm dark:shadow-none">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-500/20">
              <Box size={20} className="text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{mappings.length}</p>
              <p className="text-gray-500 dark:text-gray-400 text-sm">Total VMs</p>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700 shadow-sm dark:shadow-none">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-green-100 dark:bg-green-500/20">
              <Server size={20} className="text-green-600 dark:text-green-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{physicalHosts.length}</p>
              <p className="text-gray-500 dark:text-gray-400 text-sm">Physical Hosts</p>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700 shadow-sm dark:shadow-none">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-500/20">
              <Link2 size={20} className="text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {mappings.filter((m) => m.physical_host).length}
              </p>
              <p className="text-gray-500 dark:text-gray-400 text-sm">Assigned VMs</p>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700 shadow-sm dark:shadow-none">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-yellow-100 dark:bg-yellow-500/20">
              <AlertTriangle size={20} className="text-yellow-600 dark:text-yellow-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{unassignedVMs.length}</p>
              <p className="text-gray-500 dark:text-gray-400 text-sm">Unassigned VMs</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search VMs or hosts..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:border-blue-500 w-64 shadow-sm"
            />
          </div>

          <button
            onClick={() => setFilterUnassigned(!filterUnassigned)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors shadow-sm ${
              filterUnassigned
                ? 'bg-yellow-100 dark:bg-yellow-600/20 text-yellow-700 dark:text-yellow-400 border border-yellow-200 dark:border-yellow-500'
                : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700'
            }`}
          >
            <Filter size={18} />
            <span>Unassigned Only</span>
          </button>
        </div>

        <div className="flex items-center gap-2 bg-white dark:bg-gray-800 rounded-lg p-1 border border-gray-200 dark:border-gray-700 shadow-sm">
          <button
            onClick={() => setViewMode('grid')}
            title="Grid View"
            className={`p-2 rounded ${viewMode === 'grid' ? 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white' : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'}`}
          >
            <Layers size={18} />
          </button>
          <button
            onClick={() => setViewMode('hierarchy')}
            title="Hierarchy View"
            className={`p-2 rounded ${viewMode === 'hierarchy' ? 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white' : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'}`}
          >
            <Network size={18} />
          </button>
        </div>
      </div>

      {/* Content */}
      {viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredMappings.map((mapping) => (
            <VMCard
              key={mapping.vm.id}
              mapping={mapping}
              onViewDetails={() => navigate(`/infrastructure/hosts/${mapping.physical_host?.id}`)}
              onAssignHost={() => setAssignModal({ vmId: mapping.vm.id, vmHostname: mapping.vm.hostname })}
            />
          ))}

          {filteredMappings.length === 0 && (
            <div className="col-span-full text-center py-12 text-gray-500 dark:text-gray-400">
              <Box size={48} className="mx-auto mb-4 opacity-50" />
              <p>No virtual machines found</p>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-6">
          {hostGroups.map(({ host, vms }) => (
            <div key={host.id} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden shadow-sm dark:shadow-none">
              <PhysicalHostSummary
                host={host}
                vmCount={vms.length}
                onClick={() => navigate(`/infrastructure/hosts/${host.id}`)}
              />
              <div className="p-4 border-t border-gray-200 dark:border-gray-700">
                <h4 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-3">Hosted Virtual Machines</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {vms.map((mapping) => (
                    <div
                      key={mapping.vm.id}
                      className="flex items-center gap-2 p-2 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-100 dark:border-transparent"
                    >
                      <Box size={16} className="text-purple-600 dark:text-purple-400" />
                      <div className="flex-1 min-w-0">
                        <p className="text-gray-900 dark:text-white text-sm truncate">{mapping.vm.hostname}</p>
                        <p className="text-gray-500 dark:text-gray-500 text-xs">{mapping.vm.status}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}

          {/* Unassigned VMs section */}
          {unassignedVMs.length > 0 && (
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-yellow-200 dark:border-yellow-500/30 overflow-hidden shadow-sm dark:shadow-none">
              <div className="p-4 bg-yellow-50 dark:bg-yellow-500/10 flex items-center gap-3">
                <AlertTriangle size={20} className="text-yellow-600 dark:text-yellow-400" />
                <div>
                  <h4 className="text-gray-900 dark:text-white font-medium">Unassigned Virtual Machines</h4>
                  <p className="text-gray-600 dark:text-gray-400 text-sm">{unassignedVMs.length} VMs without a physical host</p>
                </div>
              </div>
              <div className="p-4 grid grid-cols-2 md:grid-cols-4 gap-3">
                {unassignedVMs.map((mapping) => (
                  <div
                    key={mapping.vm.id}
                    className="flex items-center gap-2 p-2 bg-gray-50 dark:bg-gray-700/50 rounded-lg cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors border border-gray-100 dark:border-transparent"
                    onClick={() => setAssignModal({ vmId: mapping.vm.id, vmHostname: mapping.vm.hostname })}
                  >
                    <Box size={16} className="text-yellow-600 dark:text-yellow-400" />
                    <div className="flex-1 min-w-0">
                      <p className="text-gray-900 dark:text-white text-sm truncate">{mapping.vm.hostname}</p>
                      <p className="text-gray-500 dark:text-gray-500 text-xs">{mapping.vm.status}</p>
                    </div>
                    <Plus size={16} className="text-gray-400" />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Assign Host Modal */}
      {assignModal && (
        <AssignHostModal
          vmId={assignModal.vmId}
          vmHostname={assignModal.vmHostname}
          physicalHosts={physicalHosts}
          onAssign={(hostId) => handleAssignHost(assignModal.vmId, hostId)}
          onClose={() => setAssignModal(null)}
        />
      )}

      {/* CSS for animation moved to infrastructure.css */}
    </div>
  );
};

export default VMPhysicalMappingPage;
