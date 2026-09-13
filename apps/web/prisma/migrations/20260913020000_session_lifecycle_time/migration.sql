ALTER TABLE "public"."sessions" ADD COLUMN "start_time" VARCHAR(5);
ALTER TABLE "public"."sessions" ADD COLUMN "completed_at" TIMESTAMPTZ(6);
ALTER TABLE "public"."sessions" ADD CONSTRAINT "sessions_start_time_check"
  CHECK ("start_time" IS NULL OR "start_time" ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$');

CREATE INDEX "sessions_current_schedule_idx" ON "public"."sessions" ("owner_id", "date", "start_time", "id") WHERE "completed_at" IS NULL;
CREATE INDEX "sessions_history_schedule_idx" ON "public"."sessions" ("owner_id", "date" DESC, "start_time" DESC, "id" DESC) WHERE "completed_at" IS NOT NULL;

-- The client API may edit session details, but only the authenticated server action may finish a session.
REVOKE UPDATE ON TABLE "public"."sessions" FROM authenticated;
GRANT UPDATE ("name", "date", "start_time", "location", "updated_at") ON TABLE "public"."sessions" TO authenticated;
REVOKE INSERT ON TABLE "public"."sessions" FROM authenticated;
GRANT INSERT ("owner_id", "name", "date", "start_time", "sport", "location", "updated_at") ON TABLE "public"."sessions" TO authenticated;

-- A completed roster and schedule cannot be changed through the direct Supabase API.
DROP POLICY "players_insert_own_session" ON "public"."players";
CREATE POLICY "players_insert_own_session" ON "public"."players" FOR INSERT TO authenticated
WITH CHECK (EXISTS (SELECT 1 FROM "public"."sessions" s WHERE s."id" = "players"."session_id" AND s."owner_id" = (SELECT auth.uid()) AND s."completed_at" IS NULL));
DROP POLICY "players_update_own_session" ON "public"."players";
CREATE POLICY "players_update_own_session" ON "public"."players" FOR UPDATE TO authenticated
USING (EXISTS (SELECT 1 FROM "public"."sessions" s WHERE s."id" = "players"."session_id" AND s."owner_id" = (SELECT auth.uid()) AND s."completed_at" IS NULL))
WITH CHECK (EXISTS (SELECT 1 FROM "public"."sessions" s WHERE s."id" = "players"."session_id" AND s."owner_id" = (SELECT auth.uid()) AND s."completed_at" IS NULL));
DROP POLICY "players_delete_own_session" ON "public"."players";
CREATE POLICY "players_delete_own_session" ON "public"."players" FOR DELETE TO authenticated
USING (EXISTS (SELECT 1 FROM "public"."sessions" s WHERE s."id" = "players"."session_id" AND s."owner_id" = (SELECT auth.uid()) AND s."completed_at" IS NULL));

DROP POLICY "rounds_insert_own_session" ON "public"."rounds";
CREATE POLICY "rounds_insert_own_session" ON "public"."rounds" FOR INSERT TO authenticated
WITH CHECK (EXISTS (SELECT 1 FROM "public"."sessions" s WHERE s."id" = "rounds"."session_id" AND s."owner_id" = (SELECT auth.uid()) AND s."completed_at" IS NULL));
DROP POLICY "rounds_update_own_session" ON "public"."rounds";
CREATE POLICY "rounds_update_own_session" ON "public"."rounds" FOR UPDATE TO authenticated
USING (EXISTS (SELECT 1 FROM "public"."sessions" s WHERE s."id" = "rounds"."session_id" AND s."owner_id" = (SELECT auth.uid()) AND s."completed_at" IS NULL))
WITH CHECK (EXISTS (SELECT 1 FROM "public"."sessions" s WHERE s."id" = "rounds"."session_id" AND s."owner_id" = (SELECT auth.uid()) AND s."completed_at" IS NULL));
DROP POLICY "rounds_delete_own_session" ON "public"."rounds";
CREATE POLICY "rounds_delete_own_session" ON "public"."rounds" FOR DELETE TO authenticated
USING (EXISTS (SELECT 1 FROM "public"."sessions" s WHERE s."id" = "rounds"."session_id" AND s."owner_id" = (SELECT auth.uid()) AND s."completed_at" IS NULL));

DROP POLICY "teams_insert_own_session" ON "public"."teams";
CREATE POLICY "teams_insert_own_session" ON "public"."teams" FOR INSERT TO authenticated
WITH CHECK (EXISTS (SELECT 1 FROM "public"."sessions" s WHERE s."id" = "teams"."session_id" AND s."owner_id" = (SELECT auth.uid()) AND s."completed_at" IS NULL));
DROP POLICY "teams_update_own_session" ON "public"."teams";
CREATE POLICY "teams_update_own_session" ON "public"."teams" FOR UPDATE TO authenticated
USING (EXISTS (SELECT 1 FROM "public"."sessions" s WHERE s."id" = "teams"."session_id" AND s."owner_id" = (SELECT auth.uid()) AND s."completed_at" IS NULL))
WITH CHECK (EXISTS (SELECT 1 FROM "public"."sessions" s WHERE s."id" = "teams"."session_id" AND s."owner_id" = (SELECT auth.uid()) AND s."completed_at" IS NULL));
DROP POLICY "teams_delete_own_session" ON "public"."teams";
CREATE POLICY "teams_delete_own_session" ON "public"."teams" FOR DELETE TO authenticated
USING (EXISTS (SELECT 1 FROM "public"."sessions" s WHERE s."id" = "teams"."session_id" AND s."owner_id" = (SELECT auth.uid()) AND s."completed_at" IS NULL));

DROP POLICY "matches_insert_own_session" ON "public"."matches";
CREATE POLICY "matches_insert_own_session" ON "public"."matches" FOR INSERT TO authenticated
WITH CHECK (EXISTS (SELECT 1 FROM "public"."sessions" s WHERE s."id" = "matches"."session_id" AND s."owner_id" = (SELECT auth.uid()) AND s."completed_at" IS NULL));
DROP POLICY "matches_delete_own_session" ON "public"."matches";
CREATE POLICY "matches_delete_own_session" ON "public"."matches" FOR DELETE TO authenticated
USING (EXISTS (SELECT 1 FROM "public"."sessions" s WHERE s."id" = "matches"."session_id" AND s."owner_id" = (SELECT auth.uid()) AND s."completed_at" IS NULL));
