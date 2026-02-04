/**
 * Alert Suppression List Component
 * Displays list of active and past alert suppressions
 */

import React, { useState, useEffect } from 'react';
import { AlertSuppression } from '@/types';
import alertSuppressionService from '@/services/alertSuppressionService';

interface AlertSuppressionListProps {
  /** Filter by asset ID */
  assetId?: string;
  /** Filter by network device ID */
  networkDeviceId?: string;
  /** Filter by environment ID */
  environmentId?: string;
  /** Show only active suppressions */
  activeOnly?: boolean;
  /** Callback when a suppression is removed */
  onRemove?: (suppression: AlertSuppression) => void;
  /** Callback when a suppression is extended */
  onExtend?: (suppression: AlertSuppression) => void;
  /** Compact display mode */
  compact?: boolean;
}

const AlertSuppressionList: React.FC<AlertSuppressionListProps> = ({
  assetId,
  networkDeviceId,
  environmentId,
  activeOnly = true,
  onRemove,
  onExtend,
  compact = false,
}) => {
  const [suppressions, setSuppressions] = useState<AlertSuppression[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [extendingId, setExtendingId] = useState<string | null>(null);

  useEffect(() => {
    loadSuppressions();
  }, [assetId, networkDeviceId, environmentId, activeOnly]);

  const loadSuppressions = async () => {
    setLoading(true);
    setError(null);

    try {
      const data = await alertSuppressionService.listSuppressions({
        asset_id: assetId,
        network_device_id: networkDeviceId,
        environment_id: environmentId,
        active_only: activeOnly,
      });
      setSuppressions(data);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to load suppressions');
    } finally {
      setLoading(false);
    }
  };

  const handleRemove = async (suppression: AlertSuppression) => {
    if (!confirm('Are you sure you want to remove this suppression?')) {
      return;
    }

    setRemovingId(suppression.id);

    try {
      await alertSuppressionService.deleteSuppression(suppression.id);
      setSuppressions((prev) => prev.filter((s) => s.id !== suppression.id));
      onRemove?.(suppression);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to remove suppression');
    } finally {
      setRemovingId(null);
    }
  };

  const handleExtend = async (suppression: AlertSuppression, hours: number) => {
    setExtendingId(suppression.id);

    try {
      const updated = await alertSuppressionService.extendSuppression(suppression.id, hours);
      setSuppressions((prev) =>
        prev.map((s) => (s.id === suppression.id ? updated : s))
      );
      onExtend?.(updated);
      setExtendingId(null);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to extend suppression');
      setExtendingId(null);
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'manual':
        return (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
          </svg>
        );
      case 'scheduled':
        return (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <polyline points="12 6 12 12 16 14" />
          </svg>
        );
      case 'maintenance':
        return (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
          </svg>
        );
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <div className="suppression-list loading">
        <div className="loading-spinner" />
        <span>Loading suppressions...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="suppression-list error">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="8" x2="12" y2="12" />
          <line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
        <span>{error}</span>
        <button onClick={loadSuppressions} className="btn btn-link">
          Retry
        </button>
      </div>
    );
  }

  if (suppressions.length === 0) {
    return (
      <div className={`suppression-list empty ${compact ? 'compact' : ''}`}>
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
        <span>No active suppressions</span>
      </div>
    );
  }

  return (
    <div className={`suppression-list ${compact ? 'compact' : ''}`}>
      {suppressions.map((suppression) => (
        <div
          key={suppression.id}
          className={`suppression-item ${alertSuppressionService.isExpired(suppression) ? 'expired' : ''}`}
        >
          <div className="suppression-header">
            <div className={`type-badge type-${suppression.suppression_type}`}>
              {getTypeIcon(suppression.suppression_type)}
              <span>{suppression.suppression_type}</span>
            </div>
            <div className="time-remaining">
              {alertSuppressionService.getTimeRemaining(suppression)}
            </div>
          </div>

          {!compact && (
            <div className="suppression-details">
              <div className="detail-row">
                <span className="label">Started:</span>
                <span className="value">{formatDate(suppression.start_time)}</span>
              </div>
              {suppression.end_time && (
                <div className="detail-row">
                  <span className="label">Ends:</span>
                  <span className="value">{formatDate(suppression.end_time)}</span>
                </div>
              )}
              {suppression.reason && (
                <div className="detail-row reason">
                  <span className="label">Reason:</span>
                  <span className="value">{suppression.reason}</span>
                </div>
              )}
              {suppression.severity_filter && suppression.severity_filter.length > 0 && (
                <div className="detail-row">
                  <span className="label">Severities:</span>
                  <div className="severity-tags">
                    {suppression.severity_filter.map((sev) => (
                      <span key={sev} className={`severity-tag severity-${sev}`}>
                        {sev}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {suppression.suppressed_count > 0 && (
                <div className="detail-row">
                  <span className="label">Suppressed:</span>
                  <span className="value highlight">
                    {suppression.suppressed_count} alert{suppression.suppressed_count !== 1 ? 's' : ''}
                  </span>
                </div>
              )}
            </div>
          )}

          <div className="suppression-actions">
            {suppression.end_time && !alertSuppressionService.isExpired(suppression) && (
              <div className="extend-dropdown">
                <button
                  className="btn btn-sm btn-secondary"
                  disabled={extendingId === suppression.id}
                  onClick={() => {
                    const hours = prompt('Extend by how many hours?', '1');
                    if (hours) {
                      handleExtend(suppression, parseInt(hours));
                    }
                  }}
                >
                  {extendingId === suppression.id ? (
                    <span className="spinner-sm" />
                  ) : (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="12" cy="12" r="10" />
                      <polyline points="12 6 12 12 16 14" />
                    </svg>
                  )}
                  Extend
                </button>
              </div>
            )}
            <button
              className="btn btn-sm btn-danger"
              onClick={() => handleRemove(suppression)}
              disabled={removingId === suppression.id}
            >
              {removingId === suppression.id ? (
                <span className="spinner-sm" />
              ) : (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="3 6 5 6 21 6" />
                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                </svg>
              )}
              Remove
            </button>
          </div>
        </div>
      ))}

      <style>{`
        .suppression-list {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .suppression-list.loading,
        .suppression-list.error,
        .suppression-list.empty {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 12px;
          padding: 24px;
          background: var(--bg-secondary);
          border-radius: 8px;
          color: var(--text-secondary);
        }

        .suppression-list.error {
          color: var(--error);
          background: var(--error-bg);
        }

        .suppression-list.compact.empty {
          padding: 12px;
          font-size: 13px;
        }

        .loading-spinner {
          width: 20px;
          height: 20px;
          border: 2px solid var(--border-color);
          border-top-color: var(--primary);
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }

        .suppression-item {
          background: var(--bg-secondary);
          border: 1px solid var(--border-color);
          border-radius: 8px;
          padding: 16px;
        }

        .suppression-item.expired {
          opacity: 0.6;
        }

        .compact .suppression-item {
          padding: 12px;
        }

        .suppression-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 12px;
        }

        .compact .suppression-header {
          margin-bottom: 8px;
        }

        .type-badge {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 4px 10px;
          border-radius: 4px;
          font-size: 12px;
          font-weight: 500;
          text-transform: capitalize;
        }

        .type-manual {
          background: #e8f5e9;
          color: #2e7d32;
        }

        .type-scheduled {
          background: #e3f2fd;
          color: #1565c0;
        }

        .type-maintenance {
          background: #fff3e0;
          color: #ef6c00;
        }

        .time-remaining {
          font-size: 13px;
          color: var(--text-secondary);
          font-weight: 500;
        }

        .suppression-details {
          display: flex;
          flex-direction: column;
          gap: 8px;
          margin-bottom: 12px;
        }

        .detail-row {
          display: flex;
          align-items: flex-start;
          gap: 8px;
          font-size: 13px;
        }

        .detail-row .label {
          color: var(--text-secondary);
          min-width: 80px;
        }

        .detail-row .value {
          color: var(--text-primary);
        }

        .detail-row .value.highlight {
          color: var(--warning);
          font-weight: 500;
        }

        .detail-row.reason .value {
          flex: 1;
        }

        .severity-tags {
          display: flex;
          flex-wrap: wrap;
          gap: 4px;
        }

        .severity-tag {
          padding: 2px 6px;
          border-radius: 3px;
          font-size: 11px;
          font-weight: 500;
        }

        .severity-info { background: #e3f2fd; color: #1565c0; }
        .severity-low { background: #f3e5f5; color: #7b1fa2; }
        .severity-medium { background: #fff3e0; color: #ef6c00; }
        .severity-high { background: #ffebee; color: #c62828; }
        .severity-critical { background: #f8d7da; color: #721c24; }

        .suppression-actions {
          display: flex;
          justify-content: flex-end;
          gap: 8px;
        }

        .btn {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          border: none;
          border-radius: 6px;
          cursor: pointer;
          font-weight: 500;
          transition: all 0.2s;
        }

        .btn-sm {
          padding: 6px 12px;
          font-size: 12px;
        }

        .btn-secondary {
          background: var(--bg-tertiary);
          color: var(--text-secondary);
        }

        .btn-secondary:hover {
          background: var(--border-color);
        }

        .btn-danger {
          background: var(--error-bg);
          color: var(--error);
        }

        .btn-danger:hover {
          background: var(--error);
          color: white;
        }

        .btn-link {
          background: none;
          color: var(--primary);
          padding: 4px 8px;
        }

        .btn-link:hover {
          text-decoration: underline;
        }

        .btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .spinner-sm {
          width: 12px;
          height: 12px;
          border: 2px solid transparent;
          border-top-color: currentColor;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default AlertSuppressionList;
