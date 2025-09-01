import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Cross } from "lucide-react";

export default function Landing() {
  const handleLogin = () => {
    window.location.href = "/api/login";
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/10 via-background to-secondary/20">
      <div className="w-full max-w-md animate-fade-in">
        <Card className="shadow-xl">
          <CardContent className="pt-8 pb-8 px-8">
            <div className="text-center mb-8">
              <div className="w-20 h-20 bg-primary rounded-full mx-auto mb-4 flex items-center justify-center">
                <Cross className="text-primary-foreground text-2xl w-8 h-8" />
              </div>
              <h1 className="text-3xl font-heading font-bold text-foreground mb-2">
                Sistema MESC
              </h1>
              <p className="text-muted-foreground">Santuário São Judas Tadeu</p>
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
