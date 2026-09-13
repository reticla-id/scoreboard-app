CREATE TABLE "public"."profiles" (
    "id" UUID NOT NULL,
    "display_name" VARCHAR(80) NOT NULL,
    "username" VARCHAR(30) NOT NULL,
    "avatar_url" VARCHAR(500),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    CONSTRAINT "profiles_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "profiles_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE CASCADE
);

CREATE UNIQUE INDEX "profiles_username_key" ON "public"."profiles"("username");

ALTER TABLE "public"."profiles" ENABLE ROW LEVEL SECURITY;
-- Profiles are accessed only through server-side Prisma after an Auth check.
-- No direct anon/authenticated API policies are granted.
