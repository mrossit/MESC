import { useState } from "react";
import { useLocation } from "wouter";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Church, Eye, EyeOff, CheckCircle } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export default function ChangePassword() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [showSuccess, setShowSuccess] = useState(false);
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false,
  });
  const [passwords, setPasswords] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  const queryClient = useQueryClient();

  const changePasswordMutation = useMutation({
    mutationFn: async (data: typeof passwords) => {

      try {
        const result = await apiRequest("POST", "/api/auth/change-password", data);
        return result;
      } catch (error) {
        throw error;
      }
    },
    onSuccess: async () => {
      // Fazer logout para limpar a sessão
      await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "include",
      });

      // Limpar cache de autenticação
      queryClient.clear();

      // Mostrar tela de sucesso
      setShowSuccess(true);
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao alterar senha",
        description: error.message || "Ocorreu um erro ao alterar a senha",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (passwords.newPassword !== passwords.confirmPassword) {
      toast({
        title: "Senhas não coincidem",
        description: "A nova senha e a confirmação devem ser iguais",
        variant: "destructive",
      });
      return;
    }

    if (passwords.newPassword.length < 8) {
      toast({
        title: "Senha muito fraca",
        description: "A nova senha deve ter pelo menos 8 caracteres",
        variant: "destructive",
      });
      return;
    }

    changePasswordMutation.mutate(passwords);
  };

  const handlePasswordChange = (field: keyof typeof passwords, value: string) => {
    setPasswords(prev => ({ ...prev, [field]: value }));
  };

  const togglePasswordVisibility = (field: keyof typeof showPasswords) => {
    setShowPasswords(prev => ({ ...prev, [field]: !prev[field] }));
  };

  const getPasswordStrength = (password: string) => {
    if (password.length < 6) return { strength: "fraca", color: "text-red-500" };
    if (password.length < 8) return { strength: "média", color: "text-yellow-500" };
    if (password.match(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)) {
      return { strength: "forte", color: "text-green-500" };
    }
    return { strength: "média", color: "text-yellow-500" };
  };

  const passwordStrength = getPasswordStrength(passwords.newPassword);

  // Tela de sucesso
  if (showSuccess) {
    return (
      <div className="min-h-screen bg-gradient-responsive pattern-bg-responsive flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="space-y-1">
            <div className="flex items-center justify-center mb-4">
              <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-full">
                <CheckCircle className="h-8 w-8 text-green-600 dark:text-green-400" />
              </div>
            </div>
            <CardTitle className="text-2xl font-bold text-center text-green-700 dark:text-green-400">
              Senha Alterada com Sucesso!
            </CardTitle>
            <p className="text-muted-foreground text-center text-sm">
              Sua nova senha foi salva com segurança. Agora você pode fazer login com ela.
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert className="bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800">
              <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
              <AlertDescription className="text-green-800 dark:text-green-300">
                Por segurança, você foi desconectado do sistema. Use sua nova senha para fazer login novamente.
              </AlertDescription>
            </Alert>

            <Button
              className="w-full"
              onClick={() => navigate("/login")}
              data-testid="button-go-to-login"
            >
              Ir para o Login
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Tela de troca de senha
  return (
    <div className="min-h-screen bg-gradient-responsive pattern-bg-responsive flex items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-liturgical border-border/50">
        <CardHeader className="text-center pb-4">
          <div className="flex justify-center mb-2">
            <img
              src="/logo-santuario.png"
              alt="Santuário São Judas Tadeu"
              className="h-40 w-40 object-contain"
            />
          </div>
          <CardTitle className="text-2xl font-bold text-foreground mb-1">
            Alteração de Senha
          </CardTitle>
          <p className="text-muted-foreground text-sm">
            Crie uma nova senha para manter sua conta segura
          </p>
        </CardHeader>
        <CardContent>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="currentPassword" className="text-foreground font-medium">
                Senha Atual
              </Label>
              <div className="relative">
                <Input
                  id="currentPassword"
                  type={showPasswords.current ? "text" : "password"}
                  placeholder="Digite sua senha atual"
                  value={passwords.currentPassword}
                  onChange={(e) => handlePasswordChange("currentPassword", e.target.value)}
                  className="border-border focus:border-ring focus:ring-ring pr-12"
                  required
                  data-testid="input-current-password"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={() => togglePasswordVisibility("current")}
                  data-testid="button-toggle-current-password"
                >
                  {showPasswords.current ? (
                    <EyeOff className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <Eye className="h-4 w-4 text-muted-foreground" />
                  )}
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="newPassword" className="text-foreground font-medium">
                Nova Senha
              </Label>
              <div className="relative">
                <Input
                  id="newPassword"
                  type={showPasswords.new ? "text" : "password"}
                  placeholder="Digite sua nova senha"
                  value={passwords.newPassword}
                  onChange={(e) => handlePasswordChange("newPassword", e.target.value)}
                  className="border-border focus:border-ring focus:ring-ring pr-12"
                  required
                  data-testid="input-new-password"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={() => togglePasswordVisibility("new")}
                  data-testid="button-toggle-new-password"
                >
                  {showPasswords.new ? (
                    <EyeOff className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <Eye className="h-4 w-4 text-muted-foreground" />
                  )}
                </Button>
              </div>
              {passwords.newPassword && (
                <p className={`text-xs ${passwordStrength.color}`}>
                  Força da senha: {passwordStrength.strength}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword" className="text-foreground font-medium">
                Confirmar Nova Senha
              </Label>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  type={showPasswords.confirm ? "text" : "password"}
                  placeholder="Confirme sua nova senha"
                  value={passwords.confirmPassword}
                  onChange={(e) => handlePasswordChange("confirmPassword", e.target.value)}
                  className="border-border focus:border-ring focus:ring-ring pr-12"
                  required
                  data-testid="input-confirm-password"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={() => togglePasswordVisibility("confirm")}
                  data-testid="button-toggle-confirm-password"
                >
                  {showPasswords.confirm ? (
                    <EyeOff className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <Eye className="h-4 w-4 text-muted-foreground" />
                  )}
                </Button>
              </div>
              {passwords.confirmPassword && passwords.newPassword !== passwords.confirmPassword && (
                <p className="text-xs text-red-500">
                  As senhas não coincidem
                </p>
              )}
            </div>

            <div className="space-y-3 pt-2">
              <Button
                type="submit"
                className="w-full bg-burgundy hover:bg-burgundy-soft text-white font-medium"
                disabled={
                  changePasswordMutation.isPending ||
                  !passwords.currentPassword ||
                  !passwords.newPassword ||
                  !passwords.confirmPassword ||
                  passwords.newPassword !== passwords.confirmPassword
                }
                data-testid="button-change-password"
              >
                {changePasswordMutation.isPending ? "Alterando..." : "Alterar Senha"}
              </Button>
              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={() => navigate("/dashboard")}
              >
                Cancelar
              </Button>
            </div>
          </form>

          <div className="mt-6">
            <Alert className="border-border/50">
              <AlertDescription className="text-xs text-muted-foreground">
                <strong>Dicas para uma senha segura:</strong>
                <ul className="mt-1 space-y-1 list-disc list-inside">
                  <li>Use pelo menos 8 caracteres</li>
                  <li>Inclua letras maiúsculas e minúsculas</li>
                  <li>Adicione números e símbolos</li>
                  <li>Evite informações pessoais óbvias</li>
                </ul>
              </AlertDescription>
            </Alert>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}