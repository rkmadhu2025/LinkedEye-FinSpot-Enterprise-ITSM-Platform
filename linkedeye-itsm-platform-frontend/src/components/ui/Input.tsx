import { forwardRef, InputHTMLAttributes, useId } from 'react';
import clsx from 'clsx';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  required?: boolean;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, hint, leftIcon, rightIcon, required, id, ...props }, ref) => {
    const generatedId = useId();
    const inputId = id || (label ? `input-${generatedId}` : undefined);
    const errorId = error ? `error-${generatedId}` : undefined;
    const hintId = hint && !error ? `hint-${generatedId}` : undefined;

    return (
      <div className="w-full">
        {label && (
          <label htmlFor={inputId} className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            {label}
            {required && <span className="text-danger-500 ml-1" aria-hidden="true">*</span>}
          </label>
        )}
        <div className="relative flex items-center">
          {/* Left icon - using flex alignment for better vertical centering */}
          {leftIcon && (
            <div className="absolute left-3 flex items-center justify-center h-full pointer-events-none text-gray-400 dark:text-gray-500" aria-hidden="true">
              {leftIcon}
            </div>
          )}
          <input
            ref={ref}
            id={inputId}
            aria-required={required}
            aria-invalid={error ? 'true' : undefined}
            aria-describedby={clsx(errorId, hintId) || undefined}
            className={clsx(
              'w-full px-3 py-2 border rounded-lg transition-all duration-200',
              'focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500',
              'disabled:bg-gray-100 disabled:cursor-not-allowed dark:disabled:bg-gray-800',
              'placeholder:text-gray-400 dark:placeholder:text-gray-500',
              'bg-white dark:bg-gray-800 text-gray-900 dark:text-white',
              error
                ? 'border-danger-500 focus:ring-danger-500/20 focus:border-danger-500'
                : 'border-gray-300 dark:border-gray-600',
              leftIcon && 'pl-10',
              rightIcon && 'pr-10',
              className
            )}
            {...props}
          />
          {/* Right icon - using flex alignment for better vertical centering */}
          {rightIcon && (
            <div className="absolute right-3 flex items-center justify-center h-full pointer-events-none text-gray-400 dark:text-gray-500" aria-hidden="true">
              {rightIcon}
            </div>
          )}
        </div>
        {error && (
          <p id={errorId} className="mt-1 text-sm text-danger-600 dark:text-danger-400" role="alert">
            {error}
          </p>
        )}
        {hint && !error && (
          <p id={hintId} className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            {hint}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';

export default Input;
