import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { questionnaires, questionnaireResponses, users } from '../shared/schema';
import { eq, and, sql } from 'drizzle-orm';

// Conectar ao banco de PRODUÇÃO
const client = postgres('postgresql://neondb_owner:npg_3QKylioran9V@ep-lingering-firefly-afak5e6q.c-2.us-west-2.aws.neon.tech/neondb?sslmode=require');
const db = drizzle(client);

async function debugMariaIsabelResponse() {
  console.log('🔍 DEBUG: Resposta da Maria Isabel - Novembro 2025\n');

  try {
    // 1. Buscar questionário de Novembro 2025
    const [questionario] = await db
      .select()
      .from(questionnaires)
      .where(and(eq(questionnaires.year, 2025), eq(questionnaires.month, 11)))
      .limit(1);

    if (!questionario) {
      console.log('❌ Questionário não encontrado');
      return;
    }

    console.log(`✅ Questionário ID: ${questionario.id}\n`);

    // 2. Buscar resposta da Maria Isabel
    const [mariaUser] = await db
      .select()
      .from(users)
      .where(sql`LOWER(${users.name}) LIKE '%maria%isabel%'`)
      .limit(1);

    if (!mariaUser) {
      console.log('❌ Maria Isabel não encontrada');
      return;
    }

    console.log(`✅ Maria Isabel encontrada:`);
    console.log(`   ID: ${mariaUser.id}`);
    console.log(`   Nome: ${mariaUser.name}`);
    console.log(`   Email: ${mariaUser.email}\n`);

    // 3. Buscar resposta dela
    const [response] = await db
      .select()
      .from(questionnaireResponses)
      .where(
        and(
          eq(questionnaireResponses.userId, mariaUser.id),
          eq(questionnaireResponses.questionnaireId, questionario.id)
        )
      )
      .limit(1);

    if (!response) {
      console.log('❌ Maria Isabel não respondeu este questionário');
      return;
    }

    console.log(`✅ Resposta encontrada:`);
    console.log(`   Response ID: ${response.id}`);
    console.log(`   Respondido em: ${response.submittedAt}\n`);

    // 4. Analisar campo RESPONSES (JSONB)
    console.log('📋 CAMPO RESPONSES (formato bruto do banco):');
    console.log('─'.repeat(80));
    
    let parsedResponses;
    try {
      parsedResponses = typeof response.responses === 'string' 
        ? JSON.parse(response.responses) 
        : response.responses;
      console.log(JSON.stringify(parsedResponses, null, 2));
    } catch (e) {
      console.log('❌ Erro ao fazer parse de responses:', e);
      console.log('Raw value:', response.responses);
    }
    
    console.log('─'.repeat(80));
    console.log('');

    // 5. Analisar formato v2.0
    if (parsedResponses?.format_version === '2.0') {
      console.log('✅ Formato V2.0 detectado!\n');
      
      // Weekdays
      console.log('📅 WEEKDAYS (disponibilidade dias da semana):');
      if (parsedResponses.weekdays) {
        console.log('   Segunda:', parsedResponses.weekdays.monday);
        console.log('   Terça:', parsedResponses.weekdays.tuesday);
        console.log('   Quarta:', parsedResponses.weekdays.wednesday);
        console.log('   Quinta:', parsedResponses.weekdays.thursday);
        console.log('   Sexta:', parsedResponses.weekdays.friday);
      } else {
        console.log('   ⚠️ Weekdays não presente');
      }
      console.log('');

      // Masses
      console.log('⛪ MASSES (missas de domingo):');
      if (parsedResponses.masses && Object.keys(parsedResponses.masses).length > 0) {
        Object.entries(parsedResponses.masses).forEach(([date, times]: [string, any]) => {
          console.log(`   ${date}:`);
          Object.entries(times).forEach(([time, available]) => {
            console.log(`      ${time}: ${available}`);
          });
        });
      } else {
        console.log('   ⚠️ Nenhuma missa de domingo marcada');
      }
      console.log('');

      // Special Events
      console.log('🎉 SPECIAL EVENTS:');
      if (parsedResponses.special_events && Object.keys(parsedResponses.special_events).length > 0) {
        console.log(JSON.stringify(parsedResponses.special_events, null, 2));
      } else {
        console.log('   ⚠️ Nenhum evento especial');
      }
      console.log('');

    } else if (Array.isArray(parsedResponses)) {
      console.log('⚠️ Formato LEGADO (array) detectado!\n');
      
      // Procurar por daily_mass_availability e daily_mass_days
      const dailyMassQ = parsedResponses.find((r: any) => r.questionId === 'daily_mass_availability');
      const dailyMassDaysQ = parsedResponses.find((r: any) => r.questionId === 'daily_mass_days');
      
      console.log('📅 Pergunta: daily_mass_availability');
      if (dailyMassQ) {
        console.log('   QuestionId:', dailyMassQ.questionId);
        console.log('   Answer:', JSON.stringify(dailyMassQ.answer, null, 2));
      } else {
        console.log('   ❌ Não encontrada');
      }
      console.log('');

      console.log('📅 Pergunta: daily_mass_days');
      if (dailyMassDaysQ) {
        console.log('   QuestionId:', dailyMassDaysQ.questionId);
        console.log('   Answer:', JSON.stringify(dailyMassDaysQ.answer, null, 2));
      } else {
        console.log('   ❌ Não encontrada');
      }
      console.log('');
    }

    // 6. Campos extraídos (dailyMassAvailability, etc)
    console.log('📊 CAMPOS EXTRAÍDOS (colunas do banco):');
    console.log('─'.repeat(80));
    console.log('availableSundays:', response.availableSundays);
    console.log('preferredMassTimes:', response.preferredMassTimes);
    console.log('alternativeTimes:', response.alternativeTimes);
    console.log('dailyMassAvailability:', response.dailyMassAvailability);
    console.log('specialEvents:', response.specialEvents);
    console.log('canSubstitute:', response.canSubstitute);
    console.log('notes:', response.notes);
    console.log('─'.repeat(80));
    console.log('');

    // 7. Diagnóstico
    console.log('🔬 DIAGNÓSTICO:');
    console.log('─'.repeat(80));
    
    if (!response.dailyMassAvailability) {
      console.log('❌ PROBLEMA: Campo dailyMassAvailability está NULL');
      
      if (parsedResponses?.weekdays) {
        const hasAnyWeekday = Object.values(parsedResponses.weekdays).some(v => v === true);
        if (hasAnyWeekday) {
          console.log('⚠️  Mas weekdays tem dados no JSONB responses!');
          console.log('   → Isso indica que extractStructuredData() não está funcionando corretamente');
        } else {
          console.log('✓  Weekdays está false em todos os dias (usuária não pode em dias da semana)');
        }
      } else {
        console.log('⚠️  Weekdays não existe no campo responses');
        console.log('   → Dados não foram salvos/parseados corretamente');
      }
    } else {
      console.log('✅ Campo dailyMassAvailability está preenchido');
    }
    console.log('─'.repeat(80));

  } catch (error: any) {
    console.error('❌ Erro:', error.message);
  } finally {
    await client.end();
  }
}

debugMariaIsabelResponse();
