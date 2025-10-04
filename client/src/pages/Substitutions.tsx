import { Layout } from "@/components/layout";
import { Card, CardContent } from "@/components/ui/card";
import { MessageSquare } from "lucide-react";

export default function Substitutions() {
  return (
    <Layout 
      title="Substituições"
      subtitle="Informações sobre substituições"
    >
      <div className="flex items-center justify-center min-h-[60vh]">
        <Card className="w-full max-w-2xl">
          <CardContent className="flex flex-col items-center justify-center p-12 text-center space-y-6">
            <MessageSquare className="h-20 w-20 text-primary" />
            <h2 className="text-2xl sm:text-3xl font-bold">
              PARA SUBSTITUIÇÕES, POR GENTILEZA INFORMAR NO GRUPO DO WHATSAPP!
            </h2>
            <p className="text-muted-foreground text-lg">
              Para solicitar ou oferecer substituições, utilize o grupo oficial do WhatsApp da comunidade.
            </p>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
