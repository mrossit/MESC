import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Smartphone, 
  Download, 
  CheckCircle, 
  Share,
  QrCode,
  ArrowRight,
  Monitor,
  Wifi,
  Bell,
  Users
} from "lucide-react";
import { useLocation } from "wouter";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

export default function InstallPage() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isInstallable, setIsInstallable] = useState(false);
  const [platform, setPlatform] = useState<'android' | 'ios' | 'desktop' | 'unknown'>('unknown');
  const [, setLocation] = useLocation();

  useEffect(() => {
    // Detect platform
    const userAgent = navigator.userAgent.toLowerCase();
    if (/android/.test(userAgent)) {
      setPlatform('android');
    } else if (/iphone|ipad/.test(userAgent)) {
      setPlatform('ios');
    } else if (/win|mac|linux/.test(userAgent)) {
      setPlatform('desktop');
    }

    // Check if app is already installed
    if (window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone) {
      setIsInstalled(true);
      return;
    }

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setIsInstallable(true);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setIsInstallable(false);
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;

    try {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      
      if (outcome === 'accepted') {
        setIsInstalled(true);
        setIsInstallable(false);
      }
      
      setDeferredPrompt(null);
    } catch (error) {
      console.error('Erro durante instalação:', error);
    }
  };

  const handleShare = async () => {
    const shareData = {
      title: 'MESC - Sistema de Gestão de Ministros',
      text: 'Instale o aplicativo MESC do Santuário São Judas Tadeu',
      url: window.location.origin + '/install'
    };

    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        // Fallback: copy to clipboard
        await navigator.clipboard.writeText(shareData.url);
        alert('Link copiado para a área de transferência!');
      }
    } catch (error) {
      console.error('Erro ao compartilhar:', error);
    }
  };

  const getInstallInstructions = () => {
    switch (platform) {
      case 'android':
        return [
          'Abra este link no Chrome do seu Android',
          'Toque no ícone de menu (3 pontos) no navegador',
          'Selecione "Instalar aplicativo" ou "Adicionar à tela inicial"',
          'Confirme a instalação tocando em "Instalar"'
        ];
      case 'ios':
        return [
          'Abra este link no Safari do seu iPhone/iPad',
          'Toque no ícone de compartilhamento (quadrado com seta)',
          'Role para baixo e toque em "Adicionar à Tela de Início"',
          'Toque em "Adicionar" para confirmar'
        ];
      case 'desktop':
        return [
          'Abra este link no Chrome, Edge ou Firefox',
          'Procure pelo ícone de instalação na barra de endereços',
          'Clique em "Instalar" quando aparecer a opção',
          'Confirme a instalação na janela que abrir'
        ];
      default:
        return [
          'Abra este link em um navegador compatível',
          'Procure pela opção de "Instalar" ou "Adicionar à tela inicial"',
          'Siga as instruções do seu navegador',
          'Confirme a instalação'
        ];
    }
  };

  if (isInstalled) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-amber-50 to-orange-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-md text-center">
          <CardHeader>
            <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
            <CardTitle className="text-xl">App Já Instalado!</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground">
              O MESC já está instalado no seu dispositivo. 
              Você pode encontrá-lo na sua tela inicial.
            </p>
            <Button 
              onClick={() => setLocation('/dashboard')} 
              className="w-full"
            >
              Abrir Aplicativo
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 to-orange-100 p-4">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center space-y-4">
          <div 
            className="mx-auto w-20 h-20 rounded-xl flex items-center justify-center"
            style={{ 
              backgroundColor: '#92400e', 
              border: '2px solid #f59e0b'
            }}
          >
            <div className="text-center" style={{ color: '#fbbf24' }}>
              <div style={{ fontSize: '12px', fontWeight: 'bold' }}>SJT</div>
              <div style={{ fontSize: '8px' }}>SANTUÁRIO</div>
            </div>
          </div>
          <div>
            <h1 className="text-3xl font-bold text-[#5C4033]">
              Instalar MESC
            </h1>
            <p className="text-muted-foreground">
              Sistema de Gestão de Ministros da Sagrada Comunhão
            </p>
          </div>
        </div>

        {/* Features */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { icon: Wifi, title: 'Funciona Offline', desc: 'Acesse mesmo sem internet' },
            { icon: Bell, title: 'Notificações', desc: 'Receba avisos importantes' },
            { icon: Users, title: 'Escalas', desc: 'Veja suas escalações' },
            { icon: Monitor, title: 'Multi-dispositivo', desc: 'Use em qualquer aparelho' }
          ].map((feature, idx) => (
            <Card key={idx}>
              <CardContent className="p-4 text-center">
                <feature.icon className="h-8 w-8 mx-auto mb-2 text-[#5C4033]" />
                <h3 className="font-semibold">{feature.title}</h3>
                <p className="text-xs text-muted-foreground">{feature.desc}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Installation */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Install Button */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Download className="h-5 w-5" />
                Instalação Rápida
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {isInstallable ? (
                <div className="space-y-4">
                  <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-5 w-5 text-green-600" />
                      <span className="text-green-800 font-medium">
                        Pronto para instalar!
                      </span>
                    </div>
                  </div>
                  <Button onClick={handleInstall} className="w-full" size="lg">
                    <Download className="h-4 w-4 mr-2" />
                    Instalar Aplicativo
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="p-4 bg-amber-50 rounded-lg border border-amber-200">
                    <p className="text-amber-800 text-sm">
                      Instalação automática não disponível neste navegador. 
                      Use as instruções manuais ao lado.
                    </p>
                  </div>
                  <Badge variant="outline" className="w-full justify-center py-2">
                    <Smartphone className="h-4 w-4 mr-2" />
                    Plataforma: {platform === 'unknown' ? 'Detectando...' : platform}
                  </Badge>
                </div>
              )}
              
              <div className="flex gap-2">
                <Button variant="outline" onClick={handleShare} className="flex-1">
                  <Share className="h-4 w-4 mr-2" />
                  Compartilhar
                </Button>
                <Button variant="outline" onClick={() => setLocation('/dashboard')} className="flex-1">
                  <ArrowRight className="h-4 w-4 mr-2" />
                  Usar no Navegador
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Manual Instructions */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <QrCode className="h-5 w-5" />
                Instruções Manuais
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {getInstallInstructions().map((instruction, idx) => (
                  <div key={idx} className="flex items-start gap-3">
                    <div className="w-6 h-6 bg-[#5C4033] text-white rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0">
                      {idx + 1}
                    </div>
                    <p className="text-sm">{instruction}</p>
                  </div>
                ))}
              </div>
              
              <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
                <p className="text-blue-800 text-sm">
                  <strong>Dica:</strong> Após instalar, o MESC ficará disponível na sua tela inicial 
                  como um aplicativo normal, funcionando mesmo sem internet!
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* QR Code for sharing */}
        <Card>
          <CardHeader>
            <CardTitle className="text-center">Compartilhe com Outros Ministros</CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <p className="text-muted-foreground">
              Compartilhe este link para que outros ministros também possam instalar o MESC:
            </p>
            <div className="p-3 bg-muted rounded-lg font-mono text-sm break-all">
              {window.location.origin}/install
            </div>
            <Button onClick={handleShare} variant="outline">
              <Share className="h-4 w-4 mr-2" />
              Compartilhar Link
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}