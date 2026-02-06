import { forwardRef, ButtonHTMLAttributes } from 'react';
import clsx from 'clsx';
import { Loader2 } from 'lucide-react';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'success' | 'warning' | 'danger' | 'outline' | 'ghost' | 'link' | 'gradient';
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  fullWidth?: boolean;
  loadingText?: string;
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = 'primary',
      size = 'md',
      isLoading = false,
      leftIcon,
      rightIcon,
      fullWidth = false,
      disabled,
      children,
      loadingText,
      ...props
    },
    ref
  ) => {
    const baseStyles = clsx(
      // Layout & positioning
      'inline-flex items-center justify-center gap-2 relative',
      // Typography
      'font-medium',
      // Shape
      'rounded-lg',
      // Transitions
      'transition-all duration-200 ease-out',
      // Focus states - accessibility
      'focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
      'dark:focus-visible:ring-offset-gray-900',
      // Disabled states
      'disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none'
    );

    const variants = {
      primary: clsx(
        'bg-primary-600 text-white',
        'hover:bg-primary-700 hover:shadow-md hover:-translate-y-0.5',
        'active:translate-y-0 active:shadow-sm',
        'focus-visible:ring-primary-500',
        'dark:bg-primary-500 dark:hover:bg-primary-600'
      ),
      secondary: clsx(
        'bg-gray-100 text-gray-700 border border-gray-200',
        'hover:bg-gray-200 hover:border-gray-300',
        'focus-visible:ring-gray-400',
        'dark:bg-gray-800 dark:text-gray-200 dark:border-gray-700',
        'dark:hover:bg-gray-700 dark:hover:border-gray-600'
      ),
      success: clsx(
        'bg-success-600 text-white',
        'hover:bg-success-700 hover:shadow-md hover:-translate-y-0.5',
        'active:translate-y-0',
        'focus-visible:ring-success-500'
      ),
      warning: clsx(
        'bg-warning-500 text-white',
        'hover:bg-warning-600 hover:shadow-md hover:-translate-y-0.5',
        'active:translate-y-0',
        'focus-visible:ring-warning-400'
      ),
      danger: clsx(
        'bg-danger-600 text-white',
        'hover:bg-danger-700 hover:shadow-md hover:-translate-y-0.5',
        'active:translate-y-0',
        'focus-visible:ring-danger-500'
      ),
      outline: clsx(
        'bg-transparent border',
        'border-gray-300 text-gray-700',
        'hover:bg-gray-50 hover:border-gray-400',
        'focus-visible:ring-gray-400',
        'dark:border-gray-600 dark:text-gray-300',
        'dark:hover:bg-gray-800/50 dark:hover:border-gray-500'
      ),
      ghost: clsx(
        'bg-transparent',
        'text-gray-600 hover:text-gray-900',
        'hover:bg-gray-100',
        'focus-visible:ring-gray-400',
        'dark:text-gray-400 dark:hover:text-gray-100',
        'dark:hover:bg-gray-800'
      ),
      link: clsx(
        'bg-transparent p-0',
        'text-primary-600 hover:text-primary-700',
        'hover:underline underline-offset-4',
        'focus-visible:ring-primary-500',
        'dark:text-primary-400 dark:hover:text-primary-300'
      ),
      gradient: clsx(
        'text-white',
        'bg-gradient-to-r from-primary-600 to-primary-500',
        'hover:from-primary-700 hover:to-primary-600',
        'hover:shadow-lg hover:shadow-primary-500/25 hover:-translate-y-0.5',
        'active:translate-y-0 active:shadow-md',
        'focus-visible:ring-primary-500'
      ),
    };

    const sizes = {
      xs: 'px-2.5 py-1.5 text-xs rounded-md',
      sm: 'px-3 py-2 text-sm',
      md: 'px-4 py-2.5 text-sm',
      lg: 'px-5 py-3 text-base',
      xl: 'px-6 py-3.5 text-base font-semibold',
    };

    const loaderSizes = {
      xs: 'w-3 h-3',
      sm: 'w-3.5 h-3.5',
      md: 'w-4 h-4',
      lg: 'w-5 h-5',
      xl: 'w-5 h-5',
    };

    const iconSizes = {
      xs: '[&_svg]:w-3 [&_svg]:h-3',
      sm: '[&_svg]:w-3.5 [&_svg]:h-3.5',
      md: '[&_svg]:w-4 [&_svg]:h-4',
      lg: '[&_svg]:w-5 [&_svg]:h-5',
      xl: '[&_svg]:w-5 [&_svg]:h-5',
    };

    return (
      <button
        ref={ref}
        className={clsx(
          baseStyles,
          variants[variant],
          variant !== 'link' && sizes[size],
          iconSizes[size],
          fullWidth && 'w-full',
          className
        )}
        disabled={disabled || isLoading}
        aria-busy={isLoading}
        aria-disabled={disabled || isLoading}
        {...props}
      >
        {/* Left icon or loader */}
        {(leftIcon || isLoading) && (
          <span className="flex-shrink-0 inline-flex items-center justify-center">
            {isLoading ? (
              <Loader2
                className={clsx(loaderSizes[size], 'animate-spin')}
                aria-hidden="true"
              />
            ) : (
              leftIcon
            )}
          </span>
        )}

        {/* Content */}
        <span className={clsx(
          isLoading && !loadingText && 'sr-only',
          'truncate'
        )}>
          {isLoading && loadingText ? loadingText : children}
        </span>

        {/* Accessible loading indicator */}
        {isLoading && <span className="sr-only">Loading</span>}

        {/* Right icon */}
        {rightIcon && !isLoading && (
          <span className="flex-shrink-0">{rightIcon}</span>
        )}
      </button>
    );
  }
);

Button.displayName = 'Button';

export default Button;

// Icon Button variant for toolbar actions
export interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'ghost' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  'aria-label': string;
}

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(
  (
    {
      className,
      variant = 'default',
      size = 'md',
      isLoading = false,
      disabled,
      children,
      ...props
    },
    ref
  ) => {
    const baseStyles = clsx(
      'inline-flex items-center justify-center',
      'rounded-lg',
      'transition-all duration-200',
      'focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
      'dark:focus-visible:ring-offset-gray-900',
      'disabled:opacity-50 disabled:cursor-not-allowed'
    );

    const variants = {
      default: clsx(
        'bg-gray-100 text-gray-600',
        'hover:bg-gray-200 hover:text-gray-900',
        'focus-visible:ring-gray-400',
        'dark:bg-gray-800 dark:text-gray-400',
        'dark:hover:bg-gray-700 dark:hover:text-gray-100'
      ),
      ghost: clsx(
        'bg-transparent text-gray-500',
        'hover:bg-gray-100 hover:text-gray-700',
        'focus-visible:ring-gray-400',
        'dark:text-gray-400',
        'dark:hover:bg-gray-800 dark:hover:text-gray-200'
      ),
      outline: clsx(
        'bg-transparent border border-gray-300 text-gray-600',
        'hover:bg-gray-50 hover:border-gray-400',
        'focus-visible:ring-gray-400',
        'dark:border-gray-600 dark:text-gray-400',
        'dark:hover:bg-gray-800/50 dark:hover:border-gray-500'
      ),
    };

    const sizes = {
      sm: 'w-8 h-8 [&_svg]:w-4 [&_svg]:h-4',
      md: 'w-10 h-10 [&_svg]:w-5 [&_svg]:h-5',
      lg: 'w-12 h-12 [&_svg]:w-6 [&_svg]:h-6',
    };

    return (
      <button
        ref={ref}
        className={clsx(
          baseStyles,
          variants[variant],
          sizes[size],
          className
        )}
        disabled={disabled || isLoading}
        {...props}
      >
        {isLoading ? (
          <Loader2 className="animate-spin" aria-hidden="true" />
        ) : (
          children
        )}
      </button>
    );
  }
);

IconButton.displayName = 'IconButton';
