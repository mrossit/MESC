import { useEffect, useState } from 'react';

/**
 * Hook para gerenciar token CSRF do lado do cliente
 * O token é obtido uma vez quando a aplicação carrega e reutilizado
 */
export function useCsrfToken() {
  const [csrfToken, setCsrfToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchCsrfToken() {
      try {
        const response = await fetch('/api/csrf-token', {
          credentials: 'include'
        });

        if (response.ok) {
          const data = await response.json();
          setCsrfToken(data.csrfToken);
        }
      } catch (error) {
        console.error('Erro ao obter token CSRF:', error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchCsrfToken();
  }, []);

  return { csrfToken, isLoading };
}

/**
 * Função utilitária para adicionar header CSRF em requests
 */
export function addCsrfHeader(headers: HeadersInit = {}, csrfToken: string | null): HeadersInit {
  if (!csrfToken) return headers;

  return {
    ...headers,
    'X-CSRF-Token': csrfToken
  };
}
