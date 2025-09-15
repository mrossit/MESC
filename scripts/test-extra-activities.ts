import { db } from '../server/db';
import { users } from '@shared/schema';
import { eq } from 'drizzle-orm';

async function testExtraActivities() {
  try {
    console.log('🔍 Testando salvamento de atividades extras...\n');

    // Buscar o usuário Sonia Teste
    const userId = '7736879f-16e7-4672-b57f-2c1cf607f949';

    // Buscar usuário atual
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!user) {
      console.log('❌ Usuário não encontrado');
      process.exit(1);
    }

    console.log('👤 Usuário encontrado:', user.name);
    console.log('📋 Atividades extras atuais:', user.extraActivities);

    // Simular atualização das atividades
    const newActivities = {
      sickCommunion: true,
      mondayAdoration: false,
      helpOtherPastorals: true,
      festiveEvents: true
    };

    console.log('\n🔄 Atualizando atividades extras para:', newActivities);

    // Atualizar no banco
    const [updatedUser] = await db
      .update(users)
      .set({
        extraActivities: newActivities,
        updatedAt: new Date()
      })
      .where(eq(users.id, userId))
      .returning();

    console.log('✅ Atualizado com sucesso!');
    console.log('📋 Novas atividades:', updatedUser.extraActivities);

    // Buscar novamente para confirmar
    const [confirmedUser] = await db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    console.log('\n🔍 Verificando persistência...');
    console.log('📋 Atividades após re-buscar:', confirmedUser.extraActivities);

    // Comparar propriedades individuais
    const saved = confirmedUser.extraActivities as any;
    const allMatch =
      saved.sickCommunion === newActivities.sickCommunion &&
      saved.mondayAdoration === newActivities.mondayAdoration &&
      saved.helpOtherPastorals === newActivities.helpOtherPastorals &&
      saved.festiveEvents === newActivities.festiveEvents;

    if (allMatch) {
      console.log('✅ Dados persistidos corretamente!');
    } else {
      console.log('❌ Erro na persistência dos dados');
    }

  } catch (error) {
    console.error('❌ Erro:', error);
  }

  process.exit(0);
}

testExtraActivities();