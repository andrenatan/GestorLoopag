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
  const year = brasiliaDate.getFullYear();
  const month = String(brasiliaDate.getMonth() + 1).padStart(2, '0');
  const day = String(brasiliaDate.getDate()).padStart(2, '0');
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

/**
 * Format date string from YYYY-MM-DD to DD/MM/YYYY
 */
export function formatDateString(dateStr: string): string {
  const [year, month, day] = dateStr.split('-');
  return `${day}/${month}/${year}`;
}
