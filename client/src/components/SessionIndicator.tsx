import { useEffect, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Clock, AlertTriangle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

/**
 * Componente que mostra indicador visual quando a sessão está próxima de expirar
 * - Mostra aviso quando faltam 2 minutos ou menos
 * - Badge com contador regressivo
 * - Alert visual chamativo
 */
export function SessionIndicator() {
  const [minutesRemaining, setMinutesRemaining] = useState<number | null>(null);
  const [showWarning, setShowWarning] = useState(false);

  useEffect(() => {
    const checkSession = async () => {
      const sessionToken = localStorage.getItem('session_token');

      if (!sessionToken) {
        setMinutesRemaining(null);
        setShowWarning(false);
        return;
      }

      try {
        const response = await fetch('/api/session/verify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sessionToken }),
          credentials: 'include'
        });

        const data = await response.json();

        if (!data.expired && data.minutesRemaining !== undefined) {
          setMinutesRemaining(data.minutesRemaining);
          setShowWarning(data.minutesRemaining <= 2); // Mostra aviso com 2min ou menos
        } else {
          setMinutesRemaining(null);
          setShowWarning(false);
        }

      } catch (error) {
        console.error('[SESSION INDICATOR] Erro ao verificar sessão:', error);
        // Em caso de erro, não mostra indicador
        setMinutesRemaining(null);
        setShowWarning(false);
      }
    };

    // Verifica a cada 15 segundos (mais frequente que o monitor principal)
    const interval = setInterval(checkSession, 15000);
    checkSession(); // Verifica imediatamente

    return () => clearInterval(interval);
  }, []);

  // Não mostra nada se não estiver próximo de expirar
  if (minutesRemaining === null || minutesRemaining > 2) {
    return null;
  }

  return (
    <div className="fixed top-4 right-4 z-50 space-y-2">
      {/* Badge compacto */}
      <Badge
        variant={showWarning ? 'destructive' : 'secondary'}
        className="flex items-center gap-2 px-3 py-2 shadow-lg"
      >
        <Clock className="h-4 w-4 animate-pulse" />
        <span className="font-semibold">
          {minutesRemaining === 0
            ? 'Expirando...'
            : `Sessão expira em ${minutesRemaining} min`
          }
        </span>
      </Badge>

      {/* Alert visual quando crítico (< 1min) */}
      {minutesRemaining < 1 && (
        <Alert variant="destructive" className="shadow-xl animate-pulse">
          <AlertTriangle className="h-5 w-5" />
          <AlertTitle>Atenção!</AlertTitle>
          <AlertDescription>
            Sua sessão está expirando. Clique em qualquer lugar para continuar conectado.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}
