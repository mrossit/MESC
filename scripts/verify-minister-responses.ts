import { db } from "../server/db";
import { questionnaireResponses, users } from "../shared/schema";

async function verifyMinisterResponses() {
  console.log('🔍 Verifying minister responses for Rafael and Anderson\n');

  const allUsers = await db.select().from(users);
  const responses = await db.select().from(questionnaireResponses);

  const ministersToCheck = ['Rafael', 'Anderson'];

  for (const ministerName of ministersToCheck) {
    const user = allUsers.find(u => u.name.toLowerCase().includes(ministerName.toLowerCase()));

    if (!user) {
      console.log(`❌ User not found: ${ministerName}\n`);
      continue;
    }

    console.log(`\n${'='.repeat(60)}`);
    console.log(`👤 ${user.name}`);
    console.log(`${'='.repeat(60)}\n`);

    const response = responses.find(r => r.userId === user.id);

    if (!response) {
      console.log('❌ No questionnaire response found\n');
      continue;
    }

    let responsesData = response.responses;
    if (typeof responsesData === 'string') {
      responsesData = JSON.parse(responsesData);
    }

    console.log('📝 Full response data:\n');
    console.log(JSON.stringify(responsesData, null, 2));
    console.log();

    // Check weekdays specifically
    if (responsesData.weekdays) {
      console.log('📅 Weekday availability:');
      for (const [day, available] of Object.entries(responsesData.weekdays)) {
        console.log(`   ${day}: ${available ? '✅ YES' : '❌ NO'}`);
      }
    } else {
      console.log('⚠️  No weekdays field found in response');
    }

    console.log();
  }
}

verifyMinisterResponses()
  .then(() => console.log('\n✅ Verification complete'))
  .catch(console.error);
