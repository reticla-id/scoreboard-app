ALTER TABLE "public"."device_sessions" DROP CONSTRAINT "device_sessions_device_type_check";
ALTER TABLE "public"."device_sessions" ADD CONSTRAINT "device_sessions_device_type_check"
  CHECK ("device_type" IN ('Phone', 'Tablet', 'Desktop', 'Unknown'));

-- Preserve active pre-existing Supabase sessions. Their device details are
-- unknown until the device next visits; no IP or full user agent is inferred.
INSERT INTO "public"."device_sessions"
  ("session_id", "user_id", "device_name", "browser", "os", "device_type", "last_seen_at", "created_at")
SELECT s."id", s."user_id", 'Existing device', 'Browser', 'Unknown OS', 'Unknown',
  COALESCE(s."created_at", now()), COALESCE(s."created_at", now())
FROM "auth"."sessions" s
WHERE s."not_after" IS NULL OR s."not_after" > now()
ON CONFLICT ("session_id") DO NOTHING;
