import { db } from '../server/db';
import { users, schedules, questionnaireResponses } from '@shared/schema';
import { count } from 'drizzle-orm';

async function testDatabaseConnection() {
  console.log('🔍 Testing database connection...');
  console.log('Environment:', process.env.NODE_ENV);
  console.log('Database URL configured:', !!process.env.DATABASE_URL);

  try {
    // Test 1: Count users
    const [usersCount] = await db.select({ count: count() }).from(users);
    console.log(`✅ Users table: ${usersCount.count} records`);

    // Test 2: Count schedules
    const [schedulesCount] = await db.select({ count: count() }).from(schedules);
    console.log(`✅ Schedules table: ${schedulesCount.count} records`);

    // Test 3: Count questionnaire responses
    const [responsesCount] = await db.select({ count: count() }).from(questionnaireResponses);
    console.log(`✅ Questionnaire responses table: ${responsesCount.count} records`);

    // Test 4: Fetch sample user
    const sampleUsers = await db.select().from(users).limit(1);
    if (sampleUsers.length > 0) {
      console.log('✅ Sample user retrieved successfully');
      console.log('  - Name:', sampleUsers[0].name);
      console.log('  - Email:', sampleUsers[0].email);
    }

    console.log('\n✅ Database connection test completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Database connection test failed:', error);
    process.exit(1);
  }
}

testDatabaseConnection();