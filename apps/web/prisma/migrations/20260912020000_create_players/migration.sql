CREATE TABLE "public"."players" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "session_id" UUID NOT NULL,
    "name" VARCHAR(80) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    CONSTRAINT "players_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "players_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "public"."sessions"("id") ON DELETE CASCADE,
    CONSTRAINT "players_name_check" CHECK (length(btrim("name")) BETWEEN 1 AND 80)
);

CREATE INDEX "players_session_id_created_at_idx" ON "public"."players"("session_id", "created_at");
CREATE UNIQUE INDEX "players_session_name_unique" ON "public"."players"("session_id", lower("name"));

ALTER TABLE "public"."players" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE "public"."players" FROM anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE "public"."players" TO authenticated;

CREATE POLICY "players_select_own_session" ON "public"."players"
    FOR SELECT TO authenticated
    USING (EXISTS (SELECT 1 FROM "public"."sessions" WHERE "sessions"."id" = "players"."session_id" AND "sessions"."owner_id" = (SELECT auth.uid())));

CREATE POLICY "players_insert_own_session" ON "public"."players"
    FOR INSERT TO authenticated
    WITH CHECK (EXISTS (SELECT 1 FROM "public"."sessions" WHERE "sessions"."id" = "players"."session_id" AND "sessions"."owner_id" = (SELECT auth.uid())));

CREATE POLICY "players_update_own_session" ON "public"."players"
    FOR UPDATE TO authenticated
    USING (EXISTS (SELECT 1 FROM "public"."sessions" WHERE "sessions"."id" = "players"."session_id" AND "sessions"."owner_id" = (SELECT auth.uid())))
    WITH CHECK (EXISTS (SELECT 1 FROM "public"."sessions" WHERE "sessions"."id" = "players"."session_id" AND "sessions"."owner_id" = (SELECT auth.uid())));

CREATE POLICY "players_delete_own_session" ON "public"."players"
    FOR DELETE TO authenticated
    USING (EXISTS (SELECT 1 FROM "public"."sessions" WHERE "sessions"."id" = "players"."session_id" AND "sessions"."owner_id" = (SELECT auth.uid())));
