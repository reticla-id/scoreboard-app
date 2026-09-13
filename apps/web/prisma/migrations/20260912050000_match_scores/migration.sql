ALTER TABLE "public"."matches"
  ADD COLUMN "score_a" INTEGER,
  ADD COLUMN "score_b" INTEGER;

ALTER TABLE "public"."matches"
  ADD CONSTRAINT "matches_score_pair_check" CHECK (
    ("score_a" IS NULL AND "score_b" IS NULL)
    OR ("score_a" IS NOT NULL AND "score_b" IS NOT NULL
      AND "score_a" BETWEEN 0 AND 99 AND "score_b" BETWEEN 0 AND 99)
  ),
  ADD CONSTRAINT "matches_finished_score_check" CHECK (
    "status" <> 'FINISHED'
    OR "score_a" IS NULL
    OR "score_b" IS NULL
    OR "score_a" <> "score_b"
  );
