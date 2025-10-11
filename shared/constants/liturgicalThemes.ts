/**
 * 🕊️ LITURGICAL THEMES BY MONTH
 *
 * Monthly themes following Catholic liturgical traditions
 * Used for questionnaire theming and spiritual context
 */

export interface LiturgicalTheme {
  name: string;
  color: string;
  colorHex: string;
  description: string;
  patron?: string;
}

export const LITURGICAL_THEMES: Record<number, LiturgicalTheme> = {
  1: {
    name: 'Santíssimo Nome de Jesus',
    color: 'white',
    colorHex: '#FFFFFF',
    description: 'Celebração do Nome de Jesus e o início do ano litúrgico',
    patron: 'Jesus Cristo'
  },
  2: {
    name: 'Sagrada Família',
    color: 'white',
    colorHex: '#FFFFFF',
    description: 'Devoção à Sagrada Família - Jesus, Maria e José',
    patron: 'Sagrada Família'
  },
  3: {
    name: 'São José',
    color: 'white',
    colorHex: '#FFFFFF',
    description: 'Mês dedicado ao protetor da Igreja, São José',
    patron: 'São José'
  },
  4: {
    name: 'Eucaristia e Espírito Santo',
    color: 'white',
    colorHex: '#FFFFFF',
    description: 'Celebração da Páscoa, Eucaristia e Espírito Santo',
    patron: 'Espírito Santo'
  },
  5: {
    name: 'Virgem Maria',
    color: 'blue',
    colorHex: '#4A90E2',
    description: 'Mês mariano - devoção especial à Virgem Maria',
    patron: 'Nossa Senhora'
  },
  6: {
    name: 'Sagrado Coração de Jesus',
    color: 'red',
    colorHex: '#E53935',
    description: 'Devoção ao Sagrado Coração de Jesus e seu amor infinito',
    patron: 'Sagrado Coração'
  },
  7: {
    name: 'Preciosíssimo Sangue de Cristo',
    color: 'red',
    colorHex: '#C62828',
    description: 'Veneração do Preciosíssimo Sangue derramado por nossa salvação',
    patron: 'Sangue de Cristo'
  },
  8: {
    name: 'Vocações',
    color: 'green',
    colorHex: '#43A047',
    description: 'Reflexão sobre vocações sacerdotais e religiosas',
    patron: 'São João Maria Vianney'
  },
  9: {
    name: 'Bíblia',
    color: 'green',
    colorHex: '#388E3C',
    description: 'Mês da Bíblia - meditação e estudo da Palavra de Deus',
    patron: 'São Jerônimo'
  },
  10: {
    name: 'Rosário',
    color: 'blue',
    colorHex: '#1976D2',
    description: 'Mês do Rosário e devoção à Nossa Senhora',
    patron: 'Nossa Senhora do Rosário'
  },
  11: {
    name: 'Almas do Purgatório',
    color: 'purple',
    colorHex: '#7B1FA2',
    description: 'Orações pelas almas do purgatório e meditação sobre a eternidade',
    patron: 'Almas do Purgatório'
  },
  12: {
    name: 'Advento e Natal',
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
