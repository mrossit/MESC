import { useState, useEffect } from 'react';
import { Layout } from '../components/layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Alert, AlertDescription } from '../components/ui/alert';
import { 
  Download, Share2, Smartphone, QrCode, 
  ArrowLeft, Info, Copy, Check
} from 'lucide-react';
import { useNavigate } from '@/hooks/use-navigate';
import QRCode from 'qrcode';

export default function QRCodeShare() {
  const [qrCodeDataURL, setQrCodeDataURL] = useState<string>('');
  const [copied, setCopied] = useState(false);
  const navigate = useNavigate();
  const url = 'https://saojudastadeu.replit.app';

  useEffect(() => {
    const generateQRCode = async () => {
      try {
        const qrDataURL = await QRCode.toDataURL(url, {
          width: 400,
          margin: 2,
          color: {
            dark: '#000000',
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

  const downloadQRCode = () => {
    const link = document.createElement('a');
    link.download = 'mesc-qrcode.png';
    link.href = qrCodeDataURL;
    link.click();
  };

  const downloadCard = () => {
    // Criar canvas para renderizar o card completo
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = 800;
    canvas.height = 1200;

    // Fundo branco limpo (como o app)
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Header com cor primária do tema
    ctx.fillStyle = '#F5F5F5'; // Cinza claro como o app
    ctx.fillRect(0, 0, canvas.width, 200);

    // Carregar e desenhar o logo
    const logoImg = new Image();
    logoImg.crossOrigin = 'anonymous';
    logoImg.onload = () => {
      // Logo maior e mais visível
      const logoSize = 120; // Aumentado de 80 para 120
      ctx.drawImage(logoImg, (canvas.width - logoSize) / 2, 25, logoSize, logoSize);

      // Título MESC com cor primária
      ctx.fillStyle = '#1A1A1A';
      ctx.font = 'bold 42px system-ui, -apple-system, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('MESC', canvas.width / 2, 175);

      // Subtítulo
      ctx.fillStyle = '#4A4A4A';
      ctx.font = '24px system-ui, -apple-system, sans-serif';
      ctx.fillText('Santuário São Judas Tadeu', canvas.width / 2, 240);

      // Descrição
      ctx.font = '18px system-ui, -apple-system, sans-serif';
      ctx.fillStyle = '#6B7280';
      ctx.fillText('Sistema de Gestão de Ministros', canvas.width / 2, 280);
      ctx.fillText('Extraordinários da Sagrada Comunhão', canvas.width / 2, 305);

      // QR Code com borda cinza
      if (qrCodeDataURL) {
        const qrImg = new Image();
        qrImg.onload = () => {
          // Sombra para o QR Code
          ctx.shadowColor = 'rgba(0, 0, 0, 0.1)';
          ctx.shadowBlur = 15;
          ctx.shadowOffsetX = 0;
          ctx.shadowOffsetY = 4;

          // Borda cinza como os cards do app
          ctx.fillStyle = '#E5E7EB';
          ctx.fillRect((canvas.width - 350) / 2, 335, 350, 350);
          
          // Fundo branco para o QR
          ctx.shadowBlur = 0;
          ctx.fillStyle = '#FFFFFF';
          ctx.fillRect((canvas.width - 330) / 2, 345, 330, 330);
          
          // QR Code
          ctx.drawImage(qrImg, (canvas.width - 300) / 2, 360, 300, 300);
          
          // Resetar sombra
          ctx.shadowBlur = 0;
          ctx.shadowOffsetX = 0;
          ctx.shadowOffsetY = 0;

          // Seção de instruções com fundo cinza claro
          ctx.fillStyle = '#F9FAFB';
          ctx.fillRect(50, 720, canvas.width - 100, 200);

          // Título das instruções
          ctx.font = 'bold 24px system-ui, -apple-system, sans-serif';
          ctx.fillStyle = '#1A1A1A';
          ctx.fillText('Como acessar o sistema', canvas.width / 2, 760);
          
          // Instruções numeradas
          ctx.font = '18px system-ui, -apple-system, sans-serif';
          ctx.fillStyle = '#4A4A4A';
          
          const instructions = [
            '1. Aponte a câmera do seu celular para o QR Code',
            '2. Toque na notificação que aparecer na tela',
            '3. Faça login com email e senha fornecidos'
          ];

          instructions.forEach((instruction, index) => {
            ctx.fillText(instruction, canvas.width / 2, 800 + (index * 30));
          });
          
          // URL com estilo
          ctx.font = 'bold 16px system-ui, -apple-system, sans-serif';
          ctx.fillStyle = '#6B7280';
          ctx.fillText('Ou acesse diretamente:', canvas.width / 2, 950);
          
          ctx.font = '18px monospace';
          ctx.fillStyle = '#1A1A1A';
          ctx.fillText(url, canvas.width / 2, 980);

          // Footer com cor primária
          ctx.fillStyle = '#F5F5F5';
          ctx.fillRect(0, 1050, canvas.width, 150);

          // Texto do footer
          ctx.font = 'bold 18px system-ui, -apple-system, sans-serif';
          ctx.fillStyle = '#1A1A1A';
          ctx.fillText('Para dúvidas sobre o acesso', canvas.width / 2, 1100);
          ctx.fillText('contate a coordenação dos ministros', canvas.width / 2, 1130);

          // Versão/data pequena
          ctx.font = '12px system-ui, -apple-system, sans-serif';
          ctx.fillStyle = '#6B7280';
          const date = new Date().toLocaleDateString('pt-BR');
          ctx.fillText(`Gerado em ${date}`, canvas.width / 2, 1170);

          // Download
          const link = document.createElement('a');
          link.download = 'mesc-qrcode-card.png';
          link.href = canvas.toDataURL();
          link.click();
        };
        qrImg.src = qrCodeDataURL;
      }
    };
    
    // Tentar carregar o logo
    logoImg.onerror = () => {
      // Se não conseguir carregar o logo, gerar sem ele
      
      // Continuar sem o logo - título maior sem logo
      ctx.fillStyle = '#1A1A1A';
      ctx.font = 'bold 56px system-ui, -apple-system, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('MESC', canvas.width / 2, 110);

      // Resto do card sem logo (código simplificado)
      generateCardWithoutLogo();
    };
    
    logoImg.src = '/logo-santuario.png';

    // Função auxiliar para gerar card sem logo
    const generateCardWithoutLogo = () => {
      // Código similar ao anterior mas sem o logo
      ctx.fillStyle = '#4A4A4A';
      ctx.font = '24px system-ui, -apple-system, sans-serif';
      ctx.fillText('Santuário São Judas Tadeu', canvas.width / 2, 240);

      ctx.font = '18px system-ui, -apple-system, sans-serif';
      ctx.fillStyle = '#6B7280';
      ctx.fillText('Sistema de Gestão de Ministros', canvas.width / 2, 280);
      ctx.fillText('Extraordinários da Sagrada Comunhão', canvas.width / 2, 305);

      if (qrCodeDataURL) {
        const qrImg = new Image();
        qrImg.onload = () => {
          ctx.shadowColor = 'rgba(0, 0, 0, 0.1)';
          ctx.shadowBlur = 15;
          ctx.fillStyle = '#E5E7EB';
          ctx.fillRect((canvas.width - 350) / 2, 335, 350, 350);
          ctx.shadowBlur = 0;
          ctx.fillStyle = '#FFFFFF';
          ctx.fillRect((canvas.width - 330) / 2, 345, 330, 330);
          ctx.drawImage(qrImg, (canvas.width - 300) / 2, 360, 300, 300);

          ctx.fillStyle = '#F9FAFB';
          ctx.fillRect(50, 720, canvas.width - 100, 200);

          ctx.font = 'bold 24px system-ui, -apple-system, sans-serif';
          ctx.fillStyle = '#1A1A1A';
          ctx.fillText('Como acessar o sistema', canvas.width / 2, 760);
          
          ctx.font = '18px system-ui, -apple-system, sans-serif';
          ctx.fillStyle = '#4A4A4A';
          ctx.fillText('1. Aponte a câmera do seu celular para o QR Code', canvas.width / 2, 800);
          ctx.fillText('2. Toque na notificação que aparecer na tela', canvas.width / 2, 830);
          ctx.fillText('3. Faça login com email e senha fornecidos', canvas.width / 2, 860);
          
          ctx.font = '18px monospace';
          ctx.fillStyle = '#1A1A1A';
          ctx.fillText(url, canvas.width / 2, 980);

          ctx.fillStyle = '#F5F5F5';
          ctx.fillRect(0, 1050, canvas.width, 150);

          ctx.font = 'bold 18px system-ui, -apple-system, sans-serif';
          ctx.fillStyle = '#1A1A1A';
          ctx.fillText('Para dúvidas, contate a coordenação', canvas.width / 2, 1100);

          const link = document.createElement('a');
          link.download = 'mesc-qrcode-card.png';
          link.href = canvas.toDataURL();
          link.click();
        };
        qrImg.src = qrCodeDataURL;
      }
    };
  };

  const shareContent = async () => {
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
      copyToClipboard();
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Layout title="Compartilhar Aplicativo" subtitle="Compartilhe o aplicativo com outros ministros">
      <div className="max-w-4xl mx-auto p-4 sm:p-6">
        {/* Header com botão voltar */}
        <div className="mb-4">
          <Button
            variant="ghost"
            onClick={() => navigate('/dashboard')}
            className="mb-3"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar
          </Button>

          <Card className="border-opacity-30">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-xl sm:text-2xl">
                <QrCode className="h-5 w-5 sm:h-6 sm:w-6" />
                QR Code do Aplicativo
              </CardTitle>
              <CardDescription className="text-sm sm:text-base">
                Compartilhe o QR Code para que os ministros acessem o sistema facilmente
              </CardDescription>
            </CardHeader>
          </Card>
        </div>

        {/* QR Code Card */}
        <Card className="border-opacity-30 mb-4">
          <CardContent className="pt-6">
            <div className="text-center">
              {/* QR Code Container */}
              <div className="inline-block p-4 bg-white dark:bg-gray-800 rounded-lg shadow-lg mb-6">
                {qrCodeDataURL ? (
                  <img 
                    src={qrCodeDataURL} 
                    alt="QR Code MESC" 
                    className="w-64 h-64 sm:w-80 sm:h-80 mx-auto"
                  />
                ) : (
                  <div className="w-64 h-64 sm:w-80 sm:h-80 bg-gray-100 dark:bg-gray-700 rounded-lg flex items-center justify-center">
                    <span className="text-gray-500 dark:text-gray-400">Gerando QR Code...</span>
                  </div>
                )}
              </div>

              {/* URL Display */}
              <div className="mb-6 px-2 sm:px-0">
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">URL do Sistema:</p>
                <div className="flex flex-col sm:flex-row items-center justify-center gap-2">
                  <code className="bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200 px-3 py-2 rounded-lg text-xs sm:text-sm font-mono break-all max-w-full">
                    {url}
                  </code>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={copyToClipboard}
                    className="h-9 w-9 flex-shrink-0"
                  >
                    {copied ? (
                      <Check className="h-4 w-4 text-green-600" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Button 
                  onClick={downloadQRCode}
                  variant="outline"
                  className="sm:min-w-[150px]"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Baixar QR Code
                </Button>
                <Button 
                  onClick={downloadCard}
                  className="sm:min-w-[150px]"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Baixar Card Completo
                </Button>
                <Button 
                  onClick={shareContent}
                  variant="outline"
                  className="sm:min-w-[150px]"
                >
                  <Share2 className="h-4 w-4 mr-2" />
                  Compartilhar
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Instructions Card */}
        <Card className="border-opacity-30 mb-4">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Smartphone className="h-5 w-5" />
              Como usar o QR Code
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ol className="space-y-3">
              <li className="flex items-start">
                <span className="bg-primary text-primary-foreground rounded-full w-6 h-6 flex items-center justify-center text-sm font-semibold mr-3 mt-0.5 flex-shrink-0">
                  1
                </span>
                <span className="text-sm sm:text-base">
                  Imprima ou exiba o QR Code em um local visível durante as reuniões
                </span>
              </li>
              <li className="flex items-start">
                <span className="bg-primary text-primary-foreground rounded-full w-6 h-6 flex items-center justify-center text-sm font-semibold mr-3 mt-0.5 flex-shrink-0">
                  2
                </span>
                <span className="text-sm sm:text-base">
                  Os ministros devem apontar a câmera do celular para o QR Code
                </span>
              </li>
              <li className="flex items-start">
                <span className="bg-primary text-primary-foreground rounded-full w-6 h-6 flex items-center justify-center text-sm font-semibold mr-3 mt-0.5 flex-shrink-0">
                  3
                </span>
                <span className="text-sm sm:text-base">
                  Tocar na notificação que aparecer para abrir o sistema
                </span>
              </li>
              <li className="flex items-start">
                <span className="bg-primary text-primary-foreground rounded-full w-6 h-6 flex items-center justify-center text-sm font-semibold mr-3 mt-0.5 flex-shrink-0">
                  4
                </span>
                <span className="text-sm sm:text-base">
                  Fazer login com email e senha fornecidos pela coordenação
                </span>
              </li>
            </ol>
          </CardContent>
        </Card>

        {/* Info Alert */}
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            <strong>Dica:</strong> O card completo inclui instruções detalhadas e pode ser compartilhado 
            via WhatsApp ou impresso para distribuição nas reuniões do ministério.
          </AlertDescription>
        </Alert>
      </div>
    </Layout>
  );
}