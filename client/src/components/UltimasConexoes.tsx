/**
 * Componente: Últimas Conexões
 * Header fixo com usuários online/offline em tempo real
 */

import { useState, useEffect, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { useQuery } from '@tanstack/react-query';
import { MessageSquare, Circle } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface UltimaConexao {
  user_id: string;
  nome: string;
  email?: string;
  whatsapp: string | null;
  avatar_url: string | null;
  status: 'online' | 'away' | 'offline';
  last_seen_iso: string;
  last_seen_human: string;
  ultima_funcao?: string;
}

interface UserDetail extends UltimaConexao {
  email_mascarado?: string;
  ultima_escala?: {
    position: number;
    date: string;
    mass_time: string;
  } | null;
}

const STATUS_COLORS = {
  online: '#4CAF50',
  away: '#FFB300',
  offline: '#9CA3AF'
} as const;

export function UltimasConexoes() {
  const [conexoes, setConexoes] = useState<UltimaConexao[]>([]);
  const [socket, setSocket] = useState<Socket | null>(null);
  const [selectedUser, setSelectedUser] = useState<string | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [usePolling, setUsePolling] = useState(false);

  // Query para polling fallback
  const { data: pollingData } = useQuery({
    queryKey: ['/api/header/ultimas-conexoes'],
    queryFn: async () => {
      const res = await fetch('/api/header/ultimas-conexoes?limit=8', {
        credentials: 'include'
      });
      if (!res.ok) throw new Error('Erro ao buscar conexões');
      return res.json();
    },
    enabled: usePolling,
    refetchInterval: 15000 // 15s
  });

  // Query para detalhes do usuário selecionado
  const { data: userDetail } = useQuery<UserDetail>({
    queryKey: ['/api/header/ultimas-conexoes', selectedUser],
    queryFn: async () => {
      const res = await fetch(`/api/header/ultimas-conexoes/${selectedUser}`, {
        credentials: 'include'
      });
      if (!res.ok) throw new Error('Erro ao buscar detalhes');
      return res.json();
    },
    enabled: !!selectedUser
  });

  // Inicializar WebSocket
  useEffect(() => {
    const token = localStorage.getItem('token') || document.cookie
      .split('; ')
      .find(row => row.startsWith('token='))
      ?.split('=')[1];

    if (!token) {
      console.warn('[UltimasConexoes] Token não encontrado, usando polling');
      setUsePolling(true);
      return;
    }

    const newSocket = io({
      path: '/sockets/ultimas-conexoes',
      auth: { token },
      transports: ['websocket', 'polling']
    });

    newSocket.on('connect', () => {
      console.log('[UltimasConexoes] WebSocket conectado');
      setUsePolling(false);
    });

    newSocket.on('update', (data: { type: string; payload: UltimaConexao[] }) => {
      if (data.type === 'update') {
        setConexoes(data.payload);
      }
    });

    newSocket.on('status', (data: {
      event: string;
      user_id: string;
      status: string;
      last_seen_iso: string;
    }) => {
      setConexoes(prev => {
        const updated = [...prev];
        const index = updated.findIndex(u => u.user_id === data.user_id);
        if (index !== -1) {
          updated[index] = {
            ...updated[index],
            status: data.status as 'online' | 'away' | 'offline',
            last_seen_iso: data.last_seen_iso
          };
        }
        return updated;
      });
    });

    newSocket.on('connect_error', (error) => {
      console.error('[UltimasConexoes] Erro de conexão:', error);
      setUsePolling(true);
    });

    newSocket.on('disconnect', () => {
      console.log('[UltimasConexoes] WebSocket desconectado');
    });

    setSocket(newSocket);

    // Heartbeat a cada 30s
    const heartbeatInterval = setInterval(() => {
      if (newSocket.connected) {
        newSocket.emit('heartbeat');
      }
    }, 30000);

    return () => {
      clearInterval(heartbeatInterval);
      newSocket.close();
    };
  }, []);

  // Atualizar com dados de polling quando WebSocket falha
  useEffect(() => {
    if (usePolling && pollingData) {
      setConexoes(pollingData);
    }
  }, [usePolling, pollingData]);

  const handleUserClick = useCallback((userId: string) => {
    setSelectedUser(userId);
    setIsDialogOpen(true);
  }, []);

  const handleWhatsAppClick = useCallback((whatsapp: string | null) => {
    if (!whatsapp) return;

    // Formato E.164: +5511999999999
    const cleanNumber = whatsapp.replace(/\D/g, '');
    window.open(`https://wa.me/${cleanNumber}`, '_blank', 'noopener,noreferrer');
  }, []);

  const getInitials = (nome: string) => {
    const parts = nome.trim().split(' ');
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return nome.substring(0, 2).toUpperCase();
  };

  const truncateName = (nome: string, maxLength = 12) => {
    if (nome.length <= maxLength) return nome;
    return nome.substring(0, maxLength) + '...';
  };

  return (
    <>
      <div className="header-ultimas-conexoes">
        {conexoes.slice(0, 8).map((conexao) => (
          <div
            key={conexao.user_id}
            className="uc-item"
            role="button"
            tabIndex={0}
            onClick={() => handleUserClick(conexao.user_id)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                handleUserClick(conexao.user_id);
              }
            }}
            aria-label={`${conexao.nome} - ${conexao.status}`}
          >
            {/* Status indicator */}
            <Circle
              className="uc-status"
              fill={STATUS_COLORS[conexao.status]}
              style={{ color: STATUS_COLORS[conexao.status] }}
              aria-hidden="true"
            />

            {/* Avatar */}
            {conexao.avatar_url ? (
              <img
                src={conexao.avatar_url}
                alt={conexao.nome}
                className="uc-avatar"
              />
            ) : (
              <div
                className="uc-avatar"
                style={{
                  backgroundColor: 'var(--color-beige-light)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '12px',
                  fontWeight: 600,
                  color: 'var(--color-text-primary)'
                }}
              >
                {getInitials(conexao.nome)}
              </div>
            )}

            {/* Nome */}
            <span
              className="uc-name"
              title={`${conexao.nome} - ${conexao.last_seen_human}`}
              aria-describedby={`tooltip-${conexao.user_id}`}
            >
              {truncateName(conexao.nome)}
            </span>

            {/* WhatsApp */}
            {conexao.whatsapp && (
              <MessageSquare
                className="uc-whatsapp"
                size={16}
                onClick={(e) => {
                  e.stopPropagation();
                  handleWhatsAppClick(conexao.whatsapp);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    e.stopPropagation();
                    handleWhatsAppClick(conexao.whatsapp);
                  }
                }}
                role="button"
                tabIndex={0}
                aria-label={`Abrir WhatsApp de ${conexao.nome}`}
              />
            )}

            {/* Tooltip invisível para acessibilidade */}
            <span
              id={`tooltip-${conexao.user_id}`}
              className="sr-only"
              role="tooltip"
            >
              {conexao.last_seen_human}
            </span>
          </div>
        ))}
      </div>

      {/* Dialog com detalhes do usuário */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Detalhes do Ministro</DialogTitle>
          </DialogHeader>

          {userDetail && (
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                {userDetail.avatar_url ? (
                  <img
                    src={userDetail.avatar_url}
                    alt={userDetail.nome}
                    className="w-16 h-16 rounded-full object-cover"
                  />
                ) : (
                  <div
                    className="w-16 h-16 rounded-full flex items-center justify-center text-xl font-bold"
                    style={{
                      backgroundColor: 'var(--color-beige-light)',
                      color: 'var(--color-text-primary)'
                    }}
                  >
                    {getInitials(userDetail.nome)}
                  </div>
                )}

                <div className="flex-1">
                  <h3 className="text-lg font-semibold">{userDetail.nome}</h3>
                  <p className="text-sm text-muted-foreground">
                    {userDetail.email_mascarado || userDetail.email}
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    <Circle
                      size={10}
                      fill={STATUS_COLORS[userDetail.status]}
                      style={{ color: STATUS_COLORS[userDetail.status] }}
                    />
                    <span className="text-xs capitalize">{userDetail.status}</span>
                    <span className="text-xs text-muted-foreground">
                      • {userDetail.last_seen_human}
                    </span>
                  </div>
                </div>
              </div>

              {userDetail.ultima_escala && (
                <div className="p-3 bg-muted rounded-lg">
                  <p className="text-sm font-medium">Última Escala</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Posição {userDetail.ultima_escala.position} •{' '}
                    {new Date(userDetail.ultima_escala.date).toLocaleDateString('pt-BR')}
                  </p>
                </div>
              )}

              {userDetail.whatsapp && (
                <Button
                  onClick={() => handleWhatsAppClick(userDetail.whatsapp)}
                  className="w-full"
                  variant="default"
                >
                  <MessageSquare className="mr-2 h-4 w-4" />
                  Abrir WhatsApp
                </Button>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
