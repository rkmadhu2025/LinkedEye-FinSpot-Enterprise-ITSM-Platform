import { ReactNode, useState } from 'react';
import { TrendingUp, TrendingDown, Minus, ExternalLink } from 'lucide-react';
import { Link } from 'react-router-dom';
import clsx from 'clsx';

/**
 * Enterprise KPI Card Component v2.0
 * - Modern visual hierarchy following 8px grid system
 * - Status-based accent colors (semantic: Critical=Red, High=Orange, Medium=Amber, Healthy=Green)
 * - Hover micro-interactions
 * - Optional click-through link
 * - Accessibility compliant contrast
 */

type StatusType = 'critical' | 'high' | 'medium' | 'healthy' | 'info' | 'default';

interface KPICardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: ReactNode;
  trend?: {
    value: number;
    direction: 'up' | 'down' | 'neutral';
    label: string;
    isPositive?: boolean; // Override for context (e.g., down incidents = good)
  };
  accentColor?: string; // hex e.g. '#ef4444' (legacy support)
  status?: StatusType; // Semantic status for automatic coloring
  isDark: boolean;
  href?: string; // Optional link destination
  onClick?: () => void;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'default' | 'compact' | 'detailed';
}

// Semantic status color mapping following ITSM standards
const statusColors: Record<StatusType, { accent: string; bg: string; bgDark: string; glow: string }> = {
  critical: {
    accent: '#ef4444',
    bg: 'rgba(239, 68, 68, 0.08)',
    bgDark: 'rgba(239, 68, 68, 0.15)',
    glow: 'rgba(239, 68, 68, 0.25)',
  },
  high: {
    accent: '#f97316',
    bg: 'rgba(249, 115, 22, 0.08)',
    bgDark: 'rgba(249, 115, 22, 0.15)',
    glow: 'rgba(249, 115, 22, 0.25)',
  },
  medium: {
    accent: '#f59e0b',
    bg: 'rgba(245, 158, 11, 0.08)',
    bgDark: 'rgba(245, 158, 11, 0.15)',
    glow: 'rgba(245, 158, 11, 0.25)',
  },
  healthy: {
    accent: '#10b981',
    bg: 'rgba(16, 185, 129, 0.08)',
    bgDark: 'rgba(16, 185, 129, 0.15)',
    glow: 'rgba(16, 185, 129, 0.25)',
  },
  info: {
    accent: '#3b82f6',
    bg: 'rgba(59, 130, 246, 0.08)',
    bgDark: 'rgba(59, 130, 246, 0.15)',
    glow: 'rgba(59, 130, 246, 0.25)',
  },
  default: {
    accent: '#6b7280',
    bg: 'rgba(107, 114, 128, 0.08)',
    bgDark: 'rgba(107, 114, 128, 0.15)',
    glow: 'rgba(107, 114, 128, 0.25)',
  },
};

const KPICard = ({
  title,
  value,
  subtitle,
  icon,
  trend,
  accentColor,
  status = 'default',
  isDark,
  href,
  onClick,
  size = 'md',
  variant = 'default',
}: KPICardProps) => {
  const [isHovered, setIsHovered] = useState(false);

  // Determine colors - prefer status-based, fallback to accentColor
  const colors = statusColors[status];
  const finalAccent = accentColor || colors.accent;
  const iconBg = isDark ? colors.bgDark : colors.bg;

  // Determine trend direction interpretation
  // In ITSM context: down incidents = positive, up incidents = negative
  const trendIsPositive = trend?.isPositive !== undefined
    ? trend.isPositive
    : trend?.direction === 'down';

  // Size variants
  const sizeClasses = {
    sm: 'p-4',
    md: 'p-5',
    lg: 'p-6',
  };

  const valueSizes = {
    sm: 'text-2xl',
    md: 'text-3xl',
    lg: 'text-4xl',
  };

  const iconSizes = {
    sm: 'w-8 h-8',
    md: 'w-9 h-9',
    lg: 'w-10 h-10',
  };

  const CardWrapper = href ? Link : 'div';
  const wrapperProps = href ? { to: href } : {};

  return (
    <CardWrapper
      {...wrapperProps}
      className={clsx(
        'relative rounded-xl overflow-hidden transition-all duration-300 group block',
        sizeClasses[size],
        href && 'cursor-pointer',
        onClick && 'cursor-pointer'
      )}
      style={{
        background: isDark ? 'var(--bg-card)' : '#ffffff',
        border: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : '#e5e8eb'}`,
        boxShadow: isHovered
          ? isDark
            ? `0 8px 24px rgba(0,0,0,0.35), 0 0 0 1px ${finalAccent}20`
            : `0 8px 24px rgba(0,0,0,0.08), 0 0 0 1px ${finalAccent}30`
          : isDark
          ? '0 2px 8px rgba(0,0,0,0.25)'
          : '0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)',
        transform: isHovered ? 'translateY(-2px)' : 'translateY(0)',
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={onClick}
    >
      {/* Top accent bar with animation */}
      <div
        className="absolute top-0 left-0 right-0 transition-all duration-300"
        style={{
          height: isHovered ? '4px' : '3px',
          background: `linear-gradient(90deg, ${finalAccent} 0%, ${finalAccent}80 100%)`,
          boxShadow: isHovered ? `0 2px 8px ${colors.glow}` : 'none',
        }}
      />

      {/* Background glow effect on hover */}
      <div
        className="absolute -right-8 -top-8 w-32 h-32 rounded-full transition-all duration-500 pointer-events-none"
        style={{
          background: `radial-gradient(circle, ${finalAccent}${isHovered ? '15' : '08'} 0%, transparent 70%)`,
          transform: isHovered ? 'scale(1.2)' : 'scale(1)',
        }}
      />

      {/* Header row */}
      <div className="flex items-start justify-between mb-3 relative z-10">
        <p
          className="text-xs font-semibold uppercase tracking-wider"
          style={{ color: isDark ? '#94a3b8' : '#64748b' }}
        >
          {title}
        </p>
        <div
          className={clsx(
            'rounded-lg flex items-center justify-center transition-all duration-300',
            iconSizes[size]
          )}
          style={{
            background: iconBg,
            color: finalAccent,
            transform: isHovered ? 'scale(1.1)' : 'scale(1)',
            boxShadow: isHovered ? `0 4px 12px ${colors.glow}` : 'none',
          }}
        >
          {icon}
        </div>
      </div>

      {/* Value */}
      <p
        className={clsx(
          'font-bold tracking-tight mb-1 relative z-10 transition-colors duration-200',
          valueSizes[size]
        )}
        style={{
          color: isDark ? '#f8fafc' : '#0f172a',
        }}
      >
        {value}
      </p>

      {/* Subtitle */}
      {subtitle && (
        <p
          className="text-xs mb-2 relative z-10"
          style={{ color: isDark ? '#64748b' : '#94a3b8' }}
        >
          {subtitle}
        </p>
      )}

      {/* Trend indicator */}
      {trend && (
        <div className="flex items-center gap-1.5 text-xs relative z-10">
          {trend.direction === 'up' && (
            <div
              className={clsx(
                'flex items-center justify-center w-5 h-5 rounded-full',
                trendIsPositive ? 'bg-red-100 dark:bg-red-900/30' : 'bg-emerald-100 dark:bg-emerald-900/30'
              )}
            >
              <TrendingUp
                size={12}
                className={trendIsPositive ? 'text-red-500' : 'text-emerald-500'}
              />
            </div>
          )}
          {trend.direction === 'down' && (
            <div
              className={clsx(
                'flex items-center justify-center w-5 h-5 rounded-full',
                trendIsPositive ? 'bg-emerald-100 dark:bg-emerald-900/30' : 'bg-red-100 dark:bg-red-900/30'
              )}
            >
              <TrendingDown
                size={12}
                className={trendIsPositive ? 'text-emerald-500' : 'text-red-500'}
              />
            </div>
          )}
          {trend.direction === 'neutral' && (
            <div className="flex items-center justify-center w-5 h-5 rounded-full bg-gray-100 dark:bg-gray-800">
              <Minus size={12} className="text-gray-500" />
            </div>
          )}
          <span
            className="font-medium"
            style={{
              color:
                trend.direction === 'neutral'
                  ? isDark ? '#94a3b8' : '#64748b'
                  : trendIsPositive ? '#10b981' : '#ef4444',
            }}
          >
            {trend.direction !== 'neutral' && trend.value !== 0 && (
              <span>{trend.value > 0 ? '+' : ''}{trend.value}</span>
            )}{' '}
            <span style={{ color: isDark ? '#94a3b8' : '#64748b' }}>{trend.label}</span>
          </span>
        </div>
      )}

      {/* Link indicator */}
      {href && (
        <div
          className={clsx(
            'absolute bottom-3 right-3 w-6 h-6 rounded-full flex items-center justify-center',
            'transition-all duration-300 opacity-0 group-hover:opacity-100'
          )}
          style={{
            background: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
            color: isDark ? '#94a3b8' : '#64748b',
          }}
        >
          <ExternalLink size={12} />
        </div>
      )}
    </CardWrapper>
  );
};

export default KPICard;
