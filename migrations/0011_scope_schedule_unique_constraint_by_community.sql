-- Scope schedule slot uniqueness by community for the native multi-community scheduler.
-- Older schemas made date/time/position globally unique, which blocks two
-- communities from having Mass at the same time.

ALTER TABLE schedules
  DROP CONSTRAINT IF EXISTS uq_schedules_date_time_position;

DROP INDEX IF EXISTS uq_schedules_date_time_position;

CREATE UNIQUE INDEX IF NOT EXISTS uq_schedules_community_date_time_position
  ON schedules(community_id, date, time, position);
