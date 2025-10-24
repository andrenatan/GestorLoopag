// Timezone offset for Brasília (GMT-3)
const BRASILIA_OFFSET_MS = -3 * 60 * 60 * 1000; // -3 hours in milliseconds

/**
 * Get current date and time in Brasília timezone (GMT-3)
 */
export function getBrasiliaDate(): Date {
  const now = new Date();
  const utcTime = now.getTime() + (now.getTimezoneOffset() * 60000);
  return new Date(utcTime + BRASILIA_OFFSET_MS);
}

/**
 * Get Brasília date string in format YYYY-MM-DD
 */
export function getBrasiliaDateString(date?: Date): string {
  const brasiliaDate = date ? convertToBrasilia(date) : getBrasiliaDate();
  return brasiliaDate.toISOString().split('T')[0];
}

/**
 * Convert any date to Brasília timezone
 */
export function convertToBrasilia(date: Date): Date {
  const utcTime = date.getTime() + (date.getTimezoneOffset() * 60000);
  return new Date(utcTime + BRASILIA_OFFSET_MS);
}

/**
 * Get Brasília time as HH:MM string
 */
export function getBrasiliaTimeString(): { hours: number; minutes: number; timeString: string } {
  const brasiliaDate = getBrasiliaDate();
  const hours = brasiliaDate.getHours();
  const minutes = brasiliaDate.getMinutes();
  const timeString = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
  
  return { hours, minutes, timeString };
}

/**
 * Get start of day in Brasília timezone
 */
export function getBrasiliaStartOfDay(date?: Date): Date {
  const brasiliaDate = date ? convertToBrasilia(date) : getBrasiliaDate();
  brasiliaDate.setHours(0, 0, 0, 0);
  return brasiliaDate;
}

/**
 * Parse YYYY-MM-DD string to Date object (assumes date is already in Brasília timezone)
 */
export function parseDateString(dateStr: string): Date {
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(year, month - 1, day);
}
