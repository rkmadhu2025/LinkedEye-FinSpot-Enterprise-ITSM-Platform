import api from './api';
import { DashboardStats, ChartData, Environment } from '@/types';

// Backend response types (matching actual backend response)
interface BackendIncidentStats {
  total?: number;
  open?: number;
  critical?: number;
  high?: number;
  medium?: number;
  low?: number;
  sla_compliance?: number;
}

interface BackendChangeStats {
  pending?: number;
}

interface BackendAssetStats {
  total?: number;
  critical?: number;
}

interface BackendEnvironmentStats {
  total?: number;
  active?: number;
}

interface BackendProblemStats {
  total?: number;
  open?: number;
  critical?: number;
  high?: number;
}

// Backend environment type (snake_case)
interface BackendEnvironment {
  id: string;
  name: string;
  code?: string;
  type: string;
  status: string;
  description?: string;
  health_metrics?: {
    cpu_usage?: number;
    memory_usage?: number;
    disk_usage?: number;
    uptime?: number;
    response_time?: number;
  } | null;
  is_active?: boolean;
  created_at?: string;
  updated_at?: string;
  open_incidents?: string;
}

interface BackendDashboardStats {
  incidents: BackendIncidentStats;
  changes: BackendChangeStats;
  assets: BackendAssetStats;
  environments: BackendEnvironmentStats;
  problems?: BackendProblemStats;
  mttr_minutes?: number;
  system_uptime?: number;
}

// Helper to safely parse integer
const safeParseInt = (value: unknown): number => {
  if (typeof value === 'number') return value;
  if (typeof value === 'string') return parseInt(value, 10) || 0;
  return 0;
};

// Map backend environment to frontend format
const mapEnvironment = (env: BackendEnvironment): Environment => {
  const healthMetrics = env.health_metrics || {};
  return {
    id: env.id,
    name: env.name,
    code: env.code || env.name.toLowerCase().replace(/\s+/g, '-'),
    type: env.type as Environment['type'],
    status: (env.status || 'unknown') as Environment['status'],
    description: env.description,
    healthMetrics: {
      cpuUsage: healthMetrics.cpu_usage || 0,
      memoryUsage: healthMetrics.memory_usage || 0,
      diskUsage: healthMetrics.disk_usage || 0,
      uptime: healthMetrics.uptime || 0,
      responseTime: healthMetrics.response_time || 0,
    },
    isActive: env.is_active ?? true,
    createdAt: env.created_at || new Date().toISOString(),
    updatedAt: env.updated_at || new Date().toISOString(),
  };
};

// Map backend response to frontend expected format
const mapDashboardStats = (data: BackendDashboardStats | null | undefined): DashboardStats => {
  // Handle null/undefined data
  if (!data) {
    return getDefaultDashboardStats();
  }

  const incidents = data.incidents || {};
  const changes = data.changes || {};
  const assets = data.assets || {};
  const problems = data.problems || {};

  return {
    incidents: {
      total: safeParseInt(incidents.total),
      open: safeParseInt(incidents.open),
      critical: safeParseInt(incidents.critical),
      high: safeParseInt(incidents.high),
      medium: safeParseInt(incidents.medium),
      low: safeParseInt(incidents.low),
      resolvedToday: 0, // Not provided by backend yet
      createdToday: 0, // Not provided by backend yet
      slaBreached: 0, // Not provided by backend yet
      avgResolutionTime: data.mttr_minutes || 0,
      trend: [],
      categoryDistribution: [],
    },
    changes: {
      total: safeParseInt(changes.pending),
      pending: safeParseInt(changes.pending),
      scheduled: 0,
      inProgress: 0,
      completed: 0,
      failed: 0,
      upcomingWeek: 0,
    },
    assets: {
      total: safeParseInt(assets.total),
      active: safeParseInt(assets.total) - safeParseInt(assets.critical),
      maintenance: 0,
      critical: safeParseInt(assets.critical),
    },
    problems: {
      total: safeParseInt(problems.total),
      open: safeParseInt(problems.open),
      critical: safeParseInt(problems.critical),
      high: safeParseInt(problems.high),
    },
    environments: [], // Environments are fetched separately
  };
};

// Default stats when no data available
const getDefaultDashboardStats = (): DashboardStats => ({
  incidents: {
    total: 0,
    open: 0,
    critical: 0,
    high: 0,
    medium: 0,
    low: 0,
    resolvedToday: 0,
    createdToday: 0,
    slaBreached: 0,
    avgResolutionTime: 0,
    trend: [],
    categoryDistribution: [],
  },
  changes: {
    total: 0,
    pending: 0,
    scheduled: 0,
    inProgress: 0,
    completed: 0,
    failed: 0,
    upcomingWeek: 0,
  },
  assets: {
    total: 0,
    active: 0,
    maintenance: 0,
    critical: 0,
  },
  problems: {
    total: 0,
    open: 0,
    critical: 0,
    high: 0,
  },
  environments: [],
});

export const dashboardService = {
  async getStats(clientId?: string): Promise<DashboardStats> {
    const params: Record<string, string> = {};
    if (clientId) params.client_id = clientId;
    const response = await api.get<BackendDashboardStats>('/dashboard/metrics', { params });
    return mapDashboardStats(response.data);
  },

  async getEnvironments(): Promise<Environment[]> {
    const response = await api.get<BackendEnvironment[]>('/environments');
    return (response.data || []).map(mapEnvironment);
  },

  async getIncidentTrends(days: number = 30): Promise<ChartData> {
    try {
      const response = await api.get<{
        days: number;
        total_incidents: Array<{ date: string; count: number }>;
        resolved_incidents: Array<{ date: string; count: number }>;
        critical_incidents: Array<{ date: string; count: number }>;
      }>('/dashboard/incident-trends', {
        params: { days },
      });
      const data = response.data;
      // Transform to ChartData format
      return {
        labels: (data.total_incidents || []).map(item => item.date),
        datasets: [
          {
            label: 'Total',
            data: (data.total_incidents || []).map(item => item.count),
          },
          {
            label: 'Resolved',
            data: (data.resolved_incidents || []).map(item => item.count),
          },
          {
            label: 'Critical',
            data: (data.critical_incidents || []).map(item => item.count),
          },
        ],
      };
    } catch {
      return { labels: [], datasets: [] };
    }
  },

  async getIncidentsByCategory(): Promise<ChartData> {
    try {
      const response = await api.get<{
        categories: Array<{ name: string; count: number }>;
      }>('/dashboard/incident-categories');
      const data = response.data;
      return {
        labels: (data.categories || []).map(cat => cat.name),
        datasets: [{
          label: 'Incidents',
          data: (data.categories || []).map(cat => cat.count),
        }],
      };
    } catch {
      return { labels: [], datasets: [] };
    }
  },

  async getIncidentsByPriority(): Promise<ChartData> {
    // Use existing incident stats - backend doesn't have dedicated endpoint
    try {
      const stats = await this.getStats();
      return {
        labels: ['Critical', 'High', 'Medium', 'Low'],
        datasets: [{
          label: 'Incidents by Priority',
          data: [
            stats.incidents.critical,
            stats.incidents.high,
            stats.incidents.medium,
            stats.incidents.low,
          ],
        }],
      };
    } catch {
      return { labels: [], datasets: [] };
    }
  },

  async getChangeTrends(days: number = 30): Promise<ChartData> {
    // TODO: Backend endpoint not yet implemented
    console.warn('getChangeTrends: Backend endpoint not implemented');
    return { labels: [], datasets: [] };
  },

  async getChangesByType(): Promise<ChartData> {
    // TODO: Backend endpoint not yet implemented
    console.warn('getChangesByType: Backend endpoint not implemented');
    return { labels: [], datasets: [] };
  },

  async getSlaPerformance(): Promise<{
    responseCompliance: number;
    resolutionCompliance: number;
    avgResponseTime: number;
    avgResolutionTime: number;
    breachedCount: number;
  }> {
    // Use existing metrics - backend provides sla_compliance in /dashboard/metrics
    try {
      const response = await api.get<BackendDashboardStats>('/dashboard/metrics');
      const data = response.data;
      return {
        responseCompliance: data.incidents?.sla_compliance || 100,
        resolutionCompliance: data.incidents?.sla_compliance || 100,
        avgResponseTime: 0,
        avgResolutionTime: data.mttr_minutes || 0,
        breachedCount: 0,
      };
    } catch {
      return {
        responseCompliance: 100,
        resolutionCompliance: 100,
        avgResponseTime: 0,
        avgResolutionTime: 0,
        breachedCount: 0,
      };
    }
  },

  async getTeamPerformance(): Promise<
    Array<{
      groupId: string;
      groupName: string;
      assignedCount: number;
      resolvedCount: number;
      avgResolutionTime: number;
      slaCompliance: number;
    }>
  > {
    // TODO: Backend endpoint not yet implemented
    console.warn('getTeamPerformance: Backend endpoint not implemented');
    return [];
  },

  async getRecentActivity(limit: number = 20): Promise<
    Array<{
      id: string;
      type: 'incident' | 'change' | 'asset';
      action: string;
      title: string;
      user: string;
      timestamp: string;
    }>
  > {
    // TODO: Backend endpoint not yet implemented
    console.warn('getRecentActivity: Backend endpoint not implemented');
    return [];
  },

  async getAiInsights(): Promise<
    Array<{
      id: string;
      type: 'warning' | 'suggestion' | 'trend';
      title: string;
      description: string;
      priority: 'high' | 'medium' | 'low';
      actionUrl?: string;
    }>
  > {
    // TODO: Backend endpoint not yet implemented
    console.warn('getAiInsights: Backend endpoint not implemented');
    return [];
  },

  async getAlertFunnel(): Promise<{
    stages: Array<{ label: string; count: number; color: string }>;
    suppression_rate: number;
    incident_rate: number;
    resolution_rate: number;
  }> {
    try {
      const response = await api.get('/dashboard/alert-funnel');
      return response.data;
    } catch {
      return {
        stages: [
          { label: 'Total Alerts', count: 0, color: '#6366f1' },
          { label: 'Deduplicated', count: 0, color: '#f59e0b' },
          { label: 'Incidents Created', count: 0, color: '#ef4444' },
          { label: 'Resolved', count: 0, color: '#10b981' },
        ],
        suppression_rate: 0,
        incident_rate: 0,
        resolution_rate: 0,
      };
    }
  },

  async getTeamWorkload(): Promise<{
    teams: Array<{ name: string; active: number; capacity: number; critical: number; high: number; members: number; utilization: number }>;
    summary: { total_active: number; total_capacity: number; avg_utilization: number; overloaded_teams: number };
  }> {
    try {
      const response = await api.get('/dashboard/team-workload');
      return response.data;
    } catch {
      return { teams: [], summary: { total_active: 0, total_capacity: 0, avg_utilization: 0, overloaded_teams: 0 } };
    }
  },

  async getSlaAtRisk(): Promise<{
    at_risk: Array<{ id: string; title: string; priority: string; sla_due: string; remaining_minutes: number }>;
    breached: Array<{ id: string; title: string; priority: string; sla_due: string; breached_minutes: number }>;
    at_risk_count: number;
    breached_count: number;
  }> {
    try {
      const response = await api.get('/dashboard/sla-at-risk');
      return response.data;
    } catch {
      return { at_risk: [], breached: [], at_risk_count: 0, breached_count: 0 };
    }
  },

  async getRecentIncidents(limit: number = 10): Promise<
    Array<{
      id: string;
      title: string;
      priority: string;
      status: string;
      assignee: string | null;
      slaPercent: number;
      age: string;
      createdAt: string | null;
    }>
  > {
    try {
      const response = await api.get<{
        incidents: Array<{
          id: string;
          title: string;
          priority: string;
          status: string;
          assignee: string | null;
          slaPercent: number;
          age: string;
          createdAt: string | null;
        }>;
        total: number;
      }>('/dashboard/recent-incidents', {
        params: { limit },
      });
      return response.data?.incidents || [];
    } catch (error) {
      console.error('Failed to fetch recent incidents:', error);
      return [];
    }
  },
};
