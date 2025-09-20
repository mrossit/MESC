import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Login from '../login';

// Mock wouter
vi.mock('wouter', () => ({
  Link: ({ children, href }: any) => <a href={href}>{children}</a>,
  useLocation: () => ['/login', vi.fn()],
}));

// Mock React Query
vi.mock('@tanstack/react-query', async () => {
  const actual = await vi.importActual('@tanstack/react-query');
  return {
    ...actual,
    QueryClient: vi.fn(() => ({
      mount: vi.fn(),
      unmount: vi.fn(),
      defaultOptions: {},
    })),
    QueryClientProvider: ({ children }: any) => children,
    useMutation: () => ({
      mutate: vi.fn(),
      mutateAsync: vi.fn(),
      isPending: false,
      isError: false,
      error: null,
    }),
    useQuery: () => ({
      data: null,
      isLoading: false,
      error: null,
    }),
  };
});

// Mock toast
vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: vi.fn(),
  }),
}));

describe('Login Page', () => {
  const user = userEvent.setup();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders login form with all fields', () => {
    render(<Login />);

    expect(screen.getByText(/entrar/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/senha/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /entrar/i })).toBeInTheDocument();
  });

  it('validates required fields', async () => {
    render(<Login />);

    const submitButton = screen.getByRole('button', { name: /entrar/i });
    await user.click(submitButton);

    // Form should show validation errors
    await waitFor(() => {
      expect(screen.getByLabelText(/email/i)).toBeInvalid();
      expect(screen.getByLabelText(/senha/i)).toBeInvalid();
    });
  });

  it('accepts valid email and password input', async () => {
    render(<Login />);

    const emailInput = screen.getByLabelText(/email/i);
    const passwordInput = screen.getByLabelText(/senha/i);

    await user.type(emailInput, 'test@example.com');
    await user.type(passwordInput, 'password123');

    expect(emailInput).toHaveValue('test@example.com');
    expect(passwordInput).toHaveValue('password123');
  });

  it('shows password when visibility toggle is clicked', async () => {
    render(<Login />);

    const passwordInput = screen.getByLabelText(/senha/i);
    const toggleButton = screen.getByRole('button', { name: /mostrar senha/i });

    expect(passwordInput).toHaveAttribute('type', 'password');

    await user.click(toggleButton);
    expect(passwordInput).toHaveAttribute('type', 'text');

    await user.click(toggleButton);
    expect(passwordInput).toHaveAttribute('type', 'password');
  });

  it('has link to registration page', () => {
    render(<Login />);

    const registerLink = screen.getByText(/não tem uma conta/i).parentElement;
    expect(registerLink).toBeInTheDocument();
    expect(registerLink?.querySelector('a')).toHaveAttribute('href', '/register');
  });

  it('has link to forgot password', () => {
    render(<Login />);

    const forgotLink = screen.getByText(/esqueceu sua senha/i);
    expect(forgotLink).toBeInTheDocument();
    expect(forgotLink).toHaveAttribute('href', '/forgot-password');
  });
});