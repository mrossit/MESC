import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Check, X, User, ExternalLink } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import type { User as UserType } from "@/lib/types";
import { Link } from "wouter";

export function PendingApprovals() {
  const queryClient = useQueryClient();

  const { data, isLoading, error, refetch } = useQuery<UserType[]>({
    queryKey: ["/api/users/pending"],
    refetchInterval: 30000, // Refetch a cada 30 segundos
    staleTime: 10000, // Considera stale após 10 segundos
    retry: 3,
    retryDelay: 1000,
  });

  // Garantir que pendingUsers seja sempre um array
  const pendingUsers = Array.isArray(data) ? data : [];

  // Refetch quando o componente monta
  React.useEffect(() => {
    refetch();
  }, [refetch]);

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

  if (isLoading) {
    return (
      <Card className="  border border-neutral-border/30 dark:border-border">
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-foreground">
            Aprovações Pendentes
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {Array.from({ length: 2 }).map((_, i) => (
              <div key={i} className="border border-neutral-border rounded-lg p-4 animate-pulse">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-neutral-peachCream/50 rounded-full" />
                    <div className="space-y-2">
                      <div className="h-4 w-24 bg-neutral-peachCream/50 rounded" />
                      <div className="h-3 w-32 bg-neutral-peachCream/50 rounded" />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="  border border-neutral-border/30 dark:border-border">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold text-foreground">
            Aprovações Pendentes
          </CardTitle>
          <div className="flex items-center gap-2">
            {pendingUsers.length > 0 && (
              <Badge
                className="bg-burgundy/20 text-burgundy dark:bg-burgundy/30 dark:text-burgundy-soft"
                data-testid="badge-pending-count"
              >
                {pendingUsers.length} novos
              </Badge>
            )}
            <Link href="/approvals">
              <Button
                variant="ghost"
                size="sm"
                className="text-primary hover:text-primary hover:bg-neutral-accentWarm/10"
              >
                <ExternalLink className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {pendingUsers.length === 0 ? (
          <div 
            className="text-center py-8 text-muted-foreground"
            data-testid="text-no-pending-approvals"
          >
            Nenhuma aprovação pendente no momento.
          </div>
        ) : (
          <div className="space-y-4">
            {pendingUsers.map((user) => (
              <div 
                key={user.id} 
                className="border border-neutral-border rounded-lg p-4"
                data-testid={`card-pending-user-${user.id}`}
              >
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <Avatar className="w-10 h-10 flex-shrink-0">
                      <AvatarFallback className="bg-sage/20 dark:bg-sage/30 text-sage-dark dark:text-sage-light">
                        <User className="h-5 w-5" />
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <p 
                        className="font-medium text-foreground truncate"
                        data-testid={`text-user-name-${user.id}`}
                      >
                        {user.name}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Solicitou cadastro
                      </p>
                      <p 
                        className="text-xs text-muted-foreground truncate"
                        data-testid={`text-user-email-${user.id}`}
                      >
                        {user.email}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2 flex-shrink-0 self-start">
                    <Button
                      size="sm"
                      className="bg-sage/25 text-sage-dark hover:bg-sage/35 dark:bg-sage/30 dark:text-sage-light dark:hover:bg-sage/40 border-0 text-xs px-3"
                      onClick={() => handleApproval(user.id, "active")}
                      disabled={updateUserStatusMutation.isPending}
                      data-testid={`button-approve-${user.id}`}
                    >
                      <Check className="h-3 w-3 mr-1" />
                      Aprovar
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="bg-burgundy/20 text-burgundy hover:bg-burgundy/30 dark:bg-burgundy/25 dark:text-burgundy-soft dark:hover:bg-burgundy/35 border-0 text-xs px-3"
                      onClick={() => handleApproval(user.id, "inactive")}
                      disabled={updateUserStatusMutation.isPending}
                      data-testid={`button-reject-${user.id}`}
                    >
                      <X className="h-3 w-3 mr-1" />
                      Rejeitar
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
