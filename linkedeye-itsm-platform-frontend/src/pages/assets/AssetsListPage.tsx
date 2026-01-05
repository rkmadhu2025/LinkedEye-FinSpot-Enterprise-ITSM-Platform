import { useEffect, useState, useCallback } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Plus, Search, Download, RefreshCw, Server, Monitor, HardDrive, Wrench } from 'lucide-react';
import {
  Card,
  CardBody,
  Button,
  Input,
  Select,
  Table,
  Pagination,
  Badge,
  PriorityBadge,
  EmptyState,
  StatsCard,
} from '@/components/ui';
import { useAppDispatch, useAppSelector } from '@/hooks/useRedux';
import { fetchAssets, setFilters } from '@/store/slices/assetsSlice';
import { Asset, AssetFilters, AssetStatus, AssetType, Priority } from '@/types';
import { format } from 'date-fns';
import { useDebounce } from '@/hooks/useDebounce';
import type { Column } from '@/components/ui/Table';

const AssetsListPage = () => {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const [searchParams, setSearchParams] = useSearchParams();

  const { assets, pagination, isLoading } = useAppSelector((state) => state.assets);

  const [searchQuery, setSearchQuery] = useState(searchParams.get('search') || '');
  const debouncedSearch = useDebounce(searchQuery, 300);

  const [localFilters, setLocalFilters] = useState<AssetFilters>({
    status: (searchParams.get('status') as AssetStatus) || undefined,
    assetType: (searchParams.get('assetType') as AssetType) || undefined,
    criticality: (searchParams.get('criticality') as Priority) || undefined,
  });

  const fetchData = useCallback(() => {
    const page = parseInt(searchParams.get('page') || '1', 10);
    const currentFilters: AssetFilters = {
      ...localFilters,
      search: debouncedSearch || undefined,
    };

    dispatch(setFilters(currentFilters));
    dispatch(fetchAssets({ page, limit: 20, filters: currentFilters }));
  }, [dispatch, searchParams, localFilters, debouncedSearch]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handlePageChange = (page: number) => {
    const params = new URLSearchParams(searchParams);
    params.set('page', String(page));
    setSearchParams(params);
  };

  const handleFilterChange = (key: keyof AssetFilters, value: string) => {
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

  const getStatusBadge = (status: AssetStatus) => {
    const statusConfig: Record<AssetStatus, { label: string; variant: 'success' | 'warning' | 'danger' | 'info' | 'default' }> = {
      active: { label: 'Active', variant: 'success' },
      inactive: { label: 'Inactive', variant: 'default' },
      maintenance: { label: 'Maintenance', variant: 'warning' },
      retired: { label: 'Retired', variant: 'info' },
      disposed: { label: 'Disposed', variant: 'danger' },
    };
    const config = statusConfig[status] || statusConfig.active;
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const getAssetTypeIcon = (type: AssetType) => {
    const icons: Record<AssetType, React.ReactNode> = {
      server: <Server size={16} className="text-blue-600" />,
      workstation: <Monitor size={16} className="text-green-600" />,
      laptop: <Monitor size={16} className="text-purple-600" />,
      network_device: <HardDrive size={16} className="text-orange-600" />,
      storage: <HardDrive size={16} className="text-gray-600" />,
      virtual_machine: <Server size={16} className="text-indigo-600" />,
      application: <Monitor size={16} className="text-pink-600" />,
      database: <HardDrive size={16} className="text-yellow-600" />,
      service: <Server size={16} className="text-cyan-600" />,
      other: <HardDrive size={16} className="text-gray-400" />,
    };
    return icons[type] || icons.other;
  };

  const columns: Column<Asset>[] = [
    {
      key: 'assetTag',
      header: 'Asset Tag',
      sortable: true,
      width: '120px',
      render: (_, row) => (
        <span className="font-mono text-sm text-primary-600">{row.assetTag}</span>
      ),
    },
    {
      key: 'name',
      header: 'Name',
      sortable: true,
      render: (_, row) => (
        <div className="flex items-center gap-2">
          {getAssetTypeIcon(row.assetType)}
          <div>
            <p className="font-medium text-gray-900">{row.name}</p>
            <p className="text-xs text-gray-500 capitalize">{row.assetType.replace('_', ' ')}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      sortable: true,
      width: '120px',
      render: (_, row) => getStatusBadge(row.status),
    },
    {
      key: 'criticality',
      header: 'Criticality',
      sortable: true,
      width: '100px',
      render: (_, row) => <PriorityBadge priority={row.criticality} />,
    },
    {
      key: 'location',
      header: 'Location',
      width: '150px',
      render: (_, row) => (
        <span className="text-sm text-gray-600">{row.location || '-'}</span>
      ),
    },
    {
      key: 'ipAddress',
      header: 'IP Address',
      width: '140px',
      render: (_, row) => (
        <span className="font-mono text-sm text-gray-600">{row.ipAddress || '-'}</span>
      ),
    },
    {
      key: 'environment',
      header: 'Environment',
      width: '120px',
      render: (_, row) => (
        <span className="text-sm text-gray-600">{row.environment?.name || '-'}</span>
      ),
    },
    {
      key: 'updatedAt',
      header: 'Last Updated',
      sortable: true,
      width: '140px',
      render: (_, row) => (
        <span className="text-sm text-gray-600">
          {format(new Date(row.updatedAt), 'MMM d, yyyy')}
        </span>
      ),
    },
  ];

  const typeOptions = [
    { value: '', label: 'All Types' },
    { value: 'server', label: 'Servers' },
    { value: 'workstation', label: 'Workstations' },
    { value: 'laptop', label: 'Laptops' },
    { value: 'network_device', label: 'Network Devices' },
    { value: 'storage', label: 'Storage' },
    { value: 'virtual_machine', label: 'Virtual Machines' },
    { value: 'application', label: 'Applications' },
    { value: 'database', label: 'Databases' },
    { value: 'service', label: 'Services' },
  ];

  const statusOptions = [
    { value: '', label: 'All Statuses' },
    { value: 'active', label: 'Active' },
    { value: 'inactive', label: 'Inactive' },
    { value: 'maintenance', label: 'Maintenance' },
    { value: 'retired', label: 'Retired' },
    { value: 'disposed', label: 'Disposed' },
  ];

  const criticalityOptions = [
    { value: '', label: 'All Criticality' },
    { value: 'critical', label: 'Critical' },
    { value: 'high', label: 'High' },
    { value: 'medium', label: 'Medium' },
    { value: 'low', label: 'Low' },
  ];

  // Calculate stats from assets
  const stats = {
    total: pagination.total,
    active: assets.filter((a) => a.status === 'active').length,
    maintenance: assets.filter((a) => a.status === 'maintenance').length,
    critical: assets.filter((a) => a.criticality === 'critical').length,
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Assets</h1>
          <p className="text-gray-500 mt-1">Manage your IT asset inventory (CMDB)</p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" leftIcon={<Download size={16} />}>
            Export
          </Button>
          <Link to="/assets/create">
            <Button leftIcon={<Plus size={16} />}>Add Asset</Button>
          </Link>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatsCard
          title="Total Assets"
          value={stats.total.toString()}
          icon={<Server size={24} />}
        />
        <StatsCard
          title="Active"
          value={stats.active.toString()}
          icon={<Monitor size={24} />}
          variant="success"
        />
        <StatsCard
          title="In Maintenance"
          value={stats.maintenance.toString()}
          icon={<Wrench size={24} />}
          variant="high"
        />
        <StatsCard
          title="Critical Assets"
          value={stats.critical.toString()}
          icon={<HardDrive size={24} />}
          variant="critical"
        />
      </div>

      {/* Filters */}
      <Card>
        <CardBody>
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex-1 min-w-[200px] max-w-md">
              <Input
                placeholder="Search assets..."
                value={searchQuery}
                onChange={(e) => handleSearchChange(e.target.value)}
                leftIcon={<Search size={18} />}
              />
            </div>
            <Select
              options={typeOptions}
              value={localFilters.assetType?.toString() || ''}
              onChange={(e) => handleFilterChange('assetType', e.target.value)}
              className="w-40"
            />
            <Select
              options={statusOptions}
              value={localFilters.status?.toString() || ''}
              onChange={(e) => handleFilterChange('status', e.target.value)}
              className="w-40"
            />
            <Select
              options={criticalityOptions}
              value={localFilters.criticality || ''}
              onChange={(e) => handleFilterChange('criticality', e.target.value)}
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

      {/* Assets Table */}
      {assets.length === 0 && !isLoading ? (
        <Card>
          <EmptyState
            variant="empty"
            title="No assets found"
            description="No assets match your current filters. Try adjusting your search or add a new asset."
            action={{
              label: 'Add Asset',
              onClick: () => navigate('/assets/create'),
            }}
          />
        </Card>
      ) : (
        <>
          <Table
            columns={columns}
            data={assets}
            keyField="id"
            isLoading={isLoading}
            onRowClick={(row) => navigate(`/assets/${row.id}`)}
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

export default AssetsListPage;
