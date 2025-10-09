import { db } from '../server/db';
import { users } from '@shared/schema';
import { eq } from 'drizzle-orm';

async function testApiActivities() {
  try {
    console.log('🔍 Testando API de atividades extras...\n');

    const userId = '7736879f-16e7-4672-b57f-2c1cf607f949';

    // Simular chamada do endpoint GET
    console.log('📋 Simulando GET /api/profile/extra-activities');
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    const currentActivities = user?.extraActivities || {
      sickCommunion: false,
      mondayAdoration: false,
      helpOtherPastorals: false,
      festiveEvents: false
    };

    console.log('Retorno:', currentActivities);

    // Simular chamada do endpoint PUT
    const newActivities = {
      sickCommunion: false,
      mondayAdoration: true,
      helpOtherPastorals: false,
      festiveEvents: true
    };

    console.log('\n📋 Simulando PUT /api/profile/extra-activities');
    console.log('Enviando:', newActivities);

    const [updatedUser] = await db
      .update(users)
      .set({
        extraActivities: newActivities,
        updatedAt: new Date()
      })
      .where(eq(users.id, userId))
      .returning();

    console.log('Resposta:', {
      message: 'Extra activities preferences updated successfully',
      extraActivities: updatedUser.extraActivities
    });

    // Verificar se foi salvo
    console.log('\n📋 Verificando persistência (GET novamente)');
    const [verifyUser] = await db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    console.log('Retorno:', verifyUser?.extraActivities);

    const saved = verifyUser?.extraActivities as any;
    const allMatch =
      saved.sickCommunion === newActivities.sickCommunion &&
      saved.mondayAdoration === newActivities.mondayAdoration &&
      saved.helpOtherPastorals === newActivities.helpOtherPastorals &&
      saved.festiveEvents === newActivities.festiveEvents;

    if (allMatch) {
      console.log('\n✅ API funcionando corretamente!');
    } else {
      console.log('\n❌ Erro na API');
    }

  } catch (error) {
    console.error('❌ Erro:', error);
  }

  process.exit(0);
}

testApiActivities();