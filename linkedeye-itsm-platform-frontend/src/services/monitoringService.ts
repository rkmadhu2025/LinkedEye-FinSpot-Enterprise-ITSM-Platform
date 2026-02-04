/**
 * Monitoring Service
 *
 * API client for monitoring alerts, hardware alert types, and alert actions
 * (pause/resume, acknowledge, create incident).
 *
 * Supports:
 * - iDRAC (Dell) alerts
 * - iLO (HP) alerts
 * - Node Exporter alerts
 */

import api from './api';

// =============================================================================
// Types
// =============================================================================

export interface MonitoringAlert {
  id: string;
  integrationId: string;
  name: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  status: 'firing' | 'acknowledged' | 'resolved';
  source: string;
  message: string;
  labels: Record<string, string>;
  annotations: Record<string, string>;
  startsAt: string;
  endsAt?: string;
  fingerprint: string;
  incidentId?: string;
  acknowledgedBy?: string;
  acknowledgedAt?: string;
  createdAt: string;
  // Pause status
  isPaused: boolean;
  pausedUntil?: string;
  pausedBy?: string;
}

export interface AlertDetail extends MonitoringAlert {
  // Hardware alert details
  category?: string;
  categoryIcon?: string;
  sourceDisplayName?: string;
  description?: string;
  resolutionHint?: string;
  autoCreateIncident?: boolean;
  runbookUrl?: string;
}

export interface HardwareAlertType {
  name: string;
  category: string;
  categoryIcon: string;
  source: string;
  sourceDisplayName: string;
  severity: string;
  description: string;
  resolutionHint?: string;
  autoCreateIncident: boolean;
  runbookUrl?: string;
}

export interface AlertSource {
  id: string;
  name: string;
  icon: string;
  alertCount: number;
  description: string;
}

export interface AlertCategory {
  id: string;
  name: string;
  icon: string;
  alertCount: number;
}

export interface AlertCategoryStats {
  category: string;
  icon: string;
  totalAlerts: number;
  firingAlerts: number;
  acknowledgedAlerts: number;
  resolvedAlerts: number;
}

export interface PauseAlertRequest {
  duration_minutes: number;
  reason?: string;
}

export interface AlertPauseStatus {
  alertId: string;
  alertName: string;
  isPaused: boolean;
  pausedUntil?: string;
  pausedBy?: string;
  pauseReason?: string;
  remainingMinutes: number;
}

export interface AlertFilters {
  integrationId?: string;
  status?: string;
  severity?: string;
  category?: string;
  source?: string;
  includePaused?: boolean;
  limit?: number;
  offset?: number;
}

// =============================================================================
// API Functions
// =============================================================================

/**
 * Get list of monitoring alerts with filtering
 */
export const getMonitoringAlerts = async (filters: AlertFilters = {}): Promise<MonitoringAlert[]> => {
  const params = new URLSearchParams();

  if (filters.integrationId) params.append('integrationId', filters.integrationId);
  if (filters.status) params.append('status', filters.status);
  if (filters.severity) params.append('severity', filters.severity);
  if (filters.category) params.append('category', filters.category);
  if (filters.source) params.append('source', filters.source);
  if (filters.includePaused !== undefined) params.append('include_paused', String(filters.includePaused));
  if (filters.limit) params.append('limit', String(filters.limit));
  if (filters.offset) params.append('offset', String(filters.offset));

  const response = await api.get(`/monitoring/alerts?${params.toString()}`);
  return response.data;
};

/**
 * Get single alert by ID with full details
 */
export const getAlertById = async (alertId: string): Promise<AlertDetail> => {
  const response = await api.get(`/monitoring/alerts/${alertId}`);
  return response.data;
};

/**
 * Acknowledge an alert
 */
export const acknowledgeAlert = async (alertId: string): Promise<MonitoringAlert> => {
  const response = await api.post(`/monitoring/alerts/${alertId}/acknowledge`);
  return response.data;
};

/**
 * Create incident from alert
 */
export const createIncidentFromAlert = async (alertId: string): Promise<{ incidentId: string; incidentNumber: string }> => {
  const response = await api.post(`/monitoring/alerts/${alertId}/create-incident`);
  return response.data;
};

/**
 * Silence an alert for specified duration
 */
export const silenceAlert = async (alertId: string, durationMinutes: number): Promise<void> => {
  await api.post(`/monitoring/alerts/${alertId}/silence`, { duration: durationMinutes });
};

/**
 * Pause an alert for specified duration
 */
export const pauseAlert = async (alertId: string, durationMinutes: number, reason?: string): Promise<MonitoringAlert> => {
  const response = await api.post(`/monitoring/alerts/${alertId}/pause`, {
    duration_minutes: durationMinutes,
    reason,
  });
  return response.data;
};

/**
 * Resume a paused alert
 */
export const resumeAlert = async (alertId: string): Promise<{ id: string; name: string; status: string; message: string }> => {
  const response = await api.post(`/monitoring/alerts/${alertId}/resume`);
  return response.data;
};

/**
 * Get pause status of an alert
 */
export const getAlertPauseStatus = async (alertId: string): Promise<AlertPauseStatus> => {
  const response = await api.get(`/monitoring/alerts/${alertId}/pause-status`);
  return response.data;
};

/**
 * Get all hardware alert type definitions
 */
export const getHardwareAlertTypes = async (source?: string, category?: string): Promise<HardwareAlertType[]> => {
  const params = new URLSearchParams();
  if (source) params.append('source', source);
  if (category) params.append('category', category);

  const response = await api.get(`/monitoring/alert-types?${params.toString()}`);
  return response.data;
};

/**
 * Get available alert sources (iDRAC, iLO, Node Exporter)
 */
export const getAlertSources = async (): Promise<{ sources: AlertSource[] }> => {
  const response = await api.get('/monitoring/alert-types/sources');
  return response.data;
};

/**
 * Get alert categories
 */
export const getAlertCategories = async (): Promise<{ categories: AlertCategory[] }> => {
  const response = await api.get('/monitoring/alert-types/categories');
  return response.data;
};

/**
 * Get alert statistics by category
 */
export const getAlertStatsByCategory = async (integrationId?: string): Promise<AlertCategoryStats[]> => {
  const params = integrationId ? `?integrationId=${integrationId}` : '';
  const response = await api.get(`/monitoring/alerts/stats/by-category${params}`);
  return response.data;
};

/**
 * Get alerts for a specific asset
 */
export const getAlertsByAsset = async (assetId: string, filters: Omit<AlertFilters, 'integrationId'> = {}): Promise<MonitoringAlert[]> => {
  const params = new URLSearchParams();

  if (filters.status) params.append('status', filters.status);
  if (filters.severity) params.append('severity', filters.severity);
  if (filters.includePaused !== undefined) params.append('include_paused', String(filters.includePaused));
  if (filters.limit) params.append('limit', String(filters.limit));
  if (filters.offset) params.append('offset', String(filters.offset));

  const queryString = params.toString();
  const response = await api.get(`/monitoring/alerts/by-asset/${assetId}${queryString ? `?${queryString}` : ''}`);
  return response.data;
};

/**
 * Get alerts for a specific network device
 */
export const getAlertsByDevice = async (deviceId: string, filters: Omit<AlertFilters, 'integrationId'> = {}): Promise<MonitoringAlert[]> => {
  const params = new URLSearchParams();

  if (filters.status) params.append('status', filters.status);
  if (filters.severity) params.append('severity', filters.severity);
  if (filters.includePaused !== undefined) params.append('include_paused', String(filters.includePaused));
  if (filters.limit) params.append('limit', String(filters.limit));
  if (filters.offset) params.append('offset', String(filters.offset));

  const queryString = params.toString();
  const response = await api.get(`/monitoring/alerts/by-device/${deviceId}${queryString ? `?${queryString}` : ''}`);
  return response.data;
};

/**
 * Query Loki logs
 */
export const queryLokiLogs = async (query: string, start?: string, end?: string, limit: number = 100): Promise<{ success: boolean; data: any; message?: string }> => {
  const params = new URLSearchParams();
  params.append('query', query);
  if (start) params.append('start', start);
  if (end) params.append('end', end);
  params.append('limit', String(limit));

  try {
    const response = await api.get<{ success: boolean; data: any; message?: string }>(`/monitoring/loki/query_range?${params.toString()}`);
    return response.data;
  } catch (error: any) {
    console.error('Loki query error:', error);
    return {
      success: false,
      data: { resultType: 'streams', result: [] },
      message: error.response?.data?.message || 'Failed to query Loki logs'
    };
  }
};

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Get severity color class
 */
export const getSeverityColor = (severity: string): string => {
  const colors: Record<string, string> = {
    critical: 'bg-red-100 text-red-800 border-red-200',
    high: 'bg-orange-100 text-orange-800 border-orange-200',
    medium: 'bg-amber-100 text-amber-800 border-amber-200',
    low: 'bg-green-100 text-green-800 border-green-200',
  };
  return colors[severity] || 'bg-gray-100 text-gray-800 border-gray-200';
};

/**
 * Get status color class
 */
export const getStatusColor = (status: string): string => {
  const colors: Record<string, string> = {
    firing: 'bg-red-500 text-white',
    acknowledged: 'bg-yellow-500 text-white',
    resolved: 'bg-green-500 text-white',
  };
  return colors[status] || 'bg-gray-500 text-white';
};

/**
 * Get category icon name
 */
export const getCategoryIconName = (category: string): string => {
  const icons: Record<string, string> = {
    power: 'zap',
    fan: 'fan',
    temperature: 'thermometer',
    cpu: 'cpu',
    memory: 'memory-stick',
    disk: 'hard-drive',
    raid: 'database',
    hardware: 'settings',
    system: 'server',
    network: 'network',
    load: 'activity',
    process: 'terminal',
    filesystem: 'folder',
  };
  return icons[category.toLowerCase()] || 'alert-triangle';
};

/**
 * Get source display name
 */
export const getSourceDisplayName = (source: string): string => {
  const names: Record<string, string> = {
    idrac: 'Dell iDRAC',
    ilo: 'HP iLO',
    node_exporter: 'Node Exporter',
  };
  const sourceLower = source.toLowerCase();
  if (sourceLower.includes('idrac')) return names.idrac;
  if (sourceLower.includes('ilo')) return names.ilo;
  if (sourceLower.includes('node')) return names.node_exporter;
  return source;
};

/**
 * Format duration in human-readable format
 */
export const formatDuration = (minutes: number): string => {
  if (minutes < 60) return `${minutes} min`;
  if (minutes < 1440) return `${Math.floor(minutes / 60)} hr ${minutes % 60} min`;
  return `${Math.floor(minutes / 1440)} day${Math.floor(minutes / 1440) > 1 ? 's' : ''}`;
};

/**
 * Check if alert is currently paused
 */
export const isAlertPaused = (alert: MonitoringAlert): boolean => {
  if (!alert.isPaused || !alert.pausedUntil) return false;
  return new Date(alert.pausedUntil).getTime() > Date.now();
};

/**
 * Get remaining pause time in minutes
 */
export const getRemainingPauseMinutes = (alert: MonitoringAlert): number => {
  if (!alert.isPaused || !alert.pausedUntil) return 0;
  const remaining = Math.floor((new Date(alert.pausedUntil).getTime() - Date.now()) / 60000);
  return Math.max(0, remaining);
};

// =============================================================================
// Export default service object
// =============================================================================

const monitoringService = {
  // Alert CRUD
  getMonitoringAlerts,
  getAlertById,
  getAlertsByAsset,
  getAlertsByDevice,

  // Alert Actions
  acknowledgeAlert,
  createIncidentFromAlert,
  silenceAlert,
  pauseAlert,
  resumeAlert,
  getAlertPauseStatus,

  // Alert Types & Categories
  getHardwareAlertTypes,
  getAlertSources,
  getAlertCategories,
  getAlertStatsByCategory,
  queryLokiLogs,

  // Helpers
  getSeverityColor,
  getStatusColor,
  getCategoryIconName,
  getSourceDisplayName,
  formatDuration,
  isAlertPaused,
  getRemainingPauseMinutes,
};

export default monitoringService;
