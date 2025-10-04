import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Send, Download } from "lucide-react";

export function QuickActions() {
  const actions = [
    {
      title: "Nova Escala",
      description: "Criar escala mensal",
      icon: Plus,
      iconBg: "bg-red-100",
      iconColor: "text-red-600",
      onClick: () => console.log("Nova escala"),
    },
    {
      title: "Enviar Questionário",
      description: "Disponibilidade mensal",
      icon: Send,
      iconBg: "bg-amber-100",
      iconColor: "text-amber-600",
      onClick: () => console.log("Enviar questionário"),
    },
    {
      title: "Exportar Relatório",
      description: "Excel/PDF",
      icon: Download,
      iconBg: "bg-blue-100",
      iconColor: "text-blue-500",
      onClick: () => console.log("Exportar relatório"),
    },
  ];

  return (
    <Card className="  border border-neutral-border/30">
      <CardHeader>
        <CardTitle className="text-lg font-semibold text-foreground">
          Ações Rápidas
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {actions.map((action, index) => (
            <Button
              key={index}
              variant="outline"
              className="h-auto p-4 flex items-center gap-3 border-neutral-border hover:bg-mesc-cream/50 transition-colors group"
              onClick={action.onClick}
              data-testid={`button-${action.title.toLowerCase().replace(/\s+/g, '-')}`}
            >
              <div className={`w-10 h-10 ${action.iconBg} rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform`}>
                <action.icon className={`${action.iconColor} h-5 w-5`} />
              </div>
              <div className="text-left">
                <p className="font-medium text-foreground">{action.title}</p>
                <p className="text-sm text-muted-foreground">{action.description}</p>
              </div>
            </Button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
