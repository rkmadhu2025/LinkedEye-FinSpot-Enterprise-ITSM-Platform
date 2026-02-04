import { User } from '@/types';

/**
 * User Role Types for Dashboard Personalization
 *
 * Dashboard views:
 * - executive: High-level KPIs only, business metrics
 * - manager: Team trends, workload distribution, escalations
 * - admin: System health, integrations, infrastructure
 * - agent: Operational tasks, SLA timers, assigned incidents
 */
export type UserRole = 'agent' | 'manager' | 'admin' | 'executive';

/**
 * Role code mappings - maps various role codes to our dashboard roles
 * Add your actual role codes here
 */
const ADMIN_ROLES = [
  'super_admin', 'admin', 'administrator', 'system_admin',
  'it_admin', 'platform_admin', 'sys_admin'
];

const EXECUTIVE_ROLES = [
  'executive', 'cto', 'cio', 'ceo', 'vp', 'director',
  'senior_director', 'c_level', 'leadership'
];

const MANAGER_ROLES = [
  'manager', 'team_lead', 'team_leader', 'cab_member',
  'supervisor', 'lead', 'senior_analyst', 'sr_analyst',
  'analyst', 'senior_engineer', 'sr_engineer', 'principal'
];

const AGENT_ROLES = [
  'agent', 'operator', 'user', 'technician', 'engineer',
  'support', 'helpdesk', 'service_desk', 'noc', 'soc',
  'it_support', 'l1', 'l2', 'l3', 'tier1', 'tier2', 'tier3'
];

/**
 * Determines the dashboard role for a user based on their assigned roles
 * Checks both role codes and role names (case-insensitive)
 */
export function getUserRole(user: User | null): UserRole {
  if (!user) return 'agent';

  // Get all role codes and names (lowercase for comparison)
  const roleCodes = user.roles?.map((r) => r.code?.toLowerCase()) || [];
  const roleNames = user.roles?.map((r) => r.name?.toLowerCase()) || [];
  const allRoleIdentifiers = [...roleCodes, ...roleNames].filter(Boolean);

  // Debug logging (remove in production)
  if (process.env.NODE_ENV === 'development') {
    console.log('[getUserRole] User roles:', user.roles);
    console.log('[getUserRole] Role identifiers:', allRoleIdentifiers);
  }

  // Check for admin first (highest priority)
  if (allRoleIdentifiers.some(r => ADMIN_ROLES.includes(r))) {
    return 'admin';
  }

  // Check for executive
  if (allRoleIdentifiers.some(r => EXECUTIVE_ROLES.includes(r))) {
    return 'executive';
  }

  // Check for manager
  if (allRoleIdentifiers.some(r => MANAGER_ROLES.includes(r))) {
    return 'manager';
  }

  // Check for specific agent roles
  if (allRoleIdentifiers.some(r => AGENT_ROLES.includes(r))) {
    return 'agent';
  }

  // Fallback: check for partial matches
  for (const identifier of allRoleIdentifiers) {
    if (identifier.includes('admin')) return 'admin';
    if (identifier.includes('executive') || identifier.includes('director')) return 'executive';
    if (identifier.includes('manager') || identifier.includes('lead') || identifier.includes('analyst')) return 'manager';
  }

  // Default to agent if no match
  return 'agent';
}

/**
 * Check if user has one of the allowed roles
 */
export function hasRole(user: User | null, allowed: UserRole[]): boolean {
  return allowed.includes(getUserRole(user));
}

/**
 * Get role display name for UI
 */
export function getRoleDisplayName(role: UserRole): string {
  const names: Record<UserRole, string> = {
    executive: 'Executive',
    manager: 'Manager',
    admin: 'Administrator',
    agent: 'Operator',
  };
  return names[role] || 'User';
}

/**
 * Check if user has permission for a feature based on role
 */
export function canAccessFeature(user: User | null, feature: string): boolean {
  const role = getUserRole(user);

  const featureAccess: Record<string, UserRole[]> = {
    systemIntegrations: ['admin'],
    infrastructureHealth: ['admin', 'manager'],
    teamWorkload: ['admin', 'manager', 'executive'],
    escalations: ['admin', 'manager'],
    alertFunnel: ['admin', 'manager', 'agent'],
    onCallPanel: ['admin', 'manager', 'agent'],
    slaCountdown: ['admin', 'manager', 'agent'],
    upcomingChanges: ['admin', 'manager', 'agent'],
  };

  return featureAccess[feature]?.includes(role) ?? true;
}
