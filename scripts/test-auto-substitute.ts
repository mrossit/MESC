import { db } from '../server/db';
import { schedules, users, questionnaireResponses, questionnaires } from '../shared/schema';
import { eq, and, notInArray } from 'drizzle-orm';

async function testAutoSubstitute() {
  try {
    console.log('\n🧪 TESTE DE AUTO-ESCALAÇÃO DE SUPLENTES\n');
    console.log('='.repeat(60));

    // Escolher uma missa de exemplo (05/10/2025 às 08:00)
    const testDate = '2025-10-05';
    const testTime = '08:00:00';

    console.log(`\n📅 Testando para: ${testDate} às ${testTime}`);
    console.log('-'.repeat(60));

    // 1. Buscar o questionário ativo
    const [year, month] = testDate.split('-').map(Number);

    const [activeQuestionnaire] = await db
      .select()
      .from(questionnaires)
      .where(
        and(
          eq(questionnaires.year, year),
          eq(questionnaires.month, month),
          eq(questionnaires.status, 'published')
        )
      )
      .limit(1);

    if (!activeQuestionnaire) {
      console.log('❌ Nenhum questionário ativo encontrado');
      return;
    }

    console.log(`✅ Questionário encontrado: ${activeQuestionnaire.title}`);

    // 2. Buscar ministros escalados
    const scheduledMinisters = await db
      .select({
        ministerId: schedules.ministerId,
        ministerName: users.name
      })
      .from(schedules)
      .leftJoin(users, eq(schedules.ministerId, users.id))
      .where(
        and(
          eq(schedules.date, testDate),
          eq(schedules.time, testTime),
          eq(schedules.status, 'scheduled')
        )
      );

    console.log(`\n👥 Ministros escalados (${scheduledMinisters.length}):`);
    scheduledMinisters.forEach((m, idx) => {
      console.log(`   ${idx + 1}. ${m.ministerName}`);
    });

    const scheduledMinisterIds = scheduledMinisters
      .map(s => s.ministerId)
      .filter(id => id !== null) as string[];

    // 3. Buscar respostas de ministros disponíveis
    const responsesQuery = scheduledMinisterIds.length > 0
      ? db
          .select({
            userId: questionnaireResponses.userId,
            availableSundays: questionnaireResponses.availableSundays,
            preferredMassTimes: questionnaireResponses.preferredMassTimes,
            canSubstitute: questionnaireResponses.canSubstitute,
            userName: users.name,
            lastService: users.lastService
          })
          .from(questionnaireResponses)
          .innerJoin(users, eq(questionnaireResponses.userId, users.id))
          .where(
            and(
              eq(questionnaireResponses.questionnaireId, activeQuestionnaire.id),
              eq(users.status, 'active'),
              eq(users.role, 'ministro'),
              notInArray(questionnaireResponses.userId, scheduledMinisterIds)
            )
          )
      : db
          .select({
            userId: questionnaireResponses.userId,
            availableSundays: questionnaireResponses.availableSundays,
            preferredMassTimes: questionnaireResponses.preferredMassTimes,
            canSubstitute: questionnaireResponses.canSubstitute,
            userName: users.name,
            lastService: users.lastService
          })
          .from(questionnaireResponses)
          .innerJoin(users, eq(questionnaireResponses.userId, users.id))
          .where(
            and(
              eq(questionnaireResponses.questionnaireId, activeQuestionnaire.id),
              eq(users.status, 'active'),
              eq(users.role, 'ministro')
            )
          );

    const availableResponses = await responsesQuery;

    console.log(`\n📋 Respostas ao questionário (${availableResponses.length} ministros não escalados)`);

    // 4. Filtrar ministros elegíveis
    const eligibleMinisters = availableResponses.filter(response => {
      const availableSundays = response.availableSundays as string[] || [];
      const isDateAvailable = availableSundays.includes(testDate);
      const canSubstitute = response.canSubstitute ?? false;

      return isDateAvailable && canSubstitute;
    });

    console.log(`\n✨ Ministros ELEGÍVEIS para substituição (${eligibleMinisters.length}):`);
    console.log('-'.repeat(60));

    if (eligibleMinisters.length === 0) {
      console.log('   ❌ Nenhum ministro elegível encontrado');
      console.log('\n💡 Dica: Verifique se ministros responderam o questionário com:');
      console.log('   - Disponibilidade para esta data');
      console.log('   - "Pode substituir" marcado como SIM');
    } else {
      eligibleMinisters.forEach((m, idx) => {
        const preferredTimes = (m.preferredMassTimes as string[]) || [];
        const prefersThisTime = preferredTimes.includes(testTime);
        const lastServiceDate = m.lastService
          ? new Date(m.lastService).toISOString().split('T')[0]
          : 'Nunca serviu';

        console.log(`   ${idx + 1}. ${m.userName}`);
        console.log(`      • Prefere ${testTime}: ${prefersThisTime ? '✅ SIM' : '❌ NÃO'}`);
        console.log(`      • Último serviço: ${lastServiceDate}`);
        console.log(`      • Horários preferidos: ${preferredTimes.join(', ') || 'Nenhum'}`);
      });

      // Ordenar e selecionar
      eligibleMinisters.sort((a, b) => {
        const aPreferredTimes = (a.preferredMassTimes as string[]) || [];
        const bPreferredTimes = (b.preferredMassTimes as string[]) || [];
        const aPreferred = aPreferredTimes.includes(testTime);
        const bPreferred = bPreferredTimes.includes(testTime);

        if (aPreferred && !bPreferred) return -1;
        if (!aPreferred && bPreferred) return 1;

        const aLastService = a.lastService ? new Date(a.lastService).getTime() : 0;
        const bLastService = b.lastService ? new Date(b.lastService).getTime() : 0;

        return aLastService - bLastService;
      });

      const selected = eligibleMinisters[0];
      console.log(`\n🎯 SUPLENTE SELECIONADO: ${selected.userName}`);
      console.log(`   ID: ${selected.userId}`);
    }

    console.log('\n' + '='.repeat(60));
    console.log('✅ Teste concluído!\n');

  } catch (error) {
    console.error('❌ Erro no teste:', error);
  }
  process.exit(0);
}

testAutoSubstitute();
