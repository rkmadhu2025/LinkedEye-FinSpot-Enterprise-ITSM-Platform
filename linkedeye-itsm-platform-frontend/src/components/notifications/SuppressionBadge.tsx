/**
 * Suppression Badge Component
 * Shows visual indicator when an asset/device has active alert suppression
 */

import React, { useState, useEffect } from 'react';
import { AssetSuppressionStatus } from '@/types';
import alertSuppressionService from '@/services/alertSuppressionService';

interface SuppressionBadgeProps {
  /** Asset ID to check suppression status */
  assetId?: string;
  /** Network device ID to check suppression status */
  networkDeviceId?: string;
  /** Pre-loaded suppression status (optional) */
  status?: AssetSuppressionStatus;
  /** Show as compact icon only */
  iconOnly?: boolean;
  /** Click handler to open suppression modal */
  onClick?: () => void;
  /** Size variant */
  size?: 'sm' | 'md' | 'lg';
}

const SuppressionBadge: React.FC<SuppressionBadgeProps> = ({
  assetId,
  networkDeviceId,
  status: preloadedStatus,
  iconOnly = false,
  onClick,
  size = 'md',
}) => {
  const [status, setStatus] = useState<AssetSuppressionStatus | null>(preloadedStatus || null);
  const [loading, setLoading] = useState(!preloadedStatus);

  useEffect(() => {
    if (preloadedStatus) {
      setStatus(preloadedStatus);
      setLoading(false);
      return;
    }

    if (assetId) {
      loadAssetStatus();
    }
  }, [assetId, networkDeviceId, preloadedStatus]);

  const loadAssetStatus = async () => {
    if (!assetId) return;

    setLoading(true);
    try {
      const data = await alertSuppressionService.getAssetSuppressionStatus(assetId);
      setStatus(data);
    } catch (err) {
      // Silently fail - no suppression status
      setStatus(null);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return null;
  }

  if (!status || !status.is_suppressed) {
    return null;
  }

  const getTimeRemaining = () => {
    if (!status.active_suppression) return '';
    return alertSuppressionService.getTimeRemaining(status.active_suppression);
  };

  const getSeveritiesText = () => {
    const suppressed = status.suppressed_severities || [];
    if (suppressed.length === 0) return 'all severities';
    return suppressed.join(', ');
  };

  const sizeClasses = {
    sm: 'badge-sm',
    md: 'badge-md',
    lg: 'badge-lg',
  };

  if (iconOnly) {
    return (
      <span
        className={`suppression-icon ${sizeClasses[size]}`}
        title={`Alerts suppressed: ${getSeveritiesText()} - ${getTimeRemaining()}`}
        onClick={onClick}
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M18.36 6.64a9 9 0 1 1-12.73 0" />
          <line x1="12" y1="2" x2="12" y2="12" />
        </svg>

        <style>{`
          .suppression-icon {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            color: var(--warning);
            cursor: ${onClick ? 'pointer' : 'default'};
          }

          .suppression-icon:hover {
            opacity: 0.8;
          }

          .suppression-icon.badge-sm svg {
            width: 14px;
            height: 14px;
          }

          .suppression-icon.badge-md svg {
            width: 18px;
            height: 18px;
          }

          .suppression-icon.badge-lg svg {
            width: 22px;
            height: 22px;
          }
        `}</style>
      </span>
    );
  }

  return (
    <div
      className={`suppression-badge ${sizeClasses[size]} ${onClick ? 'clickable' : ''}`}
      onClick={onClick}
      title={`Click to manage suppression`}
    >
      <div className="badge-icon">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M18.36 6.64a9 9 0 1 1-12.73 0" />
          <line x1="12" y1="2" x2="12" y2="12" />
        </svg>
      </div>
      <div className="badge-content">
        <span className="badge-label">Alerts Suppressed</span>
        <span className="badge-time">{getTimeRemaining()}</span>
      </div>

      <style>{`
        .suppression-badge {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          background: var(--warning-bg);
          border: 1px solid var(--warning);
          border-radius: 8px;
          color: var(--warning);
        }

        .suppression-badge.clickable {
          cursor: pointer;
        }

        .suppression-badge.clickable:hover {
          background: var(--warning);
          color: white;
        }

        .suppression-badge.badge-sm {
          padding: 4px 8px;
          font-size: 11px;
          gap: 6px;
        }

        .suppression-badge.badge-md {
          padding: 6px 12px;
          font-size: 12px;
        }

        .suppression-badge.badge-lg {
          padding: 8px 16px;
          font-size: 14px;
          gap: 10px;
        }

        .badge-icon {
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .badge-sm .badge-icon svg {
          width: 12px;
          height: 12px;
        }

        .badge-md .badge-icon svg {
          width: 16px;
          height: 16px;
        }

        .badge-lg .badge-icon svg {
          width: 20px;
          height: 20px;
        }

        .badge-content {
          display: flex;
          flex-direction: column;
          line-height: 1.2;
        }

        .badge-label {
          font-weight: 600;
        }

        .badge-time {
          font-weight: 400;
          opacity: 0.9;
        }

        .badge-sm .badge-content {
          flex-direction: row;
          gap: 4px;
        }

        .badge-sm .badge-label::after {
          content: ' - ';
        }
      `}</style>
    </div>
  );
};

export default SuppressionBadge;
