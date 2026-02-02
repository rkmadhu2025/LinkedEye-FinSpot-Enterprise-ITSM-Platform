import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  Plus, 
  Search, 
  Network, 
  Router, 
  Wifi, 
  Server, 
  Shield, 
  Activity, 
  Download, 
  Filter, 
  MapPin, 
  Building,
  CheckCircle,
  XCircle,
  AlertCircle,
  Wrench,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  MoreVertical
} from 'lucide-react';
import {
  Card,
  CardBody,
  Button,
  Input,
  Select,
  Badge,
  Spinner,
  EmptyState,
  Modal,
} from '@/components/ui';
import { networkService, NetworkDevice, NetworkDeviceStatus } from '@/services/networkService';
import { useAppSelector } from '@/hooks/useRedux';
import toast from 'react-hot-toast';
import clsx from 'clsx';

// Type definitions for component props
interface StatCardProps {
  label: string;
  value: number;
  icon: React.ReactNode;
  type: 'total' | 'up' | 'down' | 'warning' | 'maintenance';
  isDark?: boolean;
}

const NetworkDevicesPage = () => {
  const navigate = useNavigate();
  const { theme } = useAppSelector((state) => state.ui);
  const isDark = theme === 'dark';
  const [devices, setDevices] = useState<NetworkDevice[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
  
  // Filters
  const [typeFilter, setTypeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  
  // Pagination
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({
      page: 1,
      limit: 10,
      total: 0,
      totalPages: 1
  });

  // Modal State
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [newDevice, setNewDevice] = useState<Partial<NetworkDevice>>({
    name: '',
    type: '',
    ipAddress: '',
    manufacturer: '',
    model: '',
    serialNumber: '',
    location: '',
  });

  // Debounce search
  useEffect(() => {
    const handle = setTimeout(() => {
        setDebouncedSearchQuery(searchQuery);
        setPage(1); // Reset to page 1 on new search
    }, 300);
    return () => clearTimeout(handle);
  }, [searchQuery]);

  // Fetch Data
  const fetchDevices = useCallback(async () => {
    setIsLoading(true);
    try {
      const filters: any = {};
      const search = debouncedSearchQuery.trim();
      if (search) filters.search = search;
      if (typeFilter) filters.type = typeFilter;
      // Map UI status filter to backend enum if needed, or pass directly if strings match
      if (statusFilter) filters.status = statusFilter;

      const res = await networkService.getDevices(page, 10, filters);
      setDevices(res.data);
      if (res.pagination) {
          setPagination(res.pagination);
      }
    } catch (error) {
      console.error('Failed to load devices:', error);
      toast.error('Failed to load network devices');
    } finally {
      setIsLoading(false);
    }
  }, [debouncedSearchQuery, typeFilter, statusFilter, page]);

  useEffect(() => {
    fetchDevices();
  }, [fetchDevices]);

  // Stats Calculation
  const stats = useMemo(() => {
    const normalized = devices.map(d => ({
      status: (d.status || 'unknown').toLowerCase(),
    }));
    return {
      total: devices.length,
      online: normalized.filter(d => d.status === 'healthy' || d.status === 'up').length,
      offline: normalized.filter(d => d.status === 'critical' || d.status === 'down').length,
      warning: normalized.filter(d => d.status === 'warning').length,
      maintenance: normalized.filter(d => d.status === 'maintenance').length,
    };
  }, [devices]);

  // Handle Create
  const handleCreateDevice = async () => {
    const hostname = (newDevice.name || '').trim();
    const deviceType = (newDevice.type || '').trim();
    if (!hostname || !deviceType) {
      toast.error('Hostname and device type are required');
      return;
    }

    try {
      setIsSaving(true);
      const created = await networkService.createDevice({
        ...newDevice,
        name: hostname,
        type: deviceType,
      });
      toast.success('Device added successfully');
      setIsCreateModalOpen(false);
      await fetchDevices();
      navigate(`/network/devices/${created.id}`);
    } catch (error) {
      console.error('Failed to create device:', error);
      toast.error('Failed to add device');
    } finally {
      setIsSaving(false);
    }
  };

  // Helper for device icon
  const getDeviceIcon = (type: string) => {
    const t = (type || '').toLowerCase();
    if (t.includes('switch')) return { icon: <Network size={20} />, class: 'text-emerald-500 bg-emerald-500/10' };
    if (t.includes('router')) return { icon: <Router size={20} />, class: 'text-blue-500 bg-blue-500/10' };
    if (t.includes('firewall')) return { icon: <Shield size={20} />, class: 'text-red-500 bg-red-500/10' };
    if (t.includes('access')) return { icon: <Wifi size={20} />, class: 'text-purple-500 bg-purple-500/10' };
    if (t.includes('server')) return { icon: <Server size={20} />, class: 'text-gray-500 bg-gray-500/10' };
    return { icon: <Activity size={20} />, class: 'text-gray-500 bg-gray-500/10' };
  };

  // Helper for Status Badge Class
  const getStatusClass = (status: string) => {
    const s = (status || '').toLowerCase();
    if (s === 'healthy' || s === 'up') return 'up';
    if (s === 'critical' || s === 'down') return 'down';
    if (s === 'warning') return 'warning';
    if (s === 'maintenance') return 'maintenance';
    return 'unknown';
  };

  const getStatusLabel = (status: string) => {
    const s = (status || '').toLowerCase();
    if (s === 'healthy' || s === 'up') return 'Up';
    if (s === 'critical' || s === 'down') return 'Down';
    if (s === 'warning') return 'Warning';
    if (s === 'maintenance') return 'Maint';
    return 'Unknown';
  };

  return (
    <div className="space-y-6 min-h-screen -m-6 p-6" style={{ background: isDark ? 'linear-gradient(180deg, #030712 0%, #0a0f1a 100%)' : '#f9fafb' }}>
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>Network Devices</h1>
          <p className={`mt-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Switches, routers, firewalls, and access points</p>
        </div>
        <div className="flex items-center gap-3">
            <Button variant="outline" leftIcon={<Download size={16} />}>Export</Button>
            <Button leftIcon={<Plus size={16} />} onClick={() => setIsCreateModalOpen(true)}>Add Device</Button>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <StatCard isDark={isDark}
            label="Total Devices"
            value={stats.total}
            icon={<Network />}
            type="total"
        />
        <StatCard isDark={isDark}
            label="Online"
            value={stats.online}
            icon={<CheckCircle />}
            type="up"
        />
        <StatCard isDark={isDark}
            label="Offline"
            value={stats.offline}
            icon={<XCircle />}
            type="down"
        />
         <StatCard isDark={isDark}
            label="Warning"
            value={stats.warning}
            icon={<AlertCircle />}
            type="warning"
        />
         <StatCard isDark={isDark}
            label="Maintenance"
            value={stats.maintenance}
            icon={<Wrench />}
            type="maintenance"
        />
      </div>

      {/* Toolbar */}
      <div className="rounded-xl overflow-visible p-4 flex flex-col md:flex-row justify-between items-center gap-4" style={{ background: isDark ? 'rgba(255,255,255,0.05)' : '#ffffff', border: isDark ? '1px solid rgba(255,255,255,0.1)' : '1px solid #e5e8eb' }}>
           {/* Left: Search & Filter Tabs */}
           <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
               <div className="relative w-full md:w-80">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                  <input
                    type="text"
                    placeholder="Search devices by hostname, IP, model..."
                    className={`w-full pl-10 pr-4 py-2 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all placeholder-gray-400 ${isDark ? 'text-white' : 'text-gray-900'}`}
                    style={{ background: isDark ? 'rgba(255,255,255,0.1)' : '#f9fafb', border: isDark ? '1px solid rgba(255,255,255,0.1)' : '1px solid #e5e8eb' }}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
               </div>
               
               <div className="flex gap-2 text-sm overflow-x-auto pb-1 md:pb-0 hide-scrollbar items-center">
                    <Select
                        value={typeFilter}
                        onChange={(e) => setTypeFilter(e.target.value)}
                        options={[
                            { value: '', label: 'All Types' },
                            { value: 'switch', label: 'Switch' },
                            { value: 'router', label: 'Router' },
                            { value: 'firewall', label: 'Firewall' },
                            { value: 'access_point', label: 'Access Point' },
                            { value: 'server', label: 'Server' },
                        ]}
                        className="w-40"
                        // Note: You might need to adjust your Select component to accept arbitrary classes or style props to match the 'button' look perfectly, 
                        // but sticking to your Select component ensures functionality.
                    />
                    <Select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        options={[
                            { value: '', label: 'All Statuses' },
                            { value: 'healthy', label: 'Healthy' },
                            { value: 'warning', label: 'Warning' },
                            { value: 'critical', label: 'Critical' },
                        ]}
                        className="w-40"
                    />
                </div>
           </div>
      </div>

      {/* Devices Table */}
      <div className="overflow-hidden rounded-xl" style={{ background: isDark ? 'rgba(255,255,255,0.05)' : '#ffffff', border: isDark ? '1px solid rgba(255,255,255,0.1)' : '1px solid #e5e8eb' }}>
          {isLoading ? (
            <div className="py-20 flex justify-center">
                <Spinner size="lg" />
            </div>
          ) : devices.length === 0 ? (
            <EmptyState
                title="No devices found"
                description={searchQuery ? "Try adjusting your search or filters" : "Add your first device to get started"}
                icon={<Server size={48} className={`${isDark ? 'text-gray-300' : 'text-gray-400'} mb-4`} />}
                action={!searchQuery ? { label: "Add Device", onClick: () => setIsCreateModalOpen(true) } : undefined}
            />
          ) : (
            <div className="overflow-x-auto">
                <table className="w-full">
                    <thead>
                        <tr style={{ background: isDark ? 'rgba(255,255,255,0.03)' : '#f9fafb', borderBottom: isDark ? '1px solid rgba(255,255,255,0.1)' : '1px solid #e5e8eb' }}>
                            <th className="text-left py-3 px-6 text-xs font-semibold text-gray-400 uppercase tracking-wider">Device</th>
                            <th className="text-left py-3 px-6 text-xs font-semibold text-gray-400 uppercase tracking-wider">Type</th>
                            <th className="text-left py-3 px-6 text-xs font-semibold text-gray-400 uppercase tracking-wider">Location</th>
                            <th className="text-left py-3 px-6 text-xs font-semibold text-gray-400 uppercase tracking-wider">Status</th>
                            <th className="text-left py-3 px-6 text-xs font-semibold text-gray-400 uppercase tracking-wider">CPU / Memory</th>
                            <th className="text-left py-3 px-6 text-xs font-semibold text-gray-400 uppercase tracking-wider">Ports</th>
                            <th className="text-left py-3 px-6 text-xs font-semibold text-gray-400 uppercase tracking-wider">Last Seen</th>
                        </tr>
                    </thead>
                    <tbody>
                        {devices.map((device) => {
                            const iconData = getDeviceIcon(device.type);
                            const metrics = device.metrics || { cpuUsage: 0, memoryUsage: 0 };
                            // Mock ports for now if not available
                            const ports = device.metrics?.portStatus || Array(4).fill({ status: 'up' });
                            
                            return (
                                <tr
                                    key={device.id}
                                    className="transition-colors cursor-pointer group"
                                    style={{ borderBottom: isDark ? '1px solid rgba(255,255,255,0.05)' : '1px solid #f0f0f0' }}
                                    onClick={() => navigate(`/network/devices/${device.id}`)}
                                    onMouseEnter={(e) => e.currentTarget.style.background = isDark ? 'rgba(255,255,255,0.03)' : '#f9fafb'}
                                    onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                                >
                                    <td className="py-4 px-6">
                                        <div className="flex items-center gap-3">
                                            <div className={clsx("device-icon-box", iconData.class)}>
                                                {iconData.icon}
                                            </div>
                                            <div>
                                                <div className={`font-semibold text-sm group-hover:text-indigo-400 transition-colors ${isDark ? 'text-white' : 'text-gray-900'}`}>
                                                    {device.name}
                                                </div>
                                                <div className="text-xs text-gray-500 font-mono mt-0.5">
                                                    {device.ipAddress}
                                                </div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="py-4 px-6">
                                        <span className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                                            {device.model || device.type || 'Unknown'}
                                        </span>
                                    </td>
                                    <td className="py-4 px-6">
                                        <span className="text-sm text-gray-400">
                                            {device.location || 'Unknown'}
                                        </span>
                                    </td>
                                    <td className="py-4 px-6">
                                        <span className={clsx("status-pill", getStatusClass(device.status))}>
                                            {getStatusLabel(device.status)}
                                        </span>
                                    </td>
                                    <td className="py-4 px-6">
                                        <div className="flex gap-4">
                                            <div className="device-metric">
                                                <div className={clsx("value", metrics.cpuUsage > 80 ? "text-red-400" : isDark ? "text-white" : "text-gray-900")}>
                                                    {metrics.cpuUsage}%
                                                </div>
                                                <div className={`label ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>CPU</div>
                                            </div>
                                            <div className="device-metric">
                                                <div className={clsx("value", metrics.memoryUsage > 80 ? "text-red-400" : isDark ? "text-white" : "text-gray-900")}>
                                                    {metrics.memoryUsage}%
                                                </div>
                                                <div className="label text-gray-500">MEM</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="py-4 px-6">
                                        <div className="flex items-center gap-2">
                                            <div className="port-status-group">
                                                {/* Mock visual - just show first 4-8 ports visually */}
                                                {(ports.length > 0 ? ports.slice(0, 4) : [1,1,1,0]).map((p, idx) => (
                                                   <div
                                                    key={idx}
                                                    className={clsx(
                                                        "port-indicator",
                                                        (typeof p === 'object' ? p.status : (p ? 'up' : 'down')) === 'up' ? "up" : "down"
                                                    )}
                                                    title={`Port ${idx+1}`}
                                                   />
                                                ))}
                                            </div>
                                            <span className="text-xs text-gray-400">
                                                {device.metrics?.usedPorts ?? 22}/{device.metrics?.totalPorts ?? 24}
                                            </span>
                                        </div>
                                    </td>
                                    <td className="py-4 px-6">
                                        <span className="text-sm text-gray-400">
                                            {device.lastSeen ? 'Just now' : 'Failed'}
                                        </span>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
          )}


          {/* Pagination */}
          <div className="px-6 py-4 flex items-center justify-between" style={{ background: isDark ? 'rgba(255,255,255,0.03)' : '#f9fafb', borderTop: isDark ? '1px solid rgba(255,255,255,0.1)' : '1px solid #e5e8eb' }}>
              <div className="text-sm text-gray-400 hidden md:block">
                  Showing <strong className={isDark ? 'text-white' : 'text-gray-900'}>{((pagination.page - 1) * pagination.limit) + 1}-{Math.min(pagination.page * pagination.limit, pagination.total)}</strong> of <strong className={isDark ? 'text-white' : 'text-gray-900'}>{pagination.total}</strong> devices
              </div>
              <div className="flex gap-2">
                  <button
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={pagination.page === 1}
                    className="w-9 h-9 flex items-center justify-center rounded-lg text-gray-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.1)' }}
                  >
                      <ChevronLeft size={16} />
                  </button>

                  {/* Dynamic Page Numbers */}
                  {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
                      // Simple logic to show a window of pages around current page
                      let pNum = i + 1;
                      if (pagination.totalPages > 5 && pagination.page > 3) {
                          pNum = pagination.page - 2 + i;
                          // Adjust if near end
                          if (pNum > pagination.totalPages) pNum = pagination.totalPages - (4 - i);
                      }

                      return (
                        <button
                            key={pNum}
                            onClick={() => setPage(pNum)}
                            className="w-9 h-9 flex items-center justify-center rounded-lg font-medium shadow-sm transition-colors"
                            style={{
                                background: pNum === pagination.page ? '#4f46e5' : 'rgba(255,255,255,0.1)',
                                border: pNum === pagination.page ? '1px solid #4f46e5' : '1px solid rgba(255,255,255,0.1)',
                                color: pNum === pagination.page ? '#fff' : '#94a3b8',
                            }}
                        >
                            {pNum}
                        </button>
                      );
                  })}

                   <button
                    onClick={() => setPage(p => Math.min(pagination.totalPages, p + 1))}
                    disabled={pagination.page === pagination.totalPages || pagination.totalPages === 0}
                    className="w-9 h-9 flex items-center justify-center rounded-lg text-gray-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.1)' }}
                   >
                      <ChevronRight size={16} />
                  </button>
              </div>
          </div>

      </div>

      {/* Create Modal */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="Add Network Device"
        size="lg"
      >
        <div className="space-y-4">
           {/* Modal Form Content ... (Similar to previous, kept simpler for brevity in this refactor) */}
           <Input
            label="Hostname"
            value={newDevice.name || ''}
            onChange={(e) => setNewDevice((prev) => ({ ...prev, name: e.target.value }))}
            required
           />
           <div className="grid grid-cols-2 gap-4">
             <Select
                label="Type"
                value={newDevice.type || ''}
                options={[
                    {value: '', label: 'Select Type'},
                    {value: 'switch', label: 'Switch'},
                    {value: 'router', label: 'Router'},
                    {value: 'firewall', label: 'Firewall'},
                    {value: 'server', label: 'Server'},
                    {value: 'access_point', label: 'Access Point'},
                ]}
                onChange={(e) => setNewDevice(prev => ({...prev, type: e.target.value}))}
             />
             <Input
                label="IP Address"
                value={newDevice.ipAddress || ''}
                onChange={(e) => setNewDevice(prev => ({...prev, ipAddress: e.target.value}))}
             />
           </div>
           
           <div className="flex justify-end gap-3 mt-6">
                <Button variant="ghost" onClick={() => setIsCreateModalOpen(false)}>Cancel</Button>
                <Button onClick={handleCreateDevice} isLoading={isSaving}>Add Device</Button>
           </div>
        </div>
      </Modal>
    </div>
  );
};

// Stat Card Component
const StatCard = ({ label, value, icon, type, isDark = true }: StatCardProps) => {
    const config = {
        total: { iconBg: 'rgba(59, 130, 246, 0.15)', iconText: '#3b82f6' },
        up: { iconBg: 'rgba(16, 185, 129, 0.15)', iconText: '#10b981' },
        down: { iconBg: 'rgba(239, 68, 68, 0.15)', iconText: '#ef4444' },
        warning: { iconBg: 'rgba(245, 158, 11, 0.15)', iconText: '#f59e0b' },
        maintenance: { iconBg: 'rgba(139, 92, 246, 0.15)', iconText: '#8b5cf6' },
    }[type];

    return (
        <div className="p-4 rounded-xl transition-all" style={{ background: isDark ? 'rgba(255,255,255,0.05)' : '#ffffff', border: isDark ? '1px solid rgba(255,255,255,0.1)' : '1px solid #e5e8eb' }}>
            <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-3" style={{ background: config.iconBg, color: config.iconText }}>
                {icon}
            </div>
            <div className={`text-2xl font-bold mb-1 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                {value}
            </div>
            <div className={`text-xs font-medium ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                {label}
            </div>
        </div>
    );
};

export default NetworkDevicesPage;

