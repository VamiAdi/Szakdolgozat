require('dotenv').config({ path: require('path').join(__dirname, '.env') })

const express = require('express')
const app = express()
const port = 3001

const { requireAuth, requireAdmin, jwtPayloadFromAccessToken, felhasznaloVanRealmAdminJoga } = require('./authMiddleware')
const programModel = require('./programModel')
const napiModel = require('./napiGyakorlatModel')
const gyakorlatAdminModel = require('./gyakorlatAdminModel')
const { importGyakorlatCsv } = require('./gyakorlatCsvImport')
const { uploadVideoMiddleware } = require('./videoUpload')

const KEYCLOAK_URL = process.env.KEYCLOAK_URL || 'http://localhost:8080'
const KEYCLOAK_REALM = process.env.KEYCLOAK_REALM || 'rehabology'
const KEYCLOAK_CLIENT_ID = process.env.KEYCLOAK_CLIENT_ID || 'rehabology-frontend'
const KEYCLOAK_ADMIN_USER = process.env.KEYCLOAK_ADMIN_USER || 'admin'
const KEYCLOAK_ADMIN_PASSWORD = process.env.KEYCLOAK_ADMIN_PASSWORD || 'admin'

const AZON_REG_HIBA_SZERVER = 'A regisztráció nem sikerült. Próbálja újra.'

const CORS_ALLOWED_ORIGINS = new Set([
  'http://localhost:5173',
  'http://localhost:4173',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:4173',
])

app.use(express.json())
app.use(function (req, res, next) {
  const origin = req.headers.origin
  if (origin && CORS_ALLOWED_ORIGINS.has(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin)
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  if (req.method === 'OPTIONS') return res.sendStatus(204)
  next()
})

// ─── Keycloak admin segédek (regisztrációhoz) ───────────────────────

async function keycloakAdminToken() {
  const url = `${KEYCLOAK_URL}/realms/master/protocol/openid-connect/token`
  const body = new URLSearchParams({
    grant_type: 'password',
    client_id: 'admin-cli',
    username: KEYCLOAK_ADMIN_USER,
    password: KEYCLOAK_ADMIN_PASSWORD,
  })
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  })
  if (!res.ok) return null
  const data = await res.json()
  return data.access_token
}

async function keycloakCreateUser(adminToken, { firstName, lastName, email, password }) {
  const res = await fetch(`${KEYCLOAK_URL}/admin/realms/${KEYCLOAK_REALM}/users`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${adminToken}`,
    },
    body: JSON.stringify({
      username: email,
      email,
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      enabled: true,
      emailVerified: true,
      credentials: [{ type: 'password', value: password, temporary: false }],
    }),
  })
  return res
}

async function keycloakPasswordGrant(email, password) {
  const url = `${KEYCLOAK_URL}/realms/${KEYCLOAK_REALM}/protocol/openid-connect/token`
  const body = new URLSearchParams({
    grant_type: 'password',
    client_id: KEYCLOAK_CLIENT_ID,
    username: email,
    password,
    scope: 'openid profile email',
  })
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    const msg = data.error_description || data.error || ''
    throw new Error(msg || 'token_grant_failed')
  }
  return data
}

// ─── Regisztráció ──────────────────────────────────────────────────

app.post('/api/regisztracio', async (req, res) => {
  const { firstName, lastName, email, password } = req.body || {}
  if (!firstName?.trim() || !lastName?.trim() || !email || !password) {
    return res.status(400).json({ message: 'Minden mező kitöltendő.' })
  }
  if (password.length < 8) {
    return res.status(400).json({ message: 'A jelszónak legalább 8 karakter hosszúnak kell lennie.' })
  }

  const adminToken = await keycloakAdminToken()
  if (!adminToken) {
    console.error('Keycloak admin token kérés sikertelen.')
    return res.status(502).json({ message: AZON_REG_HIBA_SZERVER })
  }

  const userRes = await keycloakCreateUser(adminToken, { firstName, lastName, email, password })
  if (userRes.status === 409) {
    return res.status(409).json({ message: 'Ez az e-mail cím már regisztrálva van.' })
  }
  if (!userRes.ok) {
    const errText = await userRes.text().catch(() => '')
    console.error('Keycloak user create failed:', userRes.status, errText)
    return res.status(500).json({ message: AZON_REG_HIBA_SZERVER })
  }

  try {
    const tokenAdatok = await keycloakPasswordGrant(email, password)
    return res.status(201).json(tokenAdatok)
  } catch (e) {
    console.error('Keycloak password grant after register:', e.message)
    return res.status(201).json({})
  }
})

/** Vendég / előnézet: nem ment semmit, JWT sem kell - ugyanaz a szűrős + véletlen sorrendű logika mint a mai napon. */
app.post('/gyakorlatok', async (req, res) => {
  const { testreszek, tipus } = req.body || {}
  if (!Array.isArray(testreszek) || testreszek.length === 0) {
    return res.status(400).json({ message: 'Legalább egy testrészt ki kell választani.', napiSor: [] })
  }
  if (!['nyujtas', 'erosites', 'komplex'].includes(tipus)) {
    return res.status(400).json({ message: 'Érvénytelen programtípus.', napiSor: [] })
  }
  try {
    const napiSor = await napiModel.guestPreviewRows(testreszek, tipus)
    return res.status(200).json({ napiSor })
  } catch (e) {
    console.error('POST /gyakorlatok (vendég):', e)
    return res.status(500).json({ message: 'Szerverhiba.', napiSor: [] })
  }
})

/** Admin felülethez: közös feladat szerkesztése / létrehozása előtt. */
function parseAdminGyakorlatUpsertBody(b) {
  const bObj = b || {}
  const nev = typeof bObj.gyakorlat_nev === 'string' ? bObj.gyakorlat_nev.trim() : ''
  const testId = bObj.testresz_id != null ? String(bObj.testresz_id).trim() : ''
  const tipus = typeof bObj.tipus === 'string' ? bObj.tipus.trim().toLowerCase() : ''

  if (!nev) return { ok: false, status: 400, message: 'A gyakorlat neve kötelező.' }
  if (!gyakorlatAdminModel.ALLOWED_TESTRESZ_IDS.has(testId)) {
    return { ok: false, status: 400, message: 'Érvénytelen testrész azonosító.' }
  }
  if (!gyakorlatAdminModel.GYAKORLAT_TIPUSOK.has(tipus)) {
    return { ok: false, status: 400, message: 'Érvénytelen gyakorlattípus.' }
  }
  let ismet = null
  if (bObj.ismetlesszam != null && String(bObj.ismetlesszam).trim() !== '') {
    const n = Number(bObj.ismetlesszam)
    if (!Number.isFinite(n) || n < 0 || !Number.isInteger(n)) {
      return { ok: false, status: 400, message: 'Az ismétlésszámnak nemnegatív egésznek kell lennie.' }
    }
    ismet = n
  }

  return {
    ok: true,
    value: {
      gyakorlat_nev: nev,
      testresz_id: testId,
      tipus,
      leiras: bObj.leiras,
      ismetlesszam: ismet,
      video_link: bObj.video_link,
    },
  }
}

// ─── Admin (realm-admin JWT) ─────────────────────────────────────

app.post('/api/admin/belepes', async (req, res) => {
  const { felhasznalonev, jelszo } = req.body || {}
  if (!felhasznalonev?.trim() || !jelszo) {
    return res.status(400).json({ message: 'Felhasználónév és jelszó kötelező.' })
  }
  try {
    const tokenAdatok = await keycloakPasswordGrant(felhasznalonev.trim(), jelszo)
    const payload = await jwtPayloadFromAccessToken(tokenAdatok.access_token)
    if (!felhasznaloVanRealmAdminJoga(payload)) {
      return res.status(403).json({
        message:
          'Nincs jogosultság',
      })
    }
    return res.status(200).json(tokenAdatok)
  } catch (e) {
    console.error('/api/admin/belepes:', e.message)
    return res.status(401).json({ message: 'Hibás felhasználónév vagy jelszó.' })
  }
})

/** Videó feltöltése a public/ mappába (admin). */
app.post('/api/admin/videok/feltoltes', requireAdmin, uploadVideoMiddleware, (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: 'Válasszon ki egy videófájlt.' })
  }
  return res.status(201).json({
    ok: true,
    filename: req.file.filename,
    url: `/${req.file.filename}`,
  })
})

/** Gyakorlatok listázása (admin konsol). */
app.get('/api/admin/gyakorlatok', requireAdmin, async (_req, res) => {
  try {
    const sorok = await gyakorlatAdminModel.listGyakorlatok()
    return res.status(200).json({ gyakorlatok: sorok })
  } catch (e) {
    console.error('GET /api/admin/gyakorlatok:', e)
    return res.status(500).json({ message: 'Adatbázis hiba.' })
  }
})

/** Új gyakorlat felvitele. */
app.post('/api/admin/gyakorlatok', requireAdmin, async (req, res) => {
  const parsed = parseAdminGyakorlatUpsertBody(req.body)
  if (!parsed.ok) return res.status(parsed.status).json({ message: parsed.message })

  try {
    const sor = await gyakorlatAdminModel.createGyakorlat(parsed.value)
    return res.status(201).json({ gyakorlat: sor })
  } catch (e) {
    console.error('POST /api/admin/gyakorlatok:', e)
    return res.status(500).json({ message: 'Mentés sikertelen.' })
  }
})

/** Tömeges gyakorlat-import CSV-ből (egy tranzakció, elővalidálás - hibánál rollback). */
app.post('/api/admin/gyakorlatok/csv-import', requireAdmin, async (req, res) => {
  const csv = req.body?.csv
  if (typeof csv !== 'string') {
    return res.status(400).json({
      ok: false,
      hibak: [{ sorszam: null, uzenet: 'A JSON törzsben „csv” mező várt (UTF-8 CSV szöveg).' }],
    })
  }
  try {
    const out = await importGyakorlatCsv(csv)
    if (!out.ok) return res.status(400).json(out)
    return res.status(200).json(out)
  } catch (e) {
    console.error('POST /api/admin/gyakorlatok/csv-import:', e)
    return res.status(500).json({
      ok: false,
      hibak: [{ sorszam: null, uzenet: `Szerverhiba: ${e.message || 'ismeretlen hiba.'}` }],
    })
  }
})

/** Meglévő gyakorlat módosítása (teljes rekord szerkesztéshez). */
app.patch('/api/admin/gyakorlatok/:id', requireAdmin, async (req, res) => {
  const gid = Number.parseInt(String(req.params.id), 10)
  if (!Number.isInteger(gid) || gid < 1) {
    return res.status(400).json({ message: 'Érvénytelen gyakorlat azonosító.' })
  }
  const parsed = parseAdminGyakorlatUpsertBody(req.body)
  if (!parsed.ok) return res.status(parsed.status).json({ message: parsed.message })
  try {
    const sor = await gyakorlatAdminModel.updateGyakorlatById(gid, parsed.value)
    if (!sor) return res.status(404).json({ message: 'A gyakorlat nem található.' })
    return res.status(200).json({ gyakorlat: sor })
  } catch (e) {
    console.error('PATCH /api/admin/gyakorlatok/:id:', e)
    return res.status(500).json({ message: 'Mentés sikertelen.' })
  }
})

/** Gyakorlat törlése (nem megy külsőkulcs nélkül, ha hivatkoznak rá). */
app.delete('/api/admin/gyakorlatok/:id', requireAdmin, async (req, res) => {
  const gid = Number.parseInt(String(req.params.id), 10)
  if (!Number.isInteger(gid) || gid < 1) {
    return res.status(400).json({ message: 'Érvénytelen gyakorlat azonosító.' })
  }
  try {
    const t = await gyakorlatAdminModel.deleteGyakorlatById(gid)
    if (!t) return res.status(404).json({ message: 'A gyakorlat nem található.' })
    return res.status(200).json({ ok: true })
  } catch (e) {
    if (e.code === '23503') {
      return res.status(409).json({
        message:
          'A gyakorlat nem törölhető: már hivatkozik rá napi gyakorlatsor (vagy egyéb kapcsolt adat).',
      })
    }
    console.error('DELETE /api/admin/gyakorlatok/:id:', e)
    return res.status(500).json({ message: 'Törlés sikertelen.' })
  }
})

// ─── Program (testreszek + program_tipus) ──────────────────────────

/** A felhasználó programjának lekérése (van-e már). Belépés / oldalbetöltés után hívjuk. */
app.get('/api/profil/program', requireAuth, async (req, res) => {
  try {
    const program = await programModel.getProgram(req.user.sub)
    return res.status(200).json({ program })
  } catch (e) {
    console.error('GET /api/profil/program:', e)
    return res.status(500).json({ message: 'Szerverhiba.' })
  }
})

/**
 * Program mentése: felülírja a felhasználó programját (testreszek + típus + fingerprint).
 * A korábban legenerált napi gyakorlat-rekordok MEGMARADNAK (más fingerprinttel ugyanazon a napon is).
 * A válaszban megjelenő lista: ma + *jelenleg mentett* program fingerprintje - ha már volt ilyen batch, azt adja vissza;
 * ha nem, újat generál (ON CONFLICT miatt nem írja felül a más programhoz tartozó sorokat).
 */
app.post('/api/profil/program', requireAuth, async (req, res) => {
  const { testreszek, programTipus } = req.body || {}
  if (!Array.isArray(testreszek) || testreszek.length === 0) {
    return res.status(400).json({ message: 'Legalább egy testrészt ki kell választani.' })
  }
  if (!['nyujtas', 'erosites', 'komplex'].includes(programTipus)) {
    return res.status(400).json({ message: 'Érvénytelen programtípus.' })
  }
  try {
    const testNorm = testreszek.map(String)
    await programModel.upsertProgram(req.user.sub, testNorm, programTipus)
    const napiSor = await napiModel.getOrCreateMaiSor(req.user.sub)
    const frissProg = await programModel.getProgram(req.user.sub)
    return res.status(200).json({
      napiSor: napiSor || [],
      program: frissProg,
    })
  } catch (e) {
    console.error('POST /api/profil/program:', e)
    return res.status(500).json({ message: 'A program mentése nem sikerült.' })
  }
})

// ─── Napi gyakorlatsor ─────────────────────────────────────────────

/** Mai napi sor (első hívásra generálja, utána a már létezőt adja vissza). */
app.get('/api/napi-gyakorlat', requireAuth, async (req, res) => {
  try {
    const napiSor = await napiModel.getOrCreateMaiSor(req.user.sub)
    if (napiSor === null) {
      return res.status(404).json({ message: 'Nincs még program - előbb állítson össze egyet.' })
    }
    return res.status(200).json({ napiSor })
  } catch (e) {
    console.error('GET /api/napi-gyakorlat:', e)
    return res.status(500).json({ message: 'Szerverhiba.' })
  }
})

/** Egy napi rekord elvegezve állapotának be/kikapcsolása. */
app.patch('/api/napi-gyakorlat/:id', requireAuth, async (req, res) => {
  const id = Number(req.params.id)
  const { elvegezve } = req.body || {}
  if (!Number.isInteger(id) || typeof elvegezve !== 'boolean') {
    return res.status(400).json({ message: 'Hibás kérés.' })
  }
  try {
    const updated = await napiModel.setElvegezve(req.user.sub, id, elvegezve)
    if (!updated) return res.status(404).json({ message: 'Nem található.' })
    return res.status(200).json(updated)
  } catch (e) {
    console.error('PATCH /api/napi-gyakorlat:', e)
    return res.status(500).json({ message: 'Szerverhiba.' })
  }
})

// ─── Profil - haladás (naptárhoz) ──────────────────────────────────

app.get('/api/profil/haladas', requireAuth, async (req, res) => {
  try {
    const haladas = await napiModel.getHaladas(req.user.sub)
    return res.status(200).json(haladas)
  } catch (e) {
    console.error('GET /api/profil/haladas:', e)
    return res.status(500).json({ message: 'Szerverhiba.' })
  }
})

app.listen(port, () => {
  console.log(`App running on port ${port}.`)
})
