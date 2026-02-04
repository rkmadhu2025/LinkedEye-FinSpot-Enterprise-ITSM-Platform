/**
 * Alert Suppression Modal
 * Modal wrapper for alert suppression form, used in asset/device detail pages
 */

import React, { useState, useEffect } from 'react';
import { X, BellOff, AlertTriangle } from 'lucide-react';
import { AlertSuppression, AssetSuppressionStatus } from '@/types';
import alertSuppressionService from '@/services/alertSuppressionService';
import AlertSuppressionForm from './AlertSuppressionForm';
import AlertSuppressionList from './AlertSuppressionList';

interface AlertSuppressionModalProps {
  /** Whether the modal is open */
  isOpen: boolean;
  /** Close handler */
  onClose: () => void;
  /** Target type */
  targetType: 'asset' | 'network_device';
  /** Target ID */
  targetId: string;
  /** Target name for display */
  targetName: string;
  /** Target IP address */
  targetIp?: string;
  /** Callback when suppression status changes */
  onStatusChange?: (status: AssetSuppressionStatus) => void;
}

const AlertSuppressionModal: React.FC<AlertSuppressionModalProps> = ({
  isOpen,
  onClose,
  targetType,
  targetId,
  targetName,
  targetIp,
  onStatusChange,
}) => {
  const [mode, setMode] = useState<'list' | 'create'>('list');
  const [status, setStatus] = useState<AssetSuppressionStatus | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isOpen && targetType === 'asset') {
      loadStatus();
    }
  }, [isOpen, targetId, targetType]);

  const loadStatus = async () => {
    setLoading(true);
    try {
      const data = await alertSuppressionService.getAssetSuppressionStatus(targetId);
      setStatus(data);
    } catch (err) {
      setStatus(null);
    } finally {
      setLoading(false);
    }
  };

  const handleSuppressionCreated = (suppression: AlertSuppression) => {
    loadStatus();
    setMode('list');
    onStatusChange?.({
      is_suppressed: true,
      active_suppression: suppression,
      suppressed_severities: suppression.severity_filter,
    });
  };

  const handleSuppressionRemoved = () => {
    loadStatus();
    onStatusChange?.({
      is_suppressed: false,
      active_suppression: null,
      suppressed_severities: [],
    });
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-container" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="modal-header">
          <div className="header-info">
            <div className="header-icon">
              <BellOff size={24} />
            </div>
            <div>
              <h2 className="modal-title">Alert Suppression</h2>
              <div className="target-info">
                <span className="target-name">{targetName}</span>
                {targetIp && <span className="target-ip">{targetIp}</span>}
              </div>
            </div>
          </div>
          <button className="close-btn" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        {/* Status Banner */}
        {status?.is_suppressed && (
          <div className="status-banner warning">
            <AlertTriangle size={16} />
            <span>
              Alerts are currently suppressed.{' '}
              {status.active_suppression?.suppressed_count || 0} alerts have been suppressed.
            </span>
          </div>
        )}

        {/* Content */}
        <div className="modal-content">
          {mode === 'list' ? (
            <div className="list-view">
              {/* Active Suppressions */}
              <div className="section">
                <div className="section-header">
                  <h3>Active Suppressions</h3>
                  <button
                    className="btn btn-primary btn-sm"
                    onClick={() => setMode('create')}
                  >
                    <BellOff size={14} />
                    New Suppression
                  </button>
                </div>
                <AlertSuppressionList
                  assetId={targetType === 'asset' ? targetId : undefined}
                  networkDeviceId={targetType === 'network_device' ? targetId : undefined}
                  activeOnly={true}
                  onRemove={handleSuppressionRemoved}
                  onExtend={() => loadStatus()}
                  compact
                />
              </div>

              {/* Quick Actions */}
              {!status?.is_suppressed && (
                <div className="quick-actions">
                  <p className="quick-label">Quick Suppress</p>
                  <div className="quick-buttons">
                    {alertSuppressionService.getQuickDurationOptions().slice(0, 5).map((option) => (
                      <QuickSuppressionButton
                        key={option.hours}
                        label={option.label}
                        hours={option.hours}
                        targetType={targetType}
                        targetId={targetId}
                        onSuccess={handleSuppressionCreated}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <AlertSuppressionForm
              targetId={targetId}
              targetType={targetType}
              targetName={targetName}
              onSuccess={handleSuppressionCreated}
              onCancel={() => setMode('list')}
            />
          )}
        </div>

        <style>{`
          .modal-overlay {
            position: fixed;
            inset: 0;
            background: rgba(0, 0, 0, 0.5);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 1000;
            padding: 20px;
          }

          .modal-container {
            background: var(--bg-primary, #fff);
            border-radius: 16px;
            width: 100%;
            max-width: 640px;
            max-height: 90vh;
            overflow: hidden;
            display: flex;
            flex-direction: column;
            box-shadow: 0 20px 60px rgba(0, 0, 0, 0.2);
          }

          .modal-header {
            display: flex;
            align-items: flex-start;
            justify-content: space-between;
            padding: 20px 24px;
            border-bottom: 1px solid var(--border-color, #e5e7eb);
          }

          .header-info {
            display: flex;
            align-items: flex-start;
            gap: 16px;
          }

          .header-icon {
            width: 48px;
            height: 48px;
            border-radius: 12px;
            background: #fef3c7;
            color: #d97706;
            display: flex;
            align-items: center;
            justify-content: center;
          }

          .modal-title {
            margin: 0;
            font-size: 18px;
            font-weight: 600;
            color: var(--text-primary, #111827);
          }

          .target-info {
            display: flex;
            align-items: center;
            gap: 8px;
            margin-top: 4px;
          }

          .target-name {
            font-size: 14px;
            color: var(--text-secondary, #6b7280);
          }

          .target-ip {
            font-size: 12px;
            color: var(--text-tertiary, #9ca3af);
            background: var(--bg-secondary, #f3f4f6);
            padding: 2px 8px;
            border-radius: 4px;
            font-family: monospace;
          }

          .close-btn {
            background: none;
            border: none;
            color: var(--text-secondary, #6b7280);
            cursor: pointer;
            padding: 8px;
            border-radius: 8px;
            transition: all 0.2s;
          }

          .close-btn:hover {
            background: var(--bg-secondary, #f3f4f6);
            color: var(--text-primary, #111827);
          }

          .status-banner {
            display: flex;
            align-items: center;
            gap: 8px;
            padding: 12px 24px;
            font-size: 13px;
          }

          .status-banner.warning {
            background: #fef3c7;
            color: #92400e;
          }

          .modal-content {
            padding: 24px;
            overflow-y: auto;
          }

          .list-view {
            display: flex;
            flex-direction: column;
            gap: 24px;
          }

          .section {
            display: flex;
            flex-direction: column;
            gap: 12px;
          }

          .section-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
          }

          .section-header h3 {
            margin: 0;
            font-size: 14px;
            font-weight: 600;
            color: var(--text-primary, #111827);
          }

          .btn {
            display: inline-flex;
            align-items: center;
            gap: 6px;
            padding: 8px 16px;
            border: none;
            border-radius: 8px;
            font-size: 13px;
            font-weight: 500;
            cursor: pointer;
            transition: all 0.2s;
          }

          .btn-sm {
            padding: 6px 12px;
            font-size: 12px;
          }

          .btn-primary {
            background: #d97706;
            color: white;
          }

          .btn-primary:hover {
            background: #b45309;
          }

          .quick-actions {
            padding: 16px;
            background: var(--bg-secondary, #f9fafb);
            border-radius: 12px;
          }

          .quick-label {
            margin: 0 0 12px 0;
            font-size: 12px;
            font-weight: 600;
            color: var(--text-secondary, #6b7280);
            text-transform: uppercase;
            letter-spacing: 0.05em;
          }

          .quick-buttons {
            display: flex;
            flex-wrap: wrap;
            gap: 8px;
          }
        `}</style>
      </div>
    </div>
  );
};

// Quick suppression button component
interface QuickSuppressionButtonProps {
  label: string;
  hours: number;
  targetType: 'asset' | 'network_device';
  targetId: string;
  onSuccess: (suppression: AlertSuppression) => void;
}

const QuickSuppressionButton: React.FC<QuickSuppressionButtonProps> = ({
  label,
  hours,
  targetType,
  targetId,
  onSuccess,
}) => {
  const [loading, setLoading] = useState(false);

  const handleClick = async () => {
    setLoading(true);
    try {
      const endTime = hours > 0
        ? new Date(Date.now() + hours * 60 * 60 * 1000).toISOString()
        : undefined;

      const data = {
        suppression_type: 'manual' as const,
        reason: `Quick suppression for ${label}`,
        start_time: new Date().toISOString(),
        end_time: endTime,
        severity_filter: ['info', 'low', 'medium'],
        notify_on_start: true,
        notify_on_end: true,
      };

      let result: AlertSuppression;
      if (targetType === 'asset') {
        result = await alertSuppressionService.suppressAssetAlerts(targetId, data);
      } else {
        result = await alertSuppressionService.suppressDeviceAlerts(targetId, data);
      }

      onSuccess(result);
    } catch (err) {
      console.error('Failed to create suppression:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      className="quick-btn"
      onClick={handleClick}
      disabled={loading}
    >
      {loading ? (
        <span className="spinner" />
      ) : (
        label
      )}

      <style>{`
        .quick-btn {
          padding: 8px 16px;
          border: 1px solid var(--border-color, #e5e7eb);
          border-radius: 8px;
          background: var(--bg-primary, #fff);
          color: var(--text-secondary, #6b7280);
          font-size: 13px;
          cursor: pointer;
          transition: all 0.2s;
          min-width: 80px;
        }

        .quick-btn:hover {
          border-color: #d97706;
          color: #d97706;
          background: #fef3c7;
        }

        .quick-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .spinner {
          display: inline-block;
          width: 14px;
          height: 14px;
          border: 2px solid transparent;
          border-top-color: currentColor;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </button>
  );
};

export default AlertSuppressionModal;
