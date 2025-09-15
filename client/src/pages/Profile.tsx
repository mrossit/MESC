import React, { useState, useEffect, useRef } from 'react';
import { Layout } from '../components/layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Alert, AlertDescription } from '../components/ui/alert';
import { Avatar, AvatarFallback, AvatarImage } from '../components/ui/avatar';
import { Badge } from '../components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { 
  User, Calendar, Heart, Church, Users, Save, Camera, 
  X, Plus, AlertCircle, CheckCircle, Droplets, Cross
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

type UserProfile = {
  id: string;
  email: string;
  name: string;
  phone?: string;
  role: string;
  profilePhoto?: string;
  photoUrl?: string;
  ministryStartDate?: string;
  baptismDate?: string;
  baptismParish?: string;
  confirmationDate?: string;
  confirmationParish?: string;
  marriageDate?: string;
  marriageParish?: string;
  maritalStatus?: string;
};

type FamilyMember = {
  id: string;
  relationshipType: string;
  user?: {
    id: string;
    name: string;
    email: string;
    photoUrl?: string;
  };
};

const relationshipTypes = [
  { value: 'spouse', label: 'Cônjuge' },
  { value: 'father', label: 'Pai' },
  { value: 'mother', label: 'Mãe' },
  { value: 'son', label: 'Filho' },
  { value: 'daughter', label: 'Filha' },
  { value: 'brother', label: 'Irmão' },
  { value: 'sister', label: 'Irmã' },
];

const maritalStatusOptions = [
  { value: 'single', label: 'Solteiro(a)' },
  { value: 'married', label: 'Casado(a)' },
  { value: 'widowed', label: 'Viúvo(a)' },
];

export default function Profile() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [familyMembers, setFamilyMembers] = useState<FamilyMember[]>([]);
  const [availableUsers, setAvailableUsers] = useState<any[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();
  
  // Estado para adicionar familiar
  const [showAddFamily, setShowAddFamily] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [selectedRelationship, setSelectedRelationship] = useState('');
  
  // Buscar perfil do usuário
  const { data: userData, isLoading: userLoading } = useQuery({
    queryKey: ['/api/profile'],
    queryFn: async () => {
      const res = await fetch('/api/profile', { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to fetch profile');
      return res.json();
    }
  });
  
  // Buscar familiares
  const { data: familyData, isLoading: familyLoading } = useQuery({
    queryKey: ['/api/profile/family'],
    queryFn: async () => {
      const res = await fetch('/api/profile/family', { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to fetch family');
      return res.json();
    }
  });
  
  // Buscar usuários disponíveis para adicionar como familiares
  const { data: usersData } = useQuery({
    queryKey: ['/api/users/active'],
    queryFn: async () => {
      const res = await fetch('/api/users/active', { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to fetch users');
      return res.json();
    },
    enabled: showAddFamily
  });
  
  useEffect(() => {
    if (userData) {
      setProfile(userData);
    }
  }, [userData]);
  
  useEffect(() => {
    if (familyData) {
      setFamilyMembers(familyData);
    }
  }, [familyData]);
  
  useEffect(() => {
    if (usersData) {
      // Filtrar usuários que já são familiares
      const familyIds = familyMembers.map(f => f.user?.id).filter(Boolean);
      const filtered = usersData.filter((u: any) => 
        u.id !== profile?.id && !familyIds.includes(u.id)
      );
      setAvailableUsers(filtered);
    }
  }, [usersData, familyMembers, profile]);
  
  const handlePhotoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    // Validar tipo de arquivo
    if (!file.type.startsWith('image/')) {
      setError('Por favor, selecione uma imagem');
      return;
    }
    
    // Validar tamanho (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setError('A imagem deve ter no máximo 5MB');
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      // Criar FormData para enviar o arquivo
      const formData = new FormData();
      formData.append('photo', file);
      
      // Enviar para o servidor
      const res = await fetch('/api/upload/profile-photo', {
        method: 'POST',
        credentials: 'include',
        body: formData
      });
      
      if (res.ok) {
        const data = await res.json();
        setProfile(prev => prev ? { ...prev, profilePhoto: data.photoUrl, photoUrl: data.photoUrl } : null);
        setSuccess('Foto atualizada com sucesso!');
        // Invalida as queries para forçar atualização
        queryClient.invalidateQueries({ queryKey: ['/api/profile'] });
        queryClient.invalidateQueries({ queryKey: ['/api/auth/me'] });
        // Limpar o input para permitir reenvio da mesma imagem
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      } else {
        const errorData = await res.json();
        setError(errorData.error || 'Erro ao fazer upload da foto');
      }
    } catch (err) {
      setError('Erro ao processar imagem');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };
  
  const handleSaveProfile = async () => {
    if (!profile) return;
    
    setSaving(true);
    setError(null);
    setSuccess(null);
    
    try {
      const dataToSend = {
        name: profile.name,
        phone: profile.phone ? unformatPhoneNumber(profile.phone) : null,
        ministryStartDate: profile.ministryStartDate || null,
        baptismDate: profile.baptismDate || null,
        baptismParish: profile.baptismParish || null,
        confirmationDate: profile.confirmationDate || null,
        confirmationParish: profile.confirmationParish || null,
        marriageDate: profile.marriageDate || null,
        marriageParish: profile.marriageParish || null,
        maritalStatus: profile.maritalStatus || null
      };

      console.log('Enviando dados do perfil:', dataToSend);

      const res = await fetch('/api/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(dataToSend)
      });

      console.log('Resposta da API:', res.status);

      if (res.ok) {
        const updatedProfile = await res.json();
        console.log('Perfil atualizado:', updatedProfile);
        setProfile(updatedProfile);
        setSuccess('Perfil atualizado com sucesso!');
        setIsEditing(false);
        queryClient.invalidateQueries({ queryKey: ['/api/profile'] });
      } else {
        const errorData = await res.json();
        console.error('Erro da API:', errorData);
        setError(errorData.message || errorData.error || 'Erro ao salvar informações do usuário');
      }
    } catch (err) {
      setError('Erro ao salvar informações do usuário');
      console.error(err);
    } finally {
      setSaving(false);
    }
  };
  
  const handleAddFamilyMember = async () => {
    if (!selectedUserId || !selectedRelationship) {
      setError('Por favor, selecione um familiar e o tipo de relacionamento');
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      const res = await fetch('/api/profile/family', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          relatedUserId: selectedUserId,
          relationshipType: selectedRelationship
        })
      });
      
      if (res.ok) {
        setSuccess('Familiar adicionado com sucesso!');
        setShowAddFamily(false);
        setSelectedUserId('');
        setSelectedRelationship('');
        queryClient.invalidateQueries({ queryKey: ['/api/profile/family'] });
      } else {
        const data = await res.json();
        setError(data.error || 'Erro ao adicionar familiar');
      }
    } catch (err) {
      setError('Erro ao adicionar familiar');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };
  
  const handleRemoveFamilyMember = async (relationshipId: string) => {
    if (!confirm('Tem certeza que deseja remover este familiar?')) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const res = await fetch(`/api/profile/family/${relationshipId}`, {
        method: 'DELETE',
        credentials: 'include'
      });
      
      if (res.ok) {
        setSuccess('Familiar removido com sucesso!');
        queryClient.invalidateQueries({ queryKey: ['/api/profile/family'] });
      } else {
        setError('Erro ao remover familiar');
      }
    } catch (err) {
      setError('Erro ao remover familiar');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };
  
  const formatDate = (dateString?: string) => {
    if (!dateString) return '-';
    try {
      // Para evitar problemas de timezone, força horário local
      let date;
      if (dateString.includes('T')) {
        // Se é ISO com horário, pega apenas a parte da data
        const dateOnly = dateString.split('T')[0];
        date = new Date(dateOnly + 'T00:00:00');
      } else {
        // Se é apenas data, força horário local
        date = new Date(dateString + 'T00:00:00');
      }
      return format(date, "dd 'de' MMMM 'de' yyyy", { locale: ptBR });
    } catch {
      return '-';
    }
  };

  // Função para converter data do banco para formato do input date (yyyy-mm-dd)
  const dateToInputValue = (dateString: string | null | undefined) => {
    if (!dateString) return '';
    
    // Se já está no formato correto (yyyy-mm-dd), retorna como está
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
      return dateString;
    }
    
    // Para datas ISO, pega apenas a parte da data (yyyy-mm-dd)
    if (dateString.includes('T')) {
      return dateString.split('T')[0];
    }
    
    // Converte data para formato yyyy-mm-dd sem ajuste de timezone
    try {
      const date = new Date(dateString + 'T00:00:00'); // Força horário local
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    } catch {
      return '';
    }
  };
  
  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  // Função para formatar telefone brasileiro
  const formatPhoneNumber = (value: string) => {
    // Remove tudo que não é dígito
    const onlyNumbers = value.replace(/\D/g, '');

    // Se tem 9 dígitos, adiciona código de área 15 (Sorocaba)
    let numbers = onlyNumbers;
    if (numbers.length === 9) {
      numbers = '15' + numbers;
    }

    // Aplica a máscara (00) 00000-0000 ou (00) 0000-0000
    if (numbers.length <= 2) {
      return `(${numbers}`;
    } else if (numbers.length <= 6) {
      return `(${numbers.slice(0, 2)}) ${numbers.slice(2)}`;
    } else if (numbers.length <= 10) {
      return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 6)}-${numbers.slice(6)}`;
    } else if (numbers.length === 11) {
      return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 7)}-${numbers.slice(7)}`;
    }

    // Se passou de 11 dígitos, limita
    return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 7)}-${numbers.slice(7, 11)}`;
  };

  // Função para remover formatação do telefone antes de salvar
  const unformatPhoneNumber = (value: string) => {
    return value.replace(/\D/g, '');
  };
  
  if (userLoading || familyLoading) {
    return (
      <Layout title="Perfil do Usuário" subtitle="Gerencie suas informações pessoais e familiares">
        <div className="flex items-center justify-center h-96">
          <div className="text-center">Carregando perfil...</div>
        </div>
      </Layout>
    );
  }
  
  return (
    <Layout title="Perfil do Usuário" subtitle="Gerencie suas informações pessoais e familiares">
      <div className="max-w-4xl mx-auto px-4 py-3 sm:p-6 overflow-x-hidden">
        <Card className="border-opacity-30">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Meu Perfil</CardTitle>
                <CardDescription>
                  Gerencie suas informações pessoais e familiares
                </CardDescription>
              </div>
              {!isEditing ? (
                <Button onClick={() => setIsEditing(true)}>
                  Editar Perfil
                </Button>
              ) : (
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => setIsEditing(false)}>
                    Cancelar
                  </Button>
                  <Button onClick={handleSaveProfile} disabled={saving}>
                    <Save className="mr-2 h-4 w-4" />
                    {saving ? 'Salvando...' : 'Salvar'}
                  </Button>
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent className="p-3 sm:p-4">
            {/* Mensagens de erro/sucesso */}
            {error && (
              <Alert variant="destructive" className="mb-4">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            
            {success && (
              <Alert className="mb-4 bg-green-50 border-green-200">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-800">{success}</AlertDescription>
              </Alert>
            )}
            
            <Tabs defaultValue="personal" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="personal" className="text-xs sm:text-sm px-1 sm:px-3">
                  <span className="hidden sm:inline">Dados Pessoais</span>
                  <span className="sm:hidden">Dados</span>
                </TabsTrigger>
                <TabsTrigger value="sacraments" className="text-xs sm:text-sm px-1 sm:px-3">
                  Sacramentos
                </TabsTrigger>
                <TabsTrigger value="family" className="text-xs sm:text-sm px-1 sm:px-3">
                  Família
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="personal" className="space-y-4">
                {/* Foto de Perfil */}
                <div className="flex flex-col sm:flex-row items-center gap-4">
                  <div className="relative">
                    <Avatar className="h-20 w-20 sm:h-24 sm:w-24">
                      <AvatarImage src={profile?.profilePhoto || profile?.photoUrl} />
                      <AvatarFallback className="text-2xl">
                        {profile ? getInitials(profile.name) : '?'}
                      </AvatarFallback>
                    </Avatar>
                    {isEditing && (
                      <Button
                        size="sm"
                        variant="secondary"
                        className="absolute bottom-0 right-0 rounded-full p-2"
                        onClick={() => fileInputRef.current?.click()}
                      >
                        <Camera className="h-4 w-4" />
                      </Button>
                    )}
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handlePhotoUpload}
                      disabled={!isEditing}
                    />
                  </div>
                  <div>
                    <h3 className="text-lg sm:text-xl font-semibold text-center sm:text-left">{profile?.name}</h3>
                    <p className="text-xs sm:text-sm text-gray-500 text-center sm:text-left break-all">{profile?.email}</p>
                    {profile?.phone && (
                      <p className="text-xs sm:text-sm text-gray-500 text-center sm:text-left">
                        {formatPhoneNumber(profile.phone)}
                      </p>
                    )}
                    <div className="flex justify-center sm:justify-start">
                      <Badge className="mt-2">{profile?.role === 'coordenador' ? 'Coordenador' : profile?.role}</Badge>
                    </div>
                  </div>
                </div>
                
                {/* Informações Pessoais */}
                <div className="profile-form grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="phone">Telefone</Label>
                    <Input
                      id="phone"
                      type="tel"
                      value={formatPhoneNumber(profile?.phone || '')}
                      onChange={(e) => {
                        const formatted = formatPhoneNumber(e.target.value);
                        setProfile(prev => prev ? { ...prev, phone: unformatPhoneNumber(formatted) } : null);
                      }}
                      disabled={!isEditing}
                      placeholder="(00) 00000-0000"
                      maxLength={15}
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="maritalStatus">Estado Civil</Label>
                    <Select
                      value={profile?.maritalStatus || ''}
                      onValueChange={(value) => setProfile(prev => prev ? { ...prev, maritalStatus: value } : null)}
                      disabled={!isEditing}
                    >
                      <SelectTrigger id="maritalStatus">
                        <SelectValue placeholder="Selecione..." />
                      </SelectTrigger>
                      <SelectContent>
                        {maritalStatusOptions.map(option => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="min-w-0">
                    <Label htmlFor="ministryStart">Início no Ministério</Label>
                    <Input
                      id="ministryStart"
                      type="date"
                      value={dateToInputValue(profile?.ministryStartDate)}
                      onChange={(e) => setProfile(prev => prev ? { ...prev, ministryStartDate: e.target.value } : null)}
                      disabled={!isEditing}
                      className="w-full"
                      data-testid="input-ministry-start"
                    />
                  </div>
                  
                  {profile?.maritalStatus === 'married' && (
                    <div className="min-w-0">
                      <Label htmlFor="marriageDate">Data de Casamento</Label>
                      <Input
                        id="marriageDate"
                        type="date"
                        value={dateToInputValue(profile?.marriageDate)}
                        onChange={(e) => setProfile(prev => prev ? { ...prev, marriageDate: e.target.value } : null)}
                        disabled={!isEditing}
                        className="w-full"
                        data-testid="input-marriage-date-personal"
                      />
                    </div>
                  )}
                </div>
              </TabsContent>
              
              <TabsContent value="sacraments" className="space-y-4">
                <div className="profile-form grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Card className="border-opacity-50 min-w-0">
                    <CardContent className="p-3 sm:p-4 md:pt-6">
                      <div className="flex items-center gap-2 sm:gap-3 mb-3">
                        <Droplets className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600" />
                        <h4 className="font-semibold text-sm sm:text-base">Batismo</h4>
                      </div>
                      <div className="min-w-0 space-y-3">
                      {isEditing ? (
                        <>
                          <div>
                            <label className="text-xs text-gray-500">Data:</label>
                            <Input
                              type="date"
                              value={dateToInputValue(profile?.baptismDate)}
                              onChange={(e) => setProfile(prev => prev ? { ...prev, baptismDate: e.target.value } : null)}
                              className="text-sm w-full mt-1"
                              data-testid="input-baptism-date"
                            />
                          </div>
                          <div>
                            <label className="text-xs text-gray-500">Paróquia:</label>
                            <Input
                              type="text"
                              value={profile?.baptismParish || ''}
                              onChange={(e) => setProfile(prev => prev ? { ...prev, baptismParish: e.target.value } : null)}
                              className="text-sm w-full mt-1"
                              placeholder="Nome da paróquia"
                              data-testid="input-baptism-parish"
                            />
                          </div>
                        </>
                      ) : (
                        <>
                          <p className="text-xs sm:text-sm text-gray-600">
                            {formatDate(profile?.baptismDate)}
                          </p>
                          {profile?.baptismParish && (
                            <p className="text-xs sm:text-sm text-gray-500">
                              {profile.baptismParish}
                            </p>
                          )}
                        </>
                      )}
                      </div>
                    </CardContent>
                  </Card>
                  
                  <Card className="border-opacity-50 min-w-0">
                    <CardContent className="p-3 sm:p-4 md:pt-6">
                      <div className="flex items-center gap-2 sm:gap-3 mb-3">
                        <Cross className="h-4 w-4 sm:h-5 sm:w-5 text-purple-600" />
                        <h4 className="font-semibold text-sm sm:text-base">Crisma</h4>
                      </div>
                      <div className="min-w-0 space-y-3">
                      {isEditing ? (
                        <>
                          <div>
                            <label className="text-xs text-gray-500">Data:</label>
                            <Input
                              type="date"
                              value={dateToInputValue(profile?.confirmationDate)}
                              onChange={(e) => setProfile(prev => prev ? { ...prev, confirmationDate: e.target.value } : null)}
                              className="text-sm w-full mt-1"
                              data-testid="input-confirmation-date"
                            />
                          </div>
                          <div>
                            <label className="text-xs text-gray-500">Paróquia:</label>
                            <Input
                              type="text"
                              value={profile?.confirmationParish || ''}
                              onChange={(e) => setProfile(prev => prev ? { ...prev, confirmationParish: e.target.value } : null)}
                              className="text-sm w-full mt-1"
                              placeholder="Nome da paróquia"
                              data-testid="input-confirmation-parish"
                            />
                          </div>
                        </>
                      ) : (
                        <>
                          <p className="text-xs sm:text-sm text-gray-600">
                            {formatDate(profile?.confirmationDate)}
                          </p>
                          {profile?.confirmationParish && (
                            <p className="text-xs sm:text-sm text-gray-500">
                              {profile.confirmationParish}
                            </p>
                          )}
                        </>
                      )}
                      </div>
                    </CardContent>
                  </Card>
                  
                  {profile?.maritalStatus === 'married' && (
                    <Card className="border-opacity-50 min-w-0">
                      <CardContent className="p-3 sm:p-4 md:pt-6">
                        <div className="flex items-center gap-2 sm:gap-3 mb-3">
                          <Heart className="h-4 w-4 sm:h-5 sm:w-5 text-red-600" />
                          <h4 className="font-semibold text-sm sm:text-base">Matrimônio</h4>
                        </div>
                        <div className="min-w-0 space-y-3">
                        {isEditing ? (
                          <>
                            <div>
                              <label className="text-xs text-gray-500">Data:</label>
                              <Input
                                type="date"
                                value={dateToInputValue(profile?.marriageDate)}
                                onChange={(e) => setProfile(prev => prev ? { ...prev, marriageDate: e.target.value } : null)}
                                className="text-sm w-full mt-1"
                                data-testid="input-marriage-date"
                              />
                            </div>
                            <div>
                              <label className="text-xs text-gray-500">Paróquia:</label>
                              <Input
                                type="text"
                                value={profile?.marriageParish || ''}
                                onChange={(e) => setProfile(prev => prev ? { ...prev, marriageParish: e.target.value } : null)}
                                className="text-sm w-full mt-1"
                                placeholder="Nome da paróquia"
                                data-testid="input-marriage-parish"
                              />
                            </div>
                          </>
                        ) : (
                          <>
                            <p className="text-xs sm:text-sm text-gray-600">
                              {formatDate(profile?.marriageDate)}
                            </p>
                            {profile?.marriageParish && (
                              <p className="text-xs sm:text-sm text-gray-500">
                                {profile.marriageParish}
                              </p>
                            )}
                          </>
                        )}
                        </div>
                      </CardContent>
                    </Card>
                  )}
                  
                  <Card className="border-opacity-50 min-w-0">
                    <CardContent className="p-3 sm:p-4 md:pt-6">
                      <div className="flex items-center gap-2 sm:gap-3 mb-3">
                        <Church className="h-4 w-4 sm:h-5 sm:w-5 text-green-600" />
                        <h4 className="font-semibold text-sm sm:text-base">Ministério</h4>
                      </div>
                      <div className="min-w-0">
                      {isEditing ? (
                        <div>
                          <label className="text-xs text-gray-500">Data de início:</label>
                          <Input
                            type="date"
                            value={dateToInputValue(profile?.ministryStartDate)}
                            onChange={(e) => setProfile(prev => prev ? { ...prev, ministryStartDate: e.target.value } : null)}
                            className="text-sm mt-1 w-full"
                            data-testid="input-ministry-date"
                          />
                        </div>
                      ) : (
                        <p className="text-xs sm:text-sm text-gray-600">
                          Servindo desde {formatDate(profile?.ministryStartDate)}
                        </p>
                      )}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>
              
              <TabsContent value="family" className="space-y-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold">Familiares no Ministério</h3>
                  <Dialog open={showAddFamily} onOpenChange={setShowAddFamily}>
                    <DialogTrigger asChild>
                      <Button size="sm" className="text-xs sm:text-sm">
                        <Plus className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4" />
                        <span className="hidden sm:inline">Adicionar Familiar</span>
                        <span className="sm:hidden">Add Familiar</span>
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Adicionar Familiar</DialogTitle>
                        <DialogDescription>
                          Selecione um membro da família que também serve no ministério
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div>
                          <Label>Pessoa</Label>
                          <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione uma pessoa..." />
                            </SelectTrigger>
                            <SelectContent>
                              {availableUsers.map((user: any) => (
                                <SelectItem key={user.id} value={user.id}>
                                  {user.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        
                        <div>
                          <Label>Tipo de Relacionamento</Label>
                          <Select value={selectedRelationship} onValueChange={setSelectedRelationship}>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione o parentesco..." />
                            </SelectTrigger>
                            <SelectContent>
                              {relationshipTypes.map(type => (
                                <SelectItem key={type.value} value={type.value}>
                                  {type.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <DialogFooter>
                        <Button variant="outline" onClick={() => setShowAddFamily(false)}>
                          Cancelar
                        </Button>
                        <Button onClick={handleAddFamilyMember} disabled={loading}>
                          {loading ? 'Adicionando...' : 'Adicionar'}
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </div>
                
                {familyMembers.length === 0 ? (
                  <Card>
                    <CardContent className="py-8 text-center text-gray-500">
                      <Users className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                      <p>Nenhum familiar cadastrado</p>
                      <p className="text-sm mt-2">
                        Adicione familiares que também servem no ministério para facilitar a criação de escalas
                      </p>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                    {familyMembers
                      .filter(member => member && member.user) // Filter out invalid members
                      .map(member => (
                      <Card key={member.id}>
                        <CardContent className="pt-6">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <Avatar>
                                <AvatarImage src={member.user?.photoUrl || ''} />
                                <AvatarFallback>
                                  {getInitials(member.user?.name || 'U')}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <p className="font-medium">{member.user?.name || 'Usuário'}</p>
                                <p className="text-sm text-gray-500">
                                  {relationshipTypes.find(t => t.value === member.relationshipType)?.label || member.relationshipType}
                                </p>
                              </div>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleRemoveFamilyMember(member.id)}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
                
                {familyMembers.length > 0 && (
                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      Ao criar escalas, o sistema priorizará colocar familiares juntos sempre que possível
                    </AlertDescription>
                  </Alert>
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}