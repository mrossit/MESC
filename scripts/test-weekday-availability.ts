import { db } from "../server/db";
import { questionnaireResponses, users } from "../shared/schema";
import { eq } from "drizzle-orm";
import { isAvailableForMass } from "../server/utils/ministerAvailabilityChecker";

async function testWeekdayAvailability() {
  console.log('🧪 Testing weekday availability checking\n');

  // Get the latest questionnaire responses
  const responses = await db
    .select()
    .from(questionnaireResponses)
    .limit(200);

  console.log(`📊 Found ${responses.length} responses\n`);

  // Get all users
  const allUsers = await db.select().from(users);
  const userMap = new Map(allUsers.map(u => [u.id, u.name]));

  // Test cases for weekday masses (October 2025)
  const testCases = [
    { date: '2025-10-20', time: '06:30', type: 'missa_diaria', day: 'Monday' },
    { date: '2025-10-21', time: '06:30', type: 'missa_diaria', day: 'Tuesday' },
    { date: '2025-10-22', time: '06:30', type: 'missa_diaria', day: 'Wednesday' },
    { date: '2025-10-23', time: '06:30', type: 'missa_diaria', day: 'Thursday' },
    { date: '2025-10-24', time: '06:30', type: 'missa_diaria', day: 'Friday' },
  ];

  console.log('📋 Test cases:');
  testCases.forEach(tc => {
    console.log(`   ${tc.day} ${tc.date} at ${tc.time}`);
  });
  console.log();

  // Check availability for each minister
  const results: Record<string, { name: string; availability: string[] }> = {};

  for (const response of responses) {
    const userName = userMap.get(response.userId!) || 'Unknown';
    const minister = {
      id: response.userId!,
      name: userName,
      questionnaireResponse: {
        responses: response.responses
      }
    };

    const availability: string[] = [];

    for (const testCase of testCases) {
      const mass = {
        date: testCase.date,
        time: testCase.time,
        type: testCase.type
      };

      const isAvailable = isAvailableForMass(minister, mass);
      if (isAvailable) {
        availability.push(testCase.day);
      }
    }

    if (availability.length > 0) {
      results[userName] = { name: userName, availability };
    }
  }

  // Print results
  console.log('✅ Ministers available for weekday masses:\n');
  const sortedResults = Object.values(results).sort((a, b) =>
    b.availability.length - a.availability.length
  );

  for (const result of sortedResults) {
    console.log(`👤 ${result.name}`);
    console.log(`   Available: ${result.availability.join(', ')}`);
    console.log();
  }

  console.log(`📊 Total ministers with weekday availability: ${sortedResults.length}`);
}

testWeekdayAvailability()
  .then(() => console.log('✅ Test complete'))
  .catch(console.error);
