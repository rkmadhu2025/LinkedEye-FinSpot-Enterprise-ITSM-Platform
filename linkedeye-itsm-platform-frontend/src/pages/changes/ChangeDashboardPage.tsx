/**
 * Change Management Dashboard
 * Comprehensive overview of change requests with statistics, charts, and visualizations
 */

import React, { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Plus,
  Calendar,
  TrendingUp,
  TrendingDown,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  GitBranch,
  Zap,
  Activity,
  BarChart3,
  Filter,
  RefreshCw,
  ArrowRight,
  Users,
  Shield,
  FileText,
  List,
  CalendarCheck,
  Hourglass,
  Snowflake,
  Ban,
} from 'lucide-react';
import { Card, CardBody, CardHeader, Button, Badge, Select, Spinner } from '@/components/ui';
import { useAppDispatch, useAppSelector } from '@/hooks/useRedux';
import { fetchChanges } from '@/store/slices/changesSlice';
import { ChangeRequest, ChangeStatus, ChangeType, ChangeRisk } from '@/types';
import { format, formatDistanceToNow } from 'date-fns';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import clsx from 'clsx';

const COLORS = {
  approved: '#10b981',
  pending: '#f59e0b',
  rejected: '#ef4444',
  inProgress: '#3b82f6',
  completed: '#10b981',
  cancelled: '#6b7280',
  emergency: '#ef4444',
  normal: '#3b82f6',
  standard: '#10b981',
  low: '#10b981',
  medium: '#f59e0b',
  high: '#ef4444',
};

const ChangeDashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { changes, isLoading } = useAppSelector((state) => state.changes);
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d'>('30d');
  const [filter, setFilter] = useState<'all' | ChangeStatus>('all');

  useEffect(() => {
    dispatch(fetchChanges({ page: 1, limit: 100 }));
  }, [dispatch]);

  const filteredChanges = useMemo(() => {
    let filtered = changes;
    if (filter !== 'all') {
      filtered = filtered.filter(c => c.status === filter);
    }
    return filtered;
  }, [changes, filter]);

  // Statistics
  const stats = useMemo(() => {
    const total = filteredChanges.length;
    const byStatus = {
      pending: filteredChanges.filter(c => c.status === 'pending').length,
      approved: filteredChanges.filter(c => c.status === 'approved').length,
      inProgress: filteredChanges.filter(c => c.status === 'in_progress').length,
      completed: filteredChanges.filter(c => c.status === 'completed').length,
      rejected: filteredChanges.filter(c => c.status === 'rejected').length,
      cancelled: filteredChanges.filter(c => c.status === 'cancelled').length,
    };
    const byType = {
      emergency: filteredChanges.filter(c => c.changeType === 'emergency').length,
      normal: filteredChanges.filter(c => c.changeType === 'normal').length,
      standard: filteredChanges.filter(c => c.changeType === 'standard').length,
    };
    const byRisk = {
      low: filteredChanges.filter(c => c.risk === 'low').length,
      medium: filteredChanges.filter(c => c.risk === 'medium').length,
      high: filteredChanges.filter(c => c.risk === 'high').length,
    };
    const overdue = filteredChanges.filter(c => {
      if (!c.scheduledEnd || c.status === 'completed' || c.status === 'cancelled') return false;
      return new Date(c.scheduledEnd) < new Date();
    }).length;

    return { total, byStatus, byType, byRisk, overdue };
  }, [filteredChanges]);

  // Chart data
  const trendData = useMemo(() => {
    const days = timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : 90;
    const data: { date: string; created: number; completed: number }[] = [];
    const now = new Date();

    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      const dateStr = format(date, 'MMM d');

      const created = filteredChanges.filter(c => {
        const createdDate = new Date(c.createdAt);
        return format(createdDate, 'yyyy-MM-dd') === format(date, 'yyyy-MM-dd');
      }).length;

      const completed = filteredChanges.filter(c => {
        if (c.status !== 'completed' || !c.updatedAt) return false;
        const completedDate = new Date(c.updatedAt);
        return format(completedDate, 'yyyy-MM-dd') === format(date, 'yyyy-MM-dd');
      }).length;

      data.push({ date: dateStr, created, completed });
    }

    return data;
  }, [filteredChanges, timeRange]);

  const statusDistribution = useMemo(() => {
    return [
      { name: 'Completed', value: stats.byStatus.completed, color: COLORS.completed },
      { name: 'In Progress', value: stats.byStatus.inProgress, color: COLORS.inProgress },
      { name: 'Approved', value: stats.byStatus.approved, color: COLORS.approved },
      { name: 'Pending', value: stats.byStatus.pending, color: COLORS.pending },
      { name: 'Rejected', value: stats.byStatus.rejected, color: COLORS.rejected },
      { name: 'Cancelled', value: stats.byStatus.cancelled, color: COLORS.cancelled },
    ].filter(item => item.value > 0);
  }, [stats]);

  const riskDistribution = useMemo(() => {
    return [
      { name: 'Low Risk', value: stats.byRisk.low, color: COLORS.low },
      { name: 'Medium Risk', value: stats.byRisk.medium, color: COLORS.medium },
      { name: 'High Risk', value: stats.byRisk.high, color: COLORS.high },
    ].filter(item => item.value > 0);
  }, [stats]);

  // Recent changes
  const recentChanges = useMemo(() => {
    return [...filteredChanges]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 10);
  }, [filteredChanges]);

  // Scheduled this week
  const scheduledThisWeek = useMemo(() => {
    const now = new Date();
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - now.getDay());
    weekStart.setHours(0, 0, 0, 0);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 7);
    return filteredChanges.filter(c => {
      if (!c.scheduledStart) return false;
      const scheduled = new Date(c.scheduledStart);
      return scheduled >= weekStart && scheduled <= weekEnd;
    }).length;
  }, [filteredChanges]);

  const getStatusBadge = (status: ChangeStatus) => {
    const configs: Record<ChangeStatus, { color: string; label: string }> = {
      pending: { color: 'bg-yellow-100 text-yellow-800', label: 'Pending' },
      approved: { color: 'bg-blue-100 text-blue-800', label: 'Approved' },
      in_progress: { color: 'bg-indigo-100 text-indigo-800', label: 'In Progress' },
      completed: { color: 'bg-green-100 text-green-800', label: 'Completed' },
      rejected: { color: 'bg-red-100 text-red-800', label: 'Rejected' },
      cancelled: { color: 'bg-gray-100 text-gray-800', label: 'Cancelled' },
    };
    const config = configs[status] || configs.pending;
    return <Badge className={config.color}>{config.label}</Badge>;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Change Management Dashboard</h1>
          <p className="text-gray-500 mt-1">Overview of change requests and their status</p>
        </div>
        <div className="flex items-center gap-2">
          <Link to="/changes/calendar">
            <Button variant="outline" leftIcon={<Calendar size={16} />}>
              Calendar View
            </Button>
          </Link>
          <Link to="/changes">
            <Button variant="outline" leftIcon={<List size={16} />}>
              List View
            </Button>
          </Link>
          <Link to="/changes/create">
            <Button leftIcon={<Plus size={16} />}>New Change</Button>
          </Link>
        </div>
      </div>

      {/* Stats Cards - Matching Reference Design */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card padding="sm">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center">
              <CalendarCheck className="text-blue-600" size={24} />
            </div>
            <div>
              <p className="text-sm text-gray-500">Scheduled This Week</p>
              <p className="text-2xl font-bold text-gray-900">{scheduledThisWeek}</p>
            </div>
          </div>
        </Card>

        <Card padding="sm">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-green-100 flex items-center justify-center">
              <CheckCircle className="text-green-600" size={24} />
            </div>
            <div>
              <p className="text-sm text-gray-500">Approved</p>
              <p className="text-2xl font-bold text-gray-900">{stats.byStatus.approved}</p>
            </div>
          </div>
        </Card>

        <Card padding="sm">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-yellow-100 flex items-center justify-center">
              <Hourglass className="text-yellow-600" size={24} />
            </div>
            <div>
              <p className="text-sm text-gray-500">Pending Approval</p>
              <p className="text-2xl font-bold text-gray-900">{stats.byStatus.pending}</p>
            </div>
          </div>
        </Card>

        <Card padding="sm">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-red-100 flex items-center justify-center">
              <Snowflake className="text-red-600" size={24} />
            </div>
            <div>
              <p className="text-sm text-gray-500">Freeze Windows</p>
              <p className="text-2xl font-bold text-gray-900">2</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardBody>
          <div className="flex flex-wrap gap-4 items-center">
            <Select
              options={[
                { value: 'all', label: 'All Status' },
                { value: 'pending', label: 'Pending' },
                { value: 'approved', label: 'Approved' },
                { value: 'in_progress', label: 'In Progress' },
                { value: 'completed', label: 'Completed' },
                { value: 'rejected', label: 'Rejected' },
                { value: 'cancelled', label: 'Cancelled' },
              ]}
              value={filter}
              onChange={(e) => setFilter(e.target.value as any)}
              className="w-40"
            />
            <Select
              options={[
                { value: '7d', label: 'Last 7 Days' },
                { value: '30d', label: 'Last 30 Days' },
                { value: '90d', label: 'Last 90 Days' },
              ]}
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value as any)}
              className="w-40"
            />
          </div>
        </CardBody>
      </Card>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Trend Chart */}
        <Card>
          <CardHeader>
            <h3 className="text-lg font-semibold">Change Trend</h3>
          </CardHeader>
          <CardBody>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Area type="monotone" dataKey="created" stackId="1" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.6} name="Created" />
                <Area type="monotone" dataKey="completed" stackId="1" stroke="#10b981" fill="#10b981" fillOpacity={0.6} name="Completed" />
              </AreaChart>
            </ResponsiveContainer>
          </CardBody>
        </Card>

        {/* Status Distribution */}
        <Card>
          <CardHeader>
            <h3 className="text-lg font-semibold">Status Distribution</h3>
          </CardHeader>
          <CardBody>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={statusDistribution}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {statusDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardBody>
        </Card>

        {/* Risk Distribution */}
        <Card>
          <CardHeader>
            <h3 className="text-lg font-semibold">Risk Distribution</h3>
          </CardHeader>
          <CardBody>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={riskDistribution}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="value" fill="#3b82f6">
                  {riskDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardBody>
        </Card>

        {/* Type Distribution */}
        <Card>
          <CardHeader>
            <h3 className="text-lg font-semibold">Change Type Breakdown</h3>
          </CardHeader>
          <CardBody>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <Zap className="text-red-500" size={20} />
                  <span className="text-sm font-medium">Emergency</span>
                </div>
                <span className="text-sm font-bold">{stats.byType.emergency}</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <GitBranch className="text-blue-500" size={20} />
                  <span className="text-sm font-medium">Normal</span>
                </div>
                <span className="text-sm font-bold">{stats.byType.normal}</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <FileText className="text-green-500" size={20} />
                  <span className="text-sm font-medium">Standard</span>
                </div>
                <span className="text-sm font-bold">{stats.byType.standard}</span>
              </div>
            </div>
          </CardBody>
        </Card>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Changes List - Enhanced with Icons */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Upcoming Changes</h3>
                <Link to="/changes">
                  <Button variant="ghost" size="sm" rightIcon={<ArrowRight size={16} />}>
                    View All
                  </Button>
                </Link>
              </div>
            </CardHeader>
            <CardBody>
              {isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Spinner size="lg" />
                </div>
              ) : recentChanges.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  No changes found
                </div>
              ) : (
                <div className="space-y-3">
                  {recentChanges.slice(0, 8).map((change) => {
                    const getStatusIcon = () => {
                      if (change.status === 'approved') return <CheckCircle className="text-green-600" size={16} />;
                      if (change.status === 'in_progress' || change.status === 'scheduled') return <Clock className="text-blue-600" size={16} />;
                      if (change.status === 'pending') return <Hourglass className="text-yellow-600" size={16} />;
                      return <Clock className="text-gray-400" size={16} />;
                    };
                    
                    const getTypeColor = () => {
                      if (change.changeType === 'emergency') return 'border-l-red-500 bg-red-50/50';
                      if (change.changeType === 'normal') return 'border-l-blue-500 bg-blue-50/50';
                      return 'border-l-green-500 bg-green-50/50';
                    };

                    return (
                      <Link
                        key={change.id}
                        to={`/changes/${change.id}`}
                        className={clsx(
                          'block p-4 rounded-lg border-l-4 transition-all hover:shadow-md hover:translate-x-1',
                          getTypeColor()
                        )}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-start gap-3 flex-1">
                            <div className={clsx(
'w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0',
change.status === 'approved' ? 'bg-green-100' :
change.status === 'in_progress' || change.status === 'scheduled' ? 'bg-blue-100' :
change.status === 'pending' ? 'bg-yellow-100' : 'bg-gray-100'
)}>
                              {getStatusIcon()}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="font-semibold text-blue-600 text-sm">
                                  {change.changeNumber || change.id.slice(0, 8).toUpperCase()}
                                </span>
                                <Badge
                                  className={clsx(
                                    'text-xs',
                                    change.status === 'approved' ? 'bg-green-100 text-green-800' :
                                    change.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                                    change.status === 'in_progress' || change.status === 'scheduled' ? 'bg-blue-100 text-blue-800' :
                                    'bg-gray-100 text-gray-800'
                                  )}
                                >
                                  {change.status === 'in_progress' ? 'Scheduled' : change.status}
                                </Badge>
                              </div>
                              <p className="text-sm font-medium text-gray-900 mb-2">{change.title}</p>
                              <div className="flex items-center gap-4 text-xs text-gray-500">
                                {change.scheduledStart && (
                                  <span className="flex items-center gap-1">
                                    <Calendar size={12} />
                                    {format(new Date(change.scheduledStart), 'MMM d, h:mm a')}
                                  </span>
                                )}
                                {change.requester && (
                                  <span className="flex items-center gap-1">
                                    <Users size={12} />
                                    {change.requester.firstName} {change.requester.lastName}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              )}
            </CardBody>
          </Card>
        </div>

        {/* Freeze Windows Sidebar */}
        <div>
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Snowflake className="text-red-500" size={18} />
                <h3 className="text-lg font-semibold">Freeze Windows</h3>
              </div>
            </CardHeader>
            <CardBody>
              <div className="space-y-3">
                {/* Mock freeze windows - in production, fetch from API */}
                <div className="p-3 bg-red-50 border border-dashed border-red-300 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Ban className="text-red-600" size={16} />
                    <span className="font-semibold text-red-900 text-sm">Year-End Freeze</span>
                  </div>
                  <div className="text-xs text-gray-600 mb-1">Dec 24 - Dec 25, 2025</div>
                  <div className="text-xs text-gray-500">Holiday freeze - No production changes</div>
                </div>
                <div className="p-3 bg-red-50 border border-dashed border-red-300 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Ban className="text-red-600" size={16} />
                    <span className="font-semibold text-red-900 text-sm">New Year Freeze</span>
                  </div>
                  <div className="text-xs text-gray-600 mb-1">Dec 31 - Jan 1, 2026</div>
                  <div className="text-xs text-gray-500">New Year holiday - Emergency only</div>
                </div>
              </div>
            </CardBody>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default ChangeDashboardPage;
