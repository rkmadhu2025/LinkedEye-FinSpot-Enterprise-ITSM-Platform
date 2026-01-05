import api from './api';
import { Alert, AlertFilters, PaginatedResponse, CreateAlertData, UpdateAlertData } from '@/types';

export const alertService = {
  async getAlerts(
    page: number = 1,
    limit: number = 20,
    filters?: AlertFilters
  ): Promise<PaginatedResponse<Alert>> {
    const skip = (page - 1) * limit;
    const params: Record<string, string | number | undefined> = {
      skip,
      limit,
    };

    if (filters) {
      if (filters.severity) params.severity = filters.severity;
      if (filters.status) params.status = filters.status;
      if (filters.environmentId) params.environment_id = filters.environmentId;
      if (filters.assetId) params.asset_id = filters.assetId;
      if (filters.search) params.search = filters.search;
    }

    const response = await api.get<Alert[]>('/alerts', { params });
    return {
      data: response,
      pagination: {
        page,
        limit,
        total: response.length,
        totalPages: Math.ceil(response.length / limit),
      },
    };
  },

  async getAlertById(id: string): Promise<Alert> {
    return await api.get<Alert>(`/alerts/${id}`);
  },

  async createAlert(data: CreateAlertData): Promise<Alert> {
    return await api.post<Alert>('/alerts', data);
  },

  async updateAlert(id: string, data: UpdateAlertData): Promise<Alert> {
    return await api.put<Alert>(`/alerts/${id}`, data);
  },

  async acknowledgeAlert(id: string): Promise<Alert> {
    return await api.post<Alert>(`/alerts/${id}/acknowledge`);
  },

  async deleteAlert(id: string): Promise<void> {
    await api.delete(`/alerts/${id}`);
  },
};
