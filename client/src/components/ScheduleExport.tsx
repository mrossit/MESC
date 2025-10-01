import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Download, FileText, Table, Image } from "lucide-react";
import { LITURGICAL_POSITIONS } from "@shared/constants";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface ScheduleAssignment {
  id: string;
  position: number;
  ministerName?: string;
  massTime: string;
  confirmed: boolean;
}

interface ScheduleExportProps {
  date: Date;
  assignments: ScheduleAssignment[];
}

export function ScheduleExport({ date, assignments }: ScheduleExportProps) {
  const exportToCSV = () => {
    // Agrupar por horário
    const grouped = assignments.reduce((acc, a) => {
      if (!acc[a.massTime]) acc[a.massTime] = [];
      acc[a.massTime].push(a);
      return acc;
    }, {} as Record<string, ScheduleAssignment[]>);

    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += `Escala - ${format(date, "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}\n\n`;

    Object.entries(grouped)
      .sort(([a], [b]) => a.localeCompare(b))
      .forEach(([massTime, massAssignments]) => {
        csvContent += `\nMissa das ${massTime}\n`;
        csvContent += "Posição,Função,Ministro,Status\n";

        massAssignments
          .sort((a, b) => a.position - b.position)
          .forEach((assignment) => {
            csvContent += `${assignment.position},"${LITURGICAL_POSITIONS[assignment.position]}","${assignment.ministerName || 'VACANT'}",${assignment.confirmed ? 'Confirmado' : 'Pendente'}\n`;
          });
      });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `escala_${format(date, "yyyy-MM-dd")}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportToText = () => {
    // Agrupar por horário
    const grouped = assignments.reduce((acc, a) => {
      if (!acc[a.massTime]) acc[a.massTime] = [];
      acc[a.massTime].push(a);
      return acc;
    }, {} as Record<string, ScheduleAssignment[]>);

    let textContent = `═══════════════════════════════════════════════════════\n`;
    textContent += `        ESCALA DE MINISTROS - MESC\n`;
    textContent += `   ${format(date, "EEEE, dd 'de' MMMM 'de' yyyy", { locale: ptBR }).toUpperCase()}\n`;
    textContent += `═══════════════════════════════════════════════════════\n\n`;

    Object.entries(grouped)
      .sort(([a], [b]) => a.localeCompare(b))
      .forEach(([massTime, massAssignments]) => {
        textContent += `\n🕒 MISSA DAS ${massTime}\n`;
        textContent += `───────────────────────────────────────────────────────\n`;

        massAssignments
          .sort((a, b) => a.position - b.position)
          .forEach((assignment) => {
            const position = String(assignment.position).padStart(2, '0');
            const status = assignment.confirmed ? '✓' : '○';
            const ministerName = assignment.ministerName || 'VACANT';
            const functionName = LITURGICAL_POSITIONS[assignment.position];

            textContent += `${position}. ${status} ${functionName}\n`;
            textContent += `    ${ministerName}\n`;
          });
      });

    textContent += `\n═══════════════════════════════════════════════════════\n`;
    textContent += `Legenda: ✓ Confirmado | ○ Pendente | VACANT À confirmar\n`;
    textContent += `═══════════════════════════════════════════════════════\n`;

    const blob = new Blob([textContent], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `escala_${format(date, "yyyy-MM-dd")}.txt`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const exportToHTML = () => {
    // Agrupar por horário
    const grouped = assignments.reduce((acc, a) => {
      if (!acc[a.massTime]) acc[a.massTime] = [];
      acc[a.massTime].push(a);
      return acc;
    }, {} as Record<string, ScheduleAssignment[]>);

    let htmlContent = `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Escala - ${format(date, "dd/MM/yyyy")}</title>
  <style>
    body {
      font-family: Arial, sans-serif;
      max-width: 800px;
      margin: 0 auto;
      padding: 20px;
      background: #f5f5f5;
    }
    .header {
      background: linear-gradient(135deg, #5C4033 0%, #7d5a46 100%);
      color: white;
      padding: 30px;
      text-align: center;
      border-radius: 10px;
      margin-bottom: 30px;
    }
    .header h1 {
      margin: 0;
      font-size: 24px;
    }
    .header p {
      margin: 10px 0 0 0;
      font-size: 16px;
      opacity: 0.9;
    }
    .mass-section {
      background: white;
      padding: 20px;
      margin-bottom: 20px;
      border-radius: 8px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    .mass-title {
      font-size: 20px;
      font-weight: bold;
      color: #5C4033;
      margin-bottom: 15px;
      padding-bottom: 10px;
      border-bottom: 2px solid #5C4033;
    }
    .minister-item {
      display: flex;
      align-items: center;
      padding: 12px;
      margin-bottom: 8px;
      background: #f9f9f9;
      border-radius: 6px;
      border-left: 3px solid #5C4033;
    }
    .position-badge {
      background: #5C4033;
      color: white;
      padding: 4px 10px;
      border-radius: 4px;
      font-weight: bold;
      font-size: 14px;
      min-width: 30px;
      text-align: center;
      margin-right: 12px;
    }
    .function-name {
      font-weight: bold;
      color: #5C4033;
      flex: 1;
    }
    .minister-name {
      color: #333;
      margin-left: 10px;
    }
    .status {
      margin-left: 10px;
      padding: 4px 12px;
      border-radius: 12px;
      font-size: 12px;
      font-weight: bold;
    }
    .status.confirmed {
      background: #d4edda;
      color: #155724;
    }
    .status.pending {
      background: #fff3cd;
      color: #856404;
    }
    .footer {
      text-align: center;
      margin-top: 30px;
      padding: 20px;
      color: #666;
      font-size: 14px;
    }
    @media print {
      body {
        background: white;
      }
      .mass-section {
        box-shadow: none;
        page-break-inside: avoid;
      }
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>ESCALA DE MINISTROS - MESC</h1>
    <p>${format(date, "EEEE, dd 'de' MMMM 'de' yyyy", { locale: ptBR })}</p>
  </div>
`;

    Object.entries(grouped)
      .sort(([a], [b]) => a.localeCompare(b))
      .forEach(([massTime, massAssignments]) => {
        htmlContent += `
  <div class="mass-section">
    <div class="mass-title">🕒 Missa das ${massTime}</div>
`;

        massAssignments
          .sort((a, b) => a.position - b.position)
          .forEach((assignment) => {
            const statusClass = assignment.confirmed ? 'confirmed' : 'pending';
            const statusText = assignment.confirmed ? 'Confirmado' : 'Pendente';
            const ministerName = assignment.ministerName || 'VACANT';

            htmlContent += `
    <div class="minister-item">
      <span class="position-badge">${assignment.position}</span>
      <span class="function-name">${LITURGICAL_POSITIONS[assignment.position]}</span>
      <span class="minister-name">${ministerName}</span>
      <span class="status ${statusClass}">${statusText}</span>
    </div>
`;
          });

        htmlContent += `
  </div>
`;
      });

    htmlContent += `
  <div class="footer">
    Gerado em ${format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })} | MESC - Ministros Extraordinários da Sagrada Comunhão
  </div>
</body>
</html>
`;

    const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `escala_${format(date, "yyyy-MM-dd")}.html`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  if (assignments.length === 0) {
    return null;
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Download className="h-4 w-4" />
          <span className="hidden sm:inline">Exportar Escala</span>
          <span className="sm:hidden">Exportar</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={exportToCSV}>
          <Table className="mr-2 h-4 w-4" />
          <span>Exportar como CSV</span>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={exportToText}>
          <FileText className="mr-2 h-4 w-4" />
          <span>Exportar como Texto</span>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={exportToHTML}>
          <Image className="mr-2 h-4 w-4" />
          <span>Exportar como HTML (Imprimir)</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
