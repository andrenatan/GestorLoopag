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

// en-CA formats as YYYY-MM-DD
const BRASILIA_DATE_FORMATTER = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'America/Sao_Paulo',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

/**
 * Get Brasília date string in format YYYY-MM-DD.
 * Uses the IANA timezone directly so the result doesn't depend on the
 * process timezone (toISOString() on a shifted Date returned the next day
 * after 21:00 when the server itself ran in GMT-3).
 */
export function getBrasiliaDateString(date?: Date): string {
  return BRASILIA_DATE_FORMATTER.format(date ?? new Date());
}

/**
 * Format a Date's local calendar fields as YYYY-MM-DD (for dates built with
 * parseDateString / date arithmetic, which are local-midnight values).
 */
export function formatLocalDateString(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
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
