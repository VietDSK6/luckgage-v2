CREATE TYPE "trip_type" AS ENUM (
  'LEISURE',
  'BUSINESS',
  'CAMPING',
  'BEACH',
  'HIKING',
  'CITY_TRIP',
  'ROAD_TRIP',
  'INTERNATIONAL',
  'OTHER'
);
CREATE TYPE "trip_member_role" AS ENUM ('OWNER', 'MEMBER');

CREATE TABLE "trips" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "name" VARCHAR(120) NOT NULL,
  "destination_label" VARCHAR(160) NOT NULL,
  "start_date" DATE NOT NULL,
  "end_date" DATE NOT NULL,
  "trip_type" "trip_type" NOT NULL,
  "note" VARCHAR(1000),
  "provider_place_id" VARCHAR(160),
  "latitude" DECIMAL(9,6),
  "longitude" DECIMAL(9,6),
  "destination_timezone" VARCHAR(64),
  "country_code" CHAR(2),
  "admin_area" VARCHAR(100),
  "country" VARCHAR(100),
  "version" INTEGER NOT NULL DEFAULT 1,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(3) NOT NULL,

  CONSTRAINT "trips_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "trips_date_order" CHECK ("end_date" >= "start_date"),
  CONSTRAINT "trips_version_positive" CHECK ("version" >= 1),
  CONSTRAINT "trips_coordinates_pair" CHECK (("latitude" IS NULL) = ("longitude" IS NULL)),
  CONSTRAINT "trips_latitude_range" CHECK ("latitude" IS NULL OR "latitude" BETWEEN -90 AND 90),
  CONSTRAINT "trips_longitude_range" CHECK ("longitude" IS NULL OR "longitude" BETWEEN -180 AND 180),
  CONSTRAINT "trips_country_code_format" CHECK ("country_code" IS NULL OR "country_code" ~ '^[A-Z]{2}$')
);

CREATE INDEX "trips_start_date_end_date_idx" ON "trips"("start_date", "end_date");

CREATE TABLE "trip_members" (
  "trip_id" UUID NOT NULL,
  "user_id" UUID NOT NULL,
  "role" "trip_member_role" NOT NULL,
  "joined_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "removed_at" TIMESTAMPTZ(3),

  CONSTRAINT "trip_members_pkey" PRIMARY KEY ("trip_id", "user_id")
);

CREATE INDEX "trip_members_user_id_removed_at_idx" ON "trip_members"("user_id", "removed_at");
CREATE UNIQUE INDEX "trip_members_one_active_owner"
  ON "trip_members"("trip_id")
  WHERE "role" = 'OWNER' AND "removed_at" IS NULL;

CREATE TABLE "trip_invites" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "trip_id" UUID NOT NULL,
  "code_hash" CHAR(64) NOT NULL,
  "code_hint" CHAR(2) NOT NULL,
  "created_by_user_id" UUID NOT NULL,
  "expires_at" TIMESTAMPTZ(3) NOT NULL,
  "max_uses" INTEGER NOT NULL,
  "use_count" INTEGER NOT NULL DEFAULT 0,
  "revoked_at" TIMESTAMPTZ(3),
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "trip_invites_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "trip_invites_expiry" CHECK ("expires_at" > "created_at"),
  CONSTRAINT "trip_invites_max_uses" CHECK ("max_uses" BETWEEN 1 AND 50),
  CONSTRAINT "trip_invites_use_count" CHECK ("use_count" BETWEEN 0 AND "max_uses")
);

CREATE UNIQUE INDEX "trip_invites_code_hash_key" ON "trip_invites"("code_hash");
CREATE INDEX "trip_invites_trip_id_created_at_idx" ON "trip_invites"("trip_id", "created_at");

CREATE TABLE "checklist_categories" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "trip_id" UUID NOT NULL,
  "name" VARCHAR(80) NOT NULL,
  "position" INTEGER NOT NULL DEFAULT 0,
  "version" INTEGER NOT NULL DEFAULT 1,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(3) NOT NULL,

  CONSTRAINT "checklist_categories_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "checklist_categories_name_length" CHECK (char_length(btrim("name")) BETWEEN 1 AND 80),
  CONSTRAINT "checklist_categories_position" CHECK ("position" >= 0),
  CONSTRAINT "checklist_categories_version" CHECK ("version" >= 1)
);

CREATE INDEX "checklist_categories_trip_id_position_idx"
  ON "checklist_categories"("trip_id", "position");

CREATE TABLE "checklist_items" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "category_id" UUID NOT NULL,
  "name" VARCHAR(120) NOT NULL,
  "quantity" INTEGER NOT NULL DEFAULT 1,
  "is_packed" BOOLEAN NOT NULL DEFAULT false,
  "note" VARCHAR(500),
  "position" INTEGER NOT NULL DEFAULT 0,
  "version" INTEGER NOT NULL DEFAULT 1,
  "created_by_user_id" UUID,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(3) NOT NULL,

  CONSTRAINT "checklist_items_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "checklist_items_name_length" CHECK (char_length(btrim("name")) BETWEEN 1 AND 120),
  CONSTRAINT "checklist_items_quantity" CHECK ("quantity" BETWEEN 1 AND 99),
  CONSTRAINT "checklist_items_position" CHECK ("position" >= 0),
  CONSTRAINT "checklist_items_version" CHECK ("version" >= 1)
);

CREATE INDEX "checklist_items_category_id_position_idx"
  ON "checklist_items"("category_id", "position");

ALTER TABLE "trip_members"
  ADD CONSTRAINT "trip_members_trip_id_fkey"
  FOREIGN KEY ("trip_id") REFERENCES "trips"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "trip_members"
  ADD CONSTRAINT "trip_members_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "trip_invites"
  ADD CONSTRAINT "trip_invites_trip_id_fkey"
  FOREIGN KEY ("trip_id") REFERENCES "trips"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "trip_invites"
  ADD CONSTRAINT "trip_invites_created_by_user_id_fkey"
  FOREIGN KEY ("created_by_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "checklist_categories"
  ADD CONSTRAINT "checklist_categories_trip_id_fkey"
  FOREIGN KEY ("trip_id") REFERENCES "trips"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "checklist_items"
  ADD CONSTRAINT "checklist_items_category_id_fkey"
  FOREIGN KEY ("category_id") REFERENCES "checklist_categories"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "checklist_items"
  ADD CONSTRAINT "checklist_items_created_by_user_id_fkey"
  FOREIGN KEY ("created_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
