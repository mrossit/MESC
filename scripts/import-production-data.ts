import { neon } from '@neondatabase/serverless';

// Production database connection string
const PRODUCTION_DB = 'postgresql://neondb_owner:npg_3QKylioran9V@ep-lingering-firefly-afak5e6q.c-2.us-west-2.aws.neon.tech/neondb?sslmode=require';

// Development database connection string (from environment)
const DEVELOPMENT_DB = process.env.DATABASE_URL;

async function importProductionData() {
  console.log('🔄 Iniciando importação de dados da produção para desenvolvimento...\n');

  if (!DEVELOPMENT_DB) {
    throw new Error('❌ DATABASE_URL não encontrada no ambiente');
  }

  // Conectar aos bancos
  const prodSql = neon(PRODUCTION_DB);
  const devSql = neon(DEVELOPMENT_DB);

  try {
    // ============================================
    // 1. IMPORTAR USERS
    // ============================================
    console.log('📊 Importando tabela USERS...');
    
    // Buscar usuários da produção
    const prodUsers = await prodSql`
      SELECT * FROM users ORDER BY created_at
    `;
    console.log(`   ✓ ${prodUsers.length} usuários encontrados na produção`);

    // Limpar usuários do desenvolvimento (exceto alguns IDs especiais se necessário)
    await devSql`DELETE FROM questionnaire_responses`; // Limpar dependências primeiro
    await devSql`DELETE FROM users`;
    console.log('   ✓ Tabela users limpa no desenvolvimento');

    // Inserir usuários no desenvolvimento
    if (prodUsers.length > 0) {
      for (const user of prodUsers) {
        await devSql`
          INSERT INTO users (
            id, name, email, password_hash, phone, role, status, 
            schedule_display_name, formation_track, address, baptism_date,
            confirmation_date, has_communion_ministry_certification,
            ministry_certification_date, ministry_start_date,
            availability_notes, health_restrictions, preferred_mass_times,
            can_help_weekdays, serving_frequency_preference, notes,
            created_at, updated_at, last_login_at, must_change_password,
            receive_email_notifications, receive_sms_notifications,
            receive_whatsapp_notifications, receive_push_notifications
          ) VALUES (
            ${user.id}, ${user.name}, ${user.email}, ${user.password_hash},
            ${user.phone}, ${user.role}, ${user.status}, ${user.schedule_display_name},
            ${user.formation_track}, ${user.address}, ${user.baptism_date},
            ${user.confirmation_date}, ${user.has_communion_ministry_certification},
            ${user.ministry_certification_date}, ${user.ministry_start_date},
            ${user.availability_notes}, ${user.health_restrictions},
            ${user.preferred_mass_times}, ${user.can_help_weekdays},
            ${user.serving_frequency_preference}, ${user.notes},
            ${user.created_at}, ${user.updated_at}, ${user.last_login_at},
            ${user.must_change_password}, ${user.receive_email_notifications},
            ${user.receive_sms_notifications}, ${user.receive_whatsapp_notifications},
            ${user.receive_push_notifications}
          )
        `;
      }
      console.log(`   ✅ ${prodUsers.length} usuários importados\n`);
    }

    // ============================================
    // 2. IMPORTAR QUESTIONNAIRES
    // ============================================
    console.log('📊 Importando tabela QUESTIONNAIRES...');
    
    // Buscar questionários da produção
    const prodQuestionnaires = await prodSql`
      SELECT * FROM questionnaires ORDER BY created_at
    `;
    console.log(`   ✓ ${prodQuestionnaires.length} questionários encontrados na produção`);

    // Limpar questionários do desenvolvimento
    await devSql`DELETE FROM questionnaires`;
    console.log('   ✓ Tabela questionnaires limpa no desenvolvimento');

    // Inserir questionários no desenvolvimento
    if (prodQuestionnaires.length > 0) {
      for (const questionnaire of prodQuestionnaires) {
        await devSql`
          INSERT INTO questionnaires (
            id, title, description, questions, status, period_start,
            period_end, target_roles, created_by, created_at, updated_at
          ) VALUES (
            ${questionnaire.id}, ${questionnaire.title}, ${questionnaire.description},
            ${questionnaire.questions}, ${questionnaire.status}, ${questionnaire.period_start},
            ${questionnaire.period_end}, ${questionnaire.target_roles}, ${questionnaire.created_by},
            ${questionnaire.created_at}, ${questionnaire.updated_at}
          )
        `;
      }
      console.log(`   ✅ ${prodQuestionnaires.length} questionários importados\n`);
    }

    // ============================================
    // 3. IMPORTAR QUESTIONNAIRE_RESPONSES
    // ============================================
    console.log('📊 Importando tabela QUESTIONNAIRE_RESPONSES...');
    
    // Buscar respostas da produção
    const prodResponses = await prodSql`
      SELECT * FROM questionnaire_responses ORDER BY submitted_at
    `;
    console.log(`   ✓ ${prodResponses.length} respostas encontradas na produção`);

    // Inserir respostas no desenvolvimento (já limpamos antes ao deletar users)
    if (prodResponses.length > 0) {
      for (const response of prodResponses) {
        await devSql`
          INSERT INTO questionnaire_responses (
            id, questionnaire_id, user_id, responses, submitted_at,
            unmapped_responses, processing_warnings
          ) VALUES (
            ${response.id}, ${response.questionnaire_id}, ${response.user_id},
            ${response.responses}, ${response.submitted_at},
            ${response.unmapped_responses}, ${response.processing_warnings}
          )
        `;
      }
      console.log(`   ✅ ${prodResponses.length} respostas importadas\n`);
    }

    // ============================================
    // RESUMO
    // ============================================
    console.log('✅ IMPORTAÇÃO CONCLUÍDA COM SUCESSO!\n');
    console.log('📊 Resumo:');
    console.log(`   • Users: ${prodUsers.length}`);
    console.log(`   • Questionnaires: ${prodQuestionnaires.length}`);
    console.log(`   • Questionnaire Responses: ${prodResponses.length}\n`);
    console.log('🎯 Banco de desenvolvimento atualizado com dados da produção!');

  } catch (error) {
    console.error('❌ Erro durante a importação:', error);
    throw error;
  }
}

// Executar importação
importProductionData()
  .then(() => {
    console.log('\n✅ Script finalizado com sucesso!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Script finalizado com erro:', error);
    process.exit(1);
  });
