-- Existing rows already have PADEL from the former default. New inserts must
-- explicitly supply a supported sport; the existing PADEL-only check remains.
ALTER TABLE "public"."sessions" ALTER COLUMN "sport" DROP DEFAULT;
ALTER TABLE "public"."sessions" ALTER COLUMN "sport" SET NOT NULL;
