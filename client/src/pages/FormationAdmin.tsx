import { Layout } from "@/components/layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function FormationAdmin() {
  return (
    <Layout
      title="Administração da Formação"
      subtitle="Operação temporariamente indisponível"
    >
      <Card>
        <CardHeader>
          <CardTitle>Área administrativa em manutenção</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <p>
            A gestão avançada da formação litúrgica está passando por uma atualização.
            Entre em contato com o suporte caso precise cadastrar ou ajustar conteúdos
            enquanto concluímos a migração para o novo modelo de dados.
          </p>
        </CardContent>
      </Card>
    </Layout>
  );
}
