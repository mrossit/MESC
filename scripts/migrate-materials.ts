/**
 * Migration script to add materials library tables
 */

import { db } from '../server/db';
import { sql } from 'drizzle-orm';

async function migrate() {
  console.log('Starting migration for materials library...');

  try {
    // Create material_type enum if not exists
    console.log('Creating material_type enum...');
    await db.execute(sql`
      DO $$ BEGIN
        CREATE TYPE material_type AS ENUM('pdf', 'document', 'video', 'audio', 'image', 'presentation', 'other');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);
    console.log('Enum created or already exists');

    // Create formation_materials table
    console.log('Creating formation_materials table...');
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS formation_materials (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        title VARCHAR(255) NOT NULL,
        description TEXT,
        type material_type DEFAULT 'pdf' NOT NULL,
        category formation_category,
        track_id VARCHAR REFERENCES formation_tracks(id) ON DELETE SET NULL,
        file_name VARCHAR(255) NOT NULL,
        file_size INTEGER NOT NULL,
        mime_type VARCHAR(100) NOT NULL,
        file_data TEXT,
        external_url VARCHAR(512),
        thumbnail_data TEXT,
        tags JSONB DEFAULT '[]',
        uploaded_by VARCHAR NOT NULL REFERENCES users(id) ON DELETE SET NULL,
        download_count INTEGER DEFAULT 0,
        is_published BOOLEAN DEFAULT true,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);
    console.log('formation_materials table created');

    // Create material_access_logs table
    console.log('Creating material_access_logs table...');
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS material_access_logs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        material_id UUID NOT NULL REFERENCES formation_materials(id) ON DELETE CASCADE,
        user_id VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        action VARCHAR(20) NOT NULL,
        accessed_at TIMESTAMP DEFAULT NOW()
      );
    `);
    console.log('material_access_logs table created');

    // Create indexes
    console.log('Creating indexes...');
    await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_materials_category ON formation_materials(category);`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_materials_track ON formation_materials(track_id);`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_materials_type ON formation_materials(type);`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_materials_uploaded_by ON formation_materials(uploaded_by);`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_material_access_material ON material_access_logs(material_id);`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_material_access_user ON material_access_logs(user_id);`);
    console.log('Indexes created');

    console.log('Migration completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

migrate();
