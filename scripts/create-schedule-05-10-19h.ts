import { db } from "../server/db";
import { schedules, users } from "../shared/schema";
import { eq, or, ilike } from "drizzle-orm";

async function createSchedule() {
  try {
    console.log('📅 Criando escala para 05/10/2025 às 19:00:00\n');

    const ministerNames = [
      { position: 1, name: "Isabelle Cobianchi Pereira Ferreira" },
      { position: 2, name: "Bruna Michele Rubio Mariano dos Santos" },
      { position: 3, name: "Luciana Campos Silva Soares" },
      { position: 4, name: "Marcelo Tadeu Santos" },
      { position: 5, name: "Sérgio Manoel dos Santos" },
      { position: 6, name: "José Luiz de Carvalho" },
      { position: 7, name: "Maria Clara de Oliveira R Neves" },
      { position: 8, name: "Ana Júlia dos Santos Alves" },
      { position: 9, name: "Ana Jardim" },
      { position: 10, name: "Mayra Pereira Garcia" },
      { position: 11, name: "Adélia Masumi Kaneko Benedito" },
      { position: 12, name: "Josimar Garcia" },
      { position: 13, name: "Jaci da Mota Jardim" },
      { position: 14, name: "Elisabete Medeiros" },
      { position: 15, name: "Maria Isabel Picini de Moura Neves" }
    ];

    console.log('🔍 Buscando usuários no banco de dados...\n');

    const scheduleDate = '2025-10-05';
    const scheduleTime = '19:00:00';

    for (const minister of ministerNames) {
      // Buscar usuário no banco (case insensitive)
      const foundUsers = await db
        .select()
        .from(users)
        .where(ilike(users.name, minister.name))
        .limit(1);

      if (foundUsers.length === 0) {
        console.log(`❌ USUÁRIO NÃO ENCONTRADO: ${minister.name}`);
        console.log(`   Tentando variações...`);

        // Tentar buscar por parte do nome
        const nameParts = minister.name.split(' ');
        const firstName = nameParts[0];
        const lastName = nameParts[nameParts.length - 1];

        const partialMatch = await db
          .select()
          .from(users)
          .where(
            or(
              ilike(users.name, `%${firstName}%${lastName}%`),
              ilike(users.name, `${firstName}%`)
            )
          )
          .limit(5);

        if (partialMatch.length > 0) {
          console.log(`   Possíveis matches:`);
          partialMatch.forEach(u => console.log(`   - ${u.name} (ID: ${u.id})`));
        }
        continue;
      }

      const user = foundUsers[0];
      console.log(`✅ Posição ${minister.position}: ${user.name} (ID: ${user.id})`);

      // Verificar se já existe escala para este usuário nesta data/horário
      const existing = await db
        .select()
        .from(schedules)
        .where(
          eq(schedules.date, scheduleDate)
        )
        .limit(100);

      const alreadyScheduled = existing.find(
        s => s.ministerId === user.id && s.time === scheduleTime && s.position === minister.position
      );

      if (alreadyScheduled) {
        console.log(`   ⚠️  Já existe escala para este ministro nesta posição`);
        continue;
      }

      // Inserir escala
      await db.insert(schedules).values({
        date: scheduleDate,
        time: scheduleTime,
        type: 'missa',
        ministerId: user.id,
        position: minister.position,
        status: 'scheduled',
        location: 'Santuário São Judas Tadeu'
      });

      console.log(`   ✨ Escala criada com sucesso!\n`);
    }

    console.log('\n✅ Processo concluído!');

  } catch (error) {
    console.error('❌ Erro:', error);
  } finally {
    process.exit(0);
  }
}

createSchedule();
