ALTER TABLE "public"."sessions"
  ADD COLUMN "partner_mode" VARCHAR(16) NOT NULL DEFAULT 'RANDOM',
  ADD COLUMN "fixed_pairs" JSONB NOT NULL DEFAULT '[]'::jsonb;

ALTER TABLE "public"."sessions"
  ADD CONSTRAINT "sessions_partner_mode_check" CHECK ("partner_mode" IN ('RANDOM', 'FIXED')),
  ADD CONSTRAINT "sessions_fixed_pairs_array_check" CHECK (jsonb_typeof("fixed_pairs") = 'array');

-- The authenticated client API has column-limited UPDATE permission on
-- sessions, so mode and pairs can only change through authorized server actions.

-- Direct API roster changes also respect the fixed-pair snapshot boundary.
DROP POLICY "players_insert_own_session" ON "public"."players";
CREATE POLICY "players_insert_own_session" ON "public"."players" FOR INSERT TO authenticated
WITH CHECK (EXISTS (SELECT 1 FROM "public"."sessions" s WHERE s."id" = "players"."session_id" AND s."owner_id" = (SELECT auth.uid()) AND s."completed_at" IS NULL AND NOT (s."partner_mode" = 'FIXED' AND EXISTS (SELECT 1 FROM "public"."rounds" r WHERE r."session_id" = s."id"))));
DROP POLICY "players_update_own_session" ON "public"."players";
CREATE POLICY "players_update_own_session" ON "public"."players" FOR UPDATE TO authenticated
USING (EXISTS (SELECT 1 FROM "public"."sessions" s WHERE s."id" = "players"."session_id" AND s."owner_id" = (SELECT auth.uid()) AND s."completed_at" IS NULL AND NOT (s."partner_mode" = 'FIXED' AND EXISTS (SELECT 1 FROM "public"."rounds" r WHERE r."session_id" = s."id"))))
WITH CHECK (EXISTS (SELECT 1 FROM "public"."sessions" s WHERE s."id" = "players"."session_id" AND s."owner_id" = (SELECT auth.uid()) AND s."completed_at" IS NULL AND NOT (s."partner_mode" = 'FIXED' AND EXISTS (SELECT 1 FROM "public"."rounds" r WHERE r."session_id" = s."id"))));
DROP POLICY "players_delete_own_session" ON "public"."players";
CREATE POLICY "players_delete_own_session" ON "public"."players" FOR DELETE TO authenticated
USING (EXISTS (SELECT 1 FROM "public"."sessions" s WHERE s."id" = "players"."session_id" AND s."owner_id" = (SELECT auth.uid()) AND s."completed_at" IS NULL AND NOT (s."partner_mode" = 'FIXED' AND EXISTS (SELECT 1 FROM "public"."rounds" r WHERE r."session_id" = s."id"))));

-- Generated structure must come from the server's mode-aware generator.
REVOKE INSERT, UPDATE, DELETE ON TABLE "public"."rounds" FROM authenticated;
REVOKE INSERT, UPDATE, DELETE ON TABLE "public"."teams" FROM authenticated;
REVOKE INSERT, DELETE ON TABLE "public"."matches" FROM authenticated;
