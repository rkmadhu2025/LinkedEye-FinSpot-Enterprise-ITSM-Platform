import { ReactNode, useState } from 'react';
import { ArrowRight, ChevronRight, Clock, AlertCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import clsx from 'clsx';

/**
 * Enterprise Action Panel Component v2.0
 * - Card-based layout with soft shadows
 * - Hover micro-interactions
 * - Priority-based visual indicators
 * - SLA countdown integration
 * - Empty state with action
 */

type PriorityLevel = 'critical' | 'high' | 'medium' | 'low' | 'info';

interface ActionItem {
  id: string;
  title: string;
  subtitle?: string;
  badge?: ReactNode;
  href?: string;
  priority?: PriorityLevel;
  slaRemaining?: string; // e.g., "1h 23m"
  timestamp?: string;
  onClick?: () => void;
}

interface ActionPanelProps {
  title: string;
  icon: ReactNode;
  items: ActionItem[];
  emptyText?: string;
  emptyAction?: { label: string; href: string };
  viewAllHref?: string;
  viewAllLabel?: string;
  isDark: boolean;
  maxItems?: number;
  variant?: 'default' | 'compact' | 'detailed';
  accentColor?: string;
}

// Priority color mapping
const priorityColors: Record<PriorityLevel, { bg: string; bgDark: string; text: string; indicator: string }> = {
  critical: {
    bg: 'rgba(239, 68, 68, 0.08)',
    bgDark: 'rgba(239, 68, 68, 0.15)',
    text: '#ef4444',
    indicator: '#ef4444',
  },
  high: {
    bg: 'rgba(249, 115, 22, 0.08)',
    bgDark: 'rgba(249, 115, 22, 0.15)',
    text: '#f97316',
    indicator: '#f97316',
  },
  medium: {
    bg: 'rgba(245, 158, 11, 0.08)',
    bgDark: 'rgba(245, 158, 11, 0.15)',
    text: '#f59e0b',
    indicator: '#f59e0b',
  },
  low: {
    bg: 'rgba(59, 130, 246, 0.08)',
    bgDark: 'rgba(59, 130, 246, 0.15)',
    text: '#3b82f6',
    indicator: '#3b82f6',
  },
  info: {
    bg: 'rgba(107, 114, 128, 0.08)',
    bgDark: 'rgba(107, 114, 128, 0.15)',
    text: '#6b7280',
    indicator: '#6b7280',
  },
};

const ActionPanel = ({
  title,
  icon,
  items,
  emptyText = 'Nothing to show',
  emptyAction,
  viewAllHref,
  viewAllLabel = 'View All',
  isDark,
  maxItems = 5,
  variant = 'default',
  accentColor,
}: ActionPanelProps) => {
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  const cardBg = isDark ? 'var(--bg-card)' : '#ffffff';
  const border = isDark ? 'rgba(255,255,255,0.08)' : '#e5e8eb';
  const textPrimary = isDark ? '#f8fafc' : '#0f172a';
  const textSecondary = isDark ? '#94a3b8' : '#64748b';

  const displayItems = items.slice(0, maxItems);
  const hasMore = items.length > maxItems;

  return (
    <div
      className="rounded-xl overflow-hidden transition-shadow duration-300 hover:shadow-lg"
      style={{
        background: cardBg,
        border: `1px solid ${border}`,
        boxShadow: isDark
          ? '0 2px 8px rgba(0,0,0,0.25)'
          : '0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)',
      }}
    >
      {/* Header */}
      <div
        className="px-5 py-4 flex items-center justify-between"
        style={{ borderBottom: `1px solid ${border}` }}
      >
        <div className="flex items-center gap-2.5">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{
              background: accentColor
                ? `${accentColor}15`
                : isDark ? 'rgba(59, 130, 246, 0.15)' : 'rgba(59, 130, 246, 0.1)',
              color: accentColor || '#3b82f6',
            }}
          >
            {icon}
          </div>
          <div>
            <h3 className="text-sm font-semibold" style={{ color: textPrimary }}>
              {title}
            </h3>
            {items.length > 0 && (
              <p className="text-xs" style={{ color: textSecondary }}>
                {items.length} {items.length === 1 ? 'item' : 'items'}
              </p>
            )}
          </div>
        </div>
        {viewAllHref && items.length > 0 && (
          <Link
            to={viewAllHref}
            className="text-xs font-medium flex items-center gap-1 transition-all hover:gap-2"
            style={{ color: accentColor || '#3b82f6' }}
          >
            {viewAllLabel}
            <ArrowRight size={13} />
          </Link>
        )}
      </div>

      {/* Items */}
      <div className="divide-y" style={{ borderColor: border }}>
        {displayItems.length === 0 ? (
          <div className="py-12 px-5 text-center">
            <div
              className="w-12 h-12 rounded-full mx-auto mb-3 flex items-center justify-center"
              style={{ background: isDark ? 'rgba(255,255,255,0.05)' : '#f4f6f9' }}
            >
              <AlertCircle size={24} style={{ color: textSecondary }} />
            </div>
            <p className="text-sm mb-3" style={{ color: textSecondary }}>
              {emptyText}
            </p>
            {emptyAction && (
              <Link
                to={emptyAction.href}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-medium transition-all"
                style={{
                  background: isDark ? 'rgba(59, 130, 246, 0.15)' : 'rgba(59, 130, 246, 0.1)',
                  color: '#3b82f6',
                }}
              >
                {emptyAction.label}
                <ArrowRight size={12} />
              </Link>
            )}
          </div>
        ) : (
          displayItems.map((item) => {
            const Wrapper = item.href ? Link : 'div';
            const wrapperProps = item.href ? { to: item.href } : {};
            const isHovered = hoveredId === item.id;
            const priorityConfig = item.priority ? priorityColors[item.priority] : null;

            return (
              <Wrapper
                key={item.id}
                {...(wrapperProps as any)}
                className={clsx(
                  'flex items-center gap-3 px-5 py-3.5 transition-all cursor-pointer relative',
                  variant === 'compact' && 'py-2.5'
                )}
                style={{
                  background: isHovered
                    ? isDark ? 'rgba(255,255,255,0.04)' : '#f9fafb'
                    : 'transparent',
                }}
                onMouseEnter={() => setHoveredId(item.id)}
                onMouseLeave={() => setHoveredId(null)}
                onClick={item.onClick}
              >
                {/* Priority indicator */}
                {priorityConfig && (
                  <div
                    className="absolute left-0 top-0 bottom-0 w-1 rounded-r transition-all"
                    style={{
                      background: priorityConfig.indicator,
                      opacity: isHovered ? 1 : 0.6,
                    }}
                  />
                )}

                {/* Content */}
                <div className="min-w-0 flex-1">
                  <p
                    className={clsx(
                      'text-sm font-medium truncate transition-colors',
                      variant === 'compact' && 'text-xs'
                    )}
                    style={{ color: textPrimary }}
                  >
                    {item.title}
                  </p>
                  {item.subtitle && variant !== 'compact' && (
                    <p
                      className="text-xs truncate mt-0.5"
                      style={{ color: textSecondary }}
                    >
                      {item.subtitle}
                    </p>
                  )}

                  {/* SLA and timestamp row */}
                  {(item.slaRemaining || item.timestamp) && variant === 'detailed' && (
                    <div className="flex items-center gap-3 mt-1.5">
                      {item.slaRemaining && (
                        <span
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium"
                          style={{
                            background: priorityConfig?.bg || 'rgba(107, 114, 128, 0.08)',
                            color: priorityConfig?.text || '#6b7280',
                          }}
                        >
                          <Clock size={10} />
                          {item.slaRemaining}
                        </span>
                      )}
                      {item.timestamp && (
                        <span className="text-[10px]" style={{ color: textSecondary }}>
                          {item.timestamp}
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {/* Badge or arrow */}
                <div className="flex items-center gap-2 flex-shrink-0">
                  {item.badge}
                  {item.href && (
                    <ChevronRight
                      size={16}
                      className="transition-all"
                      style={{
                        color: textSecondary,
                        opacity: isHovered ? 1 : 0.5,
                        transform: isHovered ? 'translateX(2px)' : 'translateX(0)',
                      }}
                    />
                  )}
                </div>
              </Wrapper>
            );
          })
        )}

        {/* Show more indicator */}
        {hasMore && viewAllHref && (
          <Link
            to={viewAllHref}
            className="flex items-center justify-center gap-2 px-5 py-3 text-xs font-medium transition-colors"
            style={{
              color: '#3b82f6',
              background: isDark ? 'rgba(59, 130, 246, 0.05)' : 'rgba(59, 130, 246, 0.03)',
            }}
          >
            +{items.length - maxItems} more
            <ArrowRight size={12} />
          </Link>
        )}
      </div>
    </div>
  );
};

export default ActionPanel;
