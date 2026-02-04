/**
 * Client Service
 * Handles API calls for client/tenant management
 */

import api from './api';
import {
  Client,
  ClientCreate,
  ClientUpdate,
  ClientStatistics,
  ClientWithStats,
} from '@/types';

const BASE_URL = '/clients';

export interface ClientFilters {
  environment?: string;
  status?: string;
  search?: string;
  skip?: number;
  limit?: number;
}

export const clientService = {
  /**
   * List all clients (admin sees all, users see only their client)
   */
  async listClients(filters: ClientFilters = {}): Promise<Client[]> {
    const params = new URLSearchParams();
    if (filters.environment) params.append('environment', filters.environment);
    if (filters.status) params.append('status', filters.status);
    if (filters.search) params.append('search', filters.search);
    if (filters.skip !== undefined) params.append('skip', String(filters.skip));
    if (filters.limit !== undefined) params.append('limit', String(filters.limit));

    const response = await api.get<Client[]>(`${BASE_URL}?${params.toString()}`);
    return response.data;
  },

  /**
   * Get current user's client
   */
  async getCurrentClient(): Promise<Client> {
    const response = await api.get<Client>(`${BASE_URL}/current`);
    return response.data;
  },

  /**
   * Get a specific client by ID
   */
  async getClient(id: string, includeStats = false): Promise<ClientWithStats> {
    const response = await api.get<ClientWithStats>(
      `${BASE_URL}/${id}?include_stats=${includeStats}`
    );
    return response.data;
  },

  /**
   * Get statistics for all clients (admin only)
   */
  async getAllClientStatistics(): Promise<ClientStatistics[]> {
    const response = await api.get<ClientStatistics[]>(`${BASE_URL}/statistics`);
    return response.data;
  },

  /**
   * Create a new client (admin only)
   */
  async createClient(data: ClientCreate): Promise<Client> {
    const response = await api.post<Client>(BASE_URL, data);
    return response.data;
  },

  /**
   * Update a client (admin only)
   */
  async updateClient(id: string, data: ClientUpdate): Promise<Client> {
    const response = await api.put<Client>(`${BASE_URL}/${id}`, data);
    return response.data;
  },

  /**
   * Delete/deactivate a client (admin only)
   */
  async deleteClient(id: string): Promise<{ message: string }> {
    const response = await api.delete<{ message: string }>(`${BASE_URL}/${id}`);
    return response.data;
  },

  /**
   * Get environment options for dropdowns
   */
  async getEnvironmentOptions(): Promise<{ value: string; label: string }[]> {
    const response = await api.get<{ value: string; label: string }[]>(
      `${BASE_URL}/options/environments`
    );
    return response.data;
  },

  /**
   * Get status options for dropdowns
   */
  async getStatusOptions(): Promise<{ value: string; label: string }[]> {
    const response = await api.get<{ value: string; label: string }[]>(
      `${BASE_URL}/options/statuses`
    );
    return response.data;
  },

  // Helper methods

  /**
   * Get environment badge color
   */
  getEnvironmentColor(environment: string): string {
    const colors: Record<string, string> = {
      production: 'green',
      dr: 'orange',
      uat: 'blue',
      development: 'purple',
      staging: 'gray',
    };
    return colors[environment] || 'gray';
  },

  /**
   * Get status badge color
   */
  getStatusColor(status: string): string {
    const colors: Record<string, string> = {
      active: 'green',
      inactive: 'gray',
      suspended: 'red',
      onboarding: 'blue',
    };
    return colors[status] || 'gray';
  },

  /**
   * Get SLA tier badge color
   */
  getSLATierColor(tier: string): string {
    const colors: Record<string, string> = {
      standard: 'gray',
      premium: 'blue',
      enterprise: 'purple',
    };
    return colors[tier] || 'gray';
  },

  /**
   * Format client display name
   */
  getDisplayName(client: Client): string {
    return client.display_name || client.name;
  },

  /**
   * Get full display name with environment
   */
  getFullDisplayName(client: Client): string {
    const envSuffix = client.environment !== 'production'
      ? ` (${client.environment.toUpperCase()})`
      : '';
    return `${this.getDisplayName(client)}${envSuffix}`;
  },

  /**
   * Check if client is a production environment
   */
  isProduction(client: Client): boolean {
    return client.environment === 'production' || client.environment === 'dr';
  },

  /**
   * Get local storage key for selected client
   */
  getSelectedClientKey(): string {
    return 'linkedeye_selected_client_id';
  },

  /**
   * Store selected client ID in local storage (for admin context switching)
   */
  setSelectedClient(clientId: string | null): void {
    if (clientId) {
      localStorage.setItem(this.getSelectedClientKey(), clientId);
    } else {
      localStorage.removeItem(this.getSelectedClientKey());
    }
  },

  /**
   * Get selected client ID from local storage
   */
  getSelectedClientId(): string | null {
    return localStorage.getItem(this.getSelectedClientKey());
  },

  /**
   * Clear selected client (show all)
   */
  clearSelectedClient(): void {
    localStorage.removeItem(this.getSelectedClientKey());
  },
};

export default clientService;
