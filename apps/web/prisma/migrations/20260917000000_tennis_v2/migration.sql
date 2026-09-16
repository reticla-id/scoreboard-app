ALTER TABLE "public"."sessions"
ADD COLUMN "match_format" VARCHAR(16) NOT NULL DEFAULT 'DOUBLES';

ALTER TABLE "public"."sessions"
ADD CONSTRAINT "sessions_match_format_check" CHECK (
  ("sport" = 'PADEL' AND "match_format" = 'DOUBLES') OR
  ("sport" = 'TENNIS' AND "match_format" IN ('SINGLES', 'DOUBLES'))
);

ALTER TABLE "public"."teams" DROP CONSTRAINT "teams_distinct_players_check";
ALTER TABLE "public"."teams" ALTER COLUMN "player_two_id" DROP NOT NULL;
ALTER TABLE "public"."teams"
ADD CONSTRAINT "teams_distinct_players_check" CHECK ("player_two_id" IS NULL OR "player_one_id" <> "player_two_id");

ALTER TABLE "public"."matches" ADD COLUMN "score_state" JSONB;

REVOKE UPDATE ON TABLE "public"."matches" FROM authenticated;
GRANT UPDATE ("status", "score_a", "score_b", "score_state", "updated_at") ON TABLE "public"."matches" TO authenticated;
