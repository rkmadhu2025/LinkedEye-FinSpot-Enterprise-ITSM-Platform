import clsx from 'clsx';

export interface SkeletonProps {
  className?: string;
  variant?: 'text' | 'circular' | 'rectangular' | 'rounded';
  width?: string | number;
  height?: string | number;
  animation?: 'pulse' | 'shimmer' | 'none';
}

const Skeleton = ({
  className,
  variant = 'text',
  width,
  height,
  animation = 'shimmer',
}: SkeletonProps) => {
  const variantStyles = {
    text: 'rounded',
    circular: 'rounded-full',
    rectangular: 'rounded-none',
    rounded: 'rounded-xl',
  };

  const animationStyles = {
    pulse: 'animate-pulse',
    shimmer: 'relative overflow-hidden before:absolute before:inset-0 before:-translate-x-full before:animate-[shimmer_1.5s_infinite] before:bg-gradient-to-r before:from-transparent before:via-white/20 before:to-transparent',
    none: '',
  };

  const style: React.CSSProperties = {};
  if (width) style.width = typeof width === 'number' ? `${width}px` : width;
  if (height) style.height = typeof height === 'number' ? `${height}px` : height;

  return (
    <div
      className={clsx(
        'bg-gray-200 dark:bg-dark-300',
        variantStyles[variant],
        animationStyles[animation],
        className
      )}
      style={style}
      aria-hidden="true"
    />
  );
};

export default Skeleton;

// Pre-built skeleton patterns for common use cases

export interface SkeletonTextProps {
  lines?: number;
  className?: string;
}

export const SkeletonText = ({ lines = 3, className }: SkeletonTextProps) => (
  <div className={clsx('space-y-2', className)}>
    {Array.from({ length: lines }).map((_, i) => (
      <Skeleton
        key={i}
        variant="text"
        height={16}
        className={clsx(
          i === lines - 1 && 'w-3/4' // Last line is shorter
        )}
      />
    ))}
  </div>
);

export interface SkeletonCardProps {
  className?: string;
  showImage?: boolean;
  showActions?: boolean;
}

export const SkeletonCard = ({ className, showImage = false, showActions = true }: SkeletonCardProps) => (
  <div
    className={clsx(
      'p-5 rounded-xl bg-white dark:bg-dark-100',
      'border border-gray-200 dark:border-dark-300',
      className
    )}
  >
    {showImage && (
      <Skeleton variant="rounded" height={160} className="mb-4" />
    )}
    <div className="flex items-start gap-3">
      <Skeleton variant="circular" width={40} height={40} />
      <div className="flex-1 space-y-2">
        <Skeleton variant="text" height={20} className="w-3/4" />
        <Skeleton variant="text" height={14} className="w-1/2" />
      </div>
    </div>
    <div className="mt-4 space-y-2">
      <Skeleton variant="text" height={14} />
      <Skeleton variant="text" height={14} />
      <Skeleton variant="text" height={14} className="w-2/3" />
    </div>
    {showActions && (
      <div className="mt-4 flex gap-2">
        <Skeleton variant="rounded" width={80} height={36} />
        <Skeleton variant="rounded" width={80} height={36} />
      </div>
    )}
  </div>
);

export interface SkeletonTableProps {
  rows?: number;
  columns?: number;
  className?: string;
}

export const SkeletonTable = ({ rows = 5, columns = 4, className }: SkeletonTableProps) => (
  <div className={clsx('space-y-3', className)}>
    {/* Header */}
    <div className="flex gap-4 px-4 py-3 bg-gray-50 dark:bg-dark-200 rounded-lg">
      {Array.from({ length: columns }).map((_, i) => (
        <Skeleton key={i} variant="text" height={16} className="flex-1" />
      ))}
    </div>
    {/* Rows */}
    {Array.from({ length: rows }).map((_, rowIndex) => (
      <div
        key={rowIndex}
        className="flex gap-4 px-4 py-3 border-b border-gray-100 dark:border-dark-300"
      >
        {Array.from({ length: columns }).map((_, colIndex) => (
          <Skeleton key={colIndex} variant="text" height={16} className="flex-1" />
        ))}
      </div>
    ))}
  </div>
);

export interface SkeletonStatsCardProps {
  className?: string;
}

export const SkeletonStatsCard = ({ className }: SkeletonStatsCardProps) => (
  <div
    className={clsx(
      'p-5 rounded-xl bg-white dark:bg-dark-100',
      'border border-gray-200 dark:border-dark-300',
      className
    )}
  >
    <div className="flex items-start justify-between">
      <div className="space-y-2 flex-1">
        <Skeleton variant="text" height={14} className="w-24" />
        <Skeleton variant="text" height={32} className="w-20" />
        <Skeleton variant="text" height={14} className="w-16" />
      </div>
      <Skeleton variant="rounded" width={48} height={48} />
    </div>
  </div>
);

export interface SkeletonListProps {
  items?: number;
  className?: string;
  showAvatar?: boolean;
}

export const SkeletonList = ({ items = 5, className, showAvatar = true }: SkeletonListProps) => (
  <div className={clsx('space-y-4', className)}>
    {Array.from({ length: items }).map((_, i) => (
      <div key={i} className="flex items-center gap-3">
        {showAvatar && <Skeleton variant="circular" width={40} height={40} />}
        <div className="flex-1 space-y-2">
          <Skeleton variant="text" height={16} className="w-3/4" />
          <Skeleton variant="text" height={12} className="w-1/2" />
        </div>
        <Skeleton variant="rounded" width={60} height={24} />
      </div>
    ))}
  </div>
);

export interface SkeletonFormProps {
  fields?: number;
  className?: string;
}

export const SkeletonForm = ({ fields = 4, className }: SkeletonFormProps) => (
  <div className={clsx('space-y-5', className)}>
    {Array.from({ length: fields }).map((_, i) => (
      <div key={i} className="space-y-1.5">
        <Skeleton variant="text" height={14} className="w-20" />
        <Skeleton variant="rounded" height={44} />
      </div>
    ))}
    <div className="flex gap-3 pt-2">
      <Skeleton variant="rounded" width={100} height={40} />
      <Skeleton variant="rounded" width={80} height={40} />
    </div>
  </div>
);

// Page-level skeleton for full page loading
export interface SkeletonPageProps {
  className?: string;
}

export const SkeletonPage = ({ className }: SkeletonPageProps) => (
  <div className={clsx('space-y-6', className)}>
    {/* Page header */}
    <div className="flex items-center justify-between">
      <div className="space-y-2">
        <Skeleton variant="text" height={28} className="w-48" />
        <Skeleton variant="text" height={14} className="w-64" />
      </div>
      <div className="flex gap-2">
        <Skeleton variant="rounded" width={100} height={40} />
        <Skeleton variant="rounded" width={120} height={40} />
      </div>
    </div>

    {/* Stats row */}
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <SkeletonStatsCard key={i} />
      ))}
    </div>

    {/* Main content */}
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2">
        <SkeletonCard showActions />
      </div>
      <div>
        <SkeletonList items={4} />
      </div>
    </div>
  </div>
);
