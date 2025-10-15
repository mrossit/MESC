import { db } from "../server/db";
import { users, schedules, questionnaireResponses } from "../shared/schema";
import { eq, and, sql, gte, lte } from "drizzle-orm";

async function inspectScheduleIssues() {
  console.log("\n=== INSPEÇÃO DE PROBLEMAS NAS ESCALAS ===\n");

  // 1. Verificar ministros ativos
  const allMinisters = await db.select().from(users).where(eq(users.role, 'ministro'));
  const activeMinisters = allMinisters.filter(m => m.status === 'active');
  console.log(`📊 Ministros Total: ${allMinisters.length}`);
  console.log(`✅ Ministros Ativos: ${activeMinisters.length}`);
  console.log(`❌ Ministros Inativos: ${allMinisters.length - activeMinisters.length}\n`);

  // 2. Verificar escalas (schedules) de outubro 2025
  const octoberSchedules = await db
    .select()
    .from(schedules)
    .where(
      and(
        gte(schedules.date, '2025-10-01'),
        lte(schedules.date, '2025-10-31')
      )
    )
    .orderBy(schedules.date, schedules.time);

  console.log(`📅 Atribuições de Escalas em Outubro 2025: ${octoberSchedules.length}\n`);

  // Agrupar por data e horário para ver missas únicas
  const massesMap = new Map<string, any>();

  for (const schedule of octoberSchedules) {
    const key = `${schedule.date}_${schedule.time}`;
    if (!massesMap.has(key)) {
      massesMap.set(key, {
        date: schedule.date,
        time: schedule.time,
        ministers: []
      });
    }
    if (schedule.ministerId) {
      const minister = allMinisters.find(m => m.id === schedule.ministerId);
      if (minister) {
        massesMap.get(key)!.ministers.push({
          id: minister.id,
          name: minister.name,
          position: schedule.position
        });
      }
    }
  }

  const masses = Array.from(massesMap.values()).sort((a, b) => {
    const dateComp = a.date.localeCompare(b.date);
    if (dateComp !== 0) return dateComp;
    return a.time.localeCompare(b.time);
  });

  console.log(`📋 Missas únicas identificadas: ${masses.length}\n`);

  // Agrupar por tipo
  const massesByType: Record<string, any[]> = {
    weekday_morning: [],
    weekday_evening: [],
    saturday_evening: [],
    sunday_morning: [],
    sunday_evening: [],
  };

  for (const mass of masses) {
    const date = new Date(mass.date + 'T00:00:00');
    const dayOfWeek = date.getDay();
    const timeStr = mass.time;

    let type: string;
    if (dayOfWeek === 0) { // Domingo
      if (timeStr < "12:00") {
        type = "sunday_morning";
      } else {
        type = "sunday_evening";
      }
    } else if (dayOfWeek === 6) { // Sábado
      type = "saturday_evening";
    } else { // Dia de semana
      if (timeStr < "12:00") {
        type = "weekday_morning";
      } else {
        type = "weekday_evening";
      }
    }

    massesByType[type].push({
      ...mass,
      dateStr: date.toLocaleDateString('pt-BR'),
      dayName: ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'][dayOfWeek]
    });
  }

  console.log("📋 Missas por tipo:");
  console.log(`  Manhã de semana (06:30-07:00): ${massesByType.weekday_morning.length}`);
  console.log(`  Noite de semana (19:30): ${massesByType.weekday_evening.length}`);
  console.log(`  Sábado à noite (19:00): ${massesByType.saturday_evening.length}`);
  console.log(`  Domingo manhã (08:00/10:00): ${massesByType.sunday_morning.length}`);
  console.log(`  Domingo à noite (19:00): ${massesByType.sunday_evening.length}\n`);

  // 3. Verificar respostas dos questionários
  const allResponses = await db.select().from(questionnaireResponses);
  console.log(`📝 Total de Respostas de Questionários: ${allResponses.length}\n`);

  // Analisar disponibilidade por dia de semana
  const availabilityByDay = {
    weekday_morning: new Set<string>(),
    weekday_evening: new Set<string>(),
    saturday_evening: new Set<string>(),
    sunday_morning: new Set<string>(),
    sunday_evening: new Set<string>()
  };

  for (const response of allResponses) {
    const ministerId = response.userId; // userId é o ID do ministro
    const responses_data = response.responses;

    if (!responses_data || typeof responses_data !== 'object') continue;

    // Verificar estrutura das respostas
    const availability = (responses_data as any).availability;
    if (!availability) continue;

    // Dias de semana manhã
    if (availability.weekdayMorning || availability.monday_morning || availability.tuesday_morning ||
        availability.wednesday_morning || availability.thursday_morning || availability.friday_morning) {
      availabilityByDay.weekday_morning.add(ministerId);
    }

    // Dias de semana noite
    if (availability.weekdayEvening || availability.monday_evening || availability.tuesday_evening ||
        availability.wednesday_evening || availability.thursday_evening || availability.friday_evening) {
      availabilityByDay.weekday_evening.add(ministerId);
    }

    // Sábado à noite
    if (availability.saturdayEvening || availability.saturday_evening) {
      availabilityByDay.saturday_evening.add(ministerId);
    }

    // Domingo manhã
    if (availability.sundayMorning || availability.sunday_morning) {
      availabilityByDay.sunday_morning.add(ministerId);
    }

    // Domingo à noite
    if (availability.sundayEvening || availability.sunday_evening) {
      availabilityByDay.sunday_evening.add(ministerId);
    }
  }

  console.log("👥 Ministros disponíveis por horário:");
  console.log(`  Manhã de semana: ${availabilityByDay.weekday_morning.size} ministros`);
  console.log(`  Noite de semana: ${availabilityByDay.weekday_evening.size} ministros`);
  console.log(`  Sábado à noite: ${availabilityByDay.saturday_evening.size} ministros`);
  console.log(`  Domingo manhã: ${availabilityByDay.sunday_morning.size} ministros`);
  console.log(`  Domingo à noite: ${availabilityByDay.sunday_evening.size} ministros\n`);

  // 4. Analisar missas específicas problemáticas
  console.log("⚠️  MISSAS PROBLEMÁTICAS:\n");

  // Missas vazias ou com poucos ministros
  const emptyMasses = masses.filter(m => !m.ministers || m.ministers.length === 0);
  const lowMinisterMasses = masses.filter(m => m.ministers && m.ministers.length > 0 && m.ministers.length < 3);

  console.log(`🚫 Missas sem ministros: ${emptyMasses.length}`);
  for (const mass of emptyMasses.slice(0, 10)) { // Mostrar primeiras 10
    console.log(`  - ${mass.dateStr} ${mass.time}`);
  }
  if (emptyMasses.length > 10) {
    console.log(`  ... e mais ${emptyMasses.length - 10} missas vazias`);
  }
  console.log();

  console.log(`⚠️  Missas com menos de 3 ministros: ${lowMinisterMasses.length}`);
  for (const mass of lowMinisterMasses.slice(0, 10)) {
    console.log(`  - ${mass.dateStr} ${mass.time}: ${mass.ministers.length} ministros`);
  }
  if (lowMinisterMasses.length > 10) {
    console.log(`  ... e mais ${lowMinisterMasses.length - 10} missas com baixa cobertura`);
  }
  console.log();

  // Missas do dia 28 (dia de Nossa Senhora Aparecida)
  const oct28Masses = masses.filter(m => m.dateStr === "28/10/2025");

  console.log(`📅 Missas do dia 28/10/2025 (Nossa Senhora Aparecida): ${oct28Masses.length}`);
  for (const mass of oct28Masses) {
    const ministerCount = mass.ministers?.length || 0;
    console.log(`  - ${mass.time}: ${ministerCount} ministros ${ministerCount === 0 ? "⚠️  VAZIO" : ministerCount < 3 ? "⚠️  BAIXO" : "✅"}`);
    if (ministerCount > 0 && ministerCount <= 5) {
      // Mostrar quem está escalado
      for (const m of mass.ministers) {
        console.log(`    • ${m.name}`);
      }
    }
  }
  console.log();

  // 5. Verificar ministros específicos que aparecem muito
  console.log("👤 Ministros que aparecem com frequência:");
  const ministerCounts = new Map<string, { name: string, count: number }>();

  for (const mass of masses) {
    for (const minister of mass.ministers) {
      const current = ministerCounts.get(minister.id) || { name: minister.name, count: 0 };
      current.count++;
      ministerCounts.set(minister.id, current);
    }
  }

  const sortedMinisters = Array.from(ministerCounts.values())
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  for (const m of sortedMinisters) {
    console.log(`  ${m.name}: ${m.count}x`);
  }
  console.log();

  // 6. Estatísticas gerais
  const totalMinistersNeeded = masses.reduce((sum, m) => {
    const date = new Date(m.date + 'T00:00:00');
    const dayOfWeek = date.getDay();

    // Domingo precisa de mais ministros
    if (dayOfWeek === 0) return sum + 15;
    // Dias especiais podem precisar de mais
    if (date.getDate() === 28 && date.getMonth() === 9) return sum + 8;
    // Outros dias de semana
    return sum + 3;
  }, 0);

  console.log("📊 ESTATÍSTICAS GERAIS:");
  console.log(`  Total de missas únicas: ${masses.length}`);
  console.log(`  Total de atribuições no banco: ${octoberSchedules.length}`);
  console.log(`  Ministros atribuídos em médiapr missa: ${(octoberSchedules.length / masses.length).toFixed(2)}`);
  console.log(`  Total de ministros necessários (estimado): ${totalMinistersNeeded}`);
  console.log(`  Ministros ativos disponíveis: ${activeMinisters.length}`);
  console.log(`  Relação: ${(totalMinistersNeeded / activeMinisters.length).toFixed(2)} atribuições por ministro\n`);

  process.exit(0);
}

inspectScheduleIssues().catch((error) => {
  console.error("Erro durante inspeção:", error);
  process.exit(1);
});
