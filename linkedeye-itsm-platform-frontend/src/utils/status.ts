// Canonical ITSM status color map — semantic only, never decorative
export const STATUS_COLORS = {
  critical: { bg: '#ef4444', text: '#fff', bgSubtle: 'rgba(239,68,68,0.1)', textSubtle: '#dc2626' },
  high:     { bg: '#f97316', text: '#fff', bgSubtle: 'rgba(249,115,22,0.1)', textSubtle: '#c2410c' },
  medium:   { bg: '#f59e0b', text: '#78350f', bgSubtle: 'rgba(245,158,11,0.1)', textSubtle: '#b45309' },
  low:      { bg: '#3b82f6', text: '#fff', bgSubtle: 'rgba(59,130,246,0.1)', textSubtle: '#1d4ed8' },
  healthy:  { bg: '#10b981', text: '#fff', bgSubtle: 'rgba(16,185,129,0.1)', textSubtle: '#059669' },
  warning:  { bg: '#f59e0b', text: '#78350f', bgSubtle: 'rgba(245,158,11,0.1)', textSubtle: '#b45309' },
  unknown:  { bg: '#6b7280', text: '#fff', bgSubtle: 'rgba(107,114,128,0.1)', textSubtle: '#4b5563' },
  paused:   { bg: '#6b7280', text: '#fff', bgSubtle: 'rgba(107,114,128,0.1)', textSubtle: '#4b5563' },
} as const;

export type StatusKey = keyof typeof STATUS_COLORS;

export function getStatusColor(key: string): typeof STATUS_COLORS[StatusKey] {
  const normalized = key.toLowerCase().trim();
  return STATUS_COLORS[normalized as StatusKey] ?? STATUS_COLORS.unknown;
}

// Map incident status strings to visual status
export function getIncidentStatusColor(status: string) {
  const map: Record<string, StatusKey> = {
    open: 'critical',
    in_progress: 'medium',
    pending: 'warning',
    resolved: 'healthy',
    closed: 'unknown',
    new: 'critical',
  };
  return getStatusColor(map[status.toLowerCase()] || 'unknown');
}

export function getPriorityColor(priority: string) {
  return getStatusColor(priority);
}
