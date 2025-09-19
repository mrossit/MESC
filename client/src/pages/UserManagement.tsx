import React, { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Layout } from "@/components/layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { authAPI } from "@/lib/auth";
import { 
  Users, 
  Shield, 
  Crown, 
  User, 
  KeyRound, 
  AlertCircle, 
  Trash2, 
  Ban, 
  CheckCircle, 
  Search,
  MoreHorizontal,
  Edit,
  Mail,
  Phone 
} from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type User = {
  id: string;
  name: string;
  email: string;
  role: "gestor" | "coordenador" | "ministro";
  status: "active" | "inactive" | "pending";
  phone?: string;
  createdAt: string;
  // Campos de ministro agora unificados
  birthDate?: string;
  address?: string;
  city?: string;
  zipCode?: string;
  preferredPosition?: number;
  experience?: string;
  totalServices?: number;
  active?: boolean;
};

export default function UserManagement() {
  const [searchTerm, setSearchTerm] = useState("");
  const [resetPasswordOpen, setResetPasswordOpen] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<User | null>(null);
  const [userUsage, setUserUsage] = useState<{ isUsed: boolean; reason?: string } | null>(null);
  const { toast } = useToast();
  
  // Get current user info with fresh data
  const { data: currentUserData, refetch: refetchUser } = useQuery({
    queryKey: ["/api/auth/me"],
    queryFn: () => authAPI.getMe(),
    staleTime: 0,
    gcTime: 0,
  });

  // Buscar todos os usuários (não apenas os ativos)
  const { data: users = [], isLoading, error, refetch } = useQuery<User[]>({
    queryKey: ["/api/users"],
    refetchOnMount: true,
    refetchOnWindowFocus: false,
    retry: (failureCount, error: any) => {
      // Se for 401, tenta revalidar a sessão primeiro
      if (error?.message?.includes('401')) {
        refetchUser();
        return failureCount < 1;
      }
      return failureCount < 2;
    },
    staleTime: 0,
    gcTime: 0
  });

  // Debug logging
  console.log("UserManagement - Query state:", { 
    users, 
    isLoading, 
    error,
    userCount: users?.length || 0,
    currentUser: currentUserData?.user,
    currentUserRole: currentUserData?.user?.role
  });
  
  // Force refetch on mount for debugging
  React.useEffect(() => {
    console.log("Component mounted, forcing refetch...");
    refetch();
  }, [refetch]);

  const updateRoleMutation = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: string }) => {
      return apiRequest("PATCH", `/api/users/${userId}/role`, { role });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      toast({
        title: "Sucesso",
        description: "Perfil do usuário atualizado com sucesso.",
      });
    },
    onError: (error) => {
      toast({
        title: "Erro",
        description: error instanceof Error ? error.message : "Falha ao atualizar perfil.",
        variant: "destructive",
      });
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ userId, status }: { userId: string; status: string }) => {
      return apiRequest("PATCH", `/api/users/${userId}/status`, { status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
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

  const resetPasswordMutation = useMutation({
    mutationFn: async ({ userId, newPassword }: { userId: string; newPassword: string }) => {
      const response = await apiRequest("POST", "/api/auth/reset-password", { userId, newPassword });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Senha resetada com sucesso",
        description: "O usuário receberá uma notificação e precisará criar uma nova senha no próximo login.",
      });
      setResetPasswordOpen(false);
      setNewPassword("");
      setSelectedUserId(null);
    },
    onError: (error) => {
      toast({
        title: "Erro ao resetar senha",
        description: error instanceof Error ? error.message : "Falha ao resetar senha.",
        variant: "destructive",
      });
    },
  });

  const deleteUserMutation = useMutation({
    mutationFn: async (userId: string) => {
      const response = await apiRequest("DELETE", `/api/users/${userId}`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      toast({
        title: "Usuário excluído",
        description: "O usuário foi excluído permanentemente do sistema.",
      });
      setDeleteConfirmOpen(false);
      setUserToDelete(null);
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao excluir usuário",
        description: error.message || "O usuário não pode ser excluído pois já foi utilizado no sistema.",
        variant: "destructive",
      });
    },
  });

  const blockUserMutation = useMutation({
    mutationFn: async (userId: string) => {
      const response = await apiRequest("PATCH", `/api/users/${userId}/block`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      toast({
        title: "Usuário bloqueado",
        description: "O usuário foi bloqueado e não poderá mais acessar o sistema.",
      });
      setDeleteConfirmOpen(false);
      setUserToDelete(null);
    },
    onError: (error) => {
      toast({
        title: "Erro ao bloquear usuário",
        description: error instanceof Error ? error.message : "Falha ao bloquear usuário.",
        variant: "destructive",
      });
    },
  });

  const handleDeleteUser = async (user: User) => {
    setUserToDelete(user);
    
    // Check if user has been used in the system
    try {
      const response = await apiRequest("GET", `/api/users/${user.id}/check-usage`);
      const usage = await response.json();
      setUserUsage(usage);
    } catch (error) {
      console.error("Error checking user usage:", error);
      setUserUsage(null);
    }
    
    setDeleteConfirmOpen(true);
  };

  const confirmDeleteOrBlock = () => {
    if (userToDelete) {
      // Coordenadores sempre bloqueiam usuários, não podem deletar
      // Apenas gestores podem deletar usuários não utilizados
      const isCoordinator = currentUserData?.user?.role === 'coordenador';
      const isUserUsed = userUsage?.isUsed;
      
      if (isUserUsed || isCoordinator) {
        blockUserMutation.mutate(userToDelete.id);
      } else {
        deleteUserMutation.mutate(userToDelete.id);
      }
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case "gestor":
        return <Crown className="h-4 w-4" />;
      case "coordenador":
        return <Shield className="h-4 w-4" />;
      default:
        return <User className="h-4 w-4" />;
    }
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case "gestor":
        return "Reitor";
      case "coordenador":
        return "Coordenador";
      default:
        return "Ministro";
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case "gestor":
        return "bg-purple-100 text-purple-800 border-purple-200";
      case "coordenador":
        return "bg-blue-100 text-blue-800 border-blue-200";
      default:
        return "bg-green-100 text-green-800 border-green-200";
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-green-100 text-green-800 border-green-200";
      case "inactive":
        return "bg-red-100 text-red-800 border-red-200";
      default:
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "active":
        return "Ativo";
      case "inactive":
        return "Inativo";
      default:
        return "Pendente";
    }
  };

  const filteredUsers = users.filter(user => {
    try {
      return user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (user.city && user.city.toLowerCase().includes(searchTerm.toLowerCase()));
    } catch (err) {
      console.error("Error filtering user:", user, err);
      return false;
    }
  });

  const stats = {
    total: users.length,
    reitores: users.filter(u => u.role === "gestor").length,
    coordenadores: users.filter(u => u.role === "coordenador").length,
    ministros: users.filter(u => u.role === "ministro").length,
    active: users.filter(u => u.status === "active").length,
    inactive: users.filter(u => u.status === "inactive").length,
    pending: users.filter(u => u.status === "pending").length,
  };

  if (isLoading) {
    return (
      <Layout title="Gestão de Usuários" subtitle="Gerencie perfis e permissões dos usuários">
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Card key={i} className="animate-pulse">
                <CardContent className="p-6">
                  <div className="h-8 bg-gray-200 rounded mb-2"></div>
                  <div className="h-4 bg-gray-200 rounded"></div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </Layout>
    );
  }

  if (error) {
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
    const isUnauthorized = errorMessage.includes('401') || errorMessage.includes('Unauthorized');
    
    // Log the error for debugging
    console.error('UserManagement Error:', errorMessage);
    console.log('Error details:', error);
    console.log('Current user data:', currentUserData);
    
    // TEMPORÁRIO: Ignorar erro e tentar mostrar dados
    console.warn('IGNORANDO ERRO TEMPORARIAMENTE PARA DEBUG');
    /* return (
      <Layout title="Gestão de Usuários" subtitle="Gerencie perfis e permissões dos usuários">
        <Alert className={isUnauthorized ? "border-yellow-200 bg-yellow-50" : "border-red-200 bg-red-50"}>
          <AlertCircle className={`h-4 w-4 ${isUnauthorized ? "text-yellow-600" : "text-red-600"}`} />
          <AlertDescription className={isUnauthorized ? "text-yellow-800" : "text-red-800"}>
            {isUnauthorized 
              ? <>
                  <p>Você não tem permissão para acessar esta página.</p>
                  <p className="mt-2">Apenas usuários com papel de <strong>coordenador</strong> ou <strong>gestor</strong> podem gerenciar usuários.</p>
                  {currentUserData?.user ? (
                    <>
                      <p className="mt-2">Seu papel atual: <strong className="capitalize">{currentUserData.user.role}</strong></p>
                      <p className="text-xs mt-1 text-muted-foreground">
                        Usuário: {currentUserData.user.name} ({currentUserData.user.email})
                      </p>
                      {currentUserData.user.role === 'coordenador' || currentUserData.user.role === 'gestor' ? (
                        <p className="text-xs mt-1 text-yellow-700">
                          ⚠️ Você tem o papel correto mas está recebendo erro. Tente recarregar a sessão.
                        </p>
                      ) : null}
                    </>
                  ) : (
                    <p className="mt-2 text-sm">Carregando informações do usuário...</p>
                  )}
                  <div className="mt-4 flex gap-2">
                    <Button 
                      variant="outline"
                      onClick={async () => {
                        console.log('Sincronizando sessão...');
                        try {
                          // Chama o endpoint para sincronizar a sessão
                          const response = await apiRequest("POST", "/api/auth/sync-session");
                          const data = await response.json();
                          console.log('Sessão sincronizada:', data);
                          
                          // Limpa todo o cache
                          await queryClient.invalidateQueries();
                          // Força refetch do usuário atual
                          await refetchUser();
                          // Aguarda um pouco para garantir que tudo foi atualizado
                          setTimeout(() => {
                            refetch();
                          }, 500);
                          
                          toast({
                            title: "Sessão sincronizada",
                            description: "Sua sessão foi atualizada com sucesso.",
                          });
                        } catch (error) {
                          console.error('Erro ao sincronizar sessão:', error);
                          toast({
                            title: "Erro",
                            description: "Não foi possível sincronizar a sessão.",
                            variant: "destructive",
                          });
                        }
                      }}
                    >
                      Sincronizar Sessão
                    </Button>
                    <Button 
                      variant="ghost"
                      onClick={() => {
                        // Força reload completo da página
                        window.location.reload();
                      }}
                    >
                      Recarregar Página
                    </Button>
                  </div>
                </>
              : `Erro ao carregar usuários: ${errorMessage}`}
          </AlertDescription>
        </Alert>
      </Layout>
    ); */
  }

  return (
    <Layout title="Gestão de Usuários" subtitle="Gerencie perfis, permissões e dados dos usuários">
      <div className="space-y-6">
        {/* Statistics Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-2 mb-2">
                <Users className="h-5 w-5 text-mesc-text" />
                <span className="text-sm font-medium text-muted-foreground">Total</span>
              </div>
              <div className="text-2xl font-bold">{stats.total}</div>
              <div className="text-xs text-muted-foreground mt-1">
                {stats.active} ativos • {stats.inactive} inativos
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-2 mb-2">
                <Crown className="h-5 w-5 text-purple-600" />
                <span className="text-sm font-medium text-muted-foreground">Reitores</span>
              </div>
              <div className="text-2xl font-bold text-purple-600">{stats.reitores}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-2 mb-2">
                <Shield className="h-5 w-5 text-blue-600" />
                <span className="text-sm font-medium text-muted-foreground">Coordenadores</span>
              </div>
              <div className="text-2xl font-bold text-blue-600">{stats.coordenadores}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-2 mb-2">
                <User className="h-5 w-5 text-green-600" />
                <span className="text-sm font-medium text-muted-foreground">Ministros</span>
              </div>
              <div className="text-2xl font-bold text-green-600">{stats.ministros}</div>
            </CardContent>
          </Card>
        </div>

        {/* Users List */}
        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <CardTitle>Lista de Usuários</CardTitle>
                <CardDescription>
                  Gerencie todos os usuários do sistema
                </CardDescription>
              </div>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por nome, email ou cidade..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 w-full sm:w-[300px]"
                />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Usuário</TableHead>
                    <TableHead>Contato</TableHead>
                    <TableHead>Perfil</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Informações</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                        Nenhum usuário encontrado
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredUsers.map((user) => (
                      <TableRow key={user.id}>
                        <TableCell>
                          <div>
                            <div className="font-medium">{user.name}</div>
                            {user.city && (
                              <div className="text-sm text-muted-foreground">{user.city}</div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            <div className="flex items-center gap-1 text-sm">
                              <Mail className="h-3 w-3" />
                              {user.email}
                            </div>
                            {user.phone && (
                              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                                <Phone className="h-3 w-3" />
                                {user.phone}
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className={`gap-1 ${getRoleColor(user.role)}`}>
                            {getRoleIcon(user.role)}
                            {getRoleLabel(user.role)}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge className={getStatusColor(user.status)}>
                            {getStatusLabel(user.status)}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {user.role === "ministro" && (
                            <div className="text-sm text-muted-foreground">
                              {user.totalServices ? `${user.totalServices} serviços` : "Novo ministro"}
                              {user.experience && ` • ${user.experience}`}
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" className="h-8 w-8 p-0">
                                <span className="sr-only">Abrir menu</span>
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuLabel>Ações</DropdownMenuLabel>
                              <DropdownMenuSeparator />
                              
                              {/* Alterar Perfil - Ministro */}
                              <DropdownMenuItem
                                onClick={() => updateRoleMutation.mutate({ 
                                  userId: user.id, 
                                  role: "ministro" 
                                })}
                                disabled={user.role === "ministro"}
                              >
                                <User className="mr-2 h-4 w-4" />
                                Alterar para Ministro
                              </DropdownMenuItem>
                              
                              {/* Alterar Perfil - Coordenador */}
                              <DropdownMenuItem
                                onClick={() => updateRoleMutation.mutate({ 
                                  userId: user.id, 
                                  role: "coordenador" 
                                })}
                                disabled={user.role === "coordenador"}
                              >
                                <Shield className="mr-2 h-4 w-4" />
                                Alterar para Coordenador
                              </DropdownMenuItem>
                              
                              {/* Alterar Perfil - Gestor */}
                              <DropdownMenuItem
                                onClick={() => updateRoleMutation.mutate({ 
                                  userId: user.id, 
                                  role: "gestor" 
                                })}
                                disabled={user.role === "gestor"}
                              >
                                <Crown className="mr-2 h-4 w-4" />
                                Alterar para Reitor
                              </DropdownMenuItem>
                              
                              <DropdownMenuSeparator />
                              
                              {/* Alterar Status - Ativo */}
                              <DropdownMenuItem
                                onClick={() => updateStatusMutation.mutate({ 
                                  userId: user.id, 
                                  status: "active" 
                                })}
                                disabled={user.status === "active"}
                              >
                                <CheckCircle className="mr-2 h-4 w-4 text-green-600" />
                                Ativar Usuário
                              </DropdownMenuItem>
                              
                              {/* Alterar Status - Inativo */}
                              <DropdownMenuItem
                                onClick={() => updateStatusMutation.mutate({ 
                                  userId: user.id, 
                                  status: "inactive" 
                                })}
                                disabled={user.status === "inactive"}
                              >
                                <Ban className="mr-2 h-4 w-4 text-red-600" />
                                Inativar Usuário
                              </DropdownMenuItem>
                              
                              {/* Alterar Status - Pendente */}
                              <DropdownMenuItem
                                onClick={() => updateStatusMutation.mutate({ 
                                  userId: user.id, 
                                  status: "pending" 
                                })}
                                disabled={user.status === "pending"}
                              >
                                <AlertCircle className="mr-2 h-4 w-4 text-yellow-600" />
                                Marcar como Pendente
                              </DropdownMenuItem>
                              
                              <DropdownMenuSeparator />
                              
                              <DropdownMenuItem
                                onClick={() => {
                                  setSelectedUserId(user.id);
                                  setResetPasswordOpen(true);
                                }}
                              >
                                <KeyRound className="mr-2 h-4 w-4" />
                                Resetar Senha
                              </DropdownMenuItem>
                              
                              <DropdownMenuItem
                                onClick={() => handleDeleteUser(user)}
                                className="text-red-600"
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Remover Usuário
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* Reset Password Dialog */}
        <Dialog open={resetPasswordOpen} onOpenChange={setResetPasswordOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Resetar Senha do Usuário</DialogTitle>
              <DialogDescription>
                Digite uma nova senha temporária para o usuário. Ele será solicitado a criar uma nova senha no próximo login.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="new-password">Nova Senha Temporária</Label>
                <Input
                  id="new-password"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Digite a nova senha"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setResetPasswordOpen(false)}>
                Cancelar
              </Button>
              <Button
                onClick={() => {
                  if (selectedUserId && newPassword) {
                    resetPasswordMutation.mutate({ userId: selectedUserId, newPassword });
                  }
                }}
                disabled={!newPassword || resetPasswordMutation.isPending}
              >
                {resetPasswordMutation.isPending ? "Resetando..." : "Resetar Senha"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete/Block Confirmation Dialog */}
        <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {userUsage?.isUsed ? "Bloquear Usuário" : "Excluir Usuário"}
              </DialogTitle>
            </DialogHeader>
            
            {userUsage?.isUsed ? (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Este usuário não pode ser excluído pois já foi utilizado no sistema.
                  {userUsage.reason && (
                    <p className="mt-2 text-sm text-muted-foreground">{userUsage.reason}</p>
                  )}
                  <p className="mt-2 font-medium">O usuário será bloqueado ao invés de excluído.</p>
                </AlertDescription>
              </Alert>
            ) : (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Tem certeza que deseja excluir permanentemente o usuário <strong>{userToDelete?.name}</strong>? 
                  Esta ação não pode ser desfeita.
                </AlertDescription>
              </Alert>
            )}
            
            <DialogFooter>
              <Button variant="outline" onClick={() => setDeleteConfirmOpen(false)}>
                Cancelar
              </Button>
              <Button 
                variant="destructive" 
                onClick={confirmDeleteOrBlock}
                disabled={deleteUserMutation.isPending || blockUserMutation.isPending}
              >
                {deleteUserMutation.isPending || blockUserMutation.isPending ? "Processando..." : 
                 userUsage?.isUsed ? "Bloquear Usuário" : "Excluir Usuário"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
}