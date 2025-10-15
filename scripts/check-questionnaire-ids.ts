#!/usr/bin/env tsx

import { db } from '../server/db';
import { questionnaires } from '@shared/schema';
import { eq, and } from 'drizzle-orm';

async function main() {
  console.log('Checking questionnaire IDs format...\n');

  // Check all questionnaires
  const all = await db.select().from(questionnaires).limit(10);
  console.log('All questionnaires (sample):');
  all.forEach(q => {
    console.log(`  ID: ${q.id}`);
    console.log(`  Title: ${q.title}`);
    console.log(`  Month/Year: ${q.month}/${q.year}`);
    console.log('');
  });

  // Check for October 2025
  console.log('\nLooking for October 2025 questionnaire...');
  const oct2025 = await db.select()
    .from(questionnaires)
    .where(and(
      eq(questionnaires.month, 10),
      eq(questionnaires.year, 2025)
    ));

  if (oct2025.length > 0) {
    console.log(`Found ${oct2025.length} questionnaire(s) for October 2025:`);
    oct2025.forEach(q => {
      console.log(`  ID: ${q.id}`);
      console.log(`  Title: ${q.title}`);
      console.log(`  Status: ${q.status}`);
    });
  } else {
    console.log('No questionnaire found for October 2025');
  }
}

main().catch(console.error);
