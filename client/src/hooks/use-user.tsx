import { useQuery } from "@tanstack/react-query";

export interface AuthUser {
  id: number;
  email: string;
  name: string;
  role: string;
  status?: string;
  requiresPasswordChange?: boolean;
}

export function useUser() {
  const { data: authData, isLoading, error } = useQuery<{ user: AuthUser }>({
    queryKey: ["/api/auth/me"],
    staleTime: Infinity,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
  });

  return {
    user: authData?.user,
    isLoading,
    error,
  };
}
