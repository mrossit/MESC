import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { 
  X, 
  ChevronRight, 
  ChevronLeft,
  User,
  Calendar,
  FileText,
  Bell,
  BookOpen,
  Users,
  CheckCircle2,
  Info,
  Sparkles
} from "lucide-react";

interface TutorialStep {
  id: number;
  title: string;
  description: string;
  icon: React.ElementType;
  target?: string;
  position?: "top" | "bottom" | "left" | "right";
}

const tutorialSteps: TutorialStep[] = [
  {
    id: 1,
    title: "Bem-vindo ao MESC!",
    description: "Vamos fazer um tour rápido pelas principais funcionalidades do sistema. Este tutorial irá ajudá-lo a conhecer todas as ferramentas disponíveis para ministros.",
    icon: Sparkles
  },
  {
    id: 2,
    title: "Seu Perfil",
    description: "Clique em 'Meu Perfil' no menu lateral para atualizar suas informações pessoais, adicionar foto, configurar sua família MESC e manter seus dados sempre atualizados.",
    icon: User,
    target: "profile"
  },
  {
    id: 3,
    title: "Escalas e Disponibilidade",
    description: "Na seção 'Escalas', você pode visualizar quando está escalado para servir e indicar sua disponibilidade para os próximos meses através do questionário.",
    icon: Calendar,
    target: "schedules"
  },
  {
    id: 4,
    title: "Questionário de Disponibilidade",
    description: "Responda mensalmente ao questionário informando seus dias e horários disponíveis. Isso ajuda os coordenadores a montarem as escalas de forma mais eficiente.",
    icon: FileText,
    target: "questionnaire"
  },
  {
    id: 5,
    title: "Minhas Escalas",
    description: "Aqui você visualiza todas as missas em que foi escalado. Fique atento às datas e horários! Em breve você receberá notificações automáticas.",
    icon: Bell,
    target: "my-schedules"
  },
  {
    id: 6,
    title: "Formação Continuada",
    description: "Acesse materiais de formação, videoaulas e conteúdos para aprofundar seu conhecimento litúrgico. Esta seção está em desenvolvimento e em breve terá novidades!",
    icon: BookOpen,
    target: "formation"
  },
  {
    id: 7,
    title: "Família MESC",
    description: "No seu perfil, você pode adicionar familiares que também são ministros. Isso facilita a coordenação de escalas para casais e famílias que servem juntos.",
    icon: Users,
    target: "family"
  },
  {
    id: 8,
    title: "Tutorial Concluído!",
    description: "Você conheceu as principais funcionalidades do sistema. Lembre-se de manter seu perfil atualizado e responder aos questionários mensalmente. Este tutorial está sempre disponível no menu Configurações caso precise revisá-lo. Que São Judas Tadeu abençoe seu ministério!",
    icon: CheckCircle2
  }
];

interface MinisterTutorialProps {
  onClose: () => void;
  isOpen: boolean;
}

export function MinisterTutorial({ onClose, isOpen }: MinisterTutorialProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);

  const step = tutorialSteps[currentStep];
  const progress = ((currentStep + 1) / tutorialSteps.length) * 100;

  const handleNext = () => {
    if (currentStep < tutorialSteps.length - 1) {
      setIsAnimating(true);
      setTimeout(() => {
        setCurrentStep(currentStep + 1);
        setIsAnimating(false);
      }, 200);
    } else {
      handleFinish();
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setIsAnimating(true);
      setTimeout(() => {
        setCurrentStep(currentStep - 1);
        setIsAnimating(false);
      }, 200);
    }
  };

  const handleFinish = () => {
    // Salvar que o usuário já viu o tutorial
    localStorage.setItem("ministerTutorialCompleted", "true");
    onClose();
  };

  const handleSkip = () => {
    localStorage.setItem("ministerTutorialCompleted", "true");
    onClose();
  };

  useEffect(() => {
    // Salvar o estilo original do overflow
    const originalOverflow = document.body.style.overflow;
    
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = originalOverflow || "unset";
    }

    // Cleanup: restaurar o estilo original quando o componente desmontar ou isOpen mudar
    return () => {
      document.body.style.overflow = originalOverflow || "unset";
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const StepIcon = step.icon;

  return (
    <div className="native-tutorial-shell fixed inset-0 z-50 flex items-center justify-center overflow-hidden px-4">
      {/* Overlay escuro */}
      <div 
        className="absolute inset-0 bg-black/48 backdrop-blur-md dark:bg-black/68"
        onClick={handleSkip}
      />

      {/* Card do Tutorial */}
      <Card className={`native-tutorial-card liquid-glass relative w-full max-w-[22.5rem] min-w-0 overflow-hidden border-0 transition-all duration-200 sm:max-w-lg ${
        isAnimating ? "scale-95 opacity-50" : "scale-100 opacity-100"
      }`}>
        <CardContent className="native-tutorial-scroll overflow-y-auto p-4 sm:p-6">
          {/* Header com botão fechar e pular tutorial */}
          <div className="mb-4 flex items-start justify-between">
            <div className="min-w-0 flex-1">
              {/* Progress Bar */}
              <div className="mb-2">
                <div className="mb-2 flex items-center justify-between gap-3 pr-10 text-sm text-muted-foreground">
                  <span className="shrink-0">Passo {currentStep + 1} de {tutorialSteps.length}</span>
                  <button 
                    onClick={handleSkip}
                    className="min-w-0 truncate text-sm text-muted-foreground underline underline-offset-4 hover:text-foreground"
                  >
                    Pular tutorial
                  </button>
                </div>
                <Progress value={progress} className="h-2" />
              </div>
            </div>
            {/* Botão Fechar posicionado no canto superior direito */}
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-2 top-2 z-10 h-8 w-8 rounded-lg"
              onClick={handleSkip}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Conteúdo do Step */}
          <div className="text-center">
            {/* Ícone */}
            <div className="mb-4 flex justify-center">
              <div className={`liquid-glass-chip flex h-16 w-16 items-center justify-center rounded-full ${
                currentStep === tutorialSteps.length - 1 
                  ? "text-green-700 dark:text-green-300"
                  : "text-burgundy dark:text-text-gold"
              }`}>
                <StepIcon className="h-8 w-8" />
              </div>
            </div>

            {/* Título */}
            <h3 className="mb-3 text-xl font-bold leading-tight text-foreground">
              {step.title}
            </h3>

            {/* Descrição */}
            <p className="mb-6 text-sm leading-relaxed text-muted-foreground sm:text-base">
              {step.description}
            </p>

            {/* Dica adicional para alguns steps */}
            {step.target && currentStep !== tutorialSteps.length - 1 && (
              <div className="liquid-glass-chip mb-6 rounded-lg p-3">
                <div className="flex items-start gap-2">
                  <Info className="mt-0.5 h-4 w-4 flex-shrink-0 text-burgundy dark:text-text-gold" />
                  <p className="text-left text-xs text-muted-foreground">
                    Após o tutorial, você pode acessar esta funcionalidade através do menu lateral.
                  </p>
                </div>
              </div>
            )}

            {/* Informação sobre onde encontrar o tutorial novamente */}
            {currentStep === tutorialSteps.length - 1 && (
              <div className="mb-6 rounded-lg border border-green-500/25 bg-green-50/70 p-3 dark:bg-green-950/20">
                <div className="flex items-start gap-2">
                  <Info className="mt-0.5 h-4 w-4 flex-shrink-0 text-green-700 dark:text-green-300" />
                  <p className="text-left text-xs text-green-900 dark:text-green-100">
                    <strong>Dica:</strong> Você pode rever este tutorial a qualquer momento acessando o menu <strong>Configurações → Tutorial do Sistema</strong> na barra lateral.
                  </p>
                </div>
              </div>
            )}

            {/* Botões de Navegação */}
            <div className="grid grid-cols-2 gap-3">
              <Button
                variant="outline"
                onClick={handlePrevious}
                disabled={currentStep === 0}
                className="min-w-0"
              >
                <ChevronLeft className="h-4 w-4 mr-1" />
                <span className="truncate">Anterior</span>
              </Button>

              {currentStep === tutorialSteps.length - 1 ? (
                <Button
                  onClick={handleFinish}
                  className="min-w-0 border border-green-600 bg-green-600 text-white hover:bg-green-700"
                >
                  <CheckCircle2 className="h-4 w-4 mr-1" />
                  <span className="truncate">Concluir</span>
                </Button>
              ) : (
                <Button
                  onClick={handleNext}
                  className="min-w-0"
                >
                  <span className="truncate">Próximo</span>
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Hook para verificar se deve mostrar o tutorial
export function useShouldShowTutorial() {
  const [shouldShow, setShouldShow] = useState(false);

  useEffect(() => {
    const hasSeenTutorial = localStorage.getItem("ministerTutorialCompleted");
    
    // Mostra o tutorial apenas se nunca foi visto
    if (!hasSeenTutorial) {
      setShouldShow(true);
    }
  }, []);

  return shouldShow;
}
