/**
 * Serviço principal de integração WhatsApp ↔ ChatGPT ↔ Neon (MESC)
 * Compatível com Z-API (instância trial ou production)
 * Autor: Marco Rossit | Projeto Santuário São Judas Tadeu
 */

import axios from "axios";
import OpenAI from "openai";
import { db } from "../db";
import { users, schedules, substitutionRequests } from "@shared/schema";
import { eq, and, gte, asc, or } from "drizzle-orm";
import { format, startOfDay } from "date-fns";
import { ptBR } from "date-fns/locale";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Envio de mensagens via Z-API
async function sendWhatsappMessage(phone: string, message: string) {
  try {
    const instance = process.env.ZAPI_INSTANCE;
    const token = process.env.ZAPI_TOKEN;
    const clientToken = process.env.ZAPI_CLIENT_TOKEN;

    if (!instance || !token) {
      console.warn("⚠️ Z-API não configurado (ZAPI_INSTANCE/ZAPI_TOKEN ausentes)");
      return;
    }

    const url = `https://api.z-api.io/instances/${instance}/token/${token}/send-text`;

    console.log("🟡 Enviando mensagem via Z-API:", { phone, message: message.substring(0, 50) + "..." });

    const response = await axios.post(
      url,
      { phone, message },
      {
        headers: {
          "Content-Type": "application/json",
          "Client-Token": clientToken || "",
        },
      }
    );

    console.log("🟢 Mensagem enviada com sucesso:", response.data);
  } catch (err: any) {
    console.error("🔴 Erro ao enviar mensagem via Z-API:", err.response?.data || err.message);
  }
}

/**
 * Busca ministro pelo número de telefone
 */
async function findMinisterByPhone(normalizedPhone: string) {
  // Try to find by phone or whatsapp field
  const [minister] = await db
    .select({
      id: users.id,
      name: users.name,
      phone: users.phone,
      whatsapp: users.whatsapp,
      role: users.role,
      status: users.status,
    })
    .from(users)
    .where(
      or(
        eq(users.phone, normalizedPhone),
        eq(users.whatsapp, normalizedPhone)
      )
    )
    .limit(1);

  return minister;
}

/**
 * Busca próxima escala do ministro
 */
async function getNextSchedule(ministerId: string) {
  const today = format(startOfDay(new Date()), 'yyyy-MM-dd');

  const [nextSchedule] = await db
    .select({
      id: schedules.id,
      date: schedules.date,
      time: schedules.time,
      position: schedules.position,
      location: schedules.location,
    })
    .from(schedules)
    .where(
      and(
        eq(schedules.ministerId, ministerId),
        gte(schedules.date, today)
      )
    )
    .orderBy(asc(schedules.date), asc(schedules.time))
    .limit(1);

  if (!nextSchedule) {
    return null;
  }

  return {
    date: nextSchedule.date,
    time: nextSchedule.time,
    position: nextSchedule.position,
    location: nextSchedule.location || "Igreja Matriz",
  };
}

/**
 * Busca substituições disponíveis
 */
async function getAvailableSubstitutions() {
  const today = format(startOfDay(new Date()), 'yyyy-MM-dd');

  const substitutions = await db
    .select({
      id: substitutionRequests.id,
      scheduleId: substitutionRequests.scheduleId,
      reason: substitutionRequests.reason,
      requesterName: users.name,
      date: schedules.date,
      time: schedules.time,
    })
    .from(substitutionRequests)
    .innerJoin(users, eq(substitutionRequests.requesterId, users.id))
    .innerJoin(schedules, eq(substitutionRequests.scheduleId, schedules.id))
    .where(
      and(
        eq(substitutionRequests.status, 'available'),
        gte(schedules.date, today)
      )
    )
    .orderBy(asc(schedules.date))
    .limit(5);

  return substitutions;
}

// Tratamento principal de mensagens recebidas pelo webhook
export async function handleMessage(message: any) {
  try {
    console.log("📩 Mensagem recebida:", message);

    const phone =
      message.phone ||
      message.from ||
      message.remoteJid ||
      message.number ||
      "";

    const text =
      message.body ||
      message.message ||
      message.text ||
      message.msg ||
      "";

    if (!phone || !text) {
      console.warn("⚠️ Mensagem sem número ou texto válido:", message);
      return;
    }

    const normalizedPhone = phone.replace(/\D/g, "");
    const normalizedText = text.trim().toLowerCase();

    console.log(`💬 De ${normalizedPhone}: ${normalizedText}`);

    // Busca ministro no banco
    const ministro = await findMinisterByPhone(normalizedPhone);

    // Busca próxima escala
    const proximaEscala = ministro ? await getNextSchedule(ministro.id) : null;

    let resposta = "";

    // Comandos diretos
    if (normalizedText.startsWith("/escala") || normalizedText.startsWith("/proxima")) {
      if (proximaEscala) {
        const dataFormatada = format(new Date(proximaEscala.date), "dd 'de' MMMM", { locale: ptBR });
        resposta = `Paz e bem, ${ministro?.name ?? "ministro(a)"} 🙏\n\nSua próxima escala é:\n📅 ${dataFormatada}\n⏰ ${proximaEscala.time}\n📍 ${proximaEscala.location}\n🪖 Posição: ${proximaEscala.position || "A definir"}`;
      } else if (ministro) {
        resposta = `Paz e bem, ${ministro.name} 🙏\n\nNão encontrei nenhuma escala futura registrada para você. Verifique o sistema ou fale com o coordenador.`;
      } else {
        resposta = `Paz e bem 🙏\n\nNão encontrei nenhum cadastro para este número de telefone. Por favor, entre em contato com a coordenação para atualizar seu cadastro.`;
      }
    } else if (normalizedText.startsWith("/substituicoes") || normalizedText.startsWith("/substituicao")) {
      const substitutions = await getAvailableSubstitutions();

      if (substitutions.length === 0) {
        resposta = "📋 No momento, não há substituições abertas. Assim que houver, você será avisado.";
      } else {
        resposta = "📋 *Substituições Disponíveis:*\n\n";
        for (const sub of substitutions) {
          const dataFormatada = format(new Date(sub.date), "dd/MM", { locale: ptBR });
          resposta += `• ${dataFormatada} às ${sub.time} (${sub.requesterName})\n  Motivo: ${sub.reason || "Não informado"}\n\n`;
        }
        resposta += "Para aceitar uma substituição, acesse o sistema ou fale com o coordenador.";
      }
    } else if (normalizedText.startsWith("/ajuda") || normalizedText.startsWith("/help")) {
      resposta = `📖 *Comandos disponíveis:*\n
/escala → mostra sua próxima escala
/substituicoes → lista substituições abertas
/ajuda → exibe este menu

💡 Você também pode fazer perguntas em linguagem natural!`;
    } else {
      // Interpretação natural via ChatGPT
      const context = `
Você é o assistente virtual do Ministério da Sagrada Comunhão do Santuário São Judas Tadeu de Sorocaba.
Responda de forma acolhedora e espiritual, mas clara e objetiva.
Use emojis suaves e linguagem pastoral.
Nunca invente informações sobre escalas ou datas - use apenas os dados fornecidos.
Se não souber algo, oriente o ministro a verificar no sistema ou falar com a coordenação.
`;

      const prompt = `
O ministro ${ministro?.name ?? "desconhecido"} enviou: "${text}".
Dados da próxima escala: ${proximaEscala ? JSON.stringify(proximaEscala) : "nenhuma escala encontrada"}.
Gere uma resposta gentil e informativa.
`;

      try {
        const completion = await openai.chat.completions.create({
          model: "gpt-4o-mini",
          messages: [
            { role: "system", content: context },
            { role: "user", content: prompt },
          ],
        });

        resposta = completion.choices[0].message?.content || "Desculpe, não entendi sua mensagem. Digite /ajuda para ver os comandos disponíveis.";
      } catch (aiError) {
        console.error("⚠️ Erro na API do OpenAI:", aiError);
        resposta = `Paz e bem 🙏\n\nDesculpe, não consegui processar sua mensagem no momento. Tente novamente mais tarde ou use os comandos:\n/escala - ver sua próxima escala\n/ajuda - ver todos os comandos`;
      }
    }

    // Envia resposta
    await sendWhatsappMessage(normalizedPhone, resposta);
  } catch (error) {
    console.error("❌ Erro no handleMessage:", error);
  }
}

/**
 * Envia notificação de escala para ministro
 */
export async function sendScheduleNotification(
  ministerId: string,
  scheduleDate: string,
  scheduleTime: string,
  location: string,
  position?: string
) {
  try {
    const [minister] = await db
      .select({ name: users.name, phone: users.phone, whatsapp: users.whatsapp })
      .from(users)
      .where(eq(users.id, ministerId))
      .limit(1);

    if (!minister) {
      console.warn(`⚠️ Ministro ${ministerId} não encontrado para notificação WhatsApp`);
      return false;
    }

    const phoneNumber = minister.whatsapp || minister.phone;
    if (!phoneNumber) {
      console.warn(`⚠️ Ministro ${minister.name} não possui número de telefone cadastrado`);
      return false;
    }

    const dataFormatada = format(new Date(scheduleDate), "dd 'de' MMMM", { locale: ptBR });
    const message = `Paz e bem, ${minister.name}! 🙏\n\n📅 *Você foi escalado para a missa:*\n\n📆 ${dataFormatada}\n⏰ ${scheduleTime}\n📍 ${location}${position ? `\n🪖 Posição: ${position}` : ""}\n\nPor favor, confirme sua presença no sistema. Deus abençoe!`;

    await sendWhatsappMessage(phoneNumber.replace(/\D/g, ""), message);
    return true;
  } catch (error) {
    console.error("❌ Erro ao enviar notificação de escala:", error);
    return false;
  }
}

/**
 * Envia notificação de substituição urgente
 */
export async function sendSubstitutionAlert(
  ministerId: string,
  requesterName: string,
  scheduleDate: string,
  scheduleTime: string,
  reason?: string
) {
  try {
    const [minister] = await db
      .select({ name: users.name, phone: users.phone, whatsapp: users.whatsapp })
      .from(users)
      .where(eq(users.id, ministerId))
      .limit(1);

    if (!minister) return false;

    const phoneNumber = minister.whatsapp || minister.phone;
    if (!phoneNumber) return false;

    const dataFormatada = format(new Date(scheduleDate), "dd/MM", { locale: ptBR });
    const message = `🚨 *Pedido de Substituição*\n\n${requesterName} precisa de substituição:\n📅 ${dataFormatada} às ${scheduleTime}\n${reason ? `📝 Motivo: ${reason}\n` : ""}\nPor favor, verifique no sistema se pode ajudar!`;

    await sendWhatsappMessage(phoneNumber.replace(/\D/g, ""), message);
    return true;
  } catch (error) {
    console.error("❌ Erro ao enviar alerta de substituição:", error);
    return false;
  }
}
