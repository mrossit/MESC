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
router.patch("/:id", authenticateToken, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;
    const userRole = req.user!.role;
    const { ministerId, notes } = req.body;

    // Get the current assignment to check permissions
    const currentAssignment = await db
      .select()
      .from(schedules)
      .where(eq(schedules.id, req.params.id))
      .limit(1);

    if (currentAssignment.length === 0) {
      return res.status(404).json({ message: "Escalação não encontrada" });
    }

    const assignment = currentAssignment[0];

    // Check if mass has passed (3 hours after mass time)
    const massDateTime = new Date(`${assignment.date}T${assignment.time}`);
    const threeHoursAfterMass = new Date(massDateTime.getTime() + 3 * 60 * 60 * 1000);
    const now = new Date();

    if (now > threeHoursAfterMass && userRole !== 'gestor') {
      return res.status(403).json({
        message: "Não é possível editar esta escalação. O prazo de edição expirou (3 horas após a missa)."
      });
    }

    // Check if user has permission to edit
    const isCoordOrGestor = userRole === 'coordenador' || userRole === 'gestor';

    // Check if user is Auxiliar 1 or 2 for this mass (same date and time)
    let isAuxiliar1or2ForThisMass = false;
    if (!isCoordOrGestor) {
      const userAssignmentsForThisMass = await db
        .select()
        .from(schedules)
        .where(
          and(
            eq(schedules.date, assignment.date),
            eq(schedules.time, assignment.time),
            eq(schedules.ministerId, userId)
          )
        );

      // Check if user is Auxiliar 1 or 2 in any assignment for this mass
      isAuxiliar1or2ForThisMass = userAssignmentsForThisMass.some(
        a => a.position === 1 || a.position === 2
      );
    }

    if (!isCoordOrGestor && !isAuxiliar1or2ForThisMass) {
      return res.status(403).json({
        message: "Você não tem permissão para editar esta escalação. Apenas Auxiliares 1 e 2 podem editar escalações da missa em que estiverem como Auxiliar."
      });
    }

    // Auxiliar 1/2 can edit any assignment in their mass
    if (isAuxiliar1or2ForThisMass && !isCoordOrGestor) {
      // Update assignment (minister and/or notes)
      const updateData: any = {};
      if (ministerId !== undefined) updateData.ministerId = ministerId;
      if (notes !== undefined) updateData.notes = notes;

      const updatedAssignment = await db
        .update(schedules)
        .set(updateData)
        .where(eq(schedules.id, req.params.id))
        .returning();

      await logActivity(
        userId,
        "assignment_updated_by_auxiliar",
        `Escalação modificada por Auxiliar da missa`,
        { assignmentId: req.params.id, changes: updateData }
      );

      return res.json(updatedAssignment[0]);
    }

    // Coordenador/Gestor can update everything
    // Validate required fields for full update
    if (ministerId === undefined && notes === undefined) {
      return res.status(400).json({ message: "Nenhum campo para atualizar" });
    }

    const updateData: any = {};
    if (ministerId !== undefined) updateData.ministerId = ministerId;
    if (notes !== undefined) updateData.notes = notes;

    const updatedAssignment = await db
      .update(schedules)
      .set(updateData)
      .where(eq(schedules.id, req.params.id))
      .returning();

    await logActivity(
      userId,
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