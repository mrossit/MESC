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
  14: "####",
  15: "####",
  16: "####",
  17: "####",
  18: "####",
  19: "####",
  20: "####"
};

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
export const ALL_MASS_TIMES: string[] = ["06:30:00", "08:00:00", "10:00:00", "16:00:00", "19:00:00", "19:30:00"];

/**
 * PADRÃO SISTÊMICO DE FORMATO DE HORÁRIO
 *
 * Todos os horários no sistema DEVEM usar o formato HH:MM:SS (com segundos)
 * Exemplos: "08:00:00", "10:00:00", "19:00:00", "19:30:00"
 *
 * NUNCA use "08:00" ou "10:00" sem os segundos, pois isso causa incompatibilidade
 * com os dados armazenados no banco de dados PostgreSQL (tipo TIME).
 *
 * Para exibição ao usuário, use: time.substring(0, 5) → "08:00"
 * Para comparação/filtros: mantenha o formato completo "08:00:00"
 *
 * IMPORTANTE: Os horários são DINÂMICOS por dia!
 * - Domingos: 08:00:00, 10:00:00, 19:00:00
 * - Quinta-feira (1ª): 06:30:00, 19:30:00 (Cura e Libertação)
 * - Dias de semana: geralmente 06:30:00
 * - Outubro (dias 19-27): 06:30:00, 19:00:00 (Novena)
 *
 * SEMPRE busque os horários do banco de dados para cada dia específico,
 * NUNCA assuma horários fixos!
 */
export const TIME_FORMAT_STANDARD = "HH:MM:SS";
export const TIME_FORMAT_DISPLAY = "HH:MM";

/**
 * Função helper para formatar horário para exibição
 * Converte "08:00:00" → "08:00"
 */
export function formatTimeForDisplay(time: string): string {
  return time.substring(0, 5);
}

/**
 * Função helper para garantir formato completo de horário
 * Converte "08:00" → "08:00:00"
 */
export function ensureFullTimeFormat(time: string): string {
  return time.length === 5 ? `${time}:00` : time;
}

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