import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";

interface User {
  id: string;
  email: string;
  name: string;
  role: string;
  status: string;
}

export function useAuth() {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  
  // Busca o usuário atual
  const { data: user, isLoading, error } = useQuery<User>({
    queryKey: ["/api/auth/user"],
    queryFn: async () => {
      const token = localStorage.getItem("token");
      
      if (!token) {
        throw new Error("No token found");
      }
      
      const response = await fetch("/api/auth/user", {
        headers: {
          "Authorization": `Bearer ${token}`,
        },
      });
      
      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          // Token inválido ou expirado
          localStorage.removeItem("token");
          localStorage.removeItem("user");
          throw new Error("Token expired");
        }
        throw new Error("Failed to fetch user");
      }
      
      return response.json();
    },
    retry: false,
    staleTime: 5 * 60 * 1000, // 5 minutos
  });
  
  // Mutation para logout
  const logoutMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/auth/logout", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${localStorage.getItem("token")}`,
        },
      });
      
      if (!response.ok) {
        throw new Error("Failed to logout");
      }
      
      return response.json();
    },
    onSuccess: () => {
      // Limpa o localStorage
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      
      // Limpa o cache
      queryClient.clear();
      
      // Redireciona para login
      setLocation("/login");
    },
  });
  
  const logout = () => {
    logoutMutation.mutate();
  };
  
  // Verifica se está autenticado baseado no token e no usuário
  const isAuthenticated = !!user && !!localStorage.getItem("token");
  
  return {
    user,
    isLoading,
    isAuthenticated,
    error,
    logout,
  };
}
