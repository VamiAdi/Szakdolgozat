const { pool } = require('./db')

/** Rendezett testrész + típus egy string - két programválasztás közti egyezéshez */
function programFingerprint(testreszek, programTipus) {
  const parts = [...testreszek].map(String).sort()
  return `${parts.join(',')}|${programTipus}`
}

async function getProgram(userSub) {
  const r = await pool.query(
    `SELECT user_sub, testreszek, program_tipus, program_fingerprint, letrehozva, modositva
     FROM felhasznalo_program WHERE user_sub = $1`,
    [userSub],
  )
  return r.rows[0] || null
}

/**
 * Felhasználónként pontosan egy sor - UPSERT felülírja a testreszek + típus + ujjlenyomat mezőket.
 */
async function upsertProgram(userSub, testreszek, programTipus) {
  const fp = programFingerprint(testreszek, programTipus)
  await pool.query(
    `INSERT INTO felhasznalo_program (user_sub, testreszek, program_tipus, program_fingerprint)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (user_sub) DO UPDATE
       SET testreszek           = EXCLUDED.testreszek,
           program_tipus       = EXCLUDED.program_tipus,
           program_fingerprint = EXCLUDED.program_fingerprint,
           modositva           = now()`,
    [userSub, testreszek, programTipus, fp],
  )
}

module.exports = { getProgram, upsertProgram, programFingerprint }
