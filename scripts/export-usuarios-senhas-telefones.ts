import { db } from '../server/db';
import { users } from '@shared/schema';

async function exportAllUsersWithHashes() {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('EXPORTAÇÃO COMPLETA: USUÁRIOS + HASHES DE SENHA + TELEFONES');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  const allUsers = await db.select({
    id: users.id,
    email: users.email,
    name: users.name,
    phone: users.phone,
    whatsapp: users.whatsapp,
    passwordHash: users.passwordHash,
    role: users.role,
    status: users.status,
    lastLogin: users.lastLogin,
    createdAt: users.createdAt
  }).from(users);

  console.log(`Total de usuários: ${allUsers.length}\n`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  // EXIBIR TODOS OS USUÁRIOS COM HASHES
  allUsers.forEach((u, i) => {
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`USUÁRIO #${i + 1}`);
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`Nome:             ${u.name}`);
    console.log(`Email:            ${u.email}`);
    console.log(`Telefone:         ${u.phone || 'Não informado'}`);
    console.log(`WhatsApp:         ${u.whatsapp || 'Não informado'}`);
    console.log(`Papel:            ${u.role}`);
    console.log(`Status:           ${u.status}`);
    console.log(`Hash Bcrypt:      ${u.passwordHash || 'NULL'}`);
    console.log(`Último Login:     ${u.lastLogin || 'Nunca'}`);
    console.log(`Criado em:        ${u.createdAt}`);
    console.log('');
  });

  // EXPORTAR PARA TXT
  const fs = await import('fs');
  const path = await import('path');

  const txtPath = path.join(process.cwd(), 'USUARIOS-HASHES-TELEFONES-COMPLETO.txt');
  const lines = [
    '═══════════════════════════════════════════════════════════════════════════════',
    'EXPORTAÇÃO COMPLETA DE USUÁRIOS - BANCO DE PRODUÇÃO',
    'Data: ' + new Date().toISOString(),
    'Total: ' + allUsers.length + ' usuários',
    '═══════════════════════════════════════════════════════════════════════════════',
    ''
  ];

  allUsers.forEach((u, i) => {
    lines.push(`USUÁRIO #${i + 1}`);
    lines.push(`Nome:          ${u.name}`);
    lines.push(`Email:         ${u.email}`);
    lines.push(`Telefone:      ${u.phone || 'Não informado'}`);
    lines.push(`WhatsApp:      ${u.whatsapp || 'Não informado'}`);
    lines.push(`Papel:         ${u.role}`);
    lines.push(`Status:        ${u.status}`);
    lines.push(`Hash Bcrypt:   ${u.passwordHash || 'NULL'}`);
    lines.push(`Último Login:  ${u.lastLogin || 'Nunca'}`);
    lines.push('─────────────────────────────────────────────────────────────────────────────');
    lines.push('');
  });

  fs.writeFileSync(txtPath, lines.join('\n'));
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('✅ EXPORTAÇÃO CONCLUÍDA');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`Arquivo salvo em: ${txtPath}`);
  console.log('');

  process.exit(0);
}

exportAllUsersWithHashes();
