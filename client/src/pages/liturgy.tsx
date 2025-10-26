/**
 * Daily Liturgy Page
 * Embedded liturgy from Padre Paulo Ricardo website
 */

import { BookOpen, Home } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useLocation } from 'wouter';

export default function LiturgyPage() {
  const [, setLocation] = useLocation();

  return (
    <div className="flex flex-col h-screen">
      {/* Header */}
      <div className="bg-background border-b px-4 py-3 flex items-center justify-between">
        <Button variant="ghost" onClick={() => setLocation('/dashboard')}>
          <Home className="h-4 w-4 mr-2" />
          Voltar ao Dashboard
        </Button>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <BookOpen className="h-4 w-4" />
          <span>Liturgia do Dia</span>
        </div>
      </div>

      {/* Iframe com o site completo */}
      <div className="flex-1 relative">
        <iframe
          src="https://padrepauloricardo.org/liturgia"
          className="w-full h-full border-0"
          title="Liturgia Diária - Padre Paulo Ricardo"
          allow="fullscreen"
        />
      </div>

      {/* Footer com créditos */}
      <div className="bg-muted/50 border-t px-4 py-2 text-center text-xs text-muted-foreground">
        <p>
          Conteúdo litúrgico e homilias fornecidos por{' '}
          <a
            href="https://padrepauloricardo.org"
            target="_blank"
            rel="noopener noreferrer"
            className="underline hover:text-foreground transition-colors"
          >
            Padre Paulo Ricardo
          </a>
          {' • '}
          Todos os direitos reservados ao autor
        </p>
      </div>
    </div>
  );
}
