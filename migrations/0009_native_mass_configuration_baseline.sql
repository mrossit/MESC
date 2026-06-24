CREATE EXTENSION IF NOT EXISTS pgcrypto;

DO $$
BEGIN
  CREATE TYPE recurrence_type AS ENUM ('weekly', 'monthly', 'yearly', 'one_time');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END$$;

DO $$
BEGIN
  CREATE TYPE mass_type AS ENUM (
    'missa_diaria',
    'missa_dominical',
    'missa_cura_libertacao',
    'missa_sagrado_coracao',
    'missa_imaculado_coracao',
    'missa_sao_judas',
    'adoracao',
    'novena',
    'festa_padroeiro',
    'finados',
    'evento_especial'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END$$;

DO $$
BEGIN
  CREATE TYPE learned_pattern_type AS ENUM (
    'minister_removal',
    'minister_addition',
    'position_preference',
    'time_preference',
    'mass_type_preference'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END$$;

ALTER TYPE recurrence_type ADD VALUE IF NOT EXISTS 'weekly';
ALTER TYPE recurrence_type ADD VALUE IF NOT EXISTS 'monthly';
ALTER TYPE recurrence_type ADD VALUE IF NOT EXISTS 'yearly';
ALTER TYPE recurrence_type ADD VALUE IF NOT EXISTS 'one_time';

ALTER TYPE mass_type ADD VALUE IF NOT EXISTS 'missa_diaria';
ALTER TYPE mass_type ADD VALUE IF NOT EXISTS 'missa_dominical';
ALTER TYPE mass_type ADD VALUE IF NOT EXISTS 'missa_cura_libertacao';
ALTER TYPE mass_type ADD VALUE IF NOT EXISTS 'missa_sagrado_coracao';
ALTER TYPE mass_type ADD VALUE IF NOT EXISTS 'missa_imaculado_coracao';
ALTER TYPE mass_type ADD VALUE IF NOT EXISTS 'missa_sao_judas';
ALTER TYPE mass_type ADD VALUE IF NOT EXISTS 'adoracao';
ALTER TYPE mass_type ADD VALUE IF NOT EXISTS 'novena';
ALTER TYPE mass_type ADD VALUE IF NOT EXISTS 'festa_padroeiro';
ALTER TYPE mass_type ADD VALUE IF NOT EXISTS 'finados';
ALTER TYPE mass_type ADD VALUE IF NOT EXISTS 'evento_especial';

CREATE TABLE IF NOT EXISTS mass_times_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  community_id uuid REFERENCES communities(id) ON DELETE RESTRICT,
  day_of_week integer NOT NULL,
  time time NOT NULL,
  min_ministers integer NOT NULL DEFAULT 3,
  max_ministers integer NOT NULL DEFAULT 6,
  is_active boolean DEFAULT true,
  special_event boolean DEFAULT false,
  event_name varchar(255),
  created_at timestamp DEFAULT now(),
  updated_at timestamp DEFAULT now()
);

ALTER TABLE mass_times_config
  ADD COLUMN IF NOT EXISTS community_id uuid REFERENCES communities(id) ON DELETE RESTRICT;

WITH default_community AS (
  SELECT id
  FROM communities
  WHERE active = true
  ORDER BY is_matriz DESC, created_at ASC
  LIMIT 1
)
UPDATE mass_times_config
SET community_id = (SELECT id FROM default_community)
WHERE community_id IS NULL
  AND EXISTS (SELECT 1 FROM default_community);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM mass_times_config WHERE community_id IS NULL) THEN
    ALTER TABLE mass_times_config ALTER COLUMN community_id SET NOT NULL;
  END IF;
END$$;

CREATE TABLE IF NOT EXISTS mass_configurations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  community_id uuid NOT NULL REFERENCES communities(id) ON DELETE RESTRICT,
  name varchar(255) NOT NULL,
  description text,
  recurrence_type recurrence_type NOT NULL,
  day_of_week integer,
  day_of_month integer,
  month integer,
  occurrence_in_month integer,
  time time NOT NULL,
  duration_minutes integer DEFAULT 60,
  min_ministers integer NOT NULL DEFAULT 3,
  max_ministers integer NOT NULL DEFAULT 6,
  mass_type mass_type NOT NULL,
  location varchar(255),
  excluded_dates jsonb DEFAULT '[]'::jsonb,
  valid_from date,
  valid_until date,
  priority integer DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamp DEFAULT now(),
  updated_at timestamp DEFAULT now()
);

CREATE TABLE IF NOT EXISTS special_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  community_id uuid NOT NULL REFERENCES communities(id) ON DELETE RESTRICT,
  name varchar(255) NOT NULL,
  description text,
  event_date date NOT NULL,
  event_time time NOT NULL,
  duration_minutes integer DEFAULT 60,
  min_ministers integer NOT NULL DEFAULT 3,
  max_ministers integer NOT NULL DEFAULT 6,
  mass_type mass_type NOT NULL,
  location varchar(255),
  priority integer DEFAULT 100,
  suppresses_mass_types jsonb DEFAULT '[]'::jsonb,
  is_active boolean DEFAULT true,
  created_by varchar REFERENCES users(id) ON DELETE SET NULL,
  created_at timestamp DEFAULT now(),
  updated_at timestamp DEFAULT now()
);

CREATE TABLE IF NOT EXISTS question_mass_mappings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  questionnaire_id uuid NOT NULL REFERENCES questionnaires(id) ON DELETE CASCADE,
  question_id varchar(100) NOT NULL,
  mass_configuration_id uuid REFERENCES mass_configurations(id) ON DELETE SET NULL,
  special_event_id uuid REFERENCES special_events(id) ON DELETE SET NULL,
  target_date date,
  target_time time,
  min_ministers integer,
  max_ministers integer,
  notes text,
  created_at timestamp DEFAULT now(),
  updated_at timestamp DEFAULT now(),
  CONSTRAINT unique_question_mapping UNIQUE (questionnaire_id, question_id)
);

CREATE TABLE IF NOT EXISTS learned_patterns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pattern_type learned_pattern_type NOT NULL,
  minister_id varchar REFERENCES users(id) ON DELETE CASCADE,
  mass_type mass_type,
  day_of_week integer,
  time_slot time,
  occurrence_count integer DEFAULT 1,
  confidence integer DEFAULT 50,
  weight_adjustment integer DEFAULT 0,
  last_occurrence timestamp DEFAULT now(),
  notes text,
  is_active boolean DEFAULT true,
  created_at timestamp DEFAULT now(),
  updated_at timestamp DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_mass_times_community ON mass_times_config(community_id);
CREATE INDEX IF NOT EXISTS idx_mass_config_community ON mass_configurations(community_id);
CREATE INDEX IF NOT EXISTS idx_mass_configurations_type ON mass_configurations(mass_type);
CREATE INDEX IF NOT EXISTS idx_mass_configurations_recurrence ON mass_configurations(recurrence_type);
CREATE INDEX IF NOT EXISTS idx_mass_configurations_active ON mass_configurations(is_active);
CREATE INDEX IF NOT EXISTS idx_mass_configurations_day_of_week ON mass_configurations(day_of_week);
CREATE INDEX IF NOT EXISTS idx_special_events_community ON special_events(community_id);
CREATE INDEX IF NOT EXISTS idx_special_events_date ON special_events(event_date);
CREATE INDEX IF NOT EXISTS idx_special_events_type ON special_events(mass_type);
CREATE INDEX IF NOT EXISTS idx_special_events_active ON special_events(is_active);
CREATE INDEX IF NOT EXISTS idx_question_mass_mappings_questionnaire ON question_mass_mappings(questionnaire_id);
CREATE INDEX IF NOT EXISTS idx_question_mass_mappings_config ON question_mass_mappings(mass_configuration_id);
CREATE INDEX IF NOT EXISTS idx_question_mass_mappings_event ON question_mass_mappings(special_event_id);
CREATE INDEX IF NOT EXISTS idx_learned_patterns_minister ON learned_patterns(minister_id);
CREATE INDEX IF NOT EXISTS idx_learned_patterns_type ON learned_patterns(pattern_type);
CREATE INDEX IF NOT EXISTS idx_learned_patterns_mass_type ON learned_patterns(mass_type);
CREATE INDEX IF NOT EXISTS idx_learned_patterns_active ON learned_patterns(is_active);
CREATE INDEX IF NOT EXISTS idx_learned_patterns_lookup ON learned_patterns(minister_id, mass_type, day_of_week, time_slot);
