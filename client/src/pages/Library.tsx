import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Layout } from "@/components/layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useToast } from "@/hooks/use-toast";
import { useCsrfToken, addCsrfHeader } from "@/hooks/useCsrfToken";
import { authAPI } from "@/lib/auth";
import {
  FileText,
  FileVideo,
  FileAudio,
  FileImage,
  Presentation,
  File,
  Upload,
  Download,
  Search,
  MoreVertical,
  Trash2,
  Edit,
  ExternalLink,
  Calendar,
  HardDrive,
  Sparkles,
  Brain,
  CheckCircle2,
  AlertCircle,
  Clock,
  Tag,
  BookOpen,
  RefreshCw,
  Wand2,
  HelpCircle,
  Star,
  Loader2,
  LayoutGrid,
  LayoutList,
  TrendingUp,
  Award,
  ChevronLeft,
  ChevronRight,
  SortAsc,
  SortDesc,
  Filter,
  CheckCircle,
  Circle,
  Eye,
  BarChart3
} from "lucide-react";

interface Material {
  id: string;
  title: string;
  description: string | null;
  type: string;
  category: string | null;
  trackId: string | null;
  fileName: string;
  fileSize: number;
  mimeType: string;
  externalUrl?: string | null;
  tags: string[];
  downloadCount: number;
  isPublished: boolean;
  createdAt: string;
  uploaderName: string | null;
  aiAnalyzed?: boolean;
  aiContentQuality?: string;
  aiSummary?: string;
  aiKeyTopics?: string[];
}

interface MaterialsResponse {
  materials: Material[];
  total: number;
  limit: number;
  offset: number;
}

interface CategoriesResponse {
  tracks: Array<{
    id: string;
    title: string;
    category: string;
  }>;
}

interface StatsResponse {
  totalMaterials: number;
  totalDownloads: number;
  totalSize: number;
  aiAnalyzed: number;
  byType: Array<{ type: string; count: number }>;
  byCategory: Array<{ category: string | null; count: number }>;
  byQuality: Array<{ quality: string | null; count: number }>;
  topMaterials: Array<{
    id: string;
    title: string;
    type: string;
    category: string | null;
    downloadCount: number;
    aiContentQuality: string | null;
  }>;
  recentMaterials: Array<{
    id: string;
    title: string;
    type: string;
    category: string | null;
    createdAt: string;
    aiContentQuality: string | null;
  }>;
}

interface ProgressResponse {
  totalMaterials: number;
  accessed: number;
  completed: number;
  progressPercent: number;
  materials: Record<string, { views: number; downloads: number; completed: boolean; lastAccess: string }>;
}

interface AIAnalysis {
  analyzed: boolean;
  summary?: string;
  suggestedCategory?: string;
  suggestedTags?: string[];
  keyTopics?: string[];
  contentQuality?: string;
  qualityNotes?: string[];
  quizQuestions?: Array<{
    question: string;
    options: string[];
    correctIndex: number;
    explanation: string;
  }>;
  analyzedAt?: string;
  message?: string;
}

// File type icons
const getFileIcon = (type: string, size: 'sm' | 'md' | 'lg' = 'md') => {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-8 w-8',
    lg: 'h-12 w-12'
  };
  const cls = sizeClasses[size];

  switch (type) {
    case 'pdf':
    case 'document':
      return <FileText className={`${cls} text-red-500`} />;
    case 'video':
      return <FileVideo className={`${cls} text-purple-500`} />;
    case 'audio':
      return <FileAudio className={`${cls} text-blue-500`} />;
    case 'image':
      return <FileImage className={`${cls} text-green-500`} />;
    case 'presentation':
      return <Presentation className={`${cls} text-orange-500`} />;
    default:
      return <File className={`${cls} text-gray-500`} />;
  }
};

// Format file size
const formatFileSize = (bytes: number) => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
};

// Format date
const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });
};

// Quality badge color
const getQualityColor = (quality: string) => {
  switch (quality) {
    case 'excellent':
      return 'bg-green-100 text-green-800 border-green-200';
    case 'good':
      return 'bg-blue-100 text-blue-800 border-blue-200';
    case 'acceptable':
      return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    case 'needs_review':
      return 'bg-red-100 text-red-800 border-red-200';
    default:
      return 'bg-gray-100 text-gray-800 border-gray-200';
  }
};

const qualityLabels: Record<string, string> = {
  excellent: 'Excelente',
  good: 'Bom',
  acceptable: 'Aceitavel',
  needs_review: 'Precisa Revisao'
};

const categoryLabels: Record<string, string> = {
  liturgia: 'Liturgia',
  espiritualidade: 'Espiritualidade',
  pratica: 'Pratica'
};

export default function Library() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState('all');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [aiStatusFilter, setAiStatusFilter] = useState('all');
  const [aiQualityFilter, setAiQualityFilter] = useState('all');
  const [sortBy, setSortBy] = useState('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [currentPage, setCurrentPage] = useState(0);
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [editingMaterial, setEditingMaterial] = useState<Material | null>(null);
  const [analyzingMaterial, setAnalyzingMaterial] = useState<Material | null>(null);
  const [showStats, setShowStats] = useState(true);

  const ITEMS_PER_PAGE = 12;

  const { toast } = useToast();
  const { csrfToken } = useCsrfToken();
  const queryClient = useQueryClient();

  // Get current user
  const { data: authData } = useQuery({
    queryKey: ["/api/auth/me"],
    queryFn: () => authAPI.getMe(),
  });
  const user = authData?.user;
  const isCoordinator = user?.role === 'coordenador' || user?.role === 'gestor';

  // Fetch materials
  const { data: materialsData, isLoading } = useQuery<MaterialsResponse>({
    queryKey: ['/api/materials', searchQuery, selectedType, selectedCategory, aiStatusFilter, aiQualityFilter, sortBy, sortOrder, currentPage],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (searchQuery) params.set('search', searchQuery);
      if (selectedType !== 'all') params.set('type', selectedType);
      if (selectedCategory !== 'all') params.set('category', selectedCategory);
      if (aiStatusFilter !== 'all') params.set('aiStatus', aiStatusFilter);
      if (aiQualityFilter !== 'all') params.set('aiQuality', aiQualityFilter);
      params.set('sortBy', sortBy);
      params.set('sortOrder', sortOrder);
      params.set('limit', String(ITEMS_PER_PAGE));
      params.set('offset', String(currentPage * ITEMS_PER_PAGE));

      const response = await fetch(`/api/materials?${params}`, {
        credentials: 'include'
      });
      if (!response.ok) throw new Error('Failed to fetch materials');
      return response.json();
    }
  });

  // Fetch categories
  const { data: categoriesData } = useQuery<CategoriesResponse>({
    queryKey: ['/api/materials/categories'],
    queryFn: async () => {
      const response = await fetch('/api/materials/categories', {
        credentials: 'include'
      });
      if (!response.ok) throw new Error('Failed to fetch categories');
      return response.json();
    }
  });

  // Fetch stats
  const { data: statsData } = useQuery<StatsResponse>({
    queryKey: ['/api/materials/stats/overview'],
    queryFn: async () => {
      const response = await fetch('/api/materials/stats/overview', {
        credentials: 'include'
      });
      if (!response.ok) throw new Error('Failed to fetch stats');
      return response.json();
    }
  });

  // Fetch user progress
  const { data: progressData } = useQuery<ProgressResponse>({
    queryKey: ['/api/materials/my-progress'],
    queryFn: async () => {
      const response = await fetch('/api/materials/my-progress', {
        credentials: 'include'
      });
      if (!response.ok) throw new Error('Failed to fetch progress');
      return response.json();
    }
  });

  // Fetch AI analysis for selected material
  const { data: aiAnalysis, isLoading: isLoadingAnalysis, refetch: refetchAnalysis } = useQuery<AIAnalysis>({
    queryKey: ['/api/materials/analysis', analyzingMaterial?.id],
    queryFn: async () => {
      if (!analyzingMaterial) return { analyzed: false };
      const response = await fetch(`/api/materials/${analyzingMaterial.id}/analysis`, {
        credentials: 'include'
      });
      if (!response.ok) throw new Error('Failed to fetch analysis');
      return response.json();
    },
    enabled: !!analyzingMaterial
  });

  // Upload mutation
  const uploadMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      const response = await fetch('/api/materials', {
        method: 'POST',
        headers: addCsrfHeader({}, csrfToken),
        credentials: 'include',
        body: formData
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Upload failed');
      }
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: 'Material enviado com sucesso!',
        description: data.aiAnalysisPending ? 'Analise de IA em andamento...' : undefined
      });
      queryClient.invalidateQueries({ queryKey: ['/api/materials'] });
      setIsUploadOpen(false);
    },
    onError: (error: Error) => {
      toast({ title: 'Erro ao enviar material', description: error.message, variant: 'destructive' });
    }
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Record<string, any> }) => {
      const response = await fetch(`/api/materials/${id}`, {
        method: 'PUT',
        headers: addCsrfHeader({ 'Content-Type': 'application/json' }, csrfToken),
        credentials: 'include',
        body: JSON.stringify(data)
      });
      if (!response.ok) throw new Error('Update failed');
      return response.json();
    },
    onSuccess: () => {
      toast({ title: 'Material atualizado!' });
      queryClient.invalidateQueries({ queryKey: ['/api/materials'] });
      setEditingMaterial(null);
    },
    onError: () => {
      toast({ title: 'Erro ao atualizar material', variant: 'destructive' });
    }
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/materials/${id}`, {
        method: 'DELETE',
        headers: addCsrfHeader({}, csrfToken),
        credentials: 'include'
      });
      if (!response.ok) throw new Error('Delete failed');
      return response.json();
    },
    onSuccess: () => {
      toast({ title: 'Material removido!' });
      queryClient.invalidateQueries({ queryKey: ['/api/materials'] });
    },
    onError: () => {
      toast({ title: 'Erro ao remover material', variant: 'destructive' });
    }
  });

  // Trigger AI analysis mutation
  const analyzeMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/materials/${id}/analyze`, {
        method: 'POST',
        headers: addCsrfHeader({}, csrfToken),
        credentials: 'include'
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Analysis failed');
      }
      return response.json();
    },
    onSuccess: () => {
      toast({ title: 'Analise concluida!' });
      refetchAnalysis();
      queryClient.invalidateQueries({ queryKey: ['/api/materials'] });
    },
    onError: (error: Error) => {
      toast({ title: 'Erro na analise', description: error.message, variant: 'destructive' });
    }
  });

  // Apply AI suggestions mutation
  const applySuggestionsMutation = useMutation({
    mutationFn: async ({ id, suggestions }: { id: string; suggestions: { applyCategory?: boolean; applyTags?: boolean; applyDescription?: boolean } }) => {
      const response = await fetch(`/api/materials/${id}/apply-suggestions`, {
        method: 'POST',
        headers: addCsrfHeader({ 'Content-Type': 'application/json' }, csrfToken),
        credentials: 'include',
        body: JSON.stringify(suggestions)
      });
      if (!response.ok) throw new Error('Apply failed');
      return response.json();
    },
    onSuccess: () => {
      toast({ title: 'Sugestoes aplicadas!' });
      queryClient.invalidateQueries({ queryKey: ['/api/materials'] });
      setAnalyzingMaterial(null);
    },
    onError: () => {
      toast({ title: 'Erro ao aplicar sugestoes', variant: 'destructive' });
    }
  });

  // Generate quiz mutation
  const generateQuizMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/materials/${id}/generate-quiz`, {
        method: 'POST',
        headers: addCsrfHeader({ 'Content-Type': 'application/json' }, csrfToken),
        credentials: 'include',
        body: JSON.stringify({ numQuestions: 5 })
      });
      if (!response.ok) throw new Error('Quiz generation failed');
      return response.json();
    },
    onSuccess: () => {
      toast({ title: 'Quiz gerado com sucesso!' });
      refetchAnalysis();
    },
    onError: () => {
      toast({ title: 'Erro ao gerar quiz', variant: 'destructive' });
    }
  });

  // Mark completed mutation
  const markCompletedMutation = useMutation({
    mutationFn: async ({ id, completed }: { id: string; completed: boolean }) => {
      const response = await fetch(`/api/materials/${id}/mark-completed`, {
        method: completed ? 'POST' : 'DELETE',
        headers: addCsrfHeader({}, csrfToken),
        credentials: 'include'
      });
      if (!response.ok) throw new Error('Mark completed failed');
      return response.json();
    },
    onSuccess: (_, { completed }) => {
      toast({ title: completed ? 'Material marcado como concluido!' : 'Marcacao removida' });
      queryClient.invalidateQueries({ queryKey: ['/api/materials/my-progress'] });
    },
    onError: () => {
      toast({ title: 'Erro ao marcar material', variant: 'destructive' });
    }
  });

  // Handle upload form submit
  const handleUpload = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    uploadMutation.mutate(formData);
  };

  // Handle download
  const handleDownload = (material: Material) => {
    window.open(`/api/materials/${material.id}/download`, '_blank');
  };

  // Pagination
  const totalPages = Math.ceil((materialsData?.total || 0) / ITEMS_PER_PAGE);

  // Check if material is completed by user
  const isCompleted = (materialId: string) => {
    return progressData?.materials[materialId]?.completed || false;
  };

  // Reset filters
  const resetFilters = () => {
    setSearchQuery('');
    setSelectedType('all');
    setSelectedCategory('all');
    setAiStatusFilter('all');
    setAiQualityFilter('all');
    setSortBy('date');
    setSortOrder('desc');
    setCurrentPage(0);
  };

  const hasActiveFilters = searchQuery || selectedType !== 'all' || selectedCategory !== 'all' || aiStatusFilter !== 'all' || aiQualityFilter !== 'all';

  return (
    <Layout>
      <div className="space-y-6 p-4 md:p-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold">Biblioteca de Materiais</h1>
            <p className="text-muted-foreground">
              Materiais de formacao para ministros
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowStats(!showStats)}
            >
              <BarChart3 className="h-4 w-4 mr-2" />
              {showStats ? 'Ocultar' : 'Ver'} Estatisticas
            </Button>

            {isCoordinator && (
              <Dialog open={isUploadOpen} onOpenChange={setIsUploadOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <Upload className="h-4 w-4 mr-2" />
                    Enviar Material
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-lg">
                  <DialogHeader>
                    <DialogTitle>Enviar Novo Material</DialogTitle>
                    <DialogDescription>
                      Faca upload de arquivos. A IA analisara o conteudo automaticamente.
                    </DialogDescription>
                  </DialogHeader>
                  <form onSubmit={handleUpload} className="space-y-4">
                    <div>
                      <Label htmlFor="title">Titulo *</Label>
                      <Input id="title" name="title" required placeholder="Nome do material" />
                    </div>

                    <div>
                      <Label htmlFor="description">Descricao (opcional - IA pode sugerir)</Label>
                      <Textarea id="description" name="description" placeholder="Deixe em branco para sugestao da IA" rows={2} />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="category">Categoria (opcional)</Label>
                        <Select name="category">
                          <SelectTrigger>
                            <SelectValue placeholder="IA sugere" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="liturgia">Liturgia</SelectItem>
                            <SelectItem value="espiritualidade">Espiritualidade</SelectItem>
                            <SelectItem value="pratica">Pratica</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <Label htmlFor="trackId">Trilha</Label>
                        <Select name="trackId">
                          <SelectTrigger>
                            <SelectValue placeholder="Selecionar" />
                          </SelectTrigger>
                          <SelectContent>
                            {categoriesData?.tracks.map(track => (
                              <SelectItem key={track.id} value={track.id}>
                                {track.title}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="file">Arquivo (max 10MB)</Label>
                      <Input id="file" name="file" type="file" accept=".pdf,.doc,.docx,.ppt,.pptx,.jpg,.jpeg,.png,.mp3,.mp4,.webm" />
                      <p className="text-xs text-muted-foreground mt-1">
                        <Sparkles className="h-3 w-3 inline mr-1" />
                        A IA analisara PDFs e documentos de texto
                      </p>
                    </div>

                    <div>
                      <Label htmlFor="externalUrl">Ou URL Externa</Label>
                      <Input id="externalUrl" name="externalUrl" type="url" placeholder="https://..." />
                    </div>

                    <div className="flex items-center gap-2">
                      <input type="checkbox" id="isPublished" name="isPublished" value="true" defaultChecked className="rounded" />
                      <Label htmlFor="isPublished" className="font-normal">Publicar imediatamente</Label>
                    </div>

                    <DialogFooter>
                      <Button type="button" variant="outline" onClick={() => setIsUploadOpen(false)}>
                        Cancelar
                      </Button>
                      <Button type="submit" disabled={uploadMutation.isPending}>
                        {uploadMutation.isPending ? 'Enviando...' : 'Enviar'}
                      </Button>
                    </DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>
            )}
          </div>
        </div>

        {/* Statistics Cards */}
        {showStats && statsData && (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-100 dark:bg-blue-950 rounded-lg">
                    <FileText className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{statsData.totalMaterials}</p>
                    <p className="text-xs text-muted-foreground">Total de Materiais</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-green-100 dark:bg-green-950 rounded-lg">
                    <Download className="h-5 w-5 text-green-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{statsData.totalDownloads}</p>
                    <p className="text-xs text-muted-foreground">Downloads</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-purple-100 dark:bg-purple-950 rounded-lg">
                    <Sparkles className="h-5 w-5 text-purple-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{statsData.aiAnalyzed}</p>
                    <p className="text-xs text-muted-foreground">Analisados por IA</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-orange-100 dark:bg-orange-950 rounded-lg">
                    <HardDrive className="h-5 w-5 text-orange-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{formatFileSize(statsData.totalSize)}</p>
                    <p className="text-xs text-muted-foreground">Armazenamento</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* User Progress Card */}
            {progressData && (
              <Card>
                <CardContent className="pt-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-emerald-100 dark:bg-emerald-950 rounded-lg">
                      <Award className="h-5 w-5 text-emerald-600" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <p className="text-2xl font-bold">{progressData.progressPercent}%</p>
                        <span className="text-xs text-muted-foreground">{progressData.completed}/{progressData.totalMaterials}</span>
                      </div>
                      <Progress value={progressData.progressPercent} className="h-2 mt-1" />
                      <p className="text-xs text-muted-foreground mt-1">Seu Progresso</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* Quality Distribution */}
        {showStats && statsData && statsData.byQuality.length > 0 && (
          <Card>
            <CardHeader className="py-3">
              <CardTitle className="text-sm font-medium">Distribuicao de Qualidade (IA)</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="flex flex-wrap gap-3">
                {statsData.byQuality.map(({ quality, count }) => quality && (
                  <div key={quality} className="flex items-center gap-2">
                    <Badge className={getQualityColor(quality)}>
                      <Star className="h-3 w-3 mr-1" />
                      {qualityLabels[quality] || quality}
                    </Badge>
                    <span className="text-sm font-medium">{count}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Filters */}
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-4">
              {/* Search and View Toggle */}
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar por titulo, descricao ou resumo IA..."
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      setCurrentPage(0);
                    }}
                    className="pl-9"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant={viewMode === 'grid' ? 'default' : 'outline'}
                          size="icon"
                          onClick={() => setViewMode('grid')}
                        >
                          <LayoutGrid className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Grade</TooltipContent>
                    </Tooltip>
                  </TooltipProvider>

                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant={viewMode === 'list' ? 'default' : 'outline'}
                          size="icon"
                          onClick={() => setViewMode('list')}
                        >
                          <LayoutList className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Lista</TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
              </div>

              {/* Filter Row */}
              <div className="flex flex-wrap gap-3">
                <Select value={selectedType} onValueChange={(v) => { setSelectedType(v); setCurrentPage(0); }}>
                  <SelectTrigger className="w-36">
                    <SelectValue placeholder="Tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os tipos</SelectItem>
                    <SelectItem value="pdf">PDF</SelectItem>
                    <SelectItem value="document">Documento</SelectItem>
                    <SelectItem value="presentation">Apresentacao</SelectItem>
                    <SelectItem value="video">Video</SelectItem>
                    <SelectItem value="audio">Audio</SelectItem>
                    <SelectItem value="image">Imagem</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={selectedCategory} onValueChange={(v) => { setSelectedCategory(v); setCurrentPage(0); }}>
                  <SelectTrigger className="w-36">
                    <SelectValue placeholder="Categoria" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas</SelectItem>
                    <SelectItem value="liturgia">Liturgia</SelectItem>
                    <SelectItem value="espiritualidade">Espiritualidade</SelectItem>
                    <SelectItem value="pratica">Pratica</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={aiStatusFilter} onValueChange={(v) => { setAiStatusFilter(v); setCurrentPage(0); }}>
                  <SelectTrigger className="w-36">
                    <SelectValue placeholder="Status IA" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="analyzed">Analisados</SelectItem>
                    <SelectItem value="pending">Pendentes</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={aiQualityFilter} onValueChange={(v) => { setAiQualityFilter(v); setCurrentPage(0); }}>
                  <SelectTrigger className="w-36">
                    <SelectValue placeholder="Qualidade" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas</SelectItem>
                    <SelectItem value="excellent">Excelente</SelectItem>
                    <SelectItem value="good">Bom</SelectItem>
                    <SelectItem value="acceptable">Aceitavel</SelectItem>
                    <SelectItem value="needs_review">Precisa Revisao</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={sortBy} onValueChange={(v) => { setSortBy(v); setCurrentPage(0); }}>
                  <SelectTrigger className="w-36">
                    <SelectValue placeholder="Ordenar" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="date">Data</SelectItem>
                    <SelectItem value="title">Titulo</SelectItem>
                    <SelectItem value="downloads">Downloads</SelectItem>
                    <SelectItem value="quality">Qualidade</SelectItem>
                  </SelectContent>
                </Select>

                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                >
                  {sortOrder === 'asc' ? <SortAsc className="h-4 w-4" /> : <SortDesc className="h-4 w-4" />}
                </Button>

                {hasActiveFilters && (
                  <Button variant="ghost" size="sm" onClick={resetFilters}>
                    <Filter className="h-4 w-4 mr-1" />
                    Limpar filtros
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Materials Grid/List */}
        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : viewMode === 'grid' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {materialsData?.materials.map((material) => (
              <Card key={material.id} className={`hover:shadow-md transition-shadow ${isCompleted(material.id) ? 'border-green-200 bg-green-50/30 dark:bg-green-950/10' : ''}`}>
                <CardContent className="p-4">
                  <div className="flex items-start gap-4">
                    <div className="shrink-0 relative">
                      {getFileIcon(material.type)}
                      {isCompleted(material.id) && (
                        <CheckCircle className="h-4 w-4 text-green-600 absolute -bottom-1 -right-1 bg-white dark:bg-gray-900 rounded-full" />
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <h3 className="font-medium truncate">{material.title}</h3>
                          {material.description && (
                            <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                              {material.description}
                            </p>
                          )}
                        </div>

                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => markCompletedMutation.mutate({ id: material.id, completed: !isCompleted(material.id) })}>
                              {isCompleted(material.id) ? (
                                <>
                                  <Circle className="h-4 w-4 mr-2" />
                                  Desmarcar conclusao
                                </>
                              ) : (
                                <>
                                  <CheckCircle className="h-4 w-4 mr-2" />
                                  Marcar como concluido
                                </>
                              )}
                            </DropdownMenuItem>
                            {isCoordinator && (
                              <>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={() => setAnalyzingMaterial(material)}>
                                  <Brain className="h-4 w-4 mr-2" />
                                  Ver Analise IA
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => setEditingMaterial(material)}>
                                  <Edit className="h-4 w-4 mr-2" />
                                  Editar
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  className="text-red-600"
                                  onClick={() => deleteMutation.mutate(material.id)}
                                >
                                  <Trash2 className="h-4 w-4 mr-2" />
                                  Remover
                                </DropdownMenuItem>
                              </>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>

                      <div className="flex flex-wrap gap-1 mt-2">
                        {material.category && (
                          <Badge variant="outline" className="text-xs capitalize">
                            {categoryLabels[material.category] || material.category}
                          </Badge>
                        )}
                        {material.aiContentQuality && (
                          <Badge className={`text-xs ${getQualityColor(material.aiContentQuality)}`}>
                            <Star className="h-3 w-3 mr-1" />
                            {qualityLabels[material.aiContentQuality] || material.aiContentQuality}
                          </Badge>
                        )}
                        {!material.isPublished && (
                          <Badge variant="outline" className="text-xs text-yellow-600">
                            Rascunho
                          </Badge>
                        )}
                        {material.aiAnalyzed && !material.aiContentQuality && (
                          <Badge variant="outline" className="text-xs text-purple-600 border-purple-200">
                            <Sparkles className="h-3 w-3 mr-1" />
                            IA
                          </Badge>
                        )}
                      </div>

                      {/* AI Summary Preview */}
                      {material.aiSummary && (
                        <p className="text-xs text-muted-foreground line-clamp-2 mt-2 italic">
                          {material.aiSummary}
                        </p>
                      )}

                      {/* Key Topics */}
                      {material.aiKeyTopics && material.aiKeyTopics.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {material.aiKeyTopics.slice(0, 3).map((topic, i) => (
                            <Badge key={i} variant="secondary" className="text-xs">
                              {topic}
                            </Badge>
                          ))}
                          {material.aiKeyTopics.length > 3 && (
                            <Badge variant="secondary" className="text-xs">
                              +{material.aiKeyTopics.length - 3}
                            </Badge>
                          )}
                        </div>
                      )}

                      <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
                        {material.fileSize > 0 && (
                          <span className="flex items-center gap-1">
                            <HardDrive className="h-3 w-3" />
                            {formatFileSize(material.fileSize)}
                          </span>
                        )}
                        <span className="flex items-center gap-1">
                          <Download className="h-3 w-3" />
                          {material.downloadCount}
                        </span>
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {formatDate(material.createdAt)}
                        </span>
                      </div>

                      <div className="flex gap-2 mt-3">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleDownload(material)}
                          className="flex-1"
                        >
                          {material.externalUrl ? (
                            <>
                              <ExternalLink className="h-3 w-3 mr-1" />
                              Abrir
                            </>
                          ) : (
                            <>
                              <Download className="h-3 w-3 mr-1" />
                              Baixar
                            </>
                          )}
                        </Button>
                        {isCoordinator && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setAnalyzingMaterial(material)}
                            title="Ver analise IA"
                          >
                            <Brain className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          /* List View */
          <Card>
            <CardContent className="p-0">
              <div className="divide-y">
                {materialsData?.materials.map((material) => (
                  <div
                    key={material.id}
                    className={`flex items-center gap-4 p-4 hover:bg-muted/50 transition-colors ${isCompleted(material.id) ? 'bg-green-50/30 dark:bg-green-950/10' : ''}`}
                  >
                    <div className="shrink-0 relative">
                      {getFileIcon(material.type, 'sm')}
                      {isCompleted(material.id) && (
                        <CheckCircle className="h-3 w-3 text-green-600 absolute -bottom-0.5 -right-0.5 bg-white dark:bg-gray-900 rounded-full" />
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-medium truncate">{material.title}</h3>
                        {material.aiContentQuality && (
                          <Badge className={`text-xs ${getQualityColor(material.aiContentQuality)}`}>
                            {qualityLabels[material.aiContentQuality]}
                          </Badge>
                        )}
                      </div>
                      {material.description && (
                        <p className="text-sm text-muted-foreground truncate">
                          {material.description}
                        </p>
                      )}
                    </div>

                    <div className="hidden md:flex items-center gap-4 text-sm text-muted-foreground">
                      {material.category && (
                        <Badge variant="outline" className="capitalize">
                          {categoryLabels[material.category] || material.category}
                        </Badge>
                      )}
                      <span>{formatFileSize(material.fileSize)}</span>
                      <span className="flex items-center gap-1">
                        <Download className="h-3 w-3" />
                        {material.downloadCount}
                      </span>
                      <span>{formatDate(material.createdAt)}</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDownload(material)}
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => markCompletedMutation.mutate({ id: material.id, completed: !isCompleted(material.id) })}
                      >
                        {isCompleted(material.id) ? (
                          <CheckCircle className="h-4 w-4 text-green-600" />
                        ) : (
                          <Circle className="h-4 w-4" />
                        )}
                      </Button>
                      {isCoordinator && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => setAnalyzingMaterial(material)}>
                              <Brain className="h-4 w-4 mr-2" />
                              Ver Analise IA
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setEditingMaterial(material)}>
                              <Edit className="h-4 w-4 mr-2" />
                              Editar
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="text-red-600"
                              onClick={() => deleteMutation.mutate(material.id)}
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Remover
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Empty State */}
        {materialsData?.materials.length === 0 && !isLoading && (
          <Card>
            <CardContent className="py-12 text-center">
              <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">Nenhum material encontrado</h3>
              <p className="text-muted-foreground">
                {hasActiveFilters
                  ? 'Tente ajustar os filtros de busca'
                  : 'Ainda nao ha materiais na biblioteca'}
              </p>
              {hasActiveFilters && (
                <Button variant="outline" className="mt-4" onClick={resetFilters}>
                  Limpar filtros
                </Button>
              )}
            </CardContent>
          </Card>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Mostrando {currentPage * ITEMS_PER_PAGE + 1}-{Math.min((currentPage + 1) * ITEMS_PER_PAGE, materialsData?.total || 0)} de {materialsData?.total || 0} materiais
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(p => Math.max(0, p - 1))}
                disabled={currentPage === 0}
              >
                <ChevronLeft className="h-4 w-4" />
                Anterior
              </Button>
              <span className="text-sm">
                Pagina {currentPage + 1} de {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(p => Math.min(totalPages - 1, p + 1))}
                disabled={currentPage >= totalPages - 1}
              >
                Proximo
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {/* AI Analysis Dialog */}
        <Dialog open={!!analyzingMaterial} onOpenChange={() => setAnalyzingMaterial(null)}>
          <DialogContent className="max-w-2xl max-h-[90vh]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Brain className="h-5 w-5 text-purple-600" />
                Analise de IA
              </DialogTitle>
              <DialogDescription>
                {analyzingMaterial?.title}
              </DialogDescription>
            </DialogHeader>

            <ScrollArea className="max-h-[60vh]">
              {isLoadingAnalysis ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
                </div>
              ) : !aiAnalysis?.analyzed ? (
                <div className="text-center py-8">
                  <Clock className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="font-medium mb-2">Material ainda nao analisado</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Clique abaixo para iniciar a analise com IA
                  </p>
                  <Button
                    onClick={() => analyzingMaterial && analyzeMutation.mutate(analyzingMaterial.id)}
                    disabled={analyzeMutation.isPending}
                  >
                    {analyzeMutation.isPending ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Analisando...
                      </>
                    ) : (
                      <>
                        <Wand2 className="h-4 w-4 mr-2" />
                        Analisar com IA
                      </>
                    )}
                  </Button>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Quality Badge */}
                  {aiAnalysis.contentQuality && (
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-medium">Qualidade:</span>
                      <Badge className={getQualityColor(aiAnalysis.contentQuality)}>
                        <Star className="h-3 w-3 mr-1" />
                        {qualityLabels[aiAnalysis.contentQuality] || aiAnalysis.contentQuality}
                      </Badge>
                    </div>
                  )}

                  {/* Summary */}
                  {aiAnalysis.summary && (
                    <div>
                      <h4 className="font-medium mb-2 flex items-center gap-2">
                        <BookOpen className="h-4 w-4" />
                        Resumo
                      </h4>
                      <p className="text-sm text-muted-foreground bg-muted/50 p-3 rounded-lg">
                        {aiAnalysis.summary}
                      </p>
                    </div>
                  )}

                  {/* Suggested Category */}
                  {aiAnalysis.suggestedCategory && (
                    <div className="flex items-center justify-between bg-purple-50 dark:bg-purple-950/20 p-3 rounded-lg">
                      <div>
                        <span className="text-sm font-medium">Categoria sugerida:</span>
                        <Badge variant="outline" className="ml-2 capitalize">
                          {categoryLabels[aiAnalysis.suggestedCategory] || aiAnalysis.suggestedCategory}
                        </Badge>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => analyzingMaterial && applySuggestionsMutation.mutate({
                          id: analyzingMaterial.id,
                          suggestions: { applyCategory: true }
                        })}
                        disabled={applySuggestionsMutation.isPending}
                      >
                        <CheckCircle2 className="h-3 w-3 mr-1" />
                        Aplicar
                      </Button>
                    </div>
                  )}

                  {/* Key Topics */}
                  {aiAnalysis.keyTopics && aiAnalysis.keyTopics.length > 0 && (
                    <div>
                      <h4 className="font-medium mb-2 flex items-center gap-2">
                        <Tag className="h-4 w-4" />
                        Topicos Principais
                      </h4>
                      <div className="flex flex-wrap gap-2">
                        {aiAnalysis.keyTopics.map((topic, i) => (
                          <Badge key={i} variant="secondary">
                            {topic}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Suggested Tags */}
                  {aiAnalysis.suggestedTags && aiAnalysis.suggestedTags.length > 0 && (
                    <div className="bg-purple-50 dark:bg-purple-950/20 p-3 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium">Tags sugeridas:</span>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => analyzingMaterial && applySuggestionsMutation.mutate({
                            id: analyzingMaterial.id,
                            suggestions: { applyTags: true }
                          })}
                          disabled={applySuggestionsMutation.isPending}
                        >
                          <CheckCircle2 className="h-3 w-3 mr-1" />
                          Aplicar
                        </Button>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {aiAnalysis.suggestedTags.map((tag, i) => (
                          <Badge key={i} variant="outline" className="text-xs">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Quality Notes */}
                  {aiAnalysis.qualityNotes && aiAnalysis.qualityNotes.length > 0 && (
                    <div>
                      <h4 className="font-medium mb-2 flex items-center gap-2">
                        <AlertCircle className="h-4 w-4" />
                        Observacoes
                      </h4>
                      <ul className="text-sm text-muted-foreground space-y-1">
                        {aiAnalysis.qualityNotes.map((note, i) => (
                          <li key={i} className="flex items-start gap-2">
                            <span className="text-purple-600">-</span>
                            {note}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Quiz Questions */}
                  {aiAnalysis.quizQuestions && aiAnalysis.quizQuestions.length > 0 && (
                    <Accordion type="single" collapsible>
                      <AccordionItem value="quiz">
                        <AccordionTrigger>
                          <div className="flex items-center gap-2">
                            <HelpCircle className="h-4 w-4" />
                            Quiz Gerado ({aiAnalysis.quizQuestions.length} perguntas)
                          </div>
                        </AccordionTrigger>
                        <AccordionContent>
                          <div className="space-y-4 pt-2">
                            {aiAnalysis.quizQuestions.map((q, i) => (
                              <div key={i} className="border rounded-lg p-3">
                                <p className="font-medium text-sm mb-2">
                                  {i + 1}. {q.question}
                                </p>
                                <div className="space-y-1">
                                  {q.options.map((opt, j) => (
                                    <div
                                      key={j}
                                      className={`text-sm p-2 rounded ${
                                        j === q.correctIndex
                                          ? 'bg-green-100 dark:bg-green-950/30 text-green-800 dark:text-green-200'
                                          : 'bg-muted/50'
                                      }`}
                                    >
                                      {String.fromCharCode(65 + j)}) {opt}
                                      {j === q.correctIndex && (
                                        <CheckCircle2 className="h-3 w-3 inline ml-2" />
                                      )}
                                    </div>
                                  ))}
                                </div>
                                {q.explanation && (
                                  <p className="text-xs text-muted-foreground mt-2 italic">
                                    {q.explanation}
                                  </p>
                                )}
                              </div>
                            ))}
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                    </Accordion>
                  )}

                  {/* Generate Quiz Button */}
                  {(!aiAnalysis.quizQuestions || aiAnalysis.quizQuestions.length === 0) && (
                    <Button
                      variant="outline"
                      onClick={() => analyzingMaterial && generateQuizMutation.mutate(analyzingMaterial.id)}
                      disabled={generateQuizMutation.isPending}
                      className="w-full"
                    >
                      {generateQuizMutation.isPending ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Gerando quiz...
                        </>
                      ) : (
                        <>
                          <HelpCircle className="h-4 w-4 mr-2" />
                          Gerar Quiz com IA
                        </>
                      )}
                    </Button>
                  )}

                  {/* Analyzed Date */}
                  {aiAnalysis.analyzedAt && (
                    <p className="text-xs text-muted-foreground text-center">
                      Analisado em {formatDate(aiAnalysis.analyzedAt)}
                    </p>
                  )}
                </div>
              )}
            </ScrollArea>

            <DialogFooter className="flex-col sm:flex-row gap-2">
              {aiAnalysis?.analyzed && (
                <Button
                  variant="outline"
                  onClick={() => analyzingMaterial && analyzeMutation.mutate(analyzingMaterial.id)}
                  disabled={analyzeMutation.isPending}
                >
                  <RefreshCw className={`h-4 w-4 mr-2 ${analyzeMutation.isPending ? 'animate-spin' : ''}`} />
                  Re-analisar
                </Button>
              )}
              {aiAnalysis?.analyzed && (
                <Button
                  onClick={() => analyzingMaterial && applySuggestionsMutation.mutate({
                    id: analyzingMaterial.id,
                    suggestions: { applyCategory: true, applyTags: true, applyDescription: true }
                  })}
                  disabled={applySuggestionsMutation.isPending}
                >
                  <Wand2 className="h-4 w-4 mr-2" />
                  Aplicar Todas Sugestoes
                </Button>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Edit Dialog */}
        <Dialog open={!!editingMaterial} onOpenChange={() => setEditingMaterial(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Editar Material</DialogTitle>
            </DialogHeader>
            {editingMaterial && (
              <form onSubmit={(e) => {
                e.preventDefault();
                const formData = new FormData(e.currentTarget);
                updateMutation.mutate({
                  id: editingMaterial.id,
                  data: {
                    title: formData.get('title'),
                    description: formData.get('description'),
                    category: formData.get('category') || null,
                    isPublished: formData.get('isPublished') === 'true'
                  }
                });
              }} className="space-y-4">
                <div>
                  <Label htmlFor="edit-title">Titulo</Label>
                  <Input
                    id="edit-title"
                    name="title"
                    defaultValue={editingMaterial.title}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="edit-description">Descricao</Label>
                  <Textarea
                    id="edit-description"
                    name="description"
                    defaultValue={editingMaterial.description || ''}
                    rows={2}
                  />
                </div>
                <div>
                  <Label htmlFor="edit-category">Categoria</Label>
                  <Select name="category" defaultValue={editingMaterial.category || ''}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecionar" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="liturgia">Liturgia</SelectItem>
                      <SelectItem value="espiritualidade">Espiritualidade</SelectItem>
                      <SelectItem value="pratica">Pratica</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="edit-isPublished"
                    name="isPublished"
                    value="true"
                    defaultChecked={editingMaterial.isPublished}
                    className="rounded"
                  />
                  <Label htmlFor="edit-isPublished" className="font-normal">Publicado</Label>
                </div>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setEditingMaterial(null)}>
                    Cancelar
                  </Button>
                  <Button type="submit" disabled={updateMutation.isPending}>
                    Salvar
                  </Button>
                </DialogFooter>
              </form>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
}
