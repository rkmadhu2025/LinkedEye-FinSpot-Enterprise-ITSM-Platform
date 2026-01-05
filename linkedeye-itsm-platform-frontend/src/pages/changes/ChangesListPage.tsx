import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Plus, Search, Calendar, Download, RefreshCw } from 'lucide-react';
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
  Badge,
  Avatar,
  EmptyState,
} from '@/components/ui';
import { useAppDispatch, useAppSelector } from '@/hooks/useRedux';
import { fetchChanges, setFilters } from '@/store/slices/changesSlice';
import { ChangeRequest, ChangeFilters, ChangeStatus, ChangeType, ChangeRisk } from '@/types';
import { format } from 'date-fns';
import type { Column } from '@/components/ui/Table';

const ChangesListPage = () => {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const [searchParams, setSearchParams] = useSearchParams();

  const { changes, pagination, isLoading, filters } = useAppSelector((state) => state.changes);

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

  const columns: Column<ChangeRequest>[] = [
    {
      key: 'changeNumber',
      header: 'ID',
      sortable: true,
      width: '120px',
      render: (_, row) => (
        <span className="font-mono text-sm text-primary-600">{row.changeNumber}</span>
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
      key: 'changeType',
      header: 'Type',
      width: '100px',
      render: (_, row) => {
        const typeColors: Record<string, string> = {
          standard: 'bg-gray-100 text-gray-800',
          normal: 'bg-blue-100 text-blue-800',
          emergency: 'bg-red-100 text-red-800',
        };
        return (
          <Badge className={typeColors[row.changeType] || typeColors.normal}>
            {row.changeType}
          </Badge>
        );
      },
    },
    {
      key: 'risk',
      header: 'Risk',
      width: '100px',
      render: (_, row) => <PriorityBadge priority={row.risk} />,
    },
    {
      key: 'status',
      header: 'Status',
      sortable: true,
      width: '140px',
      render: (_, row) => <StatusBadge status={row.status} />,
    },
    {
      key: 'scheduledStart',
      header: 'Scheduled',
      sortable: true,
      width: '150px',
      render: (_, row) => (
        row.scheduledStart ? (
          <span className="text-sm text-gray-600">
            {format(new Date(row.scheduledStart), 'MMM d, h:mm a')}
          </span>
        ) : (
          <span className="text-gray-400">Not scheduled</span>
        )
      ),
    },
    {
      key: 'requester',
      header: 'Requester',
      width: '150px',
      render: (_, row) => (
        row.requester ? (
          <div className="flex items-center gap-2">
            <Avatar name={`${row.requester.firstName} ${row.requester.lastName}`} size="sm" />
            <span className="text-sm truncate">{row.requester.firstName}</span>
          </div>
        ) : (
          <span className="text-gray-400">-</span>
        )
      ),
    },
  ];

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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Change Management</h1>
          <p className="text-gray-500 mt-1">Manage change requests and approvals</p>
        </div>
        <div className="flex items-center gap-3">
          <Link to="/changes/calendar">
            <Button variant="outline" leftIcon={<Calendar size={16} />}>
              Calendar View
            </Button>
          </Link>
          <Button variant="outline" leftIcon={<Download size={16} />}>
            Export
          </Button>
          <Link to="/changes/create">
            <Button leftIcon={<Plus size={16} />}>New Change</Button>
          </Link>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardBody>
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex-1 min-w-[200px] max-w-md">
              <Input
                placeholder="Search changes..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                leftIcon={<Search size={18} />}
              />
            </div>
            <Select
              options={statusOptions}
              value={localFilters.status || ''}
              onChange={(e) => handleFilterChange('status', e.target.value)}
              className="w-44"
            />
            <Select
              options={typeOptions}
              value={localFilters.changeType || ''}
              onChange={(e) => handleFilterChange('changeType', e.target.value)}
              className="w-36"
            />
            <Select
              options={riskOptions}
              value={localFilters.risk || ''}
              onChange={(e) => handleFilterChange('risk', e.target.value)}
              className="w-40"
            />
            <Button variant="ghost" leftIcon={<RefreshCw size={16} />}>
              Refresh
            </Button>
          </div>
        </CardBody>
      </Card>

      {/* Table */}
      {changes.length === 0 && !isLoading ? (
        <Card>
          <EmptyState
            variant="empty"
            title="No changes found"
            description="No changes match your current filters."
            action={{
              label: 'Create Change',
              onClick: () => navigate('/changes/create'),
            }}
          />
        </Card>
      ) : (
        <>
          <Table
            columns={columns}
            data={changes}
            keyField="id"
            isLoading={isLoading}
            onRowClick={(row) => navigate(`/changes/${row.id}`)}
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

export default ChangesListPage;
