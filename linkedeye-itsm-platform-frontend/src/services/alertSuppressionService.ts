/**
 * Alert Suppression Service
 * Handles API calls for alert suppression management
 */

import api from './api';
import {
  AlertSuppression,
  AlertSuppressionCreate,
  AlertSuppressionUpdate,
  AssetSuppressionStatus,
} from '@/types';

const BASE_URL = '/alert-suppressions';

export interface AlertSuppressionFilters {
  asset_id?: string;
  network_device_id?: string;
  environment_id?: string;
  active_only?: boolean;
  skip?: number;
  limit?: number;
}

export const alertSuppressionService = {
  /**
   * List alert suppressions with optional filters
   */
  async listSuppressions(filters: AlertSuppressionFilters = {}): Promise<AlertSuppression[]> {
    const params = new URLSearchParams();
    if (filters.asset_id) params.append('asset_id', filters.asset_id);
    if (filters.network_device_id) params.append('network_device_id', filters.network_device_id);
    if (filters.environment_id) params.append('environment_id', filters.environment_id);
    if (filters.active_only !== undefined) params.append('active_only', String(filters.active_only));
    if (filters.skip !== undefined) params.append('skip', String(filters.skip));
    if (filters.limit !== undefined) params.append('limit', String(filters.limit));

    const response = await api.get<AlertSuppression[]>(`${BASE_URL}?${params.toString()}`);
    return response.data;
  },

  /**
   * Get a specific suppression by ID
   */
  async getSuppression(id: string): Promise<AlertSuppression> {
    const response = await api.get<AlertSuppression>(`${BASE_URL}/${id}`);
    return response.data;
  },

  /**
   * Create a new alert suppression
   */
  async createSuppression(data: AlertSuppressionCreate): Promise<AlertSuppression> {
    const response = await api.post<AlertSuppression>(BASE_URL, data);
    return response.data;
  },

  /**
   * Update an existing suppression
   */
  async updateSuppression(id: string, data: AlertSuppressionUpdate): Promise<AlertSuppression> {
    const response = await api.put<AlertSuppression>(`${BASE_URL}/${id}`, data);
    return response.data;
  },

  /**
   * Delete a suppression
   */
  async deleteSuppression(id: string): Promise<{ message: string }> {
    const response = await api.delete<{ message: string }>(`${BASE_URL}/${id}`);
    return response.data;
  },

  /**
   * Extend a suppression duration
   */
  async extendSuppression(id: string, extendHours: number): Promise<AlertSuppression> {
    const response = await api.post<AlertSuppression>(`${BASE_URL}/${id}/extend`, {
      extend_hours: extendHours,
    });
    return response.data;
  },

  // Asset-specific endpoints

  /**
   * Create suppression for an asset
   */
  async suppressAssetAlerts(assetId: string, data: AlertSuppressionCreate): Promise<AlertSuppression> {
    const response = await api.post<AlertSuppression>(
      `${BASE_URL}/assets/${assetId}/suppress`,
      data
    );
    return response.data;
  },

  /**
   * Remove all active suppressions for an asset
   */
  async removeAssetSuppression(assetId: string): Promise<{ message: string }> {
    const response = await api.delete<{ message: string }>(`${BASE_URL}/assets/${assetId}/suppress`);
    return response.data;
  },

  /**
   * Get suppression status for an asset
   */
  async getAssetSuppressionStatus(assetId: string): Promise<AssetSuppressionStatus> {
    const response = await api.get<AssetSuppressionStatus>(
      `${BASE_URL}/assets/${assetId}/suppression-status`
    );
    return response.data;
  },

  // Network device-specific endpoints

  /**
   * Create suppression for a network device
   */
  async suppressDeviceAlerts(deviceId: string, data: AlertSuppressionCreate): Promise<AlertSuppression> {
    const response = await api.post<AlertSuppression>(
      `${BASE_URL}/network-devices/${deviceId}/suppress`,
      data
    );
    return response.data;
  },

  /**
   * Remove all active suppressions for a network device
   */
  async removeDeviceSuppression(deviceId: string): Promise<{ message: string }> {
    const response = await api.delete<{ message: string }>(
      `${BASE_URL}/network-devices/${deviceId}/suppress`
    );
    return response.data;
  },

  // Helper methods

  /**
   * Get suppression type options
   */
  getSuppressionTypeOptions(): { label: string; value: string; description: string }[] {
    return [
      {
        label: 'Manual',
        value: 'manual',
        description: 'Manually suppress alerts until explicitly removed',
      },
      {
        label: 'Scheduled',
        value: 'scheduled',
        description: 'Suppress alerts for a specific time period',
      },
      {
        label: 'Maintenance',
        value: 'maintenance',
        description: 'Suppress during a maintenance window',
      },
    ];
  },

  /**
   * Get severity filter options
   */
  getSeverityOptions(): { label: string; value: string }[] {
    return [
      { label: 'Info', value: 'info' },
      { label: 'Low', value: 'low' },
      { label: 'Medium', value: 'medium' },
      { label: 'High', value: 'high' },
      { label: 'Critical', value: 'critical' },
    ];
  },

  /**
   * Check if a suppression is expired
   */
  isExpired(suppression: AlertSuppression): boolean {
    if (!suppression.end_time) return false;
    return new Date(suppression.end_time) < new Date();
  },

  /**
   * Get time remaining for a suppression
   */
  getTimeRemaining(suppression: AlertSuppression): string {
    if (!suppression.end_time) return 'Indefinite';

    const end = new Date(suppression.end_time);
    const now = new Date();
    const diff = end.getTime() - now.getTime();

    if (diff <= 0) return 'Expired';

    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

    if (hours > 24) {
      const days = Math.floor(hours / 24);
      return `${days} day${days > 1 ? 's' : ''} remaining`;
    }

    if (hours > 0) {
      return `${hours}h ${minutes}m remaining`;
    }

    return `${minutes}m remaining`;
  },

  /**
   * Format duration for display
   */
  formatDuration(hours: number): string {
    if (hours < 1) return `${Math.round(hours * 60)} minutes`;
    if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''}`;
    const days = Math.floor(hours / 24);
    return `${days} day${days > 1 ? 's' : ''}`;
  },

  /**
   * Get quick duration options for suppression
   */
  getQuickDurationOptions(): { label: string; hours: number }[] {
    return [
      { label: '30 minutes', hours: 0.5 },
      { label: '1 hour', hours: 1 },
      { label: '2 hours', hours: 2 },
      { label: '4 hours', hours: 4 },
      { label: '8 hours', hours: 8 },
      { label: '24 hours', hours: 24 },
      { label: '3 days', hours: 72 },
      { label: '1 week', hours: 168 },
      { label: 'Indefinite', hours: 0 },
    ];
  },
};

export default alertSuppressionService;
