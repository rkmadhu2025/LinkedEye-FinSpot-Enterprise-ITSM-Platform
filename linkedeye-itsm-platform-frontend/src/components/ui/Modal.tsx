import { useEffect, useCallback, useId, forwardRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, AlertTriangle, CheckCircle, Info, AlertCircle } from 'lucide-react';
import clsx from 'clsx';
import Button from './Button';

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  children: React.ReactNode;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'full';
  showCloseButton?: boolean;
  closeOnOverlayClick?: boolean;
  closeOnEscape?: boolean;
  footer?: React.ReactNode;
  icon?: React.ReactNode;
  variant?: 'default' | 'glass';
  /** Optional z-index for stacking multiple modals */
  zIndex?: number;
  className?: string;
}

const Modal = ({
  isOpen,
  onClose,
  title,
  description,
  children,
  size = 'md',
  showCloseButton = true,
  closeOnOverlayClick = true,
  closeOnEscape = true,
  footer,
  icon,
  variant = 'default',
  zIndex = 50,
  className,
}: ModalProps) => {
  const titleId = useId();
  const descriptionId = useId();

  const handleEscape = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape' && closeOnEscape) {
        onClose();
      }
    },
    [closeOnEscape, onClose]
  );

  useEffect(() => {
    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, handleEscape]);

  const sizeStyles = {
    xs: 'max-w-xs',
    sm: 'max-w-md',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
    '2xl': 'max-w-6xl',
    full: 'max-w-[95vw] h-[95vh]',
  };

  const variantStyles = {
    default: clsx(
      'bg-white dark:bg-gray-900',
      'border border-gray-200 dark:border-gray-800'
    ),
    glass: clsx(
      'bg-white/80 dark:bg-gray-900/80',
      'backdrop-blur-xl',
      'border border-white/20 dark:border-gray-700/50'
    ),
  };

  if (!isOpen) return null;

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <div
          className="fixed inset-0 flex items-center justify-center p-4 sm:p-6"
          style={{ zIndex }}
          role="dialog"
          aria-modal="true"
          aria-labelledby={title ? titleId : undefined}
          aria-describedby={description ? descriptionId : undefined}
        >
          {/* Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className={clsx(
              'absolute inset-0',
              'bg-gray-900/60 dark:bg-black/70',
              'backdrop-blur-sm',
              closeOnOverlayClick && 'cursor-pointer'
            )}
            onClick={closeOnOverlayClick ? onClose : undefined}
            aria-hidden="true"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{
              duration: 0.2,
              ease: [0.4, 0, 0.2, 1],
            }}
            className={clsx(
              'relative w-full rounded-2xl overflow-hidden flex flex-col',
              'shadow-2xl shadow-gray-900/20 dark:shadow-black/40',
              variantStyles[variant],
              sizeStyles[size],
              size === 'full' ? '' : 'max-h-[90vh]',
              className
            )}
          >
            {/* Header */}
            {(title || showCloseButton) && (
              <div
                className={clsx(
                  'flex items-start justify-between gap-4 px-6 py-5 flex-shrink-0',
                  'border-b border-gray-200 dark:border-gray-800'
                )}
              >
                <div className="flex items-start gap-4 min-w-0">
                  {icon && (
                    <div
                      className={clsx(
                        'flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center',
                        'bg-primary-50 dark:bg-primary-500/10',
                        'text-primary-600 dark:text-primary-400'
                      )}
                    >
                      {icon}
                    </div>
                  )}
                  <div className="min-w-0">
                    {title && (
                      <h2
                        id={titleId}
                        className="text-lg font-semibold text-gray-900 dark:text-white truncate"
                      >
                        {title}
                      </h2>
                    )}
                    {description && (
                      <p
                        id={descriptionId}
                        className="mt-1 text-sm text-gray-500 dark:text-gray-400"
                      >
                        {description}
                      </p>
                    )}
                  </div>
                </div>
                {showCloseButton && (
                  <button
                    onClick={onClose}
                    className={clsx(
                      'flex-shrink-0 p-2 -m-2 rounded-xl',
                      'text-gray-400 dark:text-gray-500',
                      'hover:text-gray-600 dark:hover:text-gray-300',
                      'hover:bg-gray-100 dark:hover:bg-gray-800',
                      'transition-all duration-200',
                      'focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/50'
                    )}
                    aria-label="Close modal"
                  >
                    <X size={20} />
                  </button>
                )}
              </div>
            )}

            {/* Body */}
            <div
              className={clsx(
                'flex-1 overflow-y-auto px-6 py-5',
                'scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-700 scrollbar-track-transparent',
                footer ? 'max-h-[calc(90vh-150px)]' : 'max-h-[calc(90vh-80px)]'
              )}
            >
              {children}
            </div>

            {/* Footer */}
            {footer && (
              <div
                className={clsx(
                  'px-6 py-4 flex-shrink-0',
                  'bg-gray-50/80 dark:bg-gray-800/50',
                  'border-t border-gray-200 dark:border-gray-800',
                  'flex items-center justify-end gap-3'
                )}
              >
                {footer}
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
};

export default Modal;

// Modal Header Component for custom headers
export interface ModalHeaderProps {
  children: React.ReactNode;
  className?: string;
}

export const ModalHeader = forwardRef<HTMLDivElement, ModalHeaderProps>(
  ({ children, className }, ref) => (
    <div
      ref={ref}
      className={clsx(
        'flex items-center justify-between gap-4 px-6 py-5',
        'border-b border-gray-200 dark:border-gray-800',
        className
      )}
    >
      {children}
    </div>
  )
);

ModalHeader.displayName = 'ModalHeader';

// Modal Body Component
export interface ModalBodyProps {
  children: React.ReactNode;
  className?: string;
}

export const ModalBody = forwardRef<HTMLDivElement, ModalBodyProps>(
  ({ children, className }, ref) => (
    <div
      ref={ref}
      className={clsx('flex-1 overflow-y-auto px-6 py-5', className)}
    >
      {children}
    </div>
  )
);

ModalBody.displayName = 'ModalBody';

// Modal Footer Component
export interface ModalFooterProps {
  children: React.ReactNode;
  className?: string;
}

export const ModalFooter = forwardRef<HTMLDivElement, ModalFooterProps>(
  ({ children, className }, ref) => (
    <div
      ref={ref}
      className={clsx(
        'px-6 py-4',
        'bg-gray-50/80 dark:bg-gray-800/50',
        'border-t border-gray-200 dark:border-gray-800',
        'flex items-center justify-end gap-3',
        className
      )}
    >
      {children}
    </div>
  )
);

ModalFooter.displayName = 'ModalFooter';

// Confirm Modal Helper
export interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'warning' | 'primary' | 'success';
  isLoading?: boolean;
}

export const ConfirmModal = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'primary',
  isLoading = false,
}: ConfirmModalProps) => {
  const buttonVariant = {
    danger: 'danger' as const,
    warning: 'warning' as const,
    primary: 'primary' as const,
    success: 'success' as const,
  };

  const iconConfig = {
    danger: {
      icon: <AlertTriangle size={24} />,
      bg: 'bg-danger-50 dark:bg-danger-500/10',
      color: 'text-danger-600 dark:text-danger-400',
    },
    warning: {
      icon: <AlertCircle size={24} />,
      bg: 'bg-warning-50 dark:bg-warning-500/10',
      color: 'text-warning-600 dark:text-warning-400',
    },
    primary: {
      icon: <Info size={24} />,
      bg: 'bg-primary-50 dark:bg-primary-500/10',
      color: 'text-primary-600 dark:text-primary-400',
    },
    success: {
      icon: <CheckCircle size={24} />,
      bg: 'bg-success-50 dark:bg-success-500/10',
      color: 'text-success-600 dark:text-success-400',
    },
  };

  const config = iconConfig[variant];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="sm"
      showCloseButton={false}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={isLoading}>
            {cancelLabel}
          </Button>
          <Button variant={buttonVariant[variant]} onClick={onConfirm} isLoading={isLoading}>
            {confirmLabel}
          </Button>
        </>
      }
    >
      <div className="flex flex-col items-center text-center py-2">
        <div
          className={clsx(
            'w-14 h-14 rounded-2xl flex items-center justify-center mb-4',
            config.bg,
            config.color
          )}
        >
          {config.icon}
        </div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
          {title}
        </h3>
        <p className="text-sm text-gray-600 dark:text-gray-400 max-w-sm">
          {message}
        </p>
      </div>
    </Modal>
  );
};

// Alert Modal for simple notifications
export interface AlertModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  message: string;
  variant?: 'info' | 'success' | 'warning' | 'error';
  closeLabel?: string;
}

export const AlertModal = ({
  isOpen,
  onClose,
  title,
  message,
  variant = 'info',
  closeLabel = 'OK',
}: AlertModalProps) => {
  const iconConfig = {
    info: {
      icon: <Info size={24} />,
      bg: 'bg-primary-50 dark:bg-primary-500/10',
      color: 'text-primary-600 dark:text-primary-400',
    },
    success: {
      icon: <CheckCircle size={24} />,
      bg: 'bg-success-50 dark:bg-success-500/10',
      color: 'text-success-600 dark:text-success-400',
    },
    warning: {
      icon: <AlertCircle size={24} />,
      bg: 'bg-warning-50 dark:bg-warning-500/10',
      color: 'text-warning-600 dark:text-warning-400',
    },
    error: {
      icon: <AlertTriangle size={24} />,
      bg: 'bg-danger-50 dark:bg-danger-500/10',
      color: 'text-danger-600 dark:text-danger-400',
    },
  };

  const config = iconConfig[variant];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="sm"
      showCloseButton={false}
      footer={
        <Button variant="primary" onClick={onClose} className="w-full sm:w-auto">
          {closeLabel}
        </Button>
      }
    >
      <div className="flex flex-col items-center text-center py-2">
        <div
          className={clsx(
            'w-14 h-14 rounded-2xl flex items-center justify-center mb-4',
            config.bg,
            config.color
          )}
        >
          {config.icon}
        </div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
          {title}
        </h3>
        <p className="text-sm text-gray-600 dark:text-gray-400 max-w-sm">
          {message}
        </p>
      </div>
    </Modal>
  );
};
