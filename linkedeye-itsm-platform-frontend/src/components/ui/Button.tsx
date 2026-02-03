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
  /** Text to show during loading state (defaults to children) */
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
    // Base styles with modern design system
    const baseStyles = clsx(
      'inline-flex items-center justify-center gap-2 font-semibold',
      'rounded-xl transition-all duration-150 ease-out',
      'focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
      'disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none disabled:shadow-none',
      'relative overflow-hidden select-none',
      'active:scale-[0.98]'
    );

    // Variant styles with premium feel
    const variants = {
      primary: clsx(
        'bg-gradient-to-r from-primary-600 to-primary-700 text-white',
        'shadow-btn-primary',
        'hover:from-primary-700 hover:to-primary-800 hover:-translate-y-0.5 hover:shadow-btn-primary-hover',
        'focus-visible:ring-primary-500',
        'dark:from-primary-500 dark:to-primary-600 dark:hover:from-primary-600 dark:hover:to-primary-700'
      ),
      secondary: clsx(
        'bg-gray-100 text-gray-700',
        'shadow-sm',
        'hover:bg-gray-200 hover:-translate-y-0.5 hover:shadow-md',
        'focus-visible:ring-gray-500',
        'dark:bg-dark-200 dark:text-dark-700 dark:hover:bg-dark-300'
      ),
      success: clsx(
        'bg-gradient-to-r from-success-500 to-success-600 text-white',
        'shadow-btn-success',
        'hover:from-success-600 hover:to-success-700 hover:-translate-y-0.5 hover:shadow-glow-success',
        'focus-visible:ring-success-500'
      ),
      warning: clsx(
        'bg-gradient-to-r from-warning-500 to-warning-600 text-white',
        'shadow-md',
        'hover:from-warning-600 hover:to-warning-700 hover:-translate-y-0.5 hover:shadow-glow-warning',
        'focus-visible:ring-warning-400'
      ),
      danger: clsx(
        'bg-gradient-to-r from-danger-500 to-danger-600 text-white',
        'shadow-btn-danger',
        'hover:from-danger-600 hover:to-danger-700 hover:-translate-y-0.5 hover:shadow-glow-danger',
        'focus-visible:ring-danger-500'
      ),
      outline: clsx(
        'border-2 border-gray-300 text-gray-700 bg-transparent',
        'hover:bg-gray-50 hover:border-gray-400 hover:-translate-y-0.5',
        'focus-visible:ring-gray-500',
        'dark:border-dark-300 dark:text-dark-600 dark:hover:bg-dark-200 dark:hover:border-dark-400'
      ),
      ghost: clsx(
        'text-gray-600 bg-transparent',
        'hover:bg-gray-100 hover:text-gray-900',
        'focus-visible:ring-gray-500',
        'dark:text-dark-500 dark:hover:bg-dark-200 dark:hover:text-dark-700'
      ),
      link: clsx(
        'text-primary-600 bg-transparent p-0',
        'hover:text-primary-700 hover:underline',
        'focus-visible:ring-primary-500',
        'dark:text-primary-400 dark:hover:text-primary-300'
      ),
      gradient: clsx(
        'bg-gradient-to-r from-violet-600 via-primary-600 to-cyan-600 text-white',
        'shadow-lg shadow-violet-500/25',
        'hover:from-violet-700 hover:via-primary-700 hover:to-cyan-700 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-violet-500/30',
        'focus-visible:ring-violet-500'
      ),
    };

    // Size styles
    const sizes = {
      xs: 'px-2.5 py-1.5 text-xs rounded-lg gap-1',
      sm: 'px-3 py-2 text-sm rounded-lg gap-1.5',
      md: 'px-4 py-2.5 text-sm rounded-xl gap-2',
      lg: 'px-5 py-3 text-base rounded-xl gap-2',
      xl: 'px-6 py-3.5 text-base rounded-2xl gap-2.5',
    };

    // Loader sizes that match icon sizes to prevent layout shift
    const loaderSizes = {
      xs: 'w-3 h-3',
      sm: 'w-3.5 h-3.5',
      md: 'w-4 h-4',
      lg: 'w-5 h-5',
      xl: 'w-5 h-5',
    };

    return (
      <button
        ref={ref}
        className={clsx(
          baseStyles,
          variants[variant],
          variant !== 'link' && sizes[size],
          fullWidth && 'w-full',
          isLoading && 'cursor-wait',
          className
        )}
        disabled={disabled || isLoading}
        aria-busy={isLoading}
        aria-disabled={disabled || isLoading}
        {...props}
      >
        {/* Shine overlay for premium feel */}
        {variant !== 'ghost' && variant !== 'link' && variant !== 'outline' && (
          <span
            className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
            style={{
              background: 'linear-gradient(135deg, rgba(255,255,255,0.2) 0%, rgba(255,255,255,0) 50%)',
            }}
          />
        )}

        {/* Left icon area - maintains consistent width to prevent layout shift */}
        {(leftIcon || isLoading) && (
          <span className="flex-shrink-0 inline-flex items-center justify-center">
            {isLoading ? (
              <Loader2 className={clsx(loaderSizes[size], 'animate-spin')} aria-hidden="true" />
            ) : (
              leftIcon
            )}
          </span>
        )}

        {/* Content - show loading text or regular content */}
        <span className={clsx(isLoading && !loadingText && 'sr-only')}>
          {isLoading && loadingText ? loadingText : children}
        </span>

        {/* Accessible loading indicator */}
        {isLoading && <span className="sr-only">Loading</span>}

        {/* Right icon - hidden during loading to maintain symmetry */}
        {rightIcon && !isLoading && <span className="flex-shrink-0">{rightIcon}</span>}
      </button>
    );
  }
);

Button.displayName = 'Button';

export default Button;
