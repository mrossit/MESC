import postgres from 'postgres';

const client = postgres('postgresql://neondb_owner:npg_3QKylioran9V@ep-lingering-firefly-afak5e6q.c-2.us-west-2.aws.neon.tech/neondb?sslmode=require');

/**
 * Update minister daily mass availability
 * Usage examples:
 * - All days: updateAvailability('email@example.com', ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta'])
 * - Some days: updateAvailability('email@example.com', ['Quarta', 'Sexta'])
 * - No days: updateAvailability('email@example.com', [])
 */
async function updateAvailability(email: string, availableDays: string[]) {
  const dayMapping: Record<string, string> = {
    'Segunda': 'monday',
    'Segunda-feira': 'monday',
    'Terça': 'tuesday',
    'Terça-feira': 'tuesday',
    'Quarta': 'wednesday',
    'Quarta-feira': 'wednesday',
    'Quinta': 'thursday',
    'Quinta-feira': 'thursday',
    'Sexta': 'friday',
    'Sexta-feira': 'friday'
  };

  // Build weekdays object
  const weekdays = {
    monday: false,
    tuesday: false,
    wednesday: false,
    thursday: false,
    friday: false
  };

  for (const day of availableDays) {
    const normalizedDay = dayMapping[day];
    if (normalizedDay) {
      weekdays[normalizedDay as keyof typeof weekdays] = true;
    }
  }

  // Build dailyMassAvailability array
  const dailyMassAvailability: string[] = [];
  if (weekdays.monday) dailyMassAvailability.push('Segunda-feira');
  if (weekdays.tuesday) dailyMassAvailability.push('Terça-feira');
  if (weekdays.wednesday) dailyMassAvailability.push('Quarta-feira');
  if (weekdays.thursday) dailyMassAvailability.push('Quinta-feira');
  if (weekdays.friday) dailyMassAvailability.push('Sexta-feira');

  try {
    // First, get the current response
    const current = await client`
      SELECT qr.id, qr.responses, u.name, u.email
      FROM questionnaire_responses qr
      JOIN users u ON u.id = qr.user_id
      JOIN questionnaires q ON q.id = qr.questionnaire_id
      WHERE q.year = 2025
        AND q.month = 11
        AND LOWER(u.email) = LOWER(${email})
    `;

    if (current.length === 0) {
      console.log(`❌ Ministro não encontrado: ${email}`);
      return;
    }

    const row = current[0];
    const currentResponses = typeof row.responses === 'string' 
      ? JSON.parse(row.responses) 
      : row.responses;

    // Update weekdays in responses
    const updatedResponses = {
      ...currentResponses,
      weekdays
    };

    // Update the database
    await client`
      UPDATE questionnaire_responses
      SET 
        responses = ${JSON.stringify(updatedResponses)}::jsonb,
        daily_mass_availability = ${JSON.stringify(dailyMassAvailability.length > 0 ? dailyMassAvailability : [])}::jsonb
      WHERE id = ${row.id}
    `;

    console.log(`✅ ${row.name} (${row.email})`);
    if (dailyMassAvailability.length === 0) {
      console.log(`   → Não disponível para missas diárias`);
    } else {
      console.log(`   → Disponível: ${dailyMassAvailability.join(', ')}`);
    }
  } catch (error: any) {
    console.error(`❌ Erro ao atualizar ${email}:`, error.message);
  }
}

/**
 * Main function - ADD YOUR DATA HERE
 */
async function main() {
  console.log('📝 ATUALIZANDO DISPONIBILIDADE DE MINISTROS - Novembro 2025\n');
  console.log('═'.repeat(80));
  
  // ============================================================================
  // INSIRA OS DADOS AQUI:
  // ============================================================================
  
  // Exemplo: Maria Isabel - disponível Quartas e Sextas
  await updateAvailability('belmoura20@gmail.com', ['Quarta', 'Sexta']);
  
  // Adicione mais ministros abaixo:
  // await updateAvailability('outro@email.com', ['Segunda', 'Quarta', 'Quinta']);
  // await updateAvailability('ministro@email.com', []); // Não disponível
  // await updateAvailability('fulano@email.com', ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta']); // Todos os dias
  
  // ============================================================================
  
  console.log('═'.repeat(80));
  console.log('\n✅ Atualização concluída!\n');
  
  await client.end();
}

main();
