import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { 
  Church, 
  Eye, 
  EyeOff, 
  Loader2, 
  Mail, 
  Lock, 
  AlertCircle,
  Sparkles,
  Shield,
  ArrowRight,
  KeyRound,
  UserPlus,
  Info
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import sjtLogo from "@assets/sjtlogo.png";

export default function Login() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const [isRedirecting, setIsRedirecting] = useState(false);
  
  const [formData, setFormData] = useState({
    email: "",
    password: ""
  });

  useEffect(() => {
    const savedEmail = localStorage.getItem("rememberedEmail");
    if (savedEmail) {
      setFormData(prev => ({ ...prev, email: savedEmail }));
      setRememberMe(true);
    }
  }, []);


  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (data.success) {
        // Salva o token no localStorage
        localStorage.setItem("token", data.token);
        localStorage.setItem("user", JSON.stringify(data.user));
        
        if (rememberMe) {
          localStorage.setItem("rememberedEmail", formData.email);
        } else {
          localStorage.removeItem("rememberedEmail");
        }
        
        setIsRedirecting(true);
        
        toast({
          title: "Login realizado com sucesso!",
          description: `Bem-vindo(a), ${data.user.name}!`,
        });
        
        // Redireciona para o dashboard
        setTimeout(() => {
          setLocation("/");
        }, 1000);
      } else {
        setError(data.message || "Erro ao fazer login");
      }
    } catch (err) {
      setError("Erro de conexão. Tente novamente.");
    } finally {
      setIsLoading(false);
    }
  };


  return (
    <div className="min-h-screen flex items-center justify-center gradient-bg pattern-bg p-4 relative overflow-hidden">
      {/* Elementos decorativos animados */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-[rgb(184,150,63)]/5 rounded-full blur-3xl animate-pulse" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-[rgb(160,82,45)]/5 rounded-full blur-3xl animate-pulse delay-1000" />
      </div>
      <motion.div 
        className="w-full max-w-md z-10"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <AnimatePresence mode="wait">
          {isRedirecting ? (
            <motion.div
              key="redirecting"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.1 }}
              className="text-center p-8"
            >
              <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-gradient-to-br from-[rgb(184,150,63)]/30 to-[rgb(160,82,45)]/20 flex items-center justify-center">
                <Sparkles className="w-10 h-10 text-[rgb(74,58,40)] animate-pulse" />
              </div>
              <h2 className="text-2xl font-bold text-[rgb(74,58,40)] mb-2">Bem-vindo!</h2>
              <p className="text-[rgb(160,82,45)]">Redirecionando para o sistema...</p>
              <Loader2 className="w-6 h-6 mx-auto mt-4 text-[rgb(184,150,63)] animate-spin" />
            </motion.div>
          ) : (
            <motion.div
              key="login-form"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
        <Card className="shadow-liturgical border bg-card/95 backdrop-blur-sm">
          <CardHeader className="p-6 text-center relative">
            <motion.div 
              className="mx-auto mb-6 relative"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 260, damping: 20 }}
            >
              <div className="absolute inset-0 bg-gradient-to-br from-[rgb(184,150,63)]/20 to-[rgb(160,82,45)]/10 rounded-full blur-2xl scale-110" />
              <img 
                src={sjtLogo} 
                alt="Santuário São Judas Tadeu" 
                className="h-40 w-auto mx-auto relative z-10 drop-shadow-lg ml-[0px] mr-[0px]"
              />
            </motion.div>
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <h1 className="text-2xl font-bold bg-gradient-to-r from-[rgb(74,58,40)] to-[rgb(160,82,45)] bg-clip-text text-transparent">
                Sistema MESC
              </h1>
              <div className="flex items-center justify-center gap-2 mt-2">
                <Badge variant="secondary" className="text-xs">
                  <Shield className="w-3 h-3 mr-1" />
                  Conexão Segura
                </Badge>
                <Badge variant="outline" className="text-xs">
                  v2.0
                </Badge>
              </div>
              <p className="text-accent font-medium text-sm mt-3">
                Santuário São Judas Tadeu
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Ministros Extraordinários da Sagrada Comunhão
              </p>
            </motion.div>
          </CardHeader>

          <CardContent className="p-6 pt-0">
            <form onSubmit={handleLogin} className="space-y-4">
                <AnimatePresence>
                  {error && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                    >
                      <Alert variant="destructive" className="border-red-200 bg-red-50/50">
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>{error}</AlertDescription>
                      </Alert>
                    </motion.div>
                  )}
                </AnimatePresence>

                <motion.div 
                  className="space-y-2"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.3 }}
                >
                  <Label htmlFor="email" className="flex items-center gap-2">
                    Email
                    {focusedField === "email" && (
                      <Badge variant="secondary" className="text-xs animate-pulse">
                        Digite seu email
                      </Badge>
                    )}
                  </Label>
                  <div className="relative group">
                    <Mail className={cn(
                      "absolute left-3 top-3 h-4 w-4 transition-colors",
                      focusedField === "email" ? "text-[rgb(184,150,63)]" : "text-muted-foreground"
                    )} />
                    <Input
                      id="email"
                      type="email"
                      placeholder="seu.email@exemplo.com"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      onFocus={() => setFocusedField("email")}
                      onBlur={() => setFocusedField(null)}
                      className={cn(
                        "pl-9 transition-all",
                        focusedField === "email" && "ring-2 ring-[rgb(184,150,63)]/30 border-[rgb(184,150,63)]/50"
                      )}
                      required
                      disabled={isLoading}
                    />
                  </div>
                </motion.div>

                <motion.div 
                  className="space-y-2"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.4 }}
                >
                  <Label htmlFor="password" className="flex items-center gap-2">
                    Senha
                    {focusedField === "password" && (
                      <Badge variant="secondary" className="text-xs animate-pulse">
                        Digite sua senha
                      </Badge>
                    )}
                  </Label>
                  <div className="relative group">
                    <Lock className={cn(
                      "absolute left-3 top-3 h-4 w-4 transition-colors",
                      focusedField === "password" ? "text-[rgb(184,150,63)]" : "text-muted-foreground"
                    )} />
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="••••••••"
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      onFocus={() => setFocusedField("password")}
                      onBlur={() => setFocusedField(null)}
                      className={cn(
                        "pl-9 pr-9 transition-all",
                        focusedField === "password" && "ring-2 ring-[rgb(184,150,63)]/30 border-[rgb(184,150,63)]/50"
                      )}
                      required
                      disabled={isLoading}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-3 text-muted-foreground hover:text-foreground transition-colors"
                    >
                      <motion.div
                        key={showPassword ? "eye-off" : "eye"}
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ type: "spring", stiffness: 300 }}
                      >
                        {showPassword ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </motion.div>
                    </button>
                  </div>
                </motion.div>

                <motion.div 
                  className="flex items-center justify-between"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.5 }}
                >
                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id="remember" 
                      checked={rememberMe}
                      onCheckedChange={(checked) => setRememberMe(checked as boolean)}
                    />
                    <Label 
                      htmlFor="remember" 
                      className="text-sm font-normal cursor-pointer"
                    >
                      Lembrar-me
                    </Label>
                  </div>
                  <button
                    type="button"
                    className="text-sm text-[rgb(184,150,63)] hover:text-[rgb(184,150,63)]/80 transition-colors flex items-center gap-1"
                  >
                    <KeyRound className="w-3 h-3" />
                    Esqueci a senha
                  </button>
                </motion.div>


                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.6 }}
                >
                  <Button
                    type="submit"
                    className="w-full bg-gradient-to-r from-[rgb(160,82,45)] to-[rgb(184,115,51)] hover:from-[rgb(160,82,45)]/90 hover:to-[rgb(184,115,51)]/90 shadow-lg group"
                    size="lg"
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Entrando...
                      </>
                    ) : (
                      <>
                        <Church className="mr-2 h-4 w-4 group-hover:scale-110 transition-transform" />
                        Entrar no Sistema
                        <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                      </>
                    )}
                  </Button>
                </motion.div>
            </form>

            <Separator className="my-6" />
            
            <motion.div 
              className="text-center space-y-3"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.7 }}
            >
              <p className="text-sm text-muted-foreground">Não possui cadastro?</p>
              <Button
                type="button"
                variant="outline"
                onClick={() => setLocation("/register")}
                className="w-full group border-[rgb(184,150,63)]/30 hover:bg-[rgb(184,150,63)]/5"
              >
                <UserPlus className="mr-2 h-4 w-4 group-hover:scale-110 transition-transform" />
                Criar Nova Conta
                <Badge variant="secondary" className="ml-2 text-xs">
                  Grátis
                </Badge>
              </Button>
              <div className="flex items-center justify-center gap-1 text-xs text-muted-foreground">
                <Info className="w-3 h-3" />
                <p>Seu cadastro será enviado para aprovação</p>
              </div>
            </motion.div>
          </CardContent>
        </Card>
            </motion.div>
          )}
        </AnimatePresence>

        <motion.div 
          className="text-center mt-6 text-sm text-muted-foreground"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
        >
          <div className="flex items-center justify-center gap-4 mb-2">
            <Badge variant="outline" className="text-xs">
              <Shield className="w-3 h-3 mr-1" />
              SSL
            </Badge>
            <Badge variant="outline" className="text-xs">
              LGPD Compliant
            </Badge>
          </div>
          <p>© 2025 Santuário São Judas Tadeu - Sorocaba/SP</p>
          <p className="mt-1 flex items-center justify-center gap-2">
            Versão 2.0.0
            <Badge className="text-xs bg-gradient-to-r from-[rgb(184,150,63)]/20 to-[rgb(160,82,45)]/20 text-[rgb(74,58,40)] border-[rgb(184,150,63)]/30">
              <Sparkles className="w-3 h-3 mr-1" />
              Atualizado
            </Badge>
          </p>
        </motion.div>
      </motion.div>
    </div>
  );
}