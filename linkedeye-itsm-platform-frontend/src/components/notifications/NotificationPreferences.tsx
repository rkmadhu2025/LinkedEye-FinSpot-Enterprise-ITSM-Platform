/**
 * Notification Preferences Component
 * Form for managing user notification settings
 */

import { useState, useEffect } from 'react';
import {
  Card,
  CardHeader,
  CardBody,
  Button,
  Input,
  Badge,
  Spinner,
} from '@/components/ui';
import { notificationPreferenceService } from '@/services/notificationPreferenceService';
import { NotificationPreference, NotificationPreferenceUpdate } from '@/types';
import toast from 'react-hot-toast';
import {
  Bell,
  Mail,
  MessageSquare,
  Clock,
  Calendar,
  Shield,
  Save,
  Send,
  RotateCcw,
} from 'lucide-react';

interface NotificationPreferencesProps {
  onSave?: (prefs: NotificationPreference) => void;
}

const NotificationPreferences = ({ onSave }: NotificationPreferencesProps) => {
  const [preferences, setPreferences] = useState<NotificationPreference | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);

  const severityOptions = notificationPreferenceService.getSeverityOptions();
  const digestFrequencyOptions = notificationPreferenceService.getDigestFrequencyOptions();
  const dayOfWeekOptions = notificationPreferenceService.getDayOfWeekOptions();
  const timezoneOptions = notificationPreferenceService.getTimezoneOptions();

  useEffect(() => {
    fetchPreferences();
  }, []);

  const fetchPreferences = async () => {
    try {
      setIsLoading(true);
      const data = await notificationPreferenceService.getPreferences();
      setPreferences(data);
    } catch (error) {
      console.error('Failed to fetch preferences:', error);
      toast.error('Failed to load notification preferences');
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (field: keyof NotificationPreferenceUpdate, value: unknown) => {
    if (!preferences) return;
    setPreferences({ ...preferences, [field]: value });
  };

  const handleSave = async () => {
    if (!preferences) return;

    try {
      setIsSaving(true);
      const updateData: NotificationPreferenceUpdate = {
        email_enabled: preferences.email_enabled,
        in_app_enabled: preferences.in_app_enabled,
        slack_enabled: preferences.slack_enabled,
        webhook_enabled: preferences.webhook_enabled,
        incident_notifications: preferences.incident_notifications,
        change_notifications: preferences.change_notifications,
        problem_notifications: preferences.problem_notifications,
        alert_notifications: preferences.alert_notifications,
        asset_notifications: preferences.asset_notifications,
        sla_notifications: preferences.sla_notifications,
        min_severity_email: preferences.min_severity_email,
        min_severity_in_app: preferences.min_severity_in_app,
        quiet_hours_enabled: preferences.quiet_hours_enabled,
        quiet_hours_start: preferences.quiet_hours_start,
        quiet_hours_end: preferences.quiet_hours_end,
        quiet_hours_timezone: preferences.quiet_hours_timezone,
        quiet_hours_bypass_critical: preferences.quiet_hours_bypass_critical,
        digest_enabled: preferences.digest_enabled,
        digest_frequency: preferences.digest_frequency,
        digest_time: preferences.digest_time,
        digest_day_of_week: preferences.digest_day_of_week,
        slack_webhook_url: preferences.slack_webhook_url,
        slack_channel: preferences.slack_channel,
        custom_webhook_url: preferences.custom_webhook_url,
        group_similar_alerts: preferences.group_similar_alerts,
        max_alerts_per_hour: preferences.max_alerts_per_hour,
        escalation_enabled: preferences.escalation_enabled,
      };

      const updated = await notificationPreferenceService.updatePreferences(updateData);
      setPreferences(updated);
      toast.success('Notification preferences saved');
      onSave?.(updated);
    } catch (error) {
      console.error('Failed to save preferences:', error);
      toast.error('Failed to save preferences');
    } finally {
      setIsSaving(false);
    }
  };

  const handleTestNotification = async () => {
    try {
      setIsTesting(true);
      const result = await notificationPreferenceService.sendTestNotification();
      if (result.success) {
        toast.success(result.message);
      } else {
        toast.error(result.message);
      }
    } catch (error) {
      console.error('Failed to send test:', error);
      toast.error('Failed to send test notification');
    } finally {
      setIsTesting(false);
    }
  };

  const handleReset = async () => {
    if (!confirm('Are you sure you want to reset all preferences to defaults?')) return;

    try {
      setIsSaving(true);
      const result = await notificationPreferenceService.resetPreferences();
      setPreferences(result.preferences);
      toast.success('Preferences reset to defaults');
    } catch (error) {
      console.error('Failed to reset:', error);
      toast.error('Failed to reset preferences');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!preferences) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Failed to load preferences</p>
        <Button onClick={fetchPreferences} className="mt-4">Retry</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Notification Channels */}
      <Card>
        <CardHeader className="flex items-center gap-2">
          <Bell size={20} />
          Notification Channels
        </CardHeader>
        <CardBody className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center gap-3">
              <Mail size={20} className="text-blue-500" />
              <div>
                <p className="font-medium">Email Notifications</p>
                <p className="text-sm text-gray-500">Receive notifications via email</p>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={preferences.email_enabled}
                onChange={(e) => handleChange('email_enabled', e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>

          {preferences.email_enabled && (
            <div className="ml-8 p-3 border-l-2 border-blue-200">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Minimum Severity for Email
              </label>
              <select
                value={preferences.min_severity_email}
                onChange={(e) => handleChange('min_severity_email', e.target.value)}
                className="w-full max-w-xs px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                {severityOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
          )}

          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center gap-3">
              <Bell size={20} className="text-green-500" />
              <div>
                <p className="font-medium">In-App Notifications</p>
                <p className="text-sm text-gray-500">Show notifications in the application</p>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={preferences.in_app_enabled}
                onChange={(e) => handleChange('in_app_enabled', e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>

          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center gap-3">
              <MessageSquare size={20} className="text-purple-500" />
              <div>
                <p className="font-medium">Slack Notifications</p>
                <p className="text-sm text-gray-500">Send notifications to Slack</p>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={preferences.slack_enabled}
                onChange={(e) => handleChange('slack_enabled', e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>

          {preferences.slack_enabled && (
            <div className="ml-8 p-3 border-l-2 border-purple-200 space-y-3">
              <Input
                label="Slack Webhook URL"
                type="password"
                value={preferences.slack_webhook_url || ''}
                onChange={(e) => handleChange('slack_webhook_url', e.target.value)}
                placeholder="https://hooks.slack.com/services/..."
              />
              <Input
                label="Slack Channel (optional)"
                value={preferences.slack_channel || ''}
                onChange={(e) => handleChange('slack_channel', e.target.value)}
                placeholder="#alerts"
              />
            </div>
          )}
        </CardBody>
      </Card>

      {/* Event Types */}
      <Card>
        <CardHeader className="flex items-center gap-2">
          <Shield size={20} />
          Event Types
        </CardHeader>
        <CardBody>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {[
              { key: 'incident_notifications', label: 'Incidents' },
              { key: 'change_notifications', label: 'Changes' },
              { key: 'problem_notifications', label: 'Problems' },
              { key: 'alert_notifications', label: 'Alerts' },
              { key: 'asset_notifications', label: 'Assets' },
              { key: 'sla_notifications', label: 'SLA Warnings' },
            ].map((event) => (
              <label
                key={event.key}
                className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100"
              >
                <input
                  type="checkbox"
                  checked={preferences[event.key as keyof NotificationPreference] as boolean}
                  onChange={(e) => handleChange(event.key as keyof NotificationPreferenceUpdate, e.target.checked)}
                  className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                />
                <span className="text-sm font-medium">{event.label}</span>
              </label>
            ))}
          </div>
        </CardBody>
      </Card>

      {/* Quiet Hours */}
      <Card>
        <CardHeader className="flex items-center gap-2">
          <Clock size={20} />
          Quiet Hours
        </CardHeader>
        <CardBody className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Enable Quiet Hours</p>
              <p className="text-sm text-gray-500">Pause non-critical notifications during specified hours</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={preferences.quiet_hours_enabled}
                onChange={(e) => handleChange('quiet_hours_enabled', e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>

          {preferences.quiet_hours_enabled && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-gray-50 rounded-lg">
              <Input
                label="Start Time"
                type="time"
                value={preferences.quiet_hours_start || '22:00'}
                onChange={(e) => handleChange('quiet_hours_start', e.target.value)}
              />
              <Input
                label="End Time"
                type="time"
                value={preferences.quiet_hours_end || '07:00'}
                onChange={(e) => handleChange('quiet_hours_end', e.target.value)}
              />
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Timezone</label>
                <select
                  value={preferences.quiet_hours_timezone}
                  onChange={(e) => handleChange('quiet_hours_timezone', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  {timezoneOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {preferences.quiet_hours_enabled && (
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={preferences.quiet_hours_bypass_critical}
                onChange={(e) => handleChange('quiet_hours_bypass_critical', e.target.checked)}
                className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
              />
              <span className="text-sm">Always deliver critical alerts during quiet hours</span>
            </label>
          )}
        </CardBody>
      </Card>

      {/* Email Digest */}
      <Card>
        <CardHeader className="flex items-center gap-2">
          <Calendar size={20} />
          Email Digest
        </CardHeader>
        <CardBody className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Enable Email Digest</p>
              <p className="text-sm text-gray-500">Receive a summary of activities at regular intervals</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={preferences.digest_enabled}
                onChange={(e) => handleChange('digest_enabled', e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>

          {preferences.digest_enabled && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-gray-50 rounded-lg">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Frequency</label>
                <select
                  value={preferences.digest_frequency}
                  onChange={(e) => handleChange('digest_frequency', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  {digestFrequencyOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>
              <Input
                label="Time"
                type="time"
                value={preferences.digest_time || '09:00'}
                onChange={(e) => handleChange('digest_time', e.target.value)}
              />
              {preferences.digest_frequency === 'weekly' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Day of Week</label>
                  <select
                    value={preferences.digest_day_of_week}
                    onChange={(e) => handleChange('digest_day_of_week', Number(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    {dayOfWeekOptions.map((opt) => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          )}
        </CardBody>
      </Card>

      {/* Actions */}
      <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            leftIcon={<Send size={16} />}
            onClick={handleTestNotification}
            isLoading={isTesting}
          >
            Send Test Notification
          </Button>
          <Button
            variant="outline"
            leftIcon={<RotateCcw size={16} />}
            onClick={handleReset}
          >
            Reset to Defaults
          </Button>
        </div>
        <Button
          leftIcon={<Save size={16} />}
          onClick={handleSave}
          isLoading={isSaving}
        >
          Save Preferences
        </Button>
      </div>
    </div>
  );
};

export default NotificationPreferences;
