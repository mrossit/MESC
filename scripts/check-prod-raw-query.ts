import { db } from '../server/db.js';
import { sql } from 'drizzle-orm';

async function checkProdRawQuery() {
  console.log('\n🔍 CONSULTA DIRETA NO BANCO DE PRODUÇÃO\n');
  console.log('=' .repeat(80));

  try {
    // 1. Verificar ambiente
    console.log('📡 AMBIENTE:');
    console.log(`NODE_ENV: ${process.env.NODE_ENV}`);

    // 2. Query direta sem usar o schema do Drizzle
    console.log('\n\n📋 CONSULTA RAW - QUESTIONNAIRES:');
    console.log('-'.repeat(40));

    try {
      const questRaw = await db.execute(sql`
        SELECT
          id,
          month,
          year,
          status,
          created_at
        FROM questionnaires
        LIMIT 10
      `);

      console.log(`Registros encontrados: ${questRaw.rows.length}`);

      if (questRaw.rows.length > 0) {
        for (const q of questRaw.rows) {
          console.log(`\n📅 ${q.month}/${q.year}`);
          console.log(`   ID: ${q.id}`);
          console.log(`   Status: ${q.status}`);
        }
      }
    } catch (err) {
      console.log('Erro na query questionnaires:', err);
    }

    // 3. Query nas respostas
    console.log('\n\n📝 CONSULTA RAW - QUESTIONNAIRE_RESPONSES:');
    console.log('-'.repeat(40));

    try {
      const respRaw = await db.execute(sql`
        SELECT
          id,
          questionnaire_id,
          user_id,
          available_sundays,
          preferred_mass_times,
          submitted_at
        FROM questionnaire_responses
        LIMIT 10
      `);

      console.log(`Registros encontrados: ${respRaw.rows.length}`);

      if (respRaw.rows.length > 0) {
        for (const r of respRaw.rows) {
          console.log(`\nResposta ID: ${r.id}`);
          console.log(`   Questionário: ${r.questionnaire_id}`);
          console.log(`   Usuário: ${r.user_id}`);
          console.log(`   Domingos: ${JSON.stringify(r.available_sundays)}`);
        }
      }
    } catch (err) {
      console.log('Erro na query questionnaire_responses:', err);
    }

    // 4. Verificar se há algum schema diferente
    console.log('\n\n🗂️ VERIFICANDO SCHEMAS:');
    console.log('-'.repeat(40));

    const schemas = await db.execute(sql`
      SELECT DISTINCT table_schema, table_name
      FROM information_schema.tables
      WHERE table_name IN ('questionnaires', 'questionnaire_responses')
      ORDER BY table_schema, table_name
    `);

    for (const s of schemas.rows) {
      console.log(`   ${s.table_schema}.${s.table_name}`);
    }

    // 5. Contar registros diretamente
    console.log('\n\n📊 CONTAGEM DIRETA:');
    console.log('-'.repeat(40));

    try {
      const counts = await db.execute(sql`
        SELECT
          'questionnaires' as table_name,
          COUNT(*) as count
        FROM questionnaires
        UNION ALL
        SELECT
          'questionnaire_responses' as table_name,
          COUNT(*) as count
        FROM questionnaire_responses
        UNION ALL
        SELECT
          'users' as table_name,
          COUNT(*) as count
        FROM users
      `);

      for (const c of counts.rows) {
        console.log(`   ${c.table_name}: ${c.count} registros`);
      }
    } catch (err) {
      console.log('Erro na contagem:', err);
    }

    // 6. Verificar se há views ou materialized views
    console.log('\n\n👁️ VERIFICANDO VIEWS:');
    console.log('-'.repeat(40));

    const views = await db.execute(sql`
      SELECT table_name, table_type
      FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_type IN ('VIEW', 'MATERIALIZED VIEW')
    `);

    if (views.rows.length > 0) {
      for (const v of views.rows) {
        console.log(`   ${v.table_name} (${v.table_type})`);
      }
    } else {
      console.log('   Nenhuma view encontrada');
    }

    // 7. Tentar com SELECT *
    console.log('\n\n🔍 TENTANDO SELECT * FROM questionnaires:');
    console.log('-'.repeat(40));

    try {
      const allQuest = await db.execute(sql`
        SELECT * FROM questionnaires
      `);

      console.log(`Total de registros: ${allQuest.rows.length}`);

      if (allQuest.rows.length > 0) {
        console.log('\n✅ HÁ DADOS NA TABELA!');
        console.log('Primeiro registro:', JSON.stringify(allQuest.rows[0], null, 2));
      } else {
        console.log('❌ Tabela vazia');
      }
    } catch (err) {
      console.log('Erro:', err);
    }

    // 8. Verificar permissões
    console.log('\n\n🔐 VERIFICANDO PERMISSÕES:');
    console.log('-'.repeat(40));

    const permissions = await db.execute(sql`
      SELECT
        table_name,
        privilege_type
      FROM information_schema.table_privileges
      WHERE grantee = current_user
        AND table_name IN ('questionnaires', 'questionnaire_responses')
    `);

    if (permissions.rows.length > 0) {
      const perms = {};
      for (const p of permissions.rows) {
        if (!perms[p.table_name]) perms[p.table_name] = [];
        perms[p.table_name].push(p.privilege_type);
      }

      for (const [table, privs] of Object.entries(perms)) {
        console.log(`   ${table}: ${privs.join(', ')}`);
      }
    } else {
      console.log('   Usando permissões padrão do owner');
    }

    // 9. Informações finais
    console.log('\n\n💡 INFORMAÇÕES DO BANCO:');
    console.log('-'.repeat(40));

    const dbInfo = await db.execute(sql`
      SELECT
        current_database() as db,
        current_user as user,
        current_schema() as schema,
        inet_server_addr() as server,
        version() as version
    `);

    const info = dbInfo.rows[0];
    console.log(`   Database: ${info.db}`);
    console.log(`   User: ${info.user}`);
    console.log(`   Schema: ${info.schema}`);
    console.log(`   Server: ${info.server}`);
    console.log(`   Version: ${info.version.split(',')[0]}`);

  } catch (error) {
    console.error('\n❌ Erro geral:', error);
  }

  process.exit(0);
}

checkProdRawQuery();