import clsx from 'clsx';

export interface BadgeProps {
  children: React.ReactNode;
  variant?: 'default' | 'primary' | 'secondary' | 'success' | 'warning' | 'danger' | 'info' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  dot?: boolean;
  pulse?: boolean;
  className?: string;
}

const Badge = ({
  children,
  variant = 'default',
  size = 'md',
  dot = false,
  pulse = false,
  className,
}: BadgeProps) => {
  const variants = {
    default: clsx(
      'bg-gray-100 text-gray-700',
      'dark:bg-gray-800 dark:text-gray-300'
    ),
    primary: clsx(
      'bg-primary-50 text-primary-700',
      'dark:bg-primary-500/15 dark:text-primary-400'
    ),
    secondary: clsx(
      'bg-secondary-50 text-secondary-700',
      'dark:bg-secondary-500/15 dark:text-secondary-400'
    ),
    success: clsx(
      'bg-success-50 text-success-700',
      'dark:bg-success-500/15 dark:text-success-400'
    ),
    warning: clsx(
      'bg-warning-50 text-warning-700',
      'dark:bg-warning-500/15 dark:text-warning-400'
    ),
    danger: clsx(
      'bg-danger-50 text-danger-700',
      'dark:bg-danger-500/15 dark:text-danger-400'
    ),
    info: clsx(
      'bg-info-50 text-info-700',
      'dark:bg-info-500/15 dark:text-info-400'
    ),
    outline: clsx(
      'bg-transparent text-gray-700 border border-gray-300',
      'dark:text-gray-300 dark:border-gray-600'
    ),
  };

  const dotColors = {
    default: 'bg-gray-500 dark:bg-gray-400',
    primary: 'bg-primary-500 dark:bg-primary-400',
    secondary: 'bg-secondary-500 dark:bg-secondary-400',
    success: 'bg-success-500 dark:bg-success-400',
    warning: 'bg-warning-500 dark:bg-warning-400',
    danger: 'bg-danger-500 dark:bg-danger-400',
    info: 'bg-info-500 dark:bg-info-400',
    outline: 'bg-gray-500 dark:bg-gray-400',
  };

  const sizes = {
    sm: 'px-2 py-0.5 text-[10px]',
    md: 'px-2.5 py-0.5 text-xs',
    lg: 'px-3 py-1 text-sm',
  };

  const dotSizes = {
    sm: 'w-1 h-1',
    md: 'w-1.5 h-1.5',
    lg: 'w-2 h-2',
  };

  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1.5 font-medium rounded-full',
        variants[variant],
        sizes[size],
        className
      )}
    >
      {dot && (
        <span className={clsx('relative rounded-full', dotColors[variant], dotSizes[size])}>
          {pulse && (
            <span
              className={clsx(
                'absolute inset-0 rounded-full animate-ping opacity-75',
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

// Status Badge Component
export interface StatusBadgeProps {
  status: string;
  className?: string;
  showDot?: boolean;
}

export const StatusBadge = ({ status, className, showDot = true }: StatusBadgeProps) => {
  const statusConfig: Record<string, { variant: BadgeProps['variant']; label: string; pulse?: boolean }> = {
    // General statuses
    open: { variant: 'info', label: 'Open' },
    in_progress: { variant: 'warning', label: 'In Progress', pulse: true },
    pending: { variant: 'default', label: 'Pending' },
    resolved: { variant: 'success', label: 'Resolved' },
    closed: { variant: 'default', label: 'Closed' },

    // Change statuses
    draft: { variant: 'default', label: 'Draft' },
    submitted: { variant: 'info', label: 'Submitted' },
    pending_approval: { variant: 'warning', label: 'Pending Approval' },
    approved: { variant: 'success', label: 'Approved' },
    rejected: { variant: 'danger', label: 'Rejected' },
    scheduled: { variant: 'info', label: 'Scheduled' },
    implementing: { variant: 'warning', label: 'Implementing', pulse: true },
    completed: { variant: 'success', label: 'Completed' },
    failed: { variant: 'danger', label: 'Failed' },
    cancelled: { variant: 'default', label: 'Cancelled' },

    // Asset statuses
    active: { variant: 'success', label: 'Active' },
    inactive: { variant: 'default', label: 'Inactive' },
    maintenance: { variant: 'warning', label: 'Maintenance' },
    retired: { variant: 'default', label: 'Retired' },
    disposed: { variant: 'default', label: 'Disposed' },

    // Health statuses
    healthy: { variant: 'success', label: 'Healthy' },
    warning: { variant: 'warning', label: 'Warning' },
    critical: { variant: 'danger', label: 'Critical', pulse: true },
    unknown: { variant: 'default', label: 'Unknown' },

    // Alert statuses
    firing: { variant: 'danger', label: 'Firing', pulse: true },
    acknowledged: { variant: 'warning', label: 'Acknowledged' },

    // Connection statuses
    online: { variant: 'success', label: 'Online' },
    offline: { variant: 'default', label: 'Offline' },
    connecting: { variant: 'info', label: 'Connecting', pulse: true },
  };

  const config = statusConfig[status.toLowerCase()] || { variant: 'default' as const, label: status };

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

// Priority Badge Component
export interface PriorityBadgeProps {
  priority: 'critical' | 'high' | 'medium' | 'low' | string;
  className?: string;
}

export const PriorityBadge = ({ priority, className }: PriorityBadgeProps) => {
  const priorityConfig: Record<string, { variant: BadgeProps['variant']; label: string; pulse?: boolean }> = {
    critical: { variant: 'danger', label: 'Critical', pulse: true },
    high: { variant: 'warning', label: 'High' },
    medium: { variant: 'info', label: 'Medium' },
    low: { variant: 'success', label: 'Low' },
  };

  const config = priorityConfig[priority.toLowerCase()] || { variant: 'default' as const, label: priority };

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

// Count Badge (for notification counts)
export interface CountBadgeProps {
  count: number;
  max?: number;
  variant?: 'default' | 'primary' | 'danger';
  className?: string;
}

export const CountBadge = ({ count, max = 99, variant = 'danger', className }: CountBadgeProps) => {
  if (count <= 0) return null;

  const displayCount = count > max ? `${max}+` : count;

  const variants = {
    default: 'bg-gray-500 text-white',
    primary: 'bg-primary-600 text-white',
    danger: 'bg-danger-600 text-white',
  };

  return (
    <span
      className={clsx(
        'inline-flex items-center justify-center',
        'min-w-[18px] h-[18px] px-1',
        'text-[10px] font-bold rounded-full',
        variants[variant],
        className
      )}
    >
      {displayCount}
    </span>
  );
};
