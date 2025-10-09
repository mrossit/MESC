import { LITURGICAL_POSITIONS } from '@shared/constants';

/**
 * Shared utilities for all export formats
 */

export const POSITION_GROUPS = [
  { name: "AUXILIAR", positions: [1, 2] },
  { name: "RECOLHER", positions: [3, 4] },
  { name: "VELAS", positions: [5, 6] },
  { name: "ADORAÇÃO/FILA", positions: [7, 8] },
  { name: "PURIFICAR/EXPOR", positions: [9, 10, 11, 12] },
  { name: "MEZANINO", positions: [13, 14, 15] },
  { name: "CORREDOR AMBÃO", positions: [16] },
  { name: "CORREDOR CAPELA", positions: [17] },
  { name: "CORREDOR CADEIRAS", positions: [18] },
  { name: "NAVE CENTRAL PE PIO", positions: [19] },
  { name: "NAVE CENTRAL LADO MÚSICOS", positions: [20, 21] },
  { name: "NAVE CENTRAL AMBÃO", positions: [22] },
  { name: "NAVE CENTRAL CAPELA", positions: [23] },
  { name: "ÁTRIO EXTERNO", positions: [24, 25, 26, 27, 28] }
] as const;

export const TOTAL_POSITIONS = Object.keys(LITURGICAL_POSITIONS).length;

/**
 * Fetches and converts logo to base64 for embedding
 */
export async function getLogoBase64(): Promise<string> {
  try {
    const response = await fetch('/sjtlogo.png');
    const blob = await response.blob();
    return new Promise<string>((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = (reader.result as string).split(',')[1];
        resolve(`data:image/png;base64,${base64}`);
      };
      reader.readAsDataURL(blob);
    });
  } catch (error) {
    console.error('Error loading logo:', error);
    return '';
  }
}
