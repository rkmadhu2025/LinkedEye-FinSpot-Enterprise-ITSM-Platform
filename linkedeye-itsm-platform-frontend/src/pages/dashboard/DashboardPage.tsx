import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertCircle,
  RefreshCw,
  TrendingUp,
  Clock,
  CheckCircle,
  AlertTriangle,
  Activity,
  Server,
  Zap,
} from 'lucide-react';
import { Card, CardHeader, CardBody, StatsCard, StatusBadge, PriorityBadge, Button, Avatar, EmptyState, Spinner } from '@/components/ui';
import { dashboardService } from '@/services/dashboardService';
import { DashboardStats, Environment } from '@/types';
import clsx from 'clsx';
import toast from 'react-hot-toast';

const DashboardPage = () => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchStats = useCallback(async (showRefreshToast = false) => {
    try {
      if (showRefreshToast) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }
      setError(null);
      const data = await dashboardService.getStats();
      setStats(data);
      if (showRefreshToast) {
        toast.success('Dashboard refreshed');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch dashboard stats';
      setError(errorMessage);
      toast.error('Failed to load dashboard data');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  const handleRefresh = () => {
    fetchStats(true);
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-64">
        <Spinner size="lg" />
        <p className="mt-4 text-gray-500">Loading dashboard...</p>
      </div>
    );
  }

  // Error state with retry
  if (error && !stats) {
    return (
      <div className="flex items-center justify-center h-64">
        <Card className="max-w-md w-full">
          <EmptyState
            variant="error"
            title="Failed to load dashboard"
            description={error}
            action={{
              label: 'Try Again',
              onClick: () => fetchStats(),
            }}
          />
        </Card>
      </div>
    );
  }

  // No data state
  if (!stats) {
    return (
      <div className="flex items-center justify-center h-64">
        <Card className="max-w-md w-full">
          <EmptyState
            variant="empty"
            title="No data available"
            description="Dashboard data is not available yet. Please check your API connection."
            action={{
              label: 'Refresh',
              onClick: () => fetchStats(),
            }}
          />
        </Card>
      </div>
    );
  }

  // Sample recent incidents (would come from API in production)
  const recentIncidents = [
    { id: 'INC0015847', title: 'Database connection pool exhaustion', priority: 'critical' as const, status: 'in_progress', assignee: 'John Doe', age: '2h' },
    { id: 'INC0015846', title: 'API Gateway timeout errors', priority: 'high' as const, status: 'open', assignee: 'Jane Smith', age: '4h' },
    { id: 'INC0015845', title: 'SSL certificate expiring soon', priority: 'medium' as const, status: 'pending', assignee: 'Bob Wilson', age: '6h' },
    { id: 'INC0015844', title: 'User unable to access dashboard', priority: 'low' as const, status: 'open', assignee: 'Alice Brown', age: '8h' },
  ];

  const upcomingChanges = [
    { id: 'CHG0012456', title: 'Database migration v2.5', type: 'normal', scheduledFor: 'Today, 10:00 PM', risk: 'high' as const },
    { id: 'CHG0012455', title: 'Security patch deployment', type: 'standard', scheduledFor: 'Tomorrow, 2:00 AM', risk: 'medium' as const },
    { id: 'CHG0012454', title: 'Network switch upgrade', type: 'normal', scheduledFor: 'Dec 28, 6:00 PM', risk: 'low' as const },
  ];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-500 mt-1">Overview of your IT service management</p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            leftIcon={<RefreshCw size={16} className={isRefreshing ? 'animate-spin' : ''} />}
            onClick={handleRefresh}
            disabled={isRefreshing}
          >
            {isRefreshing ? 'Refreshing...' : 'Refresh'}
          </Button>
          <Link to="/incidents/create">
            <Button leftIcon={<AlertCircle size={16} />}>New Incident</Button>
          </Link>
        </div>
      </div>

      {/* Incident Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <StatsCard
          title="Critical"
          value={stats.incidents.critical}
          variant="critical"
          icon={<AlertCircle size={24} />}
          change={{ value: -15, type: 'decrease', period: 'vs last week' }}
        />
        <StatsCard
          title="High Priority"
          value={stats.incidents.high}
          variant="high"
          icon={<AlertTriangle size={24} />}
          change={{ value: 8, type: 'increase', period: 'vs last week' }}
        />
        <StatsCard
          title="Medium Priority"
          value={stats.incidents.medium}
          variant="medium"
          icon={<Activity size={24} />}
          change={{ value: 0, type: 'neutral' }}
        />
        <StatsCard
          title="Low Priority"
          value={stats.incidents.low}
          variant="low"
          icon={<Clock size={24} />}
        />
        <StatsCard
          title="Resolved Today"
          value={stats.incidents.resolvedToday}
          variant="success"
          icon={<CheckCircle size={24} />}
          change={{ value: 25, type: 'increase', period: 'vs yesterday' }}
        />
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card padding="sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Open Incidents</p>
              <p className="text-2xl font-bold text-gray-900">{stats.incidents.open}</p>
            </div>
            <div className="p-2 bg-blue-100 rounded-lg">
              <AlertCircle size={20} className="text-blue-600" />
            </div>
          </div>
        </Card>
        <Card padding="sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">SLA Breached</p>
              <p className="text-2xl font-bold text-danger-600">{stats.incidents.slaBreached}</p>
            </div>
            <div className="p-2 bg-red-100 rounded-lg">
              <Clock size={20} className="text-red-600" />
            </div>
          </div>
        </Card>
        <Card padding="sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Pending Changes</p>
              <p className="text-2xl font-bold text-gray-900">{stats.changes.pending}</p>
            </div>
            <div className="p-2 bg-yellow-100 rounded-lg">
              <Activity size={20} className="text-yellow-600" />
            </div>
          </div>
        </Card>
        <Card padding="sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Total Assets</p>
              <p className="text-2xl font-bold text-gray-900">{stats.assets.total.toLocaleString()}</p>
            </div>
            <div className="p-2 bg-green-100 rounded-lg">
              <Server size={20} className="text-green-600" />
            </div>
          </div>
        </Card>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Incidents */}
        <div className="lg:col-span-2">
          <Card padding="none">
            <CardHeader actions={<Link to="/incidents" className="text-sm text-primary-600 hover:text-primary-700">View all</Link>}>
              Recent Incidents
            </CardHeader>
            <div className="divide-y divide-gray-100">
              {recentIncidents.map((incident) => (
                <Link
                  key={incident.id}
                  to={`/incidents/${incident.id}`}
                  className="flex items-center justify-between px-5 py-4 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center gap-4 min-w-0">
                    <div className="flex-shrink-0">
                      <PriorityBadge priority={incident.priority} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{incident.title}</p>
                      <p className="text-xs text-gray-500">{incident.id} • {incident.age} ago</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <Avatar name={incident.assignee} size="sm" />
                    <StatusBadge status={incident.status} />
                  </div>
                </Link>
              ))}
            </div>
          </Card>
        </div>

        {/* Upcoming Changes */}
        <Card padding="none">
          <CardHeader actions={<Link to="/changes" className="text-sm text-primary-600 hover:text-primary-700">View all</Link>}>
            Upcoming Changes
          </CardHeader>
          <div className="divide-y divide-gray-100">
            {upcomingChanges.map((change) => (
              <Link
                key={change.id}
                to={`/changes/${change.id}`}
                className="block px-5 py-4 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-mono text-primary-600">{change.id}</span>
                  <PriorityBadge priority={change.risk} />
                </div>
                <p className="text-sm font-medium text-gray-900 truncate">{change.title}</p>
                <p className="text-xs text-gray-500 mt-1">
                  <Clock size={12} className="inline mr-1" />
                  {change.scheduledFor}
                </p>
              </Link>
            ))}
          </div>
        </Card>
      </div>

      {/* Environment Health */}
      <Card padding="none">
        <CardHeader actions={<Link to="/monitoring" className="text-sm text-primary-600 hover:text-primary-700">View monitoring</Link>}>
          Environment Health
        </CardHeader>
        <CardBody>
          {stats.environments && stats.environments.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {stats.environments.map((env) => (
                <EnvironmentCard key={env.id} environment={env} />
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <Server size={32} className="mx-auto mb-2 text-gray-300" />
              <p>No environments configured</p>
            </div>
          )}
        </CardBody>
      </Card>

      {/* AI Insights Card */}
      <Card className="bg-gradient-to-br from-primary-600 to-indigo-700 text-white border-0">
        <div className="flex items-start gap-4">
          <div className="p-3 bg-white/20 rounded-lg">
            <Zap size={24} />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold mb-2">AI Insights</h3>
            <div className="space-y-3">
              <div className="flex items-start gap-2">
                <AlertTriangle size={16} className="flex-shrink-0 mt-0.5" />
                <p className="text-sm text-white/90">
                  <strong>Pattern Detected:</strong> 3 similar incidents related to API Gateway in the last 24 hours. Consider investigating the root cause.
                </p>
              </div>
              <div className="flex items-start gap-2">
                <TrendingUp size={16} className="flex-shrink-0 mt-0.5" />
                <p className="text-sm text-white/90">
                  <strong>Prediction:</strong> Based on current trends, expect 15% increase in incidents during the upcoming deployment window.
                </p>
              </div>
            </div>
            <Link to="/analytics">
              <Button variant="secondary" size="sm" className="mt-4 bg-white/20 hover:bg-white/30 text-white border-0">
                View All Insights
              </Button>
            </Link>
          </div>
        </div>
      </Card>
    </div>
  );
};

interface EnvironmentCardProps {
  environment: Environment;
}

const EnvironmentCard = ({ environment }: EnvironmentCardProps) => {
  const statusColors = {
    healthy: 'bg-success-500',
    warning: 'bg-warning-500',
    critical: 'bg-danger-500',
    unknown: 'bg-gray-400',
  };

  const statusBg = {
    healthy: 'bg-success-50 border-success-200',
    warning: 'bg-warning-50 border-warning-200',
    critical: 'bg-danger-50 border-danger-200',
    unknown: 'bg-gray-50 border-gray-200',
  };

  return (
    <div className={clsx('rounded-lg border p-4', statusBg[environment.status])}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Server size={18} className="text-gray-600" />
          <span className="font-medium text-gray-900">{environment.name}</span>
        </div>
        <div className={clsx('w-2.5 h-2.5 rounded-full', statusColors[environment.status])} />
      </div>

      <div className="space-y-2">
        <MetricBar label="CPU" value={environment.healthMetrics?.cpuUsage || 0} />
        <MetricBar label="Memory" value={environment.healthMetrics?.memoryUsage || 0} />
        <MetricBar label="Disk" value={environment.healthMetrics?.diskUsage || 0} />
      </div>
    </div>
  );
};

interface MetricBarProps {
  label: string;
  value: number;
}

const MetricBar = ({ label, value }: MetricBarProps) => {
  const getColor = (val: number) => {
    if (val >= 90) return 'bg-danger-500';
    if (val >= 75) return 'bg-warning-500';
    return 'bg-success-500';
  };

  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-gray-600 w-12">{label}</span>
      <div className="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden">
        <div
          className={clsx('h-full rounded-full transition-all', getColor(value))}
          style={{ width: `${value}%` }}
        />
      </div>
      <span className="text-xs font-medium text-gray-700 w-10 text-right">{value}%</span>
    </div>
  );
};

export default DashboardPage;
