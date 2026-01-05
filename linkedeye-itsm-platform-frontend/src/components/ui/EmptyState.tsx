import clsx from 'clsx';
import { FileX, Search, AlertCircle, Inbox } from 'lucide-react';
import Button from './Button';

export type EmptyStateVariant = 'default' | 'search' | 'error' | 'empty';

export interface EmptyStateProps {
  variant?: EmptyStateVariant;
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  secondaryAction?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
}

const EmptyState = ({
  variant = 'default',
  icon,
  title,
  description,
  action,
  secondaryAction,
  className,
}: EmptyStateProps) => {
  const getDefaultIcon = () => {
    switch (variant) {
      case 'search':
        return <Search className="w-16 h-16" />;
      case 'error':
        return <AlertCircle className="w-16 h-16" />;
      case 'empty':
        return <Inbox className="w-16 h-16" />;
      default:
        return <FileX className="w-16 h-16" />;
    }
  };

  const iconColors = {
    default: 'text-gray-300',
    search: 'text-gray-300',
    error: 'text-danger-300',
    empty: 'text-gray-300',
  };

  return (
    <div className={clsx('text-center py-12 px-4', className)}>
      <div className={clsx('mx-auto mb-4', iconColors[variant])}>
        {icon || getDefaultIcon()}
      </div>

      <h3 className="text-lg font-medium text-gray-900 mb-2">{title}</h3>

      {description && (
        <p className="text-gray-500 max-w-md mx-auto mb-6">{description}</p>
      )}

      {(action || secondaryAction) && (
        <div className="flex items-center justify-center gap-3">
          {action && (
            <Button onClick={action.onClick}>
              {action.label}
            </Button>
          )}
          {secondaryAction && (
            <Button variant="outline" onClick={secondaryAction.onClick}>
              {secondaryAction.label}
            </Button>
          )}
        </div>
      )}
    </div>
  );
};

export default EmptyState;
