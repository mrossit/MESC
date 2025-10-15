import { db } from "../server/db";
import { questionnaireResponses, questionnaires, users } from "../shared/schema";
import { eq } from "drizzle-orm";

async function inspectRawWeekdayResponses() {
  console.log('🔍 Inspecting raw weekday responses\n');

  // Get all questionnaires to find the one with responses
  const allQuestionnaires = await db
    .select()
    .from(questionnaires)
    .orderBy(questionnaires.createdAt);

  if (!allQuestionnaires.length) {
    console.log('❌ No questionnaires found');
    return;
  }

  console.log(`\n📋 Found ${allQuestionnaires.length} questionnaires\n`);

  // Check responses for each questionnaire
  for (const q of allQuestionnaires) {
    const responses = await db
      .select()
      .from(questionnaireResponses)
      .where(eq(questionnaireResponses.questionnaireId, q.id));

    console.log(`Questionnaire ${q.id}: ${responses.length} responses`);

    if (responses.length > 10) {
      // This is the one we want
      console.log(`\n✅ Using questionnaire with ${responses.length} responses\n`);

      // Show first few responses to understand structure
      console.log('First 3 responses structure:');
      responses.slice(0, 3).forEach((r, idx) => {
        console.log(`\n${idx + 1}. Response keys:`, Object.keys(r));
        console.log(`   Has ministerName: ${!!r.ministerName}`);
        console.log(`   Has ministerId: ${!!r.ministerId}`);
      });

      // Get all users
      const allUsers = await db.select().from(users);
      const userMap = new Map(allUsers.map(u => [u.id, u.name]));

      const ministersToCheck = [
        'Rafael',
        'Anderson',
        'Eliane',
        'Daniela'
      ];

      for (const minister of ministersToCheck) {
        const response = responses.find(r => {
          const userName = userMap.get(r.userId!) || '';
          return userName.toLowerCase().includes(minister.toLowerCase());
        });

        if (response) {
          const userName = userMap.get(response.userId!) || 'Unknown';
          console.log(`\n👤 ${userName}`);
          console.log(`   ID: ${response.userId}`);
          console.log(`   Response type: ${typeof response.responses}`);
          console.log(`\n   dailyMassAvailability:`);
          console.log(JSON.stringify(response.dailyMassAvailability, null, 2));
          console.log(`\n   Raw responses object:`);
          console.log(JSON.stringify(response.responses, null, 2));
        } else {
          console.log(`\n❌ No response found for: ${minister}`);
        }
      }

      break; // Found the questionnaire with responses
    }
  }
}

inspectRawWeekdayResponses()
  .then(() => console.log('\n✅ Complete'))
  .catch(console.error);
