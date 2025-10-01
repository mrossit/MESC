import { db } from "../server/db";

async function checkDateFormat() {
  try {
    console.log("🔍 Checking date format in schedule_assignments...\n");

    const assignments = await db.query.scheduleAssignments.findMany({
      limit: 5,
      orderBy: (assignments, { desc }) => [desc(assignments.date)]
    });

    console.log("Sample assignments:");
    assignments.forEach(a => {
      console.log(`- ID: ${a.id}`);
      console.log(`  Date (raw): ${a.date}`);
      console.log(`  Date (type): ${typeof a.date}`);
      console.log(`  Date (new Date): ${new Date(a.date as string)}`);
      console.log(`  Date (ISO): ${new Date(a.date as string).toISOString()}`);
      console.log("");
    });

  } catch (error) {
    console.error("❌ Error:", error);
  }

  process.exit(0);
}

checkDateFormat();
