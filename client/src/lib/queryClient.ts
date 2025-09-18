import { QueryClient, QueryFunction } from "@tanstack/react-query";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  // Check payload size before sending
  let body: string | undefined;
  if (data) {
    body = JSON.stringify(data);
    // Warn if payload is large (> 100KB)
    const sizeInKB = new Blob([body]).size / 1024;
    if (sizeInKB > 100) {
      console.warn(`Large request payload: ${sizeInKB.toFixed(2)}KB for ${url}`);
    }
    // Reject if payload is too large (> 500KB)
    if (sizeInKB > 500) {
      throw new Error(`Request payload too large: ${sizeInKB.toFixed(2)}KB. Please reduce the amount of data being sent.`);
    }
  }

  const headers: Record<string, string> = data ? { "Content-Type": "application/json" } : {};
  
  // Adicionar token de autenticação se disponível
  const token = localStorage.getItem('token');
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(url, {
    method,
    headers,
    body,
    credentials: "include",
  });

  await throwIfResNotOk(res);
  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    // Adicionar token de autenticação se disponível
    const headers: Record<string, string> = {};
    const token = localStorage.getItem('token');
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const res = await fetch(queryKey.join("/") as string, {
      headers,
      credentials: "include",
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false, // Desabilita refetch ao focar janela
      staleTime: 5 * 60 * 1000, // 5 minutos - tempo razoável de cache
      gcTime: 30 * 60 * 1000, // 30 minutos - mantém dados por mais tempo
      retry: (failureCount, error: any) => {
        // Don't retry on 401 (unauthorized)
        if (error?.message?.startsWith("401")) {
          return false;
        }
        // Retry up to 2 times for other errors
        return failureCount < 2;
      },
    },
    mutations: {
      retry: false,
    },
  },
});
