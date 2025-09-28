#!/usr/bin/env tsx
import { db } from '../server/db';
import { questionnaires, questionnaireResponses, users } from '@shared/schema';
import { eq, and } from 'drizzle-orm';

interface QuestionMapping {
  questionId: number;
  field: keyof typeof fieldMapping;
  type: 'boolean' | 'array' | 'string';
}

const fieldMapping = {
  availableSundays: 'availableSundays',
  preferredMassTimes: 'preferredMassTimes',
  alternativeTimes: 'alternativeTimes',
  canSubstitute: 'canSubstitute',
  dailyMassAvailability: 'dailyMassAvailability',
  specialEvents: 'specialEvents'
};

async function parseOctoberQuestionnaire() {
  console.log('🔍 Analisando questionário de outubro 2025...\n');

  try {
    // Buscar o questionário de outubro
    const questionnaire = await db
      .select()
      .from(questionnaires)
      .where(and(
        eq(questionnaires.month, 10),
        eq(questionnaires.year, 2025)
      ))
      .execute();

    if (questionnaire.length === 0) {
      console.log('❌ Questionário de outubro 2025 não encontrado');
      return;
    }

    const octoberQuestionnaire = questionnaire[0];
    console.log(`✅ Questionário encontrado: ${octoberQuestionnaire.title}`);
    console.log(`   ID: ${octoberQuestionnaire.id}`);
    console.log(`   Status: ${octoberQuestionnaire.status}\n`);

    // Buscar todas as respostas
    const responses = await db
      .select()
      .from(questionnaireResponses)
      .where(eq(questionnaireResponses.questionnaireId, octoberQuestionnaire.id))
      .execute();

    console.log(`📊 Total de respostas: ${responses.length}\n`);

    // Analisar estrutura das respostas
    let updatedCount = 0;
    let alreadyFormattedCount = 0;

    for (const response of responses) {
      const minister = await db
        .select()
        .from(users)
        .where(eq(users.id, response.userId))
        .execute();

      const ministerName = minister[0]?.name || 'Desconhecido';

      // Verificar se já está no formato novo
      if (response.availableSundays !== null) {
        alreadyFormattedCount++;
        console.log(`✓ ${ministerName}: Já está no formato correto`);
        continue;
      }

      // Processar formato antigo
      if (response.responses && typeof response.responses === 'object') {
        const oldResponses = response.responses as any;

        console.log(`🔄 Processando ${ministerName}...`);

        const parsedData = {
          availableSundays: [] as string[],
          preferredMassTimes: [] as string[],
          alternativeTimes: [] as string[],
          canSubstitute: false,
          dailyMassAvailability: [] as string[],
          specialEvents: {} as any
        };

        // Processar cada resposta
        for (const item of oldResponses) {
          if (!item.questionId || !item.answer) continue;

          const questionId = item.questionId;
          const answer = item.answer;

          // Mapear IDs de perguntas para campos
          // Você precisará ajustar estes IDs baseado na estrutura real
          switch (questionId) {
            case 103: // Disponibilidade mensal
              parsedData.canSubstitute = answer.toLowerCase().includes('sim');
              break;

            case 104: // Horário principal
              if (answer.includes('8h') || answer.includes('08h')) {
                parsedData.preferredMassTimes.push('08:00');
              }
              if (answer.includes('10h')) {
                parsedData.preferredMassTimes.push('10:00');
              }
              if (answer.includes('19h')) {
                parsedData.preferredMassTimes.push('19:00');
              }
              break;

            case 105: // Domingos disponíveis
              if (answer.includes('05/10') || answer.includes('5/10')) {
                parsedData.availableSundays.push('1');
              }
              if (answer.includes('12/10')) {
                parsedData.availableSundays.push('2');
              }
              if (answer.includes('19/10')) {
                parsedData.availableSundays.push('3');
              }
              if (answer.includes('26/10')) {
                parsedData.availableSundays.push('4');
              }
              if (answer.toLowerCase().includes('todos')) {
                parsedData.availableSundays = ['1', '2', '3', '4'];
              }
              break;

            case 106: // Pode substituir
              parsedData.canSubstitute = answer.toLowerCase().includes('sim');
              break;

            case 107: // São Judas
              if (!parsedData.specialEvents) parsedData.specialEvents = {};
              parsedData.specialEvents.saoJudas = answer.toLowerCase().includes('sim');
              break;

            case 108: // Nossa Senhora
              if (!parsedData.specialEvents) parsedData.specialEvents = {};
              parsedData.specialEvents.nossaSenhora = answer.toLowerCase().includes('sim');
              break;
          }
        }

        // Atualizar no banco
        try {
          await db
            .update(questionnaireResponses)
            .set({
              availableSundays: parsedData.availableSundays,
              preferredMassTimes: parsedData.preferredMassTimes,
              alternativeTimes: parsedData.alternativeTimes,
              canSubstitute: parsedData.canSubstitute,
              dailyMassAvailability: parsedData.dailyMassAvailability,
              specialEvents: parsedData.specialEvents,
            })
            .where(eq(questionnaireResponses.id, response.id))
            .execute();

          updatedCount++;
          console.log(`   ✅ Atualizado: ${ministerName}`);
          console.log(`      - Domingos: ${parsedData.availableSundays.join(', ')}`);
          console.log(`      - Horários: ${parsedData.preferredMassTimes.join(', ')}`);
          console.log(`      - Substituto: ${parsedData.canSubstitute ? 'Sim' : 'Não'}`);
        } catch (error) {
          console.error(`   ❌ Erro ao atualizar ${ministerName}:`, error);
        }
      }
    }

    console.log('\n📊 RESUMO DA MIGRAÇÃO');
    console.log('='.repeat(40));
    console.log(`✅ Já formatados: ${alreadyFormattedCount}`);
    console.log(`🔄 Migrados: ${updatedCount}`);
    console.log(`📊 Total: ${responses.length}`);

    // Verificar resultado
    console.log('\n🔍 Verificando dados migrados...');
    const updatedResponses = await db
      .select()
      .from(questionnaireResponses)
      .where(eq(questionnaireResponses.questionnaireId, octoberQuestionnaire.id))
      .execute();

    const withNewFormat = updatedResponses.filter(r => r.availableSundays !== null);
    console.log(`✅ Respostas no formato novo: ${withNewFormat.length}/${updatedResponses.length}`);

    // Estatísticas
    const stats = {
      totalDomingos: new Map<string, number>(),
      totalHorarios: new Map<string, number>(),
      podeSubstituir: 0
    };

    for (const r of withNewFormat) {
      if (r.availableSundays) {
        for (const sunday of r.availableSundays) {
          stats.totalDomingos.set(sunday, (stats.totalDomingos.get(sunday) || 0) + 1);
        }
      }
      if (r.preferredMassTimes) {
        for (const time of r.preferredMassTimes) {
          stats.totalHorarios.set(time, (stats.totalHorarios.get(time) || 0) + 1);
        }
      }
      if (r.canSubstitute) {
        stats.podeSubstituir++;
      }
    }

    console.log('\n📈 ESTATÍSTICAS');
    console.log('='.repeat(40));
    console.log('Disponibilidade por domingo:');
    const domingos = ['1º domingo (05/10)', '2º domingo (12/10)', '3º domingo (19/10)', '4º domingo (26/10)'];
    for (const [key, value] of stats.totalDomingos) {
      const index = parseInt(key) - 1;
      if (index >= 0 && index < domingos.length) {
        console.log(`   ${domingos[index]}: ${value} ministros`);
      }
    }

    console.log('\nPreferência de horários:');
    for (const [time, count] of stats.totalHorarios) {
      console.log(`   ${time}: ${count} ministros`);
    }

    console.log(`\nPodem substituir: ${stats.podeSubstituir} ministros`);

  } catch (error) {
    console.error('❌ Erro:', error);
  }

  process.exit(0);
}

parseOctoberQuestionnaire().catch(console.error);