import clsx from 'clsx';
import { forwardRef, HTMLAttributes } from 'react';

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  className?: string;
  padding?: 'none' | 'sm' | 'md' | 'lg';
  variant?: 'default' | 'elevated' | 'glass' | 'outline' | 'ghost';
  hover?: boolean;
  role?: string;
  'aria-label'?: string;
}

const Card = forwardRef<HTMLDivElement, CardProps>(
  ({
    children,
    className,
    padding = 'md',
    variant = 'default',
    hover = false,
    role,
    'aria-label': ariaLabel,
    ...props
  }, ref) => {
    const paddingStyles = {
      none: '',
      sm: 'p-4',
      md: 'p-5',
      lg: 'p-6',
    };

    const variantStyles = {
      default: clsx(
        'bg-white dark:bg-gray-900',
        'border border-gray-200 dark:border-gray-800',
        'shadow-card dark:shadow-card-dark'
      ),
      elevated: clsx(
        'bg-white dark:bg-gray-900',
        'border border-gray-100 dark:border-gray-800',
        'shadow-lg dark:shadow-card-dark'
      ),
      glass: clsx(
        'backdrop-blur-xl',
        'bg-white/80 dark:bg-gray-900/80',
        'border border-white/50 dark:border-white/10',
        'shadow-card'
      ),
      outline: clsx(
        'bg-transparent',
        'border border-gray-200 dark:border-gray-700'
      ),
      ghost: clsx(
        'bg-gray-50/50 dark:bg-gray-800/50',
        'border border-transparent'
      ),
    };

    const hoverStyles = hover
      ? clsx(
          'cursor-pointer',
          'transition-all duration-200 ease-out',
          'hover:shadow-card-hover dark:hover:shadow-card-dark-hover',
          'hover:-translate-y-0.5',
          'hover:border-gray-300 dark:hover:border-gray-700'
        )
      : 'transition-shadow duration-200';

    return (
      <div
        ref={ref}
        className={clsx(
          'rounded-xl',
          variantStyles[variant],
          hoverStyles,
          paddingStyles[padding],
          className
        )}
        role={role}
        aria-label={ariaLabel}
        {...props}
      >
        {children}
      </div>
    );
  }
);

Card.displayName = 'Card';

export interface CardHeaderProps extends HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  className?: string;
  actions?: React.ReactNode;
  icon?: React.ReactNode;
}

export const CardHeader = forwardRef<HTMLDivElement, CardHeaderProps>(
  ({ children, className, actions, icon, ...props }, ref) => (
    <div
      ref={ref}
      className={clsx(
        'px-5 py-4 flex items-center justify-between gap-4',
        'border-b border-gray-200 dark:border-gray-800',
        className
      )}
      {...props}
    >
      <div className="flex items-center gap-3 min-w-0">
        {icon && (
          <div className="flex-shrink-0 w-9 h-9 rounded-lg bg-primary-50 dark:bg-primary-500/10 flex items-center justify-center text-primary-600 dark:text-primary-400">
            {icon}
          </div>
        )}
        <div className="font-semibold text-gray-900 dark:text-white truncate">
          {children}
        </div>
      </div>
      {actions && (
        <div className="flex items-center gap-2 flex-shrink-0">
          {actions}
        </div>
      )}
    </div>
  )
);

CardHeader.displayName = 'CardHeader';

export interface CardBodyProps extends HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  className?: string;
}

export const CardBody = forwardRef<HTMLDivElement, CardBodyProps>(
  ({ children, className, ...props }, ref) => (
    <div
      ref={ref}
      className={clsx('p-5', className)}
      {...props}
    >
      {children}
    </div>
  )
);

CardBody.displayName = 'CardBody';

export interface CardFooterProps extends HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  className?: string;
  variant?: 'default' | 'filled';
}

export const CardFooter = forwardRef<HTMLDivElement, CardFooterProps>(
  ({ children, className, variant = 'default', ...props }, ref) => (
    <div
      ref={ref}
      className={clsx(
        'px-5 py-4 rounded-b-xl',
        'border-t border-gray-200 dark:border-gray-800',
        variant === 'filled' && 'bg-gray-50 dark:bg-gray-800/50',
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
);

CardFooter.displayName = 'CardFooter';

// Stat Card Component
export interface StatCardProps {
  label: string;
  value: string | number;
  change?: {
    value: number;
    type: 'increase' | 'decrease';
  };
  icon?: React.ReactNode;
  className?: string;
}

export const StatCard = ({ label, value, change, icon, className }: StatCardProps) => (
  <Card className={clsx('relative overflow-hidden', className)}>
    <div className="p-5">
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
            {label}
          </p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">
            {value}
          </p>
        </div>
        {icon && (
          <div className="w-10 h-10 rounded-lg bg-primary-50 dark:bg-primary-500/10 flex items-center justify-center text-primary-600 dark:text-primary-400">
            {icon}
          </div>
        )}
      </div>
      {change && (
        <div className="mt-3 flex items-center gap-1.5">
          <span
            className={clsx(
              'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium',
              change.type === 'increase'
                ? 'bg-success-50 text-success-700 dark:bg-success-500/10 dark:text-success-400'
                : 'bg-danger-50 text-danger-700 dark:bg-danger-500/10 dark:text-danger-400'
            )}
          >
            {change.type === 'increase' ? '+' : '-'}{Math.abs(change.value)}%
          </span>
          <span className="text-xs text-gray-500 dark:text-gray-400">
            vs last period
          </span>
        </div>
      )}
    </div>
    {/* Decorative gradient */}
    <div className="absolute top-0 right-0 w-32 h-32 -mr-8 -mt-8 bg-gradient-to-br from-primary-500/10 to-transparent rounded-full blur-2xl" />
  </Card>
);

export default Card;
