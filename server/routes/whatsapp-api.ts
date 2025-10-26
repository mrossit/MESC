import { Router } from "express";
import { db } from "../db";
import { schedules, users, substitutionRequests } from "@shared/schema";
import { eq, and, gte, desc, asc } from "drizzle-orm";
import { sql } from "drizzle-orm";

const router = Router();

// Middleware de autenticação por API Key
const authenticateAPIKey = (req: any, res: any, next: any) => {
  const apiKey = req.headers['x-api-key'] || req.query.api_key;
  
  // API key deve estar nas variáveis de ambiente
  const validApiKey = process.env.WHATSAPP_API_KEY;
  
  if (!validApiKey) {
    return res.status(500).json({ 
      erro: "API key não configurada no servidor" 
    });
  }
  
  if (!apiKey || apiKey !== validApiKey) {
    return res.status(401).json({ 
      erro: "API key inválida ou ausente. Envie via header 'X-API-Key' ou query parameter 'api_key'" 
    });
  }
  
  next();
};

// Aplica autenticação em todas as rotas deste router
router.use(authenticateAPIKey);

// Função auxiliar para formatar número de telefone (remove espaços, traços, parênteses)
function normalizePhone(phone: string): string {
  return phone.replace(/[\s\-\(\)]/g, '');
}

// Função auxiliar para obter nome da posição litúrgica
function getPositionName(position: number): string {
  const positions: { [key: number]: string } = {
    1: 'Auxiliar 1',
    2: 'Auxiliar 2',
    3: 'Auxiliar 3',
    4: 'Auxiliar 4',
    5: 'Auxiliar 5',
    6: 'Auxiliar 6',
    7: 'Auxiliar 7',
    8: 'Auxiliar 8'
  };
  return positions[position] || `Posição ${position}`;
}

// Função auxiliar para formatar data em português
function formatDateBR(dateStr: string): string {
  const date = new Date(dateStr + 'T00:00:00');
  return date.toLocaleDateString('pt-BR', { 
    day: '2-digit', 
    month: '2-digit', 
    year: 'numeric' 
  });
}

// Função auxiliar para formatar horário
function formatTime(timeStr: string): string {
  return timeStr.substring(0, 5); // HH:MM
}

// Função auxiliar para obter dia da semana
function getDayOfWeek(dateStr: string): string {
  const date = new Date(dateStr + 'T00:00:00');
  const days = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
  return days[date.getDay()];
}

/**
 * POST /api/whatsapp/escala
 * Consulta escala específica de um ministro em uma data
 * 
 * Body: {
 *   telefone: string (número do celular)
 *   data: string (formato YYYY-MM-DD)
 * }
 */
router.post("/escala", async (req, res) => {
  try {
    const { telefone, data } = req.body;

    if (!telefone || !data) {
      return res.status(400).json({ 
        erro: "Campos obrigatórios: telefone e data (formato YYYY-MM-DD)" 
      });
    }

    const normalizedPhone = normalizePhone(telefone);

    // Busca ministro pelo telefone (tenta phone e whatsapp)
    const minister = await db
      .select()
      .from(users)
      .where(
        sql`REPLACE(REPLACE(REPLACE(REPLACE(${users.phone}, ' ', ''), '-', ''), '(', ''), ')', '') = ${normalizedPhone}
         OR REPLACE(REPLACE(REPLACE(REPLACE(${users.whatsapp}, ' ', ''), '-', ''), '(', ''), ')', '') = ${normalizedPhone}`
      )
      .limit(1);

    if (!minister || minister.length === 0) {
      return res.json({ 
        encontrado: false,
        mensagem: `Ministro não encontrado com o telefone ${telefone}. Verifique se o número está cadastrado.`
      });
    }

    // Busca escala na data especificada
    const schedule = await db
      .select()
      .from(schedules)
      .where(
        and(
          eq(schedules.ministerId, minister[0].id),
          eq(schedules.date, data)
        )
      )
      .limit(1);

    if (!schedule || schedule.length === 0) {
      return res.json({
        encontrado: false,
        mensagem: `Olá ${minister[0].name}! Você não está escalado para o dia ${formatDateBR(data)}.`
      });
    }

    const s = schedule[0];
    
    return res.json({
      encontrado: true,
      ministro: minister[0].name,
      data: formatDateBR(s.date),
      diaSemana: getDayOfWeek(s.date),
      horario: formatTime(s.time),
      funcao: getPositionName(s.position || 0),
      local: s.location || 'Santuário São Judas Tadeu',
      tipo: s.type === 'missa' ? 'Missa' : s.type,
      observacoes: s.notes || null
    });

  } catch (err: any) {
    console.error('[WHATSAPP_API] Erro em /escala:', err);
    return res.status(500).json({ erro: err.message });
  }
});

/**
 * POST /api/whatsapp/proximas
 * Retorna as próximas 3 missas do ministro
 * 
 * Body: {
 *   telefone: string (número do celular)
 * }
 */
router.post("/proximas", async (req, res) => {
  try {
    const { telefone } = req.body;

    if (!telefone) {
      return res.status(400).json({ 
        erro: "Campo obrigatório: telefone" 
      });
    }

    const normalizedPhone = normalizePhone(telefone);

    // Busca ministro pelo telefone
    const minister = await db
      .select()
      .from(users)
      .where(
        sql`REPLACE(REPLACE(REPLACE(REPLACE(${users.phone}, ' ', ''), '-', ''), '(', ''), ')', '') = ${normalizedPhone}
         OR REPLACE(REPLACE(REPLACE(REPLACE(${users.whatsapp}, ' ', ''), '-', ''), '(', ''), ')', '') = ${normalizedPhone}`
      )
      .limit(1);

    if (!minister || minister.length === 0) {
      return res.json({ 
        encontrado: false,
        mensagem: `Ministro não encontrado com o telefone ${telefone}.`
      });
    }

    // Busca próximas escalas (a partir de hoje)
    const today = new Date().toISOString().split('T')[0];
    
    const upcomingSchedules = await db
      .select()
      .from(schedules)
      .where(
        and(
          eq(schedules.ministerId, minister[0].id),
          gte(schedules.date, today)
        )
      )
      .orderBy(asc(schedules.date), asc(schedules.time))
      .limit(3);

    if (!upcomingSchedules || upcomingSchedules.length === 0) {
      return res.json({
        encontrado: true,
        ministro: minister[0].name,
        proximasMissas: [],
        mensagem: `Olá ${minister[0].name}! Você não tem escalas futuras no momento.`
      });
    }

    const missas = upcomingSchedules.map((s: any) => ({
      data: formatDateBR(s.date),
      diaSemana: getDayOfWeek(s.date),
      horario: formatTime(s.time),
      funcao: getPositionName(s.position || 0),
      local: s.location || 'Santuário São Judas Tadeu',
      tipo: s.type === 'missa' ? 'Missa' : s.type,
      observacoes: s.notes || null
    }));

    return res.json({
      encontrado: true,
      ministro: minister[0].name,
      totalProximas: missas.length,
      proximasMissas: missas
    });

  } catch (err: any) {
    console.error('[WHATSAPP_API] Erro em /proximas:', err);
    return res.status(500).json({ erro: err.message });
  }
});

/**
 * POST /api/whatsapp/colegas
 * Retorna os ministros escalados na mesma missa
 * 
 * Body: {
 *   data: string (formato YYYY-MM-DD)
 *   horario: string (formato HH:MM:SS ou HH:MM)
 * }
 */
router.post("/colegas", async (req, res) => {
  try {
    const { data, horario } = req.body;

    if (!data || !horario) {
      return res.status(400).json({ 
        erro: "Campos obrigatórios: data (YYYY-MM-DD) e horario (HH:MM ou HH:MM:SS)" 
      });
    }

    // Normaliza horário para formato HH:MM:SS se necessário
    const normalizedTime = horario.length === 5 ? `${horario}:00` : horario;

    // Busca todos os ministros escalados nesta missa
    const ministersInMass = await db
      .select({
        scheduleId: schedules.id,
        ministerId: schedules.ministerId,
        position: schedules.position,
        notes: schedules.notes,
        ministerName: users.name,
        ministerPhone: users.phone,
        ministerWhatsapp: users.whatsapp
      })
      .from(schedules)
      .innerJoin(users, eq(schedules.ministerId, users.id))
      .where(
        and(
          eq(schedules.date, data),
          eq(schedules.time, normalizedTime)
        )
      )
      .orderBy(asc(schedules.position));

    if (!ministersInMass || ministersInMass.length === 0) {
      return res.json({
        encontrado: false,
        mensagem: `Nenhum ministro escalado para ${formatDateBR(data)} às ${formatTime(normalizedTime)}.`
      });
    }

    const colegas = ministersInMass.map((m: any) => ({
      nome: m.ministerName,
      funcao: getPositionName(m.position || 0),
      telefone: m.ministerPhone || m.ministerWhatsapp || null,
      observacoes: m.notes || null
    }));

    return res.json({
      encontrado: true,
      data: formatDateBR(data),
      diaSemana: getDayOfWeek(data),
      horario: formatTime(normalizedTime),
      totalMinistros: colegas.length,
      ministros: colegas
    });

  } catch (err: any) {
    console.error('[WHATSAPP_API] Erro em /colegas:', err);
    return res.status(500).json({ erro: err.message });
  }
});

/**
 * GET /api/whatsapp/substituicoes-abertas
 * Retorna substituições em aberto (disponíveis para aceite)
 * 
 * Query params opcionais:
 *   - limite: número de resultados (padrão 5, máximo 20)
 */
router.get("/substituicoes-abertas", async (req, res) => {
  try {
    const limite = Math.min(parseInt(req.query.limite as string) || 5, 20);

    // Busca substituições disponíveis com informações da escala e ministro solicitante
    const openSubstitutions = await db
      .select({
        substitutionId: substitutionRequests.id,
        scheduleId: substitutionRequests.scheduleId,
        date: schedules.date,
        time: schedules.time,
        position: schedules.position,
        location: schedules.location,
        requesterName: users.name,
        requesterPhone: users.phone,
        reason: substitutionRequests.reason,
        urgency: substitutionRequests.urgency,
        createdAt: substitutionRequests.createdAt
      })
      .from(substitutionRequests)
      .innerJoin(schedules, eq(substitutionRequests.scheduleId, schedules.id))
      .innerJoin(users, eq(substitutionRequests.requesterId, users.id))
      .where(eq(substitutionRequests.status, 'available'))
      .orderBy(asc(schedules.date), asc(schedules.time))
      .limit(limite);

    if (!openSubstitutions || openSubstitutions.length === 0) {
      return res.json({
        encontrado: false,
        totalVagas: 0,
        vagas: [],
        mensagem: "Não há substituições disponíveis no momento."
      });
    }

    const vagas = openSubstitutions.map((s: any) => ({
      id: s.substitutionId,
      data: formatDateBR(s.date),
      diaSemana: getDayOfWeek(s.date),
      horario: formatTime(s.time),
      funcao: getPositionName(s.position || 0),
      local: s.location || 'Santuário São Judas Tadeu',
      ministroOriginal: s.requesterName,
      telefoneOriginal: s.requesterPhone,
      motivo: s.reason || 'Não informado',
      urgencia: s.urgency === 'high' ? 'Alta' : s.urgency === 'critical' ? 'Crítica' : s.urgency === 'low' ? 'Baixa' : 'Média',
      dataPublicacao: s.createdAt ? new Date(s.createdAt).toLocaleDateString('pt-BR') : null
    }));

    return res.json({
      encontrado: true,
      totalVagas: vagas.length,
      vagas
    });

  } catch (err: any) {
    console.error('[WHATSAPP_API] Erro em /substituicoes-abertas:', err);
    return res.status(500).json({ erro: err.message });
  }
});

/**
 * POST /api/whatsapp/aceitar-substituicao
 * Permite que um ministro aceite uma substituição via WhatsApp
 * 
 * Body: {
 *   telefone: string (número do celular do substituto)
 *   id_substituicao: string (ID da substituição)
 *   mensagem?: string (mensagem opcional do substituto)
 * }
 */
router.post("/aceitar-substituicao", async (req, res) => {
  try {
    const { telefone, id_substituicao, mensagem } = req.body;

    if (!telefone || !id_substituicao) {
      return res.status(400).json({ 
        erro: "Campos obrigatórios: telefone e id_substituicao" 
      });
    }

    const normalizedPhone = normalizePhone(telefone);

    // Busca ministro substituto pelo telefone
    const substitute = await db
      .select()
      .from(users)
      .where(
        sql`REPLACE(REPLACE(REPLACE(REPLACE(${users.phone}, ' ', ''), '-', ''), '(', ''), ')', '') = ${normalizedPhone}
         OR REPLACE(REPLACE(REPLACE(REPLACE(${users.whatsapp}, ' ', ''), '-', ''), '(', ''), ')', '') = ${normalizedPhone}`
      )
      .limit(1);

    if (!substitute || substitute.length === 0) {
      return res.json({ 
        sucesso: false,
        mensagem: `Ministro não encontrado com o telefone ${telefone}. Verifique se está cadastrado.`
      });
    }

    // Busca a substituição
    const substitution = await db
      .select({
        substitutionId: substitutionRequests.id,
        scheduleId: substitutionRequests.scheduleId,
        requesterId: substitutionRequests.requesterId,
        status: substitutionRequests.status,
        date: schedules.date,
        time: schedules.time,
        position: schedules.position,
        requesterName: users.name
      })
      .from(substitutionRequests)
      .innerJoin(schedules, eq(substitutionRequests.scheduleId, schedules.id))
      .innerJoin(users, eq(substitutionRequests.requesterId, users.id))
      .where(eq(substitutionRequests.id, id_substituicao))
      .limit(1);

    if (!substitution || substitution.length === 0) {
      return res.json({
        sucesso: false,
        mensagem: "Substituição não encontrada. Verifique o ID."
      });
    }

    const sub = substitution[0];

    // Verifica se já foi preenchida
    if (sub.status !== 'available') {
      return res.json({
        sucesso: false,
        mensagem: `Esta substituição já foi ${sub.status === 'approved' ? 'aprovada' : sub.status === 'pending' ? 'aceita e aguarda aprovação' : 'cancelada'}.`
      });
    }

    // Verifica se o ministro está tentando substituir a si mesmo
    if (sub.requesterId === substitute[0].id) {
      return res.json({
        sucesso: false,
        mensagem: "Você não pode aceitar sua própria substituição."
      });
    }

    // Atualiza a substituição para status 'pending' (aguardando aprovação do coordenador)
    await db
      .update(substitutionRequests)
      .set({
        substituteId: substitute[0].id,
        status: 'pending',
        responseMessage: mensagem || `Aceito via WhatsApp por ${substitute[0].name}`
      })
      .where(eq(substitutionRequests.id, id_substituicao));

    return res.json({
      sucesso: true,
      substituto: substitute[0].name,
      data: formatDateBR(sub.date),
      diaSemana: getDayOfWeek(sub.date),
      horario: formatTime(sub.time),
      funcao: getPositionName(sub.position || 0),
      ministroOriginal: sub.requesterName,
      mensagem: `Substituição aceita com sucesso! Aguarde a aprovação do coordenador.`,
      proximoPasso: "O coordenador será notificado e aprovará sua substituição em breve."
    });

  } catch (err: any) {
    console.error('[WHATSAPP_API] Erro em /aceitar-substituicao:', err);
    return res.status(500).json({ erro: err.message });
  }
});

/**
 * POST /api/whatsapp/minhas-substituicoes
 * Retorna substituições solicitadas ou aceitas pelo ministro
 * 
 * Body: {
 *   telefone: string (número do celular)
 *   tipo?: string ('solicitadas' | 'aceitas' | 'todas') - padrão: 'todas'
 * }
 */
router.post("/minhas-substituicoes", async (req, res) => {
  try {
    const { telefone, tipo = 'todas' } = req.body;

    if (!telefone) {
      return res.status(400).json({ 
        erro: "Campo obrigatório: telefone" 
      });
    }

    const normalizedPhone = normalizePhone(telefone);

    // Busca ministro pelo telefone
    const minister = await db
      .select()
      .from(users)
      .where(
        sql`REPLACE(REPLACE(REPLACE(REPLACE(${users.phone}, ' ', ''), '-', ''), '(', ''), ')', '') = ${normalizedPhone}
         OR REPLACE(REPLACE(REPLACE(REPLACE(${users.whatsapp}, ' ', ''), '-', ''), '(', ''), ')', '') = ${normalizedPhone}`
      )
      .limit(1);

    if (!minister || minister.length === 0) {
      return res.json({ 
        encontrado: false,
        mensagem: `Ministro não encontrado com o telefone ${telefone}.`
      });
    }

    // Monta condições de busca baseado no tipo
    let whereCondition;
    if (tipo === 'solicitadas') {
      whereCondition = eq(substitutionRequests.requesterId, minister[0].id);
    } else if (tipo === 'aceitas') {
      whereCondition = eq(substitutionRequests.substituteId, minister[0].id);
    } else {
      whereCondition = sql`${substitutionRequests.requesterId} = ${minister[0].id} OR ${substitutionRequests.substituteId} = ${minister[0].id}`;
    }

    const mySubstitutions = await db
      .select({
        substitutionId: substitutionRequests.id,
        date: schedules.date,
        time: schedules.time,
        position: schedules.position,
        location: schedules.location,
        requesterName: users.name,
        status: substitutionRequests.status,
        reason: substitutionRequests.reason,
        urgency: substitutionRequests.urgency,
        responseMessage: substitutionRequests.responseMessage
      })
      .from(substitutionRequests)
      .innerJoin(schedules, eq(substitutionRequests.scheduleId, schedules.id))
      .innerJoin(users, eq(substitutionRequests.requesterId, users.id))
      .where(whereCondition)
      .orderBy(desc(schedules.date), desc(schedules.time))
      .limit(10);

    if (!mySubstitutions || mySubstitutions.length === 0) {
      return res.json({
        encontrado: false,
        ministro: minister[0].name,
        substituicoes: [],
        mensagem: `Você não tem substituições ${tipo === 'solicitadas' ? 'solicitadas' : tipo === 'aceitas' ? 'aceitas' : 'registradas'}.`
      });
    }

    const substituicoes = mySubstitutions.map((s: any) => ({
      id: s.substitutionId,
      data: formatDateBR(s.date),
      diaSemana: getDayOfWeek(s.date),
      horario: formatTime(s.time),
      funcao: getPositionName(s.position || 0),
      local: s.location || 'Santuário São Judas Tadeu',
      ministroOriginal: s.requesterName,
      status: s.status === 'available' ? 'Disponível' : 
              s.status === 'pending' ? 'Aguardando Aprovação' : 
              s.status === 'approved' ? 'Aprovada' : 
              s.status === 'rejected' ? 'Rejeitada' : 
              s.status === 'cancelled' ? 'Cancelada' : 
              'Auto-aprovada',
      motivo: s.reason || 'Não informado',
      urgencia: s.urgency === 'high' ? 'Alta' : s.urgency === 'critical' ? 'Crítica' : s.urgency === 'low' ? 'Baixa' : 'Média',
      mensagem: s.responseMessage || null
    }));

    return res.json({
      encontrado: true,
      ministro: minister[0].name,
      totalSubstituicoes: substituicoes.length,
      substituicoes
    });

  } catch (err: any) {
    console.error('[WHATSAPP_API] Erro em /minhas-substituicoes:', err);
    return res.status(500).json({ erro: err.message });
  }
});

/**
 * GET /api/whatsapp/health
 * Endpoint de health check (não requer autenticação)
 */
router.get("/health", (req, res) => {
  res.json({ 
    status: "ok", 
    service: "MESC WhatsApp API",
    timestamp: new Date().toISOString()
  });
});

export default router;
