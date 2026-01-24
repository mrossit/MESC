/**
 * Termos de Uso
 *
 * Esta página apresenta os termos e condições de uso do sistema MESC
 */

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { FileText, Users, Shield, AlertTriangle, Scale, Mail, ArrowLeft } from "lucide-react";

export default function TermsOfUse() {
  return (
    <div className="container mx-auto px-4 py-8 max-w-5xl">
      {/* Botão Voltar */}
      <Button
        variant="ghost"
        onClick={() => window.history.back()}
        className="mb-4 -ml-2"
      >
        <ArrowLeft className="h-4 w-4 mr-2" />
        Voltar
      </Button>

      {/* Cabeçalho */}
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-[#8B0000] mb-2 flex items-center gap-3">
          <Scale className="h-10 w-10" />
          Termos de Uso
        </h1>
        <p className="text-muted-foreground text-lg">
          Condições para utilização do Sistema MESC
        </p>
        <p className="text-sm text-muted-foreground mt-2">
          Última atualização: 24 de janeiro de 2025
        </p>
      </div>

      <Separator className="my-6" />

      {/* 1. Aceitação dos Termos */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            1. Aceitação dos Termos
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          <p>
            Ao acessar e utilizar o Sistema MESC (Ministros Extraordinários da Sagrada
            Comunhão), você concorda em cumprir e estar vinculado a estes Termos de Uso.
          </p>
          <p>
            Se você não concordar com qualquer parte destes termos, não poderá acessar
            ou utilizar o sistema.
          </p>
          <p>
            O uso contínuo do sistema após a publicação de alterações nestes termos
            constitui aceitação dessas alterações.
          </p>
        </CardContent>
      </Card>

      {/* 2. Descrição do Serviço */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>2. Descrição do Serviço</CardTitle>
          <CardDescription>
            O que é o Sistema MESC
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          <p>
            O MESC é um sistema de gestão desenvolvido para auxiliar na organização
            dos Ministros Extraordinários da Sagrada Comunhão da Paróquia Santuário
            São Judas Tadeu.
          </p>
          <p>O sistema oferece as seguintes funcionalidades:</p>
          <ul className="list-disc pl-6 space-y-1">
            <li>Gerenciamento de escalas de missas</li>
            <li>Registro de disponibilidade dos ministros</li>
            <li>Sistema de substituições</li>
            <li>Comunicação entre ministros e coordenação</li>
            <li>Formação ministerial online</li>
            <li>Notificações e lembretes</li>
          </ul>
        </CardContent>
      </Card>

      {/* 3. Elegibilidade e Cadastro */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            3. Elegibilidade e Cadastro
          </CardTitle>
          <CardDescription>
            Quem pode utilizar o sistema
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          <p>Para utilizar o MESC, você deve:</p>
          <ul className="list-disc pl-6 space-y-2">
            <li>
              Ser maior de 18 anos ou ter autorização dos pais/responsáveis
            </li>
            <li>
              Ser membro ativo da comunidade paroquial do Santuário São Judas Tadeu
            </li>
            <li>
              Ter sido aprovado pela coordenação do ministério para exercer
              a função de Ministro Extraordinário da Sagrada Comunhão
            </li>
            <li>
              Fornecer informações verdadeiras e atualizadas no cadastro
            </li>
          </ul>
          <p className="mt-4">
            O cadastro no sistema é realizado pela coordenação do ministério.
            Você é responsável por manter suas informações atualizadas e por
            proteger suas credenciais de acesso.
          </p>
        </CardContent>
      </Card>

      {/* 4. Responsabilidades do Usuário */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>4. Responsabilidades do Usuário</CardTitle>
          <CardDescription>
            Seus deveres ao utilizar o sistema
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          <p>Ao utilizar o MESC, você concorda em:</p>
          <ul className="list-disc pl-6 space-y-2">
            <li>
              <strong>Manter informações atualizadas:</strong> Atualizar sua
              disponibilidade e dados cadastrais regularmente
            </li>
            <li>
              <strong>Respeitar as escalas:</strong> Comparecer às missas em que
              está escalado ou solicitar substituição com antecedência
            </li>
            <li>
              <strong>Usar o sistema adequadamente:</strong> Não utilizar o
              sistema para fins diferentes dos previstos
            </li>
            <li>
              <strong>Proteger suas credenciais:</strong> Não compartilhar sua
              senha ou permitir que terceiros acessem sua conta
            </li>
            <li>
              <strong>Respeitar outros usuários:</strong> Manter comunicação
              respeitosa e adequada ao ambiente eclesial
            </li>
            <li>
              <strong>Reportar problemas:</strong> Informar à coordenação sobre
              erros ou uso indevido do sistema
            </li>
          </ul>
        </CardContent>
      </Card>

      {/* 5. Uso Aceitável */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            5. Uso Aceitável
          </CardTitle>
          <CardDescription>
            O que você não pode fazer
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          <p>É expressamente proibido:</p>
          <ul className="list-disc pl-6 space-y-2">
            <li>
              Tentar acessar contas de outros usuários
            </li>
            <li>
              Utilizar o sistema para enviar spam ou conteúdo inadequado
            </li>
            <li>
              Tentar burlar os mecanismos de segurança do sistema
            </li>
            <li>
              Coletar ou armazenar dados pessoais de outros usuários
            </li>
            <li>
              Utilizar scripts, bots ou ferramentas automatizadas
            </li>
            <li>
              Reproduzir, modificar ou distribuir o sistema sem autorização
            </li>
            <li>
              Usar o sistema para qualquer atividade ilegal
            </li>
          </ul>
          <div className="mt-4 p-3 bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded-lg">
            <p className="flex items-center gap-2 text-amber-800 dark:text-amber-200">
              <AlertTriangle className="h-4 w-4" />
              <strong>Importante:</strong> O descumprimento destas regras pode
              resultar na suspensão ou exclusão da sua conta.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* 6. Propriedade Intelectual */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>6. Propriedade Intelectual</CardTitle>
          <CardDescription>
            Direitos sobre o sistema
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          <p>
            O Sistema MESC, incluindo seu código-fonte, design, textos, gráficos
            e logotipos, é propriedade da Paróquia Santuário São Judas Tadeu ou
            de seus licenciadores.
          </p>
          <p>
            Você recebe uma licença limitada, não exclusiva e intransferível
            para usar o sistema de acordo com estes Termos de Uso.
          </p>
          <p>
            Esta licença não concede direito de:
          </p>
          <ul className="list-disc pl-6 space-y-1">
            <li>Modificar ou criar obras derivadas do sistema</li>
            <li>Descompilar ou fazer engenharia reversa</li>
            <li>Remover avisos de direitos autorais</li>
            <li>Sublicenciar ou transferir seus direitos de uso</li>
          </ul>
        </CardContent>
      </Card>

      {/* 7. Disponibilidade do Serviço */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>7. Disponibilidade do Serviço</CardTitle>
          <CardDescription>
            Sobre o funcionamento do sistema
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          <p>
            Nos esforçamos para manter o sistema disponível 24 horas por dia,
            7 dias por semana. No entanto, não garantimos disponibilidade
            ininterrupta.
          </p>
          <p>O serviço pode ser temporariamente indisponível devido a:</p>
          <ul className="list-disc pl-6 space-y-1">
            <li>Manutenção programada ou emergencial</li>
            <li>Atualizações do sistema</li>
            <li>Problemas técnicos ou de infraestrutura</li>
            <li>Eventos fora de nosso controle</li>
          </ul>
          <p className="mt-3">
            Tentaremos notificar os usuários com antecedência sobre manutenções
            programadas sempre que possível.
          </p>
        </CardContent>
      </Card>

      {/* 8. Limitação de Responsabilidade */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            8. Limitação de Responsabilidade
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          <p>
            O sistema é fornecido "como está" e "conforme disponível", sem
            garantias de qualquer tipo, expressas ou implícitas.
          </p>
          <p>
            A Paróquia Santuário São Judas Tadeu não será responsável por:
          </p>
          <ul className="list-disc pl-6 space-y-2">
            <li>
              Danos diretos, indiretos, incidentais ou consequenciais
              decorrentes do uso ou impossibilidade de uso do sistema
            </li>
            <li>
              Perda de dados devido a falhas técnicas
            </li>
            <li>
              Ações de terceiros ou outros usuários do sistema
            </li>
            <li>
              Interrupções no serviço por motivos fora de nosso controle
            </li>
          </ul>
          <p className="mt-3">
            Você concorda em usar o sistema por sua conta e risco.
          </p>
        </CardContent>
      </Card>

      {/* 9. Suspensão e Encerramento */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>9. Suspensão e Encerramento</CardTitle>
          <CardDescription>
            Quando sua conta pode ser afetada
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          <p>
            A coordenação do ministério pode suspender ou encerrar seu acesso
            ao sistema a qualquer momento, com ou sem aviso prévio, caso:
          </p>
          <ul className="list-disc pl-6 space-y-2">
            <li>Você viole estes Termos de Uso</li>
            <li>Você deixe de ser ministro ativo</li>
            <li>Seja identificado uso indevido do sistema</li>
            <li>Seja solicitado por você mesmo</li>
            <li>Seja necessário por razões legais ou de segurança</li>
          </ul>
          <p className="mt-3">
            Em caso de encerramento, seus dados serão tratados conforme nossa
            Política de Privacidade.
          </p>
        </CardContent>
      </Card>

      {/* 10. Alterações nos Termos */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>10. Alterações nos Termos</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          <p>
            Reservamo-nos o direito de modificar estes Termos de Uso a qualquer
            momento. Alterações significativas serão comunicadas por:
          </p>
          <ul className="list-disc pl-6 space-y-1">
            <li>Notificação no sistema</li>
            <li>Email para os usuários cadastrados</li>
            <li>Aviso na página inicial do sistema</li>
          </ul>
          <p className="mt-3">
            O uso contínuo do sistema após as alterações constitui aceitação
            dos novos termos.
          </p>
        </CardContent>
      </Card>

      {/* 11. Lei Aplicável */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>11. Lei Aplicável</CardTitle>
          <CardDescription>
            Jurisdição e foro competente
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          <p>
            Estes Termos de Uso são regidos pelas leis da República Federativa
            do Brasil.
          </p>
          <p>
            Qualquer disputa relacionada a estes termos será submetida ao foro
            da comarca de Sorocaba - SP, com exclusão de qualquer outro, por
            mais privilegiado que seja.
          </p>
        </CardContent>
      </Card>

      {/* 12. Contato */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            12. Contato
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          <p>
            Para dúvidas, sugestões ou reclamações sobre estes Termos de Uso,
            entre em contato:
          </p>
          <div className="mt-4 p-4 bg-purple-50 dark:bg-purple-950 border border-purple-200 dark:border-purple-800 rounded-lg">
            <p className="font-semibold mb-2">Contato:</p>
            <p className="flex items-center gap-2">
              <Mail className="h-4 w-4" />
              Email: <strong>contato@saojudastadeu.app</strong>
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Rodapé */}
      <Separator className="my-6" />

      <div className="text-center text-sm text-muted-foreground">
        <p>
          <strong>Paróquia Santuário São Judas Tadeu</strong>
        </p>
        <p>Sistema MESC - Ministros Extraordinários da Sagrada Comunhão</p>
        <p className="mt-2">Sorocaba - SP</p>
        <p className="text-xs mt-4">
          Versão 1.0 - Janeiro de 2025
        </p>
      </div>
    </div>
  );
}
