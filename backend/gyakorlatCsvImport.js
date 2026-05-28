/**
 * Gyakorlat CSV import egységteszt + egy tranzakcióban történő beszúrás.
 *
 * Kötelező oszlopok az első sorban (fejléc név váltoékony: kisbetű, szóköz→_ ):
 *   gyakorlat_nev, testresz_id, tipus
 * Opcionális oszlopok:
 *   leiras, ismetlesszam, video_link
 * Az „id” oszlop ha szerepel, figyelmen kívül hagyjuk; az új sorok id-je a tábla MAX(id)+1-től növekedik (import több sor egy tranzakcióban lépcsőz).
 */

const { parse } = require('csv-parse/sync')
const { pool } = require('./db')
const {
  bulkInsertGyakorlatokWithAllocatedIds,
  GYAKORLAT_TIPUSOK,
  ALLOWED_TESTRESZ_IDS,
} = require('./gyakorlatAdminModel')

/** Kötelező fejléc mezőnevek (normalize után így néznek ki). */
const KOTELEZO_OSZLOPOK = ['gyakorlat_nev', 'testresz_id', 'tipus']

/** Oszloponként alkalmazzuk az első sorra — extra oszlopok elnézése. */
function normalizaltFejlElem(s) {
  return String(s ?? '')
    .trim()
    .toLowerCase()
    .replace(/\s+/gu, '_')
}

/** Celles id pl. Excelből „06” vagy „6” → alkalmazásbeli kulcs („1”—„11”). */
function ellenorizTestreszId(ertek) {
  const s = String(ertek ?? '').trim()
  if (!s) return { ok: false }
  if (ALLOWED_TESTRESZ_IDS.has(s)) return { ok: true, id: s }
  if (/^\d+$/.test(s)) {
    const key = String(Number.parseInt(s, 10))
    return ALLOWED_TESTRESZ_IDS.has(key) ? { ok: true, id: key } : { ok: false }
  }
  return { ok: false }
}

function ellenorizTipus(s) {
  if (s == null || String(s).trim() === '') return { ok: false }
  const t = String(s).trim().toLowerCase()
  return GYAKORLAT_TIPUSOK.has(t) ? { ok: true, tipus: t } : { ok: false }
}

function ellenorizIsmetlesszam(nyers) {
  if (nyers === null || nyers === undefined || String(nyers).trim() === '') {
    return { ok: true, szam: null }
  }
  const s = String(nyers).trim()
  const n = Number(s)
  if (!Number.isFinite(n) || !Number.isInteger(n) || n < 0) return { ok: false }
  return { ok: true, szam: n }
}

/**
 * Első sor: fejléc. Adatsorok: 2 … N (hibánál ehhez kapcsoljuk a sor számát).
 * @returns {{ ok:true, darab:number } | { ok:false, hibak: Array<{sorszam:number|null,uzenet:string}> }}
 */
async function importGyakorlatCsv(csvString) {
  const hibak = []

  try {
    const tisztitott = String(csvString ?? '')
      .replace(/^\ufeff/u, '')
      .trim()

    if (!tisztitott) {
      hibak.push({ sorszam: null, uzenet: 'Üres CSV fájl.' })
      return { ok: false, hibak }
    }

    let rekordok
    try {
      rekordok = parse(tisztitott, {
        columns: (header) =>
          header.map((h, i) => {
            const n = normalizaltFejlElem(h)
            if (n !== '') return n
            hibak.push({
              sorszam: 1,
              uzenet: `Üres oszlopnév (${i + 1}. oszlop a fejlécben).`,
            })
            return `__ures_${i}`
          }),
        skip_empty_lines: true,
        trim: true,
        relax_quotes: true,
      })
    } catch (err) {
      hibak.push({
        sorszam: null,
        uzenet: `A CSV szerkezete nem értelmezhető: ${err.message || String(err)}`,
      })
      return { ok: false, hibak }
    }

    const addHiba = (sorszam, msg) => {
      hibak.push({ sorszam, uzenet: msg })
    }

    if (rekordok.length === 0) {
      addHiba(null, 'Nincs adatsor — csak fejléc vagy üres fájl.')
      return { ok: false, hibak }
    }

    /** @type {{[k:string]:string}} */
    const elsoFejrek = rekordok[0] || {}

    /** Dupla fejlécnévizés (normalizálva). */
    const fejlista = []
    for (const k of Object.keys(elsoFejrek)) {
      if (String(k).startsWith('__ures_')) continue
      if (fejlista.includes(k)) {
        addHiba(1, `Duplikált oszlopnév a fejlécben: „${k}”.`)
      } else fejlista.push(k)
    }

    for (const kotelezo of KOTELEZO_OSZLOPOK) {
      if (!fejlista.includes(kotelezo)) {
        addHiba(
          1,
          `Hiányzó kötelező oszlop a fejlécben: „${kotelezo}”. Kötelező: ${KOTELEZO_OSZLOPOK.join(', ')}.`,
        )
      }
    }

    const ismeretlen = fejlista.filter(
      (k) => !KOTELEZO_OSZLOPOK.includes(k) && !['leiras', 'ismetlesszam', 'video_link', 'id'].includes(k),
    )
    for (const u of ismeretlen) {
      addHiba(1, `Ismeretlen oszlop a fejlécben: „${u}”. Távolítsa el vagy nevezzen át.`)
    }

    if (hibak.length > 0) return { ok: false, hibak }

    /** Validált + normalizált táblázat egy sorára. */
    const beszuras = []

    rekordok.forEach((rek, sorIndex) => {
      const fizikaiSorszam = sorIndex + 2

      /** Skip teljes üresrekord (__ures_* kulcs figyelve) */
      const mindHalott = Object.entries(rek)
        .filter(([k]) => !String(k).startsWith('__ures_'))
        .every(([, v]) => v == null || String(v).trim() === '')
      if (mindHalott) return

      let nevElem = rek.gyakorlat_nev
      nevElem = nevElem == null ? '' : String(nevElem).trim()
      if (!nevElem) {
        addHiba(fizikaiSorszam, '„gyakorlat_nev” kötelező; nem maradhat üresen egy kitöltött sorban.')
        return
      }

      const tst = ellenorizTestreszId(rek.testresz_id)
      if (!tst.ok) {
        addHiba(
          fizikaiSorszam,
          `„testresz_id” (${String(rek.testresz_id).trim()}): érvénytelen érték. Engedélyezett: ${[...ALLOWED_TESTRESZ_IDS].join(', ')}.`,
        )
        return
      }

      const tip = ellenorizTipus(rek.tipus)
      if (!tip.ok) {
        addHiba(
          fizikaiSorszam,
          `„tipus”: érvénytelen („${rek.tipus}”). Engedélyezettek: ${[...GYAKORLAT_TIPUSOK].join(', ')}.`,
        )
        return
      }

      const ismi = ellenorizIsmetlesszam(rek.ismetlesszam)
      if (!ismi.ok) {
        addHiba(fizikaiSorszam, `„ismetlesszam”: nemnegatív egész szám kell legyen (vagy üres oszlop).`)
        return
      }

      const leirasSzoveg =
        rek.leiras == null || String(rek.leiras).trim() === ''
          ? null
          : String(rek.leiras).trim()

      const videoNyers = rek.video_link
      const videoSzoveg =
        videoNyers == null || String(videoNyers).trim() === ''
          ? null
          : String(videoNyers).trim()

      beszuras.push({
        gyakorlat_nev: nevElem,
        testresz_id: tst.id,
        tipus: tip.tipus,
        leiras: leirasSzoveg,
        ismetlesszam: ismi.szam,
        video_link: videoSzoveg,
      })
    })

    if (hibak.length > 0) return { ok: false, hibak }

    if (beszuras.length === 0) {
      addHiba(null, 'Nem maradt egyetlen felvihető adatsor sem (minden sor üres volt).')
      return { ok: false, hibak }
    }

    const client = await pool.connect()
    try {
      await client.query('BEGIN')
      await bulkInsertGyakorlatokWithAllocatedIds(client, beszuras)
      await client.query('COMMIT')
    } catch (e) {
      await client.query('ROLLBACK')
      console.error('CSV import DB hiba:', e)
      hibak.push({
        sorszam: null,
        uzenet: `Adatbázis hiba mentéskor (minden sor visszavonva): ${e.message || 'ismeretlen'}`,
      })
      return { ok: false, hibak }
    } finally {
      client.release()
    }

    return { ok: true, darab: beszuras.length }
  } catch (e) {
    console.error('importGyakorlatCsv:', e)
    hibak.push({ sorszam: null, uzenet: `Váratlan hiba: ${e.message || String(e)}` })
    return { ok: false, hibak }
  }
}

module.exports = { importGyakorlatCsv }
