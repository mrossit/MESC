/**
 * Script to safely delete duplicate Sergio user
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
    const { drizzle } = await import('drizzle-orm/neon-serverless');
    const ws = await import('ws');
    const schema = await import('@shared/schema');
    const { eq, or } = await import('drizzle-orm');

    // Setup connection
    neonConfig.webSocketConstructor = ws.default;
    const pool = new Pool({ connectionString: PRODUCTION_DB_URL });
    const db = drizzle({ client: pool, schema });

    console.log('✅ Conectado ao banco de produção\n');

    // 1. Fetch both users to compare
    console.log('📋 Buscando dados dos dois usuários...\n');

    const userToDelete = await db
      .select()
      .from(schema.users)
      .where(eq(schema.users.id, USER_TO_DELETE))
      .limit(1);

    const userToKeep = await db
      .select()
      .from(schema.users)
      .where(eq(schema.users.id, USER_TO_KEEP))
      .limit(1);

    if (userToDelete.length === 0) {
      console.log('❌ Usuário a deletar não encontrado!');
      return;
    }

    if (userToKeep.length === 0) {
      console.log('❌ Usuário a manter não encontrado!');
      return;
    }

    console.log('👤 Usuário a DELETAR:');
    console.log(`   ID: ${userToDelete[0].id}`);
    console.log(`   Nome: ${userToDelete[0].name}`);
    console.log(`   Email: ${userToDelete[0].email}`);
    console.log(`   Criado em: ${userToDelete[0].createdAt}\n`);

    console.log('✅ Usuário a MANTER:');
    console.log(`   ID: ${userToKeep[0].id}`);
    console.log(`   Nome: ${userToKeep[0].name}`);
    console.log(`   Email: ${userToKeep[0].email}`);
    console.log(`   Criado em: ${userToKeep[0].createdAt}\n`);

    // 2. Check for related data
    console.log('🔎 Verificando dados relacionados ao usuário a deletar...\n');

    // Check schedules
    const schedules = await db
      .select()
      .from(schema.schedules)
      .where(or(
        eq(schema.schedules.ministerId, USER_TO_DELETE),
        eq(schema.schedules.substituteId, USER_TO_DELETE)
      ));
    console.log(`   📅 Escalas: ${schedules.length}`);

    // Check substitution requests
    const substitutionRequests = await db
      .select()
      .from(schema.substitutionRequests)
      .where(or(
        eq(schema.substitutionRequests.requesterId, USER_TO_DELETE),
        eq(schema.substitutionRequests.substituteId, USER_TO_DELETE)
      ));
    console.log(`   🔄 Pedidos de substituição: ${substitutionRequests.length}`);

    // Check questionnaire responses
    const questionnaireResponses = await db
      .select()
      .from(schema.questionnaireResponses)
      .where(eq(schema.questionnaireResponses.userId, USER_TO_DELETE));
    console.log(`   📝 Respostas de questionário: ${questionnaireResponses.length}`);

    // Check notifications
    const notifications = await db
      .select()
      .from(schema.notifications)
      .where(eq(schema.notifications.userId, USER_TO_DELETE));
    console.log(`   🔔 Notificações: ${notifications.length}`);

    // Check push subscriptions
    const pushSubscriptions = await db
      .select()
      .from(schema.pushSubscriptions)
      .where(eq(schema.pushSubscriptions.userId, USER_TO_DELETE));
    console.log(`   📱 Assinaturas push: ${pushSubscriptions.length}`);

    // Check active sessions
    const activeSessions = await db
      .select()
      .from(schema.activeSessions)
      .where(eq(schema.activeSessions.userId, USER_TO_DELETE));
    console.log(`   🔐 Sessões ativas: ${activeSessions.length}\n`);

    // 3. Delete related data
    console.log('🗑️  Deletando dados relacionados...\n');

    // Delete active sessions
    if (activeSessions.length > 0) {
      await db
        .delete(schema.activeSessions)
        .where(eq(schema.activeSessions.userId, USER_TO_DELETE));
      console.log(`   ✅ ${activeSessions.length} sessões ativas deletadas`);
    }

    // Delete push subscriptions
    if (pushSubscriptions.length > 0) {
      await db
        .delete(schema.pushSubscriptions)
        .where(eq(schema.pushSubscriptions.userId, USER_TO_DELETE));
      console.log(`   ✅ ${pushSubscriptions.length} assinaturas push deletadas`);
    }

    // Delete notifications
    if (notifications.length > 0) {
      await db
        .delete(schema.notifications)
        .where(eq(schema.notifications.userId, USER_TO_DELETE));
      console.log(`   ✅ ${notifications.length} notificações deletadas`);
    }

    // Delete questionnaire responses
    if (questionnaireResponses.length > 0) {
      await db
        .delete(schema.questionnaireResponses)
        .where(eq(schema.questionnaireResponses.userId, USER_TO_DELETE));
      console.log(`   ✅ ${questionnaireResponses.length} respostas de questionário deletadas`);
    }

    // Delete substitution requests
    if (substitutionRequests.length > 0) {
      await db
        .delete(schema.substitutionRequests)
        .where(or(
          eq(schema.substitutionRequests.requesterId, USER_TO_DELETE),
          eq(schema.substitutionRequests.substituteId, USER_TO_DELETE)
        ));
      console.log(`   ✅ ${substitutionRequests.length} pedidos de substituição deletados`);
    }

    // Delete schedules
    if (schedules.length > 0) {
      await db
        .delete(schema.schedules)
        .where(or(
          eq(schema.schedules.ministerId, USER_TO_DELETE),
          eq(schema.schedules.substituteId, USER_TO_DELETE)
        ));
      console.log(`   ✅ ${schedules.length} escalas deletadas`);
    }

    // 4. Delete the user
    console.log('\n🗑️  Deletando usuário duplicado...\n');

    await db
      .delete(schema.users)
      .where(eq(schema.users.id, USER_TO_DELETE));

    console.log(`✅ Usuário ${userToDelete[0].name} (${USER_TO_DELETE}) deletado com sucesso!\n`);

    console.log('📊 Resumo:');
    console.log(`   - Usuário deletado: ${userToDelete[0].name} (${userToDelete[0].email})`);
    console.log(`   - Usuário mantido: ${userToKeep[0].name} (${userToKeep[0].email})`);
    console.log(`   - Total de registros relacionados deletados: ${
      activeSessions.length +
      pushSubscriptions.length +
      notifications.length +
      questionnaireResponses.length +
      substitutionRequests.length +
      schedules.length
    }`);

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
