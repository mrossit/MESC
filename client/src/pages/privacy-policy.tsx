/**
 * Política de Privacidade - LGPD Compliance
 *
 * Esta página apresenta as informações sobre tratamento de dados pessoais
 * conforme exigido pela Lei Geral de Proteção de Dados (Lei 13.709/2018)
 */

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Shield, Lock, Database, AlertCircle, Mail, FileText } from "lucide-react";

export default function PrivacyPolicy() {
  return (
    <div className="container mx-auto px-4 py-8 max-w-5xl">
      {/* Cabeçalho */}
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-[#8B0000] mb-2 flex items-center gap-3">
          <Shield className="h-10 w-10" />
          Política de Privacidade
        </h1>
        <p className="text-muted-foreground text-lg">
          Lei Geral de Proteção de Dados (LGPD - Lei 13.709/2018)
        </p>
        <p className="text-sm text-muted-foreground mt-2">
          Última atualização: {new Date().toLocaleDateString('pt-BR')}
        </p>
      </div>

      <Separator className="my-6" />

      {/* Introdução */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Introdução
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          <p>
            A Paróquia São Judas Tadeu, por meio do Sistema MESC (Ministros Extraordinários
            da Sagrada Comunhão), está comprometida com a proteção dos seus dados pessoais
            e com a transparência no seu tratamento.
          </p>
          <p>
            Esta Política de Privacidade explica quais dados coletamos, como os utilizamos,
            com quem os compartilhamos e quais são os seus direitos como titular dos dados.
          </p>
        </CardContent>
      </Card>

      {/* 1. Dados Coletados */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            1. Dados Coletados
          </CardTitle>
          <CardDescription>
            Informações que coletamos para o funcionamento do sistema
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          <div>
            <h4 className="font-semibold mb-2">1.1. Dados de Identificação</h4>
            <ul className="list-disc pl-6 space-y-1">
              <li>Nome completo</li>
              <li>Email</li>
              <li>Telefone/WhatsApp</li>
              <li>Endereço residencial</li>
              <li>Foto de perfil (opcional)</li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold mb-2">1.2. Dados Sacramentais (Sensíveis - Art. 11 LGPD)</h4>
            <ul className="list-disc pl-6 space-y-1">
              <li>Data e paróquia de batismo</li>
              <li>Data e paróquia de confirmação (crisma)</li>
              <li>Data e paróquia de casamento (se aplicável)</li>
              <li>Estado civil</li>
            </ul>
            <div className="mt-2 p-3 bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded-lg">
              <p className="flex items-center gap-2 text-amber-800 dark:text-amber-200">
                <Lock className="h-4 w-4" />
                <strong>Dados Criptografados:</strong> Todos os dados sacramentais são
                armazenados com criptografia AES-256 para garantir máxima segurança.
              </p>
            </div>
          </div>

          <div>
            <h4 className="font-semibold mb-2">1.3. Dados de Uso do Sistema</h4>
            <ul className="list-disc pl-6 space-y-1">
              <li>Disponibilidade para missas</li>
              <li>Preferências de horários</li>
              <li>Histórico de escalas</li>
              <li>Progresso na formação ministerial</li>
              <li>Logs de acesso e auditoria</li>
            </ul>
          </div>
        </CardContent>
      </Card>

      {/* 2. Finalidade do Tratamento */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>2. Finalidade do Tratamento</CardTitle>
          <CardDescription>
            Como e por que utilizamos seus dados
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <p>Utilizamos seus dados pessoais para as seguintes finalidades:</p>
          <ul className="list-disc pl-6 space-y-2">
            <li>
              <strong>Organização de escalas:</strong> Gerenciar a distribuição de
              ministros nas celebrações eucarísticas
            </li>
            <li>
              <strong>Comunicação:</strong> Enviar notificações sobre escalas, substituições
              e atividades paroquiais
            </li>
            <li>
              <strong>Formação ministerial:</strong> Acompanhar seu progresso nos módulos
              de formação obrigatória
            </li>
            <li>
              <strong>Gestão familiar:</strong> Permitir o compartilhamento de disponibilidade
              entre membros da mesma família
            </li>
            <li>
              <strong>Verificação de elegibilidade:</strong> Confirmar que possui os
              sacramentos necessários para o ministério
            </li>
            <li>
              <strong>Auditoria e compliance:</strong> Manter registros de atividades
              conforme exigido pela LGPD
            </li>
          </ul>
        </CardContent>
      </Card>

      {/* 3. Base Legal */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>3. Base Legal (LGPD)</CardTitle>
          <CardDescription>
            Fundamento jurídico para o tratamento dos seus dados
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <p>O tratamento dos seus dados pessoais é baseado em:</p>
          <ul className="list-disc pl-6 space-y-2">
            <li>
              <strong>Consentimento (Art. 7º, I):</strong> Você forneceu consentimento
              livre, informado e inequívoco ao se cadastrar no sistema
            </li>
            <li>
              <strong>Execução de serviço (Art. 7º, V):</strong> Necessário para a
              execução do ministério eucarístico e atividades relacionadas
            </li>
            <li>
              <strong>Obrigação legal (Art. 7º, II):</strong> Dados sacramentais para
              verificar elegibilidade conforme direito canônico
            </li>
          </ul>
        </CardContent>
      </Card>

      {/* 4. Compartilhamento */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>4. Compartilhamento de Dados</CardTitle>
          <CardDescription>
            Com quem compartilhamos suas informações
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <p>Seus dados são compartilhados apenas com:</p>
          <ul className="list-disc pl-6 space-y-2">
            <li>
              <strong>Coordenadores de ministério:</strong> Acesso aos dados necessários
              para organização de escalas e comunicação
            </li>
            <li>
              <strong>Outros ministros:</strong> Apenas nome, foto e horários de escala
              (para facilitar substituições)
            </li>
            <li>
              <strong>Paróquia:</strong> Dados agregados para relatórios e estatísticas
              (sem identificação individual)
            </li>
          </ul>

          <div className="mt-3 p-3 bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg">
            <p className="flex items-center gap-2 text-blue-800 dark:text-blue-200">
              <AlertCircle className="h-4 w-4" />
              <strong>Importante:</strong> NÃO compartilhamos seus dados com terceiros
              para fins comerciais ou publicitários.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* 5. Direitos do Titular */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>5. Seus Direitos (Art. 18 LGPD)</CardTitle>
          <CardDescription>
            O que você pode fazer com seus dados pessoais
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <p>Como titular de dados, você tem os seguintes direitos:</p>
          <ul className="list-disc pl-6 space-y-2">
            <li>
              <strong>Confirmação de tratamento (I):</strong> Saber se tratamos seus dados
            </li>
            <li>
              <strong>Acesso aos dados (II):</strong> Visualizar todos os seus dados no sistema
            </li>
            <li>
              <strong>Correção de dados (III):</strong> Atualizar informações incompletas ou incorretas
            </li>
            <li>
              <strong>Anonimização ou exclusão (IV e VI):</strong> Solicitar remoção de dados
              desnecessários ou tratados em desconformidade
            </li>
            <li>
              <strong>Portabilidade (V):</strong> Exportar seus dados em formato estruturado
            </li>
            <li>
              <strong>Eliminação de dados (VI):</strong> Excluir dados tratados com consentimento
            </li>
            <li>
              <strong>Informação sobre compartilhamento (VII):</strong> Saber com quem compartilhamos
            </li>
            <li>
              <strong>Revogação do consentimento (IX):</strong> Retirar seu consentimento a qualquer momento
            </li>
          </ul>

          <div className="mt-4">
            <h4 className="font-semibold mb-2">Como exercer seus direitos:</h4>
            <p className="flex items-center gap-2">
              <Mail className="h-4 w-4" />
              Email: <strong>dpo@saojudastadeu.app</strong>
            </p>
            <p className="text-muted-foreground mt-1">
              Responderemos sua solicitação em até 15 dias conforme Art. 18, § 3º da LGPD
            </p>
          </div>
        </CardContent>
      </Card>

      {/* 6. Segurança */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lock className="h-5 w-5" />
            6. Medidas de Segurança
          </CardTitle>
          <CardDescription>
            Como protegemos seus dados (Art. 46 LGPD)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <p>Adotamos as seguintes medidas técnicas e organizacionais:</p>
          <ul className="list-disc pl-6 space-y-2">
            <li>
              <strong>Criptografia:</strong> Dados sensíveis criptografados com AES-256-GCM
            </li>
            <li>
              <strong>HTTPS:</strong> Toda comunicação protegida com TLS 1.3
            </li>
            <li>
              <strong>Autenticação:</strong> Senhas criptografadas com bcrypt (10 rounds)
            </li>
            <li>
              <strong>Controle de acesso:</strong> Sistema de permissões por função (RBAC)
            </li>
            <li>
              <strong>Auditoria:</strong> Registro de todas as ações sensíveis
            </li>
            <li>
              <strong>Backup:</strong> Backups diários criptografados
            </li>
            <li>
              <strong>Rate limiting:</strong> Proteção contra ataques de força bruta
            </li>
            <li>
              <strong>Headers de segurança:</strong> Helmet.js com CSP e HSTS
            </li>
          </ul>
        </CardContent>
      </Card>

      {/* 7. Retenção */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>7. Tempo de Retenção</CardTitle>
          <CardDescription>
            Por quanto tempo mantemos seus dados
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <p>Mantemos seus dados pessoais pelos seguintes períodos:</p>
          <ul className="list-disc pl-6 space-y-2">
            <li>
              <strong>Durante o ministério ativo:</strong> Todos os dados são mantidos
              enquanto você for ministro ativo
            </li>
            <li>
              <strong>Após inativação:</strong> Dados são anonimizados após 1 ano de inatividade
            </li>
            <li>
              <strong>Dados de auditoria:</strong> Mantidos por 5 anos conforme Art. 16 da LGPD
            </li>
            <li>
              <strong>Exclusão definitiva:</strong> Após 5 anos de inatividade, todos os dados
              são excluídos permanentemente
            </li>
          </ul>

          <p className="mt-3">
            Você pode solicitar a exclusão antecipada dos seus dados a qualquer momento,
            ressalvados os casos de retenção obrigatória por lei.
          </p>
        </CardContent>
      </Card>

      {/* 8. Encarregado de Dados */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>8. Encarregado de Dados (DPO)</CardTitle>
          <CardDescription>
            Responsável pela proteção dos dados pessoais
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <p>
            Para exercer seus direitos, tirar dúvidas ou reportar incidentes de segurança,
            entre em contato com nosso Encarregado de Dados:
          </p>

          <div className="mt-4 p-4 bg-purple-50 dark:bg-purple-950 border border-purple-200 dark:border-purple-800 rounded-lg">
            <p className="font-semibold mb-2">Contato do DPO:</p>
            <p className="flex items-center gap-2">
              <Mail className="h-4 w-4" />
              Email: <strong>dpo@saojudastadeu.app</strong>
            </p>
            <p className="text-muted-foreground mt-2 text-xs">
              Prazo de resposta: até 15 dias conforme Art. 18, § 3º da LGPD
            </p>
          </div>
        </CardContent>
      </Card>

      {/* 9. Alterações */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>9. Alterações nesta Política</CardTitle>
        </CardHeader>
        <CardContent className="text-sm">
          <p>
            Esta Política de Privacidade pode ser atualizada periodicamente para refletir
            mudanças em nossas práticas ou na legislação. Notificaremos você sobre
            alterações significativas por email ou notificação no sistema.
          </p>
        </CardContent>
      </Card>

      {/* Rodapé */}
      <Separator className="my-6" />

      <div className="text-center text-sm text-muted-foreground">
        <p>
          <strong>Paróquia São Judas Tadeu</strong>
        </p>
        <p>Sistema MESC - Ministros Extraordinários da Sagrada Comunhão</p>
        <p className="mt-2">Em conformidade com a LGPD (Lei 13.709/2018)</p>
        <p className="text-xs mt-4">
          Documento gerado em: {new Date().toLocaleDateString('pt-BR')}
        </p>
      </div>
    </div>
  );
}
