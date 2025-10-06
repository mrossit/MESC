import { db } from '../server/db';
import { sql } from 'drizzle-orm';
import * as fs from 'fs';
import * as path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

interface BackupConfig {
  backupDir: string;
  retentionDays: number;
  neonApiKey?: string;
}

const config: BackupConfig = {
  backupDir: path.join(process.cwd(), 'backups'),
  retentionDays: 30,
  neonApiKey: process.env.NEON_API_KEY
};

/**
 * Garante que o diretório de backup existe
 */
function ensureBackupDir(): void {
  if (!fs.existsSync(config.backupDir)) {
    fs.mkdirSync(config.backupDir, { recursive: true });
    console.log(`✅ Diretório de backup criado: ${config.backupDir}`);
  }
}

/**
 * Gera nome do arquivo de backup com timestamp
 */
function getBackupFilename(): string {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  return `backup-${timestamp}.sql`;
}

/**
 * Executa backup usando pg_dump
 */
async function performPgDumpBackup(): Promise<string> {
  const filename = getBackupFilename();
  const filepath = path.join(config.backupDir, filename);

  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error('DATABASE_URL não configurada');
  }

  console.log('📦 Iniciando pg_dump backup...');

  try {
    // Usar pg_dump para criar backup SQL
    const command = `pg_dump "${databaseUrl}" > "${filepath}"`;

    await execAsync(command);

    const stats = fs.statSync(filepath);
    const sizeMB = (stats.size / (1024 * 1024)).toFixed(2);

    console.log(`✅ Backup criado: ${filename} (${sizeMB} MB)`);
    return filepath;
  } catch (error) {
    console.error('❌ Erro no pg_dump:', error);
    throw error;
  }
}

/**
 * Backup alternativo: exporta schema e dados via Drizzle
 */
async function performDrizzleBackup(): Promise<string> {
  const filename = getBackupFilename().replace('.sql', '.json');
  const filepath = path.join(config.backupDir, filename);

  console.log('📦 Iniciando Drizzle backup (fallback)...');

  try {
    // Listar todas as tabelas
    const tables = [
      'users',
      'family_relationships',
      'questionnaires',
      'questionnaire_responses',
      'schedules',
      'substitution_requests',
      'mass_times_config',
      'formation_tracks',
      'formation_modules',
      'formation_lessons',
      'formation_lesson_sections',
      'formation_lesson_progress',
      'notifications',
      'activity_logs'
    ];

    const backup: Record<string, any[]> = {};

    for (const table of tables) {
      try {
        const result = await db.execute(sql.raw(`SELECT * FROM ${table}`));
        backup[table] = result.rows;
        console.log(`  ✓ Tabela ${table}: ${result.rows.length} registros`);
      } catch (error) {
        console.warn(`  ⚠ Erro ao exportar ${table}:`, error);
        backup[table] = [];
      }
    }

    // Salvar como JSON
    const backupData = {
      timestamp: new Date().toISOString(),
      version: '1.0',
      database: 'mesc',
      tables: backup
    };

    fs.writeFileSync(filepath, JSON.stringify(backupData, null, 2));

    const stats = fs.statSync(filepath);
    const sizeMB = (stats.size / (1024 * 1024)).toFixed(2);

    console.log(`✅ Backup JSON criado: ${filename} (${sizeMB} MB)`);
    return filepath;
  } catch (error) {
    console.error('❌ Erro no Drizzle backup:', error);
    throw error;
  }
}

/**
 * Cria snapshot no Neon (se API key disponível)
 */
async function createNeonSnapshot(): Promise<void> {
  if (!config.neonApiKey) {
    console.log('⚠️  Neon API key não configurada, pulando snapshot remoto');
    return;
  }

  // TODO: Implementar chamada à API do Neon para criar snapshot
  console.log('ℹ️  Snapshot Neon deve ser criado manualmente via dashboard');
  console.log('   https://console.neon.tech/');
}

/**
 * Remove backups antigos baseado na política de retenção
 */
function cleanOldBackups(): void {
  console.log('🧹 Limpando backups antigos...');

  const files = fs.readdirSync(config.backupDir);
  const now = Date.now();
  const maxAge = config.retentionDays * 24 * 60 * 60 * 1000;

  let deletedCount = 0;

  files.forEach(file => {
    const filepath = path.join(config.backupDir, file);
    const stats = fs.statSync(filepath);
    const age = now - stats.mtimeMs;

    if (age > maxAge) {
      fs.unlinkSync(filepath);
      deletedCount++;
      console.log(`  🗑️  Removido: ${file} (${Math.floor(age / (24 * 60 * 60 * 1000))} dias)`);
    }
  });

  console.log(`✅ Limpeza concluída: ${deletedCount} arquivos removidos`);
}

/**
 * Verifica integridade do backup
 */
function verifyBackup(filepath: string): boolean {
  try {
    const stats = fs.statSync(filepath);

    if (stats.size === 0) {
      console.error('❌ Backup inválido: arquivo vazio');
      return false;
    }

    if (stats.size < 1024) { // Menos de 1KB é suspeito
      console.warn('⚠️  Backup muito pequeno, pode estar incompleto');
    }

    console.log('✅ Backup verificado');
    return true;
  } catch (error) {
    console.error('❌ Erro ao verificar backup:', error);
    return false;
  }
}

/**
 * Função principal de backup
 */
async function performBackup(): Promise<void> {
  console.log('🚀 Iniciando backup do banco de dados MESC');
  console.log(`📅 ${new Date().toISOString()}`);
  console.log('─'.repeat(60));

  ensureBackupDir();

  let backupPath: string;

  try {
    // Tentar pg_dump primeiro (melhor opção)
    backupPath = await performPgDumpBackup();
  } catch (error) {
    console.log('⚠️  pg_dump falhou, usando Drizzle backup...');
    // Fallback para Drizzle
    backupPath = await performDrizzleBackup();
  }

  // Verificar integridade
  const isValid = verifyBackup(backupPath);

  if (!isValid) {
    throw new Error('Backup inválido');
  }

  // Criar snapshot Neon (opcional)
  await createNeonSnapshot();

  // Limpar backups antigos
  cleanOldBackups();

  // Listar backups disponíveis
  listBackups();

  console.log('─'.repeat(60));
  console.log('✅ Backup concluído com sucesso!');
  console.log(`📁 Arquivo: ${backupPath}`);
}

/**
 * Lista todos os backups disponíveis
 */
function listBackups(): void {
  console.log('\n📋 Backups disponíveis:');

  const files = fs.readdirSync(config.backupDir)
    .filter(f => f.startsWith('backup-'))
    .sort()
    .reverse(); // Mais recentes primeiro

  if (files.length === 0) {
    console.log('  (nenhum backup encontrado)');
    return;
  }

  files.slice(0, 10).forEach((file, idx) => {
    const filepath = path.join(config.backupDir, file);
    const stats = fs.statSync(filepath);
    const sizeMB = (stats.size / (1024 * 1024)).toFixed(2);
    const age = Math.floor((Date.now() - stats.mtimeMs) / (1000 * 60 * 60 * 24));

    console.log(`  ${idx + 1}. ${file} - ${sizeMB} MB (${age}d atrás)`);
  });

  if (files.length > 10) {
    console.log(`  ... e mais ${files.length - 10} backups`);
  }
}

/**
 * Exporta estatísticas do backup
 */
async function getBackupStats(): Promise<void> {
  console.log('\n📊 Estatísticas do Banco:');

  try {
    // Contar registros por tabela
    const tables = [
      'users',
      'schedules',
      'substitution_requests',
      'questionnaires',
      'questionnaire_responses',
      'notifications'
    ];

    for (const table of tables) {
      const result = await db.execute(sql.raw(`SELECT COUNT(*) as count FROM ${table}`));
      const count = result.rows[0]?.count || 0;
      console.log(`  ${table}: ${count} registros`);
    }
  } catch (error) {
    console.warn('  Erro ao obter estatísticas:', error);
  }
}

// Executar se chamado diretamente
if (require.main === module) {
  performBackup()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error('❌ Backup falhou:', error);
      process.exit(1);
    });
}

export { performBackup, listBackups, getBackupStats };
