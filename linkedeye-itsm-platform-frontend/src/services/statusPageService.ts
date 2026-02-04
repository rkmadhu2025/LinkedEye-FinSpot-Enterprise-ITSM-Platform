import api from './api';

export interface StatusPageComponent {
  id: string;
  name: string;
  description?: string;
  status: 'operational' | 'degraded_performance' | 'partial_outage' | 'major_outage' | 'under_maintenance';
  order: number;
  group?: string;
  uptime_history?: { date: string; uptime: number }[];
}

export interface StatusPageIncidentUpdate {
  id: string;
  status: 'investigating' | 'identified' | 'monitoring' | 'resolved';
  message: string;
  created_at: string;
}

export interface StatusPageIncident {
  id: string;
  title: string;
  status: 'investigating' | 'identified' | 'monitoring' | 'resolved';
  impact: 'none' | 'minor' | 'major' | 'critical';
  components: string[];
  updates: StatusPageIncidentUpdate[];
  created_at: string;
  resolved_at?: string;
}

export interface StatusPage {
  id: string;
  name: string;
  slug: string;
  description?: string;
  header_color: string;
  overall_status: 'operational' | 'degraded' | 'partial_outage' | 'major_outage';
  components: StatusPageComponent[];
  incidents: StatusPageIncident[];
  subscriber_count: number;
  is_public: boolean;
  created_at: string;
  updated_at: string;
}

export interface StatusPageCreate {
  name: string;
  slug: string;
  description?: string;
  header_color?: string;
  is_public?: boolean;
}

class StatusPageService {
  async getStatusPages(): Promise<StatusPage[]> {
    const { data } = await api.get('/status-pages');
    return data;
  }

  async getStatusPage(id: string): Promise<StatusPage> {
    const { data } = await api.get(`/status-pages/${id}`);
    return data;
  }

  async getPublicStatusPage(slug: string): Promise<StatusPage> {
    const { data } = await api.get(`/public/status/${slug}`);
    return data;
  }

  async createStatusPage(payload: StatusPageCreate): Promise<StatusPage> {
    const { data } = await api.post('/status-pages', payload);
    return data;
  }

  async updateStatusPage(id: string, payload: Partial<StatusPage>): Promise<StatusPage> {
    const { data } = await api.put(`/status-pages/${id}`, payload);
    return data;
  }

  async deleteStatusPage(id: string): Promise<void> {
    await api.delete(`/status-pages/${id}`);
  }

  async addComponent(pageId: string, component: Partial<StatusPageComponent>): Promise<StatusPageComponent> {
    const { data } = await api.post(`/status-pages/${pageId}/components`, component);
    return data;
  }

  async updateComponent(pageId: string, componentId: string, payload: Partial<StatusPageComponent>): Promise<StatusPageComponent> {
    const { data } = await api.put(`/status-pages/${pageId}/components/${componentId}`, payload);
    return data;
  }

  async deleteComponent(pageId: string, componentId: string): Promise<void> {
    await api.delete(`/status-pages/${pageId}/components/${componentId}`);
  }

  async createIncident(pageId: string, incident: Partial<StatusPageIncident>): Promise<StatusPageIncident> {
    const { data } = await api.post(`/status-pages/${pageId}/incidents`, incident);
    return data;
  }

  async addIncidentUpdate(pageId: string, incidentId: string, update: Partial<StatusPageIncidentUpdate>): Promise<StatusPageIncidentUpdate> {
    const { data } = await api.post(`/status-pages/${pageId}/incidents/${incidentId}/updates`, update);
    return data;
  }

  async subscribe(slug: string, email: string): Promise<void> {
    await api.post(`/public/status/${slug}/subscribe`, { email });
  }
}

export const statusPageService = new StatusPageService();
export default statusPageService;
