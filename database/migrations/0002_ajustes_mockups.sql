-- ============================================================================
-- Capaz · migración 0002_ajustes_mockups
-- Generada con `npm run db:migration -- ajustes_mockups`. No la edites después de aplicarla en Supabase.
--
-- Aplicar: `npm run db:migrate`, o pegar este archivo completo en el SQL Editor de Supabase → Run.
-- Corre en una transacción: si algo falla, no se aplica nada. Si ya está aplicada, se detiene sin cambiar nada.
-- ============================================================================

BEGIN;

DO $$ BEGIN
  IF to_regclass('public.schema_migrations') IS NULL THEN
    RAISE EXCEPTION 'Falta la tabla schema_migrations: aplica primero la migración 0001.';
  END IF;
  IF EXISTS (SELECT 1 FROM public.schema_migrations WHERE version = '0002') THEN
    RAISE EXCEPTION 'La migración 0002 ya está aplicada.';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.schema_migrations WHERE version = '0001') THEN
    RAISE EXCEPTION 'Falta aplicar la migración 0001 antes que esta.';
  END IF;
END $$;

-- CreateEnum
CREATE TYPE "interview_mode" AS ENUM ('inPerson', 'videoCall', 'phoneCall');

-- AlterEnum (Postgres 12+ lo permite dentro de la transacción; el valor nuevo no se usa en esta migración)
ALTER TYPE "job_schedule" ADD VALUE 'internship';

-- Datos (agregado a mano): se quitó la opción "guardar las fotos del carnet".
-- Sus consentimientos se borran (si no, el cambio de enum falla) y las fotos que se hubieran guardado, también.
DELETE FROM "consent_records" WHERE "purpose" = 'keepIdCardImages';
UPDATE "id_card_scans" SET "front_image" = NULL, "back_image" = NULL, "front_mime" = NULL, "back_mime" = NULL
WHERE "status" = 'confirmed';

-- AlterEnum (quita keepIdCardImages)
CREATE TYPE "consent_purpose_new" AS ENUM ('useProfile', 'shareOnlyAccommodations', 'discoverable');
ALTER TABLE "consent_records" ALTER COLUMN "purpose" TYPE "consent_purpose_new" USING ("purpose"::text::"consent_purpose_new");
ALTER TYPE "consent_purpose" RENAME TO "consent_purpose_old";
ALTER TYPE "consent_purpose_new" RENAME TO "consent_purpose";
DROP TYPE "consent_purpose_old";

-- AlterTable
ALTER TABLE "candidates" ADD COLUMN     "id_card_valid_indefinitely" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "jobs" DROP COLUMN "easy_read_summary",
DROP COLUMN "tasks",
ADD COLUMN     "accommodations_detail" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "daily_hours" SMALLINT,
ADD COLUMN     "easy_read" JSONB,
ADD COLUMN     "province" TEXT,
ADD COLUMN     "salary_benefits" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "summary" TEXT NOT NULL DEFAULT '';

-- AlterTable
ALTER TABLE "applications" ADD COLUMN     "interview_confirmed_at" TIMESTAMPTZ(6),
ADD COLUMN     "interview_mode" "interview_mode";

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

-- CreateIndex
CREATE UNIQUE INDEX "cv_files_candidate_id_key" ON "cv_files"("candidate_id");

-- CreateIndex
CREATE INDEX "cv_files_expires_at_idx" ON "cv_files"("expires_at");

-- AddForeignKey
ALTER TABLE "cv_files" ADD CONSTRAINT "cv_files_candidate_id_fkey" FOREIGN KEY ("candidate_id") REFERENCES "candidates"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Catálogo (src/domain/catalog.ts)
ALTER TABLE "jobs" ADD CONSTRAINT "jobs_province_valid" CHECK ("province" IS NULL OR "province" = ANY (ARRAY['azuay', 'bolivar', 'canar', 'carchi', 'chimborazo', 'cotopaxi', 'elOro', 'esmeraldas', 'galapagos', 'guayas', 'imbabura', 'loja', 'losRios', 'manabi', 'moronaSantiago', 'napo', 'orellana', 'pastaza', 'pichincha', 'santaElena', 'santoDomingo', 'sucumbios', 'tungurahua', 'zamoraChinchipe']::text[]));

-- Reglas de negocio (agregadas a mano; también están en scripts/db/lib.ts → schema.sql)
ALTER TABLE "jobs" ADD CONSTRAINT "jobs_daily_hours_range" CHECK ("daily_hours" IS NULL OR "daily_hours" BETWEEN 1 AND 24);
ALTER TABLE "cv_files" ADD CONSTRAINT "cv_files_size_range" CHECK ("size_bytes" BETWEEN 1 AND 10485760);

-- Seguridad en Supabase: el esquema "public" se publica por la API REST con las claves anon/authenticated.
-- Hay datos sensibles (discapacidad, carnet), así que cada tabla lleva RLS SIN políticas: nadie entra por
-- esa API. El backend se conecta con el rol "postgres" (dueño de las tablas), que no está sujeto a RLS.
ALTER TABLE "cv_files" ENABLE ROW LEVEL SECURITY;

INSERT INTO "schema_migrations" ("version", "name") VALUES ('0002', 'ajustes_mockups');

COMMIT;
