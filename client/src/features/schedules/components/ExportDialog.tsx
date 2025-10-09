import { FileSpreadsheet, Download, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { ExportFormat } from '../types';

interface ExportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentMonth: Date;
  exportFormat: ExportFormat;
  setExportFormat: (format: ExportFormat) => void;
  isExporting: boolean;
  onExport: () => void;
  isCoordinator: boolean;
}

export function ExportDialog({
  open,
  onOpenChange,
  currentMonth,
  exportFormat,
  setExportFormat,
  isExporting,
  onExport,
  isCoordinator
}: ExportDialogProps) {
  const monthName = format(currentMonth, 'MMMM/yyyy', { locale: ptBR });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Exportar Escala</DialogTitle>
          <DialogDescription>Escolha o formato de exportação para a escala de {monthName}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {isCoordinator ? (
            <div className="space-y-3">
              <Label>Selecione o formato:</Label>
              <div className="grid gap-2">
                <FormatButton
                  format="excel"
                  icon={FileSpreadsheet}
                  label="Excel (.xlsx)"
                  isSelected={exportFormat === 'excel'}
                  onClick={() => setExportFormat('excel')}
                />
                <FormatButton
                  format="html"
                  icon={FileSpreadsheet}
                  label="HTML (Página Web)"
                  isSelected={exportFormat === 'html'}
                  onClick={() => setExportFormat('html')}
                />
                <FormatButton
                  format="pdf"
                  icon={Download}
                  label="PDF (Impressão)"
                  isSelected={exportFormat === 'pdf'}
                  onClick={() => setExportFormat('pdf')}
                />
              </div>
            </div>
          ) : (
            <div className="text-sm text-muted-foreground">
              Como ministro, você pode exportar apenas em formato PDF
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={onExport} disabled={isExporting}>
            {isExporting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Exportando...
              </>
            ) : (
              <>
                <Download className="h-4 w-4 mr-2" />
                Exportar
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

interface FormatButtonProps {
  format: string;
  icon: React.ComponentType<any>;
  label: string;
  isSelected: boolean;
  onClick: () => void;
}

function FormatButton({ icon: Icon, label, isSelected, onClick }: FormatButtonProps) {
  return (
    <Button
      variant={isSelected ? 'default' : 'outline'}
      className={cn(
        'justify-start transition-all duration-200',
        isSelected && 'ring-2 ring-amber-400 shadow-lg scale-[1.02] bg-amber-50 text-amber-900 hover:bg-amber-100'
      )}
      onClick={onClick}
    >
      <Icon className="h-4 w-4 mr-2" />
      {label}
    </Button>
  );
}
