-- ==========================================================
-- MESC — Rollback Multi-Community Phase 1
-- ATENÇÃO: Executa irreversibilidade no enum rename — rollback manual
-- Enum: coordenador_comunidade → coordenador (se necessário, rodar antes do resto)
-- ==========================================================

-- STEP 1: Remover NOT NULL constraints para permitir rollback
ALTER TABLE users               ALTER COLUMN home_community_id DROP NOT NULL;
ALTER TABLE schedules           ALTER COLUMN community_id      DROP NOT NULL;
ALTER TABLE mass_configurations ALTER COLUMN community_id      DROP NOT NULL;
ALTER TABLE mass_times_config   ALTER COLUMN community_id      DROP NOT NULL;
ALTER TABLE special_events      ALTER COLUMN community_id      DROP NOT NULL;
ALTER TABLE questionnaires      ALTER COLUMN community_id      DROP NOT NULL;
ALTER TABLE substitution_requests ALTER COLUMN community_id   DROP NOT NULL;
ALTER TABLE questionnaire_responses ALTER COLUMN community_id DROP NOT NULL;

-- STEP 2: Remover índices
DROP INDEX IF EXISTS idx_users_home_community;
DROP INDEX IF EXISTS idx_schedules_community_date;
DROP INDEX IF EXISTS idx_mass_config_community;
DROP INDEX IF EXISTS idx_mass_times_community;
DROP INDEX IF EXISTS idx_special_events_community;
DROP INDEX IF EXISTS idx_questionnaires_community;
DROP INDEX IF EXISTS idx_subst_requests_community;
DROP INDEX IF EXISTS idx_quest_responses_community;

-- STEP 3: Remover colunas community_id
ALTER TABLE users               DROP COLUMN IF EXISTS home_community_id;
ALTER TABLE schedules           DROP COLUMN IF EXISTS community_id;
ALTER TABLE mass_configurations DROP COLUMN IF EXISTS community_id;
ALTER TABLE mass_times_config   DROP COLUMN IF EXISTS community_id;
ALTER TABLE special_events      DROP COLUMN IF EXISTS community_id;
ALTER TABLE questionnaires      DROP COLUMN IF EXISTS community_id;
ALTER TABLE substitution_requests DROP COLUMN IF EXISTS community_id;
ALTER TABLE questionnaire_responses DROP COLUMN IF EXISTS community_id;

-- STEP 4: Reverter roles para coordenador (atenção: enum rename é irreversível sem outro RENAME)
-- Se o enum foi renomeado, este UPDATE usa o novo nome
UPDATE users SET role = 'coordenador_comunidade'
    WHERE name IN ('Marco Rossit', 'Priscila Machado')
       OR name ILIKE '%Lisboa%';

UPDATE users SET role = 'ministro'
    WHERE name ILIKE '%Natalie Paola%';

-- STEP 5: Dropar tabela communities (somente se colunas FK já removidas)
DROP TABLE IF EXISTS communities;

-- NOTA: Para reverter o enum rename (coordenador_comunidade → coordenador),
-- executar manualmente: ALTER TYPE user_role RENAME VALUE 'coordenador_comunidade' TO 'coordenador';
-- coordenador_paroquial: ALTER TYPE user_role ... não tem DROP VALUE — criação de novo tipo necessária
