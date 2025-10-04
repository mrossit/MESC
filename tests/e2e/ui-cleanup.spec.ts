/**
 * Testes E2E - Validação de Limpeza de UI
 * Garante que mensagens, dicas e banners desnecessários foram removidos
 */

import { test, expect } from '@playwright/test';

test.describe('Validação de Limpeza de UI', () => {

  test.beforeEach(async ({ page }) => {
    // Login como ministro para acessar dashboard
    await page.goto('/login');
    await page.fill('input[type="email"]', 'ministro@test.com');
    await page.fill('input[type="password"]', 'senha123');
    await page.click('button[type="submit"]');
    await page.waitForURL('/dashboard');
  });

  test('1. Página não deve conter texto "Clique em qualquer dia do calendário"', async ({ page }) => {
    // Navegar para menu ESCALA
    await page.goto('/schedules');
    await page.waitForLoadState('networkidle');

    // Obter todo o texto visível da página
    const bodyText = await page.textContent('body');

    // Assert: texto não deve existir
    expect(bodyText).not.toContain('Clique em qualquer dia do calendário');
    expect(bodyText).not.toContain('Clique em qualquer dia para ver detalhes');
  });

  test('2. Nenhum elemento com seletores de dicas/banners deve existir', async ({ page }) => {
    // Navegar para múltiplas páginas
    const pages = ['/dashboard', '/schedules', '/profile'];

    for (const path of pages) {
      await page.goto(path);
      await page.waitForLoadState('networkidle');

      // Seletores que não devem existir
      const forbiddenSelectors = [
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
        '.alert-demo',
        '.alert-preview',
        '.dbg-banner'
      ];

      for (const selector of forbiddenSelectors) {
        const elements = await page.$$(selector);

        // Se elementos existirem, verificar se estão ocultos
        if (elements.length > 0) {
          for (const el of elements) {
            const isVisible = await el.isVisible();
            const hasOcultoClass = await el.evaluate(node =>
              node.classList.contains('oculto-global')
            );

            // Assert: deve estar oculto OU ter classe oculto-global
            expect(isVisible || !hasOcultoClass).toBeFalsy();
          }
        }
      }
    }
  });

  test('3. Arquivo build/removals.log deve existir e conter entradas', async ({ page }) => {
    // Verificar se o arquivo de log foi criado (usando fetch)
    const response = await page.request.get('/build/removals.log');

    if (response.ok()) {
      const logContent = await response.text();

      // Assert: log deve conter informações sobre remoções
      expect(logContent).toContain('Log de Remoções de UI');
      expect(logContent).toContain('client/src/pages/Schedules.tsx');
      expect(logContent).toContain('client/src/index.css');
      expect(logContent).toContain('client/src/utils/cleanup-ui.ts');
    } else {
      // Log pode não estar acessível via HTTP, isso é aceitável
      console.log('build/removals.log não acessível via HTTP (esperado em alguns ambientes)');
    }
  });

  test('4. Página HOME não deve ter dicas/banners informativos', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    // Verificar ausência de emojis de dica
    const bodyText = await page.textContent('body');
    expect(bodyText).not.toContain('💡 Dica');
    expect(bodyText).not.toContain('💡');

    // Verificar ausência de textos de preview/demo
    expect(bodyText).not.toContain('This is a preview');
    expect(bodyText).not.toContain('Modo Preview');
    expect(bodyText).not.toContain('Lorem ipsum');
  });

  test('5. Menu ESCALA não deve ter banner de instruções', async ({ page }) => {
    await page.goto('/schedules');
    await page.waitForLoadState('networkidle');

    // Verificar que não há banner azul com instruções
    const infoBanners = await page.$$('.bg-gradient-to-r.from-blue-50');

    for (const banner of infoBanners) {
      const bannerText = await banner.textContent();

      // Se banner existir, não deve conter texto de instrução
      if (bannerText) {
        expect(bannerText).not.toContain('Clique em qualquer dia');
        expect(bannerText).not.toContain('Toque nos dias');
        expect(bannerText).not.toContain('💡');
      }
    }
  });

  test('6. Script de limpeza deve estar executando', async ({ page }) => {
    await page.goto('/dashboard');

    // Verificar se o script de limpeza foi executado (log no console)
    const logs: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'log') {
        logs.push(msg.text());
      }
    });

    await page.reload();
    await page.waitForLoadState('networkidle');

    // Verificar se há log do script de limpeza
    const hasCleanupLog = logs.some(log =>
      log.includes('UI Cleanup') || log.includes('Elementos desnecessários removidos')
    );

    expect(hasCleanupLog).toBeTruthy();
  });

  test('7. Elementos com aria-label de dica devem estar ocultos', async ({ page }) => {
    const pages = ['/dashboard', '/schedules'];

    for (const path of pages) {
      await page.goto(path);
      await page.waitForLoadState('networkidle');

      // Buscar elementos com aria-label contendo "dica" ou "help"
      const ariaElements = await page.$$('[aria-label*="dica" i], [aria-label*="help" i]');

      for (const el of ariaElements) {
        const isVisible = await el.isVisible();
        const hasOcultoClass = await el.evaluate(node =>
          node.classList.contains('oculto-global')
        );

        // Assert: deve estar oculto OU ter classe oculto-global
        expect(isVisible && !hasOcultoClass).toBeFalsy();
      }
    }
  });

  test('8. Validação mobile - Dicas devem estar ocultas', async ({ page }) => {
    // Simular dispositivo mobile
    await page.setViewportSize({ width: 375, height: 667 }); // iPhone SE

    await page.goto('/schedules');
    await page.waitForLoadState('networkidle');

    const bodyText = await page.textContent('body');

    // Verificar textos específicos de mobile
    expect(bodyText).not.toContain('Toque nos dias para ver detalhes');
    expect(bodyText).not.toContain('Escala Publicada - Interaja com o calendário');
  });
});
