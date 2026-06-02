import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { tokenekMentese } from "../auth";
import "./Belepes.css";

function celUtBelepUtan(locationState) {
    const from = locationState?.from;
    if (typeof from === "string" && from.startsWith("/") && !from.startsWith("//")) {
        return from;
    }
    return "/gyakorlatok";
}

const UGYFEL_BELEPES_HIBA = "Hibás e-mail vagy jelszó.";
const UGYFEL_HALOZAT_HIBA = "Nem sikerült kapcsolódni. Próbálja újra.";
const UGYFEL_REG_ALTALANOS = "A regisztráció nem sikerült. Próbálja újra.";
const UGYFEL_REG_FIOK_KESZ =
    "A fiók elkészült. Kérjük, jelentkezzen be ugyanezzel az e-mail címmel és jelszóval.";

/** Szándékosan közérthető API-üzenetek - bármi más → általános hiba. */
const REG_API_FELHASZNALONAK = new Set([
    "Ez az e-mail cím már regisztrálva van.",
    "Minden mező kitöltendő.",
    "A jelszónak legalább 8 karakter hosszúnak kell lennie.",
]);

function halozatiHibaUzenet(err) {
    const m = (err && err.message) || "";
    if (/failed to fetch|networkerror|load failed|network request failed|failed to connect/i.test(m)) {
        return UGYFEL_HALOZAT_HIBA;
    }
    return "";
}

// Keycloak Direct Grant (Resource Owner Password) hívás
// Ez teszi lehetővé az email+jelszó belépést a saját UI-ról.
// Keycloak admin-ban be kell kapcsolni:
//   Clients → rehabology-frontend → Settings → Direct access grants: ON
async function keycloakLogin(email, jelszo) {
    const KEYCLOAK_URL    = import.meta.env.VITE_KEYCLOAK_URL;
    const KEYCLOAK_REALM  = import.meta.env.VITE_KEYCLOAK_REALM;
    const CLIENT_ID       = import.meta.env.VITE_KEYCLOAK_CLIENT_ID;

    const url = `${KEYCLOAK_URL}/realms/${KEYCLOAK_REALM}/protocol/openid-connect/token`;

    const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
            grant_type: "password",
            client_id:  CLIENT_ID,
            username:   email,
            password:   jelszo,
            scope:      "openid profile email",
        }),
    });

    if (!response.ok) {
        throw new Error("login_failed");
    }

    return await response.json();
}

async function apiRegisztracio(firstName, lastName, email, jelszo) {
    const base = import.meta.env.VITE_API_URL || "http://localhost:3001";
    const res = await fetch(`${base}/api/regisztracio`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            firstName,
            lastName,
            email,
            password: jelszo,
        }),
    });
    const adat = await res.json().catch(() => ({}));
    if (!res.ok) {
        const u = typeof adat.message === "string" ? adat.message : "";
        const szoveg = REG_API_FELHASZNALONAK.has(u) ? u : UGYFEL_REG_ALTALANOS;
        throw new Error(szoveg);
    }
    return adat;
}

const tokenMentes = tokenekMentese;

export default function Belepes() {
    const navigate = useNavigate();
    const location = useLocation();
    const [nezet, setNezet] = useState("belepes"); // belepes | regisztracio
    const [form, setForm] = useState({
        firstName: "",
        lastName:  "",
        email:     "",
        jelszo:    "",
        jelszo2:   "",
    });
    const [hiba, setHiba] = useState("");
    const [tolt, setTolt] = useState(false);
    const [jelszoLathato, setJelszoLathato] = useState(false);

    const handleValtozas = (e) => {
        setForm({ ...form, [e.target.name]: e.target.value });
        setHiba("");
    };

    const handleBelepes = async (e) => {
        e.preventDefault();
        if (!form.email || !form.jelszo) { setHiba("Kérjük töltse ki az összes mezőt."); return; }
        setTolt(true);
        setHiba("");
        try {
            const tokenAdatok = await keycloakLogin(form.email, form.jelszo);
            tokenMentes(tokenAdatok);
            navigate(celUtBelepUtan(location.state));
        } catch (err) {
            setHiba(halozatiHibaUzenet(err) || UGYFEL_BELEPES_HIBA);
        } finally {
            setTolt(false);
        }
    };

    const handleRegisztracio = async (e) => {
        e.preventDefault();
        if (!form.firstName.trim() || !form.lastName.trim() || !form.email || !form.jelszo || !form.jelszo2) {
            setHiba("Kérjük töltse ki az összes mezőt."); return;
        }
        if (form.jelszo.length < 8) {
            setHiba("A jelszónak legalább 8 karakter hosszúnak kell lennie."); return;
        }
        if (form.jelszo !== form.jelszo2) {
            setHiba("A két jelszó nem egyezik meg."); return;
        }
        setTolt(true);
        setHiba("");
        try {
            const adat = await apiRegisztracio(form.firstName, form.lastName, form.email, form.jelszo);
            if (adat.access_token) {
                tokenMentes(adat);
                navigate(celUtBelepUtan(location.state));
            } else {
                setHiba(UGYFEL_REG_FIOK_KESZ);
            }
        } catch (err) {
            setHiba(
                halozatiHibaUzenet(err) ||
                    (typeof err.message === "string" &&
                    (REG_API_FELHASZNALONAK.has(err.message) || err.message === UGYFEL_REG_ALTALANOS)
                        ? err.message
                        : UGYFEL_REG_ALTALANOS),
            );
        } finally {
            setTolt(false);
        }
    };

    const valtasNezet = (ujNezet) => {
        setNezet(ujNezet);
        setForm({
            firstName: "",
            lastName:  "",
            email:     "",
            jelszo:    "",
            jelszo2:   "",
        });
        setHiba("");
    };

    return (
        <div className="bp-page">
            <div className="bp-keret">

                {/* Bal panel – branding */}
                {nezet === "belepes" && (
                    <div className="bp-bal">
                        <div className="bp-bal-tartalom">
                            <div className="bp-logo">Rehab<span>ology</span></div>
                            <h2>Üdvözöljük vissza.</h2>
                            <p>Folytassa személyre szabott rehabilitációs programját, és tegyen egy lépést az egészségesebb élet felé.</p>
                            <div className="bp-bal-diszek">
                                <div className="bp-diszko">〜</div>
                                <div className="bp-diszko">◈</div>
                                <div className="bp-diszko">◎</div>
                            </div>
                        </div>
                    </div>
                )}
                {nezet === "regisztracio" && (
                    <div className="bp-bal">
                        <div className="bp-bal-tartalom">
                            <div className="bp-logo">Rehab<span>ology</span></div>
                            <h2>Üdvözöljük.</h2>
                            <p>Készítse el személyre szabott rehabilitációs programját, és tegyen egy lépést az egészségesebb élet felé.</p>
                            <div className="bp-bal-diszek">
                                <div className="bp-diszko">〜</div>
                                <div className="bp-diszko">◈</div>
                                <div className="bp-diszko">◎</div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Jobb panel – űrlap */}
                <div className="bp-jobb">
                    <div className="bp-urlap-doboz">

                        {/* Fül váltó */}
                        <div className="bp-ful-sor">
                            <button
                                className={`bp-ful ${nezet === "belepes" ? "aktiv" : ""}`}
                                onClick={() => valtasNezet("belepes")}
                            >Belépés</button>
                            <button
                                className={`bp-ful ${nezet === "regisztracio" ? "aktiv" : ""}`}
                                onClick={() => valtasNezet("regisztracio")}
                            >Regisztráció</button>
                        </div>

                        {/* ── Belépés form ── */}
                        {nezet === "belepes" && (
                            <form className="bp-form" onSubmit={handleBelepes} noValidate>
                                <div className="bp-mezo">
                                    <label htmlFor="email">E-mail cím</label>
                                    <input
                                        id="email" name="email" type="email"
                                        placeholder="pelda@email.hu"
                                        value={form.email}
                                        onChange={handleValtozas}
                                        disabled={tolt}
                                        autoComplete="email"
                                    />
                                </div>

                                <div className="bp-mezo">
                                    <label htmlFor="jelszo">Jelszó</label>
                                    <div className="bp-jelszo-wrap">
                                        <input
                                            id="jelszo" name="jelszo"
                                            type={jelszoLathato ? "text" : "password"}
                                            placeholder="••••••••"
                                            value={form.jelszo}
                                            onChange={handleValtozas}
                                            disabled={tolt}
                                            autoComplete="current-password"
                                        />
                                        <button
                                            type="button"
                                            className="bp-szem-gomb"
                                            onClick={() => setJelszoLathato(v => !v)}
                                            tabIndex={-1}
                                        >
                                            {jelszoLathato ? "🙈" : "👁"}
                                        </button>
                                    </div>
                                </div>

                                {hiba && <div className="bp-hiba">{hiba}</div>}

                                <button type="submit" className="bp-btn" disabled={tolt}>
                                    {tolt ? <span className="bp-spinner"></span> : "Belépés →"}
                                </button>

                                <p className="bp-elfelejtett">
                                    Elfelejtette jelszavát?{" "}
                                    <a href={`${import.meta.env.VITE_KEYCLOAK_URL}/realms/${import.meta.env.VITE_KEYCLOAK_REALM}/login-actions/reset-credentials`} target="_blank" rel="noreferrer">
                                        Visszaállítás
                                    </a>
                                </p>
                            </form>
                        )}

                        {/* ── Regisztráció form ── */}
                        {nezet === "regisztracio" && (
                            <form className="bp-form" onSubmit={handleRegisztracio} noValidate>
                                <div className="bp-nev-sor">
                                    <div className="bp-mezo">
                                        <label htmlFor="lastName">Vezetéknév</label>
                                        <input
                                            id="lastName"
                                            name="lastName"
                                            type="text"
                                            placeholder="Kovács"
                                            value={form.lastName}
                                            onChange={handleValtozas}
                                            disabled={tolt}
                                            autoComplete="family-name"
                                        />
                                    </div>
                                    <div className="bp-mezo">
                                        <label htmlFor="firstName">Keresztnév</label>
                                        <input
                                            id="firstName"
                                            name="firstName"
                                            type="text"
                                            placeholder="Gergely"
                                            value={form.firstName}
                                            onChange={handleValtozas}
                                            disabled={tolt}
                                            autoComplete="given-name"
                                        />
                                    </div>
                                </div>

                                <div className="bp-mezo">
                                    <label htmlFor="email">E-mail cím</label>
                                    <input
                                        id="email" name="email" type="email"
                                        placeholder="pelda@email.hu"
                                        value={form.email}
                                        onChange={handleValtozas}
                                        disabled={tolt}
                                        autoComplete="email"
                                    />
                                </div>

                                <div className="bp-mezo">
                                    <label htmlFor="jelszo">Jelszó</label>
                                    <div className="bp-jelszo-wrap">
                                        <input
                                            id="jelszo" name="jelszo"
                                            type={jelszoLathato ? "text" : "password"}
                                            placeholder="Minimum 8 karakter"
                                            value={form.jelszo}
                                            onChange={handleValtozas}
                                            disabled={tolt}
                                            autoComplete="new-password"
                                        />
                                        <button
                                            type="button"
                                            className="bp-szem-gomb"
                                            onClick={() => setJelszoLathato(v => !v)}
                                            tabIndex={-1}
                                        >
                                            {jelszoLathato ? "🙈" : "👁"}
                                        </button>
                                    </div>
                                    {form.jelszo.length > 0 && (
                                        <div className="bp-jelszo-ero">
                                            <div className={`bp-ero-sav ${form.jelszo.length >= 8 ? "jo" : "gyenge"}`}></div>
                                            <span>{form.jelszo.length >= 12 ? "Erős jelszó" : form.jelszo.length >= 8 ? "Megfelelő jelszó" : "Túl rövid"}</span>
                                        </div>
                                    )}
                                </div>

                                <div className="bp-mezo">
                                    <label htmlFor="jelszo2">Jelszó megerősítése</label>
                                    <input
                                        id="jelszo2" name="jelszo2"
                                        type={jelszoLathato ? "text" : "password"}
                                        placeholder="••••••••"
                                        value={form.jelszo2}
                                        onChange={handleValtozas}
                                        disabled={tolt}
                                        autoComplete="new-password"
                                    />
                                    {form.jelszo2.length > 0 && form.jelszo !== form.jelszo2 && (
                                        <p className="bp-mezo-hiba">A jelszavak nem egyeznek.</p>
                                    )}
                                </div>

                                {hiba && <div className="bp-hiba">{hiba}</div>}

                                <button type="submit" className="bp-btn" disabled={tolt}>
                                    {tolt ? <span className="bp-spinner"></span> : "Regisztráció →"}
                                </button>
                            </form>
                        )}

                    </div>
                </div>

            </div>
        </div>
    );
}
