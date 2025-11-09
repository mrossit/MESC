import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Heart } from "lucide-react";

interface PrayerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function PrayerDialog({ open, onOpenChange }: PrayerDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-w-[calc(100vw-1rem)] w-[calc(100vw-1rem)] sm:w-full mx-auto p-4 sm:p-6">
        <DialogHeader>
          <DialogTitle className="text-lg sm:text-xl flex items-center gap-2 text-center justify-center">
            <Heart className="h-5 w-5 text-red-600" />
            Oração Alma de Cristo
          </DialogTitle>
          <DialogDescription className="text-sm text-center">
            Oração dos Ministros Extraordinários da Sagrada Comunhão
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[70vh] pr-4">
          <div className="space-y-4">
            {/* Oração */}
            <div className="p-6 bg-gradient-to-br from-red-50 to-rose-50 dark:from-red-950/20 dark:to-rose-950/20 border-2 border-red-200 dark:border-red-800 rounded-lg">
              <div className="space-y-3 text-center">
                <p className="text-sm sm:text-base leading-relaxed text-red-900 dark:text-red-100">
                  Alma de Cristo, santificai-me.
                </p>
                <p className="text-sm sm:text-base leading-relaxed text-red-900 dark:text-red-100">
                  Corpo de Cristo, salvai-me.
                </p>
                <p className="text-sm sm:text-base leading-relaxed text-red-900 dark:text-red-100">
                  Sangue de Cristo, inebriai-me.
                </p>
                <p className="text-sm sm:text-base leading-relaxed text-red-900 dark:text-red-100">
                  Água do lado de Cristo, lavai-me.
                </p>
                <p className="text-sm sm:text-base leading-relaxed text-red-900 dark:text-red-100">
                  Paixão de Cristo, confortai-me.
                </p>
                <p className="text-sm sm:text-base leading-relaxed text-red-900 dark:text-red-100">
                  Ó bom Jesus, ouvi-me.
                </p>
                <p className="text-sm sm:text-base leading-relaxed text-red-900 dark:text-red-100">
                  Dentro de Vossas chagas, escondei-me.
                </p>
                <p className="text-sm sm:text-base leading-relaxed text-red-900 dark:text-red-100">
                  Não permitais que me separe de Vós.
                </p>
                <p className="text-sm sm:text-base leading-relaxed text-red-900 dark:text-red-100">
                  Do espírito maligno, defendei-me.
                </p>
                <p className="text-sm sm:text-base leading-relaxed text-red-900 dark:text-red-100">
                  Na hora da minha morte, chamai-me
                </p>
                <p className="text-sm sm:text-base leading-relaxed text-red-900 dark:text-red-100">
                  e mandai-me ir para Vós,
                </p>
                <p className="text-sm sm:text-base leading-relaxed text-red-900 dark:text-red-100">
                  para que com os vossos Santos Vos louve
                </p>
                <p className="text-sm sm:text-base leading-relaxed text-red-900 dark:text-red-100">
                  por todos os séculos dos séculos.
                </p>
                <p className="text-base sm:text-lg font-bold leading-relaxed text-red-900 dark:text-red-100 mt-4">
                  Amém.
                </p>
              </div>
            </div>

            {/* Nota inspiradora */}
            <div className="p-4 bg-blue-50 dark:bg-blue-950/30 border-2 border-blue-300 dark:border-blue-700 rounded-lg">
              <p className="text-xs sm:text-sm text-blue-900 dark:text-blue-100 text-center italic">
                "Rezemos sempre esta oração antes de servir ao Senhor, preparando nosso coração para recebê-Lo e distribuí-Lo aos nossos irmãos."
              </p>
            </div>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
