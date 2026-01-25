-- Gamification tables migration

-- Badge categories enum
DO $$ BEGIN
  CREATE TYPE badge_category AS ENUM ('participation', 'formation', 'community', 'streak', 'milestone', 'special');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Badge rarity enum
DO $$ BEGIN
  CREATE TYPE badge_rarity AS ENUM ('common', 'uncommon', 'rare', 'epic', 'legendary');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Point action types enum
DO $$ BEGIN
  CREATE TYPE point_action AS ENUM (
    'mass_served',
    'substitution_offered',
    'substitution_accepted',
    'material_completed',
    'quiz_passed',
    'streak_bonus',
    'community_help',
    'special_event',
    'badge_earned',
    'level_up',
    'login_bonus'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Badges table
CREATE TABLE IF NOT EXISTS badges (
  id VARCHAR DEFAULT gen_random_uuid() PRIMARY KEY,
  code VARCHAR(50) NOT NULL UNIQUE,
  name VARCHAR(100) NOT NULL,
  description TEXT NOT NULL,
  icon VARCHAR(50) NOT NULL,
  category badge_category NOT NULL DEFAULT 'participation',
  rarity badge_rarity NOT NULL DEFAULT 'common',
  points_reward INTEGER NOT NULL DEFAULT 0,
  requirement_type VARCHAR(50),
  requirement_value INTEGER,
  is_secret BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- User badges (junction table)
CREATE TABLE IF NOT EXISTS user_badges (
  id VARCHAR DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  badge_id VARCHAR NOT NULL REFERENCES badges(id) ON DELETE CASCADE,
  earned_at TIMESTAMP DEFAULT NOW() NOT NULL,
  is_featured BOOLEAN NOT NULL DEFAULT false,
  UNIQUE(user_id, badge_id)
);

-- User points tracking
CREATE TABLE IF NOT EXISTS user_points (
  id VARCHAR DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id VARCHAR NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  total_points INTEGER NOT NULL DEFAULT 0,
  level INTEGER NOT NULL DEFAULT 1,
  level_progress INTEGER NOT NULL DEFAULT 0,
  current_streak INTEGER NOT NULL DEFAULT 0,
  longest_streak INTEGER NOT NULL DEFAULT 0,
  last_activity_at TIMESTAMP,
  masses_served INTEGER NOT NULL DEFAULT 0,
  substitutions_helped INTEGER NOT NULL DEFAULT 0,
  materials_completed INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Point transactions history
CREATE TABLE IF NOT EXISTS point_transactions (
  id VARCHAR DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  action point_action NOT NULL,
  points INTEGER NOT NULL,
  description TEXT,
  reference_id VARCHAR,
  reference_type VARCHAR(50),
  created_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Leaderboard cache (for performance)
CREATE TABLE IF NOT EXISTS leaderboard_cache (
  id VARCHAR DEFAULT gen_random_uuid() PRIMARY KEY,
  period VARCHAR(20) NOT NULL,
  user_id VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  points INTEGER NOT NULL DEFAULT 0,
  rank INTEGER NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL,
  UNIQUE(period, user_id)
);

-- Level definitions (reference table)
CREATE TABLE IF NOT EXISTS level_definitions (
  id VARCHAR DEFAULT gen_random_uuid() PRIMARY KEY,
  level INTEGER NOT NULL UNIQUE,
  name VARCHAR(50) NOT NULL,
  min_points INTEGER NOT NULL,
  color VARCHAR(30) NOT NULL,
  perks TEXT
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_user_badges_user_id ON user_badges(user_id);
CREATE INDEX IF NOT EXISTS idx_user_badges_badge_id ON user_badges(badge_id);
CREATE INDEX IF NOT EXISTS idx_user_points_user_id ON user_points(user_id);
CREATE INDEX IF NOT EXISTS idx_user_points_total ON user_points(total_points DESC);
CREATE INDEX IF NOT EXISTS idx_point_transactions_user_id ON point_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_point_transactions_created_at ON point_transactions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_leaderboard_cache_period ON leaderboard_cache(period);
CREATE INDEX IF NOT EXISTS idx_leaderboard_cache_rank ON leaderboard_cache(rank);
