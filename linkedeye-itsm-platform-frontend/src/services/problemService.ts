import api from './api';
import { Problem, ProblemFilters, PaginatedResponse, CreateProblemData, UpdateProblemData } from '@/types';

// Backend problem response type (snake_case)
interface BackendProblem {
  id: string;
  number: string;
  title: string;
  description: string;
  category?: string;
  priority: string;
  status: string;
  assigned_to_id?: string;
  created_by_id: string;
  environment_id?: string;
  root_cause?: string;
  resolution_summary?: string;
  resolved_at?: string;
  closed_at?: string;
  related_incidents: string[];
  related_changes: string[];
  affected_assets: string[];
  tags: string[];
  custom_fields: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

// Transform backend problem to frontend format
function transformProblem(backendProblem: BackendProblem): Problem {
  return {
    id: backendProblem.id,
    problemNumber: backendProblem.number,
    title: backendProblem.title,
    description: backendProblem.description,
    status: backendProblem.status as Problem['status'],
    priority: backendProblem.priority as Problem['priority'],
    category: (backendProblem.category || 'other') as Problem['category'],
    impact: 'medium',
    environmentId: backendProblem.environment_id,
    assignedTo: backendProblem.assigned_to_id,
    reportedBy: backendProblem.created_by_id,
    rootCause: backendProblem.root_cause,
    workaround: undefined,
    permanentFix: backendProblem.resolution_summary,
    workaroundAvailable: false,
    resolvedAt: backendProblem.resolved_at,
    closedAt: backendProblem.closed_at,
    tags: backendProblem.tags || [],
    createdAt: backendProblem.created_at,
    updatedAt: backendProblem.updated_at,
  };
}

// Transform frontend create data to backend format
function transformCreateData(data: CreateProblemData): Record<string, unknown> {
  return {
    title: data.title,
    description: data.description || '',
    priority: data.priority || 'medium',
    category: data.category,
    environment_id: data.environmentId,
    assigned_to_id: data.assignedTo,
    tags: data.tags || [],
    custom_fields: {},
    related_incidents: [],
    affected_assets: [],
  };
}

export const problemService = {
  async getProblems(
    page: number = 1,
    limit: number = 20,
    filters?: ProblemFilters
  ): Promise<PaginatedResponse<Problem>> {
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
      if (filters.priority) {
        params.priority = Array.isArray(filters.priority) ? filters.priority.join(',') : filters.priority;
      }
      if (filters.search) params.search = filters.search;
    }

    // Backend returns array directly with pagination in headers
    const axiosResponse = await api.get<BackendProblem[]>('/problems', { params });
    const backendData = axiosResponse.data;

    // Transform backend snake_case to frontend camelCase
    const data = backendData.map(transformProblem);

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

  async getProblemById(id: string): Promise<Problem> {
    const response = await api.get<BackendProblem>(`/problems/${id}`);
    return transformProblem(response.data);
  },

  async createProblem(data: CreateProblemData): Promise<Problem> {
    const backendData = transformCreateData(data);
    const response = await api.post<BackendProblem>('/problems', backendData);
    return transformProblem(response.data);
  },

  async updateProblem(id: string, data: UpdateProblemData): Promise<Problem> {
    // Transform frontend camelCase to backend snake_case
    const backendData: Record<string, unknown> = {};
    if (data.title !== undefined) backendData.title = data.title;
    if (data.description !== undefined) backendData.description = data.description;
    if (data.priority !== undefined) backendData.priority = data.priority;
    if (data.category !== undefined) backendData.category = data.category;
    if (data.status !== undefined) backendData.status = data.status;
    if (data.environmentId !== undefined) backendData.environment_id = data.environmentId;
    if (data.assignedTo !== undefined) backendData.assigned_to_id = data.assignedTo;
    if (data.rootCause !== undefined) backendData.root_cause = data.rootCause;
    if (data.workaround !== undefined) backendData.workaround = data.workaround;
    if (data.permanentFix !== undefined) backendData.resolution_summary = data.permanentFix;

    const response = await api.put<BackendProblem>(`/problems/${id}`, backendData);
    return transformProblem(response.data);
  },

  async deleteProblem(id: string): Promise<void> {
    await api.delete(`/problems/${id}`);
  },
};
