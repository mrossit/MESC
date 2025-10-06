import { useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useCsrfToken, addCsrfHeader } from '@/hooks/useCsrfToken';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Plus, Edit, Trash2, BookOpen, GraduationCap, Layers } from 'lucide-react';
import type { FormationTrack } from '@shared/schema';

export default function FormationAdmin() {
  const { toast } = useToast();
  const { csrfToken, isLoading: csrfLoading } = useCsrfToken();
  const [tracks, setTracks] = useState<FormationTrack[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTrack, setEditingTrack] = useState<FormationTrack | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    id: '',
    title: '',
    description: '',
    category: 'liturgia' as 'liturgia' | 'espiritualidade' | 'pratica',
    icon: '',
    orderIndex: 0,
    isActive: true
  });

  useEffect(() => {
    fetchTracks();
  }, []);

  const fetchTracks = async () => {
    try {
      const response = await fetch('/api/formation/admin/tracks', {
        credentials: 'include'
      });

      if (!response.ok) throw new Error('Falha ao buscar trilhas');

      const data = await response.json();
      setTracks(data.tracks);
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: error.message || 'Erro ao carregar trilhas',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (csrfLoading || !csrfToken) {
      toast({
        title: 'Aguarde',
        description: 'Aguarde o carregamento da página...',
        variant: 'destructive'
      });
      return;
    }

    try {
      const url = editingTrack
        ? `/api/formation/admin/tracks/${editingTrack.id}`
        : '/api/formation/admin/tracks';

      const method = editingTrack ? 'PATCH' : 'POST';

      const response = await fetch(url, {
        method,
        headers: addCsrfHeader(
          { 'Content-Type': 'application/json' },
          csrfToken
        ),
        credentials: 'include',
        body: JSON.stringify(formData)
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Erro ao salvar trilha');
      }

      toast({
        title: 'Sucesso!',
        description: editingTrack
          ? 'Trilha atualizada com sucesso'
          : 'Trilha criada com sucesso'
      });

      setDialogOpen(false);
      resetForm();
      fetchTracks();
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: error.message || 'Erro ao salvar trilha',
        variant: 'destructive'
      });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja deletar esta trilha?')) return;

    if (csrfLoading || !csrfToken) {
      toast({
        title: 'Aguarde',
        description: 'Aguarde o carregamento da página...',
        variant: 'destructive'
      });
      return;
    }

    try {
      const response = await fetch(`/api/formation/admin/tracks/${id}`, {
        method: 'DELETE',
        headers: addCsrfHeader({}, csrfToken),
        credentials: 'include'
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Erro ao deletar trilha');
      }

      toast({
        title: 'Sucesso!',
        description: 'Trilha deletada com sucesso'
      });

      fetchTracks();
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: error.message || 'Erro ao deletar trilha',
        variant: 'destructive'
      });
    }
  };

  const resetForm = () => {
    setFormData({
      id: '',
      title: '',
      description: '',
      category: 'liturgia',
      icon: '',
      orderIndex: 0,
      isActive: true
    });
    setEditingTrack(null);
  };

  const openEditDialog = (track: FormationTrack) => {
    setFormData({
      id: track.id,
      title: track.title,
      description: track.description || '',
      category: track.category,
      icon: track.icon || '',
      orderIndex: track.orderIndex || 0,
      isActive: track.isActive ?? true
    });
    setEditingTrack(track);
    setDialogOpen(true);
  };

  const openCreateDialog = () => {
    resetForm();
    setDialogOpen(true);
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'liturgia':
        return <BookOpen className="h-6 w-6" />;
      case 'espiritualidade':
        return <GraduationCap className="h-6 w-6" />;
      case 'pratica':
        return <Layers className="h-6 w-6" />;
      default:
        return <BookOpen className="h-6 w-6" />;
    }
  };

  const getCategoryLabel = (category: string) => {
    switch (category) {
      case 'liturgia':
        return 'Liturgia';
      case 'espiritualidade':
        return 'Espiritualidade';
      case 'pratica':
        return 'Prática';
      default:
        return category;
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-96">
          <p className="text-muted-foreground">Carregando...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">Administração de Formação</h1>
          <p className="text-muted-foreground mt-2">
            Gerencie trilhas, módulos e lições de formação
          </p>
        </div>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={openCreateDialog}>
              <Plus className="mr-2 h-4 w-4" />
              Nova Trilha
            </Button>
          </DialogTrigger>

          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>
                {editingTrack ? 'Editar Trilha' : 'Nova Trilha de Formação'}
              </DialogTitle>
              <DialogDescription>
                {editingTrack
                  ? 'Edite as informações da trilha de formação'
                  : 'Crie uma nova trilha de formação para os ministros'}
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="id">ID da Trilha *</Label>
                <Input
                  id="id"
                  value={formData.id}
                  onChange={(e) => setFormData({ ...formData, id: e.target.value })}
                  placeholder="liturgia, espiritualidade, pratica"
                  required
                  disabled={!!editingTrack}
                />
                <p className="text-sm text-muted-foreground mt-1">
                  ID único (não pode ser alterado após criação)
                </p>
              </div>

              <div>
                <Label htmlFor="title">Título *</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="Ex: Formação Litúrgica"
                  required
                />
              </div>

              <div>
                <Label htmlFor="description">Descrição</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Descreva o conteúdo e objetivos desta trilha..."
                  rows={4}
                />
              </div>

              <div>
                <Label htmlFor="category">Categoria *</Label>
                <Select
                  value={formData.category}
                  onValueChange={(value: any) => setFormData({ ...formData, category: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="liturgia">Liturgia</SelectItem>
                    <SelectItem value="espiritualidade">Espiritualidade</SelectItem>
                    <SelectItem value="pratica">Prática</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="icon">Ícone</Label>
                <Input
                  id="icon"
                  value={formData.icon}
                  onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
                  placeholder="book, heart, tool"
                />
                <p className="text-sm text-muted-foreground mt-1">
                  Nome do ícone Lucide React
                </p>
              </div>

              <div>
                <Label htmlFor="orderIndex">Ordem</Label>
                <Input
                  id="orderIndex"
                  type="number"
                  value={formData.orderIndex}
                  onChange={(e) => setFormData({ ...formData, orderIndex: parseInt(e.target.value) })}
                  min={0}
                />
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="isActive"
                  checked={formData.isActive}
                  onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
                />
                <Label htmlFor="isActive">Trilha ativa</Label>
              </div>

              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setDialogOpen(false);
                    resetForm();
                  }}
                >
                  Cancelar
                </Button>
                <Button type="submit">
                  {editingTrack ? 'Atualizar' : 'Criar'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {tracks.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center h-64">
            <BookOpen className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">Nenhuma trilha cadastrada</p>
            <p className="text-sm text-muted-foreground mt-1">
              Clique em "Nova Trilha" para começar
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {tracks.map((track) => (
            <Card key={track.id} className={!track.isActive ? 'opacity-60' : ''}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-primary/10">
                      {getCategoryIcon(track.category)}
                    </div>
                    <div>
                      <CardTitle>{track.title}</CardTitle>
                      <CardDescription>
                        {getCategoryLabel(track.category)}
                      </CardDescription>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openEditDialog(track)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(track.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>

              <CardContent>
                {track.description && (
                  <p className="text-sm text-muted-foreground line-clamp-3 mb-4">
                    {track.description}
                  </p>
                )}

                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">
                    Ordem: {track.orderIndex}
                  </span>
                  <span className={track.isActive ? 'text-green-600' : 'text-red-600'}>
                    {track.isActive ? 'Ativa' : 'Inativa'}
                  </span>
                </div>

                <Button
                  variant="outline"
                  className="w-full mt-4"
                  onClick={() => {
                    // TODO: Navigate to modules management
                    toast({
                      title: 'Em breve',
                      description: 'Gerenciamento de módulos será implementado em breve'
                    });
                  }}
                >
                  Gerenciar Módulos
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
