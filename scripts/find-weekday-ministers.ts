/**
 * Find all ministers who marked weekday availability
 */
import { db } from '../server/db';
import { users, questionnaireResponses, questionnaires } from '@shared/schema';
import { eq, and } from 'drizzle-orm';

async function findWeekdayMinisters() {
  console.log('🔍 Finding ministers with weekday availability\n');

  // Get all responses for October 2025
  const responses = await db.select()
    .from(questionnaireResponses)
    .innerJoin(users, eq(questionnaireResponses.userId, users.id))
    .innerJoin(questionnaires, eq(questionnaireResponses.questionnaireId, questionnaires.id))
    .where(
      and(
        eq(questionnaires.month, 10),
        eq(questionnaires.year, 2025)
      )
    );

  console.log(`Total responses: ${responses.length}\n`);

  const ministersWithWeekdays: any[] = [];

  for (const response of responses) {
    const data = response.questionnaire_responses.responses;
    const weekdays = data.weekdays;

    if (weekdays) {
      // Check if ANY weekday is true
      const hasAnyWeekday =
        weekdays.monday ||
        weekdays.tuesday ||
        weekdays.wednesday ||
        weekdays.thursday ||
        weekdays.friday;

      if (hasAnyWeekday) {
        ministersWithWeekdays.push({
          name: response.users.name,
          id: response.users.id,
          weekdays: {
            monday: weekdays.monday,
            tuesday: weekdays.tuesday,
            wednesday: weekdays.wednesday,
            thursday: weekdays.thursday,
            friday: weekdays.friday
          }
        });
      }
    }
  }

  console.log(`\n📊 Ministers with weekday availability: ${ministersWithWeekdays.length}\n`);

  for (const minister of ministersWithWeekdays) {
    console.log(`\n👤 ${minister.name}`);
    console.log(`   ID: ${minister.id}`);
    console.log(`   Monday: ${minister.weekdays.monday}`);
    console.log(`   Tuesday: ${minister.weekdays.tuesday}`);
    console.log(`   Wednesday: ${minister.weekdays.wednesday}`);
    console.log(`   Thursday: ${minister.weekdays.thursday}`);
    console.log(`   Friday: ${minister.weekdays.friday}`);
  }

  console.log('\n✅ Complete');
}

findWeekdayMinisters()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('❌ Error:', error);
    process.exit(1);
  });
