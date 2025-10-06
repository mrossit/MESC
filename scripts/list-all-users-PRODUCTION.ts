import { db } from '../server/db';
import { users } from '@shared/schema';

async function listAllUsers() {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📊 LISTANDO TODOS OS USUÁRIOS DO BANCO DE PRODUÇÃO');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  try {
    const allUsers = await db.select({
      id: users.id,
      email: users.email,
      name: users.name,
      role: users.role,
      status: users.status,
      phone: users.phone,
      whatsapp: users.whatsapp,
      lastLogin: users.lastLogin,
      createdAt: users.createdAt,
      baptismDate: users.baptismDate,
      baptismParish: users.baptismParish,
      confirmationDate: users.confirmationDate,
      confirmationParish: users.confirmationParish,
      marriageDate: users.marriageDate,
      marriageParish: users.marriageParish,
      maritalStatus: users.maritalStatus,
      address: users.address,
      city: users.city,
      birthDate: users.birthDate
    }).from(users);

    console.log(`✅ Total de usuários: ${allUsers.length}\n`);

    // Agrupar por papel
    const porPapel = {
      gestor: allUsers.filter(u => u.role === 'gestor'),
      coordenador: allUsers.filter(u => u.role === 'coordenador'),
      ministro: allUsers.filter(u => u.role === 'ministro')
    };

    const porStatus = {
      active: allUsers.filter(u => u.status === 'active'),
      pending: allUsers.filter(u => u.status === 'pending'),
      inactive: allUsers.filter(u => u.status === 'inactive')
    };

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📊 RESUMO GERAL');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`Total:        ${allUsers.length} usuários`);
    console.log(`Gestores:     ${porPapel.gestor.length}`);
    console.log(`Coordenadores:${porPapel.coordenador.length}`);
    console.log(`Ministros:    ${porPapel.ministro.length}`);
    console.log('');
    console.log(`Ativos:       ${porStatus.active.length}`);
    console.log(`Pendentes:    ${porStatus.pending.length}`);
    console.log(`Inativos:     ${porStatus.inactive.length}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    // GESTORES
    if (porPapel.gestor.length > 0) {
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('👑 GESTORES (' + porPapel.gestor.length + ')');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      porPapel.gestor.forEach((u, i) => {
        console.log(`\n${i + 1}. ${u.name}`);
        console.log(`   Email:        ${u.email}`);
        console.log(`   Status:       ${u.status}`);
        console.log(`   Último login: ${u.lastLogin || 'Nunca'}`);
        console.log(`   Criado em:    ${u.createdAt}`);
      });
      console.log('');
    }

    // COORDENADORES
    if (porPapel.coordenador.length > 0) {
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('⭐ COORDENADORES (' + porPapel.coordenador.length + ')');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      porPapel.coordenador.forEach((u, i) => {
        console.log(`\n${i + 1}. ${u.name}`);
        console.log(`   Email:        ${u.email}`);
        console.log(`   Status:       ${u.status}`);
        console.log(`   Telefone:     ${u.phone || 'Não informado'}`);
        console.log(`   Último login: ${u.lastLogin || 'Nunca'}`);
        console.log(`   Criado em:    ${u.createdAt}`);
      });
      console.log('');
    }

    // MINISTROS
    if (porPapel.ministro.length > 0) {
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('✝️  MINISTROS (' + porPapel.ministro.length + ')');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      porPapel.ministro.forEach((u, i) => {
        console.log(`\n${i + 1}. ${u.name}`);
        console.log(`   Email:        ${u.email}`);
        console.log(`   Status:       ${u.status}`);
        console.log(`   Telefone:     ${u.phone || 'Não informado'}`);
        console.log(`   WhatsApp:     ${u.whatsapp || 'Não informado'}`);
        console.log(`   Cidade:       ${u.city || 'Não informado'}`);
        console.log(`   Último login: ${u.lastLogin || 'Nunca'}`);

        // Dados religiosos (se houver)
        if (u.baptismParish || u.confirmationParish || u.marriageParish) {
          console.log('   ───────────────────────────────────────');
          console.log('   📿 DADOS SACRAMENTAIS:');
          if (u.baptismDate || u.baptismParish) {
            console.log(`   Batismo:      ${u.baptismDate || '?'} - ${u.baptismParish || 'Não informado'}`);
          }
          if (u.confirmationDate || u.confirmationParish) {
            console.log(`   Confirmação:  ${u.confirmationDate || '?'} - ${u.confirmationParish || 'Não informado'}`);
          }
          if (u.marriageDate || u.marriageParish) {
            console.log(`   Casamento:    ${u.marriageDate || '?'} - ${u.marriageParish || 'Não informado'}`);
          }
        }
      });
      console.log('');
    }

    // EXPORTAR PARA CSV
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('💾 EXPORTANDO PARA CSV...');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    const csvLines = [
      'ID,Email,Nome,Papel,Status,Telefone,WhatsApp,Cidade,UltimoLogin,CriadoEm'
    ];

    allUsers.forEach(u => {
      csvLines.push([
        u.id,
        u.email,
        `"${u.name}"`,
        u.role,
        u.status,
        u.phone || '',
        u.whatsapp || '',
        u.city || '',
        u.lastLogin || '',
        u.createdAt || ''
      ].join(','));
    });

    const fs = await import('fs');
    const path = await import('path');
    const csvPath = path.join(process.cwd(), 'USUARIOS-PRODUCAO-EXPORT.csv');
    fs.writeFileSync(csvPath, csvLines.join('\n'));

    console.log(`✅ Arquivo CSV salvo em: ${csvPath}`);
    console.log(`   Total de linhas: ${csvLines.length - 1} usuários`);

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ EXTRAÇÃO CONCLUÍDA COM SUCESSO');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  } catch (error) {
    console.error('❌ ERRO AO LISTAR USUÁRIOS:', error);
    throw error;
  }

  process.exit(0);
}

listAllUsers();
