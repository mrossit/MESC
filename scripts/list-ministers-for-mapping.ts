import { db } from '../server/db.js';
import { users } from '@shared/schema.js';

async function listMinisters() {
  const allUsers = await db.select().from(users);
  console.log('=== MINISTROS NO BANCO ===\n');
  allUsers.forEach(u => {
    const firstName = u.name.split(' ')[0];
    console.log(`"${firstName}" -> "${u.name}"`);
  });
  process.exit(0);
}

listMinisters();
