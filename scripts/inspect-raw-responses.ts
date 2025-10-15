#!/usr/bin/env tsx

/**
 * Inspecionar respostas brutas do questionário
 * Para entender por que a leitura pode estar incorreta
 */

import { db } from '../server/db';
import { questionnaireResponses, users, questionnaires } from '@shared/schema';
import { eq, and } from 'drizzle-orm';

async function main() {
  console.log('🔍 Inspecionando respostas brutas do questionário de Outubro 2025...\n');

  // 1. Buscar questionário
  const questionnaire = await db.select()
    .from(questionnaires)
    .where(and(
      eq(questionnaires.month, 10),
      eq(questionnaires.year, 2025)
    ))
    .limit(1);

  if (questionnaire.length === 0) {
    console.log('❌ Questionário de outubro 2025 não encontrado!');
    return;
  }

  const questionnaireId = questionnaire[0].id;
  console.log(`✅ Questionário encontrado: ${questionnaireId}`);
  console.log(`   Formato: ${questionnaire[0].format_version || 'V1.0'}\n`);

  // 2. Buscar respostas
  const responses = await db.select({
    response: questionnaireResponses,
    user: users
  })
    .from(questionnaireResponses)
    .innerJoin(users, eq(questionnaireResponses.userId, users.id))
    .where(eq(questionnaireResponses.questionnaireId, questionnaireId));

  console.log(`✅ Total de respostas: ${responses.length}\n`);

  // 3. Examinar primeiras 3 respostas em detalhe
  console.log('='.repeat(80));
  console.log('EXEMPLOS DE RESPOSTAS BRUTAS (primeiras 3)');
  console.log('='.repeat(80));
  console.log('');

  for (let i = 0; i < Math.min(3, responses.length); i++) {
    const { response, user } = responses[i];

    console.log(`\n[${ i + 1}] ${user.name}`);
    console.log('-'.repeat(80));

    // Examinar formato da resposta
    const data = response.response as any;

    if (!data) {
      console.log('⚠️  Resposta vazia ou null');
      continue;
    }

    console.log('Formato detectado:');
    console.log(`  format_version: ${data?.format_version || 'não definido'}`);
    console.log(`  Tipo: ${typeof data}`);
    console.log(`  Chaves: ${data ? Object.keys(data).join(', ') : 'N/A'}`);
    console.log('');

    // Mostrar conteúdo completo
    console.log('Conteúdo completo:');
    console.log(JSON.stringify(data, null, 2));
    console.log('');
  }

  // 4. Analisar estrutura de TODAS as respostas
  console.log('='.repeat(80));
  console.log('ANÁLISE DE ESTRUTURA DE TODAS AS RESPOSTAS');
  console.log('='.repeat(80));
  console.log('');

  const structures = new Map<string, number>();

  for (const { response } of responses) {
    const data = response.response as any;
    if (!data) continue;
    const keys = Object.keys(data).sort().join(',');
    structures.set(keys, (structures.get(keys) || 0) + 1);
  }

  console.log('Estruturas encontradas:');
  for (const [keys, count] of structures) {
    console.log(`  ${count}x: ${keys}`);
  }
  console.log('');

  // 5. Verificar se há campos de disponibilidade que não estamos lendo
  console.log('='.repeat(80));
  console.log('CAMPOS DE DISPONIBILIDADE NAS RESPOSTAS');
  console.log('='.repeat(80));
  console.log('');

  const allKeys = new Set<string>();
  for (const { response } of responses) {
    const data = response.response as any;
    if (!data) continue;
    Object.keys(data).forEach(key => allKeys.add(key));
  }

  console.log('Todos os campos encontrados nas respostas:');
  Array.from(allKeys).sort().forEach(key => {
    const count = responses.filter(r => (r.response.response as any)[key] !== undefined).length;
    console.log(`  ${key}: presente em ${count}/${responses.length} respostas`);
  });
  console.log('');

  // 6. Verificar resposta de um ministro específico que sabemos ter respondido
  console.log('='.repeat(80));
  console.log('ANÁLISE DETALHADA: Eliane Machado (sabemos que tem disponibilidade diária)');
  console.log('='.repeat(80));
  console.log('');

  const elianeResponse = responses.find(r => r.user.name.includes('Eliane'));

  if (elianeResponse) {
    console.log('✅ Resposta encontrada:');
    console.log(JSON.stringify(elianeResponse.response.response, null, 2));
  } else {
    console.log('❌ Resposta não encontrada');
  }
  console.log('');

  // 7. Verificar campos array vs objeto
  console.log('='.repeat(80));
  console.log('ANÁLISE: Campos que são arrays');
  console.log('='.repeat(80));
  console.log('');

  const sampleResponse = responses[0].response.response as any;

  for (const [key, value] of Object.entries(sampleResponse)) {
    if (Array.isArray(value)) {
      console.log(`Campo "${key}": ARRAY com ${value.length} itens`);
      if (value.length > 0) {
        console.log(`  Exemplo de item: ${JSON.stringify(value[0])}`);
      }
    }
  }
  console.log('');

  // 8. Contar quantos ministros têm cada tipo de disponibilidade
  console.log('='.repeat(80));
  console.log('ESTATÍSTICAS DE DISPONIBILIDADE');
  console.log('='.repeat(80));
  console.log('');

  let countWithSundays = 0;
  let countWithWeekdays = 0;
  let countWithNovena = 0;
  let countWithFeast = 0;
  let countWithHealing = 0;

  for (const { response } of responses) {
    const data = response.response as any;

    // Procurar por diferentes formas de expressar disponibilidade
    const dataStr = JSON.stringify(data).toLowerCase();

    if (dataStr.includes('domingo') || dataStr.includes('sunday')) countWithSundays++;
    if (dataStr.includes('segunda') || dataStr.includes('terça') || dataStr.includes('quarta') ||
        dataStr.includes('quinta') || dataStr.includes('sexta') || dataStr.includes('sábado') ||
        dataStr.includes('monday') || dataStr.includes('tuesday') || dataStr.includes('wednesday')) {
      countWithWeekdays++;
    }
    if (dataStr.includes('novena')) countWithNovena++;
    if (dataStr.includes('são judas') || dataStr.includes('festa') || dataStr.includes('28/10')) countWithFeast++;
    if (dataStr.includes('cura') || dataStr.includes('libertação')) countWithHealing++;
  }

  console.log(`Ministros com disponibilidade para:`);
  console.log(`  Domingos: ${countWithSundays}/${responses.length}`);
  console.log(`  Dias de semana: ${countWithWeekdays}/${responses.length}`);
  console.log(`  Novena: ${countWithNovena}/${responses.length}`);
  console.log(`  Festa São Judas: ${countWithFeast}/${responses.length}`);
  console.log(`  Cura e Libertação: ${countWithHealing}/${responses.length}`);
  console.log('');

  // 9. Verificar se o formato V1_ARRAY está sendo processado corretamente
  console.log('='.repeat(80));
  console.log('CAMPOS ARRAYS - ANÁLISE PROFUNDA');
  console.log('='.repeat(80));
  console.log('');

  for (const { response, user } of responses.slice(0, 5)) {
    const data = response.response as any;

    console.log(`${user.name}:`);

    for (const [key, value] of Object.entries(data)) {
      if (Array.isArray(value) && value.length > 0) {
        console.log(`  ${key}: [${value.length} itens]`);
        console.log(`    Exemplos: ${value.slice(0, 3).join(', ')}`);
      }
    }
    console.log('');
  }
}

main().catch(console.error);
