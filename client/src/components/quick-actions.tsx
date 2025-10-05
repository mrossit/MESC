import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Send, Download } from "lucide-react";

export function QuickActions() {
  const actions = [
    {
      title: "Nova Escala",
      description: "Criar escala mensal",
      icon: Plus,
      iconBg: "bg-[#CACDA5]/30",
      iconColor: "text-[#99A285]",
      onClick: () => console.log("Nova escala"),
    },
    {
      title: "Enviar Questionário",
      description: "Disponibilidade mensal",
      icon: Send,
      iconBg: "bg-[#A0B179]/30",
      iconColor: "text-[#A0B179]",
      onClick: () => console.log("Enviar questionário"),
    },
    {
      title: "Exportar Relatório",
      description: "Excel/PDF",
      icon: Download,
      iconBg: "bg-[#99A285]/30",
      iconColor: "text-[#99A285]",
      onClick: () => console.log("Exportar relatório"),
    },
  ];

  return (
    <Card className="border-2 hover:border-[#A0B179] transition-all duration-200">
      <CardHeader className="bg-gradient-to-r from-[#CACDA5]/10 to-[#99A285]/10">
        <CardTitle className="text-lg font-semibold text-foreground">
          Ações Rápidas
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {actions.map((action, index) => (
            <Button
              key={index}
              variant="outline"
              className="h-auto p-4 flex items-center gap-3 border-2 hover:border-[#A0B179] hover:bg-[#CACDA5]/10 transition-all group"
              onClick={action.onClick}
              data-testid={`button-${action.title.toLowerCase().replace(/\s+/g, '-')}`}
            >
              <div className={`w-12 h-12 ${action.iconBg} rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform shadow-sm`}>
                <action.icon className={`${action.iconColor} h-6 w-6`} />
              </div>
              <div className="text-left flex-1">
                <p className="font-semibold text-foreground">{action.title}</p>
                <p className="text-sm text-muted-foreground">{action.description}</p>
              </div>
            </Button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
