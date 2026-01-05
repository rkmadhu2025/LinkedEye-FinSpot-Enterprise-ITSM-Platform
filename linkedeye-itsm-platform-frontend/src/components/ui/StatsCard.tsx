import clsx from 'clsx';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

export interface StatsCardProps {
  title: string;
  value: string | number;
  change?: {
    value: number;
    type: 'increase' | 'decrease' | 'neutral';
    period?: string;
  };
  icon?: React.ReactNode;
  variant?: 'default' | 'critical' | 'high' | 'medium' | 'low' | 'success';
  className?: string;
}

const StatsCard = ({ title, value, change, icon, variant = 'default', className }: StatsCardProps) => {
  const variantStyles = {
    default: 'border-t-gray-400',
    critical: 'border-t-danger-500',
    high: 'border-t-warning-500',
    medium: 'border-t-primary-500',
    low: 'border-t-success-500',
    success: 'border-t-success-500',
  };

  const iconBgStyles = {
    default: 'bg-gray-100 text-gray-600',
    critical: 'bg-danger-100 text-danger-600',
    high: 'bg-warning-100 text-warning-600',
    medium: 'bg-primary-100 text-primary-600',
    low: 'bg-success-100 text-success-600',
    success: 'bg-success-100 text-success-600',
  };

  const getTrendIcon = () => {
    if (!change) return null;

    switch (change.type) {
      case 'increase':
        return <TrendingUp size={14} />;
      case 'decrease':
        return <TrendingDown size={14} />;
      default:
        return <Minus size={14} />;
    }
  };

  const getTrendColor = () => {
    if (!change) return '';

    switch (change.type) {
      case 'increase':
        return 'text-success-600';
      case 'decrease':
        return 'text-danger-600';
      default:
        return 'text-gray-500';
    }
  };

  return (
    <div
      className={clsx(
        'bg-white rounded-xl border border-gray-200 p-5 relative overflow-hidden',
        'border-t-4',
        variantStyles[variant],
        className
      )}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-gray-500">{title}</p>
          <p className="mt-2 text-3xl font-bold text-gray-900">{value}</p>

          {change && (
            <div className={clsx('flex items-center gap-1 mt-2', getTrendColor())}>
              {getTrendIcon()}
              <span className="text-sm font-medium">
                {change.value > 0 ? '+' : ''}{change.value}%
              </span>
              {change.period && (
                <span className="text-xs text-gray-400 ml-1">{change.period}</span>
              )}
            </div>
          )}
        </div>

        {icon && (
          <div className={clsx('p-3 rounded-lg', iconBgStyles[variant])}>
            {icon}
          </div>
        )}
      </div>
    </div>
  );
};

export default StatsCard;

// Metric Card variant
export interface MetricCardProps {
  label: string;
  value: string | number;
  sublabel?: string;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  variant?: 'default' | 'primary' | 'success' | 'warning' | 'danger';
  className?: string;
}

export const MetricCard = ({ label, value, sublabel, trend, variant = 'default', className }: MetricCardProps) => {
  const gradients = {
    default: 'from-gray-500 to-gray-600',
    primary: 'from-primary-500 to-primary-600',
    success: 'from-success-500 to-success-600',
    warning: 'from-warning-500 to-warning-600',
    danger: 'from-danger-500 to-danger-600',
  };

  return (
    <div className={clsx('bg-white rounded-xl border border-gray-200 overflow-hidden', className)}>
      <div className={clsx('h-1 bg-gradient-to-r', gradients[variant])} />
      <div className="p-5">
        <p className="text-sm font-medium text-gray-500">{label}</p>
        <div className="mt-2 flex items-baseline gap-2">
          <span className="text-3xl font-bold text-gray-900">{value}</span>
          {trend && (
            <span
              className={clsx(
                'text-sm font-medium',
                trend.isPositive ? 'text-success-600' : 'text-danger-600'
              )}
            >
              {trend.isPositive ? '+' : '-'}{Math.abs(trend.value)}%
            </span>
          )}
        </div>
        {sublabel && <p className="mt-1 text-sm text-gray-500">{sublabel}</p>}
      </div>
    </div>
  );
};
