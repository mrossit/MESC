import { Layout } from "@/components/layout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Construction, ChevronLeft } from "lucide-react";
import { useLocation } from "wouter";

export default function Substitutions() {
  const [, navigate] = useLocation();

  return (
    <Layout
      title="Substituições"
      subtitle="Informações sobre substituições"
    >
      <div className="flex items-center justify-center min-h-[60vh]">
        <Card className="w-full max-w-2xl">
          <CardContent className="flex flex-col items-center justify-center p-12 text-center space-y-6">
            <Construction className="h-24 w-24 text-orange-500" />
            <h2 className="text-3xl sm:text-4xl font-bold text-orange-600">
              EM CONSTRUÇÃO
            </h2>
            <p className="text-muted-foreground text-lg">
              Esta funcionalidade está em desenvolvimento.
            </p>
            <Button
              onClick={() => navigate("/dashboard")}
              size="lg"
              className="mt-4"
            >
              <ChevronLeft className="h-5 w-5 mr-2" />
              VOLTAR
            </Button>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
