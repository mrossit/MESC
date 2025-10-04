import { db } from '../server/db';
import { users } from '@shared/schema';
import { eq } from 'drizzle-orm';

async function checkUserStatus() {
  console.log('🔍 Checking user status in database...');
  console.log('Environment:', process.env.NODE_ENV);

  try {
    // Find user by email
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.email, 'rossit@icloud.com'))
      .limit(1);

    if (user) {
      console.log('\n✅ User found:');
      console.log('  ID:', user.id);
      console.log('  Name:', user.name);
      console.log('  Email:', user.email);
      console.log('  Role:', user.role);
      console.log('  Status:', user.status);
      console.log('  Created:', user.createdAt);
      console.log('  Updated:', user.updatedAt);
    } else {
      console.log('❌ User not found!');
    }

    // List all users
    const allUsers = await db.select().from(users);
    console.log(`\n📋 Total users in database: ${allUsers.length}`);

    allUsers.forEach((u) => {
      console.log(`  - ${u.name} (${u.email}) - Role: ${u.role}, Status: ${u.status}`);
    });

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

checkUserStatus();