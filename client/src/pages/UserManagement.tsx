import { Layout } from "@/components/layout";
import { useState, useEffect, useCallback } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { authAPI } from "@/lib/auth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { toast } from "@/hooks/use-toast";
import {
  Users,
  Search,
  Plus,
  Edit,
  Eye,
  UserCheck,
  UserX,
  Phone,
  Mail,
  MapPin,
  CalendarIcon,
  Church,
  Crown,
  Shield,
  User,
  KeyRound,
  AlertCircle,
  Trash2,
  Ban,
  CheckCircle,
  MoreHorizontal,
  Clock,
  ArrowUpDown,
  ArrowUp,
  ArrowDown
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { LITURGICAL_POSITIONS } from "@shared/constants";

interface User {
  id: string;
  name: string;
  email: string;
  phone?: string;
  status: 'active' | 'inactive' | 'pending';
  role: "gestor" | "coordenador" | "ministro";
  birthDate?: string;
  address?: string;
  city?: string;
  zipCode?: string;
  emergencyContact?: string;
  emergencyPhone?: string;
  preferredPosition?: number;
  preferredPositions?: number[];
  avoidPositions?: number[];
  availableForSpecialEvents?: boolean;
  canServeAsCouple?: boolean;
  spouseUserId?: string;
  experience?: string;
  specialSkills?: string[];
  liturgicalTraining?: string[];
  lastService?: string;
  totalServices?: number;
  formationCompleted?: string[];
  observations?: string;
  scheduleDisplayName?: string;
  createdAt: string;
  active?: boolean;
}

const SPECIAL_SKILLS = [
  "Liturgia",
  "Canto",
  "Leitura",
  "Acólito",
  "Coordenação",
  "Formação"
];

export default function UserManagement({ isEmbedded = false }: { isEmbedded?: boolean }) {
  const [location] = useLocation();
  const { data: authData } = useQuery({
    queryKey: ["/api/auth/me"],
    queryFn: () => authAPI.getMe(),
  });

  const user = authData?.user;
  const isCoordinator = user?.role === "coordenador" || user?.role === "gestor";

  // State management
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [formData, setFormData] = useState<Partial<User>>({});
  const [birthDate, setBirthDate] = useState<Date | undefined>();

  // Admin dialogs
  const [resetPasswordOpen, setResetPasswordOpen] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<User | null>(null);
  const [userUsage, setUserUsage] = useState<{ isUsed: boolean; reason?: string } | null>(null);

  // Sorting state
  const [sortField, setSortField] = useState<keyof User>('name');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  // Função para carregar usuários (declarada antes dos mutations)
  const fetchUsers = useCallback(async () => {
    try {
      const response = await fetch("/api/users", {
        credentials: "include"
      });

      if (response.ok) {
        const data = await response.json();
        setUsers(data);
      } else {
        toast({
          title: "Erro",
          description: "Erro ao carregar usuários",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error("Error fetching users:", error);
      toast({
        title: "Erro",
        description: "Erro ao conectar com o servidor",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  }, []);

  // Mutations
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
      const response = await apiRequest("POST", "/api/auth/admin-reset-password", { userId, newPassword });
      return response.json();
    },
    onSuccess: async () => {
      // Recarregar lista de usuários sem usar query cache (previne loop)
      await fetchUsers();
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
      return { success: true };
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
      if (error.shouldBlock && userToDelete) {
        blockUserMutation.mutate(userToDelete.id);
        return;
      }

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

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  useEffect(() => {
    const searchParams = new URLSearchParams(location.split('?')[1] || '');
    const userId = searchParams.get('id');

    if (userId && users.length > 0) {
      const foundUser = users.find(u => u.id === userId);
      if (foundUser) {
        handleView(foundUser);
      }
    }
  }, [location, users]);

  const handleView = (selectedUser: User) => {
    setSelectedUser(selectedUser);

    // Normalize array fields that might come as strings or null from the database
    const normalizedData = {
      ...selectedUser,
      specialSkills: Array.isArray(selectedUser.specialSkills)
        ? selectedUser.specialSkills
        : [],
      liturgicalTraining: Array.isArray(selectedUser.liturgicalTraining)
        ? selectedUser.liturgicalTraining
        : [],
      formationCompleted: Array.isArray(selectedUser.formationCompleted)
        ? selectedUser.formationCompleted
        : [],
    };

    setFormData(normalizedData);
    setIsEditMode(false);
    setIsDialogOpen(true);
    if (selectedUser.birthDate) {
      try {
        setBirthDate(new Date(selectedUser.birthDate));
      } catch (error) {
        console.error("Invalid birthDate:", selectedUser.birthDate);
        setBirthDate(undefined);
      }
    } else {
      setBirthDate(undefined);
    }
  };

  const handleEdit = (selectedUser: User) => {
    setSelectedUser(selectedUser);

    // Normalize array fields that might come as strings or null from the database
    const normalizedData = {
      ...selectedUser,
      preferredPositions: Array.isArray(selectedUser.preferredPositions)
        ? selectedUser.preferredPositions
        : [],
      avoidPositions: Array.isArray(selectedUser.avoidPositions)
        ? selectedUser.avoidPositions
        : [],
      specialSkills: Array.isArray(selectedUser.specialSkills)
        ? selectedUser.specialSkills
        : [],
      liturgicalTraining: Array.isArray(selectedUser.liturgicalTraining)
        ? selectedUser.liturgicalTraining
        : [],
      formationCompleted: Array.isArray(selectedUser.formationCompleted)
        ? selectedUser.formationCompleted
        : [],
    };

    setFormData(normalizedData);
    setBirthDate(selectedUser.birthDate ? new Date(selectedUser.birthDate) : undefined);
    setIsEditMode(true);
    setIsDialogOpen(true);
  };

  const handleSave = async () => {
    if (!selectedUser) return;

    try {
      const dataToSave = {
        ...formData,
        birthDate: birthDate?.toISOString(),
        scheduleDisplayName: formData.scheduleDisplayName || null
      };

      const response = await fetch(`/api/ministers/${selectedUser.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json"
        },
        credentials: "include",
        body: JSON.stringify(dataToSave)
      });

      if (response.ok) {
        toast({
          title: "Sucesso",
          description: "Dados atualizados com sucesso"
        });
        fetchUsers();
        setIsDialogOpen(false);
        setIsEditMode(false);
      } else {
        const error = await response.json();
        toast({
          title: "Erro",
          description: error.message || "Erro ao atualizar usuário",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error("Error saving user:", error);
      toast({
        title: "Erro",
        description: "Erro ao salvar dados",
        variant: "destructive"
      });
    }
  };

  const handleDeleteUser = async (targetUser: User) => {
    setUserToDelete(targetUser);

    try {
      const response = await apiRequest("GET", `/api/users/${targetUser.id}/check-usage`);

      if (response.ok) {
        const usage = await response.json();
        setUserUsage(usage);
      } else {
        console.warn(`Check usage returned ${response.status}, defaulting to block`);
        setUserUsage(null);
      }
    } catch (error) {
      console.error("Error checking user usage:", error);
      setUserUsage(null);
    }

    setDeleteConfirmOpen(true);
  };

  const confirmDeleteOrBlock = () => {
    if (userToDelete) {
      const isUserUsed = userUsage?.isUsed;

      if (userUsage === null || isUserUsed) {
        blockUserMutation.mutate(userToDelete.id);
      } else {
        deleteUserMutation.mutate(userToDelete.id);
      }
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case "gestor": return <Crown className="h-4 w-4" />;
      case "coordenador": return <Shield className="h-4 w-4" />;
      default: return <User className="h-4 w-4" />;
    }
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case "gestor": return "Reitor";
      case "coordenador": return "Coordenador";
      default: return "Ministro";
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case "gestor": return "bg-purple-100 text-purple-800 border-purple-200";
      case "coordenador": return "bg-blue-100 text-blue-800 border-blue-200";
      default: return "bg-green-100 text-green-800 border-green-200";
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active": return "bg-green-100 text-green-800 border-green-200";
      case "inactive": return "bg-red-100 text-red-800 border-red-200";
      default: return "bg-yellow-100 text-yellow-800 border-yellow-200";
    }
  };

  const getExperienceColor = (experience?: string) => {
    if (!experience || experience === "iniciante") return "secondary";
    if (experience === "sênior") return "default";
    if (experience === "intermediário") return "outline";
    return "secondary";
  };

  const getExperienceLabel = (experience?: string) => {
    if (!experience) return "Iniciante";
    if (experience === "sênior") return "Sênior";
    if (experience === "intermediário") return "Intermediário";
    if (experience === "iniciante") return "Iniciante";
    return "Iniciante";
  };

  const handleSort = (field: keyof User) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const filteredUsers = users
    .filter(targetUser =>
      targetUser.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      targetUser.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      targetUser.city?.toLowerCase().includes(searchTerm.toLowerCase())
    )
    .sort((a, b) => {
      const aValue = a[sortField];
      const bValue = b[sortField];

      if (aValue === null || aValue === undefined) return 1;
      if (bValue === null || bValue === undefined) return -1;

      if (typeof aValue === 'string' && typeof bValue === 'string') {
        return sortDirection === 'asc'
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue);
      }

      if (typeof aValue === 'number' && typeof bValue === 'number') {
        return sortDirection === 'asc' ? aValue - bValue : bValue - aValue;
      }

      return 0;
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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg text-muted-foreground">Carregando usuários...</div>
      </div>
    );
  }

  const content = (
    <div className="max-w-7xl mx-auto p-6 ml-[-4px] mr-[-4px] pl-[8px] pr-[8px] pt-[14px] pb-[14px] space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Usuários</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Ativos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.active}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Coordenadores</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{stats.coordenadores}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Ministros</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">{stats.ministros}</div>
          </CardContent>
        </Card>
      </div>

      {/* Main Table */}
      <Card className="border-opacity-30">
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <CardTitle>Gerenciamento de Usuários</CardTitle>
              <CardDescription>
                Gerencie perfis, permissões e informações ministeriais
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative w-full sm:w-auto">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8 w-full sm:w-64"
                />
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>
                  <Button
                    variant="ghost"
                    onClick={() => handleSort('name')}
                    className="flex items-center gap-1 hover:bg-transparent p-0 h-auto font-medium"
                  >
                    Nome
                    {sortField === 'name' ? (
                      sortDirection === 'asc' ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />
                    ) : (
                      <ArrowUpDown className="h-4 w-4 opacity-50" />
                    )}
                  </Button>
                </TableHead>
                <TableHead>
                  <Button
                    variant="ghost"
                    onClick={() => handleSort('role')}
                    className="flex items-center gap-1 hover:bg-transparent p-0 h-auto font-medium"
                  >
                    Perfil
                    {sortField === 'role' ? (
                      sortDirection === 'asc' ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />
                    ) : (
                      <ArrowUpDown className="h-4 w-4 opacity-50" />
                    )}
                  </Button>
                </TableHead>
                <TableHead>
                  <Button
                    variant="ghost"
                    onClick={() => handleSort('status')}
                    className="flex items-center gap-1 hover:bg-transparent p-0 h-auto font-medium"
                  >
                    Status
                    {sortField === 'status' ? (
                      sortDirection === 'asc' ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />
                    ) : (
                      <ArrowUpDown className="h-4 w-4 opacity-50" />
                    )}
                  </Button>
                </TableHead>
                <TableHead>Contato</TableHead>
                <TableHead>Info Ministerial</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredUsers.map((targetUser) => (
                <TableRow key={targetUser.id}>
                  <TableCell>
                    <div>
                      <div className="font-medium">{targetUser.name}</div>
                      {targetUser.city && (
                        <div className="text-sm text-muted-foreground">{targetUser.city}</div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge className={getRoleColor(targetUser.role)}>
                      <div className="flex items-center gap-1">
                        {getRoleIcon(targetUser.role)}
                        {getRoleLabel(targetUser.role)}
                      </div>
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge className={getStatusColor(targetUser.status)}>
                      {targetUser.status === 'active' ? 'Ativo' : targetUser.status === 'pending' ? 'Pendente' : 'Inativo'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      <div className="flex items-center gap-1 text-sm">
                        <Mail className="h-3 w-3" />
                        {targetUser.email}
                      </div>
                      {targetUser.phone && (
                        <div className="flex items-center gap-1 text-sm text-muted-foreground">
                          <Phone className="h-3 w-3" />
                          {targetUser.phone}
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    {targetUser.role === "ministro" && (
                      <div className="text-sm text-muted-foreground">
                        {targetUser.totalServices ? `${targetUser.totalServices} serviços` : "Novo ministro"}
                        {targetUser.experience && ` • ${targetUser.experience}`}
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleView(targetUser)}
                        title="Visualizar"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      {isCoordinator && (
                        <>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEdit(targetUser)}
                            title="Editar"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
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

                              <DropdownMenuItem
                                onClick={() => updateRoleMutation.mutate({
                                  userId: targetUser.id,
                                  role: "ministro"
                                })}
                                disabled={targetUser.role === "ministro"}
                              >
                                <User className="mr-2 h-4 w-4" />
                                Alterar para Ministro
                              </DropdownMenuItem>

                              <DropdownMenuItem
                                onClick={() => updateRoleMutation.mutate({
                                  userId: targetUser.id,
                                  role: "coordenador"
                                })}
                                disabled={targetUser.role === "coordenador"}
                              >
                                <Shield className="mr-2 h-4 w-4" />
                                Alterar para Coordenador
                              </DropdownMenuItem>

                              <DropdownMenuItem
                                onClick={() => updateRoleMutation.mutate({
                                  userId: targetUser.id,
                                  role: "gestor"
                                })}
                                disabled={targetUser.role === "gestor"}
                              >
                                <Crown className="mr-2 h-4 w-4" />
                                Alterar para Reitor
                              </DropdownMenuItem>

                              <DropdownMenuSeparator />

                              <DropdownMenuItem
                                onClick={() => updateStatusMutation.mutate({
                                  userId: targetUser.id,
                                  status: "active"
                                })}
                                disabled={targetUser.status === "active"}
                              >
                                <CheckCircle className="mr-2 h-4 w-4 text-green-600" />
                                Ativar Usuário
                              </DropdownMenuItem>

                              <DropdownMenuItem
                                onClick={() => updateStatusMutation.mutate({
                                  userId: targetUser.id,
                                  status: "inactive"
                                })}
                                disabled={targetUser.status === "inactive"}
                              >
                                <Ban className="mr-2 h-4 w-4 text-red-600" />
                                Inativar Usuário
                              </DropdownMenuItem>

                              <DropdownMenuItem
                                onClick={() => updateStatusMutation.mutate({
                                  userId: targetUser.id,
                                  status: "pending"
                                })}
                                disabled={targetUser.status === "pending"}
                              >
                                <AlertCircle className="mr-2 h-4 w-4 text-yellow-600" />
                                Marcar como Pendente
                              </DropdownMenuItem>

                              <DropdownMenuSeparator />

                              <DropdownMenuItem
                                onClick={() => {
                                  setSelectedUserId(targetUser.id);
                                  setResetPasswordOpen(true);
                                }}
                              >
                                <KeyRound className="mr-2 h-4 w-4" />
                                Resetar Senha
                              </DropdownMenuItem>

                              <DropdownMenuItem
                                onClick={() => handleDeleteUser(targetUser)}
                                className="text-red-600"
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Remover Usuário
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Edit/View Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={(open) => {
        setIsDialogOpen(open);
        if (!open) {
          setIsEditMode(false);
        }
      }}>
        <DialogContent className="max-w-[95vw] sm:max-w-3xl h-[90vh] flex flex-col gap-0 p-0 overflow-hidden">
          <DialogHeader className="px-6 py-4 border-b flex-shrink-0">
            <DialogTitle>
              {isEditMode ? "Editar Usuário" : "Detalhes do Usuário"}
            </DialogTitle>
            <DialogDescription>
              {isEditMode ? "Atualize as informações do usuário" : "Visualizar informações completas"}
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto px-6 py-4">
            <div className="space-y-6">
            {selectedUser && (
              <>
                {/* Informações Básicas */}
              <div className="space-y-4">
                <h3 className="font-semibold text-lg">Informações Pessoais</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="sm:col-span-2 md:col-span-1">
                    <Label>Nome</Label>
                    <Input
                      value={selectedUser.name}
                      disabled
                    />
                  </div>
                  <div className="sm:col-span-2 md:col-span-1">
                    <Label>Nome na Escala (opcional)</Label>
                    {isEditMode ? (
                      <Input
                        value={formData.scheduleDisplayName || ""}
                        onChange={(e) => setFormData({
                          ...formData,
                          scheduleDisplayName: e.target.value
                        })}
                        placeholder="Ex: M. Silva, João P."
                      />
                    ) : (
                      <Input
                        value={selectedUser.scheduleDisplayName || ""}
                        disabled
                      />
                    )}
                  </div>
                  <div className="sm:col-span-2 md:col-span-1">
                    <Label>Email</Label>
                    <Input
                      value={selectedUser.email}
                      disabled
                    />
                  </div>
                  <div className="sm:col-span-2 md:col-span-1">
                    <Label>Telefone</Label>
                    <Input
                      value={selectedUser.phone || ""}
                      disabled
                    />
                  </div>
                  <div className="sm:col-span-2 md:col-span-1">
                    <Label>Data de Nascimento</Label>
                    {isEditMode ? (
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            className={cn(
                              "w-full justify-start text-left font-normal",
                              !birthDate && "text-muted-foreground"
                            )}
                          >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {birthDate ? format(birthDate, "dd/MM/yyyy") : "Selecione uma data"}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={birthDate}
                            onSelect={setBirthDate}
                            initialFocus
                            locale={ptBR}
                          />
                        </PopoverContent>
                      </Popover>
                    ) : (
                      <Input
                        value={(() => {
                          try {
                            return birthDate ? format(birthDate, "dd/MM/yyyy") : "-";
                          } catch (error) {
                            console.error("Invalid birthDate for formatting:", birthDate);
                            return "-";
                          }
                        })()}
                        disabled
                      />
                    )}
                  </div>
                </div>
              </div>

              {/* Informações Ministeriais */}
              <div className="space-y-4">
                <h3 className="font-semibold text-lg">Informações Ministeriais</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label>Posição Litúrgica Preferida</Label>
                    {isEditMode ? (
                      <Select
                        value={formData.preferredPosition?.toString() || ""}
                        onValueChange={(value) => setFormData({...formData, preferredPosition: parseInt(value)})}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione uma posição" />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.entries(LITURGICAL_POSITIONS).map(([key, value]) => (
                            <SelectItem key={key} value={key}>
                              {value}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <Input
                        value={formData.preferredPosition && LITURGICAL_POSITIONS[formData.preferredPosition as keyof typeof LITURGICAL_POSITIONS]
                          ? LITURGICAL_POSITIONS[formData.preferredPosition as keyof typeof LITURGICAL_POSITIONS]
                          : "-"}
                        disabled
                      />
                    )}
                  </div>
                  <div>
                    <Label>Nível de Experiência</Label>
                    {isEditMode ? (
                      <Select
                        value={formData.experience || "iniciante"}
                        onValueChange={(value) => setFormData({...formData, experience: value})}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="iniciante">Iniciante</SelectItem>
                          <SelectItem value="intermediário">Intermediário</SelectItem>
                          <SelectItem value="sênior">Sênior</SelectItem>
                        </SelectContent>
                      </Select>
                    ) : (
                      <Input
                        value={getExperienceLabel(formData.experience)}
                        disabled
                      />
                    )}
                  </div>
                </div>

                {/* Posições Preferenciais - Apenas para Coordenadores */}
                {isCoordinator && (
                <div>
                  <Label>Posições Preferenciais (até 5)</Label>
                  <p className="text-xs text-muted-foreground mb-2">
                    Selecione até 5 posições litúrgicas preferenciais para este ministro
                  </p>
                  {isEditMode ? (
                    <div className="grid grid-cols-1 xs:grid-cols-2 sm:grid-cols-3 gap-2">
                      {Object.entries(LITURGICAL_POSITIONS).map(([key, value]) => {
                        const positionNumber = parseInt(key);
                        const isChecked = Array.isArray(formData.preferredPositions) &&
                          formData.preferredPositions.includes(positionNumber);
                        const isDisabled = !isChecked &&
                          Array.isArray(formData.preferredPositions) &&
                          formData.preferredPositions.length >= 5;

                        return (
                          <div key={key} className="flex items-center space-x-2">
                            <Checkbox
                              checked={isChecked}
                              disabled={isDisabled}
                              onCheckedChange={(checked) => {
                                const currentPositions = Array.isArray(formData.preferredPositions)
                                  ? formData.preferredPositions
                                  : [];

                                if (checked) {
                                  if (currentPositions.length < 5) {
                                    setFormData({
                                      ...formData,
                                      preferredPositions: [...currentPositions, positionNumber]
                                    });
                                  }
                                } else {
                                  setFormData({
                                    ...formData,
                                    preferredPositions: currentPositions.filter(p => p !== positionNumber)
                                  });
                                }
                              }}
                            />
                            <Label className={isDisabled ? "text-muted-foreground" : ""}>{value}</Label>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="flex gap-2 mt-2 flex-wrap">
                      {Array.isArray(formData.preferredPositions) && formData.preferredPositions.length > 0 ? (
                        formData.preferredPositions.map((position) => (
                          <Badge key={position} variant="secondary" className="bg-green-100 text-green-700">
                            {LITURGICAL_POSITIONS[position as keyof typeof LITURGICAL_POSITIONS] || `Posição ${position}`}
                          </Badge>
                        ))
                      ) : (
                        <span className="text-muted-foreground">Nenhuma posição preferencial selecionada</span>
                      )}
                    </div>
                  )}
                </div>
                )}

                {/* Posições a Evitar - Apenas para Coordenadores */}
                {isCoordinator && (
                <div>
                  <Label>Posições a Evitar (até 5)</Label>
                  <p className="text-xs text-muted-foreground mb-2">
                    Selecione até 5 posições litúrgicas a evitar para este ministro
                  </p>
                  {isEditMode ? (
                    <div className="grid grid-cols-1 xs:grid-cols-2 sm:grid-cols-3 gap-2">
                      {Object.entries(LITURGICAL_POSITIONS).map(([key, value]) => {
                        const positionNumber = parseInt(key);
                        const isChecked = Array.isArray(formData.avoidPositions) &&
                          formData.avoidPositions.includes(positionNumber);
                        const isDisabled = !isChecked &&
                          Array.isArray(formData.avoidPositions) &&
                          formData.avoidPositions.length >= 5;

                        return (
                          <div key={key} className="flex items-center space-x-2">
                            <Checkbox
                              checked={isChecked}
                              disabled={isDisabled}
                              onCheckedChange={(checked) => {
                                const currentPositions = Array.isArray(formData.avoidPositions)
                                  ? formData.avoidPositions
                                  : [];

                                if (checked) {
                                  if (currentPositions.length < 5) {
                                    setFormData({
                                      ...formData,
                                      avoidPositions: [...currentPositions, positionNumber]
                                    });
                                  }
                                } else {
                                  setFormData({
                                    ...formData,
                                    avoidPositions: currentPositions.filter(p => p !== positionNumber)
                                  });
                                }
                              }}
                            />
                            <Label className={isDisabled ? "text-muted-foreground" : ""}>{value}</Label>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="flex gap-2 mt-2 flex-wrap">
                      {Array.isArray(formData.avoidPositions) && formData.avoidPositions.length > 0 ? (
                        formData.avoidPositions.map((position) => (
                          <Badge key={position} variant="secondary" className="bg-red-100 text-red-700">
                            {LITURGICAL_POSITIONS[position as keyof typeof LITURGICAL_POSITIONS] || `Posição ${position}`}
                          </Badge>
                        ))
                      ) : (
                        <span className="text-muted-foreground">Nenhuma posição a evitar selecionada</span>
                      )}
                    </div>
                  )}
                </div>
                )}

                <div>
                  <Label>Habilidades Especiais</Label>
                  {isEditMode ? (
                    <div className="grid grid-cols-1 xs:grid-cols-2 sm:grid-cols-3 gap-2 mt-2">
                      {SPECIAL_SKILLS.map((skill) => (
                        <div key={skill} className="flex items-center space-x-2">
                          <Checkbox
                            checked={formData.specialSkills?.includes(skill) || false}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                setFormData({
                                  ...formData,
                                  specialSkills: [...(formData.specialSkills || []), skill]
                                });
                              } else {
                                setFormData({
                                  ...formData,
                                  specialSkills: formData.specialSkills?.filter(s => s !== skill) || []
                                });
                              }
                            }}
                          />
                          <Label>{skill}</Label>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="flex gap-2 mt-2">
                      {Array.isArray(formData.specialSkills) && formData.specialSkills.length > 0 ? (
                        formData.specialSkills.map((skill) => (
                          <Badge key={skill} variant="outline">{skill}</Badge>
                        ))
                      ) : (
                        <span className="text-muted-foreground">Nenhuma habilidade selecionada</span>
                      )}
                    </div>
                  )}
                </div>

                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        checked={formData.availableForSpecialEvents || false}
                        onCheckedChange={(checked) => setFormData({...formData, availableForSpecialEvents: checked as boolean})}
                        disabled={!isEditMode}
                      />
                      <Label>Disponível para eventos especiais</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        checked={formData.canServeAsCouple || false}
                        onCheckedChange={(checked) => setFormData({...formData, canServeAsCouple: checked as boolean})}
                        disabled={!isEditMode}
                      />
                      <Label>Pode servir em casal</Label>
                    </div>
                  </div>

                  {isCoordinator && (
                    <div className="flex items-center space-x-2 p-3 bg-muted rounded-lg">
                      <Checkbox
                        checked={formData.status === 'active'}
                        onCheckedChange={(checked) => setFormData({
                          ...formData,
                          status: checked ? 'active' : 'inactive'
                        })}
                        disabled={!isEditMode}
                      />
                      <Label className="font-medium">Ministro Ativo</Label>
                      {formData.status === 'inactive' && (
                        <Badge variant="destructive" className="ml-2">Inativo</Badge>
                      )}
                      {formData.status === 'pending' && (
                        <Badge variant="outline" className="ml-2">Pendente</Badge>
                      )}
                    </div>
                  )}
                </div>

                <div>
                  <Label>Observações</Label>
                  <Textarea
                    value={formData.observations || ""}
                    onChange={(e) => setFormData({...formData, observations: e.target.value})}
                    disabled={!isEditMode}
                    rows={3}
                  />
                </div>
              </div>

              {/* Estatísticas */}
              <div className="space-y-4">
                <h3 className="font-semibold text-lg">Estatísticas</h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <Card>
                    <CardContent className="pt-6">
                      <div className="text-2xl font-bold">{formData.totalServices || 0}</div>
                      <p className="text-xs text-muted-foreground">Total de Serviços</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-6">
                      <div className="text-2xl font-bold">
                        {formData.formationCompleted?.length || 0}
                      </div>
                      <p className="text-xs text-muted-foreground">Formações Concluídas</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-6">
                      <div className="text-2xl font-bold">
                        {(() => {
                          try {
                            return formData.lastService ?
                              format(new Date(formData.lastService), "dd/MM", { locale: ptBR }) :
                              "-";
                          } catch (error) {
                            console.error("Invalid lastService date:", formData.lastService);
                            return "-";
                          }
                        })()}
                      </div>
                      <p className="text-xs text-muted-foreground">Último Serviço</p>
                    </CardContent>
                  </Card>
                </div>
              </div>
              </>
            )}
            </div>
          </div>

          {selectedUser && (
            <DialogFooter className="border-t px-6 py-4 flex-shrink-0">
              {isEditMode ? (
                <>
                  <Button variant="outline" onClick={() => {
                    setIsEditMode(false);
                    setFormData(selectedUser);
                  }}>
                    Cancelar
                  </Button>
                  <Button onClick={handleSave}>
                    Salvar Alterações
                  </Button>
                </>
              ) : (
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Fechar
                </Button>
              )}
            </DialogFooter>
          )}
        </DialogContent>
      </Dialog>

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
              {(() => {
                const willBlock = userUsage?.isUsed === true || userUsage === null;
                return willBlock ? "Bloquear Usuário" : "Excluir Usuário";
              })()}
            </DialogTitle>
          </DialogHeader>

          {(() => {
            const willBlock = userUsage?.isUsed === true || userUsage === null;

            if (willBlock) {
              return (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    {userUsage?.isUsed ? (
                      <>
                        Este usuário não pode ser excluído pois já foi utilizado no sistema.
                        {userUsage.reason && (
                          <p className="mt-2 text-sm text-muted-foreground">{userUsage.reason}</p>
                        )}
                        <p className="mt-2 font-medium">O usuário será bloqueado ao invés de excluído.</p>
                      </>
                    ) : (
                      <>
                        Não foi possível verificar se o usuário foi utilizado no sistema.
                        <p className="mt-2 font-medium">Por segurança, o usuário será bloqueado ao invés de excluído.</p>
                      </>
                    )}
                  </AlertDescription>
                </Alert>
              );
            } else {
              return (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    Tem certeza que deseja excluir permanentemente o usuário <strong>{userToDelete?.name}</strong>?
                    Esta ação não pode ser desfeita.
                  </AlertDescription>
                </Alert>
              );
            }
          })()}

          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirmOpen(false)}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDeleteOrBlock}
              disabled={deleteUserMutation.isPending || blockUserMutation.isPending}
            >
              {(() => {
                if (deleteUserMutation.isPending || blockUserMutation.isPending) {
                  return "Processando...";
                }
                const willBlock = userUsage?.isUsed === true || userUsage === null;
                return willBlock ? "Bloquear Usuário" : "Excluir Usuário";
              })()}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );

  if (isEmbedded) {
    return content;
  }

  return (
    <Layout
      title="Gestão de Usuários"
      subtitle="Gerencie perfis, permissões e dados dos usuários"
    >
      {content}
    </Layout>
  );
}
