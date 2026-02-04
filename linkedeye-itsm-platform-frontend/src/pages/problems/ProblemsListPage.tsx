/**
 * LinkedEye-FinSpot Enterprise Problem Management Page
 * ITSM Enterprise Design System v2.0
 */

import { useEffect, useState, useCallback } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import {
  Plus,
  Search,
  Download,
  RefreshCw,
  AlertCircle,
  Bug,
  CheckCircle,
  Clock,
  Eye,
  Edit,
  Filter,
  LayoutGrid,
  List,
  MoreHorizontal,
  XCircle,
  Target,
  Lightbulb,
  FileQuestion,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  Users,
  Zap,
  Shield,
  Flame,
} from 'lucide-react';
import {
  Avatar,
  EmptyState,
} from '@/components/ui';
import { useAppDispatch, useAppSelector } from '@/hooks/useRedux';
import { fetchProblems, setFilters } from '@/store/slices/problemsSlice';
import { Problem, ProblemFilters, Priority, ProblemStatus } from '@/types';
import { format, formatDistanceToNow } from 'date-fns';
import { useDebounce } from '@/hooks/useDebounce';
import clsx from 'clsx';

const ProblemsListPage = () => {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const [searchParams, setSearchParams] = useSearchParams();
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const [selectedProblems, setSelectedProblems] = useState<string[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const { problems, pagination, isLoading, filters } = useAppSelector((state) => state.problems);
  const { theme } = useAppSelector((state) => state.ui);
  const isDark = theme === 'dark';

  const [searchQuery, setSearchQuery] = useState(searchParams.get('search') || '');
  const debouncedSearch = useDebounce(searchQuery, 300);

  const [localFilters, setLocalFilters] = useState<ProblemFilters>({
    status: (searchParams.get('status') as ProblemStatus) || undefined,
    priority: (searchParams.get('priority') as Priority) || undefined,
    category: searchParams.get('category') as any,
  });

  const fetchData = useCallback(() => {
    const page = parseInt(searchParams.get('page') || '1', 10);
    const currentFilters: ProblemFilters = {
      ...localFilters,
      search: debouncedSearch || undefined,
    };

    dispatch(setFilters(currentFilters));
    dispatch(fetchProblems({ page, limit: 20, filters: currentFilters }));
  }, [dispatch, searchParams, localFilters, debouncedSearch]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleRefresh = () => {
    setIsRefreshing(true);
    fetchData();
    setTimeout(() => setIsRefreshing(false), 500);
  };

  const handlePageChange = (page: number) => {
    const params = new URLSearchParams(searchParams);
    params.set('page', String(page));
    setSearchParams(params);
  };

  const handleFilterChange = (key: keyof ProblemFilters, value: string) => {
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

  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    const params = new URLSearchParams(searchParams);
    if (value) {
      params.set('search', value);
    } else {
      params.delete('search');
    }
    params.set('page', '1');
    setSearchParams(params);
  };

  const toggleSelectAll = () => {
    if (selectedProblems.length === problems.length) {
      setSelectedProblems([]);
    } else {
      setSelectedProblems(problems.map(p => p.id));
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedProblems(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const getStatusConfig = (status: ProblemStatus) => {
    const configs: Record<ProblemStatus, { bg: string; text: string; icon: React.ReactNode; label: string }> = {
      open: { bg: 'rgba(59, 130, 246, 0.1)', text: '#3b82f6', icon: <FileQuestion size={12} />, label: 'Open' },
      investigating: { bg: 'rgba(245, 158, 11, 0.1)', text: '#f59e0b', icon: <Search size={12} />, label: 'Investigating' },
      root_cause_identified: { bg: 'rgba(139, 92, 246, 0.1)', text: '#8b5cf6', icon: <Target size={12} />, label: 'Root Cause' },
      known_error: { bg: 'rgba(249, 115, 22, 0.1)', text: '#f97316', icon: <Bug size={12} />, label: 'Known Error' },
      resolved: { bg: 'rgba(16, 185, 129, 0.1)', text: '#10b981', icon: <CheckCircle size={12} />, label: 'Resolved' },
      closed: { bg: 'rgba(107, 114, 128, 0.1)', text: '#6b7280', icon: <XCircle size={12} />, label: 'Closed' },
    };
    return configs[status] || configs.open;
  };

  const getPriorityConfig = (priority: Priority) => {
    const configs: Record<Priority, { bg: string; gradient: string; text: string; dot: string; icon: React.ReactNode }> = {
      critical: { bg: 'rgba(239, 68, 68, 0.1)', gradient: 'linear-gradient(135deg, #ef4444, #dc2626)', text: '#ef4444', dot: '#ef4444', icon: <Flame size={12} /> },
      high: { bg: 'rgba(249, 115, 22, 0.1)', gradient: 'linear-gradient(135deg, #f97316, #ea580c)', text: '#f97316', dot: '#f97316', icon: <AlertCircle size={12} /> },
      medium: { bg: 'rgba(245, 158, 11, 0.1)', gradient: 'linear-gradient(135deg, #f59e0b, #d97706)', text: '#f59e0b', dot: '#f59e0b', icon: <AlertCircle size={12} /> },
      low: { bg: 'rgba(16, 185, 129, 0.1)', gradient: 'linear-gradient(135deg, #10b981, #059669)', text: '#10b981', dot: '#10b981', icon: <Shield size={12} /> },
    };
    return configs[priority] || configs.medium;
  };

  const statusOptions = [
    { value: '', label: 'All Statuses' },
    { value: 'open', label: 'Open' },
    { value: 'investigating', label: 'Investigating' },
    { value: 'root_cause_identified', label: 'Root Cause Identified' },
    { value: 'known_error', label: 'Known Error' },
    { value: 'resolved', label: 'Resolved' },
    { value: 'closed', label: 'Closed' },
  ];

  const priorityOptions = [
    { value: '', label: 'All Priorities' },
    { value: 'critical', label: 'Critical' },
    { value: 'high', label: 'High' },
    { value: 'medium', label: 'Medium' },
    { value: 'low', label: 'Low' },
  ];

  // Calculate stats
  const stats = {
    total: pagination.total || problems.length,
    open: problems.filter(p => p.status === 'open').length,
    investigating: problems.filter(p => p.status === 'investigating').length,
    rootCause: problems.filter(p => p.status === 'root_cause_identified').length,
    knownErrors: problems.filter(p => p.status === 'known_error').length,
    resolved: problems.filter(p => p.status === 'resolved' || p.status === 'closed').length,
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
              <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-rose-500 to-rose-600 flex items-center justify-center shadow-lg shadow-rose-500/25">
                <Bug size={28} className="text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold" style={{ color: isDark ? '#fff' : '#0f1c3f' }}>
                  Problem Management
                </h1>
                <p className="text-sm mt-0.5" style={{ color: isDark ? '#94a3b8' : '#6b7785' }}>
                  Track and resolve IT problems with root cause analysis
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                className="px-4 py-2.5 rounded-lg text-sm font-medium flex items-center gap-2 transition-all hover:bg-rose-50"
                style={{
                  background: isDark ? 'rgba(255,255,255,0.08)' : '#fff',
                  border: `1px solid ${isDark ? 'rgba(255,255,255,0.12)' : '#e5e8eb'}`,
                  color: isDark ? '#fff' : '#0f1c3f',
                }}
              >
                <Download size={16} />
                Export
              </button>
              <Link to="/problems/create">
                <button
                  className="px-5 py-2.5 rounded-lg text-sm font-semibold text-white flex items-center gap-2 transition-all hover:-translate-y-0.5 hover:shadow-xl"
                  style={{
                    background: 'linear-gradient(135deg, #f43f5e, #e11d48)',
                    boxShadow: '0 4px 12px rgba(244, 63, 94, 0.3)',
                  }}
                >
                  <Plus size={16} />
                  New Problem
                </button>
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Row - ITSM Enterprise Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-4">
        <StatCard
          icon={<Bug size={22} />}
          iconClass="total"
          value={stats.total}
          label="Total Problems"
          isDark={isDark}
        />
        <StatCard
          icon={<FileQuestion size={22} />}
          iconClass="open"
          value={stats.open}
          label="Open"
          trend={stats.open > 0 ? `${stats.open} new` : undefined}
          isDark={isDark}
        />
        <StatCard
          icon={<Search size={22} />}
          iconClass="investigating"
          value={stats.investigating}
          label="Investigating"
          isDark={isDark}
        />
        <StatCard
          icon={<Target size={22} />}
          iconClass="rootCause"
          value={stats.rootCause}
          label="Root Cause Found"
          isDark={isDark}
        />
        <StatCard
          icon={<AlertCircle size={22} />}
          iconClass="knownError"
          value={stats.knownErrors}
          label="Known Errors"
          trend={stats.knownErrors > 0 ? 'Workaround' : undefined}
          isDark={isDark}
        />
        <StatCard
          icon={<CheckCircle size={22} />}
          iconClass="resolved"
          value={stats.resolved}
          label="Resolved"
          trend="This month"
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
                placeholder="Search problems..."
                value={searchQuery}
                onChange={(e) => handleSearchChange(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-rose-500 transition-all"
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
              className="px-3 py-2.5 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-rose-500 transition-all cursor-pointer"
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
              value={localFilters.priority || ''}
              onChange={(e) => handleFilterChange('priority', e.target.value)}
              className="px-3 py-2.5 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-rose-500 transition-all cursor-pointer"
              style={{
                background: isDark ? '#1e293b' : '#ffffff',
                border: `1px solid ${isDark ? 'rgba(255,255,255,0.15)' : '#e5e8eb'}`,
                color: isDark ? '#f1f5f9' : '#0f1c3f',
              }}
            >
              {priorityOptions.map(opt => (
                <option key={opt.value} value={opt.value} style={{ background: isDark ? '#1e293b' : '#ffffff', color: isDark ? '#f1f5f9' : '#0f1c3f' }}>{opt.label}</option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleRefresh}
              className="p-2.5 rounded-lg transition-all hover:bg-rose-50"
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
                    ? 'bg-rose-500 text-white shadow-sm'
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
                    ? 'bg-rose-500 text-white shadow-sm'
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
      {selectedProblems.length > 0 && (
        <div
          className="rounded-xl p-4 flex items-center justify-between animate-in slide-in-from-top-2"
          style={{
            background: 'linear-gradient(135deg, rgba(244, 63, 94, 0.15), rgba(244, 63, 94, 0.05))',
            border: '1px solid rgba(244, 63, 94, 0.3)',
          }}
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-rose-500 flex items-center justify-center text-white text-sm font-bold">
              {selectedProblems.length}
            </div>
            <span className="text-sm font-medium" style={{ color: '#f43f5e' }}>
              problem{selectedProblems.length > 1 ? 's' : ''} selected
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button className="px-4 py-2 text-sm font-medium rounded-lg transition-all hover:bg-rose-500/20" style={{ color: '#f43f5e' }}>
              Assign Selected
            </button>
            <button className="px-4 py-2 text-sm font-medium rounded-lg transition-all hover:bg-rose-500/20" style={{ color: '#f43f5e' }}>
              Update Status
            </button>
            <button
              onClick={() => setSelectedProblems([])}
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
            <div className="w-12 h-12 rounded-full border-3 border-rose-500 border-t-transparent animate-spin mb-4" />
            <p style={{ color: '#6b7785' }}>Loading problems...</p>
          </div>
        </div>
      ) : problems.length === 0 ? (
        <div
          className="rounded-xl p-12"
          style={{
            background: isDark ? 'rgba(255,255,255,0.03)' : '#fff',
            border: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : '#e5e8eb'}`,
          }}
        >
          <div className="flex flex-col items-center">
            <div className="w-16 h-16 rounded-full bg-rose-100 flex items-center justify-center mb-4">
              <Bug size={32} className="text-rose-500" />
            </div>
            <p className="text-base font-semibold" style={{ color: isDark ? '#fff' : '#0f1c3f' }}>
              No problems found
            </p>
            <p className="text-sm mt-1" style={{ color: '#6b7785' }}>
              No problems match your current filters.
            </p>
            <Link to="/problems/create">
              <button
                className="mt-4 px-5 py-2.5 rounded-lg text-sm font-semibold text-white"
                style={{ background: 'linear-gradient(135deg, #f43f5e, #e11d48)' }}
              >
                Create Problem
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
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-rose-500 to-rose-600 flex items-center justify-center">
                <List size={16} className="text-white" />
              </div>
              <div>
                <span className="text-sm font-semibold" style={{ color: isDark ? '#fff' : '#0f1c3f' }}>
                  All Problems
                </span>
                <span className="text-xs ml-2 px-2 py-0.5 rounded-full" style={{
                  background: isDark ? 'rgba(244, 63, 94, 0.2)' : 'rgba(244, 63, 94, 0.1)',
                  color: '#f43f5e',
                }}>
                  {pagination.total || problems.length} results
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
                      checked={selectedProblems.length === problems.length && problems.length > 0}
                      onChange={toggleSelectAll}
                      className="w-4 h-4 rounded border-gray-300 text-rose-500 focus:ring-2 focus:ring-rose-500"
                    />
                  </th>
                  <th className="px-4 py-3.5 text-left text-[11px] font-semibold uppercase tracking-wider" style={{ color: '#6b7785' }}>
                    Problem ID
                  </th>
                  <th className="px-4 py-3.5 text-left text-[11px] font-semibold uppercase tracking-wider" style={{ color: '#6b7785' }}>
                    Title
                  </th>
                  <th className="px-4 py-3.5 text-left text-[11px] font-semibold uppercase tracking-wider" style={{ color: '#6b7785' }}>
                    Priority
                  </th>
                  <th className="px-4 py-3.5 text-left text-[11px] font-semibold uppercase tracking-wider" style={{ color: '#6b7785' }}>
                    Status
                  </th>
                  <th className="px-4 py-3.5 text-left text-[11px] font-semibold uppercase tracking-wider" style={{ color: '#6b7785' }}>
                    Assignee
                  </th>
                  <th className="px-4 py-3.5 text-left text-[11px] font-semibold uppercase tracking-wider" style={{ color: '#6b7785' }}>
                    Created
                  </th>
                  <th className="px-4 py-3.5 text-center text-[11px] font-semibold uppercase tracking-wider" style={{ color: '#6b7785' }}>
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {problems.map((problem) => {
                  const statusConfig = getStatusConfig(problem.status);
                  const priorityConfig = getPriorityConfig(problem.priority);
                  const isSelected = selectedProblems.includes(problem.id);

                  return (
                    <tr
                      key={problem.id}
                      className={clsx('group cursor-pointer transition-all duration-200', isSelected && 'bg-rose-50/50')}
                      style={{
                        borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.04)' : '#f1f5f9'}`,
                        borderLeft: isSelected ? '3px solid #f43f5e' : '3px solid transparent',
                      }}
                      onClick={() => navigate(`/problems/${problem.id}`)}
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
                          onChange={() => toggleSelect(problem.id)}
                          className="w-4 h-4 rounded border-gray-300 text-rose-500 focus:ring-2 focus:ring-rose-500"
                        />
                      </td>
                      <td className="px-4 py-4">
                        <span className="font-semibold text-rose-500 hover:text-rose-600 text-sm">
                          {problem.problemNumber}
                        </span>
                      </td>
                      <td className="px-4 py-4 max-w-[300px]">
                        <p className="text-sm font-medium truncate" style={{ color: isDark ? '#fff' : '#0f1c3f' }}>
                          {problem.title}
                        </p>
                        {problem.description && (
                          <p className="text-xs mt-0.5 truncate" style={{ color: '#6b7785' }}>
                            {problem.description}
                          </p>
                        )}
                      </td>
                      <td className="px-4 py-4">
                        <span
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold capitalize"
                          style={{ background: priorityConfig.gradient, color: '#fff' }}
                        >
                          {priorityConfig.icon}
                          {problem.priority}
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
                        {problem.assignee ? (
                          <div className="flex items-center gap-2.5">
                            <div
                              className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-bold shadow-sm"
                              style={{ background: 'linear-gradient(135deg, #f43f5e, #e11d48)' }}
                            >
                              {problem.assignee.firstName?.charAt(0)}{problem.assignee.lastName?.charAt(0)}
                            </div>
                            <span className="text-sm font-medium" style={{ color: isDark ? '#fff' : '#0f1c3f' }}>
                              {problem.assignee.firstName}
                            </span>
                          </div>
                        ) : (
                          <span className="text-sm" style={{ color: '#6b7785' }}>Unassigned</span>
                        )}
                      </td>
                      <td className="px-4 py-4">
                        <span className="text-sm" style={{ color: isDark ? '#94a3b8' : '#475569' }}>
                          {formatDistanceToNow(new Date(problem.createdAt), { addSuffix: true })}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-center" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => navigate(`/problems/${problem.id}`)}
                            className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors hover:bg-rose-100"
                            style={{ color: '#f43f5e' }}
                            title="View"
                          >
                            <Eye size={16} />
                          </button>
                          <button
                            onClick={() => navigate(`/problems/${problem.id}/edit`)}
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
                <span className="text-sm" style={{ color: '#6b7785' }}>of {pagination.total || 0} problems</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="px-3 py-2 rounded-lg flex items-center gap-1.5 text-sm font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:bg-rose-50"
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
                          background: currentPage === pageNum ? 'linear-gradient(135deg, #f43f5e, #e11d48)' : isDark ? 'rgba(255,255,255,0.05)' : '#fff',
                          border: `1px solid ${currentPage === pageNum ? '#f43f5e' : isDark ? 'rgba(255,255,255,0.1)' : '#e5e8eb'}`,
                          color: currentPage === pageNum ? '#fff' : isDark ? '#94a3b8' : '#0f1c3f',
                          boxShadow: currentPage === pageNum ? '0 4px 12px rgba(244, 63, 94, 0.3)' : 'none',
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
                  className="px-3 py-2 rounded-lg flex items-center gap-1.5 text-sm font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:bg-rose-50"
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
          {problems.map((problem) => {
            const statusConfig = getStatusConfig(problem.status);
            const priorityConfig = getPriorityConfig(problem.priority);

            return (
              <div
                key={problem.id}
                onClick={() => navigate(`/problems/${problem.id}`)}
                className="rounded-xl p-5 transition-all cursor-pointer group hover:shadow-lg hover:-translate-y-1"
                style={{
                  background: isDark ? 'rgba(255,255,255,0.03)' : '#fff',
                  border: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : '#e5e8eb'}`,
                }}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'rgba(244, 63, 94, 0.2)' }}>
                      <Bug size={16} className="text-rose-500" />
                    </div>
                    <span className="font-mono text-sm font-semibold text-rose-500">{problem.problemNumber}</span>
                  </div>
                  <span
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold capitalize"
                    style={{ background: priorityConfig.gradient, color: '#fff' }}
                  >
                    {problem.priority}
                  </span>
                </div>
                <h3 className="font-semibold mb-2 line-clamp-2 group-hover:text-rose-500 transition-colors" style={{ color: isDark ? '#fff' : '#0f1c3f' }}>
                  {problem.title}
                </h3>
                {problem.description && (
                  <p className="text-sm mb-4 line-clamp-2" style={{ color: '#6b7785' }}>{problem.description}</p>
                )}
                <div className="flex items-center gap-2 mb-4">
                  <span
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold"
                    style={{ background: statusConfig.bg, color: statusConfig.text }}
                  >
                    {statusConfig.icon}
                    {statusConfig.label}
                  </span>
                </div>
                <div className="flex items-center justify-between pt-3" style={{ borderTop: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : '#e5e8eb'}` }}>
                  <div className="flex items-center gap-1.5 text-xs" style={{ color: '#6b7785' }}>
                    <Clock size={12} />
                    {formatDistanceToNow(new Date(problem.createdAt), { addSuffix: true })}
                  </div>
                  {problem.assignee ? (
                    <div
                      className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-bold"
                      style={{ background: 'linear-gradient(135deg, #f43f5e, #e11d48)' }}
                    >
                      {problem.assignee.firstName?.charAt(0)}{problem.assignee.lastName?.charAt(0)}
                    </div>
                  ) : (
                    <span className="text-xs" style={{ color: '#6b7785' }}>Unassigned</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Quick Action FAB */}
      <Link
        to="/problems/create"
        className="fixed bottom-6 right-6 w-14 h-14 rounded-xl flex items-center justify-center text-white shadow-xl transition-all hover:scale-110 hover:shadow-2xl"
        style={{
          background: 'linear-gradient(135deg, #f43f5e, #e11d48)',
          boxShadow: '0 8px 24px rgba(244, 63, 94, 0.4)',
        }}
        title="Create New Problem"
      >
        <Plus size={24} />
      </Link>
    </div>
  );
};

// Stat Card Component - ITSM Enterprise Style
interface StatCardProps {
  icon: React.ReactNode;
  iconClass: 'total' | 'open' | 'investigating' | 'rootCause' | 'knownError' | 'resolved';
  value: number;
  label: string;
  trend?: string;
  isDark: boolean;
}

const StatCard = ({ icon, iconClass, value, label, trend, isDark }: StatCardProps) => {
  const iconStyles: Record<string, { bg: string; gradient: string; color: string; shadow: string }> = {
    total: {
      bg: 'rgba(244, 63, 94, 0.1)',
      gradient: 'linear-gradient(135deg, #f43f5e, #e11d48)',
      color: '#f43f5e',
      shadow: 'rgba(244, 63, 94, 0.3)',
    },
    open: {
      bg: 'rgba(59, 130, 246, 0.1)',
      gradient: 'linear-gradient(135deg, #3b82f6, #2563eb)',
      color: '#3b82f6',
      shadow: 'rgba(59, 130, 246, 0.3)',
    },
    investigating: {
      bg: 'rgba(245, 158, 11, 0.1)',
      gradient: 'linear-gradient(135deg, #f59e0b, #d97706)',
      color: '#f59e0b',
      shadow: 'rgba(245, 158, 11, 0.3)',
    },
    rootCause: {
      bg: 'rgba(139, 92, 246, 0.1)',
      gradient: 'linear-gradient(135deg, #8b5cf6, #7c3aed)',
      color: '#8b5cf6',
      shadow: 'rgba(139, 92, 246, 0.3)',
    },
    knownError: {
      bg: 'rgba(249, 115, 22, 0.1)',
      gradient: 'linear-gradient(135deg, #f97316, #ea580c)',
      color: '#f97316',
      shadow: 'rgba(249, 115, 22, 0.3)',
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

export default ProblemsListPage;
