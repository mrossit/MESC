import { Router } from "express";
import { db } from "../db-config";
import { schedules, scheduleAssignments, users } from "../../shared/schema-simple";
import { requireAuth } from "../middleware/auth";
import { eq, and, sql, gte, lte, count } from "drizzle-orm";
import { logActivity } from "../utils/activity-logger";
import { generateIntelligentSchedule } from "../utils/scheduleGenerator";

const router = Router();

// Get upcoming schedules for a minister
router.get("/minister/upcoming", requireAuth(), async (req: any, res: any) => {
  try {
    // Get the minister ID from the logged-in user
    const userId = req.session?.userId;
    if (!userId) {
      return res.status(401).json({ message: "Não autenticado" });
    }
    
    const minister = await db
      .select()
      .from(ministers)
      .where(eq(ministers.userId, userId))
      .limit(1);
    
    if (minister.length === 0) {
      return res.json({ assignments: [] });
    }
    
    const ministerId = minister[0].id;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Get upcoming assignments for this minister
    const upcomingAssignments = await db
      .select({
        id: scheduleAssignments.id,
        date: scheduleAssignments.date,
        massTime: scheduleAssignments.massTime,
        position: scheduleAssignments.position,
        confirmed: scheduleAssignments.confirmed,
        scheduleId: scheduleAssignments.scheduleId,
        scheduleTitle: schedules.title,
        scheduleStatus: schedules.status
      })
      .from(scheduleAssignments)
      .innerJoin(schedules, eq(scheduleAssignments.scheduleId, schedules.id))
      .where(
        and(
          eq(scheduleAssignments.ministerId, ministerId),
          gte(scheduleAssignments.date, today),
          eq(schedules.status, "published")
        )
      )
      .orderBy(scheduleAssignments.date)
      .limit(10);
    
    res.json({ assignments: upcomingAssignments });
  } catch (error) {
    console.error("Error getting upcoming schedules:", error);
    res.status(500).json({ message: "Erro ao buscar próximas escalas" });
  }
});

// Get schedule assignments for a specific date
router.get("/by-date/:date", requireAuth(), async (req: any, res: any) => {
  try {
    const { date } = req.params;
    const targetDate = new Date(date);
    
    // Find published schedule for the month
    const schedule = await db
      .select()
      .from(schedules)
      .where(
        and(
          eq(schedules.month, targetDate.getMonth() + 1),
          eq(schedules.year, targetDate.getFullYear()),
          eq(schedules.status, "published")
        )
      )
      .limit(1);
    
    if (schedule.length === 0) {
      return res.json({ 
        schedule: null, 
        assignments: [],
        message: "Nenhuma escala publicada para este mês"
      });
    }
    
    // Format dates for comparison (YYYY-MM-DD)
    const targetDateStr = targetDate.toISOString().split('T')[0];
    
    // Get all assignments for the schedule first
    const allAssignments = await db
      .select({
        id: scheduleAssignments.id,
        scheduleId: scheduleAssignments.scheduleId,
        ministerId: scheduleAssignments.ministerId,
        date: scheduleAssignments.date,
        massTime: scheduleAssignments.massTime,
        position: scheduleAssignments.position,
        confirmed: scheduleAssignments.confirmed,
        ministerName: users.name,
        ministerEmail: users.email
      })
      .from(scheduleAssignments)
      .leftJoin(ministers, eq(scheduleAssignments.ministerId, ministers.id))
      .leftJoin(users, eq(ministers.userId, users.id))
      .where(eq(scheduleAssignments.scheduleId, schedule[0].id))
      .orderBy(scheduleAssignments.massTime, scheduleAssignments.position);
    
    // Filter assignments for the specific date in JavaScript
    const dayAssignments = allAssignments.filter(a => {
      // Handle both timestamp and date string formats
      let assignmentDate: Date;
      
      const dateValue = a.date;
      
      if (typeof dateValue === 'number') {
        // SQLite stores as Unix timestamp in seconds
        assignmentDate = new Date(dateValue * 1000);
      } else if (dateValue instanceof Date) {
        assignmentDate = dateValue;
      } else {
        // Try to parse as string
        assignmentDate = new Date(dateValue as any);
      }
      
      const assignmentDateStr = assignmentDate.toISOString().split('T')[0];
      return assignmentDateStr === targetDateStr;
    });
    
    res.json({
      schedule: schedule[0],
      assignments: dayAssignments
    });
  } catch (error) {
    console.error("Error fetching schedule by date:", error);
    res.status(500).json({ message: "Erro ao buscar escala para a data" });
  }
});

// Get schedules for a specific month
router.get("/", requireAuth(), async (req: any, res: any) => {
  try {
    const { month, year } = req.query;
    
    let query = db.select().from(schedules);
    
    if (month && year) {
      const schedulesList = await db
        .select()
        .from(schedules)
        .where(
          and(
            eq(schedules.month, parseInt(month as string)),
            eq(schedules.year, parseInt(year as string))
          )
        );

      // Get assignments for these schedules
      const assignmentsList = schedulesList.length > 0 
        ? await db
            .select({
              id: scheduleAssignments.id,
              scheduleId: scheduleAssignments.scheduleId,
              ministerId: scheduleAssignments.ministerId,
              date: scheduleAssignments.date,
              massTime: scheduleAssignments.massTime,
              position: scheduleAssignments.position,
              confirmed: scheduleAssignments.confirmed,
              ministerName: users.name
            })
            .from(scheduleAssignments)
            .leftJoin(ministers, eq(scheduleAssignments.ministerId, ministers.id))
            .leftJoin(users, eq(ministers.userId, users.id))
            .where(eq(scheduleAssignments.scheduleId, schedulesList[0]?.id || ''))
        : [];

      // Get substitution requests for these assignments
      const substitutionsList = assignmentsList.length > 0
        ? await db
            .select({
              id: substitutionRequests.id,
              assignmentId: substitutionRequests.assignmentId,
              requestingMinisterId: substitutionRequests.requestingMinisterId,
              substituteMinisterId: substitutionRequests.substituteMinisterId,
              status: substitutionRequests.status,
              reason: substitutionRequests.reason
            })
            .from(substitutionRequests)
            .where(
              and(
                sql`${substitutionRequests.assignmentId} IN (${sql.join(
                  assignmentsList.map(a => sql`${a.id}`),
                  sql`, `
                )})`,
                sql`${substitutionRequests.status} IN ('pending', 'approved', 'auto_approved')`
              )
            )
        : [];

      res.json({
        schedules: schedulesList,
        assignments: assignmentsList,
        substitutions: substitutionsList
      });
    } else {
      const allSchedules = await db.select().from(schedules);
      res.json({ schedules: allSchedules, assignments: [] });
    }
  } catch (error) {
    console.error("Error fetching schedules:", error);
    res.status(500).json({ message: "Erro ao buscar escalas" });
  }
});

// Create new schedule
router.post("/", requireAuth(), async (req: any, res: any) => {
  try {
    // Only coordinators can create schedules
    const user = await db.select().from(users).where(eq(users.id, req.session?.userId)).limit(1);
    if (!user[0] || (user[0].role !== "coordenador" && user[0].role !== "gestor")) {
      return res.status(403).json({ message: "Sem permissão para criar escalas" });
    }

    const { title, month, year } = req.body;

    // Validate required fields
    if (!title || !month || !year) {
      return res.status(400).json({ message: "Título, mês e ano são obrigatórios" });
    }

    // Validate month and year values
    if (month < 1 || month > 12) {
      return res.status(400).json({ message: "Mês deve estar entre 1 e 12" });
    }

    if (year < new Date().getFullYear() - 1 || year > new Date().getFullYear() + 5) {
      return res.status(400).json({ message: "Ano deve estar em um intervalo válido" });
    }

    // Check if schedule already exists for this month
    const existing = await db
      .select()
      .from(schedules)
      .where(
        and(
          eq(schedules.month, parseInt(month)),
          eq(schedules.year, parseInt(year))
        )
      )
      .limit(1);

    if (existing.length > 0) {
      return res.status(400).json({ message: "Já existe uma escala para este mês" });
    }

    const newSchedule = await db
      .insert(schedules)
      .values({
        title: title.trim(),
        month: parseInt(month),
        year: parseInt(year),
        status: "draft",
        createdBy: user[0].id,
        createdAt: new Date()
      })
      .returning();

    await logActivity(
      req.session?.userId!,
      "schedule_created",
      `Nova escala criada: ${title}`,
      { scheduleId: newSchedule[0].id }
    );

    res.status(201).json(newSchedule[0]);
  } catch (error) {
    console.error("Error creating schedule:", error);
    res.status(500).json({ message: "Erro ao criar escala" });
  }
});

// Update schedule
router.put("/:id", requireAuth(), async (req: any, res: any) => {
  try {
    // Only coordinators can update schedules
    const user = await db.select().from(users).where(eq(users.id, req.session?.userId)).limit(1);
    if (!user[0] || (user[0].role !== "coordenador" && user[0].role !== "gestor")) {
      return res.status(403).json({ message: "Sem permissão para editar escalas" });
    }

    const { title } = req.body;

    const updatedSchedule = await db
      .update(schedules)
      .set({ title })
      .where(eq(schedules.id, req.params.id))
      .returning();

    if (updatedSchedule.length === 0) {
      return res.status(404).json({ message: "Escala não encontrada" });
    }

    await logActivity(
      req.session?.userId!,
      "schedule_updated",
      `Escala atualizada: ${title}`,
      { scheduleId: req.params.id }
    );

    res.json(updatedSchedule[0]);
  } catch (error) {
    console.error("Error updating schedule:", error);
    res.status(500).json({ message: "Erro ao atualizar escala" });
  }
});

// Publish schedule
router.patch("/:id/publish", requireAuth(), async (req: any, res: any) => {
  try {
    // Only coordinators can publish schedules
    const user = await db.select().from(users).where(eq(users.id, req.session?.userId)).limit(1);
    if (!user[0] || (user[0].role !== "coordenador" && user[0].role !== "gestor")) {
      return res.status(403).json({ message: "Sem permissão para publicar escalas" });
    }

    const updatedSchedule = await db
      .update(schedules)
      .set({ 
        status: "published",
        publishedAt: new Date()
      })
      .where(eq(schedules.id, req.params.id))
      .returning();

    if (updatedSchedule.length === 0) {
      return res.status(404).json({ message: "Escala não encontrada" });
    }

    await logActivity(
      req.session?.userId!,
      "schedule_published",
      `Escala publicada`,
      { scheduleId: req.params.id }
    );

    // TODO: Send notifications to all ministers

    res.json({ message: "Escala publicada com sucesso" });
  } catch (error) {
    console.error("Error publishing schedule:", error);
    res.status(500).json({ message: "Erro ao publicar escala" });  
  }
});

// Delete schedule
router.delete("/:id", requireAuth(), async (req: any, res: any) => {
  try {
    console.log("DELETE schedule request for ID:", req.params.id);
    
    // Only coordinators can delete schedules
    const user = await db.select().from(users).where(eq(users.id, req.session?.userId)).limit(1);
    if (!user[0] || (user[0].role !== "coordenador" && user[0].role !== "gestor")) {
      return res.status(403).json({ message: "Sem permissão para excluir escalas" });
    }

    // Check if schedule exists and is not published
    const schedule = await db
      .select()
      .from(schedules)
      .where(eq(schedules.id, req.params.id))
      .limit(1);

    if (schedule.length === 0) {
      return res.status(404).json({ message: "Escala não encontrada" });
    }

    if (schedule[0].status === "published") {
      return res.status(400).json({ message: "Não é possível excluir uma escala publicada" });
    }

    // Count assignments before deletion
    const assignmentCount = await db
      .select({ count: count() })
      .from(scheduleAssignments)
      .where(eq(scheduleAssignments.scheduleId, req.params.id));
    
    console.log(`Found ${assignmentCount[0].count} assignments to delete`);

    // Delete all related data in order (due to foreign key constraints)
    // First delete presence confirmations
    await db.run(
      sql`DELETE FROM presence_confirmations WHERE assignment_id IN (
        SELECT id FROM schedule_assignments WHERE schedule_id = ${req.params.id}
      )`
    );

    // Then delete substitution responses
    await db.run(
      sql`DELETE FROM substitution_responses WHERE request_id IN (
        SELECT id FROM substitution_requests WHERE assignment_id IN (
          SELECT id FROM schedule_assignments WHERE schedule_id = ${req.params.id}
        )
      )`
    );

    // Then delete substitution requests
    await db.run(
      sql`DELETE FROM substitution_requests WHERE assignment_id IN (
        SELECT id FROM schedule_assignments WHERE schedule_id = ${req.params.id}
      )`
    );

    // Then delete assignments
    await db.run(
      sql`DELETE FROM schedule_assignments WHERE schedule_id = ${req.params.id}`
    );

    // Finally delete the schedule
    await db
      .delete(schedules)
      .where(eq(schedules.id, req.params.id));

    await logActivity(
      req.session?.userId!,
      "schedule_deleted",
      `Escala excluída: ${schedule[0].title}`,
      { scheduleId: req.params.id }
    );

    console.log(`Successfully deleted schedule: ${schedule[0].title}`);
    res.json({ message: "Escala excluída com sucesso" });
  } catch (error) {
    console.error("Error deleting schedule - Full error:", error);
    res.status(500).json({ message: "Erro ao excluir escala" });
  }
});

// Unpublish schedule (cancel publication)
router.patch("/:id/unpublish", requireAuth(), async (req: any, res: any) => {
  try {
    // Only coordinators can unpublish schedules
    const user = await db.select().from(users).where(eq(users.id, req.session?.userId)).limit(1);
    if (!user[0] || (user[0].role !== "coordenador" && user[0].role !== "gestor")) {
      return res.status(403).json({ message: "Sem permissão para cancelar publicação" });
    }

    const updatedSchedule = await db
      .update(schedules)
      .set({ 
        status: "draft",
        publishedAt: null
      })
      .where(eq(schedules.id, req.params.id))
      .returning();

    if (updatedSchedule.length === 0) {
      return res.status(404).json({ message: "Escala não encontrada" });
    }

    await logActivity(
      req.session?.userId!,
      "schedule_unpublished",
      `Publicação da escala cancelada`,
      { scheduleId: req.params.id }
    );

    res.json({ message: "Publicação cancelada com sucesso" });
  } catch (error) {
    console.error("Error unpublishing schedule:", error);
    res.status(500).json({ message: "Erro ao cancelar publicação" });  
  }
});

// Generate intelligent schedule
router.post("/:scheduleId/generate", requireAuth(), async (req: any, res: any) => {
  try {
    // Only coordinators can generate schedules
    const user = await db.select().from(users).where(eq(users.id, req.session?.userId)).limit(1);
    if (!user[0] || (user[0].role !== "coordenador" && user[0].role !== "gestor")) {
      return res.status(403).json({ message: "Sem permissão para gerar escalas" });
    }

    const scheduleId = req.params.scheduleId;
    
    // Get the schedule
    const schedule = await db
      .select()
      .from(schedules)
      .where(eq(schedules.id, scheduleId))
      .limit(1);
      
    if (schedule.length === 0) {
      return res.status(404).json({ message: "Escala não encontrada" });
    }

    const currentSchedule = schedule[0];
    
    console.log(`🔄 Gerando escala inteligente para ${currentSchedule.month}/${currentSchedule.year}`);
    
    // Generate intelligent assignments
    const result = await generateIntelligentSchedule(
      currentSchedule.month,
      currentSchedule.year,
      {
        prioritizeExperienced: true,
        balanceWorkload: true,
        respectPreferences: true,
        avoidConsecutiveDays: true
      }
    );

    // Clear existing assignments
    await db
      .delete(scheduleAssignments)
      .where(eq(scheduleAssignments.scheduleId, scheduleId));

    // Insert new assignments
    if (result.schedule.length > 0) {
      const assignmentsToInsert = result.schedule.map((assignment: any) => {
        // Garantir que a data é um objeto Date válido
        const assignmentDate = new Date(assignment.date);
        
        // Validar que a data pertence ao mês correto
        const dateMonth = assignmentDate.getMonth() + 1;
        const dateYear = assignmentDate.getFullYear();
        
        if (dateMonth !== currentSchedule.month || dateYear !== currentSchedule.year) {
          console.error(`⚠️ Data inválida detectada: ${assignmentDate.toISOString()} não pertence a ${currentSchedule.month}/${currentSchedule.year}`);
          // Corrigir a data para o mês correto mantendo o dia
          const dayOfMonth = assignmentDate.getDate();
          const correctedDate = new Date(currentSchedule.year, currentSchedule.month - 1, dayOfMonth);
          console.log(`✅ Data corrigida para: ${correctedDate.toISOString()}`);
          assignmentDate.setTime(correctedDate.getTime());
        }
        
        return {
          scheduleId,
          ministerId: assignment.ministerId,
          date: assignmentDate,
          massTime: assignment.massTime,
          position: assignment.position,
          confirmed: false,
          createdAt: new Date()
        };
      });

      await db
        .insert(scheduleAssignments)
        .values(assignmentsToInsert);
    }

    await logActivity(
      req.session?.userId!,
      "schedule_generated",
      `Escala inteligente gerada com ${result.stats.totalAssignments} atribuições`,
      { 
        scheduleId, 
        assignmentsCount: result.stats.totalAssignments,
        responseRate: result.stats.responseRate,
        missingResponses: result.stats.missingResponses
      }
    );

    console.log(`✅ Escala gerada: ${result.stats.totalAssignments} atribuições criadas`);

    // Preparar mensagem com alerta de respostas ausentes
    let message = `Escala gerada com sucesso! ${result.stats.totalAssignments} atribuições criadas.`;
    if (result.stats.missingResponses > 0) {
      message += ` ⚠️ ATENÇÃO: ${result.stats.missingResponses} ministros ainda não responderam o questionário (${result.stats.responseRate}% de resposta).`;
    }

    res.json({ 
      message,
      assignments: result.stats.totalAssignments,
      stats: result.stats
    });
  } catch (error) {
    console.error("Error generating intelligent schedule:", error);
    res.status(500).json({ message: "Erro ao gerar escala inteligente" });
  }
});

export default router;