/**
 * Asset Workflow Service
 *
 * Handles API calls for:
 * - Asset Requests
 * - Approval Workflows
 * - Personal Asset Dashboard
 * - Asset Lifecycle
 */

import api from './api';

// Types
export type AssetRequestType =
  | 'new_asset'
  | 'replacement'
  | 'upgrade'
  | 'transfer'
  | 'return'
  | 'repair'
  | 'disposal';

export type AssetRequestStatus =
  | 'draft'
  | 'pending'
  | 'in_review'
  | 'approved'
  | 'rejected'
  | 'partially_approved'
  | 'fulfilled'
  | 'cancelled';

export type ApprovalAction =
  | 'pending'
  | 'approved'
  | 'rejected'
  | 'delegated'
  | 'escalated';

export type ApprovalLevelType =
  | 'manager'
  | 'department_head'
  | 'it_admin'
  | 'finance'
  | 'security'
  | 'custom';

export type AssetLifecycleState =
  | 'requested'
  | 'procurement'
  | 'received'
  | 'configured'
  | 'deployed'
  | 'in_use'
  | 'maintenance'
  | 'repair'
  | 'storage'
  | 'pending_disposal'
  | 'disposed'
  | 'lost'
  | 'stolen';

export interface WorkflowStep {
  step_order: number;
  step_name: string;
  approver_type: ApprovalLevelType;
  specific_approver_id?: string;
  approver_role?: string;
  is_required: boolean;
  can_delegate: boolean;
  step_sla_hours: number;
}

export interface WorkflowTemplate {
  id: string;
  name: string;
  description?: string;
  request_type?: AssetRequestType;
  asset_category?: string;
  min_value?: number;
  max_value?: number;
  is_active: boolean;
  is_default: boolean;
  sla_hours: number;
  steps: WorkflowStep[];
  created_at: string;
}

export interface AssetRequest {
  id: string;
  request_number: string;
  request_type: AssetRequestType;
  status: AssetRequestStatus;
  requester_id: string;
  requester_name?: string;
  asset_category: string;
  asset_type?: string;
  asset_description: string;
  quantity: number;
  estimated_value?: number;
  justification: string;
  business_impact?: string;
  urgency: string;
  current_step: number;
  submitted_at?: string;
  approved_at?: string;
  due_date?: string;
  created_at: string;
  updated_at: string;
  approvals: ApprovalRecord[];
}

export interface ApprovalRecord {
  id?: string;
  step_order: number;
  step_name: string;
  approver_type: string;
  assigned_approver_id?: string;
  assigned_approver_name?: string;
  action: ApprovalAction;
  decision_at?: string;
  comments?: string;
  due_at?: string;
  is_overdue?: boolean;
}

export interface AssetRequestCreate {
  request_type: AssetRequestType;
  asset_category: string;
  asset_type?: string;
  asset_description: string;
  quantity?: number;
  estimated_value?: number;
  existing_asset_id?: string;
  justification: string;
  business_impact?: string;
  urgency?: string;
  preferred_specs?: Record<string, unknown>;
  preferred_vendor?: string;
  budget_code?: string;
}

export interface UserAsset {
  assignment_id: string;
  asset_id: string;
  asset_name: string;
  asset_tag?: string;
  asset_type: string;
  serial_number?: string;
  assigned_at: string;
  acknowledged: boolean;
}

export interface PendingApproval {
  approval_id: string;
  request_id: string;
  request_number: string;
  requester_name: string;
  asset_description: string;
  step_name: string;
  due_at?: string;
  is_overdue: boolean;
}

export interface PersonalDashboard {
  my_assets: UserAsset[];
  my_requests: {
    id: string;
    request_number: string;
    request_type: AssetRequestType;
    status: AssetRequestStatus;
    asset_description: string;
    created_at: string;
  }[];
  pending_approvals: PendingApproval[];
  recent_activity: {
    action: string;
    request_id: string;
    details: Record<string, unknown>;
    created_at: string;
  }[];
  stats: {
    total_assets: number;
    pending_requests: number;
    pending_approvals: number;
    fulfilled_requests: number;
  };
}

export interface RequestComment {
  id: string;
  user_name: string;
  comment: string;
  is_internal: boolean;
  created_at: string;
}

export interface RequestHistory {
  id: string;
  action: string;
  actor_name: string;
  details: Record<string, unknown>;
  created_at: string;
}

export interface LifecycleEvent {
  id: string;
  from_state?: AssetLifecycleState;
  to_state: AssetLifecycleState;
  reason?: string;
  performed_by: string;
  created_at: string;
}

const BASE_URL = '/asset-workflow';

// =====================================
// Workflow Templates
// =====================================

export const workflowTemplateService = {
  async list(): Promise<WorkflowTemplate[]> {
    const response = await api.get(`${BASE_URL}/templates`);
    return response.data;
  },

  async create(data: {
    name: string;
    description?: string;
    request_type?: AssetRequestType;
    asset_category?: string;
    min_value?: number;
    max_value?: number;
    sla_hours?: number;
    escalation_enabled?: boolean;
    escalation_hours?: number;
    steps: Omit<WorkflowStep, 'id'>[];
  }): Promise<WorkflowTemplate> {
    const response = await api.post(`${BASE_URL}/templates`, data);
    return response.data;
  },
};

// =====================================
// Asset Requests
// =====================================

export const assetRequestService = {
  async list(params?: {
    status?: AssetRequestStatus;
    request_type?: AssetRequestType;
    my_requests?: boolean;
    pending_approval?: boolean;
    skip?: number;
    limit?: number;
  }): Promise<AssetRequest[]> {
    const response = await api.get(`${BASE_URL}/requests`, { params });
    return response.data;
  },

  async getById(id: string): Promise<AssetRequest> {
    const response = await api.get(`${BASE_URL}/requests/${id}`);
    return response.data;
  },

  async create(data: AssetRequestCreate): Promise<AssetRequest> {
    const response = await api.post(`${BASE_URL}/requests`, data);
    return response.data;
  },

  async update(id: string, data: Partial<AssetRequestCreate>): Promise<AssetRequest> {
    const response = await api.put(`${BASE_URL}/requests/${id}`, data);
    return response.data;
  },

  async submit(id: string): Promise<{ message: string; request_number: string }> {
    const response = await api.post(`${BASE_URL}/requests/${id}/submit`);
    return response.data;
  },

  async approve(id: string, data: {
    action: ApprovalAction;
    comments?: string;
    delegate_to_id?: string;
    delegation_reason?: string;
  }): Promise<{ message: string; status: AssetRequestStatus }> {
    const response = await api.post(`${BASE_URL}/requests/${id}/approve`, data);
    return response.data;
  },

  async fulfill(id: string, data: {
    asset_id: string;
    notes?: string;
  }): Promise<{ message: string }> {
    const response = await api.post(`${BASE_URL}/requests/${id}/fulfill`, data);
    return response.data;
  },

  async addComment(id: string, data: {
    comment: string;
    is_internal?: boolean;
  }): Promise<{ message: string }> {
    const response = await api.post(`${BASE_URL}/requests/${id}/comments`, data);
    return response.data;
  },

  async getComments(id: string): Promise<RequestComment[]> {
    const response = await api.get(`${BASE_URL}/requests/${id}/comments`);
    return response.data;
  },

  async getHistory(id: string): Promise<RequestHistory[]> {
    const response = await api.get(`${BASE_URL}/requests/${id}/history`);
    return response.data;
  },
};

// =====================================
// Personal Dashboard
// =====================================

export const personalDashboardService = {
  async getDashboard(): Promise<PersonalDashboard> {
    const response = await api.get(`${BASE_URL}/my-dashboard`);
    return response.data;
  },

  async getMyAssets(includeReturned?: boolean): Promise<UserAsset[]> {
    const response = await api.get(`${BASE_URL}/my-assets`, {
      params: { include_returned: includeReturned }
    });
    return response.data;
  },

  async acknowledgeAsset(assignmentId: string, notes?: string): Promise<{ message: string }> {
    const response = await api.post(`${BASE_URL}/my-assets/${assignmentId}/acknowledge`, null, {
      params: { notes }
    });
    return response.data;
  },
};

// =====================================
// Asset Lifecycle
// =====================================

export const assetLifecycleService = {
  async getHistory(assetId: string): Promise<LifecycleEvent[]> {
    const response = await api.get(`${BASE_URL}/assets/${assetId}/lifecycle`);
    return response.data;
  },

  async updateState(assetId: string, toState: AssetLifecycleState, reason?: string): Promise<{ message: string }> {
    const response = await api.post(`${BASE_URL}/assets/${assetId}/lifecycle`, null, {
      params: { to_state: toState, reason }
    });
    return response.data;
  },
};

// =====================================
// Utility Functions
// =====================================

export const getRequestTypeLabel = (type: AssetRequestType): string => {
  const labels: Record<AssetRequestType, string> = {
    new_asset: 'New Asset',
    replacement: 'Replacement',
    upgrade: 'Upgrade',
    transfer: 'Transfer',
    return: 'Return',
    repair: 'Repair',
    disposal: 'Disposal',
  };
  return labels[type] || type;
};

export const getStatusLabel = (status: AssetRequestStatus): string => {
  const labels: Record<AssetRequestStatus, string> = {
    draft: 'Draft',
    pending: 'Pending Approval',
    in_review: 'In Review',
    approved: 'Approved',
    rejected: 'Rejected',
    partially_approved: 'Partially Approved',
    fulfilled: 'Fulfilled',
    cancelled: 'Cancelled',
  };
  return labels[status] || status;
};

export const getStatusColor = (status: AssetRequestStatus): string => {
  const colors: Record<AssetRequestStatus, string> = {
    draft: 'gray',
    pending: 'yellow',
    in_review: 'blue',
    approved: 'green',
    rejected: 'red',
    partially_approved: 'orange',
    fulfilled: 'green',
    cancelled: 'gray',
  };
  return colors[status] || 'gray';
};

export const getApprovalActionLabel = (action: ApprovalAction): string => {
  const labels: Record<ApprovalAction, string> = {
    pending: 'Pending',
    approved: 'Approved',
    rejected: 'Rejected',
    delegated: 'Delegated',
    escalated: 'Escalated',
  };
  return labels[action] || action;
};

export const getLifecycleStateLabel = (state: AssetLifecycleState): string => {
  const labels: Record<AssetLifecycleState, string> = {
    requested: 'Requested',
    procurement: 'In Procurement',
    received: 'Received',
    configured: 'Being Configured',
    deployed: 'Deployed',
    in_use: 'In Use',
    maintenance: 'Under Maintenance',
    repair: 'Being Repaired',
    storage: 'In Storage',
    pending_disposal: 'Pending Disposal',
    disposed: 'Disposed',
    lost: 'Lost',
    stolen: 'Stolen',
  };
  return labels[state] || state;
};

export default {
  templates: workflowTemplateService,
  requests: assetRequestService,
  dashboard: personalDashboardService,
  lifecycle: assetLifecycleService,
  utils: {
    getRequestTypeLabel,
    getStatusLabel,
    getStatusColor,
    getApprovalActionLabel,
    getLifecycleStateLabel,
  },
};
