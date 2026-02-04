/**
 * LinkedEye-FinSpot Enterprise Incidents List Page
 * ITSM Enterprise Design System v2.0
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
  AlertOctagon,
  Clock,
  User,
  Users,
  Building2,
  TrendingUp,
  MoreVertical,
  Eye,
  Edit,
  Trash2,
  Copy,
  Globe,
  Server,
} from 'lucide-react';

// Client/Environment Data
const CLIENTS_DATA = [
  { id: 'indmoney', name: 'IndMoney', environment: 'PROD', fqdn: 'indmoney-prod-le.finspot.in' },
  { id: 'plindia', name: 'PL India', environment: 'PROD', fqdn: 'prod-le.plindia.co' },
  { id: 'neo-wealth', name: 'Neo Wealth', environment: 'PROD', fqdn: 'prod-le.neo-wealth.com' },
  { id: 'flattrade', name: 'Flattrade', environment: 'PROD', fqdn: 'prod-le.flattrade.in' },
  { id: 'vachana', name: 'Vachana', environment: 'PROD', fqdn: 'fs-le-isv.finspot.in' },
  { id: 'bull', name: 'Bull', environment: 'PROD', fqdn: 'fs-le-isv.finspot.in' },
  { id: 'skycommodities', name: 'Sky Commodities', environment: 'PROD', fqdn: 'fs-le-isv.finspot.in' },
  { id: 'vertex', name: 'Vertex', environment: 'PROD', fqdn: 'fs-le-isv.finspot.in' },
  { id: 'way2wealth', name: 'Way2Wealth', environment: 'PROD', fqdn: 'w2w-prod-le.way2wealth.com' },
  { id: 'fs-ifsc', name: 'FinSpot IFSC', environment: 'PROD', fqdn: 'fs-ifsc-le.finspot.in' },
  { id: 'indmoney-ifsc', name: 'IndMoney IFSC', environment: 'PROD', fqdn: 'indmoney-ifsc-le.finspot.in' },
  { id: 'lemonn', name: 'Lemonn', environment: 'PROD', fqdn: 'lemonn-prod-le.finspot.in' },
  { id: 'fs-dx', name: 'FinSpot DX', environment: 'PROD', fqdn: 'fs-le-dx.finspot.in' },
  { id: 'mirae', name: 'Mirae', environment: 'PROD', fqdn: 'fs-le-prod-mirae' },
  { id: 'smifs', name: 'SMIFS', environment: 'PROD', fqdn: 'fs-le-prod-smifs.com' },
  { id: 'aionion', name: 'Aionion', environment: 'PROD', fqdn: 'fs-le-isv.finspot.in' },
  { id: 'smart', name: 'Smart', environment: 'PROD', fqdn: 'fs-le-isv.finspot.in' },
  { id: 'fs-uat', name: 'FinSpot UAT', environment: 'UAT', fqdn: 'fs-le-uat.finspot.in' },
  { id: 'indmoney-dr', name: 'IndMoney DR', environment: 'DR', fqdn: 'indmoney-dr-le.finspot.in' },
  { id: 'fs-dr', name: 'FinSpot DR', environment: 'DR', fqdn: 'fs-le-dr.finspot.in' },
  { id: 'fs-dev', name: 'FinSpot DEV', environment: 'DEV', fqdn: 'fs-le-dev.finspot.in' },
];

const ENVIRONMENTS = ['PROD', 'UAT', 'DR', 'DEV'] as const;
type Environment = typeof ENVIRONMENTS[number];
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
  const [showFilters, setShowFilters] = useState(false);

  const [localFilters, setLocalFilters] = useState<IncidentFilters & { client?: string; environment?: string }>({
    status: (searchParams.get('status') as IncidentStatus) || undefined,
    priority: (searchParams.get('priority') as Priority) || undefined,
    category: (searchParams.get('category') as IncidentCategory) || undefined,
    client: searchParams.get('client') || undefined,
    environment: searchParams.get('environment') || undefined,
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

  const clearAllFilters = () => {
    setLocalFilters({});
    const params = new URLSearchParams();
    params.set('page', '1');
    setSearchParams(params);
  };

  const activeFilters: { key: string; label: string }[] = [];
  if (localFilters.status) activeFilters.push({ key: 'status', label: localFilters.status.replace('_', ' ') });
  if (localFilters.priority) activeFilters.push({ key: 'priority', label: localFilters.priority });
  if (localFilters.category) activeFilters.push({ key: 'category', label: localFilters.category });
  if (localFilters.client) {
    const clientData = CLIENTS_DATA.find(c => c.id === localFilters.client);
    activeFilters.push({ key: 'client', label: clientData?.name || localFilters.client });
  }
  if (localFilters.environment) activeFilters.push({ key: 'environment', label: localFilters.environment });

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
              <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-lg shadow-blue-500/25">
                <AlertOctagon size={28} className="text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold" style={{ color: isDark ? '#fff' : '#0f1c3f' }}>
                  Incident Management
                </h1>
                <p className="text-sm mt-0.5" style={{ color: isDark ? '#94a3b8' : '#6b7785' }}>
                  Track, manage, and resolve infrastructure incidents across all environments
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {/* Search */}
              <div className="relative">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: '#94a3b8' }} />
                <input
                  type="text"
                  placeholder="Search incidents..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 pr-4 py-2.5 rounded-lg text-sm w-64 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                  style={{
                    background: isDark ? 'rgba(255,255,255,0.08)' : '#ffffff',
                    border: `1px solid ${isDark ? 'rgba(255,255,255,0.12)' : '#e5e8eb'}`,
                    color: isDark ? '#fff' : '#0f1c3f',
                  }}
                />
              </div>
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={clsx(
                  'px-4 py-2.5 rounded-lg text-sm font-medium flex items-center gap-2 transition-all',
                  showFilters ? 'bg-blue-500 text-white' : ''
                )}
                style={!showFilters ? {
                  background: isDark ? 'rgba(255,255,255,0.08)' : '#fff',
                  border: `1px solid ${isDark ? 'rgba(255,255,255,0.12)' : '#e5e8eb'}`,
                  color: isDark ? '#fff' : '#0f1c3f',
                } : {}}
              >
                <Filter size={16} />
                Filters
                {activeFilters.length > 0 && (
                  <span className="w-5 h-5 rounded-full bg-white/20 text-xs flex items-center justify-center">
                    {activeFilters.length}
                  </span>
                )}
              </button>
              <button
                className="px-4 py-2.5 rounded-lg text-sm font-medium flex items-center gap-2 transition-all hover:bg-blue-50"
                style={{
                  background: isDark ? 'rgba(255,255,255,0.08)' : '#fff',
                  border: `1px solid ${isDark ? 'rgba(255,255,255,0.12)' : '#e5e8eb'}`,
                  color: isDark ? '#fff' : '#0f1c3f',
                }}
              >
                <Download size={16} />
                Export
              </button>
              <Link
                to="/incidents/create"
                className="px-5 py-2.5 rounded-lg text-sm font-semibold text-white flex items-center gap-2 transition-all hover:-translate-y-0.5 hover:shadow-xl"
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
        </div>
      </div>

      {/* Stats Row - ITSM Enterprise Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <StatCard
          icon={<Flame size={22} />}
          iconClass="critical"
          value={stats.critical}
          label="Critical"
          trend="+2 today"
          isDark={isDark}
        />
        <StatCard
          icon={<AlertCircle size={22} />}
          iconClass="high"
          value={stats.high}
          label="High Priority"
          trend="+5 today"
          isDark={isDark}
        />
        <StatCard
          icon={<AlertTriangle size={22} />}
          iconClass="medium"
          value={stats.medium}
          label="Medium"
          trend="Stable"
          isDark={isDark}
        />
        <StatCard
          icon={<Info size={22} />}
          iconClass="low"
          value={stats.low}
          label="Low Priority"
          trend="-3 today"
          isDark={isDark}
        />
        <StatCard
          icon={<CheckCircle size={22} />}
          iconClass="resolved"
          value={stats.resolved}
          label="Resolved (30d)"
          trend="94% SLA"
          isDark={isDark}
        />
      </div>

      {/* Filters Panel - Collapsible */}
      {showFilters && (
        <div
          className="rounded-xl p-5 space-y-4 animate-in slide-in-from-top-2"
          style={{
            background: isDark ? 'rgba(255,255,255,0.03)' : '#fff',
            border: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : '#e5e8eb'}`,
          }}
        >
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold flex items-center gap-2" style={{ color: isDark ? '#fff' : '#0f1c3f' }}>
              <Filter size={16} className="text-blue-500" />
              Filter Incidents
            </h3>
            {activeFilters.length > 0 && (
              <button
                onClick={clearAllFilters}
                className="text-xs font-medium text-blue-500 hover:text-blue-600"
              >
                Clear All
              </button>
            )}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <FilterGroup
              label="Client"
              value={localFilters.client || ''}
              onChange={(value) => handleFilterChange('client' as any, value)}
              options={[
                { value: '', label: 'All Clients' },
                ...CLIENTS_DATA.map(c => ({ value: c.id, label: c.name }))
              ]}
              isDark={isDark}
              icon={<Building2 size={14} className="text-blue-500" />}
            />
            <FilterGroup
              label="Environment"
              value={localFilters.environment || ''}
              onChange={(value) => handleFilterChange('environment' as any, value)}
              options={[
                { value: '', label: 'All Environments' },
                { value: 'PROD', label: 'Production' },
                { value: 'UAT', label: 'UAT' },
                { value: 'DR', label: 'Disaster Recovery' },
                { value: 'DEV', label: 'Development' },
              ]}
              isDark={isDark}
              icon={<Server size={14} className="text-emerald-500" />}
            />
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
          </div>

          {/* Active Filter Chips */}
          {activeFilters.length > 0 && (
            <div className="flex flex-wrap gap-2 pt-2">
              {activeFilters.map((f) => (
                <button
                  key={f.key}
                  onClick={() => removeFilter(f.key)}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-2 capitalize transition-all hover:shadow-md group"
                  style={{
                    background: 'linear-gradient(135deg, rgba(37, 99, 235, 0.1), rgba(37, 99, 235, 0.05))',
                    border: '1px solid rgba(37, 99, 235, 0.2)',
                    color: '#2563eb',
                  }}
                >
                  {f.label}
                  <X size={12} className="group-hover:scale-110 transition-transform" />
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Incident Table - ITSM Enterprise Style */}
      <div
        className="rounded-xl overflow-hidden shadow-sm"
        style={{
          background: isDark ? 'rgba(255,255,255,0.03)' : '#fff',
          border: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : '#e5e8eb'}`,
        }}
      >
        {/* Table Header */}
        <div
          className="px-5 py-4 flex justify-between items-center"
          style={{
            background: isDark ? 'rgba(255,255,255,0.03)' : 'linear-gradient(135deg, #f8fafc, #ffffff)',
            borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : '#e5e8eb'}`,
          }}
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
              <List size={16} className="text-white" />
            </div>
            <div>
              <span className="text-sm font-semibold" style={{ color: isDark ? '#fff' : '#0f1c3f' }}>
                All Incidents
              </span>
              <span className="text-xs ml-2 px-2 py-0.5 rounded-full" style={{
                background: isDark ? 'rgba(37, 99, 235, 0.2)' : 'rgba(37, 99, 235, 0.1)',
                color: '#2563eb',
              }}>
                {pagination.total} results
              </span>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              className="px-3 py-2 rounded-lg text-xs font-medium flex items-center gap-2 transition-all hover:bg-blue-50"
              style={{
                background: isDark ? 'rgba(255,255,255,0.05)' : '#fff',
                border: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : '#e5e8eb'}`,
                color: isDark ? '#94a3b8' : '#0f1c3f',
              }}
            >
              <Columns size={14} />
              Columns
            </button>
            <button
              className="px-3 py-2 rounded-lg text-xs font-medium flex items-center gap-2 transition-all hover:bg-blue-50"
              style={{
                background: isDark ? 'rgba(255,255,255,0.05)' : '#fff',
                border: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : '#e5e8eb'}`,
                color: isDark ? '#94a3b8' : '#0f1c3f',
              }}
            >
              <SortAsc size={14} />
              Sort
            </button>
            <button
              onClick={() => fetchData(true)}
              className="px-3 py-2 rounded-lg text-xs font-medium flex items-center gap-2 transition-all hover:bg-blue-50"
              style={{
                background: isDark ? 'rgba(255,255,255,0.05)' : '#fff',
                border: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : '#e5e8eb'}`,
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
                  background: isDark ? 'rgba(255,255,255,0.02)' : '#f9fafb',
                  borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : '#e5e8eb'}`,
                }}
              >
                <th className="px-4 py-3.5 text-left" scope="col" role="columnheader">
                  <input
                    type="checkbox"
                    checked={selectAll}
                    onChange={(e) => handleSelectAll(e.target.checked)}
                    className="w-4 h-4 rounded border-gray-300 text-blue-500 focus:ring-2 focus:ring-blue-500"
                    aria-label="Select all incidents"
                  />
                </th>
                <th className="px-4 py-3.5 text-left text-[11px] font-semibold uppercase tracking-wider" style={{ color: '#6b7785' }} scope="col">
                  Incident ID
                </th>
                <th className="px-4 py-3.5 text-left text-[11px] font-semibold uppercase tracking-wider" style={{ color: '#6b7785' }} scope="col">
                  <div className="flex items-center gap-1">
                    <Building2 size={12} className="text-blue-500" />
                    Client
                  </div>
                </th>
                <th className="px-4 py-3.5 text-left text-[11px] font-semibold uppercase tracking-wider" style={{ color: '#6b7785' }} scope="col">
                  <div className="flex items-center gap-1">
                    <Server size={12} className="text-emerald-500" />
                    Environment
                  </div>
                </th>
                <th className="px-4 py-3.5 text-left text-[11px] font-semibold uppercase tracking-wider" style={{ color: '#6b7785' }} scope="col">
                  Title
                </th>
                <th className="px-4 py-3.5 text-left text-[11px] font-semibold uppercase tracking-wider" style={{ color: '#6b7785' }} scope="col">
                  Priority
                </th>
                <th className="px-4 py-3.5 text-left text-[11px] font-semibold uppercase tracking-wider" style={{ color: '#6b7785' }} scope="col">
                  Status
                </th>
                <th className="px-4 py-3.5 text-left text-[11px] font-semibold uppercase tracking-wider" style={{ color: '#6b7785' }} scope="col">
                  TAT
                </th>
                <th className="px-4 py-3.5 text-left text-[11px] font-semibold uppercase tracking-wider" style={{ color: '#6b7785' }} scope="col">
                  Category
                </th>
                <th className="px-4 py-3.5 text-left text-[11px] font-semibold uppercase tracking-wider" style={{ color: '#6b7785' }} scope="col">
                  Assigned To
                </th>
                <th className="px-4 py-3.5 text-left text-[11px] font-semibold uppercase tracking-wider" style={{ color: '#6b7785' }} scope="col">
                  SLA
                </th>
                <th className="px-4 py-3.5 text-left text-[11px] font-semibold uppercase tracking-wider" style={{ color: '#6b7785' }} scope="col">
                  Created
                </th>
                <th className="px-4 py-3.5 text-center text-[11px] font-semibold uppercase tracking-wider" style={{ color: '#6b7785' }} scope="col">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                [...Array(5)].map((_, i) => (
                  <tr key={i}>
                    <td colSpan={11} className="px-4 py-5">
                      <div className="flex items-center gap-4">
                        <div className="w-4 h-4 rounded bg-gray-200 animate-pulse" />
                        <div className="w-24 h-4 rounded bg-gray-200 animate-pulse" />
                        <div className="flex-1 h-4 rounded bg-gray-200 animate-pulse" />
                        <div className="w-20 h-6 rounded-full bg-gray-200 animate-pulse" />
                        <div className="w-20 h-6 rounded-full bg-gray-200 animate-pulse" />
                      </div>
                    </td>
                  </tr>
                ))
              ) : incidents.length === 0 ? (
                <tr>
                  <td colSpan={11} className="px-4 py-16 text-center">
                    <div className="flex flex-col items-center">
                      <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mb-4">
                        <CheckCircle size={32} className="text-green-500" />
                      </div>
                      <p className="text-base font-semibold" style={{ color: isDark ? '#fff' : '#0f1c3f' }}>
                        No incidents found
                      </p>
                      <p className="text-sm mt-1" style={{ color: '#6b7785' }}>
                        All systems are operating normally.
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                incidents.map((incident, index) => {
                  const sla = getSLAInfo(incident);
                  const isSelected = selectedIds.has(incident.id);
                  return (
                    <tr
                      key={incident.id}
                      className={clsx(
                        'group cursor-pointer transition-all duration-200',
                        isSelected && 'bg-blue-50/50'
                      )}
                      style={{
                        borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.04)' : '#f1f5f9'}`,
                        borderLeft: isSelected ? '3px solid #2563eb' : '3px solid transparent',
                      }}
                      onClick={() => navigate(`/incidents/${incident.id}`)}
                      onMouseEnter={(e) => {
                        if (!isSelected) {
                          e.currentTarget.style.background = isDark ? 'rgba(255,255,255,0.02)' : '#f8fafc';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!isSelected) {
                          e.currentTarget.style.background = 'transparent';
                        }
                      }}
                    >
                      <td className="px-4 py-4" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={(e) => handleSelectRow(incident.id, e.target.checked)}
                          className="w-4 h-4 rounded border-gray-300 text-blue-500 focus:ring-2 focus:ring-blue-500"
                        />
                      </td>
                      <td className="px-4 py-4">
                        <span className="font-semibold text-blue-600 hover:text-blue-700 text-sm">
                          {incident.incidentNumber}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        {incident.client ? (
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white text-[10px] font-bold shadow-sm">
                              {(incident.client.display_name || incident.client.name || '').substring(0, 2).toUpperCase()}
                            </div>
                            <span className="text-sm font-medium truncate max-w-[100px]" style={{ color: isDark ? '#fff' : '#0f1c3f' }}>
                              {incident.client.display_name || incident.client.name}
                            </span>
                          </div>
                        ) : (
                          <span className="text-xs px-2 py-1 rounded-md" style={{ background: isDark ? 'rgba(255,255,255,0.05)' : '#f1f5f9', color: '#6b7785' }}>
                            Not assigned
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-4">
                        <EnvironmentBadge environment={(incident as any).environment || 'PROD'} />
                      </td>
                      <td className="px-4 py-4 max-w-[240px]">
                        <p className="text-sm font-medium truncate" style={{ color: isDark ? '#fff' : '#0f1c3f' }}>
                          {incident.title}
                        </p>
                      </td>
                      <td className="px-4 py-4">
                        <PriorityBadge priority={incident.priority} />
                      </td>
                      <td className="px-4 py-4">
                        <StatusBadge status={incident.status} />
                      </td>
                      <td className="px-4 py-4">
                        <TATBadge
                          tatBreachAt={(incident as any).tat_breach_at}
                          tatTargetMinutes={(incident as any).tat_target_minutes}
                          isDark={isDark}
                        />
                      </td>
                      <td className="px-4 py-4">
                        <span className="text-sm capitalize px-2.5 py-1 rounded-md" style={{
                          background: isDark ? 'rgba(255,255,255,0.05)' : '#f1f5f9',
                          color: isDark ? '#94a3b8' : '#475569',
                        }}>
                          {incident.category || 'General'}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-2.5">
                          <div
                            className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-bold shadow-sm"
                            style={{
                              background: incident.assignee
                                ? 'linear-gradient(135deg, #2563eb, #7c3aed)'
                                : 'linear-gradient(135deg, #94a3b8, #64748b)',
                            }}
                          >
                            {getInitials(incident.assignee?.firstName, incident.assignee?.lastName)}
                          </div>
                          <div>
                            <span className="text-sm font-medium block" style={{ color: isDark ? '#fff' : '#0f1c3f' }}>
                              {incident.assignee
                                ? `${incident.assignee.firstName} ${incident.assignee.lastName?.charAt(0) || ''}.`
                                : 'Unassigned'}
                            </span>
                            {incident.assignedGroup && (
                              <span className="text-[10px]" style={{ color: '#6b7785' }}>
                                {incident.assignedGroup.name}
                              </span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <SLACell percent={sla.percent} timeLeft={sla.timeLeft} />
                      </td>
                      <td className="px-4 py-4">
                        <div>
                          <span className="text-sm" style={{ color: isDark ? '#94a3b8' : '#475569' }}>
                            {formatTimeAgo(incident.createdAt)}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-4 text-center" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => navigate(`/incidents/${incident.id}`)}
                            className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors hover:bg-blue-100"
                            style={{ color: '#2563eb' }}
                            title="View"
                          >
                            <Eye size={16} />
                          </button>
                          <button
                            onClick={() => navigate(`/incidents/${incident.id}/edit`)}
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
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination - ITSM Style */}
        <div
          className="px-5 py-4 flex flex-col sm:flex-row justify-between items-center gap-4"
          style={{
            background: isDark ? 'rgba(255,255,255,0.02)' : '#f9fafb',
            borderTop: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : '#e5e8eb'}`,
          }}
        >
          <div className="flex items-center gap-2">
            <span className="text-sm" style={{ color: '#6b7785' }}>
              Showing
            </span>
            <span className="text-sm font-semibold" style={{ color: isDark ? '#fff' : '#0f1c3f' }}>
              {((pagination.page - 1) * pagination.limit) + 1}-{Math.min(pagination.page * pagination.limit, pagination.total)}
            </span>
            <span className="text-sm" style={{ color: '#6b7785' }}>
              of {pagination.total} incidents
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => handlePageChange(pagination.page - 1)}
              disabled={pagination.page === 1}
              className="px-3 py-2 rounded-lg flex items-center gap-1.5 text-sm font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:bg-blue-50"
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
              {[...Array(Math.min(pagination.totalPages, 5))].map((_, i) => {
                let pageNum: number;
                if (pagination.totalPages <= 5) {
                  pageNum = i + 1;
                } else if (pagination.page <= 3) {
                  pageNum = i + 1;
                } else if (pagination.page >= pagination.totalPages - 2) {
                  pageNum = pagination.totalPages - 4 + i;
                } else {
                  pageNum = pagination.page - 2 + i;
                }
                const isActive = pageNum === pagination.page;
                return (
                  <button
                    key={pageNum}
                    onClick={() => handlePageChange(pageNum)}
                    className="w-10 h-10 rounded-lg flex items-center justify-center text-sm font-medium transition-all"
                    style={{
                      background: isActive ? 'linear-gradient(135deg, #2563eb, #1d4ed8)' : isDark ? 'rgba(255,255,255,0.05)' : '#fff',
                      border: `1px solid ${isActive ? '#2563eb' : isDark ? 'rgba(255,255,255,0.1)' : '#e5e8eb'}`,
                      color: isActive ? '#fff' : isDark ? '#94a3b8' : '#0f1c3f',
                      boxShadow: isActive ? '0 4px 12px rgba(37, 99, 235, 0.3)' : 'none',
                    }}
                  >
                    {pageNum}
                  </button>
                );
              })}
            </div>
            <button
              onClick={() => handlePageChange(pagination.page + 1)}
              disabled={pagination.page === pagination.totalPages}
              className="px-3 py-2 rounded-lg flex items-center gap-1.5 text-sm font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:bg-blue-50"
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
      </div>

      {/* Quick Action FAB */}
      <Link
        to="/incidents/create"
        className="fixed bottom-6 right-6 w-14 h-14 rounded-xl flex items-center justify-center text-white shadow-xl transition-all hover:scale-110 hover:shadow-2xl"
        style={{
          background: 'linear-gradient(135deg, #2563eb, #7c3aed)',
          boxShadow: '0 8px 24px rgba(37, 99, 235, 0.4)',
        }}
        title="Create New Incident"
      >
        <Plus size={24} />
      </Link>
    </div>
  );
};

// Stat Card Component - ITSM Enterprise Style
interface StatCardProps {
  icon: React.ReactNode;
  iconClass: 'critical' | 'high' | 'medium' | 'low' | 'resolved';
  value: number;
  label: string;
  trend?: string;
  isDark: boolean;
}

const StatCard = ({ icon, iconClass, value, label, trend, isDark }: StatCardProps) => {
  const iconStyles: Record<string, { bg: string; gradient: string; color: string; shadow: string }> = {
    critical: {
      bg: 'rgba(239, 68, 68, 0.1)',
      gradient: 'linear-gradient(135deg, #ef4444, #dc2626)',
      color: '#ef4444',
      shadow: 'rgba(239, 68, 68, 0.3)',
    },
    high: {
      bg: 'rgba(249, 115, 22, 0.1)',
      gradient: 'linear-gradient(135deg, #f97316, #ea580c)',
      color: '#f97316',
      shadow: 'rgba(249, 115, 22, 0.3)',
    },
    medium: {
      bg: 'rgba(245, 158, 11, 0.1)',
      gradient: 'linear-gradient(135deg, #f59e0b, #d97706)',
      color: '#f59e0b',
      shadow: 'rgba(245, 158, 11, 0.3)',
    },
    low: {
      bg: 'rgba(59, 130, 246, 0.1)',
      gradient: 'linear-gradient(135deg, #3b82f6, #2563eb)',
      color: '#3b82f6',
      shadow: 'rgba(59, 130, 246, 0.3)',
    },
    resolved: {
      bg: 'rgba(16, 185, 129, 0.1)',
      gradient: 'linear-gradient(135deg, #10b981, #059669)',
      color: '#10b981',
      shadow: 'rgba(16, 185, 129, 0.3)',
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
          <span className="text-[10px] font-medium px-2 py-1 rounded-full" style={{
            background: style.bg,
            color: style.color,
          }}>
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

// Filter Group Component - ITSM Style
interface FilterGroupProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
  isDark: boolean;
  icon?: React.ReactNode;
}

const FilterGroup = ({ label, value, onChange, options, isDark, icon }: FilterGroupProps) => (
  <div className="space-y-1.5">
    <label className="text-[11px] font-semibold uppercase tracking-wider flex items-center gap-1.5" style={{ color: isDark ? '#94a3b8' : '#6b7785' }}>
      {icon}
      {label}
    </label>
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full px-3 py-2.5 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all cursor-pointer"
      style={{
        background: isDark ? '#1e293b' : '#ffffff',
        border: `1px solid ${isDark ? 'rgba(255,255,255,0.15)' : '#e5e8eb'}`,
        color: isDark ? '#f1f5f9' : '#0f1c3f',
      }}
    >
      {options.map((opt) => (
        <option
          key={opt.value}
          value={opt.value}
          style={{
            background: isDark ? '#1e293b' : '#ffffff',
            color: isDark ? '#f1f5f9' : '#0f1c3f',
            padding: '8px',
          }}
        >
          {opt.label}
        </option>
      ))}
    </select>
  </div>
);

// Priority Badge Component - ITSM Style
// Environment Badge Component - ITSM Style
const EnvironmentBadge = ({ environment }: { environment: string }) => {
  const styles: Record<string, { bg: string; gradient: string; text: string; dot: string }> = {
    PROD: {
      bg: 'rgba(16, 185, 129, 0.1)',
      gradient: 'linear-gradient(135deg, #10b981, #059669)',
      text: '#10b981',
      dot: '#10b981',
    },
    UAT: {
      bg: 'rgba(245, 158, 11, 0.1)',
      gradient: 'linear-gradient(135deg, #f59e0b, #d97706)',
      text: '#f59e0b',
      dot: '#f59e0b',
    },
    DR: {
      bg: 'rgba(139, 92, 246, 0.1)',
      gradient: 'linear-gradient(135deg, #8b5cf6, #7c3aed)',
      text: '#8b5cf6',
      dot: '#8b5cf6',
    },
    DEV: {
      bg: 'rgba(59, 130, 246, 0.1)',
      gradient: 'linear-gradient(135deg, #3b82f6, #2563eb)',
      text: '#3b82f6',
      dot: '#3b82f6',
    },
  };

  const style = styles[environment] || styles.PROD;

  return (
    <span
      className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold"
      style={{ background: style.bg, color: style.text }}
    >
      <span className="w-2 h-2 rounded-full" style={{ background: style.dot }} />
      {environment}
    </span>
  );
};

const PriorityBadge = ({ priority }: { priority: string }) => {
  const styles: Record<string, { bg: string; color: string; icon: React.ReactNode }> = {
    critical: {
      bg: 'linear-gradient(135deg, #ef4444, #dc2626)',
      color: '#fff',
      icon: <Flame size={12} />,
    },
    high: {
      bg: 'linear-gradient(135deg, #f97316, #ea580c)',
      color: '#fff',
      icon: <AlertCircle size={12} />,
    },
    medium: {
      bg: 'linear-gradient(135deg, #fbbf24, #f59e0b)',
      color: '#78350f',
      icon: <AlertTriangle size={12} />,
    },
    low: {
      bg: 'linear-gradient(135deg, #3b82f6, #2563eb)',
      color: '#fff',
      icon: <Info size={12} />,
    },
  };

  const style = styles[priority] || { bg: '#6b7785', color: '#fff', icon: null };

  return (
    <span
      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold capitalize shadow-sm"
      style={{ background: style.bg, color: style.color }}
    >
      {style.icon}
      {priority}
    </span>
  );
};

// Status Badge Component - ITSM Style
const StatusBadge = ({ status }: { status: string }) => {
  const styles: Record<string, { bg: string; color: string; dot: string }> = {
    open: { bg: 'rgba(139, 92, 246, 0.1)', color: '#8b5cf6', dot: '#8b5cf6' },
    new: { bg: 'rgba(139, 92, 246, 0.1)', color: '#8b5cf6', dot: '#8b5cf6' },
    in_progress: { bg: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6', dot: '#3b82f6' },
    pending: { bg: 'rgba(245, 158, 11, 0.1)', color: '#b45309', dot: '#f59e0b' },
    resolved: { bg: 'rgba(16, 185, 129, 0.1)', color: '#10b981', dot: '#10b981' },
    closed: { bg: 'rgba(107, 119, 133, 0.1)', color: '#6b7785', dot: '#6b7785' },
  };

  const style = styles[status] || { bg: 'rgba(107, 119, 133, 0.1)', color: '#6b7785', dot: '#6b7785' };
  const displayStatus = status === 'in_progress' ? 'In Progress' : status === 'open' ? 'New' : status;

  return (
    <span
      className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold capitalize"
      style={{ background: style.bg, color: style.color }}
    >
      <span className="w-2 h-2 rounded-full animate-pulse" style={{ background: style.dot }} />
      {displayStatus}
    </span>
  );
};

// SLA Cell Component - ITSM Style
const SLACell = ({ percent, timeLeft }: { percent: number; timeLeft: string }) => {
  const barColor = percent >= 70 ? '#10b981' : percent >= 40 ? '#f59e0b' : '#ef4444';

  return (
    <div className="flex items-center gap-3">
      <div className="w-16 h-2 rounded-full overflow-hidden" style={{ background: '#e5e7eb' }}>
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${percent}%`, background: barColor }}
        />
      </div>
      <span
        className="text-xs font-medium whitespace-nowrap px-2 py-0.5 rounded"
        style={{
          background: `${barColor}15`,
          color: barColor,
        }}
      >
        {timeLeft}
      </span>
    </div>
  );
};

// TAT Badge Component - ITSM Style
const TATBadge = ({ tatBreachAt, tatTargetMinutes, isDark }: { tatBreachAt?: string; tatTargetMinutes?: number; isDark: boolean }) => {
  if (!tatBreachAt || !tatTargetMinutes) {
    return (
      <span className="text-xs px-2.5 py-1 rounded-md" style={{
        background: isDark ? 'rgba(255,255,255,0.05)' : '#f1f5f9',
        color: '#6b7785',
      }}>
        N/A
      </span>
    );
  }

  const now = new Date();
  const breachTime = new Date(tatBreachAt);
  const remainingMs = breachTime.getTime() - now.getTime();
  const remainingMinutes = Math.floor(remainingMs / (1000 * 60));
  const percentRemaining = (remainingMinutes / tatTargetMinutes) * 100;

  let bgColor: string;
  let textColor: string;
  let displayText: string;

  if (remainingMinutes < 0) {
    bgColor = 'linear-gradient(135deg, #7f1d1d, #991b1b)';
    textColor = '#fff';
    displayText = 'BREACHED';
  } else if (percentRemaining <= 25) {
    bgColor = 'rgba(239, 68, 68, 0.15)';
    textColor = '#ef4444';
    const hours = Math.floor(remainingMinutes / 60);
    const mins = remainingMinutes % 60;
    displayText = hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
  } else if (percentRemaining <= 50) {
    bgColor = 'rgba(245, 158, 11, 0.15)';
    textColor = '#f59e0b';
    const hours = Math.floor(remainingMinutes / 60);
    const mins = remainingMinutes % 60;
    displayText = hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
  } else {
    bgColor = 'rgba(16, 185, 129, 0.15)';
    textColor = '#10b981';
    const hours = Math.floor(remainingMinutes / 60);
    const mins = remainingMinutes % 60;
    displayText = hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
  }

  return (
    <span
      className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap"
      style={{ background: bgColor, color: textColor }}
    >
      <Timer size={12} />
      {displayText}
    </span>
  );
};

export default IncidentsListPage;
