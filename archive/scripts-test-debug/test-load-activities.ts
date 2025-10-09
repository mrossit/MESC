import { db } from '../server/db';
import { users } from '@shared/schema';
import { eq } from 'drizzle-orm';

async function testLoadActivities() {
  try {
    console.log('🔍 Testando carregamento de atividades extras...\n');

    const userId = '7736879f-16e7-4672-b57f-2c1cf607f949';

    // 1. Definir valores específicos
    console.log('1️⃣ Definindo valores de teste...');
    const testActivities = {
      sickCommunion: true,
      mondayAdoration: false,
      helpOtherPastorals: true,
      festiveEvents: false
    };

    await db
      .update(users)
      .set({
        extraActivities: testActivities,
        updatedAt: new Date()
      })
      .where(eq(users.id, userId));

    console.log('Valores definidos:', testActivities);

    // 2. Buscar novamente (simulando GET /api/profile/extra-activities)
    console.log('\n2️⃣ Buscando valores do banco...');
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!user) {
      console.log('❌ Usuário não encontrado');
      process.exit(1);
    }

    const loadedActivities = user.extraActivities || {
      sickCommunion: false,
      mondayAdoration: false,
      helpOtherPastorals: false,
      festiveEvents: false
    };

    console.log('Valores carregados:', loadedActivities);

    // 3. Verificar se os valores correspondem
    const saved = loadedActivities as any;
    const allMatch =
      saved.sickCommunion === testActivities.sickCommunion &&
      saved.mondayAdoration === testActivities.mondayAdoration &&
      saved.helpOtherPastorals === testActivities.helpOtherPastorals &&
      saved.festiveEvents === testActivities.festiveEvents;

    if (allMatch) {
      console.log('\n✅ Valores carregados corretamente!');
    } else {
      console.log('\n❌ Valores não correspondem');
      console.log('Esperado:', testActivities);
      console.log('Recebido:', loadedActivities);
    }

    // 4. Verificar tipo do campo
    console.log('\n3️⃣ Informações adicionais:');
    console.log('- Tipo do campo:', typeof user.extraActivities);
    console.log('- É null?', user.extraActivities === null);
    console.log('- É undefined?', user.extraActivities === undefined);

  } catch (error) {
    console.error('❌ Erro:', error);
  }

  process.exit(0);
}

testLoadActivities();