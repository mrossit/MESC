import { useEffect, useRef, useState } from "react";
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
import { Eye, EyeOff, Clock, Fingerprint, MessageCircle, ShieldCheck, UserCheck, Mail } from "lucide-react";
import { authAPI, type AuthUser } from "@/lib/auth";
import { toast } from "@/hooks/use-toast";
import {
  clearAutoBiometricAttempt,
  clearLocalSession,
  isAutoBiometricCooldownActive,
  markAutoBiometricAttempt,
} from "@/lib/persistent-storage";
import { hasStoredMobileRefreshToken, shouldUseMobileAuth } from "@/lib/mobile-auth-session";
import {
  enableNativeBiometricLogin,
  getNativeBiometricStatus,
  unlockNativeBiometricLogin,
  type NativeBiometricStatus,
} from "@/lib/native-biometric-auth";

export default function Login() {
  const [, navigate] = useLocation();
  const [showPassword, setShowPassword] = useState(false);
  const [showPendingDialog, setShowPendingDialog] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [showBiometricPrompt, setShowBiometricPrompt] = useState(false);
  const [forgotPasswordEmail, setForgotPasswordEmail] = useState("");
  const [pendingUserEmail, setPendingUserEmail] = useState("");
  const [pendingLoginUser, setPendingLoginUser] = useState<AuthUser | null>(null);
  const [rememberMe, setRememberMe] = useState(false);
  const [biometricStatus, setBiometricStatus] = useState<NativeBiometricStatus | null>(null);
  const [biometricBusy, setBiometricBusy] = useState(false);
  const [credentials, setCredentials] = useState({
    email: "",
    password: "",
  });
  const biometricPromptResolvingRef = useRef(false);
  const biometricUnlockInProgressRef = useRef(false);

  // Detecta se veio de timeout de inatividade
  const searchParams = new URLSearchParams(window.location.search);
  const inactivityReason = searchParams.get('reason') === 'inactivity';

  const queryClient = useQueryClient();

  const refreshBiometricStatus = async () => {
    const status = await getNativeBiometricStatus();
    setBiometricStatus(status);
    return status;
  };

  const finishLogin = (user: AuthUser) => {
    toast({
      title: "Login realizado com sucesso",
      description: `Bem-vindo(a), ${user.name}!`,
    });
    navigate("/dashboard");
  };

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
    onError: (error: Error) => {
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
    onSuccess: async (data) => {
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
        const status = await refreshBiometricStatus();
        if (status.native && status.available && status.enabled) {
          clearAutoBiometricAttempt();
          finishLogin(data.user);
          return;
        }
        if (status.native && status.available && !status.enabled) {
          setPendingLoginUser(data.user);
          setShowBiometricPrompt(true);
          return;
        }
        finishLogin(data.user);
      }
    },
    onError: (error: Error) => {
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
    
    // Limpar tokens antigos antes de fazer novo login
    clearLocalSession();
    
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

  const handleBiometricUnlock = async () => {
    if (biometricUnlockInProgressRef.current) return;
    if (isAutoBiometricCooldownActive()) {
      toast({
        title: "Biometria pausada",
        description: "Use email e senha agora. Voce podera tentar a biometria novamente em alguns minutos.",
      });
      return;
    }

    biometricUnlockInProgressRef.current = true;
    markAutoBiometricAttempt();
    setBiometricBusy(true);
    try {
      await unlockNativeBiometricLogin();
      const data = await authAPI.getMe();
      queryClient.setQueryData(["/api/auth/me"], data);
      clearAutoBiometricAttempt();
      finishLogin(data.user);
    } catch (error) {
      markAutoBiometricAttempt();
      clearLocalSession();
      const message = error instanceof Error
        ? error.message
        : "Nao foi possivel entrar com biometria. Use email e senha.";
      toast({
        title: "Biometria indisponivel",
        description: message,
        variant: "destructive",
      });
      void refreshBiometricStatus();
    } finally {
      biometricUnlockInProgressRef.current = false;
      setBiometricBusy(false);
    }
  };

  const handleEnableBiometric = async () => {
    if (!pendingLoginUser) return;

    const user = pendingLoginUser;
    setBiometricBusy(true);
    try {
      const status = await enableNativeBiometricLogin(user.email);
      setBiometricStatus(status);
      toast({
        title: "Biometria ativada",
        description: `Na proxima entrada, voce podera usar ${status.label}.`,
      });
    } catch (error) {
      toast({
        title: "Nao foi possivel ativar",
        description: error instanceof Error ? error.message : "Tente novamente em Configuracoes.",
        variant: "destructive",
      });
    } finally {
      biometricPromptResolvingRef.current = true;
      setBiometricBusy(false);
      setShowBiometricPrompt(false);
      setPendingLoginUser(null);
      finishLogin(user);
      window.setTimeout(() => {
        biometricPromptResolvingRef.current = false;
      }, 0);
    }
  };

  const handleSkipBiometric = () => {
    const user = pendingLoginUser;
    setShowBiometricPrompt(false);
    setPendingLoginUser(null);
    if (user) finishLogin(user);
  };

  useEffect(() => {
    let cancelled = false;

    const hydrateLoginState = async () => {
      const status = await getNativeBiometricStatus();
      if (cancelled) return;
      setBiometricStatus(status);

      const token = localStorage.getItem("token") || localStorage.getItem("auth_token");
      if (token && !inactivityReason) {
        try {
          localStorage.setItem("token", token);
          localStorage.setItem("auth_token", token);
          const data = await authAPI.getMe();
          if (cancelled) return;
          queryClient.setQueryData(["/api/auth/me"], data);
          navigate(data.user.requiresPasswordChange ? "/change-password" : "/dashboard");
          return;
        } catch {
          clearLocalSession();
        }
      }

      const canResumeMobileSession = shouldUseMobileAuth() && hasStoredMobileRefreshToken();

      if (!token && canResumeMobileSession && !inactivityReason) {
        try {
          const data = await authAPI.getMe();
          if (cancelled) return;
          queryClient.setQueryData(["/api/auth/me"], data);
          navigate(data.user.requiresPasswordChange ? "/change-password" : "/dashboard");
          return;
        } catch {
          clearLocalSession();
        }
      }
    };

    void hydrateLoginState();

    return () => {
      cancelled = true;
    };
  }, [inactivityReason, navigate, queryClient]);

  return (
    <div className="login-screen flex w-full items-center justify-center overflow-x-hidden px-3 sm:px-4">
      <Card className="login-card liquid-glass w-full max-w-sm min-w-0 border-0 shadow-xl sm:max-w-[24.5rem]">
        <CardHeader className="login-card-header px-4 pb-2.5 pt-4 text-center sm:px-6 sm:pt-5">
          <div className="mb-2.5 flex justify-center">
            <img 
              src="/sjtlogo.png" 
              alt="Santuário São Judas Tadeu" 
              className="login-logo h-24 w-full max-w-[11rem] object-contain sm:h-32 sm:max-w-[13rem]"
            />
          </div>
          <CardTitle className="mb-1 text-2xl font-bold text-neutral-textDark dark:text-text-light sm:text-3xl">
            MESC
          </CardTitle>
          <p className="mb-1 text-sm text-neutral-textMedium dark:text-gray-400">
            Sistema de Gestão
          </p>
          <p className="text-neutral-textMedium dark:text-gray-400 text-xs">
            Ministério Extraordinário da Sagrada Comunhão
          </p>
        </CardHeader>
        <CardContent className="login-card-content px-4 pb-4 sm:px-6 sm:pb-5">
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

          {biometricStatus?.enabled && (
            <Button
              type="button"
              variant="outline"
              className="liquid-glass-chip mb-3 h-11 w-full border-0 font-semibold"
              onClick={handleBiometricUnlock}
              disabled={biometricBusy}
              data-testid="button-biometric-login"
            >
              <Fingerprint className="mr-2 h-4 w-4" />
              {biometricBusy ? "Desbloqueando..." : `Entrar com ${biometricStatus.label}`}
            </Button>
          )}

          <form onSubmit={handleSubmit} className="space-y-3.5">
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
                className="min-h-11 bg-background text-base transition-all duration-200 focus:border-primary focus:ring-primary sm:text-sm"
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
                  className="min-h-11 bg-background pr-12 text-base transition-all duration-200 focus:border-primary focus:ring-primary sm:text-sm"
                  autoComplete="current-password"
                  required
                  data-testid="input-password"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
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

            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex min-w-0 items-center space-x-2">
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
                className="h-auto p-0 text-sm text-neutral-accentWarm hover:text-neutral-accentWarm/80 dark:text-dark-gold dark:hover:text-dark-gold/80"
                onClick={() => setShowForgotPassword(true)}
              >
                Esqueci minha senha
              </Button>
            </div>

            <Button
              type="submit"
              className="h-11 w-full bg-neutral-neutral font-semibold text-neutral-cream shadow-lg transition-all duration-200 hover:bg-neutral-neutral/90 dark:bg-dark-gold dark:text-dark-10 dark:hover:bg-dark-gold/90"
              disabled={loginMutation.isPending}
              data-testid="button-login"
            >
              {loginMutation.isPending ? "Entrando..." : "Entrar"}
            </Button>
          </form>

          <div className="mt-4 space-y-3.5">
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

            <div className="border-t border-border/30 pt-3 text-center">
              <p className="text-xs text-neutral-textMedium dark:text-gray-500">
                Ao entrar, você concorda com nossos{" "}
                <Link href="/terms-of-use">
                  <span className="text-neutral-accentWarm hover:underline dark:text-dark-gold cursor-pointer">
                    Termos de Uso
                  </span>
                </Link>
                {" "}e{" "}
                <Link href="/privacy-policy">
                  <span className="text-neutral-accentWarm hover:underline dark:text-dark-gold cursor-pointer">
                    Política de Privacidade
                  </span>
                </Link>
                {" "}e{" "}
                <Link href="/account-deletion">
                  <span className="text-neutral-accentWarm hover:underline dark:text-dark-gold cursor-pointer">
                    Exclusão de Conta
                  </span>
                </Link>
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Dialog para usuário com conta pendente */}
      <Dialog open={showPendingDialog} onOpenChange={setShowPendingDialog}>
        <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-[500px]">
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

      <Dialog open={showBiometricPrompt} onOpenChange={(open) => {
        if (!open && !biometricPromptResolvingRef.current) handleSkipBiometric();
      }}>
        <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-[425px]">
          <DialogHeader>
            <div className="mb-4 flex justify-center">
              <div className="liquid-glass-chip flex h-16 w-16 items-center justify-center rounded-2xl">
                <ShieldCheck className="h-8 w-8 text-neutral-accentWarm dark:text-dark-gold" />
              </div>
            </div>
            <DialogTitle className="text-center">Ativar entrada rapida?</DialogTitle>
            <DialogDescription className="text-center">
              Use {biometricStatus?.label || "biometria"} neste aparelho para abrir o MESC sem digitar senha.
              Sua senha nao fica salva no app.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex-col gap-2 sm:flex-row">
            <Button
              type="button"
              variant="outline"
              onClick={handleSkipBiometric}
              className="w-full sm:w-auto"
            >
              Agora nao
            </Button>
            <Button
              type="button"
              onClick={handleEnableBiometric}
              disabled={biometricBusy}
              className="w-full sm:w-auto"
            >
              <Fingerprint className="mr-2 h-4 w-4" />
              {biometricBusy ? "Ativando..." : "Ativar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog para Esqueci a Senha */}
      <Dialog open={showForgotPassword} onOpenChange={setShowForgotPassword}>
        <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-[425px]">
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
                className="min-h-11 bg-background text-base sm:text-sm"
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
