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

export type GroupType = 'team' | 'support' | 'management' | 'cab' | 'security' | 'operations' | 'custom';

export interface Group {
  id: string;
  name: string;
  code: string;
  description?: string;
  groupType: GroupType;
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
  email?: string;
  username?: string;
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

export interface CreateUserData {
  email: string;
  first_name: string;
  last_name: string;
  password: string;
  role?: string;
  department?: string;
  job_title?: string;
  phone?: string;
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
  number?: string; // Backend uses 'number'
  title: string;
  description?: string;
  status: IncidentStatus;
  priority: Priority;
  category: IncidentCategory;
  impact: Priority;
  urgency: Priority;
  environmentId?: string;
  environment?: Environment;
  clientId?: string;
  client?: Client;
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
  source?: string;
  alertRule?: string;
  externalId?: string;
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
  | 'monitoring'
  | 'ticketing'
  | 'notification'
  | 'cloud'
  | 'api'
  | 'webhook';

export type IntegrationStatus = 'active' | 'inactive' | 'error' | 'testing';

export interface Integration {
  id: string;
  name: string;
  integration_type: IntegrationType;
  status: IntegrationStatus;
  provider?: string;
  configuration: Record<string, unknown>;
  webhook_url?: string;
  last_sync_at?: string;
  sync_status?: string;
  sync_error?: string;
  enabled_features: string[];
  meta_data: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface MonitoringAlert {
  id: string;
  integrationId: string;
  integration?: Integration;
  name: string;
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
  integration_type: IntegrationType;
  provider?: string;
  configuration?: Record<string, unknown>;
  credentials?: Record<string, unknown>;
  webhook_url?: string;
  api_key?: string;
  enabled_features?: string[];
  meta_data?: Record<string, unknown>;
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
  problems: {
    total: number;
    open: number;
    critical: number;
    high: number;
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

// =====================================
// Notification Preference Types
// =====================================

export type NotificationSeverity = 'critical' | 'high' | 'medium' | 'low' | 'info';
export type DigestFrequency = 'hourly' | 'daily' | 'weekly';

export interface NotificationPreference {
  id: string;
  user_id: string;

  // Channel Preferences
  email_enabled: boolean;
  in_app_enabled: boolean;
  slack_enabled: boolean;
  webhook_enabled: boolean;

  // Event Type Preferences
  incident_notifications: boolean;
  change_notifications: boolean;
  problem_notifications: boolean;
  alert_notifications: boolean;
  asset_notifications: boolean;
  sla_notifications: boolean;

  // Severity Filters
  min_severity_email: NotificationSeverity;
  min_severity_in_app: NotificationSeverity;

  // Quiet Hours
  quiet_hours_enabled: boolean;
  quiet_hours_start: string | null;
  quiet_hours_end: string | null;
  quiet_hours_timezone: string;
  quiet_hours_bypass_critical: boolean;

  // Digest Preferences
  digest_enabled: boolean;
  digest_frequency: DigestFrequency;
  digest_time: string | null;
  digest_day_of_week: number;

  // External Channels
  slack_webhook_url: string | null;
  slack_channel: string | null;
  custom_webhook_url: string | null;

  // Advanced Settings
  group_similar_alerts: boolean;
  max_alerts_per_hour: number;
  escalation_enabled: boolean;
}

export interface NotificationPreferenceUpdate {
  // Channel Preferences
  email_enabled?: boolean;
  in_app_enabled?: boolean;
  slack_enabled?: boolean;
  webhook_enabled?: boolean;

  // Event Type Preferences
  incident_notifications?: boolean;
  change_notifications?: boolean;
  problem_notifications?: boolean;
  alert_notifications?: boolean;
  asset_notifications?: boolean;
  sla_notifications?: boolean;

  // Severity Filters
  min_severity_email?: NotificationSeverity;
  min_severity_in_app?: NotificationSeverity;

  // Quiet Hours
  quiet_hours_enabled?: boolean;
  quiet_hours_start?: string | null;
  quiet_hours_end?: string | null;
  quiet_hours_timezone?: string;
  quiet_hours_bypass_critical?: boolean;

  // Digest Preferences
  digest_enabled?: boolean;
  digest_frequency?: DigestFrequency;
  digest_time?: string | null;
  digest_day_of_week?: number;

  // External Channels
  slack_webhook_url?: string | null;
  slack_channel?: string | null;
  custom_webhook_url?: string | null;

  // Advanced Settings
  group_similar_alerts?: boolean;
  max_alerts_per_hour?: number;
  escalation_enabled?: boolean;
}

// =====================================
// Alert Suppression Types
// =====================================

export type SuppressionType = 'manual' | 'scheduled' | 'maintenance';

export interface AlertSuppression {
  id: string;
  asset_id: string | null;
  network_device_id: string | null;
  environment_id: string | null;

  suppression_type: SuppressionType;
  reason: string | null;
  start_time: string;
  end_time: string | null;

  severity_filter: string[];
  alert_type_filter: string[];

  created_by_id: string;
  is_active: boolean;

  notify_on_start: boolean;
  notify_on_end: boolean;
  notify_suppressed_count: boolean;
  suppressed_count: number;

  created_at: string;
  updated_at: string;

  // Computed fields from API
  target_name?: string;
  target_type?: 'asset' | 'network_device' | 'environment';
}

export interface AlertSuppressionCreate {
  asset_id?: string;
  network_device_id?: string;
  environment_id?: string;

  suppression_type?: SuppressionType;
  reason?: string;
  start_time?: string;
  end_time?: string | null;

  severity_filter?: string[];
  alert_type_filter?: string[];

  notify_on_start?: boolean;
  notify_on_end?: boolean;
  notify_suppressed_count?: boolean;
}

export interface AlertSuppressionUpdate {
  reason?: string;
  end_time?: string | null;
  severity_filter?: string[];
  alert_type_filter?: string[];
  notify_on_start?: boolean;
  notify_on_end?: boolean;
  notify_suppressed_count?: boolean;
  is_active?: boolean;
}

export interface AssetSuppressionStatus {
  is_suppressed: boolean;
  suppression: AlertSuppression | null;
}

// =====================================
// Notification Log Types
// =====================================

export type DeliveryStatus = 'pending' | 'queued' | 'sent' | 'delivered' | 'failed' | 'bounced' | 'opened' | 'clicked';

export interface NotificationLog {
  id: string;
  notification_id: string | null;
  user_id: string;
  channel: 'email' | 'in_app' | 'slack' | 'webhook' | 'sms';
  status: DeliveryStatus;
  email_to: string | null;
  email_subject: string | null;
  email_message_id: string | null;
  queued_at: string | null;
  sent_at: string | null;
  delivered_at: string | null;
  opened_at: string | null;
  clicked_at: string | null;
  failed_at: string | null;
  failure_reason: string | null;
  retry_count: number;
  event_type: string | null;
  entity_type: string | null;
  entity_id: string | null;
  created_at: string;
}

// =====================================
// Client / Multi-Tenant Types
// =====================================

export type ClientEnvironment = 'production' | 'dr' | 'uat' | 'development' | 'staging';
export type ClientStatus = 'active' | 'inactive' | 'suspended' | 'onboarding';
export type SLATier = 'standard' | 'premium' | 'enterprise';

export interface Client {
  id: string;
  client_code: string;
  name: string;
  display_name: string | null;
  short_name: string | null;
  environment: ClientEnvironment;
  location: string | null;
  region: string | null;
  datacenter: string | null;
  status: ClientStatus;
  primary_contact_name: string | null;
  primary_contact_email: string | null;
  primary_contact_phone: string | null;
  technical_contact_email: string | null;
  escalation_email: string | null;
  industry: string | null;
  description: string | null;
  sla_tier: SLATier;
  support_hours: string;
  max_users: number;
  max_assets: number;
  is_active: boolean;
  created_at: string | null;
  updated_at: string | null;
}

export interface ClientCreate {
  client_code: string;
  name: string;
  display_name?: string;
  short_name?: string;
  environment?: ClientEnvironment;
  location?: string;
  region?: string;
  datacenter?: string;
  primary_contact_name?: string;
  primary_contact_email?: string;
  primary_contact_phone?: string;
  technical_contact_email?: string;
  escalation_email?: string;
  industry?: string;
  description?: string;
  sla_tier?: SLATier;
  support_hours?: string;
  max_users?: number;
  max_assets?: number;
}

export interface ClientUpdate {
  name?: string;
  display_name?: string;
  short_name?: string;
  environment?: ClientEnvironment;
  location?: string;
  region?: string;
  status?: ClientStatus;
  primary_contact_name?: string;
  primary_contact_email?: string;
  primary_contact_phone?: string;
  technical_contact_email?: string;
  escalation_email?: string;
  industry?: string;
  description?: string;
  sla_tier?: SLATier;
  support_hours?: string;
  max_users?: number;
  max_assets?: number;
}

export interface ClientStatistics {
  client_id: string;
  user_count: number;
  incident_count: number;
  open_incidents: number;
  problem_count: number;
  change_count: number;
  asset_count: number;
  active_alerts: number;
}

export interface ClientWithStats extends Client {
  statistics?: ClientStatistics;
}

// =====================================
// On-Call Management Types
// =====================================

// Enums
export type RotationType = 'daily' | 'weekly' | 'custom' | 'follow_the_sun';
export type ShiftType = 'primary' | 'secondary' | 'backup' | 'override';
export type ShiftStatus = 'scheduled' | 'active' | 'completed' | 'cancelled' | 'swapped';
export type OverrideType = 'swap' | 'coverage' | 'time_off' | 'temporary';
export type OverrideStatus = 'pending' | 'approved' | 'rejected' | 'active' | 'completed' | 'cancelled';
export type OnCallUrgency = 'low' | 'high' | 'critical';
export type EscalationTargetType = 'user' | 'group' | 'schedule';
export type OnCallNotificationChannel = 'email' | 'sms' | 'voice' | 'push' | 'slack' | 'teams' | 'webhook';

// Escalation Level
export interface EscalationLevel {
  id: string;
  policy_id: string;
  level_number: number;
  delay_minutes: number;
  target_type: EscalationTargetType;
  target_user_id: string | null;
  target_group_id: string | null;
  target_schedule_id: string | null;
  notification_channels: OnCallNotificationChannel[];
  repeat_count: number;
  repeat_interval_minutes: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;

  // Populated fields
  target_user?: User;
  target_group?: Group;
  target_schedule?: OnCallSchedule;
}

export interface EscalationLevelCreate {
  level_number: number;
  delay_minutes?: number;
  target_type: EscalationTargetType;
  target_user_id?: string;
  target_group_id?: string;
  target_schedule_id?: string;
  notification_channels?: OnCallNotificationChannel[];
  repeat_count?: number;
  repeat_interval_minutes?: number;
}

// Escalation Policy
export interface EscalationPolicy {
  id: string;
  client_id: string | null;
  name: string;
  description: string | null;
  repeat_count: number;
  repeat_interval_minutes: number;
  default_urgency: OnCallUrgency;
  is_active: boolean;
  is_default: boolean;
  created_at: string;
  updated_at: string;

  // Related entities
  levels: EscalationLevel[];
}

export interface EscalationPolicyCreate {
  name: string;
  description?: string;
  repeat_count?: number;
  repeat_interval_minutes?: number;
  default_urgency?: OnCallUrgency;
  is_default?: boolean;
  levels?: EscalationLevelCreate[];
}

export interface EscalationPolicyUpdate {
  name?: string;
  description?: string;
  repeat_count?: number;
  repeat_interval_minutes?: number;
  default_urgency?: OnCallUrgency;
  is_active?: boolean;
  is_default?: boolean;
}

// On-Call Schedule Member
export interface OnCallScheduleMember {
  id: string;
  schedule_id: string;
  user_id: string;
  rotation_order: number;
  is_active: boolean;
  start_date: string | null;
  end_date: string | null;
  created_at: string;
  updated_at: string;

  // Populated fields
  user?: User;
}

export interface OnCallScheduleMemberCreate {
  user_id: string;
  rotation_order?: number;
  start_date?: string;
  end_date?: string;
}

// On-Call Schedule
export interface OnCallSchedule {
  id: string;
  client_id: string | null;
  name: string;
  description: string | null;
  timezone: string;
  rotation_type: RotationType;
  rotation_length_days: number;
  handoff_time: string;
  handoff_day: number;
  coverage_start: string | null;
  coverage_end: string | null;
  restrict_to_business_hours: boolean;
  escalation_policy_id: string | null;
  is_active: boolean;
  current_position: number;
  last_rotation_at: string | null;
  created_at: string;
  updated_at: string;

  // Related entities
  members: OnCallScheduleMember[];
  escalation_policy?: EscalationPolicy;
  shifts?: OnCallShift[];
}

export interface OnCallScheduleCreate {
  name: string;
  description?: string;
  timezone?: string;
  rotation_type?: RotationType;
  rotation_length_days?: number;
  handoff_time?: string;
  handoff_day?: number;
  coverage_start?: string;
  coverage_end?: string;
  restrict_to_business_hours?: boolean;
  escalation_policy_id?: string;
  members?: OnCallScheduleMemberCreate[];
}

export interface OnCallScheduleUpdate {
  name?: string;
  description?: string;
  timezone?: string;
  rotation_type?: RotationType;
  rotation_length_days?: number;
  handoff_time?: string;
  handoff_day?: number;
  coverage_start?: string;
  coverage_end?: string;
  restrict_to_business_hours?: boolean;
  escalation_policy_id?: string;
  is_active?: boolean;
}

// On-Call Shift
export interface OnCallShift {
  id: string;
  schedule_id: string;
  user_id: string;
  shift_type: ShiftType;
  start_time: string;
  end_time: string;
  status: ShiftStatus;
  notes: string | null;
  override_id: string | null;
  created_at: string;
  updated_at: string;

  // Populated fields
  user?: User;
  schedule?: OnCallSchedule;
}

export interface OnCallShiftCreate {
  schedule_id: string;
  user_id: string;
  shift_type?: ShiftType;
  start_time: string;
  end_time: string;
  notes?: string;
}

// On-Call Override
export interface OnCallOverride {
  id: string;
  schedule_id: string;
  original_user_id: string;
  replacement_user_id: string;
  override_type: OverrideType;
  start_time: string;
  end_time: string;
  reason: string | null;
  status: OverrideStatus;
  approved_by_id: string | null;
  approved_at: string | null;
  created_by_id: string;
  created_at: string;
  updated_at: string;

  // Populated fields
  original_user?: User;
  replacement_user?: User;
  approved_by?: User;
  created_by?: User;
  schedule?: OnCallSchedule;
}

export interface OnCallOverrideCreate {
  schedule_id: string;
  original_user_id: string;
  replacement_user_id: string;
  override_type?: OverrideType;
  start_time: string;
  end_time: string;
  reason?: string;
}

export interface OnCallOverrideUpdate {
  replacement_user_id?: string;
  start_time?: string;
  end_time?: string;
  reason?: string;
  status?: OverrideStatus;
}

// On-Call Incident
export interface OnCallIncident {
  id: string;
  incident_id: string;
  escalation_policy_id: string;
  current_level: number;
  urgency: OnCallUrgency;
  status: 'triggered' | 'acknowledged' | 'resolved' | 'escalated' | 'timed_out';
  triggered_at: string;
  acknowledged_at: string | null;
  acknowledged_by_id: string | null;
  resolved_at: string | null;
  resolved_by_id: string | null;
  escalation_count: number;
  last_escalation_at: string | null;
  next_escalation_at: string | null;
  notification_log: unknown[];
  created_at: string;
  updated_at: string;

  // Populated fields
  incident?: Incident;
  escalation_policy?: EscalationPolicy;
  acknowledged_by?: User;
  resolved_by?: User;
}

export interface OnCallIncidentCreate {
  incident_id: string;
  escalation_policy_id: string;
  urgency?: OnCallUrgency;
}

// On-Call Handoff Note
export interface OnCallHandoffNote {
  id: string;
  schedule_id: string;
  from_user_id: string;
  to_user_id: string;
  shift_start: string;
  shift_end: string;
  summary: string;
  open_incidents: unknown[];
  pending_tasks: unknown[];
  important_notes: string | null;
  acknowledged: boolean;
  acknowledged_at: string | null;
  created_at: string;
  updated_at: string;

  // Populated fields
  from_user?: User;
  to_user?: User;
  schedule?: OnCallSchedule;
}

export interface OnCallHandoffNoteCreate {
  schedule_id: string;
  to_user_id: string;
  shift_start: string;
  shift_end: string;
  summary: string;
  open_incidents?: unknown[];
  pending_tasks?: unknown[];
  important_notes?: string;
}

// On-Call Analytics
export interface OnCallAnalytics {
  id: string;
  schedule_id: string | null;
  user_id: string | null;
  period_start: string;
  period_end: string;
  total_incidents: number;
  acknowledged_incidents: number;
  escalated_incidents: number;
  mean_time_to_acknowledge: number | null;
  mean_time_to_resolve: number | null;
  total_on_call_hours: number;
  total_shifts: number;
  incidents_per_shift: number | null;
  busiest_hour: number | null;
  busiest_day: number | null;
  created_at: string;

  // Populated fields
  user?: User;
  schedule?: OnCallSchedule;
}

// API Response Types for On-Call
export interface CurrentOnCallUser {
  user_id: string;
  user: User;
  schedule_id: string;
  schedule_name: string;
  shift_type: ShiftType;
  shift_start: string;
  shift_end: string;
  is_override: boolean;
}

export interface OnCallCalendarEvent {
  id: string;
  title: string;
  start: string;
  end: string;
  user_id: string;
  user_name: string;
  shift_type: ShiftType;
  status: ShiftStatus;
  is_override: boolean;
  color?: string;
}

export interface ScheduleGenerationResult {
  schedule_id: string;
  shifts_created: number;
  start_date: string;
  end_date: string;
  shifts: OnCallShift[];
}

export interface EscalationResult {
  incident_id: string;
  on_call_incident_id: string;
  escalated_to_level: number;
  notified_users: string[];
  next_escalation_at: string | null;
}

export interface OnCallDashboardStats {
  current_on_call: CurrentOnCallUser[];
  active_incidents: number;
  pending_overrides: number;
  upcoming_handoffs: number;
  recent_escalations: OnCallIncident[];
  schedule_coverage: {
    schedule_id: string;
    schedule_name: string;
    coverage_percentage: number;
    gaps: { start: string; end: string }[];
  }[];
}

// On-Call Filters
export interface OnCallScheduleFilters {
  is_active?: boolean;
  rotation_type?: RotationType;
  search?: string;
}

export interface OnCallShiftFilters {
  schedule_id?: string;
  user_id?: string;
  status?: ShiftStatus | ShiftStatus[];
  shift_type?: ShiftType;
  date_from?: string;
  date_to?: string;
}

export interface OnCallOverrideFilters {
  schedule_id?: string;
  user_id?: string;
  status?: OverrideStatus | OverrideStatus[];
  override_type?: OverrideType;
  date_from?: string;
  date_to?: string;
}

// =====================================
// Infrastructure / Network Flow Types
// =====================================

// Network Layer Classification - Enum for type-safe access
export enum NetworkLayerType {
  F_SWI = 'f_swi',
  R_SWI = 'r_swi',
  E_SWI = 'e_swi',
  S_HW = 's_hw'
}

export type SwitchNetworkType = 'gateway' | 'public' | 'exchange';
export type ServerType = 'physical' | 'virtual';
export type DeviceVendor = 'fortigate' | 'cisco' | 'huawei' | 'arista' | 'aruba' | 'dell' | 'juniper' | 'other';
export type ConnectionRelationshipType = 'CONNECTS_TO' | 'HAS_MICROSERVICE' | 'RUNS_ON' | 'LINKS_TO' | 'MANAGES' | 'DEPENDS_ON' | 'BACKUP_OF';
export type PortStatus = 'up' | 'down' | 'admin_down' | 'error' | 'not_connected';
export type PortType = 'ethernet' | 'gigabit' | 'ten_gigabit' | 'forty_gigabit' | 'hundred_gigabit' | 'sfp' | 'sfp_plus' | 'qsfp' | 'fiber' | 'serial' | 'virtual';

// Network Layer Display Info
export const NetworkLayerInfo: Record<NetworkLayerType, { name: string; label: string; description: string; icon: string; color: string }> = {
  [NetworkLayerType.F_SWI]: { name: 'Firewall Layer', label: 'Firewall', description: 'Perimeter Security', icon: '🛡️', color: '#ef4444' },
  [NetworkLayerType.R_SWI]: { name: 'Router Layer', label: 'Router', description: 'Network Routing', icon: '🌐', color: '#f97316' },
  [NetworkLayerType.E_SWI]: { name: 'Exchange Switch Layer', label: 'Switch', description: 'Core/Distribution', icon: '🔀', color: '#3b82f6' },
  [NetworkLayerType.S_HW]: { name: 'Server Hardware Layer', label: 'Server', description: 'Compute Layer', icon: '🖥️', color: '#22c55e' }
};

// Device Vendor Info for visualization
export const DeviceVendorInfo: Record<DeviceVendor, { name: string; logo: string; color: string }> = {
  fortigate: { name: 'FortiGate', logo: '/assets/vendors/fortigate.svg', color: '#DA291C' },
  cisco: { name: 'Cisco', logo: '/assets/vendors/cisco.svg', color: '#049FD9' },
  huawei: { name: 'Huawei', logo: '/assets/vendors/huawei.svg', color: '#CF0A2C' },
  arista: { name: 'Arista', logo: '/assets/vendors/arista.svg', color: '#3D5A80' },
  aruba: { name: 'Aruba', logo: '/assets/vendors/aruba.svg', color: '#FF8300' },
  dell: { name: 'Dell', logo: '/assets/vendors/dell.svg', color: '#007DB8' },
  juniper: { name: 'Juniper', logo: '/assets/vendors/juniper.svg', color: '#84BD00' },
  other: { name: 'Other', logo: '/assets/vendors/generic.svg', color: '#6b7280' }
};

// Infrastructure Host
export interface InfrastructureHost {
  id: string;
  client_id: string | null;
  hostname: string;
  display_name: string | null;
  description: string | null;
  neo4j_type: string;
  network_layer: NetworkLayerType;
  neo4j_parent: string;
  service_type: string | null;
  device_category: string;
  device_vendor: DeviceVendor | null;
  device_model: string | null;
  device_series: string | null;
  switch_network_type: SwitchNetworkType | null;
  is_stacked: boolean;
  stack_position: number | null;
  stack_master_id: string | null;
  server_type: ServerType | null;
  operating_system: string | null;
  os_version: string | null;
  hypervisor_id: string | null;
  physical_host_ip: string | null;
  management_ip: string | null;
  management_mac: string | null;
  management_vlan: number | null;
  serial_number: string | null;
  asset_tag: string | null;
  firmware_version: string | null;
  hardware_specs: Record<string, unknown>;
  total_ports: number | null;
  port_configuration: Record<string, unknown>;
  data_center: string | null;
  location: string | null;
  rack_id: string | null;
  rack_unit: string | null;
  operational_status: string;
  health_status: string;
  last_seen_at: string | null;
  uptime_seconds: number | null;
  cpu_usage: number | null;
  memory_usage: number | null;
  disk_usage: number | null;
  temperature: number | null;
  owner_id: string | null;
  assigned_group_id: string | null;
  tags: string[];
  custom_fields: Record<string, unknown>;
  notes: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface InfrastructureHostCreate {
  hostname: string;
  display_name?: string;
  description?: string;
  network_layer: NetworkLayerType;
  device_category: string;
  device_vendor?: DeviceVendor;
  device_model?: string;
  device_series?: string;
  switch_network_type?: SwitchNetworkType;
  is_stacked?: boolean;
  stack_position?: number;
  stack_master_id?: string;
  server_type?: ServerType;
  operating_system?: string;
  os_version?: string;
  hypervisor_id?: string;
  physical_host_ip?: string;
  management_ip?: string;
  management_mac?: string;
  management_vlan?: number;
  serial_number?: string;
  asset_tag?: string;
  firmware_version?: string;
  hardware_specs?: Record<string, unknown>;
  total_ports?: number;
  data_center?: string;
  location?: string;
  rack_id?: string;
  rack_unit?: string;
  service_type?: string;
  tags?: string[];
  custom_fields?: Record<string, unknown>;
  notes?: string;
}

export interface InfrastructureHostUpdate extends Partial<InfrastructureHostCreate> {
  operational_status?: string;
  health_status?: string;
}

export interface InfrastructureHostFilters {
  network_layer?: NetworkLayerType;
  device_category?: string;
  device_vendor?: DeviceVendor;
  switch_network_type?: SwitchNetworkType;
  server_type?: ServerType;
  operational_status?: string;
  health_status?: string;
  data_center?: string;
  search?: string;
}

// Host Port
export interface HostPort {
  id: string;
  host_id: string;
  client_id: string | null;
  port_name: string;
  port_display_name: string | null;
  port_description: string | null;
  neo4j_type: string;
  neo4j_parent: string;
  relationship_required: boolean;
  port_type: PortType;
  port_number: number | null;
  slot_number: number | null;
  module_number: number | null;
  ip_address: string | null;
  mac_address: string | null;
  subnet_mask: string | null;
  vlan_id: number | null;
  vlan_mode: string | null;
  native_vlan: number | null;
  allowed_vlans: number[];
  speed_mbps: number | null;
  negotiated_speed_mbps: number | null;
  duplex: string | null;
  admin_status: string;
  operational_status: PortStatus;
  last_status_change: string | null;
  rx_bytes: number;
  tx_bytes: number;
  rx_packets: number;
  tx_packets: number;
  rx_errors: number;
  tx_errors: number;
  rx_drops: number;
  tx_drops: number;
  physical_nic_link: string | null;
  tags: string[];
  custom_fields: Record<string, unknown>;
  is_active: boolean;
  created_at: string;
}

export interface HostPortCreate {
  port_name: string;
  port_display_name?: string;
  port_description?: string;
  port_type?: PortType;
  port_number?: number;
  slot_number?: number;
  ip_address?: string;
  mac_address?: string;
  vlan_id?: number;
  vlan_mode?: string;
  speed_mbps?: number;
  admin_status?: string;
  tags?: string[];
}

export interface HostPortUpdate extends Partial<HostPortCreate> {
  operational_status?: PortStatus;
}

// Network Connection
export interface NetworkConnection {
  id: string;
  client_id: string | null;
  relationship_type: ConnectionRelationshipType;
  source_host_id: string | null;
  source_port_id: string | null;
  source_entity_type: string;
  target_host_id: string | null;
  target_port_id: string | null;
  target_entity_type: string;
  connection_name: string | null;
  description: string | null;
  cable_type: string | null;
  cable_length: string | null;
  cable_label: string | null;
  bandwidth_mbps: number | null;
  latency_ms: number | null;
  connection_status: string;
  last_verified_at: string | null;
  properties: Record<string, unknown>;
  tags: string[];
  is_active: boolean;
  created_at: string;
}

export interface NetworkConnectionCreate {
  relationship_type: ConnectionRelationshipType;
  source_host_id?: string;
  source_port_id?: string;
  source_entity_type: string;
  target_host_id?: string;
  target_port_id?: string;
  target_entity_type: string;
  connection_name?: string;
  description?: string;
  cable_type?: string;
  bandwidth_mbps?: number;
  properties?: Record<string, unknown>;
  tags?: string[];
}

export interface NetworkConnectionUpdate extends Partial<NetworkConnectionCreate> {
  connection_status?: string;
}

// Device Template
export interface DeviceTemplate {
  id: string;
  template_name: string;
  display_name: string | null;
  description: string | null;
  network_layer: NetworkLayerType;
  device_category: string;
  device_vendor: DeviceVendor | null;
  device_model: string | null;
  device_series: string | null;
  switch_network_type: SwitchNetworkType | null;
  is_stack_template: boolean;
  default_ports: number | null;
  port_template: Record<string, unknown>[];
  service_type_template: string | null;
  default_config: Record<string, unknown>;
  default_specs: Record<string, unknown>;
  template_file_name: string | null;
  is_active: boolean;
  created_at: string;
}

export interface DeviceTemplateCreate {
  template_name: string;
  display_name?: string;
  description?: string;
  network_layer: NetworkLayerType;
  device_category: string;
  device_vendor?: DeviceVendor;
  device_model?: string;
  device_series?: string;
  switch_network_type?: SwitchNetworkType;
  is_stack_template?: boolean;
  default_ports?: number;
  port_template?: Record<string, unknown>[];
  service_type_template?: string;
  default_config?: Record<string, unknown>;
  default_specs?: Record<string, unknown>;
  template_file_name?: string;
}

export interface DeviceTemplateUpdate extends Partial<DeviceTemplateCreate> {
  is_active?: boolean;
}

// Infrastructure Topology
export interface InfrastructureTopology {
  id: string;
  client_id: string;
  name: string;
  description: string | null;
  topology_type: string;
  scope: string | null;
  data_center: string | null;
  layout_type: string;
  layout_config: Record<string, unknown>;
  node_positions: Record<string, { x: number; y: number }>;
  layer_groups: Record<string, unknown>;
  custom_groups: unknown[];
  included_layers: string[];
  included_hosts: string[];
  excluded_hosts: string[];
  show_connections: boolean;
  show_ports: boolean;
  show_metrics: boolean;
  show_status_colors: boolean;
  status: string;
  is_default: boolean;
  created_by_id: string;
  last_modified_by_id: string | null;
  tags: string[];
  custom_fields: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface InfrastructureTopologyCreate {
  name: string;
  description?: string;
  topology_type?: string;
  scope?: string;
  data_center?: string;
  layout_type?: string;
  layout_config?: Record<string, unknown>;
  included_layers?: string[];
  show_connections?: boolean;
  show_ports?: boolean;
  show_metrics?: boolean;
  show_status_colors?: boolean;
  is_default?: boolean;
  tags?: string[];
}

export interface InfrastructureTopologyUpdate extends Partial<InfrastructureTopologyCreate> {
  node_positions?: Record<string, { x: number; y: number }>;
  included_hosts?: string[];
  excluded_hosts?: string[];
  status?: string;
}

// Topology Visualization Types
export interface TopologyNode {
  id: string;
  hostname: string;
  display_name: string | null;
  layer: NetworkLayerType;
  device_category: string;
  device_vendor: DeviceVendor | null;
  device_model: string | null;
  operational_status: string;
  health_status: string;
  position: { x: number; y: number } | null;
  metrics: {
    cpu_usage: number | null;
    memory_usage: number | null;
    uptime_seconds: number | null;
  } | null;
  port_count: number | null;
}

export interface TopologyEdge {
  id: string;
  source: string;
  target: string;
  source_port: string | null;
  target_port: string | null;
  relationship_type: ConnectionRelationshipType;
  status: string;
  bandwidth_mbps: number | null;
}

export interface TopologyData {
  nodes: TopologyNode[];
  edges: TopologyEdge[];
  layer_groups: Record<string, {
    display_name: string;
    count: number;
    hosts: string[];
  }>;
  statistics: {
    total_nodes: number;
    total_edges: number;
    healthy_nodes: number;
    warning_nodes: number;
    critical_nodes: number;
    by_layer: Record<string, number>;
  };
  // For full topology endpoint
  hosts?: FullTopologyHost[];
  connections?: FullTopologyConnection[];
  layer_counts?: Record<string, number>;
  health_summary?: {
    healthy: number;
    warning: number;
    critical: number;
    unknown: number;
  };
}

// Full Topology types (from /topology/full endpoint)
export interface FullTopologyHost {
  id: string;
  hostname: string;
  display_name: string | null;
  network_layer: string;
  device_category: string;
  device_vendor: string | null;
  device_model: string | null;
  switch_network_type: string | null;
  server_type: string | null;
  management_ip: string | null;
  status: string;
  health_status: string;
  cpu_usage: number | null;
  memory_usage: number | null;
  data_center: string | null;
  location: string | null;
}

export interface FullTopologyConnection {
  id: string;
  source_host_id: string;
  target_host_id: string;
  relationship_type: string;
  connection_status: string;
  bandwidth: string | null;
}

// Infrastructure Statistics
export interface LayerStats {
  layer: NetworkLayerType;
  layer_display_name: string;
  total_devices: number;
  healthy_devices: number;
  warning_devices: number;
  critical_devices: number;
  devices_by_vendor: Record<string, number>;
  devices_by_type: Record<string, number>;
}

export interface InfrastructureStats {
  total_hosts: number;
  total_ports: number;
  total_connections: number;
  layers: LayerStats[];
  network_zones: Record<string, number>;
  vm_physical_ratio: {
    physical: number;
    virtual: number;
    ratio: string;
  };
  health_summary: {
    healthy: number;
    warning: number;
    critical: number;
    unknown: number;
  };
}

// VM-Physical Mapping
export interface VMPhysicalMapping {
  vm: {
    id: string;
    hostname: string;
    ip: string | null;
    os: string | null;
    status: string;
  };
  physical_host: {
    id: string | null;
    hostname: string | null;
    ip: string | null;
    model: string | null;
  } | null;
  connection: {
    physical_ip_link: string | null;
  };
}

// Microservice
export interface HostMicroservice {
  id: string;
  host_id: string;
  client_id: string | null;
  service_name: string;
  display_name: string | null;
  description: string | null;
  neo4j_type: string;
  neo4j_parent: string;
  relationship_required: boolean;
  service_type: string | null;
  port_number: number | null;
  protocol: string | null;
  service_status: string;
  health_check_url: string | null;
  last_health_check: string | null;
  version: string | null;
  configuration: Record<string, unknown>;
  tags: string[];
  is_active: boolean;
  created_at: string;
}

// Device Catalog by Layer (for visualization)
export const DeviceCatalog = {
  f_swi: {
    fortigate: [
      { model: '50E', ports: 9, series: 'FortiGate' },
      { model: '60E', ports: 13, series: 'FortiGate' },
      { model: '60F', ports: 14, series: 'FortiGate' },
      { model: '70F', ports: 14, series: 'FortiGate' },
      { model: '80F', ports: 16, series: 'FortiGate' },
      { model: '100E', ports: 28, series: 'FortiGate' },
      { model: '100F', ports: 32, series: 'FortiGate' },
      { model: '120G', ports: 32, series: 'FortiGate' },
      { model: '200F', ports: 32, series: 'FortiGate' }
    ],
    cisco: [
      { model: 'FTD 2130', ports: 24, series: 'Firepower' }
    ]
  },
  r_swi: {
    cisco: [
      { model: '2911', ports: 4, series: 'ISR' },
      { model: '2921', ports: 4, series: 'ISR' },
      { model: '3945', ports: 4, series: 'ISR' },
      { model: 'ISR 1000', ports: 4, series: 'ISR' },
      { model: '4321', ports: 6, series: 'ISR' }
    ]
  },
  e_swi: {
    cisco: [
      { model: '2960 G', ports: 24, series: 'Catalyst' },
      { model: 'Catalyst 2960 S', ports: 24, series: 'Catalyst' },
      { model: 'C2960 48TT-L', ports: 48, series: 'Catalyst' },
      { model: 'C9200L 24T', ports: 24, series: 'Catalyst 9000' },
      { model: 'C9200L 48T', ports: 48, series: 'Catalyst 9000' },
      { model: 'C9300X 24HX', ports: 24, series: 'Catalyst 9000' },
      { model: 'C9300X 48TX', ports: 48, series: 'Catalyst 9000' },
      { model: 'Catalyst 1300', ports: 24, series: 'Catalyst' },
      { model: 'Nexus 9000', ports: 48, series: 'Nexus' },
      { model: 'SG350X-24', ports: 24, series: 'Small Business' }
    ],
    huawei: [
      { model: 'S5720 32X EI AC', ports: 32, series: 'S5700' },
      { model: 'S5720 52X LI AC', ports: 52, series: 'S5700' },
      { model: 'S5735 L24T4X A1', ports: 24, series: 'S5700' },
      { model: 'S6720S 26Q EI', ports: 26, series: 'S6700' }
    ],
    arista: [
      { model: '7124sx 960px', ports: 24, series: '7000' }
    ],
    aruba: [
      { model: '2930F 24G 4SFP', ports: 24, series: '2930F' }
    ]
  },
  s_hw: {
    templates: [
      { os: 'CentOS 7', type: 'physical', name: 'CentOS7_Phy' },
      { os: 'CentOS 7', type: 'virtual', name: 'CentOS7_VM' },
      { os: 'CentOS 8', type: 'physical', name: 'CentOS8_Phy' },
      { os: 'CentOS 8', type: 'virtual', name: 'CentOS8_VM' },
      { os: 'RHEL 7', type: 'physical', name: 'RHEL7_Phy' },
      { os: 'RHEL 7', type: 'virtual', name: 'RHEL7_VM' },
      { os: 'Ubuntu 22', type: 'physical', name: 'ubuntu22_Phy' },
      { os: 'Ubuntu 22', type: 'virtual', name: 'ubuntu22_VM' },
      { os: 'Windows', type: 'physical', name: 'Windows_Phy' },
      { os: 'Windows', type: 'virtual', name: 'Windows_VM' }
    ]
  }
};

// Switch Template Variants
export type SwitchTemplateVariant = 'Gateway' | 'Gateway stack' | 'Public' | 'Public stack' | 'Exchange' | 'Exchange stack';
