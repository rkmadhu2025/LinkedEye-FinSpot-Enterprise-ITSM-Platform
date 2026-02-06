import { forwardRef, InputHTMLAttributes, useId } from 'react';
import clsx from 'clsx';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  required?: boolean;
  variant?: 'default' | 'filled' | 'ghost';
  inputSize?: 'sm' | 'md' | 'lg';
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({
    className,
    label,
    error,
    hint,
    leftIcon,
    rightIcon,
    required,
    variant = 'default',
    inputSize = 'md',
    id,
    ...props
  }, ref) => {
    const generatedId = useId();
    const inputId = id || (label ? `input-${generatedId}` : undefined);
    const errorId = error ? `error-${generatedId}` : undefined;
    const hintId = hint && !error ? `hint-${generatedId}` : undefined;

    const sizeStyles = {
      sm: 'px-3 py-2 text-sm rounded-md',
      md: 'px-3.5 py-2.5 text-sm rounded-lg',
      lg: 'px-4 py-3 text-base rounded-lg',
    };

    const iconSizes = {
      sm: '[&_svg]:w-4 [&_svg]:h-4',
      md: '[&_svg]:w-4 [&_svg]:h-4',
      lg: '[&_svg]:w-5 [&_svg]:h-5',
    };

    const variantStyles = {
      default: clsx(
        'bg-white dark:bg-gray-900',
        'border border-gray-300 dark:border-gray-700',
        'hover:border-gray-400 dark:hover:border-gray-600',
        'focus:border-primary-500 dark:focus:border-primary-400',
        'focus:ring-2 focus:ring-primary-500/20 dark:focus:ring-primary-400/20'
      ),
      filled: clsx(
        'bg-gray-100 dark:bg-gray-800',
        'border border-transparent',
        'hover:bg-gray-200/70 dark:hover:bg-gray-700/70',
        'focus:bg-white dark:focus:bg-gray-900',
        'focus:border-primary-500 dark:focus:border-primary-400',
        'focus:ring-2 focus:ring-primary-500/20 dark:focus:ring-primary-400/20'
      ),
      ghost: clsx(
        'bg-transparent',
        'border border-transparent',
        'hover:bg-gray-100 dark:hover:bg-gray-800',
        'focus:border-primary-500 dark:focus:border-primary-400',
        'focus:ring-2 focus:ring-primary-500/20 dark:focus:ring-primary-400/20'
      ),
    };

    const errorStyles = clsx(
      'border-danger-500 dark:border-danger-400',
      'focus:border-danger-500 dark:focus:border-danger-400',
      'focus:ring-danger-500/20 dark:focus:ring-danger-400/20'
    );

    return (
      <div className="w-full">
        {label && (
          <label
            htmlFor={inputId}
            className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5"
          >
            {label}
            {required && (
              <span className="text-danger-500 ml-1" aria-hidden="true">
                *
              </span>
            )}
          </label>
        )}
        <div className="relative">
          {leftIcon && (
            <div
              className={clsx(
                'absolute left-3 top-1/2 -translate-y-1/2',
                'pointer-events-none',
                'text-gray-400 dark:text-gray-500',
                iconSizes[inputSize]
              )}
              aria-hidden="true"
            >
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
              'w-full',
              'text-gray-900 dark:text-white',
              'placeholder:text-gray-400 dark:placeholder:text-gray-500',
              'transition-all duration-200',
              'focus:outline-none',
              'disabled:bg-gray-100 dark:disabled:bg-gray-800',
              'disabled:text-gray-500 dark:disabled:text-gray-400',
              'disabled:cursor-not-allowed',
              sizeStyles[inputSize],
              variantStyles[variant],
              error && errorStyles,
              leftIcon && 'pl-10',
              rightIcon && 'pr-10',
              className
            )}
            {...props}
          />
          {rightIcon && (
            <div
              className={clsx(
                'absolute right-3 top-1/2 -translate-y-1/2',
                'pointer-events-none',
                'text-gray-400 dark:text-gray-500',
                iconSizes[inputSize]
              )}
              aria-hidden="true"
            >
              {rightIcon}
            </div>
          )}
        </div>
        {error && (
          <p
            id={errorId}
            className="mt-1.5 text-sm text-danger-600 dark:text-danger-400 flex items-center gap-1.5"
            role="alert"
          >
            <svg className="w-4 h-4 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            {error}
          </p>
        )}
        {hint && !error && (
          <p id={hintId} className="mt-1.5 text-sm text-gray-500 dark:text-gray-400">
            {hint}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';

export default Input;

// Textarea Component
export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  hint?: string;
  required?: boolean;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, label, error, hint, required, id, ...props }, ref) => {
    const generatedId = useId();
    const textareaId = id || (label ? `textarea-${generatedId}` : undefined);
    const errorId = error ? `error-${generatedId}` : undefined;
    const hintId = hint && !error ? `hint-${generatedId}` : undefined;

    return (
      <div className="w-full">
        {label && (
          <label
            htmlFor={textareaId}
            className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5"
          >
            {label}
            {required && (
              <span className="text-danger-500 ml-1" aria-hidden="true">
                *
              </span>
            )}
          </label>
        )}
        <textarea
          ref={ref}
          id={textareaId}
          aria-required={required}
          aria-invalid={error ? 'true' : undefined}
          aria-describedby={clsx(errorId, hintId) || undefined}
          className={clsx(
            'w-full px-3.5 py-2.5 rounded-lg text-sm',
            'bg-white dark:bg-gray-900',
            'border border-gray-300 dark:border-gray-700',
            'text-gray-900 dark:text-white',
            'placeholder:text-gray-400 dark:placeholder:text-gray-500',
            'transition-all duration-200',
            'hover:border-gray-400 dark:hover:border-gray-600',
            'focus:outline-none',
            'focus:border-primary-500 dark:focus:border-primary-400',
            'focus:ring-2 focus:ring-primary-500/20 dark:focus:ring-primary-400/20',
            'disabled:bg-gray-100 dark:disabled:bg-gray-800',
            'disabled:cursor-not-allowed',
            'resize-y min-h-[100px]',
            error && 'border-danger-500 focus:border-danger-500 focus:ring-danger-500/20',
            className
          )}
          {...props}
        />
        {error && (
          <p
            id={errorId}
            className="mt-1.5 text-sm text-danger-600 dark:text-danger-400 flex items-center gap-1.5"
            role="alert"
          >
            <svg className="w-4 h-4 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            {error}
          </p>
        )}
        {hint && !error && (
          <p id={hintId} className="mt-1.5 text-sm text-gray-500 dark:text-gray-400">
            {hint}
          </p>
        )}
      </div>
    );
  }
);

Textarea.displayName = 'Textarea';

// Search Input Component
export interface SearchInputProps extends Omit<InputProps, 'leftIcon'> {
  onClear?: () => void;
}

export const SearchInput = forwardRef<HTMLInputElement, SearchInputProps>(
  ({ className, value, onClear, ...props }, ref) => {
    return (
      <div className="relative">
        <Input
          ref={ref}
          type="search"
          value={value}
          leftIcon={
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          }
          rightIcon={
            value && onClear ? (
              <button
                type="button"
                onClick={onClear}
                className="pointer-events-auto text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            ) : undefined
          }
          className={className}
          {...props}
        />
      </div>
    );
  }
);

SearchInput.displayName = 'SearchInput';
