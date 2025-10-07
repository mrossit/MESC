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
