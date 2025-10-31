#!/usr/bin/env tsx
import postgres from 'postgres';

const PRODUCTION_DB_URL = 'postgresql://neondb_owner:npg_3QKylioran9V@ep-lingering-firefly-afak5e6q.c-2.us-west-2.aws.neon.tech/neondb?sslmode=require';

async function checkAvailability() {
  const sql = postgres(PRODUCTION_DB_URL, { ssl: 'require' });

  try {
    console.log('🔍 VERIFICANDO DISPONIBILIDADE: acsjaco@gmail.com\n');

    // Buscar dados do ministro
    const [minister] = await sql`
      SELECT 
        u.id,
        u.name,
        u.email,
        qr.responses,
        qr.special_events
      FROM users u
      LEFT JOIN questionnaire_responses qr ON qr.user_id = u.id
      LEFT JOIN questionnaires q ON qr.questionnaire_id = q.id
      WHERE LOWER(u.email) = 'acsjaco@gmail.com'
        AND (q.month = 11 OR q.month IS NULL)
        AND (q.year = 2025 OR q.year IS NULL)
      ORDER BY q.created_at DESC
      LIMIT 1
    `;

    if (!minister) {
      console.log('❌ Ministro não encontrado');
      return;
    }

    console.log('📋 DADOS DO MINISTRO:');
    console.log('Nome:', minister.name);
    console.log('Email:', minister.email);
    console.log('ID:', minister.id);
    console.log('\n' + '='.repeat(60) + '\n');

    if (!minister.responses) {
      console.log('⚠️  SEM QUESTIONÁRIO RESPONDIDO\n');
      return;
    }

    // Parse responses
    const responses = typeof minister.responses === 'string' 
      ? JSON.parse(minister.responses) 
      : minister.responses;

    console.log('📝 DISPONIBILIDADE REGISTRADA:\n');
    
    // Missas de domingo
    console.log('🕊️  DOMINGOS:');
    if (responses.masses) {
      const masses = Object.entries(responses.masses);
      if (masses.length === 0) {
        console.log('   ❌ Nenhuma missa de domingo marcada');
      } else {
        masses.forEach(([time, available]) => {
          console.log(`   ${available ? '✅' : '❌'} ${time}`);
        });
      }
    } else {
      console.log('   ⚠️  Sem dados de missas de domingo');
    }

    console.log('\n📅 DIAS DE SEMANA (MISSA DIÁRIA):');
    if (responses.weekdays) {
      const days = {
        monday: 'Segunda-feira',
        tuesday: 'Terça-feira',
        wednesday: 'Quarta-feira',
        thursday: 'Quinta-feira',
        friday: 'Sexta-feira'
      };
      
      let hasAnyWeekday = false;
      Object.entries(days).forEach(([key, label]) => {
        const available = responses.weekdays[key];
        if (available) hasAnyWeekday = true;
        console.log(`   ${available ? '✅' : '❌'} ${label}`);
      });

      if (!hasAnyWeekday) {
        console.log('\n   ⚠️  NENHUM DIA DE SEMANA DISPONÍVEL!');
      }
    } else {
      console.log('   ⚠️  Sem dados de disponibilidade para dias de semana');
    }

    console.log('\n🎯 EVENTOS ESPECIAIS:');
    if (responses.special_events) {
      Object.entries(responses.special_events).forEach(([event, available]) => {
        console.log(`   ${available ? '✅' : '❌'} ${event}`);
      });
    } else {
      console.log('   ⚠️  Sem dados de eventos especiais');
    }

    console.log('\n🔄 SUBSTITUIÇÕES:');
    console.log(`   ${responses.can_substitute ? '✅' : '❌'} Pode substituir`);

    console.log('\n' + '='.repeat(60) + '\n');

    // Verificar escalas onde aparece
    console.log('📊 ESCALAS ONDE ESTE MINISTRO APARECE:\n');
    const schedules = await sql`
      SELECT 
        s.date,
        s.mass_time,
        sp.position_name,
        EXTRACT(DOW FROM s.date) as day_of_week
      FROM schedule_positions sp
      JOIN schedules s ON sp.schedule_id = s.id
      WHERE sp.minister_id = ${minister.id}
        AND s.date >= CURRENT_DATE
      ORDER BY s.date, s.mass_time
      LIMIT 20
    `;

    if (schedules.length === 0) {
      console.log('   ℹ️  Sem escalas futuras');
    } else {
      const dayNames = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
      schedules.forEach(sch => {
        const dayName = dayNames[sch.day_of_week];
        const isWeekday = sch.day_of_week >= 1 && sch.day_of_week <= 5;
        const flag = isWeekday ? '⚠️ ' : '';
        console.log(`   ${flag}${sch.date.toISOString().split('T')[0]} (${dayName}) - ${sch.mass_time} - ${sch.position_name}`);
      });
    }

    console.log('\n✅ Verificação concluída!\n');

  } catch (error: any) {
    console.error('❌ ERRO:', error.message);
    throw error;
  } finally {
    await sql.end();
  }
}

checkAvailability()
  .then(() => process.exit(0))
  .catch(() => process.exit(1));
