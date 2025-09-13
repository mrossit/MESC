import { Router } from "express";
import { db } from "../db";
import { schedules, users } from "@shared/schema";
import { eq } from "drizzle-orm";
import { authenticateToken, requireRole, AuthRequest } from "../auth";
const logActivity = async (userId: string, action: string, description: string, metadata?: any) => {
  // Log simples por enquanto - pode ser expandido depois
  console.log(`Activity: ${userId} - ${action}: ${description}`, metadata);
};

const router = Router();

// Update assignment
router.patch("/:id", authenticateToken, requireRole(['coordenador', 'gestor']), async (req: AuthRequest, res) => {
  try {

    const { ministerId, notes } = req.body;

    // Validate required fields
    if (!ministerId) {
      return res.status(400).json({ message: "Ministro é obrigatório" });
    }

    const updatedAssignment = await db
      .update(schedules)
      .set({ 
        ministerId,
        notes
      })
      .where(eq(schedules.id, req.params.id))
      .returning();

    if (updatedAssignment.length === 0) {
      return res.status(404).json({ message: "Escalação não encontrada" });
    }

    await logActivity(
      req.user!.id,
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
router.delete("/:id", authenticateToken, requireRole(['coordenador', 'gestor']), async (req: AuthRequest, res) => {
  try {

    const deletedAssignment = await db
      .delete(schedules)
      .where(eq(schedules.id, req.params.id))
      .returning();

    if (deletedAssignment.length === 0) {
      return res.status(404).json({ message: "Escalação não encontrada" });
    }

    await logActivity(
      req.user!.id,
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
router.post("/", authenticateToken, requireRole(['coordenador', 'gestor']), async (req: AuthRequest, res) => {
  try {

    const { ministerId, date, time, type, location, notes } = req.body;

    // Validate required fields
    if (!ministerId || !date || !time) {
      return res.status(400).json({ message: "Ministro, data e horário são obrigatórios" });
    }

    const newAssignment = await db
      .insert(schedules)
      .values({
        ministerId,
        date,
        time,
        type: type || 'missa',
        location,
        notes,
        status: 'scheduled'
      })
      .returning();

    await logActivity(
      req.user!.id,
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