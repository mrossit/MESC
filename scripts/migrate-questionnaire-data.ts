#!/usr/bin/env npx tsx
/**
 * Script de Migração de Dados de Questionários
 *
 * Este script corrige os dados existentes no banco, extraindo as informações
 * do campo 'responses' (JSON array) e populando os campos específicos:
 * - availableSundays
 * - preferredMassTimes
 * - alternativeTimes
 * - dailyMassAvailability
 * - specialEvents
 * - canSubstitute
 * - notes
 *
 * Isso garante que:
 * 1. As escalas possam buscar os dados corretamente
 * 2. O acompanhamento funcione adequadamente
 * 3. A exportação CSV funcione corretamente
 */

import { db } from '../server/db';
import { questionnaireResponses } from '../shared/schema';
import { eq } from 'drizzle-orm';

// Função para extrair dados estruturados das respostas
function extractDataFromResponses(responses: any): {
  availableSundays: string[] | null;
  preferredMassTimes: string[] | null;
  alternativeTimes: string[] | null;
  dailyMassAvailability: string[] | null;
  specialEvents: any;
  canSubstitute: boolean | null;
  notes: string | null;
} {
  const data = {
    availableSundays: null as string[] | null,
    preferredMassTimes: null as string[] | null,
    alternativeTimes: null as string[] | null,
    dailyMassAvailability: null as string[] | null,
    specialEvents: null as any,
    canSubstitute: null as boolean | null,
    notes: null as string | null
  };

  // Se responses não é um array, retornar dados vazios
  if (!Array.isArray(responses)) {
    console.log('⚠️  Responses não é um array:', typeof responses);
    return data;
  }

  responses.forEach((r: any) => {
    const { questionId, answer } = r;

    // Mapear os questionIds para os campos específicos
    switch(questionId) {
      case 'available_sundays':
        if (Array.isArray(answer)) {
          data.availableSundays = answer;
        }
        break;

      case 'main_service_time':
      case 'preferred_mass_times':
        if (answer) {
          if (!data.preferredMassTimes) data.preferredMassTimes = [];
          if (Array.isArray(answer)) {
            data.preferredMassTimes.push(...answer);
          } else {
            data.preferredMassTimes.push(String(answer));
          }
        }
        break;

      case 'other_times_available':
      case 'alternative_times':
        if (typeof answer === 'object' && answer.answer === 'Sim' && answer.selectedOptions) {
          data.alternativeTimes = answer.selectedOptions;
        } else if (Array.isArray(answer)) {
          data.alternativeTimes = answer;
        } else if (answer === 'Sim') {
          // Se respondeu sim mas não selecionou opções
          data.alternativeTimes = [];
        }
        break;

      case 'daily_mass_availability':
      case 'daily_mass':
        if (answer === 'Sim' || answer === true) {
          data.dailyMassAvailability = ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta'];
        } else if (typeof answer === 'object' && answer.selectedOptions) {
          data.dailyMassAvailability = answer.selectedOptions;
        } else if (Array.isArray(answer)) {
          data.dailyMassAvailability = answer;
        }
        break;

      case 'can_substitute':
        if (answer === 'Sim' || answer === true) {
          data.canSubstitute = true;
        } else if (answer === 'Não' || answer === false) {
          data.canSubstitute = false;
        }
        break;

      case 'notes':
      case 'observations':
        if (answer && typeof answer === 'string') {
          data.notes = answer;
        }
        break;

      case 'special_events':
        if (answer) {
          data.specialEvents = answer;
        }
        break;

      // Para questionIds compostos relacionados a disponibilidade mensal
      case 'monthly_availability':
        // Processar disponibilidade mensal se necessário
        break;
    }

    // Verificar se é um evento especial
    if (questionId.includes('special_event_') && answer === 'Sim') {
      if (!data.specialEvents) data.specialEvents = [];
      if (Array.isArray(data.specialEvents)) {
        data.specialEvents.push(questionId.replace('special_event_', ''));
      }
    }
  });

  return data;
}

async function migrateQuestionnaireData() {
  console.log('🚀 Iniciando migração de dados de questionários...\n');

  try {
    // Buscar todas as respostas do banco
    const allResponses = await db
      .select()
      .from(questionnaireResponses)
      .orderBy(questionnaireResponses.submittedAt);

    console.log(`📊 Total de respostas encontradas: ${allResponses.length}\n`);

    let migrated = 0;
    let skipped = 0;
    let errors = 0;

    for (const response of allResponses) {
      try {
        console.log(`\n🔄 Processando resposta ${response.id}...`);

        // Verificar se já tem dados nos campos específicos
        const hasSpecificData =
          (response.availableSundays && response.availableSundays.length > 0) ||
          (response.preferredMassTimes && response.preferredMassTimes.length > 0) ||
          (response.alternativeTimes && response.alternativeTimes.length > 0) ||
          (response.dailyMassAvailability && response.dailyMassAvailability.length > 0);

        if (hasSpecificData) {
          console.log('   ✅ Já possui dados específicos populados, pulando...');
          skipped++;
          continue;
        }

        // Verificar se tem dados no campo responses
        if (!response.responses) {
          console.log('   ⚠️  Sem dados no campo responses, pulando...');
          skipped++;
          continue;
        }

        // Parse do campo responses se for string
        let responsesData = response.responses;
        if (typeof responsesData === 'string') {
          try {
            responsesData = JSON.parse(responsesData);
          } catch (e) {
            console.log('   ❌ Erro ao fazer parse do JSON:', e);
            errors++;
            continue;
          }
        }

        // Extrair dados estruturados
        const extractedData = extractDataFromResponses(responsesData);

        // Verificar se extraiu algum dado útil
        const hasExtractedData =
          extractedData.availableSundays ||
          extractedData.preferredMassTimes ||
          extractedData.alternativeTimes ||
          extractedData.dailyMassAvailability ||
          extractedData.canSubstitute !== null;

        if (!hasExtractedData) {
          console.log('   ℹ️  Nenhum dado relevante extraído');
          skipped++;
          continue;
        }

        // Log dos dados extraídos
        console.log('   📝 Dados extraídos:');
        if (extractedData.availableSundays) {
          console.log(`      - Domingos disponíveis: ${extractedData.availableSundays.length} itens`);
        }
        if (extractedData.preferredMassTimes) {
          console.log(`      - Horários preferidos: ${extractedData.preferredMassTimes.join(', ')}`);
        }
        if (extractedData.alternativeTimes) {
          console.log(`      - Horários alternativos: ${extractedData.alternativeTimes.join(', ')}`);
        }
        if (extractedData.dailyMassAvailability) {
          console.log(`      - Missas diárias: ${extractedData.dailyMassAvailability.join(', ')}`);
        }
        if (extractedData.canSubstitute !== null) {
          console.log(`      - Pode substituir: ${extractedData.canSubstitute ? 'Sim' : 'Não'}`);
        }
        if (extractedData.notes) {
          console.log(`      - Observações: ${extractedData.notes.substring(0, 50)}...`);
        }

        // Atualizar o registro no banco
        await db
          .update(questionnaireResponses)
          .set({
            availableSundays: extractedData.availableSundays,
            preferredMassTimes: extractedData.preferredMassTimes,
            alternativeTimes: extractedData.alternativeTimes,
            dailyMassAvailability: extractedData.dailyMassAvailability,
            specialEvents: extractedData.specialEvents,
            canSubstitute: extractedData.canSubstitute,
            notes: extractedData.notes,
            updatedAt: new Date()
          })
          .where(eq(questionnaireResponses.id, response.id));

        console.log('   ✅ Registro atualizado com sucesso!');
        migrated++;

      } catch (error) {
        console.log(`   ❌ Erro ao processar resposta ${response.id}:`, error);
        errors++;
      }
    }

    // Relatório final
    console.log('\n' + '='.repeat(60));
    console.log('📊 RELATÓRIO DA MIGRAÇÃO:');
    console.log('='.repeat(60));
    console.log(`✅ Migrados com sucesso: ${migrated}`);
    console.log(`⏭️  Pulados (já tinham dados ou sem dados): ${skipped}`);
    console.log(`❌ Erros: ${errors}`);
    console.log(`📊 Total processado: ${allResponses.length}`);
    console.log('='.repeat(60));

    // Verificar o resultado
    if (migrated > 0) {
      console.log('\n🔍 Verificando alguns registros migrados...');

      const verifyResponses = await db
        .select({
          id: questionnaireResponses.id,
          availableSundays: questionnaireResponses.availableSundays,
          preferredMassTimes: questionnaireResponses.preferredMassTimes,
          canSubstitute: questionnaireResponses.canSubstitute
        })
        .from(questionnaireResponses)
        .limit(3);

      verifyResponses.forEach((r, i) => {
        console.log(`\n   Exemplo ${i + 1}:`);
        console.log(`   - ID: ${r.id}`);
        console.log(`   - Domingos: ${r.availableSundays ? r.availableSundays.length + ' dias' : 'vazio'}`);
        console.log(`   - Horários: ${r.preferredMassTimes || 'vazio'}`);
        console.log(`   - Substituto: ${r.canSubstitute}`);
      });
    }

    console.log('\n✅ Migração concluída com sucesso!');
    console.log('💡 As escalas e o acompanhamento agora podem acessar os dados corretamente.');

  } catch (error) {
    console.error('❌ Erro fatal durante a migração:', error);
    process.exit(1);
  } finally {
    process.exit(0);
  }
}

// Executar a migração
migrateQuestionnaireData();