import api from './api';

export interface RunbookData {
  id: string;
  name: string;
  description?: string;
  status: 'draft' | 'published' | 'archived';
  version: number;
  trigger_conditions: Record<string, any>;
  auto_trigger: boolean;
  tags: string[];
  category?: string;
  last_executed_at?: string;
  execution_count: number;
  avg_execution_time_seconds: number;
  success_rate: number;
  step_count: number;
  created_at: string;
  updated_at: string;
}

export interface RunbookStep {
  id: string;
  step_order: number;
  name: string;
  description?: string;
  action_type: string;
  configuration: Record<string, any>;
  timeout_seconds: number;
  retry_count: number;
  on_failure: 'abort' | 'continue' | 'skip_to';
  skip_to_step?: number;
  condition?: Record<string, any>;
  is_optional: boolean;
}

export interface RunbookExecution {
  id: string;
  runbook_id: string;
  incident_id?: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled' | 'paused' | 'awaiting_approval';
  current_step: number;
  started_at?: string;
  completed_at?: string;
  step_results: { step_order: number; status: string; started_at: string; completed_at?: string; output?: string; error?: string }[];
  error_message?: string;
  trigger_source: string;
  progress_percentage: number;
  created_at: string;
}

class RunbookService {
  async getRunbooks(skip = 0, limit = 50, filters?: { status?: string; category?: string; search?: string }) {
    const params = new URLSearchParams();
    params.set('skip', String(skip));
    params.set('limit', String(limit));
    if (filters?.status) params.set('status', filters.status);
    if (filters?.category) params.set('category', filters.category);
    if (filters?.search) params.set('search', filters.search);
    return api.get<RunbookData[]>(`/runbooks?${params}`);
  }

  async getRunbook(id: string) {
    return api.get<RunbookData & { steps: RunbookStep[] }>(`/runbooks/${id}`);
  }

  async createRunbook(data: { name: string; description?: string; category?: string; tags?: string[]; trigger_conditions?: Record<string, any> }) {
    return api.post<RunbookData>('/runbooks', data);
  }

  async updateRunbook(id: string, data: Partial<RunbookData>) {
    return api.put<RunbookData>(`/runbooks/${id}`, data);
  }

  async deleteRunbook(id: string) {
    return api.del(`/runbooks/${id}`);
  }

  async addStep(runbookId: string, data: Partial<RunbookStep>) {
    return api.post<RunbookStep>(`/runbooks/${runbookId}/steps`, data);
  }

  async updateStep(runbookId: string, stepId: string, data: Partial<RunbookStep>) {
    return api.put<RunbookStep>(`/runbooks/${runbookId}/steps/${stepId}`, data);
  }

  async deleteStep(runbookId: string, stepId: string) {
    return api.del(`/runbooks/${runbookId}/steps/${stepId}`);
  }

  async reorderSteps(runbookId: string, stepIds: string[]) {
    return api.post(`/runbooks/${runbookId}/steps/reorder`, { step_ids: stepIds });
  }

  async executeRunbook(runbookId: string, incidentId?: string) {
    return api.post<RunbookExecution>(`/runbooks/${runbookId}/execute`, { incident_id: incidentId });
  }

  async getExecutions(runbookId: string) {
    return api.get<RunbookExecution[]>(`/runbooks/${runbookId}/executions`);
  }

  async getExecution(executionId: string) {
    return api.get<RunbookExecution>(`/runbook-executions/${executionId}`);
  }

  async cancelExecution(executionId: string) {
    return api.post(`/runbook-executions/${executionId}/cancel`, {});
  }

  async approveStep(executionId: string, stepOrder: number) {
    return api.post(`/runbook-executions/${executionId}/steps/${stepOrder}/approve`, {});
  }

  async getTemplates() {
    return api.get(`/runbooks/templates/library`);
  }

  async getStats() {
    return api.get(`/runbooks/stats/summary`);
  }
}

export const runbookService = new RunbookService();
