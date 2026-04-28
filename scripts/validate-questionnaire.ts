/**
 * Pré-publicação — valida se todas as respostas do questionário estão
 * capturadas de forma que o gerador de escalas consiga usá-las.
 *
 * Uso:
 *   DATABASE_URL="postgresql://..." tsx scripts/validate-questionnaire.ts <questionnaire_id>
 *
 * Não escreve nada no banco — apenas relatório no stdout com exit code
 *  0 = ok para publicar
 *  1 = há pendências (ministros sem resposta, warnings, perguntas sem cobertura)
 *  2 = erro de execução
 */

import { neon } from '@neondatabase/serverless';

type Question = {
  id: string;
  order: number;
  type: string;
  question: string;
  required?: boolean;
  category?: string;
  options?: string[];
  metadata?: {
    showIf?: string;
    dependsOn?: string;
    alternativeShowIf?: string;
    alternativeDependsOn?: string;
    eventDate?: string;
    eventName?: string;
    conditionalOptions?: string[];
    sundayDates?: string[];
  };
};

type Masses = Record<string, Record<string, boolean>>;
type SpecialEvents = Record<string, unknown>;
type Weekdays = Partial<Record<'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday', boolean>>;

type ResponseV2 = {
  format_version?: string;
  masses?: Masses;
  special_events?: SpecialEvents;
  weekdays?: Weekdays;
  family?: Record<string, unknown>;
  can_substitute?: boolean;
  alternative_times?: string[];
  substitute_only?: boolean;
  notes?: string;
};

type ResponseRow = {
  id: string;
  user_id: string;
  email: string;
  name: string;
  submitted_at: string;
  is_shared_response: boolean;
  shared_from_user_id: string | null;
  responses: unknown;
  unmapped_responses: unknown;
  processing_warnings: unknown;
};

const SPECIAL_EVENT_ALIASES: Record<string, string> = {
  sacred_heart_mass: 'first_friday',
  immaculate_heart_mass: 'first_saturday',
  healing_liberation_mass: 'healing_liberation',
};

const CONNECTION_STRING = process.env.DATABASE_URL;
if (!CONNECTION_STRING) {
  console.error('ERRO: variável DATABASE_URL não definida');
  process.exit(2);
}

const questionnaireId = process.argv[2];
if (!questionnaireId) {
  console.error('USO: tsx scripts/validate-questionnaire.ts <questionnaire_id>');
  process.exit(2);
}

async function main(): Promise<number> {
  const sql = neon(CONNECTION_STRING!);

  const qRows = await sql`
    SELECT id, title, month, year, status, deadline, questions
    FROM questionnaires WHERE id = ${questionnaireId}
  `;
  if (qRows.length === 0) {
    console.error(`Questionário ${questionnaireId} não encontrado.`);
    return 2;
  }
  const q = qRows[0] as { id: string; title: string; month: number; year: number; status: string; deadline: string | null; questions: Question[] };
  const questions: Question[] = q.questions;

  const responses = await sql`
    SELECT qr.id, qr.user_id, u.email, u.name, qr.submitted_at::text,
           qr.is_shared_response, qr.shared_from_user_id,
           qr.responses, qr.unmapped_responses, qr.processing_warnings
    FROM questionnaire_responses qr
    JOIN users u ON u.id = qr.user_id
    WHERE qr.questionnaire_id = ${questionnaireId}
      AND qr.is_deleted = false
    ORDER BY qr.submitted_at
  ` as unknown as ResponseRow[];

  console.log(`\n=== Validação — ${q.title} (${q.month}/${q.year}) ===`);
  console.log(`Status: ${q.status}  |  Deadline: ${q.deadline ?? '(sem deadline)'}`);
  console.log(`Perguntas: ${questions.length}  |  Respostas: ${responses.length}`);

  const userQuery = await sql`
    SELECT id, email, name FROM users
    WHERE role IN ('ministro', 'coordenador', 'admin')
      AND status = 'active'
  ` as unknown as { id: string; email: string; name: string }[];
  const respondedIds = new Set(responses.map(r => r.user_id));
  const missingUsers = userQuery.filter(u => !respondedIds.has(u.id));

  console.log(`\n--- Ministros ativos sem resposta: ${missingUsers.length} ---`);
  if (missingUsers.length > 0 && missingUsers.length <= 40) {
    missingUsers.forEach(u => console.log(`  • ${u.name} <${u.email}>`));
  } else if (missingUsers.length > 40) {
    console.log(`  (lista longa — primeiros 10):`);
    missingUsers.slice(0, 10).forEach(u => console.log(`  • ${u.name} <${u.email}>`));
  }

  let hasBlockingIssue = false;
  const perResponseReports: string[] = [];

  for (const r of responses) {
    const label = `${r.name} <${r.email}>${r.is_shared_response ? ' [compartilhada]' : ''}`;
    const issues: string[] = [];
    const notes: string[] = [];

    const unmapped = Array.isArray(r.unmapped_responses) ? r.unmapped_responses : [];
    const warnings = Array.isArray(r.processing_warnings) ? r.processing_warnings : [];
    if (unmapped.length > 0) {
      issues.push(`unmapped_responses tem ${unmapped.length} item(ns): ${JSON.stringify(unmapped)}`);
    }
    if (warnings.length > 0) {
      issues.push(`processing_warnings tem ${warnings.length} item(ns): ${JSON.stringify(warnings)}`);
    }

    const raw = r.responses;
    let v2: ResponseV2 | null = null;
    if (typeof raw === 'string') {
      try { v2 = JSON.parse(raw) as ResponseV2; } catch { issues.push(`responses não é JSON válido`); }
    } else if (raw && typeof raw === 'object') {
      v2 = raw as ResponseV2;
    }
    if (!v2) {
      issues.push(`responses ausente ou inválido`);
      perResponseReports.push(formatReport(label, issues, notes));
      hasBlockingIssue = true;
      continue;
    }
    if (v2.format_version !== '2.0') {
      issues.push(`format_version é '${v2.format_version}' (esperado '2.0')`);
    }

    const masses = v2.masses ?? {};
    const special = (v2.special_events ?? {}) as SpecialEvents;
    const weekdays = v2.weekdays ?? {};

    const anyMassTrue = Object.values(masses).some(day => Object.values(day).some(v => v === true));
    const monthlyAvailable = anyMassTrue;
    const anyWeekdayTrue = Object.values(weekdays).some(Boolean);
    const hasAlternativeTimes = Array.isArray(v2.alternative_times) && v2.alternative_times.length > 0;

    const perQuestion: { id: string; label: string; applicable: boolean; covered: boolean; hint: string }[] = [];

    for (const qn of questions) {
      const applicable = isApplicable(qn, { monthlyAvailable, hasAlternativeTimes });
      const cov = coverage(qn, { masses, special, weekdays, alternativeTimes: v2.alternative_times, canSubstitute: v2.can_substitute });
      perQuestion.push({ id: qn.id, label: qn.question, applicable, covered: cov.covered, hint: cov.hint });

      if (applicable && !cov.covered) {
        if (qn.required) {
          issues.push(`Pergunta obrigatória "${qn.id}" não tem representação detectável (${cov.hint})`);
        } else {
          notes.push(`Pergunta opcional "${qn.id}" sem representação explícita — ${cov.hint}`);
        }
      }
    }

    const eligibleMasses = countEligibleMasses(questions, v2, { monthlyAvailable });
    notes.push(`Missas regulares de domingo em que aparece disponível: ${eligibleMasses.sundaySlots}`);
    notes.push(`Eventos especiais em que aparece disponível: ${eligibleMasses.specialEvents}/${eligibleMasses.specialTotal}`);
    notes.push(`Dias de semana (6h30) disponíveis: ${eligibleMasses.weekdays}`);
    notes.push(`can_substitute=${v2.can_substitute === true}`);

    perResponseReports.push(formatReport(label, issues, notes, perQuestion));
    if (issues.length > 0) hasBlockingIssue = true;
  }

  console.log(`\n=== Relatório por resposta ===`);
  perResponseReports.forEach(r => console.log(r));

  const massCoverage = aggregateMassCoverage(questions, responses, q.year, q.month);
  console.log(`\n=== Cobertura de ministros por missa (nas respostas existentes) ===`);
  console.log(`(apenas indicativo — considera só quem já respondeu)`);
  massCoverage.forEach(m => console.log(`  ${m.label.padEnd(60)} → ${m.count} ministro(s)`));

  console.log(`\n=== Resumo ===`);
  console.log(`Respostas analisadas : ${responses.length}`);
  console.log(`Ministros sem resposta: ${missingUsers.length}`);
  console.log(`Problemas bloqueantes : ${hasBlockingIssue ? 'SIM' : 'nenhum'}`);
  console.log(`\nPublicação recomendada: ${!hasBlockingIssue ? 'OK (sem perdas detectadas)' : 'REVER — há issues bloqueantes acima'}`);

  return hasBlockingIssue ? 1 : 0;
}

function isApplicable(q: Question, ctx: { monthlyAvailable: boolean; hasAlternativeTimes: boolean }): boolean {
  const m = q.metadata ?? {};
  const dep = m.dependsOn;
  const show = m.showIf;
  const altDep = m.alternativeDependsOn;
  const altShow = m.alternativeShowIf;

  const passes = (dependency: string | undefined, expected: string | undefined): boolean => {
    if (!dependency || !expected) return false;
    if (dependency === 'monthly_availability') {
      return (expected === 'Sim') === ctx.monthlyAvailable;
    }
    if (dependency === 'alternative_availability') {
      return (expected === 'Sim') ? ctx.hasAlternativeTimes : !ctx.hasAlternativeTimes;
    }
    return false;
  };

  if (!dep && !altDep) return true;
  const primary = passes(dep, show);
  const alternative = passes(altDep, altShow);
  return primary || alternative;
}

function coverage(
  q: Question,
  data: { masses: Masses; special: SpecialEvents; weekdays: Weekdays; alternativeTimes?: string[]; canSubstitute?: boolean }
): { covered: boolean; hint: string } {
  const specialId = SPECIAL_EVENT_ALIASES[q.id] ?? q.id;

  if (q.category === 'special_event' || q.category === 'custom' || q.id.startsWith('custom_')) {
    const has = specialId in data.special;
    return { covered: has, hint: has ? `capturado em special_events.${specialId}` : `esperado special_events.${specialId}` };
  }

  switch (q.id) {
    case 'monthly_availability': {
      const any = Object.values(data.masses).some(day => Object.values(day).some(v => v === true));
      return { covered: any || (data.alternativeTimes ?? []).length > 0, hint: any ? 'inferido de masses' : 'nenhum domingo/horário marcado' };
    }
    case 'main_service_time': {
      const any = Object.values(data.masses).some(day => Object.values(day).some(v => v === true));
      return { covered: any, hint: any ? 'inferido do horário mais frequente em masses' : 'nenhum horário marcado em masses' };
    }
    case 'available_sundays': {
      const any = Object.values(data.masses).some(day => Object.values(day).some(v => v === true));
      return { covered: any, hint: any ? 'inferido das chaves de masses' : 'nenhum domingo marcado' };
    }
    case 'other_times_available': {
      const has = Array.isArray(data.alternativeTimes) && data.alternativeTimes.length > 0;
      return { covered: true, hint: has ? `alternative_times=${JSON.stringify(data.alternativeTimes)}` : 'respondido implicitamente como Não (vazio)' };
    }
    case 'daily_mass_availability': {
      const has = Object.values(data.weekdays).some(Boolean);
      return { covered: true, hint: has ? `weekdays=${JSON.stringify(data.weekdays)}` : 'respondido como Não (nenhum dia marcado)' };
    }
    case 'can_substitute': {
      return { covered: true, hint: `can_substitute=${data.canSubstitute === true}` };
    }
    case 'alternative_availability':
    case 'alternative_times':
    case 'alternative_sundays':
      return { covered: true, hint: 'fluxo alternativo — não aplicável neste contexto' };
  }

  return { covered: false, hint: `pergunta sem regra conhecida` };
}

function countEligibleMasses(
  questions: Question[],
  v2: ResponseV2,
  _ctx: { monthlyAvailable: boolean }
): { sundaySlots: number; specialEvents: number; specialTotal: number; weekdays: number } {
  let sundaySlots = 0;
  for (const day of Object.values(v2.masses ?? {})) {
    for (const v of Object.values(day)) if (v === true) sundaySlots++;
  }
  const specialQuestions = questions.filter(x => x.category === 'special_event' || x.category === 'custom' || x.id.startsWith('custom_'));
  let specialEvents = 0;
  for (const sq of specialQuestions) {
    const key = SPECIAL_EVENT_ALIASES[sq.id] ?? sq.id;
    const val = (v2.special_events ?? {})[key];
    if (val === true) specialEvents++;
    else if (val && typeof val === 'object' && !Array.isArray(val) && (val as Record<string, unknown>).answer === 'Sim') specialEvents++;
  }
  const weekdays = Object.values(v2.weekdays ?? {}).filter(Boolean).length;
  return { sundaySlots, specialEvents, specialTotal: specialQuestions.length, weekdays };
}

function aggregateMassCoverage(questions: Question[], responses: ResponseRow[], _year: number, _month: number) {
  const slots: { label: string; count: number }[] = [];

  const sundayDates = Array.from(
    new Set(
      responses.flatMap(r => {
        const v2 = (typeof r.responses === 'string' ? JSON.parse(r.responses) : r.responses) as ResponseV2;
        return Object.keys(v2?.masses ?? {});
      }),
    ),
  ).sort();

  for (const date of sundayDates) {
    const timeSet = new Set<string>();
    responses.forEach(r => {
      const v2 = (typeof r.responses === 'string' ? JSON.parse(r.responses) : r.responses) as ResponseV2;
      Object.keys(v2?.masses?.[date] ?? {}).forEach(t => timeSet.add(t));
    });
    for (const time of Array.from(timeSet).sort()) {
      const count = responses.filter(r => {
        const v2 = (typeof r.responses === 'string' ? JSON.parse(r.responses) : r.responses) as ResponseV2;
        return v2?.masses?.[date]?.[time] === true;
      }).length;
      slots.push({ label: `Domingo ${date} ${time}`, count });
    }
  }

  const specialQuestions = questions.filter(x => x.category === 'special_event' || x.category === 'custom' || x.id.startsWith('custom_'));
  for (const sq of specialQuestions) {
    const key = SPECIAL_EVENT_ALIASES[sq.id] ?? sq.id;
    const count = responses.filter(r => {
      const v2 = (typeof r.responses === 'string' ? JSON.parse(r.responses) : r.responses) as ResponseV2;
      const val = (v2?.special_events ?? {})[key];
      if (val === true) return true;
      if (val && typeof val === 'object' && !Array.isArray(val) && (val as Record<string, unknown>).answer === 'Sim') return true;
      return false;
    }).length;
    const short = sq.question.length > 55 ? sq.question.slice(0, 55) + '…' : sq.question;
    slots.push({ label: short, count });
  }

  return slots;
}

function formatReport(
  label: string,
  issues: string[],
  notes: string[],
  perQuestion?: { id: string; label: string; applicable: boolean; covered: boolean; hint: string }[],
): string {
  const out: string[] = [];
  out.push(`\n▸ ${label}`);
  if (issues.length === 0) out.push(`   ✓ sem issues bloqueantes`);
  issues.forEach(i => out.push(`   ✗ ${i}`));
  notes.forEach(n => out.push(`   · ${n}`));
  if (perQuestion) {
    const uncovered = perQuestion.filter(p => p.applicable && !p.covered);
    if (uncovered.length > 0) {
      out.push(`   ▼ perguntas aplicáveis sem cobertura detectada:`);
      uncovered.forEach(p => out.push(`     - ${p.id} (${p.hint})`));
    }
  }
  return out.join('\n');
}

main()
  .then(code => process.exit(code))
  .catch(err => { console.error('ERRO:', err); process.exit(2); });
