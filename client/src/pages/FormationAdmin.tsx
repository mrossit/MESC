import { useEffect, useState } from "react";
import { Link } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { toast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  ArrowLeft,
  ArrowUp,
  ArrowDown,
  Plus,
  Edit,
  Trash2,
  Eye,
  EyeOff,
  BookOpen,
  Layers,
  FileText,
  BarChart3,
  ChevronRight,
  Loader2,
  Database,
  X,
  Video,
  Music,
  FileQuestion,
  MousePointerClick,
} from "lucide-react";

// ========================================
// TYPES
// ========================================

interface Track {
  id: string;
  title: string;
  description?: string | null;
  category: string;
  orderIndex: number;
  icon?: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface Module {
  id: string;
  trackId: string;
  title: string;
  description?: string | null;
  content?: string | null;
  videoUrl?: string | null;
  durationMinutes?: number | null;
  orderIndex: number;
  createdAt: string;
}

interface Lesson {
  id: string;
  moduleId: string;
  trackId?: string | null;
  title: string;
  description?: string | null;
  lessonNumber: number;
  durationMinutes?: number | null;
  objectives?: string[] | null;
  isActive: boolean;
  orderIndex: number;
  createdAt: string;
  updatedAt: string;
}

interface Section {
  id: string;
  lessonId: string;
  type: "text" | "video" | "audio" | "document" | "quiz" | "interactive";
  title: string;
  content?: string | null;
  videoUrl?: string | null;
  audioUrl?: string | null;
  documentUrl?: string | null;
  imageUrl?: string | null;
  quizData?: QuizData | null;
  orderIndex: number;
  isRequired: boolean;
  estimatedMinutes?: number | null;
  createdAt: string;
  updatedAt: string;
}

interface QuizQuestion {
  question: string;
  options: { text: string; isCorrect: boolean }[];
  explanation: string;
}

interface QuizData {
  title: string;
  description: string;
  passingScore: number;
  questions: QuizQuestion[];
}

interface Stats {
  tracks: { total: number; active: number };
  modules: { total: number };
  lessons: { total: number; active: number };
  sections: { total: number; videos?: number };
}

type AdminView =
  | { level: "dashboard" }
  | { level: "modules"; track: Track }
  | { level: "lessons"; track: Track; module: Module }
  | { level: "sections"; track: Track; module: Module; lesson: Lesson };

interface FormationAdminProps {
  onExit?: () => void;
}

// ========================================
// SECTION TYPE HELPERS
// ========================================

const sectionTypeLabels: Record<string, string> = {
  text: "Texto",
  video: "Vídeo",
  audio: "Áudio",
  document: "Documento",
  quiz: "Quiz",
  interactive: "Interativo",
};

const sectionTypeIcons: Record<string, React.ReactNode> = {
  text: <FileText className="h-3 w-3" />,
  video: <Video className="h-3 w-3" />,
  audio: <Music className="h-3 w-3" />,
  document: <FileText className="h-3 w-3" />,
  quiz: <FileQuestion className="h-3 w-3" />,
  interactive: <MousePointerClick className="h-3 w-3" />,
};

const categoryLabels: Record<string, string> = {
  liturgia: "Liturgia",
  espiritualidade: "Espiritualidade",
  pratica: "Prática",
};

// ========================================
// QUIZ EDITOR
// ========================================

function QuizEditor({
  value,
  onChange,
}: {
  value: QuizData;
  onChange: (data: QuizData) => void;
}) {
  const addQuestion = () => {
    onChange({
      ...value,
      questions: [
        ...value.questions,
        { question: "", options: [{ text: "", isCorrect: true }, { text: "", isCorrect: false }], explanation: "" },
      ],
    });
  };

  const removeQuestion = (index: number) => {
    onChange({
      ...value,
      questions: value.questions.filter((_, i) => i !== index),
    });
  };

  const updateQuestion = (index: number, field: string, val: string) => {
    const updated = [...value.questions];
    (updated[index] as unknown as Record<string, unknown>)[field] = val;
    onChange({ ...value, questions: updated });
  };

  const addOption = (qIndex: number) => {
    const updated = [...value.questions];
    updated[qIndex].options.push({ text: "", isCorrect: false });
    onChange({ ...value, questions: updated });
  };

  const removeOption = (qIndex: number, oIndex: number) => {
    const updated = [...value.questions];
    updated[qIndex].options = updated[qIndex].options.filter((_, i) => i !== oIndex);
    onChange({ ...value, questions: updated });
  };

  const updateOptionText = (qIndex: number, oIndex: number, text: string) => {
    const updated = [...value.questions];
    updated[qIndex].options[oIndex].text = text;
    onChange({ ...value, questions: updated });
  };

  const setCorrectOption = (qIndex: number, oIndex: number) => {
    const updated = [...value.questions];
    updated[qIndex].options = updated[qIndex].options.map((opt, i) => ({
      ...opt,
      isCorrect: i === oIndex,
    }));
    onChange({ ...value, questions: updated });
  };

  return (
    <div className="space-y-4 border rounded-lg p-4">
      <h4 className="font-semibold text-sm">Configuração do Quiz</h4>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label>Título do Quiz</Label>
          <Input
            value={value.title}
            onChange={(e) => onChange({ ...value, title: e.target.value })}
          />
        </div>
        <div>
          <Label>Nota Mínima (%)</Label>
          <Input
            type="number"
            min={0}
            max={100}
            value={value.passingScore}
            onChange={(e) => onChange({ ...value, passingScore: Number(e.target.value) })}
          />
        </div>
      </div>
      <div>
        <Label>Descrição</Label>
        <Textarea
          value={value.description}
          onChange={(e) => onChange({ ...value, description: e.target.value })}
          rows={2}
        />
      </div>

      <div className="space-y-3">
        {value.questions.map((q, qIndex) => (
          <Card key={qIndex} className="p-3">
            <div className="flex items-start justify-between gap-2 mb-2">
              <span className="text-xs font-medium text-muted-foreground">
                Pergunta {qIndex + 1}
              </span>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => removeQuestion(qIndex)}
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
            <div className="space-y-2">
              <Input
                placeholder="Texto da pergunta"
                value={q.question}
                onChange={(e) => updateQuestion(qIndex, "question", e.target.value)}
              />
              <div className="space-y-1">
                <Label className="text-xs">Opções (selecione a correta)</Label>
                {q.options.map((opt, oIndex) => (
                  <div key={oIndex} className="flex items-center gap-2">
                    <input
                      type="radio"
                      name={`correct-${qIndex}`}
                      checked={opt.isCorrect}
                      onChange={() => setCorrectOption(qIndex, oIndex)}
                      className="accent-primary"
                    />
                    <Input
                      className="flex-1 h-8 text-sm"
                      placeholder={`Opção ${oIndex + 1}`}
                      value={opt.text}
                      onChange={(e) => updateOptionText(qIndex, oIndex, e.target.value)}
                    />
                    {q.options.length > 2 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0"
                        onClick={() => removeOption(qIndex, oIndex)}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                ))}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="text-xs mt-1"
                  onClick={() => addOption(qIndex)}
                >
                  + Opção
                </Button>
              </div>
              <div>
                <Label className="text-xs">Explicação</Label>
                <Textarea
                  rows={2}
                  className="text-sm"
                  placeholder="Explicação da resposta"
                  value={q.explanation}
                  onChange={(e) => updateQuestion(qIndex, "explanation", e.target.value)}
                />
              </div>
            </div>
          </Card>
        ))}
      </div>
      <Button type="button" variant="outline" size="sm" onClick={addQuestion}>
        <Plus className="h-3 w-3 mr-1" /> Adicionar Pergunta
      </Button>
    </div>
  );
}

// ========================================
// TRACK FORM DIALOG
// ========================================

function TrackFormDialog({
  open,
  onOpenChange,
  track,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  track: Track | null;
}) {
  const isEdit = !!track;
  const [form, setForm] = useState({
    id: "",
    title: "",
    description: "",
    category: "liturgia",
    icon: "",
    isActive: true,
  });

  const resetForm = (t: Track | null) => {
    if (t) {
      setForm({
        id: t.id,
        title: t.title,
        description: t.description || "",
        category: t.category,
        icon: t.icon || "",
        isActive: t.isActive,
      });
    } else {
      setForm({ id: "", title: "", description: "", category: "liturgia", icon: "", isActive: true });
    }
  };

  useEffect(() => {
    if (open) resetForm(track);
  }, [open, track]);

  const handleOpenChange = (val: boolean) => {
    if (val) resetForm(track);
    onOpenChange(val);
  };

  const mutation = useMutation({
    mutationFn: async () => {
      if (isEdit) {
        const { id: _id, ...data } = form;
        const res = await apiRequest("PATCH", `/api/formation-admin/tracks/${track.id}`, data);
        return res.json();
      } else {
        const res = await apiRequest("POST", "/api/formation-admin/tracks", form);
        return res.json();
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/formation-admin/tracks"] });
      queryClient.invalidateQueries({ queryKey: ["/api/formation-admin/stats"] });
      toast({ title: "Sucesso", description: isEdit ? "Trilha atualizada." : "Trilha criada." });
      onOpenChange(false);
    },
    onError: (error) => {
      toast({
        title: "Erro",
        description: error instanceof Error ? error.message : "Falha na operação",
        variant: "destructive",
      });
    },
  });

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Editar Trilha" : "Nova Trilha"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          {!isEdit && (
            <div>
              <Label>ID (slug)</Label>
              <Input
                placeholder="minha-trilha"
                value={form.id}
                onChange={(e) => setForm({ ...form, id: e.target.value })}
              />
            </div>
          )}
          <div>
            <Label>Título *</Label>
            <Input
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
            />
          </div>
          <div>
            <Label>Descrição</Label>
            <Textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              rows={3}
            />
          </div>
          <div>
            <Label>Categoria</Label>
            <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
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
            <Label>Ícone (nome lucide)</Label>
            <Input
              placeholder="book-open"
              value={form.icon}
              onChange={(e) => setForm({ ...form, icon: e.target.value })}
            />
          </div>
          <div className="flex items-center gap-2">
            <Checkbox
              id="track-active"
              checked={form.isActive}
              onCheckedChange={(c) => setForm({ ...form, isActive: !!c })}
            />
            <Label htmlFor="track-active">Ativa</Label>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            onClick={() => mutation.mutate()}
            disabled={mutation.isPending || !form.title || (!isEdit && !form.id)}
          >
            {mutation.isPending && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
            {isEdit ? "Salvar" : "Criar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ========================================
// MODULE FORM DIALOG
// ========================================

function ModuleFormDialog({
  open,
  onOpenChange,
  trackId,
  module: mod,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  trackId: string;
  module: Module | null;
}) {
  const isEdit = !!mod;
  const [form, setForm] = useState({
    title: "",
    description: "",
    content: "",
    videoUrl: "",
    durationMinutes: "",
  });

  const resetForm = (m: Module | null) => {
    if (m) {
      setForm({
        title: m.title,
        description: m.description || "",
        content: m.content || "",
        videoUrl: m.videoUrl || "",
        durationMinutes: m.durationMinutes?.toString() || "",
      });
    } else {
      setForm({ title: "", description: "", content: "", videoUrl: "", durationMinutes: "" });
    }
  };

  useEffect(() => {
    if (open) resetForm(mod);
  }, [open, mod]);

  const handleOpenChange = (val: boolean) => {
    if (val) resetForm(mod);
    onOpenChange(val);
  };

  const mutation = useMutation({
    mutationFn: async () => {
      const data = {
        trackId,
        title: form.title,
        description: form.description || undefined,
        content: form.content || undefined,
        videoUrl: form.videoUrl || undefined,
        durationMinutes: form.durationMinutes ? Number(form.durationMinutes) : undefined,
      };
      if (isEdit) {
        const res = await apiRequest("PATCH", `/api/formation-admin/modules/${mod.id}`, data);
        return res.json();
      } else {
        const res = await apiRequest("POST", "/api/formation-admin/modules", data);
        return res.json();
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/formation-admin/tracks/${trackId}/modules`] });
      queryClient.invalidateQueries({ queryKey: ["/api/formation-admin/stats"] });
      toast({ title: "Sucesso", description: isEdit ? "Módulo atualizado." : "Módulo criado." });
      onOpenChange(false);
    },
    onError: (error) => {
      toast({
        title: "Erro",
        description: error instanceof Error ? error.message : "Falha na operação",
        variant: "destructive",
      });
    },
  });

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Editar Módulo" : "Novo Módulo"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Título *</Label>
            <Input
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
            />
          </div>
          <div>
            <Label>Descrição</Label>
            <Textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              rows={2}
            />
          </div>
          <div>
            <Label>Conteúdo</Label>
            <Textarea
              value={form.content}
              onChange={(e) => setForm({ ...form, content: e.target.value })}
              rows={3}
            />
          </div>
          <div>
            <Label>URL do Vídeo</Label>
            <Input
              value={form.videoUrl}
              onChange={(e) => setForm({ ...form, videoUrl: e.target.value })}
            />
          </div>
          <div>
            <Label>Duração (minutos)</Label>
            <Input
              type="number"
              min={0}
              value={form.durationMinutes}
              onChange={(e) => setForm({ ...form, durationMinutes: e.target.value })}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            onClick={() => mutation.mutate()}
            disabled={mutation.isPending || !form.title}
          >
            {mutation.isPending && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
            {isEdit ? "Salvar" : "Criar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ========================================
// LESSON FORM DIALOG
// ========================================

function LessonFormDialog({
  open,
  onOpenChange,
  moduleId,
  trackId,
  lesson,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  moduleId: string;
  trackId: string;
  lesson: Lesson | null;
}) {
  const isEdit = !!lesson;
  const [form, setForm] = useState({
    title: "",
    description: "",
    lessonNumber: "1",
    durationMinutes: "",
    objectives: [""] as string[],
    isActive: true,
  });

  const resetForm = (l: Lesson | null) => {
    if (l) {
      const objs = Array.isArray(l.objectives) && l.objectives.length > 0
        ? (l.objectives as string[])
        : [""];
      setForm({
        title: l.title,
        description: l.description || "",
        lessonNumber: l.lessonNumber.toString(),
        durationMinutes: l.durationMinutes?.toString() || "",
        objectives: objs,
        isActive: l.isActive,
      });
    } else {
      setForm({ title: "", description: "", lessonNumber: "1", durationMinutes: "", objectives: [""], isActive: true });
    }
  };

  useEffect(() => {
    if (open) resetForm(lesson);
  }, [open, lesson]);

  const handleOpenChange = (val: boolean) => {
    if (val) resetForm(lesson);
    onOpenChange(val);
  };

  const addObjective = () => setForm({ ...form, objectives: [...form.objectives, ""] });
  const removeObjective = (i: number) =>
    setForm({ ...form, objectives: form.objectives.filter((_, idx) => idx !== i) });
  const updateObjective = (i: number, val: string) => {
    const updated = [...form.objectives];
    updated[i] = val;
    setForm({ ...form, objectives: updated });
  };

  const mutation = useMutation({
    mutationFn: async () => {
      const filteredObjectives = form.objectives.filter((o) => o.trim() !== "");
      const data = {
        moduleId,
        trackId,
        title: form.title,
        description: form.description || undefined,
        lessonNumber: Number(form.lessonNumber),
        durationMinutes: form.durationMinutes ? Number(form.durationMinutes) : undefined,
        objectives: filteredObjectives.length > 0 ? filteredObjectives : undefined,
        isActive: form.isActive,
      };
      if (isEdit) {
        const res = await apiRequest("PATCH", `/api/formation-admin/lessons/${lesson.id}`, data);
        return res.json();
      } else {
        const res = await apiRequest("POST", "/api/formation-admin/lessons", data);
        return res.json();
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/formation-admin/modules/${moduleId}/lessons`] });
      queryClient.invalidateQueries({ queryKey: ["/api/formation-admin/stats"] });
      toast({ title: "Sucesso", description: isEdit ? "Aula atualizada." : "Aula criada." });
      onOpenChange(false);
    },
    onError: (error) => {
      toast({
        title: "Erro",
        description: error instanceof Error ? error.message : "Falha na operação",
        variant: "destructive",
      });
    },
  });

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Editar Aula" : "Nova Aula"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Título *</Label>
            <Input
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
            />
          </div>
          <div>
            <Label>Descrição</Label>
            <Textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              rows={2}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Número da Aula</Label>
              <Input
                type="number"
                min={1}
                value={form.lessonNumber}
                onChange={(e) => setForm({ ...form, lessonNumber: e.target.value })}
              />
            </div>
            <div>
              <Label>Duração (minutos)</Label>
              <Input
                type="number"
                min={0}
                value={form.durationMinutes}
                onChange={(e) => setForm({ ...form, durationMinutes: e.target.value })}
              />
            </div>
          </div>
          <div>
            <Label>Objetivos</Label>
            <div className="space-y-1">
              {form.objectives.map((obj, i) => (
                <div key={i} className="flex items-center gap-2">
                  <Input
                    className="flex-1 h-8 text-sm"
                    placeholder={`Objetivo ${i + 1}`}
                    value={obj}
                    onChange={(e) => updateObjective(i, e.target.value)}
                  />
                  {form.objectives.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0"
                      onClick={() => removeObjective(i)}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  )}
                </div>
              ))}
              <Button type="button" variant="outline" size="sm" className="text-xs" onClick={addObjective}>
                + Objetivo
              </Button>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Checkbox
              id="lesson-active"
              checked={form.isActive}
              onCheckedChange={(c) => setForm({ ...form, isActive: !!c })}
            />
            <Label htmlFor="lesson-active">Ativa</Label>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            onClick={() => mutation.mutate()}
            disabled={mutation.isPending || !form.title}
          >
            {mutation.isPending && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
            {isEdit ? "Salvar" : "Criar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ========================================
// SECTION FORM DIALOG
// ========================================

function SectionFormDialog({
  open,
  onOpenChange,
  lessonId,
  section,
  defaultType = "text",
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lessonId: string;
  section: Section | null;
  defaultType?: Section["type"];
}) {
  const isEdit = !!section;
  const [form, setForm] = useState({
    title: "",
    type: "text" as Section["type"],
    isRequired: true,
    estimatedMinutes: "",
    content: "",
    videoUrl: "",
    audioUrl: "",
    documentUrl: "",
    imageUrl: "",
    quizData: {
      title: "",
      description: "",
      passingScore: 70,
      questions: [],
    } as QuizData,
  });

  const resetForm = (s: Section | null) => {
    if (s) {
      setForm({
        title: s.title,
        type: s.type,
        isRequired: s.isRequired,
        estimatedMinutes: s.estimatedMinutes?.toString() || "",
        content: s.content || "",
        videoUrl: s.videoUrl || "",
        audioUrl: s.audioUrl || "",
        documentUrl: s.documentUrl || "",
        imageUrl: s.imageUrl || "",
        quizData: (s.quizData as QuizData) || {
          title: "",
          description: "",
          passingScore: 70,
          questions: [],
        },
      });
    } else {
      setForm({
        title: "",
        type: defaultType,
        isRequired: true,
        estimatedMinutes: "",
        content: "",
        videoUrl: "",
        audioUrl: "",
        documentUrl: "",
        imageUrl: "",
        quizData: { title: "", description: "", passingScore: 70, questions: [] },
      });
    }
  };

  useEffect(() => {
    if (open) resetForm(section);
  }, [open, section, defaultType]);

  const handleOpenChange = (val: boolean) => {
    if (val) resetForm(section);
    onOpenChange(val);
  };

  const mutation = useMutation({
    mutationFn: async () => {
      const data: Record<string, unknown> = {
        lessonId,
        title: form.title,
        type: form.type,
        isRequired: form.isRequired,
        estimatedMinutes: form.estimatedMinutes ? Number(form.estimatedMinutes) : undefined,
      };

      // Conditional fields based on type
      if (form.type === "text") {
        data.content = form.content || undefined;
      } else if (form.type === "video") {
        data.videoUrl = form.videoUrl || undefined;
        data.content = form.content || undefined;
      } else if (form.type === "audio") {
        data.audioUrl = form.audioUrl || undefined;
        data.content = form.content || undefined;
      } else if (form.type === "document") {
        data.documentUrl = form.documentUrl || undefined;
        data.content = form.content || undefined;
      } else if (form.type === "quiz") {
        data.quizData = form.quizData;
      } else if (form.type === "interactive") {
        data.content = form.content || undefined;
        data.imageUrl = form.imageUrl || undefined;
      }

      if (isEdit) {
        const res = await apiRequest("PATCH", `/api/formation-admin/sections/${section.id}`, data);
        return res.json();
      } else {
        const res = await apiRequest("POST", "/api/formation-admin/sections", data);
        return res.json();
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/formation-admin/lessons/${lessonId}/sections`] });
      queryClient.invalidateQueries({ queryKey: ["/api/formation-admin/stats"] });
      toast({ title: "Sucesso", description: isEdit ? "Seção atualizada." : "Seção criada." });
      onOpenChange(false);
    },
    onError: (error) => {
      toast({
        title: "Erro",
        description: error instanceof Error ? error.message : "Falha na operação",
        variant: "destructive",
      });
    },
  });

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Editar Seção" : "Nova Seção"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Título *</Label>
            <Input
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
            />
          </div>
          <div>
            <Label>Tipo</Label>
            <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v as Section["type"] })}>
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
          <div className="grid grid-cols-2 gap-3">
            <div className="flex items-center gap-2">
              <Checkbox
                id="section-required"
                checked={form.isRequired}
                onCheckedChange={(c) => setForm({ ...form, isRequired: !!c })}
              />
              <Label htmlFor="section-required">Obrigatória</Label>
            </div>
            <div>
              <Label>Duração Est. (min)</Label>
              <Input
                type="number"
                min={0}
                value={form.estimatedMinutes}
                onChange={(e) => setForm({ ...form, estimatedMinutes: e.target.value })}
              />
            </div>
          </div>

          {/* Conditional fields by type */}
          {(form.type === "text" || form.type === "video" || form.type === "audio" || form.type === "document" || form.type === "interactive") && (
            <div>
              <Label>Conteúdo</Label>
              <Textarea
                value={form.content}
                onChange={(e) => setForm({ ...form, content: e.target.value })}
                rows={form.type === "text" ? 8 : 4}
              />
            </div>
          )}

          {form.type === "video" && (
            <div className="rounded-xl border border-border/70 bg-muted/30 p-3 space-y-2">
              <Label className="flex items-center gap-2">
                <Video className="h-4 w-4" />
                URL do Vídeo
              </Label>
              <Input
                placeholder="https://youtube.com/... ou link do arquivo"
                value={form.videoUrl}
                onChange={(e) => setForm({ ...form, videoUrl: e.target.value })}
              />
              <p className="text-xs text-muted-foreground">
                Use uma URL pública ou hospedada em ambiente autorizado. O app exibirá o vídeo dentro da aula para os ministros.
              </p>
            </div>
          )}

          {form.type === "audio" && (
            <div>
              <Label>URL do Áudio</Label>
              <Input
                value={form.audioUrl}
                onChange={(e) => setForm({ ...form, audioUrl: e.target.value })}
              />
            </div>
          )}

          {form.type === "document" && (
            <div>
              <Label>URL do Documento</Label>
              <Input
                value={form.documentUrl}
                onChange={(e) => setForm({ ...form, documentUrl: e.target.value })}
              />
            </div>
          )}

          {form.type === "interactive" && (
            <div>
              <Label>URL da Imagem</Label>
              <Input
                value={form.imageUrl}
                onChange={(e) => setForm({ ...form, imageUrl: e.target.value })}
              />
            </div>
          )}

          {form.type === "quiz" && (
            <QuizEditor
              value={form.quizData}
              onChange={(qd) => setForm({ ...form, quizData: qd })}
            />
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            onClick={() => mutation.mutate()}
            disabled={mutation.isPending || !form.title || (form.type === "video" && !form.videoUrl)}
          >
            {mutation.isPending && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
            {isEdit ? "Salvar" : "Criar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ========================================
// DELETE CONFIRMATION DIALOG
// ========================================

function DeleteConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  onConfirm,
  isPending,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  onConfirm: () => void;
  isPending: boolean;
}) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault();
              onConfirm();
            }}
            disabled={isPending}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {isPending && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
            Excluir
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

// ========================================
// BREADCRUMB
// ========================================

function AdminBreadcrumb({
  items,
  onNavigate,
}: {
  items: { label: string; onClick?: () => void }[];
  onNavigate: (view: AdminView) => void;
}) {
  return (
    <div className="flex items-center gap-1 text-sm text-muted-foreground mb-4 flex-wrap">
      <button
        className="hover:text-foreground transition-colors font-medium"
        onClick={() => onNavigate({ level: "dashboard" })}
      >
        Trilhas
      </button>
      {items.map((item, i) => (
        <span key={i} className="flex items-center gap-1">
          <ChevronRight className="h-3 w-3" />
          {item.onClick ? (
            <button
              className="hover:text-foreground transition-colors"
              onClick={item.onClick}
            >
              {item.label}
            </button>
          ) : (
            <span className="text-foreground font-medium">{item.label}</span>
          )}
        </span>
      ))}
    </div>
  );
}

// ========================================
// SECTIONS VIEW
// ========================================

function SectionsView({
  track,
  module: mod,
  lesson,
  onNavigate,
}: {
  track: Track;
  module: Module;
  lesson: Lesson;
  onNavigate: (view: AdminView) => void;
}) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editSection, setEditSection] = useState<Section | null>(null);
  const [sectionDefaultType, setSectionDefaultType] = useState<Section["type"]>("text");
  const [deleteTarget, setDeleteTarget] = useState<Section | null>(null);

  const { data, isLoading } = useQuery<{ sections: Section[] }>({
    queryKey: [`/api/formation-admin/lessons/${lesson.id}/sections`],
  });

  const sections = data?.sections || [];

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest("DELETE", `/api/formation-admin/sections/${id}`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/formation-admin/lessons/${lesson.id}/sections`] });
      queryClient.invalidateQueries({ queryKey: ["/api/formation-admin/stats"] });
      toast({ title: "Sucesso", description: "Seção excluída." });
      setDeleteTarget(null);
    },
    onError: (error) => {
      toast({
        title: "Erro",
        description: error instanceof Error ? error.message : "Falha ao excluir",
        variant: "destructive",
      });
      setDeleteTarget(null);
    },
  });

  const reorderMutation = useMutation({
    mutationFn: async (sectionIds: string[]) => {
      const res = await apiRequest("POST", `/api/formation-admin/lessons/${lesson.id}/sections/reorder`, { sectionIds });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/formation-admin/lessons/${lesson.id}/sections`] });
    },
  });

  const moveItem = (index: number, direction: "up" | "down") => {
    const newIndex = direction === "up" ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= sections.length) return;
    const reordered = [...sections];
    [reordered[index], reordered[newIndex]] = [reordered[newIndex], reordered[index]];
    reorderMutation.mutate(reordered.map((s) => s.id));
  };

  const openNewSection = (type: Section["type"] = "text") => {
    setSectionDefaultType(type);
    setEditSection(null);
    setDialogOpen(true);
  };

  const openEditSection = (section: Section) => {
    setSectionDefaultType(section.type);
    setEditSection(section);
    setDialogOpen(true);
  };

  return (
    <div>
      <AdminBreadcrumb
        items={[
          { label: track.title, onClick: () => onNavigate({ level: "modules", track }) },
          { label: mod.title, onClick: () => onNavigate({ level: "lessons", track, module: mod }) },
          { label: lesson.title },
        ]}
        onNavigate={onNavigate}
      />

      <div className="flex flex-col gap-3 mb-4 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-lg font-semibold">Seções da Aula: {lesson.title}</h2>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => openNewSection("video")}>
            <Video className="h-4 w-4 mr-1" /> Novo Vídeo
          </Button>
          <Button size="sm" onClick={() => openNewSection("text")}>
            <Plus className="h-4 w-4 mr-1" /> Nova Seção
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : sections.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <FileText className="h-10 w-10 mx-auto mb-3 opacity-50" />
            <p>Nenhuma seção cadastrada nesta aula.</p>
            <div className="mt-3 flex flex-wrap justify-center gap-2">
              <Button variant="outline" size="sm" onClick={() => openNewSection("video")}>
                <Video className="h-4 w-4 mr-1" /> Adicionar vídeo
              </Button>
              <Button size="sm" onClick={() => openNewSection("text")}>
                Criar primeira seção
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">#</TableHead>
                <TableHead>Título</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Obrigatória</TableHead>
                <TableHead>Duração Est.</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sections.map((section, index) => (
                <TableRow key={section.id}>
                  <TableCell className="text-muted-foreground">{index + 1}</TableCell>
                  <TableCell className="font-medium">{section.title}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="gap-1">
                      {sectionTypeIcons[section.type]}
                      {sectionTypeLabels[section.type] || section.type}
                    </Badge>
                  </TableCell>
                  <TableCell>{section.isRequired ? "Sim" : "Não"}</TableCell>
                  <TableCell>
                    {section.estimatedMinutes ? `${section.estimatedMinutes} min` : "—"}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0"
                        onClick={() => openEditSection(section)}
                        title="Editar"
                      >
                        <Edit className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0"
                        disabled={index === 0}
                        onClick={() => moveItem(index, "up")}
                        title="Mover para cima"
                      >
                        <ArrowUp className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0"
                        disabled={index === sections.length - 1}
                        onClick={() => moveItem(index, "down")}
                        title="Mover para baixo"
                      >
                        <ArrowDown className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0 text-destructive"
                        onClick={() => setDeleteTarget(section)}
                        title="Excluir"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}

      <SectionFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        lessonId={lesson.id}
        section={editSection}
        defaultType={sectionDefaultType}
      />

      <DeleteConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Excluir seção"
        description={`Tem certeza que deseja excluir a seção "${deleteTarget?.title}"? Esta ação não pode ser desfeita.`}
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
        isPending={deleteMutation.isPending}
      />
    </div>
  );
}

// ========================================
// LESSONS VIEW
// ========================================

function LessonsView({
  track,
  module: mod,
  onNavigate,
}: {
  track: Track;
  module: Module;
  onNavigate: (view: AdminView) => void;
}) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editLesson, setEditLesson] = useState<Lesson | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Lesson | null>(null);

  const { data, isLoading } = useQuery<{ lessons: Lesson[] }>({
    queryKey: [`/api/formation-admin/modules/${mod.id}/lessons`],
  });

  const lessons = data?.lessons || [];

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest("DELETE", `/api/formation-admin/lessons/${id}`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/formation-admin/modules/${mod.id}/lessons`] });
      queryClient.invalidateQueries({ queryKey: ["/api/formation-admin/stats"] });
      toast({ title: "Sucesso", description: "Aula excluída." });
      setDeleteTarget(null);
    },
    onError: (error) => {
      toast({
        title: "Erro",
        description: error instanceof Error ? error.message : "Falha ao excluir. Verifique se a aula possui seções.",
        variant: "destructive",
      });
      setDeleteTarget(null);
    },
  });

  const toggleActiveMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest("PATCH", `/api/formation-admin/lessons/${id}/toggle-active`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/formation-admin/modules/${mod.id}/lessons`] });
      toast({ title: "Sucesso", description: "Status da aula atualizado." });
    },
  });

  const reorderMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      const res = await apiRequest("POST", `/api/formation-admin/modules/${mod.id}/lessons/reorder`, { ids });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/formation-admin/modules/${mod.id}/lessons`] });
    },
  });

  const moveItem = (index: number, direction: "up" | "down") => {
    const newIndex = direction === "up" ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= lessons.length) return;
    const reordered = [...lessons];
    [reordered[index], reordered[newIndex]] = [reordered[newIndex], reordered[index]];
    reorderMutation.mutate(reordered.map((l) => l.id));
  };

  return (
    <div>
      <AdminBreadcrumb
        items={[
          { label: track.title, onClick: () => onNavigate({ level: "modules", track }) },
          { label: mod.title },
        ]}
        onNavigate={onNavigate}
      />

      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">Aulas do Módulo: {mod.title}</h2>
        <Button size="sm" onClick={() => { setEditLesson(null); setDialogOpen(true); }}>
          <Plus className="h-4 w-4 mr-1" /> Nova Aula
        </Button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : lessons.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <BookOpen className="h-10 w-10 mx-auto mb-3 opacity-50" />
            <p>Nenhuma aula cadastrada neste módulo.</p>
            <Button
              variant="outline"
              size="sm"
              className="mt-3"
              onClick={() => { setEditLesson(null); setDialogOpen(true); }}
            >
              Criar primeira aula
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">#</TableHead>
                <TableHead>Título</TableHead>
                <TableHead>Duração</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {lessons.map((lesson, index) => (
                <TableRow key={lesson.id}>
                  <TableCell className="text-muted-foreground">{index + 1}</TableCell>
                  <TableCell className="font-medium">{lesson.title}</TableCell>
                  <TableCell>
                    {lesson.durationMinutes ? `${lesson.durationMinutes} min` : "—"}
                  </TableCell>
                  <TableCell>
                    <Badge variant={lesson.isActive ? "default" : "secondary"}>
                      {lesson.isActive ? "Ativa" : "Inativa"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0"
                        onClick={() => { setEditLesson(lesson); setDialogOpen(true); }}
                        title="Editar"
                      >
                        <Edit className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2 text-xs"
                        onClick={() => onNavigate({ level: "sections", track, module: mod, lesson })}
                        title="Ver seções"
                      >
                        <FileText className="h-3.5 w-3.5 mr-1" />
                        Seções
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0"
                        onClick={() => toggleActiveMutation.mutate(lesson.id)}
                        title={lesson.isActive ? "Desativar" : "Ativar"}
                      >
                        {lesson.isActive ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0"
                        disabled={index === 0}
                        onClick={() => moveItem(index, "up")}
                        title="Mover para cima"
                      >
                        <ArrowUp className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0"
                        disabled={index === lessons.length - 1}
                        onClick={() => moveItem(index, "down")}
                        title="Mover para baixo"
                      >
                        <ArrowDown className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0 text-destructive"
                        onClick={() => setDeleteTarget(lesson)}
                        title="Excluir"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}

      <LessonFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        moduleId={mod.id}
        trackId={track.id}
        lesson={editLesson}
      />

      <DeleteConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Excluir aula"
        description={`Tem certeza que deseja excluir a aula "${deleteTarget?.title}"? Se houver seções vinculadas, a exclusão será impedida.`}
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
        isPending={deleteMutation.isPending}
      />
    </div>
  );
}

// ========================================
// MODULES VIEW
// ========================================

function ModulesView({
  track,
  onNavigate,
}: {
  track: Track;
  onNavigate: (view: AdminView) => void;
}) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editModule, setEditModule] = useState<Module | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Module | null>(null);

  const { data, isLoading } = useQuery<{ modules: Module[] }>({
    queryKey: [`/api/formation-admin/tracks/${track.id}/modules`],
  });

  const modules = data?.modules || [];

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest("DELETE", `/api/formation-admin/modules/${id}`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/formation-admin/tracks/${track.id}/modules`] });
      queryClient.invalidateQueries({ queryKey: ["/api/formation-admin/stats"] });
      toast({ title: "Sucesso", description: "Módulo excluído." });
      setDeleteTarget(null);
    },
    onError: (error) => {
      toast({
        title: "Erro",
        description: error instanceof Error ? error.message : "Falha ao excluir. Verifique se o módulo possui aulas.",
        variant: "destructive",
      });
      setDeleteTarget(null);
    },
  });

  const reorderMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      const res = await apiRequest("POST", `/api/formation-admin/tracks/${track.id}/modules/reorder`, { ids });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/formation-admin/tracks/${track.id}/modules`] });
    },
  });

  const moveItem = (index: number, direction: "up" | "down") => {
    const newIndex = direction === "up" ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= modules.length) return;
    const reordered = [...modules];
    [reordered[index], reordered[newIndex]] = [reordered[newIndex], reordered[index]];
    reorderMutation.mutate(reordered.map((m) => m.id));
  };

  return (
    <div>
      <AdminBreadcrumb
        items={[{ label: track.title }]}
        onNavigate={onNavigate}
      />

      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">Módulos da Trilha: {track.title}</h2>
        <Button size="sm" onClick={() => { setEditModule(null); setDialogOpen(true); }}>
          <Plus className="h-4 w-4 mr-1" /> Novo Módulo
        </Button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : modules.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <Layers className="h-10 w-10 mx-auto mb-3 opacity-50" />
            <p>Nenhum módulo cadastrado nesta trilha.</p>
            <Button
              variant="outline"
              size="sm"
              className="mt-3"
              onClick={() => { setEditModule(null); setDialogOpen(true); }}
            >
              Criar primeiro módulo
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">#</TableHead>
                <TableHead>Título</TableHead>
                <TableHead>Descrição</TableHead>
                <TableHead>Duração</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {modules.map((mod, index) => (
                <TableRow key={mod.id}>
                  <TableCell className="text-muted-foreground">{index + 1}</TableCell>
                  <TableCell className="font-medium">{mod.title}</TableCell>
                  <TableCell className="text-muted-foreground text-sm max-w-[200px] truncate">
                    {mod.description || "—"}
                  </TableCell>
                  <TableCell>
                    {mod.durationMinutes ? `${mod.durationMinutes} min` : "—"}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0"
                        onClick={() => { setEditModule(mod); setDialogOpen(true); }}
                        title="Editar"
                      >
                        <Edit className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2 text-xs"
                        onClick={() => onNavigate({ level: "lessons", track, module: mod })}
                        title="Ver aulas"
                      >
                        <BookOpen className="h-3.5 w-3.5 mr-1" />
                        Aulas
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0"
                        disabled={index === 0}
                        onClick={() => moveItem(index, "up")}
                        title="Mover para cima"
                      >
                        <ArrowUp className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0"
                        disabled={index === modules.length - 1}
                        onClick={() => moveItem(index, "down")}
                        title="Mover para baixo"
                      >
                        <ArrowDown className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0 text-destructive"
                        onClick={() => setDeleteTarget(mod)}
                        title="Excluir"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}

      <ModuleFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        trackId={track.id}
        module={editModule}
      />

      <DeleteConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Excluir módulo"
        description={`Tem certeza que deseja excluir o módulo "${deleteTarget?.title}"? Se houver aulas vinculadas, a exclusão será impedida.`}
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
        isPending={deleteMutation.isPending}
      />
    </div>
  );
}

// ========================================
// FORMATION DASHBOARD
// ========================================

function FormationDashboard({
  onNavigate,
}: {
  onNavigate: (view: AdminView) => void;
}) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editTrack, setEditTrack] = useState<Track | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Track | null>(null);
  const [seedConfirmOpen, setSeedConfirmOpen] = useState(false);

  const { data: statsData } = useQuery<Stats>({
    queryKey: ["/api/formation-admin/stats"],
  });

  const { data: tracksData, isLoading: tracksLoading } = useQuery<{ tracks: Track[] }>({
    queryKey: ["/api/formation-admin/tracks"],
  });

  const tracks = tracksData?.tracks || [];

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest("DELETE", `/api/formation-admin/tracks/${id}`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/formation-admin/tracks"] });
      queryClient.invalidateQueries({ queryKey: ["/api/formation-admin/stats"] });
      toast({ title: "Sucesso", description: "Trilha excluída." });
      setDeleteTarget(null);
    },
    onError: (error) => {
      toast({
        title: "Erro",
        description: error instanceof Error ? error.message : "Falha ao excluir. Verifique se a trilha possui módulos.",
        variant: "destructive",
      });
      setDeleteTarget(null);
    },
  });

  const toggleActiveMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest("PATCH", `/api/formation-admin/tracks/${id}/toggle-active`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/formation-admin/tracks"] });
      queryClient.invalidateQueries({ queryKey: ["/api/formation-admin/stats"] });
      toast({ title: "Sucesso", description: "Status da trilha atualizado." });
    },
  });

  const reorderMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      const res = await apiRequest("POST", "/api/formation-admin/tracks/reorder", { ids });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/formation-admin/tracks"] });
    },
  });

  const seedMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/formation-admin/seed");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/formation-admin/tracks"] });
      queryClient.invalidateQueries({ queryKey: ["/api/formation-admin/stats"] });
      toast({ title: "Sucesso", description: "Banco de dados populado com dados iniciais." });
      setSeedConfirmOpen(false);
    },
    onError: (error) => {
      toast({
        title: "Erro",
        description: error instanceof Error ? error.message : "Falha ao popular banco de dados",
        variant: "destructive",
      });
      setSeedConfirmOpen(false);
    },
  });

  const moveItem = (index: number, direction: "up" | "down") => {
    const newIndex = direction === "up" ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= tracks.length) return;
    const reordered = [...tracks];
    [reordered[index], reordered[newIndex]] = [reordered[newIndex], reordered[index]];
    reorderMutation.mutate(reordered.map((t) => t.id));
  };

  const statCards = [
    { label: "Trilhas", value: statsData?.tracks.total ?? "—", sub: `${statsData?.tracks.active ?? 0} ativas`, icon: Layers },
    { label: "Módulos", value: statsData?.modules.total ?? "—", icon: BookOpen },
    { label: "Aulas", value: statsData?.lessons.total ?? "—", sub: `${statsData?.lessons.active ?? 0} ativas`, icon: FileText },
    { label: "Seções", value: statsData?.sections.total ?? "—", icon: BarChart3 },
    { label: "Vídeos", value: statsData?.sections.videos ?? "—", sub: "em aulas", icon: Video },
  ];

  return (
    <div>
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
        {statCards.map((stat) => (
          <Card key={stat.label}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">{stat.label}</p>
                  <p className="text-2xl font-bold">{stat.value}</p>
                  {stat.sub && <p className="text-xs text-muted-foreground">{stat.sub}</p>}
                </div>
                <stat.icon className="h-8 w-8 text-muted-foreground/30" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Actions bar */}
      <div className="flex flex-col gap-3 mb-4 md:flex-row md:items-center md:justify-between">
        <div className="min-w-0">
          <h2 className="text-lg font-semibold">Trilhas de Formação</h2>
          <p className="text-sm text-muted-foreground">
            Coordenadores podem publicar aulas, conteúdos, quizzes e vídeos para os ministros.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link href="/formation/library">
              <BookOpen className="h-4 w-4 mr-1" /> Biblioteca
            </Link>
          </Button>
          <Button variant="outline" size="sm" onClick={() => setSeedConfirmOpen(true)}>
            <Database className="h-4 w-4 mr-1" /> Seed Database
          </Button>
          <Button size="sm" onClick={() => { setEditTrack(null); setDialogOpen(true); }}>
            <Plus className="h-4 w-4 mr-1" /> Nova Trilha
          </Button>
        </div>
      </div>

      {/* Tracks table */}
      {tracksLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : tracks.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <Layers className="h-10 w-10 mx-auto mb-3 opacity-50" />
            <p>Nenhuma trilha cadastrada.</p>
            <p className="text-xs mt-1">Crie uma trilha ou use o Seed Database para popular com dados iniciais.</p>
            <div className="flex items-center justify-center gap-2 mt-3">
              <Button variant="outline" size="sm" onClick={() => setSeedConfirmOpen(true)}>
                <Database className="h-4 w-4 mr-1" /> Seed Database
              </Button>
              <Button size="sm" onClick={() => { setEditTrack(null); setDialogOpen(true); }}>
                <Plus className="h-4 w-4 mr-1" /> Nova Trilha
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">#</TableHead>
                <TableHead>Título</TableHead>
                <TableHead>Categoria</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tracks.map((track, index) => (
                <TableRow key={track.id}>
                  <TableCell className="text-muted-foreground">{index + 1}</TableCell>
                  <TableCell className="font-medium">{track.title}</TableCell>
                  <TableCell>
                    <Badge variant="outline">
                      {categoryLabels[track.category] || track.category}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={track.isActive ? "default" : "secondary"}>
                      {track.isActive ? "Ativa" : "Inativa"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0"
                        onClick={() => { setEditTrack(track); setDialogOpen(true); }}
                        title="Editar"
                      >
                        <Edit className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2 text-xs"
                        onClick={() => onNavigate({ level: "modules", track })}
                        title="Ver módulos"
                      >
                        <Layers className="h-3.5 w-3.5 mr-1" />
                        Módulos
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0"
                        onClick={() => toggleActiveMutation.mutate(track.id)}
                        title={track.isActive ? "Desativar" : "Ativar"}
                      >
                        {track.isActive ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0"
                        disabled={index === 0}
                        onClick={() => moveItem(index, "up")}
                        title="Mover para cima"
                      >
                        <ArrowUp className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0"
                        disabled={index === tracks.length - 1}
                        onClick={() => moveItem(index, "down")}
                        title="Mover para baixo"
                      >
                        <ArrowDown className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0 text-destructive"
                        onClick={() => setDeleteTarget(track)}
                        title="Excluir"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}

      <TrackFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        track={editTrack}
      />

      <DeleteConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Excluir trilha"
        description={`Tem certeza que deseja excluir a trilha "${deleteTarget?.title}"? Se houver módulos vinculados, a exclusão será impedida.`}
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
        isPending={deleteMutation.isPending}
      />

      <AlertDialog open={seedConfirmOpen} onOpenChange={setSeedConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Seed Database</AlertDialogTitle>
            <AlertDialogDescription>
              Isso irá popular o banco de dados com conteúdo inicial de formação.
              Dados existentes podem ser duplicados. Deseja continuar?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={seedMutation.isPending}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                seedMutation.mutate();
              }}
              disabled={seedMutation.isPending}
            >
              {seedMutation.isPending && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
              Confirmar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ========================================
// MAIN COMPONENT
// ========================================

export default function FormationAdmin({ onExit }: FormationAdminProps) {
  const [view, setView] = useState<AdminView>({ level: "dashboard" });

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-6xl mx-auto p-4 md:p-6">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          {onExit && (
            <Button variant="ghost" size="sm" onClick={onExit}>
              <ArrowLeft className="h-4 w-4 mr-1" /> Voltar
            </Button>
          )}
          <div>
            <h1 className="text-xl font-bold">Administração da Formação</h1>
            <p className="text-sm text-muted-foreground">
              Gerencie trilhas, módulos, aulas, conteúdos e vídeos do programa de formação
            </p>
          </div>
        </div>

        {/* Content */}
        {view.level === "dashboard" && (
          <FormationDashboard onNavigate={setView} />
        )}

        {view.level === "modules" && (
          <ModulesView track={view.track} onNavigate={setView} />
        )}

        {view.level === "lessons" && (
          <LessonsView track={view.track} module={view.module} onNavigate={setView} />
        )}

        {view.level === "sections" && (
          <SectionsView
            track={view.track}
            module={view.module}
            lesson={view.lesson}
            onNavigate={setView}
          />
        )}
      </div>
    </div>
  );
}
