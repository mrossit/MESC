#!/usr/bin/env tsx
/**
 * Script simplificado para copiar dados de produção para desenvolvimento
 * Usa arquivos JSON como intermediário já que não temos acesso direto aos dois bancos
 */

import * as fs from 'fs/promises';
import path from 'path';
import { db } from '../server/db';
import { users, questionnaires, questionnaireResponses, massTimesConfig, schedules, notifications, families, passwordResetRequests } from '@shared/schema';
import { eq } from 'drizzle-orm';

async function copyProdToDev() {
  console.log('🔄 CÓPIA DE DADOS: PRODUÇÃO → DESENVOLVIMENTO');
  console.log('='.repeat(60));

  const isProd = process.env.NODE_ENV === 'production';
  const exportFile = 'data-exports/export_2025-09-28T22-43-07.json';

  if (isProd) {
    // MODO EXPORTAÇÃO (executar em produção)
    console.log('\n📤 MODO: EXPORTAÇÃO DE PRODUÇÃO\n');

    try {
      const exportData = {
        timestamp: new Date().toISOString(),
        environment: 'production',
        users: await db.select().from(users),
        questionnaires: await db.select().from(questionnaires),
        questionnaireResponses: await db.select().from(questionnaireResponses),
        massTimesConfig: await db.select().from(massTimesConfig),
        schedules: await db.select().from(schedules),
        notifications: await db.select().from(notifications),
        families: await db.select().from(families),
        passwordResetRequests: await db.select().from(passwordResetRequests)
      };

      const total =
        exportData.users.length +
        exportData.questionnaires.length +
        exportData.questionnaireResponses.length +
        exportData.massTimesConfig.length +
        exportData.schedules.length;

      console.log('📊 Dados exportados:');
      console.log(`   👥 Usuários: ${exportData.users.length}`);
      console.log(`   📋 Questionários: ${exportData.questionnaires.length}`);
      console.log(`   📝 Respostas: ${exportData.questionnaireResponses.length}`);
      console.log(`   ⛪ Config. Missas: ${exportData.massTimesConfig.length}`);
      console.log(`   📅 Escalas: ${exportData.schedules.length}`);
      console.log(`   📊 Total: ${total} registros`);

      // Salvar arquivo
      const exportDir = path.join(process.cwd(), 'data-exports');
      await fs.mkdir(exportDir, { recursive: true });

      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').substring(0, 19);
      const filename = `prod_backup_${timestamp}.json`;
      const filepath = path.join(exportDir, filename);

      await fs.writeFile(filepath, JSON.stringify(exportData, null, 2));

      console.log(`\n✅ Dados salvos em: ${filename}`);
      console.log('\n📌 PRÓXIMO PASSO:');
      console.log('   Execute este comando em desenvolvimento:');
      console.log('   NODE_ENV=development npx tsx scripts/copy-prod-to-dev.ts\n');

    } catch (error) {
      console.error('❌ Erro ao exportar:', error);
    }

  } else {
    // MODO IMPORTAÇÃO (executar em desenvolvimento)
    console.log('\n📥 MODO: IMPORTAÇÃO PARA DESENVOLVIMENTO\n');

    try {
      // Procurar arquivo mais recente
      const exportDir = path.join(process.cwd(), 'data-exports');
      const files = await fs.readdir(exportDir).catch(() => []);
      const backups = files.filter(f =>
        (f.startsWith('prod_backup_') || f.startsWith('export_')) && f.endsWith('.json')
      );

      if (backups.length === 0) {
        console.log('❌ Nenhum backup encontrado!');
        console.log('   Execute primeiro em produção:');
        console.log('   NODE_ENV=production npx tsx scripts/copy-prod-to-dev.ts');
        process.exit(1);
      }

      // Usar o mais recente
      backups.sort().reverse();
      const latestBackup = backups[0];
      const backupPath = path.join(exportDir, latestBackup);

      console.log(`📁 Usando backup: ${latestBackup}`);

      // Ler dados
      const content = await fs.readFile(backupPath, 'utf-8');
      const data = JSON.parse(content);

      console.log(`📅 Backup de: ${new Date(data.timestamp).toLocaleString('pt-BR')}`);

      // Confirmar importação
      if (!process.argv.includes('--force')) {
        console.log('\n⚠️  ATENÇÃO: Isso vai SUBSTITUIR todos os dados de desenvolvimento!');
        console.log('   Use --force para confirmar\n');
        process.exit(1);
      }

      console.log('\n🔄 Importando dados...\n');

      // PRIMEIRO: Limpar todas as tabelas (na ordem inversa das dependências)
      console.log('   🗑️  Limpando banco de desenvolvimento...');

      // Limpar tabelas com foreign keys primeiro
      await db.delete(passwordResetRequests);
      await db.delete(notifications);
      await db.delete(schedules);
      await db.delete(questionnaireResponses);
      await db.delete(massTimesConfig);
      await db.delete(questionnaires);
      await db.delete(families);
      await db.delete(users);

      console.log('   ✅ Banco limpo\n');

      // DEPOIS: Importar tabelas (na ordem correta das dependências)
      let imported = 0;

      // 1. Users (sem dependências)
      if (data.users && data.users.length > 0) {
        process.stdout.write('   👥 Usuários... ');
        // Converter strings de data para Date objects
        const usersToInsert = data.users.map((u: any) => ({
          ...u,
          createdAt: u.createdAt ? new Date(u.createdAt) : new Date(),
          updatedAt: u.updatedAt ? new Date(u.updatedAt) : new Date(),
          lastService: u.lastService ? new Date(u.lastService) : null,
          lastLogin: u.lastLogin ? new Date(u.lastLogin) : null
        }));
        await db.insert(users).values(usersToInsert);
        imported += data.users.length;
        console.log(`✅ ${data.users.length}`);
      }

      // 2. Questionnaires (sem dependências)
      if (data.questionnaires && data.questionnaires.length > 0) {
        process.stdout.write('   📋 Questionários... ');
        const questionnairesToInsert = data.questionnaires.map((q: any) => ({
          ...q,
          createdAt: q.createdAt ? new Date(q.createdAt) : new Date(),
          updatedAt: q.updatedAt ? new Date(q.updatedAt) : new Date(),
          deadline: q.deadline ? new Date(q.deadline) : null
        }));
        await db.insert(questionnaires).values(questionnairesToInsert);
        imported += data.questionnaires.length;
        console.log(`✅ ${data.questionnaires.length}`);
      }

      // 3. Questionnaire Responses (depende de users e questionnaires)
      if (data.questionnaireResponses && data.questionnaireResponses.length > 0) {
        process.stdout.write('   📝 Respostas... ');
        const responsesToInsert = data.questionnaireResponses.map((r: any) => ({
          ...r,
          submittedAt: r.submittedAt ? new Date(r.submittedAt) : new Date(),
          updatedAt: r.updatedAt ? new Date(r.updatedAt) : new Date()
        }));
        await db.insert(questionnaireResponses).values(responsesToInsert);
        imported += data.questionnaireResponses.length;
        console.log(`✅ ${data.questionnaireResponses.length}`);
      }

      // 4. Mass Times Config (sem dependências)
      if (data.massTimesConfig && data.massTimesConfig.length > 0) {
        process.stdout.write('   ⛪ Config. Missas... ');
        const massTimesToInsert = data.massTimesConfig.map((m: any) => ({
          ...m,
          createdAt: m.createdAt ? new Date(m.createdAt) : new Date(),
          updatedAt: m.updatedAt ? new Date(m.updatedAt) : new Date()
        }));
        await db.insert(massTimesConfig).values(massTimesToInsert);
        imported += data.massTimesConfig.length;
        console.log(`✅ ${data.massTimesConfig.length}`);
      }

      // 5. Schedules (depende de users)
      if (data.schedules && data.schedules.length > 0) {
        process.stdout.write('   📅 Escalas... ');
        await db.insert(schedules).values(data.schedules);
        imported += data.schedules.length;
        console.log(`✅ ${data.schedules.length}`);
      }

      // 6. Outros (se existirem)
      if (data.families && data.families.length > 0) {
        process.stdout.write('   👨‍👩‍👧‍👦 Famílias... ');
        await db.insert(families).values(data.families);
        imported += data.families.length;
        console.log(`✅ ${data.families.length}`);
      }

      if (data.notifications && data.notifications.length > 0) {
        process.stdout.write('   🔔 Notificações... ');
        await db.insert(notifications).values(data.notifications);
        imported += data.notifications.length;
        console.log(`✅ ${data.notifications.length}`);
      }

      console.log('\n✅ IMPORTAÇÃO CONCLUÍDA!');
      console.log(`   📊 Total importado: ${imported} registros`);

      // Verificar dados de outubro
      const october = await db.select()
        .from(questionnaires)
        .where(eq(questionnaires.month, 10));

      if (october.length > 0) {
        const responses = await db.select()
          .from(questionnaireResponses)
          .where(eq(questionnaireResponses.questionnaireId, october[0].id));

        console.log('\n📈 Outubro 2025:');
        console.log(`   📋 ${october[0].title}`);
        console.log(`   📝 ${responses.length} respostas`);
      }

      console.log('\n🎉 Banco de desenvolvimento atualizado com dados de produção!');

    } catch (error) {
      console.error('❌ Erro ao importar:', error);
    }
  }

  process.exit(0);
}

copyProdToDev().catch(console.error);