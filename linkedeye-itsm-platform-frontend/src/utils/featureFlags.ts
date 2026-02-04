/**
 * Feature Flags — toggle dashboard sections and features without code changes.
 *
 * Usage:
 *   import { isFeatureEnabled } from '@/utils/featureFlags';
 *   if (isFeatureEnabled('alertFunnel')) { ... }
 *
 * Override at runtime via localStorage:
 *   localStorage.setItem('ff:widgetCustomization', 'false');
 *
 * Or via env:
 *   VITE_FF_ALERT_FUNNEL=false
 */

export interface FeatureFlags {
  /** Show the alert-to-incident funnel on the dashboard */
  alertFunnel: boolean;
  /** Show the team workload panel (manager/admin) */
  teamWorkload: boolean;
  /** Enable drag-and-drop widget rearrangement */
  widgetCustomization: boolean;
  /** Show live SLA countdown timers on dashboard & incident pages */
  slaCountdown: boolean;
  /** Show AI recommendations panel on incident detail */
  aiRecommendations: boolean;
  /** Show the infrastructure health panel */
  infrastructureHealth: boolean;
  /** Show system integrations panel (admin only) */
  systemIntegrations: boolean;
  /** Show on-call panel on dashboard */
  onCallPanel: boolean;
  /** Show upcoming changes panel */
  upcomingChanges: boolean;
  /** Show priority distribution chart */
  priorityDistribution: boolean;
}

const DEFAULTS: FeatureFlags = {
  alertFunnel: true,
  teamWorkload: true,
  widgetCustomization: true,
  slaCountdown: true,
  aiRecommendations: true,
  infrastructureHealth: true,
  systemIntegrations: true,
  onCallPanel: true,
  upcomingChanges: true,
  priorityDistribution: true,
};

function envKey(flag: string): string {
  // alertFunnel -> VITE_FF_ALERT_FUNNEL
  return 'VITE_FF_' + flag.replace(/([A-Z])/g, '_$1').toUpperCase();
}

function localKey(flag: string): string {
  return `ff:${flag}`;
}

export function isFeatureEnabled(flag: keyof FeatureFlags): boolean {
  // 1. localStorage override (highest priority)
  const local = localStorage.getItem(localKey(flag));
  if (local !== null) return local === 'true';

  // 2. Environment variable override
  const env = (import.meta as any).env?.[envKey(flag)];
  if (env !== undefined) return env === 'true';

  // 3. Default
  return DEFAULTS[flag];
}

export function setFeatureFlag(flag: keyof FeatureFlags, enabled: boolean): void {
  localStorage.setItem(localKey(flag), String(enabled));
}

export function clearFeatureFlag(flag: keyof FeatureFlags): void {
  localStorage.removeItem(localKey(flag));
}

export function getAllFlags(): Record<keyof FeatureFlags, boolean> {
  const result = {} as Record<keyof FeatureFlags, boolean>;
  for (const key of Object.keys(DEFAULTS) as Array<keyof FeatureFlags>) {
    result[key] = isFeatureEnabled(key);
  }
  return result;
}
