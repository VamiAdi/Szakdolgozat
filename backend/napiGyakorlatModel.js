const { pool } = require('./db')
const { getProgram } = require('./programModel')

/**
 * Random N gyakorlat-id egy adott testrészre és típusra.
 * Postgres `random()` rendezéssel — ha kevesebb gyakorlat van, mint amennyit kérünk, mind visszajön.
 */
async function pickRandom(testreszId, tipus, n) {
  const r = await pool.query(
    `SELECT id FROM gyakorlat
     WHERE testresz_id::text = $1 AND tipus = $2
     ORDER BY random()
     LIMIT $3`,
    [String(testreszId), tipus, n],
  )
  return r.rows.map((x) => x.id)
}

/**
 * A felhasználó által beállított program alapján legenerálja a mai napi gyakorlat-id sorrendet.
 * Szabályok (a felhasználó kérése szerint):
 *   - nyujtas / erosites:
 *       1 testrész   → 4 random gyakorlat
 *       N testrész   → testreszenként 2 random, testreszek egymás után
 *   - komplex:
 *       1 testrész   → 3 random nyújtó + 3 random erősítő (sorrendben)
 *       N testrész   → testreszenként (2 nyújtó majd 2 erősítő), és így tovább
 */
async function generaltSorrend(testreszek, programTipus) {
  const out = []

  if (programTipus === 'nyujtas' || programTipus === 'erosites') {
    if (testreszek.length === 1) {
      out.push(...(await pickRandom(testreszek[0], programTipus, 4)))
    } else {
      for (const tr of testreszek) {
        out.push(...(await pickRandom(tr, programTipus, 2)))
      }
    }
  } else if (programTipus === 'komplex') {
    if (testreszek.length === 1) {
      out.push(...(await pickRandom(testreszek[0], 'nyujtas', 3)))
      out.push(...(await pickRandom(testreszek[0], 'erosites', 3)))
    } else {
      for (const tr of testreszek) {
        out.push(...(await pickRandom(tr, 'nyujtas', 2)))
        out.push(...(await pickRandom(tr, 'erosites', 2)))
      }
    }
  } else {
    throw new Error(`Ismeretlen program_tipus: ${programTipus}`)
  }

  return out
}

/** Ugyanaz a mezőforma, mint a `getNapiSor`-ban (napi sor + joinolt gyakorlat), de vendég előnézet: `id` és `datum` üres — nem INSERT-elünk. */
async function guestPreviewRows(testreszek, programTipus) {
  const tr = testreszek.map(String)
  const sorrendIds = await generaltSorrend(tr, programTipus)
  return hydrateGyakorlatSoraban(sorrendIds)
}

async function hydrateGyakorlatSoraban(sorrendIds) {
  if (!sorrendIds.length) return []
  const r = await pool.query(
    `SELECT id, gyakorlat_nev, leiras, tipus, testresz_id, video_link, ismetlesszam
     FROM gyakorlat WHERE id = ANY($1::int[])`,
    [sorrendIds],
  )
  const map = new Map(r.rows.map((row) => [row.id, row]))
  const out = []
  for (let sorrend = 0; sorrend < sorrendIds.length; sorrend++) {
    const gid = sorrendIds[sorrend]
    const g = map.get(gid)
    if (!g) continue
    out.push({
      id: null,
      gyakorlat_id: g.id,
      sorrend,
      elvegezve: false,
      datum: null,
      gyakorlat_nev: g.gyakorlat_nev,
      leiras: g.leiras,
      tipus: g.tipus,
      testresz_id: g.testresz_id,
      video_link: g.video_link,
      ismetlesszam: g.ismetlesszam,
    })
  }
  return out
}

/** Mai napi gyakorlatsor — csak a felhasználó *jelenleg mentett* programjához tartozó ujjlenyomattal egyező sorok */
async function getNapiSor(userSub) {
  const program = await getProgram(userSub)
  if (!program) return []

  const fp = program.program_fingerprint || ''
  const r = await pool.query(
    `SELECT ng.id,
            ng.gyakorlat_id,
            ng.sorrend,
            ng.elvegezve,
            ng.datum,
            g.gyakorlat_nev,
            g.leiras,
            g.tipus,
            g.testresz_id,
            g.video_link,
            g.ismetlesszam
     FROM napi_gyakorlat ng
     JOIN gyakorlat g ON g.id = ng.gyakorlat_id
     WHERE ng.user_sub = $1
       AND ng.datum = CURRENT_DATE
       AND COALESCE(ng.program_fingerprint, '') = $2
     ORDER BY ng.sorrend`,
    [userSub, fp],
  )
  return r.rows
}

/**
 * Mai napi sor a *jelenleg mentett* program ujjlenyomatához:
 * ha már van mai batch ehhez a fingerprinhez → visszaadjuk (visszaváltáskor ugyanaz a lista);
 * ha nincs → legeneráljuk — más programokhoz tartozó mai sorokat NEM töröljük.
 */
async function getOrCreateMaiSor(userSub) {
  const program = await getProgram(userSub)
  if (!program) return null

  const fp = program.program_fingerprint || ''

  const meglevo = await getNapiSor(userSub)
  if (meglevo.length > 0) return meglevo

  const sorrend = await generaltSorrend(program.testreszek, program.program_tipus)

  if (sorrend.length === 0) {
    console.warn('Üres napi sor generálódott — nincs illeszkedő gyakorlat?', {
      userSub,
      testreszek: program.testreszek,
      tipus: program.program_tipus,
    })
    return []
  }

  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    for (let i = 0; i < sorrend.length; i++) {
      await client.query(
        `INSERT INTO napi_gyakorlat (user_sub, datum, gyakorlat_id, sorrend, elvegezve, program_fingerprint)
         VALUES ($1, CURRENT_DATE, $2, $3, FALSE, $4)
         ON CONFLICT (user_sub, datum, program_fingerprint, sorrend) DO NOTHING`,
        [userSub, sorrend[i], i, fp],
      )
    }
    await client.query('COMMIT')
  } catch (e) {
    await client.query('ROLLBACK')
    throw e
  } finally {
    client.release()
  }

  return await getNapiSor(userSub)
}

/** Egy konkrét napi rekord elvegezve állapotának frissítése — csak a jelenlegi program ujjlenyomatához tartozó sorra. */
async function setElvegezve(userSub, napiId, ertek) {
  const program = await getProgram(userSub)
  if (!program) return null
  const fp = program.program_fingerprint || ''
  const r = await pool.query(
    `UPDATE napi_gyakorlat
     SET elvegezve = $4
     WHERE id = $1
       AND user_sub = $2
       AND COALESCE(program_fingerprint, '') = $3
     RETURNING id, elvegezve`,
    [napiId, userSub, fp, !!ertek],
  )
  return r.rows[0] || null
}

/**
 * Napi haladás összesítő — { 'YYYY-MM-DD': 'teljes' | 'reszleges' } map.
 * Azokat a napokat NEM tartalmazza, ahol egy gyakorlatot sem végzett el (== nincs aktív nap).
 * A belépés nélküli napokat sem (mert nincs is bejegyzés).
 */
async function getHaladas(userSub) {
  const r = await pool.query(
    `WITH nap_utols_program AS (
       SELECT datum,
              (ARRAY_AGG(program_fingerprint ORDER BY id DESC))[1] AS utolso_fp
       FROM napi_gyakorlat
       WHERE user_sub = $1
       GROUP BY datum
     )
     SELECT to_char(n.datum, 'YYYY-MM-DD') AS datum,
            SUM(CASE WHEN n.elvegezve THEN 1 ELSE 0 END)::int AS kesz,
            COUNT(*)::int AS osszes
     FROM napi_gyakorlat n
     INNER JOIN nap_utols_program u ON u.datum = n.datum
       AND COALESCE(n.program_fingerprint, '') = COALESCE(u.utolso_fp, '')
     WHERE n.user_sub = $1
     GROUP BY n.datum
     ORDER BY n.datum`,
    [userSub],
  )

  const out = {}
  for (const row of r.rows) {
    if (row.kesz === 0) continue
    out[row.datum] = row.kesz === row.osszes ? 'teljes' : 'reszleges'
  }
  return out
}

module.exports = {
  guestPreviewRows,
  getNapiSor,
  getOrCreateMaiSor,
  setElvegezve,
  getHaladas,
}
