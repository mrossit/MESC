import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { questionnaires, questionnaireResponses, users } from '../shared/schema';
import { eq, and, sql } from 'drizzle-orm';

// Conectar ao banco de PRODUÇÃO
const client = postgres('postgresql://neondb_owner:npg_3QKylioran9V@ep-lingering-firefly-afak5e6q.c-2.us-west-2.aws.neon.tech/neondb?sslmode=require');
const db = drizzle(client);

async function queryNovembro2025() {
  console.log('🔍 Consultando banco de PRODUÇÃO - Novembro 2025\n');

  try {
    // 1. Buscar questionário de Novembro 2025
    console.log('1️⃣ Buscando questionário de Novembro 2025...');
    const [questionario] = await db
      .select()
      .from(questionnaires)
      .where(and(eq(questionnaires.year, 2025), eq(questionnaires.month, 11)))
      .limit(1);

    if (!questionario) {
      console.log('❌ Nenhum questionário encontrado para Novembro 2025');
      return;
    }

    console.log(`✅ Questionário encontrado: ${questionario.title}`);
    console.log(`   ID: ${questionario.id}`);
    console.log(`   Status: ${questionario.status}`);
    console.log(`   Criado em: ${questionario.createdAt}\n`);

    // 2. Contar total de respostas
    console.log('2️⃣ Contando respostas...');
    const respostas = await db
      .select()
      .from(questionnaireResponses)
      .where(eq(questionnaireResponses.questionnaireId, questionario.id));

    console.log(`✅ Total de respostas: ${respostas.length}\n`);

    if (respostas.length === 0) {
      console.log('❌ Nenhuma resposta encontrada ainda.');
      return;
    }

    // 3. Buscar especificamente Maria Isabel
    console.log('3️⃣ Buscando Maria Isabel...');
    const mariaIsabelResponse = await db
      .select({
        name: users.name,
        email: users.email,
        dailyMassAvailability: questionnaireResponses.dailyMassAvailability,
        responses: questionnaireResponses.responses,
        submittedAt: questionnaireResponses.submittedAt
      })
      .from(questionnaireResponses)
      .innerJoin(users, eq(questionnaireResponses.userId, users.id))
      .where(
        and(
          eq(questionnaireResponses.questionnaireId, questionario.id),
          sql`LOWER(${users.name}) LIKE '%maria%isabel%'`
        )
      );

    if (mariaIsabelResponse.length > 0) {
      const maria = mariaIsabelResponse[0];
      console.log(`✅ Maria Isabel encontrada!`);
      console.log(`   Nome completo: ${maria.name}`);
      console.log(`   Email: ${maria.email}`);
      console.log(`   Respondeu em: ${maria.submittedAt}`);
      console.log(`   Disponibilidade dias da semana:`, maria.dailyMassAvailability);
      
      const responses = maria.responses as any;
      if (responses?.weekdays) {
        console.log(`   Weekdays detalhado:`, responses.weekdays);
      }
      console.log('');
    } else {
      console.log('❌ Maria Isabel não respondeu ainda.\n');
    }

    // 4. Estatísticas gerais de disponibilidade para dias da semana
    console.log('4️⃣ Estatísticas de disponibilidade para missas diárias...');
    
    let segunda = 0, terca = 0, quarta = 0, quinta = 0, sexta = 0;
    
    for (const resp of respostas) {
      const data = resp.responses as any;
      if (data?.weekdays) {
        if (data.weekdays.monday === true) segunda++;
        if (data.weekdays.tuesday === true) terca++;
        if (data.weekdays.wednesday === true) quarta++;
        if (data.weekdays.thursday === true) quinta++;
        if (data.weekdays.friday === true) sexta++;
      }
    }

    console.log(`   Segunda-feira: ${segunda} ministros`);
    console.log(`   Terça-feira: ${terca} ministros`);
    console.log(`   Quarta-feira: ${quarta} ministros`);
    console.log(`   Quinta-feira: ${quinta} ministros`);
    console.log(`   Sexta-feira: ${sexta} ministros\n`);

    // 5. Listar ministros com disponibilidade parcial
    console.log('5️⃣ Ministros com disponibilidade PARCIAL para dias da semana:');
    const parciais = await db
      .select({
        name: users.name,
        responses: questionnaireResponses.responses
      })
      .from(questionnaireResponses)
      .innerJoin(users, eq(questionnaireResponses.userId, users.id))
      .where(eq(questionnaireResponses.questionnaireId, questionario.id));

    let encontrouParciais = false;
    for (const p of parciais) {
      const data = p.responses as any;
      if (data?.weekdays) {
        const dias = data.weekdays;
        const total = [dias.monday, dias.tuesday, dias.wednesday, dias.thursday, dias.friday]
          .filter(d => d === true).length;
        
        // Se tem entre 1 e 4 dias marcados (parcial)
        if (total > 0 && total < 5) {
          encontrouParciais = true;
          const diasDisponiveis = [];
          if (dias.monday) diasDisponiveis.push('SEG');
          if (dias.tuesday) diasDisponiveis.push('TER');
          if (dias.wednesday) diasDisponiveis.push('QUA');
          if (dias.thursday) diasDisponiveis.push('QUI');
          if (dias.friday) diasDisponiveis.push('SEX');
          
          console.log(`   ✓ ${p.name}: ${diasDisponiveis.join(', ')}`);
        }
      }
    }
    
    if (!encontrouParciais) {
      console.log('   ⚠️ Nenhum ministro com disponibilidade parcial encontrado.');
    }

  } catch (error: any) {
    console.error('❌ Erro ao consultar banco:', error.message);
  } finally {
    await client.end();
  }
}

queryNovembro2025();
