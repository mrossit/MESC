import React, { useState } from 'react';
import { useLocation } from 'wouter';
import { Layout } from '../components/layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '../components/ui/avatar';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import {
  Search, Users, Phone, Mail, Calendar, Heart,
  Church, User, Filter, Grid, List, Info, ArrowUpDown, MessageCircle
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '../components/ui/dialog';
import { formatPhoneNumber, formatPhoneForCall } from '../utils/phone';

type Minister = {
  id: string;
  name: string;
  email: string;
  phone?: string;
  profilePhoto?: string;
  photoUrl?: string;
  role: string;
  status?: string;
  ministryStartDate?: string;
  maritalStatus?: string;
  createdAt: string;
};

type MinisterFamily = {
  id: string;
  relatedUser: {
    id: string;
    name: string;
    profilePhoto?: string;
  };
  relationshipType: string;
};

export default function MinistersDirectory() {
  const [, setLocation] = useLocation();
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');
  const [selectedMinister, setSelectedMinister] = useState<Minister | null>(null);
  const [filterRole, setFilterRole] = useState<string>('all');
  const [sortField, setSortField] = useState<keyof Minister>('name');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  // Get current user info
  const { data: authData } = useQuery({
    queryKey: ['/api/auth/me'],
  });
  const user = authData?.user;
  const isCoordinator = user?.role === 'coordenador' || user?.role === 'gestor';

  // Buscar todos os ministros ativos
  const { data: ministersData, isLoading, error } = useQuery({
    queryKey: ['/api/users/active'],
    queryFn: async () => {
      console.log('Buscando usuários ativos...');
      const res = await fetch('/api/users/active', {
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      console.log('Response status:', res.status);

      if (!res.ok) {
        const errorText = await res.text();
        console.error('Erro na resposta:', errorText);
        throw new Error(`Failed to fetch ministers: ${res.status}`);
      }

      const data = await res.json();
      console.log('Dados recebidos:', data.length, 'usuários');

      // Filtrar ministros, coordenadores e gestores ativos
      const filtered = data.filter((user: Minister) =>
        (user.role === 'ministro' || user.role === 'coordenador' || user.role === 'gestor') &&
        (!user.status || user.status === 'active')
      );

      console.log('Após filtro:', filtered.length, 'usuários');
      return filtered;
    }
  });

  // Buscar família do ministro selecionado (apenas para o usuário atual)
  const { data: familyData } = useQuery({
    queryKey: ['/api/profile/family'],
    queryFn: async () => {
      const res = await fetch('/api/profile/family', { 
        credentials: 'include' 
      });
      if (!res.ok) return [];
      return res.json();
    },
    enabled: false // Desabilitado por enquanto até implementar rota correta
  });

  // Filtrar por busca e status ativo (sem filtro de papel para contadores)
  const baseFilteredMinisters = ministersData?.filter((minister: Minister) => {
    const matchesSearch = minister.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         minister.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (minister.phone && minister.phone.includes(searchTerm));
    
    return matchesSearch;
  }) || [];

  // Agrupar ministros por papel (para contadores)
  const groupedMinisters = {
    gestor: baseFilteredMinisters.filter((m: Minister) => m.role === 'gestor'),
    coordenador: baseFilteredMinisters.filter((m: Minister) => m.role === 'coordenador'),
    ministro: baseFilteredMinisters.filter((m: Minister) => m.role === 'ministro')
  };

  // Filtrar ministros para exibição (com filtro de papel)
  const roleFilteredMinisters = filterRole === 'all'
    ? baseFilteredMinisters
    : baseFilteredMinisters.filter((minister: Minister) => minister.role === filterRole);

  // Aplicar ordenação
  const filteredMinisters = [...roleFilteredMinisters].sort((a, b) => {
    const aValue = a[sortField];
    const bValue = b[sortField];

    if (aValue === null || aValue === undefined) return 1;
    if (bValue === null || bValue === undefined) return -1;

    let comparison = 0;
    if (typeof aValue === 'string' && typeof bValue === 'string') {
      comparison = aValue.localeCompare(bValue);
    } else if (aValue < bValue) {
      comparison = -1;
    } else if (aValue > bValue) {
      comparison = 1;
    }

    return sortDirection === 'asc' ? comparison : -comparison;
  });

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Não informado';
    try {
      const date = new Date(dateString);
      return format(date, "MMMM 'de' yyyy", { locale: ptBR });
    } catch {
      return 'Não informado';
    }
  };

  const getRoleBadgeVariant = (role: string) => {
    switch(role) {
      case 'gestor': return 'gold';
      case 'coordenador': return 'copper';
      default: return 'terracotta';
    }
  };

  const getRoleLabel = (role: string) => {
    switch(role) {
      case 'gestor': return 'Reitor';
      case 'coordenador': return 'Coordenador';
      default: return 'Ministro';
    }
  };

  const handleViewDetails = (minister: Minister) => {
    setSelectedMinister(minister);
  };

  const relationshipLabels: Record<string, string> = {
    spouse: 'Cônjuge',
    father: 'Pai',
    mother: 'Mãe',
    son: 'Filho',
    daughter: 'Filha',
    brother: 'Irmão',
    sister: 'Irmã'
  };

  const maritalStatusLabels: Record<string, string> = {
    single: 'Solteiro(a)',
    married: 'Casado(a)',
    widowed: 'Viúvo(a)'
  };

  if (error) {
    console.error('Erro ao carregar ministros:', error);
    return (
      <Layout
        title="Diretório de Ministros"
        subtitle="Conheça os membros do ministério e seus contatos"
      >
        <Card className="border-2 border-neutral-border dark:border-dark-4">
          <CardContent className="py-12 text-center">
            <Users className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground">Erro ao carregar ministros</p>
            <p className="text-sm text-red-500 mt-2">{error.toString()}</p>
          </CardContent>
        </Card>
      </Layout>
    );
  }

  if (isLoading) {
    return (
      <Layout
        title="Diretório de Ministros"
        subtitle="Conheça os membros do ministério e seus contatos"
      >
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <Users className="h-12 w-12 mx-auto mb-4 text-gray-400 animate-pulse" />
            <p>Carregando diretório de ministros...</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout
      title="Diretório de Ministros"
      subtitle="Conheça os membros do ministério e seus contatos"
    >
      <div className="max-w-7xl mx-auto p-6 ml-[-4px] mr-[-4px] pl-[8px] pr-[8px] pt-[8px] pb-[8px]">
        <Card className="border-opacity-30 mb-6">
          <CardHeader>
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    type="text"
                    placeholder="Buscar ministros..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 pr-3 w-full"
                  />
                </div>
              </div>
              <div className="flex gap-2">
                {/* Ordenação */}
                <Select
                  value={`${sortField}_${sortDirection}`}
                  onValueChange={(value) => {
                    const [field, direction] = value.split('_') as [keyof Minister, 'asc' | 'desc'];
                    setSortField(field);
                    setSortDirection(direction);
                  }}
                >
                  <SelectTrigger className="w-[180px] h-9">
                    <ArrowUpDown className="h-4 w-4 mr-2" />
                    <SelectValue placeholder="Ordenar por" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="name_asc">Nome (A-Z)</SelectItem>
                    <SelectItem value="name_desc">Nome (Z-A)</SelectItem>
                    <SelectItem value="role_asc">Perfil (Crescente)</SelectItem>
                    <SelectItem value="role_desc">Perfil (Decrescente)</SelectItem>
                    <SelectItem value="email_asc">Email (A-Z)</SelectItem>
                    <SelectItem value="email_desc">Email (Z-A)</SelectItem>
                    <SelectItem value="ministryStartDate_desc">Mais recente</SelectItem>
                    <SelectItem value="ministryStartDate_asc">Mais antigo</SelectItem>
                  </SelectContent>
                </Select>

                {/* Botões de visualização */}
                <Button
                  variant={viewMode === 'grid' ? 'default' : 'outline'}
                  onClick={() => setViewMode('grid')}
                  className="flex items-center gap-2"
                >
                  <Grid className="h-4 w-4" />
                  <span className="hidden lg:inline">Grade</span>
                </Button>
                <Button
                  variant={viewMode === 'list' ? 'default' : 'outline'}
                  onClick={() => setViewMode('list')}
                  className="flex items-center gap-2"
                >
                  <List className="h-4 w-4" />
                  <span className="hidden lg:inline">Lista</span>
                </Button>

              </div>
            </div>
            
            {/* Filtros por cargo com contadores */}
            <div className="mt-6">
              <Tabs value={filterRole} onValueChange={setFilterRole} className="w-full">
                <TabsList className="grid grid-cols-2 sm:grid-cols-4 w-full h-auto gap-1 p-1">
                  <TabsTrigger value="all" className="text-xs sm:text-sm py-2 px-2 flex flex-col gap-1">
                    <span>Todos</span>
                    <span className="text-xs font-bold bg-white/20 px-2 py-1 rounded-full">
                      {baseFilteredMinisters.length}
                    </span>
                  </TabsTrigger>
                  <TabsTrigger value="gestor" className="text-xs sm:text-sm py-2 px-2 flex flex-col gap-1">
                    <span>Reitor</span>
                    <span className="text-xs font-bold bg-white/20 px-2 py-1 rounded-full">
                      {groupedMinisters.gestor.length}
                    </span>
                  </TabsTrigger>
                  <TabsTrigger value="coordenador" className="text-xs sm:text-sm py-2 px-2 flex flex-col gap-1">
                    <span className="hidden sm:inline">Coordenadores</span>
                    <span className="sm:hidden">Coord.</span>
                    <span className="text-xs font-bold bg-white/20 px-2 py-1 rounded-full">
                      {groupedMinisters.coordenador.length}
                    </span>
                  </TabsTrigger>
                  <TabsTrigger value="ministro" className="text-xs sm:text-sm py-2 px-2 flex flex-col gap-1">
                    <span>Ministros</span>
                    <span className="text-xs font-bold bg-white/20 px-2 py-1 rounded-full">
                      {groupedMinisters.ministro.length}
                    </span>
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
          </CardHeader>
        </Card>


        {/* Lista de Ministros */}
        {filteredMinisters.length === 0 ? (
          <Card className="border-2 border-neutral-border dark:border-dark-4">
            <CardContent className="py-12 text-center">
              <Users className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground">Nenhum ministro encontrado</p>
            </CardContent>
          </Card>
        ) : viewMode === 'grid' ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredMinisters.map((minister: Minister) => (
              <Card key={minister.id} className="border-opacity-30 hover:shadow-lg transition-shadow cursor-pointer"
                        onClick={() => handleViewDetails(minister)}>
                    <CardContent className="p-4">
                      <div className="flex flex-col items-center text-center">
                        <Avatar className="h-24 w-24 mb-3 border-2 border-gray-200 shadow-md">
                          <AvatarImage 
                            src={minister.photoUrl} 
                            className="object-cover"
                          />
                          <AvatarFallback className="text-lg bg-gradient-to-br from-blue-500 to-purple-600 text-white font-semibold">
                            {getInitials(minister.name)}
                          </AvatarFallback>
                        </Avatar>
                        <h3 className="font-semibold text-sm sm:text-base truncate w-full">
                          {minister.name}
                        </h3>
                        <Badge variant={getRoleBadgeVariant(minister.role)} className="mt-1">
                          {getRoleLabel(minister.role)}
                        </Badge>
                        <div className="mt-3 space-y-1 w-full">
                          {minister.phone && (
                            <div className="flex items-center justify-center gap-2 text-xs sm:text-sm text-gray-600">
                              <Phone className="h-3 w-3" />
                              <span>{formatPhoneNumber(minister.phone)}</span>
                            </div>
                          )}
                          <div className="flex items-center justify-center gap-2 text-xs text-gray-500">
                            <Mail className="h-3 w-3" />
                            <span className="truncate">{minister.email}</span>
                          </div>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          className="mt-3 w-full"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleViewDetails(minister);
                          }}
                        >
                          <Info className="h-3 w-3 mr-1" />
                          Ver Detalhes
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
        ) : (
          <div className="space-y-2">
            {filteredMinisters.map((minister: Minister) => (
              <Card key={minister.id} className="border-opacity-30 hover:shadow-lg transition-shadow cursor-pointer"
                        onClick={() => handleViewDetails(minister)}>
                    <CardContent className="p-4">
                      <div className="flex items-center gap-4">
                        <Avatar className="h-16 w-16 sm:h-18 sm:w-18 border-2 border-gray-200 shadow-md flex-shrink-0">
                          <AvatarImage 
                            src={minister.photoUrl} 
                            className="object-cover"
                          />
                          <AvatarFallback className="text-sm bg-gradient-to-br from-blue-500 to-purple-600 text-white font-semibold">
                            {getInitials(minister.name)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold text-sm sm:text-base truncate">
                              {minister.name}
                            </h3>
                            <Badge variant={getRoleBadgeVariant(minister.role)} className="text-xs">
                              {getRoleLabel(minister.role)}
                            </Badge>
                          </div>
                          <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4 mt-1">
                            {minister.phone && (
                              <span className="text-xs sm:text-sm text-gray-600 flex items-center gap-1">
                                <Phone className="h-3 w-3" />
                                {formatPhoneNumber(minister.phone)}
                              </span>
                            )}
                            <span className="text-xs sm:text-sm text-gray-500 flex items-center gap-1">
                              <Mail className="h-3 w-3" />
                              {minister.email}
                            </span>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleViewDetails(minister);
                          }}
                        >
                          <Info className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
      </div>

      {/* Modal de Detalhes do Ministro */}
      <Dialog open={!!selectedMinister} onOpenChange={() => setSelectedMinister(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Detalhes do Ministro</DialogTitle>
          </DialogHeader>
          {selectedMinister && (
            <div className="space-y-4">
              {/* Foto e Nome */}
              <div className="flex flex-col items-center text-center">
                <Avatar className="h-28 w-28 mb-3 border-2 border-gray-200 shadow-lg">
                  <AvatarImage 
                    src={selectedMinister.photoUrl} 
                    className="object-cover"
                  />
                  <AvatarFallback className="text-xl bg-gradient-to-br from-blue-500 to-purple-600 text-white font-semibold">
                    {getInitials(selectedMinister.name)}
                  </AvatarFallback>
                </Avatar>
                <h3 className="text-xl font-semibold">{selectedMinister.name}</h3>
                <Badge variant={getRoleBadgeVariant(selectedMinister.role)} className="mt-2">
                  {getRoleLabel(selectedMinister.role)}
                </Badge>
              </div>

              {/* Informações de Contato */}
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <Mail className="h-4 w-4 text-gray-500" />
                  <span className="text-sm">{selectedMinister.email}</span>
                </div>
                {selectedMinister.phone && (
                  <div className="flex items-center gap-3">
                    <Phone className="h-4 w-4 text-gray-500" />
                    <span className="text-sm">{formatPhoneNumber(selectedMinister.phone)}</span>
                  </div>
                )}
                {selectedMinister.ministryStartDate && (
                  <div className="flex items-center gap-3">
                    <Church className="h-4 w-4 text-gray-500" />
                    <span className="text-sm">
                      No ministério desde {formatDate(selectedMinister.ministryStartDate)}
                    </span>
                  </div>
                )}
                {selectedMinister.maritalStatus && (
                  <div className="flex items-center gap-3">
                    <Heart className="h-4 w-4 text-gray-500" />
                    <span className="text-sm">
                      {maritalStatusLabels[selectedMinister.maritalStatus] || selectedMinister.maritalStatus}
                    </span>
                  </div>
                )}
              </div>

              {/* Familiares no Ministério - Comentado até implementar rota correta */}
              {/* {familyData && familyData.length > 0 && (
                <div className="pt-4 border-t">
                  <h4 className="font-medium mb-3 flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    Familiares no Ministério
                  </h4>
                  <div className="space-y-2">
                    {familyData.map((family: MinisterFamily) => (
                      <div key={family.id} className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={family.relatedUser.photoUrl} />
                          <AvatarFallback className="text-xs">
                            {getInitials(family.relatedUser.name)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="text-sm font-medium">{family.relatedUser.name}</p>
                          <p className="text-xs text-gray-500">
                            {relationshipLabels[family.relationshipType] || family.relationshipType}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )} */}

              {/* Ações */}
              <div className="flex flex-col gap-2 pt-4">
                <div className="grid grid-cols-2 gap-2">
                  {selectedMinister.phone && (
                    <>
                      <Button
                        variant="outline"
                        onClick={() => window.open(`tel:${formatPhoneForCall(selectedMinister.phone!)}`, '_self')}
                      >
                        <Phone className="h-4 w-4 mr-2" />
                        Ligar
                      </Button>
                      <Button
                        variant="outline"
                        className="bg-green-50 hover:bg-green-100 text-green-700 hover:text-green-800 border-green-200 dark:bg-green-950 dark:hover:bg-green-900 dark:text-green-400 dark:border-green-800"
                        onClick={() => {
                          const phoneNumber = formatPhoneForCall(selectedMinister.phone!);
                          window.open(`https://wa.me/${phoneNumber}`, '_blank');
                        }}
                      >
                        <MessageCircle className="h-4 w-4 mr-2" />
                        WhatsApp
                      </Button>
                    </>
                  )}
                  <Button
                    variant="outline"
                    className={selectedMinister.phone ? "col-span-2" : "col-span-2"}
                    onClick={() => window.open(`mailto:${selectedMinister.email}`, '_self')}
                  >
                    <Mail className="h-4 w-4 mr-2" />
                    Email
                  </Button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </Layout>
  );
}