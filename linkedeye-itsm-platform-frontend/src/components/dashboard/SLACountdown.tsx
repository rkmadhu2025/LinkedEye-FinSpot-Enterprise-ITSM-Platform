import { useState, useEffect } from 'react';
import { Clock, AlertTriangle, CheckCircle, XCircle } from 'lucide-react';
import clsx from 'clsx';

/**
 * Enterprise SLA Countdown Component v2.0
 * - Real-time countdown with visual urgency
 * - Status-based colors (Critical=Red, At Risk=Orange, On Track=Green)
 * - Progress bar visualization
 * - Pulsing animation for critical states
 * - Multiple display variants
 */

interface SLACountdownProps {
  /** ISO timestamp of when SLA is due */
  dueDateISO: string;
  /** Optional: ISO timestamp when incident was created (for progress calculation) */
  createdAtISO?: string;
  /** Label shown above timer */
  label?: string;
  isDark: boolean;
  /** Compact inline badge style */
  compact?: boolean;
  /** Show progress bar */
  showProgress?: boolean;
  /** Variant style */
  variant?: 'default' | 'card' | 'badge' | 'minimal';
}

type SLAStatus = 'breached' | 'critical' | 'at_risk' | 'warning' | 'on_track' | 'met';

interface TimeRemaining {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  total: number;
  percent: number;
  status: SLAStatus;
}

function computeRemaining(due: Date, created?: Date): TimeRemaining {
  const now = Date.now();
  const dueTime = due.getTime();
  const rem = dueTime - now;

  // Calculate percent remaining
  let percent = 100;
  if (created) {
    const totalTime = dueTime - created.getTime();
    const elapsed = now - created.getTime();
    percent = Math.max(0, Math.min(100, 100 - (elapsed / totalTime) * 100));
  }

  if (rem <= 0) {
    return { days: 0, hours: 0, minutes: 0, seconds: 0, total: 0, percent: 0, status: 'breached' };
  }

  const days = Math.floor(rem / 86_400_000);
  const hours = Math.floor((rem % 86_400_000) / 3_600_000);
  const minutes = Math.floor((rem % 3_600_000) / 60_000);
  const seconds = Math.floor((rem % 60_000) / 1000);

  // Determine status based on time remaining and percent
  let status: SLAStatus = 'on_track';
  if (percent <= 10 || rem < 900_000) { // < 15 minutes or < 10%
    status = 'critical';
  } else if (percent <= 25 || rem < 3_600_000) { // < 1 hour or < 25%
    status = 'at_risk';
  } else if (percent <= 50 || rem < 14_400_000) { // < 4 hours or < 50%
    status = 'warning';
  }

  return { days, hours, minutes, seconds, total: rem, percent, status };
}

// Status color mapping
const statusConfig: Record<SLAStatus, {
  color: string;
  bg: string;
  bgDark: string;
  label: string;
  icon: typeof Clock;
  pulse: boolean;
}> = {
  breached: {
    color: '#ef4444',
    bg: 'rgba(239, 68, 68, 0.1)',
    bgDark: 'rgba(239, 68, 68, 0.2)',
    label: 'SLA Breached',
    icon: XCircle,
    pulse: true,
  },
  critical: {
    color: '#ef4444',
    bg: 'rgba(239, 68, 68, 0.08)',
    bgDark: 'rgba(239, 68, 68, 0.15)',
    label: 'Critical',
    icon: AlertTriangle,
    pulse: true,
  },
  at_risk: {
    color: '#f97316',
    bg: 'rgba(249, 115, 22, 0.08)',
    bgDark: 'rgba(249, 115, 22, 0.15)',
    label: 'At Risk',
    icon: AlertTriangle,
    pulse: false,
  },
  warning: {
    color: '#f59e0b',
    bg: 'rgba(245, 158, 11, 0.08)',
    bgDark: 'rgba(245, 158, 11, 0.15)',
    label: 'Warning',
    icon: Clock,
    pulse: false,
  },
  on_track: {
    color: '#10b981',
    bg: 'rgba(16, 185, 129, 0.08)',
    bgDark: 'rgba(16, 185, 129, 0.15)',
    label: 'On Track',
    icon: Clock,
    pulse: false,
  },
  met: {
    color: '#10b981',
    bg: 'rgba(16, 185, 129, 0.08)',
    bgDark: 'rgba(16, 185, 129, 0.15)',
    label: 'SLA Met',
    icon: CheckCircle,
    pulse: false,
  },
};

const SLACountdown = ({
  dueDateISO,
  createdAtISO,
  label = 'SLA Remaining',
  isDark,
  compact = false,
  showProgress = true,
  variant = 'default',
}: SLACountdownProps) => {
  const due = new Date(dueDateISO);
  const created = createdAtISO ? new Date(createdAtISO) : undefined;
  const [remaining, setRemaining] = useState(() => computeRemaining(due, created));

  useEffect(() => {
    const interval = setInterval(() => setRemaining(computeRemaining(due, created)), 1000);
    return () => clearInterval(interval);
  }, [dueDateISO, createdAtISO]);

  const config = statusConfig[remaining.status];
  const StatusIcon = config.icon;

  // Format time string
  const formatTime = () => {
    if (remaining.status === 'breached') return 'BREACHED';

    const parts = [];
    if (remaining.days > 0) {
      parts.push(`${remaining.days}d`);
    }
    parts.push(
      `${String(remaining.hours).padStart(2, '0')}:${String(remaining.minutes).padStart(2, '0')}:${String(remaining.seconds).padStart(2, '0')}`
    );
    return parts.join(' ');
  };

  // Compact badge variant
  if (compact || variant === 'badge') {
    return (
      <span
        className={clsx(
          'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold transition-all',
          config.pulse && 'animate-pulse'
        )}
        style={{
          background: isDark ? config.bgDark : config.bg,
          color: config.color,
          boxShadow: config.pulse ? `0 0 8px ${config.color}40` : 'none',
        }}
      >
        <StatusIcon size={12} />
        {formatTime()}
      </span>
    );
  }

  // Minimal variant
  if (variant === 'minimal') {
    return (
      <div className="flex items-center gap-2">
        <StatusIcon size={14} style={{ color: config.color }} />
        <span
          className="text-sm font-mono font-semibold"
          style={{ color: config.color }}
        >
          {formatTime()}
        </span>
      </div>
    );
  }

  // Card variant
  if (variant === 'card') {
    return (
      <div
        className={clsx(
          'rounded-xl p-4 transition-all',
          config.pulse && 'animate-pulse'
        )}
        style={{
          background: isDark ? config.bgDark : config.bg,
          border: `1px solid ${config.color}30`,
          boxShadow: config.pulse ? `0 0 16px ${config.color}20` : 'none',
        }}
      >
        <div className="flex items-center justify-between mb-3">
          <span
            className="text-[10px] font-semibold uppercase tracking-wider"
            style={{ color: isDark ? '#94a3b8' : '#64748b' }}
          >
            {label}
          </span>
          <span
            className="px-2 py-0.5 rounded-full text-[10px] font-semibold"
            style={{ background: config.color, color: '#fff' }}
          >
            {config.label}
          </span>
        </div>

        <p
          className="text-2xl font-bold font-mono tracking-wider mb-3"
          style={{ color: config.color }}
        >
          {formatTime()}
        </p>

        {showProgress && remaining.status !== 'breached' && (
          <div className="space-y-1.5">
            <div
              className="h-2 rounded-full overflow-hidden"
              style={{ background: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)' }}
            >
              <div
                className="h-full rounded-full transition-all duration-1000"
                style={{
                  width: `${100 - remaining.percent}%`,
                  background: config.color,
                }}
              />
            </div>
            <p
              className="text-[10px] text-right"
              style={{ color: isDark ? '#64748b' : '#94a3b8' }}
            >
              {Math.round(remaining.percent)}% remaining
            </p>
          </div>
        )}
      </div>
    );
  }

  // Default variant
  return (
    <div
      className={clsx(
        'rounded-xl p-4 flex items-center gap-4 transition-all',
        config.pulse && 'animate-pulse'
      )}
      style={{
        background: isDark ? 'rgba(255,255,255,0.04)' : config.bg,
        border: `1px solid ${config.color}30`,
        boxShadow: config.pulse ? `0 0 12px ${config.color}25` : 'none',
      }}
    >
      <div
        className={clsx(
          'w-12 h-12 rounded-xl flex items-center justify-center transition-all',
          config.pulse && 'animate-bounce'
        )}
        style={{
          background: `linear-gradient(135deg, ${config.color}20 0%, ${config.color}10 100%)`,
          color: config.color,
        }}
      >
        <StatusIcon size={22} />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-1">
          <p
            className="text-[11px] font-semibold uppercase tracking-wider"
            style={{ color: isDark ? '#94a3b8' : '#64748b' }}
          >
            {label}
          </p>
          <span
            className="px-2 py-0.5 rounded-full text-[9px] font-bold"
            style={{ background: config.color, color: '#fff' }}
          >
            {config.label}
          </span>
        </div>

        <p
          className="text-xl font-bold font-mono tracking-wider"
          style={{ color: config.color }}
        >
          {formatTime()}
        </p>

        {showProgress && remaining.status !== 'breached' && (
          <div className="mt-2">
            <div
              className="h-1.5 rounded-full overflow-hidden"
              style={{ background: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)' }}
            >
              <div
                className="h-full rounded-full transition-all duration-1000"
                style={{
                  width: `${100 - remaining.percent}%`,
                  background: config.color,
                }}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SLACountdown;
