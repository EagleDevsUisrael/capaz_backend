-- ============================================================================
-- Capaz: esquema COMPLETO de la base de datos (PostgreSQL / Supabase)
-- ARCHIVO GENERADO (npm run db:sql). No lo edites a mano: cambia prisma/schema.prisma o
-- src/domain/catalog.ts y crea una migración con `npm run db:migration -- <nombre>`.
--
-- Es SOLO DE REFERENCIA: muestra el estado completo de la base. Para crear o actualizar la base,
-- aplica las migraciones de database/migrations/ en orden (npm run db:migrate o el SQL Editor),
-- así schema_migrations siempre dice cuáles están aplicadas. Ver HANDOFF.md.
-- Una prueba comprueba que las migraciones en orden dan exactamente este estado.
-- ============================================================================

BEGIN;

-- CreateEnum
CREATE TYPE "disability_type" AS ENUM ('physical', 'visual', 'hearing', 'intellectual', 'psychosocial');

-- CreateEnum
CREATE TYPE "contact_preference" AS ENUM ('call', 'whatsapp', 'email');

-- CreateEnum
CREATE TYPE "education_level" AS ENUM ('primary', 'highSchool', 'technical', 'university');

-- CreateEnum
CREATE TYPE "job_modality" AS ENUM ('onSite', 'remote', 'hybrid');

-- CreateEnum
CREATE TYPE "job_schedule" AS ENUM ('fullTime', 'partTime', 'internship');

-- CreateEnum
CREATE TYPE "application_status" AS ENUM ('sent', 'inReview', 'interview', 'hired', 'notSelected', 'withdrawn');

-- CreateEnum
CREATE TYPE "interview_mode" AS ENUM ('inPerson', 'videoCall', 'phoneCall');

-- CreateEnum
CREATE TYPE "id_card_scan_status" AS ENUM ('pending', 'confirmed');

-- CreateEnum
CREATE TYPE "code_channel" AS ENUM ('whatsapp', 'sms');

-- CreateEnum
CREATE TYPE "consent_purpose" AS ENUM ('useProfile', 'shareOnlyAccommodations', 'discoverable', 'keepIdCardImages');

-- CreateTable
CREATE TABLE "candidates" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "id_number" VARCHAR(10) NOT NULL,
    "full_name" TEXT NOT NULL,
    "birth_date" DATE,
    "disability_type" "disability_type" NOT NULL,
    "disability_percent" SMALLINT NOT NULL,
    "id_card_valid_until" DATE,
    "id_card_valid_indefinitely" BOOLEAN NOT NULL DEFAULT false,
    "preferred_name" TEXT,
    "phone" VARCHAR(10) NOT NULL,
    "phone_verified_at" TIMESTAMPTZ(6) NOT NULL,
    "email" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "contact_preference" "contact_preference" NOT NULL DEFAULT 'whatsapp',
    "has_worked" BOOLEAN,
    "experience_text" TEXT NOT NULL DEFAULT '',
    "cv_file_name" TEXT,
    "education" "education_level",
    "skills" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "accommodations_needed" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "other_accommodation" TEXT NOT NULL DEFAULT '',
    "share_only_accommodations" BOOLEAN NOT NULL DEFAULT true,
    "discoverable" BOOLEAN NOT NULL DEFAULT false,
    "consent_at" TIMESTAMPTZ(6) NOT NULL,
    "is_test" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "candidates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "consent_records" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "candidate_id" UUID NOT NULL,
    "purpose" "consent_purpose" NOT NULL,
    "granted" BOOLEAN NOT NULL,
    "policy_version" TEXT NOT NULL,
    "ip_address" TEXT,
    "user_agent" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "consent_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "id_card_scans" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "candidate_id" UUID,
    "status" "id_card_scan_status" NOT NULL DEFAULT 'pending',
    "front_image" BYTEA,
    "front_mime" TEXT,
    "back_image" BYTEA,
    "back_mime" TEXT,
    "extracted" JSONB NOT NULL,
    "confidence" JSONB NOT NULL,
    "ocr_provider" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMPTZ(6) NOT NULL,
    "confirmed_at" TIMESTAMPTZ(6),

    CONSTRAINT "id_card_scans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "id_card_handoffs" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "token_hash" TEXT NOT NULL,
    "front_image" BYTEA,
    "front_mime" TEXT,
    "back_image" BYTEA,
    "back_mime" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMPTZ(6) NOT NULL,
    "consumed_at" TIMESTAMPTZ(6),

    CONSTRAINT "id_card_handoffs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "phone_verifications" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "phone" VARCHAR(10) NOT NULL,
    "code_hash" TEXT NOT NULL,
    "channel" "code_channel" NOT NULL,
    "attempts" SMALLINT NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMPTZ(6) NOT NULL,
    "verified_at" TIMESTAMPTZ(6),
    "consumed_at" TIMESTAMPTZ(6),

    CONSTRAINT "phone_verifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "login_codes" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "candidate_id" UUID NOT NULL,
    "code_hash" TEXT NOT NULL,
    "channel" "code_channel" NOT NULL,
    "attempts" SMALLINT NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMPTZ(6) NOT NULL,
    "consumed_at" TIMESTAMPTZ(6),

    CONSTRAINT "login_codes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sessions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "candidate_id" UUID NOT NULL,
    "token_hash" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMPTZ(6) NOT NULL,
    "revoked_at" TIMESTAMPTZ(6),

    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cv_files" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "candidate_id" UUID,
    "file_name" TEXT NOT NULL,
    "mime" TEXT NOT NULL,
    "size_bytes" INTEGER NOT NULL,
    "data" BYTEA NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMPTZ(6),

    CONSTRAINT "cv_files_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "jobs" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "title" TEXT NOT NULL,
    "company" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "modality" "job_modality" NOT NULL,
    "schedule" "job_schedule" NOT NULL,
    "salary_min" INTEGER,
    "salary_max" INTEGER,
    "province" TEXT,
    "daily_hours" SMALLINT,
    "summary" TEXT NOT NULL DEFAULT '',
    "description" TEXT NOT NULL DEFAULT '',
    "requirements" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "accommodations_detail" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "salary_benefits" TEXT NOT NULL DEFAULT '',
    "easy_read" JSONB,
    "compatible_disabilities" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "physical_demands" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "accommodations_offered" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "keywords" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "min_education" "education_level",
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "is_demo" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "jobs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "applications" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "candidate_id" UUID NOT NULL,
    "job_id" UUID NOT NULL,
    "status" "application_status" NOT NULL DEFAULT 'sent',
    "match_score" SMALLINT NOT NULL,
    "interview_at" TIMESTAMPTZ(6),
    "interview_mode" "interview_mode",
    "interview_place" TEXT,
    "interview_confirmed_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "applications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "application_events" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "application_id" UUID NOT NULL,
    "status" "application_status" NOT NULL,
    "note" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "application_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "candidates_id_number_key" ON "candidates"("id_number");

-- CreateIndex
CREATE INDEX "candidates_disability_type_idx" ON "candidates"("disability_type");

-- CreateIndex
CREATE INDEX "consent_records_candidate_id_purpose_created_at_idx" ON "consent_records"("candidate_id", "purpose", "created_at");

-- CreateIndex
CREATE INDEX "id_card_scans_status_expires_at_idx" ON "id_card_scans"("status", "expires_at");

-- CreateIndex
CREATE UNIQUE INDEX "id_card_handoffs_token_hash_key" ON "id_card_handoffs"("token_hash");

-- CreateIndex
CREATE INDEX "id_card_handoffs_expires_at_idx" ON "id_card_handoffs"("expires_at");

-- CreateIndex
CREATE INDEX "phone_verifications_phone_created_at_idx" ON "phone_verifications"("phone", "created_at");

-- CreateIndex
CREATE INDEX "login_codes_candidate_id_created_at_idx" ON "login_codes"("candidate_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "sessions_token_hash_key" ON "sessions"("token_hash");

-- CreateIndex
CREATE INDEX "sessions_candidate_id_idx" ON "sessions"("candidate_id");

-- CreateIndex
CREATE UNIQUE INDEX "cv_files_candidate_id_key" ON "cv_files"("candidate_id");

-- CreateIndex
CREATE INDEX "cv_files_expires_at_idx" ON "cv_files"("expires_at");

-- CreateIndex
CREATE INDEX "jobs_is_active_created_at_idx" ON "jobs"("is_active", "created_at");

-- CreateIndex
CREATE INDEX "applications_job_id_idx" ON "applications"("job_id");

-- CreateIndex
CREATE UNIQUE INDEX "applications_candidate_id_job_id_key" ON "applications"("candidate_id", "job_id");

-- CreateIndex
CREATE INDEX "application_events_application_id_created_at_idx" ON "application_events"("application_id", "created_at");

-- AddForeignKey
ALTER TABLE "consent_records" ADD CONSTRAINT "consent_records_candidate_id_fkey" FOREIGN KEY ("candidate_id") REFERENCES "candidates"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "id_card_scans" ADD CONSTRAINT "id_card_scans_candidate_id_fkey" FOREIGN KEY ("candidate_id") REFERENCES "candidates"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "login_codes" ADD CONSTRAINT "login_codes_candidate_id_fkey" FOREIGN KEY ("candidate_id") REFERENCES "candidates"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_candidate_id_fkey" FOREIGN KEY ("candidate_id") REFERENCES "candidates"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cv_files" ADD CONSTRAINT "cv_files_candidate_id_fkey" FOREIGN KEY ("candidate_id") REFERENCES "candidates"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "applications" ADD CONSTRAINT "applications_candidate_id_fkey" FOREIGN KEY ("candidate_id") REFERENCES "candidates"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "applications" ADD CONSTRAINT "applications_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "jobs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "application_events" ADD CONSTRAINT "application_events_application_id_fkey" FOREIGN KEY ("application_id") REFERENCES "applications"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Registro de migraciones aplicadas (lo usan las migraciones y npm run db:migrate)
CREATE TABLE "schema_migrations" (
    "version" VARCHAR(4) NOT NULL,
    "name" TEXT NOT NULL,
    "applied_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),

    CONSTRAINT "schema_migrations_pkey" PRIMARY KEY ("version")
);

-- ─── Reglas de negocio ──────────────────────────────────────────────────────

-- Las listas solo aceptan códigos del catálogo (src/domain/catalog.ts)
ALTER TABLE "candidates" ADD CONSTRAINT "candidates_skills_valid" CHECK ("skills" <@ ARRAY['customerService', 'computing', 'excel', 'sales', 'cooking', 'crafts', 'english']::text[]);
ALTER TABLE "candidates" ADD CONSTRAINT "candidates_accommodations_needed_valid" CHECK ("accommodations_needed" <@ ARRAY['seated', 'ramp', 'flexibleSchedule', 'adaptedKeyboard', 'screenReader', 'signLanguage']::text[]);
ALTER TABLE "jobs" ADD CONSTRAINT "jobs_compatible_disabilities_valid" CHECK ("compatible_disabilities" <@ ARRAY['physical', 'visual', 'hearing', 'intellectual', 'psychosocial']::text[]);
ALTER TABLE "jobs" ADD CONSTRAINT "jobs_physical_demands_valid" CHECK ("physical_demands" <@ ARRAY['bothHands', 'standing', 'walkingDriving', 'seeScreen', 'phoneSpeaking', 'hearing']::text[]);
ALTER TABLE "jobs" ADD CONSTRAINT "jobs_accommodations_offered_valid" CHECK ("accommodations_offered" <@ ARRAY['seated', 'ramp', 'flexibleSchedule', 'adaptedKeyboard', 'screenReader', 'signLanguage']::text[]);
ALTER TABLE "jobs" ADD CONSTRAINT "jobs_province_valid" CHECK ("province" IS NULL OR "province" = ANY (ARRAY['azuay', 'bolivar', 'canar', 'carchi', 'chimborazo', 'cotopaxi', 'elOro', 'esmeraldas', 'galapagos', 'guayas', 'imbabura', 'loja', 'losRios', 'manabi', 'moronaSantiago', 'napo', 'orellana', 'pastaza', 'pichincha', 'santaElena', 'santoDomingo', 'sucumbios', 'tungurahua', 'zamoraChinchipe']::text[]));

ALTER TABLE "candidates" ADD CONSTRAINT "candidates_id_number_format" CHECK ("id_number" ~ '^[0-9]{10}$');
ALTER TABLE "candidates" ADD CONSTRAINT "candidates_phone_format" CHECK ("phone" ~ '^09[0-9]{8}$');
ALTER TABLE "candidates" ADD CONSTRAINT "candidates_disability_percent_range" CHECK ("disability_percent" BETWEEN 1 AND 100);
ALTER TABLE "phone_verifications" ADD CONSTRAINT "phone_verifications_phone_format" CHECK ("phone" ~ '^09[0-9]{8}$');
ALTER TABLE "jobs" ADD CONSTRAINT "jobs_compatible_disabilities_not_empty" CHECK (cardinality("compatible_disabilities") > 0);
ALTER TABLE "jobs" ADD CONSTRAINT "jobs_daily_hours_range" CHECK ("daily_hours" IS NULL OR "daily_hours" BETWEEN 1 AND 24);
ALTER TABLE "cv_files" ADD CONSTRAINT "cv_files_size_range" CHECK ("size_bytes" BETWEEN 1 AND 10485760);
ALTER TABLE "jobs" ADD CONSTRAINT "jobs_salary_range" CHECK ("salary_min" IS NULL OR "salary_max" IS NULL OR "salary_min" <= "salary_max");
ALTER TABLE "applications" ADD CONSTRAINT "applications_match_score_range" CHECK ("match_score" BETWEEN 0 AND 100);

-- Búsqueda por arrays (filtros "accesible para" y "ajustes")
CREATE INDEX "jobs_compatible_disabilities_gin" ON "jobs" USING GIN ("compatible_disabilities");
CREATE INDEX "jobs_accommodations_offered_gin" ON "jobs" USING GIN ("accommodations_offered");
CREATE INDEX "jobs_keywords_gin" ON "jobs" USING GIN ("keywords");

-- updated_at también se actualiza si alguien edita desde el panel de Supabase
CREATE OR REPLACE FUNCTION set_updated_at() RETURNS trigger
LANGUAGE plpgsql SET search_path = '' AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;
CREATE TRIGGER "candidates_set_updated_at" BEFORE UPDATE ON "candidates" FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER "jobs_set_updated_at" BEFORE UPDATE ON "jobs" FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER "applications_set_updated_at" BEFORE UPDATE ON "applications" FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ─── Seguridad ──────────────────────────────────────────────────────────────
-- Seguridad en Supabase: el esquema "public" se publica por la API REST con las claves anon/authenticated.
-- Hay datos sensibles (discapacidad, carnet), así que cada tabla lleva RLS SIN políticas: nadie entra por
-- esa API. El backend se conecta con el rol "postgres" (dueño de las tablas), que no está sujeto a RLS.
ALTER TABLE "candidates" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "consent_records" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "id_card_scans" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "id_card_handoffs" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "phone_verifications" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "login_codes" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "sessions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "cv_files" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "jobs" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "applications" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "application_events" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "schema_migrations" ENABLE ROW LEVEL SECURITY;

-- Migraciones incluidas en este estado
INSERT INTO "schema_migrations" ("version", "name") VALUES
  ('0001', 'init'),
  ('0002', 'ajustes_mockups');

COMMIT;
