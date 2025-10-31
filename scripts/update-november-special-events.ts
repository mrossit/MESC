/**
 * Script para atualizar disponibilidade de eventos especiais de novembro:
 * - PUC (20/11 às 10h)
 * - São Judas Tadeu mensal (28/11 às 7h, 15h, 19h30)
 */

import { db } from '../server/db.js';
import { users, questionnaireResponses, questionnaires } from '@shared/schema';
import { eq, and } from 'drizzle-orm';

interface MinisterAvailability {
  email: string;
  puc_20_11: boolean;
  sjt_28_11_7h: boolean;
  sjt_28_11_15h: boolean;
  sjt_28_11_19h30: boolean;
}

// Dados do CSV fornecido pelo usuário
const availabilityData: MinisterAvailability[] = [
  {
    email: 'eliane.acquati@adv.oabsp.org.br',
    puc_20_11: true,
    sjt_28_11_7h: true,
    sjt_28_11_15h: false,
    sjt_28_11_19h30: true
  },
  {
    email: 'andre_amorim3@hotmail.com',
    puc_20_11: false,
    sjt_28_11_7h: false,
    sjt_28_11_15h: false,
    sjt_28_11_19h30: true
  },
  {
    email: 'inaraguilherme@gmail.com',
    puc_20_11: true,
    sjt_28_11_7h: true,
    sjt_28_11_15h: true,
    sjt_28_11_19h30: true
  },
  {
    email: 'sophia.olivers2004@gmail.com',
    puc_20_11: false,
    sjt_28_11_7h: false,
    sjt_28_11_15h: false,
    sjt_28_11_19h30: true
  }
];

async function updateNovemberSpecialEvents() {
  console.log('\n🚀 Iniciando atualização de eventos especiais de novembro...\n');

  try {
    // 1. Buscar questionário de novembro 2025
    const [questionnaire] = await db
      .select()
      .from(questionnaires)
      .where(and(eq(questionnaires.month, 11), eq(questionnaires.year, 2025)));

    if (!questionnaire) {
      console.error('❌ Questionário de novembro 2025 não encontrado!');
      return;
    }

    console.log(`✅ Questionário encontrado: ${questionnaire.title} (ID: ${questionnaire.id})\n`);

    let successCount = 0;
    let errorCount = 0;

    // 2. Processar cada ministro
    for (const ministerData of availabilityData) {
      try {
        console.log(`\n📋 Processando: ${ministerData.email}`);

        // 2.1. Buscar usuário
        const [user] = await db
          .select()
          .from(users)
          .where(eq(users.email, ministerData.email));

        if (!user) {
          console.warn(`  ⚠️  Usuário não encontrado: ${ministerData.email}`);
          errorCount++;
          continue;
        }

        console.log(`  ✅ Usuário encontrado: ${user.name} (ID: ${user.id})`);

        // 2.2. Buscar resposta existente
        const [existingResponse] = await db
          .select()
          .from(questionnaireResponses)
          .where(
            and(
              eq(questionnaireResponses.questionnaireId, questionnaire.id),
              eq(questionnaireResponses.userId, user.id)
            )
          );

        // 2.3. Preparar dados de eventos especiais
        const specialEvents: any = {};

        // PUC (Consciência Negra - 20/11)
        if (ministerData.puc_20_11) {
          specialEvents.consciencia_negra = true;
          specialEvents.puc_20_11 = true; // Alias para compatibilidade
        }

        // São Judas Tadeu mensal (28/11)
        if (ministerData.sjt_28_11_7h) {
          specialEvents.saint_judas_monthly_7h = true;
        }
        if (ministerData.sjt_28_11_15h) {
          specialEvents.saint_judas_monthly_15h = true;
        }
        if (ministerData.sjt_28_11_19h30) {
          specialEvents.saint_judas_monthly_19h30 = true;
        }

        if (existingResponse) {
          // 2.4. Atualizar resposta existente
          console.log(`  📝 Atualizando resposta existente...`);

          // Parse existing response (field is TEXT storing JSON string)
          const currentResponse = typeof existingResponse.responses === 'string'
            ? JSON.parse(existingResponse.responses)
            : existingResponse.responses;

          // Merge special events
          const updatedResponse = {
            ...currentResponse,
            special_events: {
              ...(currentResponse.special_events || {}),
              ...specialEvents
            }
          };

          // Update in database (stringify back to TEXT)
          await db
            .update(questionnaireResponses)
            .set({
              responses: JSON.stringify(updatedResponse),
              submittedAt: new Date()
            })
            .where(eq(questionnaireResponses.id, existingResponse.id));

          console.log(`  ✅ Resposta atualizada com sucesso!`);
          console.log(`     Eventos adicionados:`, Object.keys(specialEvents).join(', '));

        } else {
          // 2.5. Criar nova resposta
          console.log(`  📝 Criando nova resposta...`);

          const newResponse = {
            format_version: '2.0',
            monthly_availability: 'Sim',
            special_events: specialEvents,
            masses: {},
            weekdays: {}
          };

          await db.insert(questionnaireResponses).values({
            questionnaireId: questionnaire.id,
            userId: user.id,
            responses: JSON.stringify(newResponse),
            submittedAt: new Date()
          });

          console.log(`  ✅ Nova resposta criada com sucesso!`);
          console.log(`     Eventos adicionados:`, Object.keys(specialEvents).join(', '));
        }

        successCount++;

      } catch (error) {
        console.error(`  ❌ Erro ao processar ${ministerData.email}:`, error);
        errorCount++;
      }
    }

    // 3. Resumo final
    console.log('\n' + '='.repeat(60));
    console.log('📊 RESUMO DA ATUALIZAÇÃO:');
    console.log('='.repeat(60));
    console.log(`✅ Ministros atualizados com sucesso: ${successCount}`);
    console.log(`❌ Erros encontrados: ${errorCount}`);
    console.log(`📝 Total processado: ${availabilityData.length}`);
    console.log('='.repeat(60) + '\n');

    // 4. Verificar dados atualizados
    console.log('🔍 Verificando dados atualizados...\n');

    for (const ministerData of availabilityData) {
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.email, ministerData.email));

      if (!user) continue;

      const [response] = await db
        .select()
        .from(questionnaireResponses)
        .where(
          and(
            eq(questionnaireResponses.questionnaireId, questionnaire.id),
            eq(questionnaireResponses.userId, user.id)
          )
        );

      if (response) {
        const parsed = typeof response.responses === 'string'
          ? JSON.parse(response.responses)
          : response.responses;

        console.log(`${user.name}:`);
        console.log(`  PUC 20/11: ${parsed.special_events?.puc_20_11 || parsed.special_events?.consciencia_negra ? '✅' : '❌'}`);
        console.log(`  SJT 7h: ${parsed.special_events?.saint_judas_monthly_7h ? '✅' : '❌'}`);
        console.log(`  SJT 15h: ${parsed.special_events?.saint_judas_monthly_15h ? '✅' : '❌'}`);
        console.log(`  SJT 19h30: ${parsed.special_events?.saint_judas_monthly_19h30 ? '✅' : '❌'}`);
        console.log('');
      }
    }

    console.log('✅ Atualização concluída com sucesso!\n');

  } catch (error) {
    console.error('❌ Erro fatal durante atualização:', error);
    throw error;
  }
}

// Executar script
updateNovemberSpecialEvents()
  .then(() => {
    console.log('🎉 Script finalizado!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Script falhou:', error);
    process.exit(1);
  });
