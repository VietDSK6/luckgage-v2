CREATE TABLE "guides" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "slug" VARCHAR(100) NOT NULL,
    "title_vi" VARCHAR(160) NOT NULL,
    "title_en" VARCHAR(160) NOT NULL,
    "summary_vi" VARCHAR(500) NOT NULL,
    "summary_en" VARCHAR(500) NOT NULL,
    "cover_url" VARCHAR(500) NOT NULL,
    "cover_alt_vi" VARCHAR(200) NOT NULL,
    "cover_alt_en" VARCHAR(200) NOT NULL,
    "tags" TEXT[] NOT NULL,
    "sections_vi" JSONB NOT NULL,
    "sections_en" JSONB NOT NULL,
    "trip_suggestion_id" UUID,
    "status" "content_status" NOT NULL DEFAULT 'DRAFT',
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_by" UUID,
    "updated_by" UUID,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,
    "published_at" TIMESTAMPTZ(3),
    CONSTRAINT "guides_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "guides_slug_key" ON "guides"("slug");
CREATE INDEX "guides_status_sort_order_idx" ON "guides"("status", "sort_order");
ALTER TABLE "guides" ADD CONSTRAINT "guides_trip_suggestion_id_fkey" FOREIGN KEY ("trip_suggestion_id") REFERENCES "trip_suggestions"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "guides" ADD CONSTRAINT "guides_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "guides" ADD CONSTRAINT "guides_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "saved_guides" (
    "user_id" UUID NOT NULL,
    "guide_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "saved_guides_pkey" PRIMARY KEY ("user_id", "guide_id")
);
CREATE INDEX "saved_guides_guide_id_idx" ON "saved_guides"("guide_id");
ALTER TABLE "saved_guides" ADD CONSTRAINT "saved_guides_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "saved_guides" ADD CONSTRAINT "saved_guides_guide_id_fkey" FOREIGN KEY ("guide_id") REFERENCES "guides"("id") ON DELETE CASCADE ON UPDATE CASCADE;
