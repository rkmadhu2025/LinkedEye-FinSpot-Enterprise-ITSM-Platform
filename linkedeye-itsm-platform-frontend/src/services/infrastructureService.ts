/**
 * Infrastructure Service
 *
 * Handles API calls for the Network Flow Architecture including:
 * - Infrastructure Hosts (devices across all network layers)
 * - Port/Interface management
 * - Network Connections (Neo4j-style relationships)
 * - Device Templates (catalog)
 * - Topology management
 * - VM-Physical mappings
 */

import api from './api';
import {
  InfrastructureHost,
  InfrastructureHostCreate,
  InfrastructureHostUpdate,
  InfrastructureHostFilters,
  HostPort,
  HostPortCreate,
  HostPortUpdate,
  NetworkConnection,
  NetworkConnectionCreate,
  NetworkConnectionUpdate,
  DeviceTemplate,
  DeviceTemplateCreate,
  DeviceTemplateUpdate,
  InfrastructureTopology,
  InfrastructureTopologyCreate,
  InfrastructureTopologyUpdate,
  TopologyData,
  InfrastructureStats,
  LayerStats,
  VMPhysicalMapping,
  NetworkLayerType,
  DeviceVendor,
  SwitchNetworkType,
  ServerType,
  ConnectionRelationshipType,
  PortStatus,
} from '../types';

const BASE_URL = '/infrastructure';

// =====================================
// Infrastructure Hosts
// =====================================

export const infrastructureHostService = {
  /**
   * List all infrastructure hosts with optional filtering
   */
  async list(
    page: number = 1,
    limit: number = 50,
    filters?: InfrastructureHostFilters
  ): Promise<{ data: InfrastructureHost[]; total: number }> {
    const params = new URLSearchParams();
    params.append('page', page.toString());
    params.append('limit', limit.toString());

    if (filters) {
      if (filters.network_layer) params.append('network_layer', filters.network_layer);
      if (filters.device_category) params.append('device_category', filters.device_category);
      if (filters.device_vendor) params.append('device_vendor', filters.device_vendor);
      if (filters.switch_network_type) params.append('switch_network_type', filters.switch_network_type);
      if (filters.server_type) params.append('server_type', filters.server_type);
      if (filters.operational_status) params.append('operational_status', filters.operational_status);
      if (filters.health_status) params.append('health_status', filters.health_status);
      if (filters.data_center) params.append('data_center', filters.data_center);
      if (filters.search) params.append('search', filters.search);
    }

    const response = await api.get(`${BASE_URL}/hosts?${params.toString()}`);
    return {
      data: response.data,
      total: parseInt(response.headers['x-total-count'] || response.data.length)
    };
  },

  /**
   * Get hosts by network layer
   */
  async getByLayer(
    layer: NetworkLayerType,
    switchNetworkType?: SwitchNetworkType
  ): Promise<InfrastructureHost[]> {
    const params = new URLSearchParams();
    if (switchNetworkType) {
      params.append('switch_network_type', switchNetworkType);
    }
    const response = await api.get(`${BASE_URL}/hosts/by-layer/${layer}?${params.toString()}`);
    return response.data;
  },

  /**
   * Get a single host by ID
   */
  async getById(id: string): Promise<InfrastructureHost> {
    const response = await api.get(`${BASE_URL}/hosts/${id}`);
    return response.data;
  },

  /**
   * Create a new infrastructure host
   */
  async create(data: InfrastructureHostCreate): Promise<InfrastructureHost> {
    const response = await api.post(`${BASE_URL}/hosts`, data);
    return response.data;
  },

  /**
   * Update an infrastructure host
   */
  async update(id: string, data: InfrastructureHostUpdate): Promise<InfrastructureHost> {
    const response = await api.put(`${BASE_URL}/hosts/${id}`, data);
    return response.data;
  },

  /**
   * Delete an infrastructure host (soft delete)
   */
  async delete(id: string): Promise<void> {
    await api.delete(`${BASE_URL}/hosts/${id}`);
  },

  /**
   * Get connections for a host
   */
  async getConnections(
    hostId: string,
    direction?: 'incoming' | 'outgoing' | 'both'
  ): Promise<NetworkConnection[]> {
    const params = direction ? `?direction=${direction}` : '';
    const response = await api.get(`${BASE_URL}/hosts/${hostId}/connections${params}`);
    return response.data;
  },
};

// =====================================
// Host Ports
// =====================================

export const hostPortService = {
  /**
   * List all ports for a host
   */
  async list(hostId: string, operationalStatus?: PortStatus): Promise<HostPort[]> {
    const params = operationalStatus ? `?operational_status=${operationalStatus}` : '';
    const response = await api.get(`${BASE_URL}/hosts/${hostId}/ports${params}`);
    return response.data;
  },

  /**
   * Create a new port for a host
   */
  async create(hostId: string, data: HostPortCreate): Promise<HostPort> {
    const response = await api.post(`${BASE_URL}/hosts/${hostId}/ports`, data);
    return response.data;
  },

  /**
   * Update a port for a host
   */
  async update(portId: string, data: HostPortUpdate): Promise<HostPort> {
    const response = await api.put(`${BASE_URL}/ports/${portId}`, data);
    return response.data;
  },

  /**
   * Delete a port
   */
  async delete(portId: string): Promise<void> {
    await api.delete(`${BASE_URL}/ports/${portId}`);
  },
};

// =====================================
// Network Connections
// =====================================

export const networkConnectionService = {
  /**
   * List all network connections
   */
  async list(
    page: number = 1,
    limit: number = 50,
    filters?: {
      relationship_type?: ConnectionRelationshipType;
      source_host_id?: string;
      target_host_id?: string;
      connection_status?: string;
    }
  ): Promise<{ data: NetworkConnection[]; total: number }> {
    const params = new URLSearchParams();
    params.append('page', page.toString());
    params.append('limit', limit.toString());

    if (filters) {
      if (filters.relationship_type) params.append('relationship_type', filters.relationship_type);
      if (filters.source_host_id) params.append('source_host_id', filters.source_host_id);
      if (filters.target_host_id) params.append('target_host_id', filters.target_host_id);
      if (filters.connection_status) params.append('connection_status', filters.connection_status);
    }

    const response = await api.get(`${BASE_URL}/connections?${params.toString()}`);
    return {
      data: response.data,
      total: response.data.length
    };
  },

  /**
   * Create a new network connection
   */
  async create(data: NetworkConnectionCreate): Promise<NetworkConnection> {
    const response = await api.post(`${BASE_URL}/connections`, data);
    return response.data;
  },

  /**
   * Update a network connection
   */
  async update(connectionId: string, data: NetworkConnectionUpdate): Promise<NetworkConnection> {
    const response = await api.put(`${BASE_URL}/connections/${connectionId}`, data);
    return response.data;
  },

  /**
   * Delete a network connection
   */
  async delete(connectionId: string): Promise<void> {
    await api.delete(`${BASE_URL}/connections/${connectionId}`);
  },
};

// =====================================
// Device Templates
// =====================================

export const deviceTemplateService = {
  /**
   * List all device templates
   */
  async list(filters?: {
    network_layer?: NetworkLayerType;
    device_category?: string;
    device_vendor?: DeviceVendor;
    switch_network_type?: SwitchNetworkType;
  }): Promise<DeviceTemplate[]> {
    const params = new URLSearchParams();
    if (filters) {
      if (filters.network_layer) params.append('network_layer', filters.network_layer);
      if (filters.device_category) params.append('device_category', filters.device_category);
      if (filters.device_vendor) params.append('device_vendor', filters.device_vendor);
      if (filters.switch_network_type) params.append('switch_network_type', filters.switch_network_type);
    }
    const response = await api.get(`${BASE_URL}/templates?${params.toString()}`);
    return response.data;
  },

  /**
   * Get a single template by ID
   */
  async getById(id: string): Promise<DeviceTemplate> {
    const response = await api.get(`${BASE_URL}/templates/${id}`);
    return response.data;
  },

  /**
   * Create a new device template (admin only)
   */
  async create(data: DeviceTemplateCreate): Promise<DeviceTemplate> {
    const response = await api.post(`${BASE_URL}/templates`, data);
    return response.data;
  },

  /**
   * Update a device template (admin only)
   */
  async update(templateId: string, data: DeviceTemplateUpdate): Promise<DeviceTemplate> {
    const response = await api.put(`${BASE_URL}/templates/${templateId}`, data);
    return response.data;
  },

  /**
   * Delete a device template (admin only)
   */
  async delete(templateId: string): Promise<void> {
    await api.delete(`${BASE_URL}/templates/${templateId}`);
  },
};

// =====================================
// Infrastructure Topologies
// =====================================

export const topologyService = {
  /**
   * List all topologies for the current client
   */
  async list(status?: string): Promise<InfrastructureTopology[]> {
    const params = status ? `?status=${status}` : '';
    const response = await api.get(`${BASE_URL}/topologies${params}`);
    return response.data;
  },

  /**
   * Get a single topology by ID
   */
  async getById(id: string): Promise<InfrastructureTopology> {
    const response = await api.get(`${BASE_URL}/topologies/${id}`);
    return response.data;
  },

  /**
   * Get topology visualization data (nodes, edges, groups)
   */
  async getData(id: string): Promise<TopologyData> {
    const response = await api.get(`${BASE_URL}/topologies/${id}/data`);
    return response.data;
  },

  /**
   * Create a new topology
   */
  async create(data: InfrastructureTopologyCreate): Promise<InfrastructureTopology> {
    const response = await api.post(`${BASE_URL}/topologies`, data);
    return response.data;
  },

  /**
   * Update a topology
   */
  async update(id: string, data: InfrastructureTopologyUpdate): Promise<InfrastructureTopology> {
    const response = await api.put(`${BASE_URL}/topologies/${id}`, data);
    return response.data;
  },

  /**
   * Delete a topology
   */
  async delete(id: string): Promise<void> {
    await api.delete(`${BASE_URL}/topologies/${id}`);
  },

  /**
   * Save node positions
   */
  async savePositions(id: string, positions: Record<string, { x: number; y: number }>): Promise<InfrastructureTopology> {
    return this.update(id, { node_positions: positions });
  },

  /**
   * Get full topology data including all hosts and connections
   * Optionally filtered by client_id
   */
  async getFullTopology(clientId?: string): Promise<TopologyData> {
    const params = new URLSearchParams();
    if (clientId) {
      params.append('client_id', clientId);
    }
    const response = await api.get(`${BASE_URL}/topology/full?${params.toString()}`);
    return response.data;
  },
};

// =====================================
// Statistics
// =====================================

export const infrastructureStatsService = {
  /**
   * Get overall infrastructure statistics
   */
  async getStats(): Promise<InfrastructureStats> {
    const response = await api.get(`${BASE_URL}/stats`);
    return response.data;
  },

  /**
   * Get statistics for a specific layer
   */
  async getLayerStats(layer: NetworkLayerType): Promise<LayerStats> {
    const response = await api.get(`${BASE_URL}/stats/layer/${layer}`);
    return response.data;
  },
};

// =====================================
// VM-Physical Mapping
// =====================================

export const vmPhysicalService = {
  /**
   * Get VM to Physical server mappings
   */
  async getMappings(physicalHostId?: string): Promise<{ mappings: VMPhysicalMapping[]; total: number }> {
    const params = physicalHostId ? `?physical_host_id=${physicalHostId}` : '';
    const response = await api.get(`${BASE_URL}/vm-physical-mapping${params}`);
    return response.data;
  },

  /**
   * Create a VM to Physical server mapping
   */
  async createMapping(vmId: string, physicalHostId: string): Promise<{ success: boolean; message: string }> {
    const response = await api.post(`${BASE_URL}/vm-physical-mapping`, null, {
      params: { vm_id: vmId, physical_host_id: physicalHostId }
    });
    return response.data;
  },

  /**
   * Remove a VM to Physical server mapping
   */
  async deleteMapping(vmId: string): Promise<void> {
    await api.delete(`${BASE_URL}/vm-physical-mapping/${vmId}`);
  },
};

// =====================================
// Host Metrics (Prometheus)
// =====================================

export interface HostMetrics {
  host_id: string;
  hostname: string;
  management_ip?: string;
  cpu_usage?: number;
  memory_usage?: number;
  memory_total_gb?: number;
  memory_used_gb?: number;
  disk_usage?: number;
  disk_total_gb?: number;
  disk_used_gb?: number;
  network_in_mbps?: number;
  network_out_mbps?: number;
  uptime_seconds?: number;
  temperature?: number;
  ports: PortMetricsData[];
  vlans: VlanData[];
  hardware: Record<string, string>;
  last_updated?: string;
}

export interface PortMetricsData {
  port_name: string;
  port_description?: string;
  operational_status: string;
  admin_status: string;
  speed_mbps?: number;
  mac_address?: string;
  ip_address?: string;
  vlan_id?: number;
  rx_bytes?: number;
  tx_bytes?: number;
  rx_rate_mbps?: number;
  tx_rate_mbps?: number;
  errors_in?: number;
  errors_out?: number;
}

export interface VlanData {
  vlan_id: string;
  vlan_name: string;
}

export const hostMetricsService = {
  /**
   * Get Prometheus metrics for a specific host
   */
  async getMetrics(hostId: string): Promise<HostMetrics> {
    const response = await api.get(`${BASE_URL}/hosts/${hostId}/metrics`);
    return response.data;
  },

  /**
   * Get detailed port metrics from Prometheus
   */
  async getPortMetrics(hostId: string): Promise<{ ports: PortMetricsData[]; source: string }> {
    const response = await api.get(`${BASE_URL}/hosts/${hostId}/ports/metrics`);
    return response.data;
  },
};

// =====================================
// Utility Functions
// =====================================

/**
 * Get status color based on health/operational status
 */
export function getStatusColor(status: string): string {
  const statusColors: Record<string, string> = {
    healthy: '#22c55e',
    up: '#22c55e',
    active: '#22c55e',
    warning: '#f59e0b',
    degraded: '#f59e0b',
    critical: '#ef4444',
    down: '#ef4444',
    error: '#ef4444',
    unknown: '#6b7280',
    maintenance: '#3b82f6',
  };
  return statusColors[status.toLowerCase()] || '#6b7280';
}


/**
 * Get layer color
 */
export function getLayerColor(layer: NetworkLayerType): string {
  const layerColors: Record<NetworkLayerType, string> = {
    f_swi: '#ef4444', // Red for firewall
    r_swi: '#f97316', // Orange for router
    e_swi: '#3b82f6', // Blue for exchange switch
    s_hw: '#22c55e',  // Green for server hardware
  };
  return layerColors[layer] || '#6b7280';
}

/**
 * Get layer display name
 */
export function getLayerDisplayName(layer: NetworkLayerType): string {
  const layerNames: Record<NetworkLayerType, string> = {
    f_swi: 'Firewall Layer',
    r_swi: 'Router Layer',
    e_swi: 'Exchange Switch Layer',
    s_hw: 'Server Hardware Layer',
  };
  return layerNames[layer] || layer;
}

/**
 * Get device icon based on category and vendor
 */
export function getDeviceIcon(category: string, vendor?: DeviceVendor | null): string {
  const categoryIcons: Record<string, string> = {
    firewall: 'shield',
    router: 'git-branch',
    switch: 'share-2',
    server: 'server',
    virtual_machine: 'box',
    storage: 'database',
    load_balancer: 'layers',
    access_point: 'wifi',
  };
  return categoryIcons[category.toLowerCase()] || 'cpu';
}

/**
 * Format bandwidth for display
 */
export function formatBandwidth(mbps: number | null): string {
  if (!mbps) return 'N/A';
  if (mbps >= 1000) return `${(mbps / 1000).toFixed(1)} Gbps`;
  return `${mbps} Mbps`;
}

/**
 * Format uptime for display
 */
export function formatUptime(seconds: number | null): string {
  if (!seconds) return 'N/A';
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);

  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

/**
 * Calculate connection path between two nodes for visualization
 */
export function calculateConnectionPath(
  source: { x: number; y: number },
  target: { x: number; y: number },
  type: 'straight' | 'curved' | 'orthogonal' = 'curved'
): string {
  if (type === 'straight') {
    return `M ${source.x} ${source.y} L ${target.x} ${target.y}`;
  }

  if (type === 'curved') {
    const midX = (source.x + target.x) / 2;
    const midY = (source.y + target.y) / 2;
    const controlOffset = Math.min(Math.abs(target.y - source.y) * 0.5, 50);
    return `M ${source.x} ${source.y} Q ${midX} ${source.y + controlOffset} ${target.x} ${target.y}`;
  }

  // Orthogonal
  const midY = (source.y + target.y) / 2;
  return `M ${source.x} ${source.y} V ${midY} H ${target.x} V ${target.y}`;
}

// Default export with all services
export default {
  hosts: infrastructureHostService,
  ports: hostPortService,
  connections: networkConnectionService,
  templates: deviceTemplateService,
  topologies: topologyService,
  stats: infrastructureStatsService,
  vmPhysical: vmPhysicalService,
  utils: {
    getStatusColor,
    getLayerColor,
    getLayerDisplayName,
    getDeviceIcon,
    formatBandwidth,
    formatUptime,
    calculateConnectionPath,
  },
};
