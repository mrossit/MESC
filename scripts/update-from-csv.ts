import postgres from 'postgres';
import { readFileSync } from 'fs';

const client = postgres('postgresql://neondb_owner:npg_3QKylioran9V@ep-lingering-firefly-afak5e6q.c-2.us-west-2.aws.neon.tech/neondb?sslmode=require');

/**
 * Update minister daily mass availability from email and days list
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
    const trimmedDay = day.trim();
    const normalizedDay = dayMapping[trimmedDay];
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
      console.log(`⚠️  Ministro não encontrado: ${email}`);
      return false;
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

    console.log(`✅ ${row.name}`);
    if (dailyMassAvailability.length === 0) {
      console.log(`   → Não disponível para missas diárias`);
    } else {
      console.log(`   → Disponível: ${dailyMassAvailability.join(', ')}`);
    }
    return true;
  } catch (error: any) {
    console.error(`❌ Erro ao atualizar ${email}:`, error.message);
    return false;
  }
}

/**
 * Parse CSV file and update all ministers
 */
async function updateFromCSV() {
  console.log('📂 IMPORTANDO DISPONIBILIDADE DE MINISTROS - CSV\n');
  console.log('═'.repeat(80));

  try {
    // Read CSV file
    const csvContent = readFileSync('scripts/availability-data.csv', 'utf-8');
    
    // Parse CSV (simple parser - assumes no commas in data)
    const lines = csvContent.trim().split('\n');
    const header = lines[0];
    
    console.log(`📋 Processando ${lines.length - 1} registros...\n`);

    let successful = 0;
    let notFound = 0;
    let errors = 0;

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      // Split by comma (email,dias)
      const [email, daysString] = line.split(',');
      
      if (!email || !email.includes('@')) {
        console.log(`⚠️  Linha ${i}: Email inválido`);
        errors++;
        continue;
      }

      // Parse days (separated by semicolon)
      const days = daysString ? daysString.split(';').filter(d => d.trim()) : [];
      
      const result = await updateAvailability(email.trim(), days);
      
      if (result) {
        successful++;
      } else {
        notFound++;
      }
      
      console.log(''); // Empty line between ministers
    }

    console.log('═'.repeat(80));
    console.log('\n📊 RESULTADO DA IMPORTAÇÃO:');
    console.log('─'.repeat(80));
    console.log(`   ✅ Atualizados com sucesso: ${successful}`);
    console.log(`   ⚠️  Não encontrados: ${notFound}`);
    console.log(`   ❌ Erros: ${errors}`);
    console.log(`   📝 Total processado: ${successful + notFound + errors}`);
    console.log('─'.repeat(80));

  } catch (error: any) {
    console.error('\n❌ Erro ao ler arquivo CSV:', error.message);
    console.log('\n💡 Certifique-se de que o arquivo "availability-data.csv" existe no diretório scripts/');
  } finally {
    await client.end();
  }
}

updateFromCSV();
