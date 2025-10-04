import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Church, Eye, EyeOff, Clock, MessageCircle, UserCheck, Mail } from "lucide-react";
import { authAPI } from "@/lib/auth";
import { toast } from "@/hooks/use-toast";

export default function Login() {
  const [, navigate] = useLocation();
  const [showPassword, setShowPassword] = useState(false);
  const [showPendingDialog, setShowPendingDialog] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [forgotPasswordEmail, setForgotPasswordEmail] = useState("");
  const [pendingUserEmail, setPendingUserEmail] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [credentials, setCredentials] = useState({
    email: "",
    password: "",
  });

  // Detecta se veio de timeout de inatividade
  const searchParams = new URLSearchParams(window.location.search);
  const inactivityReason = searchParams.get('reason') === 'inactivity';

  const queryClient = useQueryClient();

  const forgotPasswordMutation = useMutation({
    mutationFn: async (email: string) => {
      const response = await fetch("/api/password-reset/request-reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || "Erro ao processar solicitação");
      }
      return data;
    },
    onSuccess: (data) => {
      toast({
        title: "Solicitação Enviada!",
        description: data.message || "Os Coordenadores foram notificados para enviar nova senha, assim que eles receberem a mensagem responderão de imediato.",
      });
      setShowForgotPassword(false);
      setForgotPasswordEmail("");
    },
    onError: (error: any) => {
      toast({
        title: "Erro",
        description: error.message || "Erro ao processar solicitação",
        variant: "destructive",
      });
    },
  });

  const loginMutation = useMutation({
    mutationFn: (creds: typeof credentials) => {
      return authAPI.login({ ...creds, rememberMe });
    },
    onSuccess: (data) => {
      
      // Set the user data in the cache immediately
      queryClient.setQueryData(["/api/auth/me"], data);
      
      // Check if user needs to change password
      if (data.user.requiresPasswordChange) {
        toast({
          title: "Alteração de senha necessária",
          description: "Por segurança, você deve alterar sua senha no primeiro acesso.",
        });
        navigate("/change-password");
      } else {
        toast({
          title: "Login realizado com sucesso",
          description: `Bem-vindo(a), ${data.user.name}!`,
        });
        navigate("/dashboard");
      }
    },
    onError: (error: any) => {
      // Verifica se é erro de conta pendente
      if (error.message === "Account pending approval") {
        setPendingUserEmail(credentials.email);
        setShowPendingDialog(true);
      } else {
        toast({
          title: "Erro no login",
          description: error.message || "Erro ao fazer login",
          variant: "destructive",
        });
      }
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loginMutation.mutate(credentials);
  };

  const handleForgotPassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (forgotPasswordEmail) {
      forgotPasswordMutation.mutate(forgotPasswordEmail);
    }
  };

  const handleInputChange = (field: keyof typeof credentials, value: string) => {
    setCredentials(prev => ({ ...prev, [field]: value }));
  };

  return (
    <div className="min-h-screen bg-background dark:bg-dark-8 flex items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-xl border-border/20 bg-[#F5E6CC] ">
        <CardHeader className="text-center pb-4">
          <div className="flex justify-center mb-4">
            <img 
              src="/sjtlogo.png" 
              alt="Santuário São Judas Tadeu" 
              className="h-72 w-full max-w-xs object-contain"
            />
          </div>
          <CardTitle className="text-3xl font-bold text-neutral-textDark dark:text-text-light mb-2">
            MESC
          </CardTitle>
          <p className="text-neutral-textMedium dark:text-gray-400 text-sm mb-1">
            Sistema de Gestão
          </p>
          <p className="text-neutral-textMedium dark:text-gray-400 text-xs">
            Ministério Extraordinário da Sagrada Comunhão
          </p>
        </CardHeader>
        <CardContent>
          {/* Alerta de timeout de inatividade */}
          {inactivityReason && (
            <Alert className="mb-4 border-orange-500 bg-orange-50 dark:bg-orange-950/20">
              <Clock className="h-4 w-4 text-orange-600" />
              <AlertDescription className="text-orange-800 dark:text-orange-200">
                <strong>Sessão Encerrada</strong><br />
                Sua sessão foi encerrada após 10 minutos de inatividade. Por favor, faça login novamente.
              </AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-neutral-textDark dark:text-text-light font-semibold text-sm">
                Email
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="seu@email.com"
                value={credentials.email}
                onChange={(e) => handleInputChange("email", e.target.value.toLowerCase().trim())}
                className="bg-background border-border focus:border-primary focus:ring-primary transition-all duration-200"
                autoComplete="email"
                autoCapitalize="off"
                autoCorrect="off"
                spellCheck="false"
                required
                data-testid="input-email"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="password" className="text-neutral-textDark dark:text-text-light font-semibold text-sm">
                Senha
              </Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Sua senha"
                  value={credentials.password}
                  onChange={(e) => handleInputChange("password", e.target.value)}
                  className="bg-background border-border focus:border-primary focus:ring-primary pr-12 transition-all duration-200"
                  required
                  data-testid="input-password"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={() => setShowPassword(!showPassword)}
                  data-testid="button-toggle-password"
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <Eye className="h-4 w-4 text-muted-foreground" />
                  )}
                </Button>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="remember" 
                  checked={rememberMe}
                  onCheckedChange={(checked) => setRememberMe(checked as boolean)}
                />
                <Label 
                  htmlFor="remember" 
                  className="text-sm text-neutral-textMedium dark:text-gray-400 cursor-pointer"
                >
                  Lembrar-me
                </Label>
              </div>
              <Button
                type="button"
                variant="link"
                className="text-sm text-neutral-accentWarm hover:text-neutral-accentWarm/80 dark:text-dark-gold dark:hover:text-dark-gold/80 p-0"
                onClick={() => setShowForgotPassword(true)}
              >
                Esqueci minha senha
              </Button>
            </div>

            <Button
              type="submit"
              className="w-full bg-neutral-neutral hover:bg-neutral-neutral/90 dark:bg-dark-gold dark:hover:bg-dark-gold/90 text-neutral-cream dark:text-dark-10 font-semibold shadow-lg transition-all duration-200 transform hover:scale-[1.02]"
              disabled={loginMutation.isPending}
              data-testid="button-login"
            >
              {loginMutation.isPending ? "Entrando..." : "Entrar"}
            </Button>
          </form>

          <div className="mt-6 space-y-4">
            <div className="text-center">
              <p className="text-sm text-neutral-textMedium dark:text-gray-400">
                Não tem uma conta?{" "}
                <Link href="/register">
                  <span className="text-neutral-accentWarm hover:text-neutral-accentWarm/80 dark:text-dark-gold dark:hover:text-dark-gold/80 font-medium cursor-pointer">
                    Cadastre-se aqui
                  </span>
                </Link>
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Dialog para usuário com conta pendente */}
      <Dialog open={showPendingDialog} onOpenChange={setShowPendingDialog}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <div className="flex items-center justify-center mb-4">
              <div className="w-16 h-16 bg-amber-100 dark:bg-amber-900/20 rounded-full flex items-center justify-center">
                <Clock className="h-8 w-8 text-amber-600 dark:text-amber-400" />
              </div>
            </div>
            <DialogTitle className="text-center">Cadastro Aguardando Aprovação</DialogTitle>
            <DialogDescription className="text-center space-y-3">
              <p>
                Olá! Seu cadastro foi recebido com sucesso e está aguardando aprovação 
                da coordenação do ministério.
              </p>
              <div className="bg-muted/50 rounded-lg p-4 space-y-2 text-left">
                <div className="flex items-start gap-3">
                  <UserCheck className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-medium">Próximos passos:</p>
                    <ul className="text-sm text-muted-foreground mt-1 space-y-1">
                      <li>• Entre em contato com o coordenador do ministério</li>
                      <li>• Solicite a liberação do seu acesso</li>
                      <li>• Informe o email: <span className="font-medium text-foreground">{pendingUserEmail}</span></li>
                    </ul>
                  </div>
                </div>
              </div>
              <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 space-y-2 text-left">
                <div className="flex items-start gap-3">
                  <MessageCircle className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-medium text-blue-900 dark:text-blue-100">Contato da Coordenação:</p>
                    <p className="text-sm text-blue-800 dark:text-blue-200 mt-1">
                      Procure a coordenação após a missa ou entre em contato 
                      pelo WhatsApp do ministério.
                    </p>
                  </div>
                </div>
              </div>
              <p className="text-sm text-muted-foreground pt-2">
                Assim que seu cadastro for aprovado, você receberá uma notificação 
                e poderá acessar o sistema normalmente.
              </p>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button 
              onClick={() => setShowPendingDialog(false)}
              className="w-full sm:w-auto"
            >
              Entendi
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog para Esqueci a Senha */}
      <Dialog open={showForgotPassword} onOpenChange={setShowForgotPassword}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <div className="flex items-center justify-center mb-4">
              <div className="w-16 h-16 bg-neutral-accentWarm/10 dark:bg-dark-gold/20 rounded-full flex items-center justify-center">
                <Mail className="h-8 w-8 text-neutral-accentWarm dark:text-dark-gold" />
              </div>
            </div>
            <DialogTitle className="text-center text-neutral-textDark dark:text-text-light">
              Recuperar Senha
            </DialogTitle>
            <DialogDescription className="text-center text-neutral-textMedium dark:text-gray-400">
              Digite seu email cadastrado e os coordenadores serão notificados para auxiliar com uma nova senha.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleForgotPassword} className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label htmlFor="forgot-email" className="text-neutral-textDark dark:text-text-light">
                Email cadastrado
              </Label>
              <Input
                id="forgot-email"
                type="email"
                placeholder="seu@email.com"
                value={forgotPasswordEmail}
                onChange={(e) => setForgotPasswordEmail(e.target.value.toLowerCase().trim())}
                required
                className="bg-background border-border"
              />
            </div>
            <div className="bg-neutral-badgeWarm/20 dark:bg-dark-3 rounded-lg p-3">
              <p className="text-xs text-neutral-textMedium dark:text-gray-400">
                <strong>Importante:</strong> Após enviar o email, o coordenador gerará uma senha provisória 
                que será enviada para você. No primeiro acesso, você deverá alterar essa senha.
              </p>
            </div>
            <DialogFooter className="flex-col sm:flex-row gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setShowForgotPassword(false);
                  setForgotPasswordEmail("");
                }}
                className="w-full sm:w-auto"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={forgotPasswordMutation.isPending}
                className="w-full sm:w-auto bg-neutral-neutral hover:bg-neutral-neutral/90 dark:bg-dark-gold dark:hover:bg-dark-gold/90 text-neutral-cream dark:text-dark-10"
              >
                {forgotPasswordMutation.isPending ? "Enviando..." : "Enviar Email"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
