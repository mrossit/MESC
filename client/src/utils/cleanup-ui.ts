/**
 * Script de limpeza de UI - Remove elementos desnecessários
 * Executado no boot do front-end para garantir que dicas/banners/previews sejam ocultados
 */

export function cleanupUnnecessaryElements() {
  // Seletores de elementos a remover/ocultar
  const selectorsToRemove = [
    '.tip',
    '.hint',
    '.help',
    '.banner-tip',
    '.info-tip',
    '.help-block',
    '.tutorial',
    '.onboarding-tip',
    '.preview-banner',
    '[data-tip]',
    '[data-hint]',
    '[data-preview]',
    '[data-demo]',
    '[data-onboarding]',
    '.alert-demo',
    '.alert-preview',
    '.dbg-banner'
  ];

  // Strings de texto a detectar e remover elementos contendo
  const textPatternsToRemove = [
    'Clique em qualquer dia do calendário',
    '💡 Dica',
    'Lorem ipsum',
    'This is a preview',
    'Modo Preview',
    'Preview mode'
  ];

  try {
    // Remover elementos por seletor
    selectorsToRemove.forEach(selector => {
      const elements = document.querySelectorAll(selector);
      elements.forEach(el => {
        (el as HTMLElement).classList.add('oculto-global');
      });
    });

    // Remover elementos por conteúdo de texto
    textPatternsToRemove.forEach(pattern => {
      const allElements = document.querySelectorAll('*');
      allElements.forEach(el => {
        if (el.textContent?.includes(pattern)) {
          // Verificar se é um elemento de dica/banner (não remover se for conteúdo essencial)
          const tagName = el.tagName.toLowerCase();
          const classList = (el as HTMLElement).className || '';

          if (
            tagName === 'div' ||
            tagName === 'p' ||
            tagName === 'span' ||
            classList.includes('banner') ||
            classList.includes('alert') ||
            classList.includes('tip') ||
            classList.includes('help')
          ) {
            (el as HTMLElement).classList.add('oculto-global');
          }
        }
      });
    });

    // Remover elementos com aria-label contendo "dica" ou "help"
    const ariaElements = document.querySelectorAll('[aria-label*="dica" i], [aria-label*="help" i]');
    ariaElements.forEach(el => {
      (el as HTMLElement).classList.add('oculto-global');
    });

    console.log('[UI Cleanup] Elementos desnecessários removidos com sucesso');
  } catch (error) {
    console.error('[UI Cleanup] Erro ao limpar elementos:', error);
  }
}

// Auto-executar quando DOM estiver pronto
if (typeof window !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', cleanupUnnecessaryElements);
  } else {
    cleanupUnnecessaryElements();
  }
}
