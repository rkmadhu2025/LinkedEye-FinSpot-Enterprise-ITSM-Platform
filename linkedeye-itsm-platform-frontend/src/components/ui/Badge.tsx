import clsx from 'clsx';

export interface BadgeProps {
  children: React.ReactNode;
  variant?: 'default' | 'primary' | 'success' | 'warning' | 'danger' | 'info' | 'violet' | 'critical';
  size?: 'sm' | 'md' | 'lg';
  dot?: boolean;
  pulse?: boolean;
  outline?: boolean;
  className?: string;
}

const Badge = ({
  children,
  variant = 'default',
  size = 'md',
  dot = false,
  pulse = false,
  outline = false,
  className
}: BadgeProps) => {
  const solidVariants = {
    default: 'bg-gray-100 text-gray-700 dark:bg-dark-200 dark:text-dark-600',
    primary: 'bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-400',
    success: 'bg-success-100 text-success-700 dark:bg-success-900/30 dark:text-success-400',
    warning: 'bg-warning-100 text-warning-700 dark:bg-warning-900/30 dark:text-warning-400',
    danger: 'bg-danger-100 text-danger-700 dark:bg-danger-900/30 dark:text-danger-400',
    info: 'bg-info-100 text-info-700 dark:bg-info-900/30 dark:text-info-400',
    violet: 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400',
    critical: 'bg-critical-500/10 text-critical-600 dark:bg-critical-500/20 dark:text-critical-500',
  };

  const outlineVariants = {
    default: 'border border-gray-300 text-gray-600 dark:border-dark-300 dark:text-dark-500',
    primary: 'border border-primary-300 text-primary-600 dark:border-primary-700 dark:text-primary-400',
    success: 'border border-success-300 text-success-600 dark:border-success-700 dark:text-success-400',
    warning: 'border border-warning-300 text-warning-600 dark:border-warning-700 dark:text-warning-400',
    danger: 'border border-danger-300 text-danger-600 dark:border-danger-700 dark:text-danger-400',
    info: 'border border-info-300 text-info-600 dark:border-info-700 dark:text-info-400',
    violet: 'border border-violet-300 text-violet-600 dark:border-violet-700 dark:text-violet-400',
    critical: 'border border-critical-500 text-critical-600 dark:border-critical-600 dark:text-critical-500',
  };

  const dotColors = {
    default: 'bg-gray-500',
    primary: 'bg-primary-500',
    success: 'bg-success-500',
    warning: 'bg-warning-500',
    danger: 'bg-danger-500',
    info: 'bg-info-500',
    violet: 'bg-violet-500',
    critical: 'bg-critical-500',
  };

  const sizes = {
    sm: 'px-2 py-0.5 text-2xs gap-1',
    md: 'px-2.5 py-0.5 text-xs gap-1.5',
    lg: 'px-3 py-1 text-sm gap-1.5',
  };

  return (
    <span
      className={clsx(
        'inline-flex items-center font-medium rounded-full whitespace-nowrap',
        outline ? outlineVariants[variant] : solidVariants[variant],
        sizes[size],
        className
      )}
    >
      {dot && (
        <span className="relative flex">
          <span className={clsx('w-1.5 h-1.5 rounded-full', dotColors[variant])} />
          {pulse && (
            <span
              className={clsx(
                'absolute inset-0 w-1.5 h-1.5 rounded-full animate-ping opacity-75',
                dotColors[variant]
              )}
            />
          )}
        </span>
      )}
      {children}
    </span>
  );
};

export default Badge;

// Status Badge Component with enhanced styling
export interface StatusBadgeProps {
  status: string;
  className?: string;
  showDot?: boolean;
}

export const StatusBadge = ({ status, className, showDot = true }: StatusBadgeProps) => {
  const statusConfig: Record<string, { variant: BadgeProps['variant']; label: string; pulse?: boolean }> = {
    // Incident statuses
    open: { variant: 'info', label: 'Open', pulse: true },
    in_progress: { variant: 'warning', label: 'In Progress' },
    pending: { variant: 'default', label: 'Pending' },
    resolved: { variant: 'success', label: 'Resolved' },
    closed: { variant: 'default', label: 'Closed' },

    // Change statuses
    draft: { variant: 'default', label: 'Draft' },
    submitted: { variant: 'info', label: 'Submitted' },
    pending_approval: { variant: 'warning', label: 'Pending Approval' },
    approved: { variant: 'success', label: 'Approved' },
    rejected: { variant: 'danger', label: 'Rejected' },
    scheduled: { variant: 'primary', label: 'Scheduled' },
    implementing: { variant: 'warning', label: 'Implementing', pulse: true },
    completed: { variant: 'success', label: 'Completed' },
    failed: { variant: 'danger', label: 'Failed' },
    cancelled: { variant: 'default', label: 'Cancelled' },
    rollback: { variant: 'danger', label: 'Rollback' },

    // Asset statuses
    active: { variant: 'success', label: 'Active' },
    inactive: { variant: 'default', label: 'Inactive' },
    maintenance: { variant: 'warning', label: 'Maintenance' },
    retired: { variant: 'default', label: 'Retired' },
    disposed: { variant: 'default', label: 'Disposed' },

    // Health statuses
    healthy: { variant: 'success', label: 'Healthy' },
    warning: { variant: 'warning', label: 'Warning' },
    critical: { variant: 'critical', label: 'Critical', pulse: true },
    unknown: { variant: 'default', label: 'Unknown' },

    // Alert statuses
    firing: { variant: 'danger', label: 'Firing', pulse: true },
    acknowledged: { variant: 'warning', label: 'Acknowledged' },
    silenced: { variant: 'default', label: 'Silenced' },

    // On-call statuses
    on_call: { variant: 'success', label: 'On Call', pulse: true },
    off_call: { variant: 'default', label: 'Off Call' },
    escalated: { variant: 'danger', label: 'Escalated' },
  };

  const normalizedStatus = status.toLowerCase().replace(/[\s-]/g, '_');
  const config = statusConfig[normalizedStatus] || { variant: 'default' as const, label: status };

  return (
    <Badge
      variant={config.variant}
      dot={showDot}
      pulse={config.pulse}
      className={className}
    >
      {config.label}
    </Badge>
  );
};

// Priority Badge Component with enhanced styling
export interface PriorityBadgeProps {
  priority: 'critical' | 'high' | 'medium' | 'low' | 'P1' | 'P2' | 'P3' | 'P4';
  className?: string;
}

export const PriorityBadge = ({ priority, className }: PriorityBadgeProps) => {
  const priorityConfig: Record<string, { variant: BadgeProps['variant']; label: string; pulse?: boolean }> = {
    critical: { variant: 'critical', label: 'Critical', pulse: true },
    p1: { variant: 'critical', label: 'P1 - Critical', pulse: true },
    high: { variant: 'danger', label: 'High' },
    p2: { variant: 'danger', label: 'P2 - High' },
    medium: { variant: 'warning', label: 'Medium' },
    p3: { variant: 'warning', label: 'P3 - Medium' },
    low: { variant: 'info', label: 'Low' },
    p4: { variant: 'info', label: 'P4 - Low' },
  };

  const normalizedPriority = priority.toLowerCase();
  const config = priorityConfig[normalizedPriority] || { variant: 'default' as const, label: priority };

  return (
    <Badge
      variant={config.variant}
      dot
      pulse={config.pulse}
      className={className}
    >
      {config.label}
    </Badge>
  );
};

// Severity Badge for alerts
export interface SeverityBadgeProps {
  severity: 'critical' | 'error' | 'warning' | 'info' | 'debug';
  className?: string;
}

export const SeverityBadge = ({ severity, className }: SeverityBadgeProps) => {
  const severityConfig: Record<string, { variant: BadgeProps['variant']; label: string; pulse?: boolean }> = {
    critical: { variant: 'critical', label: 'Critical', pulse: true },
    error: { variant: 'danger', label: 'Error' },
    warning: { variant: 'warning', label: 'Warning' },
    info: { variant: 'info', label: 'Info' },
    debug: { variant: 'default', label: 'Debug' },
  };

  const config = severityConfig[severity] || { variant: 'default' as const, label: severity };

  return (
    <Badge
      variant={config.variant}
      dot
      pulse={config.pulse}
      className={className}
    >
      {config.label}
    </Badge>
  );
};
