import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { apiRequest } from "@/lib/queryClient";
import { Layout } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { 
  Send, 
  BarChart3, 
  CheckCircle, 
  Clock, 
  UserCheck,
  Eye
} from "lucide-react";

export default function Availability() {
  const { toast } = useToast();
  const { isAuthenticated, user } = useAuth();
  const queryClient = useQueryClient();
  
  const [questionnairePeriod, setQuestionnairePeriod] = useState("2025-02");
  const [deadline, setDeadline] = useState("2025-01-30");
  const [message, setMessage] = useState("Prezados ministros, por favor indiquem sua disponibilidade para o mês de fevereiro. Contamos com a participação de todos!");
  const [sendWhatsApp, setSendWhatsApp] = useState(true);
  const [sendEmail, setSendEmail] = useState(true);

  const { data: questionnaires = [], isLoading: questionnairesLoading } = useQuery({
    queryKey: ["/api/questionnaires"],
    enabled: isAuthenticated,
    retry: false,
  });

  const createQuestionnaireMutation = useMutation({
    mutationFn: async (data: any) => {
      await apiRequest("POST", "/api/questionnaires", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/questionnaires"] });
      toast({
        title: "Sucesso",
        description: "Questionário enviado com sucesso",
      });
      // Reset form
      setMessage("Prezados ministros, por favor indiquem sua disponibilidade para o mês de fevereiro. Contamos com a participação de todos!");
      setDeadline("2025-01-30");
    },
    onError: (error) => {
      if (isUnauthorizedError(error as Error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Erro",
        description: "Erro ao enviar questionário",
        variant: "destructive",
      });
    },
  });

  const handleSubmitQuestionnaire = (e: React.FormEvent) => {
    e.preventDefault();
    
    const [year, month] = questionnairePeriod.split('-').map(Number);
    
    const questionnaireData = {
      title: `Disponibilidade - ${new Date(year, month - 1).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}`,
      description: message,
      month: month,
      year: year,
      deadline: new Date(deadline).toISOString(),
      questions: [
        {
          id: 1,
          type: "multiple_choice",
          question: "Em quais domingos você estará disponível?",
          options: ["Todos os domingos", "Primeiro domingo", "Segundo domingo", "Terceiro domingo", "Quarto domingo", "Nenhum domingo"]
        },
        {
          id: 2,
          type: "checkboxes",
          question: "Quais horários de missa você prefere?",
          options: ["08:00", "10:00", "19:00"]
        },
        {
          id: 3,
          type: "yes_no",
          question: "Você pode servir como substituto em caso de necessidade?"
        },
        {
          id: 4,
          type: "text",
          question: "Observações adicionais (opcional)"
        }
      ],
      targetUserIds: [] // Empty means all users
    };

    createQuestionnaireMutation.mutate(questionnaireData);
  };

  // Mock recent responses data
  const recentResponses = [
    {
      id: 1,
      userName: "Ana Silva Santos",
      userEmail: "ana.silva@email.com",
      profileImage: "https://images.unsplash.com/photo-1494790108755-2616b612b8c2?w=40&h=40&fit=crop&crop=face",
      respondedAt: "Há 2 horas",
      status: "available"
    },
    {
      id: 2,
      userName: "João Santos Lima", 
      userEmail: "joao.santos@email.com",
      profileImage: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=40&h=40&fit=crop&crop=face",
      respondedAt: "Há 5 horas",
      status: "partial"
    },
    {
      id: 3,
      userName: "Maria Oliveira Costa",
      userEmail: "maria.oliveira@email.com", 
      profileImage: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=40&h=40&fit=crop&crop=face",
      respondedAt: "Ontem",
      status: "unavailable"
    }
  ];

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'available':
        return (
          <Badge className="bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300">
            Disponível
          </Badge>
        );
      case 'partial':
        return (
          <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-300">
            Parcialmente
          </Badge>
        );
      case 'unavailable':
        return (
          <Badge className="bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300">
            Indisponível
          </Badge>
        );
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-heading font-bold text-foreground">Disponibilidade</h1>
            <p className="text-muted-foreground mt-1">Gerenciar questionários e disponibilidade dos ministros</p>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="outline" data-testid="button-report">
              <BarChart3 className="w-4 h-4 mr-2" />
              Relatório
            </Button>
            <Button 
              onClick={() => document.getElementById('questionnaire-form')?.scrollIntoView({ behavior: 'smooth' })}
              data-testid="button-send-questionnaire"
            >
              <Send className="w-4 h-4 mr-2" />
              Enviar Questionário
            </Button>
          </div>
        </div>

        {/* Availability Overview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="hover:shadow-lg transition-shadow duration-300">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Responderam</p>
                  <p className="text-3xl font-bold text-foreground mt-2" data-testid="text-responded">189</p>
                </div>
                <div className="w-12 h-12 bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center">
                  <CheckCircle className="w-6 h-6 text-green-600" />
                </div>
              </div>
              <div className="mt-4">
                <div className="w-full bg-secondary rounded-full h-2">
                  <div className="bg-green-600 h-2 rounded-full" style={{ width: "76%" }}></div>
                </div>
                <p className="text-sm text-muted-foreground mt-2">76% dos ministros</p>
              </div>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow duration-300">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Pendentes</p>
                  <p className="text-3xl font-bold text-foreground mt-2" data-testid="text-pending">58</p>
                </div>
                <div className="w-12 h-12 bg-yellow-100 dark:bg-yellow-900/20 rounded-full flex items-center justify-center">
                  <Clock className="w-6 h-6 text-yellow-600" />
                </div>
              </div>
              <div className="mt-4">
                <div className="w-full bg-secondary rounded-full h-2">
                  <div className="bg-yellow-600 h-2 rounded-full" style={{ width: "24%" }}></div>
                </div>
                <p className="text-sm text-muted-foreground mt-2">24% restantes</p>
              </div>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow duration-300">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Disponíveis</p>
                  <p className="text-3xl font-bold text-foreground mt-2" data-testid="text-available">143</p>
                </div>
                <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
                  <UserCheck className="w-6 h-6 text-primary" />
                </div>
              </div>
              <div className="mt-4">
                <div className="w-full bg-secondary rounded-full h-2">
                  <div className="bg-primary h-2 rounded-full" style={{ width: "58%" }}></div>
                </div>
                <p className="text-sm text-muted-foreground mt-2">58% disponíveis</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Questionnaire Form */}
        <Card id="questionnaire-form">
          <CardHeader>
            <CardTitle className="text-lg font-semibold">Questionário de Disponibilidade</CardTitle>
          </CardHeader>
          <CardContent>
            <form className="space-y-6" onSubmit={handleSubmitQuestionnaire}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="period">Período</Label>
                  <Select value={questionnairePeriod} onValueChange={setQuestionnairePeriod}>
                    <SelectTrigger data-testid="select-period">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="2025-02">Fevereiro 2025</SelectItem>
                      <SelectItem value="2025-03">Março 2025</SelectItem>
                      <SelectItem value="2025-04">Abril 2025</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="deadline">Data Limite</Label>
                  <Input
                    id="deadline"
                    type="date"
                    value={deadline}
                    onChange={(e) => setDeadline(e.target.value)}
                    data-testid="input-deadline"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="message">Mensagem Personalizada</Label>
                <Textarea
                  id="message"
                  rows={4}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Adicione uma mensagem personalizada para os ministros..."
                  data-testid="textarea-message"
                />
              </div>

              <div className="flex items-center gap-4">
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="whatsapp" 
                    checked={sendWhatsApp}
                    onCheckedChange={setSendWhatsApp}
                    data-testid="checkbox-whatsapp"
                  />
                  <Label htmlFor="whatsapp" className="text-sm">Enviar via WhatsApp</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="email"
                    checked={sendEmail}
                    onCheckedChange={setSendEmail}
                    data-testid="checkbox-email"
                  />
                  <Label htmlFor="email" className="text-sm">Enviar via Email</Label>
                </div>
              </div>

              <div className="flex justify-end gap-3">
                <Button type="button" variant="outline" data-testid="button-save-draft">
                  Salvar Rascunho
                </Button>
                <Button 
                  type="submit" 
                  disabled={createQuestionnaireMutation.isPending}
                  data-testid="button-send"
                >
                  {createQuestionnaireMutation.isPending ? "Enviando..." : "Enviar Questionário"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Recent Responses */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
            <CardTitle className="text-lg font-semibold">Respostas Recentes</CardTitle>
            <Button variant="ghost" size="sm" data-testid="button-view-all-responses">
              Ver todas
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            {recentResponses.map((response) => (
              <div key={response.id} className="flex items-center justify-between p-4 bg-muted/50 rounded-lg hover:bg-muted/70 transition-colors">
                <div className="flex items-center gap-3">
                  <Avatar className="w-10 h-10">
                    <AvatarImage src={response.profileImage} alt={response.userName} />
                    <AvatarFallback className="bg-primary text-primary-foreground text-sm">
                      {getInitials(response.userName)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium text-foreground" data-testid={`text-response-name-${response.id}`}>
                      {response.userName}
                    </p>
                    <p className="text-sm text-muted-foreground" data-testid={`text-response-time-${response.id}`}>
                      Respondeu {response.respondedAt}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {getStatusBadge(response.status)}
                  <Button variant="ghost" size="sm" data-testid={`button-view-response-${response.id}`}>
                    <Eye className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
