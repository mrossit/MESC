#!/usr/bin/env tsx

const API_URL = process.env.PORT ? `http://localhost:${process.env.PORT}` : 'http://localhost:5000';

async function testProfileUpdate() {
  try {
    // 1. Login
    console.log('Fazendo login...');
    const loginResponse = await fetch(`${API_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'joao.silva@paroquia.com',
        password: 'ministro123'
      })
    });

    if (!loginResponse.ok) {
      throw new Error(`Login falhou: ${loginResponse.status}`);
    }

    const { token, user } = await loginResponse.json();
    console.log('Login OK - Usuário:', user.name);

    // 2. Buscar perfil atual
    console.log('\nBuscando perfil atual...');
    const profileResponse = await fetch(`${API_URL}/api/profile`, {
      headers: { Authorization: `Bearer ${token}` }
    });

    if (!profileResponse.ok) {
      throw new Error(`Erro ao buscar perfil: ${profileResponse.status}`);
    }

    const currentProfile = await profileResponse.json();
    console.log('Perfil atual:', {
      name: currentProfile.name,
      phone: currentProfile.phone,
      maritalStatus: currentProfile.maritalStatus
    });

    // 3. Atualizar perfil
    console.log('\nAtualizando perfil...');
    const updateData = {
      name: currentProfile.name,
      phone: '(11) 98765-9999',
      maritalStatus: 'married',
      ministryStartDate: '2020-01-15',
      baptismDate: '1995-05-20',
      confirmationDate: '2010-11-15',
      marriageDate: '2018-06-10'
    };

    console.log('Dados para atualizar:', updateData);

    const updateResponse = await fetch(`${API_URL}/api/profile`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(updateData)
    });

    console.log('Status da resposta:', updateResponse.status);

    if (!updateResponse.ok) {
      const errorText = await updateResponse.text();
      throw new Error(`Erro ao atualizar: ${updateResponse.status} - ${errorText}`);
    }

    const updatedProfile = await updateResponse.json();
    console.log('\n✅ Perfil atualizado com sucesso!');
    console.log('Novo perfil:', {
      name: updatedProfile.name,
      phone: updatedProfile.phone,
      maritalStatus: updatedProfile.maritalStatus,
      ministryStartDate: updatedProfile.ministryStartDate,
      baptismDate: updatedProfile.baptismDate
    });

  } catch (error: any) {
    console.error('❌ Erro:', error.message);
  }
}

console.log('========================================');
console.log('TESTE DE ATUALIZAÇÃO DE PERFIL');
console.log('========================================\n');

testProfileUpdate();