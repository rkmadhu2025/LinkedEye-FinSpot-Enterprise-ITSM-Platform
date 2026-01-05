import api from './api';
import { Integration, MonitoringAlert, CreateIntegrationData } from '@/types';

export const integrationService = {
  async getIntegrations(): Promise<Integration[]> {
    // Backend returns array directly, not wrapped in { success, data }
    const response = await api.get<Integration[]>('/integrations');
    return response.data;
  },

  async getIntegrationById(id: string): Promise<Integration> {
    // Backend returns integration directly
    const response = await api.get<Integration>(`/integrations/${id}`);
    return response.data;
  },

  async createIntegration(data: CreateIntegrationData): Promise<Integration> {
    // Backend returns integration directly
    const response = await api.post<Integration>('/integrations', data);
    return response.data;
  },

  async updateIntegration(id: string, data: Partial<CreateIntegrationData>): Promise<Integration> {
    // Backend returns integration directly
    const response = await api.put<Integration>(`/integrations/${id}`, data);
    return response.data;
  },

  async deleteIntegration(id: string): Promise<void> {
    await api.delete(`/integrations/${id}`);
  },

  async testConnection(id: string): Promise<{ success: boolean; message: string }> {
    const response = await api.post<{ success: boolean; message: string }>(`/integrations/${id}/test`);
    return response.data;
  },

  async syncIntegration(id: string): Promise<Integration> {
    // Backend returns integration directly
    const response = await api.post<Integration>(`/integrations/${id}/sync`);
    return response.data;
  },

  async toggleIntegration(id: string, enabled: boolean): Promise<Integration> {
    // Backend returns integration directly
    const response = await api.put<Integration>(`/integrations/${id}`, {
      status: enabled ? 'active' : 'inactive',
    });
    return response.data;
  },

  // Monitoring Alerts
  async getAlerts(params?: {
    integrationId?: string;
    status?: 'firing' | 'resolved' | 'acknowledged';
    severity?: string;
    limit?: number;
    offset?: number;
  }): Promise<MonitoringAlert[]> {
    const response = await api.get<{ success: boolean; data: MonitoringAlert[] }>('/monitoring/alerts', {
      params,
    });
    return response.data.data;
  },

  async getAlertById(id: string): Promise<MonitoringAlert> {
    const response = await api.get<{ success: boolean; data: MonitoringAlert }>(`/monitoring/alerts/${id}`);
    return response.data.data;
  },

  async acknowledgeAlert(id: string): Promise<MonitoringAlert> {
    const response = await api.post<{ success: boolean; data: MonitoringAlert }>(
      `/monitoring/alerts/${id}/acknowledge`
    );
    return response.data.data;
  },

  async createIncidentFromAlert(alertId: string): Promise<{ incidentId: string; incidentNumber: string }> {
    const response = await api.post<{ success: boolean; data: { incidentId: string; incidentNumber: string } }>(
      `/monitoring/alerts/${alertId}/create-incident`
    );
    return response.data.data;
  },

  async silenceAlert(id: string, duration: number): Promise<void> {
    await api.post(`/monitoring/alerts/${id}/silence`, { duration });
  },

  // Prometheus specific
  async getPrometheusMetrics(query: string, start?: string, end?: string): Promise<unknown> {
    const response = await api.get<{ success: boolean; data: unknown }>('/monitoring/prometheus/query', {
      params: { query, start, end },
    });
    return response.data.data;
  },

  // Grafana specific
  async getGrafanaDashboards(): Promise<Array<{ uid: string; title: string; url: string }>> {
    const response = await api.get<{ success: boolean; data: Array<{ uid: string; title: string; url: string }> }>(
      '/monitoring/grafana/dashboards'
    );
    return response.data.data;
  },

  // Kubernetes specific
  async getK8sEvents(namespace?: string): Promise<
    Array<{
      id: string;
      type: string;
      reason: string;
      message: string;
      involvedObject: { kind: string; name: string; namespace: string };
      firstTimestamp: string;
      lastTimestamp: string;
      count: number;
    }>
  > {
    const response = await api.get<{
      success: boolean;
      data: Array<{
        id: string;
        type: string;
        reason: string;
        message: string;
        involvedObject: { kind: string; name: string; namespace: string };
        firstTimestamp: string;
        lastTimestamp: string;
        count: number;
      }>;
    }>('/monitoring/kubernetes/events', { params: { namespace } });
    return response.data.data;
  },

  async getK8sPods(namespace?: string): Promise<
    Array<{
      name: string;
      namespace: string;
      status: string;
      ready: string;
      restarts: number;
      age: string;
    }>
  > {
    const response = await api.get<{
      success: boolean;
      data: Array<{
        name: string;
        namespace: string;
        status: string;
        ready: string;
        restarts: number;
        age: string;
      }>;
    }>('/monitoring/kubernetes/pods', { params: { namespace } });
    return response.data.data;
  },

  // Webhook endpoint for external integrations
  async getWebhookUrl(integrationType: string): Promise<{ url: string; secret: string }> {
    const response = await api.get<{ success: boolean; data: { url: string; secret: string } }>(
      `/integrations/webhook/${integrationType}`
    );
    return response.data.data;
  },

  // DevOps CI/CD integration
  async createIncidentFromCI(data: {
    source: string;
    pipeline: string;
    job: string;
    error: string;
    buildUrl: string;
    priority?: string;
  }): Promise<{ incidentId: string; incidentNumber: string }> {
    const response = await api.post<{ success: boolean; data: { incidentId: string; incidentNumber: string } }>(
      '/integrations/ci-cd/incident',
      data
    );
    return response.data.data;
  },
};
