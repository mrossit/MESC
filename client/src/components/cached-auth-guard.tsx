import { useQuery } from "@tanstack/react-query";
import { Redirect, useLocation } from "wouter";
import { Skeleton } from "@/components/ui/skeleton";
import { queryClient } from "@/lib/queryClient";
import { hasValidUser, isAuthResponse, safeGetUserProperty, AuthResponse } from "@/lib/auth";

interface CachedAuthGuardProps {
  children: React.ReactNode;
  allowedRoles?: string[];
}

export function CachedAuthGuard({ children, allowedRoles }: CachedAuthGuardProps) {
  const [location] = useLocation();
  
  // Primeiro, tenta pegar dados do cache com type safety
  const cachedData = queryClient.getQueryData<AuthResponse>(["/api/auth/me"]);
  console.log(`[CachedAuthGuard] Cached data for ${location}:`, cachedData);
  
  // Usa a mesma query key que o ProtectedRoute para compartilhar cache
  const { data, isLoading, error } = useQuery({
    queryKey: ["/api/auth/me"],
    retry: false,
    staleTime: 1000 * 60 * 5, // 5 minutos
    gcTime: 1000 * 60 * 10, // 10 minutos
    refetchOnMount: false, // NUNCA refetch se já tem dados
    refetchOnWindowFocus: false,
    // Se tem dados em cache válidos, usa eles
    initialData: isAuthResponse(cachedData) ? cachedData : undefined,
  });
  
  // Log do estado
  console.log(`[CachedAuthGuard] State:`, {
    location,
    isLoading,
    hasError: !!error,
    hasUser: hasValidUser(data),
    userRole: hasValidUser(data) ? data.user.role : undefined,
    allowedRoles,
    usingCache: hasValidUser(cachedData)
  });
  
  // Se tem dados em cache válidos, usa eles imediatamente
  if (hasValidUser(cachedData)) {
    const userData = cachedData.user;
    
    // Verifica mudança de senha com safe access
    const requiresPasswordChange = safeGetUserProperty(cachedData, 'requiresPasswordChange', false);
    if (requiresPasswordChange) {
      if (location !== "/change-password-required" && location !== "/change-password") {
        return <Redirect to="/change-password-required" />;
      }
    }
    
    // Verifica permissões com safe access
    if (allowedRoles && allowedRoles.length > 0) {
      const userRole = safeGetUserProperty(cachedData, 'role', 'ministro');
      const hasPermission = allowedRoles.includes(userRole);
      console.log(`[CachedAuthGuard] Cache permission: ${userRole} in [${allowedRoles}] = ${hasPermission}`);
      
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
  
  // Se há erro ou não há usuário válido
  if (error || !hasValidUser(data)) {
    if (location === "/login" || location === "/register") {
      return <>{children}</>;
    }
    console.log(`[CachedAuthGuard] No auth, redirecting to login`);
    return <Redirect to="/login" />;
  }
  
  // Verifica mudança de senha com safe access
  const requiresPasswordChange = safeGetUserProperty(data, 'requiresPasswordChange', false);
  if (requiresPasswordChange) {
    if (location === "/change-password-required" || location === "/change-password") {
      return <>{children}</>;
    }
    return <Redirect to="/change-password-required" />;
  }
  
  // Verifica permissões com safe access
  if (allowedRoles && allowedRoles.length > 0) {
    const userRole = safeGetUserProperty(data, 'role', 'ministro');
    const hasPermission = allowedRoles.includes(userRole);
    console.log(`[CachedAuthGuard] Permission: ${userRole} in [${allowedRoles}] = ${hasPermission}`);
    
    if (!hasPermission) {
      return <Redirect to="/dashboard" />;
    }
  }
  
  console.log(`[CachedAuthGuard] Access granted`);
  return <>{children}</>;
}