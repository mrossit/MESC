// Test script to verify schedules API endpoints
import { db } from "../server/storage";

async function testSchedulesAPI() {
  try {
    console.log("🧪 Testing Schedules API...\n");

    // Test 1: Get schedules for current month
    const currentDate = new Date();
    const month = currentDate.getMonth() + 1;
    const year = currentDate.getFullYear();

    console.log(`📅 Fetching schedules for ${month}/${year}...`);
    const schedulesQuery = await db.query.schedules.findMany({
      where: (schedules, { and, eq, gte, lte }) => {
        const startDate = new Date(year, month - 1, 1).toISOString().split('T')[0];
        const endDate = new Date(year, month, 0).toISOString().split('T')[0];
        return and(
          gte(schedules.date, startDate),
          lte(schedules.date, endDate)
        );
      },
      limit: 10
    });

    console.log(`✅ Found ${schedulesQuery.length} schedule entries`);

    if (schedulesQuery.length > 0) {
      console.log("\n📋 Sample schedule entry:");
      console.log(JSON.stringify(schedulesQuery[0], null, 2));
    }

    // Test 2: Check for published schedules
    const publishedQuery = await db.query.schedules.findMany({
      where: (schedules, { eq }) => eq(schedules.status, 'scheduled'),
      limit: 5
    });

    console.log(`\n✅ Found ${publishedQuery.length} published/scheduled entries`);

    // Test 3: Get month assignments
    console.log(`\n📊 Testing getMonthAssignments...`);
    const { getMonthAssignments } = await import('../server/storage');
    const assignments = await getMonthAssignments(month, year);

    console.log(`✅ getMonthAssignments returned ${assignments.length} assignments`);

    if (assignments.length > 0) {
      console.log("\n📋 Sample assignment:");
      console.log(JSON.stringify(assignments[0], null, 2));
    }

    console.log("\n✅ All API tests completed successfully!");

  } catch (error) {
    console.error("❌ Error testing API:", error);
    throw error;
  } finally {
    process.exit(0);
  }
}

testSchedulesAPI();
