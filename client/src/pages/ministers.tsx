import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { apiRequest } from "@/lib/queryClient";
import { Layout } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  Plus, 
  Download, 
  Search, 
  Edit, 
  Eye, 
  Trash2,
  AlertCircle
} from "lucide-react";
import type { User } from "@shared/schema";

export default function Ministers() {
  const { toast } = useToast();
  const { isAuthenticated } = useAuth();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [teamFilter, setTeamFilter] = useState("all");

  const { data: ministers = [], isLoading, error } = useQuery({
    queryKey: ["/api/users"],
    enabled: isAuthenticated,
    retry: false,
  });

  const deleteMinisterMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/users/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      toast({
        title: "Sucesso",
        description: "Ministro removido com sucesso",
      });
    },
    onError: (error) => {
      if (isUnauthorizedError(error as Error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Erro",
        description: "Erro ao remover ministro",
        variant: "destructive",
      });
    },
  });

  const handleDeleteMinister = (id: string, name: string) => {
    if (confirm(`Tem certeza que deseja remover o ministro ${name}?`)) {
      deleteMinisterMutation.mutate(id);
    }
  };

  const filteredMinisters = ministers.filter((minister: User) => {
    const matchesSearch = minister.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         minister.email?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || minister.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return (
          <Badge className="bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300">
            <span className="w-1.5 h-1.5 bg-green-600 rounded-full mr-1.5"></span>
            Ativo
          </Badge>
        );
      case 'inactive':
        return (
          <Badge variant="secondary">
            <span className="w-1.5 h-1.5 bg-gray-600 rounded-full mr-1.5"></span>
            Inativo
          </Badge>
        );
      case 'pending':
        return (
          <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-300">
            <span className="w-1.5 h-1.5 bg-yellow-600 rounded-full mr-1.5"></span>
            Pendente
          </Badge>
        );
      default:
        return (
          <Badge variant="secondary">
            {status}
          </Badge>
        );
    }
  };

  const getTeamBadge = (index: number) => {
    const teams = ['Equipe A', 'Equipe B', 'Equipe C'];
    const colors = ['bg-primary/10 text-primary', 'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-300', 'bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-300'];
    const teamIndex = index % teams.length;
    
    return (
      <Badge className={colors[teamIndex]}>
        {teams[teamIndex]}
      </Badge>
    );
  };

  const getUserDisplayName = (user: User) => {
    if (user.name) return user.name;
    if (user.firstName || user.lastName) {
      return `${user.firstName || ''} ${user.lastName || ''}`.trim();
    }
    return user.email?.split('@')[0] || 'Usuário';
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  if (error) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[400px]">
          <Card className="w-full max-w-md">
            <CardContent className="pt-6">
              <div className="flex mb-4 gap-2 items-center justify-center">
                <AlertCircle className="h-8 w-8 text-red-500" />
                <h1 className="text-2xl font-bold text-gray-900">Erro ao carregar</h1>
              </div>
              <p className="mt-4 text-sm text-gray-600 text-center">
                Não foi possível carregar a lista de ministros.
              </p>
            </CardContent>
          </Card>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-heading font-bold text-foreground">Ministros</h1>
            <p className="text-muted-foreground mt-1">Gerenciar ministros extraordinários</p>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="outline" data-testid="button-export">
              <Download className="w-4 h-4 mr-2" />
              Exportar
            </Button>
            <Button data-testid="button-new-minister">
              <Plus className="w-4 h-4 mr-2" />
              Novo Ministro
            </Button>
          </div>
        </div>

        {/* Filters and Search */}
        <Card>
          <CardContent className="p-6">
            <div className="flex flex-col lg:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                  <Input
                    placeholder="Buscar ministros..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                    data-testid="input-search"
                  />
                </div>
              </div>
              <div className="flex flex-col sm:flex-row gap-3">
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-full sm:w-[180px]" data-testid="select-status">
                    <SelectValue placeholder="Todos os Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os Status</SelectItem>
                    <SelectItem value="active">Ativo</SelectItem>
                    <SelectItem value="inactive">Inativo</SelectItem>
                    <SelectItem value="pending">Pendente</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={teamFilter} onValueChange={setTeamFilter}>
                  <SelectTrigger className="w-full sm:w-[180px]" data-testid="select-team">
                    <SelectValue placeholder="Todas as Equipes" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas as Equipes</SelectItem>
                    <SelectItem value="A">Equipe A</SelectItem>
                    <SelectItem value="B">Equipe B</SelectItem>
                    <SelectItem value="C">Equipe C</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Ministers Table */}
        <Card>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Ministro</TableHead>
                  <TableHead>Equipe</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Última Participação</TableHead>
                  <TableHead>Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8">
                      Carregando ministros...
                    </TableCell>
                  </TableRow>
                ) : filteredMinisters.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8">
                      Nenhum ministro encontrado
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredMinisters.map((minister: User, index: number) => (
                    <TableRow key={minister.id} className="hover:bg-muted/50 transition-colors" data-testid={`row-minister-${index}`}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="w-10 h-10">
                            <AvatarImage src={minister.profileImageUrl} alt={getUserDisplayName(minister)} />
                            <AvatarFallback className="bg-primary text-primary-foreground text-sm">
                              {getInitials(getUserDisplayName(minister))}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium text-foreground" data-testid={`text-minister-name-${index}`}>
                              {getUserDisplayName(minister)}
                            </p>
                            <p className="text-sm text-muted-foreground" data-testid={`text-minister-email-${index}`}>
                              {minister.email}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        {getTeamBadge(index)}
                      </TableCell>
                      <TableCell>
                        {getStatusBadge(minister.status || 'pending')}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {minister.lastService ? new Date(minister.lastService).toLocaleDateString('pt-BR') : 'Nunca'}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Button 
                            variant="ghost" 
                            size="sm"
                            data-testid={`button-edit-${index}`}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            data-testid={`button-view-${index}`}
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => handleDeleteMinister(minister.id, getUserDisplayName(minister))}
                            className="text-destructive hover:text-destructive hover:bg-destructive/10"
                            data-testid={`button-delete-${index}`}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
          
          {/* Pagination */}
          {filteredMinisters.length > 0 && (
            <div className="flex items-center justify-between px-6 py-4 border-t border-border">
              <p className="text-sm text-muted-foreground">
                Mostrando <span className="font-medium">1</span> a{" "}
                <span className="font-medium">{Math.min(10, filteredMinisters.length)}</span> de{" "}
                <span className="font-medium">{filteredMinisters.length}</span> ministros
              </p>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" disabled>
                  Anterior
                </Button>
                <Button variant="default" size="sm">
                  1
                </Button>
                <Button variant="outline" size="sm" disabled>
                  Próximo
                </Button>
              </div>
            </div>
          )}
        </Card>
      </div>
    </Layout>
  );
}
