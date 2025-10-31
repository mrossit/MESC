import { Request, Response } from "express";
import { pythonScheduleService } from "../services/pythonScheduleService";
import { db } from "../../db";
import { users, questionnaireResponses, questionnaires } from "@shared/schema";
import { eq, and } from "drizzle-orm";
import { logger } from "../../utils/logger";
import { AuthRequest } from "../../auth";

/**
 * Gera escala usando o algoritmo alternativo Python
 */
export async function gerarEscalaAlternativa(req: AuthRequest, res: Response) {
  try {
    const { year, month, questionnaireId } = req.body;

    logger.info(`Gerando escala alternativa para ${month}/${year} usando Python`);

    // 1. Buscar questionário
    let targetQuestionnaire;
    if (questionnaireId) {
      [targetQuestionnaire] = await db
        .select()
        .from(questionnaires)
        .where(eq(questionnaires.id, questionnaireId))
        .limit(1);
    } else if (year && month) {
      [targetQuestionnaire] = await db
        .select()
        .from(questionnaires)
        .where(
          and(
            eq(questionnaires.year, year),
            eq(questionnaires.month, month)
          )
        )
        .limit(1);
    }

    if (!targetQuestionnaire) {
      return res.status(404).json({
        success: false,
        message: "Questionário não encontrado para o período especificado"
      });
    }

    // 2. Buscar ministros ativos
    const ministersData = await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        role: users.role,
        preferredPositions: users.preferredTimes,
        avoidPositions: users.canServeAsCouple
      })
      .from(users)
      .where(eq(users.status, "active"));

    // 3. Buscar respostas do questionário
    const responses = await db
      .select()
      .from(questionnaireResponses)
      .where(eq(questionnaireResponses.questionnaireId, targetQuestionnaire.id));

    logger.info(`Encontrados ${ministersData.length} ministros e ${responses.length} respostas`);

    // 4. Formatar dados para o Python
    const formattedUsers = ministersData.map((m) => ({
      id: m.id,
      name: m.name,
      email: m.email,
      role: m.role,
      preferred_positions: m.preferredPositions || [],
      avoid_positions: []
    }));

    const formattedResponses = responses.map((r) => ({
      user_id: r.userId,
      questionnaire_id: r.questionnaireId,
      available_sundays: r.availableSundays || [],
      preferred_times: r.preferredMassTimes || [],
      responses: r.responses || {}
    }));

    // 5. Executar algoritmo Python
    const result = await pythonScheduleService.generateSchedule({
      users: formattedUsers,
      responses: formattedResponses
    });

    // 6. Verificar se houve erro
    if ("error" in result && result.error) {
      logger.error(`Erro no algoritmo Python: ${result.message}`);
      return res.status(500).json({
        success: false,
        message: `Erro ao gerar escala: ${result.message}`,
        error: result
      });
    }

    // 7. Retornar resultado
    logger.info(`Escala alternativa gerada com sucesso: ${result.length} atribuições`);

    return res.json({
      success: true,
      algorithm: "python-alternative",
      questionnaire: {
        id: targetQuestionnaire.id,
        title: targetQuestionnaire.title,
        month,
        year
      },
      data: result,
      stats: {
        total_assignments: result.length,
        total_ministers: new Set(result.map((r) => r.ministro_id)).size,
        preferred_assignments: result.filter((r) => r.preferido).length
      }
    });

  } catch (error: any) {
    logger.error(`Erro ao gerar escala alternativa: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: "Erro interno ao gerar escala alternativa",
      error: error.message
    });
  }
}

/**
 * Compara resultados do algoritmo atual vs alternativo
 */
export async function compararAlgoritmos(req: AuthRequest, res: Response) {
  try {
    const { year, month } = req.body;

    logger.info(`Comparando algoritmos para ${month}/${year}`);

    // TODO: Implementar comparação entre algoritmos
    // 1. Gerar com algoritmo atual
    // 2. Gerar com algoritmo alternativo
    // 3. Comparar resultados

    return res.json({
      success: true,
      message: "Funcionalidade de comparação em desenvolvimento",
      algorithms: ["current", "python-alternative"]
    });

  } catch (error: any) {
    logger.error(`Erro ao comparar algoritmos: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: "Erro ao comparar algoritmos",
      error: error.message
    });
  }
}

/**
 * Verifica status do Python no sistema
 */
export async function verificarPython(req: Request, res: Response) {
  try {
    const available = await pythonScheduleService.validatePythonAvailable();

    return res.json({
      success: true,
      pythonAvailable: available,
      message: available 
        ? "Python3 está disponível no sistema" 
        : "Python3 não foi encontrado no sistema"
    });

  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: "Erro ao verificar Python",
      error: error.message
    });
  }
}
