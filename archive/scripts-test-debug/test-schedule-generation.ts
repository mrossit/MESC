import { generateAutomaticSchedule } from '../server/utils/scheduleGenerator';
import { db } from '../server/db';
import { questionnaires, questionnaireResponses, massTimesConfig } from '@shared/schema';
import { eq, and } from 'drizzle-orm';

async function testScheduleGeneration() {
  console.log('🔍 Testando geração de escalas...\n');

  try {
    // 1. Verificar questionários existentes
    console.log('📋 Verificando questionários existentes...');
    const allQuestionnaires = await db
      .select()
      .from(questionnaires)
      .orderBy(questionnaires.year, questionnaires.month);

    console.log(`   Total de questionários: ${allQuestionnaires.length}`);
    allQuestionnaires.forEach(q => {
      console.log(`   - ${q.title} (${q.month}/${q.year}) - Status: ${q.status}`);
    });

    // 2. Verificar respostas
    console.log('\n📊 Verificando respostas aos questionários...');
    for (const q of allQuestionnaires) {
      const responses = await db
        .select()
        .from(questionnaireResponses)
        .where(eq(questionnaireResponses.questionnaireId, q.id));

      console.log(`   ${q.title}: ${responses.length} respostas`);

      // Mostrar algumas respostas
      if (responses.length > 0) {
        const sample = responses[0];
        console.log(`     Exemplo de disponibilidade:`);
        console.log(`     - Domingos: ${sample.availableSundays?.join(', ') || 'Não informado'}`);
        console.log(`     - Horários preferidos: ${sample.preferredMassTimes?.join(', ') || 'Não informado'}`);
        console.log(`     - Pode substituir: ${sample.canSubstitute ? 'Sim' : 'Não'}`);
      }
    }

    // 3. Verificar configuração de horários de missa
    console.log('\n⛪ Verificando configuração de horários de missa...');
    const massTimes = await db
      .select()
      .from(massTimesConfig)
      .orderBy(massTimesConfig.dayOfWeek, massTimesConfig.time);

    console.log(`   Total de horários configurados: ${massTimes.length}`);
    massTimes.forEach(mt => {
      const days = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
      console.log(`   - ${days[mt.dayOfWeek]} ${mt.time} (Min: ${mt.minMinisters}, Max: ${mt.maxMinisters})`);
    });

    // 4. Tentar gerar escalas para outubro/2025
    const targetMonth = 10;
    const targetYear = 2025;

    console.log(`\n🎯 Testando geração para ${targetMonth}/${targetYear}...`);

    // Verificar se há questionário para este período
    const targetQuestionnaire = allQuestionnaires.find(
      q => q.month === targetMonth && q.year === targetYear
    );

    if (!targetQuestionnaire) {
      console.log('   ❌ Não há questionário para este período');
      return;
    }

    console.log(`   ✅ Questionário encontrado: ${targetQuestionnaire.title} (Status: ${targetQuestionnaire.status})`);

    // Testar geração preview (aceita questionários abertos)
    console.log('\n📝 Testando geração PREVIEW (aceita questionários abertos)...');
    try {
      const previewSchedules = await generateAutomaticSchedule(targetYear, targetMonth, true);
      console.log(`   ✅ Preview gerado: ${previewSchedules.length} escalas`);

      // Mostrar algumas escalas geradas
      if (previewSchedules.length > 0) {
        console.log('\n   Primeiras 3 escalas geradas:');
        previewSchedules.slice(0, 3).forEach((s, i) => {
          console.log(`\n   ${i + 1}. ${s.massTime.date} ${s.massTime.time}`);
          console.log(`      Ministros: ${s.ministers.map(m => m.name).join(', ') || 'Nenhum'}`);
          console.log(`      Confiança: ${(s.confidence * 100).toFixed(0)}%`);
        });
      }
    } catch (error) {
      console.log(`   ❌ Erro na geração preview: ${error instanceof Error ? error.message : error}`);
    }

    // Testar geração definitiva (requer questionário fechado)
    console.log('\n📝 Testando geração DEFINITIVA (requer questionário fechado)...');

    if (targetQuestionnaire.status !== 'closed') {
      console.log(`   ⚠️  Questionário com status "${targetQuestionnaire.status}" - precisa estar "closed" para geração definitiva`);

      // Tentar fechar o questionário temporariamente para teste
      console.log('   🔧 Fechando questionário temporariamente para teste...');
      await db
        .update(questionnaires)
        .set({ status: 'closed' })
        .where(eq(questionnaires.id, targetQuestionnaire.id));
    }

    try {
      const definitiveSchedules = await generateAutomaticSchedule(targetYear, targetMonth, false);
      console.log(`   ✅ Geração definitiva: ${definitiveSchedules.length} escalas`);

      // Análise das escalas geradas
      if (definitiveSchedules.length > 0) {
        const sundaySchedules = definitiveSchedules.filter(s => s.massTime.dayOfWeek === 0);
        const weekdaySchedules = definitiveSchedules.filter(s => s.massTime.dayOfWeek !== 0);

        console.log(`\n   📊 Análise das escalas geradas:`);
        console.log(`      - Missas dominicais: ${sundaySchedules.length}`);
        console.log(`      - Missas de semana: ${weekdaySchedules.length}`);

        const totalMinisters = new Set(
          definitiveSchedules.flatMap(s => s.ministers.map(m => m.id))
        ).size;
        console.log(`      - Total de ministros escalados: ${totalMinisters}`);

        const avgConfidence = definitiveSchedules.reduce((sum, s) => sum + s.confidence, 0) / definitiveSchedules.length;
        console.log(`      - Confiança média: ${(avgConfidence * 100).toFixed(0)}%`);

        // Verificar se está usando dados reais
        const hasRealAvailability = definitiveSchedules.some(s =>
          s.ministers.some(m => m.availabilityScore > 0)
        );
        console.log(`      - Usando dados de disponibilidade: ${hasRealAvailability ? '✅ Sim' : '❌ Não'}`);
      }
    } catch (error) {
      console.log(`   ❌ Erro na geração definitiva: ${error instanceof Error ? error.message : error}`);
    }

    // Restaurar status original se foi alterado
    if (targetQuestionnaire.status !== 'closed') {
      console.log(`\n   🔄 Restaurando status original do questionário para "${targetQuestionnaire.status}"...`);
      await db
        .update(questionnaires)
        .set({ status: targetQuestionnaire.status })
        .where(eq(questionnaires.id, targetQuestionnaire.id));
    }

    console.log('\n✅ Teste concluído!');

  } catch (error) {
    console.error('❌ Erro no teste:', error);
    process.exit(1);
  }

  process.exit(0);
}

testScheduleGeneration().catch(console.error);