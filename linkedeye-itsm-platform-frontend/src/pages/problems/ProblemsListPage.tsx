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
    const configs: Record<ProblemStatus, { bg: string; text: string; icon: React.ReactNode; label: string; dot: string }> = {
      open: { bg: 'bg-blue-100', text: 'text-blue-700', icon: <FileQuestion size={12} />, label: 'Open', dot: 'bg-blue-500' },
      investigating: { bg: 'bg-amber-100', text: 'text-amber-700', icon: <Search size={12} />, label: 'Investigating', dot: 'bg-amber-500' },
      root_cause_identified: { bg: 'bg-purple-100', text: 'text-purple-700', icon: <Target size={12} />, label: 'Root Cause', dot: 'bg-purple-500' },
      known_error: { bg: 'bg-orange-100', text: 'text-orange-700', icon: <Bug size={12} />, label: 'Known Error', dot: 'bg-orange-500' },
      resolved: { bg: 'bg-green-100', text: 'text-green-700', icon: <CheckCircle size={12} />, label: 'Resolved', dot: 'bg-green-500' },
      closed: { bg: 'bg-gray-100', text: 'text-gray-700', icon: <XCircle size={12} />, label: 'Closed', dot: 'bg-gray-500' },
    };
    return configs[status] || configs.open;
  };

  const getPriorityConfig = (priority: Priority) => {
    const configs: Record<Priority, { bg: string; text: string; dot: string }> = {
      critical: { bg: 'bg-red-100', text: 'text-red-700', dot: 'bg-red-500' },
      high: { bg: 'bg-orange-100', text: 'text-orange-700', dot: 'bg-orange-500' },
      medium: { bg: 'bg-amber-100', text: 'text-amber-700', dot: 'bg-amber-500' },
      low: { bg: 'bg-green-100', text: 'text-green-700', dot: 'bg-green-500' },
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
    <div className="space-y-6 min-h-screen -m-6 p-6" style={{ background: isDark ? 'linear-gradient(180deg, #030712 0%, #0a0f1a 100%)' : '#f9fafb' }}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>Problem Management</h1>
          <p className={`mt-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Track and resolve IT problems with root cause analysis</p>
        </div>
        <div className="flex items-center gap-3">
          <button className="px-4 py-2.5 rounded-xl text-sm font-medium flex items-center gap-2 transition-all" style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.1)', color: '#e5e7eb' }}>
            <Download size={16} className="text-gray-400" />
            Export
          </button>
          <Link to="/problems/create">
            <button className="px-4 py-2.5 bg-gradient-to-r from-purple-600 to-purple-700 text-white rounded-xl text-sm font-medium flex items-center gap-2 hover:shadow-lg hover:shadow-purple-500/30 transition-all">
              <Plus size={16} />
              New Problem
            </button>
          </Link>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-6 gap-4">
        <StatCard isDark={isDark}
          label="Total Problems"
          value={stats.total}
          icon={<Bug size={20} />}
          iconBg="bg-purple-100"
          iconColor="text-purple-600"
        />
        <StatCard isDark={isDark}
          label="Open"
          value={stats.open}
          icon={<FileQuestion size={20} />}
          iconBg="bg-blue-100"
          iconColor="text-blue-600"
          trend={stats.open > 0 ? 'attention' : undefined}
        />
        <StatCard isDark={isDark}
          label="Investigating"
          value={stats.investigating}
          icon={<Search size={20} />}
          iconBg="bg-amber-100"
          iconColor="text-amber-600"
        />
        <StatCard isDark={isDark}
          label="Root Cause Found"
          value={stats.rootCause}
          icon={<Target size={20} />}
          iconBg="bg-indigo-100"
          iconColor="text-indigo-600"
        />
        <StatCard isDark={isDark}
          label="Known Errors"
          value={stats.knownErrors}
          icon={<AlertCircle size={20} />}
          iconBg="bg-orange-100"
          iconColor="text-orange-600"
          trend={stats.knownErrors > 0 ? 'warning' : undefined}
        />
        <StatCard isDark={isDark}
          label="Resolved"
          value={stats.resolved}
          icon={<CheckCircle size={20} />}
          iconBg="bg-green-100"
          iconColor="text-green-600"
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
                placeholder="Search problems by ID, title, or description..."
                value={searchQuery}
                onChange={(e) => handleSearchChange(e.target.value)}
                className={`w-full pl-10 pr-4 py-2.5 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20 transition-all placeholder-gray-400 ${isDark ? 'text-white' : 'text-gray-900'}`}
                style={{ background: isDark ? 'rgba(255,255,255,0.1)' : '#f9fafb', border: isDark ? '1px solid rgba(255,255,255,0.1)' : '1px solid #e5e8eb' }}
              />
            </div>
            <select
              value={localFilters.status || ''}
              onChange={(e) => handleFilterChange('status', e.target.value)}
              className={`px-4 py-2.5 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20 transition-all ${isDark ? 'text-white' : 'text-gray-900'}`}
              style={{ background: isDark ? 'rgba(255,255,255,0.1)' : '#f9fafb', border: isDark ? '1px solid rgba(255,255,255,0.1)' : '1px solid #e5e8eb' }}
            >
              {statusOptions.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
            <select
              value={localFilters.priority || ''}
              onChange={(e) => handleFilterChange('priority', e.target.value)}
              className={`px-4 py-2.5 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20 transition-all ${isDark ? 'text-white' : 'text-gray-900'}`}
              style={{ background: isDark ? 'rgba(255,255,255,0.1)' : '#f9fafb', border: isDark ? '1px solid rgba(255,255,255,0.1)' : '1px solid #e5e8eb' }}
            >
              {priorityOptions.map(opt => (
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
                  viewMode === 'list' ? 'bg-purple-600 text-white' : 'text-gray-400 hover:text-white'
                )}
              >
                <List size={16} />
              </button>
              <button
                onClick={() => setViewMode('grid')}
                className={clsx(
                  'p-2 rounded-lg transition-all',
                  viewMode === 'grid' ? 'bg-purple-600 text-white' : 'text-gray-400 hover:text-white'
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
        <div className="rounded-xl p-4 flex items-center justify-between" style={{ background: 'rgba(139, 92, 246, 0.15)', border: '1px solid rgba(139, 92, 246, 0.3)' }}>
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium text-purple-300">
              {selectedProblems.length} problem{selectedProblems.length > 1 ? 's' : ''} selected
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button className="px-3 py-1.5 text-sm font-medium text-purple-300 hover:bg-purple-500/20 rounded-lg transition-all">
              Assign Selected
            </button>
            <button className="px-3 py-1.5 text-sm font-medium text-purple-300 hover:bg-purple-500/20 rounded-lg transition-all">
              Update Status
            </button>
            <button
              onClick={() => setSelectedProblems([])}
              className="px-3 py-1.5 text-sm font-medium text-gray-400 hover:bg-purple-500/20 rounded-lg transition-all"
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
            <div className="w-10 h-10 border-2 border-purple-500 border-t-transparent rounded-full animate-spin mb-4" />
            <p className="text-gray-400">Loading problems...</p>
          </div>
        </div>
      ) : problems.length === 0 ? (
        <div className="rounded-xl p-12" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}>
          <EmptyState
            title="No problems found"
            description="No problems match your current filters. Create a new problem to start tracking."
            action={{
              label: 'Create Problem',
              onClick: () => navigate('/problems/create'),
            }}
          />
        </div>
      ) : viewMode === 'list' ? (
        <div className="rounded-xl overflow-hidden" style={{ background: isDark ? 'rgba(255,255,255,0.05)' : '#ffffff', border: isDark ? '1px solid rgba(255,255,255,0.1)' : '1px solid #e5e8eb' }}>
          {/* Table Header */}
          <div className="grid grid-cols-[40px_130px_1fr_100px_130px_140px_100px] gap-4 px-5 py-3" style={{ background: isDark ? 'rgba(255,255,255,0.03)' : '#f9fafb', borderBottom: isDark ? '1px solid rgba(255,255,255,0.1)' : '1px solid #e5e8eb' }}>
            <div className="flex items-center">
              <input
                type="checkbox"
                checked={selectedProblems.length === problems.length && problems.length > 0}
                onChange={toggleSelectAll}
                className="w-4 h-4 rounded border-gray-600 text-purple-600 focus:ring-purple-500"
              />
            </div>
            <div className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Problem ID</div>
            <div className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Title & Description</div>
            <div className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Priority</div>
            <div className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Status</div>
            <div className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Assignee</div>
            <div className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider text-right">Actions</div>
          </div>

          {/* Table Rows */}
          {problems.map((problem) => {
            const statusConfig = getStatusConfig(problem.status);
            const priorityConfig = getPriorityConfig(problem.priority);
            const isSelected = selectedProblems.includes(problem.id);

            return (
              <div
                key={problem.id}
                className="grid grid-cols-[40px_130px_1fr_100px_130px_140px_100px] gap-4 px-5 py-4 transition-all cursor-pointer"
                style={{
                  borderBottom: isDark ? '1px solid rgba(255,255,255,0.05)' : '1px solid #f0f0f0',
                  background: isSelected ? 'rgba(139, 92, 246, 0.1)' : 'transparent',
                }}
                onClick={() => navigate(`/problems/${problem.id}`)}
                onMouseEnter={(e) => !isSelected && (e.currentTarget.style.background = isDark ? 'rgba(255,255,255,0.03)' : '#f9fafb')}
                onMouseLeave={(e) => !isSelected && (e.currentTarget.style.background = 'transparent')}
              >
                <div className="flex items-center" onClick={(e) => e.stopPropagation()}>
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => toggleSelect(problem.id)}
                    className="w-4 h-4 rounded border-gray-600 text-purple-600 focus:ring-purple-500"
                  />
                </div>
                <div className="flex items-center">
                  <span className="font-mono text-sm font-medium text-purple-400 hover:text-purple-300">
                    {problem.problemNumber}
                  </span>
                </div>
                <div className="flex flex-col justify-center min-w-0">
                  <p className={`font-medium truncate ${isDark ? 'text-white' : 'text-gray-900'}`}>{problem.title}</p>
                  {problem.description && (
                    <p className="text-xs text-gray-400 truncate mt-0.5">{problem.description}</p>
                  )}
                </div>
                <div className="flex items-center">
                  <span className={clsx(
                    'inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium',
                    priorityConfig.bg,
                    priorityConfig.text
                  )}>
                    <span className={clsx('w-1.5 h-1.5 rounded-full', priorityConfig.dot)} />
                    {problem.priority.charAt(0).toUpperCase() + problem.priority.slice(1)}
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
                  {problem.assignee ? (
                    <div className="flex items-center gap-2">
                      <Avatar name={`${problem.assignee.firstName} ${problem.assignee.lastName}`} size="sm" />
                      <span className="text-sm text-gray-300 truncate">
                        {problem.assignee.firstName}
                      </span>
                    </div>
                  ) : (
                    <span className="text-sm text-gray-500">Unassigned</span>
                  )}
                </div>
                <div className="flex items-center justify-end" onClick={(e) => e.stopPropagation()}>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => navigate(`/problems/${problem.id}`)}
                      className="p-1.5 text-gray-400 hover:text-purple-400 rounded-lg transition-all"
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
          {problems.map((problem) => {
            const statusConfig = getStatusConfig(problem.status);
            const priorityConfig = getPriorityConfig(problem.priority);

            return (
              <div
                key={problem.id}
                onClick={() => navigate(`/problems/${problem.id}`)}
                className="rounded-xl p-5 transition-all cursor-pointer group"
                style={{ background: isDark ? 'rgba(255,255,255,0.05)' : '#ffffff', border: isDark ? '1px solid rgba(255,255,255,0.1)' : '1px solid #e5e8eb' }}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'rgba(139, 92, 246, 0.2)' }}>
                      <Bug size={16} className="text-purple-400" />
                    </div>
                    <span className="font-mono text-sm font-medium text-purple-400">{problem.problemNumber}</span>
                  </div>
                  <span className={clsx(
                    'inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium',
                    priorityConfig.bg,
                    priorityConfig.text
                  )}>
                    <span className={clsx('w-1.5 h-1.5 rounded-full', priorityConfig.dot)} />
                    {problem.priority.toUpperCase()}
                  </span>
                </div>
                <h3 className={`font-semibold mb-2 line-clamp-2 group-hover:text-purple-400 transition-colors ${isDark ? 'text-white' : 'text-gray-900'}`}>
                  {problem.title}
                </h3>
                {problem.description && (
                  <p className="text-sm text-gray-400 mb-4 line-clamp-2">{problem.description}</p>
                )}
                <div className="flex items-center gap-2 mb-4">
                  <span className={clsx(
                    'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium',
                    statusConfig.bg,
                    statusConfig.text
                  )}>
                    {statusConfig.icon}
                    {statusConfig.label}
                  </span>
                </div>
                <div className="flex items-center justify-between pt-3" style={{ borderTop: '1px solid rgba(255,255,255,0.1)' }}>
                  <div className="flex items-center gap-1.5 text-xs text-gray-400">
                    <Clock size={12} />
                    {formatDistanceToNow(new Date(problem.createdAt), { addSuffix: true })}
                  </div>
                  {problem.assignee ? (
                    <div className="flex items-center gap-2">
                      <Avatar name={`${problem.assignee.firstName} ${problem.assignee.lastName}`} size="sm" />
                    </div>
                  ) : (
                    <span className="text-xs text-gray-500">Unassigned</span>
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
            of <span className={`font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>{pagination.total || 0}</span> problems
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
              className="p-2 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all text-gray-400"
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
                  className="w-9 h-9 rounded-lg text-sm font-medium transition-all"
                  style={{
                    background: currentPage === pageNum ? '#8b5cf6' : 'rgba(255,255,255,0.1)',
                    border: currentPage === pageNum ? '1px solid #8b5cf6' : '1px solid rgba(255,255,255,0.1)',
                    color: currentPage === pageNum ? '#fff' : '#94a3b8',
                  }}
                >
                  {pageNum}
                </button>
              );
            })}
            <button
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
              className="p-2 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all text-gray-400"
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
  trend?: 'attention' | 'warning' | 'danger';
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

export default ProblemsListPage;
