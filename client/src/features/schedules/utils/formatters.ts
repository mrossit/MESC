/**
 * Formatting utilities for schedule display
 */

/**
 * Capitalizes first letter of a string
 */
export function capitalizeFirst(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * Formats time from "HH:MM:SS" to "HH:MM"
 */
export function formatMassTime(time: string): string {
  return time.substring(0, 5);
}

/**
 * Normalizes mass time formats
 * Converts "6h30", "06:30:00", "06:30" to "06:30:00" for comparison
 */
export function normalizeMassTime(time: string): string {
  // Se já está no formato HH:MM:SS
  if (time.match(/^\d{2}:\d{2}:\d{2}$/)) {
    return time;
  }

  // Se está no formato "6h30", "19h30"
  if (time.includes('h')) {
    const [hours, minutes] = time.split('h');
    return `${hours.padStart(2, '0')}:${minutes.padStart(2, '0')}:00`;
  }

  // Se está no formato "06:30"
  if (time.match(/^\d{2}:\d{2}$/)) {
    return `${time}:00`;
  }

  return time;
}

/**
 * Gets minister initials for avatar fallback
 */
export function getMinisterInitials(name: string): string {
  return name
    .split(' ')
    .map(n => n[0])
    .join('')
    .substring(0, 2)
    .toUpperCase();
}

/**
 * Formats schedule status for display
 */
export function getStatusLabel(status: string): string {
  switch (status) {
    case "draft": return "Rascunho";
    case "published": return "Publicada";
    case "completed": return "Concluída";
    default: return status;
  }
}
