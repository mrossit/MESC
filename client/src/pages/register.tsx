import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Church, Eye, EyeOff, CheckCircle, AlertCircle, MessageCircle } from "lucide-react";
import { authAPI } from "@/lib/auth";
import { toast } from "@/hooks/use-toast";

export default function Register() {
  const [, navigate] = useLocation();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [showDuplicateDialog, setShowDuplicateDialog] = useState(false);
  const [duplicateEmailMessage, setDuplicateEmailMessage] = useState("");
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
    role: "ministro" as const,
  });

  const registerMutation = useMutation({
    mutationFn: authAPI.register,
    onSuccess: () => {
      toast({
        title: "Cadastro realizado com sucesso!",
        description: "Aguarde a aprovação do coordenador para acessar o sistema.",
      });
      navigate("/login");
    },
    onError: (error: any) => {
      const errorMessage = error.message || "Falha ao criar conta";
      
      // Verifica se é erro de email duplicado
      if (errorMessage.includes("já foi cadastrado") || errorMessage.includes("já está cadastrado")) {
        setDuplicateEmailMessage(errorMessage);
        setShowDuplicateDialog(true);
      } else {
        toast({
          title: "Erro no cadastro",
          description: errorMessage,
          variant: "destructive",
        });
      }
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (formData.password !== formData.confirmPassword) {
      toast({
        title: "Erro",
        description: "As senhas não conferem",
        variant: "destructive",
      });
      return;
    }

    registerMutation.mutate(formData);
  };

  const handleInputChange = (field: keyof typeof formData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  if (registerMutation.isSuccess) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md shadow-liturgical border-border/30">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <div className="w-16 h-16 bg-green-100 rounded-2xl flex items-center justify-center">
                <CheckCircle className="h-8 w-8 text-green-600" />
              </div>
            </div>
            <CardTitle className="text-2xl font-bold text-foreground">
              Cadastro Realizado!
            </CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <p className="text-foreground/70">
              Seu cadastro foi enviado com sucesso. Aguarde a aprovação do coordenador 
              para acessar o sistema.
            </p>
            <p className="text-sm text-foreground/60">
              Você receberá uma confirmação por email quando sua conta for aprovada.
            </p>
            <Button
              onClick={() => navigate("/login")}
              className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-medium"
              data-testid="button-go-to-login"
            >
              Ir para Login
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-responsive pattern-bg-responsive flex items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-liturgical border-border/30">
        <CardHeader className="text-center pb-4">
          <div className="flex justify-center mb-2">
            <img 
              src="/logo-santuario.png" 
              alt="Santuário São Judas Tadeu" 
              className="h-40 w-40 object-contain"
            />
          </div>
          <CardTitle className="text-2xl font-bold text-foreground mb-1">
            Cadastro MESC
          </CardTitle>
          <p className="text-foreground/60 text-sm">
            Solicitação para Ministro da Sagrada Comunhão
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name" className="text-foreground font-medium">
                Nome Completo
              </Label>
              <Input
                id="name"
                type="text"
                placeholder="Seu nome completo"
                value={formData.name}
                onChange={(e) => handleInputChange("name", e.target.value)}
                className="border-border focus:border-primary focus:ring-primary"
                required
                data-testid="input-name"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email" className="text-foreground font-medium">
                Email
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="seu@email.com"
                value={formData.email}
                onChange={(e) => handleInputChange("email", e.target.value.toLowerCase().trim())}
                className="border-border focus:border-primary focus:ring-primary"
                autoComplete="email"
                autoCapitalize="off"
                autoCorrect="off"
                spellCheck="false"
                required
                data-testid="input-email"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone" className="text-foreground font-medium">
                Telefone (opcional)
              </Label>
              <Input
                id="phone"
                type="tel"
                placeholder="(15) 99999-9999"
                value={formData.phone}
                onChange={(e) => handleInputChange("phone", e.target.value)}
                className="border-border focus:border-primary focus:ring-primary"
                data-testid="input-phone"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="password" className="text-foreground font-medium">
                Senha
              </Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Crie uma senha"
                  value={formData.password}
                  onChange={(e) => handleInputChange("password", e.target.value)}
                  className="border-border focus:border-primary focus:ring-primary pr-12"
                  required
                  minLength={6}
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
                    <EyeOff className="h-4 w-4 text-foreground/60" />
                  ) : (
                    <Eye className="h-4 w-4 text-foreground/60" />
                  )}
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword" className="text-foreground font-medium">
                Confirmar Senha
              </Label>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  placeholder="Confirme sua senha"
                  value={formData.confirmPassword}
                  onChange={(e) => handleInputChange("confirmPassword", e.target.value)}
                  className="border-border focus:border-primary focus:ring-primary pr-12"
                  required
                  data-testid="input-confirm-password"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  data-testid="button-toggle-confirm-password"
                >
                  {showConfirmPassword ? (
                    <EyeOff className="h-4 w-4 text-foreground/60" />
                  ) : (
                    <Eye className="h-4 w-4 text-foreground/60" />
                  )}
                </Button>
              </div>
            </div>

            <Button
              type="submit"
              className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-medium"
              disabled={registerMutation.isPending}
              data-testid="button-register"
            >
              {registerMutation.isPending ? "Cadastrando..." : "Solicitar Cadastro"}
            </Button>
          </form>

          <div className="mt-6">
            <div className="text-center">
              <p className="text-sm text-foreground/60">
                Já tem uma conta?{" "}
                <Link href="/login">
                  <span className="text-primary hover:text-primary/80 font-medium cursor-pointer">
                    Faça login aqui
                  </span>
                </Link>
              </p>
            </div>

            <Alert className="mt-4 border-border/50 bg-muted/50">
              <AlertDescription className="text-sm text-foreground/70">
                <strong>Importante:</strong> Seu cadastro precisa ser aprovado pelo coordenador 
                antes de você poder acessar o sistema. Isso pode levar alguns dias.
              </AlertDescription>
            </Alert>
          </div>
        </CardContent>
      </Card>

      {/* Dialog para email duplicado */}
      <Dialog open={showDuplicateDialog} onOpenChange={setShowDuplicateDialog}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <div className="flex items-center justify-center mb-4">
              <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center">
                <AlertCircle className="h-8 w-8 text-amber-600" />
              </div>
            </div>
            <DialogTitle className="text-center">Email J\u00e1 Cadastrado</DialogTitle>
            <DialogDescription className="text-center space-y-3">
              <p className="text-base">
                {duplicateEmailMessage}
              </p>
              
              <div className="bg-blue-50 rounded-lg p-4 space-y-2 text-left">
                <div className="flex items-start gap-3">
                  <MessageCircle className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-medium text-blue-900">O que fazer:</p>
                    <ul className="text-sm text-blue-800 mt-1 space-y-1">
                      <li>\u2022 Se voc\u00ea j\u00e1 \u00e9 cadastrado, fa\u00e7a login com sua senha</li>
                      <li>\u2022 Se esqueceu a senha, entre em contato com a coordena\u00e7\u00e3o</li>
                      <li>\u2022 Se \u00e9 seu primeiro cadastro, verifique se digitou o email corretamente</li>
                    </ul>
                  </div>
                </div>
              </div>

              <div className="text-sm text-muted-foreground pt-2">
                Em caso de d\u00favidas, procure a coordena\u00e7\u00e3o ap\u00f3s a missa ou 
                entre em contato pelo WhatsApp do minist\u00e9rio.
              </div>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button 
              variant="outline"
              onClick={() => setShowDuplicateDialog(false)}
              className="w-full sm:w-auto"
            >
              Tentar Novamente
            </Button>
            <Button 
              onClick={() => navigate("/login")}
              className="w-full sm:w-auto"
            >
              Ir para Login
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
