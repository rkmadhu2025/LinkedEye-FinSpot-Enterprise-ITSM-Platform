import api, { get } from './api';
import { PaginatedResponse } from '@/types';

export type NetworkDeviceStatus = 'healthy' | 'warning' | 'critical' | 'maintenance' | 'unknown';

// Network Device Types
export interface NetworkDevice {
    id: string;
    name: string;
    type: string;
    ipAddress: string;
    macAddress?: string;
    status: NetworkDeviceStatus;
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
    diskUsage?: number;
    temperature?: number;
    packetLoss?: number;
    latency?: number;
    totalPorts?: number;
    usedPorts?: number;
    portStatus?: PortStatus[];
}

export interface PortStatus {
    name: string;
    status: 'up' | 'down';
    speed: string;
    rxBytes?: number;
    txBytes?: number;
}

export interface NetworkDeviceFilters {
    status?: NetworkDeviceStatus;
    type?: string;
    search?: string;
}

const mapBackendStatusToUi = (status?: string): NetworkDeviceStatus => {
    switch ((status || '').toLowerCase()) {
        case 'up': return 'healthy';
        case 'down': return 'critical';
        case 'warning': return 'warning';
        case 'maintenance': return 'maintenance';
        default: return 'unknown';
    }
};

const mapUiStatusToBackend = (status?: NetworkDeviceStatus): string | undefined => {
    switch (status) {
        case 'healthy': return 'up';
        case 'critical': return 'down';
        case 'warning': return 'warning';
        case 'maintenance': return 'maintenance';
        case 'unknown': return 'unknown';
        default: return undefined;
    }
};

const transformBackendDevice = (device: any): NetworkDevice => ({
    id: device.id,
    name: device.hostname || device.name,
    type: device.device_type || device.type,
    ipAddress: device.ip_address || device.ipAddress || '',
    macAddress: device.mac_address || device.macAddress,
    status: mapBackendStatusToUi(device.status),
    uptime: device.uptime_seconds
        ? `${Math.floor(device.uptime_seconds / 86400)}d ${Math.floor((device.uptime_seconds % 86400) / 3600)}h`
        : 'N/A',
    location: device.location,
    manufacturer: device.manufacturer,
    model: device.model,
    firmware: device.firmware_version || device.firmware,
    serialNumber: device.serial_number || device.serialNumber,
    description: device.description || device.notes,
    interfaces: device.interfaces || [],
    metrics: device.cpu_usage !== undefined || device.memory_usage !== undefined ? {
        cpuUsage: device.cpu_usage || device.cpuUsage || 0,
        memoryUsage: device.memory_usage || device.memoryUsage || 0,
        diskUsage: device.disk_usage || device.diskUsage,
        temperature: device.temperature,
        packetLoss: device.packet_loss || device.packetLoss,
        latency: device.latency,
        totalPorts: device.total_ports || device.totalPorts,
        usedPorts: device.used_ports || device.usedPorts,
        portStatus: Array.isArray(device.port_status) ? device.port_status.map((p: any) => ({
            name: p.name,
            status: p.status,
            speed: p.speed,
            rxBytes: p.rx_bytes,
            txBytes: p.tx_bytes,
        })) : undefined,
    } : undefined,
    lastSeen: device.last_seen_at || device.lastSeen,
    createdAt: device.created_at || device.createdAt,
});

export const networkService = {
    async getDevices(
        page: number = 1,
        limit: number = 20,
        filters?: NetworkDeviceFilters
    ): Promise<PaginatedResponse<NetworkDevice>> {
        const skip = (page - 1) * limit;
        const params: Record<string, any> = { skip, limit };

        if (filters?.search) params.search = filters.search;
        if (filters?.type) params.device_type = filters.type;
        if (filters?.status) params.status = mapUiStatusToBackend(filters.status);

        // Use the get helper which returns response.data directly
        const backendDevices = await get<any[]>('/network-devices', params);

        // Transform backend devices to frontend format
        const data = (backendDevices || []).map((device: any) => {
            try {
                return transformBackendDevice(device);
            } catch (e) {
                console.error('Error transforming device:', device, e);
                return null;
            }
        }).filter(Boolean) as NetworkDevice[];

        // Use backend total if available (from response headers or wrapper),
        // otherwise estimate from current page data
        const total = (backendDevices as any)?.total ?? (data.length < limit ? skip + data.length : skip + data.length + 1);

        return {
            data,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit) || 1,
            },
        };
    },

    async getDeviceById(id: string): Promise<NetworkDevice> {
        const response = await api.get<any>(`/network-devices/${id}`);
        // Backend returns NetworkDeviceResponse directly
        const backendDevice = response.data;
        
        // Transform backend response to frontend format
        return transformBackendDevice(backendDevice);
    },

    async createDevice(data: Partial<NetworkDevice>): Promise<NetworkDevice> {
        const payload: Record<string, unknown> = {
            hostname: data.name,
            device_type: data.type,
            manufacturer: data.manufacturer,
            model: data.model,
            serial_number: data.serialNumber,
            ip_address: data.ipAddress || undefined,
            location: data.location,
        };
        const response = await api.post<any>('/network-devices', payload);
        return transformBackendDevice(response.data);
    },

    async updateDevice(id: string, data: Partial<NetworkDevice>): Promise<NetworkDevice> {
        const payload: Record<string, unknown> = {};
        if (data.name !== undefined) payload.hostname = data.name;
        if (data.type !== undefined) payload.device_type = data.type;
        if (data.manufacturer !== undefined) payload.manufacturer = data.manufacturer;
        if (data.model !== undefined) payload.model = data.model;
        if (data.serialNumber !== undefined) payload.serial_number = data.serialNumber;
        if (data.ipAddress !== undefined) payload.ip_address = data.ipAddress || undefined;
        if (data.location !== undefined) payload.location = data.location;
        if (data.status !== undefined) payload.status = mapUiStatusToBackend(data.status);

        const response = await api.put<any>(`/network-devices/${id}`, payload);
        return transformBackendDevice(response.data);
    },

    async deleteDevice(id: string): Promise<void> {
        await api.delete(`/network-devices/${id}`);
    },

    async getDeviceMetrics(id: string, hours: number = 6): Promise<DeviceMetricsResponse> {
        const response = await api.get<DeviceMetricsResponse>(`/network-devices/${id}/metrics`, {
            params: { hours }
        });
        return response.data;
    },

    // Alert Configuration
    async getAlertConfigs(deviceId: string): Promise<AlertConfig[]> {
        const response = await api.get<AlertConfig[]>(`/network-devices/${deviceId}/alerts`);
        return response.data;
    },

    async createAlertConfig(deviceId: string, data: CreateAlertConfig): Promise<AlertConfig> {
        const response = await api.post<AlertConfig>(`/network-devices/${deviceId}/alerts`, data);
        return response.data;
    },

    async updateAlertConfig(deviceId: string, alertId: string, data: Partial<CreateAlertConfig>): Promise<AlertConfig> {
        const response = await api.put<AlertConfig>(`/network-devices/${deviceId}/alerts/${alertId}`, data);
        return response.data;
    },

    async deleteAlertConfig(deviceId: string, alertId: string): Promise<void> {
        await api.delete(`/network-devices/${deviceId}/alerts/${alertId}`);
    },

    // Network Topology
    async getTopologies(): Promise<any[]> {
        const response = await api.get('/network-topology');
        return response.data;
    },

    async getTopologyById(id: string): Promise<any> {
        const response = await api.get(`/network-topology/${id}`);
        return response.data;
    }
};

// Extended metrics response with history for graphs
export interface DeviceMetricsResponse {
    device_id: string;
    current: {
        cpu_usage: number;
        memory_usage: number;
        disk_usage: number;
        uptime_seconds: number;
        uptime_formatted: string;
        temperature: number;
        fan_status: string;
        fan_rpm: number;
        total_ports: number;
        used_ports: number;
        port_utilization: number;
        status: string;
        last_seen: string | null;
    };
    history: MetricsHistoryPoint[];
    interfaces: InterfaceMetrics[];
    alerts: DeviceAlert[];
}

export interface MetricsHistoryPoint {
    timestamp: string;
    cpu_usage: number;
    memory_usage: number;
    disk_usage: number;
    temperature: number;
    fan_status: string;
    network_in: number;
    network_out: number;
}

export interface InterfaceMetrics {
    id: string;
    name: string;
    type: string;
    status: 'up' | 'down';
    speed: string;
    mac_address: string;
    mtu: number;
    duplex: string;
    rx_bytes: number;
    tx_bytes: number;
    rx_errors: number;
    tx_errors: number;
    rx_packets: number;
    tx_packets: number;
    admin_status: string;
    oper_status: string;
    last_change: string;
}

export interface DeviceAlert {
    id: string;
    name: string;
    severity: 'warning' | 'critical';
    status: 'active' | 'resolved';
    threshold: number;
    current_value: number;
    message: string;
    created_at: string;
}

export interface AlertConfig {
    id: string;
    device_id: string;
    name: string;
    metric: string;
    condition: 'gt' | 'lt' | 'eq' | 'ne';
    threshold: number;
    severity: 'warning' | 'critical';
    enabled: boolean;
    notification_channels: string[];
    created_at: string;
    updated_at: string;
}

export interface CreateAlertConfig {
    name: string;
    metric: string;
    condition: 'gt' | 'lt' | 'eq' | 'ne';
    threshold: number;
    severity: 'warning' | 'critical';
    enabled: boolean;
    notification_channels: string[];
}
