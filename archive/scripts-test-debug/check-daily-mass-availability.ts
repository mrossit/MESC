import { db } from '../server/db.js';
import { questionnaireResponses, questionnaires } from '@shared/schema';
import { eq } from 'drizzle-orm';

async function checkDailyMassAvailability() {
  const [q] = await db.select().from(questionnaires).where(eq(questionnaires.month, 10)).limit(1);
  const responses = await db.select().from(questionnaireResponses).where(eq(questionnaireResponses.questionnaireId, q.id));

  let withDailyMass = 0;
  let withoutDailyMass = 0;
  const examples: any[] = [];

  responses.forEach(r => {
    const resp = Array.isArray(r.responses) ? r.responses : JSON.parse(r.responses as string);
    const dailyItem = resp.find((i: any) => i.questionId === 'daily_mass_availability');

    if (dailyItem && dailyItem.answer && dailyItem.answer !== 'Não posso' && Array.isArray(dailyItem.answer) && dailyItem.answer.length > 0) {
      withDailyMass++;
      if (examples.length < 5) {
        examples.push({
          userId: r.userId,
          availability: dailyItem.answer
        });
      }
    } else {
      withoutDailyMass++;
    }
  });

  console.log('📊 RESUMO DE DISPONIBILIDADE PARA MISSAS DIÁRIAS:');
  console.log(`✅ COM disponibilidade: ${withDailyMass} ministros`);
  console.log(`❌ SEM disponibilidade: ${withoutDailyMass} ministros`);
  console.log('\n🔍 Exemplos de disponibilidade:');
  examples.forEach((ex, i) => {
    console.log(`${i + 1}. Dias: ${ex.availability.join(', ')}`);
  });
}

checkDailyMassAvailability().catch(console.error);
