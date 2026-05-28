-- Összevont migráció (régi 002 + 003): előfeltétel: 001_program_napigyakorlat.sql már futott.
--
-- 1) Ujjlenyomat a felhasználó programján + minden napi gyakorlat-soron
-- 2) Régi UNIQUE (user_sub, datum, sorrend) le → egy napon több program batch is megmaradhat

-- ─── Felhasználó aktuális programja ────────────────────────────────
ALTER TABLE felhasznalo_program
  ADD COLUMN IF NOT EXISTS program_fingerprint TEXT;

UPDATE felhasznalo_program
SET program_fingerprint = COALESCE(program_fingerprint, '');

COMMENT ON COLUMN felhasznalo_program.program_fingerprint IS
  'Rendezett testrész-id-k és típus szövege (programFingerprint a backendben).';

-- ─── Napi sorok ─────────────────────────────────────────────────────
ALTER TABLE napi_gyakorlat
  ADD COLUMN IF NOT EXISTS program_fingerprint TEXT NOT NULL DEFAULT '';

COMMENT ON COLUMN napi_gyakorlat.program_fingerprint IS
  'Annak a programnak az ujjlenyomata (testreszek|tipus), amellyel ez a sor létrejött.';

-- Régi Postgres-kulcs neve tipikusan: napi_gyakorlat_user_sub_datum_sorrend_key
ALTER TABLE napi_gyakorlat
  DROP CONSTRAINT IF EXISTS napi_gyakorlat_user_sub_datum_sorrend_key;

CREATE UNIQUE INDEX IF NOT EXISTS napi_gyakorlat_user_datum_fp_sorrend_uq
  ON napi_gyakorlat (user_sub, datum, program_fingerprint, sorrend);
