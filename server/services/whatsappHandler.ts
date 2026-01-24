/**
 * Serviço principal de integração WhatsApp ↔ ChatGPT ↔ Neon (MESC)
 * Compatível com Z-API (instância trial ou production)
 * Autor: Marco Rossit | Projeto Santuário São Judas Tadeu
 */

import axios from "axios";
import OpenAI from "openai";
import { db } from "../db"; // conexão Drizzle/Neon
import { users, schedules } from "@shared/schema";
import { eq, asc } from "drizzle-orm";

// TODO: Este serviço usa nomes de colunas antigos (ministros, escalas, telefone, etc)
// Precisa ser refatorado para usar o schema atual (users, schedules, phone, etc)
// As queries abaixo estão comentadas/mockadas até a refatoração ser feita

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Envio de mensagens via Z-API
async function sendWhatsappMessage(phone: string, message: string) {
  try {
    const instance = process.env.ZAPI_INSTANCE;
    const token = process.env.ZAPI_TOKEN;
    const clientToken = process.env.ZAPI_CLIENT_TOKEN;

    const url = `https://api.z-api.io/instances/${instance}/token/${token}/send-text`;

    console.log("🟡 Enviando mensagem via Z-API:", { phone, message });

    const response = await axios.post(
      url,
      { phone, message },
      {
        headers: {
          "Content-Type": "application/json",
          "Client-Token": clientToken,
        },
      }
    );

    console.log("🟢 Mensagem enviada com sucesso:", response.data);
  } catch (err: any) {
    console.error("🔴 Erro ao enviar mensagem via Z-API:", err.response?.data || err.message);
  }
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

    // Busca ministro no banco (usando schema atual)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const ministro = await db.query.users.findFirst({
      where: (u: any, { eq }: any) => eq(u.phone, normalizedPhone),
    });

    // TODO: Implementar busca de próxima escala quando refatorar
    // Por enquanto retorna undefined - a funcionalidade de escala via WhatsApp está desabilitada
    let proximaEscala: { data: string; horario: string; missa: string } | undefined;

    let resposta = "";

    // Comandos diretos
    if (normalizedText.startsWith("/escala") || normalizedText.startsWith("/proxima")) {
      if (proximaEscala) {
        resposta = `Paz e bem, ${ministro?.name ?? "ministro(a)"} 🙏\nSua próxima escala é no dia ${new Date(
          proximaEscala.data
        ).toLocaleDateString("pt-BR")} às ${proximaEscala.horario} (${proximaEscala.missa}).`;
      } else {
        resposta = `Paz e bem 🙏\nNão encontrei nenhuma escala futura registrada para o seu número.`;
      }
    } else if (normalizedText.startsWith("/substituicoes")) {
      resposta = "📋 No momento, não há substituições abertas. Assim que houver, você será avisado.";
    } else if (normalizedText.startsWith("/ajuda") || normalizedText.startsWith("/help")) {
      resposta = `📖 Comandos disponíveis:\n
/escala → mostra sua próxima escala
/substituicoes → lista substituições abertas
/ajuda → exibe este menu`;
    } else {
      // Interpretação natural via ChatGPT
      const context = `
Você é o assistente virtual do Ministério da Sagrada Comunhão do Santuário São Judas Tadeu de Sorocaba.
Responda de forma acolhedora e espiritual, mas clara e objetiva.
Use emojis suaves e linguagem pastoral.
`;

      const prompt = `
O ministro ${ministro?.nome ?? "desconhecido"} enviou: "${text}".
Dados da próxima escala: ${proximaEscala ? JSON.stringify(proximaEscala) : "nenhuma escala encontrada"}.
Gere uma resposta gentil e informativa.
`;

      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: context },
          { role: "user", content: prompt },
        ],
      });

      resposta = completion.choices[0].message?.content || "Desculpe, não entendi sua mensagem.";
    }

    // Envia resposta
    await sendWhatsappMessage(normalizedPhone, resposta);
  } catch (error) {
    console.error("❌ Erro no handleMessage:", error);
  }
}