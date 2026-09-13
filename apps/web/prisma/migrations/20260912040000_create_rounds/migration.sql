ALTER TABLE "public"."players" ADD COLUMN "removed_at" TIMESTAMPTZ(6);
DROP INDEX "public"."players_session_name_unique";
CREATE UNIQUE INDEX "players_active_session_name_unique" ON "public"."players"("session_id", lower("name")) WHERE "removed_at" IS NULL;

CREATE TABLE "public"."rounds" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "session_id" UUID NOT NULL,
    "number" INTEGER NOT NULL,
    "waiting_player_ids" UUID[] NOT NULL DEFAULT ARRAY[]::UUID[],
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "rounds_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "rounds_session_id_number_key" UNIQUE ("session_id", "number"),
    CONSTRAINT "rounds_session_id_id_key" UNIQUE ("session_id", "id"),
    CONSTRAINT "rounds_number_check" CHECK ("number" > 0),
    CONSTRAINT "rounds_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "public"."sessions"("id") ON DELETE CASCADE
);

ALTER TABLE "public"."matches" ADD COLUMN "round_id" UUID;
INSERT INTO "public"."rounds" ("session_id", "number")
SELECT DISTINCT "session_id", 1 FROM "public"."matches";
UPDATE "public"."matches" AS m SET "round_id" = r."id"
FROM "public"."rounds" AS r WHERE m."session_id" = r."session_id" AND r."number" = 1;

UPDATE "public"."rounds" AS r SET "waiting_player_ids" = ARRAY(
    SELECT p."id" FROM "public"."players" AS p
    WHERE p."session_id" = r."session_id" AND NOT EXISTS (
        SELECT 1 FROM "public"."matches" AS m
        JOIN "public"."teams" AS a ON a."id" = m."team_a_id"
        JOIN "public"."teams" AS b ON b."id" = m."team_b_id"
        WHERE m."round_id" = r."id" AND p."id" IN (a."player_one_id", a."player_two_id", b."player_one_id", b."player_two_id")
    )
);

ALTER TABLE "public"."matches" ALTER COLUMN "round_id" SET NOT NULL;
ALTER TABLE "public"."matches" DROP CONSTRAINT "matches_session_id_position_key";
ALTER TABLE "public"."matches" ADD CONSTRAINT "matches_round_id_position_key" UNIQUE ("round_id", "position");
ALTER TABLE "public"."matches" ADD CONSTRAINT "matches_session_id_round_id_fkey"
    FOREIGN KEY ("session_id", "round_id") REFERENCES "public"."rounds"("session_id", "id") ON DELETE CASCADE;

ALTER TABLE "public"."rounds" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE "public"."rounds" FROM anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE "public"."rounds" TO authenticated;
CREATE POLICY "rounds_select_own_session" ON "public"."rounds" FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM "public"."sessions" WHERE "sessions"."id" = "rounds"."session_id" AND "sessions"."owner_id" = (SELECT auth.uid())));
CREATE POLICY "rounds_insert_own_session" ON "public"."rounds" FOR INSERT TO authenticated
WITH CHECK (EXISTS (SELECT 1 FROM "public"."sessions" WHERE "sessions"."id" = "rounds"."session_id" AND "sessions"."owner_id" = (SELECT auth.uid())));
CREATE POLICY "rounds_update_own_session" ON "public"."rounds" FOR UPDATE TO authenticated
USING (EXISTS (SELECT 1 FROM "public"."sessions" WHERE "sessions"."id" = "rounds"."session_id" AND "sessions"."owner_id" = (SELECT auth.uid())))
WITH CHECK (EXISTS (SELECT 1 FROM "public"."sessions" WHERE "sessions"."id" = "rounds"."session_id" AND "sessions"."owner_id" = (SELECT auth.uid())));
CREATE POLICY "rounds_delete_own_session" ON "public"."rounds" FOR DELETE TO authenticated
USING (EXISTS (SELECT 1 FROM "public"."sessions" WHERE "sessions"."id" = "rounds"."session_id" AND "sessions"."owner_id" = (SELECT auth.uid())));
