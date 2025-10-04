import { useState, useEffect, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useUser } from '@/hooks/use-user';

interface UltimaConexao {
  user_id: string;
  nome: string;
  avatar_url: string | null;
  whatsapp: string | null;
  email: string;
  status: 'online' | 'offline';
  last_seen_iso: string;
  last_seen_human: string;
}

const POLLING_INTERVAL = 15000; // 15s

export function HeaderUltimasConexoes() {
  const { user } = useUser();
  const [wsConnected, setWsConnected] = useState(false);
  const [connections, setConnections] = useState<UltimaConexao[]>([]);

  // Query com polling fallback
  const { data: queryData } = useQuery<UltimaConexao[]>({
    queryKey: ['/api/header/ultimas-conexoes'],
    queryFn: async () => {
      const res = await fetch('/api/header/ultimas-conexoes?limit=3', {
        credentials: 'include'
      });
      if (!res.ok) throw new Error('Erro ao buscar últimas conexões');
      return res.json();
    },
    enabled: !!user && !wsConnected, // Só faz polling se WebSocket não conectado
    refetchInterval: POLLING_INTERVAL,
  });

  // Conectar WebSocket
  useEffect(() => {
    if (!user) return;

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/sockets/ultimas-conexoes`;
    
    let ws: WebSocket;
    let reconnectTimeout: NodeJS.Timeout;

    const connect = () => {
      try {
        ws = new WebSocket(wsUrl);

        ws.onopen = () => {
          console.log('[UC-WS] Conectado');
          setWsConnected(true);
        };

        ws.onmessage = (event) => {
          try {
            const message = JSON.parse(event.data);
            if (message.type === 'update' && message.payload) {
              setConnections(message.payload);
            }
          } catch (error) {
            console.error('[UC-WS] Erro ao processar mensagem:', error);
          }
        };

        ws.onerror = (error) => {
          console.error('[UC-WS] Erro:', error);
        };

        ws.onclose = () => {
          console.log('[UC-WS] Desconectado, tentando reconectar...');
          setWsConnected(false);
          
          // Tentar reconectar após 5s
          reconnectTimeout = setTimeout(connect, 5000);
        };
      } catch (error) {
        console.error('[UC-WS] Erro ao conectar:', error);
        setWsConnected(false);
      }
    };

    connect();

    return () => {
      if (ws) {
        ws.close();
      }
      if (reconnectTimeout) {
        clearTimeout(reconnectTimeout);
      }
    };
  }, [user]);

  // Usar dados do WebSocket se conectado, senão usar polling
  const displayData = (wsConnected ? connections : (queryData || [])).slice(0, 3);

  // Não renderizar se usuário não estiver logado
  if (!user) {
    return null;
  }

  return (
    <div className="header-ultimas-conexoes-wrapper">
      <div className="header-ultimas-conexoes">
        {displayData.length === 0 ? (
          // Placeholder quando não há dados
          <div className="text-xs text-muted-foreground italic">
            Nenhuma conexão recente
          </div>
        ) : (
          displayData.map((conn) => (
        <div
          key={conn.user_id}
          className="uc-item-circular"
          title={`${conn.nome} - ${conn.status === 'online' ? 'Online' : 'Offline'}`}
          role="button"
          tabIndex={0}
          aria-label={`${conn.nome}, ${conn.status === 'online' ? 'online' : 'offline'} ${conn.last_seen_human}`}
        >
          <div className="uc-ring">
            <div className={`uc-avatar-wrapper ${conn.status}`}>
              {conn.avatar_url ? (
                <img
                  src={conn.avatar_url}
                  alt={conn.nome}
                  className="uc-avatar-img"
                />
              ) : (
                <div className="uc-avatar-placeholder">
                  {conn.nome.charAt(0).toUpperCase()}
                </div>
              )}
            </div>
          </div>
          {conn.whatsapp && (
            <a
              href={`https://api.whatsapp.com/send/?phone=${conn.whatsapp}`}
              target="_blank"
              rel="noopener noreferrer"
              className="uc-whatsapp-link"
              title={`Enviar mensagem para ${conn.nome}`}
              onClick={(e) => e.stopPropagation()}
            >
              <svg
                className="uc-whatsapp-icon"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="currentColor"
              >
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
              </svg>
            </a>
          )}
        </div>
        ))
      )}
      </div>
    </div>
  );
}
