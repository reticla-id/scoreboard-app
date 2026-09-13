-- Direct authenticated API access may correct score and match state, but cannot reshape a generated match.
REVOKE UPDATE ON TABLE "public"."matches" FROM authenticated;
GRANT UPDATE ("status", "score_a", "score_b", "updated_at") ON TABLE "public"."matches" TO authenticated;
