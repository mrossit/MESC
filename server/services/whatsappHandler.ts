import { db } from "../db";
import { users, schedules, substitutionRequests } from "@shared/schema";
import { eq, and, gte, asc } from "drizzle-orm";
import { sql } from "drizzle-orm";
import { logger } from "../utils/logger";

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
  const date = new Date(dateStr + 'T00:00:00');
  return date.toLocaleDateString('pt-BR', { 
    day: '2-digit', 
    month: '2-digit', 
    year: 'numeric' 
  });
}

/**
 * Formata horário para HH:MM
 */
function formatTime(timeStr: string): string {
  return timeStr.substring(0, 5);
}

/**
 * Extrai comando e parâmetros de uma mensagem
 */
function parseCommand(text: string): { command: string; params: string[] } {
  const parts = text.trim().toLowerCase().split(/\s+/);
  return {
    command: parts[0],
    params: parts.slice(1)
  };
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

    // Buscar ministro pelo telefone
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
      // Aqui você poderia enviar uma resposta via API do WhatsApp
      return;
    }

    const ministerData = minister[0];
    logger.info(`[WhatsApp Handler] Ministro identificado: ${ministerData.name}`);

    // Parse do comando
    const { command, params } = parseCommand(messageText);

    // Processar comandos
    switch (command) {
      case 'escala':
      case 'proxima':
        await handleProximaEscalaCommand(ministerData.id);
        break;
        
      case 'substituicoes':
        await handleSubstituicoesCommand();
        break;
        
      case 'aceitar':
        if (params.length > 0) {
          await handleAceitarSubstituicaoCommand(ministerData.id, params[0]);
        }
        break;
        
      default:
        await handleHelpCommand();
        break;
    }
    
  } catch (error: any) {
    logger.error('[WhatsApp Handler] Erro ao processar mensagem:', error);
  }
}

/**
 * Comando: Próxima escala
 */
async function handleProximaEscalaCommand(ministerId: string): Promise<void> {
  const today = new Date().toISOString().split('T')[0];
  
  const nextSchedule = await db
    .select()
    .from(schedules)
    .where(
      and(
        eq(schedules.ministerId, ministerId),
        gte(schedules.date, today)
      )
    )
    .orderBy(asc(schedules.date), asc(schedules.time))
    .limit(1);

  if (!nextSchedule || nextSchedule.length === 0) {
    logger.info('[WhatsApp] Nenhuma escala futura encontrada');
    // Enviar resposta: "Você não tem escalas futuras"
    return;
  }

  const schedule = nextSchedule[0];
  const responseMessage = `
📅 Sua próxima escala:
Data: ${formatDateBR(schedule.date)}
Horário: ${formatTime(schedule.time)}
Local: ${schedule.location || 'Santuário São Judas Tadeu'}
  `.trim();

  logger.info('[WhatsApp] Resposta preparada:', responseMessage);
  // Aqui você enviaria a resposta via API do WhatsApp
}

/**
 * Comando: Substituições disponíveis
 */
async function handleSubstituicoesCommand(): Promise<void> {
  const openSubstitutions = await db
    .select({
      id: substitutionRequests.id,
      date: schedules.date,
      time: schedules.time,
      location: schedules.location,
      requesterName: users.name
    })
    .from(substitutionRequests)
    .innerJoin(schedules, eq(substitutionRequests.scheduleId, schedules.id))
    .innerJoin(users, eq(substitutionRequests.requesterId, users.id))
    .where(eq(substitutionRequests.status, 'available'))
    .orderBy(asc(schedules.date), asc(schedules.time))
    .limit(5);

  if (!openSubstitutions || openSubstitutions.length === 0) {
    logger.info('[WhatsApp] Nenhuma substituição disponível');
    // Enviar: "Não há substituições disponíveis"
    return;
  }

  const message = openSubstitutions.map((sub: any, index: number) => 
    `${index + 1}. ${formatDateBR(sub.date)} às ${formatTime(sub.time)} - ${sub.requesterName}`
  ).join('\n');

  logger.info('[WhatsApp] Substituições encontradas:', message);
  // Aqui você enviaria a lista via API do WhatsApp
}

/**
 * Comando: Aceitar substituição
 */
async function handleAceitarSubstituicaoCommand(ministerId: string, substitutionId: string): Promise<void> {
  // Busca a substituição
  const substitution = await db
    .select()
    .from(substitutionRequests)
    .where(eq(substitutionRequests.id, substitutionId))
    .limit(1);

  if (!substitution || substitution.length === 0) {
    logger.info('[WhatsApp] Substituição não encontrada');
    // Enviar: "Substituição não encontrada"
    return;
  }

  const sub = substitution[0];

  // Verifica se está disponível
  if (sub.status !== 'available') {
    logger.info('[WhatsApp] Substituição já preenchida');
    // Enviar: "Esta substituição já foi aceita"
    return;
  }

  // Atualiza para pending (aguardando aprovação)
  await db
    .update(substitutionRequests)
    .set({
      substituteId: ministerId,
      status: 'pending',
      responseMessage: 'Aceito via WhatsApp'
    })
    .where(eq(substitutionRequests.id, substitutionId));

  logger.info('[WhatsApp] Substituição aceita com sucesso');
  // Enviar: "Substituição aceita! Aguarde aprovação do coordenador."
}

/**
 * Comando: Ajuda
 */
async function handleHelpCommand(): Promise<void> {
  const helpMessage = `
🤖 Comandos disponíveis:

/escala - Ver sua próxima escala
/substituicoes - Ver substituições disponíveis
/aceitar [ID] - Aceitar uma substituição

Exemplo: /aceitar abc123
  `.trim();

  logger.info('[WhatsApp] Enviando mensagem de ajuda');
  // Aqui você enviaria via API do WhatsApp
}
