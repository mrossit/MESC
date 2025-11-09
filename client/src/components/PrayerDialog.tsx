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
                  Alma de Cristo, <span className="font-bold">santificai-me.</span>
                </p>
                <p className="text-sm sm:text-base leading-relaxed text-red-900 dark:text-red-100">
                  Corpo de Cristo, <span className="font-bold">salvai-me.</span>
                </p>
                <p className="text-sm sm:text-base leading-relaxed text-red-900 dark:text-red-100">
                  Sangue de Cristo, <span className="font-bold">inebriai-me.</span>
                </p>
                <p className="text-sm sm:text-base leading-relaxed text-red-900 dark:text-red-100">
                  Água do lado de Cristo, <span className="font-bold">lavai-me.</span>
                </p>
                <p className="text-sm sm:text-base leading-relaxed text-red-900 dark:text-red-100">
                  Paixão de Cristo, <span className="font-bold">confortai-me.</span>
                </p>
                <p className="text-sm sm:text-base leading-relaxed text-red-900 dark:text-red-100">
                  Ó bom Jesus, <span className="font-bold">ouvi-me.</span>
                </p>
                <p className="text-sm sm:text-base leading-relaxed text-red-900 dark:text-red-100">
                  Dentro de Vossas chagas, <span className="font-bold">escondei-me.</span>
                </p>
                <p className="text-sm sm:text-base leading-relaxed text-red-900 dark:text-red-100">
                  <span className="font-bold">Não permitais que me separe de Vós.</span>
                </p>
                <p className="text-sm sm:text-base leading-relaxed text-red-900 dark:text-red-100">
                  Do espírito maligno, <span className="font-bold">defendei-me.</span>
                </p>
                <p className="text-sm sm:text-base leading-relaxed text-red-900 dark:text-red-100">
                  Na hora da minha morte, <span className="font-bold">chamai-me</span>
                </p>
                <p className="text-sm sm:text-base leading-relaxed text-red-900 dark:text-red-100">
                  <span className="font-bold">e mandai-me ir para Vós,</span>
                </p>
                <p className="text-sm sm:text-base leading-relaxed text-red-900 dark:text-red-100">
                  <span className="font-bold">para que com os vossos Santos Vos louve</span>
                </p>
                <p className="text-sm sm:text-base leading-relaxed text-red-900 dark:text-red-100">
                  <span className="font-bold">por todos os séculos dos séculos.</span>
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
