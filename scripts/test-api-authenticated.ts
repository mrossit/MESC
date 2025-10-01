// Script para testar API com autenticação (simulando frontend real)
import { db } from '../server/db.js';
import { users } from '../shared/schema.js';
import { eq } from 'drizzle-orm';
import jwt from 'jsonwebtoken';
import fetch from 'node-fetch';

async function testAuthenticatedAPI() {
  console.log('🧪 TESTANDO API COM AUTENTICAÇÃO\n');

  // 1. Buscar usuário específico do banco
  console.log('1. Buscando usuário rossit@icloud.com...');
  const [user] = await db.select()
    .from(users)
    .where(eq(users.email, 'rossit@icloud.com'))
    .limit(1);

  if (!user) {
    console.log('❌ Usuário não encontrado');
    return;
  }

  console.log(`✅ Usuário encontrado: ${user.name} (${user.email}) - Role: ${user.role} - Status: ${user.status}`);

  // 2. Gerar token JWT (precisa seguir o formato do generateToken em auth.ts)
  console.log('\n2. Gerando token JWT...');
  const JWT_SECRET = process.env.JWT_SECRET || 'sjt-mesc-development-secret-2025';
  const token = jwt.sign(
    { id: user.id, email: user.email, name: user.name, role: user.role },
    JWT_SECRET,
    { expiresIn: '24h' }
  );
  console.log(`✅ Token gerado: ${token.substring(0, 30)}...`);

  // 3. Testar endpoint /api/schedules com autenticação
  console.log('\n3. GET /api/schedules?month=10&year=2025 (com autenticação)');
  try {
    const response = await fetch('http://localhost:5000/api/schedules?month=10&year=2025', {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    });

    console.log(`   Status: ${response.status}`);

    if (response.ok) {
      const data = await response.json();
      console.log(`   ✅ Resposta recebida com sucesso!`);
      console.log(`   Total de escalas: ${data.length}`);
      if (data.length > 0) {
        console.log(`   Primeira escala:`, JSON.stringify(data[0], null, 2));
      }
    } else {
      const error = await response.text();
      console.log(`   ❌ Erro: ${error}`);
    }
  } catch (error: any) {
    console.log(`   ❌ Erro de conexão: ${error.message}`);
  }

  // 4. Testar endpoint /api/schedules/by-date com autenticação
  console.log('\n4. GET /api/schedules/by-date/2025-10-05 (com autenticação)');
  try {
    const response = await fetch('http://localhost:5000/api/schedules/by-date/2025-10-05', {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    });

    console.log(`   Status: ${response.status}`);

    if (response.ok) {
      const data = await response.json();
      console.log(`   ✅ Resposta recebida com sucesso!`);
      console.log(`   Total de atribuições: ${data.length}`);
      if (data.length > 0) {
        console.log(`   Primeiras 3 atribuições:`);
        data.slice(0, 3).forEach((item: any, i: number) => {
          console.log(`   ${i + 1}. ${item.time} - ${item.ministerName || 'Sem nome'} (${item.type})`);
        });
      }
    } else {
      const error = await response.text();
      console.log(`   ❌ Erro: ${error}`);
    }
  } catch (error: any) {
    console.log(`   ❌ Erro de conexão: ${error.message}`);
  }

  // 5. Testar endpoint para data com menos missas
  console.log('\n5. GET /api/schedules/by-date/2025-10-01 (com autenticação)');
  try {
    const response = await fetch('http://localhost:5000/api/schedules/by-date/2025-10-01', {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    });

    console.log(`   Status: ${response.status}`);

    if (response.ok) {
      const data = await response.json();
      console.log(`   ✅ Resposta recebida!`);
      console.log(`   Total de atribuições: ${data.length}`);
      if (data.length > 0) {
        console.log(`   Atribuições do dia:`);
        data.forEach((item: any, i: number) => {
          console.log(`   ${i + 1}. ${item.time} - ${item.ministerName || 'Sem nome'} (${item.type})`);
        });
      }
    } else {
      const error = await response.text();
      console.log(`   ❌ Erro: ${error}`);
    }
  } catch (error: any) {
    console.log(`   ❌ Erro de conexão: ${error.message}`);
  }
}

testAuthenticatedAPI().catch(console.error);
