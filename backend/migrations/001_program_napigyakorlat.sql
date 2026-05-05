-- Felhasználónként egy program (testreszek + program tipus). Felülírható (UPSERT).
CREATE TABLE IF NOT EXISTS felhasznalo_program (
  user_sub      TEXT PRIMARY KEY,
  testreszek    TEXT[] NOT NULL,
  program_tipus TEXT NOT NULL,
  letrehozva    TIMESTAMPTZ NOT NULL DEFAULT now(),
  modositva     TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- A naponta legenerált gyakorlatsor egy-egy sora.
-- Egy felhasználó egy adott napra, egy adott sorrendben pontosan egy gyakorlatot kap.
CREATE TABLE IF NOT EXISTS napi_gyakorlat (
  id            SERIAL PRIMARY KEY,
  user_sub      TEXT NOT NULL,
  datum         DATE NOT NULL,
  gyakorlat_id  INTEGER NOT NULL REFERENCES gyakorlat(id),
  sorrend       INTEGER NOT NULL,
  elvegezve     BOOLEAN NOT NULL DEFAULT FALSE,
  letrehozva    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_sub, datum, sorrend)
);

CREATE INDEX IF NOT EXISTS idx_napi_user_datum ON napi_gyakorlat (user_sub, datum);
