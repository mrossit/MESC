/**
 * Debug why Oct 29-31 have no ministers
 */
import { db } from '../server/db';
import { users, questionnaireResponses, questionnaires } from '@shared/schema';
import { eq, and } from 'drizzle-orm';

async function debugOct29() {
  console.log('🔍 Debugging October 29 (Quarta-feira) at 06:30\n');

  // Import generator
  const { ScheduleGenerator } = await import('../server/utils/scheduleGenerator');
  const generator = new ScheduleGenerator();

  // Get Daniela
  const [daniela] = await db.select()
    .from(users)
    .where(eq(users.id, '4a1c378d-2ac1-46a7-9fbf-597f7748dac7'));

  console.log(`👤 Minister: ${daniela.name}\n`);

  // Get her response
  const [response] = await db.select()
    .from(questionnaireResponses)
    .innerJoin(questionnaires, eq(questionnaireResponses.questionnaireId, questionnaires.id))
    .where(
      and(
        eq(questionnaireResponses.userId, daniela.id),
        eq(questionnaires.month, 10),
        eq(questionnaires.year, 2025)
      )
    );

  if (!response) {
    console.log('❌ No response found');
    return;
  }

  console.log('📋 Raw response weekdays:', response.questionnaire_responses.responses.weekdays);

  // Adapt the response
  const adapted = (generator as any).adaptQuestionnaireResponse(
    response.questionnaire_responses,
    2025,
    10
  );

  console.log('\n📋 Adapted response:');
  console.log('  dailyMassAvailability:', adapted.dailyMassAvailability);

  // Check if available for missa_diaria
  console.log('\n🧪 Testing isAvailableForSpecialMass:');

  // Set the availabilityData
  (generator as any).availabilityData = new Map();
  (generator as any).availabilityData.set(daniela.id, adapted);

  const isAvailable = (generator as any).isAvailableForSpecialMass(
    daniela.id,
    'missa_diaria',
    '06:30',
    '2025-10-29'
  );

  console.log(`  Is available for missa_diaria? ${isAvailable ? '✅ YES' : '❌ NO'}`);

  // Check if Wednesday is in the array
  console.log('\n🔍 Checking array contents:');
  console.log(`  Has "Quarta"? ${adapted.dailyMassAvailability?.includes('Quarta')}`);
  console.log(`  Has "Wednesday"? ${adapted.dailyMassAvailability?.includes('Wednesday')}`);
  console.log(`  Has "quarta"? ${adapted.dailyMassAvailability?.includes('quarta')}`);
  console.log(`  Array contents:`, adapted.dailyMassAvailability);

  console.log('\n✅ Test complete');
}

debugOct29()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('❌ Error:', error);
    console.error(error.stack);
    process.exit(1);
  });
