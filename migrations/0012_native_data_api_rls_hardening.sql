-- The MESC native app talks to PostgreSQL only through the server API.
-- Keep public tables closed to Supabase Data API roles; the PostgreSQL owner
-- used by the server remains unaffected because this migration does not FORCE RLS.

REVOKE ALL PRIVILEGES ON ALL TABLES IN SCHEMA public FROM anon, authenticated;
REVOKE ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public FROM anon, authenticated;

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  REVOKE ALL ON TABLES FROM anon, authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  REVOKE ALL ON SEQUENCES FROM anon, authenticated;

DO $$
DECLARE
  target_table text;
  target_tables constant text[] := ARRAY[
    'adoration_draw_results',
    'adoration_draws',
    'badges',
    'families',
    'family_relationships',
    'formation_certificates',
    'formation_lesson_progress',
    'formation_lesson_sections',
    'formation_lessons',
    'formation_materials',
    'formation_modules',
    'formation_progress',
    'formation_tracks',
    'leaderboard_cache',
    'learned_patterns',
    'level_definitions',
    'liturgical_celebrations',
    'liturgical_mass_overrides',
    'liturgical_seasons',
    'liturgical_years',
    'mass_configurations',
    'mass_execution_logs',
    'mass_times_config',
    'material_access_logs',
    'minister_check_ins',
    'password_reset_requests',
    'point_transactions',
    'push_subscriptions',
    'question_mass_mappings',
    'saints',
    'schedule_generations',
    'sessions',
    'special_events',
    'standby_ministers',
    'user_badges',
    'user_points'
  ];
BEGIN
  FOREACH target_table IN ARRAY target_tables LOOP
    IF to_regclass(format('public.%I', target_table)) IS NULL THEN
      RAISE EXCEPTION 'Required native RLS table public.% is missing', target_table;
    END IF;

    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', target_table);
  END LOOP;
END
$$;
