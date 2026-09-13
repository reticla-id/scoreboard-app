CREATE TABLE "public"."sessions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "owner_id" UUID NOT NULL,
    "name" VARCHAR(120) NOT NULL,
    "date" DATE NOT NULL,
    "sport" VARCHAR(16) NOT NULL DEFAULT 'PADEL',
    "location" VARCHAR(120),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "sessions_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE,
    CONSTRAINT "sessions_sport_check" CHECK ("sport" = 'PADEL'),
    CONSTRAINT "sessions_name_check" CHECK (length(btrim("name")) BETWEEN 1 AND 120)
);

CREATE INDEX "sessions_owner_id_date_idx" ON "public"."sessions"("owner_id", "date");

ALTER TABLE "public"."sessions" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE "public"."sessions" FROM anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE "public"."sessions" TO authenticated;

CREATE POLICY "sessions_select_own" ON "public"."sessions"
    FOR SELECT TO authenticated
    USING ((SELECT auth.uid()) = "owner_id");

CREATE POLICY "sessions_insert_own" ON "public"."sessions"
    FOR INSERT TO authenticated
    WITH CHECK ((SELECT auth.uid()) = "owner_id");

CREATE POLICY "sessions_update_own" ON "public"."sessions"
    FOR UPDATE TO authenticated
    USING ((SELECT auth.uid()) = "owner_id")
    WITH CHECK ((SELECT auth.uid()) = "owner_id");

CREATE POLICY "sessions_delete_own" ON "public"."sessions"
    FOR DELETE TO authenticated
    USING ((SELECT auth.uid()) = "owner_id");
