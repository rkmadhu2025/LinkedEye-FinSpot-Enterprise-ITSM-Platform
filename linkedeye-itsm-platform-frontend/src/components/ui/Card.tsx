import clsx from 'clsx';

export interface CardProps {
  children: React.ReactNode;
  className?: string;
  padding?: 'none' | 'sm' | 'md' | 'lg';
  hover?: boolean;
  interactive?: boolean;
  variant?: 'default' | 'elevated' | 'glass' | 'gradient' | 'bordered';
  /** Optional role for accessibility */
  role?: string;
  /** Optional aria-label for accessibility */
  'aria-label'?: string;
  /** Optional onClick handler for interactive cards */
  onClick?: () => void;
}

const Card = ({
  children,
  className,
  padding = 'md',
  hover = false,
  interactive = false,
  variant = 'default',
  role,
  'aria-label': ariaLabel,
  onClick,
}: CardProps) => {
  const paddingStyles = {
    none: '',
    sm: 'p-4',
    md: 'p-5',
    lg: 'p-6',
  };

  const variantStyles = {
    default: clsx(
      'bg-white dark:bg-dark-100',
      'border border-gray-200 dark:border-dark-300',
      'shadow-card dark:shadow-card-dark'
    ),
    elevated: clsx(
      'bg-white dark:bg-dark-100',
      'border-0',
      'shadow-lg dark:shadow-card-dark'
    ),
    glass: clsx(
      'backdrop-blur-xl',
      'bg-white/80 dark:bg-dark-100/80',
      'border border-white/20 dark:border-white/10',
      'shadow-lg'
    ),
    gradient: clsx(
      'bg-gradient-to-br from-primary-600 to-violet-600',
      'text-white',
      'border-0',
      'shadow-lg shadow-primary-500/25'
    ),
    bordered: clsx(
      'bg-white dark:bg-dark-100',
      'border-2 border-gray-200 dark:border-dark-300',
      'shadow-none'
    ),
  };

  const hoverStyles = hover || interactive ? clsx(
    'transition-all duration-200 ease-out',
    variant === 'default' && 'hover:shadow-card-hover dark:hover:shadow-card-dark-hover hover:border-gray-300 dark:hover:border-dark-400',
    variant === 'elevated' && 'hover:shadow-xl hover:-translate-y-1',
    variant === 'glass' && 'hover:bg-white/90 dark:hover:bg-dark-100/90 hover:shadow-xl',
    variant === 'gradient' && 'hover:shadow-xl hover:shadow-primary-500/30 hover:-translate-y-1',
    variant === 'bordered' && 'hover:border-primary-300 dark:hover:border-primary-700',
    interactive && 'cursor-pointer active:scale-[0.99]'
  ) : '';

  return (
    <div
      className={clsx(
        'rounded-xl overflow-hidden',
        variantStyles[variant],
        paddingStyles[padding],
        hoverStyles,
        className
      )}
      role={role}
      aria-label={ariaLabel}
      onClick={onClick}
      tabIndex={interactive ? 0 : undefined}
      onKeyDown={interactive && onClick ? (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick();
        }
      } : undefined}
    >
      {children}
    </div>
  );
};

export interface CardHeaderProps {
  children: React.ReactNode;
  className?: string;
  actions?: React.ReactNode;
  icon?: React.ReactNode;
  subtitle?: string;
}

export const CardHeader = ({ children, className, actions, icon, subtitle }: CardHeaderProps) => (
  <div
    className={clsx(
      'px-5 py-4 border-b border-gray-200 dark:border-dark-300',
      'flex items-center justify-between gap-4',
      className
    )}
  >
    <div className="flex items-center gap-3 min-w-0">
      {icon && (
        <div className="flex-shrink-0 w-9 h-9 rounded-lg bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center text-primary-600 dark:text-primary-400">
          {icon}
        </div>
      )}
      <div className="min-w-0">
        <div className="font-semibold text-gray-900 dark:text-dark-800 truncate">
          {children}
        </div>
        {subtitle && (
          <div className="text-sm text-gray-500 dark:text-dark-500 truncate mt-0.5">
            {subtitle}
          </div>
        )}
      </div>
    </div>
    {actions && <div className="flex items-center gap-2 flex-shrink-0">{actions}</div>}
  </div>
);

export interface CardBodyProps {
  children: React.ReactNode;
  className?: string;
}

export const CardBody = ({ children, className }: CardBodyProps) => (
  <div className={clsx('p-5', className)}>{children}</div>
);

export interface CardFooterProps {
  children: React.ReactNode;
  className?: string;
  align?: 'left' | 'center' | 'right' | 'between';
}

export const CardFooter = ({ children, className, align = 'right' }: CardFooterProps) => {
  const alignStyles = {
    left: 'justify-start',
    center: 'justify-center',
    right: 'justify-end',
    between: 'justify-between',
  };

  return (
    <div
      className={clsx(
        'px-5 py-4',
        'bg-gray-50 dark:bg-dark-200',
        'border-t border-gray-200 dark:border-dark-300',
        'flex items-center gap-3',
        alignStyles[align],
        className
      )}
    >
      {children}
    </div>
  );
};

// Stats Card variant for dashboard metrics
export interface StatsCardProps {
  title: string;
  value: string | number;
  icon?: React.ReactNode;
  trend?: {
    value: number;
    label?: string;
    isPositive?: boolean;
  };
  variant?: 'default' | 'primary' | 'success' | 'warning' | 'danger' | 'info';
  className?: string;
  onClick?: () => void;
}

export const StatsCard = ({
  title,
  value,
  icon,
  trend,
  variant = 'default',
  className,
  onClick,
}: StatsCardProps) => {
  const variantStyles = {
    default: 'border-t-gray-400',
    primary: 'border-t-primary-500',
    success: 'border-t-success-500',
    warning: 'border-t-warning-500',
    danger: 'border-t-danger-500',
    info: 'border-t-info-500',
  };

  const iconBgStyles = {
    default: 'bg-gray-100 text-gray-600 dark:bg-dark-200 dark:text-dark-500',
    primary: 'bg-primary-100 text-primary-600 dark:bg-primary-900/30 dark:text-primary-400',
    success: 'bg-success-100 text-success-600 dark:bg-success-900/30 dark:text-success-400',
    warning: 'bg-warning-100 text-warning-600 dark:bg-warning-900/30 dark:text-warning-400',
    danger: 'bg-danger-100 text-danger-600 dark:bg-danger-900/30 dark:text-danger-400',
    info: 'bg-info-100 text-info-600 dark:bg-info-900/30 dark:text-info-400',
  };

  return (
    <div
      className={clsx(
        'relative p-5 rounded-xl overflow-hidden',
        'bg-white dark:bg-dark-100',
        'border border-gray-200 dark:border-dark-300',
        'border-t-4',
        variantStyles[variant],
        'shadow-card dark:shadow-card-dark',
        'transition-all duration-200',
        'hover:shadow-card-hover dark:hover:shadow-card-dark-hover hover:-translate-y-0.5',
        onClick && 'cursor-pointer active:scale-[0.99]',
        className
      )}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-sm font-medium text-gray-500 dark:text-dark-500 truncate">
            {title}
          </p>
          <p className="mt-2 text-3xl font-bold tracking-tight text-gray-900 dark:text-dark-800">
            {value}
          </p>
          {trend && (
            <div className="mt-2 flex items-center gap-1.5">
              <span
                className={clsx(
                  'inline-flex items-center text-sm font-medium',
                  trend.isPositive !== undefined
                    ? trend.isPositive
                      ? 'text-success-600 dark:text-success-400'
                      : 'text-danger-600 dark:text-danger-400'
                    : 'text-gray-500 dark:text-dark-500'
                )}
              >
                {trend.isPositive !== undefined && (
                  <span className="mr-0.5">{trend.isPositive ? '↑' : '↓'}</span>
                )}
                {trend.value}%
              </span>
              {trend.label && (
                <span className="text-sm text-gray-400 dark:text-dark-400">
                  {trend.label}
                </span>
              )}
            </div>
          )}
        </div>
        {icon && (
          <div
            className={clsx(
              'flex-shrink-0 w-12 h-12 rounded-xl flex items-center justify-center',
              iconBgStyles[variant]
            )}
          >
            {icon}
          </div>
        )}
      </div>
    </div>
  );
};

export default Card;
