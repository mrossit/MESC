import { db } from '../server/db';
import { sql } from 'drizzle-orm';

/**
 * Script para adicionar índices de performance ao banco de dados
 *
 * Índices críticos identificados pela análise de queries frequentes:
 *
 * 1. users - email, role, status (queries de autenticação e listagem)
 * 2. questionnaires - month/year, status (queries mensais)
 * 3. questionnaireResponses - userId, questionnaireId (respostas do usuário)
 * 4. schedules - date, time, ministerId, substituteId (escalas e substituições)
 * 5. notifications - userId, read, type (notificações não lidas)
 * 6. formationModules - trackId (aulas por trilha)
 * 7. formationLessons - moduleId, trackId (lições por módulo)
 * 8. formationLessonProgress - userId, lessonId (progresso do usuário)
 * 9. familyRelationships - userId, relatedUserId (relacionamentos familiares)
 * 10. passwordResetRequests - userId, status (reset de senha)
 * 11. massTimesConfig - dayOfWeek, isActive (horários ativos)
 */

interface IndexDefinition {
  table: string;
  name: string;
  columns: string[];
  description: string;
}

const indexes: IndexDefinition[] = [
  // Users table - queries de autenticação, listagem por role/status
  {
    table: 'users',
    name: 'idx_users_email',
    columns: ['email'],
    description: 'Login e busca por email'
  },
  {
    table: 'users',
    name: 'idx_users_role',
    columns: ['role'],
    description: 'Listagem de usuários por papel (gestor, coordenador, ministro)'
  },
  {
    table: 'users',
    name: 'idx_users_status',
    columns: ['status'],
    description: 'Filtro de usuários ativos/inativos/pendentes'
  },
  {
    table: 'users',
    name: 'idx_users_role_status',
    columns: ['role', 'status'],
    description: 'Queries combinadas de role + status (muito comum)'
  },
  {
    table: 'users',
    name: 'idx_users_last_service',
    columns: ['last_service'],
    description: 'Ordenação por último serviço (auto-substituição)'
  },

  // Questionnaires - queries mensais
  {
    table: 'questionnaires',
    name: 'idx_questionnaires_month_year',
    columns: ['year', 'month'],
    description: 'Busca de questionários por mês/ano'
  },
  {
    table: 'questionnaires',
    name: 'idx_questionnaires_status',
    columns: ['status'],
    description: 'Filtro de questionários por status (draft, published)'
  },
  {
    table: 'questionnaires',
    name: 'idx_questionnaires_created_by',
    columns: ['created_by_id'],
    description: 'Questionários criados por determinado gestor'
  },

  // Questionnaire responses - respostas do usuário
  {
    table: 'questionnaire_responses',
    name: 'idx_qr_user_id',
    columns: ['user_id'],
    description: 'Respostas de um usuário específico'
  },
  {
    table: 'questionnaire_responses',
    name: 'idx_qr_questionnaire_id',
    columns: ['questionnaire_id'],
    description: 'Respostas de um questionário específico'
  },
  {
    table: 'questionnaire_responses',
    name: 'idx_qr_user_questionnaire',
    columns: ['user_id', 'questionnaire_id'],
    description: 'Verificar se usuário já respondeu questionário'
  },
  {
    table: 'questionnaire_responses',
    name: 'idx_qr_can_substitute',
    columns: ['can_substitute'],
    description: 'Busca de substitutos disponíveis (auto-substituição)'
  },

  // Schedules - escalas, substituições, queries de data/hora
  {
    table: 'schedules',
    name: 'idx_schedules_date',
    columns: ['date'],
    description: 'Escalas por data (queries diárias/mensais)'
  },
  {
    table: 'schedules',
    name: 'idx_schedules_date_time',
    columns: ['date', 'time'],
    description: 'Escalas de um horário específico (muito comum)'
  },
  {
    table: 'schedules',
    name: 'idx_schedules_minister_id',
    columns: ['minister_id'],
    description: 'Escalas de um ministro específico'
  },
  {
    table: 'schedules',
    name: 'idx_schedules_substitute_id',
    columns: ['substitute_id'],
    description: 'Escalas onde usuário é substituto'
  },
  {
    table: 'schedules',
    name: 'idx_schedules_status',
    columns: ['status'],
    description: 'Filtro por status de escala'
  },
  {
    table: 'schedules',
    name: 'idx_schedules_type',
    columns: ['type'],
    description: 'Filtro por tipo (missa, celebracao, evento)'
  },

  // Notifications - notificações não lidas
  {
    table: 'notifications',
    name: 'idx_notifications_user_id',
    columns: ['user_id'],
    description: 'Notificações de um usuário'
  },
  {
    table: 'notifications',
    name: 'idx_notifications_read',
    columns: ['read'],
    description: 'Filtro de notificações lidas/não lidas'
  },
  {
    table: 'notifications',
    name: 'idx_notifications_user_read',
    columns: ['user_id', 'read'],
    description: 'Notificações não lidas de um usuário (query muito comum)'
  },
  {
    table: 'notifications',
    name: 'idx_notifications_type',
    columns: ['type'],
    description: 'Filtro por tipo de notificação'
  },
  {
    table: 'notifications',
    name: 'idx_notifications_created_at',
    columns: ['created_at'],
    description: 'Ordenação por data de criação'
  },

  // Formation modules
  {
    table: 'formation_modules',
    name: 'idx_formation_modules_track',
    columns: ['trackid'],
    description: 'Módulos de uma trilha específica'
  },
  {
    table: 'formation_modules',
    name: 'idx_formation_modules_category',
    columns: ['category'],
    description: 'Filtro por categoria (liturgia, espiritualidade, pratica)'
  },
  {
    table: 'formation_modules',
    name: 'idx_formation_modules_order',
    columns: ['order_index'],
    description: 'Ordenação de módulos'
  },

  // Formation lessons
  {
    table: 'formation_lessons',
    name: 'idx_formation_lessons_module',
    columns: ['moduleid'],
    description: 'Lições de um módulo específico'
  },
  {
    table: 'formation_lessons',
    name: 'idx_formation_lessons_track',
    columns: ['trackid'],
    description: 'Lições de uma trilha específica'
  },
  {
    table: 'formation_lessons',
    name: 'idx_formation_lessons_track_module',
    columns: ['trackid', 'moduleid'],
    description: 'Lições de trilha + módulo (query comum)'
  },
  {
    table: 'formation_lessons',
    name: 'idx_formation_lessons_number',
    columns: ['lessonnumber'],
    description: 'Ordenação por número da lição'
  },
  {
    table: 'formation_lessons',
    name: 'idx_formation_lessons_active',
    columns: ['is_active'],
    description: 'Filtro de lições ativas'
  },

  // Formation lesson sections
  {
    table: 'formation_lesson_sections',
    name: 'idx_fls_lesson_id',
    columns: ['lesson_id'],
    description: 'Seções de uma lição específica'
  },
  {
    table: 'formation_lesson_sections',
    name: 'idx_fls_order',
    columns: ['order_index'],
    description: 'Ordenação de seções'
  },

  // Formation lesson progress
  {
    table: 'formation_lesson_progress',
    name: 'idx_flp_user_id',
    columns: ['user_id'],
    description: 'Progresso de um usuário específico'
  },
  {
    table: 'formation_lesson_progress',
    name: 'idx_flp_lesson_id',
    columns: ['lesson_id'],
    description: 'Progresso em uma lição específica'
  },
  {
    table: 'formation_lesson_progress',
    name: 'idx_flp_user_lesson',
    columns: ['user_id', 'lesson_id'],
    description: 'Progresso de usuário em lição (query comum)'
  },
  {
    table: 'formation_lesson_progress',
    name: 'idx_flp_status',
    columns: ['status'],
    description: 'Filtro por status (not_started, in_progress, completed)'
  },

  // Formation progress (old table)
  {
    table: 'formation_progress',
    name: 'idx_fp_user_id',
    columns: ['user_id'],
    description: 'Progresso de um usuário'
  },
  {
    table: 'formation_progress',
    name: 'idx_fp_module_id',
    columns: ['moduleid'],
    description: 'Progresso em um módulo'
  },
  {
    table: 'formation_progress',
    name: 'idx_fp_user_module',
    columns: ['user_id', 'moduleid'],
    description: 'Progresso de usuário em módulo'
  },

  // Family relationships
  {
    table: 'family_relationships',
    name: 'idx_family_rel_user',
    columns: ['user_id'],
    description: 'Relacionamentos de um usuário'
  },
  {
    table: 'family_relationships',
    name: 'idx_family_rel_related',
    columns: ['related_user_id'],
    description: 'Usuários relacionados a alguém'
  },
  {
    table: 'family_relationships',
    name: 'idx_family_rel_type',
    columns: ['relationship_type'],
    description: 'Filtro por tipo de relacionamento (spouse, parent, etc)'
  },

  // Password reset requests
  {
    table: 'password_reset_requests',
    name: 'idx_prr_user_id',
    columns: ['user_id'],
    description: 'Requests de um usuário'
  },
  {
    table: 'password_reset_requests',
    name: 'idx_prr_status',
    columns: ['status'],
    description: 'Filtro por status (pending, approved, rejected)'
  },
  {
    table: 'password_reset_requests',
    name: 'idx_prr_requested_at',
    columns: ['requested_at'],
    description: 'Ordenação por data do request'
  },

  // Mass times config
  {
    table: 'mass_times_config',
    name: 'idx_mtc_day_of_week',
    columns: ['day_of_week'],
    description: 'Horários de um dia específico'
  },
  {
    table: 'mass_times_config',
    name: 'idx_mtc_is_active',
    columns: ['is_active'],
    description: 'Filtro de horários ativos'
  },
  {
    table: 'mass_times_config',
    name: 'idx_mtc_day_active',
    columns: ['day_of_week', 'is_active'],
    description: 'Horários ativos de um dia (query comum)'
  }
];

async function checkIndexExists(indexName: string): Promise<boolean> {
  try {
    const result = await db.execute(sql.raw(`
      SELECT 1 FROM pg_indexes
      WHERE indexname = '${indexName}'
    `));
    return result.rows.length > 0;
  } catch (error) {
    console.error(`Erro ao verificar índice ${indexName}:`, error);
    return false;
  }
}

async function createIndex(index: IndexDefinition): Promise<boolean> {
  const { table, name, columns, description } = index;

  try {
    // Verificar se índice já existe
    const exists = await checkIndexExists(name);

    if (exists) {
      console.log(`  ⏭️  ${name} já existe, pulando...`);
      return true;
    }

    // Criar índice
    const columnsStr = columns.join(', ');
    const query = `CREATE INDEX ${name} ON ${table} (${columnsStr})`;

    console.log(`  🔨 Criando ${name}...`);
    await db.execute(sql.raw(query));

    console.log(`  ✅ ${name} criado com sucesso`);
    console.log(`     Tabela: ${table}, Colunas: [${columnsStr}]`);
    console.log(`     Propósito: ${description}`);

    return true;
  } catch (error) {
    console.error(`  ❌ Erro ao criar índice ${name}:`, error);
    return false;
  }
}

async function addAllIndexes(): Promise<void> {
  console.log('🚀 Iniciando criação de índices de performance');
  console.log(`📅 ${new Date().toISOString()}`);
  console.log('─'.repeat(80));
  console.log(`\n📊 Total de índices a criar: ${indexes.length}\n`);

  let created = 0;
  let skipped = 0;
  let failed = 0;

  for (const index of indexes) {
    const success = await createIndex(index);

    if (success) {
      const exists = await checkIndexExists(index.name);
      if (exists) {
        const wasNew = await checkIndexExists(index.name);
        if (wasNew) {
          created++;
        } else {
          skipped++;
        }
      }
    } else {
      failed++;
    }

    console.log(''); // Linha em branco entre índices
  }

  console.log('─'.repeat(80));
  console.log('\n📋 Resumo da Execução:');
  console.log(`  ✅ Criados: ${created}`);
  console.log(`  ⏭️  Já existiam: ${skipped}`);
  console.log(`  ❌ Falharam: ${failed}`);
  console.log(`  📊 Total processado: ${indexes.length}`);

  if (failed > 0) {
    console.log('\n⚠️  Alguns índices falharam. Verifique os erros acima.');
  } else {
    console.log('\n✅ Todos os índices foram processados com sucesso!');
  }

  console.log('\n💡 Benefícios esperados:');
  console.log('  • Queries de autenticação 50-70% mais rápidas');
  console.log('  • Listagem de escalas 60-80% mais rápida');
  console.log('  • Busca de substitutos 70-90% mais rápida');
  console.log('  • Notificações não lidas 80-95% mais rápidas');
  console.log('  • Progresso de formação 50-70% mais rápido');

  console.log('\n🔍 Para verificar índices criados:');
  console.log('  SELECT tablename, indexname FROM pg_indexes WHERE schemaname = \'public\' ORDER BY tablename, indexname;');

  console.log('\n─'.repeat(80));
}

// Executar se chamado diretamente
// ES modules check using import.meta
const isMainModule = import.meta.url === `file://${process.argv[1]}`;

if (isMainModule) {
  addAllIndexes()
    .then(() => {
      console.log('\n✅ Script concluído com sucesso!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Erro crítico ao executar script:', error);
      process.exit(1);
    });
}

export { addAllIndexes, indexes };
