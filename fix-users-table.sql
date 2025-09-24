-- Add missing columns to users table to match Drizzle schema expectations

-- Add missing columns that Drizzle schema expects
ALTER TABLE users ADD COLUMN first_name TEXT;
ALTER TABLE users ADD COLUMN last_name TEXT;
ALTER TABLE users ADD COLUMN profile_image_url TEXT;
ALTER TABLE users ADD COLUMN photo_url TEXT;
ALTER TABLE users ADD COLUMN last_login TIMESTAMP;
ALTER TABLE users ADD COLUMN phone TEXT;
ALTER TABLE users ADD COLUMN whatsapp TEXT;
ALTER TABLE users ADD COLUMN join_date DATE;
ALTER TABLE users ADD COLUMN image_data TEXT;
ALTER TABLE users ADD COLUMN image_content_type TEXT;
ALTER TABLE users ADD COLUMN family_id TEXT;
ALTER TABLE users ADD COLUMN birth_date DATE;
ALTER TABLE users ADD COLUMN address TEXT;
ALTER TABLE users ADD COLUMN city TEXT;
ALTER TABLE users ADD COLUMN zip_code TEXT;
ALTER TABLE users ADD COLUMN marital_status TEXT;
ALTER TABLE users ADD COLUMN baptism_date DATE;
ALTER TABLE users ADD COLUMN baptism_parish TEXT;
ALTER TABLE users ADD COLUMN confirmation_date DATE;
ALTER TABLE users ADD COLUMN confirmation_parish TEXT;
ALTER TABLE users ADD COLUMN marriage_date DATE;
ALTER TABLE users ADD COLUMN marriage_parish TEXT;
ALTER TABLE users ADD COLUMN preferred_position INTEGER;
ALTER TABLE users ADD COLUMN preferred_times TEXT; -- JSON as text
ALTER TABLE users ADD COLUMN available_for_special_events INTEGER DEFAULT 1;
ALTER TABLE users ADD COLUMN can_serve_as_couple INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN spouse_minister_id TEXT;
ALTER TABLE users ADD COLUMN extra_activities TEXT; -- JSON as text
ALTER TABLE users ADD COLUMN ministry_start_date DATE;
ALTER TABLE users ADD COLUMN experience TEXT;
ALTER TABLE users ADD COLUMN special_skills TEXT;
ALTER TABLE users ADD COLUMN liturgical_training INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN last_service TIMESTAMP;
ALTER TABLE users ADD COLUMN total_services INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN formation_completed INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN observations TEXT;
ALTER TABLE users ADD COLUMN minister_type TEXT;
ALTER TABLE users ADD COLUMN approved_at TIMESTAMP;
ALTER TABLE users ADD COLUMN approved_by_id TEXT;
ALTER TABLE users ADD COLUMN rejection_reason TEXT;

-- Update existing users with basic data to avoid null issues
UPDATE users SET 
    first_name = CASE 
        WHEN name LIKE '% %' THEN substr(name, 1, instr(name, ' ') - 1)
        ELSE name
    END,
    last_name = CASE 
        WHEN name LIKE '% %' THEN substr(name, instr(name, ' ') + 1)
        ELSE ''
    END
WHERE first_name IS NULL OR last_name IS NULL;