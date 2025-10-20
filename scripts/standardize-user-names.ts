/**
 * Script to standardize all user names in the database
 * Formats names with proper capitalization:
 * - First letter of each word in uppercase
 * - Rest in lowercase
 * - Specific prefixes kept in lowercase (da, de, do, das, dos, e, etc.)
 */

import { db } from '../server/db';
import { users } from '@shared/schema';
import { formatName } from '../server/utils/nameFormatter';
import { eq } from 'drizzle-orm';

async function standardizeUserNames() {
  console.log('🔄 Iniciando padronização de nomes de usuários...\n');

  try {
    // Fetch all users
    const allUsers = await db.select().from(users);

    console.log(`📊 Total de usuários encontrados: ${allUsers.length}\n`);

    let updatedCount = 0;
    let unchangedCount = 0;

    // Process each user
    for (const user of allUsers) {
      const originalName = user.name;
      const formattedName = formatName(originalName);

      // Only update if the name has changed
      if (originalName !== formattedName) {
        await db
          .update(users)
          .set({
            name: formattedName,
            updatedAt: new Date()
          })
          .where(eq(users.id, user.id));

        console.log(`✅ Atualizado: "${originalName}" → "${formattedName}" (${user.email})`);
        updatedCount++;
      } else {
        console.log(`⏭️  Sem alteração: "${originalName}" (${user.email})`);
        unchangedCount++;
      }
    }

    console.log('\n📈 Resumo da padronização:');
    console.log(`   - Total de usuários: ${allUsers.length}`);
    console.log(`   - Nomes atualizados: ${updatedCount}`);
    console.log(`   - Nomes sem alteração: ${unchangedCount}`);
    console.log('\n✅ Padronização concluída com sucesso!');

  } catch (error) {
    console.error('\n❌ Erro ao padronizar nomes:', error);
    throw error;
  }
}

// Run the script if executed directly
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Check if this is the main module being executed
const isMainModule = import.meta.url === `file://${process.argv[1]}`;

if (isMainModule) {
  standardizeUserNames()
    .then(() => {
      console.log('\n🎉 Script finalizado!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Script falhou:', error);
      process.exit(1);
    });
}

export { standardizeUserNames };
