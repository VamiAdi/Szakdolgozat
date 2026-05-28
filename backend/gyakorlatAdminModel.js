const { pool } = require('./db')

const GYAKORLAT_TIPUSOK = new Set([
  'nyujtas',
  'erosites',
  'aktivalas',
  'mobilizalas',
  'stabilizalas',
])

const ALLOWED_TESTRESZ_IDS = new Set([
  '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11',
])

const INSERT_SQL = `INSERT INTO gyakorlat (id, gyakorlat_nev, testresz_id, tipus, leiras, ismetlesszam, video_link)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING id, gyakorlat_nev, testresz_id, tipus, leiras, ismetlesszam, video_link`

/**
 * Mező → DB érték (kötelező: érvényesített előtte).
 */
function insertValuesGyakorlat(fields) {
  const {
    gyakorlat_nev,
    testresz_id,
    tipus,
    leiras,
    ismetlesszam,
    video_link,
  } = fields
  return [
    gyakorlat_nev.trim(),
    String(testresz_id),
    tipus,
    leiras == null ? null : String(leiras).trim() || null,
    ismetlesszam === '' || ismetlesszam == null ? null : Number(ismetlesszam),
    video_link == null || String(video_link).trim() === '' ? null : String(video_link).trim(),
  ]
}

/**
 * Következő id = legnagyobb tárolt id + 1. Tranzakción belül hívjuk, EXCLUSIVE táblázat-zárat tesz rá.
 */
async function nextGyakorlatIdsStartAfterLock(client) {
  await client.query('LOCK TABLE gyakorlat IN EXCLUSIVE MODE')
  const mx = await client.query(
    `SELECT COALESCE(MAX(id)::bigint, 0)::integer AS mx FROM gyakorlat`,
  )
  return Number(mx.rows[0].mx) + 1
}

/** Ha van SERIAL / IDENTITY szekvencia, igazítja a következő automatikus értékhez MAX(id) után. */
async function syncGyakorlatIdSequenceSafe(client) {
  const nm = await client.query(
    `SELECT pg_get_serial_sequence('gyakorlat','id') AS nm`,
  )
  const seqName = nm.rows[0]?.nm
  if (!seqName) return
  await client.query(
    `SELECT setval($1::regclass, COALESCE((SELECT MAX(id)::bigint FROM gyakorlat), 1), true)`,
    [seqName],
  )
}

/**
 * Tranzakción belül: MAX(id)+1, MAX(id)+2, … id-kkal beszúrja a sorokat, majd szekvenciát igazítja.
 */
async function bulkInsertGyakorlatokWithAllocatedIds(client, fieldsLista) {
  let nid = await nextGyakorlatIdsStartAfterLock(client)
  const sorok = []
  for (const fields of fieldsLista) {
    sorok.push(await insertGyakorlatWithClient(client, fields, nid))
    nid += 1
  }
  await syncGyakorlatIdSequenceSafe(client)
  return sorok
}

/** Tranzakción belüli INSERT; az id előre kiosztva (MAX+1, … sorozat bulknál). */
async function insertGyakorlatWithClient(client, fields, explicitId) {
  const vals = insertValuesGyakorlat(fields)
  const id = Number(explicitId)
  const r = await client.query(INSERT_SQL, [id, ...vals])
  return r.rows[0]
}

async function listGyakorlatok() {
  const r = await pool.query(
    `SELECT id, gyakorlat_nev, testresz_id, tipus, leiras, ismetlesszam, video_link
     FROM gyakorlat
     ORDER BY id ASC`,
  )
  return r.rows
}

async function updateGyakorlatById(id, fields) {
  const vals = insertValuesGyakorlat(fields)
  const r = await pool.query(
    `UPDATE gyakorlat
     SET gyakorlat_nev = $1, testresz_id = $2, tipus = $3,
         leiras = $4, ismetlesszam = $5, video_link = $6
     WHERE id = $7
     RETURNING id, gyakorlat_nev, testresz_id, tipus, leiras, ismetlesszam, video_link`,
    [...vals, id],
  )
  return r.rows[0] || null
}

async function deleteGyakorlatById(id) {
  const r = await pool.query(`DELETE FROM gyakorlat WHERE id = $1 RETURNING id`, [id])
  return r.rows[0] || null
}

/**
 * Új gyakorlat rögzítése (admin).
 * testresz_id: alkalmazásban használt karakterláncként tároljuk (pl. „6”, „11”).
 */
async function createGyakorlat(fields) {
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    const nid = await nextGyakorlatIdsStartAfterLock(client)
    const row = await insertGyakorlatWithClient(client, fields, nid)
    await syncGyakorlatIdSequenceSafe(client)
    await client.query('COMMIT')
    return row
  } catch (e) {
    await client.query('ROLLBACK')
    throw e
  } finally {
    client.release()
  }
}

module.exports = {
  listGyakorlatok,
  createGyakorlat,
  updateGyakorlatById,
  deleteGyakorlatById,
  insertGyakorlatWithClient,
  bulkInsertGyakorlatokWithAllocatedIds,
  GYAKORLAT_TIPUSOK,
  ALLOWED_TESTRESZ_IDS,
}
