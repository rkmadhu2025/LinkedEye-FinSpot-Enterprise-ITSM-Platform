import { useEffect, useCallback, useId } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, AlertTriangle, AlertCircle, CheckCircle, Info } from 'lucide-react';
import clsx from 'clsx';
import Button from './Button';

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  showCloseButton?: boolean;
  closeOnOverlayClick?: boolean;
  closeOnEscape?: boolean;
  footer?: React.ReactNode;
  /** Optional z-index for stacking multiple modals */
  zIndex?: number;
  /** Optional icon to display in header */
  icon?: React.ReactNode;
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
  zIndex = 50,
  icon,
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
    sm: 'max-w-md',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
    full: 'max-w-[95vw] h-[95vh]',
  };

  if (!isOpen) return null;

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <div
          className="fixed inset-0 flex items-center justify-center p-4"
          style={{ zIndex }}
          role="dialog"
          aria-modal="true"
          aria-labelledby={title ? titleId : undefined}
          aria-describedby={description ? descriptionId : undefined}
        >
          {/* Overlay with blur effect */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className={clsx(
              'absolute inset-0 bg-black/50 backdrop-blur-sm',
              closeOnOverlayClick && 'cursor-pointer'
            )}
            onClick={closeOnOverlayClick ? onClose : undefined}
            aria-hidden="true"
          />

          {/* Modal with premium animation */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{
              duration: 0.25,
              ease: [0.16, 1, 0.3, 1], // ease-out-expo
            }}
            className={clsx(
              'relative w-full overflow-hidden flex flex-col',
              'bg-white dark:bg-dark-100',
              'rounded-2xl shadow-modal dark:shadow-modal-dark',
              'border border-gray-200 dark:border-dark-300',
              sizeStyles[size],
              size === 'full' ? '' : 'max-h-[90vh]'
            )}
          >
            {/* Header */}
            {(title || showCloseButton) && (
              <div className="flex items-start justify-between px-6 py-5 border-b border-gray-200 dark:border-dark-300 flex-shrink-0">
                <div className="flex items-start gap-3">
                  {icon && (
                    <div className="flex-shrink-0 mt-0.5">
                      {icon}
                    </div>
                  )}
                  <div>
                    {title && (
                      <h2
                        id={titleId}
                        className="text-lg font-semibold text-gray-900 dark:text-dark-800"
                      >
                        {title}
                      </h2>
                    )}
                    {description && (
                      <p
                        id={descriptionId}
                        className="mt-1 text-sm text-gray-500 dark:text-dark-500"
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
                      'p-2 -m-2 rounded-lg transition-all duration-150',
                      'text-gray-400 hover:text-gray-600',
                      'dark:text-dark-400 dark:hover:text-dark-600',
                      'hover:bg-gray-100 dark:hover:bg-dark-200',
                      'focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500'
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
                  'bg-gray-50 dark:bg-dark-200',
                  'border-t border-gray-200 dark:border-dark-300',
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

// Confirm Modal Helper with enhanced styling
export interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'warning' | 'primary' | 'success' | 'info';
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
    info: 'primary' as const,
  };

  const iconConfig = {
    danger: {
      icon: AlertCircle,
      bgColor: 'bg-danger-100 dark:bg-danger-900/30',
      iconColor: 'text-danger-600 dark:text-danger-400',
    },
    warning: {
      icon: AlertTriangle,
      bgColor: 'bg-warning-100 dark:bg-warning-900/30',
      iconColor: 'text-warning-600 dark:text-warning-400',
    },
    primary: {
      icon: Info,
      bgColor: 'bg-primary-100 dark:bg-primary-900/30',
      iconColor: 'text-primary-600 dark:text-primary-400',
    },
    success: {
      icon: CheckCircle,
      bgColor: 'bg-success-100 dark:bg-success-900/30',
      iconColor: 'text-success-600 dark:text-success-400',
    },
    info: {
      icon: Info,
      bgColor: 'bg-info-100 dark:bg-info-900/30',
      iconColor: 'text-info-600 dark:text-info-400',
    },
  };

  const IconComponent = iconConfig[variant].icon;

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
      <div className="text-center">
        <div
          className={clsx(
            'mx-auto w-14 h-14 rounded-full flex items-center justify-center mb-4',
            iconConfig[variant].bgColor
          )}
        >
          <IconComponent className={clsx('w-7 h-7', iconConfig[variant].iconColor)} />
        </div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-dark-800 mb-2">
          {title}
        </h3>
        <p className="text-sm text-gray-600 dark:text-dark-500">{message}</p>
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
  buttonLabel?: string;
  variant?: 'success' | 'warning' | 'danger' | 'info';
}

export const AlertModal = ({
  isOpen,
  onClose,
  title,
  message,
  buttonLabel = 'OK',
  variant = 'info',
}: AlertModalProps) => {
  const iconConfig = {
    success: {
      icon: CheckCircle,
      bgColor: 'bg-success-100 dark:bg-success-900/30',
      iconColor: 'text-success-600 dark:text-success-400',
    },
    warning: {
      icon: AlertTriangle,
      bgColor: 'bg-warning-100 dark:bg-warning-900/30',
      iconColor: 'text-warning-600 dark:text-warning-400',
    },
    danger: {
      icon: AlertCircle,
      bgColor: 'bg-danger-100 dark:bg-danger-900/30',
      iconColor: 'text-danger-600 dark:text-danger-400',
    },
    info: {
      icon: Info,
      bgColor: 'bg-info-100 dark:bg-info-900/30',
      iconColor: 'text-info-600 dark:text-info-400',
    },
  };

  const IconComponent = iconConfig[variant].icon;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="sm"
      showCloseButton={false}
      footer={
        <Button variant="primary" onClick={onClose} className="w-full">
          {buttonLabel}
        </Button>
      }
    >
      <div className="text-center">
        <div
          className={clsx(
            'mx-auto w-14 h-14 rounded-full flex items-center justify-center mb-4',
            iconConfig[variant].bgColor
          )}
        >
          <IconComponent className={clsx('w-7 h-7', iconConfig[variant].iconColor)} />
        </div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-dark-800 mb-2">
          {title}
        </h3>
        <p className="text-sm text-gray-600 dark:text-dark-500">{message}</p>
      </div>
    </Modal>
  );
};
