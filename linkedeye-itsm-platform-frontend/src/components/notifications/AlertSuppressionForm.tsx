/**
 * Alert Suppression Form Component
 * Form for creating/editing alert suppressions on assets or devices
 */

import React, { useState, useEffect } from 'react';
import {
  AlertSuppressionCreate,
  AlertSuppressionUpdate,
  AlertSuppression,
} from '@/types';
import alertSuppressionService from '@/services/alertSuppressionService';

interface AlertSuppressionFormProps {
  /** Asset or device ID to suppress alerts for */
  targetId: string;
  /** Type of target: 'asset' or 'network_device' */
  targetType: 'asset' | 'network_device';
  /** Target name for display */
  targetName: string;
  /** Existing suppression to edit (optional) */
  existingSuppression?: AlertSuppression;
  /** Callback when form is submitted successfully */
  onSuccess?: (suppression: AlertSuppression) => void;
  /** Callback when form is cancelled */
  onCancel?: () => void;
}

const AlertSuppressionForm: React.FC<AlertSuppressionFormProps> = ({
  targetId,
  targetType,
  targetName,
  existingSuppression,
  onSuccess,
  onCancel,
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [suppressionType, setSuppressionType] = useState<'manual' | 'scheduled' | 'maintenance'>(
    existingSuppression?.suppression_type || 'manual'
  );
  const [reason, setReason] = useState(existingSuppression?.reason || '');
  const [startTime, setStartTime] = useState<string>(() => {
    if (existingSuppression?.start_time) {
      return new Date(existingSuppression.start_time).toISOString().slice(0, 16);
    }
    return new Date().toISOString().slice(0, 16);
  });
  const [endTime, setEndTime] = useState<string>(() => {
    if (existingSuppression?.end_time) {
      return new Date(existingSuppression.end_time).toISOString().slice(0, 16);
    }
    return '';
  });
  const [selectedDuration, setSelectedDuration] = useState<number | null>(null);
  const [severityFilter, setSeverityFilter] = useState<string[]>(
    existingSuppression?.severity_filter || ['info', 'low', 'medium']
  );
  const [notifyOnStart, setNotifyOnStart] = useState(
    existingSuppression?.notify_on_start ?? true
  );
  const [notifyOnEnd, setNotifyOnEnd] = useState(
    existingSuppression?.notify_on_end ?? true
  );

  const typeOptions = alertSuppressionService.getSuppressionTypeOptions();
  const severityOptions = alertSuppressionService.getSeverityOptions();
  const durationOptions = alertSuppressionService.getQuickDurationOptions();

  const isEditing = !!existingSuppression;

  // Handle quick duration selection
  const handleDurationSelect = (hours: number) => {
    setSelectedDuration(hours);
    if (hours === 0) {
      setEndTime('');
    } else {
      const end = new Date();
      end.setHours(end.getHours() + hours);
      setEndTime(end.toISOString().slice(0, 16));
    }
  };

  // Toggle severity filter
  const toggleSeverity = (severity: string) => {
    if (severity === 'critical') {
      // Show warning for critical alerts
      return;
    }
    setSeverityFilter((prev) =>
      prev.includes(severity)
        ? prev.filter((s) => s !== severity)
        : [...prev, severity]
    );
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const data: AlertSuppressionCreate = {
        suppression_type: suppressionType,
        reason,
        start_time: new Date(startTime).toISOString(),
        end_time: endTime ? new Date(endTime).toISOString() : undefined,
        severity_filter: severityFilter,
        notify_on_start: notifyOnStart,
        notify_on_end: notifyOnEnd,
      };

      let result: AlertSuppression;

      if (isEditing && existingSuppression) {
        // Update existing suppression
        const updateData: AlertSuppressionUpdate = {
          reason,
          end_time: endTime ? new Date(endTime).toISOString() : undefined,
          severity_filter: severityFilter,
          notify_on_end: notifyOnEnd,
        };
        result = await alertSuppressionService.updateSuppression(
          existingSuppression.id,
          updateData
        );
      } else {
        // Create new suppression
        if (targetType === 'asset') {
          result = await alertSuppressionService.suppressAssetAlerts(targetId, data);
        } else {
          result = await alertSuppressionService.suppressDeviceAlerts(targetId, data);
        }
      }

      onSuccess?.(result);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to create suppression');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="alert-suppression-form">
      <div className="form-header">
        <div className="header-icon">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M18.36 6.64a9 9 0 1 1-12.73 0" />
            <line x1="12" y1="2" x2="12" y2="12" />
          </svg>
        </div>
        <div className="header-content">
          <h3>{isEditing ? 'Edit' : 'Suppress'} Alerts</h3>
          <p className="target-name">{targetName}</p>
        </div>
      </div>

      {error && (
        <div className="alert alert-error">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit}>
        {/* Suppression Type */}
        {!isEditing && (
          <div className="form-section">
            <label className="form-label">Suppression Type</label>
            <div className="type-options">
              {typeOptions.map((option) => (
                <label
                  key={option.value}
                  className={`type-option ${suppressionType === option.value ? 'selected' : ''}`}
                >
                  <input
                    type="radio"
                    name="suppressionType"
                    value={option.value}
                    checked={suppressionType === option.value}
                    onChange={(e) => setSuppressionType(e.target.value as any)}
                  />
                  <span className="option-label">{option.label}</span>
                  <span className="option-description">{option.description}</span>
                </label>
              ))}
            </div>
          </div>
        )}

        {/* Duration Selection */}
        {suppressionType === 'scheduled' && (
          <div className="form-section">
            <label className="form-label">Quick Duration</label>
            <div className="duration-options">
              {durationOptions.map((option) => (
                <button
                  key={option.hours}
                  type="button"
                  className={`duration-btn ${selectedDuration === option.hours ? 'selected' : ''}`}
                  onClick={() => handleDurationSelect(option.hours)}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Custom Date/Time */}
        {(suppressionType === 'scheduled' || suppressionType === 'maintenance') && (
          <div className="form-section">
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Start Time</label>
                <input
                  type="datetime-local"
                  className="form-input"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  disabled={isEditing}
                />
              </div>
              <div className="form-group">
                <label className="form-label">End Time (optional)</label>
                <input
                  type="datetime-local"
                  className="form-input"
                  value={endTime}
                  onChange={(e) => {
                    setEndTime(e.target.value);
                    setSelectedDuration(null);
                  }}
                  min={startTime}
                />
              </div>
            </div>
          </div>
        )}

        {/* Reason */}
        <div className="form-section">
          <label className="form-label">Reason</label>
          <textarea
            className="form-input form-textarea"
            placeholder="Enter reason for suppression (e.g., scheduled maintenance, known issue)..."
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={3}
          />
        </div>

        {/* Severity Filter */}
        <div className="form-section">
          <label className="form-label">Suppress Alert Severities</label>
          <div className="severity-checkboxes">
            {severityOptions.map((option) => (
              <label
                key={option.value}
                className={`severity-checkbox ${option.value === 'critical' ? 'disabled' : ''} ${
                  severityFilter.includes(option.value) ? 'checked' : ''
                }`}
              >
                <input
                  type="checkbox"
                  checked={severityFilter.includes(option.value)}
                  onChange={() => toggleSeverity(option.value)}
                  disabled={option.value === 'critical'}
                />
                <span className={`severity-badge severity-${option.value}`}>
                  {option.label}
                </span>
              </label>
            ))}
          </div>
          <p className="form-hint warning">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
              <line x1="12" y1="9" x2="12" y2="13" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
            Critical alerts cannot be suppressed for safety
          </p>
        </div>

        {/* Notification Options */}
        <div className="form-section">
          <label className="form-label">Notification Options</label>
          <div className="checkbox-group">
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={notifyOnStart}
                onChange={(e) => setNotifyOnStart(e.target.checked)}
                disabled={isEditing}
              />
              <span>Notify when suppression starts</span>
            </label>
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={notifyOnEnd}
                onChange={(e) => setNotifyOnEnd(e.target.checked)}
              />
              <span>Notify when suppression ends</span>
            </label>
          </div>
        </div>

        {/* Actions */}
        <div className="form-actions">
          <button
            type="button"
            className="btn btn-secondary"
            onClick={onCancel}
            disabled={loading}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="btn btn-primary"
            disabled={loading}
          >
            {loading ? (
              <>
                <span className="spinner" />
                {isEditing ? 'Updating...' : 'Suppressing...'}
              </>
            ) : (
              <>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M18.36 6.64a9 9 0 1 1-12.73 0" />
                  <line x1="12" y1="2" x2="12" y2="12" />
                </svg>
                {isEditing ? 'Update Suppression' : 'Suppress Alerts'}
              </>
            )}
          </button>
        </div>
      </form>

      <style>{`
        .alert-suppression-form {
          background: var(--bg-primary);
          border-radius: 12px;
          padding: 24px;
          max-width: 600px;
        }

        .form-header {
          display: flex;
          align-items: flex-start;
          gap: 16px;
          margin-bottom: 24px;
          padding-bottom: 16px;
          border-bottom: 1px solid var(--border-color);
        }

        .header-icon {
          width: 48px;
          height: 48px;
          border-radius: 12px;
          background: var(--warning-bg);
          color: var(--warning);
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .header-content h3 {
          margin: 0 0 4px 0;
          font-size: 18px;
          font-weight: 600;
          color: var(--text-primary);
        }

        .target-name {
          margin: 0;
          color: var(--text-secondary);
          font-size: 14px;
        }

        .alert {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 12px 16px;
          border-radius: 8px;
          margin-bottom: 16px;
          font-size: 14px;
        }

        .alert-error {
          background: var(--error-bg);
          color: var(--error);
          border: 1px solid var(--error);
        }

        .form-section {
          margin-bottom: 20px;
        }

        .form-label {
          display: block;
          font-weight: 500;
          color: var(--text-primary);
          margin-bottom: 8px;
          font-size: 14px;
        }

        .form-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 16px;
        }

        .type-options {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .type-option {
          display: flex;
          flex-direction: column;
          padding: 12px 16px;
          border: 2px solid var(--border-color);
          border-radius: 8px;
          cursor: pointer;
          transition: all 0.2s;
        }

        .type-option:hover {
          border-color: var(--primary);
          background: var(--bg-secondary);
        }

        .type-option.selected {
          border-color: var(--primary);
          background: var(--primary-bg);
        }

        .type-option input {
          display: none;
        }

        .option-label {
          font-weight: 500;
          color: var(--text-primary);
          margin-bottom: 2px;
        }

        .option-description {
          font-size: 12px;
          color: var(--text-secondary);
        }

        .duration-options {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
        }

        .duration-btn {
          padding: 8px 12px;
          border: 1px solid var(--border-color);
          border-radius: 6px;
          background: var(--bg-primary);
          color: var(--text-secondary);
          font-size: 13px;
          cursor: pointer;
          transition: all 0.2s;
        }

        .duration-btn:hover {
          border-color: var(--primary);
          color: var(--primary);
        }

        .duration-btn.selected {
          border-color: var(--primary);
          background: var(--primary);
          color: white;
        }

        .form-input {
          width: 100%;
          padding: 10px 12px;
          border: 1px solid var(--border-color);
          border-radius: 8px;
          background: var(--bg-primary);
          color: var(--text-primary);
          font-size: 14px;
          transition: border-color 0.2s;
        }

        .form-input:focus {
          outline: none;
          border-color: var(--primary);
        }

        .form-textarea {
          resize: vertical;
          min-height: 80px;
        }

        .severity-checkboxes {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
        }

        .severity-checkbox {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 12px;
          border: 1px solid var(--border-color);
          border-radius: 6px;
          cursor: pointer;
          transition: all 0.2s;
        }

        .severity-checkbox.checked {
          border-color: var(--primary);
          background: var(--primary-bg);
        }

        .severity-checkbox.disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .severity-checkbox input {
          display: none;
        }

        .severity-badge {
          padding: 2px 8px;
          border-radius: 4px;
          font-size: 12px;
          font-weight: 500;
        }

        .severity-info { background: #e3f2fd; color: #1565c0; }
        .severity-low { background: #f3e5f5; color: #7b1fa2; }
        .severity-medium { background: #fff3e0; color: #ef6c00; }
        .severity-high { background: #ffebee; color: #c62828; }
        .severity-critical { background: #f8d7da; color: #721c24; }

        .form-hint {
          margin-top: 8px;
          font-size: 12px;
          color: var(--text-secondary);
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .form-hint.warning {
          color: var(--warning);
        }

        .checkbox-group {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .checkbox-label {
          display: flex;
          align-items: center;
          gap: 8px;
          cursor: pointer;
          font-size: 14px;
          color: var(--text-secondary);
        }

        .checkbox-label input[type="checkbox"] {
          width: 16px;
          height: 16px;
          accent-color: var(--primary);
        }

        .form-actions {
          display: flex;
          justify-content: flex-end;
          gap: 12px;
          margin-top: 24px;
          padding-top: 16px;
          border-top: 1px solid var(--border-color);
        }

        .btn {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 10px 20px;
          border-radius: 8px;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
          border: none;
        }

        .btn-secondary {
          background: var(--bg-secondary);
          color: var(--text-secondary);
        }

        .btn-secondary:hover {
          background: var(--bg-tertiary);
        }

        .btn-primary {
          background: var(--warning);
          color: white;
        }

        .btn-primary:hover {
          opacity: 0.9;
        }

        .btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .spinner {
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
    </div>
  );
};

export default AlertSuppressionForm;
