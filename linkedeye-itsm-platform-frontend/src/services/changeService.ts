import api from './api';
import { ChangeRequest, ChangeFilters, PaginatedResponse, CreateChangeData, ChangeActivity } from '@/types';

// Backend change response type (snake_case)
interface BackendChange {
  id: string;
  number: string;
  title: string;
  description: string;
  change_type: string;
  category?: string;
  priority: string;
  risk_level: string;
  status: string;
  requested_by_id: string;
  assigned_to_id?: string;
  change_manager_id?: string;
  scheduled_start?: string;
  scheduled_end?: string;
  actual_start?: string;
  actual_end?: string;
  implementation_plan?: string;
  rollback_plan?: string;
  test_plan?: string;
  business_justification?: string;
  impact_assessment?: string;
  affected_services: string[];
  affected_assets: string[];
  related_incidents: string[];
  completion_notes?: string;
  lessons_learned?: string;
  tags: string[];
  custom_fields: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

// Transform backend change to frontend format
function transformChange(backendChange: BackendChange): ChangeRequest {
  return {
    id: backendChange.id,
    changeNumber: backendChange.number,
    title: backendChange.title,
    description: backendChange.description,
    changeType: backendChange.change_type as ChangeRequest['changeType'],
    category: (backendChange.category || 'other') as ChangeRequest['category'],
    priority: backendChange.priority as ChangeRequest['priority'],
    risk: backendChange.risk_level as ChangeRequest['risk'],
    status: backendChange.status as ChangeRequest['status'],
    requestedBy: backendChange.requested_by_id,
    assignedTo: backendChange.assigned_to_id,
    scheduledStart: backendChange.scheduled_start,
    scheduledEnd: backendChange.scheduled_end,
    actualStart: backendChange.actual_start,
    actualEnd: backendChange.actual_end,
    implementationPlan: backendChange.implementation_plan,
    rollbackPlan: backendChange.rollback_plan,
    testPlan: backendChange.test_plan,
    justification: backendChange.business_justification,
    completionNotes: backendChange.completion_notes,
    tags: backendChange.tags || [],
    customFields: backendChange.custom_fields || {},
    downtimeRequired: false,
    cabRequired: false,
    createdAt: backendChange.created_at,
    updatedAt: backendChange.updated_at,
  };
}

// Transform frontend create data to backend format
function transformCreateData(data: CreateChangeData): Record<string, unknown> {
  return {
    title: data.title,
    description: data.description || '',
    change_type: data.changeType,
    category: data.category,
    priority: data.priority || 'medium',
    risk_level: data.risk,
    scheduled_start: data.scheduledStart,
    scheduled_end: data.scheduledEnd,
    implementation_plan: data.implementationPlan,
    rollback_plan: data.rollbackPlan,
    test_plan: data.testPlan,
    business_justification: data.justification,
    assigned_to_id: data.assignedTo,
    affected_assets: data.affectedAssetIds || [],
    tags: data.tags || [],
    custom_fields: {},
  };
}

export const changeService = {
  async getChanges(
    page: number = 1,
    limit: number = 20,
    filters?: ChangeFilters
  ): Promise<PaginatedResponse<ChangeRequest>> {
    // Convert page to skip for backend
    const skip = (page - 1) * limit;
    const params: Record<string, string | number | undefined> = {
      skip,
      limit,
    };

    if (filters) {
      if (filters.status) {
        params.status = Array.isArray(filters.status) ? filters.status.join(',') : filters.status;
      }
      if (filters.changeType) params.change_type = filters.changeType;
      if (filters.risk) params.risk_level = filters.risk;
      if (filters.search) params.search = filters.search;
    }

    // Backend returns array directly with pagination in headers
    const axiosResponse = await api.get<BackendChange[]>('/changes', { params });
    const backendData = axiosResponse.data;

    // Transform backend snake_case to frontend camelCase
    const data = backendData.map(transformChange);

    // Extract pagination info from headers
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

  async getChangeById(id: string): Promise<ChangeRequest> {
    const response = await api.get<BackendChange>(`/changes/${id}`);
    return transformChange(response.data);
  },

  async createChange(data: CreateChangeData): Promise<ChangeRequest> {
    const backendData = transformCreateData(data);
    const response = await api.post<BackendChange>('/changes', backendData);
    return transformChange(response.data);
  },

  async updateChange(id: string, data: Partial<CreateChangeData>): Promise<ChangeRequest> {
    // Transform frontend camelCase to backend snake_case
    const backendData: Record<string, unknown> = {};
    if (data.title !== undefined) backendData.title = data.title;
    if (data.description !== undefined) backendData.description = data.description;
    if (data.changeType !== undefined) backendData.change_type = data.changeType;
    if (data.category !== undefined) backendData.category = data.category;
    if (data.priority !== undefined) backendData.priority = data.priority;
    if (data.risk !== undefined) backendData.risk_level = data.risk;
    if (data.scheduledStart !== undefined) backendData.scheduled_start = data.scheduledStart;
    if (data.scheduledEnd !== undefined) backendData.scheduled_end = data.scheduledEnd;
    if (data.implementationPlan !== undefined) backendData.implementation_plan = data.implementationPlan;
    if (data.rollbackPlan !== undefined) backendData.rollback_plan = data.rollbackPlan;
    if (data.testPlan !== undefined) backendData.test_plan = data.testPlan;
    if (data.justification !== undefined) backendData.business_justification = data.justification;
    if (data.assignedTo !== undefined) backendData.assigned_to_id = data.assignedTo;
    if (data.tags !== undefined) backendData.tags = data.tags;

    const response = await api.put<BackendChange>(`/changes/${id}`, backendData);
    return transformChange(response.data);
  },

  async deleteChange(id: string): Promise<void> {
    await api.delete(`/changes/${id}`);
  },

  async getCalendarChanges(startDate: string, endDate: string): Promise<ChangeRequest[]> {
    const response = await api.get<BackendChange[]>('/changes/calendar', {
      params: { startDate, endDate },
    });
    return response.data.map(transformChange);
  },

  async submitForApproval(id: string): Promise<ChangeRequest> {
    const response = await api.post<BackendChange>(`/changes/${id}/submit`);
    return transformChange(response.data);
  },

  async approveChange(id: string, comments?: string): Promise<ChangeRequest> {
    const response = await api.post<BackendChange>(`/changes/${id}/approve`, {
      comments,
    });
    return transformChange(response.data);
  },

  async rejectChange(id: string, comments: string): Promise<ChangeRequest> {
    const response = await api.post<BackendChange>(`/changes/${id}/reject`, {
      comments,
    });
    return transformChange(response.data);
  },

  async startImplementation(id: string): Promise<ChangeRequest> {
    const response = await api.post<BackendChange>(`/changes/${id}/start`);
    return transformChange(response.data);
  },

  async completeChange(id: string, notes?: string): Promise<ChangeRequest> {
    const response = await api.post<BackendChange>(`/changes/${id}/complete`, {
      notes,
    });
    return transformChange(response.data);
  },

  async failChange(id: string, reason: string): Promise<ChangeRequest> {
    const response = await api.post<BackendChange>(`/changes/${id}/fail`, {
      reason,
    });
    return transformChange(response.data);
  },

  async cancelChange(id: string, reason: string): Promise<ChangeRequest> {
    const response = await api.post<BackendChange>(`/changes/${id}/cancel`, {
      reason,
    });
    return transformChange(response.data);
  },

  async rollbackChange(id: string, reason: string): Promise<ChangeRequest> {
    const response = await api.post<BackendChange>(`/changes/${id}/rollback`, {
      reason,
    });
    return transformChange(response.data);
  },

  async addComment(id: string, comment: string): Promise<ChangeActivity> {
    const response = await api.post<ChangeActivity>(`/changes/${id}/comments`, {
      comment,
    });
    return response.data;
  },

  async getActivities(id: string): Promise<ChangeActivity[]> {
    const response = await api.get<ChangeActivity[]>(`/changes/${id}/activities`);
    return response.data;
  },

  async getApprovals(id: string): Promise<ChangeRequest['approvals']> {
    const response = await api.get<ChangeRequest['approvals']>(`/changes/${id}/approvals`);
    return response.data;
  },

  async addApprover(id: string, approverId: string, role?: string): Promise<void> {
    await api.post(`/changes/${id}/approvers`, {
      approverId,
      role,
    });
  },

  async getStats(): Promise<{
    total: number;
    pending: number;
    scheduled: number;
    implementing: number;
    completedThisWeek: number;
    failedThisWeek: number;
  }> {
    const response = await api.get<{
      total: number;
      pending: number;
      scheduled: number;
      implementing: number;
      completedThisWeek: number;
      failedThisWeek: number;
    }>('/changes/stats/summary');
    return response.data;
  },
};
