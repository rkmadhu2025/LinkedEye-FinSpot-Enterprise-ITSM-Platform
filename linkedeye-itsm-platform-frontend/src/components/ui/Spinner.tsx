import clsx from 'clsx';

export interface SpinnerProps {
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  color?: 'primary' | 'white' | 'gray';
  className?: string;
}

const Spinner = ({ size = 'md', color = 'primary', className }: SpinnerProps) => {
  const sizes = {
    xs: 'w-3 h-3 border',
    sm: 'w-4 h-4 border-2',
    md: 'w-6 h-6 border-2',
    lg: 'w-8 h-8 border-2',
    xl: 'w-12 h-12 border-3',
  };

  const colors = {
    primary: 'border-primary-600 border-t-transparent',
    white: 'border-white border-t-transparent',
    gray: 'border-gray-400 border-t-transparent',
  };

  return (
    <div
      className={clsx(
        'rounded-full animate-spin',
        sizes[size],
        colors[color],
        className
      )}
    />
  );
};

export default Spinner;

// Full page loading spinner
export const PageLoader = ({ message = 'Loading...' }: { message?: string }) => (
  <div className="min-h-[400px] flex flex-col items-center justify-center">
    <Spinner size="lg" />
    <p className="mt-4 text-gray-500">{message}</p>
  </div>
);

// Overlay loader
export const OverlayLoader = ({ message = 'Loading...' }: { message?: string }) => (
  <div className="absolute inset-0 bg-white/80 backdrop-blur-sm flex flex-col items-center justify-center z-50">
    <Spinner size="lg" />
    <p className="mt-4 text-gray-600 font-medium">{message}</p>
  </div>
);
