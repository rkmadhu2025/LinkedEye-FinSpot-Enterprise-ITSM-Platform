import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import {
  Plus,
  Search,
  Calendar,
  Download,
  RefreshCw,
  ArrowRight,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  GitBranch,
  Filter,
  LayoutGrid,
  List,
  Zap,
  Shield,
  Activity,
  Users,
  ChevronLeft,
  ChevronRight,
  MoreHorizontal,
  Eye,
  Edit,
  Trash2,
  Copy,
  ExternalLink,
} from 'lucide-react';
import {
  Card,
  CardBody,
  Button,
  Input,
  Select,
  Avatar,
  EmptyState,
} from '@/components/ui';
import { useAppDispatch, useAppSelector } from '@/hooks/useRedux';
import { fetchChanges, setFilters } from '@/store/slices/changesSlice';
import { ChangeRequest, ChangeFilters, ChangeStatus, ChangeType, ChangeRisk } from '@/types';
import { format, toZonedTime } from 'date-fns-tz';
import { formatDistanceToNow } from 'date-fns';
import clsx from 'clsx';

const ChangesListPage = () => {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const [searchParams, setSearchParams] = useSearchParams();
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const [selectedChanges, setSelectedChanges] = useState<string[]>([]);

  const { changes, pagination, isLoading, filters } = useAppSelector((state) => state.changes);
  const { theme } = useAppSelector((state) => state.ui);
  const isDark = theme === 'dark';

  const [searchQuery, setSearchQuery] = useState(searchParams.get('search') || '');
  const [localFilters, setLocalFilters] = useState<ChangeFilters>({
    status: (searchParams.get('status') as ChangeStatus) || undefined,
    changeType: (searchParams.get('changeType') as ChangeType) || undefined,
    risk: (searchParams.get('risk') as ChangeRisk) || undefined,
  });

  useEffect(() => {
    const page = parseInt(searchParams.get('page') || '1', 10);
    dispatch(setFilters({ ...localFilters, search: searchQuery || undefined }));
    dispatch(fetchChanges({ page, limit: 20, filters: { ...localFilters, search: searchQuery || undefined } }));
  }, [dispatch, searchParams, localFilters, searchQuery]);

  const handlePageChange = (page: number) => {
    const params = new URLSearchParams(searchParams);
    params.set('page', String(page));
    setSearchParams(params);
  };

  const handleFilterChange = (key: keyof ChangeFilters, value: string) => {
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

  const toggleSelectAll = () => {
    if (selectedChanges.length === changes.length) {
      setSelectedChanges([]);
    } else {
      setSelectedChanges(changes.map(c => c.id));
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedChanges(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  // Calculate stats from changes
  const stats = {
    total: pagination.total || changes.length,
    pending: changes.filter(c => c.status === 'pending_approval' || c.status === 'submitted').length,
    approved: changes.filter(c => c.status === 'approved' || c.status === 'scheduled').length,
    implementing: changes.filter(c => c.status === 'implementing').length,
    completed: changes.filter(c => c.status === 'completed').length,
    failed: changes.filter(c => c.status === 'failed' || c.status === 'rejected').length,
  };

  const statusOptions = [
    { value: '', label: 'All Statuses' },
    { value: 'draft', label: 'Draft' },
    { value: 'submitted', label: 'Submitted' },
    { value: 'pending_approval', label: 'Pending Approval' },
    { value: 'approved', label: 'Approved' },
    { value: 'rejected', label: 'Rejected' },
    { value: 'scheduled', label: 'Scheduled' },
    { value: 'implementing', label: 'Implementing' },
    { value: 'completed', label: 'Completed' },
    { value: 'failed', label: 'Failed' },
    { value: 'cancelled', label: 'Cancelled' },
  ];

  const typeOptions = [
    { value: '', label: 'All Types' },
    { value: 'standard', label: 'Standard' },
    { value: 'normal', label: 'Normal' },
    { value: 'emergency', label: 'Emergency' },
  ];

  const riskOptions = [
    { value: '', label: 'All Risk Levels' },
    { value: 'critical', label: 'Critical' },
    { value: 'high', label: 'High' },
    { value: 'medium', label: 'Medium' },
    { value: 'low', label: 'Low' },
  ];

  const getStatusConfig = (status: string) => {
    const configs: Record<string, { bg: string; text: string; icon: React.ReactNode; label: string }> = {
      draft: { bg: 'bg-gray-100', text: 'text-gray-700', icon: <Edit size={12} />, label: 'Draft' },
      submitted: { bg: 'bg-blue-100', text: 'text-blue-700', icon: <Clock size={12} />, label: 'Submitted' },
      pending_approval: { bg: 'bg-amber-100', text: 'text-amber-700', icon: <Clock size={12} />, label: 'Pending' },
      approved: { bg: 'bg-green-100', text: 'text-green-700', icon: <CheckCircle size={12} />, label: 'Approved' },
      rejected: { bg: 'bg-red-100', text: 'text-red-700', icon: <XCircle size={12} />, label: 'Rejected' },
      scheduled: { bg: 'bg-indigo-100', text: 'text-indigo-700', icon: <Calendar size={12} />, label: 'Scheduled' },
      implementing: { bg: 'bg-purple-100', text: 'text-purple-700', icon: <Activity size={12} />, label: 'Implementing' },
      completed: { bg: 'bg-emerald-100', text: 'text-emerald-700', icon: <CheckCircle size={12} />, label: 'Completed' },
      failed: { bg: 'bg-red-100', text: 'text-red-700', icon: <XCircle size={12} />, label: 'Failed' },
      cancelled: { bg: 'bg-gray-100', text: 'text-gray-700', icon: <XCircle size={12} />, label: 'Cancelled' },
    };
    return configs[status] || configs.draft;
  };

  const getTypeConfig = (type: string) => {
    const configs: Record<string, { bg: string; text: string; border: string }> = {
      standard: { bg: 'bg-gray-50', text: 'text-gray-700', border: 'border-gray-300' },
      normal: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-300' },
      emergency: { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-300' },
    };
    return configs[type] || configs.normal;
  };

  const getRiskConfig = (risk: string) => {
    const configs: Record<string, { bg: string; text: string; dot: string }> = {
      critical: { bg: 'bg-red-500', text: 'text-red-700', dot: 'bg-red-500' },
      high: { bg: 'bg-orange-500', text: 'text-orange-700', dot: 'bg-orange-500' },
      medium: { bg: 'bg-amber-500', text: 'text-amber-700', dot: 'bg-amber-500' },
      low: { bg: 'bg-green-500', text: 'text-green-700', dot: 'bg-green-500' },
    };
    return configs[risk] || configs.medium;
  };

  const currentPage = parseInt(searchParams.get('page') || '1', 10);
  const totalPages = pagination.totalPages || 1;

  return (
    <div className="space-y-6 min-h-screen -m-6 p-6" style={{ background: isDark ? 'linear-gradient(180deg, #030712 0%, #0a0f1a 100%)' : '#f9fafb' }}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>Change Management</h1>
          <p className={`mt-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Manage change requests, approvals, and implementation tracking</p>
        </div>
        <div className="flex items-center gap-3">
          <Link to="/changes/calendar">
            <button className="px-4 py-2.5 rounded-xl text-sm font-medium flex items-center gap-2 transition-all" style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.1)', color: '#e5e7eb' }}>
              <Calendar size={16} className="text-gray-400" />
              Calendar
            </button>
          </Link>
          <button className="px-4 py-2.5 rounded-xl text-sm font-medium flex items-center gap-2 transition-all" style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.1)', color: '#e5e7eb' }}>
            <Download size={16} className="text-gray-400" />
            Export
          </button>
          <Link to="/changes/create">
            <button className="px-4 py-2.5 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl text-sm font-medium flex items-center gap-2 hover:shadow-lg hover:shadow-blue-500/30 transition-all">
              <Plus size={16} />
              New Change
            </button>
          </Link>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-6 gap-4">
        <StatCard isDark={isDark}
          label="Total Changes"
          value={stats.total}
          icon={<GitBranch size={20} />}
          iconBg="bg-blue-100"
          iconColor="text-blue-600"
        />
        <StatCard isDark={isDark}
          label="Pending Approval"
          value={stats.pending}
          icon={<Clock size={20} />}
          iconBg="bg-amber-100"
          iconColor="text-amber-600"
          trend={stats.pending > 0 ? 'attention' : undefined}
        />
        <StatCard isDark={isDark}
          label="Approved"
          value={stats.approved}
          icon={<CheckCircle size={20} />}
          iconBg="bg-green-100"
          iconColor="text-green-600"
        />
        <StatCard isDark={isDark}
          label="Implementing"
          value={stats.implementing}
          icon={<Activity size={20} />}
          iconBg="bg-purple-100"
          iconColor="text-purple-600"
        />
        <StatCard isDark={isDark}
          label="Completed"
          value={stats.completed}
          icon={<Shield size={20} />}
          iconBg="bg-emerald-100"
          iconColor="text-emerald-600"
        />
        <StatCard isDark={isDark}
          label="Failed/Rejected"
          value={stats.failed}
          icon={<XCircle size={20} />}
          iconBg="bg-red-100"
          iconColor="text-red-600"
          trend={stats.failed > 0 ? 'danger' : undefined}
        />
      </div>

      {/* Filters & Controls */}
      <div className="rounded-xl p-4" style={{ background: isDark ? 'rgba(255,255,255,0.05)' : '#ffffff', border: isDark ? '1px solid rgba(255,255,255,0.1)' : '1px solid #e5e8eb' }}>
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 flex-1">
            <div className="relative flex-1 max-w-md">
              <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search changes by ID, title, or description..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={`w-full pl-10 pr-4 py-2.5 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all placeholder-gray-400 ${isDark ? 'text-white' : 'text-gray-900'}`}
                style={{ background: isDark ? 'rgba(255,255,255,0.1)' : '#f9fafb', border: isDark ? '1px solid rgba(255,255,255,0.1)' : '1px solid #e5e8eb' }}
              />
            </div>
            <select
              value={localFilters.status || ''}
              onChange={(e) => handleFilterChange('status', e.target.value)}
              className={`px-4 py-2.5 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all ${isDark ? 'text-white' : 'text-gray-900'}`}
              style={{ background: isDark ? 'rgba(255,255,255,0.1)' : '#f9fafb', border: isDark ? '1px solid rgba(255,255,255,0.1)' : '1px solid #e5e8eb' }}
            >
              {statusOptions.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
            <select
              value={localFilters.changeType || ''}
              onChange={(e) => handleFilterChange('changeType', e.target.value)}
              className={`px-4 py-2.5 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all ${isDark ? 'text-white' : 'text-gray-900'}`}
              style={{ background: isDark ? 'rgba(255,255,255,0.1)' : '#f9fafb', border: isDark ? '1px solid rgba(255,255,255,0.1)' : '1px solid #e5e8eb' }}
            >
              {typeOptions.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
            <select
              value={localFilters.risk || ''}
              onChange={(e) => handleFilterChange('risk', e.target.value)}
              className={`px-4 py-2.5 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all ${isDark ? 'text-white' : 'text-gray-900'}`}
              style={{ background: isDark ? 'rgba(255,255,255,0.1)' : '#f9fafb', border: isDark ? '1px solid rgba(255,255,255,0.1)' : '1px solid #e5e8eb' }}
            >
              {riskOptions.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setSearchQuery('');
                setLocalFilters({});
                setSearchParams({});
              }}
              className="p-2.5 rounded-xl transition-all"
              style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.1)' }}
              title="Reset filters"
            >
              <RefreshCw size={16} className="text-gray-400" />
            </button>
            <div className="h-6 w-px" style={{ background: 'rgba(255,255,255,0.1)' }} />
            <div className="flex items-center rounded-xl p-1" style={{ background: 'rgba(255,255,255,0.05)' }}>
              <button
                onClick={() => setViewMode('list')}
                className={clsx(
                  'p-2 rounded-lg transition-all',
                  viewMode === 'list' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white'
                )}
              >
                <List size={16} />
              </button>
              <button
                onClick={() => setViewMode('grid')}
                className={clsx(
                  'p-2 rounded-lg transition-all',
                  viewMode === 'grid' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white'
                )}
              >
                <LayoutGrid size={16} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Bulk Actions */}
      {selectedChanges.length > 0 && (
        <div className="rounded-xl p-4 flex items-center justify-between" style={{ background: 'rgba(59, 130, 246, 0.15)', border: '1px solid rgba(59, 130, 246, 0.3)' }}>
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium text-blue-300">
              {selectedChanges.length} change{selectedChanges.length > 1 ? 's' : ''} selected
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button className="px-3 py-1.5 text-sm font-medium text-blue-300 hover:bg-blue-500/20 rounded-lg transition-all">
              Approve Selected
            </button>
            <button className="px-3 py-1.5 text-sm font-medium text-blue-300 hover:bg-blue-500/20 rounded-lg transition-all">
              Reject Selected
            </button>
            <button
              onClick={() => setSelectedChanges([])}
              className="px-3 py-1.5 text-sm font-medium text-gray-400 hover:bg-blue-500/20 rounded-lg transition-all"
            >
              Clear Selection
            </button>
          </div>
        </div>
      )}

      {/* Content */}
      {isLoading ? (
        <div className="rounded-xl p-12" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}>
          <div className="flex flex-col items-center justify-center">
            <div className="w-10 h-10 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mb-4" />
            <p className="text-gray-400">Loading changes...</p>
          </div>
        </div>
      ) : changes.length === 0 ? (
        <div className="rounded-xl p-12" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}>
          <EmptyState
            variant="empty"
            title="No changes found"
            description="No changes match your current filters. Create a new change request to get started."
            action={{
              label: 'Create Change',
              onClick: () => navigate('/changes/create'),
            }}
          />
        </div>
      ) : viewMode === 'list' ? (
        <div className="rounded-xl overflow-hidden" style={{ background: isDark ? 'rgba(255,255,255,0.05)' : '#ffffff', border: isDark ? '1px solid rgba(255,255,255,0.1)' : '1px solid #e5e8eb' }}>
          {/* Table Header */}
          <div className="grid grid-cols-[40px_140px_1fr_120px_100px_140px_150px_80px] gap-4 px-5 py-3" style={{ background: isDark ? 'rgba(255,255,255,0.03)' : '#f9fafb', borderBottom: isDark ? '1px solid rgba(255,255,255,0.1)' : '1px solid #e5e8eb' }}>
            <div className="flex items-center">
              <input
                type="checkbox"
                checked={selectedChanges.length === changes.length && changes.length > 0}
                onChange={toggleSelectAll}
                className="w-4 h-4 rounded border-gray-600 text-blue-600 focus:ring-blue-500"
              />
            </div>
            <div className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Change ID</div>
            <div className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Title & Description</div>
            <div className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Type</div>
            <div className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Risk</div>
            <div className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Status</div>
            <div className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Scheduled</div>
            <div className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider text-right">Actions</div>
          </div>

          {/* Table Rows */}
          {changes.map((change) => {
            const statusConfig = getStatusConfig(change.status);
            const typeConfig = getTypeConfig(change.changeType);
            const riskConfig = getRiskConfig(change.risk);
            const isSelected = selectedChanges.includes(change.id);

            return (
              <div
                key={change.id}
                className="grid grid-cols-[40px_140px_1fr_120px_100px_140px_150px_80px] gap-4 px-5 py-4 transition-all cursor-pointer"
                style={{
                  borderBottom: isDark ? '1px solid rgba(255,255,255,0.05)' : '1px solid #f0f0f0',
                  background: isSelected ? 'rgba(59, 130, 246, 0.1)' : 'transparent',
                }}
                onClick={() => navigate(`/changes/${change.id}`)}
                onMouseEnter={(e) => !isSelected && (e.currentTarget.style.background = isDark ? 'rgba(255,255,255,0.03)' : '#f9fafb')}
                onMouseLeave={(e) => !isSelected && (e.currentTarget.style.background = 'transparent')}
              >
                <div className="flex items-center" onClick={(e) => e.stopPropagation()}>
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => toggleSelect(change.id)}
                    className="w-4 h-4 rounded border-gray-600 text-blue-600 focus:ring-blue-500"
                  />
                </div>
                <div className="flex items-center">
                  <span className="font-mono text-sm font-medium text-blue-400 hover:text-blue-300">
                    {change.changeNumber}
                  </span>
                </div>
                <div className="flex flex-col justify-center min-w-0">
                  <p className={`font-medium truncate ${isDark ? 'text-white' : 'text-gray-900'}`}>{change.title}</p>
                  {change.description && (
                    <p className="text-xs text-gray-400 truncate mt-0.5">{change.description}</p>
                  )}
                </div>
                <div className="flex items-center">
                  <span className={clsx(
                    'px-2.5 py-1 rounded-lg text-xs font-medium border',
                    typeConfig.bg,
                    typeConfig.text,
                    typeConfig.border
                  )}>
                    {change.changeType === 'emergency' && <Zap size={10} className="inline mr-1" />}
                    {change.changeType.charAt(0).toUpperCase() + change.changeType.slice(1)}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className={clsx('w-2 h-2 rounded-full', riskConfig.dot)} />
                  <span className={clsx('text-xs font-medium', riskConfig.text)}>
                    {change.risk.charAt(0).toUpperCase() + change.risk.slice(1)}
                  </span>
                </div>
                <div className="flex items-center">
                  <span className={clsx(
                    'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium',
                    statusConfig.bg,
                    statusConfig.text
                  )}>
                    {statusConfig.icon}
                    {statusConfig.label}
                  </span>
                </div>
                <div className="flex items-center">
                  {change.scheduledStart ? (
                    <div className="flex items-center gap-1.5 text-sm text-gray-300">
                      <Calendar size={14} className="text-gray-500" />
                      {format(toZonedTime(new Date(change.scheduledStart), 'Asia/Kolkata'), 'MMM d, h:mm a', { timeZone: 'Asia/Kolkata' })}
                    </div>
                  ) : (
                    <span className="text-sm text-gray-500">Not scheduled</span>
                  )}
                </div>
                <div className="flex items-center justify-end" onClick={(e) => e.stopPropagation()}>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => navigate(`/changes/${change.id}`)}
                      className="p-1.5 text-gray-400 hover:text-blue-400 rounded-lg transition-all"
                      title="View"
                    >
                      <Eye size={16} />
                    </button>
                    <button
                      className="p-1.5 text-gray-400 hover:text-white rounded-lg transition-all"
                      title="More"
                    >
                      <MoreHorizontal size={16} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Grid View */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {changes.map((change) => {
            const statusConfig = getStatusConfig(change.status);
            const typeConfig = getTypeConfig(change.changeType);
            const riskConfig = getRiskConfig(change.risk);

            return (
              <div
                key={change.id}
                onClick={() => navigate(`/changes/${change.id}`)}
                className="rounded-xl p-5 transition-all cursor-pointer group"
                style={{ background: isDark ? 'rgba(255,255,255,0.05)' : '#ffffff', border: isDark ? '1px solid rgba(255,255,255,0.1)' : '1px solid #e5e8eb' }}
              >
                <div className="flex items-start justify-between mb-3">
                  <span className="font-mono text-sm font-medium text-blue-400">{change.changeNumber}</span>
                  <span className={clsx(
                    'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium',
                    statusConfig.bg,
                    statusConfig.text
                  )}>
                    {statusConfig.icon}
                    {statusConfig.label}
                  </span>
                </div>
                <h3 className={`font-semibold mb-2 line-clamp-2 group-hover:text-blue-400 transition-colors ${isDark ? 'text-white' : 'text-gray-900'}`}>
                  {change.title}
                </h3>
                {change.description && (
                  <p className="text-sm text-gray-400 mb-4 line-clamp-2">{change.description}</p>
                )}
                <div className="flex items-center gap-2 mb-4">
                  <span className={clsx(
                    'px-2 py-0.5 rounded text-[10px] font-medium border',
                    typeConfig.bg,
                    typeConfig.text,
                    typeConfig.border
                  )}>
                    {change.changeType === 'emergency' && <Zap size={8} className="inline mr-0.5" />}
                    {change.changeType.toUpperCase()}
                  </span>
                  <span className="flex items-center gap-1 px-2 py-0.5 rounded bg-gray-100 text-[10px] font-medium text-gray-600">
                    <span className={clsx('w-1.5 h-1.5 rounded-full', riskConfig.dot)} />
                    {change.risk.toUpperCase()} RISK
                  </span>
                </div>
                <div className="flex items-center justify-between pt-3" style={{ borderTop: '1px solid rgba(255,255,255,0.1)' }}>
                  {change.scheduledStart ? (
                    <div className="flex items-center gap-1.5 text-xs text-gray-400">
                      <Calendar size={12} />
                      {format(toZonedTime(new Date(change.scheduledStart), 'Asia/Kolkata'), 'MMM d, h:mm a', { timeZone: 'Asia/Kolkata' })}
                    </div>
                  ) : (
                    <span className="text-xs text-gray-500">Not scheduled</span>
                  )}
                  {change.requester && (
                    <div className="flex items-center gap-2">
                      <Avatar name={`${change.requester.firstName} ${change.requester.lastName}`} size="sm" />
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between rounded-xl px-5 py-4" style={{ background: isDark ? 'rgba(255,255,255,0.05)' : '#ffffff', border: isDark ? '1px solid rgba(255,255,255,0.1)' : '1px solid #e5e8eb' }}>
          <div className="text-sm text-gray-400">
            Showing <span className={`font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>{((currentPage - 1) * (pagination.limit || 20)) + 1}</span> to{' '}
            <span className={`font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
              {Math.min(currentPage * (pagination.limit || 20), pagination.total || 0)}
            </span>{' '}
            of <span className={`font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>{pagination.total || 0}</span> changes
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
              className="p-2 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all text-gray-400 hover:text-white"
              style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.1)' }}
            >
              <ChevronLeft size={16} />
            </button>
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              let pageNum = i + 1;
              if (totalPages > 5) {
                if (currentPage > 3) {
                  pageNum = currentPage - 2 + i;
                }
                if (currentPage > totalPages - 2) {
                  pageNum = totalPages - 4 + i;
                }
              }
              return (
                <button
                  key={pageNum}
                  onClick={() => handlePageChange(pageNum)}
                  className={clsx(
                    'w-9 h-9 rounded-lg text-sm font-medium transition-all',
                    currentPage === pageNum
                      ? 'bg-blue-600 text-white'
                      : 'text-gray-400 hover:text-white hover:bg-white/10'
                  )}
                  style={currentPage !== pageNum ? { background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' } : undefined}
                >
                  {pageNum}
                </button>
              );
            })}
            <button
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
              className="p-2 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all text-gray-400 hover:text-white"
              style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.1)' }}
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

// Stat Card Component
interface StatCardProps {
  label: string;
  value: number;
  icon: React.ReactNode;
  iconBg: string;
  iconColor: string;
  trend?: 'attention' | 'danger';
  isDark?: boolean;
}

const StatCard = ({ label, value, icon, iconBg, iconColor, trend, isDark = true }: StatCardProps) => (
  <div className="rounded-xl p-4 transition-all" style={{ background: isDark ? 'rgba(255,255,255,0.05)' : '#ffffff', border: isDark ? '1px solid rgba(255,255,255,0.1)' : '1px solid #e5e8eb' }}>
    <div className="flex items-center gap-3">
      <div className={clsx('w-10 h-10 rounded-xl flex items-center justify-center', iconBg, iconColor)}>
        {icon}
      </div>
      <div>
        <div className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>{value}</div>
        <div className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{label}</div>
      </div>
    </div>
  </div>
);

export default ChangesListPage;
