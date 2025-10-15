/**
 * Test script for IntelligentScheduleGenerator
 */

import { drizzle } from 'drizzle-orm/neon-serverless';
import { Pool, neonConfig } from '@neondatabase/serverless';
import ws from 'ws';
import { users, questionnaireResponses } from '../shared/schema';
import { IntelligentScheduleGenerator } from '../server/services/scheduleGenerator';

neonConfig.webSocketConstructor = ws;

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const db = drizzle(pool);

async function testGenerator() {
  console.log('🧪 TESTING INTELLIGENT SCHEDULE GENERATOR\n');
  console.log('='.repeat(60));

  try {
    // Load ministers and responses
    console.log('\n📊 Step 1: Loading data from database...');
    const ministers = await db.select().from(users);
    const responses = await db.select().from(questionnaireResponses);

    console.log(`   ✅ Loaded ${ministers.length} ministers`);
    console.log(`   ✅ Loaded ${responses.length} questionnaire responses`);

    // Create generator
    console.log('\n🔧 Step 2: Creating generator...');
    const generator = new IntelligentScheduleGenerator(
      10,  // October
      2025,
      ministers,
      responses
    );

    // Generate schedule
    console.log('\n🚀 Step 3: Generating schedule...');
    const schedule = generator.generateSchedule();

    console.log(`\n📋 Step 4: Analyzing results...`);
    console.log('='.repeat(60));

    // Analyze results
    let totalMasses = 0;
    let totalPositions = 0;
    let filledPositions = 0;
    let vacantPositions = 0;

    const massResults: Array<{
      mass: string;
      filled: number;
      total: number;
      percent: number;
    }> = [];

    schedule.forEach((assignments, massKey) => {
      totalMasses++;
      const total = assignments.length;
      const filled = assignments.filter(a => a.ministerId !== 'VACANT').length;
      const vacant = total - filled;

      totalPositions += total;
      filledPositions += filled;
      vacantPositions += vacant;

      const percent = Math.round((filled / total) * 100);

      massResults.push({
        mass: massKey,
        filled,
        total,
        percent
      });
    });

    // Show summary
    console.log('\n📊 SUMMARY:\n');
    console.log(`Total Masses:          ${totalMasses}`);
    console.log(`Total Positions:       ${totalPositions}`);
    console.log(`Filled Positions:      ${filledPositions} (${Math.round(filledPositions / totalPositions * 100)}%)`);
    console.log(`Vacant Positions:      ${vacantPositions} (${Math.round(vacantPositions / totalPositions * 100)}%)`);

    // Show masses by coverage level
    console.log('\n📈 COVERAGE LEVELS:\n');

    const excellent = massResults.filter(m => m.percent >= 90);
    const good = massResults.filter(m => m.percent >= 70 && m.percent < 90);
    const fair = massResults.filter(m => m.percent >= 50 && m.percent < 70);
    const poor = massResults.filter(m => m.percent < 50);

    console.log(`Excellent (90-100%):   ${excellent.length} masses`);
    console.log(`Good (70-89%):         ${good.length} masses`);
    console.log(`Fair (50-69%):         ${fair.length} masses`);
    console.log(`Poor (0-49%):          ${poor.length} masses`);

    // Show problem masses
    if (poor.length > 0) {
      console.log('\n⚠️  MASSES WITH LOW COVERAGE (<50%):\n');
      poor.forEach(m => {
        console.log(`   ${m.mass}: ${m.filled}/${m.total} (${m.percent}%)`);
      });
    }

    // Show weekday masses specifically
    console.log('\n📅 WEEKDAY MASSES (06:30):\n');
    const weekdayMasses = massResults.filter(m => m.mass.includes('06:30'));
    weekdayMasses.forEach(m => {
      const status = m.filled > 0 ? '✅' : '❌';
      console.log(`   ${status} ${m.mass}: ${m.filled}/${m.total} (${m.percent}%)`);
    });

    console.log('\n' + '='.repeat(60));
    console.log('✅ TEST COMPLETE!\n');

  } catch (error) {
    console.error('\n❌ ERROR:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

testGenerator()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Test failed:', error);
    process.exit(1);
  });
