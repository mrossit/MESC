/**
 * 🕊️ LITURGICAL THEMES BY MONTH
 *
 * Monthly themes following Catholic liturgical traditions
 * Used for questionnaire theming and spiritual context
 */

export interface LiturgicalTheme {
  name: string;
  dedication: string; // Grammatically correct dedication phrase (e.g., "ao Rosário", "às Almas")
  color: string;
  colorHex: string;
  description: string;
  patron?: string;
}

export const LITURGICAL_THEMES: Record<number, LiturgicalTheme> = {
  1: {
    name: 'Santíssimo Nome de Jesus',
    dedication: 'ao Santíssimo Nome de Jesus', // masculine singular
    color: 'white',
    colorHex: '#FFFFFF',
    description: 'Celebração do Nome de Jesus e o início do ano litúrgico',
    patron: 'Jesus Cristo'
  },
  2: {
    name: 'Sagrada Família',
    dedication: 'à Sagrada Família', // feminine singular
    color: 'white',
    colorHex: '#FFFFFF',
    description: 'Devoção à Sagrada Família - Jesus, Maria e José',
    patron: 'Sagrada Família'
  },
  3: {
    name: 'São José',
    dedication: 'a São José', // masculine without article
    color: 'white',
    colorHex: '#FFFFFF',
    description: 'Mês dedicado ao protetor da Igreja, São José',
    patron: 'São José'
  },
  4: {
    name: 'Eucaristia e Espírito Santo',
    dedication: 'à Eucaristia e ao Espírito Santo', // feminine + masculine
    color: 'white',
    colorHex: '#FFFFFF',
    description: 'Celebração da Páscoa, Eucaristia e Espírito Santo',
    patron: 'Espírito Santo'
  },
  5: {
    name: 'Virgem Maria',
    dedication: 'à Virgem Maria', // feminine singular
    color: 'blue',
    colorHex: '#4A90E2',
    description: 'Mês mariano - devoção especial à Virgem Maria',
    patron: 'Nossa Senhora'
  },
  6: {
    name: 'Sagrado Coração de Jesus',
    dedication: 'ao Sagrado Coração de Jesus', // masculine singular
    color: 'red',
    colorHex: '#E53935',
    description: 'Devoção ao Sagrado Coração de Jesus e seu amor infinito',
    patron: 'Sagrado Coração'
  },
  7: {
    name: 'Preciosíssimo Sangue de Cristo',
    dedication: 'ao Preciosíssimo Sangue de Cristo', // masculine singular
    color: 'red',
    colorHex: '#C62828',
    description: 'Veneração do Preciosíssimo Sangue derramado por nossa salvação',
    patron: 'Sangue de Cristo'
  },
  8: {
    name: 'Vocações',
    dedication: 'às Vocações', // feminine plural
    color: 'green',
    colorHex: '#43A047',
    description: 'Reflexão sobre vocações sacerdotais e religiosas',
    patron: 'São João Maria Vianney'
  },
  9: {
    name: 'Bíblia',
    dedication: 'à Bíblia', // feminine singular
    color: 'green',
    colorHex: '#388E3C',
    description: 'Mês da Bíblia - meditação e estudo da Palavra de Deus',
    patron: 'São Jerônimo'
  },
  10: {
    name: 'Rosário',
    dedication: 'ao Santo Rosário', // masculine singular
    color: 'blue',
    colorHex: '#1976D2',
    description: 'Mês do Rosário e devoção à Nossa Senhora',
    patron: 'Nossa Senhora do Rosário'
  },
  11: {
    name: 'Almas do Purgatório',
    dedication: 'às Almas do Purgatório', // feminine plural
    color: 'purple',
    colorHex: '#7B1FA2',
    description: 'Orações pelas almas do purgatório e meditação sobre a eternidade',
    patron: 'Almas do Purgatório'
  },
  12: {
    name: 'Advento e Natal',
    dedication: 'ao Advento e ao Natal do Senhor', // both masculine
    color: 'purple/white',
    colorHex: '#673AB7',
    description: 'Preparação para o Natal e celebração do nascimento de Jesus',
    patron: 'Menino Jesus'
  }
};

/**
 * Get liturgical theme for a specific month
 */
export function getLiturgicalTheme(month: number): LiturgicalTheme | null {
  return LITURGICAL_THEMES[month] || null;
}

/**
 * Get theme color class for Tailwind CSS
 */
export function getThemeColorClass(month: number): string {
  const theme = getLiturgicalTheme(month);
  if (!theme) return 'bg-gray-100';

  const colorMap: Record<string, string> = {
    'white': 'bg-white border-2 border-gold-500',
    'blue': 'bg-blue-50 border-2 border-blue-500',
    'red': 'bg-red-50 border-2 border-red-600',
    'green': 'bg-green-50 border-2 border-green-600',
    'purple': 'bg-purple-50 border-2 border-purple-600',
    'purple/white': 'bg-gradient-to-r from-purple-50 to-white border-2 border-purple-500'
  };

  return colorMap[theme.color] || 'bg-gray-100';
}

/**
 * Get theme text color for dark text on light backgrounds
 */
export function getThemeTextColor(month: number): string {
  const theme = getLiturgicalTheme(month);
  if (!theme) return 'text-gray-900';

  const colorMap: Record<string, string> = {
    'white': 'text-gray-900',
    'blue': 'text-blue-900',
    'red': 'text-red-900',
    'green': 'text-green-900',
    'purple': 'text-purple-900',
    'purple/white': 'text-purple-900'
  };

  return colorMap[theme.color] || 'text-gray-900';
}

/**
 * Get grammatically correct month description
 *
 * Examples:
 * - November: 'Mês dedicado às Almas do Purgatório'
 * - December: 'Mês dedicado ao Advento e ao Natal do Senhor'
 * - August: 'Mês dedicado às Vocações'
 */
export function getMonthDescription(month: number): string {
  const theme = getLiturgicalTheme(month);
  if (!theme) return '';

  return `Mês dedicado ${theme.dedication}`;
}

/**
 * GRAMMAR RULES FOR DEDICATION IN PORTUGUESE:
 *
 * Masculine singular: ao/aos (ao Rosário, ao Santíssimo Nome)
 * Feminine singular: à/às (à Virgem Maria, à Bíblia)
 * Masculine plural: aos (aos Santos)
 * Feminine plural: às (às Almas, às Vocações)
 * Names without article: a (a São José, a Santa Teresinha)
 * Compound expressions: respect each part (à Eucaristia e ao Espírito Santo)
 *
 * Important notes:
 * - "Vocações" is feminine plural → às Vocações
 * - "Almas" is feminine plural → às Almas
 * - "Rosário" is masculine singular → ao Rosário
 * - "Coração" is masculine singular → ao Coração
 */

/**
 * Validate grammar concordance for all themes
 * Returns array of error messages if validation fails
 */
export function validateThemeGrammar(): string[] {
  const errors: string[] = [];

  Object.entries(LITURGICAL_THEMES).forEach(([monthStr, theme]) => {
    const month = parseInt(monthStr);

    // Check feminine plural
    if (theme.name.toLowerCase().includes('almas') && !theme.dedication.includes('às Almas')) {
      errors.push(`Month ${month} (${theme.name}): Should use 'às Almas' for feminine plural`);
    }

    if (theme.name.toLowerCase().includes('vocações') && !theme.dedication.includes('às Vocações')) {
      errors.push(`Month ${month} (${theme.name}): Should use 'às Vocações' for feminine plural`);
    }

    // Check masculine singular
    if (theme.name.toLowerCase().includes('coração') && !theme.dedication.includes('ao')) {
      errors.push(`Month ${month} (${theme.name}): Should use 'ao' for masculine singular (Coração)`);
    }

    if (theme.name.toLowerCase().includes('rosário') && !theme.dedication.includes('ao')) {
      errors.push(`Month ${month} (${theme.name}): Should use 'ao' for masculine singular (Rosário)`);
    }

    // Check for common errors
    if (theme.dedication.match(/aos.*ções\b/)) {
      errors.push(`Month ${month} (${theme.name}): Incorrect 'aos' with feminine word ending in -ções`);
    }

    if (theme.dedication.match(/ao.*\b(Maria|Família|Bíblia)\b/)) {
      errors.push(`Month ${month} (${theme.name}): Incorrect 'ao' with feminine noun (should be 'à')`);
    }
  });

  return errors;
}
