import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { parseISO } from "date-fns"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Parse a date string in YYYY-MM-DD format correctly avoiding timezone issues
 *
 * CRITICAL: JavaScript Date Parsing Behavior
 * - new Date('2025-10-12')           → Parses as UTC midnight → Oct 11 21:00 BRT ❌
 * - new Date('2025-10-12T00:00:00')  → Parses as LOCAL midnight → Oct 12 00:00 BRT ✅
 *
 * @param dateStr Date string in format YYYY-MM-DD or YYYY-MM-DDTHH:mm:ss
 * @returns Date object with correct local date (prevents timezone issues)
 */
export function parseScheduleDate(dateStr: string): Date {
  // Remove existing time component if present
  const datePart = dateStr.split('T')[0];

  // Add time component (00:00:00) to force local timezone parsing
  // This prevents the date from shifting due to UTC conversion
  return parseISO(datePart + 'T00:00:00');
}

/**
 * Formata nome com primeira letra maiúscula, exceto preposições
 * @param name Nome completo a ser formatado
 * @returns Nome formatado
 */
export function formatMinisterName(name: string | null | undefined): string {
  if (!name) return '';
  if (name === 'VACANTE') return 'VACANTE';

  // Lista de preposições e artigos que devem ficar em minúscula
  const lowercase = ['da', 'de', 'di', 'do', 'das', 'dos', 'e', 'em', 'na', 'no'];

  return name
    .toLowerCase()
    .split(' ')
    .map((word, index) => {
      // Primeira palavra sempre com maiúscula
      if (index === 0) {
        return word.charAt(0).toUpperCase() + word.slice(1);
      }
      // Preposições ficam em minúscula
      if (lowercase.includes(word)) {
        return word;
      }
      // Demais palavras com primeira letra maiúscula
      return word.charAt(0).toUpperCase() + word.slice(1);
    })
    .join(' ');
}
