import { Router } from "express";
import { db } from "../db-config";
import { scheduleAssignments, ministers, users } from "@shared/schema";
import { eq } from "drizzle-orm";
// Usar implementações inline para evitar problemas de import
const requireAuth = () => (req: any, res: any, next: any) => {
  if (!req.session?.userId) {
    return res.status(401).json({ error: "Authentication required" });
  }
  req.user = { id: req.session.userId, role: req.session.userRole };
  next();
};

const logActivity = async (userId: string, action: string, description: string, metadata?: any) => {
  // Log simples por enquanto - pode ser expandido depois
  console.log(`Activity: ${userId} - ${action}: ${description}`, metadata);
};

const router = Router();

// Update assignment
router.patch("/:id", requireAuth(), async (req, res) => {
  try {
    // Only coordinators can modify assignments
    if (req.user?.role !== "coordenador" && req.user?.role !== "gestor") {
      return res.status(403).json({ message: "Sem permissão para editar escalações" });
    }

    const { ministerId, position } = req.body;

    // Validate required fields
    if (!ministerId || !position) {
      return res.status(400).json({ message: "Ministro e posição são obrigatórios" });
    }

    const updatedAssignment = await db
      .update(scheduleAssignments)
      .set({ 
        ministerId,
        position: parseInt(position)
      })
      .where(eq(scheduleAssignments.id, req.params.id))
      .returning();

    if (updatedAssignment.length === 0) {
      return res.status(404).json({ message: "Escalação não encontrada" });
    }

    await logActivity(
      req.user.id,
      "assignment_updated",
      `Escalação modificada`,
      { assignmentId: req.params.id }
    );

    res.json(updatedAssignment[0]);
  } catch (error) {
    console.error("Error updating assignment:", error);
    res.status(500).json({ message: "Erro ao atualizar escalação" });
  }
});

// Delete assignment
router.delete("/:id", requireAuth(), async (req, res) => {
  try {
    // Only coordinators can delete assignments
    if (req.user?.role !== "coordenador" && req.user?.role !== "gestor") {
      return res.status(403).json({ message: "Sem permissão para remover escalações" });
    }

    const deletedAssignment = await db
      .delete(scheduleAssignments)
      .where(eq(scheduleAssignments.id, req.params.id))
      .returning();

    if (deletedAssignment.length === 0) {
      return res.status(404).json({ message: "Escalação não encontrada" });
    }

    await logActivity(
      req.user.id,
      "assignment_deleted",
      `Escalação removida`,
      { assignmentId: req.params.id }
    );

    res.json({ message: "Escalação removida com sucesso" });
  } catch (error) {
    console.error("Error deleting assignment:", error);
    res.status(500).json({ message: "Erro ao remover escalação" });
  }
});

// Create new assignment
router.post("/", requireAuth(), async (req, res) => {
  try {
    // Only coordinators can create assignments
    if (req.user?.role !== "coordenador" && req.user?.role !== "gestor") {
      return res.status(403).json({ message: "Sem permissão para criar escalações" });
    }

    const { scheduleId, ministerId, date, massTime, position } = req.body;

    // Validate required fields
    if (!scheduleId || !ministerId || !date || !massTime || !position) {
      return res.status(400).json({ message: "Todos os campos são obrigatórios" });
    }

    const newAssignment = await db
      .insert(scheduleAssignments)
      .values({
        scheduleId,
        ministerId,
        date: new Date(date),
        massTime,
        position: parseInt(position),
        confirmed: false,
        createdAt: new Date()
      })
      .returning();

    await logActivity(
      req.user.id,
      "assignment_created",
      `Nova escalação criada`,
      { assignmentId: newAssignment[0].id }
    );

    res.status(201).json(newAssignment[0]);
  } catch (error) {
    console.error("Error creating assignment:", error);
    res.status(500).json({ message: "Erro ao criar escalação" });
  }
});

export default router;