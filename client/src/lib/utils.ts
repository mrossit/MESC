import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Parse a date string in YYYY-MM-DD format correctly avoiding timezone issues
 * @param dateStr Date string in format YYYY-MM-DD
 * @returns Date object with correct local date
 */
export function parseScheduleDate(dateStr: string): Date {
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(year, month - 1, day);
}
