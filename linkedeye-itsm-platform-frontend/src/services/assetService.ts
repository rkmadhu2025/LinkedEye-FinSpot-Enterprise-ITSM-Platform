import api from './api';
import { Asset, AssetFilters, PaginatedResponse, CreateAssetData, AssetRelationship } from '@/types';

// Backend asset response type (snake_case)
interface BackendAsset {
  id: string;
  hostname: string;
  ip_address?: string;
  asset_type: string;
  category?: string;
  subcategory?: string;
  location?: string;
  environment?: string;
  data_center?: string;
  rack_location?: string;
  owner_id?: string;
  technical_contact_id?: string;
  business_contact_id?: string;
  status: string;
  health_status: string;
  health_metrics: Record<string, unknown>;
  specifications: Record<string, unknown>;
  operating_system?: string;
  version?: string;
  manufacturer?: string;
  model?: string;
  serial_number?: string;
  business_service?: string;
  criticality: string;
  cost_center?: string;
  security_classification?: string;
  tags: string[];
  custom_fields: Record<string, unknown>;
  notes?: string;
  created_at: string;
  updated_at: string;
}

interface BackendAssetRelationship {
  id: string;
  source_asset_id: string;
  target_asset_id: string;
  relationship_type: string;
  description?: string;
  created_at: string;
}

interface BackendIncidentSummary {
  id: string;
  incident_number: string;
  title: string;
  status: string;
}

interface BackendChangeSummary {
  id: string;
  change_number: string;
  title: string;
  status: string;
}

// Transform backend asset to frontend format
function transformAsset(backendAsset: BackendAsset): Asset {
  return {
    id: backendAsset.id,
    assetTag: backendAsset.serial_number || backendAsset.id.slice(0, 8).toUpperCase(),
    name: backendAsset.hostname,
    description: backendAsset.notes,
    assetType: backendAsset.asset_type as Asset['assetType'],
    status: backendAsset.status as Asset['status'],
    criticality: backendAsset.criticality as Asset['criticality'],
    location: backendAsset.location,
    ipAddress: backendAsset.ip_address,
    serialNumber: backendAsset.serial_number,
    manufacturer: backendAsset.manufacturer,
    model: backendAsset.model,
    osType: backendAsset.operating_system,
    osVersion: backendAsset.version,
    configuration: backendAsset.specifications || {},
    tags: backendAsset.tags || [],
    createdAt: backendAsset.created_at,
    updatedAt: backendAsset.updated_at,
  };
}

export const assetService = {
  async getAssets(
    page: number = 1,
    limit: number = 20,
    filters?: AssetFilters
  ): Promise<PaginatedResponse<Asset>> {
    // Convert page to skip for backend
    const skip = (page - 1) * limit;
    const params: Record<string, unknown> = {
      skip,
      limit,
    };
    if (filters) {
      if (filters.type) params.asset_type = filters.type;
      if (filters.status) params.status = filters.status;
      if (filters.healthStatus) params.health_status = filters.healthStatus;
      if (filters.environment) params.environment = filters.environment;
      if (filters.search) params.search = filters.search;
    }

    // Backend returns array directly with pagination in headers
    const axiosResponse = await api.get<BackendAsset[]>('/assets', { params });
    const backendData = axiosResponse.data;

    // Transform backend snake_case to frontend camelCase
    const data = backendData.map(transformAsset);

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

  async getAssetById(id: string): Promise<Asset> {
    // Backend returns asset directly
    const response = await api.get<BackendAsset>(`/assets/${id}`);
    return transformAsset(response.data);
  },

  async createAsset(data: CreateAssetData): Promise<Asset> {
    // Transform frontend camelCase to backend snake_case
    const backendData = {
      hostname: data.name,
      ip_address: data.ipAddress,
      asset_type: data.assetType,
      status: data.status || 'active',
      health_status: 'unknown',
      criticality: data.criticality || 'medium',
      location: data.location,
      serial_number: data.serialNumber,
      manufacturer: data.manufacturer,
      model: data.model,
      operating_system: data.osType,
      version: data.osVersion,
      notes: data.description,
      tags: [],
      specifications: {},
      custom_fields: {},
    };
    const response = await api.post<BackendAsset>('/assets', backendData);
    return transformAsset(response.data);
  },

  async updateAsset(id: string, data: Partial<CreateAssetData>): Promise<Asset> {
    // Transform frontend camelCase to backend snake_case
    const backendData: Record<string, unknown> = {};
    if (data.name !== undefined) backendData.hostname = data.name;
    if (data.ipAddress !== undefined) backendData.ip_address = data.ipAddress;
    if (data.assetType !== undefined) backendData.asset_type = data.assetType;
    if (data.status !== undefined) backendData.status = data.status;
    if (data.criticality !== undefined) backendData.criticality = data.criticality;
    if (data.location !== undefined) backendData.location = data.location;
    if (data.serialNumber !== undefined) backendData.serial_number = data.serialNumber;
    if (data.manufacturer !== undefined) backendData.manufacturer = data.manufacturer;
    if (data.model !== undefined) backendData.model = data.model;
    if (data.osType !== undefined) backendData.operating_system = data.osType;
    if (data.osVersion !== undefined) backendData.version = data.osVersion;
    if (data.description !== undefined) backendData.notes = data.description;

    const response = await api.put<BackendAsset>(`/assets/${id}`, backendData);
    return transformAsset(response.data);
  },

  async deleteAsset(id: string): Promise<void> {
    await api.delete(`/assets/${id}`);
  },

  async getRelationships(id: string): Promise<AssetRelationship[]> {
    const response = await api.get<BackendAssetRelationship[]>(`/assets/${id}/relationships`);
    return response.data.map((relationship) => ({
      id: relationship.id,
      sourceAssetId: relationship.source_asset_id,
      targetAssetId: relationship.target_asset_id,
      relationshipType: relationship.relationship_type,
      description: relationship.description,
      createdAt: relationship.created_at,
    }));
  },

  async addRelationship(
    sourceId: string,
    targetId: string,
    relationshipType: string,
    description?: string
  ): Promise<AssetRelationship> {
    const response = await api.post<BackendAssetRelationship>(`/assets/${sourceId}/relationships`, {
      target_asset_id: targetId,
      relationship_type: relationshipType,
      description,
    });
    const relationship = response.data;
    return {
      id: relationship.id,
      sourceAssetId: relationship.source_asset_id,
      targetAssetId: relationship.target_asset_id,
      relationshipType: relationship.relationship_type,
      description: relationship.description,
      createdAt: relationship.created_at,
    };
  },

  async removeRelationship(assetId: string, relationshipId: string): Promise<void> {
    await api.delete(`/assets/${assetId}/relationships/${relationshipId}`);
  },

  async getIncidents(assetId: string): Promise<Array<{ id: string; incidentNumber: string; title: string; status: string }>> {
    const response = await api.get<BackendIncidentSummary[]>(`/assets/${assetId}/incidents`);
    return response.data.map((incident) => ({
      id: incident.id,
      incidentNumber: incident.incident_number,
      title: incident.title,
      status: incident.status,
    }));
  },

  async getChanges(assetId: string): Promise<Array<{ id: string; changeNumber: string; title: string; status: string }>> {
    const response = await api.get<BackendChangeSummary[]>(`/assets/${assetId}/changes`);
    return response.data.map((change) => ({
      id: change.id,
      changeNumber: change.change_number,
      title: change.title,
      status: change.status,
    }));
  },

  async getStats(): Promise<{
    total: number;
    active: number;
    maintenance: number;
    critical: number;
    byType: Record<string, number>;
  }> {
    // Use the main assets endpoint to calculate stats
    try {
      const response = await api.get<BackendAsset[]>('/assets', { params: { limit: 1000 } });
      const assets = response.data || [];
      const total = assets.length;
      const active = assets.filter(a => a.status === 'active').length;
      const maintenance = assets.filter(a => a.status === 'maintenance').length;
      const critical = assets.filter(a => a.health_status === 'critical').length;
      const byType: Record<string, number> = {};
      assets.forEach(a => {
        byType[a.asset_type] = (byType[a.asset_type] || 0) + 1;
      });
      return { total, active, maintenance, critical, byType };
    } catch {
      return { total: 0, active: 0, maintenance: 0, critical: 0, byType: {} };
    }
  },

  async search(query: string, limit: number = 10): Promise<Asset[]> {
    // Use the main assets endpoint with search filter
    const response = await api.get<BackendAsset[]>('/assets', {
      params: { search: query, limit },
    });
    return (response.data || []).map(transformAsset);
  },
};
