#!/usr/bin/env tsx

/**
 * Analisar a estrutura do questionário de outubro
 * para entender o que causa problema na leitura
 */

import { db } from '../server/db';
import { questionnaires, questionnaireResponses, users } from '@shared/schema';
import { eq, and } from 'drizzle-orm';

async function main() {
  console.log('🔍 Analisando estrutura do questionário de Outubro 2025...\n');

  // 1. Buscar questionário
  const questionnaire = await db.select()
    .from(questionnaires)
    .where(and(
      eq(questionnaires.month, 10),
      eq(questionnaires.year, 2025)
    ))
    .limit(1);

  if (questionnaire.length === 0) {
    console.log('❌ Questionário não encontrado!');
    return;
  }

  const q = questionnaire[0];

  console.log('='.repeat(80));
  console.log('ESTRUTURA DO QUESTIONÁRIO');
  console.log('='.repeat(80));
  console.log('');
  console.log(`ID: ${q.id}`);
  console.log(`Título: ${q.title}`);
  console.log(`Mês/Ano: ${q.month}/${q.year}`);
  console.log(`Format Version: ${(q as any).format_version || 'V1.0'}`);
  console.log('');

  console.log('Perguntas:');
  console.log(JSON.stringify(q.questions, null, 2));
  console.log('');

  // 2. Pegar 5 respostas de exemplo
  console.log('='.repeat(80));
  console.log('EXEMPLOS DE RESPOSTAS (5 primeiros)');
  console.log('='.repeat(80));
  console.log('');

  const responses = await db.select({
    response: questionnaireResponses,
    user: users
  })
    .from(questionnaireResponses)
    .innerJoin(users, eq(questionnaireResponses.userId, users.id))
    .where(eq(questionnaireResponses.questionnaireId, q.id))
    .limit(5);

  for (const { response, user } of responses) {
    console.log(`\n[${ user.name}]`);
    console.log('-'.repeat(80));
    console.log('Campo "responses":');
    console.log(JSON.stringify(response.responses, null, 2));
    console.log('');

    if (response.availableSundays) {
      console.log('Campo "availableSundays":');
      console.log(JSON.stringify(response.availableSundays, null, 2));
    }

    if (response.preferredMassTimes) {
      console.log('Campo "preferredMassTimes":');
      console.log(JSON.stringify(response.preferredMassTimes, null, 2));
    }

    if (response.dailyMassAvailability) {
      console.log('Campo "dailyMassAvailability":');
      console.log(JSON.stringify(response.dailyMassAvailability, null, 2));
    }

    if (response.specialEvents) {
      console.log('Campo "specialEvents":');
      console.log(JSON.stringify(response.specialEvents, null, 2));
    }

    console.log('');
  }

  // 3. Análise estatística
  console.log('='.repeat(80));
  console.log('ANÁLISE ESTATÍSTICA DE TODOS OS CAMPOS');
  console.log('='.repeat(80));
  console.log('');

  const allResponses = await db.select()
    .from(questionnaireResponses)
    .where(eq(questionnaireResponses.questionnaireId, q.id));

  const stats = {
    total: allResponses.length,
    hasResponses: 0,
    hasAvailableSundays: 0,
    hasPreferredMassTimes: 0,
    hasDailyMassAvailability: 0,
    hasSpecialEvents: 0,
    hasNotes: 0,
  };

  for (const r of allResponses) {
    if (r.responses) stats.hasResponses++;
    if (r.availableSundays && (r.availableSundays as any[]).length > 0) stats.hasAvailableSundays++;
    if (r.preferredMassTimes && (r.preferredMassTimes as any[]).length > 0) stats.hasPreferredMassTimes++;
    if (r.dailyMassAvailability && (r.dailyMassAvailability as any[]).length > 0) stats.hasDailyMassAvailability++;
    if (r.specialEvents) stats.hasSpecialEvents++;
    if (r.notes) stats.hasNotes++;
  }

  console.log(`Total de respostas: ${stats.total}`);
  console.log(`Com campo "responses": ${stats.hasResponses} (${Math.round(stats.hasResponses/stats.total*100)}%)`);
  console.log(`Com "availableSundays": ${stats.hasAvailableSundays} (${Math.round(stats.hasAvailableSundays/stats.total*100)}%)`);
  console.log(`Com "preferredMassTimes": ${stats.hasPreferredMassTimes} (${Math.round(stats.hasPreferredMassTimes/stats.total*100)}%)`);
  console.log(`Com "dailyMassAvailability": ${stats.hasDailyMassAvailability} (${Math.round(stats.hasDailyMassAvailability/stats.total*100)}%)`);
  console.log(`Com "specialEvents": ${stats.hasSpecialEvents} (${Math.round(stats.hasSpecialEvents/stats.total*100)}%)`);
  console.log(`Com "notes": ${stats.hasNotes} (${Math.round(stats.hasNotes/stats.total*100)}%)`);
  console.log('');

  // 4. Examinar o campo "responses" especificamente
  console.log('='.repeat(80));
  console.log('ANÁLISE DO CAMPO "responses" (estrutura)');
  console.log('='.repeat(80));
  console.log('');

  const responsesWithData = allResponses.filter(r => r.responses);

  if (responsesWithData.length > 0) {
    const sample = responsesWithData[0].responses as any;
    console.log('Tipo:', typeof sample);
    console.log('É array?', Array.isArray(sample));
    console.log('É objeto?', typeof sample === 'object');

    if (typeof sample === 'object') {
      console.log('Chaves:', Object.keys(sample));

      // Verificar se tem chaves relacionadas a domingos/horários
      const keys = Object.keys(sample);
      const sundayKeys = keys.filter(k => k.toLowerCase().includes('domingo') || k.toLowerCase().includes('sunday'));
      const timeKeys = keys.filter(k => k.includes('08:00') || k.includes('10:00') || k.includes('19:00') || k.includes('06:30'));

      console.log(`Chaves relacionadas a domingos: ${sundayKeys.length}`);
      if (sundayKeys.length > 0) {
        console.log('  Exemplos:', sundayKeys.slice(0, 5));
      }

      console.log(`Chaves relacionadas a horários: ${timeKeys.length}`);
      if (timeKeys.length > 0) {
        console.log('  Exemplos:', timeKeys.slice(0, 5));
      }
    }
  }

  console.log('');
}

main().catch(console.error);
