#!/usr/bin/env tsx

import { db } from '../server/db';
import { massTimesConfig } from '@shared/schema';
import { eq } from 'drizzle-orm';

async function main() {
  const configs = await db.select().from(massTimesConfig).where(eq(massTimesConfig.isActive, true));

  console.log(`Found ${configs.length} active mass configurations:\n`);

  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  configs.forEach(c => {
    console.log(`${dayNames[c.dayOfWeek]} (${c.dayOfWeek}): ${c.time}`);
    console.log(`  Min: ${c.minMinisters}, Max: ${c.maxMinisters}`);
    console.log(`  Special: ${c.specialEvent ? c.eventName : 'No'}`);
    console.log('');
  });
}

main();
