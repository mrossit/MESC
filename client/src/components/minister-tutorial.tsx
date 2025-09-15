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
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Overlay escuro */}
      <div 
        className="absolute inset-0 bg-black/70"
        onClick={handleSkip}
      />

      {/* Card do Tutorial */}
      <Card className={`relative w-full max-w-lg mx-4 shadow-2xl border-neutral-accentWarm/30 dark:border-gray-700 bg-white dark:bg-gray-900 transition-all duration-200 ${
        isAnimating ? "scale-95 opacity-50" : "scale-100 opacity-100"
      }`}>
        <CardContent className="p-6">
          {/* Header com botão fechar e pular tutorial */}
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1">
              {/* Progress Bar */}
              <div className="mb-2">
                <div className="flex items-center justify-between text-sm text-mesc-text/60 mb-2">
                  <span>Passo {currentStep + 1} de {tutorialSteps.length}</span>
                  <button 
                    onClick={handleSkip}
                    className="text-mesc-text/60 hover:text-mesc-text underline text-sm mr-8"
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
              className="absolute right-2 top-2 z-10 hover:bg-gray-100"
              onClick={handleSkip}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Conteúdo do Step */}
          <div className="text-center">
            {/* Ícone */}
            <div className="flex justify-center mb-4">
              <div className={`w-16 h-16 rounded-full flex items-center justify-center ${
                currentStep === tutorialSteps.length - 1 
                  ? "bg-green-100 dark:bg-green-900/20" 
                  : "bg-neutral-accentWarm/20 dark:bg-amber-900/20"
              }`}>
                <StepIcon className={`h-8 w-8 ${
                  currentStep === tutorialSteps.length - 1 
                    ? "text-green-600 dark:text-green-400" 
                    : "text-neutral-accentWarm dark:text-amber-500"
                }`} />
              </div>
            </div>

            {/* Título */}
            <h3 className="text-xl font-bold text-mesc-text mb-3">
              {step.title}
            </h3>

            {/* Descrição */}
            <p className="text-mesc-text/70 leading-relaxed mb-6">
              {step.description}
            </p>

            {/* Dica adicional para alguns steps */}
            {step.target && currentStep !== tutorialSteps.length - 1 && (
              <div className="bg-muted/30 rounded-lg p-3 mb-6">
                <div className="flex items-start gap-2">
                  <Info className="h-4 w-4 text-neutral-accentWarm dark:text-amber-500 mt-0.5 flex-shrink-0" />
                  <p className="text-xs text-mesc-text/60 text-left">
                    Após o tutorial, você pode acessar esta funcionalidade através do menu lateral.
                  </p>
                </div>
              </div>
            )}

            {/* Informação sobre onde encontrar o tutorial novamente */}
            {currentStep === tutorialSteps.length - 1 && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-6">
                <div className="flex items-start gap-2">
                  <Info className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                  <p className="text-xs text-green-800 text-left">
                    <strong>Dica:</strong> Você pode rever este tutorial a qualquer momento acessando o menu <strong>Configurações → Tutorial do Sistema</strong> na barra lateral.
                  </p>
                </div>
              </div>
            )}

            {/* Botões de Navegação */}
            <div className="flex items-center justify-between gap-3">
              <Button
                variant="outline"
                onClick={handlePrevious}
                disabled={currentStep === 0}
                className="flex-1 font-semibold shadow-md border-2 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                <ChevronLeft className="h-4 w-4 mr-1" />
                Anterior
              </Button>

              {currentStep === tutorialSteps.length - 1 ? (
                <Button
                  onClick={handleFinish}
                  className="flex-1 bg-green-600 hover:bg-green-700 text-gray-900 dark:text-white font-semibold shadow-lg border border-green-500"
                >
                  <CheckCircle2 className="h-4 w-4 mr-1" />
                  Concluir
                </Button>
              ) : (
                <Button
                  onClick={handleNext}
                  className="flex-1 bg-neutral-accentWarm dark:bg-amber-700 hover:bg-neutral-accentWarm/90 dark:hover:bg-amber-600 text-gray-900 dark:text-white font-semibold shadow-lg border border-amber-500"
                >
                  Próximo
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