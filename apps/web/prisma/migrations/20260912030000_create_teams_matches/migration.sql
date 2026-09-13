ALTER TABLE "public"."players" ADD CONSTRAINT "players_session_id_id_key" UNIQUE ("session_id", "id");

CREATE TABLE "public"."teams" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "session_id" UUID NOT NULL,
    "player_one_id" UUID NOT NULL,
    "player_two_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "teams_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "teams_session_id_id_key" UNIQUE ("session_id", "id"),
    CONSTRAINT "teams_distinct_players_check" CHECK ("player_one_id" <> "player_two_id"),
    CONSTRAINT "teams_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "public"."sessions"("id") ON DELETE CASCADE,
    CONSTRAINT "teams_player_one_fkey" FOREIGN KEY ("session_id", "player_one_id") REFERENCES "public"."players"("session_id", "id") ON DELETE CASCADE,
    CONSTRAINT "teams_player_two_fkey" FOREIGN KEY ("session_id", "player_two_id") REFERENCES "public"."players"("session_id", "id") ON DELETE CASCADE
);

CREATE INDEX "teams_session_id_idx" ON "public"."teams"("session_id");

CREATE TABLE "public"."matches" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "session_id" UUID NOT NULL,
    "team_a_id" UUID NOT NULL,
    "team_b_id" UUID NOT NULL,
    "position" INTEGER NOT NULL,
    "status" VARCHAR(16) NOT NULL DEFAULT 'UPCOMING',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    CONSTRAINT "matches_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "matches_session_id_position_key" UNIQUE ("session_id", "position"),
    CONSTRAINT "matches_position_check" CHECK ("position" > 0),
    CONSTRAINT "matches_distinct_teams_check" CHECK ("team_a_id" <> "team_b_id"),
    CONSTRAINT "matches_status_check" CHECK ("status" IN ('UPCOMING', 'LIVE', 'FINISHED')),
    CONSTRAINT "matches_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "public"."sessions"("id") ON DELETE CASCADE,
    CONSTRAINT "matches_team_a_fkey" FOREIGN KEY ("session_id", "team_a_id") REFERENCES "public"."teams"("session_id", "id") ON DELETE CASCADE,
    CONSTRAINT "matches_team_b_fkey" FOREIGN KEY ("session_id", "team_b_id") REFERENCES "public"."teams"("session_id", "id") ON DELETE CASCADE
);

ALTER TABLE "public"."teams" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE "public"."teams" FROM anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE "public"."teams" TO authenticated;

CREATE POLICY "teams_select_own_session" ON "public"."teams" FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM "public"."sessions" WHERE "sessions"."id" = "teams"."session_id" AND "sessions"."owner_id" = (SELECT auth.uid())));
CREATE POLICY "teams_insert_own_session" ON "public"."teams" FOR INSERT TO authenticated
WITH CHECK (EXISTS (SELECT 1 FROM "public"."sessions" WHERE "sessions"."id" = "teams"."session_id" AND "sessions"."owner_id" = (SELECT auth.uid())));
CREATE POLICY "teams_update_own_session" ON "public"."teams" FOR UPDATE TO authenticated
USING (EXISTS (SELECT 1 FROM "public"."sessions" WHERE "sessions"."id" = "teams"."session_id" AND "sessions"."owner_id" = (SELECT auth.uid())))
WITH CHECK (EXISTS (SELECT 1 FROM "public"."sessions" WHERE "sessions"."id" = "teams"."session_id" AND "sessions"."owner_id" = (SELECT auth.uid())));
CREATE POLICY "teams_delete_own_session" ON "public"."teams" FOR DELETE TO authenticated
USING (EXISTS (SELECT 1 FROM "public"."sessions" WHERE "sessions"."id" = "teams"."session_id" AND "sessions"."owner_id" = (SELECT auth.uid())));

ALTER TABLE "public"."matches" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE "public"."matches" FROM anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE "public"."matches" TO authenticated;

CREATE POLICY "matches_select_own_session" ON "public"."matches" FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM "public"."sessions" WHERE "sessions"."id" = "matches"."session_id" AND "sessions"."owner_id" = (SELECT auth.uid())));
CREATE POLICY "matches_insert_own_session" ON "public"."matches" FOR INSERT TO authenticated
WITH CHECK (EXISTS (SELECT 1 FROM "public"."sessions" WHERE "sessions"."id" = "matches"."session_id" AND "sessions"."owner_id" = (SELECT auth.uid())));
CREATE POLICY "matches_update_own_session" ON "public"."matches" FOR UPDATE TO authenticated
USING (EXISTS (SELECT 1 FROM "public"."sessions" WHERE "sessions"."id" = "matches"."session_id" AND "sessions"."owner_id" = (SELECT auth.uid())))
WITH CHECK (EXISTS (SELECT 1 FROM "public"."sessions" WHERE "sessions"."id" = "matches"."session_id" AND "sessions"."owner_id" = (SELECT auth.uid())));
CREATE POLICY "matches_delete_own_session" ON "public"."matches" FOR DELETE TO authenticated
USING (EXISTS (SELECT 1 FROM "public"."sessions" WHERE "sessions"."id" = "matches"."session_id" AND "sessions"."owner_id" = (SELECT auth.uid())));
