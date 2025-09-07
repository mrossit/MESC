import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Church, Cross } from "lucide-react";

import { useLocation } from "wouter";

export default function Landing() {
  const [, setLocation] = useLocation();
  
  const handleLogin = () => {
    setLocation("/login");
  };

  return (
    <div className="min-h-screen flex items-center justify-center gradient-bg pattern-bg">
      <div className="w-full max-w-md animate-fade-in">
        <Card className="shadow-liturgical border bg-card">
          <CardContent className="p-6">
            <div className="text-center mb-6">
              <div className="mx-auto mb-6">
                <img 
                  src="/LogoSJT.png" 
                  alt="Santuário São Judas Tadeu" 
                  className="h-32 w-auto mx-auto"
                />
              </div>
              <h1 className="text-4xl font-bold mb-2">
                Sistema MESC
              </h1>
              <p className="text-accent font-semibold">Santuário São Judas Tadeu</p>
              <p className="text-sm text-muted-foreground mt-1">
                Ministros Extraordinários da Sagrada Comunhão
              </p>
            </div>

            <div className="space-y-6">
              <div className="text-center">
                <p className="text-sm text-muted-foreground mb-4">
                  Faça login para acessar o sistema de gestão do ministério
                </p>
                
                <Button 
                  onClick={handleLogin}
                  className="w-full"
                  size="lg"
                  data-testid="button-login"
                >
                  <Church className="w-5 h-5 mr-2" />
                  Entrar no Sistema
                </Button>
              </div>

              <div className="text-center text-xs text-muted-foreground space-y-1">
                <p>Não possui acesso?</p>
                <p>Entre em contato com a coordenação do ministério</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="text-center mt-8 text-sm text-muted-foreground">
          <p>© 2025 Santuário São Judas Tadeu - Sorocaba/SP</p>
          <p className="mt-1">Versão 1.0.0 MVP</p>
        </div>
      </div>
    </div>
  );
}
