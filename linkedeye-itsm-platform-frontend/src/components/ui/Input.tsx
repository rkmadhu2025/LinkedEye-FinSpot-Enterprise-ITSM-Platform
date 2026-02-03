import { forwardRef, InputHTMLAttributes, useId, useState } from 'react';
import clsx from 'clsx';
import { Eye, EyeOff } from 'lucide-react';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  required?: boolean;
  variant?: 'default' | 'filled' | 'flushed';
  inputSize?: 'sm' | 'md' | 'lg';
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      className,
      label,
      error,
      hint,
      leftIcon,
      rightIcon,
      required,
      variant = 'default',
      inputSize = 'md',
      type,
      id,
      ...props
    },
    ref
  ) => {
    const generatedId = useId();
    const inputId = id || (label ? `input-${generatedId}` : undefined);
    const errorId = error ? `error-${generatedId}` : undefined;
    const hintId = hint && !error ? `hint-${generatedId}` : undefined;

    const [showPassword, setShowPassword] = useState(false);
    const isPasswordType = type === 'password';
    const actualType = isPasswordType && showPassword ? 'text' : type;

    const sizeStyles = {
      sm: 'px-3 py-2 text-sm rounded-lg',
      md: 'px-3.5 py-2.5 text-sm rounded-xl',
      lg: 'px-4 py-3 text-base rounded-xl',
    };

    const variantStyles = {
      default: clsx(
        'border bg-white dark:bg-dark-100',
        error
          ? 'border-danger-500 focus:border-danger-500 focus:ring-danger-500/20'
          : 'border-gray-300 dark:border-dark-300 focus:border-primary-500 focus:ring-primary-500/20',
        'dark:focus:border-primary-400 dark:focus:ring-primary-400/20'
      ),
      filled: clsx(
        'border-0 bg-gray-100 dark:bg-dark-200',
        error
          ? 'ring-2 ring-danger-500 focus:ring-danger-500'
          : 'focus:ring-2 focus:ring-primary-500/50',
        'focus:bg-white dark:focus:bg-dark-100'
      ),
      flushed: clsx(
        'border-0 border-b-2 rounded-none bg-transparent px-0',
        error
          ? 'border-danger-500 focus:border-danger-500'
          : 'border-gray-300 dark:border-dark-300 focus:border-primary-500'
      ),
    };

    return (
      <div className="w-full">
        {label && (
          <label
            htmlFor={inputId}
            className="block text-sm font-medium text-gray-700 dark:text-dark-600 mb-1.5"
          >
            {label}
            {required && (
              <span className="text-danger-500 ml-1" aria-hidden="true">
                *
              </span>
            )}
          </label>
        )}
        <div className="relative flex items-center">
          {/* Left icon */}
          {leftIcon && (
            <div
              className={clsx(
                'absolute left-3 flex items-center justify-center pointer-events-none',
                error
                  ? 'text-danger-400'
                  : 'text-gray-400 dark:text-dark-400'
              )}
              aria-hidden="true"
            >
              {leftIcon}
            </div>
          )}

          <input
            ref={ref}
            id={inputId}
            type={actualType}
            aria-required={required}
            aria-invalid={error ? 'true' : undefined}
            aria-describedby={clsx(errorId, hintId) || undefined}
            className={clsx(
              'w-full transition-all duration-200',
              'focus:outline-none focus:ring-2',
              'disabled:bg-gray-100 disabled:cursor-not-allowed disabled:text-gray-400',
              'dark:disabled:bg-dark-200 dark:disabled:text-dark-400',
              'placeholder:text-gray-400 dark:placeholder:text-dark-400',
              'text-gray-900 dark:text-dark-800',
              sizeStyles[inputSize],
              variantStyles[variant],
              leftIcon && 'pl-10',
              (rightIcon || isPasswordType) && 'pr-10',
              className
            )}
            {...props}
          />

          {/* Right icon or password toggle */}
          {(rightIcon || isPasswordType) && (
            <div className="absolute right-3 flex items-center justify-center">
              {isPasswordType ? (
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className={clsx(
                    'p-0.5 rounded transition-colors',
                    'text-gray-400 hover:text-gray-600',
                    'dark:text-dark-400 dark:hover:text-dark-600',
                    'focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500'
                  )}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              ) : (
                <div
                  className={clsx(
                    'pointer-events-none',
                    error
                      ? 'text-danger-400'
                      : 'text-gray-400 dark:text-dark-400'
                  )}
                  aria-hidden="true"
                >
                  {rightIcon}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Error message */}
        {error && (
          <p
            id={errorId}
            className="mt-1.5 text-sm text-danger-600 dark:text-danger-400 flex items-center gap-1"
            role="alert"
          >
            <svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                clipRule="evenodd"
              />
            </svg>
            {error}
          </p>
        )}

        {/* Hint text */}
        {hint && !error && (
          <p
            id={hintId}
            className="mt-1.5 text-sm text-gray-500 dark:text-dark-500"
          >
            {hint}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';

export default Input;
