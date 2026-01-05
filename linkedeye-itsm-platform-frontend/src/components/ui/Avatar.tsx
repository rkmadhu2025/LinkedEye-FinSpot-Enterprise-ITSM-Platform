import clsx from 'clsx';

export interface AvatarProps {
  src?: string;
  alt?: string;
  name?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

const Avatar = ({ src, alt, name, size = 'md', className }: AvatarProps) => {
  const sizes = {
    xs: 'w-6 h-6 text-[10px]',
    sm: 'w-8 h-8 text-xs',
    md: 'w-10 h-10 text-sm',
    lg: 'w-12 h-12 text-base',
    xl: 'w-16 h-16 text-lg',
  };

  const getInitials = (name?: string) => {
    if (!name) return '?';
    const parts = name.split(' ').filter(Boolean);
    if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
    return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
  };

  const getColorClass = (name?: string) => {
    if (!name) return 'bg-gray-400';
    const colors = [
      'bg-primary-500',
      'bg-success-500',
      'bg-warning-500',
      'bg-danger-500',
      'bg-purple-500',
      'bg-pink-500',
      'bg-indigo-500',
      'bg-cyan-500',
    ];
    const hash = name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return colors[hash % colors.length];
  };

  if (src) {
    return (
      <img
        src={src}
        alt={alt || name || 'Avatar'}
        className={clsx('rounded-full object-cover', sizes[size], className)}
      />
    );
  }

  return (
    <div
      className={clsx(
        'rounded-full flex items-center justify-center text-white font-medium',
        sizes[size],
        getColorClass(name),
        className
      )}
    >
      {getInitials(name)}
    </div>
  );
};

export default Avatar;

export interface AvatarGroupProps {
  children: React.ReactNode;
  max?: number;
  size?: AvatarProps['size'];
  className?: string;
}

export const AvatarGroup = ({ children, max = 4, size = 'md', className }: AvatarGroupProps) => {
  const childrenArray = Array.isArray(children) ? children : [children];
  const visibleChildren = max ? childrenArray.slice(0, max) : childrenArray;
  const remainingCount = max ? childrenArray.length - max : 0;

  const overlapSizes = {
    xs: '-ml-2',
    sm: '-ml-2.5',
    md: '-ml-3',
    lg: '-ml-4',
    xl: '-ml-5',
  };

  const badgeSizes = {
    xs: 'w-6 h-6 text-[8px]',
    sm: 'w-8 h-8 text-[10px]',
    md: 'w-10 h-10 text-xs',
    lg: 'w-12 h-12 text-sm',
    xl: 'w-16 h-16 text-base',
  };

  return (
    <div className={clsx('flex items-center', className)}>
      {visibleChildren.map((child, index) => (
        <div
          key={index}
          className={clsx(
            index > 0 && overlapSizes[size],
            'ring-2 ring-white rounded-full'
          )}
        >
          {child}
        </div>
      ))}
      {remainingCount > 0 && (
        <div
          className={clsx(
            'flex items-center justify-center bg-gray-200 text-gray-600 font-medium rounded-full ring-2 ring-white',
            overlapSizes[size],
            badgeSizes[size]
          )}
        >
          +{remainingCount}
        </div>
      )}
    </div>
  );
};
