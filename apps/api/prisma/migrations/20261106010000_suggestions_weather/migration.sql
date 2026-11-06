CREATE TYPE "content_status" AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED');
CREATE TYPE "quantity_mode" AS ENUM ('FIXED', 'PER_DAY');

CREATE TABLE "weather_cache" (
  "trip_id" UUID NOT NULL,
  "start_date" DATE NOT NULL,
  "end_date" DATE NOT NULL,
  "latitude" DECIMAL(9,6) NOT NULL,
  "longitude" DECIMAL(9,6) NOT NULL,
  "payload_json" JSONB NOT NULL,
  "cache_version" INTEGER NOT NULL DEFAULT 1,
  "fetched_at" TIMESTAMPTZ(3) NOT NULL,
  "expires_at" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "weather_cache_pkey" PRIMARY KEY ("trip_id"),
  CONSTRAINT "weather_cache_date_order" CHECK ("end_date" >= "start_date"),
  CONSTRAINT "weather_cache_expiry" CHECK ("expires_at" > "fetched_at")
);
CREATE INDEX "weather_cache_expires_at_idx" ON "weather_cache"("expires_at");

CREATE TABLE "packing_rules" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "key" VARCHAR(80) NOT NULL,
  "name" VARCHAR(120) NOT NULL,
  "status" "content_status" NOT NULL DEFAULT 'DRAFT',
  "version" INTEGER NOT NULL DEFAULT 1,
  "priority" INTEGER NOT NULL DEFAULT 100,
  "trip_type" "trip_type",
  "min_days" INTEGER,
  "max_days" INTEGER,
  "min_temp_c" DECIMAL(5,2),
  "max_temp_c" DECIMAL(5,2),
  "min_rain_percent" INTEGER,
  "activity_key" VARCHAR(60),
  "reason_vi" VARCHAR(240) NOT NULL,
  "reason_en" VARCHAR(240) NOT NULL,
  "created_by" UUID,
  "updated_by" UUID,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(3) NOT NULL,
  "published_at" TIMESTAMPTZ(3),
  CONSTRAINT "packing_rules_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "packing_rules_version" CHECK ("version" >= 1),
  CONSTRAINT "packing_rules_priority" CHECK ("priority" BETWEEN 0 AND 10000),
  CONSTRAINT "packing_rules_day_range" CHECK (
    ("min_days" IS NULL OR "min_days" >= 1) AND
    ("max_days" IS NULL OR "max_days" >= 1) AND
    ("min_days" IS NULL OR "max_days" IS NULL OR "max_days" >= "min_days")
  ),
  CONSTRAINT "packing_rules_temperature_range" CHECK (
    "min_temp_c" IS NULL OR "max_temp_c" IS NULL OR "max_temp_c" >= "min_temp_c"
  ),
  CONSTRAINT "packing_rules_rain_range" CHECK (
    "min_rain_percent" IS NULL OR "min_rain_percent" BETWEEN 0 AND 100
  )
);
CREATE UNIQUE INDEX "packing_rules_key_version_key" ON "packing_rules"("key", "version");
CREATE INDEX "packing_rules_status_priority_idx" ON "packing_rules"("status", "priority");
CREATE UNIQUE INDEX "packing_rules_one_published_key"
  ON "packing_rules"("key") WHERE "status" = 'PUBLISHED';

CREATE TABLE "packing_rule_items" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "rule_id" UUID NOT NULL,
  "category_key" VARCHAR(80) NOT NULL,
  "category_name_vi" VARCHAR(80) NOT NULL,
  "category_name_en" VARCHAR(80) NOT NULL,
  "item_key" VARCHAR(100) NOT NULL,
  "item_name_vi" VARCHAR(120) NOT NULL,
  "item_name_en" VARCHAR(120) NOT NULL,
  "quantity_mode" "quantity_mode" NOT NULL DEFAULT 'FIXED',
  "base_quantity" INTEGER NOT NULL DEFAULT 1,
  "note_vi" VARCHAR(500),
  "note_en" VARCHAR(500),
  "position" INTEGER NOT NULL DEFAULT 0,
  CONSTRAINT "packing_rule_items_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "packing_rule_items_quantity" CHECK ("base_quantity" BETWEEN 1 AND 99),
  CONSTRAINT "packing_rule_items_position" CHECK ("position" >= 0)
);
CREATE UNIQUE INDEX "packing_rule_items_rule_id_category_key_item_key_key"
  ON "packing_rule_items"("rule_id", "category_key", "item_key");
CREATE INDEX "packing_rule_items_rule_id_position_idx"
  ON "packing_rule_items"("rule_id", "position");

CREATE TABLE "trip_suggestions" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "slug" VARCHAR(100) NOT NULL,
  "title_vi" VARCHAR(160) NOT NULL,
  "title_en" VARCHAR(160) NOT NULL,
  "summary_vi" VARCHAR(500) NOT NULL,
  "summary_en" VARCHAR(500) NOT NULL,
  "destination_label" VARCHAR(160) NOT NULL,
  "provider_place_id" VARCHAR(160),
  "latitude" DECIMAL(9,6),
  "longitude" DECIMAL(9,6),
  "destination_timezone" VARCHAR(64),
  "country_code" CHAR(2),
  "admin_area" VARCHAR(100),
  "country" VARCHAR(100),
  "image_url" VARCHAR(500) NOT NULL,
  "image_alt_vi" VARCHAR(200) NOT NULL,
  "image_alt_en" VARCHAR(200) NOT NULL,
  "tags" TEXT[] NOT NULL,
  "trip_type" "trip_type",
  "suggested_duration_days" INTEGER NOT NULL DEFAULT 3,
  "status" "content_status" NOT NULL DEFAULT 'DRAFT',
  "sort_order" INTEGER NOT NULL DEFAULT 0,
  "created_by" UUID,
  "updated_by" UUID,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(3) NOT NULL,
  "published_at" TIMESTAMPTZ(3),
  CONSTRAINT "trip_suggestions_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "trip_suggestions_coordinates_pair" CHECK (("latitude" IS NULL) = ("longitude" IS NULL)),
  CONSTRAINT "trip_suggestions_duration" CHECK ("suggested_duration_days" BETWEEN 1 AND 30),
  CONSTRAINT "trip_suggestions_country_code" CHECK ("country_code" IS NULL OR "country_code" ~ '^[A-Z]{2}$'),
  CONSTRAINT "trip_suggestions_image_url" CHECK ("image_url" ~ '^https?://')
);
CREATE UNIQUE INDEX "trip_suggestions_slug_key" ON "trip_suggestions"("slug");
CREATE INDEX "trip_suggestions_status_sort_order_idx"
  ON "trip_suggestions"("status", "sort_order");
CREATE INDEX "trip_suggestions_tags_idx" ON "trip_suggestions" USING GIN ("tags");

ALTER TABLE "weather_cache" ADD CONSTRAINT "weather_cache_trip_id_fkey"
  FOREIGN KEY ("trip_id") REFERENCES "trips"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "packing_rules" ADD CONSTRAINT "packing_rules_created_by_fkey"
  FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "packing_rules" ADD CONSTRAINT "packing_rules_updated_by_fkey"
  FOREIGN KEY ("updated_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "packing_rule_items" ADD CONSTRAINT "packing_rule_items_rule_id_fkey"
  FOREIGN KEY ("rule_id") REFERENCES "packing_rules"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "trip_suggestions" ADD CONSTRAINT "trip_suggestions_created_by_fkey"
  FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "trip_suggestions" ADD CONSTRAINT "trip_suggestions_updated_by_fkey"
  FOREIGN KEY ("updated_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
