#!/usr/bin/env tsx
import dotenv from 'dotenv';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from '@shared/schema';
import { sql } from 'drizzle-orm';

// Carregar variáveis de ambiente
dotenv.config({ path: '.env.production' });
const prodUrl = process.env.DATABASE_URL;
const prodAuthToken = process.env.DATABASE_AUTH_TOKEN;

dotenv.config({ path: '.env.development' });
const devUrl = process.env.DATABASE_URL;
const devAuthToken = process.env.DATABASE_AUTH_TOKEN;

if (!prodUrl || !devUrl) {
  console.error('❌ URLs dos bancos não configuradas');
  console.error('   Prod URL:', prodUrl ? '✅' : '❌');
  console.error('   Dev URL:', devUrl ? '✅' : '❌');
  process.exit(1);
}

// Conectar aos bancos
const prodClient = postgres(prodUrl);
const prodDb = drizzle(prodClient, { schema });

const devClient = postgres(devUrl);
const devDb = drizzle(devClient, { schema });

interface MigrationTable {
  name: string;
  table: any;
  dependencies?: string[];
  customQuery?: () => Promise<any[]>;
}

// Ordem de migração respeitando foreign keys
const tables: MigrationTable[] = [
  // 1. Tabelas independentes primeiro
  {
    name: 'users',
    table: schema.users
  },
  {
    name: 'families',
    table: schema.families
  },
  {
    name: 'courses',
    table: schema.courses
  },
  {
    name: 'questionnaires',
    table: schema.questionnaires
  },
  {
    name: 'massTimesConfig',
    table: schema.massTimesConfig
  },

  // 2. Tabelas com foreign keys
  {
    name: 'familyMembers',
    table: schema.familyMembers,
    dependencies: ['families', 'users']
  },
  {
    name: 'courseEnrollments',
    table: schema.courseEnrollments,
    dependencies: ['courses', 'users']
  },
  {
    name: 'courseModules',
    table: schema.courseModules,
    dependencies: ['courses']
  },
  {
    name: 'questions',
    table: schema.questions,
    dependencies: ['questionnaires']
  },
  {
    name: 'questionnaireResponses',
    table: schema.questionnaireResponses,
    dependencies: ['questionnaires', 'users']
  },
  {
    name: 'schedules',
    table: schema.schedules,
    dependencies: ['users']
  },
  {
    name: 'notifications',
    table: schema.notifications,
    dependencies: ['users']
  },
  {
    name: 'passwordResetRequests',
    table: schema.passwordResetRequests,
    dependencies: ['users']
  },

  // 3. Tabelas com múltiplas dependências
  {
    name: 'lessons',
    table: schema.lessons,
    dependencies: ['courseModules']
  },
  {
    name: 'lessonProgress',
    table: schema.lessonProgress,
    dependencies: ['lessons', 'users']
  },
  {
    name: 'scheduleMinistries',
    table: schema.scheduleMinistries,
    dependencies: ['schedules', 'users']
  }
];

async function clearDevDatabase() {
  console.log('🗑️  Limpando banco de desenvolvimento...\n');

  // Desabilitar foreign keys temporariamente
  await devDb.execute(sql`SET session_replication_role = 'replica'`);

  // Limpar tabelas na ordem inversa
  for (const { name, table } of [...tables].reverse()) {
    try {
      await devDb.delete(table);
      console.log(`   ✅ Tabela ${name} limpa`);
    } catch (error: any) {
      console.log(`   ⚠️  Erro ao limpar ${name}: ${error.message}`);
    }
  }

  // Reabilitar foreign keys
  await devDb.execute(sql`SET session_replication_role = 'origin'`);
}

async function migrateTable(tableDef: MigrationTable) {
  const { name, table, customQuery } = tableDef;

  try {
    console.log(`\n📋 Migrando tabela: ${name}`);

    // Buscar dados da produção
    let data;
    if (customQuery) {
      data = await customQuery();
    } else {
      data = await prodDb.select().from(table);
    }

    console.log(`   📊 ${data.length} registros encontrados`);

    if (data.length === 0) {
      console.log(`   ⏭️  Nenhum registro para migrar`);
      return { table: name, migrated: 0 };
    }

    // Inserir em lotes para evitar timeout
    const batchSize = 100;
    let migrated = 0;

    for (let i = 0; i < data.length; i += batchSize) {
      const batch = data.slice(i, i + batchSize);

      try {
        // Inserir no desenvolvimento
        await devDb.insert(table).values(batch);
        migrated += batch.length;

        if (data.length > batchSize) {
          const progress = Math.min(100, Math.round((migrated / data.length) * 100));
          process.stdout.write(`\r   📝 Migrando... ${progress}% (${migrated}/${data.length})`);
        }
      } catch (error: any) {
        console.error(`\n   ❌ Erro no lote ${i/batchSize + 1}: ${error.message}`);

        // Tentar inserir registro por registro
        for (const record of batch) {
          try {
            await devDb.insert(table).values(record);
            migrated++;
          } catch (recordError: any) {
            console.error(`      ❌ Registro ignorado: ${recordError.message?.substring(0, 50)}`);
          }
        }
      }
    }

    console.log(`\n   ✅ ${migrated} registros migrados com sucesso`);
    return { table: name, migrated };

  } catch (error) {
    console.error(`   ❌ Erro ao migrar ${name}:`, error);
    return { table: name, migrated: 0, error };
  }
}

async function verifyMigration() {
  console.log('\n\n🔍 Verificando migração...\n');

  const verification = [];

  for (const { name, table } of tables) {
    try {
      const prodCount = await prodDb.select({ count: sql<number>`count(*)` }).from(table);
      const devCount = await devDb.select({ count: sql<number>`count(*)` }).from(table);

      const prod = Number(prodCount[0].count);
      const dev = Number(devCount[0].count);

      verification.push({
        table: name,
        production: prod,
        development: dev,
        match: prod === dev
      });
    } catch (error) {
      verification.push({
        table: name,
        production: '?',
        development: '?',
        match: false,
        error
      });
    }
  }

  // Exibir tabela de verificação
  console.log('┌─────────────────────────┬────────────┬──────────────┬─────────┐');
  console.log('│ Tabela                  │ Produção   │ Desenvolvimento │ Status  │');
  console.log('├─────────────────────────┼────────────┼──────────────┼─────────┤');

  for (const v of verification) {
    const status = v.match ? '✅' : '❌';
    const table = v.table.padEnd(23);
    const prod = String(v.production).padEnd(10);
    const dev = String(v.development).padEnd(12);
    console.log(`│ ${table} │ ${prod} │ ${dev} │    ${status}    │`);
  }

  console.log('└─────────────────────────┴────────────┴──────────────┴─────────┘');

  const allMatch = verification.every(v => v.match);
  const totalProd = verification.reduce((sum, v) => sum + (typeof v.production === 'number' ? v.production : 0), 0);
  const totalDev = verification.reduce((sum, v) => sum + (typeof v.development === 'number' ? v.development : 0), 0);

  console.log(`\n📊 Total de registros:`);
  console.log(`   Produção: ${totalProd}`);
  console.log(`   Desenvolvimento: ${totalDev}`);
  console.log(`   Status: ${allMatch ? '✅ Migração completa' : '⚠️ Diferenças encontradas'}`);
}

async function main() {
  console.log('🚀 MIGRAÇÃO DE DADOS: PRODUÇÃO → DESENVOLVIMENTO');
  console.log('='.repeat(60));

  try {
    // 1. Limpar banco de desenvolvimento
    const confirmClear = process.argv.includes('--force') || process.argv.includes('-f');

    if (!confirmClear) {
      console.log('\n⚠️  ATENÇÃO: Isso vai APAGAR todos os dados do banco de desenvolvimento!');
      console.log('   Use --force ou -f para confirmar\n');
      process.exit(1);
    }

    await clearDevDatabase();

    // 2. Migrar tabelas
    console.log('\n\n📦 Iniciando migração de dados...');
    console.log('='.repeat(60));

    const results = [];
    for (const table of tables) {
      const result = await migrateTable(table);
      results.push(result);
    }

    // 3. Resumo
    console.log('\n\n📊 RESUMO DA MIGRAÇÃO');
    console.log('='.repeat(60));

    const successful = results.filter(r => r.migrated > 0);
    const failed = results.filter(r => r.error);
    const empty = results.filter(r => !r.error && r.migrated === 0);

    console.log(`\n✅ Tabelas migradas: ${successful.length}`);
    successful.forEach(r => {
      console.log(`   - ${r.table}: ${r.migrated} registros`);
    });

    if (empty.length > 0) {
      console.log(`\n⏭️  Tabelas vazias: ${empty.length}`);
      empty.forEach(r => {
        console.log(`   - ${r.table}`);
      });
    }

    if (failed.length > 0) {
      console.log(`\n❌ Falhas: ${failed.length}`);
      failed.forEach(r => {
        console.log(`   - ${r.table}`);
      });
    }

    // 4. Verificar
    await verifyMigration();

    console.log('\n✅ Migração concluída!');

  } catch (error) {
    console.error('\n❌ Erro fatal:', error);
    process.exit(1);
  } finally {
    // Fechar conexões
    await prodClient.end();
    await devClient.end();
    process.exit(0);
  }
}

// Executar
main().catch(console.error);