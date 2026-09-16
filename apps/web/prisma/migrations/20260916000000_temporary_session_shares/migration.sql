CREATE TABLE "public"."session_shares" (
  "session_id" UUID NOT NULL,
  "token" VARCHAR(64) NOT NULL,
  "expires_at" TIMESTAMPTZ(6) NOT NULL,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "session_shares_pkey" PRIMARY KEY ("session_id"),
  CONSTRAINT "session_shares_token_key" UNIQUE ("token"),
  CONSTRAINT "session_shares_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "public"."sessions"("id") ON DELETE CASCADE,
  CONSTRAINT "session_shares_expiry_check" CHECK ("expires_at" > "created_at")
);

CREATE INDEX "session_shares_expires_at_idx" ON "public"."session_shares"("expires_at");

ALTER TABLE "public"."session_shares" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE "public"."session_shares" FROM anon, authenticated;

-- Public access is mediated by the server and a high-entropy bearer token.
-- Browser clients never receive direct table permissions.
