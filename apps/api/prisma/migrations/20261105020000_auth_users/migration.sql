CREATE TYPE "user_role" AS ENUM ('USER', 'ADMIN');
CREATE TYPE "user_status" AS ENUM ('ACTIVE', 'SUSPENDED');
CREATE TYPE "user_locale" AS ENUM ('vi', 'en');
CREATE TYPE "auth_session_kind" AS ENUM ('MOBILE_REFRESH', 'ADMIN_WEB');

CREATE TABLE "users" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "email" VARCHAR(254) NOT NULL,
  "password_hash" TEXT NOT NULL,
  "display_name" VARCHAR(80) NOT NULL,
  "role" "user_role" NOT NULL DEFAULT 'USER',
  "status" "user_status" NOT NULL DEFAULT 'ACTIVE',
  "locale" "user_locale" NOT NULL DEFAULT 'vi',
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(3) NOT NULL,
  "last_login_at" TIMESTAMPTZ(3),

  CONSTRAINT "users_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "users_email_normalized" CHECK ("email" = lower(btrim("email"))),
  CONSTRAINT "users_display_name_length" CHECK (char_length(btrim("display_name")) BETWEEN 1 AND 80)
);

CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

CREATE TABLE "auth_sessions" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "user_id" UUID NOT NULL,
  "kind" "auth_session_kind" NOT NULL,
  "refresh_token_hash" CHAR(64) NOT NULL,
  "family_id" UUID NOT NULL,
  "device_label" VARCHAR(120),
  "expires_at" TIMESTAMPTZ(3) NOT NULL,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "last_used_at" TIMESTAMPTZ(3),
  "revoked_at" TIMESTAMPTZ(3),
  "rotated_from_id" UUID,

  CONSTRAINT "auth_sessions_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "auth_sessions_expiry" CHECK ("expires_at" > "created_at")
);

CREATE UNIQUE INDEX "auth_sessions_refresh_token_hash_key"
  ON "auth_sessions"("refresh_token_hash");
CREATE UNIQUE INDEX "auth_sessions_rotated_from_id_key"
  ON "auth_sessions"("rotated_from_id");
CREATE INDEX "auth_sessions_user_id_idx" ON "auth_sessions"("user_id");
CREATE INDEX "auth_sessions_family_id_idx" ON "auth_sessions"("family_id");

ALTER TABLE "auth_sessions"
  ADD CONSTRAINT "auth_sessions_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "auth_sessions"
  ADD CONSTRAINT "auth_sessions_rotated_from_id_fkey"
  FOREIGN KEY ("rotated_from_id") REFERENCES "auth_sessions"("id") ON DELETE SET NULL ON UPDATE CASCADE;
