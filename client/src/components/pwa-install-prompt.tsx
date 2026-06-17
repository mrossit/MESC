import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Download, X } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

export function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [location] = useLocation();
  const hiddenOnPublicRoutes = ['/login', '/register', '/change-password'].some((route) =>
    location.startsWith(route)
  );

  useEffect(() => {
    // Check if app is already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
      return;
    }

    // Check if it's running as installed PWA (iOS Safari)
    if ((window.navigator as any).standalone) {
      setIsInstalled(true);
      return;
    }

    const handleBeforeInstallPrompt = (e: Event) => {
      // Prevent Chrome 67 and earlier from automatically showing the prompt
      e.preventDefault();
      // Stash the event so it can be triggered later
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      // Show our custom install prompt
      setShowPrompt(true);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setShowPrompt(false);
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;

    // Show the install prompt
    await deferredPrompt.prompt();

    // Wait for the user to respond to the prompt
    const { outcome } = await deferredPrompt.userChoice;

    if (outcome === 'accepted') {
      // Hide our custom prompt
      setShowPrompt(false);
    } else {
    }

    // We no longer need the prompt. Clear it up.
    setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    // Store in localStorage that user dismissed the prompt
    localStorage.setItem('pwa-install-dismissed', new Date().toISOString());
  };

  // Don't show if already installed or previously dismissed recently, unless on install page
  useEffect(() => {
    // Public/auth pages and the install page have their own focused UI.
    if (location === '/install' || hiddenOnPublicRoutes) {
      setShowPrompt(false);
      return;
    }

    const dismissed = localStorage.getItem('pwa-install-dismissed');
    if (dismissed) {
      const dismissedDate = new Date(dismissed);
      const daysSinceDismissed = (new Date().getTime() - dismissedDate.getTime()) / (1000 * 60 * 60 * 24);
      // Don't show for 7 days after dismissal
      if (daysSinceDismissed < 7) {
        setShowPrompt(false);
      }
    }
  }, [hiddenOnPublicRoutes, location]);

  if (isInstalled || !showPrompt || hiddenOnPublicRoutes) {
    return null;
  }

  return (
    <div className="safe-area-bottom fixed inset-x-3 bottom-3 z-50 mx-auto max-w-sm md:left-auto md:right-4 md:max-w-md">
      <Card className="ios-glass-bar border shadow-lg">
        <CardContent className="p-3 sm:p-4">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 mt-1">
              <Download className="h-5 w-5 text-primary" />
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="font-semibold text-sm mb-1">Instalar MESC</h3>
              <p className="text-xs text-muted-foreground mb-3">
                Instale o aplicativo MESC em seu dispositivo para acesso rápido e funcionamento offline.
              </p>
              <div className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  onClick={handleInstallClick}
                  className="min-w-32 flex-1"
                >
                  Instalar
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleDismiss}
                  className="px-3"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
              <div className="mt-2">
                <a 
                  href="/install" 
                  className="text-xs text-primary hover:underline"
                >
                  Ver mais opções de instalação
                </a>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
