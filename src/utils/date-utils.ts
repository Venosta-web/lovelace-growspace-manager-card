/**
 * Date and time formatting utilities for timeline components
 * Centralizes all date handling to ensure consistency across the app
 */

/**
 * Get timestamp from event (handles multiple field names for backwards compatibility)
 */
export function getEventTimestamp(event: {
  timestamp?: string;
  start_time?: string;
  date?: string;
}): number {
  const dateStr = event.timestamp || event.start_time || event.date;
  return dateStr ? new Date(dateStr).getTime() : 0;
}

/**
 * Format date as "Today", "Yesterday", or "Monday, Jan 15, 2026"
 */
export function formatRelativeDay(date: Date): string {
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  if (date.toDateString() === today.toDateString()) return 'Today';
  if (date.toDateString() === yesterday.toDateString()) return 'Yesterday';

  return date.toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

/**
 * Format time as "2:30 PM"
 */
export function formatTime(date: Date): string {
  return date.toLocaleTimeString(undefined, {
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Format as "Jan 15, 2:30 PM"
 */
export function formatDateTime(date: Date): string {
  return date.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Format as "Jan 15"
 */
export function formatShortDate(date: Date): string {
  return date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  });
}

/**
 * Format as "Jan 15, 2026"
 */
export function formatFullDate(date: Date): string {
  return date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

/**
 * Get date key for grouping events by day (e.g., "Wed Jan 15 2026")
 */
export function getDateKey(date: Date): string {
  return date.toDateString();
}

/**
 * Format duration in seconds to "5m 30s"
 */
export function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}m ${secs}s`;
}

/**
 * Parse ISO string safely, returns null on invalid input
 */
export function parseDate(isoString: string): Date | null {
  try {
    const date = new Date(isoString);
    return isNaN(date.getTime()) ? null : date;
  } catch {
    return null;
  }
}

/**
 * Format probability as percentage (e.g., 0.85 → "85%")
 */
export function formatProbability(value: number | undefined): string {
  if (value === undefined || value === null || isNaN(value)) {
    return '--%';
  }
  return `${Math.round(Number(value) * 100)}%`;
}
