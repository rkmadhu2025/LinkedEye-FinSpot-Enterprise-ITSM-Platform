/**
 * LinkedEye-FinSpot Enterprise Change Management Page
 * ITSM Enterprise Design System v2.0
 */

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
  Settings,
  FileText,
  TrendingUp,
} from 'lucide-react';
import {
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
  const [isRefreshing, setIsRefreshing] = useState(false);

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

  const handleRefresh = () => {
    setIsRefreshing(true);
    const page = parseInt(searchParams.get('page') || '1', 10);
    dispatch(fetchChanges({ page, limit: 20, filters: { ...localFilters, search: searchQuery || undefined } }));
    setTimeout(() => setIsRefreshing(false), 500);
  };

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
    const configs: Record<string, { bg: string; gradient: string; text: string; icon: React.ReactNode; label: string }> = {
      draft: { bg: 'rgba(107, 114, 128, 0.1)', gradient: 'linear-gradient(135deg, #6b7280, #4b5563)', text: '#6b7280', icon: <Edit size={12} />, label: 'Draft' },
      submitted: { bg: 'rgba(59, 130, 246, 0.1)', gradient: 'linear-gradient(135deg, #3b82f6, #2563eb)', text: '#3b82f6', icon: <Clock size={12} />, label: 'Submitted' },
      pending_approval: { bg: 'rgba(245, 158, 11, 0.1)', gradient: 'linear-gradient(135deg, #f59e0b, #d97706)', text: '#f59e0b', icon: <Clock size={12} />, label: 'Pending' },
      approved: { bg: 'rgba(16, 185, 129, 0.1)', gradient: 'linear-gradient(135deg, #10b981, #059669)', text: '#10b981', icon: <CheckCircle size={12} />, label: 'Approved' },
      rejected: { bg: 'rgba(239, 68, 68, 0.1)', gradient: 'linear-gradient(135deg, #ef4444, #dc2626)', text: '#ef4444', icon: <XCircle size={12} />, label: 'Rejected' },
      scheduled: { bg: 'rgba(99, 102, 241, 0.1)', gradient: 'linear-gradient(135deg, #6366f1, #4f46e5)', text: '#6366f1', icon: <Calendar size={12} />, label: 'Scheduled' },
      implementing: { bg: 'rgba(139, 92, 246, 0.1)', gradient: 'linear-gradient(135deg, #8b5cf6, #7c3aed)', text: '#8b5cf6', icon: <Activity size={12} />, label: 'Implementing' },
      completed: { bg: 'rgba(16, 185, 129, 0.1)', gradient: 'linear-gradient(135deg, #10b981, #059669)', text: '#10b981', icon: <CheckCircle size={12} />, label: 'Completed' },
      failed: { bg: 'rgba(239, 68, 68, 0.1)', gradient: 'linear-gradient(135deg, #ef4444, #dc2626)', text: '#ef4444', icon: <XCircle size={12} />, label: 'Failed' },
      cancelled: { bg: 'rgba(107, 114, 128, 0.1)', gradient: 'linear-gradient(135deg, #6b7280, #4b5563)', text: '#6b7280', icon: <XCircle size={12} />, label: 'Cancelled' },
    };
    return configs[status] || configs.draft;
  };

  const getTypeConfig = (type: string) => {
    const configs: Record<string, { bg: string; gradient: string; text: string; border: string }> = {
      standard: { bg: 'rgba(107, 114, 128, 0.1)', gradient: 'linear-gradient(135deg, #6b7280, #4b5563)', text: '#6b7280', border: 'rgba(107, 114, 128, 0.3)' },
      normal: { bg: 'rgba(59, 130, 246, 0.1)', gradient: 'linear-gradient(135deg, #3b82f6, #2563eb)', text: '#3b82f6', border: 'rgba(59, 130, 246, 0.3)' },
      emergency: { bg: 'rgba(239, 68, 68, 0.1)', gradient: 'linear-gradient(135deg, #ef4444, #dc2626)', text: '#ef4444', border: 'rgba(239, 68, 68, 0.3)' },
    };
    return configs[type] || configs.normal;
  };

  const getRiskConfig = (risk: string) => {
    const configs: Record<string, { bg: string; gradient: string; text: string; dot: string }> = {
      critical: { bg: 'rgba(239, 68, 68, 0.1)', gradient: 'linear-gradient(135deg, #ef4444, #dc2626)', text: '#ef4444', dot: '#ef4444' },
      high: { bg: 'rgba(249, 115, 22, 0.1)', gradient: 'linear-gradient(135deg, #f97316, #ea580c)', text: '#f97316', dot: '#f97316' },
      medium: { bg: 'rgba(245, 158, 11, 0.1)', gradient: 'linear-gradient(135deg, #f59e0b, #d97706)', text: '#f59e0b', dot: '#f59e0b' },
      low: { bg: 'rgba(16, 185, 129, 0.1)', gradient: 'linear-gradient(135deg, #10b981, #059669)', text: '#10b981', dot: '#10b981' },
    };
    return configs[risk] || configs.medium;
  };

  const currentPage = parseInt(searchParams.get('page') || '1', 10);
  const totalPages = pagination.totalPages || 1;

  return (
    <div className="space-y-6">
      {/* Page Header - ITSM Enterprise Style */}
      <div className="rounded-xl overflow-hidden" style={{
        background: isDark
          ? 'linear-gradient(135deg, rgba(15, 28, 63, 0.95), rgba(30, 58, 95, 0.95))'
          : 'linear-gradient(135deg, #f8fafc, #ffffff)',
        border: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : '#e5e8eb'}`,
      }}>
        <div className="p-6">
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center shadow-lg shadow-purple-500/25">
                <GitBranch size={28} className="text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold" style={{ color: isDark ? '#fff' : '#0f1c3f' }}>
                  Change Management
                </h1>
                <p className="text-sm mt-0.5" style={{ color: isDark ? '#94a3b8' : '#6b7785' }}>
                  Manage change requests, approvals, and implementation tracking
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Link to="/changes/calendar">
                <button
                  className="px-4 py-2.5 rounded-lg text-sm font-medium flex items-center gap-2 transition-all hover:bg-purple-50"
                  style={{
                    background: isDark ? 'rgba(255,255,255,0.08)' : '#fff',
                    border: `1px solid ${isDark ? 'rgba(255,255,255,0.12)' : '#e5e8eb'}`,
                    color: isDark ? '#fff' : '#0f1c3f',
                  }}
                >
                  <Calendar size={16} />
                  Calendar
                </button>
              </Link>
              <button
                className="px-4 py-2.5 rounded-lg text-sm font-medium flex items-center gap-2 transition-all hover:bg-purple-50"
                style={{
                  background: isDark ? 'rgba(255,255,255,0.08)' : '#fff',
                  border: `1px solid ${isDark ? 'rgba(255,255,255,0.12)' : '#e5e8eb'}`,
                  color: isDark ? '#fff' : '#0f1c3f',
                }}
              >
                <Download size={16} />
                Export
              </button>
              <Link to="/changes/create">
                <button
                  className="px-5 py-2.5 rounded-lg text-sm font-semibold text-white flex items-center gap-2 transition-all hover:-translate-y-0.5 hover:shadow-xl"
                  style={{
                    background: 'linear-gradient(135deg, #8b5cf6, #7c3aed)',
                    boxShadow: '0 4px 12px rgba(139, 92, 246, 0.3)',
                  }}
                >
                  <Plus size={16} />
                  New Change
                </button>
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Row - ITSM Enterprise Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-4">
        <StatCard
          icon={<GitBranch size={22} />}
          iconClass="total"
          value={stats.total}
          label="Total Changes"
          isDark={isDark}
        />
        <StatCard
          icon={<Clock size={22} />}
          iconClass="pending"
          value={stats.pending}
          label="Pending Approval"
          trend={stats.pending > 0 ? `${stats.pending} awaiting` : undefined}
          isDark={isDark}
        />
        <StatCard
          icon={<CheckCircle size={22} />}
          iconClass="approved"
          value={stats.approved}
          label="Approved"
          isDark={isDark}
        />
        <StatCard
          icon={<Activity size={22} />}
          iconClass="implementing"
          value={stats.implementing}
          label="Implementing"
          isDark={isDark}
        />
        <StatCard
          icon={<Shield size={22} />}
          iconClass="completed"
          value={stats.completed}
          label="Completed"
          trend="This month"
          isDark={isDark}
        />
        <StatCard
          icon={<XCircle size={22} />}
          iconClass="failed"
          value={stats.failed}
          label="Failed/Rejected"
          trend={stats.failed > 0 ? 'Needs review' : undefined}
          isDark={isDark}
        />
      </div>

      {/* Filters & Controls - ITSM Style */}
      <div
        className="rounded-xl p-5"
        style={{
          background: isDark ? 'rgba(255,255,255,0.03)' : '#fff',
          border: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : '#e5e8eb'}`,
        }}
      >
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-3 flex-1">
            {/* Search */}
            <div className="relative flex-1 min-w-[280px] max-w-md">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: '#94a3b8' }} />
              <input
                type="text"
                placeholder="Search changes..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all"
                style={{
                  background: isDark ? 'rgba(255,255,255,0.05)' : '#f9fafb',
                  border: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : '#e5e8eb'}`,
                  color: isDark ? '#fff' : '#0f1c3f',
                }}
              />
            </div>
            {/* Filters */}
            <select
              value={localFilters.status || ''}
              onChange={(e) => handleFilterChange('status', e.target.value)}
              className="px-3 py-2.5 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all cursor-pointer"
              style={{
                background: isDark ? '#1e293b' : '#ffffff',
                border: `1px solid ${isDark ? 'rgba(255,255,255,0.15)' : '#e5e8eb'}`,
                color: isDark ? '#f1f5f9' : '#0f1c3f',
              }}
            >
              {statusOptions.map(opt => (
                <option key={opt.value} value={opt.value} style={{ background: isDark ? '#1e293b' : '#ffffff', color: isDark ? '#f1f5f9' : '#0f1c3f' }}>{opt.label}</option>
              ))}
            </select>
            <select
              value={localFilters.changeType || ''}
              onChange={(e) => handleFilterChange('changeType', e.target.value)}
              className="px-3 py-2.5 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all cursor-pointer"
              style={{
                background: isDark ? '#1e293b' : '#ffffff',
                border: `1px solid ${isDark ? 'rgba(255,255,255,0.15)' : '#e5e8eb'}`,
                color: isDark ? '#f1f5f9' : '#0f1c3f',
              }}
            >
              {typeOptions.map(opt => (
                <option key={opt.value} value={opt.value} style={{ background: isDark ? '#1e293b' : '#ffffff', color: isDark ? '#f1f5f9' : '#0f1c3f' }}>{opt.label}</option>
              ))}
            </select>
            <select
              value={localFilters.risk || ''}
              onChange={(e) => handleFilterChange('risk', e.target.value)}
              className="px-3 py-2.5 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all cursor-pointer"
              style={{
                background: isDark ? '#1e293b' : '#ffffff',
                border: `1px solid ${isDark ? 'rgba(255,255,255,0.15)' : '#e5e8eb'}`,
                color: isDark ? '#f1f5f9' : '#0f1c3f',
              }}
            >
              {riskOptions.map(opt => (
                <option key={opt.value} value={opt.value} style={{ background: isDark ? '#1e293b' : '#ffffff', color: isDark ? '#f1f5f9' : '#0f1c3f' }}>{opt.label}</option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleRefresh}
              className="p-2.5 rounded-lg transition-all hover:bg-purple-50"
              style={{
                background: isDark ? 'rgba(255,255,255,0.05)' : '#fff',
                border: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : '#e5e8eb'}`,
                color: isDark ? '#94a3b8' : '#6b7785',
              }}
              title="Refresh"
            >
              <RefreshCw size={16} className={isRefreshing ? 'animate-spin' : ''} />
            </button>
            <div className="h-8 w-px" style={{ background: isDark ? 'rgba(255,255,255,0.1)' : '#e5e8eb' }} />
            <div className="flex rounded-lg p-1" style={{ background: isDark ? 'rgba(255,255,255,0.05)' : '#f1f5f9' }}>
              <button
                onClick={() => setViewMode('list')}
                className={clsx(
                  'p-2 rounded-md transition-all',
                  viewMode === 'list'
                    ? 'bg-purple-500 text-white shadow-sm'
                    : isDark ? 'text-gray-400 hover:text-white' : 'text-gray-500 hover:text-gray-900'
                )}
              >
                <List size={16} />
              </button>
              <button
                onClick={() => setViewMode('grid')}
                className={clsx(
                  'p-2 rounded-md transition-all',
                  viewMode === 'grid'
                    ? 'bg-purple-500 text-white shadow-sm'
                    : isDark ? 'text-gray-400 hover:text-white' : 'text-gray-500 hover:text-gray-900'
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
        <div
          className="rounded-xl p-4 flex items-center justify-between animate-in slide-in-from-top-2"
          style={{
            background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.15), rgba(139, 92, 246, 0.05))',
            border: '1px solid rgba(139, 92, 246, 0.3)',
          }}
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-purple-500 flex items-center justify-center text-white text-sm font-bold">
              {selectedChanges.length}
            </div>
            <span className="text-sm font-medium" style={{ color: '#8b5cf6' }}>
              change{selectedChanges.length > 1 ? 's' : ''} selected
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button className="px-4 py-2 text-sm font-medium rounded-lg transition-all hover:bg-purple-500/20" style={{ color: '#8b5cf6' }}>
              Approve Selected
            </button>
            <button className="px-4 py-2 text-sm font-medium rounded-lg transition-all hover:bg-purple-500/20" style={{ color: '#8b5cf6' }}>
              Reject Selected
            </button>
            <button
              onClick={() => setSelectedChanges([])}
              className="px-4 py-2 text-sm font-medium rounded-lg transition-all hover:bg-gray-500/20"
              style={{ color: '#6b7785' }}
            >
              Clear
            </button>
          </div>
        </div>
      )}

      {/* Content */}
      {isLoading ? (
        <div
          className="rounded-xl p-12"
          style={{
            background: isDark ? 'rgba(255,255,255,0.03)' : '#fff',
            border: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : '#e5e8eb'}`,
          }}
        >
          <div className="flex flex-col items-center justify-center">
            <div className="w-12 h-12 rounded-full border-3 border-purple-500 border-t-transparent animate-spin mb-4" />
            <p style={{ color: '#6b7785' }}>Loading changes...</p>
          </div>
        </div>
      ) : changes.length === 0 ? (
        <div
          className="rounded-xl p-12"
          style={{
            background: isDark ? 'rgba(255,255,255,0.03)' : '#fff',
            border: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : '#e5e8eb'}`,
          }}
        >
          <div className="flex flex-col items-center">
            <div className="w-16 h-16 rounded-full bg-purple-100 flex items-center justify-center mb-4">
              <GitBranch size={32} className="text-purple-500" />
            </div>
            <p className="text-base font-semibold" style={{ color: isDark ? '#fff' : '#0f1c3f' }}>
              No changes found
            </p>
            <p className="text-sm mt-1" style={{ color: '#6b7785' }}>
              No changes match your current filters.
            </p>
            <Link to="/changes/create">
              <button
                className="mt-4 px-5 py-2.5 rounded-lg text-sm font-semibold text-white"
                style={{ background: 'linear-gradient(135deg, #8b5cf6, #7c3aed)' }}
              >
                Create Change
              </button>
            </Link>
          </div>
        </div>
      ) : viewMode === 'list' ? (
        <div
          className="rounded-xl overflow-hidden shadow-sm"
          style={{
            background: isDark ? 'rgba(255,255,255,0.03)' : '#fff',
            border: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : '#e5e8eb'}`,
          }}
        >
          {/* Table Header */}
          <div
            className="px-5 py-4 flex items-center justify-between"
            style={{
              background: isDark ? 'rgba(255,255,255,0.02)' : '#f9fafb',
              borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : '#e5e8eb'}`,
            }}
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center">
                <List size={16} className="text-white" />
              </div>
              <div>
                <span className="text-sm font-semibold" style={{ color: isDark ? '#fff' : '#0f1c3f' }}>
                  All Changes
                </span>
                <span className="text-xs ml-2 px-2 py-0.5 rounded-full" style={{
                  background: isDark ? 'rgba(139, 92, 246, 0.2)' : 'rgba(139, 92, 246, 0.1)',
                  color: '#8b5cf6',
                }}>
                  {pagination.total || changes.length} results
                </span>
              </div>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr style={{
                  background: isDark ? 'rgba(255,255,255,0.02)' : '#f9fafb',
                  borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : '#e5e8eb'}`,
                }}>
                  <th className="px-4 py-3.5 text-left">
                    <input
                      type="checkbox"
                      checked={selectedChanges.length === changes.length && changes.length > 0}
                      onChange={toggleSelectAll}
                      className="w-4 h-4 rounded border-gray-300 text-purple-500 focus:ring-2 focus:ring-purple-500"
                    />
                  </th>
                  <th className="px-4 py-3.5 text-left text-[11px] font-semibold uppercase tracking-wider" style={{ color: '#6b7785' }}>
                    Change ID
                  </th>
                  <th className="px-4 py-3.5 text-left text-[11px] font-semibold uppercase tracking-wider" style={{ color: '#6b7785' }}>
                    Title
                  </th>
                  <th className="px-4 py-3.5 text-left text-[11px] font-semibold uppercase tracking-wider" style={{ color: '#6b7785' }}>
                    Type
                  </th>
                  <th className="px-4 py-3.5 text-left text-[11px] font-semibold uppercase tracking-wider" style={{ color: '#6b7785' }}>
                    Risk
                  </th>
                  <th className="px-4 py-3.5 text-left text-[11px] font-semibold uppercase tracking-wider" style={{ color: '#6b7785' }}>
                    Status
                  </th>
                  <th className="px-4 py-3.5 text-left text-[11px] font-semibold uppercase tracking-wider" style={{ color: '#6b7785' }}>
                    Scheduled
                  </th>
                  <th className="px-4 py-3.5 text-center text-[11px] font-semibold uppercase tracking-wider" style={{ color: '#6b7785' }}>
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {changes.map((change) => {
                  const statusConfig = getStatusConfig(change.status);
                  const typeConfig = getTypeConfig(change.changeType);
                  const riskConfig = getRiskConfig(change.risk);
                  const isSelected = selectedChanges.includes(change.id);

                  return (
                    <tr
                      key={change.id}
                      className={clsx('group cursor-pointer transition-all duration-200', isSelected && 'bg-purple-50/50')}
                      style={{
                        borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.04)' : '#f1f5f9'}`,
                        borderLeft: isSelected ? '3px solid #8b5cf6' : '3px solid transparent',
                      }}
                      onClick={() => navigate(`/changes/${change.id}`)}
                      onMouseEnter={(e) => {
                        if (!isSelected) e.currentTarget.style.background = isDark ? 'rgba(255,255,255,0.02)' : '#f8fafc';
                      }}
                      onMouseLeave={(e) => {
                        if (!isSelected) e.currentTarget.style.background = 'transparent';
                      }}
                    >
                      <td className="px-4 py-4" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelect(change.id)}
                          className="w-4 h-4 rounded border-gray-300 text-purple-500 focus:ring-2 focus:ring-purple-500"
                        />
                      </td>
                      <td className="px-4 py-4">
                        <span className="font-semibold text-purple-500 hover:text-purple-600 text-sm">
                          {change.changeNumber}
                        </span>
                      </td>
                      <td className="px-4 py-4 max-w-[300px]">
                        <p className="text-sm font-medium truncate" style={{ color: isDark ? '#fff' : '#0f1c3f' }}>
                          {change.title}
                        </p>
                        {change.description && (
                          <p className="text-xs mt-0.5 truncate" style={{ color: '#6b7785' }}>
                            {change.description}
                          </p>
                        )}
                      </td>
                      <td className="px-4 py-4">
                        <span
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold capitalize"
                          style={{ background: typeConfig.bg, color: typeConfig.text, border: `1px solid ${typeConfig.border}` }}
                        >
                          {change.changeType === 'emergency' && <Zap size={12} />}
                          {change.changeType}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <span
                          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold capitalize"
                          style={{ background: riskConfig.bg, color: riskConfig.text }}
                        >
                          <span className="w-2 h-2 rounded-full" style={{ background: riskConfig.dot }} />
                          {change.risk}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <span
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold"
                          style={{ background: statusConfig.bg, color: statusConfig.text }}
                        >
                          {statusConfig.icon}
                          {statusConfig.label}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        {change.scheduledStart ? (
                          <div className="flex items-center gap-2 text-sm" style={{ color: isDark ? '#94a3b8' : '#475569' }}>
                            <Calendar size={14} style={{ color: '#8b5cf6' }} />
                            {format(toZonedTime(new Date(change.scheduledStart), 'Asia/Kolkata'), 'MMM d, h:mm a', { timeZone: 'Asia/Kolkata' })}
                          </div>
                        ) : (
                          <span className="text-sm" style={{ color: '#6b7785' }}>Not scheduled</span>
                        )}
                      </td>
                      <td className="px-4 py-4 text-center" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => navigate(`/changes/${change.id}`)}
                            className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors hover:bg-purple-100"
                            style={{ color: '#8b5cf6' }}
                            title="View"
                          >
                            <Eye size={16} />
                          </button>
                          <button
                            onClick={() => navigate(`/changes/${change.id}/edit`)}
                            className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors hover:bg-amber-100"
                            style={{ color: '#f59e0b' }}
                            title="Edit"
                          >
                            <Edit size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div
              className="px-5 py-4 flex flex-col sm:flex-row justify-between items-center gap-4"
              style={{
                background: isDark ? 'rgba(255,255,255,0.02)' : '#f9fafb',
                borderTop: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : '#e5e8eb'}`,
              }}
            >
              <div className="flex items-center gap-2">
                <span className="text-sm" style={{ color: '#6b7785' }}>Showing</span>
                <span className="text-sm font-semibold" style={{ color: isDark ? '#fff' : '#0f1c3f' }}>
                  {((currentPage - 1) * (pagination.limit || 20)) + 1}-{Math.min(currentPage * (pagination.limit || 20), pagination.total || 0)}
                </span>
                <span className="text-sm" style={{ color: '#6b7785' }}>of {pagination.total || 0} changes</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="px-3 py-2 rounded-lg flex items-center gap-1.5 text-sm font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:bg-purple-50"
                  style={{
                    background: isDark ? 'rgba(255,255,255,0.05)' : '#fff',
                    border: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : '#e5e8eb'}`,
                    color: isDark ? '#94a3b8' : '#475569',
                  }}
                >
                  <ChevronLeft size={16} />
                  Previous
                </button>
                <div className="flex gap-1">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNum = i + 1;
                    if (totalPages > 5) {
                      if (currentPage > 3) pageNum = currentPage - 2 + i;
                      if (currentPage > totalPages - 2) pageNum = totalPages - 4 + i;
                    }
                    return (
                      <button
                        key={pageNum}
                        onClick={() => handlePageChange(pageNum)}
                        className="w-10 h-10 rounded-lg flex items-center justify-center text-sm font-medium transition-all"
                        style={{
                          background: currentPage === pageNum ? 'linear-gradient(135deg, #8b5cf6, #7c3aed)' : isDark ? 'rgba(255,255,255,0.05)' : '#fff',
                          border: `1px solid ${currentPage === pageNum ? '#8b5cf6' : isDark ? 'rgba(255,255,255,0.1)' : '#e5e8eb'}`,
                          color: currentPage === pageNum ? '#fff' : isDark ? '#94a3b8' : '#0f1c3f',
                          boxShadow: currentPage === pageNum ? '0 4px 12px rgba(139, 92, 246, 0.3)' : 'none',
                        }}
                      >
                        {pageNum}
                      </button>
                    );
                  })}
                </div>
                <button
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className="px-3 py-2 rounded-lg flex items-center gap-1.5 text-sm font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:bg-purple-50"
                  style={{
                    background: isDark ? 'rgba(255,255,255,0.05)' : '#fff',
                    border: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : '#e5e8eb'}`,
                    color: isDark ? '#94a3b8' : '#475569',
                  }}
                >
                  Next
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          )}
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
                className="rounded-xl p-5 transition-all cursor-pointer group hover:shadow-lg hover:-translate-y-1"
                style={{
                  background: isDark ? 'rgba(255,255,255,0.03)' : '#fff',
                  border: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : '#e5e8eb'}`,
                }}
              >
                <div className="flex items-start justify-between mb-3">
                  <span className="font-mono text-sm font-semibold text-purple-500">{change.changeNumber}</span>
                  <span
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold"
                    style={{ background: statusConfig.bg, color: statusConfig.text }}
                  >
                    {statusConfig.icon}
                    {statusConfig.label}
                  </span>
                </div>
                <h3 className="font-semibold mb-2 line-clamp-2 group-hover:text-purple-500 transition-colors" style={{ color: isDark ? '#fff' : '#0f1c3f' }}>
                  {change.title}
                </h3>
                {change.description && (
                  <p className="text-sm mb-4 line-clamp-2" style={{ color: '#6b7785' }}>{change.description}</p>
                )}
                <div className="flex items-center gap-2 mb-4">
                  <span
                    className="px-2.5 py-1 rounded-md text-[10px] font-semibold uppercase"
                    style={{ background: typeConfig.bg, color: typeConfig.text, border: `1px solid ${typeConfig.border}` }}
                  >
                    {change.changeType === 'emergency' && <Zap size={10} className="inline mr-1" />}
                    {change.changeType}
                  </span>
                  <span
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-semibold uppercase"
                    style={{ background: riskConfig.bg, color: riskConfig.text }}
                  >
                    <span className="w-1.5 h-1.5 rounded-full" style={{ background: riskConfig.dot }} />
                    {change.risk} RISK
                  </span>
                </div>
                <div className="flex items-center justify-between pt-3" style={{ borderTop: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : '#e5e8eb'}` }}>
                  {change.scheduledStart ? (
                    <div className="flex items-center gap-1.5 text-xs" style={{ color: '#6b7785' }}>
                      <Calendar size={12} />
                      {format(toZonedTime(new Date(change.scheduledStart), 'Asia/Kolkata'), 'MMM d, h:mm a', { timeZone: 'Asia/Kolkata' })}
                    </div>
                  ) : (
                    <span className="text-xs" style={{ color: '#6b7785' }}>Not scheduled</span>
                  )}
                  {change.requester && (
                    <Avatar name={`${change.requester.firstName} ${change.requester.lastName}`} size="sm" />
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Quick Action FAB */}
      <Link
        to="/changes/create"
        className="fixed bottom-6 right-6 w-14 h-14 rounded-xl flex items-center justify-center text-white shadow-xl transition-all hover:scale-110 hover:shadow-2xl"
        style={{
          background: 'linear-gradient(135deg, #8b5cf6, #7c3aed)',
          boxShadow: '0 8px 24px rgba(139, 92, 246, 0.4)',
        }}
        title="Create New Change"
      >
        <Plus size={24} />
      </Link>
    </div>
  );
};

// Stat Card Component - ITSM Enterprise Style
interface StatCardProps {
  icon: React.ReactNode;
  iconClass: 'total' | 'pending' | 'approved' | 'implementing' | 'completed' | 'failed';
  value: number;
  label: string;
  trend?: string;
  isDark: boolean;
}

const StatCard = ({ icon, iconClass, value, label, trend, isDark }: StatCardProps) => {
  const iconStyles: Record<string, { bg: string; gradient: string; color: string; shadow: string }> = {
    total: {
      bg: 'rgba(59, 130, 246, 0.1)',
      gradient: 'linear-gradient(135deg, #3b82f6, #2563eb)',
      color: '#3b82f6',
      shadow: 'rgba(59, 130, 246, 0.3)',
    },
    pending: {
      bg: 'rgba(245, 158, 11, 0.1)',
      gradient: 'linear-gradient(135deg, #f59e0b, #d97706)',
      color: '#f59e0b',
      shadow: 'rgba(245, 158, 11, 0.3)',
    },
    approved: {
      bg: 'rgba(16, 185, 129, 0.1)',
      gradient: 'linear-gradient(135deg, #10b981, #059669)',
      color: '#10b981',
      shadow: 'rgba(16, 185, 129, 0.3)',
    },
    implementing: {
      bg: 'rgba(139, 92, 246, 0.1)',
      gradient: 'linear-gradient(135deg, #8b5cf6, #7c3aed)',
      color: '#8b5cf6',
      shadow: 'rgba(139, 92, 246, 0.3)',
    },
    completed: {
      bg: 'rgba(16, 185, 129, 0.1)',
      gradient: 'linear-gradient(135deg, #10b981, #059669)',
      color: '#10b981',
      shadow: 'rgba(16, 185, 129, 0.3)',
    },
    failed: {
      bg: 'rgba(239, 68, 68, 0.1)',
      gradient: 'linear-gradient(135deg, #ef4444, #dc2626)',
      color: '#ef4444',
      shadow: 'rgba(239, 68, 68, 0.3)',
    },
  };

  const style = iconStyles[iconClass];

  return (
    <div
      className="rounded-xl p-5 transition-all duration-300 hover:shadow-lg hover:-translate-y-1 group"
      style={{
        background: isDark ? 'rgba(255,255,255,0.03)' : '#fff',
        border: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : '#e5e8eb'}`,
      }}
    >
      <div className="flex items-start justify-between">
        <div
          className="w-12 h-12 rounded-xl flex items-center justify-center text-white shadow-lg transition-transform group-hover:scale-110"
          style={{ background: style.gradient, boxShadow: `0 4px 12px ${style.shadow}` }}
        >
          {icon}
        </div>
        {trend && (
          <span className="text-[10px] font-medium px-2 py-1 rounded-full" style={{ background: style.bg, color: style.color }}>
            {trend}
          </span>
        )}
      </div>
      <div className="mt-4">
        <h3 className="text-3xl font-bold" style={{ color: isDark ? '#fff' : '#0f1c3f' }}>
          {value}
        </h3>
        <p className="text-xs mt-1 font-medium" style={{ color: '#6b7785' }}>
          {label}
        </p>
      </div>
    </div>
  );
};

export default ChangesListPage;
