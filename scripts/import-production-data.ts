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
    // 0. LIMPAR TODAS AS TABELAS DEPENDENTES NO DESENVOLVIMENTO
    // ============================================
    console.log('🧹 Limpando banco de desenvolvimento...');
    
    // Função auxiliar para deletar com segurança (ignora se tabela não existe)
    const safeDelete = async (tableName: string) => {
      try {
        const query = `DELETE FROM ${tableName}`;
        await devSql(query);
        console.log(`   ✓ ${tableName} limpa`);
      } catch (error: any) {
        if (error.code === '42P01') {
          console.log(`   ⊘ ${tableName} não existe (ok)`);
        } else {
          throw error;
        }
      }
    };
    
    // Deletar na ordem correta (respeitando foreign keys)
    // Primeiro as tabelas que dependem de outras
    await safeDelete('notifications');
    await safeDelete('formation_progress');
    await safeDelete('substitution_requests');
    await safeDelete('schedule_ministers');
    await safeDelete('schedules');
    await safeDelete('questionnaire_responses');
    await safeDelete('questionnaires');
    await safeDelete('users');
    
    console.log('   ✅ Banco de desenvolvimento limpo\n');

    // ============================================
    // 1. IMPORTAR USERS
    // ============================================
    console.log('📊 Importando tabela USERS...');
    
    // Buscar usuários da produção
    const prodUsers = await prodSql`
      SELECT * FROM users ORDER BY created_at
    `;
    console.log(`   ✓ ${prodUsers.length} usuários encontrados na produção`);

    // Inserir usuários no desenvolvimento (apenas colunas que existem em ambos os bancos)
    if (prodUsers.length > 0) {
      for (const user of prodUsers) {
        await devSql`
          INSERT INTO users (
            id, name, email, password_hash, phone, role, status, 
            schedule_display_name, address, baptism_date,
            confirmation_date, ministry_start_date,
            observations, created_at, updated_at, last_login,
            whatsapp, join_date
          ) VALUES (
            ${user.id}, ${user.name}, ${user.email}, ${user.password_hash},
            ${user.phone}, ${user.role}, ${user.status}, ${user.schedule_display_name},
            ${user.address}, ${user.baptism_date},
            ${user.confirmation_date}, ${user.ministry_start_date},
            ${user.notes || null}, ${user.created_at}, ${user.updated_at}, ${user.last_login_at || null},
            ${user.phone || null}, ${user.created_at}
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

    // Inserir questionários no desenvolvimento (apenas colunas que existem em ambos)
    if (prodQuestionnaires.length > 0) {
      for (const questionnaire of prodQuestionnaires) {
        // O campo questions já vem como objeto JSONB do neon
        // Vamos inserir diretamente como JSON string
        const questionsJson = typeof questionnaire.questions === 'string'
          ? questionnaire.questions
          : JSON.stringify(questionnaire.questions);
        
        // Extrair mês e ano do título (ex: "Questionário Novembro 2025")
        const monthNames: { [key: string]: number } = {
          'janeiro': 1, 'fevereiro': 2, 'março': 3, 'abril': 4,
          'maio': 5, 'junho': 6, 'julho': 7, 'agosto': 8,
          'setembro': 9, 'outubro': 10, 'novembro': 11, 'dezembro': 12
        };
        
        const titleLower = questionnaire.title.toLowerCase();
        let month = null;
        let year = null;
        
        // Procurar pelo nome do mês no título
        for (const [monthName, monthNum] of Object.entries(monthNames)) {
          if (titleLower.includes(monthName)) {
            month = monthNum;
            break;
          }
        }
        
        // Extrair ano do título (procura por 4 dígitos)
        const yearMatch = questionnaire.title.match(/\d{4}/);
        if (yearMatch) {
          year = parseInt(yearMatch[0]);
        }
        
        // Fallback: usar data de criação se não encontrar no título
        if (!month || !year) {
          const createdAt = new Date(questionnaire.created_at);
          month = month || (createdAt.getMonth() + 1);
          year = year || createdAt.getFullYear();
          console.log(`   ⚠️  Usando fallback para "${questionnaire.title}": mês=${month}, ano=${year}`);
        } else {
          console.log(`   ✓ "${questionnaire.title}" → mês=${month}, ano=${year}`);
        }
          
        await devSql`
          INSERT INTO questionnaires (
            id, title, description, questions, status, month, year, created_at, updated_at
          ) VALUES (
            ${questionnaire.id}, 
            ${questionnaire.title}, 
            ${questionnaire.description},
            ${questionsJson}::jsonb, 
            ${questionnaire.status},
            ${month},
            ${year},
            ${questionnaire.created_at}, 
            ${questionnaire.updated_at}
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
        // Converter campos JSONB para string se necessário
        const responsesJson = typeof response.responses === 'string'
          ? response.responses
          : JSON.stringify(response.responses);

        const unmappedJson = response.unmapped_responses
          ? (typeof response.unmapped_responses === 'string'
              ? response.unmapped_responses
              : JSON.stringify(response.unmapped_responses))
          : null;

        const warningsJson = response.processing_warnings
          ? (typeof response.processing_warnings === 'string'
              ? response.processing_warnings
              : JSON.stringify(response.processing_warnings))
          : null;

        await devSql`
          INSERT INTO questionnaire_responses (
            id, questionnaire_id, user_id, responses, submitted_at,
            unmapped_responses, processing_warnings
          ) VALUES (
            ${response.id}, ${response.questionnaire_id}, ${response.user_id},
            ${responsesJson}::jsonb, ${response.submitted_at},
            ${unmappedJson}::jsonb, ${warningsJson}::jsonb
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
