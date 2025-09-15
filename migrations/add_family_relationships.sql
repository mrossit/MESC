-- Create family_relationships table
CREATE TABLE IF NOT EXISTS family_relationships (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id VARCHAR NOT NULL REFERENCES users(id),
    related_user_id VARCHAR NOT NULL REFERENCES users(id),
    relationship_type VARCHAR(50) NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_family_relationships_user_id ON family_relationships(user_id);
CREATE INDEX IF NOT EXISTS idx_family_relationships_related_user_id ON family_relationships(related_user_id);