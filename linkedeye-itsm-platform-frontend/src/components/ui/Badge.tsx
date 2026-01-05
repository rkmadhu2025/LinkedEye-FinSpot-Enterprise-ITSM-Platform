import clsx from 'clsx';

export interface BadgeProps {
  children: React.ReactNode;
  variant?: 'default' | 'primary' | 'success' | 'warning' | 'danger' | 'info';
  size?: 'sm' | 'md' | 'lg';
  dot?: boolean;
  className?: string;
}

const Badge = ({ children, variant = 'default', size = 'md', dot = false, className }: BadgeProps) => {
  const variants = {
    default: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200',
    primary: 'bg-primary-100 text-primary-800 dark:bg-primary-900/30 dark:text-primary-300',
    success: 'bg-success-100 text-success-800 dark:bg-success-900/30 dark:text-success-300',
    warning: 'bg-warning-100 text-warning-800 dark:bg-warning-900/30 dark:text-warning-300',
    danger: 'bg-danger-100 text-danger-800 dark:bg-danger-900/30 dark:text-danger-300',
    info: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
  };

  const dotColors = {
    default: 'bg-gray-500',
    primary: 'bg-primary-500',
    success: 'bg-success-500',
    warning: 'bg-warning-500',
    danger: 'bg-danger-500',
    info: 'bg-blue-500',
  };

  const sizes = {
    sm: 'px-2 py-0.5 text-[10px]',
    md: 'px-2.5 py-0.5 text-xs',
    lg: 'px-3 py-1 text-sm',
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
      {dot && <span className={clsx('w-1.5 h-1.5 rounded-full', dotColors[variant])} />}
      {children}
    </span>
  );
};

export default Badge;

// Status Badge Component
export interface StatusBadgeProps {
  status: string;
  className?: string;
}

export const StatusBadge = ({ status, className }: StatusBadgeProps) => {
  const statusConfig: Record<string, { variant: BadgeProps['variant']; label: string }> = {
    open: { variant: 'info', label: 'Open' },
    in_progress: { variant: 'warning', label: 'In Progress' },
    pending: { variant: 'default', label: 'Pending' },
    resolved: { variant: 'success', label: 'Resolved' },
    closed: { variant: 'default', label: 'Closed' },
    draft: { variant: 'default', label: 'Draft' },
    submitted: { variant: 'info', label: 'Submitted' },
    pending_approval: { variant: 'warning', label: 'Pending Approval' },
    approved: { variant: 'success', label: 'Approved' },
    rejected: { variant: 'danger', label: 'Rejected' },
    scheduled: { variant: 'info', label: 'Scheduled' },
    implementing: { variant: 'warning', label: 'Implementing' },
    completed: { variant: 'success', label: 'Completed' },
    failed: { variant: 'danger', label: 'Failed' },
    cancelled: { variant: 'default', label: 'Cancelled' },
    active: { variant: 'success', label: 'Active' },
    inactive: { variant: 'default', label: 'Inactive' },
    maintenance: { variant: 'warning', label: 'Maintenance' },
    retired: { variant: 'default', label: 'Retired' },
    disposed: { variant: 'default', label: 'Disposed' },
    healthy: { variant: 'success', label: 'Healthy' },
    warning: { variant: 'warning', label: 'Warning' },
    critical: { variant: 'danger', label: 'Critical' },
    unknown: { variant: 'default', label: 'Unknown' },
    firing: { variant: 'danger', label: 'Firing' },
    acknowledged: { variant: 'warning', label: 'Acknowledged' },
  };

  const config = statusConfig[status.toLowerCase()] || { variant: 'default' as const, label: status };

  return (
    <Badge variant={config.variant} dot className={className}>
      {config.label}
    </Badge>
  );
};

// Priority Badge Component
export interface PriorityBadgeProps {
  priority: 'critical' | 'high' | 'medium' | 'low';
  className?: string;
}

export const PriorityBadge = ({ priority, className }: PriorityBadgeProps) => {
  const priorityConfig: Record<string, { variant: BadgeProps['variant']; label: string }> = {
    critical: { variant: 'danger', label: 'Critical' },
    high: { variant: 'warning', label: 'High' },
    medium: { variant: 'info', label: 'Medium' },
    low: { variant: 'success', label: 'Low' },
  };

  const config = priorityConfig[priority] || { variant: 'default' as const, label: priority };

  return (
    <Badge variant={config.variant} className={className}>
      {config.label}
    </Badge>
  );
};
