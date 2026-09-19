CREATE TABLE "public"."device_sessions" (
  "session_id" UUID NOT NULL,
  "user_id" UUID NOT NULL,
  "device_name" VARCHAR(80) NOT NULL,
  "browser" VARCHAR(32) NOT NULL,
  "os" VARCHAR(32) NOT NULL,
  "device_type" VARCHAR(16) NOT NULL,
  "last_seen_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "revoked_at" TIMESTAMPTZ(6),
  CONSTRAINT "device_sessions_pkey" PRIMARY KEY ("session_id"),
  CONSTRAINT "device_sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE,
  CONSTRAINT "device_sessions_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "auth"."sessions"("id") ON DELETE CASCADE,
  CONSTRAINT "device_sessions_device_type_check" CHECK ("device_type" IN ('Phone', 'Tablet', 'Desktop'))
);

CREATE INDEX "device_sessions_user_id_revoked_at_last_seen_at_idx"
  ON "public"."device_sessions" ("user_id", "revoked_at", "last_seen_at" DESC);

ALTER TABLE "public"."device_sessions" ENABLE ROW LEVEL SECURITY;
-- The device registry is only read and changed by authorized server-side Prisma calls.
