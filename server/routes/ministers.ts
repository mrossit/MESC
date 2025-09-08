import { Router } from "express";
import { db } from "../db-config";
import { users } from "../../shared/schema-simple";
import { requireAuth } from "../middleware/auth";
import { eq, and, sql } from "drizzle-orm";
import { logActivity } from "../utils/activity-logger";

const router = Router();

// Get all ministers (users with role 'ministro')
router.get("/", requireAuth, async (req, res) => {
  try {
    const ministersList = await db
      .select()
      .from(users)
      .where(eq(users.role, "ministro"));

    res.json(ministersList);
  } catch (error) {
    console.error("Error fetching ministers:", error);
    res.status(500).json({ message: "Erro ao buscar ministros" });
  }
});

// Get single minister
router.get("/:id", requireAuth, async (req, res) => {
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
router.patch("/:id", requireAuth, async (req, res) => {
  try {
    const userId = req.params.id;
    const currentUser = (req as any).user;
    
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
      'observations', 'active'
    ];

    const updateData: any = {};
    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        // Handle JSON fields
        if (['preferredTimes', 'specialSkills', 'liturgicalTraining', 'formationCompleted'].includes(field)) {
          updateData[field] = JSON.stringify(req.body[field]);
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

    // Log activity
    await logActivity(
      currentUser.id,
      'UPDATE_MINISTER',
      `Dados do ministro ${result[0].name} atualizados`,
      { ministerId: userId, fields: Object.keys(updateData) }
    );

    res.json(result[0]);
  } catch (error) {
    console.error("Error updating minister:", error);
    res.status(500).json({ message: "Erro ao atualizar ministro" });
  }
});

// Get minister statistics
router.get("/:id/stats", requireAuth, async (req, res) => {
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

    // Get recent assignments count
    const threeMonthsAgo = new Date();
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
    
    const recentAssignments = await db.run(
      sql`SELECT COUNT(*) as count FROM schedule_assignments 
          WHERE minister_id = ${ministerId} 
          AND date >= ${threeMonthsAgo.getTime()}`
    );

    res.json({
      totalServices: minister[0].totalServices || 0,
      recentAssignments: recentAssignments.rows[0]?.count || 0
    });
  } catch (error) {
    console.error("Error fetching minister stats:", error);
    res.status(500).json({ message: "Erro ao buscar estatísticas" });
  }
});

export default router;