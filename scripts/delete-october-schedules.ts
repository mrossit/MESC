import { db } from "../server/db";
import { schedules } from "../shared/schema";
import { and, gte, lte } from "drizzle-orm";

async function deleteOctoberSchedules() {
  console.log("🗑️  Deletando escalas de outubro 2025...");

  const result = await db
    .delete(schedules)
    .where(
      and(
        gte(schedules.date, "2025-10-01"),
        lte(schedules.date, "2025-10-31")
      )
    );

  console.log(`✅ Deletadas ${result.rowCount || 0} escalas de outubro 2025`);
  process.exit(0);
}

deleteOctoberSchedules().catch((error) => {
  console.error("❌ Erro ao deletar escalas:", error);
  process.exit(1);
});
