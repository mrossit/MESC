#!/usr/bin/env tsx
import * as fs from 'fs/promises';
import path from 'path';

async function importToDev() {
  console.log('📥 IMPORTAÇÃO DE DADOS PARA DESENVOLVIMENTO');
  console.log('='.repeat(60));

  try {
    // Verificar ambiente
    const currentEnv = process.env.NODE_ENV;

    if (currentEnv === 'production' && !process.argv.includes('--force')) {
      console.log('\n⚠️  ATENÇÃO: Você está em PRODUÇÃO!');
      console.log('   Este script deve ser executado em desenvolvimento.');
      console.log('   Use: NODE_ENV=development npx tsx scripts/import-to-dev.ts');
      console.log('   Ou adicione --force para continuar\n');
      process.exit(1);
    }

    // Localizar arquivo de export mais recente
    const exportDir = path.join(process.cwd(), 'data-exports');
    const files = await fs.readdir(exportDir).catch(() => []);
    const exports = files.filter(f => f.startsWith('export_') && f.endsWith('.json'));

    if (exports.length === 0) {
      console.log('\n❌ Nenhum export encontrado!');
      console.log('   Execute primeiro em produção:');
      console.log('   NODE_ENV=production npx tsx scripts/sync-production-data.ts\n');
      process.exit(1);
    }

    // Usar o export mais recente
    exports.sort().reverse();
    const latestExport = exports[0];
    const exportPath = path.join(exportDir, latestExport);

    console.log(`\n📁 Arquivo encontrado: ${latestExport}`);

    // Ler dados
    const content = await fs.readFile(exportPath, 'utf-8');
    const data = JSON.parse(content);

    console.log(`📅 Criado em: ${new Date(data.timestamp).toLocaleString('pt-BR')}`);
    console.log(`🌍 Ambiente origem: ${data.environment}`);

    // Mostrar resumo dos dados
    console.log('\n📊 RESUMO DOS DADOS:');
    console.log('='.repeat(60));
    console.log(`   👥 Usuários: ${data.users?.length || 0}`);
    console.log(`   📋 Questionários: ${data.questionnaires?.length || 0}`);
    console.log(`   📝 Respostas: ${data.questionnaireResponses?.length || 0}`);
    console.log(`   ⛪ Config. Missas: ${data.massTimesConfig?.length || 0}`);
    console.log(`   📅 Escalas: ${data.schedules?.length || 0}`);
    console.log(`   🔔 Notificações: ${data.notifications?.length || 0}`);

    // Dados de outubro
    const octoberQuestionnaire = data.questionnaires?.find((q: any) =>
      q.month === 10 && q.year === 2025
    );

    if (octoberQuestionnaire) {
      const octoberResponses = data.questionnaireResponses?.filter((r: any) =>
        r.questionnaireId === octoberQuestionnaire.id
      );

      console.log('\n📈 Dados de Outubro 2025:');
      console.log(`   📋 Questionário: ${octoberQuestionnaire.title}`);
      console.log(`   📝 Respostas: ${octoberResponses?.length || 0}`);
      console.log(`   📊 Status: ${octoberQuestionnaire.status}`);

      if (octoberResponses && octoberResponses.length > 0) {
        console.log(`   👥 Ministros que responderam:`);
        octoberResponses.forEach((r: any) => {
          const user = data.users?.find((u: any) => u.id === r.userId);
          console.log(`      - ${user?.name || 'Desconhecido'}`);
        });
      }
    }

    console.log('\n🎯 INSTRUÇÕES PARA IMPORTAR NO DESENVOLVIMENTO:\n');
    console.log('1. Abra um novo terminal');
    console.log('2. Execute os seguintes comandos:\n');
    console.log('   # Configurar ambiente de desenvolvimento');
    console.log('   export NODE_ENV=development\n');
    console.log('   # Importar os dados');
    console.log('   npx tsx scripts/sync-production-data.ts import --import-force\n');
    console.log('3. Os dados serão importados para o banco de desenvolvimento');

    // Criar script de importação facilitado
    const importScript = `#!/bin/bash
# Script para importar dados de produção para desenvolvimento

echo "📥 Importando dados de produção para desenvolvimento..."
export NODE_ENV=development
npx tsx scripts/sync-production-data.ts import --import-force
echo "✅ Importação concluída!"
`;

    const scriptPath = path.join(process.cwd(), 'import-prod-data.sh');
    await fs.writeFile(scriptPath, importScript);
    await fs.chmod(scriptPath, 0o755);

    console.log('\n💡 ALTERNATIVA: Script criado para facilitar:');
    console.log('   ./import-prod-data.sh\n');

    // Verificar se estamos em dev e perguntar se quer importar agora
    if (currentEnv === 'development' || currentEnv === undefined) {
      console.log('🔄 Você está em desenvolvimento.');
      console.log('   Para importar os dados agora, execute:');
      console.log('   npx tsx scripts/sync-production-data.ts import --import-force\n');
    }

  } catch (error) {
    console.error('\n❌ Erro:', error);
    process.exit(1);
  }
}

importToDev().catch(console.error);