// Liturgical positions mapping
export const LITURGICAL_POSITIONS: Record<number, string> = {
  1: "Auxiliar 1",
  2: "Auxiliar 2",
  3: "Recolher 1",
  4: "Recolher 2",
  5: "Velas 1",
  6: "Velas 2",
  7: "Adoração/Fila 1",
  8: "Adoração/Fila 2",
  9: "Purificar/Expor 1",
  10: "Purificar/Expor 2",
  11: "Purificar/Expor 3",
  12: "Purificar/Expor 4",
  13: "Mezanino 1",
  14: "Mezanino 2",
  15: "Mezanino 3",
  16: "Corredor Ambão",
  17: "Corredor Capela",
  18: "Corredor Cadeiras",
  19: "Nave central Pe Pio",
  20: "Nave central lado músicos 1",
  21: "Nave central lado músicos 2",
  22: "Nave central Ambão",
  23: "Nave central Capela",
  24: "Átrio Externo 1",
  25: "Átrio Externo 2",
  26: "Átrio Externo 3",
  27: "Átrio Externo 4",
  28: "Átrio Externo 5"
};

/**
 * Formats position display as "Posição X (Name)"
 * Example: getPositionDisplayName(1) returns "Posição 1 (Auxiliar 1)"
 */
export function getPositionDisplayName(positionNumber: number): string {
  const name = LITURGICAL_POSITIONS[positionNumber];
  if (name) {
    return `Posição ${positionNumber} (${name})`;
  }
  return `Posição ${positionNumber}`;
}

// Mass times by day of week (0 = Sunday, 1 = Monday, ..., 6 = Saturday)
// Base schedule - special rules applied by getMassTimesForDate function
export const MASS_TIMES_BY_DAY: string[][] = [
  ["08:00:00", "10:00:00", "19:00:00"], // Sunday (Domingo)
  ["06:30:00"],                          // Monday (Segunda) - 6h30 exceto novena de outubro
  ["06:30:00"],                          // Tuesday (Terça) - 6h30 exceto novena de outubro
  ["06:30:00"],                          // Wednesday (Quarta) - 6h30 exceto novena de outubro
  ["06:30:00"],                          // Thursday (Quinta) - 6h30 exceto novena de outubro
  ["06:30:00"],                          // Friday (Sexta) - 6h30 apenas (19h só na 1ª sexta)
  ["06:30:00"]                           // Saturday (Sábado) - Apenas 1º sábado (Imaculado Coração)
];

// All unique mass times
export const ALL_MASS_TIMES: string[] = ["05:00:00", "06:30:00", "07:00:00", "08:00:00", "10:00:00", "15:00:00", "17:00:00", "19:30:00"];

/**
 * Get mass times for a specific date, considering special rules:
 * - First Thursday: Adds 19:30 mass (Cura e Libertação) - all months
 * - First Friday: Adds 19:00 mass (Sagrado Coração de Jesus) - all months
 * - First Saturday: 6:30 mass (Imaculado Coração de Maria) - all months
 * - First Saturday October: Adds 16:00 mass (Preciosas do Pai)
 * - October novena (20-27): Adds 19:30 (Mon-Fri) and 19:00 (Sat) to regular masses
 */
export function getMassTimesForDate(date: Date): string[] {
  const dayOfWeek = date.getDay();
  const dayOfMonth = date.getDate();
  const month = date.getMonth() + 1; // 0-indexed, so +1
  const isFirstWeek = dayOfMonth >= 1 && dayOfMonth <= 7;
  const isNovena = month === 10 && dayOfMonth >= 20 && dayOfMonth <= 27;

  // October novena (days 20-27): Special schedule - novena masses replace morning masses
  if (isNovena) {
    if (dayOfWeek >= 1 && dayOfWeek <= 5) { // Monday to Friday
      return ["19:30:00"]; // Only evening novena mass
    }
    if (dayOfWeek === 6) { // Saturday
      return ["19:00:00"]; // Only evening novena mass (different time)
    }
  }

  // First Thursday: 6:30 + 19:30 (Cura e Libertação)
  if (dayOfWeek === 4 && isFirstWeek) {
    return ["06:30:00", "19:30:00"];
  }

  // First Friday: only 6:30 (Sagrado Coração - same morning mass)
  // No additional evening mass on first Friday

  // Saturday special rules
  if (dayOfWeek === 6) {
    // First Saturday: 6:30 (Imaculado Coração)
    if (isFirstWeek) {
      // In October: add 16:00 (Preciosas do Pai)
      if (month === 10) {
        return ["06:30:00", "16:00:00"];
      }
      return ["06:30:00"];
    }
    // Other Saturdays: no mass
    return [];
  }

  // Default schedule by day of week
  return MASS_TIMES_BY_DAY[dayOfWeek] || [];
}

// Weekday names in Portuguese
export const WEEKDAY_NAMES: string[] = [
  "Domingo",
  "Segunda-feira",
  "Terça-feira",
  "Quarta-feira",
  "Quinta-feira",
  "Sexta-feira",
  "Sábado"
];