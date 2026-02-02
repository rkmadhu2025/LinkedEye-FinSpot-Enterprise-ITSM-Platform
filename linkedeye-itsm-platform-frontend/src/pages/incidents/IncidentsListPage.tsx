/**
 * LinkedEye-FinSpot Enterprise Incidents List Page
 * Matches reference design: linkedeye-incidents.html
 */

import { useEffect, useState, useCallback } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import {
  Plus,
  Search,
  Download,
  RefreshCw,
  Flame,
  AlertCircle,
  AlertTriangle,
  Info,
  CheckCircle,
  X,
  ChevronLeft,
  ChevronRight,
  List,
  Columns,
  SortAsc,
  Filter,
  Timer,
} from 'lucide-react';
import { useAppDispatch, useAppSelector } from '@/hooks/useRedux';
import { fetchIncidents, setFilters } from '@/store/slices/incidentsSlice';
import { Incident, IncidentFilters, Priority, IncidentStatus, IncidentCategory } from '@/types';
import { formatDistanceToNow } from 'date-fns';
import { useDebounce } from '@/hooks/useDebounce';
import { incidentService } from '@/services/incidentService';
import clsx from 'clsx';

const IncidentsListPage = () => {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const [searchParams, setSearchParams] = useSearchParams();
  const { theme } = useAppSelector((state) => state.ui);

  const { incidents, pagination, isLoading, filters } = useAppSelector((state) => state.incidents);

  const [searchQuery, setSearchQuery] = useState(searchParams.get('search') || '');
  const debouncedSearch = useDebounce(searchQuery, 300);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectAll, setSelectAll] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const [localFilters, setLocalFilters] = useState<IncidentFilters>({
    status: (searchParams.get('status') as IncidentStatus) || undefined,
    priority: (searchParams.get('priority') as Priority) || undefined,
    category: (searchParams.get('category') as IncidentCategory) || undefined,
  });

  const [stats, setStats] = useState({
    critical: 0,
    high: 0,
    medium: 0,
    low: 0,
    resolved: 0,
  });

  const fetchData = useCallback(async (showRefreshAnimation = false) => {
    if (showRefreshAnimation) setIsRefreshing(true);

    const page = parseInt(searchParams.get('page') || '1', 10);
    const currentFilters: IncidentFilters = {
      ...localFilters,
      search: debouncedSearch || undefined,
    };

    dispatch(setFilters(currentFilters));
    await dispatch(fetchIncidents({ page, limit: 10, filters: currentFilters }));

    if (showRefreshAnimation) {
      setTimeout(() => setIsRefreshing(false), 500);
    }
  }, [dispatch, searchParams, localFilters, debouncedSearch]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const statsData = await incidentService.getStats();
        setStats(statsData);
      } catch (error) {
        console.error('Failed to fetch incident stats:', error);
      }
    };
    fetchStats();
  }, []);

  const handlePageChange = (page: number) => {
    const params = new URLSearchParams(searchParams);
    params.set('page', String(page));
    setSearchParams(params);
  };

  const handleFilterChange = (key: keyof IncidentFilters, value: string) => {
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

  const removeFilter = (key: keyof IncidentFilters) => {
    handleFilterChange(key, '');
  };

  const activeFilters: { key: keyof IncidentFilters; label: string }[] = [];
  if (localFilters.status) activeFilters.push({ key: 'status', label: localFilters.status.replace('_', ' ') });
  if (localFilters.priority) activeFilters.push({ key: 'priority', label: localFilters.priority });
  if (localFilters.category) activeFilters.push({ key: 'category', label: localFilters.category });

  const formatTimeAgo = (date: string) => {
    try {
      return formatDistanceToNow(new Date(date), { addSuffix: false }) + ' ago';
    } catch {
      return 'Unknown';
    }
  };

  const getSLAInfo = (incident: Incident) => {
    const priorities: Record<string, number> = { critical: 25, high: 55, medium: 75, low: 90 };
    const percent = incident.status === 'resolved' || incident.status === 'closed' ? 100 : (priorities[incident.priority] || 50);
    const timeLeft = incident.status === 'resolved' || incident.status === 'closed'
      ? 'Met'
      : percent < 30 ? '9m left' : percent < 50 ? '27m left' : '45m left';
    return { percent, timeLeft };
  };

  const getInitials = (firstName?: string, lastName?: string) => {
    if (!firstName) return '--';
    return `${firstName.charAt(0)}${lastName?.charAt(0) || ''}`.toUpperCase();
  };

  const handleSelectAll = (checked: boolean) => {
    setSelectAll(checked);
    if (checked) {
      setSelectedIds(new Set(incidents.map((i) => i.id)));
    } else {
      setSelectedIds(new Set());
    }
  };

  const handleSelectRow = (id: number, checked: boolean) => {
    const newSet = new Set(selectedIds);
    if (checked) {
      newSet.add(id);
    } else {
      newSet.delete(id);
    }
    setSelectedIds(newSet);
    setSelectAll(newSet.size === incidents.length);
  };

  const isDark = theme === 'dark';

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1
            className="text-2xl font-bold mb-1"
            style={{ color: isDark ? '#fff' : '#0f1c3f' }}
          >
            All Incidents
          </h1>
          <p style={{ color: '#6b7785', fontSize: '14px' }}>
            Track, manage, and resolve infrastructure incidents across all environments
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            className="px-5 py-2.5 rounded-lg text-sm font-semibold flex items-center gap-2 transition-all"
            style={{
              background: isDark ? 'rgba(255,255,255,0.1)' : '#fff',
              border: '1px solid #e5e8eb',
              color: isDark ? '#fff' : '#0f1c3f',
            }}
          >
            <Download size={16} />
            Export
          </button>
          <Link
            to="/incidents/create"
            className="px-5 py-2.5 rounded-lg text-sm font-semibold text-white flex items-center gap-2 transition-all hover:-translate-y-0.5"
            style={{
              background: 'linear-gradient(135deg, #2563eb, #1d4ed8)',
              boxShadow: '0 4px 12px rgba(37, 99, 235, 0.3)',
            }}
          >
            <Plus size={16} />
            Create Incident
          </Link>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <StatCard
          icon={<Flame size={20} />}
          iconClass="critical"
          value={stats.critical}
          label="Critical"
          isDark={isDark}
        />
        <StatCard
          icon={<AlertCircle size={20} />}
          iconClass="high"
          value={stats.high}
          label="High Priority"
          isDark={isDark}
        />
        <StatCard
          icon={<AlertTriangle size={20} />}
          iconClass="medium"
          value={stats.medium}
          label="Medium"
          isDark={isDark}
        />
        <StatCard
          icon={<Info size={20} />}
          iconClass="low"
          value={stats.low}
          label="Low Priority"
          isDark={isDark}
        />
        <StatCard
          icon={<CheckCircle size={20} />}
          iconClass="resolved"
          value={stats.resolved}
          label="Resolved (30d)"
          isDark={isDark}
        />
      </div>

      {/* Filters Bar */}
      <div
        className="rounded-xl p-4 flex flex-wrap gap-4 items-center"
        style={{
          background: isDark ? 'rgba(255,255,255,0.05)' : '#fff',
          border: '1px solid ' + (isDark ? 'rgba(255,255,255,0.1)' : '#e5e8eb'),
        }}
      >
        <FilterGroup
          label="Status"
          value={localFilters.status || ''}
          onChange={(value) => handleFilterChange('status', value)}
          options={[
            { value: '', label: 'All Status' },
            { value: 'open', label: 'New' },
            { value: 'in_progress', label: 'In Progress' },
            { value: 'pending', label: 'Pending' },
            { value: 'resolved', label: 'Resolved' },
            { value: 'closed', label: 'Closed' },
          ]}
          isDark={isDark}
        />
        <FilterGroup
          label="Priority"
          value={localFilters.priority || ''}
          onChange={(value) => handleFilterChange('priority', value)}
          options={[
            { value: '', label: 'All Priorities' },
            { value: 'critical', label: 'Critical' },
            { value: 'high', label: 'High' },
            { value: 'medium', label: 'Medium' },
            { value: 'low', label: 'Low' },
          ]}
          isDark={isDark}
        />
        <FilterGroup
          label="Category"
          value={localFilters.category || ''}
          onChange={(value) => handleFilterChange('category', value)}
          options={[
            { value: '', label: 'All Categories' },
            { value: 'database', label: 'Database' },
            { value: 'network', label: 'Network' },
            { value: 'application', label: 'Application' },
            { value: 'infrastructure', label: 'Infrastructure' },
            { value: 'security', label: 'Security' },
          ]}
          isDark={isDark}
        />

        {/* Filter Chips */}
        {activeFilters.length > 0 && (
          <div className="flex gap-2 ml-auto">
            {activeFilters.map((f) => (
              <button
                key={f.key}
                onClick={() => removeFilter(f.key)}
                className="px-3 py-1.5 rounded-full text-xs font-medium flex items-center gap-1.5 capitalize transition-colors"
                style={{
                  background: 'rgba(37, 99, 235, 0.1)',
                  color: '#2563eb',
                }}
              >
                {f.label}
                <X size={12} />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Incident Table */}
      <div
        className="rounded-xl overflow-hidden"
        style={{
          background: isDark ? 'rgba(255,255,255,0.05)' : '#fff',
          border: '1px solid ' + (isDark ? 'rgba(255,255,255,0.1)' : '#e5e8eb'),
        }}
      >
        {/* Table Header */}
        <div
          className="px-5 py-4 flex justify-between items-center"
          style={{ borderBottom: '1px solid ' + (isDark ? 'rgba(255,255,255,0.1)' : '#e5e8eb') }}
        >
          <span
            className="text-sm font-semibold flex items-center gap-2.5"
            style={{ color: isDark ? '#fff' : '#0f1c3f' }}
          >
            <List size={16} style={{ color: '#2563eb' }} />
            Incidents ({pagination.total} results)
          </span>
          <div className="flex gap-2">
            <button
              className="px-3 py-1.5 rounded-md text-xs flex items-center gap-1.5 transition-colors"
              style={{
                background: isDark ? 'rgba(255,255,255,0.05)' : '#fff',
                border: '1px solid ' + (isDark ? 'rgba(255,255,255,0.1)' : '#e5e8eb'),
                color: isDark ? '#94a3b8' : '#0f1c3f',
              }}
            >
              <Columns size={14} />
              Columns
            </button>
            <button
              className="px-3 py-1.5 rounded-md text-xs flex items-center gap-1.5 transition-colors"
              style={{
                background: isDark ? 'rgba(255,255,255,0.05)' : '#fff',
                border: '1px solid ' + (isDark ? 'rgba(255,255,255,0.1)' : '#e5e8eb'),
                color: isDark ? '#94a3b8' : '#0f1c3f',
              }}
            >
              <SortAsc size={14} />
              Sort
            </button>
            <button
              onClick={() => fetchData(true)}
              className="px-3 py-1.5 rounded-md text-xs flex items-center gap-1.5 transition-colors"
              style={{
                background: isDark ? 'rgba(255,255,255,0.05)' : '#fff',
                border: '1px solid ' + (isDark ? 'rgba(255,255,255,0.1)' : '#e5e8eb'),
                color: isDark ? '#94a3b8' : '#0f1c3f',
              }}
            >
              <RefreshCw size={14} className={isRefreshing ? 'animate-spin' : ''} />
              Refresh
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full" role="table" aria-label="Incidents list">
            <caption className="sr-only">
              List of incidents showing ID, title, priority, status, category, assignee, SLA, and creation date
            </caption>
            <thead role="rowgroup">
              <tr
                role="row"
                style={{
                  background: isDark ? 'rgba(255,255,255,0.03)' : '#f9fafb',
                  borderBottom: '1px solid ' + (isDark ? 'rgba(255,255,255,0.1)' : '#e5e8eb'),
                }}
              >
                <th className="px-4 py-3 text-left" scope="col" role="columnheader">
                  <input
                    type="checkbox"
                    checked={selectAll}
                    onChange={(e) => handleSelectAll(e.target.checked)}
                    className="w-4 h-4 rounded border-gray-300 focus:ring-2 focus:ring-[var(--color-primary)]"
                    aria-label="Select all incidents"
                  />
                </th>
                <th
                  className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide"
                  style={{ color: '#6b7785' }}
                  scope="col"
                  role="columnheader"
                >
                  Incident ID
                </th>
                <th
                  className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide"
                  style={{ color: '#6b7785' }}
                  scope="col"
                  role="columnheader"
                >
                  Title
                </th>
                <th
                  className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide"
                  style={{ color: '#6b7785' }}
                  scope="col"
                  role="columnheader"
                >
                  Priority
                </th>
                <th
                  className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide"
                  style={{ color: '#6b7785' }}
                  scope="col"
                  role="columnheader"
                >
                  Status
                </th>
                <th
                  className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide"
                  style={{ color: '#6b7785' }}
                  scope="col"
                  role="columnheader"
                >
                  TAT
                </th>
                <th
                  className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide"
                  style={{ color: '#6b7785' }}
                  scope="col"
                  role="columnheader"
                >
                  Category
                </th>
                <th
                  className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide"
                  style={{ color: '#6b7785' }}
                  scope="col"
                  role="columnheader"
                >
                  Assigned To
                </th>
                <th
                  className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide"
                  style={{ color: '#6b7785' }}
                  scope="col"
                  role="columnheader"
                >
                  SLA
                </th>
                <th
                  className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide"
                  style={{ color: '#6b7785' }}
                  scope="col"
                  role="columnheader"
                >
                  Created
                </th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                [...Array(5)].map((_, i) => (
                  <tr key={i}>
                    <td colSpan={10} className="px-4 py-6">
                      <div
                        className="h-6 rounded animate-pulse"
                        style={{ background: isDark ? 'rgba(255,255,255,0.05)' : '#f3f4f6' }}
                      />
                    </td>
                  </tr>
                ))
              ) : incidents.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-4 py-16 text-center">
                    <div className="flex flex-col items-center" style={{ color: '#6b7785' }}>
                      <CheckCircle size={48} className="mb-3 opacity-40" />
                      <p className="text-base font-semibold">No incidents found</p>
                      <p className="text-sm mt-1">All systems are operating normally.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                incidents.map((incident) => {
                  const sla = getSLAInfo(incident);
                  return (
                    <tr
                      key={incident.id}
                      className="group cursor-pointer transition-colors"
                      style={{
                        borderBottom: '1px solid ' + (isDark ? 'rgba(255,255,255,0.05)' : '#e5e8eb'),
                      }}
                      onClick={() => navigate(`/incidents/${incident.id}`)}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = isDark ? 'rgba(255,255,255,0.03)' : '#f9fafb';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'transparent';
                      }}
                    >
                      <td className="px-4 py-3.5" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={selectedIds.has(incident.id)}
                          onChange={(e) => handleSelectRow(incident.id, e.target.checked)}
                          className="w-4 h-4 rounded border-gray-300"
                        />
                      </td>
                      <td className="px-4 py-3.5">
                        <span
                          className="font-semibold hover:underline"
                          style={{ color: '#2563eb', fontSize: '13px' }}
                        >
                          {incident.incidentNumber}
                        </span>
                      </td>
                      <td
                        className="px-4 py-3.5 max-w-[300px] truncate"
                        style={{ color: isDark ? '#fff' : '#0f1c3f', fontSize: '13px' }}
                      >
                        {incident.title}
                      </td>
                      <td className="px-4 py-3.5">
                        <PriorityBadge priority={incident.priority} />
                      </td>
                      <td className="px-4 py-3.5">
                        <StatusBadge status={incident.status} />
                      </td>
                      <td className="px-4 py-3.5">
                        <TATBadge
                          tatBreachAt={(incident as any).tat_breach_at}
                          tatTargetMinutes={(incident as any).tat_target_minutes}
                          isDark={isDark}
                        />
                      </td>
                      <td
                        className="px-4 py-3.5 capitalize"
                        style={{ color: isDark ? '#94a3b8' : '#0f1c3f', fontSize: '13px' }}
                      >
                        {incident.category || 'General'}
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-2">
                          <div
                            className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-semibold"
                            style={{
                              background: 'linear-gradient(135deg, #2563eb, #8b5cf6)',
                            }}
                          >
                            {getInitials(incident.assignee?.firstName, incident.assignee?.lastName)}
                          </div>
                          <span style={{ color: isDark ? '#94a3b8' : '#0f1c3f', fontSize: '12px' }}>
                            {incident.assignee
                              ? `${incident.assignee.firstName} ${incident.assignee.lastName?.charAt(0) || ''}.`
                              : 'Unassigned'}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3.5">
                        <SLACell percent={sla.percent} timeLeft={sla.timeLeft} />
                      </td>
                      <td
                        className="px-4 py-3.5"
                        style={{ color: isDark ? '#64748b' : '#6b7785', fontSize: '13px' }}
                      >
                        {formatTimeAgo(incident.createdAt)}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div
          className="px-5 py-4 flex justify-between items-center"
          style={{ borderTop: '1px solid ' + (isDark ? 'rgba(255,255,255,0.1)' : '#e5e8eb') }}
        >
          <span style={{ color: '#6b7785', fontSize: '13px' }}>
            Showing {((pagination.page - 1) * pagination.limit) + 1}-
            {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} incidents
          </span>
          <div className="flex gap-1">
            <button
              onClick={() => handlePageChange(pagination.page - 1)}
              disabled={pagination.page === 1}
              className="w-9 h-9 rounded-md flex items-center justify-center transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              style={{
                background: isDark ? 'rgba(255,255,255,0.05)' : '#fff',
                border: '1px solid ' + (isDark ? 'rgba(255,255,255,0.1)' : '#e5e8eb'),
                color: isDark ? '#94a3b8' : '#6b7785',
              }}
            >
              <ChevronLeft size={16} />
            </button>
            {[...Array(Math.min(pagination.totalPages, 3))].map((_, i) => {
              const pageNum = i + 1;
              const isActive = pageNum === pagination.page;
              return (
                <button
                  key={pageNum}
                  onClick={() => handlePageChange(pageNum)}
                  className="w-9 h-9 rounded-md flex items-center justify-center text-sm font-medium transition-colors"
                  style={{
                    background: isActive ? '#2563eb' : isDark ? 'rgba(255,255,255,0.05)' : '#fff',
                    border: '1px solid ' + (isActive ? '#2563eb' : isDark ? 'rgba(255,255,255,0.1)' : '#e5e8eb'),
                    color: isActive ? '#fff' : isDark ? '#94a3b8' : '#0f1c3f',
                  }}
                >
                  {pageNum}
                </button>
              );
            })}
            <button
              onClick={() => handlePageChange(pagination.page + 1)}
              disabled={pagination.page === pagination.totalPages}
              className="w-9 h-9 rounded-md flex items-center justify-center transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              style={{
                background: isDark ? 'rgba(255,255,255,0.05)' : '#fff',
                border: '1px solid ' + (isDark ? 'rgba(255,255,255,0.1)' : '#e5e8eb'),
                color: isDark ? '#94a3b8' : '#6b7785',
              }}
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* Quick Action FAB */}
      <Link
        to="/incidents/create"
        className="fixed bottom-6 right-6 w-14 h-14 rounded-full flex items-center justify-center text-white shadow-lg transition-transform hover:scale-110"
        style={{
          background: 'linear-gradient(135deg, #2563eb, #8b5cf6)',
          boxShadow: '0 6px 20px rgba(37, 99, 235, 0.4)',
        }}
        title="Create New Incident"
      >
        <Plus size={24} />
      </Link>
    </div>
  );
};

// Stat Card Component
interface StatCardProps {
  icon: React.ReactNode;
  iconClass: 'critical' | 'high' | 'medium' | 'low' | 'resolved';
  value: number;
  label: string;
  isDark: boolean;
}

const StatCard = ({ icon, iconClass, value, label, isDark }: StatCardProps) => {
  const iconStyles: Record<string, { bg: string; color: string }> = {
    critical: { bg: 'rgba(239, 68, 68, 0.1)', color: '#ef4444' },
    high: { bg: 'rgba(249, 115, 22, 0.1)', color: '#f97316' },
    medium: { bg: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b' },
    low: { bg: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6' },
    resolved: { bg: 'rgba(16, 185, 129, 0.1)', color: '#10b981' },
  };

  const style = iconStyles[iconClass];

  return (
    <div
      className="rounded-xl p-5 flex items-center gap-4"
      style={{
        background: isDark ? 'rgba(255,255,255,0.05)' : '#fff',
        border: '1px solid ' + (isDark ? 'rgba(255,255,255,0.1)' : '#e5e8eb'),
      }}
    >
      <div
        className="w-12 h-12 rounded-xl flex items-center justify-center"
        style={{ background: style.bg, color: style.color }}
      >
        {icon}
      </div>
      <div>
        <h3
          className="text-3xl font-bold leading-none"
          style={{ color: isDark ? '#fff' : '#0f1c3f' }}
        >
          {value}
        </h3>
        <p className="text-xs mt-1" style={{ color: '#6b7785' }}>
          {label}
        </p>
      </div>
    </div>
  );
};

// Filter Group Component
interface FilterGroupProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
  isDark: boolean;
}

const FilterGroup = ({ label, value, onChange, options, isDark }: FilterGroupProps) => (
  <div className="flex items-center gap-2">
    <label className="text-xs font-semibold" style={{ color: '#6b7785' }}>
      {label}
    </label>
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="px-3 py-2 rounded-md text-sm min-w-[140px] focus:outline-none focus:ring-2 focus:ring-blue-500"
      style={{
        background: isDark ? 'rgba(255,255,255,0.05)' : '#fff',
        border: '1px solid ' + (isDark ? 'rgba(255,255,255,0.1)' : '#e5e8eb'),
        color: isDark ? '#fff' : '#0f1c3f',
      }}
    >
      {options.map((opt) => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
  </div>
);

// Priority Badge Component
const PriorityBadge = ({ priority }: { priority: string }) => {
  const styles: Record<string, { bg: string; color: string }> = {
    critical: { bg: '#ef4444', color: '#fff' },
    high: { bg: '#f97316', color: '#fff' },
    medium: { bg: '#fbbf24', color: '#78350f' }, // Fixed: Better contrast ratio ~6.5:1 (WCAG AA compliant)
    low: { bg: '#3b82f6', color: '#fff' },
  };

  const style = styles[priority] || { bg: '#6b7785', color: '#fff' };

  return (
    <span
      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold capitalize"
      style={{ background: style.bg, color: style.color }}
    >
      {priority === 'critical' && <Flame size={12} />}
      {priority}
    </span>
  );
};

// Status Badge Component
const StatusBadge = ({ status }: { status: string }) => {
  const styles: Record<string, { bg: string; color: string }> = {
    open: { bg: 'rgba(139, 92, 246, 0.1)', color: '#8b5cf6' },
    new: { bg: 'rgba(139, 92, 246, 0.1)', color: '#8b5cf6' },
    in_progress: { bg: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6' },
    pending: { bg: 'rgba(245, 158, 11, 0.1)', color: '#b45309' },
    resolved: { bg: 'rgba(16, 185, 129, 0.1)', color: '#10b981' },
    closed: { bg: 'rgba(107, 119, 133, 0.1)', color: '#6b7785' },
  };

  const style = styles[status] || { bg: 'rgba(107, 119, 133, 0.1)', color: '#6b7785' };
  const displayStatus = status === 'in_progress' ? 'In Progress' : status === 'open' ? 'New' : status;

  return (
    <span
      className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold capitalize"
      style={{ background: style.bg, color: style.color }}
    >
      {displayStatus}
    </span>
  );
};

// SLA Cell Component
const SLACell = ({ percent, timeLeft }: { percent: number; timeLeft: string }) => {
  const barColor = percent >= 70 ? '#10b981' : percent >= 40 ? '#f59e0b' : '#ef4444';

  return (
    <div className="flex items-center gap-2">
      <div
        className="w-14 h-1.5 rounded-full overflow-hidden"
        style={{ background: '#e5e7eb' }}
      >
        <div
          className="h-full rounded-full transition-all duration-300"
          style={{ width: `${percent}%`, background: barColor }}
        />
      </div>
      <span className="text-xs whitespace-nowrap" style={{ color: '#6b7785' }}>
        {timeLeft}
      </span>
    </div>
  );
};

// TAT Badge Component
const TATBadge = ({ tatBreachAt, tatTargetMinutes, isDark }: { tatBreachAt?: string; tatTargetMinutes?: number; isDark: boolean }) => {
  if (!tatBreachAt || !tatTargetMinutes) {
    return (
      <span className="text-xs" style={{ color: '#6b7785' }}>
        N/A
      </span>
    );
  }

  const now = new Date();
  const breachTime = new Date(tatBreachAt);
  const remainingMs = breachTime.getTime() - now.getTime();
  const remainingMinutes = Math.floor(remainingMs / (1000 * 60));

  // Calculate percentage of TAT remaining
  const percentRemaining = (remainingMinutes / tatTargetMinutes) * 100;

  // Determine color based on percentage remaining
  let bgColor: string;
  let textColor: string;
  let displayText: string;

  if (remainingMinutes < 0) {
    // Breached
    bgColor = '#7f1d1d';
    textColor = '#fff';
    displayText = 'BREACHED';
  } else if (percentRemaining <= 25) {
    // Red: <25% remaining
    bgColor = 'rgba(239, 68, 68, 0.15)';
    textColor = '#ef4444';
    const hours = Math.floor(remainingMinutes / 60);
    const mins = remainingMinutes % 60;
    displayText = hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
  } else if (percentRemaining <= 50) {
    // Yellow/Amber: 25-50% remaining
    bgColor = 'rgba(245, 158, 11, 0.15)';
    textColor = '#f59e0b';
    const hours = Math.floor(remainingMinutes / 60);
    const mins = remainingMinutes % 60;
    displayText = hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
  } else {
    // Green: >50% remaining
    bgColor = 'rgba(16, 185, 129, 0.15)';
    textColor = '#10b981';
    const hours = Math.floor(remainingMinutes / 60);
    const mins = remainingMinutes % 60;
    displayText = hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
  }

  return (
    <span
      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold whitespace-nowrap"
      style={{ background: bgColor, color: textColor }}
    >
      <Timer size={12} />
      {displayText}
    </span>
  );
};

export default IncidentsListPage;
