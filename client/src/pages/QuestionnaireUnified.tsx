import React, { useState, useEffect } from 'react';
import { Layout } from '../components/layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '../components/ui/radio-group';
import { Checkbox } from '../components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Alert, AlertDescription } from '../components/ui/alert';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Badge } from '../components/ui/badge';
import { Switch } from '../components/ui/switch';
import {
  Calendar, CheckCircle, AlertCircle, Send, Plus, Edit2, Trash2,
  Save, ChevronUp, ChevronDown, ChevronLeft, RotateCcw, Users, FileText, Settings, X, Play, Lock, Unlock, RefreshCw, Loader2
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useQuery } from '@tanstack/react-query';
import { queryClient } from '../lib/queryClient';

type Question = {
  id: string;
  type: 'multiple_choice' | 'checkbox' | 'text' | 'time_selection' | 'yes_no_with_options';
  question: string;
  options?: string[];
  required: boolean;
  category: 'regular' | 'daily' | 'special_event' | 'custom';
  editable?: boolean;
  modified?: boolean;
  order?: number; // Ordem personalizada definida pelo coordenador
  metadata?: {
    eventDate?: string;
    eventName?: string;
    availableTimes?: string[];
    conditionalTrigger?: boolean;
    dependsOn?: string;
    enabledWhen?: string | string[];
    showIf?: string; // Condição para mostrar a pergunta
    conditionalOptions?: string[]; // Opções que aparecem quando responde "Sim"
    filterMode?: 'exclude' | 'include'; // Modo de filtro para opções condicionais
    sundayDates?: string[]; // Datas dos domingos do mês
  };
};

type QuestionnaireTemplate = {
  id?: string;
  month: number;
  year: number;
  questions: Question[];
  status?: 'draft' | 'sent' | 'closed';
  sentAt?: string;
  closedAt?: string;
};

type Response = {
  questionId: string;
  answer: string | string[] | boolean;
  metadata?: any;
};

export default function QuestionnaireUnified() {
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [template, setTemplate] = useState<QuestionnaireTemplate | null>(null);
  const [responses, setResponses] = useState<Record<string, any>>({});
  const [existingResponse, setExistingResponse] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [closing, setClosing] = useState(false);
  const [reopening, setReopening] = useState(false);
  const [opening, setOpening] = useState(false);
  const [showSendDialog, setShowSendDialog] = useState(false);
  const [showResendDialog, setShowResendDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [mode, setMode] = useState<'view' | 'admin' | 'respond'>('view');
  
  // Estados para adicionar nova pergunta
  const [showAddQuestion, setShowAddQuestion] = useState(false);
  const [newQuestion, setNewQuestion] = useState<Partial<Question>>({
    type: 'multiple_choice',
    question: '',
    options: ['', ''],
    required: false,
    category: 'custom',
    metadata: {}
  });
  
  const [conditionalOptions, setConditionalOptions] = useState<string[]>(['']);
  const [conditionalTrigger, setConditionalTrigger] = useState<string>('');
  
  // Estado para editar pergunta
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);
  
  // Estados para compartilhamento familiar
  const [familyMembers, setFamilyMembers] = useState<Array<{
    id: string;
    name: string;
    email: string;
    relationshipType: string;
    hasResponded: boolean;
    responseData?: any;
  }>>([]);
  const [selectedFamilyMembers, setSelectedFamilyMembers] = useState<string[]>([]);
  const [loadingFamilyMembers, setLoadingFamilyMembers] = useState(false);
  const [familySharingScenario, setFamilySharingScenario] = useState<'none' | 'some_responded' | 'need_choice'>('none');
  const [preferServeTogether, setPreferServeTogether] = useState(true);
  
  // Buscar informações do usuário
  const { data: authData } = useQuery({
    queryKey: ['/api/auth/me'],
    queryFn: async () => {
      const res = await fetch('/api/auth/me', { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to fetch user');
      return res.json();
    }
  });
  
  const user = authData?.user;
  const isAdmin = user?.role === 'gestor' || user?.role === 'coordenador';
  
  const monthNames = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];

  useEffect(() => {
    loadQuestionnaire();
  }, [selectedMonth, selectedYear]);

  // Check auto-close status on page load
  useEffect(() => {
    const checkAutoClose = async () => {
      if (!isAdmin) return; // Only coordinators need to check

      try {
        const response = await fetch('/api/questionnaires/admin/current-status', {
          credentials: 'include'
        });

        if (response.ok) {
          const data = await response.json();

          // If auto-close was triggered, reload the questionnaire to get updated status
          if (data.autoCloseTriggered && template?.id === data.questionnaire?.id) {
            loadQuestionnaire(true);
          }
        }
      } catch (error) {
        console.error('Error checking auto-close status:', error);
      }
    };

    checkAutoClose();
  }, [template?.id, isAdmin]);

  useEffect(() => {
    // Determinar modo baseado no status do template e papel do usuário
    if (template) {
      
      if (isAdmin && template.status === 'draft') {
        setMode('admin');
      } else if (template.status === 'sent') {
        setMode('respond');
      } else {
        setMode('view');
      }
    }
  }, [template, isAdmin]);

  // Carregar familiares quando estiver no modo de responder
  useEffect(() => {
    if (mode === 'respond' && template?.id && user?.id) {
      loadFamilyMembers();
    }
  }, [mode, template?.id, user?.id]);



  const loadFamilyMembers = async () => {
    if (!template?.id) return;
    
    setLoadingFamilyMembers(true);
    try {
      const res = await fetch(`/api/questionnaires/family-sharing/${template.id}`, {
        credentials: 'include'
      });
      
      if (res.ok) {
        const members = await res.json();
        setFamilyMembers(members);
        
        // Analisar cenário para determinar validação
        const respondedMembers = members.filter((m: any) => m.hasResponded);
        
        if (members.length === 0) {
          // Não há familiares cadastrados
          setFamilySharingScenario('none');
        } else if (respondedMembers.length === 0) {
          // Cenário 1: Nenhum familiar respondeu ainda
          setFamilySharingScenario('need_choice');
        } else if (respondedMembers.length > 0 && respondedMembers.length < members.length) {
          // Cenário 2: Alguns familiares já responderam
          setFamilySharingScenario('some_responded');
        } else {
          // Todos os familiares já responderam
          setFamilySharingScenario('none');
        }
      }
    } catch (error) {
      console.error('Erro ao carregar familiares:', error);
    } finally {
      setLoadingFamilyMembers(false);
    }
  };

  const loadQuestionnaire = async (preserveSuccessMessage = false) => {
    setLoading(true);
    if (!preserveSuccessMessage) {
      setError(null);
    }
    
    // Reset existing response para evitar estado "sujo" ao mudar mês/ano
    setExistingResponse(null);
    
    
    try {
      // Tentar carregar template existente
      const endpoint = isAdmin 
        ? `/api/questionnaires/admin/templates/${selectedYear}/${selectedMonth}`
        : `/api/questionnaires/templates/${selectedYear}/${selectedMonth}`;
      
        
      const templateRes = await fetch(endpoint, {
        credentials: 'include',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      });
      
      const contentType = templateRes.headers.get('content-type');
      
      let templateData = null;
      if (templateRes.ok) {
        // Verificar se a resposta é JSON antes de tentar fazer parse
        if (contentType && !contentType.includes('application/json')) {
          const text = await templateRes.text();
          console.error('ERRO: Servidor retornou HTML em vez de JSON!');
          console.error('Primeiros 500 caracteres da resposta:', text.substring(0, 500));
          throw new Error('Servidor retornou HTML em vez de JSON');
        }
        
        try {
          templateData = await templateRes.json();
        } catch (parseError) {
          console.error('Erro ao fazer parse do JSON:', parseError);
          try {
            const clonedResponse = templateRes.clone();
            const text = await clonedResponse.text();
          } catch (e) {
          }
          throw new Error('Invalid JSON response');
        }
        
        // Aplicar ordenação às perguntas ao carregar
        // Se houver ordem personalizada, usar ela; senão, aplicar padrão
        const sortedQuestions = [...templateData.questions].sort((a, b) => {
          // Se ambas têm ordem personalizada, usar essa ordem
          if (a.order !== undefined && b.order !== undefined) {
            return a.order - b.order;
          }
          
          // Se apenas uma tem ordem personalizada, ela vem primeiro
          if (a.order !== undefined) return -1;
          if (b.order !== undefined) return 1;
          
          // Ordenação padrão: múltipla escolha antes de texto
          const isAText = a.type === 'text';
          const isBText = b.type === 'text';
          
          if (isAText && !isBText) return 1; // Texto vai para o final
          if (!isAText && isBText) return -1; // Não-texto vem primeiro
          
          return 0; // Manter ordem relativa
        });
        
        templateData.questions = sortedQuestions;
        setTemplate(templateData);
        
        // Inicializar respostas vazias
        const initialResponses: Record<string, any> = {};
        templateData.questions.forEach((q: Question) => {
          if (q.type === 'checkbox') {
            initialResponses[q.id] = [];
          } else if (q.type === 'yes_no_with_options') {
            initialResponses[q.id] = { answer: '', selectedOptions: [] };
          } else {
            initialResponses[q.id] = '';
          }
        });
        setResponses(initialResponses);
      } else if (templateRes.status === 404) {
        // Template não existe
        if (isAdmin) {
          // Se é admin, pode gerar novo
          // Não chamar generateTemplate() aqui pois causa loop/erro
          setTemplate(null);
        } else {
          // Se não é admin, não há questionário disponível
          setTemplate(null);
        }
      } else if (templateRes.status === 403) {
        // Questionário existe mas não está disponível
        try {
          const errorData = await templateRes.json();
          setTemplate(null);
          if (!preserveSuccessMessage) {
            setError(errorData.error || 'Questionário ainda não está disponível');
          }
        } catch (parseErr) {
          console.error('Erro ao parsear resposta 403:', parseErr);
          setTemplate(null);
          if (!preserveSuccessMessage) {
            setError('Questionário ainda não está disponível');
          }
        }
      } else {
        // Outro erro
        setTemplate(null);
      }

      // Verificar se já existe resposta
      const responseRes = await fetch(`/api/questionnaires/responses/${selectedYear}/${selectedMonth}`, {
        credentials: 'include'
      });


      if (responseRes.ok) {
        const responseData = await responseRes.json();

        // Verificar se temos dados válidos - o backend pode retornar null
        if (responseData && responseData.id) {

          // IMPORTANTE: Sempre setar existingResponse se temos um ID válido
          // Isso garante que o botão e badge sejam atualizados corretamente
          setExistingResponse(responseData);

          // Preencher respostas existentes se existirem
          if (responseData.responses && Array.isArray(responseData.responses) && responseData.responses.length > 0) {
            const existingResponses: Record<string, any> = {};
            responseData.responses.forEach((r: Response) => {
              existingResponses[r.questionId] = r.answer;
            });
            setResponses(existingResponses);
          }
        } else {
          setExistingResponse(null);
        }
      } else {
        setExistingResponse(null);
      }
    } catch (err) {
      console.error('Erro em loadQuestionnaire:', err);
      // Só mostrar erro se:
      // 1. Não estamos preservando mensagem de sucesso
      // 2. É um erro real (não apenas template não existe)
      if (!preserveSuccessMessage) {
        // Verificar se é um erro de rede/servidor real
        if (err instanceof TypeError && err.message.includes('Failed to fetch')) {
          setError('Erro de conexão com o servidor. Verifique sua internet.');
        } else if (err instanceof SyntaxError) {
          setError('Erro ao processar resposta do servidor.');
        } else if (err instanceof Error && err.message.includes('HTML em vez de JSON')) {
          setError('Erro de configuração do servidor. Por favor, verifique se o servidor está rodando corretamente.');
        } else if (err instanceof Error && err.message.includes('500')) {
          setError('Erro interno do servidor. Tente novamente mais tarde.');
        } else if (err instanceof Error) {
          // Mostrar a mensagem de erro específica
          setError(err.message);
        }
        // Não mostrar erro genérico para outros casos (404, 403, etc - já tratados acima)
      }
    } finally {
      setLoading(false);
    }
  };

  const generateTemplate = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const res = await fetch('/api/questionnaires/admin/templates/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ month: selectedMonth, year: selectedYear })
      });
      
      if (res.ok) {
        const data = await res.json();
        
        // Invalidar cache antes de setar o novo template
        queryClient.invalidateQueries({ 
          queryKey: ['/api/questionnaires/admin/templates', selectedYear, selectedMonth] 
        });
        
        setTemplate({ ...data, status: 'draft' });
        setSuccess('Template gerado com sucesso!');
      } else {
        setError('Erro ao gerar template');
      }
    } catch (err) {
      setError('Erro ao gerar template');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const saveTemplate = async () => {
    if (!template) return;
    
    setSaving(true);
    setError(null);
    setSuccess(null);
    
    try {
      const res = await fetch('/api/questionnaires/admin/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(template)
      });
      
      if (res.ok) {
        const data = await res.json();
        setTemplate(data);
        setSuccess('Template salvo com sucesso!');
        
        // Auto-habilitar modo resposta após salvar
        if (isAdmin) {
          setTimeout(() => {
            setMode('respond');
          }, 500);
        }
      } else {
        setError('Erro ao salvar template');
      }
    } catch (err) {
      setError('Erro ao salvar template');
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const sendQuestionnaire = async (resend = false) => {
    if (!template) return;
    
    
    setLoading(true);
    setError(null);
    setSuccess(null);
    
    try {
      const requestBody = { resend };
      
      const res = await fetch(`/api/questionnaires/admin/templates/${selectedYear}/${selectedMonth}/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(requestBody)
      });
      
      let data = null;
      try {
        data = await res.json();
      } catch (e) {
        // Se não conseguir fazer parse do JSON, continuar sem erro
      }
      
      if (res.ok) {
        // Sucesso
        setSuccess(data?.message || 'Questionário enviado com sucesso para todos os ministros!');
        setShowSendDialog(false);
        setShowResendDialog(false);
        
        // Recarregar dados após pequeno delay
        setTimeout(async () => {
          try {
            await loadQuestionnaire(true);
          } catch (e) {
          }
        }, 100);
        
        // Limpar mensagem após 5 segundos
        setTimeout(() => setSuccess(null), 5000);
      } else {
        // Erro da API
        const errorMessage = data?.error || 'Erro ao enviar questionário';
        
        if (errorMessage === 'Questionário já foi enviado aos ministros') {
          setError('Este questionário já foi enviado aos ministros anteriormente.');
        } else {
          setError(errorMessage);
        }
        
        setShowSendDialog(false);
        setTimeout(() => setError(null), 8000);
      }
    } catch (err) {
      // Erro de rede ou outro
      console.error('Erro ao enviar:', err);
      setError('Erro ao conectar com o servidor. Tente novamente.');
      setShowSendDialog(false);
      setTimeout(() => setError(null), 8000);
    } finally {
      setLoading(false);
    }
  };

  const deleteTemplate = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const res = await fetch(`/api/questionnaires/admin/templates/${selectedYear}/${selectedMonth}`, {
        method: 'DELETE',
        credentials: 'include'
      });
      
      if (res.ok) {
        const data = await res.json();
        setSuccess(data.message || 'Template deletado com sucesso!');
        setTemplate(null);
        setShowDeleteDialog(false); // Fechar o diálogo após sucesso
        // Invalidar cache para recarregar dados
        queryClient.invalidateQueries({ 
          queryKey: ['/api/questionnaires/admin/templates', selectedYear, selectedMonth] 
        });
      } else {
        const data = await res.json();
        setError(data.error || 'Erro ao deletar template');
      }
    } catch (err) {
      setError('Erro ao deletar template');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleResponseChange = (questionId: string, value: any) => {
    setResponses(prev => {
      const newResponses = {
        ...prev,
        [questionId]: value
      };
      
      // Limpar respostas de perguntas dependentes quando a dependência muda
      if (template) {
        template.questions.forEach(question => {
          if (question.metadata?.dependsOn === questionId) {
            // Extrair valor real da resposta (pode ser string ou objeto yes_no_with_options)
            const raw = newResponses[question.metadata.dependsOn];
            const depVal = typeof raw === 'object' && raw?.answer !== undefined ? raw.answer : raw;
            
            // Verificar se a pergunta dependente deve ser desabilitada
            let shouldDisable = false;
            
            const expected = question.metadata.enabledWhen ?? question.metadata.showIf;
            if (expected !== undefined) {
              if (Array.isArray(expected)) {
                shouldDisable = !expected.includes(depVal);
              } else {
                shouldDisable = depVal !== expected;
              }
            }
            
            // Se deve desabilitar, limpar a resposta
            if (shouldDisable) {
              if (question.type === 'checkbox') {
                newResponses[question.id] = [];
              } else if (question.type === 'yes_no_with_options') {
                newResponses[question.id] = { answer: '', selectedOptions: [] };
              } else {
                newResponses[question.id] = '';
              }
            }
          }
        });
      }
      
      return newResponses;
    });
  };

  const handleCheckboxChange = (questionId: string, option: string, checked: boolean) => {
    setResponses(prev => {
      const current = prev[questionId] || [];
      if (checked) {
        return { ...prev, [questionId]: [...current, option] };
      } else {
        return { ...prev, [questionId]: current.filter((o: string) => o !== option) };
      }
    });
  };

  const handleSubmitResponse = async () => {
    if (!template) return;
    
    if (template.status === 'closed') {
      setError('Este questionário foi encerrado e não aceita mais respostas');
      return;
    }
    
    // Validar campos obrigatórios
    const missingRequired = template.questions
      .filter(q => q.required)
      .filter(q => {
        const response = responses[q.id];
        if (q.type === 'checkbox') {
          return !response || response.length === 0;
        } else if (q.type === 'yes_no_with_options') {
          return !response?.answer;
        }
        return !response;
      });

    if (missingRequired.length > 0) {
      setError('Por favor, responda todas as perguntas obrigatórias');
      return;
    }

    setSubmitting(true);
    setError(null);
    setSuccess(null);

    try {
      // Filter out empty responses and format data
      const formattedResponses = Object.entries(responses)
        .filter(([_, answer]) => {
          // Remove empty responses to reduce payload size
          if (answer?.answer !== undefined) {
            // For yes_no_with_options type
            return answer.answer !== '';
          }
          if (Array.isArray(answer)) return answer.length > 0;
          if (typeof answer === 'string') return answer.trim() !== '';
          return answer !== null && answer !== undefined;
        })
        .map(([questionId, answer]) => {
          // Compact the answer format
          if (answer?.answer !== undefined) {
            // For yes_no_with_options, only include selectedOptions if they exist
            return {
              questionId,
              answer: answer.selectedOptions?.length > 0 
                ? { answer: answer.answer, selectedOptions: answer.selectedOptions }
                : answer.answer
            };
          }
          return {
            questionId,
            answer: Array.isArray(answer) ? answer : 
                    typeof answer === 'string' ? answer.trim() : answer
          };
        });

      const payload = {
        questionnaireTemplateId: template.id,
        month: selectedMonth,
        year: selectedYear,
        responses: formattedResponses,
        sharedWithFamilyIds: selectedFamilyMembers,
        familyServePreference: preferServeTogether ? 'together' : 'separately'
      };

      // Check payload size
      const payloadSize = new Blob([JSON.stringify(payload)]).size / 1024;

      if (payloadSize > 100) {
        console.warn(`Large questionnaire payload: ${payloadSize.toFixed(2)}KB`);
      }
      if (payloadSize > 500) {
        setError(`O questionário é muito grande (${payloadSize.toFixed(0)}KB). Por favor, reduza o tamanho das respostas de texto.`);
        setSubmitting(false);
        return;
      }

      const res = await fetch('/api/questionnaires/responses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        const responseData = await res.json();
        setSuccess('Questionário enviado com sucesso!');
        setIsSubmitted(true);

        // Atualizar existingResponse imediatamente com os dados retornados
        // O backend retorna o objeto completo da resposta
        setExistingResponse(responseData);

        // Reset isSubmitted after 5 seconds para permitir reenvio
        setTimeout(() => {
          setIsSubmitted(false);
        }, 5000);

        // Força re-render imediato para atualizar o botão
        setTimeout(() => {
          // Apenas garante que o estado foi processado
          if (!responseData || !responseData.id) {
            // Se por algum motivo não temos os dados, recarregar
            loadQuestionnaire(true);
          }
        }, 100);
      } else {
        const responseText = await res.text();
        console.error('Response not OK:', res.status, responseText);
        
        // Tratamento específico por código de status
        if (res.status === 401) {
          setError('Sessão expirada. Por favor, faça login novamente.');
        } else if (res.status === 403) {
          setError('Você não tem permissão para enviar este questionário.');
        } else if (res.status === 400) {
          try {
            const data = JSON.parse(responseText);
            setError(data.error || 'Dados inválidos no questionário');
          } catch {
            setError('Dados inválidos no questionário');
          }
        } else if (res.status === 500 || res.status === 503) {
          setError('Erro interno do servidor. Tente novamente em alguns instantes.');
        } else {
          try {
            const data = JSON.parse(responseText);
            setError(data.error || data.message || 'Erro ao enviar questionário');
          } catch {
            setError(`Erro no servidor (${res.status}): ${responseText.substring(0, 100)}`);
          }
        }
      }
    } catch (err) {
      console.error('Full error details:', err);
      console.error('Error type:', err instanceof Error ? err.constructor.name : typeof err);
      console.error('Error message:', (err as Error)?.message);
      console.error('Error stack:', (err as Error)?.stack);
      
      // Se for erro de rede, tentar entender melhor
      if (err instanceof TypeError && err.message.includes('Failed to fetch')) {
        setError('Erro de conexão com o servidor. Verifique se o servidor está rodando.');
      } else {
        setError(`Erro ao enviar questionário: ${(err as Error)?.message || 'Erro desconhecido'}`);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleCloseQuestionnaire = async () => {
    if (!template?.id) return;
    
    setClosing(true);
    setError(null);
    
    try {
      const response = await fetch(`/api/questionnaires/admin/templates/${template.id}/close`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to close questionnaire');
      }

      const updatedTemplate = await response.json();
      setTemplate(updatedTemplate);
      setSuccess('Questionário encerrado com sucesso!');
    } catch (error) {
      console.error('Error closing questionnaire:', error);
      setError(error instanceof Error ? error.message : 'Erro ao encerrar questionário');
    } finally {
      setClosing(false);
    }
  };

  const handleReopenQuestionnaire = async () => {
    if (!template?.id) return;

    setReopening(true);
    setError(null);

    try {
      const response = await fetch(`/api/questionnaires/admin/templates/${template.id}/reopen`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to reopen questionnaire');
      }

      const updatedTemplate = await response.json();
      setTemplate(updatedTemplate);
      setSuccess('Questionário reaberto com sucesso!');
    } catch (error) {
      console.error('Error reopening questionnaire:', error);
      setError(error instanceof Error ? error.message : 'Erro ao reabrir questionário');
    } finally {
      setReopening(false);
    }
  };

  const handleOpenQuestionnaire = async () => {
    setOpening(true);
    setError(null);

    try {
      const response = await fetch('/api/questionnaires/admin/open', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          month: selectedMonth,
          year: selectedYear
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to open questionnaire');
      }

      const data = await response.json();
      setTemplate(data.questionnaire);
      setSuccess(data.message || 'Questionário aberto com sucesso!');
    } catch (error) {
      console.error('Error opening questionnaire:', error);
      setError(error instanceof Error ? error.message : 'Erro ao abrir questionário');
    } finally {
      setOpening(false);
    }
  };





  const renderQuestion = (question: Question) => {
    const value = responses[question.id];
    
    switch (question.type) {
      case 'multiple_choice':
        return (
          <RadioGroup 
            value={value || ''} 
            onValueChange={(val) => handleResponseChange(question.id, val)}
          >
            {question.options?.map(option => (
              <div key={option} className="flex items-center space-x-2">
                <RadioGroupItem 
                  value={option} 
                  id={`${question.id}-${option}`}
                />
                <Label htmlFor={`${question.id}-${option}`}>
                  {option}
                </Label>
              </div>
            ))}
          </RadioGroup>
        );

      case 'checkbox':
        return (
          <div className="space-y-2">
            {question.options?.map(option => (
              <div key={option} className="flex items-center space-x-2">
                <Checkbox
                  id={`${question.id}-${option}`}
                  checked={value?.includes(option) || false}
                  onCheckedChange={(checked) => handleCheckboxChange(question.id, option, checked as boolean)}
                />
                <Label htmlFor={`${question.id}-${option}`}>
                  {option}
                </Label>
              </div>
            ))}
          </div>
        );

      case 'text':
        return (
          <div>
            <Textarea
              value={value || ''}
              onChange={(e) => {
                const text = e.target.value;
                if (text.length <= 1000) {
                  handleResponseChange(question.id, text);
                }
              }}
              placeholder="Digite sua resposta..."
              className="min-h-[100px]"
              maxLength={1000}
            />
            {value && value.length > 800 && (
              <p className="text-xs text-gray-500 mt-1">
                {value.length}/1000 caracteres
              </p>
            )}
          </div>
        );

      case 'yes_no_with_options':
        // Formato do valor: { answer: 'Sim' | 'Não', selectedOptions?: string[] }
        const yesNoValue = typeof value === 'object' ? value : { answer: '', selectedOptions: [] };
        // Determinar quando mostrar opções condicionais baseado no tipo de pergunta
        const getConditionalTrigger = () => {
          if (question.id === 'daily_mass_availability') {
            return 'Apenas em alguns dias';
          }
          // Para outras perguntas yes_no_with_options (como other_times_available)
          return 'Sim';
        };
        
        const showOptions = yesNoValue.answer === getConditionalTrigger();
        
        return (
          <div className="space-y-4">
            {/* Pergunta Sim/Não */}
            <RadioGroup 
              value={yesNoValue.answer || ''} 
              onValueChange={(val) => {
                // Mantém as seleções quando a resposta é o trigger condicional específico
                const conditionalTrigger = getConditionalTrigger();
                const shouldKeepSelections = val === conditionalTrigger;
                
                const newValue = {
                  answer: val,
                  selectedOptions: shouldKeepSelections ? yesNoValue.selectedOptions || [] : []
                };
                handleResponseChange(question.id, newValue);
              }}
            >
              {question.options?.map(option => (
                <div key={option} className="flex items-center space-x-2">
                  <RadioGroupItem 
                    value={option} 
                    id={`${question.id}-${option}`}
                  />
                  <Label htmlFor={`${question.id}-${option}`}>
                    {option}
                  </Label>
                </div>
              ))}
            </RadioGroup>
            
            {/* Opções condicionais - aparecem condicionalmente baseado no tipo de pergunta */}
            {showOptions && question.metadata?.conditionalOptions && (
              <div className="ml-6 p-3 border-l-2 border-blue-200 bg-[#DOD9B3] rounded-r-md">
                <p className="text-sm font-medium mb-2 text-blue-700 dark:text-blue-300">
                  {question.id === 'daily_mass_availability' 
                    ? 'Selecione os dias que você pode servir:' 
                    : question.id === 'other_times_available'
                    ? 'Selecione os horários disponíveis:'
                    : question.id.includes('st_jude_mass')
                    ? 'Selecione os horários que você pode servir:'
                    : 'Selecione os horários disponíveis:'}
                </p>
                <div className="space-y-2">
                  {/* Filtrar horários alternativos baseado no horário principal */}
                  {(() => {
                    let optionsToShow = question.metadata.conditionalOptions;
                    
                    // Se a pergunta depende de outra e tem filterMode='exclude'
                    if (question.metadata.dependsOn && question.metadata.filterMode === 'exclude') {
                      const dependentValue = responses[question.metadata.dependsOn];
                      if (dependentValue) {
                        // Filtrar removendo o horário principal selecionado
                        optionsToShow = optionsToShow.filter(opt => opt !== dependentValue);
                      }
                    }
                    
                    return optionsToShow.map(option => (
                      <div key={option} className="flex items-center space-x-2">
                        <Checkbox
                          id={`${question.id}-opt-${option}`}
                          checked={yesNoValue.selectedOptions?.includes(option) || false}
                          onCheckedChange={(checked) => {
                            const currentOptions = yesNoValue.selectedOptions || [];
                            const newOptions = checked 
                              ? [...currentOptions, option]
                              : currentOptions.filter((o: string) => o !== option);
                            
                            const newValue = {
                              answer: yesNoValue.answer,
                              selectedOptions: newOptions
                            };
                            handleResponseChange(question.id, newValue);
                          }}
                        />
                        <Label htmlFor={`${question.id}-opt-${option}`}>
                          {option}
                        </Label>
                      </div>
                    ));
                  })()}
                </div>
              </div>
            )}
          </div>
        );

      default:
        return null;
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'special_event':
        return <Calendar className="h-4 w-4" />;
      case 'daily':
        return <AlertCircle className="h-4 w-4" />;
      default:
        return <CheckCircle className="h-4 w-4" />;
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'special_event':
        return 'text-purple-600';
      case 'daily':
        return 'text-blue-600';
      default:
        return 'text-gray-600';
    }
  };

  const getCategoryBadge = (category: string, modified?: boolean) => {
    const colors = {
      regular: 'bg-blue-100 text-blue-800',
      daily: 'bg-green-100 text-green-800',
      special_event: 'bg-purple-100 text-purple-800',
      custom: 'bg-orange-100 text-orange-800'
    };
    
    const labels = {
      regular: 'Regular',
      daily: 'Diária',
      special_event: 'Evento Especial',
      custom: 'Personalizada'
    };
    
    return (
      <>
        <span className={`px-2 py-1 rounded-full text-xs font-medium ${colors[category as keyof typeof colors] || colors.regular}`}>
          {labels[category as keyof typeof labels] || category}
        </span>
        {modified && (
          <span className="ml-1 px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
            Modificada
          </span>
        )}
      </>
    );
  };

  const getStatusBadge = () => {
    if (!template?.status) return null;
    
    // Configurações base dos status
    const statusConfig = {
      draft: { color: 'bg-gray-100 text-gray-800', label: 'Rascunho', icon: FileText },
      sent: {
        // Para coordenadores: sempre mostrar "Enviado aos Ministros"
        // Para ministros: mostrar baseado se já respondeu ou não
        admin: { color: 'bg-blue-100 text-blue-800', label: 'Enviado aos Ministros', icon: Send },
        pending: { color: 'bg-yellow-100 text-yellow-800', label: 'Pendente', icon: AlertCircle },
        responded: { color: 'bg-green-100 text-green-800', label: 'Enviado', icon: CheckCircle }
      },
      closed: { color: 'bg-red-100 text-red-800', label: 'Encerrado', icon: Lock }
    };
    
    let config;
    
    if (template.status === 'sent') {
      if (isAdmin) {
        // Coordenadores sempre veem "Enviado aos Ministros"
        config = statusConfig.sent.admin;
      } else {
        // Ministros veem baseado se já responderam (verificação robusta)
        const hasResponse = Boolean(existingResponse?.responses?.length > 0);
        config = hasResponse ? statusConfig.sent.responded : statusConfig.sent.pending;
      }
    } else {
      const baseConfig = statusConfig[template.status as keyof typeof statusConfig];
      if (!baseConfig || typeof baseConfig !== 'object' || !('color' in baseConfig)) return null;
      config = baseConfig as { color: string; label: string; icon: any };
    }
    
    if (!config || !('icon' in config)) return null;
    
    const Icon = config.icon;
    
    return (
      <Badge className={`${config.color} gap-1`} data-testid={`badge-${template.status}${template.status === 'sent' ? (isAdmin ? '-admin' : (Boolean(existingResponse?.responses?.length > 0) ? '-responded' : '-pending')) : ''}`}>
        <Icon className="h-3 w-3" />
        {config.label}
      </Badge>
    );
  };

  // Componentes para administração (movidos do QuestionnaireAdmin)
  const addCustomQuestion = () => {
    if (!newQuestion.question) {
      setError('Por favor, digite a pergunta');
      return;
    }
    
    if ((newQuestion.type === 'multiple_choice' || newQuestion.type === 'checkbox' || newQuestion.type === 'yes_no_with_options') && 
        (!newQuestion.options || newQuestion.options.filter(o => o.trim()).length === 0)) {
      setError('Por favor, adicione pelo menos uma opção');
      return;
    }
    
    if (newQuestion.type === 'yes_no_with_options' && conditionalTrigger && !conditionalOptions.some(o => o.trim())) {
      setError('Por favor, adicione pelo menos uma sub-opção para a pergunta condicional');
      return;
    }
    
    const question: Question = {
      id: `custom_${Date.now()}`,
      type: newQuestion.type as Question['type'],
      question: newQuestion.question,
      options: newQuestion.options?.filter(o => o.trim()),
      required: newQuestion.required || false,
      category: 'custom',
      editable: true,
      metadata: newQuestion.type === 'yes_no_with_options' && conditionalTrigger && conditionalOptions.some(o => o.trim())
        ? {
            conditionalOptions: conditionalOptions.filter(o => o.trim())
          }
        : {}
    };
    
    if (template) {
      // Adicionar a pergunta e aplicar ordenação automática
      const allQuestions = [...template.questions, question];
      
      // Ordenar: múltipla escolha antes de texto
      const sortedQuestions = allQuestions.sort((a, b) => {
        const isAText = a.type === 'text';
        const isBText = b.type === 'text';
        
        if (isAText && !isBText) return 1; // Texto vai para o final
        if (!isAText && isBText) return -1; // Não-texto vem primeiro
        
        return 0; // Manter ordem relativa
      });
      
      // Atualizar ordem
      sortedQuestions.forEach((q, idx) => {
        q.order = idx;
      });
      
      const updatedTemplate = {
        ...template,
        questions: sortedQuestions
      };
      
      setTemplate(updatedTemplate);
      setShowAddQuestion(false);
      setNewQuestion({
        type: 'multiple_choice',
        question: '',
        options: ['', ''],
        required: false,
        category: 'custom',
        metadata: {}
      });
      setConditionalOptions(['']);
      setConditionalTrigger('');
      setSuccess('Pergunta adicionada e ordenada com sucesso!');
    }
  };

  // Funções para gerenciar opções do dialog de adicionar pergunta
  const updateOption = (index: number, value: string) => {
    const newOptions = [...(newQuestion.options || [])];
    newOptions[index] = value;
    setNewQuestion(prev => ({ ...prev, options: newOptions }));
  };

  const addOption = () => {
    setNewQuestion(prev => ({ 
      ...prev, 
      options: [...(prev.options || []), ''] 
    }));
  };

  const removeOption = (index: number) => {
    if ((newQuestion.options?.length || 0) <= 2) return;
    const newOptions = newQuestion.options?.filter((_, i) => i !== index) || [];
    setNewQuestion(prev => ({ ...prev, options: newOptions }));
  };

  const addQuestion = () => {
    addCustomQuestion();
  };
  
  // Funções para gerenciar opções condicionais
  const updateConditionalOption = (index: number, value: string) => {
    const newOptions = [...conditionalOptions];
    newOptions[index] = value;
    setConditionalOptions(newOptions);
  };

  const addConditionalOption = () => {
    setConditionalOptions(prev => [...prev, '']);
  };

  const removeConditionalOption = (index: number) => {
    if (conditionalOptions.length <= 1) return;
    setConditionalOptions(prev => prev.filter((_, i) => i !== index));
  };

  const updateQuestion = (questionId: string, updatedQuestion: Question) => {
    if (template) {
      const updatedQuestions = template.questions.map(q => 
        q.id === questionId ? { ...updatedQuestion, modified: true } : q
      );
      setTemplate({ ...template, questions: updatedQuestions });
      setEditingQuestion(null);
      setSuccess('Pergunta atualizada com sucesso!');
    }
  };

  const deleteQuestion = (questionId: string) => {
    if (template) {
      const updatedQuestions = template.questions.filter(q => q.id !== questionId);
      setTemplate({ ...template, questions: updatedQuestions });
      setSuccess('Pergunta removida com sucesso!');
    }
  };

  const moveQuestion = (index: number, direction: 'up' | 'down') => {
    if (!template) return;
    
    const newQuestions = [...template.questions];
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    
    if (newIndex < 0 || newIndex >= newQuestions.length) return;
    
    // Trocar as perguntas de posição
    [newQuestions[index], newQuestions[newIndex]] = [newQuestions[newIndex], newQuestions[index]];
    
    // Atualizar ordem personalizada
    newQuestions.forEach((q, idx) => {
      q.order = idx;
    });
    
    setTemplate({ ...template, questions: newQuestions });
    setSuccess('Ordem das perguntas atualizada');
  };
  
  // Função para aplicar ordenação padrão (múltipla escolha antes de texto)
  const applyDefaultSorting = () => {
    if (!template) return;
    
    const sortedQuestions = [...template.questions].sort((a, b) => {
      // Múltipla escolha antes de texto
      const isAText = a.type === 'text';
      const isBText = b.type === 'text';
      
      if (isAText && !isBText) return 1; // Texto vai para o final
      if (!isAText && isBText) return -1; // Não-texto vem primeiro
      
      // Manter ordem relativa dentro do mesmo tipo
      return 0;
    });
    
    // Atualizar ordem
    sortedQuestions.forEach((q, idx) => {
      q.order = idx;
    });
    
    setTemplate({ ...template, questions: sortedQuestions });
    setSuccess('Perguntas ordenadas: múltipla escolha primeiro, texto por último');
  };

  return (
    <Layout 
      title={`Questionário de Disponibilidade ${mode === 'respond' ? '- Modo Resposta' : mode === 'admin' ? '- Modo Admin' : ''}`}
      subtitle={mode === 'admin' 
        ? 'Configure o questionário antes de enviar aos ministros'
        : mode === 'respond'
        ? '✍️ Responda as perguntas abaixo e clique em "Enviar Questionário" no final'
        : 'Visualizando questionário'}
    >
      <div className="max-w-5xl mx-auto p-6 ml-[-4px] mr-[-4px] pt-[0px] pb-[0px] pl-[0px] pr-[0px]">
        <Card className="border-opacity-30">
          <CardHeader className="flex flex-col space-y-1.5 p-6 mt-[0px] mb-[0px] pt-[10px] pb-[10px]">
            <div className="flex items-center justify-between">
              {getStatusBadge()}
            </div>
          </CardHeader>
          <CardContent className="p-3 sm:p-4">
            {/* Seletor de Mês/Ano */}
            <div className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="month" className="text-sm font-medium">Mês</Label>
                  <select
                    id="month"
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(Number(e.target.value))}
                    className="w-full mt-1 p-2 border rounded-md bg-background"
                  >
                    {monthNames.map((name, index) => (
                      <option key={index} value={index + 1}>
                        {name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <Label htmlFor="year" className="text-sm font-medium">Ano</Label>
                  <select
                    id="year"
                    value={selectedYear}
                    onChange={(e) => setSelectedYear(Number(e.target.value))}
                    className="w-full mt-1 p-2 border rounded-md bg-background"
                  >
                    {[2024, 2025, 2026].map(year => (
                      <option key={year} value={year}>
                        {year}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              
              {/* Botões de ação baseados no modo */}
              <div className="w-full space-y-2">
                {isAdmin && !template && (
                  <Button onClick={generateTemplate} disabled={loading} className="w-full">
                    <Calendar className="mr-2 h-4 w-4" />
                    Gerar Template
                  </Button>
                )}
                
                {isAdmin && template && template.status === 'sent' && (
                  <Button onClick={generateTemplate} disabled={loading} className="w-full" variant="outline">
                    <RotateCcw className="mr-2 h-4 w-4" />
                    Gerar Novo Template
                  </Button>
                )}
                
                {isAdmin && mode === 'admin' && template && (
                  <div className="space-y-2">
                    <div className="flex flex-col sm:flex-row gap-2">
                      <Button 
                        onClick={() => {
                          setMode('respond');
                        }} 
                        variant="outline" 
                        className="flex-1"
                        data-testid="button-test-responses"
                      >
                        <CheckCircle className="mr-2 h-4 w-4" />
                        Testar Respostas
                      </Button>
                      <Button onClick={saveTemplate} disabled={saving} className="flex-1">
                        <Save className="mr-2 h-4 w-4" />
                        {saving ? 'Salvando...' : 'Salvar'}
                      </Button>
                      {template.status === 'closed' ? (
                        <Button onClick={handleReopenQuestionnaire} disabled={reopening} className="flex-1" variant="outline" data-testid="button-reopen-questionnaire">
                          <Unlock className="mr-2 h-4 w-4" />
                          {reopening ? 'Reabrindo...' : 'Reabrir Questionário'}
                        </Button>
                      ) : (
                        <Button onClick={handleCloseQuestionnaire} disabled={closing} className="flex-1" variant="outline">
                          <Lock className="mr-2 h-4 w-4" />
                          {closing ? 'Encerrando...' : 'Encerrar'}
                        </Button>
                      )}
                      {/* Botão de Enviar/Reenviar */}
                      {template.status === 'draft' ? (
                        // Botão de primeiro envio
                        <Dialog open={showSendDialog} onOpenChange={setShowSendDialog}>
                          <DialogTrigger asChild>
                            <Button 
                              variant="default" 
                              className="flex-1"
                            >
                              <Users className="mr-2 h-4 w-4" />
                              Enviar aos Ministros
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Enviar Questionário</DialogTitle>
                              <DialogDescription>
                                Tem certeza que deseja enviar este questionário para todos os ministros? 
                                Após o envio, os ministros receberão uma notificação.
                              </DialogDescription>
                            </DialogHeader>
                            <DialogFooter>
                              <Button variant="outline" onClick={() => setShowSendDialog(false)}>
                                Cancelar
                              </Button>
                              <Button onClick={() => sendQuestionnaire(false)} disabled={loading}>
                                <Send className="mr-2 h-4 w-4" />
                                {loading ? 'Enviando...' : 'Confirmar Envio'}
                              </Button>
                            </DialogFooter>
                          </DialogContent>
                        </Dialog>
                      ) : template.status === 'sent' ? (
                        // Botão de reenvio
                        <Dialog open={showResendDialog} onOpenChange={setShowResendDialog}>
                          <DialogTrigger asChild>
                            <Button 
                              variant="secondary" 
                              className="flex-1"
                            >
                              <RefreshCw className="mr-2 h-4 w-4" />
                              Reenviar aos Ministros
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Reenviar Questionário Atualizado</DialogTitle>
                              <DialogDescription>
                                <div className="space-y-2">
                                  <p>Este questionário já foi enviado aos ministros.</p>
                                  <p className="font-semibold">Ao reenviar:</p>
                                  <ul className="list-disc list-inside space-y-1 text-sm">
                                    <li>As mudanças feitas serão disponibilizadas para todos os ministros</li>
                                    <li>Ministros que já responderam poderão atualizar suas respostas</li>
                                    <li>Uma notificação de atualização será enviada</li>
                                  </ul>
                                </div>
                              </DialogDescription>
                            </DialogHeader>
                            <DialogFooter>
                              <Button variant="outline" onClick={() => setShowResendDialog(false)}>
                                Cancelar
                              </Button>
                              <Button onClick={() => sendQuestionnaire(true)} disabled={loading}>
                                <RefreshCw className="mr-2 h-4 w-4" />
                                {loading ? 'Reenviando...' : 'Confirmar Reenvio'}
                              </Button>
                            </DialogFooter>
                          </DialogContent>
                        </Dialog>
                      ) : null}
                      {template.status === 'draft' && (
                        <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
                          <DialogTrigger asChild>
                            <Button variant="destructive" className="flex-1">
                              <Trash2 className="mr-2 h-4 w-4" />
                              Deletar Template
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Deletar Template</DialogTitle>
                              <DialogDescription>
                                Tem certeza que deseja deletar este template? Esta ação removerá o questionário mas preservará as respostas já enviadas pelos ministros.
                              </DialogDescription>
                            </DialogHeader>
                            <DialogFooter>
                              <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>
                                Cancelar
                              </Button>
                              <Button variant="destructive" onClick={deleteTemplate} disabled={loading}>
                                <Trash2 className="mr-2 h-4 w-4" />
                                {loading ? 'Deletando...' : 'Confirmar Deleção'}
                              </Button>
                            </DialogFooter>
                          </DialogContent>
                        </Dialog>
                      )}
                    </div>
                    <Dialog open={showAddQuestion} onOpenChange={(open) => {
                      setShowAddQuestion(open);
                      if (open) {
                        // Reset states when opening dialog
                        setNewQuestion({
                          type: 'multiple_choice',
                          question: '',
                          options: ['', ''],
                          required: false,
                          category: 'custom',
                          metadata: {}
                        });
                        setConditionalOptions(['']);
                        setConditionalTrigger('');
                      }
                    }}>
                      <DialogTrigger asChild>
                        <Button variant="outline" className="w-full">
                          <Plus className="mr-2 h-4 w-4" />
                          Adicionar Pergunta
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-6">
                        <DialogHeader className="mb-4">
                          <DialogTitle>Adicionar Nova Pergunta</DialogTitle>
                          <DialogDescription>
                            Crie uma pergunta personalizada para o questionário
                          </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4">
                          <div>
                            <Label>Tipo de Pergunta</Label>
                            <Select
                              value={newQuestion.type}
                              onValueChange={(value) => setNewQuestion(prev => ({ ...prev, type: value as Question['type'] }))}
                            >
                              <SelectTrigger className="w-full">
                                <SelectValue placeholder="Selecione o tipo" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="multiple_choice">Múltipla Escolha (única resposta)</SelectItem>
                                <SelectItem value="checkbox">Múltipla Escolha (várias respostas)</SelectItem>
                                <SelectItem value="yes_no_with_options">Pergunta Condicional (com sub-opções)</SelectItem>
                                <SelectItem value="text">Texto</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          
                          <div>
                            <Label>Pergunta</Label>
                            <Textarea
                              value={newQuestion.question}
                              onChange={(e) => setNewQuestion(prev => ({ ...prev, question: e.target.value }))}
                              placeholder="Digite a pergunta..."
                              className="w-full"
                            />
                          </div>
                          
                          {(newQuestion.type === 'multiple_choice' || newQuestion.type === 'checkbox') && (
                            <div>
                              <Label>Opções</Label>
                              <div className="space-y-2">
                                {newQuestion.options?.map((option, index) => (
                                  <div key={index} className="flex gap-2">
                                    <Input
                                      value={option}
                                      onChange={(e) => updateOption(index, e.target.value)}
                                      placeholder={`Opção ${index + 1}`}
                                      className="flex-1"
                                    />
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => removeOption(index)}
                                      disabled={newQuestion.options!.length <= 2}
                                    >
                                      <X className="h-4 w-4" />
                                    </Button>
                                  </div>
                                ))}
                                <Button
                                  variant="outline"
                                  onClick={addOption}
                                  className="w-full"
                                >
                                  <Plus className="mr-2 h-4 w-4" />
                                  Adicionar Opção
                                </Button>
                              </div>
                            </div>
                          )}
                          
                          {newQuestion.type === 'yes_no_with_options' && (
                            <div className="space-y-4">
                              <div>
                                <Label>Opções Principais</Label>
                                <div className="space-y-2">
                                  {newQuestion.options?.map((option, index) => (
                                    <div key={index} className="flex gap-2">
                                      <Input
                                        value={option}
                                        onChange={(e) => updateOption(index, e.target.value)}
                                        placeholder={index === 0 ? 'Sim' : index === 1 ? 'Não' : `Opção ${index + 1}`}
                                        className="flex-1"
                                      />
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => removeOption(index)}
                                        disabled={newQuestion.options!.length <= 2}
                                      >
                                        <X className="h-4 w-4" />
                                      </Button>
                                    </div>
                                  ))}
                                  <Button
                                    variant="outline"
                                    onClick={addOption}
                                    className="w-full"
                                  >
                                    <Plus className="mr-2 h-4 w-4" />
                                    Adicionar Opção Principal
                                  </Button>
                                </div>
                              </div>
                              
                              <div>
                                <Label>Resposta que Ativa Sub-opções</Label>
                                <Select
                                  value={conditionalTrigger}
                                  onValueChange={setConditionalTrigger}
                                >
                                  <SelectTrigger className="w-full">
                                    <SelectValue placeholder="Selecione qual resposta ativa as sub-opções" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {newQuestion.options?.filter(option => option && option.trim() !== '').map((option, index) => (
                                      <SelectItem key={index} value={option.trim()}>
                                        {option.trim()}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                              
                              {conditionalTrigger && (
                                <div>
                                  <Label>Sub-opções (aparecem quando "{conditionalTrigger}" é selecionado)</Label>
                                  <div className="space-y-2">
                                    {conditionalOptions.map((option, index) => (
                                      <div key={index} className="flex gap-2">
                                        <Input
                                          value={option}
                                          onChange={(e) => updateConditionalOption(index, e.target.value)}
                                          placeholder={`Sub-opção ${index + 1}`}
                                          className="flex-1"
                                        />
                                        <Button
                                          variant="outline"
                                          size="sm"
                                          onClick={() => removeConditionalOption(index)}
                                          disabled={conditionalOptions.length <= 1}
                                        >
                                          <X className="h-4 w-4" />
                                        </Button>
                                      </div>
                                    ))}
                                    <Button
                                      variant="outline"
                                      onClick={addConditionalOption}
                                      className="w-full"
                                    >
                                      <Plus className="mr-2 h-4 w-4" />
                                      Adicionar Sub-opção
                                    </Button>
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                          
                          <div>
                            <Label>Categoria</Label>
                            <Select
                              value={newQuestion.category}
                              onValueChange={(value) => setNewQuestion(prev => ({ ...prev, category: value as Question['category'] }))}
                            >
                              <SelectTrigger className="w-full">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="regular">Regular</SelectItem>
                                <SelectItem value="special">Eventos Especiais</SelectItem>
                                <SelectItem value="custom">Personalizada</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                        <DialogFooter className="mt-6 pt-4 border-t">
                          <div className="flex flex-col sm:flex-row gap-2 w-full sm:justify-end">
                            <Button variant="outline" onClick={() => setShowAddQuestion(false)} className="sm:w-auto w-full">
                              Cancelar
                            </Button>
                            <Button onClick={addQuestion} className="sm:w-auto w-full">
                              <Plus className="mr-2 h-4 w-4" />
                              Adicionar Pergunta
                            </Button>
                          </div>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                  </div>
                )}
              </div>
            </div>

            {/* Status da resposta existente */}
            {existingResponse && mode === 'respond' && (
              <Alert className="mb-4">
                <CheckCircle className="h-4 w-4" />
                <AlertDescription>
                  Você já respondeu este questionário em {format(new Date(existingResponse.submittedAt), "dd 'de' MMMM 'às' HH:mm", { locale: ptBR })}.
                  Você pode atualizar suas respostas abaixo.
                </AlertDescription>
              </Alert>
            )}

            {/* Mensagens de erro/sucesso */}
            {error && (
              <Alert variant="destructive" className="mb-4">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription className="flex items-center justify-between">
                  {error}
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => setError(null)}
                    className="ml-2 h-auto p-1 text-xs hover:bg-red-100"
                  >
                    ✕
                  </Button>
                </AlertDescription>
              </Alert>
            )}
            
            {success && (
              <Alert className="mb-6 bg-green-50 border-green-200">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-800 flex items-center justify-between">
                  {success}
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => setSuccess(null)}
                    className="ml-2 h-auto p-1 text-xs text-green-600 hover:bg-green-100"
                  >
                    ✕
                  </Button>
                </AlertDescription>
              </Alert>
            )}

            {/* Conteúdo baseado no modo */}
            {loading ? (
              <div className="text-center py-8">Carregando questionário...</div>
            ) : template ? (
              <>
                {mode === 'admin' ? (
                  // Modo administração - com tabs e edição
                  <Tabs defaultValue="all" className="w-full">
                    {/* Botão de ordenação padrão */}
                    <div className="flex justify-between items-center mb-4">
                      <div className="text-sm text-gray-600">
                        {template.questions.length} perguntas
                      </div>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={applyDefaultSorting}
                        title="Organizar perguntas: múltipla escolha primeiro, texto por último"
                      >
                        <RotateCcw className="h-4 w-4 mr-2" />
                        Aplicar Ordem Padrão
                      </Button>
                    </div>
                    
                    <div className="overflow-x-auto mb-4">
                      <TabsList className="grid w-full grid-cols-4 h-auto p-1">
                        <TabsTrigger value="all" className="text-xs sm:text-sm px-2 py-2">
                          <span className="sm:hidden">({template.questions.length})</span>
                          <span className="hidden sm:inline">Todas ({template.questions.length})</span>
                        </TabsTrigger>
                        <TabsTrigger value="regular" className="text-xs sm:text-sm px-2 py-2">
                          <span className="sm:hidden">Regular</span>
                          <span className="hidden sm:inline">Regulares</span>
                        </TabsTrigger>
                        <TabsTrigger value="special" className="text-xs sm:text-sm px-2 py-2">
                          <span className="sm:hidden">Especial</span>
                          <span className="hidden sm:inline">Eventos Especiais</span>
                        </TabsTrigger>
                        <TabsTrigger value="custom" className="text-xs sm:text-sm px-2 py-2">
                          <span className="sm:hidden">Person</span>
                          <span className="hidden sm:inline">Personalizadas</span>
                        </TabsTrigger>
                      </TabsList>
                    </div>
                    
                    <TabsContent value="all" className="space-y-4">
                      {template.questions.map((question, index) => (
                        <QuestionAdminCard
                          key={question.id}
                          question={question}
                          index={index}
                          totalQuestions={template.questions.length}
                          onEdit={(q: Question) => setEditingQuestion(q)}
                          onDelete={() => deleteQuestion(question.id)}
                          onMoveUp={() => moveQuestion(index, 'up')}
                          onMoveDown={() => moveQuestion(index, 'down')}
                          getCategoryBadge={getCategoryBadge}
                        />
                      ))}
                    </TabsContent>
                    
                    <TabsContent value="regular" className="space-y-4">
                      {template.questions.filter(q => q.category === 'regular').map((question, index) => (
                        <QuestionAdminCard
                          key={question.id}
                          question={question}
                          index={template.questions.indexOf(question)}
                          totalQuestions={template.questions.length}
                          onEdit={(q: Question) => setEditingQuestion(q)}
                          onDelete={() => deleteQuestion(question.id)}
                          onMoveUp={() => moveQuestion(template.questions.indexOf(question), 'up')}
                          onMoveDown={() => moveQuestion(template.questions.indexOf(question), 'down')}
                          getCategoryBadge={getCategoryBadge}
                        />
                      ))}
                    </TabsContent>
                    
                    <TabsContent value="special" className="space-y-4">
                      {template.questions.filter(q => q.category === 'special_event').map((question, index) => (
                        <QuestionAdminCard
                          key={question.id}
                          question={question}
                          index={template.questions.indexOf(question)}
                          totalQuestions={template.questions.length}
                          onEdit={(q: Question) => setEditingQuestion(q)}
                          onDelete={() => deleteQuestion(question.id)}
                          onMoveUp={() => moveQuestion(template.questions.indexOf(question), 'up')}
                          onMoveDown={() => moveQuestion(template.questions.indexOf(question), 'down')}
                          getCategoryBadge={getCategoryBadge}
                        />
                      ))}
                    </TabsContent>
                    
                    <TabsContent value="custom" className="space-y-4">
                      {template.questions.filter(q => q.category === 'custom').map((question, index) => (
                        <QuestionAdminCard
                          key={question.id}
                          question={question}
                          index={template.questions.indexOf(question)}
                          totalQuestions={template.questions.length}
                          onEdit={(q: Question) => setEditingQuestion(q)}
                          onDelete={() => deleteQuestion(question.id)}
                          onMoveUp={() => moveQuestion(template.questions.indexOf(question), 'up')}
                          onMoveDown={() => moveQuestion(template.questions.indexOf(question), 'down')}
                          getCategoryBadge={getCategoryBadge}
                        />
                      ))}
                    </TabsContent>
                  </Tabs>
                ) : mode === 'respond' ? (
                  // Modo resposta - formulário de respostas
                  <div className="space-y-6">
                    {/* Debug info */}
                                    {/* Botão de retorno ao modo administração */}
                    {isAdmin && (
                      <div className="flex justify-start mb-4">
                        <Button onClick={() => setMode('admin')} variant="outline" className="gap-2">
                          <ChevronLeft className="h-4 w-4" />
                          Retornar à Administração
                        </Button>
                      </div>
                    )}
                    
                    {template.questions.filter((question) => {
                      // Verificar se a pergunta deve ser exibida baseado em dependências
                      const meta = question.metadata;
                      if (!meta?.dependsOn) return true;
                      
                      // Extrair valor real da resposta (pode ser string ou objeto yes_no_with_options)
                      const raw = responses[meta.dependsOn];
                      const depVal = typeof raw === 'object' && raw?.answer !== undefined ? raw.answer : raw;
                      
                      // Obter valor esperado (pode ser string ou array)
                      const expected = meta.enabledWhen ?? meta.showIf;
                      if (expected === undefined) return true;
                      
                      // Comparar com suporte para arrays e strings
                      return Array.isArray(expected) ? expected.includes(depVal) : depVal === expected;
                    }).map((question) => (
                        <Card 
                          key={question.id} 
                          className="border-l-4" 
                          style={{ borderLeftColor: getCategoryColor(question.category) }}
                        >
                          <CardContent className="p-3 sm:p-4 pt-4 sm:pt-6">
                            <div className="flex items-start gap-2 mb-4">
                              <span className={getCategoryColor(question.category)}>
                                {getCategoryIcon(question.category)}
                              </span>
                              <div className="flex-1">
                                <Label className="text-base">
                                  {question.question}
                                  {question.required && <span className="text-red-500 ml-1">*</span>}
                                </Label>
                                {question.metadata?.eventName && (
                                  <p className="text-sm text-gray-500 mt-1">
                                    {question.metadata.eventName}
                                  </p>
                                )}
                              </div>
                            </div>
                            {renderQuestion(question)}
                          </CardContent>
                        </Card>
                    ))}

                    {/* Seção de Compartilhamento Familiar */}
                    {familySharingScenario !== 'none' && familyMembers.length > 0 && (
                      <Card className="border-2 border-blue-200 bg-blue-50/30">
                        <CardHeader className="pb-3">
                          <CardTitle className="flex items-center gap-2 text-lg text-blue-800">
                            <Users className="h-5 w-5" />
                            Compartilhamento Familiar
                          </CardTitle>
                          <CardDescription className="text-blue-700">
                            Você pode compartilhar suas respostas com familiares cadastrados
                          </CardDescription>
                        </CardHeader>
                        <CardContent>
                          {familySharingScenario === 'need_choice' && (
                            <div className="space-y-4">
                              <p className="text-sm font-medium text-gray-700">
                                Marque os familiares que devem receber uma cópia das suas respostas:
                              </p>
                              <div className="space-y-3">
                                {familyMembers.map((member) => (
                                  <div key={member.id} className="flex items-center space-x-3 p-3 bg-white rounded-lg border">
                                    <Checkbox
                                      id={`family-${member.id}`}
                                      checked={selectedFamilyMembers.includes(member.id)}
                                      onCheckedChange={(checked) => {
                                        if (checked) {
                                          setSelectedFamilyMembers([...selectedFamilyMembers, member.id]);
                                        } else {
                                          setSelectedFamilyMembers(selectedFamilyMembers.filter(id => id !== member.id));
                                        }
                                      }}
                                      data-testid={`checkbox-family-${member.id}`}
                                    />
                                    <Label htmlFor={`family-${member.id}`} className="flex-1 cursor-pointer">
                                      <div className="font-medium">{member.name}</div>
                                      <div className="text-sm text-gray-500">
                                        {member.relationshipType === 'spouse' ? 'Cônjuge' :
                                         member.relationshipType === 'parent' ? 'Pai/Mãe' :
                                         member.relationshipType === 'child' ? 'Filho(a)' :
                                         member.relationshipType === 'sibling' ? 'Irmão(ã)' : member.relationshipType}
                                      </div>
                                    </Label>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {familySharingScenario === 'some_responded' && (
                            <div className="space-y-4">
                              <p className="text-sm font-medium text-gray-700">
                                Alguns familiares já responderam. Deseja que os demais recebam uma cópia das suas respostas?
                              </p>
                              <div className="space-y-3">
                                {familyMembers.map((member) => (
                                  <div key={member.id} className="flex items-center space-x-3 p-3 bg-white rounded-lg border">
                                    <Checkbox
                                      id={`family-${member.id}`}
                                      checked={member.hasResponded ? false : selectedFamilyMembers.includes(member.id)}
                                      disabled={member.hasResponded}
                                      onCheckedChange={(checked) => {
                                        if (!member.hasResponded) {
                                          if (checked) {
                                            setSelectedFamilyMembers([...selectedFamilyMembers, member.id]);
                                          } else {
                                            setSelectedFamilyMembers(selectedFamilyMembers.filter(id => id !== member.id));
                                          }
                                        }
                                      }}
                                      data-testid={`checkbox-family-${member.id}`}
                                    />
                                    <Label htmlFor={`family-${member.id}`} className="flex-1 cursor-pointer">
                                      <div className="font-medium flex items-center gap-2">
                                        {member.name}
                                        {member.hasResponded && (
                                          <Badge variant="secondary" className="text-xs">
                                            Já respondeu
                                          </Badge>
                                        )}
                                      </div>
                                      <div className="text-sm text-gray-500">
                                        {member.relationshipType === 'spouse' ? 'Cônjuge' :
                                         member.relationshipType === 'parent' ? 'Pai/Mãe' :
                                         member.relationshipType === 'child' ? 'Filho(a)' :
                                         member.relationshipType === 'sibling' ? 'Irmão(ã)' : member.relationshipType}
                                      </div>
                                    </Label>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {selectedFamilyMembers.length > 0 && (
                            <>
                              <Alert className="mt-4">
                                <AlertCircle className="h-4 w-4" />
                                <AlertDescription>
                                  Suas respostas serão copiadas para {selectedFamilyMembers.length} familiar(es).
                                  Eles poderão reenviar o questionário com modificações enquanto estiver aberto.
                                </AlertDescription>
                              </Alert>

                              {/* Preferência de Escalação Familiar */}
                              <Card className="mt-4 border-blue-200 bg-blue-50/50">
                                <CardContent className="pt-6">
                                  <div className="flex items-center justify-between">
                                    <div className="space-y-1">
                                      <Label htmlFor="serve-together" className="text-base font-medium">
                                        Preferência de Escalação
                                      </Label>
                                      <p className="text-sm text-muted-foreground">
                                        Como vocês preferem servir nas missas?
                                      </p>
                                    </div>
                                    <div className="flex items-center space-x-3">
                                      <span className={!preferServeTogether ? 'font-medium' : 'text-muted-foreground'}>
                                        Separados
                                      </span>
                                      <Switch
                                        id="serve-together"
                                        checked={preferServeTogether}
                                        onCheckedChange={setPreferServeTogether}
                                      />
                                      <span className={preferServeTogether ? 'font-medium' : 'text-muted-foreground'}>
                                        Juntos
                                      </span>
                                    </div>
                                  </div>

                                  {/* Alert explicativo */}
                                  <Alert className={`mt-4 ${preferServeTogether ? 'bg-green-50 border-green-200' : 'bg-amber-50 border-amber-200'}`}>
                                    <AlertCircle className={`h-4 w-4 ${preferServeTogether ? 'text-green-600' : 'text-amber-600'}`} />
                                    <AlertDescription className={preferServeTogether ? 'text-green-800' : 'text-amber-800'}>
                                      {preferServeTogether
                                        ? 'Vocês serão escalados preferencialmente na mesma missa sempre que possível.'
                                        : 'Vocês podem ser escalados em missas diferentes para melhor distribuição.'}
                                    </AlertDescription>
                                  </Alert>
                                </CardContent>
                              </Card>
                            </>
                          )}
                        </CardContent>
                      </Card>
                    )}

                    {/* Botão de envio */}
                    <div className="flex justify-center mt-8 p-4 bg-gradient-to-r from-blue-50 to-green-50 rounded-lg border">
                      {template.status === 'closed' ? (
                        <div className="w-full space-y-3">
                          <Alert variant="destructive">
                            <Lock className="h-4 w-4" />
                            <AlertDescription>
                              Esse questionário não aceita mais respostas
                            </AlertDescription>
                          </Alert>
                          {isAdmin && (
                            <Button
                              onClick={handleReopenQuestionnaire}
                              disabled={reopening}
                              className="w-full"
                              variant="outline"
                              data-testid="button-reopen-questionnaire-respond"
                            >
                              <Unlock className="mr-2 h-4 w-4" />
                              {reopening ? 'Reabrindo...' : 'Reabrir Questionário'}
                            </Button>
                          )}
                        </div>
                      ) : (
                        <Button
                          onClick={handleSubmitResponse}
                          disabled={submitting || isSubmitted}
                          size="lg"
                          className={`gap-2 px-8 py-3 text-lg font-semibold shadow-lg transition-all ${
                            isSubmitted ? 'bg-green-600 hover:bg-green-700' : ''
                          }`}
                          data-testid="button-submit-questionnaire"
                        >
                          {submitting ? (
                            <>
                              <Loader2 className="h-5 w-5 animate-spin" />
                              Enviando...
                            </>
                          ) : isSubmitted ? (
                            <>
                              <CheckCircle className="h-5 w-5" />
                              Enviado com sucesso ✓
                            </>
                          ) : existingResponse?.responses?.length > 0 ? (
                            <>
                              <RefreshCw className="h-5 w-5" />
                              REENVIAR RESPOSTAS
                            </>
                          ) : (
                            <>
                              <Send className="h-5 w-5" />
                              Enviar Respostas
                            </>
                          )}
                        </Button>
                      )}
                    </div>
                  </div>
                ) : (
                  // Modo visualização
                  <div className="space-y-6">
                    <Alert variant={template.status === 'closed' ? 'destructive' : 'default'}>
                      {template.status === 'closed' ? (
                        <Lock className="h-4 w-4" />
                      ) : (
                        <AlertCircle className="h-4 w-4" />
                      )}
                      <AlertDescription>
                        {template.status === 'closed' 
                          ? 'Este questionário foi encerrado e não aceita mais respostas.'
                          : isAdmin
                          ? 'Este questionário já foi enviado aos ministros.'
                          : 'Este questionário ainda não está disponível para respostas.'}
                      </AlertDescription>
                    </Alert>
                    
                    {isAdmin && template.status === 'closed' && (
                      <Button
                        onClick={handleReopenQuestionnaire}
                        disabled={reopening}
                        className="w-full"
                        variant="outline"
                        data-testid="button-reopen-questionnaire-view"
                      >
                        <Unlock className="mr-2 h-4 w-4" />
                        {reopening ? 'Reabrindo...' : 'Reabrir Questionário'}
                      </Button>
                    )}
                    
                    {template.sentAt && (
                      <p className="text-sm text-gray-600">
                        Enviado em: {format(new Date(template.sentAt), "dd 'de' MMMM 'de' yyyy 'às' HH:mm", { locale: ptBR })}
                      </p>
                    )}
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-8 text-gray-500">
                {isAdmin 
                  ? 'Nenhum questionário criado para o período selecionado. Clique em "Gerar Template" para começar.'
                  : 'Nenhum questionário disponível para o período selecionado.'}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Dialog de Edição */}
        {editingQuestion && (
          <EditQuestionDialog
            question={editingQuestion}
            onSave={(q: Question) => updateQuestion(q.id, q)}
            onClose={() => setEditingQuestion(null)}
          />
        )}
      </div>
    </Layout>
  );
}

// Componente para card de pergunta no modo admin
function QuestionAdminCard({ 
  question, 
  index, 
  totalQuestions, 
  onEdit, 
  onDelete, 
  onMoveUp, 
  onMoveDown,
  getCategoryBadge 
}: any) {
  const canEdit = true;
  const canDelete = question.category === 'custom';
  
  return (
    <Card className={question.modified ? "border-yellow-400" : ""}>
      <CardContent className="p-3 sm:p-4 pt-4 sm:pt-6">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              {getCategoryBadge(question.category, question.modified)}
              {question.required && (
                <span className="text-red-500 text-xs font-medium">Obrigatória</span>
              )}
              {question.metadata?.eventName && (
                <span className="text-sm text-gray-500">
                  {question.metadata.eventName}
                </span>
              )}
            </div>
            <p className="font-medium mb-2">{question.question}</p>
            {question.options && (
              <ul className="list-disc list-inside text-sm text-gray-600">
                {question.options.map((option: string, i: number) => (
                  <li key={i}>{option}</li>
                ))}
              </ul>
            )}
          </div>
          <div className="flex items-center gap-1 ml-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={onMoveUp}
              disabled={index === 0}
            >
              <ChevronUp className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={onMoveDown}
              disabled={index === totalQuestions - 1}
            >
              <ChevronDown className="h-4 w-4" />
            </Button>
            {canEdit && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onEdit(question)}
                title="Editar pergunta"
              >
                <Edit2 className="h-4 w-4" />
              </Button>
            )}
            {canDelete && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onDelete}
                title="Remover pergunta"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Dialog para editar pergunta
function EditQuestionDialog({ question, onSave, onClose }: any) {
  const [editedQuestion, setEditedQuestion] = useState(question);
  
  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Editar Pergunta</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Pergunta</Label>
            <Textarea
              value={editedQuestion.question}
              onChange={(e) => setEditedQuestion((prev: any) => ({ ...prev, question: e.target.value }))}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={() => onSave(editedQuestion)}>
            Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}