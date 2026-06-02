import { useEffect, useState } from "react";

const ACCESS = "kc_access_token";
const REFRESH = "kc_refresh_token";
const ID = "kc_id_token";

/** Ennyi másodperccel a lejárat előtt próbálunk refresh_tokennel új access tokent kérni */
const REFRESH_SKEW_SEC = 120;

/** Háttér ellenőrzés (ms) - lejárt session felismerése, refresh */
const TICK_MS = 25000;

function decodeJwtBase64(token) {
    if (!token) return null;
    const parts = token.split(".");
    if (parts.length < 2) return null;
    try {
        const b64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
        const padded = b64 + "=".repeat((4 - (b64.length % 4)) % 4);
        const json = decodeURIComponent(
            atob(padded)
                .split("")
                .map((c) => "%" + c.charCodeAt(0).toString(16).padStart(2, "0"))
                .join(""),
        );
        return JSON.parse(json);
    } catch {
        return null;
    }
}

function accessPayload() {
    const token = sessionStorage.getItem(ACCESS);
    return decodeJwtBase64(token);
}

function accessLejarMpMulva() {
    const payload = accessPayload();
    if (!payload?.exp) return null;
    return payload.exp - Date.now() / 1000;
}

export function getUser() {
    const token = sessionStorage.getItem(ID) || sessionStorage.getItem(ACCESS);
    const payload = decodeJwtBase64(token);
    if (!payload) return null;

    if (payload.exp && payload.exp * 1000 < Date.now()) {
        return null;
    }

    return {
        firstName: payload.given_name || "",
        lastName:  payload.family_name || "",
        email:     payload.email || payload.preferred_username || "",
        name:      payload.name || "",
        sub:       payload.sub || "",
    };
}

export function jwtPayloadDecoded(token) {
    return decodeJwtBase64(token);
}

export function teljesNevMegjelenites(user) {
    if (!user) return "";
    const sor = [user.lastName, user.firstName].filter(Boolean).join(" ").trim();
    if (sor) return sor;
    const fallback = (user.name || "").trim();
    if (fallback) return fallback;
    return (user.email || "").trim();
}

/** Védett backend végpontokhoz: automatikusan felteszi a Bearer headert + szükség esetén refresht. */
export async function authedFetch(input, init = {}) {
    await sessionFrissiteseHaKell();
    const access = sessionStorage.getItem(ACCESS);
    const headers = new Headers(init.headers || {});
    if (access) headers.set("Authorization", `Bearer ${access}`);
    if (init.body && !headers.has("Content-Type")) {
        headers.set("Content-Type", "application/json");
    }
    return fetch(input, { ...init, headers });
}

export function apiUrl(path) {
    const base = import.meta.env.VITE_API_URL || "http://localhost:3001";
    return `${base}${path.startsWith("/") ? "" : "/"}${path}`;
}

export function tokenekMentese(tokenAdatok) {
    if (!tokenAdatok) return;
    if (tokenAdatok.access_token)  sessionStorage.setItem(ACCESS, tokenAdatok.access_token);
    if (tokenAdatok.refresh_token) sessionStorage.setItem(REFRESH, tokenAdatok.refresh_token);
    if (tokenAdatok.id_token)      sessionStorage.setItem(ID, tokenAdatok.id_token);
    window.dispatchEvent(new Event("auth-change"));
}

export function kijelentkeztet() {
    sessionStorage.removeItem(ACCESS);
    sessionStorage.removeItem(REFRESH);
    sessionStorage.removeItem(ID);
    window.dispatchEvent(new Event("auth-change"));
}

/**
 * Új access (+ esetleg refresh) token Keycloaktól. CORS: kliensen Web origins + nyilvános kliens.
 */
async function keycloakRefreshAccessToken(refreshToken) {
    const url     = import.meta.env.VITE_KEYCLOAK_URL;
    const realm   = import.meta.env.VITE_KEYCLOAK_REALM;
    const clientId = import.meta.env.VITE_KEYCLOAK_CLIENT_ID;
    if (!url || !realm || !clientId) return false;

    const res = await fetch(`${url}/realms/${realm}/protocol/openid-connect/token`, {
        method:  "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
            grant_type:    "refresh_token",
            refresh_token: refreshToken,
            client_id:     clientId,
        }),
    });
    if (!res.ok) return false;
    const data = await res.json();
    tokenekMentese(data);
    return true;
}

/**
 * Új access/id token a refresh tokennel (pl. Keycloak Account API mentés után),
 * hogy a JWT claimjei - név, e-mail - azonnal frissüljenek a felületen (`useAuth`).
 */
export async function tokenekFrissiteseKenyszeritett() {
    const refresh = sessionStorage.getItem(REFRESH);
    if (!refresh) return false;
    return keycloakRefreshAccessToken(refresh).catch(() => false);
}

/**
 * Ha az access token hamarosan / már lejárt, refresh; ha nem lehet, kijelentkeztet.
 */
export async function sessionFrissiteseHaKell() {
    const refresh = sessionStorage.getItem(REFRESH);
    const access  = sessionStorage.getItem(ACCESS);
    if (!access && !refresh) return;

    const hatralevo = accessLejarMpMulva();
    const lejartVagyKozel = hatralevo == null || hatralevo < REFRESH_SKEW_SEC;

    if (!lejartVagyKozel) return;

    if (!refresh) {
        kijelentkeztet();
        return;
    }

    const ok = await keycloakRefreshAccessToken(refresh).catch(() => false);
    if (!ok) kijelentkeztet();
}

let refreshTimer = null;
let visBound = false;

function inditHatterFrissites() {
    if (refreshTimer == null) {
        refreshTimer = setInterval(() => {
            void sessionFrissiteseHaKell().then(() =>
                window.dispatchEvent(new Event("auth-change")),
            );
        }, TICK_MS);
    }
    if (!visBound) {
        visBound = true;
        document.addEventListener("visibilitychange", () => {
            if (document.visibilityState === "visible") {
                void sessionFrissiteseHaKell().then(() =>
                    window.dispatchEvent(new Event("auth-change")),
                );
            }
        });
    }
}

export function useAuth() {
    const [user, setUser] = useState(getUser);
    useEffect(() => {
        inditHatterFrissites();
        const sync = () => setUser(getUser());
        window.addEventListener("auth-change", sync);
        window.addEventListener("storage", sync);

        void sessionFrissiteseHaKell().then(() => sync());

        return () => {
            window.removeEventListener("auth-change", sync);
            window.removeEventListener("storage", sync);
        };
    }, []);
    return user;
}
