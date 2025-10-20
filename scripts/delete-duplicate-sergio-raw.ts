/**
 * Script to safely delete duplicate Sergio user using RAW SQL
 * ID to delete: bada23ec-45fa-4ae7-8c62-6df5d4671527
 * ID to keep: 642882c7-6aa0-41ff-ad20-73c68f1a3956
 */

// Production database URL
const PRODUCTION_DB_URL = 'postgresql://neondb_owner:npg_3QKylioran9V@ep-lingering-firefly-afak5e6q.c-2.us-west-2.aws.neon.tech/neondb?sslmode=require';

const USER_TO_DELETE = 'bada23ec-45fa-4ae7-8c62-6df5d4671527';
const USER_TO_KEEP = '642882c7-6aa0-41ff-ad20-73c68f1a3956';

async function deleteDuplicateUser() {
  console.log('🔍 Analisando usuários duplicados de Sergio...\n');

  try {
    // Import dependencies
    const { Pool, neonConfig } = await import('@neondatabase/serverless');
    const ws = await import('ws');

    // Setup connection
    neonConfig.webSocketConstructor = ws.default;
    const pool = new Pool({ connectionString: PRODUCTION_DB_URL });

    console.log('✅ Conectado ao banco de produção\n');

    // 1. Fetch both users to compare
    console.log('📋 Buscando dados dos dois usuários...\n');

    const userToDeleteResult = await pool.query(
      'SELECT id, name, email, created_at FROM users WHERE id = $1',
      [USER_TO_DELETE]
    );

    const userToKeepResult = await pool.query(
      'SELECT id, name, email, created_at FROM users WHERE id = $1',
      [USER_TO_KEEP]
    );

    if (userToDeleteResult.rows.length === 0) {
      console.log('❌ Usuário a deletar não encontrado!');
      await pool.end();
      return;
    }

    if (userToKeepResult.rows.length === 0) {
      console.log('❌ Usuário a manter não encontrado!');
      await pool.end();
      return;
    }

    const userToDelete = userToDeleteResult.rows[0];
    const userToKeep = userToKeepResult.rows[0];

    console.log('👤 Usuário a DELETAR:');
    console.log(`   ID: ${userToDelete.id}`);
    console.log(`   Nome: ${userToDelete.name}`);
    console.log(`   Email: ${userToDelete.email}`);
    console.log(`   Criado em: ${userToDelete.created_at}\n`);

    console.log('✅ Usuário a MANTER:');
    console.log(`   ID: ${userToKeep.id}`);
    console.log(`   Nome: ${userToKeep.name}`);
    console.log(`   Email: ${userToKeep.email}`);
    console.log(`   Criado em: ${userToKeep.created_at}\n`);

    // 2. Check for related data
    console.log('🔎 Verificando dados relacionados ao usuário a deletar...\n');

    const schedulesResult = await pool.query(
      'SELECT COUNT(*) FROM schedules WHERE minister_id = $1 OR substitute_id = $1',
      [USER_TO_DELETE]
    );
    const schedulesCount = parseInt(schedulesResult.rows[0].count);
    console.log(`   📅 Escalas: ${schedulesCount}`);

    const substitutionRequestsResult = await pool.query(
      'SELECT COUNT(*) FROM substitution_requests WHERE requester_id = $1 OR substitute_id = $1',
      [USER_TO_DELETE]
    );
    const substitutionRequestsCount = parseInt(substitutionRequestsResult.rows[0].count);
    console.log(`   🔄 Pedidos de substituição: ${substitutionRequestsCount}`);

    const questionnaireResponsesResult = await pool.query(
      'SELECT COUNT(*) FROM questionnaire_responses WHERE user_id = $1',
      [USER_TO_DELETE]
    );
    const questionnaireResponsesCount = parseInt(questionnaireResponsesResult.rows[0].count);
    console.log(`   📝 Respostas de questionário: ${questionnaireResponsesCount}`);

    const notificationsResult = await pool.query(
      'SELECT COUNT(*) FROM notifications WHERE user_id = $1',
      [USER_TO_DELETE]
    );
    const notificationsCount = parseInt(notificationsResult.rows[0].count);
    console.log(`   🔔 Notificações: ${notificationsCount}`);

    const pushSubscriptionsResult = await pool.query(
      'SELECT COUNT(*) FROM push_subscriptions WHERE user_id = $1',
      [USER_TO_DELETE]
    );
    const pushSubscriptionsCount = parseInt(pushSubscriptionsResult.rows[0].count);
    console.log(`   📱 Assinaturas push: ${pushSubscriptionsCount}`);

    const activeSessionsResult = await pool.query(
      'SELECT COUNT(*) FROM active_sessions WHERE user_id = $1',
      [USER_TO_DELETE]
    );
    const activeSessionsCount = parseInt(activeSessionsResult.rows[0].count);
    console.log(`   🔐 Sessões ativas: ${activeSessionsCount}\n`);

    // 3. Delete related data
    console.log('🗑️  Deletando dados relacionados...\n');

    let deletedCount = 0;

    // Delete active sessions
    if (activeSessionsCount > 0) {
      const result = await pool.query(
        'DELETE FROM active_sessions WHERE user_id = $1',
        [USER_TO_DELETE]
      );
      console.log(`   ✅ ${result.rowCount} sessões ativas deletadas`);
      deletedCount += result.rowCount || 0;
    }

    // Delete push subscriptions
    if (pushSubscriptionsCount > 0) {
      const result = await pool.query(
        'DELETE FROM push_subscriptions WHERE user_id = $1',
        [USER_TO_DELETE]
      );
      console.log(`   ✅ ${result.rowCount} assinaturas push deletadas`);
      deletedCount += result.rowCount || 0;
    }

    // Delete notifications
    if (notificationsCount > 0) {
      const result = await pool.query(
        'DELETE FROM notifications WHERE user_id = $1',
        [USER_TO_DELETE]
      );
      console.log(`   ✅ ${result.rowCount} notificações deletadas`);
      deletedCount += result.rowCount || 0;
    }

    // Delete questionnaire responses
    if (questionnaireResponsesCount > 0) {
      const result = await pool.query(
        'DELETE FROM questionnaire_responses WHERE user_id = $1',
        [USER_TO_DELETE]
      );
      console.log(`   ✅ ${result.rowCount} respostas de questionário deletadas`);
      deletedCount += result.rowCount || 0;
    }

    // Delete substitution requests
    if (substitutionRequestsCount > 0) {
      const result = await pool.query(
        'DELETE FROM substitution_requests WHERE requester_id = $1 OR substitute_id = $1',
        [USER_TO_DELETE]
      );
      console.log(`   ✅ ${result.rowCount} pedidos de substituição deletados`);
      deletedCount += result.rowCount || 0;
    }

    // Delete schedules
    if (schedulesCount > 0) {
      const result = await pool.query(
        'DELETE FROM schedules WHERE minister_id = $1 OR substitute_id = $1',
        [USER_TO_DELETE]
      );
      console.log(`   ✅ ${result.rowCount} escalas deletadas`);
      deletedCount += result.rowCount || 0;
    }

    // 4. Delete the user
    console.log('\n🗑️  Deletando usuário duplicado...\n');

    const deleteUserResult = await pool.query(
      'DELETE FROM users WHERE id = $1',
      [USER_TO_DELETE]
    );

    if (deleteUserResult.rowCount && deleteUserResult.rowCount > 0) {
      console.log(`✅ Usuário ${userToDelete.name} (${USER_TO_DELETE}) deletado com sucesso!\n`);

      console.log('📊 Resumo:');
      console.log(`   - Usuário deletado: ${userToDelete.name} (${userToDelete.email})`);
      console.log(`   - Usuário mantido: ${userToKeep.name} (${userToKeep.email})`);
      console.log(`   - Total de registros relacionados deletados: ${deletedCount}`);
    } else {
      console.log('❌ Erro: Usuário não foi deletado!');
    }

    // Close connection
    await pool.end();

  } catch (error) {
    console.error('\n❌ Erro ao deletar usuário:', error);
    throw error;
  }
}

// Run the script
import { fileURLToPath } from 'url';

const isMainModule = import.meta.url === `file://${process.argv[1]}`;

if (isMainModule) {
  deleteDuplicateUser()
    .then(() => {
      console.log('\n🎉 Script finalizado!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Script falhou:', error);
      process.exit(1);
    });
}

export { deleteDuplicateUser };
