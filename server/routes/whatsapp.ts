/**
 * Rota pública do Webhook WhatsApp (Z-API)
 * Autor: Marco Rossit | Projeto Santuário São Judas Tadeu - MESC
 */

import express from "express";
import { handleMessage } from "../services/whatsappHandler.js"; // 👈 use .js se estiver rodando via Node/tsx

const router = express.Router();

// 🔹 Health check
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

// 🔹 Webhook principal - RECEBE mensagens do WhatsApp via Z-API
router.post("/webhook", async (req, res) => {
  try {
    console.log("📨 Webhook recebido da Z-API:", JSON.stringify(req.body, null, 2));

    // Executa processamento da mensagem de forma assíncrona
    handleMessage(req.body)
      .then(() => console.log("✅ Mensagem processada com sucesso"))
      .catch((err) => console.error("❌ Erro ao processar mensagem:", err));

    // Responde imediatamente para não travar a Z-API
    res.status(200).send("OK");
  } catch (err) {
    console.error("❌ Erro no webhook WhatsApp:", err);
    res.status(500).json({ error: "Erro ao processar webhook" });
  }
});

export default router;