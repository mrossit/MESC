#!/usr/bin/env tsx

const API_URL = process.env.PORT ? `http://localhost:${process.env.PORT}` : 'http://localhost:5000';

async function reopenSeptemberQuestionnaire() {
  try {
    // 1. Fazer login como administrador
    console.log('Fazendo login como administrador...');
    const loginResponse = await fetch(`${API_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'temp-admin@paroquia.com',
        password: 'september2024'
      })
    });

    if (!loginResponse.ok) {
      throw new Error(`Login falhou: ${loginResponse.status}`);
    }

    const loginData = await loginResponse.json();
    const { token } = loginData;
    console.log('Login realizado com sucesso!');

    // 2. Buscar questionário de setembro de 2025
    console.log('Buscando questionário de setembro de 2025...');
    const templatesResponse = await fetch(
      `${API_URL}/api/questionnaires/admin/templates/2025/9`,
      {
        headers: { Authorization: `Bearer ${token}` }
      }
    );

    if (!templatesResponse.ok && templatesResponse.status !== 404) {
      throw new Error(`Erro ao buscar template: ${templatesResponse.status}`);
    }

    const template = templatesResponse.status === 404 ? null : await templatesResponse.json();

    if (!template || !template.id) {
      console.log('Questionário de setembro não encontrado. Gerando novo...');

      // Gerar novo questionário se não existir
      const generateResponse = await fetch(
        `${API_URL}/api/questionnaires/admin/templates/generate`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ month: 9, year: 2025 })
        }
      );

      if (!generateResponse.ok) {
        const errorText = await generateResponse.text();
        console.error('Resposta de erro:', errorText);
        throw new Error(`Erro ao gerar template: ${generateResponse.status} - ${errorText}`);
      }

      const newTemplate = await generateResponse.json();
      console.log('Novo questionário gerado com ID:', newTemplate.id);

      // Enviar questionário
      console.log('Enviando questionário aos ministros...');
      const sendResponse = await fetch(
        `${API_URL}/api/questionnaires/admin/templates/2025/9/send`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ resend: false })
        }
      );

      if (!sendResponse.ok) {
        throw new Error(`Erro ao enviar questionário: ${sendResponse.status}`);
      }

      console.log('✅ Questionário de setembro criado e enviado com sucesso!');
      return;
    }

    console.log('Questionário encontrado:', {
      id: template.id,
      status: template.status,
      month: template.month,
      year: template.year
    });

    // 3. Verificar status e reabrir se necessário
    if (template.status === 'closed') {
      console.log('Questionário está fechado. Reabrindo...');

      const reopenResponse = await fetch(
        `${API_URL}/api/questionnaires/admin/templates/${template.id}/reopen`,
        {
          method: 'PATCH',
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      if (!reopenResponse.ok) {
        throw new Error(`Erro ao reabrir questionário: ${reopenResponse.status}`);
      }

      const reopenData = await reopenResponse.json();
      console.log('✅ Questionário reaberto com sucesso!');
      console.log('Status atual:', reopenData.status);
    } else if (template.status === 'sent') {
      console.log('✅ Questionário já está aberto e disponível para respostas!');
      console.log('Status atual:', template.status);
    } else if (template.status === 'draft') {
      console.log('Questionário está em rascunho. Enviando aos ministros...');

      const sendResponse = await fetch(
        `${API_URL}/api/questionnaires/admin/templates/2025/9/send`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ resend: false })
        }
      );

      if (!sendResponse.ok) {
        throw new Error(`Erro ao enviar questionário: ${sendResponse.status}`);
      }

      console.log('✅ Questionário enviado aos ministros com sucesso!');
    } else {
      console.log('Status do questionário:', template.status);
    }

  } catch (error: any) {
    console.error('❌ Erro ao processar questionário:');
    console.error(error.message || error);
    process.exit(1);
  }
}

// Executar o script
console.log('========================================');
console.log('REABRINDO QUESTIONÁRIO DE SETEMBRO 2025');
console.log('========================================\n');

reopenSeptemberQuestionnaire();