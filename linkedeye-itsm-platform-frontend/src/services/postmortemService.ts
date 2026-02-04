import api from './api';

export interface PostmortemData {
  id: string;
  incident_id?: string;
  title: string;
  status: 'draft' | 'in_review' | 'published' | 'archived';
  summary?: string;
  timeline: { timestamp: string; event: string; description: string; user_id?: string }[];
  root_causes: string[];
  contributing_factors: string[];
  what_went_well: string[];
  what_went_wrong: string[];
  lessons_learned: string[];
  participants: string[];
  metrics: {
    time_to_detect_minutes?: number;
    time_to_acknowledge_minutes?: number;
    time_to_resolve_minutes?: number;
    impact_duration_minutes?: number;
    affected_users_count?: number;
    severity_level?: string;
    services_affected?: string[];
  };
  blame_free: boolean;
  published_at?: string;
  action_items_completion: number;
  created_at: string;
  updated_at: string;
}

export interface PostmortemActionItem {
  id: string;
  postmortem_id: string;
  title: string;
  description?: string;
  status: 'open' | 'in_progress' | 'completed' | 'cancelled';
  priority: 'critical' | 'high' | 'medium' | 'low';
  assignee_id?: string;
  due_date?: string;
  completed_at?: string;
  external_ticket_url?: string;
  tags: string[];
}

export interface PostmortemComment {
  id: string;
  user_id: string;
  content: string;
  is_internal: boolean;
  created_at: string;
}

class PostmortemService {
  async getPostmortems(skip = 0, limit = 50, filters?: { status?: string; search?: string }) {
    const params = new URLSearchParams();
    params.set('skip', String(skip));
    params.set('limit', String(limit));
    if (filters?.status) params.set('status', filters.status);
    if (filters?.search) params.set('search', filters.search);
    return api.get<PostmortemData[]>(`/postmortems?${params}`);
  }

  async getPostmortem(id: string) {
    return api.get<PostmortemData>(`/postmortems/${id}`);
  }

  async createPostmortem(data: Partial<PostmortemData>) {
    return api.post<PostmortemData>('/postmortems', data);
  }

  async updatePostmortem(id: string, data: Partial<PostmortemData>) {
    return api.put<PostmortemData>(`/postmortems/${id}`, data);
  }

  async deletePostmortem(id: string) {
    return api.del(`/postmortems/${id}`);
  }

  async generateFromIncident(incidentId: string) {
    return api.post<PostmortemData>(`/postmortems/generate/${incidentId}`, {});
  }

  async addActionItem(postmortemId: string, data: Partial<PostmortemActionItem>) {
    return api.post<PostmortemActionItem>(`/postmortems/${postmortemId}/action-items`, data);
  }

  async updateActionItem(postmortemId: string, itemId: string, data: Partial<PostmortemActionItem>) {
    return api.put<PostmortemActionItem>(`/postmortems/${postmortemId}/action-items/${itemId}`, data);
  }

  async getActionItems(postmortemId: string) {
    return api.get<PostmortemActionItem[]>(`/postmortems/${postmortemId}/action-items`);
  }

  async addComment(postmortemId: string, data: { content: string; is_internal?: boolean }) {
    return api.post<PostmortemComment>(`/postmortems/${postmortemId}/comments`, data);
  }

  async publish(postmortemId: string) {
    return api.post(`/postmortems/${postmortemId}/publish`, {});
  }

  async getStats() {
    return api.get(`/postmortems/stats/summary`);
  }
}

export const postmortemService = new PostmortemService();
