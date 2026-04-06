import { Router } from "express";
import { storage } from "../storage";
import { authenticateToken, requireRole, AuthRequest } from "../auth";
import { questionnaireResponses, schedules, substitutionRequests } from "@shared/schema";
import { db } from '../db';
import { eq, count, or } from 'drizzle-orm';

const router = Router();

// Health check endpoint for PWA connectivity checks
router.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});
router.head('/api/health', (req, res) => {
  res.status(200).end();
});

// Health check / diagnostic endpoint - útil para debugar problemas de produção
router.get('/api/diagnostic/:userId', authenticateToken, requireRole(['gestor']), async (req: AuthRequest, res) => {
  try {
    const userId = req.params.userId;
    
    // Tentar várias operações e ver qual falha
    const diagnostics = {
      userExists: false,
      canQueryUser: false,
      canQueryQuestionnaireResponses: false,
      canQueryScheduleAssignments: false,
      canQuerySubstitutionRequests: false,
      ministerialActivityCheck: null as boolean | null,
      userError: null as string | null,
      questionnaireError: null as string | null,
      scheduleError: null as string | null,
      substitutionError: null as string | null,
      storageError: null as string | null,
      questionnaireCount: 0,
      scheduleMinisterCount: 0,
      scheduleSubstituteCount: 0,
      substitutionRequestCount: 0
    };
    
    try {
      const user = await storage.getUser(userId);
      diagnostics.userExists = !!user;
      diagnostics.canQueryUser = true;
    } catch (e) {
      diagnostics.userError = `Error querying user: ${e}`;
    }
    
    try {
      // Verificação básica de questionários
      const [questionnaireCheck] = await db.select({ count: count() })
        .from(questionnaireResponses)
        .where(eq(questionnaireResponses.userId, userId));
      diagnostics.canQueryQuestionnaireResponses = true;
      diagnostics.questionnaireCount = questionnaireCheck?.count || 0;
    } catch (e) {
      diagnostics.questionnaireError = `Error querying questionnaire responses: ${e}`;
    }
    
    try {
      // Verificação básica de escalas como ministro
      const [scheduleMinisterCheck] = await db.select({ count: count() })
        .from(schedules)
        .where(eq(schedules.ministerId, userId));
      diagnostics.canQueryScheduleAssignments = true;
      diagnostics.scheduleMinisterCount = scheduleMinisterCheck?.count || 0;
      
      // Verificação básica de escalas como substituto
      const [scheduleSubstituteCheck] = await db.select({ count: count() })
        .from(schedules)
        .where(eq(schedules.substituteId, userId));
      diagnostics.scheduleSubstituteCount = scheduleSubstituteCheck?.count || 0;
    } catch (e) {
      diagnostics.scheduleError = `Error querying schedule assignments: ${e}`;
    }
    
    try {
      // Verificação de solicitações de substituição
      const [substitutionCheck] = await db.select({ count: count() })
        .from(substitutionRequests)
        .where(or(
          eq(substitutionRequests.requesterId, userId),
          eq(substitutionRequests.substituteId, userId)
        ));
      diagnostics.canQuerySubstitutionRequests = true;
      diagnostics.substitutionRequestCount = substitutionCheck?.count || 0;
    } catch (e) {
      diagnostics.substitutionError = `Error querying substitution requests: ${e}`;
    }
    
    try {
      // Testar o método que está falhando
      const result = await storage.checkUserMinisterialActivity(userId);
      diagnostics.ministerialActivityCheck = result.isUsed;
    } catch (e) {
      diagnostics.storageError = `Error in checkUserMinisterialActivity: ${e}`;
    }
    
    res.json(diagnostics);
  } catch (error) {
    res.status(500).json({ error: `Diagnostic failed: ${error}` });
  }
});

export default router;
