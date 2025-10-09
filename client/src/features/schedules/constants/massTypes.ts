import { MassTypeInfo } from '../types';

export const MASS_TYPES = {
  DAILY: {
    type: 'Missa Diária',
    color: '#c5c6c8',
    textColor: '#2C2C2C'
  },
  DOMINICAL: {
    type: 'Missa Dominical',
    color: '#ffda9e',
    textColor: '#8B5A00'
  },
  CURA_LIBERTACAO: {
    type: 'Cura e Libertação',
    color: '#b2e2f2',
    textColor: '#0D5F7F'
  },
  SAGRADO_CORACAO: {
    type: 'Sagrado Coração de Jesus',
    color: '#fabfb7',
    textColor: '#8B3A3A'
  },
  IMACULADO_CORACAO: {
    type: 'Imaculado Coração de Maria',
    color: '#e3b1c8',
    textColor: '#6B2D5C'
  },
  NOVENA_OUTUBRO: {
    type: 'Novena de Outubro',
    color: '#fdf9c4',
    textColor: '#8B7500'
  }
} as const;

export const SUBSTITUTION_COLORS = {
  SCHEDULED: {
    color: '#959D90',
    label: 'Escalado'
  },
  PENDING: {
    color: '#610C27',
    label: 'Aguardando'
  },
  APPROVED: {
    color: '#FDCF76',
    label: 'Substituído'
  },
  VACANT: {
    color: '#D2691E',
    label: 'À confirmar'
  }
} as const;

/**
 * Determines the mass type and associated colors based on date and time
 */
export function getMassTypeAndColor(date: Date, massTime: string): MassTypeInfo {
  const dayOfWeek = date.getDay();
  const dayOfMonth = date.getDate();
  const month = date.getMonth() + 1;
  const isFirstWeek = dayOfMonth >= 1 && dayOfMonth <= 7;
  const isNovena = month === 10 && dayOfMonth >= 20 && dayOfMonth <= 27;

  // Novena de Outubro (dias 20-27)
  if (isNovena) {
    return MASS_TYPES.NOVENA_OUTUBRO;
  }

  // Domingo
  if (dayOfWeek === 0) {
    return MASS_TYPES.DOMINICAL;
  }

  // 1ª Quinta - Cura e Libertação
  if (dayOfWeek === 4 && isFirstWeek && massTime === '19:30:00') {
    return MASS_TYPES.CURA_LIBERTACAO;
  }

  // 1ª Sexta - Sagrado Coração
  if (dayOfWeek === 5 && isFirstWeek) {
    return MASS_TYPES.SAGRADO_CORACAO;
  }

  // 1º Sábado - Imaculado Coração
  if (dayOfWeek === 6 && isFirstWeek) {
    return MASS_TYPES.IMACULADO_CORACAO;
  }

  // Missa diária padrão
  return MASS_TYPES.DAILY;
}

/**
 * Returns array of mass types for legend display
 */
export function getMassTypeLegend() {
  return Object.values(MASS_TYPES);
}
