import OpenAI from "openai";
import { db } from "../db";
import { users, schedules, substitutionRequests } from "@shared/schema";
import { eq, and, gte, asc, desc, sql } from "drizzle-orm";
import { logger } from "../utils/logger";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

/**
 * Configuração Z-API para envio de mensagens WhatsApp
 */
const ZAPI_BASE = `https://api.z-api.io/instances/${process.env.ZAPI_INSTANCE}/token/${process.env.ZAPI_TOKEN}`;
const ZAPI_HEADERS = {
  "Client-Token": process.env.ZAPI_CLIENT_TOKEN || "",
  "Content-Type": "application/json"
};

/**
 * Interface para mensagem recebida do Z-API / Make
 */
interface WhatsAppMessage {
  from: string; // Número do remetente
  body?: string; // Texto da mensagem
  message?: {
    conversation?: string;
  };
}

/**
 * Normaliza número de telefone removendo espaços, traços e parênteses
 */
function normalizePhone(phone: string): string {
  return phone.replace(/[\s\-\(\)+]/g, '');
}

/**
 * Formata data para o padrão brasileiro
 */
function formatDateBR(dateStr: string): string {
  const date = new Date(dateStr + 'T12:00:00');
  return date.toLocaleDateString('pt-BR', { 
    day: '2-digit', 
    month: '2-digit', 
    year: 'numeric',
    timeZone: 'America/Sao_Paulo'
  });
}

/**
 * Formata horário para HH:MM
 */
function formatTime(timeStr: string): string {
  return timeStr.substring(0, 5);
}

/**
 * Envia mensagem via Z-API
 */
async function sendWhatsAppMessage(phone: string, message: string): Promise<void> {
  try {
    if (!process.env.ZAPI_INSTANCE || !process.env.ZAPI_TOKEN || !process.env.ZAPI_CLIENT_TOKEN) {
      logger.warn('[WhatsApp] Z-API não configurado - simulando envio de mensagem');
      logger.info(`[WhatsApp] Mensagem para ${phone}: ${message}`);
      return;
    }

    const response = await fetch(`${ZAPI_BASE}/send-text`, {
      method: 'POST',
      headers: ZAPI_HEADERS,
      body: JSON.stringify({
        phone: phone,
        message: message
      })
    });

    if (!response.ok) {
      const error = await response.text();
      logger.error(`[WhatsApp] Erro ao enviar mensagem: ${error}`);
    } else {
      logger.info(`[WhatsApp] ✅ Mensagem enviada para ${phone}`);
    }
  } catch (error: any) {
    logger.error('[WhatsApp] Erro ao enviar mensagem via Z-API:', error);
  }
}

/**
 * Processa mensagem recebida do WhatsApp
 */
export async function handleMessage(message: WhatsAppMessage): Promise<void> {
  try {
    // Extrair texto da mensagem
    const messageText = message.body || message.message?.conversation || '';
    
    if (!messageText) {
      logger.info('[WhatsApp Handler] Mensagem sem texto, ignorando');
      return;
    }

    // Normalizar número
    const from = normalizePhone(message.from);
    logger.info(`[WhatsApp Handler] Mensagem de ${from}: "${messageText}"`);

    // 1️⃣ Buscar ministro pelo telefone no banco de dados
    const minister = await db
      .select()
      .from(users)
      .where(
        sql`REPLACE(REPLACE(REPLACE(REPLACE(${users.phone}, ' ', ''), '-', ''), '(', ''), ')', '') = ${from}
         OR REPLACE(REPLACE(REPLACE(REPLACE(${users.whatsapp}, ' ', ''), '-', ''), '(', ''), ')', '') = ${from}`
      )
      .limit(1);

    if (!minister || minister.length === 0) {
      logger.info('[WhatsApp Handler] Ministro não encontrado no sistema');
      await sendWhatsAppMessage(from, 
        "Olá! Não encontrei seu cadastro no sistema MESC. Entre em contato com a coordenação para verificar seu registro."
      );
      return;
    }

    const ministerData = minister[0];
    logger.info(`[WhatsApp Handler] Ministro identificado: ${ministerData.name}`);

    // 2️⃣ Processar comando ou usar IA para interpretar
    const text = messageText.trim().toLowerCase();
    let resposta: string;

    // Comandos diretos
    if (text.startsWith('/escala') || text.startsWith('/proxima') || text.includes('próxima escala') || text.includes('proxima escala')) {
      resposta = await handleProximaEscalaCommand(ministerData);
    } 
    else if (text.startsWith('/substituicoes') || text.includes('substituiç') || text.includes('substituic')) {
      resposta = await handleSubstituicoesCommand();
    }
    else if (text.startsWith('/aceitar')) {
      const parts = text.split(/\s+/);
      const substitutionId = parts[1];
      resposta = await handleAceitarSubstituicaoCommand(ministerData.id, substitutionId);
    }
    else if (text.startsWith('/ajuda') || text.startsWith('/help') || text === 'menu') {
      resposta = await handleHelpCommand();
    }
    else {
      // 3️⃣ Usar IA para interpretar mensagens naturais
      resposta = await handleAIResponse(ministerData, messageText);
    }

    // 4️⃣ Enviar resposta
    await sendWhatsAppMessage(from, resposta);
    
  } catch (error: any) {
    logger.error('[WhatsApp Handler] Erro ao processar mensagem:', error);
  }
}

/**
 * Comando: Próxima escala
 */
async function handleProximaEscalaCommand(minister: any): Promise<string> {
  const today = new Date().toISOString().split('T')[0];
  
  const nextSchedule = await db
    .select()
    .from(schedules)
    .where(
      and(
        eq(schedules.ministerId, minister.id),
        gte(schedules.date, today)
      )
    )
    .orderBy(asc(schedules.date), asc(schedules.time))
    .limit(1);

  if (!nextSchedule || nextSchedule.length === 0) {
    return `Olá ${minister.name}! Você não tem escalas futuras agendadas no momento. 📅`;
  }

  const schedule = nextSchedule[0];
  const positionNames: { [key: number]: string } = {
    1: 'Auxiliar 1', 2: 'Auxiliar 2', 3: 'Auxiliar 3', 4: 'Auxiliar 4',
    5: 'Auxiliar 5', 6: 'Auxiliar 6', 7: 'Auxiliar 7', 8: 'Auxiliar 8'
  };
  
  return `📅 *Sua próxima escala*

*Data:* ${formatDateBR(schedule.date)}
*Horário:* ${formatTime(schedule.time)}
*Posição:* ${positionNames[schedule.position || 1] || `Posição ${schedule.position}`}
*Local:* ${schedule.location || 'Santuário São Judas Tadeu'}

Nos vemos lá! 🙏`;
}

/**
 * Comando: Substituições disponíveis
 */
async function handleSubstituicoesCommand(): Promise<string> {
  const openSubstitutions = await db
    .select({
      id: substitutionRequests.id,
      date: schedules.date,
      time: schedules.time,
      location: schedules.location,
      position: schedules.position,
      requesterName: users.name,
      urgency: substitutionRequests.urgency
    })
    .from(substitutionRequests)
    .innerJoin(schedules, eq(substitutionRequests.scheduleId, schedules.id))
    .innerJoin(users, eq(substitutionRequests.requesterId, users.id))
    .where(eq(substitutionRequests.status, 'available'))
    .orderBy(asc(schedules.date), asc(schedules.time))
    .limit(5);

  if (!openSubstitutions || openSubstitutions.length === 0) {
    return `📋 Não há substituições disponíveis no momento.

Todas as missas estão com escalas completas! ✅`;
  }

  const positionNames: { [key: number]: string } = {
    1: 'Auxiliar 1', 2: 'Auxiliar 2', 3: 'Auxiliar 3', 4: 'Auxiliar 4',
    5: 'Auxiliar 5', 6: 'Auxiliar 6', 7: 'Auxiliar 7', 8: 'Auxiliar 8'
  };

  const lista = openSubstitutions.map((sub: any, index: number) => {
    const urgencyEmoji = sub.urgency === 'critical' ? '🚨' : sub.urgency === 'high' ? '⚠️' : '📌';
    return `${urgencyEmoji} *${index + 1}.* ${formatDateBR(sub.date)} às ${formatTime(sub.time)}
   ${positionNames[sub.position || 1]} - ${sub.requesterName}
   ID: \`${sub.id.substring(0, 8)}\``;
  }).join('\n\n');

  return `📋 *Substituições Disponíveis*

${lista}

Para aceitar, responda:
/aceitar [ID]

Exemplo: /aceitar ${openSubstitutions[0].id.substring(0, 8)}`;
}

/**
 * Comando: Aceitar substituição
 */
async function handleAceitarSubstituicaoCommand(ministerId: string, substitutionId?: string): Promise<string> {
  if (!substitutionId) {
    return `❌ Por favor, informe o ID da substituição.

Exemplo: /aceitar abc12345

Use /substituicoes para ver as substituições disponíveis.`;
  }

  // Busca a substituição (aceita ID parcial)
  const substitution = await db
    .select()
    .from(substitutionRequests)
    .where(sql`${substitutionRequests.id}::text LIKE ${substitutionId + '%'}`)
    .limit(1);

  if (!substitution || substitution.length === 0) {
    return `❌ Substituição não encontrada.

Verifique o ID e tente novamente.
Use /substituicoes para ver as substituições disponíveis.`;
  }

  const sub = substitution[0];

  // Verifica se está disponível
  if (sub.status !== 'available') {
    return `⚠️ Esta substituição já foi aceita por outro ministro.

Use /substituicoes para ver outras substituições disponíveis.`;
  }

  // Atualiza para pending (aguardando aprovação do coordenador)
  await db
    .update(substitutionRequests)
    .set({
      substituteId: ministerId,
      status: 'pending',
      responseMessage: 'Aceito via WhatsApp'
    })
    .where(eq(substitutionRequests.id, sub.id));

  logger.info(`[WhatsApp] Substituição ${sub.id} aceita pelo ministro ${ministerId}`);

  return `✅ *Substituição aceita com sucesso!*

Aguarde a aprovação do coordenador. Você receberá uma confirmação em breve.

Obrigado por sua disponibilidade! 🙏`;
}

/**
 * Comando: Ajuda
 */
async function handleHelpCommand(): Promise<string> {
  return `🤖 *Menu de Comandos MESC*

*Consultas:*
/escala - Ver sua próxima escala
/substituicoes - Ver substituições disponíveis

*Ações:*
/aceitar [ID] - Aceitar uma substituição
/ajuda - Mostrar este menu

*Mensagens naturais:*
Você também pode enviar mensagens normais como:
• "Qual minha próxima escala?"
• "Tem alguma substituição disponível?"

O sistema entenderá sua pergunta! 😊`;
}

/**
 * Resposta usando IA para interpretar mensagens naturais
 */
async function handleAIResponse(minister: any, messageText: string): Promise<string> {
  try {
    if (!process.env.OPENAI_API_KEY) {
      return await handleHelpCommand();
    }

    // Busca dados relevantes do ministro
    const today = new Date().toISOString().split('T')[0];
    
    const nextSchedule = await db
      .select()
      .from(schedules)
      .where(
        and(
          eq(schedules.ministerId, minister.id),
          gte(schedules.date, today)
        )
      )
      .orderBy(asc(schedules.date))
      .limit(1);

    const recentSchedules = await db
      .select()
      .from(schedules)
      .where(eq(schedules.ministerId, minister.id))
      .orderBy(desc(schedules.date))
      .limit(3);

    // Contexto para a IA
    const context = `
Nome do ministro: ${minister.name}
Próxima escala: ${nextSchedule.length > 0 ? `${formatDateBR(nextSchedule[0].date)} às ${formatTime(nextSchedule[0].time)}` : 'Nenhuma escala futura'}
Total de serviços realizados: ${minister.totalServices || 0}
`.trim();

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `Você é o assistente virtual do MESC (Ministros Extraordinários da Sagrada Comunhão) do Santuário São Judas Tadeu de Sorocaba/SP.

Responda de forma acolhedora, objetiva e pastoral. Use emojis apropriados.

Informações do ministro:
${context}

Comandos disponíveis:
- /escala - próxima escala
- /substituicoes - substituições disponíveis
- /aceitar [ID] - aceitar substituição
- /ajuda - menu de ajuda

Se o ministro perguntar sobre escalas, substituições ou informações que você tem no contexto, responda diretamente.
Se for uma pergunta geral sobre o ministério, responda de forma pastoral e acolhedora.
Seja breve e objetivo (máximo 3 parágrafos).`
        },
        {
          role: "user",
          content: messageText
        }
      ],
      max_tokens: 300,
      temperature: 0.7
    });

    const response = completion.choices[0].message?.content || 
      "Desculpe, não consegui processar sua mensagem. Use /ajuda para ver os comandos disponíveis.";

    return response;

  } catch (error: any) {
    logger.error('[WhatsApp] Erro na resposta IA:', error);
    return `Olá ${minister.name}! No momento estou com dificuldades para processar sua mensagem.

Use os comandos:
/escala - Ver próxima escala
/substituicoes - Ver substituições
/ajuda - Menu completo`;
  }
}
