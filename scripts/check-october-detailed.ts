import { db } from '../server/db.js';
import { sql } from 'drizzle-orm';
import { questionnaires, questionnaireResponses, users } from '../shared/schema.js';

async function checkOctoberDetailed() {
  console.log('\n🔍 VERIFICAÇÃO DETALHADA DE OUTUBRO/2025\n');
  console.log('=' .repeat(80));

  try {
    // 1. Informações da conexão
    console.log('📡 CONEXÃO:');
    console.log('-'.repeat(40));
    console.log(`NODE_ENV: ${process.env.NODE_ENV}`);
    console.log(`DATABASE_URL existe: ${!!process.env.DATABASE_URL}`);

    if (process.env.DATABASE_URL) {
      const urlMatch = process.env.DATABASE_URL.match(/postgresql:\/\/([^:]+):.*@([^\/]+)\/([^?]+)/);
      if (urlMatch) {
        console.log(`Host: ${urlMatch[2]}`);
        console.log(`Database: ${urlMatch[3]}`);
        console.log(`User: ${urlMatch[1]}`);
      }
    }

    // 2. Verificar conexão
    const testConnection = await db.execute(sql`SELECT NOW() as current_time`);
    console.log(`\n✅ Conectado! Hora do servidor: ${testConnection.rows[0]?.current_time}`);

    // 3. Buscar TODOS os questionários sem filtro
    console.log('\n\n📋 TODOS OS QUESTIONÁRIOS:');
    console.log('-'.repeat(40));

    const allQuestionnaires = await db.execute(sql`
      SELECT * FROM questionnaires
      ORDER BY year DESC, month DESC
    `);

    if (allQuestionnaires.rows.length === 0) {
      console.log('❌ Nenhum questionário encontrado');

      // Verificar se a tabela existe
      const tableExists = await db.execute(sql`
        SELECT EXISTS (
          SELECT FROM information_schema.tables
          WHERE table_schema = 'public'
          AND table_name = 'questionnaires'
        )
      `);

      console.log(`Tabela questionnaires existe: ${tableExists.rows[0]?.exists}`);
    } else {
      for (const quest of allQuestionnaires.rows) {
        console.log(`\n📅 ${quest.month}/${quest.year}`);
        console.log(`   ID: ${quest.id}`);
        console.log(`   Status: ${quest.status}`);
        console.log(`   Criado: ${quest.created_at}`);
      }
    }

    // 4. Buscar TODAS as respostas sem filtro
    console.log('\n\n📝 TODAS AS RESPOSTAS:');
    console.log('-'.repeat(40));

    const allResponses = await db.execute(sql`
      SELECT
        qr.*,
        u.name as user_name,
        u.email as user_email,
        q.month,
        q.year
      FROM questionnaire_responses qr
      LEFT JOIN users u ON u.id = qr.user_id
      LEFT JOIN questionnaires q ON q.id = qr.questionnaire_id
      ORDER BY qr.submitted_at DESC
    `);

    if (allResponses.rows.length === 0) {
      console.log('❌ Nenhuma resposta encontrada');

      // Verificar se a tabela existe
      const tableExists = await db.execute(sql`
        SELECT EXISTS (
          SELECT FROM information_schema.tables
          WHERE table_schema = 'public'
          AND table_name = 'questionnaire_responses'
        )
      `);

      console.log(`Tabela questionnaire_responses existe: ${tableExists.rows[0]?.exists}`);
    } else {
      console.log(`\n✅ Total de respostas: ${allResponses.rows.length}`);

      // Mostrar primeiras 5 respostas
      for (const response of allResponses.rows.slice(0, 5)) {
        console.log(`\n👤 ${response.user_name} (${response.user_email})`);
        console.log(`   Questionário: ${response.month}/${response.year}`);
        console.log(`   Domingos: ${JSON.stringify(response.available_sundays)}`);
        console.log(`   Horários: ${JSON.stringify(response.preferred_mass_times)}`);
        console.log(`   Missas diárias: ${JSON.stringify(response.daily_mass_availability)}`);
      }

      if (allResponses.rows.length > 5) {
        console.log(`\n... e mais ${allResponses.rows.length - 5} respostas`);
      }
    }

    // 5. Buscar especificamente por outubro 2025
    console.log('\n\n🎯 BUSCANDO OUTUBRO/2025:');
    console.log('-'.repeat(40));

    const octoberQuest = await db.execute(sql`
      SELECT * FROM questionnaires
      WHERE month = 10 AND year = 2025
    `);

    if (octoberQuest.rows.length > 0) {
      console.log('✅ Questionário de outubro/2025 encontrado!');
      const questId = octoberQuest.rows[0].id;

      const octoberResponses = await db.execute(sql`
        SELECT COUNT(*) as total
        FROM questionnaire_responses
        WHERE questionnaire_id = ${questId}
      `);

      console.log(`   Total de respostas: ${octoberResponses.rows[0]?.total}`);
    } else {
      console.log('❌ Não há questionário para outubro/2025');

      // Tentar outubro/2024
      const october2024 = await db.execute(sql`
        SELECT * FROM questionnaires
        WHERE month = 10 AND year = 2024
      `);

      if (october2024.rows.length > 0) {
        console.log('\n📌 Mas encontrei questionário de outubro/2024!');
        const questId = october2024.rows[0].id;

        const responses2024 = await db.execute(sql`
          SELECT COUNT(*) as total
          FROM questionnaire_responses
          WHERE questionnaire_id = ${questId}
        `);

        console.log(`   Total de respostas: ${responses2024.rows[0]?.total}`);
      }
    }

    // 6. Procurar pela Roberta
    console.log('\n\n🔍 BUSCANDO ROBERTA:');
    console.log('-'.repeat(40));

    const robertaSearch = await db.execute(sql`
      SELECT
        u.*,
        qr.available_sundays,
        qr.preferred_mass_times,
        qr.daily_mass_availability,
        q.month,
        q.year
      FROM users u
      LEFT JOIN questionnaire_responses qr ON qr.user_id = u.id
      LEFT JOIN questionnaires q ON q.id = qr.questionnaire_id
      WHERE u.email LIKE '%roberta%'
         OR u.name ILIKE '%roberta%'
    `);

    if (robertaSearch.rows.length > 0) {
      for (const roberta of robertaSearch.rows) {
        console.log(`\n👤 ${roberta.name}`);
        console.log(`   Email: ${roberta.email}`);
        console.log(`   ID: ${roberta.id}`);
        if (roberta.month && roberta.year) {
          console.log(`   Respondeu: ${roberta.month}/${roberta.year}`);
          console.log(`   Domingos: ${JSON.stringify(roberta.available_sundays)}`);
          console.log(`   Horários: ${JSON.stringify(roberta.preferred_mass_times)}`);
        } else {
          console.log(`   ❌ Sem resposta de questionário`);
        }
      }
    } else {
      console.log('❌ Usuária Roberta não encontrada');
    }

    // 7. Estatísticas finais
    console.log('\n\n📊 RESUMO FINAL:');
    console.log('=' .repeat(80));

    const stats = await db.execute(sql`
      SELECT
        (SELECT COUNT(*) FROM users) as total_users,
        (SELECT COUNT(*) FROM questionnaires) as total_questionnaires,
        (SELECT COUNT(*) FROM questionnaire_responses) as total_responses,
        (SELECT COUNT(*) FROM schedules) as total_schedules
    `);

    const s = stats.rows[0];
    console.log(`\nUsuários: ${s?.total_users || 0}`);
    console.log(`Questionários: ${s?.total_questionnaires || 0}`);
    console.log(`Respostas: ${s?.total_responses || 0}`);
    console.log(`Escalas: ${s?.total_schedules || 0}`);

    if (s?.total_responses > 0) {
      console.log('\n✅ HÁ RESPOSTAS NO BANCO!');
      console.log('📍 Se não estão aparecendo, verifique:');
      console.log('   1. Se o mês/ano está correto');
      console.log('   2. Se a lógica de filtragem está funcionando');
      console.log('   3. Se as respostas estão no formato esperado');
    }

  } catch (error) {
    console.error('\n❌ Erro:', error);
    console.log('\n💡 Verifique:');
    console.log('   1. Se DATABASE_URL está configurada corretamente');
    console.log('   2. Se o banco está acessível');
    console.log('   3. Se as tabelas foram criadas (npm run db:migrate)');
  }

  process.exit(0);
}

checkOctoberDetailed();