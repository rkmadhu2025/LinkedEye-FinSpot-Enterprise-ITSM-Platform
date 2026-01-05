import { useEffect, useState, useCallback } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Plus, Search, Download, RefreshCw } from 'lucide-react';
import {
  Card,
  CardBody,
  Button,
  Input,
  Select,
  Table,
  Pagination,
  StatusBadge,
  PriorityBadge,
  Avatar,
  EmptyState,
} from '@/components/ui';
import { useAppDispatch, useAppSelector } from '@/hooks/useRedux';
import { fetchProblems, setFilters } from '@/store/slices/problemsSlice';
import { Problem, ProblemFilters, Priority, ProblemStatus } from '@/types';
import { format } from 'date-fns';
import { useDebounce } from '@/hooks/useDebounce';
import type { Column } from '@/components/ui/Table';

const ProblemsListPage = () => {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const [searchParams, setSearchParams] = useSearchParams();

  const { problems, pagination, isLoading, filters } = useAppSelector((state) => state.problems);

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

  const getStatusBadge = (status: ProblemStatus) => {
    const statusMap: Record<ProblemStatus, { label: string; variant: 'success' | 'warning' | 'danger' | 'info' }> = {
      open: { label: 'Open', variant: 'info' },
      investigating: { label: 'Investigating', variant: 'warning' },
      root_cause_identified: { label: 'Root Cause Identified', variant: 'info' },
      known_error: { label: 'Known Error', variant: 'warning' },
      resolved: { label: 'Resolved', variant: 'success' },
      closed: { label: 'Closed', variant: 'info' },
    };
    const config = statusMap[status] || statusMap.open;
    return <StatusBadge status={config.label.toLowerCase().replace(' ', '_') as any} />;
  };

  const columns: Column<Problem>[] = [
    {
      key: 'problemNumber',
      header: 'ID',
      sortable: true,
      width: '120px',
      render: (_, row) => (
        <span className="font-mono text-sm text-primary-600">{row.problemNumber}</span>
      ),
    },
    {
      key: 'title',
      header: 'Title',
      sortable: true,
      render: (_, row) => (
        <div className="max-w-md">
          <Link to={`/problems/${row.id}`} className="font-medium text-gray-900 hover:text-primary-600 truncate block">
            {row.title}
          </Link>
          {row.description && (
            <p className="text-xs text-gray-500 truncate">{row.description}</p>
          )}
        </div>
      ),
    },
    {
      key: 'priority',
      header: 'Priority',
      sortable: true,
      width: '100px',
      render: (_, row) => <PriorityBadge priority={row.priority} />,
    },
    {
      key: 'status',
      header: 'Status',
      sortable: true,
      width: '150px',
      render: (_, row) => getStatusBadge(row.status),
    },
    {
      key: 'assignee',
      header: 'Assignee',
      width: '150px',
      render: (_, row) => (
        row.assignee ? (
          <div className="flex items-center gap-2">
            <Avatar name={`${row.assignee.firstName} ${row.assignee.lastName}`} size="sm" />
            <span className="text-sm truncate">{row.assignee.firstName} {row.assignee.lastName}</span>
          </div>
        ) : (
          <span className="text-gray-400">Unassigned</span>
        )
      ),
    },
    {
      key: 'createdAt',
      header: 'Created',
      sortable: true,
      width: '140px',
      render: (_, row) => (
        <span className="text-sm text-gray-600">
          {format(new Date(row.createdAt), 'MMM d, h:mm a')}
        </span>
      ),
    },
  ];

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

  const stats = [
    { label: 'Total', value: pagination.total, color: 'text-gray-900' },
    { label: 'Open', value: problems.filter((p) => p.status === 'open' || p.status === 'investigating').length, color: 'text-primary-600' },
    { label: 'Root Cause', value: problems.filter((p) => p.status === 'root_cause_identified').length, color: 'text-info-600' },
    { label: 'Known Errors', value: problems.filter((p) => p.status === 'known_error').length, color: 'text-warning-600' },
    { label: 'Resolved', value: problems.filter((p) => p.status === 'resolved').length, color: 'text-success-600' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Problems</h1>
          <p className="text-gray-500 mt-1">Manage and track IT problems and root cause analysis</p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" leftIcon={<Download size={16} />}>
            Export
          </Button>
          <Link to="/problems/create">
            <Button leftIcon={<Plus size={16} />}>New Problem</Button>
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {stats.map((stat) => (
          <Card key={stat.label} padding="sm">
            <div className="text-center">
              <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
              <p className="text-sm text-gray-500">{stat.label}</p>
            </div>
          </Card>
        ))}
      </div>

      <Card>
        <CardBody>
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex-1 min-w-[200px] max-w-md">
              <Input
                placeholder="Search problems..."
                value={searchQuery}
                onChange={(e) => handleSearchChange(e.target.value)}
                leftIcon={<Search size={18} />}
              />
            </div>
            <Select
              options={statusOptions}
              value={localFilters.status || ''}
              onChange={(e) => handleFilterChange('status', e.target.value)}
              className="w-40"
            />
            <Select
              options={priorityOptions}
              value={localFilters.priority || ''}
              onChange={(e) => handleFilterChange('priority', e.target.value)}
              className="w-40"
            />
            <Button
              variant="outline"
              leftIcon={<RefreshCw size={16} />}
              onClick={() => {
                setSearchQuery('');
                setLocalFilters({});
                setSearchParams({});
              }}
            >
              Reset
            </Button>
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardBody>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
            </div>
          ) : problems.length === 0 ? (
            <EmptyState
              title="No problems found"
              description="Get started by creating a new problem"
              action={{
                label: 'Create Problem',
                onClick: () => navigate('/problems/create'),
              }}
            />
          ) : (
            <>
              <Table columns={columns} data={problems} onRowClick={(row) => navigate(`/problems/${row.id}`)} />
              {pagination.totalPages > 1 && (
                <div className="mt-4">
                  <Pagination
                    currentPage={pagination.page}
                    totalPages={pagination.totalPages}
                    totalItems={pagination.total}
                    itemsPerPage={pagination.limit}
                    onPageChange={handlePageChange}
                  />
                </div>
              )}
            </>
          )}
        </CardBody>
      </Card>
    </div>
  );
};

export default ProblemsListPage;
