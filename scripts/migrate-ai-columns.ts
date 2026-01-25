/**
 * Migration script to add AI analysis columns to formation_materials
 */

import { db } from '../server/db';
import { sql } from 'drizzle-orm';

async function migrate() {
  console.log('Adding AI analysis columns to formation_materials...');

  try {
    await db.execute(sql`
      ALTER TABLE formation_materials
      ADD COLUMN IF NOT EXISTS ai_analyzed BOOLEAN DEFAULT false,
      ADD COLUMN IF NOT EXISTS ai_summary TEXT,
      ADD COLUMN IF NOT EXISTS ai_suggested_category formation_category,
      ADD COLUMN IF NOT EXISTS ai_suggested_tags JSONB,
      ADD COLUMN IF NOT EXISTS ai_key_topics JSONB,
      ADD COLUMN IF NOT EXISTS ai_content_quality VARCHAR(20),
      ADD COLUMN IF NOT EXISTS ai_quality_notes JSONB,
      ADD COLUMN IF NOT EXISTS ai_quiz_questions JSONB,
      ADD COLUMN IF NOT EXISTS ai_analyzed_at TIMESTAMP;
    `);

    console.log('Migration completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

migrate();
