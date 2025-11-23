import { db } from '../server/db';
import { users, familyRelationships, ministers } from '../shared/schema';
import { eq } from 'drizzle-orm';

async function debugMarcoAndPriscila() {
  console.log('=== DEBUG: Marco e Priscila - Compartilhamento Familiar ===\n');
  
  // 1. Buscar Marco
  const marco = await db.select().from(users).where(eq(users.email, 'rossit@icloud.com')).limit(1);
  console.log('👤 MARCO:', marco[0] ? {
    id: marco[0].id,
    name: marco[0].name,
    email: marco[0].email,
    role: marco[0].role,
    familyId: marco[0].familyId
  } : 'NÃO ENCONTRADO');
  
  // 2. Buscar Priscila
  const priscila = await db.select().from(users).where(eq(users.email, 'machadopri@hotmail.com')).limit(1);
  console.log('\n👤 PRISCILA:', priscila[0] ? {
    id: priscila[0].id,
    name: priscila[0].name,
    email: priscila[0].email,
    role: priscila[0].role,
    familyId: priscila[0].familyId
  } : 'NÃO ENCONTRADO');
  
  if (!marco[0] || !priscila[0]) {
    console.log('\n❌ Um dos usuários não foi encontrado!');
    process.exit(1);
  }
  
  // 3. Verificar se têm o mesmo familyId
  console.log('\n🏠 MESMO familyId?', marco[0].familyId === priscila[0].familyId ? 'SIM ✅' : 'NÃO ❌');
  
  // 4. Buscar relacionamentos de Marco
  const marcoRelationships = await db
    .select()
    .from(familyRelationships)
    .where(eq(familyRelationships.userId, marco[0].id));
  
  console.log('\n📋 RELACIONAMENTOS DE MARCO (userId =', marco[0].id, '):');
  console.log('Quantidade:', marcoRelationships.length);
  if (marcoRelationships.length > 0) {
    for (const rel of marcoRelationships) {
      const relatedUser = await db.select().from(users).where(eq(users.id, rel.relatedUserId)).limit(1);
      console.log('  -', rel.relationshipType, ':', relatedUser[0]?.name, '(', relatedUser[0]?.email, ')');
    }
  }
  
  // 5. Buscar relacionamentos de Priscila
  const priscilaRelationships = await db
    .select()
    .from(familyRelationships)
    .where(eq(familyRelationships.userId, priscila[0].id));
  
  console.log('\n📋 RELACIONAMENTOS DE PRISCILA (userId =', priscila[0].id, '):');
  console.log('Quantidade:', priscilaRelationships.length);
  if (priscilaRelationships.length > 0) {
    for (const rel of priscilaRelationships) {
      const relatedUser = await db.select().from(users).where(eq(users.id, rel.relatedUserId)).limit(1);
      console.log('  -', rel.relationshipType, ':', relatedUser[0]?.name, '(', relatedUser[0]?.email, ')');
    }
  }
  
  // 6. Verificar dados ministeriais (maritalStatus)
  const marcoMinister = await db.select().from(ministers).where(eq(ministers.userId, marco[0].id)).limit(1);
  const priscilaMinister = await db.select().from(ministers).where(eq(ministers.userId, priscila[0].id)).limit(1);
  
  console.log('\n💒 DADOS MINISTERIAIS:');
  console.log('Marco maritalStatus:', marcoMinister[0]?.maritalStatus);
  console.log('Marco spouseName:', marcoMinister[0]?.spouseName);
  console.log('Priscila maritalStatus:', priscilaMinister[0]?.maritalStatus);
  console.log('Priscila spouseName:', priscilaMinister[0]?.spouseName);
  
  console.log('\n✅ Debug concluído!');
  process.exit(0);
}

debugMarcoAndPriscila().catch(console.error);
