/**
 * WebSocket Hook for Real-time Notifications
 * Connects to WebSocket server and handles real-time updates
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { authAPI } from '@/lib/auth';
import { useToast } from '@/hooks/use-toast';

interface WebSocketMessage {
  type: 'SUBSTITUTION_REQUEST' | 'CRITICAL_MASS' | 'ALERT_UPDATE' | 'PING';
  data?: any;
  timestamp: string;
}

interface UseWebSocketOptions {
  onSubstitutionRequest?: (data: any) => void;
  onCriticalMass?: (data: any) => void;
  onAlertUpdate?: (data: any) => void;
  enabled?: boolean;
}

export function useWebSocket(options: UseWebSocketOptions = {}) {
  const { data: authData } = useQuery({
    queryKey: ["/api/auth/me"],
    queryFn: () => authAPI.getMe(),
  });
  const user = authData?.user;
  const { toast } = useToast();
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>();
  const reconnectAttemptsRef = useRef(0);
  const debounceTimeoutRef = useRef<NodeJS.Timeout>();
  const [isConnected, setIsConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState<WebSocketMessage | null>(null);

  const { onSubstitutionRequest, onCriticalMass, onAlertUpdate, enabled = true } = options;

  // Debounced setIsConnected to prevent rapid UI updates
  const setIsConnectedDebounced = useCallback((connected: boolean) => {
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }
    debounceTimeoutRef.current = setTimeout(() => {
      setIsConnected(connected);
    }, 1000); // 1 second debounce
  }, []);

  const connect = useCallback(() => {
    if (!user || !enabled) return;
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    // Max 3 reconnection attempts
    if (reconnectAttemptsRef.current >= 3) {
      console.log('[WS] Max reconnection attempts reached');
      return;
    }

    // Determine WebSocket URL
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host;
    const wsUrl = `${protocol}//${host}/ws`;


    try {
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        // Reset reconnection attempts on successful connection
        reconnectAttemptsRef.current = 0;
        setIsConnectedDebounced(true);

        // Authenticate with user info
        ws.send(JSON.stringify({
          type: 'AUTH',
          userId: user.id,
          userRole: user.role
        }));
      };

      ws.onmessage = (event) => {
        try {
          const message: WebSocketMessage = JSON.parse(event.data);
          setLastMessage(message);


          switch (message.type) {
            case 'SUBSTITUTION_REQUEST':
              if (onSubstitutionRequest) {
                onSubstitutionRequest(message.data);
              }
              // Show toast notification
              if (user.role === 'coordenador' || user.role === 'gestor') {
                toast({
                  title: "Nova Solicitação de Substituição",
                  description: `${message.data.requestingUser.name} solicitou substituição`,
                  variant: "default",
                });
              }
              break;

            case 'CRITICAL_MASS':
              if (onCriticalMass) {
                onCriticalMass(message.data);
              }
              // Show critical toast
              if (user.role === 'coordenador' || user.role === 'gestor') {
                toast({
                  title: "Atenção: Missa Crítica",
                  description: `Missa em ${message.data.hoursUntil}h sem ministros`,
                  variant: "destructive",
                });
              }
              break;

            case 'ALERT_UPDATE':
              if (onAlertUpdate) {
                onAlertUpdate(message.data);
              }
              break;

            case 'PING':
              // Respond to ping
              ws.send(JSON.stringify({ type: 'PONG' }));
              break;
          }
        } catch (error) {
          console.error('[WS] Error processing message:', error);
        }
      };

      ws.onerror = (error) => {
        console.error('[WS] Error:', error);
        setIsConnectedDebounced(false);
      };

      ws.onclose = () => {
        setIsConnectedDebounced(false);
        wsRef.current = null;

        // Exponential backoff: 5min, 10min, 15min (300000ms, 600000ms, 900000ms)
        if (enabled && reconnectAttemptsRef.current < 3) {
          reconnectAttemptsRef.current += 1;
          const backoffTime = 300000 * reconnectAttemptsRef.current; // 5min * attempt number

          console.log(`[WS] Reconnecting in ${backoffTime / 1000}s (attempt ${reconnectAttemptsRef.current}/3)`);

          reconnectTimeoutRef.current = setTimeout(() => {
            connect();
          }, backoffTime);
        } else if (reconnectAttemptsRef.current >= 3) {
          console.log('[WS] Max reconnection attempts reached, giving up');
        }
      };
    } catch (error) {
      console.error('[WS] Connection error:', error);
      setIsConnectedDebounced(false);
    }
  }, [user, enabled, onSubstitutionRequest, onCriticalMass, onAlertUpdate, toast, setIsConnectedDebounced]);

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    setIsConnected(false);
    reconnectAttemptsRef.current = 0; // Reset attempts on manual disconnect
  }, []);

  const sendMessage = useCallback((message: any) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message));
    }
  }, []);

  useEffect(() => {
    connect();

    return () => {
      disconnect();
    };
  }, [connect, disconnect]);

  return {
    isConnected,
    lastMessage,
    sendMessage,
    reconnect: connect,
    disconnect
  };
}
