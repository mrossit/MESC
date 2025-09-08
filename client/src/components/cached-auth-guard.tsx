import { useQuery } from "@tanstack/react-query";
import { Redirect, useLocation } from "wouter";
import { Skeleton } from "@/components/ui/skeleton";
import { queryClient } from "@/lib/queryClient";

interface CachedAuthGuardProps {
  children: React.ReactNode;
  allowedRoles?: string[];
}

export function CachedAuthGuard({ children, allowedRoles }: CachedAuthGuardProps) {
  const [location] = useLocation();
  
  // Primeiro, tenta pegar dados do cache
  const cachedData = queryClient.getQueryData(["/api/auth/me"]);
  console.log(`[CachedAuthGuard] Cached data for ${location}:`, cachedData);
  
  // Usa a mesma query key que o ProtectedRoute para compartilhar cache
  const { data, isLoading, error } = useQuery({
    queryKey: ["/api/auth/me"],
    retry: false,
    staleTime: 1000 * 60 * 5, // 5 minutos
    gcTime: 1000 * 60 * 10, // 10 minutos
    refetchOnMount: false, // NUNCA refetch se já tem dados
    refetchOnWindowFocus: false,
    // Se tem dados em cache, usa eles
    initialData: cachedData as any,
  });
  
  // Log do estado
  console.log(`[CachedAuthGuard] State:`, {
    location,
    isLoading,
    hasError: !!error,
    hasUser: !!data?.user,
    userRole: data?.user?.role,
    allowedRoles,
    usingCache: !!cachedData
  });
  
  // Se tem dados em cache válidos, usa eles imediatamente
  if (cachedData && (cachedData as any).user) {
    const userData = (cachedData as any).user;
    
    // Verifica mudança de senha
    if (userData.requiresPasswordChange) {
      if (location !== "/change-password-required" && location !== "/change-password") {
        return <Redirect to="/change-password-required" />;
      }
    }
    
    // Verifica permissões
    if (allowedRoles && allowedRoles.length > 0) {
      const hasPermission = allowedRoles.includes(userData.role);
      console.log(`[CachedAuthGuard] Cache permission: ${userData.role} in [${allowedRoles}] = ${hasPermission}`);
      
      if (!hasPermission) {
        return <Redirect to="/dashboard" />;
      }
    }
    
    console.log(`[CachedAuthGuard] Access granted from cache`);
    return <>{children}</>;
  }
  
  // Se não tem cache, segue o fluxo normal
  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="space-y-4 w-full max-w-md">
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-8 w-full" />
        </div>
      </div>
    );
  }
  
  // Se há erro ou não há usuário
  if (error || !data?.user) {
    if (location === "/login" || location === "/register") {
      return <>{children}</>;
    }
    console.log(`[CachedAuthGuard] No auth, redirecting to login`);
    return <Redirect to="/login" />;
  }
  
  // Verifica mudança de senha
  if (data.user.requiresPasswordChange) {
    if (location === "/change-password-required" || location === "/change-password") {
      return <>{children}</>;
    }
    return <Redirect to="/change-password-required" />;
  }
  
  // Verifica permissões
  if (allowedRoles && allowedRoles.length > 0) {
    const hasPermission = allowedRoles.includes(data.user.role);
    console.log(`[CachedAuthGuard] Permission: ${data.user.role} in [${allowedRoles}] = ${hasPermission}`);
    
    if (!hasPermission) {
      return <Redirect to="/dashboard" />;
    }
  }
  
  console.log(`[CachedAuthGuard] Access granted`);
  return <>{children}</>;
}