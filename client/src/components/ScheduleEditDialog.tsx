import { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { GripVertical, X, Plus, Save, ChevronUp, ChevronDown, Edit3 } from 'lucide-react';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { useQuery } from '@tanstack/react-query';
import { formatMinisterName } from '@/lib/utils';

interface Minister {
  id: string | null; // null = VACANTE
  name: string;
}

interface ScheduleEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  date: string;
  time: string;
  initialMinisters: Minister[];
  onSave: () => void;
}

export function ScheduleEditDialog({
  open,
  onOpenChange,
  date,
  time,
  initialMinisters,
  onSave
}: ScheduleEditDialogProps) {
  const [ministers, setMinisters] = useState<Minister[]>(initialMinisters);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [selectedMinisterId, setSelectedMinisterId] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [saving, setSaving] = useState(false);
  const [insertPosition, setInsertPosition] = useState<string>('end');
  const [editingPositionIndex, setEditingPositionIndex] = useState<number | null>(null);
  const [newPositionValue, setNewPositionValue] = useState<string>('');
  const { toast } = useToast();

  // Ref para o container de ministros para scroll automático
  const ministersListRef = useRef<HTMLDivElement>(null);

  // Buscar lista de todos os ministros disponíveis
  const { data: allMinisters, isLoading: loadingMinisters, error: ministersError } = useQuery({
    queryKey: ['/api/ministers'],
    enabled: open
  });

  // Debug: log quando os dados de ministros mudarem e mostrar erro se necessário
  useEffect(() => {
    if (open) {

      if (ministersError) {
        console.error('[ScheduleEditDialog] Error loading ministers:', ministersError);
        toast({
          title: "Erro ao carregar ministros",
          description: ministersError.message || "Não foi possível carregar a lista de ministros.",
          variant: "destructive"
        });
      }
    }
  }, [allMinisters, loadingMinisters, ministersError, open, toast]);

  useEffect(() => {
    setMinisters(initialMinisters);
  }, [initialMinisters, open]);

  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;

    const newMinisters = [...ministers];
    const draggedItem = newMinisters[draggedIndex];
    newMinisters.splice(draggedIndex, 1);
    newMinisters.splice(index, 0, draggedItem);
    setMinisters(newMinisters);
    setDraggedIndex(index);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
  };

  const handleRemoveMinister = (index: number) => {
    setMinisters(ministers.filter((_, i) => i !== index));
  };

  const handleMoveUp = (index: number) => {
    if (index === 0) return;
    const newMinisters = [...ministers];
    [newMinisters[index - 1], newMinisters[index]] = [newMinisters[index], newMinisters[index - 1]];
    setMinisters(newMinisters);
  };

  const handleMoveDown = (index: number) => {
    if (index === ministers.length - 1) return;
    const newMinisters = [...ministers];
    [newMinisters[index], newMinisters[index + 1]] = [newMinisters[index + 1], newMinisters[index]];
    setMinisters(newMinisters);
  };

  // Função para fazer scroll até o final da lista
  const scrollToBottom = () => {
    setTimeout(() => {
      if (ministersListRef.current) {
        ministersListRef.current.scrollTop = ministersListRef.current.scrollHeight;
      }
    }, 100);
  };

  // Função para adicionar ministro em posição específica
  const handleAddMinisterAtPosition = (minister: { id: string; name: string }, position: string) => {
    // Verificar se já está na lista
    if (ministers.some(m => m.id === minister.id)) {
      toast({
        title: "Ministro já escalado",
        description: `${minister.name} já está nesta escala.`,
        variant: "destructive"
      });
      return;
    }

    const newMinisters = [...ministers];
    const ministerToAdd = { id: minister.id, name: minister.name };

    if (position === 'end') {
      newMinisters.push(ministerToAdd);
      scrollToBottom();
    } else if (position === 'start') {
      newMinisters.unshift(ministerToAdd);
    } else {
      // Posição específica (1-based index)
      const posIndex = parseInt(position) - 1;
      newMinisters.splice(posIndex, 0, ministerToAdd);
    }

    setMinisters(newMinisters);
    setSearchQuery('');
    setSelectedMinisterId('');
    setInsertPosition('end'); // Reset para posição padrão
  };

  // Função para alterar posição de um ministro existente
  const handleChangePosition = (currentIndex: number, newPosition: number) => {
    // Validar nova posição
    if (newPosition < 1 || newPosition > ministers.length) {
      toast({
        title: "Posição inválida",
        description: `A posição deve ser entre 1 e ${ministers.length}.`,
        variant: "destructive"
      });
      return;
    }

    const newMinisters = [...ministers];
    const minister = newMinisters[currentIndex];

    // Remover da posição atual
    newMinisters.splice(currentIndex, 1);

    // Inserir na nova posição (converter de 1-based para 0-based)
    newMinisters.splice(newPosition - 1, 0, minister);

    setMinisters(newMinisters);
    setEditingPositionIndex(null);
    setNewPositionValue('');

    toast({
      title: "Posição alterada",
      description: `${formatMinisterName(minister.name)} movido para posição ${newPosition}.`,
    });
  };

  // Filtrar ministros baseado na busca
  const filteredMinisters = Array.isArray(allMinisters)
    ? allMinisters.filter((m: any) =>
        m.name.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : [];

  const handleSave = async () => {
    try {
      setSaving(true);

      const ministerIds = ministers.map(m => m.id);

      // Atualizar escala usando o endpoint batch-update
      await apiRequest('PATCH', '/api/schedules/batch-update', {
        date,
        time,
        ministers: ministerIds
      });

      toast({
        title: "Escala atualizada!",
        description: "As alterações foram salvas com sucesso."
      });

      // Invalidar todos os caches de schedules (hierárquicos e não-hierárquicos)
      queryClient.invalidateQueries({ queryKey: ['/api/schedules'], exact: false });
      onSave();
      onOpenChange(false);
    } catch (error: any) {
      console.error('[ScheduleEditDialog] Erro ao salvar:', error);
      toast({
        title: "Erro ao salvar",
        description: error.message || "Ocorreu um erro ao salvar as alterações.",
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Editar Escala</DialogTitle>
            <DialogDescription>
              {date} às {time} - Use drag & drop, botões ↑↓ ou ícone de lápis para reordenar
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 flex-1 overflow-y-auto">
            {/* Lista de ministros com drag and drop */}
            <div className="space-y-2">
              <h4 className="text-sm font-medium">Ministros Escalados ({ministers.length})</h4>
              <div ref={ministersListRef} className="space-y-2 max-h-96 overflow-y-auto scroll-smooth">
                {ministers.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    Nenhum ministro escalado. Adicione ministros abaixo.
                  </p>
                ) : (
                  ministers.map((minister, index) => (
                    <div
                      key={`${minister.id}-${index}`}
                      draggable
                      onDragStart={() => handleDragStart(index)}
                      onDragOver={(e) => handleDragOver(e, index)}
                      onDragEnd={handleDragEnd}
                      className={`
                        flex items-center justify-between p-3 rounded-md border bg-card
                        cursor-move hover:bg-accent transition-colors
                        ${draggedIndex === index ? 'opacity-50' : ''}
                      `}
                      data-testid={`minister-${index}`}
                    >
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <GripVertical className="h-4 w-4 text-muted-foreground hidden sm:block flex-shrink-0" />
                        <Badge variant="outline" className="w-8 justify-center flex-shrink-0">
                          {index + 1}
                        </Badge>
                        {minister.id === null ? (
                          <span className="font-medium text-muted-foreground italic">VACANTE</span>
                        ) : (
                          <span className="font-medium truncate">{formatMinisterName(minister.name)}</span>
                        )}
                      </div>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        {/* Botão para editar posição diretamente */}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setEditingPositionIndex(index);
                            setNewPositionValue(String(index + 1));
                          }}
                          className="h-8 w-8 p-0"
                          title="Alterar posição"
                        >
                          <Edit3 className="h-4 w-4" />
                        </Button>
                        {/* Botões de reordenação para mobile */}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleMoveUp(index)}
                          disabled={index === 0}
                          data-testid={`button-move-up-${index}`}
                          className="h-8 w-8 p-0"
                        >
                          <ChevronUp className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleMoveDown(index)}
                          disabled={index === ministers.length - 1}
                          data-testid={`button-move-down-${index}`}
                          className="h-8 w-8 p-0"
                        >
                          <ChevronDown className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveMinister(index)}
                          data-testid={`button-remove-${index}`}
                          className="h-8 w-8 p-0"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Adicionar ministro */}
            <div className="space-y-2">
              <h4 className="text-sm font-medium">Adicionar Ministro</h4>
              <div className="space-y-2">
                <Input
                  placeholder="Digite para buscar ministro..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  data-testid="input-search-minister"
                  disabled={loadingMinisters}
                />

                {/* Seleção de posição de inserção */}
                <div className="flex gap-2 items-center">
                  <Label className="text-sm whitespace-nowrap">Inserir na posição:</Label>
                  <Select value={insertPosition} onValueChange={setInsertPosition}>
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="start">Início (posição 1)</SelectItem>
                      <SelectItem value="end">Final (posição {ministers.length + 1})</SelectItem>
                      {ministers.length > 0 && ministers.map((_, idx) => (
                        <SelectItem key={idx} value={String(idx + 1)}>
                          Posição {idx + 1} (antes de {formatMinisterName(ministers[idx].name)})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="relative rounded-md border backdrop-blur-xl bg-background/80 shadow-lg h-48 overflow-y-auto">
                  <div className="p-2">
                    {loadingMinisters ? (
                      <p className="text-sm text-muted-foreground text-center py-4">
                        Carregando ministros...
                      </p>
                    ) : ministersError ? (
                      <p className="text-sm text-destructive text-center py-4">
                        Erro ao carregar ministros: {ministersError.message}
                      </p>
                    ) : filteredMinisters.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-4">
                        {searchQuery ? 'Nenhum ministro encontrado.' : 'Digite para buscar um ministro.'}
                      </p>
                    ) : (
                      filteredMinisters.map((minister: any) => (
                        <button
                          key={minister.id}
                          onClick={() => handleAddMinisterAtPosition(minister, insertPosition)}
                          className={`
                            w-full text-left px-3 py-2 rounded-md hover:bg-accent transition-colors
                            ${selectedMinisterId === minister.id ? 'bg-accent' : ''}
                          `}
                          data-testid={`option-minister-${minister.id}`}
                        >
                          {formatMinisterName(minister.name)}
                        </button>
                      ))
                    )}
                  </div>
                </div>

                <Button
                  onClick={() => {
                    const newMinisters = [...ministers];
                    const vacanteMinister = { id: null, name: 'VACANTE' };

                    if (insertPosition === 'end') {
                      newMinisters.push(vacanteMinister);
                      scrollToBottom();
                    } else if (insertPosition === 'start') {
                      newMinisters.unshift(vacanteMinister);
                    } else {
                      const posIndex = parseInt(insertPosition) - 1;
                      newMinisters.splice(posIndex, 0, vacanteMinister);
                    }

                    setMinisters(newMinisters);
                    setInsertPosition('end');
                  }}
                  variant="outline"
                  data-testid="button-add-vacant"
                  className="w-full"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Adicionar Vaga VACANTE
                </Button>
              </div>
            </div>
          </div>

          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={saving} data-testid="button-save-schedule">
              {saving ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2"></div>
                  Salvando...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Salvar Alterações
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog para alterar posição */}
      <Dialog open={editingPositionIndex !== null} onOpenChange={(open) => {
        if (!open) {
          setEditingPositionIndex(null);
          setNewPositionValue('');
        }
      }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Alterar Posição</DialogTitle>
            <DialogDescription>
              {editingPositionIndex !== null && ministers[editingPositionIndex] && (
                <>
                  Altere a posição de <strong>{formatMinisterName(ministers[editingPositionIndex].name)}</strong>
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="position">Nova Posição (1 a {ministers.length})</Label>
              <Input
                id="position"
                type="number"
                min={1}
                max={ministers.length}
                value={newPositionValue}
                onChange={(e) => setNewPositionValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && editingPositionIndex !== null) {
                    const pos = parseInt(newPositionValue);
                    if (!isNaN(pos)) {
                      handleChangePosition(editingPositionIndex, pos);
                    }
                  }
                }}
                autoFocus
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setEditingPositionIndex(null);
                setNewPositionValue('');
              }}
            >
              Cancelar
            </Button>
            <Button
              onClick={() => {
                if (editingPositionIndex !== null) {
                  const pos = parseInt(newPositionValue);
                  if (!isNaN(pos)) {
                    handleChangePosition(editingPositionIndex, pos);
                  }
                }
              }}
            >
              Confirmar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
