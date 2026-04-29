import { useRef, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { AlertTriangle, Upload, FileSpreadsheet, CheckCircle2 } from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

interface DiffEntry {
  date: string;
  time: string;
  before: { titulares: string[]; backups: string[] };
  after: { titulares: string[]; backups: string[] };
  changed: boolean;
}

interface ImportSlot {
  date: string;
  time: string;
  ministers: Array<{ id: string; name: string; position: number }>;
  backupMinisters: Array<{ id: string; name: string; position: number }>;
}

interface PreviewResponse {
  success: boolean;
  data?: {
    generationId: string;
    totalRows: number;
    totalSlots: number;
    changedSlotsCount: number;
    errors: string[];
    diffs: DiffEntry[];
    importedSlots: ImportSlot[];
  };
  message?: string;
}

interface ImportXlsxDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  generationId: string;
  onApplied: () => void;
}

export function ImportXlsxDialog({
  open,
  onOpenChange,
  generationId,
  onApplied
}: ImportXlsxDialogProps) {
  const { toast } = useToast();
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<PreviewResponse['data'] | null>(null);
  const [previewing, setPreviewing] = useState(false);
  const [applying, setApplying] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function reset() {
    setFile(null);
    setPreview(null);
    setPreviewing(false);
    setApplying(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  async function handleFile(f: File) {
    setFile(f);
    setPreview(null);
    setPreviewing(true);
    try {
      const fd = new FormData();
      fd.append('file', f);
      const headers: Record<string, string> = {};
      const token = localStorage.getItem('token');
      if (token) headers['Authorization'] = `Bearer ${token}`;
      const apiBaseURL = (import.meta.env.VITE_API_URL as string | undefined) || '';
      const url = `${apiBaseURL}/api/schedules/generation/${generationId}/import-xlsx`;
      const res = await fetch(url, {
        method: 'POST',
        headers, // sem Content-Type — fetch seta multipart/form-data automaticamente
        body: fd,
        credentials: 'include'
      });
      const json: PreviewResponse = await res.json();
      if (!res.ok || !json.success || !json.data) {
        throw new Error(json.message || 'Falha ao processar planilha');
      }
      setPreview(json.data);
    } catch (e) {
      toast({
        title: 'Erro ao processar planilha',
        description: e instanceof Error ? e.message : 'Erro desconhecido',
        variant: 'destructive'
      });
      reset();
    } finally {
      setPreviewing(false);
    }
  }

  async function handleApply() {
    if (!preview) return;
    setApplying(true);
    try {
      const res = await apiRequest(
        'POST',
        `/api/schedules/generation/${generationId}/import-xlsx/apply`,
        { importedSlots: preview.importedSlots }
      );
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.message || 'Falha ao aplicar import');
      }
      toast({
        title: 'Escala importada',
        description: json.message || `Escala atualizada com sucesso.`
      });
      onApplied();
      onOpenChange(false);
      reset();
    } catch (e) {
      toast({
        title: 'Erro ao aplicar import',
        description: e instanceof Error ? e.message : 'Erro desconhecido',
        variant: 'destructive'
      });
    } finally {
      setApplying(false);
    }
  }

  const changedDiffs = (preview?.diffs || []).filter(d => d.changed);

  return (
    <Dialog
      open={open}
      onOpenChange={o => {
        onOpenChange(o);
        if (!o) reset();
      }}
    >
      <DialogContent className="max-w-3xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Importar escala (.xlsx)</DialogTitle>
          <DialogDescription>
            Selecione um arquivo .xlsx exportado da escala. As mudanças serão exibidas em
            preview antes de aplicar.
          </DialogDescription>
        </DialogHeader>

        {!preview && (
          <div className="border-2 border-dashed rounded-lg p-8 text-center">
            <FileSpreadsheet className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
            <p className="text-sm text-muted-foreground mb-4">
              Selecione o arquivo .xlsx para importar
            </p>
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
              className="hidden"
              onChange={e => {
                const f = e.target.files?.[0];
                if (f) handleFile(f);
              }}
            />
            <Button
              onClick={() => fileInputRef.current?.click()}
              disabled={previewing}
            >
              <Upload className="h-4 w-4 mr-2" />
              {previewing ? 'Analisando…' : 'Selecionar arquivo'}
            </Button>
            {file && previewing && (
              <p className="text-xs text-muted-foreground mt-3">
                Processando <strong>{file.name}</strong>…
              </p>
            )}
          </div>
        )}

        {preview && (
          <div className="flex-1 overflow-hidden flex flex-col gap-3">
            <div className="flex flex-wrap gap-2 items-center">
              <Badge variant="outline">{preview.totalRows} linhas lidas</Badge>
              <Badge variant="outline">{preview.totalSlots} missas na planilha</Badge>
              <Badge variant={preview.changedSlotsCount > 0 ? 'default' : 'secondary'}>
                {preview.changedSlotsCount} missas serão alteradas
              </Badge>
              {preview.errors.length > 0 && (
                <Badge variant="destructive">{preview.errors.length} erros</Badge>
              )}
            </div>

            {preview.errors.length > 0 && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Linhas ignoradas</AlertTitle>
                <AlertDescription>
                  <ul className="list-disc pl-4 space-y-1 text-xs">
                    {preview.errors.slice(0, 10).map((e, i) => (
                      <li key={i}>{e}</li>
                    ))}
                    {preview.errors.length > 10 && (
                      <li className="italic">…e mais {preview.errors.length - 10}</li>
                    )}
                  </ul>
                </AlertDescription>
              </Alert>
            )}

            <ScrollArea className="flex-1 border rounded-lg p-3">
              {changedDiffs.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <CheckCircle2 className="h-8 w-8 mx-auto mb-2 text-green-500" />
                  Nenhuma alteração detectada — a planilha bate com a escala atual.
                </div>
              ) : (
                <div className="space-y-3">
                  {changedDiffs.map(d => (
                    <DiffRow key={`${d.date}_${d.time}`} diff={d} />
                  ))}
                </div>
              )}
            </ScrollArea>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => { onOpenChange(false); reset(); }}>
            Cancelar
          </Button>
          {preview && (
            <Button
              onClick={handleApply}
              disabled={applying || changedDiffs.length === 0}
            >
              {applying
                ? 'Aplicando…'
                : changedDiffs.length === 0
                  ? 'Nada a aplicar'
                  : `Aplicar ${changedDiffs.length} alteração(ões)`}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function DiffRow({ diff }: { diff: DiffEntry }) {
  const beforeT = new Set(diff.before.titulares);
  const afterT = new Set(diff.after.titulares);
  const addedT = diff.after.titulares.filter(n => !beforeT.has(n));
  const removedT = diff.before.titulares.filter(n => !afterT.has(n));

  const beforeB = new Set(diff.before.backups);
  const afterB = new Set(diff.after.backups);
  const addedB = diff.after.backups.filter(n => !beforeB.has(n));
  const removedB = diff.before.backups.filter(n => !afterB.has(n));

  return (
    <div className="border rounded p-2 text-sm">
      <div className="font-semibold mb-1">
        {diff.date} {diff.time}
      </div>
      {(addedT.length > 0 || removedT.length > 0) && (
        <div className="text-xs">
          <strong>Titulares:</strong>{' '}
          {addedT.map(n => (
            <span key={n} className="text-green-600 mr-1">+{n}</span>
          ))}
          {removedT.map(n => (
            <span key={n} className="text-red-600 mr-1 line-through">−{n}</span>
          ))}
        </div>
      )}
      {(addedB.length > 0 || removedB.length > 0) && (
        <div className="text-xs">
          <strong>Backup:</strong>{' '}
          {addedB.map(n => (
            <span key={n} className="text-green-600 mr-1">+{n}</span>
          ))}
          {removedB.map(n => (
            <span key={n} className="text-red-600 mr-1 line-through">−{n}</span>
          ))}
        </div>
      )}
    </div>
  );
}
