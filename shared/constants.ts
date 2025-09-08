// Liturgical positions mapping
export const LITURGICAL_POSITIONS: Record<number, string> = {
  1: "Auxiliar 1 - Coordenação",
  2: "Auxiliar 2 - Coordenação",
  3: "Recolher Santíssimo 1",
  4: "Recolher Santíssimo 2",
  5: "Velas 1",
  6: "Velas 2",
  7: "Procissão com vela 1",
  8: "Procissão com vela 2",
  9: "Purificação/Exposição 1",
  10: "Purificação/Exposição 2",
  11: "Mezanino 1",
  12: "Mezanino 2",
  13: "Centro Nave 1",
  14: "Centro Nave 2",
  15: "Mezanino 3",
  16: "Lateral Nave 1",
  17: "Lateral Nave 2",
  18: "Lateral Nave 3",
  19: "Lateral Nave 4",
  20: "Lateral Nave 5"
};

// Mass times by day of week (0 = Sunday, 1 = Monday, ..., 6 = Saturday)
export const MASS_TIMES_BY_DAY: string[][] = [
  ["7h", "9h", "11h", "12h", "17h", "19h"], // Sunday
  ["7h", "12h", "19h"],                      // Monday
  ["7h", "12h", "19h"],                      // Tuesday
  ["7h", "12h", "19h"],                      // Wednesday
  ["7h", "12h", "19h"],                      // Thursday
  ["7h", "12h", "19h"],                      // Friday
  ["7h", "12h", "17h", "19h"]                // Saturday
];

// All unique mass times
export const ALL_MASS_TIMES: string[] = ["7h", "9h", "11h", "12h", "17h", "19h"];

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