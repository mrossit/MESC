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
import { toast } from "@/hooks/use-toast";

export default function ChangePassword() {
  const [, navigate] = useLocation();
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
    mutationFn: (data: typeof passwords) =>
      apiRequest("POST", "/api/auth/change-password", data),
    onSuccess: () => {
      toast({
        title: "Senha alterada com sucesso",
        description: "Você agora pode acessar o sistema normalmente.",
      });
      navigate("/dashboard");
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

  return (
    <div className="min-h-screen bg-gradient-bg pattern-bg flex items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-liturgical border-mesc-beige/30">
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
            Para sua segurança, é necessário alterar a senha padrão
          </p>
        </CardHeader>
        <CardContent>
          <Alert className="mb-6 border-mesc-gold/50 bg-muted/50">
            <CheckCircle className="h-4 w-4 text-mesc-gold" />
            <AlertDescription className="text-sm text-muted-foreground">
              <strong>Primeiro acesso detectado.</strong> Por favor, crie uma nova senha segura para proteger sua conta.
            </AlertDescription>
          </Alert>

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
                  className="border-mesc-beige focus:border-mesc-gold focus:ring-mesc-gold pr-12"
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
                  className="border-mesc-beige focus:border-mesc-gold focus:ring-mesc-gold pr-12"
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
                  className="border-mesc-beige focus:border-mesc-gold focus:ring-mesc-gold pr-12"
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
                className="w-full bg-mesc-red hover:bg-mesc-red/90 text-mesc-pearl font-medium"
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
            </div>
          </form>

          <div className="mt-6">
            <Alert className="border-mesc-beige/50">
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