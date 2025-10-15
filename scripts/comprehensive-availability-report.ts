#!/usr/bin/env tsx

/**
 * Relatório completo: TODAS as missas e disponibilidades detectadas
 */

import { ResponseCompiler } from '../server/services/responseCompiler';
import { AvailabilityService } from '../server/services/availabilityService';
import { startOfMonth, endOfMonth, addDays, format, getDay } from 'date-fns';

async function main() {
  console.log('📊 RELATÓRIO COMPLETO DE DISPONIBILIDADES - OUTUBRO 2025\n');
  console.log('='.repeat(80));

  const compiled = await ResponseCompiler.compileMonthlyResponses(10, 2025);
  const service = new AvailabilityService(compiled);

  console.log(`✅ ${compiled.size} respostas compiladas\n`);

  const start = startOfMonth(new Date(2025, 9, 1));
  const end = endOfMonth(start);

  const report: Array<{
    date: string;
    dayName: string;
    time: string;
    type: string;
    available: number;
    required: number;
  }> = [];

  // Domingos
  const sundays = ['2025-10-05', '2025-10-12', '2025-10-19', '2025-10-26'];
  for (const date of sundays) {
    const times = ['08:00', '10:00', '19:00'];
    for (const time of times) {
      const available = service.getAvailableMinistersForMass(date, time);
      report.push({
        date,
        dayName: 'Domingo',
        time,
        type: 'Missa Regular',
        available: available.length,
        required: 15
      });
    }
  }

  // Dias de semana (06:30)
  let currentDate = start;
  while (currentDate <= end) {
    const dayOfWeek = getDay(currentDate);
    const dateStr = format(currentDate, 'yyyy-MM-dd');

    // Segunda a Sexta
    if (dayOfWeek >= 1 && dayOfWeek <= 5) {
      const available = service.getAvailableMinistersForMass(dateStr, '06:30');
      const dayNames = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];

      report.push({
        date: dateStr,
        dayName: dayNames[dayOfWeek],
        time: '06:30',
        type: 'Missa Diária',
        available: available.length,
        required: 4
      });
    }

    currentDate = addDays(currentDate, 1);
  }

  // Missas especiais conhecidas
  const specialMasses = [
    { date: '2025-10-02', time: '19:30', type: 'Cura e Libertação', required: 26 },
    { date: '2025-10-03', time: '06:30', type: 'Sagrado Coração', required: 8 },
    { date: '2025-10-04', time: '06:30', type: 'Imaculado Coração', required: 4 },
  ];

  for (const mass of specialMasses) {
    const available = service.getAvailableMinistersForMass(mass.date, mass.time);
    const dayOfWeek = getDay(new Date(mass.date));
    const dayNames = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];

    report.push({
      date: mass.date,
      dayName: dayNames[dayOfWeek],
      time: mass.time,
      type: mass.type,
      available: available.length,
      required: mass.required
    });
  }

  // Novena São Judas (19-27/10 às 19:30)
  for (let day = 19; day <= 27; day++) {
    if (day === 25) continue; // Domingo
    const dateStr = `2025-10-${day.toString().padStart(2, '0')}`;
    const available = service.getAvailableMinistersForMass(dateStr, '19:30');
    const dayOfWeek = getDay(new Date(dateStr));
    const dayNames = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];

    report.push({
      date: dateStr,
      dayName: dayNames[dayOfWeek],
      time: '19:30',
      type: 'Novena São Judas',
      available: available.length,
      required: 3
    });
  }

  // Festa São Judas (28/10)
  const feastTimes = ['07:00', '10:00', '12:00', '15:00', '17:00', '19:30'];
  for (const time of feastTimes) {
    const available = service.getAvailableMinistersForMass('2025-10-28', time);
    report.push({
      date: '2025-10-28',
      dayName: 'Terça',
      time,
      type: 'Festa São Judas',
      available: available.length,
      required: 26
    });
  }

  // Ordenar por data e hora
  report.sort((a, b) => {
    if (a.date !== b.date) return a.date.localeCompare(b.date);
    return a.time.localeCompare(b.time);
  });

  // Imprimir relatório
  console.log('='.repeat(80));
  console.log('TODAS AS MISSAS DETECTADAS');
  console.log('='.repeat(80));
  console.log('');

  let currentGroup = '';
  let totalMasses = 0;
  let totalAvailable = 0;
  let massesCovered = 0;

  for (const item of report) {
    const group = `${item.date.substring(0, 7)}`; // YYYY-MM

    if (group !== currentGroup) {
      if (currentGroup !== '') console.log('');
      currentGroup = group;
    }

    const status = item.available >= item.required ? '✅' : '⚠️ ';
    const coverage = Math.round((item.available / item.required) * 100);

    console.log(
      `${status} ${item.date} ${item.dayName.padEnd(10)} ${item.time} - ` +
      `${item.type.padEnd(25)} ${item.available.toString().padStart(2)}/${item.required.toString().padStart(2)} ministros (${coverage}%)`
    );

    totalMasses++;
    totalAvailable += item.available;
    if (item.available >= item.required) massesCovered++;
  }

  // Estatísticas gerais
  console.log('');
  console.log('='.repeat(80));
  console.log('ESTATÍSTICAS GERAIS');
  console.log('='.repeat(80));
  console.log('');
  console.log(`Total de missas: ${totalMasses}`);
  console.log(`Missas com cobertura completa: ${massesCovered} (${Math.round(massesCovered/totalMasses*100)}%)`);
  console.log(`Missas com cobertura parcial: ${totalMasses - massesCovered} (${Math.round((totalMasses - massesCovered)/totalMasses*100)}%)`);
  console.log(`Total de disponibilidades: ${totalAvailable}`);
  console.log(`Média de disponibilidades por missa: ${Math.round(totalAvailable/totalMasses)}`);
  console.log('');

  // Breakdown por tipo
  console.log('='.repeat(80));
  console.log('BREAKDOWN POR TIPO DE MISSA');
  console.log('='.repeat(80));
  console.log('');

  const byType = new Map<string, { count: number; available: number; covered: number }>();

  for (const item of report) {
    if (!byType.has(item.type)) {
      byType.set(item.type, { count: 0, available: 0, covered: 0 });
    }
    const stats = byType.get(item.type)!;
    stats.count++;
    stats.available += item.available;
    if (item.available >= item.required) stats.covered++;
  }

  for (const [type, stats] of byType) {
    const avgAvailable = Math.round(stats.available / stats.count);
    const coverageRate = Math.round((stats.covered / stats.count) * 100);

    console.log(`${type.padEnd(30)} ${stats.count.toString().padStart(3)} missas | ` +
      `Média: ${avgAvailable.toString().padStart(2)} ministros | ` +
      `Cobertura: ${coverageRate}%`);
  }

  console.log('');
  console.log('='.repeat(80));
  console.log('✅ Relatório completo gerado!');
  console.log('='.repeat(80));
}

main().catch(console.error);
