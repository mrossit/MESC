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
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
  Filter,
  MoreVertical,
  Trash2,
  Edit,
  Eye,
  ExternalLink,
  Calendar,
  User,
  HardDrive,
  Link as LinkIcon
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

// File type icons
const getFileIcon = (type: string) => {
  switch (type) {
    case 'pdf':
    case 'document':
      return <FileText className="h-8 w-8 text-red-500" />;
    case 'video':
      return <FileVideo className="h-8 w-8 text-purple-500" />;
    case 'audio':
      return <FileAudio className="h-8 w-8 text-blue-500" />;
    case 'image':
      return <FileImage className="h-8 w-8 text-green-500" />;
    case 'presentation':
      return <Presentation className="h-8 w-8 text-orange-500" />;
    default:
      return <File className="h-8 w-8 text-gray-500" />;
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

export default function Library() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState('all');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [editingMaterial, setEditingMaterial] = useState<Material | null>(null);

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
    queryKey: ['/api/materials', searchQuery, selectedType, selectedCategory],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (searchQuery) params.set('search', searchQuery);
      if (selectedType !== 'all') params.set('type', selectedType);
      if (selectedCategory !== 'all') params.set('category', selectedCategory);

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
    onSuccess: () => {
      toast({ title: 'Material enviado com sucesso!' });
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
                    Faca upload de arquivos ou adicione links externos
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleUpload} className="space-y-4">
                  <div>
                    <Label htmlFor="title">Titulo *</Label>
                    <Input id="title" name="title" required placeholder="Nome do material" />
                  </div>

                  <div>
                    <Label htmlFor="description">Descricao</Label>
                    <Textarea id="description" name="description" placeholder="Descricao do material" rows={2} />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="category">Categoria</Label>
                      <Select name="category">
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
                  </div>

                  <div>
                    <Label htmlFor="externalUrl">Ou URL Externa</Label>
                    <Input id="externalUrl" name="externalUrl" type="url" placeholder="https://..." />
                  </div>

                  <div>
                    <Label htmlFor="tags">Tags (separadas por virgula)</Label>
                    <Input id="tags" name="tags" placeholder="formacao, liturgia, video" />
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

        {/* Filters */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar materiais..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>

              <Select value={selectedType} onValueChange={setSelectedType}>
                <SelectTrigger className="w-full sm:w-40">
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

              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger className="w-full sm:w-40">
                  <SelectValue placeholder="Categoria" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  <SelectItem value="liturgia">Liturgia</SelectItem>
                  <SelectItem value="espiritualidade">Espiritualidade</SelectItem>
                  <SelectItem value="pratica">Pratica</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Materials Grid */}
        {isLoading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {materialsData?.materials.map((material) => (
              <Card key={material.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-start gap-4">
                    <div className="shrink-0">
                      {getFileIcon(material.type)}
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

                        {isCoordinator && (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => setEditingMaterial(material)}>
                                <Edit className="h-4 w-4 mr-2" />
                                Editar
                              </DropdownMenuItem>
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

                      <div className="flex flex-wrap gap-1 mt-2">
                        {material.category && (
                          <Badge variant="outline" className="text-xs capitalize">
                            {material.category}
                          </Badge>
                        )}
                        <Badge variant="secondary" className="text-xs">
                          {material.type}
                        </Badge>
                        {!material.isPublished && (
                          <Badge variant="outline" className="text-xs text-yellow-600">
                            Rascunho
                          </Badge>
                        )}
                      </div>

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
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {materialsData?.materials.length === 0 && !isLoading && (
          <Card>
            <CardContent className="py-12 text-center">
              <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">Nenhum material encontrado</h3>
              <p className="text-muted-foreground">
                {searchQuery || selectedType !== 'all' || selectedCategory !== 'all'
                  ? 'Tente ajustar os filtros de busca'
                  : 'Ainda nao ha materiais na biblioteca'}
              </p>
            </CardContent>
          </Card>
        )}

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
