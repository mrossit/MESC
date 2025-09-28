#!/usr/bin/env tsx
import { db } from '../server/db';
import { questionnaires, questionnaireResponses, users } from '@shared/schema';
import { eq, and, ne, or, sql } from 'drizzle-orm';
import { format, startOfMonth, endOfMonth, getDay, addDays, isSunday } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import * as fs from 'fs/promises';

interface MinisterAvailability {
  id: string;
  name: string;
  email: string;
  availableSundays: string[];
  preferredMassTimes: string[];
  alternativeTimes: string[];
  canSubstitute: boolean;
  dailyMassAvailability: string[];
  totalAssignments: number;
}

interface MassSchedule {
  date: string;
  dayOfWeek: string;
  time: string;
  type: string;
  requiredMinisters: number;
  assignedMinisters: string[];
  confidence: number;
}

class OctoberScheduleGenerator {
  private ministers: MinisterAvailability[] = [];
  private schedule: MassSchedule[] = [];
  private assignments = new Map<string, number>(); // Contador de atribuições por ministro

  async loadData() {
    console.log('📊 Carregando dados de outubro 2025...\n');

    // Buscar questionário
    const [questionnaire] = await db
      .select()
      .from(questionnaires)
      .where(and(
        eq(questionnaires.month, 10),
        eq(questionnaires.year, 2025)
      ))
      .execute();

    if (!questionnaire) {
      throw new Error('Questionário de outubro 2025 não encontrado');
    }

    // Buscar respostas
    const responses = await db
      .select()
      .from(questionnaireResponses)
      .where(eq(questionnaireResponses.questionnaireId, questionnaire.id))
      .execute();

    console.log(`✅ ${responses.length} respostas encontradas\n`);

    // Buscar dados dos ministros
    for (const response of responses) {
      const [minister] = await db
        .select()
        .from(users)
        .where(eq(users.id, response.userId))
        .execute();

      if (!minister) continue;

      this.ministers.push({
        id: minister.id,
        name: minister.name,
        email: minister.email || '',
        availableSundays: response.availableSundays || [],
        preferredMassTimes: response.preferredMassTimes || [],
        alternativeTimes: response.alternativeTimes || [],
        canSubstitute: response.canSubstitute || false,
        dailyMassAvailability: response.dailyMassAvailability || [],
        totalAssignments: 0
      });

      this.assignments.set(minister.id, 0);
    }
  }

  generateMonthSchedule() {
    console.log('🗓️ Gerando escala para outubro 2025...\n');

    const year = 2025;
    const month = 9; // JavaScript: 0-indexed (9 = outubro)
    const startDate = startOfMonth(new Date(year, month));
    const endDate = endOfMonth(new Date(year, month));

    let currentDate = startDate;

    while (currentDate <= endDate) {
      const dayOfWeek = getDay(currentDate);
      const dateStr = format(currentDate, 'yyyy-MM-dd');
      const dayName = format(currentDate, 'EEEE', { locale: ptBR });
      const dayOfMonth = currentDate.getDate();

      // Domingos - Missas regulares
      if (dayOfWeek === 0) {
        const sundayNumber = Math.ceil(dayOfMonth / 7).toString();

        // Missa das 8h
        this.schedule.push({
          date: dateStr,
          dayOfWeek: dayName,
          time: '08:00',
          type: 'Missa Dominical',
          requiredMinisters: 15,
          assignedMinisters: [],
          confidence: 0
        });

        // Missa das 10h
        this.schedule.push({
          date: dateStr,
          dayOfWeek: dayName,
          time: '10:00',
          type: 'Missa Dominical',
          requiredMinisters: 20,
          assignedMinisters: [],
          confidence: 0
        });

        // Missa das 19h
        this.schedule.push({
          date: dateStr,
          dayOfWeek: dayName,
          time: '19:00',
          type: 'Missa Dominical',
          requiredMinisters: 20,
          assignedMinisters: [],
          confidence: 0
        });
      }

      // Dia 28 - Festa de São Judas Tadeu
      if (dayOfMonth === 28) {
        // Limpar missas regulares se houver
        this.schedule = this.schedule.filter(s => s.date !== dateStr);

        const festaMissas = [
          { time: '07:00', ministers: 10 },
          { time: '10:00', ministers: 15 },
          { time: '12:00', ministers: 10 },
          { time: '15:00', ministers: 10 },
          { time: '17:00', ministers: 10 },
          { time: '19:30', ministers: 20 }
        ];

        for (const missa of festaMissas) {
          this.schedule.push({
            date: dateStr,
            dayOfWeek: dayName,
            time: missa.time,
            type: 'Festa de São Judas Tadeu',
            requiredMinisters: missa.ministers,
            assignedMinisters: [],
            confidence: 0
          });
        }
      }

      // Missas diárias (segunda a sábado, exceto dia 28)
      if (dayOfWeek > 0 && dayOfWeek < 7 && dayOfMonth !== 28) {
        this.schedule.push({
          date: dateStr,
          dayOfWeek: dayName,
          time: '06:30',
          type: 'Missa Diária',
          requiredMinisters: 5,
          assignedMinisters: [],
          confidence: 0
        });
      }

      currentDate = addDays(currentDate, 1);
    }
  }

  assignMinisters() {
    console.log('👥 Atribuindo ministros às missas...\n');

    for (const mass of this.schedule) {
      const availableMinisters = this.getAvailableMinisters(mass);
      const selected = this.selectOptimalMinisters(availableMinisters, mass);

      mass.assignedMinisters = selected.map(m => m.name);
      mass.confidence = this.calculateConfidence(mass);

      // Atualizar contador de atribuições
      for (const minister of selected) {
        const current = this.assignments.get(minister.id) || 0;
        this.assignments.set(minister.id, current + 1);
        minister.totalAssignments++;
      }
    }
  }

  private getAvailableMinisters(mass: MassSchedule): MinisterAvailability[] {
    const available: MinisterAvailability[] = [];
    const dayNumber = parseInt(mass.date.split('-')[2]);
    const sundayNumber = Math.ceil(dayNumber / 7).toString();

    for (const minister of this.ministers) {
      let isAvailable = false;

      // Para missas dominicais
      if (mass.type === 'Missa Dominical') {
        // Verificar se está disponível neste domingo
        if (minister.availableSundays.includes(sundayNumber)) {
          // Verificar horário preferido ou alternativo
          const timeFormatted = mass.time.replace(':00', ':00');
          if (minister.preferredMassTimes.includes(timeFormatted) ||
              minister.alternativeTimes?.includes(timeFormatted) ||
              minister.canSubstitute) {
            isAvailable = true;
          }
        }
      }

      // Para missas diárias
      if (mass.type === 'Missa Diária') {
        if (minister.dailyMassAvailability.includes(mass.dayOfWeek)) {
          isAvailable = true;
        }
      }

      // Para festa de São Judas - usar quem pode substituir
      if (mass.type === 'Festa de São Judas Tadeu') {
        if (minister.canSubstitute || minister.availableSundays.length > 2) {
          isAvailable = true;
        }
      }

      if (isAvailable) {
        available.push(minister);
      }
    }

    return available;
  }

  private selectOptimalMinisters(
    available: MinisterAvailability[],
    mass: MassSchedule
  ): MinisterAvailability[] {
    // Ordenar por critérios de seleção
    const sorted = [...available].sort((a, b) => {
      // 1. Priorizar quem tem menos atribuições
      const diffAssignments = a.totalAssignments - b.totalAssignments;
      if (diffAssignments !== 0) return diffAssignments;

      // 2. Priorizar quem tem este horário como preferido
      const aPreferred = a.preferredMassTimes.includes(mass.time) ? 1 : 0;
      const bPreferred = b.preferredMassTimes.includes(mass.time) ? 1 : 0;
      if (aPreferred !== bPreferred) return bPreferred - aPreferred;

      // 3. Aleatorizar para distribuir melhor
      return Math.random() - 0.5;
    });

    // Selecionar quantidade necessária
    return sorted.slice(0, Math.min(mass.requiredMinisters, sorted.length));
  }

  private calculateConfidence(mass: MassSchedule): number {
    const fillRate = mass.assignedMinisters.length / mass.requiredMinisters;
    return Math.min(fillRate, 1);
  }

  printSchedule() {
    console.log('\n📋 ESCALA DE MISSAS - OUTUBRO 2025');
    console.log('='.repeat(60));

    // Agrupar por data
    const byDate = new Map<string, MassSchedule[]>();
    for (const mass of this.schedule) {
      if (!byDate.has(mass.date)) {
        byDate.set(mass.date, []);
      }
      byDate.get(mass.date)!.push(mass);
    }

    // Imprimir por data
    for (const [date, masses] of byDate) {
      const [year, month, day] = date.split('-');
      const dateFormatted = `${day}/${month}/${year}`;
      const dayName = masses[0].dayOfWeek;

      console.log(`\n📅 ${dateFormatted} - ${dayName}`);
      console.log('-'.repeat(50));

      for (const mass of masses.sort((a, b) => a.time.localeCompare(b.time))) {
        const coverage = `${mass.assignedMinisters.length}/${mass.requiredMinisters}`;
        const percentage = (mass.confidence * 100).toFixed(0);

        console.log(`\n⏰ ${mass.time} - ${mass.type} (${coverage} ministros - ${percentage}%)`);

        if (mass.assignedMinisters.length === 0) {
          console.log('   ❌ Nenhum ministro disponível');
        } else {
          mass.assignedMinisters.forEach((name, i) => {
            console.log(`   ${i + 1}. ${name}`);
          });
        }

        if (mass.assignedMinisters.length < mass.requiredMinisters) {
          const missing = mass.requiredMinisters - mass.assignedMinisters.length;
          console.log(`   ⚠️  Faltam ${missing} ministros`);
        }
      }
    }
  }

  printStatistics() {
    console.log('\n\n📊 ESTATÍSTICAS DA ESCALA');
    console.log('='.repeat(60));

    // Total de missas
    const totalMasses = this.schedule.length;
    const fullyCovered = this.schedule.filter(m => m.confidence === 1).length;
    const partiallyCovered = this.schedule.filter(m => m.confidence > 0 && m.confidence < 1).length;
    const uncovered = this.schedule.filter(m => m.confidence === 0).length;

    console.log('\n📈 Cobertura das Missas:');
    console.log(`   Total de missas: ${totalMasses}`);
    console.log(`   ✅ Completas: ${fullyCovered} (${(fullyCovered/totalMasses*100).toFixed(1)}%)`);
    console.log(`   ⚠️  Parciais: ${partiallyCovered} (${(partiallyCovered/totalMasses*100).toFixed(1)}%)`);
    console.log(`   ❌ Sem ministros: ${uncovered} (${(uncovered/totalMasses*100).toFixed(1)}%)`);

    // Distribuição por ministro
    console.log('\n👥 Distribuição por Ministro:');
    const ministerStats = Array.from(this.assignments.entries())
      .map(([id, count]) => {
        const minister = this.ministers.find(m => m.id === id);
        return { name: minister?.name || 'Desconhecido', count };
      })
      .sort((a, b) => b.count - a.count);

    for (const stat of ministerStats) {
      const bar = '█'.repeat(stat.count);
      console.log(`   ${stat.name}: ${bar} ${stat.count} missas`);
    }

    // Análise por tipo de missa
    console.log('\n⛪ Cobertura por Tipo de Missa:');
    const byType = new Map<string, { total: number, covered: number }>();

    for (const mass of this.schedule) {
      if (!byType.has(mass.type)) {
        byType.set(mass.type, { total: 0, covered: 0 });
      }
      const stat = byType.get(mass.type)!;
      stat.total++;
      if (mass.confidence > 0) stat.covered++;
    }

    for (const [type, stat] of byType) {
      const percentage = (stat.covered / stat.total * 100).toFixed(1);
      console.log(`   ${type}: ${stat.covered}/${stat.total} (${percentage}%)`);
    }
  }

  async exportToCSV() {
    const headers = ['Data', 'Dia', 'Horário', 'Tipo', 'Ministros Necessários', 'Ministros Escalados', 'Nomes', 'Cobertura'];

    const rows = this.schedule.map(mass => {
      const [year, month, day] = mass.date.split('-');
      return [
        `${day}/${month}/${year}`,
        mass.dayOfWeek,
        mass.time,
        mass.type,
        mass.requiredMinisters.toString(),
        mass.assignedMinisters.length.toString(),
        mass.assignedMinisters.join('; ') || 'Nenhum',
        `${(mass.confidence * 100).toFixed(0)}%`
      ];
    });

    const csv = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const filename = 'escala_outubro_2025.csv';
    await fs.writeFile(filename, csv, 'utf-8');
    console.log(`\n💾 Escala exportada para ${filename}`);
  }

  async run() {
    try {
      await this.loadData();
      this.generateMonthSchedule();
      this.assignMinisters();
      this.printSchedule();
      this.printStatistics();
      await this.exportToCSV();

      console.log('\n✅ Geração de escala concluída!');
    } catch (error) {
      console.error('❌ Erro:', error);
    }
  }
}

// Executar
const generator = new OctoberScheduleGenerator();
generator.run().then(() => process.exit(0)).catch(console.error);