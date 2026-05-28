import { apiUrl, jwtPayloadDecoded } from "./auth";

const ADMIN_ACCESS = "kc_admin_access_token";
const ADMIN_REFRESH = "kc_admin_refresh_token";

const REFRESH_SKEW_SEC = 120;

export function adminBelepveVan() {
    const t = sessionStorage.getItem(ADMIN_ACCESS);
    const p = jwtPayloadDecoded(t);
    if (!p?.sub) return false;
    if (p.exp && p.exp * 1000 < Date.now()) return false;
    return true;
}

/** realm-management / realm-admin JWT — külön a normál felhasználótól. */
export function adminTokenekMentese(d) {
    if (!d) return;
    if (d.access_token) sessionStorage.setItem(ADMIN_ACCESS, d.access_token);
    if (d.refresh_token) sessionStorage.setItem(ADMIN_REFRESH, d.refresh_token);
    window.dispatchEvent(new Event("admin-auth-change"));
}

export function adminKilepes() {
    sessionStorage.removeItem(ADMIN_ACCESS);
    sessionStorage.removeItem(ADMIN_REFRESH);
    window.dispatchEvent(new Event("admin-auth-change"));
}

function adminLejarMpMulva() {
    const p = jwtPayloadDecoded(sessionStorage.getItem(ADMIN_ACCESS));
    if (!p?.exp) return null;
    return p.exp - Date.now() / 1000;
}

async function adminRefreshTokenKer() {
    const url = import.meta.env.VITE_KEYCLOAK_URL;
    const realm = import.meta.env.VITE_KEYCLOAK_REALM;
    const clientId = import.meta.env.VITE_KEYCLOAK_CLIENT_ID;
    const refresh = sessionStorage.getItem(ADMIN_REFRESH);
    if (!url || !realm || !clientId || !refresh) return false;

    const res = await fetch(`${url}/realms/${realm}/protocol/openid-connect/token`, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
            grant_type: "refresh_token",
            refresh_token: refresh,
            client_id: clientId,
        }),
    });
    if (!res.ok) return false;
    const data = await res.json();
    adminTokenekMentese(data);
    return true;
}

export async function adminSessionFrissiteseHaKell() {
    const access = sessionStorage.getItem(ADMIN_ACCESS);
    const refresh = sessionStorage.getItem(ADMIN_REFRESH);
    if (!access && !refresh) return;

    const h = adminLejarMpMulva();
    const karos = h == null || h < REFRESH_SKEW_SEC;
    if (!karos) return;

    if (!refresh) {
        adminKilepes();
        return;
    }

    const ok = await adminRefreshTokenKer().catch(() => false);
    if (!ok) adminKilepes();
}

export async function adminAuthedFetch(input, init = {}) {
    await adminSessionFrissiteseHaKell();
    const token = sessionStorage.getItem(ADMIN_ACCESS);
    const headers = new Headers(init.headers || {});
    if (token) headers.set("Authorization", `Bearer ${token}`);
    if (init.body && !headers.has("Content-Type") && !(init.body instanceof FormData)) {
        headers.set("Content-Type", "application/json");
    }
    return fetch(input, { ...init, headers });
}

/** Admin végpont hívásokhoz teljes backend URL az auth apiUrl-hez igazítva. */
export { apiUrl };
