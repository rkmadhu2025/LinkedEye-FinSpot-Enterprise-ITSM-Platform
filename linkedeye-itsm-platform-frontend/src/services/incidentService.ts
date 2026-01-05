import api from './api';
import { Incident, IncidentActivity, IncidentFilters, PaginatedResponse, CreateIncidentData, UpdateIncidentData } from '@/types';

// Backend incident response type (snake_case)
interface BackendIncident {
  id: string;
  number: string;
  title: string;
  description: string;
  category?: string;
  subcategory?: string;
  priority: string;
  impact: string;
  urgency: string;
  status: string;
  assigned_to_id?: string;
  assigned_group?: string;
  created_by_id: string;
  environment_id?: string;
  sla_target?: string;
  sla_breached: boolean;
  first_response_at?: string;
  resolved_at?: string;
  closed_at?: string;
  affected_assets: string[];
  resolution_notes?: string;
  customer_impact?: string;
  workaround?: string;
  tags: string[];
  custom_fields: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

// Transform backend incident to frontend format
function transformIncident(backendIncident: BackendIncident): Incident {
  return {
    id: backendIncident.id,
    incidentNumber: backendIncident.number,
    title: backendIncident.title,
    description: backendIncident.description,
    status: backendIncident.status as Incident['status'],
    priority: backendIncident.priority as Incident['priority'],
    category: (backendIncident.category || 'other') as Incident['category'],
    impact: backendIncident.impact as Incident['impact'],
    urgency: backendIncident.urgency as Incident['urgency'],
    environmentId: backendIncident.environment_id,
    assignedTo: backendIncident.assigned_to_id,
    assignedGroupId: backendIncident.assigned_group,
    resolutionNotes: backendIncident.resolution_notes,
    workaround: backendIncident.workaround,
    slaResponseDue: backendIncident.sla_target,
    firstResponseAt: backendIncident.first_response_at,
    resolvedAt: backendIncident.resolved_at,
    closedAt: backendIncident.closed_at,
    reportedBy: backendIncident.created_by_id,
    reopenedCount: 0,
    tags: backendIncident.tags || [],
    customFields: backendIncident.custom_fields || {},
    createdAt: backendIncident.created_at,
    updatedAt: backendIncident.updated_at,
  };
}

export const incidentService = {
  async getIncidents(
    page: number = 1,
    limit: number = 20,
    filters?: IncidentFilters
  ): Promise<PaginatedResponse<Incident>> {
    // Convert page to skip for backend
    const skip = (page - 1) * limit;
    // Build params with proper array serialization
    const params: Record<string, string | number | undefined> = {
      skip,
      limit,
    };

    if (filters) {
      // Convert arrays to comma-separated strings for backend compatibility
      if (filters.status) {
        params.status = Array.isArray(filters.status) ? filters.status.join(',') : filters.status;
      }
      if (filters.priority) {
        params.priority = Array.isArray(filters.priority) ? filters.priority.join(',') : filters.priority;
      }
      if (filters.category) params.category = filters.category;
      if (filters.assignedTo) params.assignedTo = filters.assignedTo;
      if (filters.assignedGroupId) params.assignedGroupId = filters.assignedGroupId;
      if (filters.environmentId) params.environmentId = filters.environmentId;
      if (filters.search) params.search = filters.search;
      if (filters.dateFrom) params.dateFrom = filters.dateFrom;
      if (filters.dateTo) params.dateTo = filters.dateTo;
    }

    // Use axios directly to access response headers
    const axiosResponse = await api.get<BackendIncident[]>('/incidents', { params });
    const backendData = axiosResponse.data;

    // Transform backend snake_case to frontend camelCase
    const data = backendData.map(transformIncident);

    // Extract pagination info from headers (set by backend)
    const total = parseInt(axiosResponse.headers['x-total-count'] || '0', 10);
    const totalPages = parseInt(axiosResponse.headers['x-total-pages'] || '1', 10);

    return {
      data,
      pagination: {
        page,
        limit,
        total: total || data.length,
        totalPages: totalPages || Math.ceil((total || data.length) / limit),
      },
    };
  },

  async getIncidentById(id: string): Promise<Incident> {
    const response = await api.get<BackendIncident>(`/incidents/${id}`);
    return transformIncident(response.data);
  },

  async createIncident(data: CreateIncidentData): Promise<Incident> {
    // Transform frontend camelCase to backend snake_case
    const backendData = {
      title: data.title,
      description: data.description || '',
      priority: data.priority,
      category: data.category,
      impact: data.impact || 'medium',
      urgency: data.urgency || 'medium',
      environment_id: data.environmentId,
      assigned_to_id: data.assignedTo,
      assigned_group: data.assignedGroupId,
      tags: data.tags || [],
      custom_fields: {},
      affected_assets: [],
    };
    const response = await api.post<BackendIncident>('/incidents', backendData);
    return transformIncident(response.data);
  },

  async updateIncident(id: string, data: UpdateIncidentData): Promise<Incident> {
    // Transform frontend camelCase to backend snake_case
    const backendData: Record<string, unknown> = {};
    if (data.title !== undefined) backendData.title = data.title;
    if (data.description !== undefined) backendData.description = data.description;
    if (data.priority !== undefined) backendData.priority = data.priority;
    if (data.category !== undefined) backendData.category = data.category;
    if (data.impact !== undefined) backendData.impact = data.impact;
    if (data.urgency !== undefined) backendData.urgency = data.urgency;
    if (data.status !== undefined) backendData.status = data.status;
    if (data.environmentId !== undefined) backendData.environment_id = data.environmentId;
    if (data.assignedTo !== undefined) backendData.assigned_to_id = data.assignedTo;
    if (data.assignedGroupId !== undefined) backendData.assigned_group = data.assignedGroupId;
    if (data.resolutionNotes !== undefined) backendData.resolution_notes = data.resolutionNotes;
    if (data.workaround !== undefined) backendData.workaround = data.workaround;
    if (data.tags !== undefined) backendData.tags = data.tags;

    const response = await api.put<BackendIncident>(`/incidents/${id}`, backendData);
    return transformIncident(response.data);
  },

  async deleteIncident(id: string): Promise<void> {
    await api.delete(`/incidents/${id}`);
  },

  async addComment(id: string, comment: string, isPublic: boolean = true): Promise<IncidentActivity> {
    // Backend returns the activity directly
    const response = await api.post<IncidentActivity>(`/incidents/${id}/comments`, {
      comment,
      is_public: isPublic,
    });
    return response.data;
  },

  async getActivities(id: string): Promise<IncidentActivity[]> {
    // Backend returns array directly
    const response = await api.get<IncidentActivity[]>(`/incidents/${id}/activities`);
    return response.data;
  },

  async assignIncident(id: string, assignedTo: string, assignedGroupId?: string): Promise<Incident> {
    // Backend returns incident directly
    const response = await api.post<BackendIncident>(`/incidents/${id}/assign`, {
      assigned_to_id: assignedTo,
      assigned_group: assignedGroupId,
    });
    return transformIncident(response.data);
  },

  async resolveIncident(id: string, resolutionNotes: string, resolutionCode?: string): Promise<Incident> {
    // Backend returns incident directly
    const response = await api.post<BackendIncident>(`/incidents/${id}/resolve`, {
      resolution_notes: resolutionNotes,
      resolution_code: resolutionCode,
    });
    return transformIncident(response.data);
  },

  async closeIncident(id: string): Promise<Incident> {
    // Backend returns incident directly
    const response = await api.post<BackendIncident>(`/incidents/${id}/close`);
    return transformIncident(response.data);
  },

  async reopenIncident(id: string, reason: string): Promise<Incident> {
    // Backend returns incident directly
    const response = await api.post<BackendIncident>(`/incidents/${id}/reopen`, {
      reason,
    });
    return transformIncident(response.data);
  },

  async getRelatedIncidents(id: string): Promise<Incident[]> {
    // Backend returns array directly
    const response = await api.get<BackendIncident[]>(`/incidents/${id}/related`);
    return response.data.map(transformIncident);
  },

  async linkIncident(id: string, relatedIncidentId: string, relationshipType: string = 'related'): Promise<void> {
    // Note: Backend currently only supports GET /incidents/{id}/related
    // POST endpoint for linking incidents is planned for future implementation
    throw new Error('Incident linking feature is not yet available. Use related incidents view instead.');
  },

  async uploadAttachment(id: string, file: File): Promise<{ id: string; fileName: string; url: string }> {
    const formData = new FormData();
    formData.append('file', file);
    // Note: Backend endpoint for attachments not yet implemented
    const response = await api.post<{ id: string; fileName: string; url: string }>(
      `/incidents/${id}/attachments`,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    );
    return response.data;
  },

  async getStats(): Promise<{
    total: number;
    open: number;
    critical: number;
    high: number;
    medium: number;
    low: number;
    resolved: number;
  }> {
    const response = await api.get<{
      total: number;
      critical: number;
      high: number;
      medium: number;
      low: number;
      resolved: number;
    }>('/incidents/stats/summary');
    // Backend returns total and resolved, compute open
    const data = response.data;
    return {
      ...data,
      open: (data.total || 0) - (data.resolved || 0),
    };
  },
};
