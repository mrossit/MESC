#!/usr/bin/env tsx
import { db } from '../server/db';
import { users, questionnaires, questionnaireResponses, massTimesConfig, schedules, notifications, families, passwordResetRequests } from '@shared/schema';
import * as fs from 'fs/promises';
import path from 'path';

interface ExportData {
  timestamp: string;
  environment: string;
  users: any[];
  questionnaires: any[];
  questionnaireResponses: any[];
  massTimesConfig: any[];
  schedules: any[];
  notifications: any[];
  families: any[];
  passwordResetRequests: any[];
}

async function exportData() {
  console.log('📊 EXPORTANDO DADOS DO BANCO');
  console.log('='.repeat(60));

  const exportData: ExportData = {
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'unknown',
    users: [],
    questionnaires: [],
    questionnaireResponses: [],
    massTimesConfig: [],
    schedules: [],
    notifications: [],
    families: [],
    passwordResetRequests: []
  };

  try {
    // Exportar dados
    console.log('\n📋 Exportando tabelas...\n');

    // Users
    process.stdout.write('   👥 Usuários... ');
    exportData.users = await db.select().from(users);
    console.log(`✅ ${exportData.users.length} registros`);

    // Questionnaires
    process.stdout.write('   📋 Questionários... ');
    exportData.questionnaires = await db.select().from(questionnaires);
    console.log(`✅ ${exportData.questionnaires.length} registros`);

    // Questionnaire Responses
    process.stdout.write('   📝 Respostas... ');
    exportData.questionnaireResponses = await db.select().from(questionnaireResponses);
    console.log(`✅ ${exportData.questionnaireResponses.length} registros`);

    // Mass Times Config
    process.stdout.write('   ⛪ Config. de Missas... ');
    exportData.massTimesConfig = await db.select().from(massTimesConfig);
    console.log(`✅ ${exportData.massTimesConfig.length} registros`);

    // Schedules
    process.stdout.write('   📅 Escalas... ');
    exportData.schedules = await db.select().from(schedules);
    console.log(`✅ ${exportData.schedules.length} registros`);

    // Notifications
    process.stdout.write('   🔔 Notificações... ');
    exportData.notifications = await db.select().from(notifications);
    console.log(`✅ ${exportData.notifications.length} registros`);

    // Families
    process.stdout.write('   👨‍👩‍👧‍👦 Famílias... ');
    exportData.families = await db.select().from(families);
    console.log(`✅ ${exportData.families.length} registros`);

    // Password Reset
    process.stdout.write('   🔑 Reset de Senha... ');
    exportData.passwordResetRequests = await db.select().from(passwordResetRequests);
    console.log(`✅ ${exportData.passwordResetRequests.length} registros`);

    // Salvar arquivo
    const exportDir = path.join(process.cwd(), 'data-exports');
    await fs.mkdir(exportDir, { recursive: true });

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').substring(0, 19);
    const filename = `export_${timestamp}.json`;
    const filepath = path.join(exportDir, filename);

    await fs.writeFile(filepath, JSON.stringify(exportData, null, 2));

    // Estatísticas
    console.log('\n📊 RESUMO DA EXPORTAÇÃO');
    console.log('='.repeat(60));

    const totalRecords =
      exportData.users.length +
      exportData.questionnaires.length +
      exportData.questionnaireResponses.length +
      exportData.massTimesConfig.length +
      exportData.schedules.length +
      exportData.notifications.length +
      exportData.families.length +
      exportData.passwordResetRequests.length;

    console.log(`   📅 Data/Hora: ${new Date().toLocaleString('pt-BR')}`);
    console.log(`   🌍 Ambiente: ${process.env.NODE_ENV}`);
    console.log(`   📝 Total de registros: ${totalRecords}`);
    console.log(`   💾 Arquivo: ${filename}`);
    console.log(`   📁 Caminho: ${filepath}`);

    // Estatísticas especiais
    console.log('\n📈 Dados de Outubro 2025:');
    const octoberQuestionnaire = exportData.questionnaires.find(q =>
      q.month === 10 && q.year === 2025
    );

    if (octoberQuestionnaire) {
      const octoberResponses = exportData.questionnaireResponses.filter(r =>
        r.questionnaireId === octoberQuestionnaire.id
      );

      console.log(`   📋 Questionário: ${octoberQuestionnaire.title}`);
      console.log(`   📝 Respostas: ${octoberResponses.length}`);
      console.log(`   📊 Status: ${octoberQuestionnaire.status}`);

      // Ministros que responderam
      const respondents = octoberResponses.map(r => {
        const user = exportData.users.find(u => u.id === r.userId);
        return user?.name || 'Desconhecido';
      });

      console.log(`   👥 Ministros que responderam:`);
      respondents.forEach(name => {
        console.log(`      - ${name}`);
      });
    }

    return filepath;

  } catch (error) {
    console.error('\n❌ Erro ao exportar:', error);
    process.exit(1);
  }
}

async function importData(filepath?: string) {
  console.log('\n📥 IMPORTANDO DADOS');
  console.log('='.repeat(60));

  try {
    // Determinar arquivo
    const exportDir = path.join(process.cwd(), 'data-exports');

    if (!filepath) {
      // Listar exports disponíveis
      const files = await fs.readdir(exportDir).catch(() => []);
      const exports = files.filter(f => f.startsWith('export_') && f.endsWith('.json'));

      if (exports.length === 0) {
        console.log('\n❌ Nenhum export encontrado em', exportDir);
        return;
      }

      console.log('\n📁 Exports disponíveis:\n');
      exports.sort().reverse().forEach((file, index) => {
        console.log(`   ${index + 1}. ${file}`);
      });

      // Usar o mais recente
      filepath = path.join(exportDir, exports[0]);
      console.log(`\n   ➡️  Usando export mais recente: ${exports[0]}`);
    }

    const content = await fs.readFile(filepath, 'utf-8');
    const data: ExportData = JSON.parse(content);

    console.log('\n📊 Informações do export:');
    console.log(`   📅 Criado em: ${new Date(data.timestamp).toLocaleString('pt-BR')}`);
    console.log(`   🌍 Ambiente origem: ${data.environment}`);

    console.log('\n📈 Conteúdo:');
    console.log(`   👥 Usuários: ${data.users.length}`);
    console.log(`   📋 Questionários: ${data.questionnaires.length}`);
    console.log(`   📝 Respostas: ${data.questionnaireResponses.length}`);
    console.log(`   ⛪ Config. Missas: ${data.massTimesConfig.length}`);
    console.log(`   📅 Escalas: ${data.schedules.length}`);

    const confirmImport = process.argv.includes('--import-force');

    if (!confirmImport) {
      console.log('\n⚠️  Use --import-force para confirmar a importação');
      console.log('   Isso vai SUBSTITUIR os dados existentes!');
      return;
    }

    console.log('\n🔄 Importando dados...\n');

    // Importar na ordem correta (respeitando foreign keys)

    // 1. Users primeiro
    if (data.users.length > 0) {
      process.stdout.write('   👥 Importando usuários... ');
      await db.delete(users);
      await db.insert(users).values(data.users);
      console.log('✅');
    }

    // 2. Questionnaires
    if (data.questionnaires.length > 0) {
      process.stdout.write('   📋 Importando questionários... ');
      await db.delete(questionnaires);
      await db.insert(questionnaires).values(data.questionnaires);
      console.log('✅');
    }

    // 3. Questionnaire Responses
    if (data.questionnaireResponses.length > 0) {
      process.stdout.write('   📝 Importando respostas... ');
      await db.delete(questionnaireResponses);
      await db.insert(questionnaireResponses).values(data.questionnaireResponses);
      console.log('✅');
    }

    // 4. Mass Times Config
    if (data.massTimesConfig.length > 0) {
      process.stdout.write('   ⛪ Importando config. missas... ');
      await db.delete(massTimesConfig);
      await db.insert(massTimesConfig).values(data.massTimesConfig);
      console.log('✅');
    }

    // 5. Outros
    if (data.schedules.length > 0) {
      process.stdout.write('   📅 Importando escalas... ');
      await db.delete(schedules);
      await db.insert(schedules).values(data.schedules);
      console.log('✅');
    }

    console.log('\n✅ Importação concluída!');

  } catch (error) {
    console.error('\n❌ Erro ao importar:', error);
    process.exit(1);
  }
}

// Processar argumentos
async function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  if (command === 'import') {
    const filepath = args[1];
    await importData(filepath);
  } else if (command === '--import-force') {
    await importData();
  } else {
    // Exportar por padrão
    await exportData();
  }

  process.exit(0);
}

main().catch(console.error);