#!/usr/bin/env tsx

/**
 * Análise profunda de UMA resposta específica
 * Para entender exatamente o que está sendo lido vs o que deveria ser lido
 */

import { db } from '../server/db';
import { questionnaireResponses, users, questionnaires } from '@shared/schema';
import { eq, and } from 'drizzle-orm';
import { ResponseCompiler } from '../server/services/responseCompiler';

async function main() {
  console.log('🔬 ANÁLISE PROFUNDA DE RESPOSTA INDIVIDUAL\n');
  console.log('='.repeat(80));

  // Buscar questionário
  const questionnaire = await db.select()
    .from(questionnaires)
    .where(and(
      eq(questionnaires.month, 10),
      eq(questionnaires.year, 2025)
    ))
    .limit(1);

  if (questionnaire.length === 0) {
    console.log('❌ Questionário não encontrado');
    return;
  }

  // Buscar TODAS as respostas com usuário
  const allResponses = await db.select({
    response: questionnaireResponses,
    user: users
  })
    .from(questionnaireResponses)
    .innerJoin(users, eq(questionnaireResponses.userId, users.id))
    .where(eq(questionnaireResponses.questionnaireId, questionnaire[0].id));

  console.log(`Total de respostas no banco: ${allResponses.length}\n`);

  // Pegar primeira resposta como exemplo
  const example = allResponses[0];

  console.log('='.repeat(80));
  console.log(`EXEMPLO: ${example.user.name}`);
  console.log('='.repeat(80));
  console.log('');

  console.log('1️⃣  DADOS BRUTOS DO BANCO:');
  console.log('-'.repeat(80));
  console.log('Campo "responses":');
  console.log(JSON.stringify(example.response.responses, null, 2));
  console.log('');

  if (example.response.availableSundays) {
    console.log('Campo "availableSundays":');
    console.log(JSON.stringify(example.response.availableSundays, null, 2));
    console.log('');
  }

  if (example.response.preferredMassTimes) {
    console.log('Campo "preferredMassTimes":');
    console.log(JSON.stringify(example.response.preferredMassTimes, null, 2));
    console.log('');
  }

  if (example.response.dailyMassAvailability) {
    console.log('Campo "dailyMassAvailability":');
    console.log(JSON.stringify(example.response.dailyMassAvailability, null, 2));
    console.log('');
  }

  if (example.response.specialEvents) {
    console.log('Campo "specialEvents":');
    console.log(JSON.stringify(example.response.specialEvents, null, 2));
    console.log('');
  }

  // Agora compilar e ver o que o sistema detecta
  console.log('='.repeat(80));
  console.log('2️⃣  O QUE O SISTEMA DETECTOU:');
  console.log('-'.repeat(80));
  console.log('');

  const compiled = await ResponseCompiler.compileMonthlyResponses(10, 2025);
  const userCompiled = compiled.get(example.user.id);

  if (userCompiled) {
    console.log('Disponibilidades detectadas:');
    console.log('');

    console.log('Datas específicas:');
    for (const [date, dayData] of Object.entries(userCompiled.availability.dates)) {
      const times = Object.entries(dayData.times)
        .filter(([_, available]) => available)
        .map(([time, _]) => time);

      if (times.length > 0) {
        console.log(`  ${date}: ${times.join(', ')}`);
      }
    }
    console.log('');

    console.log('Dias da semana (missas diárias):');
    const weekdayEntries = Object.entries(userCompiled.availability.weekdays)
      .filter(([_, available]) => available);

    if (weekdayEntries.length > 0) {
      weekdayEntries.forEach(([day, _]) => console.log(`  ${day}: sim`));
    } else {
      console.log('  Nenhum dia da semana marcado');
    }
    console.log('');

    console.log('Eventos especiais:');
    if (Object.keys(userCompiled.availability.specialEvents).length > 0) {
      console.log(JSON.stringify(userCompiled.availability.specialEvents, null, 2));
    } else {
      console.log('  Nenhum evento especial detectado');
    }
  } else {
    console.log('❌ Usuário não encontrado nos dados compilados!');
  }

  console.log('');
  console.log('='.repeat(80));
  console.log('3️⃣  COMPARAÇÃO MANUAL:');
  console.log('='.repeat(80));
  console.log('');
  console.log('Agora vamos analisar manualmente o campo "responses":');
  console.log('');

  const responses = example.response.responses as any[];

  // Contar respostas "Sim"
  const yesAnswers = responses.filter(r => r.answer === 'Sim' || (Array.isArray(r.answer) && r.answer.length > 0));

  console.log(`Total de perguntas respondidas: ${responses.length}`);
  console.log(`Perguntas com resposta positiva: ${yesAnswers.length}`);
  console.log('');

  console.log('Respostas positivas por categoria:');
  console.log('');

  // Domingos
  const sundayAnswer = responses.find(r => r.questionId === 'available_sundays');
  if (sundayAnswer && Array.isArray(sundayAnswer.answer)) {
    console.log(`📅 Domingos disponíveis: ${sundayAnswer.answer.length}`);
    sundayAnswer.answer.forEach((s: string) => console.log(`   - ${s}`));
  }
  console.log('');

  // Horário principal
  const mainTimeAnswer = responses.find(r => r.questionId === 'main_service_time');
  if (mainTimeAnswer) {
    console.log(`🕐 Horário principal: ${mainTimeAnswer.answer}`);
  }
  console.log('');

  // Missas diárias
  const dailyAnswer = responses.find(r => r.questionId === 'daily_mass_availability');
  if (dailyAnswer) {
    console.log(`📆 Missas diárias: ${dailyAnswer.answer}`);
  }
  console.log('');

  // São Judas
  const judas7h = responses.find(r => r.questionId === 'saint_judas_feast_7h');
  const judas10h = responses.find(r => r.questionId === 'saint_judas_feast_10h');
  const judas12h = responses.find(r => r.questionId === 'saint_judas_feast_12h');
  const judas15h = responses.find(r => r.questionId === 'saint_judas_feast_15h');
  const judas17h = responses.find(r => r.questionId === 'saint_judas_feast_17h');
  const judasEvening = responses.find(r => r.questionId === 'saint_judas_feast_evening');

  console.log('🎊 Festa São Judas (28/10):');
  if (judas7h) console.log(`   07:00 - ${judas7h.answer}`);
  if (judas10h) console.log(`   10:00 - ${judas10h.answer}`);
  if (judas12h) console.log(`   12:00 - ${judas12h.answer}`);
  if (judas15h) console.log(`   15:00 - ${judas15h.answer}`);
  if (judas17h) console.log(`   17:00 - ${judas17h.answer}`);
  if (judasEvening) console.log(`   19:30 - ${judasEvening.answer}`);
  console.log('');

  // Novena
  const novenaAnswer = responses.find(r => r.questionId === 'saint_judas_novena');
  if (novenaAnswer && Array.isArray(novenaAnswer.answer)) {
    console.log(`🙏 Novena São Judas: ${novenaAnswer.answer.length} dias`);
    novenaAnswer.answer.forEach((d: string) => console.log(`   - ${d}`));
  }
  console.log('');

  // Missas especiais
  const healingAnswer = responses.find(r => r.questionId === 'healing_liberation_mass');
  const sacredAnswer = responses.find(r => r.questionId === 'sacred_heart_mass');
  const immaculateAnswer = responses.find(r => r.questionId === 'immaculate_heart_mass');

  console.log('⛪ Missas Especiais:');
  if (healingAnswer) console.log(`   Cura e Libertação (02/10): ${healingAnswer.answer}`);
  if (sacredAnswer) console.log(`   Sagrado Coração (03/10): ${sacredAnswer.answer}`);
  if (immaculateAnswer) console.log(`   Imaculado Coração (04/10): ${immaculateAnswer.answer}`);
  console.log('');

  console.log('='.repeat(80));
  console.log('📊 RESUMO DA ANÁLISE');
  console.log('='.repeat(80));
  console.log('');
  console.log('Compare os números acima:');
  console.log('- Dados brutos do banco vs');
  console.log('- O que o sistema detectou');
  console.log('');
  console.log('Se houver diferença, o problema está no ResponseCompiler.');
  console.log('Se estiver igual, o problema pode estar no questionário ou nas respostas.');
}

main().catch(console.error);
