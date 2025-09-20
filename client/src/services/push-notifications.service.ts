// Serviço de Push Notifications
import { api } from './api';

interface PushSubscriptionData {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}

class PushNotificationService {
  private swRegistration: ServiceWorkerRegistration | null = null;
  private isSupported: boolean = false;

  constructor() {
    this.isSupported = 'serviceWorker' in navigator && 'PushManager' in window;
  }

  // Inicializa o serviço
  async initialize(): Promise<void> {
    if (!this.isSupported) {
      console.warn('Push Notifications não são suportadas neste navegador');
      return;
    }

    try {
      // Registra o Service Worker
      const registration = await navigator.serviceWorker.register('/service-worker.js');
      this.swRegistration = registration;
      console.log('Service Worker registrado com sucesso');

      // Aguarda o SW ficar pronto
      await navigator.serviceWorker.ready;

      // Verifica o status da permissão
      const permission = await this.getPermissionStatus();

      if (permission === 'granted') {
        await this.subscribeUser();
      }

      // Escuta mudanças no SW
      this.listenToServiceWorkerUpdates();

    } catch (error) {
      console.error('Erro ao inicializar Push Notifications:', error);
    }
  }

  // Solicita permissão para notificações
  async requestPermission(): Promise<NotificationPermission> {
    if (!this.isSupported) {
      return 'denied';
    }

    try {
      const permission = await Notification.requestPermission();

      if (permission === 'granted') {
        await this.subscribeUser();
        this.showLocalNotification(
          'Notificações Ativadas',
          'Você receberá notificações importantes do sistema MESC'
        );
      }

      return permission;
    } catch (error) {
      console.error('Erro ao solicitar permissão:', error);
      return 'denied';
    }
  }

  // Obtém o status atual da permissão
  async getPermissionStatus(): Promise<NotificationPermission> {
    if (!this.isSupported) {
      return 'denied';
    }

    return Notification.permission;
  }

  // Inscreve o usuário para receber push
  private async subscribeUser(): Promise<void> {
    if (!this.swRegistration) {
      throw new Error('Service Worker não registrado');
    }

    try {
      // Obtém a chave pública do servidor
      const vapidPublicKey = await this.getVapidPublicKey();
      const convertedVapidKey = this.urlBase64ToUint8Array(vapidPublicKey);

      // Cria a inscrição
      const subscription = await this.swRegistration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: convertedVapidKey
      });

      // Envia a inscrição para o servidor
      await this.sendSubscriptionToServer(subscription);

      console.log('Usuário inscrito para Push Notifications');
    } catch (error) {
      console.error('Erro ao inscrever usuário:', error);
    }
  }

  // Cancela a inscrição do usuário
  async unsubscribeUser(): Promise<void> {
    if (!this.swRegistration) {
      return;
    }

    try {
      const subscription = await this.swRegistration.pushManager.getSubscription();

      if (subscription) {
        await subscription.unsubscribe();
        await this.removeSubscriptionFromServer(subscription.endpoint);
        console.log('Usuário desinscrito das Push Notifications');
      }
    } catch (error) {
      console.error('Erro ao desinscrever usuário:', error);
    }
  }

  // Obtém a chave VAPID pública do servidor
  private async getVapidPublicKey(): Promise<string> {
    try {
      const response = await api.get('/api/push/vapid-public-key');
      return response.data.publicKey;
    } catch (error) {
      console.error('Erro ao obter chave VAPID:', error);
      // Chave padrão para desenvolvimento (deve ser substituída em produção)
      return 'BKd0bW2m5vN3PK8AqhWxGT6yLgJKBZNFPQpHPQcJZtAwVmKwLZGDVi8NjK9rAJF0RhtT2k-zCf0fVTfPKVrU2cY';
    }
  }

  // Envia a inscrição para o servidor
  private async sendSubscriptionToServer(subscription: PushSubscription): Promise<void> {
    const subscriptionData: PushSubscriptionData = {
      endpoint: subscription.endpoint,
      keys: {
        p256dh: this.arrayBufferToBase64(subscription.getKey('p256dh')!),
        auth: this.arrayBufferToBase64(subscription.getKey('auth')!)
      }
    };

    try {
      await api.post('/api/push/subscribe', subscriptionData);
      console.log('Inscrição enviada ao servidor');
    } catch (error) {
      console.error('Erro ao enviar inscrição:', error);
    }
  }

  // Remove a inscrição do servidor
  private async removeSubscriptionFromServer(endpoint: string): Promise<void> {
    try {
      await api.post('/api/push/unsubscribe', { endpoint });
      console.log('Inscrição removida do servidor');
    } catch (error) {
      console.error('Erro ao remover inscrição:', error);
    }
  }

  // Mostra uma notificação local
  async showLocalNotification(title: string, body: string, options?: NotificationOptions): Promise<void> {
    if (!this.swRegistration || Notification.permission !== 'granted') {
      return;
    }

    const defaultOptions: NotificationOptions = {
      icon: '/icon-192x192.png',
      badge: '/badge-72x72.png',
      vibrate: [200, 100, 200],
      timestamp: Date.now(),
      requireInteraction: false,
      ...options
    };

    try {
      await this.swRegistration.showNotification(title, {
        body,
        ...defaultOptions
      });
    } catch (error) {
      console.error('Erro ao mostrar notificação:', error);
    }
  }

  // Envia notificação para usuário específico (via servidor)
  async sendPushToUser(userId: string, notification: {
    title: string;
    body: string;
    type?: string;
    data?: any;
  }): Promise<void> {
    try {
      await api.post('/api/push/send', {
        userId,
        notification
      });
      console.log('Notificação enviada para usuário:', userId);
    } catch (error) {
      console.error('Erro ao enviar notificação:', error);
    }
  }

  // Envia notificação para múltiplos usuários
  async sendPushToUsers(userIds: string[], notification: {
    title: string;
    body: string;
    type?: string;
    data?: any;
  }): Promise<void> {
    try {
      await api.post('/api/push/send-multiple', {
        userIds,
        notification
      });
      console.log('Notificação enviada para', userIds.length, 'usuários');
    } catch (error) {
      console.error('Erro ao enviar notificações:', error);
    }
  }

  // Envia notificação para um grupo/role
  async sendPushToRole(role: string, notification: {
    title: string;
    body: string;
    type?: string;
    data?: any;
  }): Promise<void> {
    try {
      await api.post('/api/push/send-role', {
        role,
        notification
      });
      console.log('Notificação enviada para role:', role);
    } catch (error) {
      console.error('Erro ao enviar notificação para role:', error);
    }
  }

  // Sincroniza notificações pendentes
  async syncPendingNotifications(): Promise<void> {
    if (!this.swRegistration) {
      return;
    }

    try {
      await (this.swRegistration as any).sync.register('sync-notifications');
      console.log('Sincronização de notificações agendada');
    } catch (error) {
      console.error('Erro ao agendar sincronização:', error);
    }
  }

  // Escuta atualizações do Service Worker
  private listenToServiceWorkerUpdates(): void {
    if (!this.swRegistration) {
      return;
    }

    // Quando uma nova versão está disponível
    this.swRegistration.addEventListener('updatefound', () => {
      const newWorker = this.swRegistration!.installing;

      if (newWorker) {
        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            // Nova versão disponível
            this.showUpdateAvailable();
          }
        });
      }
    });
  }

  // Mostra que há uma atualização disponível
  private showUpdateAvailable(): void {
    this.showLocalNotification(
      'Atualização Disponível',
      'Uma nova versão do aplicativo está disponível. Clique para atualizar.',
      {
        requireInteraction: true,
        tag: 'update-available',
        data: {
          action: 'update'
        }
      }
    );
  }

  // Força a atualização do Service Worker
  async updateServiceWorker(): Promise<void> {
    if (!this.swRegistration) {
      return;
    }

    try {
      await this.swRegistration.update();

      // Envia mensagem para o SW pular a espera
      if (navigator.serviceWorker.controller) {
        navigator.serviceWorker.controller.postMessage({
          type: 'SKIP_WAITING'
        });
      }

      // Recarrega a página
      window.location.reload();
    } catch (error) {
      console.error('Erro ao atualizar Service Worker:', error);
    }
  }

  // Limpa o cache
  async clearCache(): Promise<void> {
    if (!navigator.serviceWorker.controller) {
      return;
    }

    navigator.serviceWorker.controller.postMessage({
      type: 'CLEAR_CACHE'
    });
  }

  // Utilitários
  private urlBase64ToUint8Array(base64String: string): Uint8Array {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
      .replace(/-/g, '+')
      .replace(/_/g, '/');

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  }

  private arrayBufferToBase64(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    bytes.forEach((byte) => {
      binary += String.fromCharCode(byte);
    });
    return window.btoa(binary);
  }

  // Verifica se o navegador suporta notificações
  isNotificationSupported(): boolean {
    return this.isSupported;
  }

  // Obtém a inscrição atual
  async getCurrentSubscription(): Promise<PushSubscription | null> {
    if (!this.swRegistration) {
      return null;
    }

    return await this.swRegistration.pushManager.getSubscription();
  }
}

// Exporta instância única
export const pushNotificationService = new PushNotificationService();

// Tipos de notificação
export enum NotificationType {
  SCHEDULE = 'schedule',
  SUBSTITUTION = 'substitution',
  REMINDER = 'reminder',
  ANNOUNCEMENT = 'announcement',
  FORMATION = 'formation',
  APPROVAL = 'approval',
  SYSTEM = 'system'
}

// Interface para notificação estruturada
export interface StructuredNotification {
  title: string;
  body: string;
  type: NotificationType;
  icon?: string;
  badge?: string;
  image?: string;
  vibrate?: number[];
  requireInteraction?: boolean;
  actions?: NotificationAction[];
  data?: {
    url?: string;
    id?: string;
    [key: string]: any;
  };
}