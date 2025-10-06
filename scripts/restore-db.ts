import * as fs from 'fs';
import * as path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as readline from 'readline';
import { db } from '../server/db';
import { sql } from 'drizzle-orm';

const execAsync = promisify(exec);

const BACKUP_DIR = path.join(process.cwd(), 'backups');

/**
 * Solicita confirmação do usuário
 */
async function confirmRestore(): Promise<boolean> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  return new Promise((resolve) => {
    rl.question(
      '\n⚠️  ATENÇÃO: Esta operação irá SOBRESCREVER todos os dados atuais!\n' +
      'Tem certeza que deseja continuar? (digite "SIM" para confirmar): ',
      (answer) => {
        rl.close();
        resolve(answer.trim().toUpperCase() === 'SIM');
      }
    );
  });
}

/**
 * Lista backups disponíveis
 */
function listAvailableBackups(): string[] {
  if (!fs.existsSync(BACKUP_DIR)) {
    console.log('❌ Diretório de backups não encontrado');
    return [];
  }

  const files = fs.readdirSync(BACKUP_DIR)
    .filter(f => f.startsWith('backup-') && (f.endsWith('.sql') || f.endsWith('.json')))
    .sort()
    .reverse();

  return files;
}

/**
 * Exibe backups disponíveis
 */
function displayBackups(files: string[]): void {
  console.log('\n📋 Backups disponíveis:\n');

  files.forEach((file, idx) => {
    const filepath = path.join(BACKUP_DIR, file);
    const stats = fs.statSync(filepath);
    const sizeMB = (stats.size / (1024 * 1024)).toFixed(2);
    const date = stats.mtime.toLocaleString('pt-BR');

    console.log(`  ${idx + 1}. ${file}`);
    console.log(`     Data: ${date} | Tamanho: ${sizeMB} MB`);
    console.log('');
  });
}

/**
 * Seleciona backup para restaurar
 */
async function selectBackup(files: string[]): Promise<string | null> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  return new Promise((resolve) => {
    rl.question(
      `Digite o número do backup (1-${files.length}) ou caminho completo: `,
      (answer) => {
        rl.close();

        const num = parseInt(answer.trim());

        if (num >= 1 && num <= files.length) {
          resolve(path.join(BACKUP_DIR, files[num - 1]));
        } else if (fs.existsSync(answer.trim())) {
          resolve(answer.trim());
        } else {
          console.log('❌ Seleção inválida');
          resolve(null);
        }
      }
    );
  });
}

/**
 * Cria backup de segurança antes de restaurar
 */
async function createSafetyBackup(): Promise<string> {
  console.log('🔒 Criando backup de segurança antes de restaurar...');

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = `backup-pre-restore-${timestamp}.sql`;
  const filepath = path.join(BACKUP_DIR, filename);

  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error('DATABASE_URL não configurada');
  }

  try {
    const command = `pg_dump "${databaseUrl}" > "${filepath}"`;
    await execAsync(command);

    console.log(`✅ Backup de segurança criado: ${filename}`);
    return filepath;
  } catch (error) {
    console.warn('⚠️  Não foi possível criar backup de segurança');
    throw error;
  }
}

/**
 * Restaura backup SQL usando psql
 */
async function restoreSqlBackup(backupPath: string): Promise<void> {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error('DATABASE_URL não configurada');
  }

  console.log('📥 Restaurando backup SQL...');

  try {
    // Limpar banco antes de restaurar
    console.log('  🧹 Limpando tabelas existentes...');

    // Desabilitar constraints temporariamente
    await db.execute(sql.raw('SET session_replication_role = replica;'));

    // Dropar todas as tabelas (cuidado!)
    const tables = [
      'formation_lesson_progress',
      'formation_lesson_sections',
      'formation_lessons',
      'formation_modules',
      'formation_tracks',
      'activity_logs',
      'notifications',
      'substitution_requests',
      'schedules',
      'questionnaire_responses',
      'questionnaires',
      'family_relationships',
      'mass_times_config',
      'users',
      'sessions'
    ];

    for (const table of tables) {
      try {
        await db.execute(sql.raw(`DROP TABLE IF EXISTS ${table} CASCADE;`));
      } catch (err) {
        // Ignorar se tabela não existir
      }
    }

    // Reabilitar constraints
    await db.execute(sql.raw('SET session_replication_role = DEFAULT;'));

    // Restaurar do arquivo SQL
    console.log('  📦 Importando dados do backup...');
    const command = `psql "${databaseUrl}" < "${backupPath}"`;
    const { stdout, stderr } = await execAsync(command);

    if (stderr && !stderr.includes('NOTICE')) {
      console.warn('  ⚠️  Avisos durante restore:', stderr);
    }

    console.log('✅ Backup SQL restaurado com sucesso');
  } catch (error) {
    console.error('❌ Erro ao restaurar SQL:', error);
    throw error;
  }
}

/**
 * Restaura backup JSON usando Drizzle
 */
async function restoreJsonBackup(backupPath: string): Promise<void> {
  console.log('📥 Restaurando backup JSON...');

  try {
    const backupData = JSON.parse(fs.readFileSync(backupPath, 'utf-8'));

    console.log(`  ℹ️  Backup criado em: ${backupData.timestamp}`);
    console.log(`  ℹ️  Versão: ${backupData.version}`);

    // Limpar dados existentes
    console.log('  🧹 Limpando dados existentes...');

    // Desabilitar constraints
    await db.execute(sql.raw('SET session_replication_role = replica;'));

    // Truncar tabelas na ordem correta (respeitando foreign keys)
    const truncateOrder = [
      'formation_lesson_progress',
      'formation_lesson_sections',
      'formation_lessons',
      'formation_modules',
      'formation_tracks',
      'activity_logs',
      'notifications',
      'substitution_requests',
      'schedules',
      'questionnaire_responses',
      'questionnaires',
      'family_relationships',
      'mass_times_config',
      'users'
    ];

    for (const table of truncateOrder) {
      try {
        await db.execute(sql.raw(`TRUNCATE TABLE ${table} CASCADE;`));
      } catch (err) {
        console.warn(`    Erro ao truncar ${table}:`, err);
      }
    }

    // Restaurar dados
    console.log('  📦 Importando dados...');

    for (const [tableName, rows] of Object.entries(backupData.tables)) {
      if (!Array.isArray(rows) || rows.length === 0) continue;

      console.log(`    • ${tableName}: ${rows.length} registros`);

      // Inserir em lotes de 100
      const batchSize = 100;
      for (let i = 0; i < rows.length; i += batchSize) {
        const batch = rows.slice(i, i + batchSize);

        // Construir query INSERT
        const columns = Object.keys(batch[0]);
        const values = batch.map(row =>
          `(${columns.map(col => {
            const val = row[col];
            if (val === null) return 'NULL';
            if (typeof val === 'string') return `'${val.replace(/'/g, "''")}'`;
            if (typeof val === 'object') return `'${JSON.stringify(val).replace(/'/g, "''")}'`;
            return val;
          }).join(', ')})`
        ).join(', ');

        const query = `
          INSERT INTO ${tableName} (${columns.join(', ')})
          VALUES ${values}
        `;

        try {
          await db.execute(sql.raw(query));
        } catch (err) {
          console.error(`    ❌ Erro ao inserir lote em ${tableName}:`, err);
        }
      }
    }

    // Reabilitar constraints
    await db.execute(sql.raw('SET session_replication_role = DEFAULT;'));

    console.log('✅ Backup JSON restaurado com sucesso');
  } catch (error) {
    console.error('❌ Erro ao restaurar JSON:', error);
    throw error;
  }
}

/**
 * Verifica integridade após restore
 */
async function verifyRestore(): Promise<boolean> {
  console.log('\n🔍 Verificando integridade do restore...');

  try {
    // Verificar se tabelas principais têm dados
    const checks = [
      { table: 'users', expected: '> 0' },
      { table: 'schedules', expected: '>= 0' },
      { table: 'questionnaires', expected: '>= 0' }
    ];

    for (const check of checks) {
      const result = await db.execute(sql.raw(`SELECT COUNT(*) as count FROM ${check.table}`));
      const count = result.rows[0]?.count || 0;

      console.log(`  ✓ ${check.table}: ${count} registros`);

      if (check.expected === '> 0' && count === 0) {
        console.warn(`    ⚠️  Esperado ${check.expected} registros`);
      }
    }

    console.log('✅ Verificação concluída');
    return true;
  } catch (error) {
    console.error('❌ Erro na verificação:', error);
    return false;
  }
}

/**
 * Função principal de restore
 */
async function performRestore(): Promise<void> {
  console.log('🔄 RESTAURAÇÃO DE BACKUP - Sistema MESC');
  console.log('═'.repeat(60));

  // Listar backups
  const backups = listAvailableBackups();

  if (backups.length === 0) {
    console.log('❌ Nenhum backup encontrado');
    process.exit(1);
  }

  displayBackups(backups);

  // Selecionar backup
  const backupPath = await selectBackup(backups);

  if (!backupPath) {
    console.log('❌ Operação cancelada');
    process.exit(1);
  }

  console.log(`\n📁 Backup selecionado: ${path.basename(backupPath)}`);

  // Confirmar
  const confirmed = await confirmRestore();

  if (!confirmed) {
    console.log('❌ Operação cancelada pelo usuário');
    process.exit(1);
  }

  // Criar backup de segurança
  try {
    await createSafetyBackup();
  } catch (error) {
    console.log('\n❓ Continuar sem backup de segurança? (pressione CTRL+C para cancelar)');
    await new Promise(resolve => setTimeout(resolve, 3000));
  }

  // Restaurar
  console.log('\n🚀 Iniciando restauração...');
  console.log('─'.repeat(60));

  try {
    if (backupPath.endsWith('.sql')) {
      await restoreSqlBackup(backupPath);
    } else if (backupPath.endsWith('.json')) {
      await restoreJsonBackup(backupPath);
    } else {
      throw new Error('Formato de backup não suportado');
    }

    // Verificar
    await verifyRestore();

    console.log('─'.repeat(60));
    console.log('✅ RESTAURAÇÃO CONCLUÍDA COM SUCESSO!');
    console.log('\n⚠️  Importante: Reinicie a aplicação para garantir que tudo funcione corretamente');
  } catch (error) {
    console.error('\n❌ RESTAURAÇÃO FALHOU');
    console.error('Erro:', error);
    console.log('\n💡 Dica: Use o backup de segurança criado para reverter');
    process.exit(1);
  }
}

// Executar se chamado diretamente
if (require.main === module) {
  performRestore()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error('❌ Erro crítico:', error);
      process.exit(1);
    });
}

export { performRestore, listAvailableBackups };
