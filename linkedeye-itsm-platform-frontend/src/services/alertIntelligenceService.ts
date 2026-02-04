import api from './api';

export interface AlertGroupData {
  id: string;
  fingerprint: string;
  title: string;
  status: 'active' | 'acknowledged' | 'resolved' | 'suppressed';
  severity: string;
  first_seen_at: string;
  last_seen_at: string;
  alert_count: number;
  alert_ids: string[];
  source?: string;
  service_name?: string;
  labels: Record<string, any>;
  acknowledged_by_id?: string;
  acknowledged_at?: string;
  resolved_at?: string;
  created_at: string;
}

export interface AlertCorrelationData {
  id: string;
  alert_group_ids: string[];
  correlation_type: string;
  confidence_score: number;
  description?: string;
  evidence: Record<string, any>;
  auto_detected: boolean;
  detected_at?: string;
}

export interface AlertPatternData {
  id: string;
  name: string;
  description?: string;
  conditions: Record<string, any>;
  suggested_action?: string;
  auto_action_type?: string;
  times_matched: number;
  last_matched_at?: string;
  is_active: boolean;
}

export interface NoiseStatsData {
  date: string;
  total_alerts: number;
  deduplicated: number;
  grouped: number;
  suppressed: number;
  actionable: number;
  noise_reduction_percentage: number;
}

class AlertIntelligenceService {
  async getAlertGroups(skip = 0, limit = 50, filters?: { status?: string; severity?: string; source?: string; search?: string }) {
    const params = new URLSearchParams();
    params.set('skip', String(skip));
    params.set('limit', String(limit));
    if (filters?.status) params.set('status', filters.status);
    if (filters?.severity) params.set('severity', filters.severity);
    if (filters?.source) params.set('source', filters.source);
    if (filters?.search) params.set('search', filters.search);
    return api.get<AlertGroupData[]>(`/alert-intelligence/groups?${params}`);
  }

  async getAlertGroup(id: string) {
    return api.get<AlertGroupData>(`/alert-intelligence/groups/${id}`);
  }

  async acknowledgeGroup(id: string) {
    return api.post(`/alert-intelligence/groups/${id}/acknowledge`, {});
  }

  async resolveGroup(id: string) {
    return api.post(`/alert-intelligence/groups/${id}/resolve`, {});
  }

  async createIncidentFromGroup(id: string) {
    return api.post(`/alert-intelligence/groups/${id}/create-incident`, {});
  }

  async getCorrelations(skip = 0, limit = 50) {
    return api.get<AlertCorrelationData[]>(`/alert-intelligence/correlations?skip=${skip}&limit=${limit}`);
  }

  async getPatterns() {
    return api.get<AlertPatternData[]>('/alert-intelligence/patterns');
  }

  async createPattern(data: Partial<AlertPatternData>) {
    return api.post<AlertPatternData>('/alert-intelligence/patterns', data);
  }

  async updatePattern(id: string, data: Partial<AlertPatternData>) {
    return api.put<AlertPatternData>(`/alert-intelligence/patterns/${id}`, data);
  }

  async deletePattern(id: string) {
    return api.del(`/alert-intelligence/patterns/${id}`);
  }

  async getNoiseStats(period = '30d') {
    return api.get<NoiseStatsData[]>(`/alert-intelligence/noise-stats?period=${period}`);
  }

  async getStatsSummary() {
    return api.get(`/alert-intelligence/stats/summary`);
  }
}

export const alertIntelligenceService = new AlertIntelligenceService();
