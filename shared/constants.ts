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

// Mass times by day of week (0 = Sunday, 1 = Monday, ..., 6 = Saturday)
// Base schedule - special rules applied by getMassTimesForDate function
export const MASS_TIMES_BY_DAY: string[][] = [
  ["08:00:00", "10:00:00", "19:00:00"], // Sunday (Domingo)
  ["06:30:00"],                          // Monday (Segunda) - 6h30 exceto novena de outubro
  ["06:30:00"],                          // Tuesday (Terça) - 6h30 exceto novena de outubro
  ["06:30:00"],                          // Wednesday (Quarta) - 6h30 exceto novena de outubro
  ["06:30:00"],                          // Thursday (Quinta) - 6h30 exceto novena de outubro
  ["06:30:00", "19:00:00"],             // Friday (Sexta) - 6h30 + 19h (Sagrado Coração)
  ["06:30:00"]                           // Saturday (Sábado) - Apenas 1º sábado (Imaculado Coração)
];

// All unique mass times
export const ALL_MASS_TIMES: string[] = ["06:30:00", "08:00:00", "10:00:00", "19:00:00", "19:30:00"];

/**
 * Get mass times for a specific date, considering special rules:
 * - Saturdays: Only first Saturday of month has 6:30 mass (Immaculate Heart of Mary)
 * - October novena (20-27): Weekday morning mass (6:30) replaced by evening mass (19:30)
 */
export function getMassTimesForDate(date: Date): string[] {
  const dayOfWeek = date.getDay();
  const dayOfMonth = date.getDate();
  const month = date.getMonth() + 1; // 0-indexed, so +1

  // Saturday special rule: Only first Saturday has mass
  if (dayOfWeek === 6) {
    // First Saturday of the month (between day 1-7)
    if (dayOfMonth >= 1 && dayOfMonth <= 7) {
      return ["06:30:00"];
    }
    // Other Saturdays: no mass
    return [];
  }

  // October novena (days 20-27): Replace 6:30 with 19:30 on weekdays
  if (month === 10 && dayOfMonth >= 20 && dayOfMonth <= 27) {
    if (dayOfWeek >= 1 && dayOfWeek <= 4) { // Monday to Thursday
      return ["19:30:00"];
    }
    // Friday during novena: keep 19:00 (Sagrado Coração)
    if (dayOfWeek === 5) {
      return ["19:00:00", "19:30:00"];
    }
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