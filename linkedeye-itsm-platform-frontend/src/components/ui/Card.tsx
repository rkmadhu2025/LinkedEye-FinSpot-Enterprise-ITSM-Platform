import clsx from 'clsx';

export interface CardProps {
  children: React.ReactNode;
  className?: string;
  padding?: 'none' | 'sm' | 'md' | 'lg';
  hover?: boolean;
  /** Optional role for accessibility */
  role?: string;
  /** Optional aria-label for accessibility */
  'aria-label'?: string;
}

const Card = ({
  children,
  className,
  padding = 'md',
  hover = false,
  role,
  'aria-label': ariaLabel,
}: CardProps) => {
  const paddingStyles = {
    none: '',
    sm: 'p-4',
    md: 'p-5',
    lg: 'p-6',
  };

  return (
    <div
      className={clsx(
        'bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-card',
        hover && 'hover:shadow-card-hover transition-shadow cursor-pointer',
        paddingStyles[padding],
        className
      )}
      role={role}
      aria-label={ariaLabel}
    >
      {children}
    </div>
  );
};

export interface CardHeaderProps {
  children: React.ReactNode;
  className?: string;
  actions?: React.ReactNode;
}

export const CardHeader = ({ children, className, actions }: CardHeaderProps) => (
  <div
    className={clsx(
      'px-5 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between',
      className
    )}
  >
    <div className="font-semibold text-gray-900 dark:text-white">{children}</div>
    {actions && <div className="flex items-center gap-2">{actions}</div>}
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
}

export const CardFooter = ({ children, className }: CardFooterProps) => (
  <div
    className={clsx(
      'px-5 py-4 bg-gray-50 dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 rounded-b-xl',
      className
    )}
  >
    {children}
  </div>
);

export default Card;
