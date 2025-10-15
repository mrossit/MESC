#!/usr/bin/env tsx

/**
 * Debug: Revisar leitura de disponibilidade para TODAS as missas
 *
 * Verifica:
 * - Domingos 08:00 e 19:00
 * - Dias de semana 06:30
 * - Missas especiais (Cura e Libertação, Sagrado Coração)
 * - Novena São Judas
 */

import { ResponseCompiler } from '../server/services/responseCompiler';
import { AvailabilityService } from '../server/services/availabilityService';
import { format, startOfMonth, endOfMonth, addDays, getDay } from 'date-fns';

async function main() {
  console.log('🔍 Revisando leitura de disponibilidade para TODAS as missas...\n');

  // Compilar respostas
  const compiled = await ResponseCompiler.compileMonthlyResponses(10, 2025);
  const service = new AvailabilityService(compiled);

  console.log(`✅ ${compiled.size} respostas compiladas\n`);

  // ==========================================
  // 1. DOMINGOS
  // ==========================================
  console.log('='.repeat(80));
  console.log('1️⃣  DOMINGOS - Verificando disponibilidade');
  console.log('='.repeat(80));
  console.log('');

  const sundays = [
    '2025-10-05',
    '2025-10-12',
    '2025-10-19',
    '2025-10-26'
  ];

  for (const date of sundays) {
    console.log(`📅 ${date} (Domingo)`);

    const available08 = service.getAvailableMinistersForMass(date, '08:00');
    const available10 = service.getAvailableMinistersForMass(date, '10:00');
    const available19 = service.getAvailableMinistersForMass(date, '19:00');

    console.log(`   08:00 - ${available08.length} ministros`);
    console.log(`   10:00 - ${available10.length} ministros`);
    console.log(`   19:00 - ${available19.length} ministros`);

    if (available08.length === 0) {
      console.log('   ⚠️  PROBLEMA: Nenhum ministro encontrado para 08:00!');
    }
    if (available19.length === 0) {
      console.log('   ⚠️  PROBLEMA: Nenhum ministro encontrado para 19:00!');
    }

    console.log('');
  }

  // ==========================================
  // 2. DIAS DE SEMANA (06:30)
  // ==========================================
  console.log('='.repeat(80));
  console.log('2️⃣  DIAS DE SEMANA - Verificando 06:30');
  console.log('='.repeat(80));
  console.log('');

  // Verificar primeira semana de outubro
  const weekdayDates = [
    { date: '2025-10-01', day: 'Quarta' },
    { date: '2025-10-02', day: 'Quinta' },
    { date: '2025-10-03', day: 'Sexta' },
    { date: '2025-10-06', day: 'Segunda' },
    { date: '2025-10-07', day: 'Terça' }
  ];

  for (const { date, day } of weekdayDates) {
    const available = service.getAvailableMinistersForMass(date, '06:30');
    console.log(`📅 ${date} (${day}) 06:30 - ${available.length} ministros`);

    if (available.length === 0) {
      console.log('   ⚠️  Nenhum ministro disponível!');
    } else if (available.length < 4) {
      console.log(`   ⚠️  Apenas ${available.length} ministros (mínimo: 4)`);
    }
  }

  console.log('');

  // ==========================================
  // 3. MISSAS ESPECIAIS
  // ==========================================
  console.log('='.repeat(80));
  console.log('3️⃣  MISSAS ESPECIAIS');
  console.log('='.repeat(80));
  console.log('');

  // Cura e Libertação (Quinta 19:30)
  console.log('🙏 Missa de Cura e Libertação (Quinta 19:30)');
  const thursdays = [
    '2025-10-02',
    '2025-10-09',
    '2025-10-16',
    '2025-10-23',
    '2025-10-30'
  ];

  for (const date of thursdays) {
    const available = service.getAvailableMinistersForMass(date, '19:30');
    console.log(`   ${date} - ${available.length} ministros`);

    if (available.length === 0) {
      console.log('      ⚠️  PROBLEMA: Nenhum ministro encontrado!');
    } else if (available.length < 26) {
      console.log(`      ⚠️  Apenas ${available.length}/26 ministros (insuficiente)`);
    }
  }

  console.log('');

  // Sagrado Coração de Jesus (Sexta 06:30)
  console.log('❤️  Missa Votiva ao Sagrado Coração de Jesus (Sexta 06:30)');
  const fridays = [
    '2025-10-03',
    '2025-10-10',
    '2025-10-17',
    '2025-10-24',
    '2025-10-31'
  ];

  for (const date of fridays) {
    const available = service.getAvailableMinistersForMass(date, '06:30');
    console.log(`   ${date} - ${available.length} ministros`);

    if (available.length === 0) {
      console.log('      ⚠️  PROBLEMA: Nenhum ministro encontrado!');
    } else if (available.length < 8) {
      console.log(`      ⚠️  Apenas ${available.length}/8 ministros (insuficiente)`);
    }
  }

  console.log('');

  // ==========================================
  // 4. INVESTIGAR FORMATO DOS DADOS
  // ==========================================
  console.log('='.repeat(80));
  console.log('4️⃣  INVESTIGANDO FORMATO DOS DADOS COMPILADOS');
  console.log('='.repeat(80));
  console.log('');

  // Pegar um ministro de exemplo que respondeu
  const sampleMinister = Array.from(compiled.values())[0];

  console.log('📋 Exemplo de dados compilados (primeiro ministro):');
  console.log(`   Nome: ${sampleMinister.userName}`);
  console.log(`   Mês/Ano: ${sampleMinister.month}/${sampleMinister.year}`);
  console.log('');

  console.log('   Datas específicas disponíveis:');
  const dates = Object.keys(sampleMinister.availability.dates).slice(0, 5);
  for (const date of dates) {
    const dayData = sampleMinister.availability.dates[date];
    const times = Object.keys(dayData.times);
    console.log(`      ${date}: ${times.join(', ')}`);
  }
  console.log('');

  console.log('   Disponibilidade semanal (weekdays):');
  const weekdays = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  for (const day of weekdays) {
    const dayData = sampleMinister.availability.weekdays[day];
    if (dayData && Object.keys(dayData.times).length > 0) {
      const times = Object.keys(dayData.times);
      console.log(`      ${day}: ${times.join(', ')}`);
    }
  }

  console.log('');

  // ==========================================
  // 5. VERIFICAR MINISTROS COM DISPONIBILIDADE SEMANAL
  // ==========================================
  console.log('='.repeat(80));
  console.log('5️⃣  MINISTROS COM DISPONIBILIDADE SEMANAL (weekdays)');
  console.log('='.repeat(80));
  console.log('');

  let countWithWeekdayAvailability = 0;
  const ministersWithWeekdays: string[] = [];

  for (const [userId, data] of compiled) {
    let hasWeekday = false;

    for (const day of weekdays) {
      const dayData = data.availability.weekdays[day];
      if (dayData && Object.keys(dayData.times).length > 0) {
        hasWeekday = true;
        break;
      }
    }

    if (hasWeekday) {
      countWithWeekdayAvailability++;
      ministersWithWeekdays.push(data.userName);
    }
  }

  console.log(`Total: ${countWithWeekdayAvailability} ministros com disponibilidade semanal`);

  if (countWithWeekdayAvailability > 0) {
    console.log('\nMinistros:');
    ministersWithWeekdays.forEach(name => console.log(`   - ${name}`));
  }

  console.log('');

  // ==========================================
  // 6. RESUMO E DIAGNÓSTICO
  // ==========================================
  console.log('='.repeat(80));
  console.log('📊 RESUMO E DIAGNÓSTICO');
  console.log('='.repeat(80));
  console.log('');

  // Contar total de disponibilidades por tipo
  let totalDateAvailabilities = 0;
  let totalWeekdayAvailabilities = 0;

  for (const [userId, data] of compiled) {
    // Contar datas específicas
    for (const date in data.availability.dates) {
      const times = Object.keys(data.availability.dates[date].times);
      totalDateAvailabilities += times.length;
    }

    // Contar weekdays
    for (const day of weekdays) {
      const dayData = data.availability.weekdays[day];
      if (dayData) {
        totalWeekdayAvailabilities += Object.keys(dayData.times).length;
      }
    }
  }

  console.log(`Total de disponibilidades por data específica: ${totalDateAvailabilities}`);
  console.log(`Total de disponibilidades por dia da semana: ${totalWeekdayAvailabilities}`);
  console.log('');

  console.log('🔍 POSSÍVEIS PROBLEMAS:');
  console.log('');

  if (totalWeekdayAvailabilities === 0) {
    console.log('❌ CRÍTICO: Nenhuma disponibilidade semanal detectada!');
    console.log('   → Possível causa: Questionário não pergunta sobre missas diárias');
    console.log('   → Solução: Sistema precisa usar apenas datas específicas para dias de semana');
  } else {
    console.log('✅ Disponibilidades semanais detectadas');
  }

  console.log('');

  // Verificar se domingos têm 08:00 e 19:00
  let sundaysWithMorning = 0;
  let sundaysWithEvening = 0;

  for (const date of sundays) {
    const available08 = service.getAvailableMinistersForMass(date, '08:00');
    const available19 = service.getAvailableMinistersForMass(date, '19:00');

    if (available08.length > 0) sundaysWithMorning++;
    if (available19.length > 0) sundaysWithEvening++;
  }

  if (sundaysWithMorning === 0) {
    console.log('❌ CRÍTICO: Nenhum domingo com disponibilidade às 08:00!');
    console.log('   → Possível causa: Questionário só pergunta sobre 10:00');
    console.log('   → Solução: Ajustar lógica para distribuir 10:00 entre 08:00 e 19:00');
  } else {
    console.log(`✅ Domingos com disponibilidade às 08:00: ${sundaysWithMorning}/4`);
  }

  if (sundaysWithEvening === 0) {
    console.log('❌ CRÍTICO: Nenhum domingo com disponibilidade às 19:00!');
    console.log('   → Possível causa: Questionário só pergunta sobre 10:00');
    console.log('   → Solução: Ajustar lógica para distribuir 10:00 entre 08:00 e 19:00');
  } else {
    console.log(`✅ Domingos com disponibilidade às 19:00: ${sundaysWithEvening}/4`);
  }

  console.log('');
  console.log('='.repeat(80));
}

main().catch(console.error);
