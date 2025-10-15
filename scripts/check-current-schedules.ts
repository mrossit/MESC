import { db } from "../server/db";
import { schedules, users } from "../shared/schema";
import { and, gte, lte, eq } from "drizzle-orm";

async function checkCurrentSchedules() {
  console.log("=".repeat(80));
  console.log("ESTADO ATUAL DAS ESCALAS - OUTUBRO 2025");
  console.log("=".repeat(80));
  console.log();

  const octoberSchedules = await db
    .select()
    .from(schedules)
    .where(
      and(
        gte(schedules.date, "2025-10-01"),
        lte(schedules.date, "2025-10-31")
      )
    )
    .orderBy(schedules.date, schedules.time);

  // Group by mass
  const massByDateTime = new Map<string, any>();

  for (const schedule of octoberSchedules) {
    const key = `${schedule.date} ${schedule.time}`;
    if (!massByDateTime.has(key)) {
      massByDateTime.set(key, {
        date: schedule.date,
        time: schedule.time,
        ministers: [],
      });
    }

    if (schedule.ministerId) {
      const minister = await db
        .select({ name: users.name })
        .from(users)
        .where(eq(users.id, schedule.ministerId))
        .limit(1);

      massByDateTime.get(key)!.ministers.push({
        name: minister[0]?.name || "Desconhecido",
        position: schedule.position,
      });
    }
  }

  console.log(`Total de missas criadas: ${massByDateTime.size}\n`);

  // Analyze by day of week
  const sundayMasses: any[] = [];
  const weekdayMasses: any[] = [];
  const specialDayMasses: any[] = [];

  for (const [key, mass] of massByDateTime.entries()) {
    const date = new Date(mass.date + "T00:00:00");
    const dayOfWeek = date.getDay();

    if (mass.date === "2025-10-28") {
      specialDayMasses.push({ key, mass });
    } else if (dayOfWeek === 0) {
      sundayMasses.push({ key, mass });
    } else {
      weekdayMasses.push({ key, mass });
    }
  }

  console.log("=".repeat(80));
  console.log("DOMINGOS");
  console.log("=".repeat(80));
  console.log(`Total: ${sundayMasses.length} missas\n`);

  for (const { key, mass } of sundayMasses) {
    const ministerCount = mass.ministers.length;
    const emoji = ministerCount === 0 ? "❌" : ministerCount < 5 ? "⚠️ " : "✅";
    console.log(`${emoji} ${key}: ${ministerCount} ministros`);
  }

  console.log("\n" + "=".repeat(80));
  console.log("DIAS DE SEMANA");
  console.log("=".repeat(80));
  console.log(`Total: ${weekdayMasses.length} missas\n`);

  for (const { key, mass } of weekdayMasses) {
    const ministerCount = mass.ministers.length;
    const emoji = ministerCount === 0 ? "❌" : ministerCount < 5 ? "⚠️ " : "✅";
    console.log(`${emoji} ${key}: ${ministerCount} ministros`);
    if (ministerCount > 0) {
      mass.ministers.forEach((m: any) => console.log(`    - ${m.name} (${m.position})`));
    }
  }

  console.log("\n" + "=".repeat(80));
  console.log("DIA 28/10 (SÃO JUDAS)");
  console.log("=".repeat(80));
  console.log(`Total: ${specialDayMasses.length} missas\n`);

  for (const { key, mass } of specialDayMasses) {
    const ministerCount = mass.ministers.length;
    const emoji = ministerCount === 0 ? "❌" : ministerCount < 5 ? "⚠️ " : "✅";
    console.log(`${emoji} ${key}: ${ministerCount} ministros`);
    if (ministerCount > 0 && ministerCount <= 10) {
      mass.ministers.forEach((m: any) => console.log(`    - ${m.name} (${m.position})`));
    }
  }

  console.log("\n" + "=".repeat(80));
  console.log("RESUMO");
  console.log("=".repeat(80));

  const emptyCount = Array.from(massByDateTime.values()).filter(
    (m) => m.ministers.length === 0
  ).length;
  const lowCount = Array.from(massByDateTime.values()).filter(
    (m) => m.ministers.length > 0 && m.ministers.length < 5
  ).length;
  const goodCount = Array.from(massByDateTime.values()).filter(
    (m) => m.ministers.length >= 5
  ).length;

  console.log(`Total de missas: ${massByDateTime.size}`);
  console.log(`  ✅ Boas (5+ ministros): ${goodCount}`);
  console.log(`  ⚠️  Baixas (1-4 ministros): ${lowCount}`);
  console.log(`  ❌ Vazias (0 ministros): ${emptyCount}`);
  console.log("=".repeat(80));

  process.exit(0);
}

checkCurrentSchedules().catch((error) => {
  console.error("Erro:", error);
  process.exit(1);
});
