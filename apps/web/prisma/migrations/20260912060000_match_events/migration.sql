ALTER TABLE "public"."matches" ADD CONSTRAINT "matches_session_id_id_key" UNIQUE ("session_id", "id");

CREATE TABLE "public"."match_events" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "session_id" UUID NOT NULL,
  "match_id" UUID NOT NULL,
  "player_id" UUID NOT NULL,
  "type" VARCHAR(2) NOT NULL,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "match_events_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "match_events_type_check" CHECK ("type" IN ('W', 'FE', 'UE', 'DF')),
  CONSTRAINT "match_events_session_id_match_id_fkey" FOREIGN KEY ("session_id", "match_id") REFERENCES "public"."matches"("session_id", "id") ON DELETE CASCADE,
  CONSTRAINT "match_events_session_id_player_id_fkey" FOREIGN KEY ("session_id", "player_id") REFERENCES "public"."players"("session_id", "id") ON DELETE CASCADE
);

CREATE INDEX "match_events_match_id_player_id_type_idx" ON "public"."match_events"("match_id", "player_id", "type");

ALTER TABLE "public"."match_events" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE "public"."match_events" FROM anon, authenticated;
GRANT SELECT ON TABLE "public"."match_events" TO authenticated;
CREATE POLICY "match_events_select_own_session" ON "public"."match_events" FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM "public"."sessions" WHERE "sessions"."id" = "match_events"."session_id" AND "sessions"."owner_id" = (SELECT auth.uid())));
