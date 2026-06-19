import { Volume2, VolumeX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSoundPreference } from "@/hooks/useSoundPreference";
import { cn } from "@/lib/utils";

interface SoundToggleProps {
  className?: string;
}

export function SoundToggle({ className }: SoundToggleProps) {
  const { soundEnabled, toggleSound } = useSoundPreference();
  const Icon = soundEnabled ? Volume2 : VolumeX;

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      className={cn("h-9 w-9 opacity-70 transition-opacity hover:opacity-100", className)}
      onClick={toggleSound}
      aria-pressed={soundEnabled}
      aria-label={soundEnabled ? "Desativar som dos alertas" : "Ativar som dos alertas"}
      title={soundEnabled ? "Som ativo" : "Som desativado"}
      data-testid="button-sound-toggle"
    >
      <Icon className={cn("h-5 w-5", soundEnabled ? "text-emerald-600" : "text-muted-foreground")} />
      <span className="sr-only">{soundEnabled ? "Som ativo" : "Som desativado"}</span>
    </Button>
  );
}
