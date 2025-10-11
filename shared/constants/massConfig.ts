/**
 * Mass Time Configurations for MESC Ministry
 * Includes regular masses, special monthly observances, and solemnity configurations
 */

export interface MassTimeConfig {
  time: string;
  min: number;
  max: number;
  label?: string;
  requiresProcession?: boolean;
  requiresIncense?: boolean;
}

/**
 * Regular weekly mass schedule
 */
export const REGULAR_MASS_SCHEDULE = {
  SUNDAY: [
    { time: '08:00', min: 15, max: 20, label: 'Missa das 8h' },
    { time: '10:00', min: 20, max: 28, label: 'Missa das 10h' },
    { time: '19:00', min: 20, max: 28, label: 'Missa das 19h' }
  ] as MassTimeConfig[],

  WEEKDAY: [
    { time: '06:30', min: 5, max: 8, label: 'Missa da Semana' }
  ] as MassTimeConfig[],

  SATURDAY: [
    { time: '06:30', min: 5, max: 8, label: 'Missa de Sábado' }
  ] as MassTimeConfig[],
} as const;

/**
 * Special monthly observances (First Thursday/Friday/Saturday)
 */
export const SPECIAL_MONTHLY_MASSES = {
  FIRST_THURSDAY_HEALING: {
    time: '19:30', // or 19:00 if holiday
    alternativeTime: '19:00',
    min: 20,
    max: 28,
    label: 'Cura e Libertação (1ª Quinta-feira)',
    description: 'Missa de Cura e Libertação na primeira quinta-feira do mês'
  },

  FIRST_FRIDAY_SACRED_HEART: {
    time: '06:30',
    min: 8,
    max: 12,
    label: 'Sagrado Coração (1ª Sexta-feira)',
    description: 'Devoção ao Sagrado Coração de Jesus'
  },

  FIRST_SATURDAY_IMMACULATE_HEART: {
    time: '06:30',
    min: 8,
    max: 12,
    label: 'Imaculado Coração (1º Sábado)',
    description: 'Devoção ao Imaculado Coração de Maria'
  }
} as const;

/**
 * St. Jude Thaddeus (Day 28) mass configurations
 */
export const ST_JUDE_DAY_28_MASSES = {
  WEEKDAY: [
    { time: '07:00', min: 12, max: 12, label: 'Missa da Manhã' },
    { time: '15:00', min: 12, max: 12, label: 'Missa da Tarde' },
    { time: '19:30', min: 20, max: 25, label: 'Missa da Noite' }
  ] as MassTimeConfig[],

  SATURDAY: [
    { time: '07:00', min: 12, max: 12, label: 'Missa da Manhã' },
    { time: '15:00', min: 12, max: 12, label: 'Missa da Tarde' },
    { time: '19:00', min: 20, max: 25, label: 'Missa da Noite' }
  ] as MassTimeConfig[],

  SUNDAY: [
    { time: '08:00', min: 20, max: 20, label: 'Missa das 8h' },
    { time: '10:00', min: 25, max: 28, label: 'Missa das 10h' },
    { time: '15:00', min: 18, max: 20, label: 'Missa das 15h' },
    { time: '19:00', min: 25, max: 28, label: 'Missa das 19h' }
  ] as MassTimeConfig[],

  // Special configuration for October 28 (Feast Day)
  OCTOBER_FEAST_DAY: [
    { time: '07:00', min: 12, max: 12, label: 'Missa das 7h' },
    { time: '10:00', min: 12, max: 12, label: 'Missa das 10h' },
    { time: '12:00', min: 12, max: 12, label: 'Missa do Meio-dia' },
    { time: '15:00', min: 12, max: 12, label: 'Missa das 15h' },
    { time: '17:00', min: 15, max: 15, label: 'Missa das 17h' },
    { time: '19:30', min: 20, max: 25, label: 'Missa Solene' }
  ] as MassTimeConfig[]
} as const;

/**
 * St. Jude Novena (October 20-27) mass configurations
 */
export const ST_JUDE_NOVENA_MASSES = {
  WEEKDAY: [
    { time: '19:30', min: 18, max: 20, label: 'Missa da Novena' }
  ] as MassTimeConfig[],

  SATURDAY: [
    { time: '19:00', min: 18, max: 20, label: 'Missa da Novena' }
  ] as MassTimeConfig[]
} as const;

/**
 * Solemnity mass configurations
 */
export const SOLEMNITY_MASSES = {
  // Christmas
  CHRISTMAS: {
    MIDNIGHT: {
      time: '00:00',
      min: 25,
      max: 28,
      label: 'Missa do Galo',
      description: 'Missa da Noite de Natal',
      requiresIncense: true
    },
    MORNING: {
      time: '08:00',
      min: 18,
      max: 20,
      label: 'Missa da Aurora',
      description: 'Missa da Manhã de Natal'
    },
    DAY: {
      time: '10:00',
      min: 25,
      max: 28,
      label: 'Missa do Dia',
      description: 'Missa Solene de Natal',
      requiresIncense: true
    }
  },

  // Easter
  EASTER: {
    VIGIL: {
      time: '20:00',
      min: 25,
      max: 28,
      label: 'Vigília Pascal',
      description: 'Vigília Pascal - Noite Santa',
      requiresIncense: true,
      requiresProcession: true
    },
    SUNDAY: {
      time: '10:00',
      min: 25,
      max: 28,
      label: 'Missa de Páscoa',
      description: 'Missa Solene de Páscoa',
      requiresIncense: true
    }
  },

  // Corpus Christi
  CORPUS_CHRISTI: {
    time: '10:00',
    min: 28,
    max: 28,
    processionMinisters: 10, // Additional ministers for procession
    label: 'Corpus Christi',
    description: 'Solenidade do Corpo e Sangue de Cristo',
    requiresIncense: true,
    requiresProcession: true
  },

  // Pentecost
  PENTECOST: {
    time: '10:00',
    min: 25,
    max: 28,
    label: 'Pentecostes',
    description: 'Solenidade de Pentecostes',
    requiresIncense: true
  },

  // Assumption of Mary
  ASSUMPTION: {
    time: '19:00',
    min: 20,
    max: 25,
    label: 'Assunção de Maria',
    description: 'Assunção de Nossa Senhora',
    requiresIncense: true
  },

  // Immaculate Conception
  IMMACULATE_CONCEPTION: {
    time: '19:00',
    min: 20,
    max: 25,
    label: 'Imaculada Conceição',
    description: 'Solenidade da Imaculada Conceição',
    requiresIncense: true
  },

  // All Saints
  ALL_SAINTS: {
    time: '19:00',
    min: 20,
    max: 25,
    label: 'Todos os Santos',
    description: 'Solenidade de Todos os Santos',
    requiresIncense: true
  }
} as const;

/**
 * Holy Week special masses
 */
export const HOLY_WEEK_MASSES = {
  PALM_SUNDAY: {
    time: '10:00',
    min: 25,
    max: 28,
    label: 'Domingo de Ramos',
    requiresProcession: true,
    description: 'Procissão dos Ramos'
  },

  HOLY_THURSDAY: {
    time: '19:00',
    min: 25,
    max: 28,
    label: 'Quinta-feira Santa',
    description: 'Ceia do Senhor',
    requiresIncense: true,
    requiresProcession: true // Procession to Altar of Repose
  },

  GOOD_FRIDAY: {
    time: '15:00',
    min: 25,
    max: 28,
    label: 'Sexta-feira Santa',
    description: 'Paixão do Senhor',
    requiresIncense: true
  }
} as const;

/**
 * Helper function to get mass configuration for a specific date
 */
export function getMassConfigForDate(date: Date): MassTimeConfig[] {
  const dayOfWeek = date.getDay(); // 0 = Sunday, 6 = Saturday
  const dayOfMonth = date.getDate();
  const month = date.getMonth(); // 0 = January

  // Check for St. Jude Novena (October 20-27)
  if (month === 9 && dayOfMonth >= 20 && dayOfMonth <= 27) {
    if (dayOfWeek === 6) {
      return ST_JUDE_NOVENA_MASSES.SATURDAY;
    }
    if (dayOfWeek !== 0) {
      return ST_JUDE_NOVENA_MASSES.WEEKDAY;
    }
  }

  // Check for St. Jude Feast (October 28)
  if (month === 9 && dayOfMonth === 28) {
    return ST_JUDE_DAY_28_MASSES.OCTOBER_FEAST_DAY;
  }

  // Check for Day 28 (any month except October which is handled above)
  if (dayOfMonth === 28) {
    if (dayOfWeek === 0) {
      return ST_JUDE_DAY_28_MASSES.SUNDAY;
    }
    if (dayOfWeek === 6) {
      return ST_JUDE_DAY_28_MASSES.SATURDAY;
    }
    return ST_JUDE_DAY_28_MASSES.WEEKDAY;
  }

  // Regular Sunday masses
  if (dayOfWeek === 0) {
    return REGULAR_MASS_SCHEDULE.SUNDAY;
  }

  // Regular Saturday masses
  if (dayOfWeek === 6) {
    return REGULAR_MASS_SCHEDULE.SATURDAY;
  }

  // Regular weekday masses
  return REGULAR_MASS_SCHEDULE.WEEKDAY;
}

/**
 * Check if date has special monthly observance
 */
export function getSpecialMonthlyMass(date: Date): MassTimeConfig | null {
  const dayOfWeek = date.getDay();
  const dayOfMonth = date.getDate();

  // First Thursday (Healing Mass)
  if (dayOfWeek === 4 && dayOfMonth >= 1 && dayOfMonth <= 7) {
    return SPECIAL_MONTHLY_MASSES.FIRST_THURSDAY_HEALING;
  }

  // First Friday (Sacred Heart)
  if (dayOfWeek === 5 && dayOfMonth >= 1 && dayOfMonth <= 7) {
    return SPECIAL_MONTHLY_MASSES.FIRST_FRIDAY_SACRED_HEART;
  }

  // First Saturday (Immaculate Heart)
  if (dayOfWeek === 6 && dayOfMonth >= 1 && dayOfMonth <= 7) {
    return SPECIAL_MONTHLY_MASSES.FIRST_SATURDAY_IMMACULATE_HEART;
  }

  return null;
}

/**
 * Liturgical color constants
 */
export const LITURGICAL_COLORS = {
  WHITE: {
    hex: '#FFFFFF',
    name: 'Branco',
    seasons: ['Christmas', 'Easter', 'Solemnities'],
    description: 'Pureza, alegria, glória'
  },
  RED: {
    hex: '#C41E3A',
    name: 'Vermelho',
    seasons: ['Pentecost', 'Martyrs', 'Good Friday'],
    description: 'Espírito Santo, martírio, amor'
  },
  GREEN: {
    hex: '#5C8F4F',
    name: 'Verde',
    seasons: ['Ordinary Time'],
    description: 'Esperança, crescimento espiritual'
  },
  PURPLE: {
    hex: '#8B4789',
    name: 'Roxo',
    seasons: ['Advent', 'Lent'],
    description: 'Penitência, preparação, conversão'
  },
  ROSE: {
    hex: '#FF007F',
    name: 'Rosa',
    seasons: ['Gaudete Sunday', 'Laetare Sunday'],
    description: 'Alegria no meio da preparação'
  },
  BLACK: {
    hex: '#000000',
    name: 'Preto',
    seasons: ['Good Friday', 'All Souls (optional)'],
    description: 'Luto, morte'
  }
} as const;

/**
 * Minister role requirements for special celebrations
 */
export const MINISTER_ROLE_REQUIREMENTS = {
  GOSPEL_READER: {
    solemnities: true, // Only for solemnities
    requiresTraining: true,
    minExperience: 2 // years
  },
  INCENSE_BEARER: {
    solemnities: true,
    requiresTraining: true,
    minExperience: 1
  },
  PROCESSION_LEADER: {
    specialMasses: ['Corpus Christi', 'Palm Sunday'],
    requiresTraining: true,
    minExperience: 3
  }
} as const;
