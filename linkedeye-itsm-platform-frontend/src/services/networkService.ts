import api from './api';
import { PaginatedResponse } from '@/types';

// Network Device Types
export interface NetworkDevice {
    id: string;
    name: string;
    type: string;
    ipAddress: string;
    macAddress?: string;
    status: 'healthy' | 'warning' | 'critical';
    uptime: string;
    location?: string;
    manufacturer?: string;
    model?: string;
    firmware?: string;
    serialNumber?: string;
    description?: string;
    interfaces?: NetworkInterface[];
    metrics?: DeviceMetrics;
    lastSeen?: string;
    createdAt?: string;
}

export interface NetworkInterface {
    id: string;
    name: string;
    type: string;
    status: 'up' | 'down';
    speed: string;
    macAddress: string;
}

export interface DeviceMetrics {
    cpuUsage: number;
    memoryUsage: number;
    temperature?: number;
    packetLoss?: number;
    latency?: number;
}

export interface NetworkDeviceFilters {
    status?: string;
    type?: string;
    search?: string;
}

export const networkService = {
    async getDevices(
        page: number = 1,
        limit: number = 20,
        filters?: NetworkDeviceFilters
    ): Promise<PaginatedResponse<NetworkDevice>> {
        const params = {
            page,
            limit,
            ...filters,
        };
        const response = await api.get<{ success: boolean; data: NetworkDevice[]; pagination: PaginatedResponse<NetworkDevice>['pagination'] }>(
            '/network/devices',
            { params }
        );
        // If backend returns flat list, we need to mock pagination or handle it.
        // Assuming backend will be aligned or we handle it here.
        if (Array.isArray(response.data)) {
            // Fallback for flat list API
            const data = response.data as NetworkDevice[];
            return {
                data,
                pagination: { page, limit, total: data.length, totalPages: 1 }
            };
        }
        return {
            data: response.data.data,
            pagination: response.data.pagination,
        };
    },

    async getDeviceById(id: string): Promise<NetworkDevice> {
        const response = await api.get<NetworkDevice | { data: NetworkDevice }>(`/network/devices/${id}`);
        // Handle both wrapped and unwrapped responses
        if ('data' in response) {
            return (response as { data: NetworkDevice }).data;
        }
        return response as NetworkDevice;
    },

    async createDevice(data: Partial<NetworkDevice>): Promise<NetworkDevice> {
        const response = await api.post<NetworkDevice>('/network/devices', data);
        return response.data;
    },

    async updateDevice(id: string, data: Partial<NetworkDevice>): Promise<NetworkDevice> {
        const response = await api.put<NetworkDevice>(`/network/devices/${id}`, data);
        return response.data;
    },

    async deleteDevice(id: string): Promise<void> {
        await api.delete(`/network/devices/${id}`);
    },

    async getDeviceMetrics(id: string): Promise<DeviceMetrics> {
        const response = await api.get<DeviceMetrics>(`/network/devices/${id}/metrics`);
        return response.data;
    }
};
