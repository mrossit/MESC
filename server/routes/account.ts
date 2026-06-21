import { Router, Response } from "express";
import { and, eq, or } from "drizzle-orm";
import { db } from "../db";
import { AuthRequest, authenticateToken, verifyPassword } from "../auth";
import { logAudit, AuditAction } from "../middleware/auditLogger";
import {
  activeSessions,
  activityLogs,
  familyRelationships,
  formationCertificates,
  formationLessonProgress,
  formationProgress,
  leaderboardCache,
  materialAccessLogs,
  mobileDevices,
  mobileIdempotencyKeys,
  mobileRefreshTokens,
  notifications,
  pointTransactions,
  pushSubscriptions,
  questionnaireResponses,
  schedules,
  substitutionRequests,
  userBadges,
  userPoints,
  users,
} from "@shared/schema";

const router = Router();

const CONFIRMATION_TEXT = "EXCLUIR MINHA CONTA";

function clearAuthCookies(res: Response) {
  const cookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV !== "development",
    sameSite: "lax" as const,
    path: "/",
  };

  res.clearCookie("token", cookieOptions);
  res.clearCookie("session_token", cookieOptions);
}

router.get("/deletion-info", authenticateToken, async (_req: AuthRequest, res) => {
  res.json({
    confirmationText: CONFIRMATION_TEXT,
    retainedOperationalData:
      "Escalas e registros operacionais podem ser preservados sem dados pessoais identificáveis para continuidade pastoral, auditoria e segurança.",
    deletedData: [
      "nome, email, telefone, foto e dados sacramentais",
      "notificações e inscrições de push",
      "sessões ativas",
      "vínculos familiares",
      "respostas de questionários e observações pessoais",
      "progresso de formação, gamificação e certificados vinculados à conta",
    ],
  });
});

router.delete("/", authenticateToken, async (req: AuthRequest, res) => {
  const userId = req.user?.id;
  if (!userId) {
    return res.status(401).json({ message: "Usuário não autenticado" });
  }

  const { confirmation, password } = req.body ?? {};
  if (confirmation !== CONFIRMATION_TEXT) {
    return res.status(400).json({
      message: `Digite exatamente "${CONFIRMATION_TEXT}" para confirmar a exclusão.`,
    });
  }

  const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  if (!user) {
    clearAuthCookies(res);
    return res.status(204).send();
  }

  if (user.status === "deleted") {
    clearAuthCookies(res);
    return res.status(204).send();
  }

  if (!password) {
    return res.status(400).json({ message: "Informe sua senha atual para excluir a conta." });
  }

  const validPassword = await verifyPassword(String(password), user.passwordHash || "");
  if (!validPassword) {
    return res.status(403).json({ message: "Senha atual inválida." });
  }

  const now = new Date();
  const anonymizedEmail = `deleted+${user.id}@deleted.saojudastadeu.app`;

  try {
    await db.transaction(async (tx) => {
      await tx
        .update(questionnaireResponses)
        .set({
          responses: { accountDeleted: true },
          availableSundays: [],
          preferredMassTimes: [],
          alternativeTimes: [],
          dailyMassAvailability: [],
          specialEvents: null,
          canSubstitute: false,
          notes: null,
          unmappedResponses: [],
          processingWarnings: ["Conta excluída pelo titular."],
          sharedWithFamilyIds: [],
          isSharedResponse: false,
          sharedFromUserId: null,
          isDeleted: true,
          deletedAt: now,
          updatedAt: now,
        })
        .where(eq(questionnaireResponses.userId, userId));

      await tx
        .update(schedules)
        .set({ ministerId: null })
        .where(eq(schedules.ministerId, userId));

      await tx
        .update(schedules)
        .set({ substituteId: null })
        .where(eq(schedules.substituteId, userId));

      await tx
        .update(substitutionRequests)
        .set({
          substituteId: null,
          reason: null,
          responseMessage: null,
          updatedAt: now,
        })
        .where(eq(substitutionRequests.substituteId, userId));

      await tx
        .update(substitutionRequests)
        .set({
          reason: null,
          responseMessage: null,
          status: "cancelled",
          updatedAt: now,
        })
        .where(eq(substitutionRequests.requesterId, userId));

      await tx.delete(notifications).where(eq(notifications.userId, userId));
      await tx.delete(mobileIdempotencyKeys).where(eq(mobileIdempotencyKeys.userId, userId));
      await tx.delete(mobileRefreshTokens).where(eq(mobileRefreshTokens.userId, userId));
      await tx.delete(mobileDevices).where(eq(mobileDevices.userId, userId));
      await tx.delete(pushSubscriptions).where(eq(pushSubscriptions.userId, userId));
      await tx.delete(familyRelationships).where(
        or(
          eq(familyRelationships.userId, userId),
          eq(familyRelationships.relatedUserId, userId),
        ),
      );
      await tx.delete(formationProgress).where(eq(formationProgress.userId, userId));
      await tx.delete(formationLessonProgress).where(eq(formationLessonProgress.userId, userId));
      await tx.delete(formationCertificates).where(eq(formationCertificates.userId, userId));
      await tx.delete(materialAccessLogs).where(eq(materialAccessLogs.userId, userId));
      await tx.delete(userBadges).where(eq(userBadges.userId, userId));
      await tx.delete(userPoints).where(eq(userPoints.userId, userId));
      await tx.delete(pointTransactions).where(eq(pointTransactions.userId, userId));
      await tx.delete(leaderboardCache).where(eq(leaderboardCache.userId, userId));

      await tx
        .update(activeSessions)
        .set({ isActive: false })
        .where(
          and(
            eq(activeSessions.userId, userId),
            eq(activeSessions.isActive, true),
          ),
        );

      await tx
        .update(activityLogs)
        .set({
          details: { accountDeleted: true },
          ipAddress: null,
          userAgent: null,
        })
        .where(eq(activityLogs.userId, userId));

      await tx
        .update(users)
        .set({
          email: anonymizedEmail,
          firstName: null,
          lastName: null,
          profileImageUrl: null,
          name: "Conta excluída",
          phone: null,
          whatsapp: null,
          passwordHash: `deleted:${user.id}`,
          status: "deleted",
          requiresPasswordChange: true,
          lastLogin: null,
          joinDate: null,
          photoUrl: null,
          imageData: null,
          imageContentType: null,
          familyId: null,
          birthDate: null,
          address: null,
          city: null,
          zipCode: null,
          maritalStatus: null,
          baptismDate: null,
          baptismParish: null,
          confirmationDate: null,
          confirmationParish: null,
          marriageDate: null,
          marriageParish: null,
          preferredPosition: null,
          preferredPositions: [],
          avoidPositions: [],
          preferredTimes: [],
          availableForSpecialEvents: false,
          canServeAsCouple: false,
          spouseMinisterId: null,
          extraActivities: {
            sickCommunion: false,
            mondayAdoration: false,
            helpOtherPastorals: false,
            festiveEvents: false,
          },
          ministryStartDate: null,
          experience: null,
          specialSkills: null,
          liturgicalTraining: false,
          lastService: null,
          totalServices: 0,
          formationCompleted: false,
          reliabilityScore: null,
          substitutionRequestCount: 0,
          substitutionFulfilledCount: 0,
          manualRemovalCount: 0,
          noShowCount: 0,
          lastReliabilityUpdate: null,
          reliabilityNotes: null,
          observations: "Conta excluída pelo titular.",
          scheduleDisplayName: "Conta excluída",
          ministerType: null,
          rejectionReason: null,
          updatedAt: now,
        })
        .where(eq(users.id, userId));
    });

    await logAudit(AuditAction.PERSONAL_DATA_DELETE, {
      userId,
      targetResource: "account",
      reason: "self_service_account_deletion",
      ipAddress: req.ip,
      userAgent: req.get("user-agent"),
    });

    clearAuthCookies(res);
    return res.status(200).json({ success: true, message: "Conta excluída com sucesso." });
  } catch (error) {
    console.error("[ACCOUNT_DELETE] Failed:", error);
    return res.status(500).json({
      message: "Não foi possível excluir a conta agora. Tente novamente ou fale com o DPO.",
    });
  }
});

export default router;
