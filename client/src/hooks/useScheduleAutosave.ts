import { useEffect, useCallback, useRef } from 'react';
import type { GenerationData } from '@/types/schedule';

const STORAGE_KEY_PREFIX = 'mesc_schedule_draft_';

function getStorageKey(year: number, month: number) {
  return `${STORAGE_KEY_PREFIX}${year}_${month}`;
}

interface AutosaveData {
  generatedData: GenerationData;
  savedAt: string;
  generationId: string | null;
}

/**
 * Hook para auto-save da escala em edição no localStorage.
 * Salva automaticamente a cada 30 segundos quando há alterações,
 * e restaura ao carregar a página.
 */
export function useScheduleAutosave(
  generatedData: GenerationData | null,
  hasUnsavedChanges: boolean,
  year: number,
  month: number,
  generationId: string | null,
) {
  const lastSavedRef = useRef<string | null>(null);

  // Auto-save no localStorage quando houver mudanças
  useEffect(() => {
    if (!generatedData || !hasUnsavedChanges) return;

    const dataStr = JSON.stringify(generatedData);
    // Evitar salvar dados idênticos
    if (dataStr === lastSavedRef.current) return;

    const timer = setTimeout(() => {
      try {
        const autosaveData: AutosaveData = {
          generatedData,
          savedAt: new Date().toISOString(),
          generationId,
        };
        const key = getStorageKey(year, month);
        localStorage.setItem(key, JSON.stringify(autosaveData));
        lastSavedRef.current = dataStr;
        console.log(`[MESC] Auto-save: escala ${month}/${year} salva localmente`);
      } catch (e) {
        console.warn('[MESC] Erro ao salvar rascunho local:', e);
      }
    }, 5000); // 5 segundos de debounce

    return () => clearTimeout(timer);
  }, [generatedData, hasUnsavedChanges, year, month, generationId]);

  // Salvar imediatamente antes de sair da página
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (generatedData && hasUnsavedChanges) {
        try {
          const autosaveData: AutosaveData = {
            generatedData,
            savedAt: new Date().toISOString(),
            generationId,
          };
          const key = getStorageKey(year, month);
          localStorage.setItem(key, JSON.stringify(autosaveData));
        } catch (e) {
          // Silencioso
        }
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    // visibilitychange para quando o app é minimizado no mobile
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') handleBeforeUnload();
    });

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [generatedData, hasUnsavedChanges, year, month, generationId]);

  // Restaurar rascunho do localStorage
  const restoreFromLocal = useCallback(
    (targetYear: number, targetMonth: number): AutosaveData | null => {
      try {
        const key = getStorageKey(targetYear, targetMonth);
        const stored = localStorage.getItem(key);
        if (!stored) return null;

        const data = JSON.parse(stored) as AutosaveData;

        // Verificar se não é muito antigo (max 7 dias)
        const savedAt = new Date(data.savedAt);
        const now = new Date();
        const diffDays = (now.getTime() - savedAt.getTime()) / (1000 * 60 * 60 * 24);
        if (diffDays > 7) {
          localStorage.removeItem(key);
          return null;
        }

        return data;
      } catch (e) {
        return null;
      }
    },
    []
  );

  // Limpar rascunho local (após salvar no servidor ou publicar)
  const clearLocalDraft = useCallback(
    (targetYear: number, targetMonth: number) => {
      const key = getStorageKey(targetYear, targetMonth);
      localStorage.removeItem(key);
      lastSavedRef.current = null;
    },
    []
  );

  // Verificar se existe rascunho local
  const hasLocalDraft = useCallback(
    (targetYear: number, targetMonth: number): boolean => {
      const key = getStorageKey(targetYear, targetMonth);
      return localStorage.getItem(key) !== null;
    },
    []
  );

  return {
    restoreFromLocal,
    clearLocalDraft,
    hasLocalDraft,
  };
}
