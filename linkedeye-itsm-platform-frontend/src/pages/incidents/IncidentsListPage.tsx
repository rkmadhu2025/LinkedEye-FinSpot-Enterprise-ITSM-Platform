import { useEffect, useState, useCallback } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Plus, Search, Filter, Download, RefreshCw } from 'lucide-react';
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
import { fetchIncidents, setFilters } from '@/store/slices/incidentsSlice';
import { Incident, IncidentFilters, Priority, IncidentStatus, IncidentCategory } from '@/types';
import { format } from 'date-fns';
import { useDebounce } from '@/hooks/useDebounce';
import type { Column } from '@/components/ui/Table';

const IncidentsListPage = () => {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const [searchParams, setSearchParams] = useSearchParams();

  const { incidents, pagination, isLoading, filters } = useAppSelector((state) => state.incidents);

  const [searchQuery, setSearchQuery] = useState(searchParams.get('search') || '');
  const debouncedSearch = useDebounce(searchQuery, 300);

  const [localFilters, setLocalFilters] = useState<IncidentFilters>({
    status: (searchParams.get('status') as IncidentStatus) || undefined,
    priority: (searchParams.get('priority') as Priority) || undefined,
    category: (searchParams.get('category') as IncidentCategory) || undefined,
  });

  const fetchData = useCallback(() => {
    const page = parseInt(searchParams.get('page') || '1', 10);
    const currentFilters: IncidentFilters = {
      ...localFilters,
      search: debouncedSearch || undefined,
    };

    dispatch(setFilters(currentFilters));
    dispatch(fetchIncidents({ page, limit: 20, filters: currentFilters }));
  }, [dispatch, searchParams, localFilters, debouncedSearch]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

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

  const columns: Column<Incident>[] = [
    {
      key: 'incidentNumber',
      header: 'ID',
      sortable: true,
      width: '120px',
      render: (_, row) => (
        <span className="font-mono text-sm text-primary-600">{row.incidentNumber}</span>
      ),
    },
    {
      key: 'title',
      header: 'Title',
      sortable: true,
      render: (_, row) => (
        <div className="max-w-md">
          <p className="font-medium text-gray-900 truncate">{row.title}</p>
          <p className="text-xs text-gray-500 truncate">{row.description}</p>
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
      width: '120px',
      render: (_, row) => <StatusBadge status={row.status} />,
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
    { value: 'in_progress', label: 'In Progress' },
    { value: 'pending', label: 'Pending' },
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

  const categoryOptions = [
    { value: '', label: 'All Categories' },
    { value: 'hardware', label: 'Hardware' },
    { value: 'software', label: 'Software' },
    { value: 'network', label: 'Network' },
    { value: 'security', label: 'Security' },
    { value: 'access', label: 'Access' },
    { value: 'database', label: 'Database' },
    { value: 'other', label: 'Other' },
  ];

  // Stats bar
  const stats = [
    { label: 'Total', value: pagination.total, color: 'text-gray-900' },
    { label: 'Critical', value: incidents.filter((i) => i.priority === 'critical').length, color: 'text-danger-600' },
    { label: 'High', value: incidents.filter((i) => i.priority === 'high').length, color: 'text-warning-600' },
    { label: 'Open', value: incidents.filter((i) => i.status === 'open').length, color: 'text-primary-600' },
    { label: 'In Progress', value: incidents.filter((i) => i.status === 'in_progress').length, color: 'text-orange-600' },
  ];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Incidents</h1>
          <p className="text-gray-500 mt-1">Manage and track all IT incidents</p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" leftIcon={<Download size={16} />}>
            Export
          </Button>
          <Link to="/incidents/create">
            <Button leftIcon={<Plus size={16} />}>New Incident</Button>
          </Link>
        </div>
      </div>

      {/* Stats Row */}
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

      {/* Filters */}
      <Card>
        <CardBody>
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex-1 min-w-[200px] max-w-md">
              <Input
                placeholder="Search incidents..."
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
            <Select
              options={categoryOptions}
              value={localFilters.category || ''}
              onChange={(e) => handleFilterChange('category', e.target.value)}
              className="w-40"
            />
            <Button
              variant="ghost"
              leftIcon={<RefreshCw size={16} />}
              onClick={fetchData}
            >
              Refresh
            </Button>
          </div>
        </CardBody>
      </Card>

      {/* Incidents Table */}
      {incidents.length === 0 && !isLoading ? (
        <Card>
          <EmptyState
            variant="empty"
            title="No incidents found"
            description="No incidents match your current filters. Try adjusting your search or create a new incident."
            action={{
              label: 'Create Incident',
              onClick: () => navigate('/incidents/create'),
            }}
          />
        </Card>
      ) : (
        <>
          <Table
            columns={columns}
            data={incidents}
            keyField="id"
            isLoading={isLoading}
            onRowClick={(row) => navigate(`/incidents/${row.id}`)}
            sortable
          />

          {pagination.totalPages > 1 && (
            <Pagination
              currentPage={pagination.page}
              totalPages={pagination.totalPages}
              totalItems={pagination.total}
              itemsPerPage={pagination.limit}
              onPageChange={handlePageChange}
            />
          )}
        </>
      )}
    </div>
  );
};

export default IncidentsListPage;
