-- ==========================================================
-- MESC — Multi-Community Phase 1: Schema + Migration + Seed
-- Idempotente: pode rodar 2x sem efeito colateral
-- Executar em staging, validar, depois produção
-- ==========================================================

-- STEP 1: Criar tabela communities
-- ==========================================================
CREATE TABLE IF NOT EXISTS communities (
    id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
    parish_name varchar(255) NOT NULL DEFAULT 'Santuário São Judas Tadeu de Sorocaba',
    name        varchar(255) NOT NULL,
    slug        varchar(64)  NOT NULL UNIQUE,
    color_hex   varchar(7)   NOT NULL,
    is_matriz   boolean      NOT NULL DEFAULT false,
    active      boolean      NOT NULL DEFAULT true,
    created_at  timestamptz  NOT NULL DEFAULT now(),
    updated_at  timestamptz  NOT NULL DEFAULT now()
);

-- Seed 4 comunidades (ON CONFLICT para idempotência)
INSERT INTO communities (name, slug, color_hex, is_matriz) VALUES
    ('São Judas Tadeu',          'sao-judas',         '#1E40AF', true),
    ('São Marcos',               'sao-marcos',         '#059669', false),
    ('São José Maria Escrivá',   'sao-jose-escriva',  '#7C3AED', false),
    ('Padre Pio',                'padre-pio',          '#DC2626', false)
ON CONFLICT (slug) DO NOTHING;

-- STEP 2: Atualizar enum user_role
-- ==========================================================
-- 2a. Renomear coordenador → coordenador_comunidade (idempotente via DO block)
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_enum
        WHERE enumlabel = 'coordenador'
          AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'user_role')
    ) THEN
        ALTER TYPE user_role RENAME VALUE 'coordenador' TO 'coordenador_comunidade';
    END IF;
END$$;

-- 2b. Adicionar coordenador_paroquial (IF NOT EXISTS para idempotência)
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'coordenador_paroquial';

-- STEP 3: Adicionar colunas community_id (NULLABLE inicialmente)
-- ==========================================================
ALTER TABLE users
    ADD COLUMN IF NOT EXISTS home_community_id uuid
        REFERENCES communities(id) ON DELETE RESTRICT;

ALTER TABLE schedules
    ADD COLUMN IF NOT EXISTS community_id uuid
        REFERENCES communities(id) ON DELETE RESTRICT;

ALTER TABLE mass_configurations
    ADD COLUMN IF NOT EXISTS community_id uuid
        REFERENCES communities(id) ON DELETE RESTRICT;

ALTER TABLE mass_times_config
    ADD COLUMN IF NOT EXISTS community_id uuid
        REFERENCES communities(id) ON DELETE RESTRICT;

ALTER TABLE special_events
    ADD COLUMN IF NOT EXISTS community_id uuid
        REFERENCES communities(id) ON DELETE RESTRICT;

ALTER TABLE questionnaires
    ADD COLUMN IF NOT EXISTS community_id uuid
        REFERENCES communities(id) ON DELETE RESTRICT;

ALTER TABLE substitution_requests
    ADD COLUMN IF NOT EXISTS community_id uuid
        REFERENCES communities(id) ON DELETE RESTRICT;

ALTER TABLE questionnaire_responses
    ADD COLUMN IF NOT EXISTS community_id uuid
        REFERENCES communities(id) ON DELETE RESTRICT;

-- STEP 4: Backfill — São Judas como default para todos
-- ==========================================================
UPDATE users
    SET home_community_id = (SELECT id FROM communities WHERE slug = 'sao-judas')
    WHERE home_community_id IS NULL;

UPDATE schedules
    SET community_id = (SELECT id FROM communities WHERE slug = 'sao-judas')
    WHERE community_id IS NULL;

UPDATE mass_configurations
    SET community_id = (SELECT id FROM communities WHERE slug = 'sao-judas')
    WHERE community_id IS NULL;

UPDATE mass_times_config
    SET community_id = (SELECT id FROM communities WHERE slug = 'sao-judas')
    WHERE community_id IS NULL;

UPDATE special_events
    SET community_id = (SELECT id FROM communities WHERE slug = 'sao-judas')
    WHERE community_id IS NULL;

UPDATE questionnaires
    SET community_id = (SELECT id FROM communities WHERE slug = 'sao-judas')
    WHERE community_id IS NULL;

-- substitution_requests: herda community_id do schedule pai
UPDATE substitution_requests sr
    SET community_id = s.community_id
    FROM schedules s
    WHERE sr.schedule_id = s.id
      AND sr.community_id IS NULL;

-- questionnaire_responses: herda community_id do questionnaire pai
UPDATE questionnaire_responses qr
    SET community_id = q.community_id
    FROM questionnaires q
    WHERE qr.questionnaire_id = q.id
      AND qr.community_id IS NULL;

-- Exceções: São Marcos
UPDATE users
    SET home_community_id = (SELECT id FROM communities WHERE slug = 'sao-marcos')
    WHERE name ILIKE '%Natalie Paola%'
       OR name = 'Maria da Penha Leonardo Antunes';

-- STEP 5: SET NOT NULL (após backfill completo, zero NULLs esperados)
-- ==========================================================
ALTER TABLE users            ALTER COLUMN home_community_id SET NOT NULL;
ALTER TABLE schedules        ALTER COLUMN community_id      SET NOT NULL;
ALTER TABLE mass_configurations ALTER COLUMN community_id  SET NOT NULL;
ALTER TABLE mass_times_config   ALTER COLUMN community_id  SET NOT NULL;
ALTER TABLE special_events      ALTER COLUMN community_id  SET NOT NULL;
ALTER TABLE questionnaires      ALTER COLUMN community_id  SET NOT NULL;
ALTER TABLE substitution_requests ALTER COLUMN community_id SET NOT NULL;
ALTER TABLE questionnaire_responses ALTER COLUMN community_id SET NOT NULL;

-- STEP 6: Promoções de role
-- ==========================================================
-- Marco, Priscila, Ana Lisboa → coordenador_paroquial
UPDATE users
    SET role = 'coordenador_paroquial'
    WHERE name IN ('Marco Rossit', 'Priscila Machado')
       OR name ILIKE '%Lisboa%';

-- Natalie Paola: ministro → coordenador_comunidade (São Marcos)
UPDATE users
    SET role = 'coordenador_comunidade'
    WHERE name ILIKE '%Natalie Paola%';

-- STEP 7: Índices
-- ==========================================================
CREATE INDEX IF NOT EXISTS idx_users_home_community        ON users(home_community_id);
CREATE INDEX IF NOT EXISTS idx_schedules_community_date    ON schedules(community_id, date);
CREATE INDEX IF NOT EXISTS idx_mass_config_community       ON mass_configurations(community_id);
CREATE INDEX IF NOT EXISTS idx_mass_times_community        ON mass_times_config(community_id);
CREATE INDEX IF NOT EXISTS idx_special_events_community    ON special_events(community_id);
CREATE INDEX IF NOT EXISTS idx_questionnaires_community    ON questionnaires(community_id);
CREATE INDEX IF NOT EXISTS idx_subst_requests_community    ON substitution_requests(community_id);
CREATE INDEX IF NOT EXISTS idx_quest_responses_community   ON questionnaire_responses(community_id);

-- STEP 8: Validação — estes SELECTs devem ser verificados após execução
-- ==========================================================
SELECT COUNT(*) AS communities_count             FROM communities;
SELECT COUNT(*) AS users_null_community          FROM users WHERE home_community_id IS NULL;
SELECT COUNT(*) AS coordenador_paroquial_count   FROM users WHERE role = 'coordenador_paroquial';
SELECT COUNT(*) AS sao_marcos_users              FROM users WHERE home_community_id = (SELECT id FROM communities WHERE slug = 'sao-marcos');
SELECT COUNT(*) AS schedules_null_community      FROM schedules WHERE community_id IS NULL;
SELECT COUNT(*) AS subst_null_community          FROM substitution_requests WHERE community_id IS NULL;
SELECT COUNT(*) AS quest_resp_null_community     FROM questionnaire_responses WHERE community_id IS NULL;
