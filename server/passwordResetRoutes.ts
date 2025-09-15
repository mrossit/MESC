import { Router } from "express";
import { db } from "./db";
import { passwordResetRequests, users, notifications } from "@shared/schema";
import { eq, and, or, desc } from "drizzle-orm";
import { hashPassword } from "./auth";

const router = Router();

// Solicitar reset de senha
router.post("/request-reset", async (req, res) => {
  try {
    const { email, reason } = req.body;

    if (!email) {
      return res.status(400).json({ 
        success: false, 
        message: "Email é obrigatório" 
      });
    }

    // Verifica se o usuário existe
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    if (!user) {
      // Retorna sucesso mesmo se o usuário não existir (segurança)
      return res.json({ 
        success: true, 
        message: "Se o email existir em nosso sistema, uma solicitação será enviada ao administrador." 
      });
    }

    // Verifica se já existe uma solicitação pendente
    const [existingRequest] = await db
      .select()
      .from(passwordResetRequests)
      .where(
        and(
          eq(passwordResetRequests.userId, user.id),
          eq(passwordResetRequests.status, 'pending')
        )
      )
      .limit(1);

    if (existingRequest) {
      return res.status(400).json({ 
        success: false, 
        message: "Já existe uma solicitação pendente para este email." 
      });
    }

    // Cria a solicitação de reset
    await db.insert(passwordResetRequests).values({
      userId: user.id,
      reason: reason || "Usuário esqueceu a senha",
      status: 'pending'
    });

    // Busca coordenadores e gestores para notificar
    const coordinators = await db
      .select()
      .from(users)
      .where(
        and(
          eq(users.status, 'active'),
          // Notifica tanto coordenadores quanto gestores
          or(
            eq(users.role, 'coordenador'),
            eq(users.role, 'gestor')
          )
        )
      );

    // Cria notificações para todos os coordenadores e gestores
    for (const coordinator of coordinators) {
      await db.insert(notifications).values({
        userId: coordinator.id,
        title: "Solicitação de Nova Senha",
        message: `${user.name} (${user.email}) solicitou uma nova senha. Por favor, entre em contato para auxiliar.`,
        type: 'announcement',
        priority: 'high',
        read: false
      });
    }

    res.json({
      success: true,
      message: "Os Coordenadores foram notificados para enviar nova senha, assim que eles receberem a mensagem responderão de imediato."
    });

  } catch (error) {
    console.error("Erro ao solicitar reset:", error);
    res.status(500).json({ 
      success: false, 
      message: "Erro ao processar solicitação" 
    });
  }
});

// Listar solicitações pendentes (para admins)
router.get("/pending-requests", async (req, res) => {
  try {
    // Verificar se é admin (implementar middleware de autenticação)
    const requests = await db
      .select({
        id: passwordResetRequests.id,
        userId: passwordResetRequests.userId,
        userName: users.name,
        userEmail: users.email,
        requestedAt: passwordResetRequests.requestedAt,
        reason: passwordResetRequests.reason,
        status: passwordResetRequests.status
      })
      .from(passwordResetRequests)
      .leftJoin(users, eq(passwordResetRequests.userId, users.id))
      .where(eq(passwordResetRequests.status, 'pending'))
      .orderBy(desc(passwordResetRequests.requestedAt));

    res.json({ success: true, requests });
  } catch (error) {
    console.error("Erro ao buscar solicitações:", error);
    res.status(500).json({ 
      success: false, 
      message: "Erro ao buscar solicitações" 
    });
  }
});

// Aprovar reset de senha (para admins)
router.post("/approve-reset/:requestId", async (req, res) => {
  try {
    const { requestId } = req.params;
    const { adminId, adminNotes } = req.body;

    // Busca a solicitação
    const [request] = await db
      .select()
      .from(passwordResetRequests)
      .where(eq(passwordResetRequests.id, requestId))
      .limit(1);

    if (!request) {
      return res.status(404).json({ 
        success: false, 
        message: "Solicitação não encontrada" 
      });
    }

    // Gera uma senha temporária
    const tempPassword = `Temp${Math.random().toString(36).slice(-8)}!`;
    const hashedPassword = await hashPassword(tempPassword);

    // Atualiza a senha do usuário e marca como requer troca
    await db
      .update(users)
      .set({
        passwordHash: hashedPassword,
        requiresPasswordChange: true,
        updatedAt: new Date()
      })
      .where(eq(users.id, request.userId));

    // Atualiza a solicitação
    await db
      .update(passwordResetRequests)
      .set({
        status: 'approved',
        processedBy: adminId,
        processedAt: new Date(),
        adminNotes: adminNotes || `Senha temporária: ${tempPassword}`
      })
      .where(eq(passwordResetRequests.id, requestId));

    // Notifica o usuário
    await db.insert(notifications).values({
      userId: request.userId,
      title: "Senha Resetada",
      message: `Sua senha foi resetada. Senha temporária: ${tempPassword}. Você deverá alterá-la no próximo login.`,
      type: 'announcement',
      read: false
    });

    res.json({ 
      success: true, 
      message: "Reset aprovado com sucesso",
      tempPassword // Retorna para o admin poder informar ao usuário
    });

  } catch (error) {
    console.error("Erro ao aprovar reset:", error);
    res.status(500).json({ 
      success: false, 
      message: "Erro ao processar aprovação" 
    });
  }
});

// Rejeitar reset de senha (para admins)
router.post("/reject-reset/:requestId", async (req, res) => {
  try {
    const { requestId } = req.params;
    const { adminId, adminNotes } = req.body;

    const [request] = await db
      .select()
      .from(passwordResetRequests)
      .where(eq(passwordResetRequests.id, requestId))
      .limit(1);

    if (!request) {
      return res.status(404).json({ 
        success: false, 
        message: "Solicitação não encontrada" 
      });
    }

    // Atualiza a solicitação
    await db
      .update(passwordResetRequests)
      .set({
        status: 'rejected',
        processedBy: adminId,
        processedAt: new Date(),
        adminNotes
      })
      .where(eq(passwordResetRequests.id, requestId));

    // Notifica o usuário
    await db.insert(notifications).values({
      userId: request.userId,
      title: "Solicitação de Reset Negada",
      message: adminNotes || "Sua solicitação de reset de senha foi negada. Entre em contato com a coordenação.",
      type: 'announcement',
      read: false
    });

    res.json({ 
      success: true, 
      message: "Solicitação rejeitada" 
    });

  } catch (error) {
    console.error("Erro ao rejeitar reset:", error);
    res.status(500).json({ 
      success: false, 
      message: "Erro ao processar rejeição" 
    });
  }
});

export { router as passwordResetRoutes };