/**
 * Script para adicionar missas especiais de novembro que não estavam no Excel:
 * - PUC 20/11 às 10h
 * - São Judas mensal 28/11 às 7h, 15h, 19h30
 */

import { db } from '../server/db.js';
import { users, schedules } from '@shared/schema.js';
import { eq } from 'drizzle-orm';

interface SpecialMass {
  date: string;
  time: string;
  location?: string;
  type: string;
  ministers: string[];  // Emails dos ministros
}

const specialMasses: SpecialMass[] = [
  {
    date: '2025-11-20',
    time: '10:00',
    location: 'PUC Sorocaba',
    type: 'missa_puc',
    ministers: [
      'eliane.acquati@adv.oabsp.org.br',  // Eliane
      'inaraguilherme@gmail.com'           // Aidê
    ]
  },
  {
    date: '2025-11-28',
    time: '07:00',
    location: '',
    type: 'missa_sao_judas_mensal',
    ministers: [
      'eliane.acquati@adv.oabsp.org.br',  // Eliane
      'inaraguilherme@gmail.com'           // Aidê
    ]
  },
  {
    date: '2025-11-28',
    time: '15:00',
    location: '',
    type: 'missa_sao_judas_mensal',
    ministers: [
      'inaraguilherme@gmail.com'           // Aidê
    ]
  },
  {
    date: '2025-11-28',
    time: '19:30',
    location: '',
    type: 'missa_sao_judas_mensal',
    ministers: [
      'eliane.acquati@adv.oabsp.org.br',  // Eliane
      'andre_amorim3@hotmail.com',         // Andre
      'inaraguilherme@gmail.com',          // Aidê
      'sophia.olivers2004@gmail.com'       // Sophia
    ]
  }
];

async function addSpecialMasses() {
  console.log('\n🚀 Adicionando missas especiais de novembro...\n');

  try {
    // 1. Buscar todos os usuários para mapear email -> ID
    const allUsers = await db.select().from(users);
    const emailToId = new Map<string, string>();
    
    allUsers.forEach(user => {
      emailToId.set(user.email.toLowerCase(), user.id);
    });

    console.log(`👥 ${allUsers.length} ministros carregados\n`);

    let totalInserted = 0;

    // 2. Adicionar cada missa especial
    for (const mass of specialMasses) {
      console.log(`\n📅 ${mass.date} ${mass.time} - ${mass.type}`);
      console.log(`   Local: ${mass.location || 'Santuário'}`);
      console.log(`   Ministros: ${mass.ministers.length}`);

      for (let i = 0; i < mass.ministers.length; i++) {
        const email = mass.ministers[i].toLowerCase();
        const userId = emailToId.get(email);

        if (!userId) {
          console.warn(`   ⚠️  Usuário não encontrado: ${email}`);
          continue;
        }

        const userName = allUsers.find(u => u.id === userId)?.name || 'Desconhecido';

        try {
          await db.insert(schedules).values({
            date: mass.date,
            time: mass.time,
            type: 'missa',
            location: mass.location || null,
            ministerId: userId,
            position: i + 1,
            status: 'scheduled'
          });

          console.log(`   ✅ Pos ${i + 1}: ${userName}`);
          totalInserted++;

        } catch (error) {
          console.error(`   ❌ Erro ao inserir ${userName}:`, error);
        }
      }
    }

    // 3. Resumo
    console.log('\n' + '='.repeat(60));
    console.log('📊 RESUMO:');
    console.log('='.repeat(60));
    console.log(`✅ Missas especiais: ${specialMasses.length}`);
    console.log(`✅ Escalações inseridas: ${totalInserted}`);
    console.log('='.repeat(60) + '\n');

    // 4. Verificar resultado final
    console.log('🔍 Verificando escalas finais:\n');

    const pucMass = await db.select().from(schedules)
      .where(eq(schedules.date, '2025-11-20'));
    console.log(`PUC (20/11): ${pucMass.filter(m => m.time === '10:00:00').length} ministros às 10h`);

    const sjMass = await db.select().from(schedules)
      .where(eq(schedules.date, '2025-11-28'));
    console.log(`São Judas (28/11):`);
    console.log(`  - 7h: ${sjMass.filter(m => m.time === '07:00:00').length} ministros`);
    console.log(`  - 15h: ${sjMass.filter(m => m.time === '15:00:00').length} ministros`);
    console.log(`  - 19h30: ${sjMass.filter(m => m.time === '19:30:00').length} ministros`);

    console.log('\n✅ Missas especiais adicionadas com sucesso!\n');

  } catch (error) {
    console.error('❌ Erro:', error);
    throw error;
  }
}

// Executar
addSpecialMasses()
  .then(() => {
    console.log('🎉 Script finalizado!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Falha:', error);
    process.exit(1);
  });
