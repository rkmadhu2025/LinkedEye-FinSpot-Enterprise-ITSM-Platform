/**
 * Comprehensive Alerts, Metrics, and Logs Visualization Dashboard
 * 
 * Features:
 * - Real-time alerts visualization with charts
 * - Prometheus metrics integration
 * - Loki logs integration
 * - Interactive filtering and time range selection
 * - Grafana dashboard embedding
 */

import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Activity,
  AlertTriangle,
  BarChart3,
  TrendingUp,
  TrendingDown,
  Clock,
  Filter,
  RefreshCw,
  Download,
  Search,
  Calendar,
  Zap,
  Database,
  Server,
  Network,
  Shield,
  Eye,
  EyeOff,
} from 'lucide-react';
import { Card, CardBody, CardHeader, Button, Select, Badge, Spinner } from '@/components/ui';
import { getMonitoringAlerts, type MonitoringAlert, queryLokiLogs } from '@/services/monitoringService';
import { integrationService } from '@/services/integrationService';
import { toast } from 'sonner';
import { useAppSelector } from '@/hooks/useRedux';
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

const COLORS = {
  critical: '#ef4444',
  warning: '#f59e0b',
  info: '#3b82f6',
  healthy: '#10b981',
  resolved: '#6b7280',
};

interface TimeRange {
  label: string;
  value: string;
  hours: number;
}

const TIME_RANGES: TimeRange[] = [
  { label: 'Last Hour', value: '1h', hours: 1 },
  { label: 'Last 6 Hours', value: '6h', hours: 6 },
  { label: 'Last 24 Hours', value: '24h', hours: 24 },
  { label: 'Last 7 Days', value: '7d', hours: 168 },
  { label: 'Last 30 Days', value: '30d', hours: 720 },
];

const MetricsLogsVisualizationPage: React.FC = () => {
  const navigate = useNavigate();
  const { theme } = useAppSelector((state) => state.ui);
  const isDark = theme === 'dark';
  const [timeRange, setTimeRange] = useState<TimeRange>(TIME_RANGES[1]); // Default: 6 hours
  const [filter, setFilter] = useState<'all' | 'critical' | 'warning' | 'info' | 'resolved'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [alerts, setAlerts] = useState<MonitoringAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [showGrafana, setShowGrafana] = useState(false);
  const [selectedMetric, setSelectedMetric] = useState<string>('all');
  const [prometheusMetrics, setPrometheusMetrics] = useState<any>(null);
  const [stackstormExecutions, setStackstormExecutions] = useState<any[]>([]);
  const [stackstormWorkflows, setStackstormWorkflows] = useState<any[]>([]);
  const [lokiLogs, setLokiLogs] = useState<any[]>([]);
  const [grafanaDashboards, setGrafanaDashboards] = useState<Array<{ uid: string; title: string; url: string }>>([]);
  const [selectedDashboard, setSelectedDashboard] = useState<string>('');
  const [loadingMetrics, setLoadingMetrics] = useState(false);
  const [loadingStackStorm, setLoadingStackStorm] = useState(false);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [integrations, setIntegrations] = useState<any[]>([]);
  const [hasPrometheus, setHasPrometheus] = useState(false);
  const [hasGrafana, setHasGrafana] = useState(false);
  const [hasStackStorm, setHasStackStorm] = useState(false);
  const [hasLoki, setHasLoki] = useState(false);
  const [grafanaBaseUrl, setGrafanaBaseUrl] = useState<string>('');

  const fetchAlerts = async () => {
    try {
      setIsRefreshing(true);
      const filters: any = {};
      
      if (filter !== 'all') {
        if (filter === 'resolved') {
          filters.status = 'resolved';
        } else {
          filters.severity = filter === 'critical' ? 'critical' : filter === 'warning' ? 'high' : 'low';
        }
      }
      
      const data = await getMonitoringAlerts(filters);
      setAlerts(data);
    } catch (error) {
      console.error('Failed to fetch alerts:', error);
      toast.error('Failed to load monitoring alerts');
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  // Fetch Prometheus metrics
  const fetchPrometheusMetrics = async () => {
    try {
      setLoadingMetrics(true);
      const end = Math.floor(Date.now() / 1000);
      const start = end - (timeRange.hours * 3600);
      const step = timeRange.hours <= 6 ? '30s' : timeRange.hours <= 24 ? '5m' : '15m';

      // Try simpler queries that are more likely to work
      const cpuQuery = 'up{job=~".+"}'; // System availability
      const cpuData = await integrationService.getPrometheusMetricsRange(cpuQuery, start.toString(), end.toString(), step);
      
      console.log('Prometheus CPU data:', cpuData);
      console.log('Prometheus query params:', { start, end, step, query: cpuQuery });

      // Handle different response formats
      let processedData = cpuData;
      if (cpuData && typeof cpuData === 'object' && 'data' in cpuData) {
        processedData = (cpuData as any).data;
      }

      // If we get data, try more complex queries
      if (processedData && typeof processedData === 'object' && ((processedData as any).resultType || (processedData as any).result)) {
        const cpuUsageQuery = 'rate(container_cpu_usage_seconds_total[5m]) * 100';
        const memoryQuery = 'container_memory_usage_bytes / container_spec_memory_limit_bytes * 100';
        
        try {
          const [cpuUsageData, memoryData] = await Promise.all([
            integrationService.getPrometheusMetricsRange(cpuUsageQuery, start.toString(), end.toString(), step).catch(() => null),
            integrationService.getPrometheusMetricsRange(memoryQuery, start.toString(), end.toString(), step).catch(() => null),
          ]);
          
          setPrometheusMetrics({ 
            cpu: cpuUsageData || cpuData, 
            memory: memoryData,
            availability: cpuData 
          });
        } catch (e) {
          // Fallback to availability metric
          setPrometheusMetrics({ availability: processedData });
        }
      } else {
        setPrometheusMetrics(null);
      }
    } catch (error: any) {
      console.error('Failed to fetch Prometheus metrics:', error);
      console.error('Error details:', error.response?.data || error.message);
      setPrometheusMetrics(null);
      // Show toast only if it's a clear error
      if (error.response?.status !== 404) {
        toast.error('Failed to fetch Prometheus metrics. Check integration configuration.');
      }
    } finally {
      setLoadingMetrics(false);
    }
  };

  // Fetch StackStorm data
  const fetchStackStormData = async () => {
    try {
      setLoadingStackStorm(true);
      const [executions, workflows] = await Promise.all([
        integrationService.getStackStormExecutions(20).catch((e) => {
          console.error('StackStorm executions error:', e);
          return [];
        }),
        integrationService.getStackStormWorkflows().catch((e) => {
          console.error('StackStorm workflows error:', e);
          return [];
        }),
      ]);
      
      console.log('StackStorm executions:', executions);
      console.log('StackStorm workflows:', workflows);
      
      // Handle different response formats
      let execs = executions;
      if (executions && typeof executions === 'object' && 'executions' in executions) {
        execs = executions.executions;
      } else if (executions && typeof executions === 'object' && 'data' in executions) {
        execs = executions.data;
      }
      
      let wfs = workflows;
      if (workflows && typeof workflows === 'object' && 'workflows' in workflows) {
        wfs = workflows.workflows;
      } else if (workflows && typeof workflows === 'object' && 'data' in workflows) {
        wfs = workflows.data;
      }
      
      setStackstormExecutions(Array.isArray(execs) ? execs : []);
      setStackstormWorkflows(Array.isArray(wfs) ? wfs : []);
      
      if ((!execs || execs.length === 0) && (!wfs || wfs.length === 0)) {
        console.warn('No StackStorm data returned. Check integration configuration.');
      }
    } catch (error: any) {
      console.error('Failed to fetch StackStorm data:', error);
      console.error('Error details:', error.response?.data || error.message);
      setStackstormExecutions([]);
      setStackstormWorkflows([]);
      if (error.response?.status !== 404) {
        toast.error('Failed to fetch StackStorm data. Check integration configuration.');
      }
    } finally {
      setLoadingStackStorm(false);
    }
  };

  // Fetch Loki logs
  const fetchLokiLogs = async () => {
    try {
      setLoadingLogs(true);
      const end = Math.floor(Date.now() / 1000);
      const start = end - (timeRange.hours * 3600);
      
      // Try multiple log queries
      const queries = [
        '{job="varlogs"}',
        '{job=~".+"}',
        '{container=~".+"}',
      ];
      
      let logs: any[] = [];
      
      for (const logQuery of queries) {
        try {
          const result = await queryLokiLogs(logQuery, start.toString(), end.toString(), 100);
          
          console.log('Loki query result:', logQuery, result);
          
          if (result.success && result.data?.result) {
            result.data.result.forEach((stream: any) => {
              stream.values?.forEach(([timestamp, message]: [string, string]) => {
                // Handle both nanosecond strings and Unix timestamps
                let ts: number;
                if (typeof timestamp === 'string' && timestamp.length > 13) {
                  // Nanoseconds
                  ts = parseInt(timestamp) / 1000000000;
                } else if (typeof timestamp === 'string') {
                  // Milliseconds or seconds
                  ts = parseInt(timestamp) / 1000;
                } else {
                  ts = timestamp;
                }
                
                logs.push({
                  timestamp: ts,
                  message,
                  labels: stream.stream || {},
                });
              });
            });
          }
          
          // If we got logs, break
          if (logs.length > 0) break;
        } catch (e) {
          console.warn(`Loki query failed for ${logQuery}:`, e);
        }
      }
      
      if (logs.length > 0) {
        setLokiLogs(logs.sort((a, b) => b.timestamp - a.timestamp));
      } else {
        setLokiLogs([]);
        console.warn('No Loki logs found. Check integration configuration and log sources.');
      }
    } catch (error: any) {
      console.error('Failed to fetch Loki logs:', error);
      console.error('Error details:', error.response?.data || error.message);
      setLokiLogs([]);
      if (error.response?.status !== 404) {
        toast.error('Failed to fetch Loki logs. Check integration configuration.');
      }
    } finally {
      setLoadingLogs(false);
    }
  };

  // Fetch Grafana dashboards
  const fetchGrafanaDashboards = async () => {
    try {
      const dashboards = await integrationService.getGrafanaDashboards();
      setGrafanaDashboards(dashboards || []);
      if (dashboards && dashboards.length > 0 && !selectedDashboard) {
        setSelectedDashboard(dashboards[0].uid);
      }
    } catch (error) {
      console.error('Failed to fetch Grafana dashboards:', error);
    }
  };

  // Check integrations on mount
  useEffect(() => {
    const checkIntegrations = async () => {
      try {
        const allIntegrations = await integrationService.getIntegrations();
        setIntegrations(allIntegrations);

        // Check which integrations are active
        const prometheus = allIntegrations.find(i => i.provider === 'prometheus' && i.status === 'active');
        const grafana = allIntegrations.find(i => i.provider === 'grafana' && i.status === 'active');
        const stackstorm = allIntegrations.find(i => i.provider === 'stackstorm' && i.status === 'active');
        const loki = allIntegrations.find(i => i.provider === 'loki' && i.status === 'active');

        setHasPrometheus(!!prometheus);
        setHasGrafana(!!grafana);
        setHasStackStorm(!!stackstorm);
        setHasLoki(!!loki);

        // Extract Grafana base URL from integration configuration
        if (grafana && grafana.configuration) {
          const config = grafana.configuration as Record<string, any>;
          const baseUrl = config.url || config.base_url || config.grafana_url || '';
          if (baseUrl) {
            setGrafanaBaseUrl(baseUrl.replace(/\/$/, '')); // Remove trailing slash
          }
        }
      } catch (error) {
        console.error('Failed to check integrations:', error);
      }
    };

    checkIntegrations();
  }, []);

  useEffect(() => {
    // Initial fetch
    const loadData = async () => {
      await Promise.all([
        fetchAlerts(),
        hasPrometheus && fetchPrometheusMetrics(),
        hasStackStorm && fetchStackStormData(),
        hasLoki && fetchLokiLogs(),
        hasGrafana && fetchGrafanaDashboards(),
      ].filter(Boolean));
    };
    
    loadData();
    
    // Auto-refresh every 30 seconds
    const interval = setInterval(() => {
      fetchAlerts();
      if (hasPrometheus) fetchPrometheusMetrics();
      if (hasStackStorm) fetchStackStormData();
      if (hasLoki) fetchLokiLogs();
    }, 30000);
    return () => clearInterval(interval);
  }, [filter, timeRange, hasPrometheus, hasStackStorm, hasLoki, hasGrafana]);

  const filteredAlerts = useMemo(() => {
    return alerts.filter(alert => {
      const matchesSearch = alert.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                            alert.source.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            alert.message?.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesSearch;
    });
  }, [alerts, searchQuery]);

  // Chart data preparation
  const alertTrendData = useMemo(() => {
    const now = new Date();
    const buckets: { [key: string]: { critical: number; warning: number; info: number } } = {};
    const bucketSize = timeRange.hours <= 6 ? 15 : timeRange.hours <= 24 ? 60 : 240; // minutes
    
    filteredAlerts.forEach(alert => {
      const alertTime = new Date(alert.startsAt);
      const minutesAgo = (now.getTime() - alertTime.getTime()) / (1000 * 60);
      
      if (minutesAgo <= timeRange.hours * 60) {
        const bucket = Math.floor(minutesAgo / bucketSize) * bucketSize;
        const timeKey = `${bucket}min`;
        
        if (!buckets[timeKey]) {
          buckets[timeKey] = { critical: 0, warning: 0, info: 0 };
        }
        
        if (alert.severity === 'critical' || alert.severity === 'high') {
          buckets[timeKey].critical++;
        } else if (alert.severity === 'warning' || alert.severity === 'medium') {
          buckets[timeKey].warning++;
        } else {
          buckets[timeKey].info++;
        }
      }
    });

    return Object.entries(buckets)
      .map(([key, value]) => ({
        time: `${Math.floor(parseInt(key) / 60)}h`,
        critical: value.critical,
        warning: value.warning,
        info: value.info,
      }))
      .sort((a, b) => a.time.localeCompare(b.time));
  }, [filteredAlerts, timeRange]);

  const severityDistribution = useMemo(() => {
    const distribution = {
      critical: filteredAlerts.filter(a => (a.severity === 'critical' || a.severity === 'high') && a.status === 'firing').length,
      warning: filteredAlerts.filter(a => a.severity === 'medium' && a.status === 'firing').length,
      info: filteredAlerts.filter(a => a.severity === 'low' && a.status === 'firing').length,
      resolved: filteredAlerts.filter(a => a.status === 'resolved').length,
    };
    
    return [
      { name: 'Critical', value: distribution.critical, color: COLORS.critical },
      { name: 'Warning', value: distribution.warning, color: COLORS.warning },
      { name: 'Info', value: distribution.info, color: COLORS.info },
      { name: 'Resolved', value: distribution.resolved, color: COLORS.resolved },
    ].filter(item => item.value > 0);
  }, [filteredAlerts]);

  const sourceDistribution = useMemo(() => {
    const sources: { [key: string]: number } = {};
    filteredAlerts.forEach(alert => {
      sources[alert.source] = (sources[alert.source] || 0) + 1;
    });
    
    return Object.entries(sources)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10);
  }, [filteredAlerts]);

  const stats = useMemo(() => {
    return {
      total: filteredAlerts.length,
      critical: filteredAlerts.filter(a => (a.severity === 'critical' || a.severity === 'high') && a.status === 'firing').length,
      warning: filteredAlerts.filter(a => a.severity === 'medium' && a.status === 'firing').length,
      resolved: filteredAlerts.filter(a => a.status === 'resolved').length,
      firing: filteredAlerts.filter(a => a.status === 'firing').length,
    };
  }, [filteredAlerts]);

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleString();
  };

  return (
    <div className="min-h-screen p-6 space-y-6" style={{ background: isDark ? 'linear-gradient(180deg, #030712 0%, #0a0f1a 100%)' : '#f9fafb' }}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>Alerts, Metrics & Logs Visualization</h1>
          <p className={`mt-1 ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>Comprehensive monitoring dashboard with real-time data</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            leftIcon={<RefreshCw size={16} className={isRefreshing || loadingMetrics || loadingStackStorm || loadingLogs ? 'animate-spin' : ''} />}
            onClick={() => {
              fetchAlerts();
              fetchPrometheusMetrics();
              fetchStackStormData();
              fetchLokiLogs();
              fetchGrafanaDashboards();
            }}
            disabled={isRefreshing || loadingMetrics || loadingStackStorm || loadingLogs}
          >
            Refresh All
          </Button>
          <Button
            variant="outline"
            leftIcon={showGrafana ? <EyeOff size={16} /> : <Eye size={16} />}
            onClick={() => setShowGrafana(!showGrafana)}
          >
            {showGrafana ? 'Hide Grafana' : 'Show Grafana'}
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card padding="sm" className={isDark ? "bg-white/5 border-white/10" : "bg-white border-gray-200 shadow-sm"}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-400">Total Alerts</p>
              <p className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>{stats.total}</p>
            </div>
            <Activity className="text-blue-500" size={24} />
          </div>
        </Card>
        <Card padding="sm" className={isDark ? "bg-white/5 border-white/10" : "bg-white border-gray-200 shadow-sm"}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-400">Critical</p>
              <p className="text-2xl font-bold text-red-400">{stats.critical}</p>
            </div>
            <AlertTriangle className="text-red-500" size={24} />
          </div>
        </Card>
        <Card padding="sm" className={isDark ? "bg-white/5 border-white/10" : "bg-white border-gray-200 shadow-sm"}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-400">Warning</p>
              <p className="text-2xl font-bold text-yellow-400">{stats.warning}</p>
            </div>
            <AlertTriangle className="text-yellow-500" size={24} />
          </div>
        </Card>
        <Card padding="sm" className={isDark ? "bg-white/5 border-white/10" : "bg-white border-gray-200 shadow-sm"}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-400">Firing</p>
              <p className="text-2xl font-bold text-orange-400">{stats.firing}</p>
            </div>
            <Zap className="text-orange-500" size={24} />
          </div>
        </Card>
        <Card padding="sm" className={isDark ? "bg-white/5 border-white/10" : "bg-white border-gray-200 shadow-sm"}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-400">Resolved</p>
              <p className="text-2xl font-bold text-green-400">{stats.resolved}</p>
            </div>
            <Clock className="text-green-500" size={24} />
          </div>
        </Card>
      </div>

      {/* Filters */}
      <Card className={isDark ? "bg-white/5 border-white/10" : "bg-white border-gray-200 shadow-sm"}>
        <CardBody>
          <div className="flex flex-wrap gap-4 items-center">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={16} />
                <input
                  type="text"
                  placeholder="Search alerts..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className={`w-full pl-10 pr-4 py-2 rounded-lg placeholder:text-slate-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent ${isDark ? 'bg-white/5 border border-white/10 text-white' : 'bg-gray-50 border border-gray-200 text-gray-900'}`}
                />
              </div>
            </div>
            <Select
              options={[
                { value: 'all', label: 'All Alerts' },
                { value: 'critical', label: 'Critical Only' },
                { value: 'warning', label: 'Warning Only' },
                { value: 'info', label: 'Info Only' },
                { value: 'resolved', label: 'Resolved' },
              ]}
              value={filter}
              onChange={(e) => setFilter(e.target.value as any)}
              className="w-40"
            />
            <Select
              options={TIME_RANGES.map(tr => ({ value: tr.value, label: tr.label }))}
              value={timeRange.value}
              onChange={(e) => {
                const selected = TIME_RANGES.find(tr => tr.value === e.target.value);
                if (selected) setTimeRange(selected);
              }}
              className="w-40"
            />
          </div>
        </CardBody>
      </Card>

      {/* Grafana Embed */}
      {showGrafana && (
        <Card className={isDark ? "bg-white/5 border-white/10" : "bg-white border-gray-200 shadow-sm"}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <h3 className={`text-lg font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>Grafana Dashboard</h3>
              {grafanaDashboards.length > 0 && (
                <Select
                  options={grafanaDashboards.map(d => ({ value: d.uid, label: d.title }))}
                  value={selectedDashboard}
                  onChange={(e) => setSelectedDashboard(e.target.value)}
                  className="w-64"
                />
              )}
            </div>
          </CardHeader>
          <CardBody>
            <div className="bg-gradient-to-br from-[#1a1a2e] to-[#16213e] rounded-lg h-96">
              {selectedDashboard && grafanaBaseUrl ? (
                <iframe
                  src={`${grafanaBaseUrl}/d/${selectedDashboard}?orgId=1&kiosk=tv&refresh=30s`}
                  className="w-full h-full border-0 rounded-lg"
                  title="Grafana Dashboard"
                  allow="fullscreen"
                />
              ) : selectedDashboard && !grafanaBaseUrl ? (
                <div className="h-full flex flex-col items-center justify-center text-white">
                  <AlertTriangle size={48} className="text-yellow-500 mb-4" />
                  <h4 className="text-sm font-medium mb-2">Grafana URL Not Configured</h4>
                  <p className="text-xs opacity-70 mb-4 text-center max-w-md">
                    Please configure the Grafana integration URL in the integrations settings.
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigate('/monitoring/integrations')}
                  >
                    Configure Grafana
                  </Button>
                </div>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-white">
                  <BarChart3 size={48} className="text-orange-500 mb-4" />
                  <h4 className="text-sm font-medium mb-2">Grafana Metrics Dashboard</h4>
                  <p className="text-xs opacity-70">
                    {grafanaDashboards.length === 0 ? 'No dashboards found. Sync Grafana integration to load dashboards.' : 'Loading dashboards...'}
                  </p>
                </div>
              )}
            </div>
          </CardBody>
        </Card>
      )}

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Alert Trend Chart */}
        <Card className={isDark ? "bg-white/5 border-white/10" : "bg-white border-gray-200 shadow-sm"}>
          <CardHeader>
            <h3 className={`text-lg font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>Alert Trend Over Time</h3>
          </CardHeader>
          <CardBody>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={alertTrendData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                <XAxis dataKey="time" stroke="#9ca3af" tick={{ fill: '#9ca3af' }} />
                <YAxis stroke="#9ca3af" tick={{ fill: '#9ca3af' }} />
                <Tooltip contentStyle={{ backgroundColor: '#1f2937', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: '#fff' }} />
                <Legend wrapperStyle={{ color: '#fff' }} />
                <Area type="monotone" dataKey="critical" stackId="1" stroke={COLORS.critical} fill={COLORS.critical} fillOpacity={0.6} />
                <Area type="monotone" dataKey="warning" stackId="1" stroke={COLORS.warning} fill={COLORS.warning} fillOpacity={0.6} />
                <Area type="monotone" dataKey="info" stackId="1" stroke={COLORS.info} fill={COLORS.info} fillOpacity={0.6} />
              </AreaChart>
            </ResponsiveContainer>
          </CardBody>
        </Card>

        {/* Severity Distribution */}
        <Card className={isDark ? "bg-white/5 border-white/10" : "bg-white border-gray-200 shadow-sm"}>
          <CardHeader>
            <h3 className={`text-lg font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>Severity Distribution</h3>
          </CardHeader>
          <CardBody>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={severityDistribution}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {severityDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ backgroundColor: '#1f2937', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: '#fff' }} />
              </PieChart>
            </ResponsiveContainer>
          </CardBody>
        </Card>

        {/* Source Distribution */}
        <Card className={isDark ? "bg-white/5 border-white/10" : "bg-white border-gray-200 shadow-sm"}>
          <CardHeader>
            <h3 className={`text-lg font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>Alerts by Source</h3>
          </CardHeader>
          <CardBody>
            {sourceDistribution.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={sourceDistribution}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                  <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} stroke="#9ca3af" tick={{ fill: '#9ca3af' }} />
                  <YAxis stroke="#9ca3af" tick={{ fill: '#9ca3af' }} />
                  <Tooltip contentStyle={{ backgroundColor: '#1f2937', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: '#fff' }} />
                  <Bar dataKey="value" fill="#3b82f6" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex flex-col items-center justify-center h-[300px] text-slate-400 space-y-3">
                <AlertTriangle size={32} className="text-yellow-500" />
                <p className="text-base font-medium">No alerts found</p>
                <p className="text-xs text-slate-500 text-center max-w-md">
                  {alerts.length === 0 
                    ? "No alerts have been created yet. Sync your monitoring integrations to fetch alerts."
                    : "No alerts match the current filters. Try adjusting your search or filter criteria."}
                </p>
                {alerts.length === 0 && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigate('/monitoring/integrations')}
                    className="mt-2"
                  >
                    Configure Integrations
                  </Button>
                )}
              </div>
            )}
          </CardBody>
        </Card>

        {/* Prometheus Metrics Chart */}
        <Card className={isDark ? "bg-white/5 border-white/10" : "bg-white border-gray-200 shadow-sm"}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <h3 className={`text-lg font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>Prometheus Metrics</h3>
              {hasPrometheus && (
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                  <span className="text-xs text-green-400">Connected</span>
                </div>
              )}
            </div>
          </CardHeader>
          <CardBody>
            {loadingMetrics ? (
              <div className="flex items-center justify-center h-[300px]">
                <Spinner size="lg" />
              </div>
            ) : !hasPrometheus ? (
              <div className="flex flex-col items-center justify-center h-[300px] text-slate-400 space-y-3">
                <Database size={32} className="text-yellow-500" />
                <p className="text-base font-medium">Prometheus integration not configured</p>
                <p className="text-xs text-slate-500 text-center max-w-md">
                  Configure Prometheus integration to view real-time metrics.
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigate('/monitoring/integrations')}
                  className="mt-2"
                >
                  Configure Prometheus
                </Button>
              </div>
            ) : (() => {
              // Extract data from various possible formats
              const getChartData = () => {
                if (!prometheusMetrics) return [];

                // Check for cpu.result format
                const cpuData = prometheusMetrics.cpu?.result || prometheusMetrics.cpu?.data?.result;
                if (cpuData && Array.isArray(cpuData) && cpuData.length > 0) {
                  const firstResult = cpuData[0];
                  const values = firstResult?.values || [];
                  return values.map(([time, value]: [number, string]) => ({
                    time: new Date(time * 1000).toLocaleTimeString(),
                    value: parseFloat(value) || 0,
                  }));
                }

                // Check for availability.result format
                const availData = prometheusMetrics.availability?.result || prometheusMetrics.availability?.data?.result;
                if (availData && Array.isArray(availData) && availData.length > 0) {
                  const firstResult = availData[0];
                  const values = firstResult?.values || [];
                  return values.map(([time, value]: [number, string]) => ({
                    time: new Date(time * 1000).toLocaleTimeString(),
                    value: parseFloat(value) || 0,
                  }));
                }

                // Check for direct result format
                if (prometheusMetrics.result && Array.isArray(prometheusMetrics.result) && prometheusMetrics.result.length > 0) {
                  const firstResult = prometheusMetrics.result[0];
                  const values = firstResult?.values || [];
                  return values.map(([time, value]: [number, string]) => ({
                    time: new Date(time * 1000).toLocaleTimeString(),
                    value: parseFloat(value) || 0,
                  }));
                }

                return [];
              };

              const chartData = getChartData();
              const hasChartData = chartData.length > 0;

              if (hasChartData) {
                return (
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                      <XAxis dataKey="time" stroke="#9ca3af" tick={{ fill: '#9ca3af', fontSize: 10 }} interval="preserveStartEnd" />
                      <YAxis stroke="#9ca3af" tick={{ fill: '#9ca3af' }} domain={['auto', 'auto']} />
                      <Tooltip contentStyle={{ backgroundColor: '#1f2937', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: '#fff' }} />
                      <Legend wrapperStyle={{ color: '#fff' }} />
                      <Line type="monotone" dataKey="value" stroke="#3b82f6" strokeWidth={2} name="Metric Value" dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                );
              }

              // Check if we have connection but no data
              const hasConnection = prometheusMetrics?.availability?.result?.length > 0 || prometheusMetrics?.cpu || prometheusMetrics?.result;
              if (hasConnection) {
                return (
                  <div className="flex flex-col items-center justify-center h-[300px] text-slate-400 space-y-3">
                    <Activity size={32} className="text-blue-500" />
                    <p className="text-base font-medium text-white">Prometheus Connected</p>
                    <p className="text-sm text-slate-400">
                      {prometheusMetrics?.availability?.result?.length || 0} metric series available
                    </p>
                    <p className="text-xs text-slate-500 text-center max-w-md">
                      Metrics are being collected. Configure specific queries in the Prometheus integration settings for detailed visualization.
                    </p>
                  </div>
                );
              }

              return (
                <div className="flex flex-col items-center justify-center h-[300px] text-slate-400 space-y-2">
                  <AlertTriangle size={24} className="text-yellow-500" />
                  <p>No Prometheus metrics available</p>
                  <p className="text-xs text-slate-500">Check Prometheus integration configuration</p>
                </div>
              );
            })()}
          </CardBody>
        </Card>
      </div>

      {/* StackStorm Executions */}
      <Card className={isDark ? "bg-white/5 border-white/10" : "bg-white border-gray-200 shadow-sm"}>
        <CardHeader>
          <h3 className="text-lg font-semibold text-white">StackStorm Recent Executions</h3>
        </CardHeader>
        <CardBody>
          {loadingStackStorm ? (
            <div className="flex items-center justify-center py-12">
              <Spinner size="lg" />
            </div>
          ) : !hasStackStorm ? (
            <div className="flex flex-col items-center justify-center py-12 text-slate-400 space-y-3">
              <AlertTriangle size={32} className="text-yellow-500" />
              <p className="text-base font-medium">StackStorm integration not configured</p>
              <p className="text-xs text-slate-500 text-center max-w-md">
                StackStorm integration is not configured or inactive.
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate('/monitoring/integrations')}
                className="mt-2"
              >
                Configure StackStorm Integration
              </Button>
            </div>
          ) : stackstormExecutions.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-white/10">
                    <th className="text-left py-3 px-4 text-sm font-semibold text-slate-300">Action</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-slate-300">Status</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-slate-300">Started</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-slate-300">Duration</th>
                  </tr>
                </thead>
                <tbody>
                  {stackstormExecutions.slice(0, 10).map((exec: any, idx: number) => (
                    <tr key={exec.id || exec.execution_id || idx} className="border-b border-white/5 hover:bg-white/5">
                      <td className="py-3 px-4 font-medium text-white">
                        {exec.action?.ref || exec.action?.name || exec.action || exec.action_ref || 'N/A'}
                      </td>
                      <td className="py-3 px-4">
                        <Badge variant={
                          exec.status === 'succeeded' || exec.status === 'success' ? 'success' :
                          exec.status === 'failed' || exec.status === 'error' ? 'danger' :
                          exec.status === 'running' ? 'warning' : 'default'
                        }>
                          {exec.status || 'unknown'}
                        </Badge>
                      </td>
                      <td className="py-3 px-4 text-sm text-slate-400">
                        {exec.start_timestamp ? formatTime(exec.start_timestamp) : 
                         exec.started_at ? formatTime(exec.started_at) : 'N/A'}
                      </td>
                      <td className="py-3 px-4 text-sm text-slate-400">
                        {exec.elapsed_seconds ? `${exec.elapsed_seconds}s` : 
                         exec.duration ? `${exec.duration}s` : 'N/A'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-slate-400 space-y-3">
              <AlertTriangle size={32} className="text-yellow-500" />
              <p className="text-base font-medium">No StackStorm executions found</p>
              <p className="text-xs text-slate-500">Sync StackStorm integration or check if workflows are running</p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const stackstormIntegration = integrations.find(i => i.provider === 'stackstorm');
                  if (stackstormIntegration) {
                    navigate(`/monitoring/integrations/${stackstormIntegration.id}`);
                  } else {
                    navigate('/monitoring/integrations');
                  }
                }}
                className="mt-2"
              >
                View StackStorm Integration
              </Button>
            </div>
          )}
        </CardBody>
      </Card>

      {/* Loki Logs */}
      <Card className={isDark ? "bg-white/5 border-white/10" : "bg-white border-gray-200 shadow-sm"}>
        <CardHeader>
          <h3 className="text-lg font-semibold text-white">Recent Logs (Loki)</h3>
        </CardHeader>
        <CardBody>
          {loadingLogs ? (
            <div className="flex items-center justify-center py-12">
              <Spinner size="lg" />
            </div>
          ) : !hasLoki ? (
            <div className="flex flex-col items-center justify-center py-12 text-slate-400 space-y-3">
              <AlertTriangle size={32} className="text-yellow-500" />
              <p className="text-base font-medium">Loki integration not configured</p>
              <p className="text-xs text-slate-500 text-center max-w-md">
                Loki integration is not configured or inactive.
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate('/monitoring/integrations')}
                className="mt-2"
              >
                Configure Loki Integration
              </Button>
            </div>
          ) : lokiLogs.length > 0 ? (
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {lokiLogs.slice(0, 50).map((log, idx) => (
                <div key={idx} className="p-3 bg-white/5 rounded-lg border border-white/10 font-mono text-sm">
                  <div className="flex items-start gap-3">
                    <span className="text-slate-500 text-xs whitespace-nowrap">
                      {new Date(log.timestamp * 1000).toLocaleString()}
                    </span>
                    <span className="text-white flex-1 break-all">{log.message}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-slate-400 space-y-3">
              <AlertTriangle size={32} className="text-yellow-500" />
              <p className="text-base font-medium">No Loki logs found</p>
              <p className="text-xs text-slate-500 text-center max-w-md">
                {hasLoki 
                  ? "No logs match the current query. Try adjusting the time range or check if log sources are configured."
                  : "Loki integration is not configured or inactive."}
              </p>
              {!hasLoki && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigate('/monitoring/integrations')}
                  className="mt-2"
                >
                  Configure Loki Integration
                </Button>
              )}
            </div>
          )}
        </CardBody>
      </Card>

      {/* Alerts Table */}
      <Card className={isDark ? "bg-white/5 border-white/10" : "bg-white border-gray-200 shadow-sm"}>
        <CardHeader>
          <h3 className="text-lg font-semibold text-white">Recent Alerts</h3>
        </CardHeader>
        <CardBody>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Spinner size="lg" />
            </div>
          ) : filteredAlerts.length === 0 ? (
            <div className="text-center py-12 text-slate-400">
              No alerts found for the selected filters
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-white/10">
                    <th className="text-left py-3 px-4 text-sm font-semibold text-slate-300">Severity</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-slate-300">Name</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-slate-300">Source</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-slate-300">Message</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-slate-300">Started</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-slate-300">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredAlerts.slice(0, 50).map((alert) => (
                    <tr key={alert.id} className="border-b border-white/5 hover:bg-white/5">
                      <td className="py-3 px-4">
                        <Badge
                          variant={
                            alert.severity === 'critical' || alert.severity === 'high'
                              ? 'danger'
                              : alert.severity === 'warning' || alert.severity === 'medium'
                              ? 'warning'
                              : 'default'
                          }
                        >
                          {alert.severity}
                        </Badge>
                      </td>
                      <td className="py-3 px-4 font-medium text-white">{alert.name}</td>
                      <td className="py-3 px-4 text-sm text-slate-400">{alert.source}</td>
                      <td className="py-3 px-4 text-sm text-slate-400 max-w-md truncate">{alert.message}</td>
                      <td className="py-3 px-4 text-sm text-slate-500">{formatTime(alert.startsAt)}</td>
                      <td className="py-3 px-4">
                        <Badge variant={alert.status === 'firing' ? 'warning' : 'success'}>
                          {alert.status}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardBody>
      </Card>
    </div>
  );
};

export default MetricsLogsVisualizationPage;
