import { db } from '../server/db.js';
import { questionnaireResponses, questionnaires, users } from '@shared/schema';
import { eq } from 'drizzle-orm';

async function findDailyAvailability() {
  const [q] = await db.select().from(questionnaires).where(eq(questionnaires.month, 10)).limit(1);
  const responses = await db.select().from(questionnaireResponses).where(eq(questionnaireResponses.questionnaireId, q.id));

  console.log('🔍 PROCURANDO MINISTROS COM DISPONIBILIDADE DIÁRIA\n');

  let withDaily: any[] = [];

  for (const r of responses) {
    const resp = Array.isArray(r.responses) ? r.responses : JSON.parse(r.responses as string);
    const dailyItem = resp.find((i: any) => i.questionId === 'daily_mass_availability');

    if (dailyItem && dailyItem.answer) {
      // Verificar se NÃO é "Não posso"
      const isNotRefused = dailyItem.answer !== 'Não posso' && dailyItem.answer !== 'Não';

      if (isNotRefused) {
        // Buscar nome do usuário
        const [user] = await db.select().from(users).where(eq(users.id, r.userId)).limit(1);

        withDaily.push({
          userId: r.userId,
          name: user?.name || 'Desconhecido',
          email: user?.email || '',
          answer: dailyItem.answer,
          rawAnswer: JSON.stringify(dailyItem.answer)
        });
      }
    }
  }

  console.log(`✅ Encontrados ${withDaily.length} ministros com disponibilidade diária:\n`);

  withDaily.forEach((m, i) => {
    console.log(`${i + 1}. ${m.name} (${m.email})`);
    console.log(`   User ID: ${m.userId}`);
    console.log(`   Resposta raw: ${m.rawAnswer}`);
    console.log(`   Tipo: ${typeof m.answer}`);

    // Se for objeto, mostrar estrutura
    if (typeof m.answer === 'object' && m.answer !== null) {
      console.log(`   Estrutura:`, m.answer);
      if (m.answer.selectedOptions) {
        console.log(`   Dias selecionados:`, m.answer.selectedOptions);
      }
    }
    console.log('');
  });
}

findDailyAvailability().catch(console.error);
