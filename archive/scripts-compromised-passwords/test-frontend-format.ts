// Test API endpoint with frontend expected format
import { db } from '../server/db.js';
import { users } from '../shared/schema.js';
import { eq } from 'drizzle-orm';
import jwt from 'jsonwebtoken';
import fetch from 'node-fetch';

async function testFrontendFormat() {
  console.log('🧪 TESTANDO FORMATO ESPERADO PELO FRONTEND\n');

  // Buscar usuário e gerar token
  const [user] = await db.select()
    .from(users)
    .where(eq(users.email, 'rossit@icloud.com'))
    .limit(1);

  if (!user) {
    console.log('❌ Usuário não encontrado');
    return;
  }

  const JWT_SECRET = process.env.JWT_SECRET || 'sjt-mesc-development-secret-2025';
  const token = jwt.sign(
    { id: user.id, email: user.email, name: user.name, role: user.role },
    JWT_SECRET,
    { expiresIn: '24h' }
  );

  // Testar endpoint com formato esperado pelo frontend
  console.log('GET /api/schedules?month=10&year=2025');
  try {
    const response = await fetch('http://localhost:5000/api/schedules?month=10&year=2025', {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    });

    console.log(`Status: ${response.status}`);

    if (response.ok) {
      const data = await response.json();
      console.log('\n✅ Resposta recebida com sucesso!\n');

      console.log('Estrutura da resposta:');
      console.log(`  schedules: ${Array.isArray(data.schedules) ? data.schedules.length : 'não é array'} itens`);
      console.log(`  assignments: ${Array.isArray(data.assignments) ? data.assignments.length : 'não é array'} itens`);
      console.log(`  substitutions: ${Array.isArray(data.substitutions) ? data.substitutions.length : 'não é array'} itens`);

      if (data.schedules && data.schedules.length > 0) {
        console.log('\nPrimeira escala:', JSON.stringify(data.schedules[0], null, 2));
      }

      if (data.assignments && data.assignments.length > 0) {
        console.log('\nPrimeiros 3 assignments:');
        data.assignments.slice(0, 3).forEach((a: any, i: number) => {
          console.log(`${i + 1}. ${a.date} ${a.massTime} - ${a.ministerName || 'Sem nome'} (pos ${a.position})`);
        });
      }

      if (data.substitutions) {
        console.log(`\nSubstituições: ${data.substitutions.length}`);
      }
    } else {
      const error = await response.text();
      console.log(`❌ Erro: ${error}`);
    }
  } catch (error: any) {
    console.log(`❌ Erro de conexão: ${error.message}`);
  }
}

testFrontendFormat().catch(console.error);
