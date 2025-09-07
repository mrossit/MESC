import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { motion } from "framer-motion";
import { 
  ArrowLeft, Eye, EyeOff, Loader2, Mail, Lock, User, Phone, Church, 
  AlertCircle, CheckCircle, Calendar, MapPin, Heart, Building2, Sparkles,
  MessageSquare, Users
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function Register() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    whatsapp: "",
    password: "",
    confirmPassword: "",
    birthDate: "",
    address: "",
    parishOrigin: "",
    timeAsMinister: "",
    motivation: ""
  });

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    
    // Validações
    if (formData.password !== formData.confirmPassword) {
      setError("As senhas não coincidem");
      return;
    }
    
    if (formData.password.length < 8) {
      setError("A senha deve ter pelo menos 8 caracteres");
      return;
    }
    
    setIsLoading(true);

    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          phone: formData.phone,
          whatsapp: formData.whatsapp,
          password: formData.password,
          birthDate: formData.birthDate,
          address: formData.address,
          parishOrigin: formData.parishOrigin,
          timeAsMinister: formData.timeAsMinister,
          motivation: formData.motivation
        }),
      });

      const data = await response.json();

      if (data.success) {
        setSuccess(true);
        toast({
          title: "Cadastro realizado com sucesso!",
          description: "Aguarde a aprovação do coordenador para acessar o sistema.",
        });
        
        // Aguarda 3 segundos e redireciona para login
        setTimeout(() => {
          setLocation("/login");
        }, 3000);
      } else {
        setError(data.message || "Erro ao realizar cadastro");
      }
    } catch (err) {
      setError("Erro de conexão. Tente novamente.");
    } finally {
      setIsLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center gradient-bg pattern-bg p-4">
        <motion.div 
          className="w-full max-w-md"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
        >
          <Card className="shadow-liturgical border bg-card">
            <CardContent className="p-8">
              <div className="text-center">
                <motion.div 
                  className="mx-auto mb-4 w-16 h-16 bg-gradient-to-br from-[rgb(184,150,63)]/20 to-[rgb(160,82,45)]/10 rounded-full flex items-center justify-center"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", stiffness: 260, damping: 20 }}
                >
                  <CheckCircle className="h-8 w-8 text-[rgb(184,150,63)]" />
                </motion.div>
                <h2 className="text-2xl font-bold text-[rgb(74,58,40)] mb-2">
                  Cadastro Realizado com Sucesso!
                </h2>
                <p className="text-[rgb(92,72,55)] mb-4">
                  Seu pedido foi enviado para aprovação.
                </p>
                <Badge variant="secondary" className="mb-4">
                  Aguardando Aprovação
                </Badge>
                <p className="text-sm text-muted-foreground">
                  Você receberá um email quando sua conta for aprovada pela coordenação.
                </p>
                <div className="mt-6 pt-6 border-t">
                  <p className="text-xs text-muted-foreground flex items-center justify-center gap-2">
                    <Loader2 className="w-3 h-3 animate-spin" />
                    Redirecionando para o login...
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center gradient-bg pattern-bg p-4">
      <motion.div 
        className="w-full max-w-2xl"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <Card className="shadow-liturgical border bg-card/95 backdrop-blur-sm">
          <CardHeader className="p-6 text-center relative">
            <motion.div 
              className="mx-auto mb-4 relative"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 260, damping: 20 }}
            >
              <div className="absolute inset-0 bg-gradient-to-br from-[rgb(184,150,63)]/20 to-[rgb(160,82,45)]/10 rounded-full blur-xl" />
              <img 
                src="/LogoSJT.png" 
                alt="Santuário São Judas Tadeu" 
                className="h-24 w-auto mx-auto relative z-10"
              />
            </motion.div>
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <h1 className="text-2xl font-bold bg-gradient-to-r from-[rgb(74,58,40)] to-[rgb(160,82,45)] bg-clip-text text-transparent">
                Cadastro de Novo Ministro
              </h1>
              <div className="flex items-center justify-center gap-2 mt-2">
                <Badge variant="secondary" className="text-xs">
                  <Users className="w-3 h-3 mr-1" />
                  MESC
                </Badge>
                <Badge variant="outline" className="text-xs">
                  Formulário de Adesão
                </Badge>
              </div>
              <p className="text-[rgb(184,150,63)] font-medium text-sm mt-3">
                Santuário São Judas Tadeu - Sorocaba/SP
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Preencha todos os campos obrigatórios (*) para solicitar sua participação
              </p>
            </motion.div>
          </CardHeader>

          <CardContent className="p-6 pt-0">
            <form onSubmit={handleRegister} className="space-y-6">
              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <div className="space-y-4">
                <div className="text-sm font-medium text-[rgb(92,72,55)] flex items-center gap-2">
                  <User className="w-4 h-4" />
                  Dados Pessoais
                </div>
                <Separator className="bg-[rgb(245,241,232)]" />
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Nome Completo*</Label>
                    <div className="relative">
                      <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="name"
                        type="text"
                        placeholder="Seu nome completo"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        className="pl-9"
                        required
                        disabled={isLoading}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="birthDate">Data de Nascimento*</Label>
                    <div className="relative">
                      <Calendar className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="birthDate"
                        type="date"
                        value={formData.birthDate}
                        onChange={(e) => setFormData({ ...formData, birthDate: e.target.value })}
                        className="pl-9"
                        required
                        disabled={isLoading}
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email*</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="email"
                        type="email"
                        placeholder="seu.email@exemplo.com"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        className="pl-9"
                        required
                        disabled={isLoading}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="phone">Telefone*</Label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="phone"
                        type="tel"
                        placeholder="(15) 99999-9999"
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        className="pl-9"
                        required
                        disabled={isLoading}
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="whatsapp">WhatsApp</Label>
                    <div className="relative">
                      <MessageSquare className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="whatsapp"
                        type="tel"
                        placeholder="(15) 99999-9999"
                        value={formData.whatsapp}
                        onChange={(e) => setFormData({ ...formData, whatsapp: e.target.value })}
                        className="pl-9"
                        disabled={isLoading}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="address">Endereço Completo*</Label>
                    <div className="relative">
                      <MapPin className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="address"
                        type="text"
                        placeholder="Rua, número, bairro"
                        value={formData.address}
                        onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                        className="pl-9"
                        required
                        disabled={isLoading}
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="text-sm font-medium text-[rgb(92,72,55)] flex items-center gap-2">
                  <Church className="w-4 h-4" />
                  Informações Ministeriais
                </div>
                <Separator className="bg-[rgb(245,241,232)]" />
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="parishOrigin">Paróquia de Origem*</Label>
                    <div className="relative">
                      <Building2 className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="parishOrigin"
                        type="text"
                        placeholder="Nome da paróquia"
                        value={formData.parishOrigin}
                        onChange={(e) => setFormData({ ...formData, parishOrigin: e.target.value })}
                        className="pl-9"
                        required
                        disabled={isLoading}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="timeAsMinister">Tempo como Ministro*</Label>
                    <Select 
                      value={formData.timeAsMinister} 
                      onValueChange={(value) => setFormData({ ...formData, timeAsMinister: value })}
                      disabled={isLoading}
                    >
                      <SelectTrigger className="pl-9">
                        <Heart className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                        <SelectValue placeholder="Selecione o tempo" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="novo">Sou novo no ministério</SelectItem>
                        <SelectItem value="menos1">Menos de 1 ano</SelectItem>
                        <SelectItem value="1a3">1 a 3 anos</SelectItem>
                        <SelectItem value="3a5">3 a 5 anos</SelectItem>
                        <SelectItem value="mais5">Mais de 5 anos</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="motivation">Motivação (opcional)</Label>
                  <Textarea
                    id="motivation"
                    placeholder="Por que deseja ser um Ministro Extraordinário da Sagrada Comunhão?"
                    value={formData.motivation}
                    onChange={(e) => setFormData({ ...formData, motivation: e.target.value })}
                    rows={3}
                    disabled={isLoading}
                    className="resize-none"
                  />
                  <p className="text-xs text-muted-foreground">Máximo de 500 caracteres</p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="text-sm font-medium text-[rgb(92,72,55)] flex items-center gap-2">
                  <Lock className="w-4 h-4" />
                  Dados de Acesso
                </div>
                <Separator className="bg-[rgb(245,241,232)]" />
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="password">Senha*</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        placeholder="Mínimo 8 caracteres"
                        value={formData.password}
                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                        className="pl-9 pr-9"
                        required
                        disabled={isLoading}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-3 text-muted-foreground hover:text-foreground"
                      >
                        {showPassword ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword">Confirmar Senha*</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="confirmPassword"
                        type={showConfirmPassword ? "text" : "password"}
                        placeholder="Repita a senha"
                        value={formData.confirmPassword}
                        onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                        className="pl-9 pr-9"
                        required
                        disabled={isLoading}
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-3 top-3 text-muted-foreground hover:text-foreground"
                      >
                        {showConfirmPassword ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <Separator className="bg-[rgb(245,241,232)]" />
              
              <div className="flex gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setLocation("/login")}
                  className="flex-1 border-[rgb(184,150,63)]/30 hover:bg-[rgb(184,150,63)]/5"
                  disabled={isLoading}
                >
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Voltar
                </Button>
                <Button
                  type="submit"
                  className="flex-1 bg-gradient-to-r from-[rgb(160,82,45)] to-[rgb(184,115,51)] hover:from-[rgb(160,82,45)]/90 hover:to-[rgb(184,115,51)]/90 shadow-lg"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Enviando Solicitação...
                    </>
                  ) : (
                    <>
                      <Sparkles className="mr-2 h-4 w-4" />
                      Enviar Solicitação de Cadastro
                    </>
                  )}
                </Button>
              </div>
            </form>

            <div className="mt-6 p-4 bg-[rgb(247,244,237)]/50 rounded-lg text-center">
              <p className="text-xs text-muted-foreground mb-2">Já possui cadastro aprovado?</p>
              <button
                onClick={() => setLocation("/login")}
                className="text-sm text-[rgb(184,150,63)] hover:text-[rgb(184,150,63)]/80 font-medium transition-colors flex items-center justify-center gap-1 mx-auto"
              >
                <ArrowLeft className="w-3 h-3" />
                Voltar para o Login
              </button>
            </div>
          </CardContent>
        </Card>

        <motion.div 
          className="text-center mt-6 text-sm text-muted-foreground"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
        >
          <div className="flex items-center justify-center gap-4 mb-2">
            <Badge variant="outline" className="text-xs">
              LGPD Compliant
            </Badge>
            <Badge variant="outline" className="text-xs">
              Dados Protegidos
            </Badge>
          </div>
          <p>© 2025 Santuário São Judas Tadeu - Sorocaba/SP</p>
          <p className="mt-1">Ministério Extraordinário da Sagrada Comunhão</p>
        </motion.div>
      </motion.div>
    </div>
  );
}