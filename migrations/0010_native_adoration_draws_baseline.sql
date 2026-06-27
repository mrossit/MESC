CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS adoration_draws (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  month integer NOT NULL,
  year integer NOT NULL,
  total_ministers_to_draw integer NOT NULL,
  created_by varchar NOT NULL REFERENCES users(id),
  created_at timestamp DEFAULT now(),
  updated_at timestamp DEFAULT now()
);

CREATE TABLE IF NOT EXISTS adoration_draw_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  draw_id uuid NOT NULL REFERENCES adoration_draws(id) ON DELETE CASCADE,
  minister_id varchar NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  monday_of_week integer NOT NULL,
  is_voluntary boolean DEFAULT false,
  created_at timestamp DEFAULT now(),
  CONSTRAINT unique_adoration_draw_minister_week UNIQUE (draw_id, minister_id, monday_of_week)
);

CREATE INDEX IF NOT EXISTS idx_adoration_draws_month_year
  ON adoration_draws(year, month);

CREATE INDEX IF NOT EXISTS idx_adoration_draw_results_draw
  ON adoration_draw_results(draw_id);

CREATE INDEX IF NOT EXISTS idx_adoration_draw_results_minister
  ON adoration_draw_results(minister_id);

ALTER TABLE adoration_draws ENABLE ROW LEVEL SECURITY;
ALTER TABLE adoration_draw_results ENABLE ROW LEVEL SECURITY;
