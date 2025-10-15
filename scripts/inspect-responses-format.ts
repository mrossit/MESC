/**
 * Inspect real format of questionnaire responses in database
 */

import { drizzle } from 'drizzle-orm/neon-serverless';
import { Pool, neonConfig } from '@neondatabase/serverless';
import ws from 'ws';
import { questionnaireResponses, users } from '../shared/schema';

neonConfig.webSocketConstructor = ws;

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const db = drizzle(pool);

async function inspect() {
  console.log('🔍 INSPEÇÃO DAS RESPOSTAS REAIS NO BANCO\n');

  const responses = await db.select().from(questionnaireResponses);
  const allUsers = await db.select().from(users);

  // Pegar ministros que disseram estar disponíveis para dias de semana
  const weekdayMinisters = responses.filter(r => {
    const availability = r.dailyMassAvailability;
    if (!availability) return false;

    return availability.some(a => a !== 'Não posso');
  });

  console.log('📊 Ministros com disponibilidade para dias de semana:', weekdayMinisters.length);
  console.log();

  // Mostrar as respostas COMPLETAS dos primeiros 5
  weekdayMinisters.slice(0, 5).forEach((r, i) => {
    const user = allUsers.find(u => u.id === r.userId);
    console.log(`\n===== MINISTRO ${i+1}: ${user?.name} =====`);
    console.log('User ID:', r.userId);
    console.log();
    console.log('📋 CAMPO: dailyMassAvailability');
    console.log('Valor:', JSON.stringify(r.dailyMassAvailability, null, 2));
    console.log();
    console.log('📋 CAMPO: preferredMassTimes');
    console.log('Valor:', JSON.stringify(r.preferredMassTimes, null, 2));
    console.log();
    console.log('📋 CAMPO: alternativeTimes');
    console.log('Valor:', JSON.stringify(r.alternativeTimes, null, 2));
    console.log();
    console.log('📋 CAMPO: responses (formato JSON completo)');
    let resp = r.responses;
    if (typeof resp === 'string') {
      resp = JSON.parse(resp);
    }
    console.log('Versão do formato:', resp?.format_version || 'legacy');

    // Se for v2.0, mostrar estrutura weekdays e masses
    if (resp?.format_version === '2.0') {
      console.log('\n🔧 V2.0 FORMAT DETECTED:');
      console.log('Weekdays disponíveis:', JSON.stringify(resp.weekdays, null, 2));
      console.log('\nMasses disponíveis (primeiras 3 entradas):');
      if (resp.masses) {
        const massEntries = Object.entries(resp.masses).slice(0, 3);
        massEntries.forEach(([date, times]) => {
          console.log(`  ${date}:`, times);
        });
      }
    } else {
      console.log('\n📜 LEGACY FORMAT DETECTED');
      console.log('Estrutura:', Array.isArray(resp) ? `Array com ${resp.length} items` : 'Objeto');
    }

    console.log('='.repeat(60));
  });

  await pool.end();
}

inspect()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('❌ Erro:', error);
    process.exit(1);
  });
