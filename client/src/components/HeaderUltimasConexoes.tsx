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

  // Não renderizar se não houver dados
  if (!user || displayData.length === 0) {
    return null;
  }

  return (
    <div className="header-ultimas-conexoes">
      {displayData.map((conn) => (
        <div
          key={conn.user_id}
          className="uc-item-circular"
          title={`${conn.nome} - ${conn.status === 'online' ? 'Online' : 'Offline'}`}
        >
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
      ))}
    </div>
  );
}
