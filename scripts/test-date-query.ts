import { db } from '../server/db.js';
import { schedules } from '../shared/schema.js';
import { eq, sql } from 'drizzle-orm';

async function testDateQuery() {
  console.log('🧪 TESTANDO QUERIES DE DATA\n');

  const testDate = '2025-10-05';

  console.log(`1. Testando query com eq() direto: eq(schedules.date, '${testDate}')`);
  try {
    const result1 = await db
      .select()
      .from(schedules)
      .where(eq(schedules.date, testDate))
      .limit(3);
    console.log(`   ✅ Sucesso! Encontrados ${result1.length} registros`);
    if (result1.length > 0) {
      console.log(`   Primeiro registro:`, result1[0]);
    }
  } catch (error: any) {
    console.log(`   ❌ Erro:`, error.message);
  }

  console.log(`\n2. Testando query com sql\`\`: sql\`date = \${testDate}\``);
  try {
    const result2 = await db
      .select()
      .from(schedules)
      .where(sql`date = ${testDate}`)
      .limit(3);
    console.log(`   ✅ Sucesso! Encontrados ${result2.length} registros`);
    if (result2.length > 0) {
      console.log(`   Primeiro registro:`, result2[0]);
    }
  } catch (error: any) {
    console.log(`   ❌ Erro:`, error.message);
  }

  console.log(`\n3. Testando query com cast explícito: sql\`date::text = \${testDate}\``);
  try {
    const result3 = await db
      .select()
      .from(schedules)
      .where(sql`date::text = ${testDate}`)
      .limit(3);
    console.log(`   ✅ Sucesso! Encontrados ${result3.length} registros`);
    if (result3.length > 0) {
      console.log(`   Primeiro registro:`, result3[0]);
    }
  } catch (error: any) {
    console.log(`   ❌ Erro:`, error.message);
  }
}

testDateQuery().catch(console.error);
