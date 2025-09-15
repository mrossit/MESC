import { db } from '../server/db';
import { users, questionnaires, questionnaireResponses } from '@shared/schema';
import { eq, and, ne } from 'drizzle-orm';

async function simulateSeptemberResponses() {
  try {
    console.log('🎯 Iniciando simulação de respostas para SETEMBRO/2025...\n');

    // 1. Buscar o questionário de setembro
    const [septemberQuestionnaire] = await db
      .select()
      .from(questionnaires)
      .where(and(
        eq(questionnaires.month, 9),
        eq(questionnaires.year, 2025)
      ))
      .limit(1);

    if (!septemberQuestionnaire) {
      console.log('❌ Questionário de setembro/2025 não encontrado!');
      console.log('Criando questionário de setembro...');

      // Criar questionário se não existir
      const [newQuestionnaire] = await db
        .insert(questionnaires)
        .values({
          month: 9,
          year: 2025,
          questions: [
            {
              id: '1',
              type: 'availability',
              text: 'Quais domingos você estará disponível em setembro?',
              required: true,
              options: []
            },
            {
              id: '2',
              type: 'yesno',
              text: 'Você tem alguma restrição de horário?',
              required: true
            },
            {
              id: '3',
              type: 'text',
              text: 'Se sim, qual?',
              required: false,
              conditional: {
                questionId: '2',
                value: 'sim'
              }
            },
            {
              id: '4',
              type: 'multiple',
              text: 'Quais funções você pode exercer?',
              required: true,
              options: ['CEPE', 'Comentarista', 'Acolhida', 'Liturgia']
            },
            {
              id: '5',
              type: 'yesno',
              text: 'Você participará da formação mensal?',
              required: true
            },
            {
              id: '6',
              type: 'multiple',
              text: 'Preferência de horário de missa:',
              required: true,
              options: ['7h', '10h', '18h30', 'Qualquer horário']
            },
            {
              id: '7',
              type: 'yesno',
              text: 'Você tem algum impedimento de saúde?',
              required: true
            },
            {
              id: '8',
              type: 'text',
              text: 'Se sim, qual?',
              required: false,
              conditional: {
                questionId: '7',
                value: 'sim'
              }
            },
            {
              id: '9',
              type: 'text',
              text: 'Observações adicionais:',
              required: false
            },
            {
              id: '10',
              type: 'yesno',
              text: 'Você confirma disponibilidade para todo o mês?',
              required: true
            }
          ],
          status: 'open',
          createdBy: 'system',
          createdAt: new Date(),
          updatedAt: new Date()
        })
        .returning();

      console.log('✅ Questionário criado:', newQuestionnaire.id);
    }

    // 2. Buscar novamente o questionário (garante que existe)
    const [questionnaire] = await db
      .select()
      .from(questionnaires)
      .where(and(
        eq(questionnaires.month, 9),
        eq(questionnaires.year, 2025)
      ))
      .limit(1);

    console.log('📋 Questionário encontrado:', questionnaire.id);
    console.log('Mês/Ano:', `${questionnaire.month}/${questionnaire.year}`);

    // 3. Buscar todos os usuários ativos (exceto admin)
    const activeUsers = await db
      .select()
      .from(users)
      .where(ne(users.role, 'admin'));

    console.log(`\n👥 ${activeUsers.length} usuários ativos encontrados`);

    // 4. Verificar respostas existentes
    const existingResponses = await db
      .select()
      .from(questionnaireResponses)
      .where(eq(questionnaireResponses.questionnaireId, questionnaire.id));

    const usersWithResponses = new Set(existingResponses.map(r => r.userId));
    console.log(`📊 ${existingResponses.length} respostas já existentes`);

    // 5. Criar respostas simuladas para cada usuário
    let responsesCreated = 0;
    const domingos = ['01/09', '08/09', '15/09', '22/09', '29/09'];
    const funcoes = ['CEPE', 'Comentarista', 'Acolhida', 'Liturgia'];
    const horarios = ['7h', '10h', '18h30', 'Qualquer horário'];

    for (const user of activeUsers) {
      // Pular se usuário já respondeu
      if (usersWithResponses.has(user.id)) {
        console.log(`⏭️  ${user.name} - já respondeu`);
        continue;
      }

      // Gerar respostas aleatórias mas realistas
      const disponibilidade = Math.random() > 0.2; // 80% disponível
      const restricaoHorario = Math.random() > 0.7; // 30% tem restrição
      const impedimentoSaude = Math.random() > 0.9; // 10% tem impedimento
      const participaFormacao = Math.random() > 0.3; // 70% participa

      // Selecionar domingos aleatórios (pelo menos 2)
      const numDomingos = Math.floor(Math.random() * 3) + 2; // 2 a 4 domingos
      const domingosDisponiveis = domingos
        .sort(() => Math.random() - 0.5)
        .slice(0, numDomingos);

      // Selecionar funções aleatórias (pelo menos 1)
      const numFuncoes = Math.floor(Math.random() * 3) + 1; // 1 a 3 funções
      const funcoesEscolhidas = funcoes
        .sort(() => Math.random() - 0.5)
        .slice(0, numFuncoes);

      // Selecionar horários preferidos
      const numHorarios = Math.floor(Math.random() * 2) + 1; // 1 a 2 horários
      const horariosEscolhidos = horarios
        .sort(() => Math.random() - 0.5)
        .slice(0, numHorarios);

      const responses = {
        '1': domingosDisponiveis,
        '2': restricaoHorario ? 'sim' : 'não',
        '3': restricaoHorario ? 'Não posso após 19h' : '',
        '4': funcoesEscolhidas,
        '5': participaFormacao ? 'sim' : 'não',
        '6': horariosEscolhidos,
        '7': impedimentoSaude ? 'sim' : 'não',
        '8': impedimentoSaude ? 'Problema no joelho' : '',
        '9': disponibilidade ? 'Estou à disposição' : 'Confirmar por WhatsApp',
        '10': disponibilidade ? 'sim' : 'não'
      };

      try {
        await db.insert(questionnaireResponses).values({
          userId: user.id,
          questionnaireId: questionnaire.id,
          responses,
          submittedAt: new Date()
        });

        responsesCreated++;
        console.log(`✅ ${user.name} - resposta criada`);
      } catch (error) {
        console.log(`❌ ${user.name} - erro ao criar resposta:`, error);
      }
    }

    console.log('\n📊 Resumo da Simulação:');
    console.log('='.repeat(40));
    console.log(`Total de usuários ativos: ${activeUsers.length}`);
    console.log(`Respostas já existentes: ${existingResponses.length}`);
    console.log(`Novas respostas criadas: ${responsesCreated}`);
    console.log(`Total de respostas agora: ${existingResponses.length + responsesCreated}`);

    // 6. Verificar estatísticas finais
    const allResponses = await db
      .select()
      .from(questionnaireResponses)
      .where(eq(questionnaireResponses.questionnaireId, questionnaire.id));

    console.log('\n📈 Estatísticas do Questionário:');
    console.log(`Taxa de resposta: ${((allResponses.length / activeUsers.length) * 100).toFixed(1)}%`);

    // Contar disponibilidades por domingo
    const availabilityCount: Record<string, number> = {};
    for (const response of allResponses) {
      const availability = (response.responses as any)['1'];
      if (Array.isArray(availability)) {
        for (const domingo of availability) {
          availabilityCount[domingo] = (availabilityCount[domingo] || 0) + 1;
        }
      }
    }

    console.log('\n📅 Disponibilidade por domingo:');
    for (const [domingo, count] of Object.entries(availabilityCount).sort()) {
      console.log(`  ${domingo}: ${count} ministros`);
    }

    console.log('\n✅ Simulação concluída com sucesso!');
    console.log('Agora você pode testar a geração de escala automática.');

  } catch (error) {
    console.error('❌ Erro na simulação:', error);
  }

  process.exit(0);
}

simulateSeptemberResponses();