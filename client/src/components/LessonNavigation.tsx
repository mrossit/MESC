import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, List } from "lucide-react";
import { cn } from "@/lib/utils";

interface LessonNavigationProps {
  prevLesson?: {
    title: string;
    lessonNumber: number;
  } | null;
  nextLesson?: {
    title: string;
    lessonNumber: number;
  } | null;
  onPrev?: () => void;
  onNext?: () => void;
  onBackToModule?: () => void;
  className?: string;
  position?: "fixed" | "relative";
}

export function LessonNavigation({
  prevLesson,
  nextLesson,
  onPrev,
  onNext,
  onBackToModule,
  className,
  position = "relative"
}: LessonNavigationProps) {

  // Navegação por teclado
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      // Alt + Seta Esquerda = Voltar
      if (e.altKey && e.key === 'ArrowLeft' && onPrev && prevLesson) {
        e.preventDefault();
        onPrev();
      }

      // Alt + Seta Direita = Próxima
      if (e.altKey && e.key === 'ArrowRight' && onNext && nextLesson) {
        e.preventDefault();
        onNext();
      }

      // Alt + M = Voltar ao módulo
      if (e.altKey && e.key === 'm' && onBackToModule) {
        e.preventDefault();
        onBackToModule();
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [prevLesson, nextLesson, onPrev, onNext, onBackToModule]);

  const isFixed = position === "fixed";

  return (
    <div
      className={cn(
        "bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border rounded-lg",
        isFixed && "fixed bottom-4 left-4 right-4 z-50 shadow-lg max-w-4xl mx-auto md:bottom-4 bottom-20",
        className
      )}
    >
      <div className="p-3 sm:p-4">
        <div className="flex items-center justify-between gap-2">
          {/* Botão Voltar */}
          <div className="flex-1">
            {prevLesson ? (
              <Button
                variant="outline"
                size="sm"
                onClick={onPrev}
                className="w-full justify-start"
                title="Voltar para aula anterior (Alt + ←)"
              >
                <ChevronLeft className="h-4 w-4 mr-1 flex-shrink-0" />
                <span className="truncate hidden sm:inline">
                  {prevLesson.title}
                </span>
                <span className="truncate sm:hidden">
                  Anterior
                </span>
              </Button>
            ) : (
              <Button
                variant="outline"
                size="sm"
                onClick={onBackToModule}
                className="w-full justify-start"
                title="Voltar ao módulo (Alt + M)"
              >
                <List className="h-4 w-4 mr-1 flex-shrink-0" />
                <span className="truncate hidden sm:inline">
                  Voltar ao módulo
                </span>
                <span className="truncate sm:hidden">
                  Módulo
                </span>
              </Button>
            )}
          </div>

          {/* Indicador central */}
          <div className="text-xs text-muted-foreground px-2 hidden md:block whitespace-nowrap">
            Use Alt + ← / →
          </div>

          {/* Botão Próxima */}
          <div className="flex-1">
            {nextLesson ? (
              <Button
                variant="default"
                size="sm"
                onClick={onNext}
                className="w-full justify-end"
                title="Próxima aula (Alt + →)"
              >
                <span className="truncate hidden sm:inline">
                  {nextLesson.title}
                </span>
                <span className="truncate sm:hidden">
                  Próxima
                </span>
                <ChevronRight className="h-4 w-4 ml-1 flex-shrink-0" />
              </Button>
            ) : (
              <Button
                variant="outline"
                size="sm"
                disabled
                className="w-full justify-end"
              >
                <span className="truncate">Última aula</span>
              </Button>
            )}
          </div>
        </div>

        {/* Dica de teclado mobile */}
        <div className="text-xs text-center text-muted-foreground mt-2 md:hidden">
          Deslize ou use os botões para navegar
        </div>
      </div>
    </div>
  );
}
