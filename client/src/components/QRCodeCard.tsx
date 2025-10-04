import { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Download, Share2, Smartphone, Users } from 'lucide-react';

interface QRCodeCardProps {
  url?: string;
}

export default function QRCodeCard({ url = 'https://saojudastadeu.replit.app' }: QRCodeCardProps) {
  const [qrCodeDataURL, setQrCodeDataURL] = useState<string>('');

  useEffect(() => {
    const generateQRCode = async () => {
      try {
        const qrDataURL = await QRCode.toDataURL(url, {
          width: 300,
          margin: 2,
          color: {
            '#8B4513', // Cor marrom/bronze do MESC
            light: '#FFFFFF'
          }
        });
        setQrCodeDataURL(qrDataURL);
      } catch (error) {
        console.error('Erro ao gerar QR code:', error);
      }
    };

    generateQRCode();
  }, [url]);

  const downloadCard = () => {
    // Criar canvas para renderizar o card completo
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = 800;
    canvas.height = 1000;

    // Fundo com gradiente
    const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
    gradient.addColorStop(0, '#F7F3E9'); // Bege claro
    gradient.addColorStop(1, '#E8DCC0'); // Bege mais escuro
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Título
    ctx.fillStyle = '#8B4513';
    ctx.font = 'bold 48px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('MESC', canvas.width / 2, 100);

    // Subtítulo
    ctx.font = '24px Arial';
    ctx.fillText('Santuário São Judas Tadeu', canvas.width / 2, 140);

    // Descrição
    ctx.font = '20px Arial';
    ctx.fillStyle = '#5D4E37';
    ctx.fillText('Sistema de Gestão de Ministros', canvas.width / 2, 180);
    ctx.fillText('Extraordinários da Sagrada Comunhão', canvas.width / 2, 210);

    // QR Code (se disponível)
    if (qrCodeDataURL) {
      const img = new Image();
      img.onload = () => {
        ctx.drawImage(img, (canvas.width - 300) / 2, 280, 300, 300);
        
        // Instruções
        ctx.font = 'bold 24px Arial';
        ctx.fillStyle = '#8B4513';
        ctx.fillText('Como acessar:', canvas.width / 2, 650);
        
        ctx.font = '20px Arial';
        ctx.fillStyle = '#5D4E37';
        ctx.fillText('1. Aponte a câmera do seu celular para o QR Code', canvas.width / 2, 690);
        ctx.fillText('2. Toque na notificação que aparecer', canvas.width / 2, 720);
        ctx.fillText('3. Faça login com seu email e senha', canvas.width / 2, 750);
        
        // URL
        ctx.font = 'italic 18px Arial';
        ctx.fillText(`Ou acesse: ${url}`, canvas.width / 2, 800);

        // Footer
        ctx.font = 'bold 16px Arial';
        ctx.fillStyle = '#8B4513';
        ctx.fillText('Para dúvidas, contate a coordenação', canvas.width / 2, 900);

        // Download
        const link = document.createElement('a');
        link.download = 'mesc-qrcode-card.png';
        link.href = canvas.toDataURL();
        link.click();
      };
      img.src = qrCodeDataURL;
    }
  };

  const shareCard = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'MESC - Sistema de Ministros',
          text: `Acesse o sistema MESC do Santuário São Judas Tadeu: ${url}`,
          url: url
        });
      } catch (error) {
        console.error('Erro ao compartilhar:', error);
      }
    } else {
      // Fallback para copiar URL
      navigator.clipboard.writeText(url);
      alert('Link copiado para a área de transferência!');
    }
  };

  return (
    <div className="min-h-screen bg-background p-4 flex items-center justify-center">
      <Card className="w-full max-w-2xl shadow-2xl">
        <CardContent className="p-8">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-primary rounded-full mx-auto mb-4 flex items-center justify-center">
              <Users className="h-8 w-8 text-primary-foreground" />
            </div>
            <h1 className="text-4xl font-bold text-foreground mb-2">MESC</h1>
            <h2 className="text-xl text-muted-foreground mb-1">Santuário São Judas Tadeu</h2>
            <p className="text-muted-foreground">Sistema de Gestão de Ministros Extraordinários da Sagrada Comunhão</p>
          </div>

          {/* QR Code */}
          <div className="text-center mb-8">
            <div className="bg-background p-6 rounded-2xl shadow-lg inline-block border-4 border-border">
              {qrCodeDataURL ? (
                <img src={qrCodeDataURL} alt="QR Code" className="w-64 h-64 mx-auto" />
              ) : (
                <div className="w-64 h-64 bg-muted rounded-lg flex items-center justify-center">
                  <span className="text-muted-foreground">Gerando QR Code...</span>
                </div>
              )}
            </div>
          </div>

          {/* Instructions */}
          <div className="bg-muted rounded-2xl p-6 mb-6">
            <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center">
              <Smartphone className="h-5 w-5 mr-2" />
              Como acessar:
            </h3>
            <ol className="space-y-2 text-foreground">
              <li className="flex items-start">
                <span className="bg-primary text-primary-foreground rounded-full w-6 h-6 flex items-center justify-center text-sm font-semibold mr-3 mt-0.5">1</span>
                <span>Aponte a câmera do seu celular para o QR Code</span>
              </li>
              <li className="flex items-start">
                <span className="bg-primary text-primary-foreground rounded-full w-6 h-6 flex items-center justify-center text-sm font-semibold mr-3 mt-0.5">2</span>
                <span>Toque na notificação que aparecer na tela</span>
              </li>
              <li className="flex items-start">
                <span className="bg-primary text-primary-foreground rounded-full w-6 h-6 flex items-center justify-center text-sm font-semibold mr-3 mt-0.5">3</span>
                <span>Faça login com seu email e senha fornecidos pela coordenação</span>
              </li>
            </ol>
          </div>

          {/* URL */}
          <div className="text-center mb-6">
            <p className="text-sm text-muted-foreground mb-2">Ou acesse diretamente:</p>
            <code className="bg-muted text-foreground px-4 py-2 rounded-lg text-sm font-mono">
              {url}
            </code>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3">
            <Button 
              onClick={downloadCard} 
              className="flex-1"
            >
              <Download className="h-4 w-4 mr-2" />
              Baixar Card
            </Button>
            <Button 
              onClick={shareCard}
              variant="outline" 
              className="flex-1"
            >
              <Share2 className="h-4 w-4 mr-2" />
              Compartilhar
            </Button>
          </div>

          {/* Footer */}
          <div className="text-center mt-6 pt-6 border-t border-border">
            <p className="text-sm text-muted-foreground">
              Para dúvidas sobre o acesso, contate a coordenação dos ministros
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}