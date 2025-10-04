/**
 * Testes Unitários: Fixed Footer
 * Testa navegação, badges, estados ativos e acessibilidade
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { FixedFooter } from '../FixedFooter';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import * as wouter from 'wouter';

// Mock do wouter
vi.mock('wouter', () => ({
  useLocation: vi.fn(),
  useRoute: vi.fn()
}));

// Mock do useUser
vi.mock('@/hooks/use-user', () => ({
  useUser: vi.fn(() => ({
    user: { id: 'test-user-123', nome: 'Test User' }
  }))
}));

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false }
    }
  });

  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
};

describe('FixedFooter - Renderização', () => {
  beforeEach(() => {
    vi.mocked(wouter.useLocation).mockReturnValue(['/', vi.fn()]);
  });

  it('renderiza footer com 4 botões de navegação', () => {
    render(<FixedFooter />, { wrapper: createWrapper() });

    expect(screen.getByRole('navigation', { name: 'Navegação principal' })).toBeInTheDocument();
    expect(screen.getByLabelText('Ir para Home')).toBeInTheDocument();
    expect(screen.getByLabelText('Ir para Escalas')).toBeInTheDocument();
    expect(screen.getByLabelText('Ir para Substituições')).toBeInTheDocument();
    expect(screen.getByLabelText('Ir para Perfil')).toBeInTheDocument();
  });

  it('renderiza todos os labels corretos', () => {
    render(<FixedFooter />, { wrapper: createWrapper() });

    expect(screen.getByText('HOME')).toBeInTheDocument();
    expect(screen.getByText('ESCALA')).toBeInTheDocument();
    expect(screen.getByText('SUBSTITUIÇÕES')).toBeInTheDocument();
    expect(screen.getByText('PERFIL')).toBeInTheDocument();
  });

  it('renderiza com estrutura HTML semântica', () => {
    const { container } = render(<FixedFooter />, { wrapper: createWrapper() });

    const footer = container.querySelector('footer.fixed-footer');
    expect(footer).toBeInTheDocument();

    const nav = footer?.querySelector('nav.footer-nav');
    expect(nav).toBeInTheDocument();
  });
});

describe('FixedFooter - Estado Ativo', () => {
  it('marca HOME como ativo quando rota é /', () => {
    vi.mocked(wouter.useLocation).mockReturnValue(['/', vi.fn()]);
    render(<FixedFooter />, { wrapper: createWrapper() });

    const homeButton = screen.getByLabelText('Ir para Home');
    expect(homeButton).toHaveClass('active');
    expect(homeButton).toHaveAttribute('aria-current', 'page');
  });

  it('marca ESCALA como ativo quando rota é /schedules', () => {
    vi.mocked(wouter.useLocation).mockReturnValue(['/schedules', vi.fn()]);
    render(<FixedFooter />, { wrapper: createWrapper() });

    const escalaButton = screen.getByLabelText('Ir para Escalas');
    expect(escalaButton).toHaveClass('active');
    expect(escalaButton).toHaveAttribute('aria-current', 'page');
  });

  it('marca SUBSTITUIÇÕES como ativo quando rota é /substitutions', () => {
    vi.mocked(wouter.useLocation).mockReturnValue(['/substitutions', vi.fn()]);
    render(<FixedFooter />, { wrapper: createWrapper() });

    const subsButton = screen.getByLabelText('Ir para Substituições');
    expect(subsButton).toHaveClass('active');
    expect(subsButton).toHaveAttribute('aria-current', 'page');
  });

  it('marca PERFIL como ativo quando rota é /profile', () => {
    vi.mocked(wouter.useLocation).mockReturnValue(['/profile', vi.fn()]);
    render(<FixedFooter />, { wrapper: createWrapper() });

    const perfilButton = screen.getByLabelText('Ir para Perfil');
    expect(perfilButton).toHaveClass('active');
    expect(perfilButton).toHaveAttribute('aria-current', 'page');
  });

  it('remove aria-current de outros itens quando um está ativo', () => {
    vi.mocked(wouter.useLocation).mockReturnValue(['/schedules', vi.fn()]);
    render(<FixedFooter />, { wrapper: createWrapper() });

    const homeButton = screen.getByLabelText('Ir para Home');
    const escalaButton = screen.getByLabelText('Ir para Escalas');

    expect(homeButton).not.toHaveAttribute('aria-current');
    expect(escalaButton).toHaveAttribute('aria-current', 'page');
  });
});

describe('FixedFooter - Navegação', () => {
  it('chama setLocation quando clica em HOME', async () => {
    const setLocation = vi.fn();
    vi.mocked(wouter.useLocation).mockReturnValue(['/schedules', setLocation]);

    render(<FixedFooter />, { wrapper: createWrapper() });

    const homeButton = screen.getByLabelText('Ir para Home');
    fireEvent.click(homeButton);

    await waitFor(() => {
      expect(setLocation).toHaveBeenCalledWith('/');
    });
  });

  it('persiste rota no localStorage após navegação', async () => {
    const setLocation = vi.fn();
    vi.mocked(wouter.useLocation).mockReturnValue(['/', setLocation]);

    const localStorageSetItem = vi.spyOn(Storage.prototype, 'setItem');

    render(<FixedFooter />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(localStorageSetItem).toHaveBeenCalledWith(
        'last_route_user_test-user-123',
        '/'
      );
    });
  });

  it('inclui data-pid no botão', () => {
    vi.mocked(wouter.useLocation).mockReturnValue(['/', vi.fn()]);
    render(<FixedFooter />, { wrapper: createWrapper() });

    const buttons = screen.getAllByRole('button');
    buttons.forEach(button => {
      expect(button).toHaveAttribute('data-pid', 'test-user-123');
    });
  });
});

describe('FixedFooter - Badges e Notificações', () => {
  it('mostra badge quando há escalas não lidas', async () => {
    global.fetch = vi.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ unread: 3 })
      })
    ) as any;

    vi.mocked(wouter.useLocation).mockReturnValue(['/', vi.fn()]);
    render(<FixedFooter />, { wrapper: createWrapper() });

    await waitFor(() => {
      const badge = screen.getByText('3');
      expect(badge).toBeInTheDocument();
      expect(badge).toHaveClass('nav-badge');
    });
  });

  it('mostra "9+" quando há mais de 9 escalas não lidas', async () => {
    global.fetch = vi.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ unread: 15 })
      })
    ) as any;

    vi.mocked(wouter.useLocation).mockReturnValue(['/', vi.fn()]);
    render(<FixedFooter />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText('9+')).toBeInTheDocument();
    });
  });

  it('mostra dot de notificação no perfil quando hasAlert = true', async () => {
    global.fetch = vi.fn((url) => {
      if (url.includes('profile-alert')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ hasAlert: true })
        });
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ unread: 0 })
      });
    }) as any;

    vi.mocked(wouter.useLocation).mockReturnValue(['/', vi.fn()]);
    const { container } = render(<FixedFooter />, { wrapper: createWrapper() });

    await waitFor(() => {
      const dot = container.querySelector('.nav-dot');
      expect(dot).toBeInTheDocument();
    });
  });

  it('anuncia novas escalas via aria-live', async () => {
    global.fetch = vi.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ unread: 2 })
      })
    ) as any;

    vi.mocked(wouter.useLocation).mockReturnValue(['/', vi.fn()]);
    render(<FixedFooter />, { wrapper: createWrapper() });

    await waitFor(() => {
      const announcer = screen.getByRole('status');
      expect(announcer).toHaveTextContent(/Você tem 2 novas escalas/i);
    });
  });
});

describe('FixedFooter - Acessibilidade', () => {
  beforeEach(() => {
    vi.mocked(wouter.useLocation).mockReturnValue(['/', vi.fn()]);
  });

  it('tem role="navigation" no footer', () => {
    render(<FixedFooter />, { wrapper: createWrapper() });
    expect(screen.getByRole('navigation')).toHaveAttribute('aria-label', 'Navegação principal');
  });

  it('todos os botões têm aria-label descritivo', () => {
    render(<FixedFooter />, { wrapper: createWrapper() });

    expect(screen.getByLabelText('Ir para Home')).toBeInTheDocument();
    expect(screen.getByLabelText('Ir para Escalas')).toBeInTheDocument();
    expect(screen.getByLabelText('Ir para Substituições')).toBeInTheDocument();
    expect(screen.getByLabelText('Ir para Perfil')).toBeInTheDocument();
  });

  it('ícones têm aria-hidden="true"', () => {
    const { container } = render(<FixedFooter />, { wrapper: createWrapper() });
    const icons = container.querySelectorAll('.nav-item-icon');

    icons.forEach(icon => {
      expect(icon).toHaveAttribute('aria-hidden', 'true');
    });
  });

  it('badges têm aria-label descritivo', async () => {
    global.fetch = vi.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ unread: 1 })
      })
    ) as any;

    render(<FixedFooter />, { wrapper: createWrapper() });

    await waitFor(() => {
      const badge = screen.getByLabelText('1 não lida');
      expect(badge).toBeInTheDocument();
    });
  });

  it('suporta navegação por teclado', () => {
    render(<FixedFooter />, { wrapper: createWrapper() });

    const buttons = screen.getAllByRole('button');
    buttons.forEach(button => {
      expect(button).toHaveAttribute('type', 'button');
      expect(button.tabIndex).toBeGreaterThanOrEqual(0);
    });
  });
});

describe('FixedFooter - Performance', () => {
  it('não re-renderiza todo o footer ao atualizar badge', async () => {
    const renderSpy = vi.fn();

    const TestWrapper = () => {
      renderSpy();
      return <FixedFooter />;
    };

    vi.mocked(wouter.useLocation).mockReturnValue(['/', vi.fn()]);

    const { rerender } = render(<TestWrapper />, { wrapper: createWrapper() });

    const initialRenderCount = renderSpy.mock.calls.length;

    // Simular mudança de badge
    global.fetch = vi.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ unread: 5 })
      })
    ) as any;

    rerender(<TestWrapper />);

    // Deve ter re-renderizado apenas uma vez
    expect(renderSpy.mock.calls.length).toBeLessThanOrEqual(initialRenderCount + 1);
  });
});
