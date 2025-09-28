#!/usr/bin/env tsx
import { db } from '../server/db';
import * as schema from '@shared/schema';
import * as fs from 'fs/promises';
import path from 'path';

interface BackupData {
  timestamp: string;
  environment: string;
  tables: {
    [key: string]: any[];
  };
  statistics: {
    [key: string]: number;
  };
}

async function backupProductionData() {
  console.log('🚀 BACKUP DE DADOS DE PRODUÇÃO');
  console.log('='.repeat(60));

  // Verificar ambiente
  const isProduction = process.env.NODE_ENV === 'production';

  if (!isProduction && !process.argv.includes('--force')) {
    console.log('\n⚠️  ATENÇÃO: Você está em ambiente de desenvolvimento.');
    console.log('   Use NODE_ENV=production ou --force para continuar\n');
    process.exit(1);
  }

  try {
    const backup: BackupData = {
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'unknown',
      tables: {},
      statistics: {}
    };

    // Lista de tabelas para backup
    const tablesToBackup = [
      { name: 'users', table: schema.users },
      { name: 'families', table: schema.families },
      { name: 'familyMembers', table: schema.familyMembers },
      { name: 'courses', table: schema.courses },
      { name: 'courseEnrollments', table: schema.courseEnrollments },
      { name: 'courseModules', table: schema.courseModules },
      { name: 'lessons', table: schema.lessons },
      { name: 'lessonProgress', table: schema.lessonProgress },
      { name: 'questionnaires', table: schema.questionnaires },
      { name: 'questions', table: schema.questions },
      { name: 'questionnaireResponses', table: schema.questionnaireResponses },
      { name: 'schedules', table: schema.schedules },
      { name: 'scheduleMinistries', table: schema.scheduleMinistries },
      { name: 'notifications', table: schema.notifications },
      { name: 'passwordResetRequests', table: schema.passwordResetRequests },
      { name: 'massTimesConfig', table: schema.massTimesConfig }
    ];

    console.log('\n📊 Fazendo backup das tabelas...\n');

    // Backup de cada tabela
    for (const { name, table } of tablesToBackup) {
      try {
        process.stdout.write(`   📋 ${name}...`);
        const data = await db.select().from(table);
        backup.tables[name] = data;
        backup.statistics[name] = data.length;
        console.log(` ✅ ${data.length} registros`);
      } catch (error: any) {
        console.log(` ❌ Erro: ${error.message}`);
        backup.tables[name] = [];
        backup.statistics[name] = 0;
      }
    }

    // Estatísticas especiais
    console.log('\n📈 Estatísticas adicionais...\n');

    // Ministros ativos
    const activeUsers = backup.tables.users?.filter((u: any) =>
      u.status === 'active' && u.role !== 'gestor'
    ).length || 0;
    console.log(`   👥 Ministros ativos: ${activeUsers}`);

    // Questionários de outubro
    const octoberQuestionnaires = backup.tables.questionnaires?.filter((q: any) =>
      q.month === 10 && q.year === 2025
    ).length || 0;
    console.log(`   📋 Questionários de outubro: ${octoberQuestionnaires}`);

    // Respostas de outubro
    const octoberResponses = backup.tables.questionnaireResponses?.filter((r: any) => {
      const questionnaire = backup.tables.questionnaires?.find((q: any) =>
        q.id === r.questionnaireId && q.month === 10 && q.year === 2025
      );
      return !!questionnaire;
    }).length || 0;
    console.log(`   📝 Respostas de outubro: ${octoberResponses}`);

    // Criar diretório de backups se não existir
    const backupDir = path.join(process.cwd(), 'backups');
    await fs.mkdir(backupDir, { recursive: true });

    // Salvar backup
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').substring(0, 19);
    const filename = `backup_${timestamp}.json`;
    const filepath = path.join(backupDir, filename);

    await fs.writeFile(filepath, JSON.stringify(backup, null, 2));

    console.log('\n✅ Backup salvo em:', filepath);

    // Mostrar resumo
    const totalRecords = Object.values(backup.statistics).reduce((sum, count) => sum + count, 0);
    const fileSize = (await fs.stat(filepath)).size;
    const fileSizeMB = (fileSize / (1024 * 1024)).toFixed(2);

    console.log('\n📊 RESUMO DO BACKUP');
    console.log('='.repeat(60));
    console.log(`   📅 Data/Hora: ${new Date().toLocaleString('pt-BR')}`);
    console.log(`   📋 Tabelas: ${Object.keys(backup.tables).length}`);
    console.log(`   📝 Total de registros: ${totalRecords}`);
    console.log(`   💾 Tamanho do arquivo: ${fileSizeMB} MB`);
    console.log(`   📁 Arquivo: ${filename}`);

    return filepath;

  } catch (error) {
    console.error('\n❌ Erro ao fazer backup:', error);
    process.exit(1);
  }
}

async function restoreBackup(backupFile?: string) {
  console.log('\n🔄 RESTAURAÇÃO DE BACKUP');
  console.log('='.repeat(60));

  try {
    // Determinar arquivo de backup
    const backupDir = path.join(process.cwd(), 'backups');

    if (!backupFile) {
      // Listar backups disponíveis
      const files = await fs.readdir(backupDir);
      const backups = files.filter(f => f.startsWith('backup_') && f.endsWith('.json'));

      if (backups.length === 0) {
        console.log('\n❌ Nenhum backup encontrado em', backupDir);
        return;
      }

      console.log('\n📁 Backups disponíveis:\n');
      backups.sort().reverse().forEach((file, index) => {
        console.log(`   ${index + 1}. ${file}`);
      });

      // Usar o mais recente
      backupFile = backups[0];
      console.log(`\n   ➡️  Usando backup mais recente: ${backupFile}`);
    }

    const filepath = path.join(backupDir, backupFile);
    const content = await fs.readFile(filepath, 'utf-8');
    const backup: BackupData = JSON.parse(content);

    console.log('\n📊 Informações do backup:');
    console.log(`   📅 Criado em: ${new Date(backup.timestamp).toLocaleString('pt-BR')}`);
    console.log(`   🌍 Ambiente: ${backup.environment}`);
    console.log(`   📋 Tabelas: ${Object.keys(backup.tables).length}`);

    const totalRecords = Object.values(backup.statistics).reduce((sum, count) => sum + count, 0);
    console.log(`   📝 Total de registros: ${totalRecords}`);

    console.log('\n📈 Conteúdo do backup:');
    for (const [table, count] of Object.entries(backup.statistics)) {
      if (count > 0) {
        console.log(`   - ${table}: ${count} registros`);
      }
    }

    return backup;

  } catch (error) {
    console.error('\n❌ Erro ao restaurar backup:', error);
    process.exit(1);
  }
}

// Processar argumentos
async function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  if (command === 'restore') {
    // Restaurar backup
    const backupFile = args[1];
    await restoreBackup(backupFile);
  } else if (command === 'list') {
    // Listar backups
    await restoreBackup();
  } else {
    // Fazer backup
    await backupProductionData();
  }

  process.exit(0);
}

main().catch(console.error);