import { Link, useLocation } from "wouter";
import { ArrowLeft, LogIn, Mail, ShieldCheck, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

export default function AccountDeletion() {
  const [, setLocation] = useLocation();

  return (
    <div className="container mx-auto max-w-4xl px-4 py-8">
      <Button
        variant="ghost"
        onClick={() => window.history.back()}
        className="mb-4 -ml-2"
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        Voltar
      </Button>

      <div className="mb-8">
        <h1 className="flex items-center gap-3 text-3xl font-bold text-[#8B0000] sm:text-4xl">
          <Trash2 className="h-9 w-9" />
          Exclusão de conta e dados
        </h1>
        <p className="mt-2 text-muted-foreground">
          Solicite ou realize a exclusão da sua conta MESC e dos dados pessoais associados.
        </p>
      </div>

      <Separator className="my-6" />

      <div className="grid gap-4 md:grid-cols-[1.1fr_0.9fr]">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5" />
              Como excluir sua conta
            </CardTitle>
            <CardDescription>
              O processo está disponível no próprio app e também pode ser iniciado por esta página.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <ol className="list-decimal space-y-2 pl-5">
              <li>Entre com sua conta MESC.</li>
              <li>Acesse <strong>Configurações</strong>.</li>
              <li>Abra a aba <strong>Conta</strong>.</li>
              <li>Leia o impacto da exclusão e confirme digitando a frase solicitada.</li>
            </ol>

            <div className="flex flex-col gap-2 sm:flex-row">
              <Button onClick={() => setLocation("/login")} className="gap-2">
                <LogIn className="h-4 w-4" />
                Entrar para excluir
              </Button>
              <Button variant="outline" onClick={() => setLocation("/settings")}>
                Abrir configurações
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>O que acontece com os dados</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <p>
              Dados pessoais como nome, email, telefone, foto, vínculos familiares e dados
              sacramentais são removidos ou anonimizados.
            </p>
            <p>
              Registros operacionais necessários para continuidade pastoral, auditoria e
              segurança podem ser preservados sem identificação pessoal direta.
            </p>
            <p>
              Se você não consegue acessar sua conta, solicite ajuda pelo contato do DPO.
            </p>
            <a
              href="mailto:dpo@saojudastadeu.app?subject=Solicitacao%20de%20exclusao%20de%20conta%20MESC"
              className="inline-flex items-center gap-2 font-medium text-primary hover:underline"
            >
              <Mail className="h-4 w-4" />
              dpo@saojudastadeu.app
            </a>
          </CardContent>
        </Card>
      </div>

      <p className="mt-6 text-xs text-muted-foreground">
        Consulte também a <Link href="/privacy-policy" className="text-primary hover:underline">Política de Privacidade</Link>.
      </p>
    </div>
  );
}
