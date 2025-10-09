import { db } from '../server/db';
import { users } from '@shared/schema';
import { eq } from 'drizzle-orm';

async function testCompleteFlow() {
  try {
    console.log('🔍 Teste completo do fluxo de atividades extras\n');

    const userId = '7736879f-16e7-4672-b57f-2c1cf607f949';

    // 1. Simular primeira visita - GET inicial
    console.log('1️⃣ Primeira visita à tela de configurações...');
    const [user1] = await db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    const currentActivities = user1?.extraActivities || {
      sickCommunion: false,
      mondayAdoration: false,
      helpOtherPastorals: false,
      festiveEvents: false
    };

    console.log('Estado inicial carregado:', currentActivities);

    // 2. Simular mudança do usuário - PUT
    console.log('\n2️⃣ Usuário marca algumas opções...');
    const userChanges = {
      sickCommunion: true,
      mondayAdoration: true,
      helpOtherPastorals: false,
      festiveEvents: true
    };

    await db
      .update(users)
      .set({
        extraActivities: userChanges,
        updatedAt: new Date()
      })
      .where(eq(users.id, userId));

    console.log('Mudanças salvas:', userChanges);

    // 3. Simular saída e retorno - GET novamente
    console.log('\n3️⃣ Usuário sai e retorna à tela...');
    const [user2] = await db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    const reloadedActivities = user2?.extraActivities;
    console.log('Estado recarregado:', reloadedActivities);

    // 4. Verificar se os dados persistiram
    const saved = reloadedActivities as any;
    const allMatch =
      saved?.sickCommunion === userChanges.sickCommunion &&
      saved?.mondayAdoration === userChanges.mondayAdoration &&
      saved?.helpOtherPastorals === userChanges.helpOtherPastorals &&
      saved?.festiveEvents === userChanges.festiveEvents;

    if (allMatch) {
      console.log('\n✅ Dados persistem corretamente entre navegações!');
    } else {
      console.log('\n❌ Dados não persistiram corretamente');
      console.log('Esperado:', userChanges);
      console.log('Recebido:', reloadedActivities);
    }

    // 5. Informações de debug
    console.log('\n📊 Informações de Debug:');
    console.log('- User ID:', userId);
    console.log('- Tipo do campo extraActivities:', typeof user2?.extraActivities);
    console.log('- Campo é null?', user2?.extraActivities === null);
    console.log('- Campo é undefined?', user2?.extraActivities === undefined);

    if (user2?.extraActivities) {
      console.log('- Estrutura do objeto:');
      Object.entries(user2.extraActivities as any).forEach(([key, value]) => {
        console.log(`  - ${key}: ${value} (${typeof value})`);
      });
    }

  } catch (error) {
    console.error('❌ Erro no teste:', error);
  }

  process.exit(0);
}

testCompleteFlow();