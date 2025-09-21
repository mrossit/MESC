import { Layout } from "@/components/layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Check, X, User } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import type { User as UserType } from "@/lib/types";

export default function Approvals() {
  const queryClient = useQueryClient();

  const { data, isLoading, error } = useQuery<UserType[]>({
    queryKey: ["/api/users/pending"],
    initialData: [], // Começar com array vazio
    refetchOnMount: true,
    refetchOnWindowFocus: true,
  });

  // Debug logs
  console.log('[Approvals] Query state:', { data, isLoading, error });
  console.log('[Approvals] Pending users count:', data?.length || 0);

  // Garantir que pendingUsers seja sempre um array, mesmo que data seja null/undefined
  const pendingUsers = Array.isArray(data) ? data : [];

  const updateUserStatusMutation = useMutation({
    mutationFn: async ({ userId, status }: { userId: string; status: string }) => {
      return apiRequest("PATCH", `/api/users/${userId}/status`, { status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users/pending"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      toast({
        title: "Sucesso",
        description: "Status do usuário atualizado com sucesso.",
      });
    },
    onError: (error) => {
      toast({
        title: "Erro",
        description: error instanceof Error ? error.message : "Falha ao atualizar status.",
        variant: "destructive",
      });
    },
  });

  const handleApproval = (userId: string, status: "active" | "inactive") => {
    updateUserStatusMutation.mutate({ userId, status });
  };

  return (
    <Layout 
      title="Aprovações Pendentes"
      subtitle="Gerencie solicitações de cadastro de ministros"
    >
      <div className="space-y-6">
        {/* Summary Card */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Resumo de Aprovações</CardTitle>
              <Badge variant="secondary">
                {pendingUsers.length} pendentes
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center p-4 bg-muted/30 rounded-lg">
                <p className="text-2xl font-bold">{pendingUsers.length}</p>
                <p className="text-sm text-muted-foreground">Aguardando Aprovação</p>
              </div>
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <p className="text-2xl font-bold text-green-600">0</p>
                <p className="text-sm text-muted-foreground">Aprovados Hoje</p>
              </div>
              <div className="text-center p-4 bg-red-50 rounded-lg">
                <p className="text-2xl font-bold text-red-600">0</p>
                <p className="text-sm text-muted-foreground">Rejeitados Hoje</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Pending Approvals List */}
        <Card>
          <CardHeader>
            <CardTitle>Solicitações de Cadastro</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-4">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="border rounded-lg p-4 sm:p-6 animate-fade-in" style={{ animationDelay: `${i * 100}ms` }}>
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                      <div className="flex items-center gap-4">
                        <Skeleton className="h-12 w-12 rounded-full" variant="shimmer" />
                        <div className="space-y-2 flex-1">
                          <Skeleton className="h-5 w-32" variant="shimmer" />
                          <Skeleton className="h-4 w-48" />
                          <div className="flex gap-2">
                            <Skeleton className="h-5 w-16" />
                            <Skeleton className="h-4 w-24" />
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-2 sm:gap-3 w-full sm:w-auto">
                        <Skeleton className="h-9 flex-1 sm:flex-initial sm:w-24" />
                        <Skeleton className="h-9 flex-1 sm:flex-initial sm:w-24" />
                      </div>
                    </div>
                    <div className="mt-4 pt-4 border-t">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <Skeleton className="h-4 w-20" />
                        <Skeleton className="h-4 w-20" />
                        <Skeleton className="h-4 w-20" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : pendingUsers.length === 0 ? (
              <div className="text-center py-12">
                <User className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">
                  Nenhuma solicitação pendente
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {pendingUsers.map((user, index) => (
                  <div 
                    key={user.id} 
                    className="border rounded-lg p-4 sm:p-6 animate-slide-up transition-all hover:shadow-lg hover:border-primary/20"
                    style={{ animationDelay: `${index * 50}ms` }}
                    data-testid={`approval-item-${user.id}`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                      <div className="flex items-center gap-4">
                        <Avatar className="h-12 w-12 flex-shrink-0">
                          <AvatarFallback>
                            <User className="h-6 w-6" />
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0 flex-1">
                          <h3 
                            className="font-semibold truncate"
                            data-testid={`text-user-name-detail-${user.id}`}
                          >
                            {user.name}
                          </h3>
                          <p 
                            className="text-muted-foreground text-sm truncate"
                            data-testid={`text-user-email-detail-${user.id}`}
                          >
                            {user.email}
                          </p>
                          <div className="flex flex-wrap items-center gap-2 mt-1">
                            <Badge 
                              variant="secondary"
                              data-testid={`badge-user-role-detail-${user.id}`}
                            >
                              {user.role === "ministro" ? "Ministro" : user.role}
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              Solicitado em {new Date().toLocaleDateString('pt-BR')}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-2 sm:gap-3 w-full sm:w-auto">
                        <Button
                          variant="outline"
                          className="text-green-600 border-green-600 hover:bg-green-50 hover:border-green-500 hover:text-green-700 transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 flex-1 sm:flex-initial"
                          onClick={() => handleApproval(user.id, "active")}
                          disabled={updateUserStatusMutation.isPending}
                          data-testid={`button-approve-detail-${user.id}`}
                        >
                          <Check className="h-4 w-4 mr-1 sm:mr-2 transition-transform group-hover:scale-110" />
                          <span className="hidden sm:inline">Aprovar</span>
                          <span className="sm:hidden">OK</span>
                        </Button>
                        <Button
                          variant="outline"
                          className="text-red-600 border-red-600 hover:bg-red-50 hover:border-red-500 hover:text-red-700 transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 flex-1 sm:flex-initial"
                          onClick={() => handleApproval(user.id, "inactive")}
                          disabled={updateUserStatusMutation.isPending}
                          data-testid={`button-reject-detail-${user.id}`}
                        >
                          <X className="h-4 w-4 mr-1 sm:mr-2 transition-transform group-hover:scale-110" />
                          <span className="hidden sm:inline">Rejeitar</span>
                          <span className="sm:hidden">X</span>
                        </Button>
                      </div>
                    </div>
                    
                    {/* Additional user info */}
                    <div className="mt-4 pt-4 border-t">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                        <div>
                          <span className="font-medium text-muted-foreground">Status:</span>
                          <span className="ml-2">{user.status}</span>
                        </div>
                        <div>
                          <span className="font-medium text-muted-foreground">Função:</span>
                          <span className="ml-2 capitalize">{user.role}</span>
                        </div>
                        <div>
                          <span className="font-medium text-muted-foreground">Cadastrado:</span>
                          <span className="ml-2">Hoje</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}