import { db } from "../server/db";
import { schedules } from "@shared/schema";
import { eq, and, gte, lte } from "drizzle-orm";

async function testDrizzleDates() {
  try {
    console.log("🔍 Testing Drizzle date handling...\n");

    // Test fetching October 2025 schedules
    const startDateStr = '2025-10-01';
    const endDateStr = '2025-10-31';

    console.log(`Querying schedules between ${startDateStr} and ${endDateStr}\n`);

    const results = await db
      .select()
      .from(schedules)
      .where(
        and(
          gte(schedules.date, startDateStr),
          lte(schedules.date, endDateStr)
        )
      )
      .limit(5);

    console.log(`Found ${results.length} schedules\n`);

    results.forEach((schedule, i) => {
      console.log(`Schedule ${i + 1}:`);
      console.log(`  ID: ${schedule.id}`);
      console.log(`  Date: ${schedule.date}`);
      console.log(`  Date type: ${typeof schedule.date}`);
      console.log(`  Date constructor: ${schedule.date?.constructor.name}`);
      if (schedule.date) {
        console.log(`  Date instanceof Date: ${schedule.date instanceof Date}`);
        if (schedule.date instanceof Date) {
          console.log(`  Date.toISOString(): ${schedule.date.toISOString()}`);
          console.log(`  Date.getDate(): ${schedule.date.getDate()}`);
        }
      }
      console.log("");
    });

  } catch (error) {
    console.error("❌ Error:", error);
  }

  process.exit(0);
}

testDrizzleDates();
