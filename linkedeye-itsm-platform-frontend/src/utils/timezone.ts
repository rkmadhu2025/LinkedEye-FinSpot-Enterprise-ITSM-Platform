/**
 * Timezone Utility
 *
 * Configures IST (Indian Standard Time) as the default timezone
 * for the ITSM platform.
 */

/**
 * Default timezone for the application
 */
export const DEFAULT_TIMEZONE = 'Asia/Kolkata'; // IST (GMT+5:30)

/**
 * Timezone display name
 */
export const TIMEZONE_NAME = 'IST';

/**
 * Timezone offset in hours
 */
export const TIMEZONE_OFFSET = '+05:30';

/**
 * Format a date to IST with default format
 * @param date - Date to format
 * @param options - Intl.DateTimeFormat options
 * @returns Formatted date string in IST
 */
export const formatDateIST = (
  date: Date | string | number,
  options?: Intl.DateTimeFormatOptions
): string => {
  const dateObj = typeof date === 'string' || typeof date === 'number' ? new Date(date) : date;

  const defaultOptions: Intl.DateTimeFormatOptions = {
    timeZone: DEFAULT_TIMEZONE,
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    ...options,
  };

  return new Intl.DateTimeFormat('en-IN', defaultOptions).format(dateObj);
};

/**
 * Format a date to IST with time
 * @param date - Date to format
 * @param includeSeconds - Include seconds in the time
 * @returns Formatted date and time string in IST
 */
export const formatDateTimeIST = (
  date: Date | string | number,
  includeSeconds: boolean = false
): string => {
  const dateObj = typeof date === 'string' || typeof date === 'number' ? new Date(date) : date;

  const options: Intl.DateTimeFormatOptions = {
    timeZone: DEFAULT_TIMEZONE,
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    ...(includeSeconds && { second: '2-digit' }),
  };

  return new Intl.DateTimeFormat('en-IN', options).format(dateObj);
};

/**
 * Format time only in IST
 * @param date - Date to format
 * @param includeSeconds - Include seconds in the time
 * @returns Formatted time string in IST
 */
export const formatTimeIST = (
  date: Date | string | number,
  includeSeconds: boolean = false
): string => {
  const dateObj = typeof date === 'string' || typeof date === 'number' ? new Date(date) : date;

  const options: Intl.DateTimeFormatOptions = {
    timeZone: DEFAULT_TIMEZONE,
    hour: '2-digit',
    minute: '2-digit',
    ...(includeSeconds && { second: '2-digit' }),
  };

  return new Intl.DateTimeFormat('en-IN', options).format(dateObj);
};

/**
 * Format relative time from now in IST
 * @param date - Date to compare
 * @returns Relative time string (e.g., "2 hours ago", "in 3 days")
 */
export const formatRelativeTimeIST = (date: Date | string | number): string => {
  const dateObj = typeof date === 'string' || typeof date === 'number' ? new Date(date) : date;
  const now = new Date();
  const diffMs = dateObj.getTime() - now.getTime();
  const diffSec = Math.round(diffMs / 1000);
  const diffMin = Math.round(diffSec / 60);
  const diffHour = Math.round(diffMin / 60);
  const diffDay = Math.round(diffHour / 24);

  if (Math.abs(diffSec) < 60) {
    return 'just now';
  } else if (Math.abs(diffMin) < 60) {
    return diffMin > 0 ? `in ${diffMin} minutes` : `${Math.abs(diffMin)} minutes ago`;
  } else if (Math.abs(diffHour) < 24) {
    return diffHour > 0 ? `in ${diffHour} hours` : `${Math.abs(diffHour)} hours ago`;
  } else if (Math.abs(diffDay) < 7) {
    return diffDay > 0 ? `in ${diffDay} days` : `${Math.abs(diffDay)} days ago`;
  } else {
    return formatDateIST(dateObj);
  }
};

/**
 * Get current date/time in IST
 * @returns Current Date object
 */
export const getCurrentDateTimeIST = (): Date => {
  return new Date();
};

/**
 * Convert UTC date to IST display string
 * @param utcDate - UTC date string
 * @returns Formatted IST date string
 */
export const utcToIST = (utcDate: string | Date): string => {
  const date = typeof utcDate === 'string' ? new Date(utcDate) : utcDate;
  return formatDateTimeIST(date);
};

/**
 * Format date for input fields (YYYY-MM-DD)
 * @param date - Date to format
 * @returns Date string in YYYY-MM-DD format
 */
export const formatDateForInput = (date: Date | string | number): string => {
  const dateObj = typeof date === 'string' || typeof date === 'number' ? new Date(date) : date;

  const year = dateObj.getFullYear();
  const month = String(dateObj.getMonth() + 1).padStart(2, '0');
  const day = String(dateObj.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
};

/**
 * Format datetime for input fields (YYYY-MM-DDTHH:mm)
 * @param date - Date to format
 * @returns Datetime string in YYYY-MM-DDTHH:mm format
 */
export const formatDateTimeForInput = (date: Date | string | number): string => {
  const dateObj = typeof date === 'string' || typeof date === 'number' ? new Date(date) : date;

  const year = dateObj.getFullYear();
  const month = String(dateObj.getMonth() + 1).padStart(2, '0');
  const day = String(dateObj.getDate()).padStart(2, '0');
  const hours = String(dateObj.getHours()).padStart(2, '0');
  const minutes = String(dateObj.getMinutes()).padStart(2, '0');

  return `${year}-${month}-${day}T${hours}:${minutes}`;
};

/**
 * Get timezone display text
 * @returns Timezone display string
 */
export const getTimezoneDisplay = (): string => {
  return `${TIMEZONE_NAME} (${TIMEZONE_OFFSET})`;
};

/**
 * Check if date is today in IST
 * @param date - Date to check
 * @returns true if date is today
 */
export const isToday = (date: Date | string | number): boolean => {
  const dateObj = typeof date === 'string' || typeof date === 'number' ? new Date(date) : date;
  const today = new Date();

  return (
    dateObj.getDate() === today.getDate() &&
    dateObj.getMonth() === today.getMonth() &&
    dateObj.getFullYear() === today.getFullYear()
  );
};

/**
 * Check if date is yesterday in IST
 * @param date - Date to check
 * @returns true if date is yesterday
 */
export const isYesterday = (date: Date | string | number): boolean => {
  const dateObj = typeof date === 'string' || typeof date === 'number' ? new Date(date) : date;
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);

  return (
    dateObj.getDate() === yesterday.getDate() &&
    dateObj.getMonth() === yesterday.getMonth() &&
    dateObj.getFullYear() === yesterday.getFullYear()
  );
};

/**
 * Format date with smart relative/absolute format
 * - "just now" for < 1 minute
 * - "X minutes/hours ago" for < 24 hours
 * - "Yesterday at HH:mm" for yesterday
 * - "DD MMM at HH:mm" for this year
 * - "DD MMM YYYY at HH:mm" for other years
 * @param date - Date to format
 * @returns Smart formatted date string
 */
export const formatSmartDateIST = (date: Date | string | number): string => {
  const dateObj = typeof date === 'string' || typeof date === 'number' ? new Date(date) : date;
  const now = new Date();
  const diffHours = (now.getTime() - dateObj.getTime()) / (1000 * 60 * 60);

  if (diffHours < 24) {
    return formatRelativeTimeIST(dateObj);
  } else if (isYesterday(dateObj)) {
    return `Yesterday at ${formatTimeIST(dateObj)}`;
  } else if (dateObj.getFullYear() === now.getFullYear()) {
    return formatDateTimeIST(dateObj).replace(/\d{4},/, '');
  } else {
    return formatDateTimeIST(dateObj);
  }
};

/**
 * Calendar date options for display
 */
export const CALENDAR_OPTIONS: Intl.DateTimeFormatOptions = {
  timeZone: DEFAULT_TIMEZONE,
  weekday: 'short',
  year: 'numeric',
  month: 'short',
  day: 'numeric',
};

/**
 * Full date-time options for detailed display
 */
export const FULL_DATETIME_OPTIONS: Intl.DateTimeFormatOptions = {
  timeZone: DEFAULT_TIMEZONE,
  weekday: 'short',
  year: 'numeric',
  month: 'long',
  day: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
};
