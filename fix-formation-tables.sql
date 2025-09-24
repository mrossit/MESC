-- Fix formation tables schema to match Drizzle expectations

-- Rename columns in formation_tracks to match Drizzle camelCase
ALTER TABLE formation_tracks RENAME COLUMN order_index TO orderIndex;
ALTER TABLE formation_tracks RENAME COLUMN is_required TO isRequired;
ALTER TABLE formation_tracks RENAME COLUMN estimated_duration TO estimatedDuration;
ALTER TABLE formation_tracks RENAME COLUMN created_at TO createdAt;
ALTER TABLE formation_tracks RENAME COLUMN updated_at TO updatedAt;

-- Add missing columns that Drizzle schema expects
ALTER TABLE formation_tracks ADD COLUMN icon TEXT;
ALTER TABLE formation_tracks ADD COLUMN isActive INTEGER DEFAULT 1;

-- Rename columns in formation_modules to match Drizzle camelCase  
ALTER TABLE formation_modules RENAME COLUMN track_id TO trackId;
ALTER TABLE formation_modules RENAME COLUMN order_index TO orderIndex;
ALTER TABLE formation_modules RENAME COLUMN estimated_duration TO estimatedDuration;
ALTER TABLE formation_modules RENAME COLUMN created_at TO createdAt;
ALTER TABLE formation_modules RENAME COLUMN updated_at TO updatedAt;

-- Add missing columns in formation_modules
ALTER TABLE formation_modules ADD COLUMN content TEXT;
ALTER TABLE formation_modules ADD COLUMN videoUrl TEXT;
ALTER TABLE formation_modules ADD COLUMN durationMinutes INTEGER;

-- Fix formation_lessons table if it exists
-- (We'll need to check structure first)

-- Display updated structure for verification
SELECT 'formation_tracks structure:' as info;
PRAGMA table_info(formation_tracks);

SELECT 'formation_modules structure:' as info; 
PRAGMA table_info(formation_modules);