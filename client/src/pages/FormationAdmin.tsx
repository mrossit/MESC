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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Edit, Trash2, BookOpen, GraduationCap, Layers, Database, FileText, List } from 'lucide-react';
import type { FormationTrack, FormationModule, FormationLesson, FormationLessonSection } from '@shared/schema';

export default function FormationAdmin() {
  const { toast } = useToast();
  const { csrfToken, isLoading: csrfLoading } = useCsrfToken();

  // State for tracks
  const [tracks, setTracks] = useState<FormationTrack[]>([]);
  const [trackDialogOpen, setTrackDialogOpen] = useState(false);
  const [editingTrack, setEditingTrack] = useState<FormationTrack | null>(null);

  // State for modules
  const [modules, setModules] = useState<FormationModule[]>([]);
  const [moduleDialogOpen, setModuleDialogOpen] = useState(false);
  const [editingModule, setEditingModule] = useState<FormationModule | null>(null);

  // State for lessons
  const [lessons, setLessons] = useState<FormationLesson[]>([]);
  const [lessonDialogOpen, setLessonDialogOpen] = useState(false);
  const [editingLesson, setEditingLesson] = useState<FormationLesson | null>(null);

  // State for sections
  const [sections, setSections] = useState<FormationLessonSection[]>([]);
  const [sectionDialogOpen, setSectionDialogOpen] = useState(false);
  const [editingSection, setEditingSection] = useState<FormationLessonSection | null>(null);

  const [loading, setLoading] = useState(true);
  const [seeding, setSeeding] = useState(false);

  // Track form state
  const [trackForm, setTrackForm] = useState({
    id: '',
    title: '',
    description: '',
    category: 'liturgia' as 'liturgia' | 'espiritualidade' | 'pratica',
    icon: '',
    orderIndex: 0,
    isActive: true
  });

  // Module form state
  const [moduleForm, setModuleForm] = useState({
    id: '',
    trackId: '',
    title: '',
    description: '',
    category: 'liturgia' as 'liturgia' | 'espiritualidade' | 'pratica',
    estimatedDuration: '',
    orderIndex: 0,
    isActive: true
  });

  // Lesson form state
  const [lessonForm, setLessonForm] = useState({
    id: '',
    moduleId: '',
    trackId: '',
    title: '',
    description: '',
    objectives: '',
    videoUrl: '',
    lessonNumber: 1,
    durationMinutes: 30,
    orderIndex: 0,
    isActive: true
  });

  // Section form state
  const [sectionForm, setSectionForm] = useState({
    id: '',
    lessonId: '',
    type: 'text' as 'text' | 'video' | 'audio' | 'document' | 'quiz' | 'interactive',
    title: '',
    content: '',
    orderIndex: 0,
    estimatedMinutes: 5
  });

  useEffect(() => {
    fetchAllData();
  }, []);

  const fetchAllData = async () => {
    setLoading(true);
    await Promise.all([
      fetchTracks(),
      fetchAllModules(),
      fetchAllLessons(),
      fetchAllSections()
    ]);
    setLoading(false);
  };

  // ========================================
  // TRACKS
  // ========================================

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
    }
  };

  const handleTrackSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (csrfLoading || !csrfToken) return;

    try {
      const url = editingTrack
        ? `/api/formation/admin/tracks/${editingTrack.id}`
        : '/api/formation/admin/tracks';
      const method = editingTrack ? 'PATCH' : 'POST';

      const response = await fetch(url, {
        method,
        headers: addCsrfHeader({ 'Content-Type': 'application/json' }, csrfToken),
        credentials: 'include',
        body: JSON.stringify(trackForm)
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Erro ao salvar trilha');
      }

      toast({
        title: 'Sucesso!',
        description: editingTrack ? 'Trilha atualizada' : 'Trilha criada'
      });

      setTrackDialogOpen(false);
      resetTrackForm();
      fetchTracks();
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: error.message,
        variant: 'destructive'
      });
    }
  };

  const handleTrackDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja deletar esta trilha?')) return;
    if (csrfLoading || !csrfToken) return;

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

      toast({ title: 'Sucesso!', description: 'Trilha deletada' });
      fetchTracks();
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: error.message,
        variant: 'destructive'
      });
    }
  };

  const resetTrackForm = () => {
    setTrackForm({
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

  const openTrackEditDialog = (track: FormationTrack) => {
    setTrackForm({
      id: track.id,
      title: track.title,
      description: track.description || '',
      category: track.category,
      icon: track.icon || '',
      orderIndex: track.orderIndex || 0,
      isActive: track.isActive ?? true
    });
    setEditingTrack(track);
    setTrackDialogOpen(true);
  };

  // ========================================
  // MODULES
  // ========================================

  const fetchAllModules = async () => {
    try {
      const allModules: FormationModule[] = [];
      for (const track of tracks) {
        const response = await fetch(`/api/formation/admin/tracks/${track.id}/modules`, {
          credentials: 'include'
        });
        if (response.ok) {
          const data = await response.json();
          allModules.push(...data.modules);
        }
      }
      setModules(allModules);
    } catch (error: any) {
      console.error('Error fetching modules:', error);
    }
  };

  const handleModuleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (csrfLoading || !csrfToken) return;

    try {
      const url = editingModule
        ? `/api/formation/admin/modules/${editingModule.id}`
        : '/api/formation/admin/modules';
      const method = editingModule ? 'PATCH' : 'POST';

      const response = await fetch(url, {
        method,
        headers: addCsrfHeader({ 'Content-Type': 'application/json' }, csrfToken),
        credentials: 'include',
        body: JSON.stringify(moduleForm)
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Erro ao salvar módulo');
      }

      toast({
        title: 'Sucesso!',
        description: editingModule ? 'Módulo atualizado' : 'Módulo criado'
      });

      setModuleDialogOpen(false);
      resetModuleForm();
      fetchAllModules();
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: error.message,
        variant: 'destructive'
      });
    }
  };

  const handleModuleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja deletar este módulo?')) return;
    if (csrfLoading || !csrfToken) return;

    try {
      const response = await fetch(`/api/formation/admin/modules/${id}`, {
        method: 'DELETE',
        headers: addCsrfHeader({}, csrfToken),
        credentials: 'include'
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Erro ao deletar módulo');
      }

      toast({ title: 'Sucesso!', description: 'Módulo deletado' });
      fetchAllModules();
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: error.message,
        variant: 'destructive'
      });
    }
  };

  const resetModuleForm = () => {
    setModuleForm({
      id: '',
      trackId: '',
      title: '',
      description: '',
      category: 'liturgia',
      estimatedDuration: '',
      orderIndex: 0,
      isActive: true
    });
    setEditingModule(null);
  };

  const openModuleEditDialog = (module: FormationModule) => {
    setModuleForm({
      id: module.id,
      trackId: module.trackId,
      title: module.title,
      description: module.description || '',
      category: module.category,
      estimatedDuration: module.estimatedDuration || '',
      orderIndex: module.orderIndex || 0,
      isActive: module.isActive ?? true
    });
    setEditingModule(module);
    setModuleDialogOpen(true);
  };

  // ========================================
  // LESSONS
  // ========================================

  const fetchAllLessons = async () => {
    try {
      const allLessons: FormationLesson[] = [];
      for (const module of modules) {
        const response = await fetch(`/api/formation/admin/modules/${module.id}/lessons`, {
          credentials: 'include'
        });
        if (response.ok) {
          const data = await response.json();
          allLessons.push(...data.lessons);
        }
      }
      setLessons(allLessons);
    } catch (error: any) {
      console.error('Error fetching lessons:', error);
    }
  };

  const handleLessonSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (csrfLoading || !csrfToken) return;

    try {
      const url = editingLesson
        ? `/api/formation/admin/lessons/${editingLesson.id}`
        : '/api/formation/admin/lessons';
      const method = editingLesson ? 'PATCH' : 'POST';

      const response = await fetch(url, {
        method,
        headers: addCsrfHeader({ 'Content-Type': 'application/json' }, csrfToken),
        credentials: 'include',
        body: JSON.stringify(lessonForm)
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Erro ao salvar lição');
      }

      toast({
        title: 'Sucesso!',
        description: editingLesson ? 'Lição atualizada' : 'Lição criada'
      });

      setLessonDialogOpen(false);
      resetLessonForm();
      fetchAllLessons();
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: error.message,
        variant: 'destructive'
      });
    }
  };

  const handleLessonDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja deletar esta lição?')) return;
    if (csrfLoading || !csrfToken) return;

    try {
      const response = await fetch(`/api/formation/admin/lessons/${id}`, {
        method: 'DELETE',
        headers: addCsrfHeader({}, csrfToken),
        credentials: 'include'
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Erro ao deletar lição');
      }

      toast({ title: 'Sucesso!', description: 'Lição deletada' });
      fetchAllLessons();
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: error.message,
        variant: 'destructive'
      });
    }
  };

  const resetLessonForm = () => {
    setLessonForm({
      id: '',
      moduleId: '',
      trackId: '',
      title: '',
      description: '',
      objectives: '',
      videoUrl: '',
      lessonNumber: 1,
      durationMinutes: 30,
      orderIndex: 0,
      isActive: true
    });
    setEditingLesson(null);
  };

  const openLessonEditDialog = (lesson: FormationLesson) => {
    setLessonForm({
      id: lesson.id,
      moduleId: lesson.moduleId,
      trackId: lesson.trackId,
      title: lesson.title,
      description: lesson.description || '',
      objectives: lesson.objectives || '',
      videoUrl: lesson.videoUrl || '',
      lessonNumber: lesson.lessonNumber,
      durationMinutes: lesson.durationMinutes || 30,
      orderIndex: lesson.orderIndex || 0,
      isActive: lesson.isActive ?? true
    });
    setEditingLesson(lesson);
    setLessonDialogOpen(true);
  };

  // ========================================
  // SECTIONS
  // ========================================

  const fetchAllSections = async () => {
    try {
      const allSections: FormationLessonSection[] = [];
      for (const lesson of lessons) {
        const response = await fetch(`/api/formation/admin/lessons/${lesson.id}/sections`, {
          credentials: 'include'
        });
        if (response.ok) {
          const data = await response.json();
          allSections.push(...data.sections);
        }
      }
      setSections(allSections);
    } catch (error: any) {
      console.error('Error fetching sections:', error);
    }
  };

  const handleSectionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (csrfLoading || !csrfToken) return;

    try {
      const url = editingSection
        ? `/api/formation/admin/sections/${editingSection.id}`
        : '/api/formation/admin/sections';
      const method = editingSection ? 'PATCH' : 'POST';

      const response = await fetch(url, {
        method,
        headers: addCsrfHeader({ 'Content-Type': 'application/json' }, csrfToken),
        credentials: 'include',
        body: JSON.stringify(sectionForm)
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Erro ao salvar seção');
      }

      toast({
        title: 'Sucesso!',
        description: editingSection ? 'Seção atualizada' : 'Seção criada'
      });

      setSectionDialogOpen(false);
      resetSectionForm();
      fetchAllSections();
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: error.message,
        variant: 'destructive'
      });
    }
  };

  const handleSectionDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja deletar esta seção?')) return;
    if (csrfLoading || !csrfToken) return;

    try {
      const response = await fetch(`/api/formation/admin/sections/${id}`, {
        method: 'DELETE',
        headers: addCsrfHeader({}, csrfToken),
        credentials: 'include'
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Erro ao deletar seção');
      }

      toast({ title: 'Sucesso!', description: 'Seção deletada' });
      fetchAllSections();
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: error.message,
        variant: 'destructive'
      });
    }
  };

  const resetSectionForm = () => {
    setSectionForm({
      id: '',
      lessonId: '',
      type: 'text',
      title: '',
      content: '',
      orderIndex: 0,
      estimatedMinutes: 5
    });
    setEditingSection(null);
  };

  const openSectionEditDialog = (section: FormationLessonSection) => {
    setSectionForm({
      id: section.id,
      lessonId: section.lessonId,
      type: section.type,
      title: section.title,
      content: section.content || '',
      orderIndex: section.orderIndex || 0,
      estimatedMinutes: section.estimatedMinutes || 5
    });
    setEditingSection(section);
    setSectionDialogOpen(true);
  };

  // ========================================
  // SEED DATABASE
  // ========================================

  const handleSeedDatabase = async () => {
    if (!confirm('Isso irá popular o banco de dados com conteúdo inicial. Continuar?')) return;
    if (csrfLoading || !csrfToken) return;

    setSeeding(true);
    try {
      const response = await fetch('/api/formation/admin/seed', {
        method: 'POST',
        headers: addCsrfHeader({}, csrfToken),
        credentials: 'include'
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Erro ao popular banco de dados');
      }

      const result = await response.json();
      toast({
        title: 'Sucesso!',
        description: `Base de dados populada: ${result.stats?.tracks || 0} trilhas, ${result.stats?.modules || 0} módulos, ${result.stats?.lessons || 0} lições`
      });

      fetchAllData();
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setSeeding(false);
    }
  };

  // ========================================
  // UTILITY FUNCTIONS
  // ========================================

  const getCategoryLabel = (category: string) => {
    switch (category) {
      case 'liturgia': return 'Liturgia';
      case 'espiritualidade': return 'Espiritualidade';
      case 'pratica': return 'Prática';
      default: return category;
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'liturgia': return <BookOpen className="h-6 w-6" />;
      case 'espiritualidade': return <GraduationCap className="h-6 w-6" />;
      case 'pratica': return <Layers className="h-6 w-6" />;
      default: return <BookOpen className="h-6 w-6" />;
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
            Gerencie trilhas, módulos, lições e seções de formação
          </p>
        </div>

        <Button
          onClick={handleSeedDatabase}
          disabled={seeding}
          variant="outline"
        >
          <Database className="mr-2 h-4 w-4" />
          {seeding ? 'Populando...' : 'Popular Base de Dados'}
        </Button>
      </div>

      <Tabs defaultValue="tracks" className="space-y-6">
        <TabsList>
          <TabsTrigger value="tracks">
            <BookOpen className="mr-2 h-4 w-4" />
            Trilhas
          </TabsTrigger>
          <TabsTrigger value="modules">
            <Layers className="mr-2 h-4 w-4" />
            Módulos
          </TabsTrigger>
          <TabsTrigger value="lessons">
            <FileText className="mr-2 h-4 w-4" />
            Lições
          </TabsTrigger>
          <TabsTrigger value="sections">
            <List className="mr-2 h-4 w-4" />
            Seções
          </TabsTrigger>
        </TabsList>

        {/* ========================================
            TRACKS TAB
            ======================================== */}
        <TabsContent value="tracks">
          <div className="flex justify-end mb-4">
            <Dialog open={trackDialogOpen} onOpenChange={setTrackDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={() => { resetTrackForm(); setTrackDialogOpen(true); }}>
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
                    {editingTrack ? 'Edite as informações da trilha' : 'Crie uma nova trilha de formação'}
                  </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleTrackSubmit} className="space-y-4">
                  <div>
                    <Label htmlFor="track-id">ID da Trilha *</Label>
                    <Input
                      id="track-id"
                      value={trackForm.id}
                      onChange={(e) => setTrackForm({ ...trackForm, id: e.target.value })}
                      placeholder="liturgy-track-1"
                      required
                      disabled={!!editingTrack}
                    />
                  </div>

                  <div>
                    <Label htmlFor="track-title">Título *</Label>
                    <Input
                      id="track-title"
                      value={trackForm.title}
                      onChange={(e) => setTrackForm({ ...trackForm, title: e.target.value })}
                      placeholder="Formação Litúrgica"
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="track-description">Descrição</Label>
                    <Textarea
                      id="track-description"
                      value={trackForm.description}
                      onChange={(e) => setTrackForm({ ...trackForm, description: e.target.value })}
                      rows={3}
                    />
                  </div>

                  <div>
                    <Label htmlFor="track-category">Categoria *</Label>
                    <Select
                      value={trackForm.category}
                      onValueChange={(value: any) => setTrackForm({ ...trackForm, category: value })}
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

                  <div className="flex items-center space-x-2">
                    <Switch
                      id="track-active"
                      checked={trackForm.isActive}
                      onCheckedChange={(checked) => setTrackForm({ ...trackForm, isActive: checked })}
                    />
                    <Label htmlFor="track-active">Trilha ativa</Label>
                  </div>

                  <div className="flex justify-end gap-2">
                    <Button type="button" variant="outline" onClick={() => setTrackDialogOpen(false)}>
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
                          <CardDescription>{getCategoryLabel(track.category)}</CardDescription>
                        </div>
                      </div>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="sm" onClick={() => openTrackEditDialog(track)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => handleTrackDelete(track.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {track.description && (
                      <p className="text-sm text-muted-foreground line-clamp-3">
                        {track.description}
                      </p>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* ========================================
            MODULES TAB
            ======================================== */}
        <TabsContent value="modules">
          <div className="flex justify-end mb-4">
            <Dialog open={moduleDialogOpen} onOpenChange={setModuleDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={() => { resetModuleForm(); setModuleDialogOpen(true); }}>
                  <Plus className="mr-2 h-4 w-4" />
                  Novo Módulo
                </Button>
              </DialogTrigger>

              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>
                    {editingModule ? 'Editar Módulo' : 'Novo Módulo'}
                  </DialogTitle>
                  <DialogDescription>
                    {editingModule ? 'Edite as informações do módulo' : 'Crie um novo módulo'}
                  </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleModuleSubmit} className="space-y-4">
                  <div>
                    <Label htmlFor="module-id">ID do Módulo *</Label>
                    <Input
                      id="module-id"
                      value={moduleForm.id}
                      onChange={(e) => setModuleForm({ ...moduleForm, id: e.target.value })}
                      placeholder="liturgy-module-1"
                      required
                      disabled={!!editingModule}
                    />
                  </div>

                  <div>
                    <Label htmlFor="module-track">Trilha *</Label>
                    <Select
                      value={moduleForm.trackId}
                      onValueChange={(value) => setModuleForm({ ...moduleForm, trackId: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione uma trilha" />
                      </SelectTrigger>
                      <SelectContent>
                        {tracks.map(track => (
                          <SelectItem key={track.id} value={track.id}>
                            {track.title}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="module-title">Título *</Label>
                    <Input
                      id="module-title"
                      value={moduleForm.title}
                      onChange={(e) => setModuleForm({ ...moduleForm, title: e.target.value })}
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="module-description">Descrição</Label>
                    <Textarea
                      id="module-description"
                      value={moduleForm.description}
                      onChange={(e) => setModuleForm({ ...moduleForm, description: e.target.value })}
                      rows={3}
                    />
                  </div>

                  <div>
                    <Label htmlFor="module-category">Categoria *</Label>
                    <Select
                      value={moduleForm.category}
                      onValueChange={(value: any) => setModuleForm({ ...moduleForm, category: value })}
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

                  <div className="flex items-center space-x-2">
                    <Switch
                      id="module-active"
                      checked={moduleForm.isActive}
                      onCheckedChange={(checked) => setModuleForm({ ...moduleForm, isActive: checked })}
                    />
                    <Label htmlFor="module-active">Módulo ativo</Label>
                  </div>

                  <div className="flex justify-end gap-2">
                    <Button type="button" variant="outline" onClick={() => setModuleDialogOpen(false)}>
                      Cancelar
                    </Button>
                    <Button type="submit">
                      {editingModule ? 'Atualizar' : 'Criar'}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          {modules.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center h-64">
                <Layers className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground">Nenhum módulo cadastrado</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {modules.map((module) => (
                <Card key={module.id} className={!module.isActive ? 'opacity-60' : ''}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-lg">{module.title}</CardTitle>
                        <CardDescription>
                          {tracks.find(t => t.id === module.trackId)?.title || 'Trilha não encontrada'}
                        </CardDescription>
                      </div>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="sm" onClick={() => openModuleEditDialog(module)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => handleModuleDelete(module.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {module.description && (
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {module.description}
                      </p>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* ========================================
            LESSONS TAB
            ======================================== */}
        <TabsContent value="lessons">
          <div className="flex justify-end mb-4">
            <Dialog open={lessonDialogOpen} onOpenChange={setLessonDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={() => { resetLessonForm(); setLessonDialogOpen(true); }}>
                  <Plus className="mr-2 h-4 w-4" />
                  Nova Lição
                </Button>
              </DialogTrigger>

              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>
                    {editingLesson ? 'Editar Lição' : 'Nova Lição'}
                  </DialogTitle>
                  <DialogDescription>
                    {editingLesson ? 'Edite as informações da lição' : 'Crie uma nova lição'}
                  </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleLessonSubmit} className="space-y-4">
                  <div>
                    <Label htmlFor="lesson-id">ID da Lição *</Label>
                    <Input
                      id="lesson-id"
                      value={lessonForm.id}
                      onChange={(e) => setLessonForm({ ...lessonForm, id: e.target.value })}
                      placeholder="lesson-1"
                      required
                      disabled={!!editingLesson}
                    />
                  </div>

                  <div>
                    <Label htmlFor="lesson-track">Trilha *</Label>
                    <Select
                      value={lessonForm.trackId}
                      onValueChange={(value) => {
                        setLessonForm({ ...lessonForm, trackId: value, moduleId: '' });
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione uma trilha" />
                      </SelectTrigger>
                      <SelectContent>
                        {tracks.map(track => (
                          <SelectItem key={track.id} value={track.id}>
                            {track.title}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="lesson-module">Módulo *</Label>
                    <Select
                      value={lessonForm.moduleId}
                      onValueChange={(value) => setLessonForm({ ...lessonForm, moduleId: value })}
                      disabled={!lessonForm.trackId}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione um módulo" />
                      </SelectTrigger>
                      <SelectContent>
                        {modules
                          .filter(m => m.trackId === lessonForm.trackId)
                          .map(module => (
                            <SelectItem key={module.id} value={module.id}>
                              {module.title}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="lesson-title">Título *</Label>
                    <Input
                      id="lesson-title"
                      value={lessonForm.title}
                      onChange={(e) => setLessonForm({ ...lessonForm, title: e.target.value })}
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="lesson-description">Descrição</Label>
                    <Textarea
                      id="lesson-description"
                      value={lessonForm.description}
                      onChange={(e) => setLessonForm({ ...lessonForm, description: e.target.value })}
                      rows={3}
                    />
                  </div>

                  <div>
                    <Label htmlFor="lesson-objectives">Objetivos (um por linha)</Label>
                    <Textarea
                      id="lesson-objectives"
                      value={lessonForm.objectives}
                      onChange={(e) => setLessonForm({ ...lessonForm, objectives: e.target.value })}
                      rows={4}
                      placeholder="Objetivo 1&#10;Objetivo 2&#10;Objetivo 3"
                    />
                  </div>

                  <div>
                    <Label htmlFor="lesson-video">URL do Vídeo</Label>
                    <Input
                      id="lesson-video"
                      type="url"
                      value={lessonForm.videoUrl}
                      onChange={(e) => setLessonForm({ ...lessonForm, videoUrl: e.target.value })}
                      placeholder="https://youtube.com/watch?v=..."
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="lesson-number">Número da Lição *</Label>
                      <Input
                        id="lesson-number"
                        type="number"
                        value={lessonForm.lessonNumber}
                        onChange={(e) => setLessonForm({ ...lessonForm, lessonNumber: parseInt(e.target.value) })}
                        min={1}
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="lesson-duration">Duração (minutos) *</Label>
                      <Input
                        id="lesson-duration"
                        type="number"
                        value={lessonForm.durationMinutes}
                        onChange={(e) => setLessonForm({ ...lessonForm, durationMinutes: parseInt(e.target.value) })}
                        min={1}
                        required
                      />
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Switch
                      id="lesson-active"
                      checked={lessonForm.isActive}
                      onCheckedChange={(checked) => setLessonForm({ ...lessonForm, isActive: checked })}
                    />
                    <Label htmlFor="lesson-active">Lição ativa</Label>
                  </div>

                  <div className="flex justify-end gap-2">
                    <Button type="button" variant="outline" onClick={() => setLessonDialogOpen(false)}>
                      Cancelar
                    </Button>
                    <Button type="submit">
                      {editingLesson ? 'Atualizar' : 'Criar'}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          {lessons.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center h-64">
                <FileText className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground">Nenhuma lição cadastrada</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {lessons.map((lesson) => (
                <Card key={lesson.id} className={!lesson.isActive ? 'opacity-60' : ''}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-lg">{lesson.title}</CardTitle>
                        <CardDescription>
                          {modules.find(m => m.id === lesson.moduleId)?.title || 'Módulo não encontrado'} • Lição {lesson.lessonNumber}
                        </CardDescription>
                      </div>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="sm" onClick={() => openLessonEditDialog(lesson)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => handleLessonDelete(lesson.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">
                      Duração: {lesson.durationMinutes} min
                    </p>
                    {lesson.videoUrl && (
                      <p className="text-sm text-blue-600 mt-1">📹 Com vídeo</p>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* ========================================
            SECTIONS TAB
            ======================================== */}
        <TabsContent value="sections">
          <div className="flex justify-end mb-4">
            <Dialog open={sectionDialogOpen} onOpenChange={setSectionDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={() => { resetSectionForm(); setSectionDialogOpen(true); }}>
                  <Plus className="mr-2 h-4 w-4" />
                  Nova Seção
                </Button>
              </DialogTrigger>

              <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>
                    {editingSection ? 'Editar Seção' : 'Nova Seção'}
                  </DialogTitle>
                  <DialogDescription>
                    {editingSection ? 'Edite as informações da seção' : 'Crie uma nova seção'}
                  </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSectionSubmit} className="space-y-4">
                  <div>
                    <Label htmlFor="section-id">ID da Seção *</Label>
                    <Input
                      id="section-id"
                      value={sectionForm.id}
                      onChange={(e) => setSectionForm({ ...sectionForm, id: e.target.value })}
                      placeholder="section-1"
                      required
                      disabled={!!editingSection}
                    />
                  </div>

                  <div>
                    <Label htmlFor="section-lesson">Lição *</Label>
                    <Select
                      value={sectionForm.lessonId}
                      onValueChange={(value) => setSectionForm({ ...sectionForm, lessonId: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione uma lição" />
                      </SelectTrigger>
                      <SelectContent>
                        {lessons.map(lesson => (
                          <SelectItem key={lesson.id} value={lesson.id}>
                            {lesson.title}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="section-type">Tipo *</Label>
                    <Select
                      value={sectionForm.type}
                      onValueChange={(value: any) => setSectionForm({ ...sectionForm, type: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="text">Texto</SelectItem>
                        <SelectItem value="video">Vídeo</SelectItem>
                        <SelectItem value="audio">Áudio</SelectItem>
                        <SelectItem value="document">Documento</SelectItem>
                        <SelectItem value="quiz">Quiz</SelectItem>
                        <SelectItem value="interactive">Interativo</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="section-title">Título *</Label>
                    <Input
                      id="section-title"
                      value={sectionForm.title}
                      onChange={(e) => setSectionForm({ ...sectionForm, title: e.target.value })}
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="section-content">Conteúdo *</Label>
                    <Textarea
                      id="section-content"
                      value={sectionForm.content}
                      onChange={(e) => setSectionForm({ ...sectionForm, content: e.target.value })}
                      rows={8}
                      required
                      placeholder="Conteúdo da seção..."
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="section-order">Ordem *</Label>
                      <Input
                        id="section-order"
                        type="number"
                        value={sectionForm.orderIndex}
                        onChange={(e) => setSectionForm({ ...sectionForm, orderIndex: parseInt(e.target.value) })}
                        min={0}
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="section-minutes">Tempo estimado (min)</Label>
                      <Input
                        id="section-minutes"
                        type="number"
                        value={sectionForm.estimatedMinutes}
                        onChange={(e) => setSectionForm({ ...sectionForm, estimatedMinutes: parseInt(e.target.value) })}
                        min={1}
                      />
                    </div>
                  </div>

                  <div className="flex justify-end gap-2">
                    <Button type="button" variant="outline" onClick={() => setSectionDialogOpen(false)}>
                      Cancelar
                    </Button>
                    <Button type="submit">
                      {editingSection ? 'Atualizar' : 'Criar'}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          {sections.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center h-64">
                <List className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground">Nenhuma seção cadastrada</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {sections.map((section) => (
                <Card key={section.id}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-lg">{section.title}</CardTitle>
                        <CardDescription>
                          {lessons.find(l => l.id === section.lessonId)?.title || 'Lição não encontrada'} • {section.type}
                        </CardDescription>
                      </div>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="sm" onClick={() => openSectionEditDialog(section)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => handleSectionDelete(section.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {section.content}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
