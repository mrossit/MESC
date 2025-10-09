import { db } from '../server/db';
import { users, massTimesConfig } from '@shared/schema';
import { eq, ne, and } from 'drizzle-orm';

async function checkMinistersData() {
  console.log('🔍 Verificando dados de ministros e configurações...\n');
  console.log('Environment:', process.env.NODE_ENV);

  try {
    // 1. Buscar todos os usuários
    const allUsers = await db.select().from(users);
    console.log(`📋 Total de usuários no banco: ${allUsers.length}`);

    allUsers.forEach(u => {
      console.log(`  - ${u.name} (${u.email})`);
      console.log(`    Role: ${u.role}, Status: ${u.status}`);
    });

    // 2. Buscar ministros ativos (excluindo gestores)
    const activeMinistersQuery = await db.select()
      .from(users)
      .where(
        and(
          eq(users.status, 'active'),
          ne(users.role, 'gestor')
        )
      );

    console.log(`\n✅ Ministros ativos (excluindo gestores): ${activeMinistersQuery.length}`);

    activeMinistersQuery.forEach(m => {
      console.log(`  - ${m.name} (${m.role})`);
      console.log(`    Total Services: ${m.totalServices || 0}`);
      console.log(`    Preferred Times: ${m.preferredTimes || 'Não definido'}`);
    });

    // 3. Verificar configuração de horários de missa
    const massTimesQuery = await db.select().from(massTimesConfig);

    console.log(`\n⏰ Horários de missa configurados: ${massTimesQuery.length}`);

    if (massTimesQuery.length === 0) {
      console.log('  ⚠️ NENHUM HORÁRIO DE MISSA CONFIGURADO!');
      console.log('  Isso pode causar problemas na geração de escalas.');
    } else {
      massTimesQuery.forEach(mt => {
        const days = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
        console.log(`  - ${days[mt.dayOfWeek]} às ${mt.time}`);
        console.log(`    Min: ${mt.minMinisters}, Max: ${mt.maxMinisters}`);
        console.log(`    Ativo: ${mt.isActive}`);
      });
    }

    // 4. Diagnóstico
    console.log('\n📊 DIAGNÓSTICO:');

    if (activeMinistersQuery.length === 0) {
      console.log('❌ Não há ministros ativos no banco!');
      console.log('   Solução: Criar usuários com role "ministro" ou "coordenador" e status "active"');
    }

    if (massTimesQuery.length === 0) {
      console.log('❌ Não há horários de missa configurados!');
      console.log('   Solução: Adicionar configurações de horários de missa no banco');
    }

    if (activeMinistersQuery.length > 0 && massTimesQuery.length > 0) {
      console.log('✅ Dados básicos estão OK para geração de escalas');
    }

    process.exit(0);
  } catch (error) {
    console.error('❌ Erro:', error);
    process.exit(1);
  }
}

checkMinistersData();