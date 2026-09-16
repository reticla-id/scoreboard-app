ALTER TABLE "public"."sessions" DROP CONSTRAINT "sessions_sport_check";
ALTER TABLE "public"."sessions"
ADD CONSTRAINT "sessions_sport_check" CHECK ("sport" IN ('PADEL', 'TENNIS'));
