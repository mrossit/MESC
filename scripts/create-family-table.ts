import { db } from '../server/db';
import { sql } from 'drizzle-orm';

async function createFamilyRelationshipsTable() {
  try {
    // Create the family_relationships table
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS family_relationships (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id VARCHAR NOT NULL REFERENCES users(id),
        related_user_id VARCHAR NOT NULL REFERENCES users(id),
        relationship_type VARCHAR(50) NOT NULL,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);

    console.log('✓ Created family_relationships table');

    // Create indexes
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS idx_family_relationships_user_id
      ON family_relationships(user_id)
    `);

    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS idx_family_relationships_related_user_id
      ON family_relationships(related_user_id)
    `);

    console.log('✓ Created indexes for family_relationships table');
    console.log('✅ Family relationships table setup completed successfully!');

    process.exit(0);
  } catch (error) {
    console.error('Error creating family relationships table:', error);
    process.exit(1);
  }
}

createFamilyRelationshipsTable();