/**
 * Rota pública do Webhook WhatsApp (Z-API)
 * Autor: Marco Rossit | Projeto Santuário São Judas Tadeu - MESC
 */

import express from "express";
import { handleMessage } from "../services/whatsappHandler";

const router = express.Router();

// 🔹 Health Check — útil para testar se o webhook está ativo
router.get("/webhook", (req, res) => {
  res.status(200).json({
    status: "ok",
    message: "Webhook WhatsApp MESC está ativo",
    usage: "Configure o Z-API para enviar mensagens via POST para esta URL",
    url: "https://saojudastadeu.app/api/whatsapp/webhook",
    method: "POST",
    authentication: "Não requer autenticação (público para webhooks)",
    timestamp: new Date().toISOString(),
  });
});

// 🔹 Endpoint principal do webhook — recebe mensagens do Z-API
router.post("/webhook", async (req, res) => {
  try {
    const message = req.body;

    console.log("📨 Webhook recebido da Z-API:", JSON.stringify(message, null, 2));

    // Executa o processamento de forma assíncrona para não atrasar o webhook
    handleMessage(message)
      .then(() => console.log("✅ Mensagem processada com sucesso"))
      .catch((err) => console.error("❌ Erro ao processar mensagem:", err));

    // Responde imediatamente para evitar timeout na Z-API
    res.status(200).json({ status: "received" });
  } catch (err) {
    console.error("❌ Erro no webhook WhatsApp:", err);
    res.status(500).json({ error: "Erro ao processar webhook" });
  }
});

export default router;