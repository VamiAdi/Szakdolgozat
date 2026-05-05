const { createRemoteJWKSet, jwtVerify } = require('jose')

const KEYCLOAK_URL = process.env.KEYCLOAK_URL || 'http://localhost:8080'
const KEYCLOAK_REALM = process.env.KEYCLOAK_REALM || 'rehabology'

const ISSUER = `${KEYCLOAK_URL}/realms/${KEYCLOAK_REALM}`
const JWKS = createRemoteJWKSet(new URL(`${ISSUER}/protocol/openid-connect/certs`))

/**
 * Realm adminisztrátor: Keycloak-ban tipikusan a `realm-management` kliens
 * „realm-admin” szerepe (nem a realm saját egyéni szerepkörei között keresünk először).
 */
function felhasznaloVanRealmAdminJoga(payload) {
  const mgmt = payload.resource_access?.['realm-management']?.roles
  if (Array.isArray(mgmt) && mgmt.includes('realm-admin')) return true
  const realmRoles = payload.realm_access?.roles
  return Array.isArray(realmRoles) && realmRoles.includes('realm-admin')
}

async function jwtPayloadFromAccessToken(accessToken) {
  const { payload } = await jwtVerify(accessToken, JWKS, { issuer: ISSUER })
  return payload
}

async function requireAuth(req, res, next) {
  const auth = req.headers.authorization || ''
  const m = auth.match(/^Bearer (.+)$/i)
  if (!m) return res.status(401).json({ message: 'Hiányzó token.' })

  try {
    const payload = await jwtPayloadFromAccessToken(m[1])
    if (!payload.sub) return res.status(401).json({ message: 'Érvénytelen token.' })
    req.user = {
      sub: payload.sub,
      email: payload.email || payload.preferred_username || '',
    }
    next()
  } catch (e) {
    console.error('JWT verify failed:', e.message)
    return res.status(401).json({ message: 'Érvénytelen token.' })
  }
}

async function requireAdmin(req, res, next) {
  const auth = req.headers.authorization || ''
  const m = auth.match(/^Bearer (.+)$/i)
  if (!m) return res.status(401).json({ message: 'Hiányzó token.' })

  try {
    const payload = await jwtPayloadFromAccessToken(m[1])
    if (!payload.sub) return res.status(401).json({ message: 'Érvénytelen token.' })
    if (!felhasznaloVanRealmAdminJoga(payload)) {
      return res.status(403).json({ message: 'Ehhez realm-admin jogosultság szükséges.' })
    }
    req.adminUser = {
      sub: payload.sub,
      nev: payload.preferred_username || payload.email || '',
    }
    next()
  } catch (e) {
    console.error('Admin JWT verify failed:', e.message)
    return res.status(401).json({ message: 'Érvénytelen token.' })
  }
}

module.exports = {
  requireAuth,
  requireAdmin,
  jwtPayloadFromAccessToken,
  felhasznaloVanRealmAdminJoga,
}
