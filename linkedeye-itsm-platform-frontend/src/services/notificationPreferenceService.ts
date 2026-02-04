/**
 * Notification Preference Service
 * Handles API calls for user notification settings
 */

import api from './api';
import { NotificationPreference, NotificationPreferenceUpdate } from '@/types';

const BASE_URL = '/notification-preferences';

export const notificationPreferenceService = {
  /**
   * Get current user's notification preferences
   */
  async getPreferences(): Promise<NotificationPreference> {
    const response = await api.get<NotificationPreference>(BASE_URL);
    return response.data;
  },

  /**
   * Update notification preferences
   */
  async updatePreferences(data: NotificationPreferenceUpdate): Promise<NotificationPreference> {
    const response = await api.put<NotificationPreference>(BASE_URL, data);
    return response.data;
  },

  /**
   * Send a test notification to verify configuration
   */
  async sendTestNotification(): Promise<{ success: boolean; message: string; message_id?: string }> {
    const response = await api.post<{ success: boolean; message: string; message_id?: string }>(
      `${BASE_URL}/test`
    );
    return response.data;
  },

  /**
   * Reset preferences to default values
   */
  async resetPreferences(): Promise<{ message: string; preferences: NotificationPreference }> {
    const response = await api.delete<{ message: string; preferences: NotificationPreference }>(BASE_URL);
    return response.data;
  },

  /**
   * Helper to check if email notifications are enabled
   */
  isEmailEnabled(prefs: NotificationPreference): boolean {
    return prefs.email_enabled;
  },

  /**
   * Helper to check if user is in quiet hours
   */
  isQuietHours(prefs: NotificationPreference): boolean {
    if (!prefs.quiet_hours_enabled || !prefs.quiet_hours_start || !prefs.quiet_hours_end) {
      return false;
    }

    const now = new Date();
    const [startHour, startMin] = prefs.quiet_hours_start.split(':').map(Number);
    const [endHour, endMin] = prefs.quiet_hours_end.split(':').map(Number);

    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    const startMinutes = startHour * 60 + startMin;
    const endMinutes = endHour * 60 + endMin;

    // Handle overnight quiet hours (e.g., 22:00 to 07:00)
    if (startMinutes <= endMinutes) {
      return currentMinutes >= startMinutes && currentMinutes <= endMinutes;
    } else {
      return currentMinutes >= startMinutes || currentMinutes <= endMinutes;
    }
  },

  /**
   * Get severity levels for dropdown
   */
  getSeverityOptions(): { label: string; value: string }[] {
    return [
      { label: 'Critical Only', value: 'critical' },
      { label: 'High and Above', value: 'high' },
      { label: 'Medium and Above', value: 'medium' },
      { label: 'Low and Above', value: 'low' },
      { label: 'All (including Info)', value: 'info' },
    ];
  },

  /**
   * Get digest frequency options
   */
  getDigestFrequencyOptions(): { label: string; value: string }[] {
    return [
      { label: 'Hourly', value: 'hourly' },
      { label: 'Daily', value: 'daily' },
      { label: 'Weekly', value: 'weekly' },
    ];
  },

  /**
   * Get day of week options for weekly digest
   */
  getDayOfWeekOptions(): { label: string; value: number }[] {
    return [
      { label: 'Monday', value: 1 },
      { label: 'Tuesday', value: 2 },
      { label: 'Wednesday', value: 3 },
      { label: 'Thursday', value: 4 },
      { label: 'Friday', value: 5 },
      { label: 'Saturday', value: 6 },
      { label: 'Sunday', value: 7 },
    ];
  },

  /**
   * Get timezone options
   */
  getTimezoneOptions(): { label: string; value: string }[] {
    return [
      { label: 'UTC', value: 'UTC' },
      { label: 'Asia/Kolkata (IST)', value: 'Asia/Kolkata' },
      { label: 'America/New_York (EST)', value: 'America/New_York' },
      { label: 'America/Los_Angeles (PST)', value: 'America/Los_Angeles' },
      { label: 'Europe/London (GMT)', value: 'Europe/London' },
      { label: 'Europe/Paris (CET)', value: 'Europe/Paris' },
      { label: 'Asia/Tokyo (JST)', value: 'Asia/Tokyo' },
      { label: 'Asia/Singapore (SGT)', value: 'Asia/Singapore' },
      { label: 'Australia/Sydney (AEST)', value: 'Australia/Sydney' },
    ];
  },
};

export default notificationPreferenceService;
