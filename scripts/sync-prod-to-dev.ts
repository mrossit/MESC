import { exec } from 'child_process';
import { promisify } from 'util';
import { config } from 'dotenv';
import * as fs from 'fs';

const execPromise = promisify(exec);

// Carregar variáveis de ambiente
config({ path: '.env' });

async function syncProdToDev() {
  console.log('\n🔄 SINCRONIZAÇÃO: PRODUÇÃO → DESENVOLVIMENTO\n');
  console.log('=' .repeat(80));

  try {
    // 1. Verificar as URLs dos bancos
    const prodUrl = process.env.DATABASE_URL;

    // Tentar ler o .env.development para pegar a URL de dev
    let devUrl = process.env.DATABASE_URL_DEV;

    if (!devUrl && fs.existsSync('.env.development')) {
      const devEnv = fs.readFileSync('.env.development', 'utf8');
      const match = devEnv.match(/DATABASE_URL=(.+)/);
      if (match) {
        devUrl = match[1];
      }
    }

    if (!prodUrl) {
      console.error('❌ DATABASE_URL de produção não encontrada');
      process.exit(1);
    }

    console.log('📋 CONFIGURAÇÃO:');
    console.log('-'.repeat(40));
    console.log('Produção:', prodUrl ? '✅ Configurado' : '❌ Não configurado');
    console.log('Desenvolvimento:', devUrl ? '✅ Configurado' : '❌ Não configurado');

    if (!devUrl) {
      console.log('\n⚠️  AVISO: DATABASE_URL de desenvolvimento não encontrada');
      console.log('   Adicione DATABASE_URL_DEV no .env ou crie .env.development');
      console.log('\n   Para criar um banco local PostgreSQL:');
      console.log('   1. Instale PostgreSQL');
      console.log('   2. Crie um banco: createdb sjt_dev');
      console.log('   3. Configure: DATABASE_URL_DEV="postgresql://user:pass@localhost/sjt_dev"');
      return;
    }

    // 2. Criar backup de produção
    console.log('\n\n📦 ETAPA 1: BACKUP DE PRODUÇÃO');
    console.log('-'.repeat(40));

    const backupFile = `/tmp/sjt_prod_backup_${Date.now()}.sql`;
    console.log(`Criando backup em: ${backupFile}`);

    // Comando pg_dump para fazer backup
    const dumpCommand = `pg_dump "${prodUrl}" --no-owner --no-acl --clean --if-exists > ${backupFile}`;

    try {
      await execPromise(dumpCommand);
      console.log('✅ Backup criado com sucesso');

      // Verificar tamanho do arquivo
      const stats = fs.statSync(backupFile);
      const sizeMB = (stats.size / 1024 / 1024).toFixed(2);
      console.log(`   Tamanho: ${sizeMB} MB`);
    } catch (error) {
      console.error('❌ Erro ao criar backup:', error);
      console.log('\n💡 Certifique-se de ter o pg_dump instalado:');
      console.log('   Ubuntu/Debian: sudo apt-get install postgresql-client');
      console.log('   MacOS: brew install postgresql');
      return;
    }

    // 3. Restaurar em desenvolvimento
    console.log('\n\n📥 ETAPA 2: RESTAURAR EM DESENVOLVIMENTO');
    console.log('-'.repeat(40));
    console.log('⚠️  ATENÇÃO: Isso vai SOBRESCREVER o banco de desenvolvimento!');
    console.log('   Todos os dados atuais serão perdidos.');

    // Comando psql para restaurar
    const restoreCommand = `psql "${devUrl}" < ${backupFile}`;

    try {
      console.log('\nRestaurando banco...');
      await execPromise(restoreCommand);
      console.log('✅ Banco restaurado com sucesso!');
    } catch (error) {
      console.error('❌ Erro ao restaurar:', error);
      console.log('\n💡 Verifique se:');
      console.log('   1. O banco de desenvolvimento existe');
      console.log('   2. As credenciais estão corretas');
      console.log('   3. O psql está instalado');
    }

    // 4. Limpar arquivo temporário
    console.log('\n\n🧹 ETAPA 3: LIMPEZA');
    console.log('-'.repeat(40));
    fs.unlinkSync(backupFile);
    console.log('✅ Arquivo temporário removido');

    // 5. Verificar dados copiados
    console.log('\n\n✅ SINCRONIZAÇÃO COMPLETA!');
    console.log('=' .repeat(80));
    console.log('\nPara verificar os dados copiados, execute:');
    console.log('   NODE_ENV=development npm run dev');
    console.log('\nOu execute o script de verificação:');
    console.log('   NODE_ENV=development npx tsx scripts/check-database-tables.ts');

  } catch (error) {
    console.error('❌ Erro geral:', error);
  }
}

// Executar
syncProdToDev();