// =====================================
// Core Types
// =====================================

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

export interface ApiError {
  success: false;
  message: string;
  errors?: Record<string, string[]>;
}

// =====================================
// User & Auth Types
// =====================================

export type UserStatus = 'active' | 'inactive' | 'suspended' | 'pending';
export type AuthProvider = 'local' | 'microsoft' | 'google' | 'github';

export interface User {
  id: string;
  organizationId: string;
  email: string;
  firstName: string;
  lastName: string;
  displayName: string;
  phone?: string;
  avatarUrl?: string;
  jobTitle?: string;
  department?: string;
  location?: string;
  timezone: string;
  authProvider: AuthProvider;
  status: UserStatus;
  emailVerified: boolean;
  lastLoginAt?: string;
  createdAt: string;
  updatedAt: string;
  roles: Role[];
  groups: Group[];
}

export interface Role {
  id: string;
  name: string;
  code: string;
  description?: string;
  permissions: string[];
  isSystem: boolean;
  isActive: boolean;
}

export interface Group {
  id: string;
  name: string;
  code: string;
  description?: string;
  groupType: string;
  managerId?: string;
  manager?: User;
  email?: string;
  isActive: boolean;
  memberCount?: number;
}

export interface GroupMember {
  id: string;
  groupId: string;
  userId: string;
  user: User;
  role: string;
  isOnCall: boolean;
  joinedAt: string;
}

export interface AuthState {
  user: User | null;
  token: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

export interface LoginCredentials {
  email: string;
  password: string;
  rememberMe?: boolean;
}

export interface RegisterData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  organizationType: 'join' | 'create';
  organizationId?: string;
  organizationCode?: string;
  organizationName?: string;
}

// =====================================
// Incident Types
// =====================================

export type IncidentStatus = 'open' | 'in_progress' | 'pending' | 'resolved' | 'closed';
export type Priority = 'critical' | 'high' | 'medium' | 'low';
export type IncidentCategory = 'hardware' | 'software' | 'network' | 'security' | 'access' | 'database' | 'other';

export interface Incident {
  id: string;
  incidentNumber: string;
  title: string;
  description?: string;
  status: IncidentStatus;
  priority: Priority;
  category: IncidentCategory;
  impact: Priority;
  urgency: Priority;
  environmentId?: string;
  environment?: Environment;
  affectedAssetId?: string;
  affectedAsset?: Asset;
  slaId?: string;
  reportedBy: string;
  reporter?: User;
  assignedTo?: string;
  assignee?: User;
  assignedGroupId?: string;
  assignedGroup?: Group;
  resolutionNotes?: string;
  rootCause?: string;
  workaround?: string;
  resolutionCode?: string;
  slaResponseDue?: string;
  slaResolutionDue?: string;
  firstResponseAt?: string;
  resolvedAt?: string;
  closedAt?: string;
  reopenedCount: number;
  tags: string[];
  customFields: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
  activities?: IncidentActivity[];
}

export interface IncidentActivity {
  id: string;
  incidentId: string;
  userId?: string;
  user?: User;
  activityType: string;
  fieldName?: string;
  oldValue?: string;
  newValue?: string;
  comment?: string;
  isPublic: boolean;
  attachments: Attachment[];
  createdAt: string;
}

export interface CreateIncidentData {
  title: string;
  description?: string;
  priority: Priority;
  category: IncidentCategory;
  impact?: Priority;
  urgency?: Priority;
  environmentId?: string;
  affectedAssetId?: string;
  assignedTo?: string;
  assignedGroupId?: string;
  tags?: string[];
}

export interface UpdateIncidentData extends Partial<CreateIncidentData> {
  status?: IncidentStatus;
  resolutionNotes?: string;
  rootCause?: string;
  workaround?: string;
}

export interface IncidentFilters {
  status?: IncidentStatus | IncidentStatus[];
  priority?: Priority | Priority[];
  category?: IncidentCategory;
  assignedTo?: string;
  assignedGroupId?: string;
  environmentId?: string;
  search?: string;
  dateFrom?: string;
  dateTo?: string;
}

// =====================================
// Problem Management Types
// =====================================

export type ProblemStatus =
  | 'open'
  | 'investigating'
  | 'root_cause_identified'
  | 'known_error'
  | 'resolved'
  | 'closed';

export interface Problem {
  id: string;
  problemNumber: string;
  title: string;
  description?: string;
  status: ProblemStatus;
  priority: Priority;
  category: IncidentCategory;
  impact: Priority;
  environmentId?: string;
  environment?: Environment;
  assignedTo?: string;
  assignee?: User;
  assignedGroupId?: string;
  assignedGroup?: Group;
  reportedBy: string;
  reporter?: User;
  rootCause?: string;
  workaround?: string;
  permanentFix?: string;
  workaroundAvailable: boolean;
  relatedChangeId?: string;
  relatedChange?: ChangeRequest;
  investigationStartAt?: string;
  rootCauseIdentifiedAt?: string;
  resolvedAt?: string;
  closedAt?: string;
  tags: string[];
  relatedIncidents?: Incident[];
  affectedAssets?: Asset[];
  activities?: ProblemActivity[];
  createdAt: string;
  updatedAt: string;
}

export interface ProblemActivity {
  id: string;
  problemId: string;
  userId?: string;
  user?: User;
  activityType: string;
  fieldName?: string;
  oldValue?: string;
  newValue?: string;
  comment?: string;
  isPublic: boolean;
  createdAt: string;
}

export interface CreateProblemData {
  title: string;
  description?: string;
  priority?: Priority;
  category?: IncidentCategory;
  impact?: Priority;
  environmentId?: string;
  assignedTo?: string;
  assignedGroupId?: string;
  tags?: string[];
}

export interface UpdateProblemData extends Partial<CreateProblemData> {
  status?: ProblemStatus;
  rootCause?: string;
  workaround?: string;
  permanentFix?: string;
}

export interface ProblemFilters {
  status?: ProblemStatus | ProblemStatus[];
  priority?: Priority | Priority[];
  category?: IncidentCategory;
  assignedTo?: string;
  assignedGroupId?: string;
  environmentId?: string;
  search?: string;
}

// =====================================
// Change Management Types
// =====================================

export type ChangeStatus =
  | 'draft'
  | 'submitted'
  | 'pending_approval'
  | 'approved'
  | 'rejected'
  | 'scheduled'
  | 'implementing'
  | 'completed'
  | 'failed'
  | 'cancelled';

export type ChangeType = 'standard' | 'normal' | 'emergency';
export type ChangeRisk = 'critical' | 'high' | 'medium' | 'low';
export type ChangeCategory = 'infrastructure' | 'application' | 'database' | 'network' | 'security' | 'hardware' | 'other';

export interface ChangeRequest {
  id: string;
  changeNumber: string;
  title: string;
  description?: string;
  justification?: string;
  status: ChangeStatus;
  changeType: ChangeType;
  risk: ChangeRisk;
  category: ChangeCategory;
  environmentId?: string;
  environment?: Environment;
  priority: Priority;
  implementationPlan?: string;
  rollbackPlan?: string;
  testPlan?: string;
  communicationPlan?: string;
  scheduledStart?: string;
  scheduledEnd?: string;
  actualStart?: string;
  actualEnd?: string;
  downtimeRequired: boolean;
  downtimeMinutes?: number;
  requestedBy: string;
  requester?: User;
  assignedTo?: string;
  assignee?: User;
  assignedGroupId?: string;
  assignedGroup?: Group;
  cabRequired: boolean;
  cabDecision?: string;
  cabDecisionBy?: string;
  cabDecisionAt?: string;
  cabNotes?: string;
  reviewNotes?: string;
  completionNotes?: string;
  failureReason?: string;
  relatedIncidentId?: string;
  tags: string[];
  customFields: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
  approvals?: ChangeApproval[];
  affectedAssets?: Asset[];
  activities?: ChangeActivity[];
}

export interface ChangeApproval {
  id: string;
  changeId: string;
  approverId: string;
  approver?: User;
  approvalRole?: string;
  decision?: 'approved' | 'rejected' | 'pending';
  comments?: string;
  decidedAt?: string;
  createdAt: string;
}

export interface ChangeActivity {
  id: string;
  changeId: string;
  userId?: string;
  user?: User;
  activityType: string;
  fieldName?: string;
  oldValue?: string;
  newValue?: string;
  comment?: string;
  attachments: Attachment[];
  createdAt: string;
}

export interface CreateChangeData {
  title: string;
  description?: string;
  justification?: string;
  changeType: ChangeType;
  risk: ChangeRisk;
  category: ChangeCategory;
  environmentId?: string;
  priority?: Priority;
  implementationPlan?: string;
  rollbackPlan?: string;
  testPlan?: string;
  communicationPlan?: string;
  scheduledStart?: string;
  scheduledEnd?: string;
  downtimeRequired?: boolean;
  downtimeMinutes?: number;
  assignedTo?: string;
  assignedGroupId?: string;
  affectedAssetIds?: string[];
  tags?: string[];
}

export interface ChangeFilters {
  status?: ChangeStatus | ChangeStatus[];
  changeType?: ChangeType;
  risk?: ChangeRisk;
  category?: ChangeCategory;
  assignedTo?: string;
  assignedGroupId?: string;
  environmentId?: string;
  scheduledFrom?: string;
  scheduledTo?: string;
  search?: string;
}

// =====================================
// Asset Types
// =====================================

export type AssetStatus = 'active' | 'inactive' | 'maintenance' | 'retired' | 'disposed';
export type AssetType =
  | 'server'
  | 'workstation'
  | 'laptop'
  | 'network_device'
  | 'storage'
  | 'virtual_machine'
  | 'application'
  | 'database'
  | 'service'
  | 'other';

export interface Asset {
  id: string;
  assetTag: string;
  name: string;
  description?: string;
  assetType: AssetType;
  status: AssetStatus;
  criticality: Priority;
  environmentId?: string;
  environment?: Environment;
  location?: string;
  ipAddress?: string;
  macAddress?: string;
  serialNumber?: string;
  manufacturer?: string;
  model?: string;
  osType?: string;
  osVersion?: string;
  cpu?: string;
  ramGb?: number;
  storageGb?: number;
  purchaseDate?: string;
  warrantyExpiry?: string;
  lastMaintenance?: string;
  ownerId?: string;
  owner?: User;
  managedByGroupId?: string;
  managedByGroup?: Group;
  parentAssetId?: string;
  parentAsset?: Asset;
  configuration: Record<string, unknown>;
  tags: string[];
  isActive: boolean;
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
  relationships?: AssetRelationship[];
}

export interface AssetRelationship {
  id: string;
  sourceAssetId: string;
  targetAssetId: string;
  targetAsset?: Asset;
  relationshipType: string;
  description?: string;
  createdAt: string;
}

export interface CreateAssetData {
  assetTag?: string;
  name: string;
  description?: string;
  assetType: AssetType;
  status?: AssetStatus;
  criticality?: Priority;
  environmentId?: string;
  location?: string;
  ipAddress?: string;
  macAddress?: string;
  serialNumber?: string;
  manufacturer?: string;
  model?: string;
  osType?: string;
  osVersion?: string;
  cpu?: string;
  ramGb?: number;
  storageGb?: number;
  purchaseDate?: string;
  warrantyExpiry?: string;
  ownerId?: string;
  managedByGroupId?: string;
  parentAssetId?: string;
  configuration?: Record<string, unknown>;
  tags?: string[];
}

export interface AssetFilters {
  status?: AssetStatus | AssetStatus[];
  assetType?: AssetType | AssetType[];
  criticality?: Priority;
  environmentId?: string;
  ownerId?: string;
  managedByGroupId?: string;
  search?: string;
}

// =====================================
// Environment Types
// =====================================

export type EnvironmentType = 'production' | 'staging' | 'development' | 'qa' | 'dr';
export type EnvironmentStatus = 'healthy' | 'warning' | 'critical' | 'unknown';

export interface Environment {
  id: string;
  name: string;
  code: string;
  type: EnvironmentType;
  status: EnvironmentStatus;
  description?: string;
  healthMetrics?: {
    cpuUsage?: number;
    memoryUsage?: number;
    diskUsage?: number;
    uptime?: number;
    responseTime?: number;
  };
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// =====================================
// Monitoring & Integration Types
// =====================================

export type IntegrationType =
  | 'prometheus'
  | 'alertmanager'
  | 'grafana'
  | 'kubernetes'
  | 'jenkins'
  | 'gitlab'
  | 'github'
  | 'jira'
  | 'slack'
  | 'teams'
  | 'pagerduty'
  | 'datadog'
  | 'newrelic'
  | 'splunk'
  | 'elasticsearch'
  | 'custom';

export type IntegrationStatus = 'active' | 'inactive' | 'error' | 'pending';

export interface Integration {
  id: string;
  name: string;
  type: IntegrationType;
  status: IntegrationStatus;
  description?: string;
  config: Record<string, unknown>;
  credentials?: Record<string, unknown>;
  webhookUrl?: string;
  apiEndpoint?: string;
  lastSyncAt?: string;
  syncFrequencyMinutes?: number;
  errorMessage?: string;
  isActive: boolean;
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
}

export interface MonitoringAlert {
  id: string;
  integrationId: string;
  integration?: Integration;
  alertName: string;
  severity: Priority;
  status: 'firing' | 'resolved' | 'acknowledged';
  source: string;
  message: string;
  labels: Record<string, string>;
  annotations: Record<string, string>;
  startsAt: string;
  endsAt?: string;
  fingerprint: string;
  incidentId?: string;
  incident?: Incident;
  acknowledgedBy?: string;
  acknowledgedAt?: string;
  createdAt: string;
}

export interface CreateIntegrationData {
  name: string;
  type: IntegrationType;
  description?: string;
  config: Record<string, unknown>;
  credentials?: Record<string, unknown>;
  webhookUrl?: string;
  apiEndpoint?: string;
  syncFrequencyMinutes?: number;
}

// =====================================
// Notification Types
// =====================================

export type NotificationType = 'info' | 'warning' | 'error' | 'success';
export type NotificationChannel = 'email' | 'sms' | 'push' | 'in_app';

export interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: NotificationType;
  channel: NotificationChannel;
  entityType?: string;
  entityId?: string;
  actionUrl?: string;
  isRead: boolean;
  readAt?: string;
  sentAt: string;
  createdAt: string;
}

// =====================================
// SLA Types
// =====================================

export interface SlaDefinition {
  id: string;
  name: string;
  code: string;
  description?: string;
  priority: Priority;
  responseTimeMinutes: number;
  resolutionTimeMinutes: number;
  businessHoursOnly: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// =====================================
// Report Types
// =====================================

export interface ReportDefinition {
  id: string;
  name: string;
  code: string;
  description?: string;
  reportType: string;
  queryConfig: Record<string, unknown>;
  chartConfig: Record<string, unknown>;
  filters: ReportFilter[];
  columns: ReportColumn[];
  isSystem: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ReportFilter {
  field: string;
  label: string;
  type: 'text' | 'select' | 'date' | 'daterange' | 'multiselect';
  options?: { label: string; value: string }[];
  defaultValue?: string | string[];
}

export interface ReportColumn {
  field: string;
  label: string;
  type: 'text' | 'number' | 'date' | 'badge' | 'link';
  sortable?: boolean;
  width?: number;
}

// =====================================
// Dashboard Types
// =====================================

export interface DashboardStats {
  incidents: {
    total: number;
    open: number;
    critical: number;
    high: number;
    medium: number;
    low: number;
    resolvedToday: number;
    createdToday: number;
    slaBreached: number;
    avgResolutionTime: number;
    trend?: unknown[];
    categoryDistribution?: unknown[];
  };
  changes: {
    total: number;
    pending: number;
    scheduled: number;
    inProgress: number;
    completed: number;
    failed: number;
    upcomingWeek: number;
  };
  assets: {
    total: number;
    active: number;
    maintenance: number;
    critical: number;
  };
  environments: Environment[];
}

export interface ChartData {
  labels: string[];
  datasets: {
    label: string;
    data: number[];
    backgroundColor?: string | string[];
    borderColor?: string | string[];
    fill?: boolean;
  }[];
}

// =====================================
// Attachment Types
// =====================================

export interface Attachment {
  id: string;
  fileName: string;
  originalName: string;
  mimeType: string;
  fileSize: number;
  storagePath: string;
  entityType: string;
  entityId: string;
  uploadedBy?: string;
  createdAt: string;
}

// =====================================
// Audit Types
// =====================================

export interface AuditLog {
  id: string;
  userId?: string;
  user?: User;
  action: string;
  entityType: string;
  entityId?: string;
  oldValues?: Record<string, unknown>;
  newValues?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
  requestId?: string;
  createdAt: string;
}

// =====================================
// Settings Types
// =====================================

export interface SystemSettings {
  general: {
    organizationName: string;
    timezone: string;
    dateFormat: string;
    timeFormat: string;
  };
  notifications: {
    emailEnabled: boolean;
    slackEnabled: boolean;
    teamsEnabled: boolean;
  };
  sla: {
    businessHoursStart: string;
    businessHoursEnd: string;
    businessDays: number[];
    holidays: string[];
  };
  security: {
    sessionTimeout: number;
    passwordMinLength: number;
    mfaRequired: boolean;
    allowedDomains: string[];
  };
}
