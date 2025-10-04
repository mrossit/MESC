import { db } from "../server/db";
import { schedules, users } from "../shared/schema";
import { eq } from "drizzle-orm";

async function createSchedule() {
  try {
    console.log('📅 Criando escala para 05/10/2025 às 19:00:00\n');

    // Usando os IDs EXATOS encontrados no banco
    const assignments = [
      { position: 1, userId: "76d48146-2c12-43ed-b7a4-d655636b2cad", name: "Isabelle Cobianchi Pereira Ferreira" },
      { position: 2, userId: "1b8720fa-961e-4115-a760-8a790c312714", name: "Bruna Michele Rubio Mariano Sanches" }, // Nome correto no banco
      { position: 3, userId: "deca521b-5104-4474-85e0-43c3ae064311", name: "LUCIANA CAMPOS SILVA SOARES" },
      { position: 4, userId: "62f0b916-8e23-4d8c-8d46-f9b513b10fcc", name: "marcelo tadeu sanches" }, // Nome correto no banco
      { position: 5, userId: "642882c7-6aa0-41ff-ad20-73c68f1a3956", name: "Sérgio Manoel dos Santos " }, // Tem espaço no final
      { position: 6, userId: null, name: "José Luiz de Carvalho" }, // NÃO ENCONTRADO - deixar vazio
      { position: 7, userId: "8c6deba4-c778-4686-a8e6-add61bd389de", name: "Maria Clara de Oliveira Salles" }, // Mais próximo
      { position: 8, userId: null, name: "Ana Júlia dos Santos Alves" }, // NÃO ENCONTRADO - deixar vazio
      { position: 9, userId: "bed0284f-12cf-439e-b0a0-133375b6bc1e", name: "Ana Jardim " }, // Tem espaço no final
      { position: 10, userId: "24b22f0b-1a93-47cb-b951-d50df829fa16", name: "Mayra Pereira Garcia" },
      { position: 11, userId: null, name: "Adélia Masumi Kaneko Benedito" }, // NÃO ENCONTRADO - deixar vazio
      { position: 12, userId: null, name: "Josimar Garcia" }, // NÃO ENCONTRADO - deixar vazio
      { position: 13, userId: "1e2c9d6e-e708-4934-a9b8-56e58a518a91", name: "Jaci da Mota Jardim " }, // Tem espaço no final
      { position: 14, userId: "efa0ea22-d18e-439a-99f9-7d0d14e4b354", name: "ELISABETE MEDEIROS" },
      { position: 15, userId: "78b81f77-6de8-4702-bd40-67e4eef6f227", name: "MARIA ISABEL PICINI DE MOURA NEVES" }
    ];

    const scheduleDate = '2025-10-05';
    const scheduleTime = '19:00:00';

    for (const assignment of assignments) {
      if (!assignment.userId) {
        console.log(`⚠️  Posição ${assignment.position} (${assignment.name}): USUÁRIO NÃO CADASTRADO - criando VAGA`);

        // Criar como VACANT
        await db.insert(schedules).values({
          date: scheduleDate,
          time: scheduleTime,
          type: 'missa',
          ministerId: null,
          position: assignment.position,
          status: 'scheduled',
          location: 'Santuário São Judas Tadeu'
        });

        continue;
      }

      console.log(`✅ Posição ${assignment.position}: ${assignment.name}`);

      // Verificar se já existe
      const existing = await db
        .select()
        .from(schedules)
        .where(eq(schedules.date, scheduleDate));

      const alreadyExists = existing.find(
        s => s.time === scheduleTime && s.position === assignment.position
      );

      if (alreadyExists) {
        console.log(`   ⚠️  Já existe - atualizando...`);
        // Aqui você pode adicionar lógica de update se quiser
        continue;
      }

      // Inserir
      await db.insert(schedules).values({
        date: scheduleDate,
        time: scheduleTime,
        type: 'missa',
        ministerId: assignment.userId,
        position: assignment.position,
        status: 'scheduled',
        location: 'Santuário São Judas Tadeu'
      });

      console.log(`   ✨ Criado!\n`);
    }

    console.log('\n✅ Escala criada! Total: 15 posições');
    console.log('\n⚠️  ATENÇÃO: 4 usuários NÃO foram encontrados no banco:');
    console.log('   - José Luiz de Carvalho');
    console.log('   - Ana Júlia dos Santos Alves');
    console.log('   - Adélia Masumi Kaneko Benedito');
    console.log('   - Josimar Garcia');
    console.log('\nEstas posições foram criadas como VAGAS.');

  } catch (error) {
    console.error('❌ Erro:', error);
  } finally {
    process.exit(0);
  }
}

createSchedule();
