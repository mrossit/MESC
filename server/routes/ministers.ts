import { Router } from "express";
import { db } from "../db";
import { users } from "@shared/schema";
import { authenticateToken as requireAuth, AuthRequest } from "../auth";
import { eq, and, sql } from "drizzle-orm";
import { storage } from "../storage";
import { formatMinisterName } from "../utils/formatters";

const router = Router();

// Get all ministers (users with role 'ministro' OR 'coordenador')
router.get("/", requireAuth, async (req: AuthRequest, res) => {
  try {
    const ministersList = await db
      .select()
      .from(users)
      .where(
        sql`${users.role} IN ('ministro', 'coordenador')`
      );

    res.json(ministersList);
  } catch (error) {
    console.error("Error fetching ministers:", error);
    res.status(500).json({ message: "Erro ao buscar ministros" });
  }
});

// Get single minister
router.get("/:id", requireAuth, async (req: AuthRequest, res) => {
  try {
    const minister = await db
      .select()
      .from(users)
      .where(and(
        eq(users.id, req.params.id),
        eq(users.role, "ministro")
      ))
      .limit(1);

    if (minister.length === 0) {
      return res.status(404).json({ message: "Ministro não encontrado" });
    }

    res.json(minister[0]);
  } catch (error) {
    console.error("Error fetching minister:", error);
    res.status(500).json({ message: "Erro ao buscar ministro" });
  }
});

// Update minister data (only non-auth fields)
router.patch("/:id", requireAuth, async (req: AuthRequest, res) => {
  try {
    const userId = req.params.id;
    const currentUser = req.user!;
    
    // Check permissions
    if (currentUser.role !== "gestor" && currentUser.role !== "coordenador" && currentUser.id !== userId) {
      return res.status(403).json({ message: "Sem permissão para editar este ministro" });
    }

    // Fields that can be updated
    const allowedFields = [
      'birthDate', 'address', 'city', 'zipCode',
      'emergencyContact', 'emergencyPhone',
      'preferredPosition', 'preferredTimes',
      'availableForSpecialEvents', 'canServeAsCouple', 'spouseUserId',
      'experience', 'specialSkills', 'liturgicalTraining',
      'observations', 'active', 'scheduleDisplayName'
    ];

    const updateData: any = {};
    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        // Handle different field types correctly
        if (field === 'preferredTimes') {
          // JSONB field - store as raw array/object
          updateData[field] = req.body[field];
        } else if (field === 'specialSkills') {
          // TEXT field - can be stringified if needed for complex data
          updateData[field] = typeof req.body[field] === 'string' ? req.body[field] : JSON.stringify(req.body[field]);
        } else if (['liturgicalTraining', 'formationCompleted'].includes(field)) {
          // BOOLEAN fields - store as raw boolean values
          updateData[field] = Boolean(req.body[field]);
        } else if (field === 'scheduleDisplayName') {
          // Apply formatting to scheduleDisplayName
          updateData[field] = formatMinisterName(req.body[field]);
        } else {
          updateData[field] = req.body[field];
        }
      }
    }

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({ message: "Nenhum campo para atualizar" });
    }

    updateData.updatedAt = new Date();

    const result = await db
      .update(users)
      .set(updateData)
      .where(and(
        eq(users.id, userId),
        eq(users.role, "ministro")
      ))
      .returning();

    if (result.length === 0) {
      return res.status(404).json({ message: "Ministro não encontrado" });
    }

    // Log activity (using console.log for now since storage.logActivity doesn't exist)
    console.log(`[Activity Log] UPDATE_MINISTER: Dados do ministro ${result[0].name} atualizados`, { ministerId: userId, fields: Object.keys(updateData) });

    res.json(result[0]);
  } catch (error) {
    console.error("Error updating minister:", error);
    res.status(500).json({ message: "Erro ao atualizar ministro" });
  }
});

// Get minister statistics
router.get("/:id/stats", requireAuth, async (req: AuthRequest, res) => {
  try {
    const ministerId = req.params.id;
    
    // Get total services from user record
    const minister = await db
      .select({ totalServices: users.totalServices })
      .from(users)
      .where(and(
        eq(users.id, ministerId),
        eq(users.role, "ministro")
      ))
      .limit(1);

    if (minister.length === 0) {
      return res.status(404).json({ message: "Ministro não encontrado" });
    }

    // Get recent assignments count (simplified approach since schedule_assignments table may not exist)
    const threeMonthsAgo = new Date();
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
    
    // For now, return 0 since the actual schedule_assignments table structure needs to be verified
    const recentAssignments = 0;

    res.json({
      totalServices: minister[0].totalServices || 0,
      recentAssignments: recentAssignments
    });
  } catch (error) {
    console.error("Error fetching minister stats:", error);
    res.status(500).json({ message: "Erro ao buscar estatísticas" });
  }
});

export default router;