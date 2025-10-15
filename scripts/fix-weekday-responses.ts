import { db } from "../server/db";
import { questionnaireResponses, users } from "../shared/schema";
import { eq } from "drizzle-orm";

async function fixWeekdayResponses() {
  console.log('🔧 Fixing weekday availability responses\n');

  // Find Rafael and Anderson
  const allUsers = await db.select().from(users);

  const rafael = allUsers.find(u => u.name.includes('Rafael Corrêa'));
  const anderson = allUsers.find(u => u.name.includes('Anderson Roberto'));

  if (!rafael) {
    console.log('❌ Could not find Rafael Corrêa');
    return;
  }

  if (!anderson) {
    console.log('❌ Could not find Anderson Roberto Silva Santos');
    return;
  }

  console.log('✅ Found users:');
  console.log(`   - Rafael Corrêa (${rafael.id})`);
  console.log(`   - Anderson Roberto Silva Santos (${anderson.id})\n`);

  // Update Rafael's response - add Friday
  console.log('📝 Updating Rafael Corrêa...');
  const rafaelResponses = await db
    .select()
    .from(questionnaireResponses)
    .where(eq(questionnaireResponses.userId, rafael.id));

  if (rafaelResponses.length === 0) {
    console.log('❌ No questionnaire response found for Rafael\n');
  } else {
    for (const response of rafaelResponses) {
      let responses = response.responses;
      if (typeof responses === 'string') {
        responses = JSON.parse(responses);
      }

      console.log(`   Before: friday = ${responses.weekdays?.friday}`);

      if (!responses.weekdays) {
        responses.weekdays = {
          monday: false,
          tuesday: false,
          wednesday: false,
          thursday: false,
          friday: false
        };
      }

      responses.weekdays.friday = true;  // ✅ Add Friday availability

      await db
        .update(questionnaireResponses)
        .set({ responses })
        .where(eq(questionnaireResponses.id, response.id));

      console.log(`   After:  friday = ${responses.weekdays.friday}`);
      console.log('   ✅ Updated Rafael - added Friday availability\n');
    }
  }

  // Update Anderson's response - add Tuesday
  console.log('📝 Updating Anderson Roberto Silva Santos...');
  const andersonResponses = await db
    .select()
    .from(questionnaireResponses)
    .where(eq(questionnaireResponses.userId, anderson.id));

  if (andersonResponses.length === 0) {
    console.log('❌ No questionnaire response found for Anderson\n');
  } else {
    for (const response of andersonResponses) {
      let responses = response.responses;
      if (typeof responses === 'string') {
        responses = JSON.parse(responses);
      }

      console.log(`   Before: tuesday = ${responses.weekdays?.tuesday}`);

      if (!responses.weekdays) {
        responses.weekdays = {
          monday: false,
          tuesday: false,
          wednesday: false,
          thursday: false,
          friday: false
        };
      }

      responses.weekdays.tuesday = true;  // ✅ Add Tuesday availability

      await db
        .update(questionnaireResponses)
        .set({ responses })
        .where(eq(questionnaireResponses.id, response.id));

      console.log(`   After:  tuesday = ${responses.weekdays.tuesday}`);
      console.log('   ✅ Updated Anderson - added Tuesday availability\n');
    }
  }
}

fixWeekdayResponses()
  .then(() => console.log('✅ Fix complete - weekday availabilities updated'))
  .catch(console.error);
