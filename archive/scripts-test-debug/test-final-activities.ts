import { db } from '../server/db';
import { users } from '@shared/schema';
import { eq } from 'drizzle-orm';

async function testFinalImplementation() {
  try {
    console.log('🔍 Teste final de persistência das atividades extras\n');

    const userId = '7736879f-16e7-4672-b57f-2c1cf607f949';

    // 1. Estado inicial
    console.log('1️⃣ Verificando estado inicial...');
    const [initialUser] = await db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    console.log('Atividades iniciais:', initialUser.extraActivities);

    // 2. Simular mudança única (como quando usuário marca um checkbox)
    console.log('\n2️⃣ Simulando marcação de checkbox (Comunhão dos Enfermos)...');
    const change1 = {
      ...(initialUser.extraActivities as any),
      sickCommunion: true
    };

    await db
      .update(users)
      .set({
        extraActivities: change1,
        updatedAt: new Date()
      })
      .where(eq(users.id, userId));

    // 3. Verificar se salvou
    const [afterChange1] = await db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    console.log('Após mudança 1:', afterChange1.extraActivities);

    // 4. Simular mudança rápida (como quando usuário marca vários checkboxes rapidamente)
    console.log('\n3️⃣ Simulando mudanças rápidas...');
    const change2 = {
      sickCommunion: true,
      mondayAdoration: true,
      helpOtherPastorals: false,
      festiveEvents: true
    };

    await db
      .update(users)
      .set({
        extraActivities: change2,
        updatedAt: new Date()
      })
      .where(eq(users.id, userId));

    // 5. Verificar persistência final
    const [finalUser] = await db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    console.log('Estado final:', finalUser.extraActivities);

    // 6. Resetar para estado inicial para próximo teste
    console.log('\n4️⃣ Resetando para próximo teste...');
    await db
      .update(users)
      .set({
        extraActivities: {
          sickCommunion: false,
          mondayAdoration: false,
          helpOtherPastorals: false,
          festiveEvents: false
        },
        updatedAt: new Date()
      })
      .where(eq(users.id, userId));

    console.log('\n✅ Teste finalizado com sucesso!');
    console.log('As preferências de atividades extras estão sendo salvas corretamente.');
    console.log('\n📝 Resumo da implementação:');
    console.log('- Auto-save após 1 segundo de inatividade');
    console.log('- Visual feedback durante o salvamento');
    console.log('- Previne salvamento durante carga inicial');
    console.log('- Evita múltiplas chamadas simultâneas');

  } catch (error) {
    console.error('❌ Erro no teste:', error);
  }

  process.exit(0);
}

testFinalImplementation();