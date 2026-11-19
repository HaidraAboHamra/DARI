-- Product analytics events, RANGE-partitioned by month.
CREATE TABLE IF NOT EXISTS "analytics_events" (
  "id" uuid NOT NULL,
  "name" text NOT NULL,
  "city_id" uuid,
  "user_id" uuid,
  "anonymous_id" text,
  "entity_type" text,
  "entity_id" uuid,
  "search_id" uuid,
  "props" jsonb,
  "occurred_at" timestamptz NOT NULL,
  "received_at" timestamptz NOT NULL,
  PRIMARY KEY ("occurred_at", "id")
) PARTITION BY RANGE ("occurred_at");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "analytics_events_default" PARTITION OF "analytics_events" DEFAULT;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "analytics_events_name_idx" ON "analytics_events" ("city_id", "name", "occurred_at");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "analytics_events_entity_idx" ON "analytics_events" ("entity_type", "entity_id", "occurred_at");
--> statement-breakpoint
-- Idempotent helper called by the worker's maintenance job to pre-create partitions.
CREATE OR REPLACE FUNCTION ensure_analytics_partition(month_start date) RETURNS void AS $$
DECLARE
  start_at date := date_trunc('month', month_start)::date;
  end_at date := (date_trunc('month', month_start) + interval '1 month')::date;
  part_name text := format('analytics_events_%s', to_char(start_at, 'YYYY_MM'));
BEGIN
  IF to_regclass(part_name) IS NULL THEN
    EXECUTE format(
      'CREATE TABLE %I PARTITION OF analytics_events FOR VALUES FROM (%L) TO (%L)',
      part_name, start_at, end_at
    );
  END IF;
END;
$$ LANGUAGE plpgsql;
--> statement-breakpoint
SELECT ensure_analytics_partition(now()::date);
--> statement-breakpoint
SELECT ensure_analytics_partition((now() + interval '1 month')::date);
