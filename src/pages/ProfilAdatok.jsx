import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth, teljesNevMegjelenites, tokenekFrissiteseKenyszeritett } from "../auth";
import "./Profil.css";

// Teljes név egy mezőben: "Vezetéknév Keresztnév" (első szó vezetéknév)
function nevSorbolKeycloakMezők(nev) {
    const parts = nev.trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return { firstName: "", lastName: "" };
    if (parts.length === 1) return { firstName: parts[0], lastName: "" };
    return { lastName: parts[0], firstName: parts.slice(1).join(" ") };
}

async function adatokFrissitese(form) {
    const token = sessionStorage.getItem("kc_access_token");
    const KEYCLOAK_URL   = import.meta.env.VITE_KEYCLOAK_URL;
    const KEYCLOAK_REALM = import.meta.env.VITE_KEYCLOAK_REALM;

    const { firstName, lastName } = nevSorbolKeycloakMezők(form.nev);

    const res = await fetch(`${KEYCLOAK_URL}/realms/${KEYCLOAK_REALM}/account`, {
        method: "POST",
        headers: {
            "Content-Type":  "application/json",
            "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify({ firstName, lastName, email: form.email }),
    });

    if (!res.ok) throw new Error("Az adatok mentése sikertelen.");
}

async function jelszoValtoztatas(jelenlegiJelszo, ujJelszo) {
    const token = sessionStorage.getItem("kc_access_token");
    const KEYCLOAK_URL   = import.meta.env.VITE_KEYCLOAK_URL;
    const KEYCLOAK_REALM = import.meta.env.VITE_KEYCLOAK_REALM;

    const res = await fetch(
        `${KEYCLOAK_URL}/realms/${KEYCLOAK_REALM}/account/credentials/password`,
        {
            method: "POST",
            headers: {
                "Content-Type":  "application/json",
                "Authorization": `Bearer ${token}`,
            },
            body: JSON.stringify({
                currentPassword: jelenlegiJelszo,
                newPassword:     ujJelszo,
                confirmation:    ujJelszo,
            }),
        }
    );

    if (!res.ok) throw new Error("A jelszóváltoztatás sikertelen. Ellenőrizze a jelenlegi jelszót.");
}

export default function ProfilAdatok() {
    const navigate = useNavigate();
    const user = useAuth();
    const lastSub = useRef("");

    const [form, setForm] = useState({
        nev:   "",
        email: "",
    });
    const [jelszoForm, setJelszoForm] = useState({
        jelenlegiJelszo: "",
        ujJelszo:        "",
        ujJelszo2:       "",
    });

    useEffect(() => {
        if (!user?.sub) {
            lastSub.current = "";
            return;
        }
        if (lastSub.current === user.sub) return;
        lastSub.current = user.sub;
        setForm({
            nev:   teljesNevMegjelenites(user),
            email: user.email || "",
        });
    }, [user]);

    const [adatTolt, setAdatTolt]     = useState(false);
    const [jelszoTolt, setJelszoTolt] = useState(false);
    const [adatSiker, setAdatSiker]   = useState(false);
    const [jelszoSiker, setJelszoSiker] = useState(false);
    const [adatHiba, setAdatHiba]     = useState("");
    const [jelszoHiba, setJelszoHiba] = useState("");

    const handleAdatValtozas = (e) => {
        setForm({ ...form, [e.target.name]: e.target.value });
        setAdatSiker(false);
        setAdatHiba("");
    };

    const handleJelszoValtozas = (e) => {
        setJelszoForm({ ...jelszoForm, [e.target.name]: e.target.value });
        setJelszoSiker(false);
        setJelszoHiba("");
    };

    const handleAdatMentes = async (e) => {
        e.preventDefault();
        if (!form.nev || !form.email) { setAdatHiba("Kérjük töltse ki az összes mezőt."); return; }
        setAdatTolt(true);
        setAdatHiba("");
        try {
            await adatokFrissitese(form);
            await tokenekFrissiteseKenyszeritett();
            setAdatSiker(true);
        } catch (err) {
            setAdatHiba(err.message);
        } finally {
            setAdatTolt(false);
        }
    };

    const handleJelszoMentes = async (e) => {
        e.preventDefault();
        if (!jelszoForm.jelenlegiJelszo || !jelszoForm.ujJelszo || !jelszoForm.ujJelszo2) {
            setJelszoHiba("Kérjük töltse ki az összes mezőt."); return;
        }
        if (jelszoForm.ujJelszo.length < 8) {
            setJelszoHiba("Az új jelszónak legalább 8 karakter hosszúnak kell lennie."); return;
        }
        if (jelszoForm.ujJelszo !== jelszoForm.ujJelszo2) {
            setJelszoHiba("A két jelszó nem egyezik meg."); return;
        }
        setJelszoTolt(true);
        setJelszoHiba("");
        try {
            await jelszoValtoztatas(jelszoForm.jelenlegiJelszo, jelszoForm.ujJelszo);
            setJelszoSiker(true);
            setJelszoForm({ jelenlegiJelszo: "", ujJelszo: "", ujJelszo2: "" });
        } catch (err) {
            setJelszoHiba(err.message);
        } finally {
            setJelszoTolt(false);
        }
    };

    return (
        <div className="pr-page">

            <section className="pr-hero">
                <div className="pr-hero-inner">
                    <button className="pr-vissza-gomb" onClick={() => navigate("/profil")}>
                        ← Vissza a profilhoz
                    </button>
                    <div>
                        <span className="pr-eyebrow">Fiók beállítások</span>
                        <h1 className="pr-cim">Adatok szerkesztése</h1>
                    </div>
                </div>
            </section>

            <div className="pr-tartalom pr-adatok-tartalom">

                {/* Személyes adatok */}
                <div className="pr-szekció-doboz">
                    <h2 className="pr-szekció-cim">Személyes adatok</h2>
                    <form className="pr-form" onSubmit={handleAdatMentes} noValidate>
                        <div className="pr-mezo">
                            <label htmlFor="nev">Teljes név</label>
                            <input
                                id="nev" name="nev" type="text"
                                value={form.nev}
                                onChange={handleAdatValtozas}
                                disabled={adatTolt}
                            />
                        </div>
                        <div className="pr-mezo">
                            <label htmlFor="email">E-mail cím</label>
                            <input
                                id="email" name="email" type="email"
                                value={form.email}
                                onChange={handleAdatValtozas}
                                disabled={adatTolt}
                            />
                        </div>

                        {adatHiba  && <div className="pr-hiba">{adatHiba}</div>}
                        {adatSiker && <div className="pr-siker">✓ Adatok sikeresen mentve.</div>}

                        <button type="submit" className="pr-btn" disabled={adatTolt}>
                            {adatTolt ? <span className="pr-spinner"></span> : "Mentés"}
                        </button>
                    </form>
                </div>

                {/* Jelszóváltoztatás */}
                <div className="pr-szekció-doboz">
                    <h2 className="pr-szekció-cim">Jelszó módosítása</h2>
                    <form className="pr-form" onSubmit={handleJelszoMentes} noValidate>
                        <div className="pr-mezo">
                            <label htmlFor="jelenlegiJelszo">Jelenlegi jelszó</label>
                            <input
                                id="jelenlegiJelszo" name="jelenlegiJelszo" type="password"
                                placeholder="••••••••"
                                value={jelszoForm.jelenlegiJelszo}
                                onChange={handleJelszoValtozas}
                                disabled={jelszoTolt}
                                autoComplete="current-password"
                            />
                        </div>
                        <div className="pr-mezo">
                            <label htmlFor="ujJelszo">Új jelszó</label>
                            <input
                                id="ujJelszo" name="ujJelszo" type="password"
                                placeholder="Minimum 8 karakter"
                                value={jelszoForm.ujJelszo}
                                onChange={handleJelszoValtozas}
                                disabled={jelszoTolt}
                                autoComplete="new-password"
                            />
                        </div>
                        <div className="pr-mezo">
                            <label htmlFor="ujJelszo2">Új jelszó megerősítése</label>
                            <input
                                id="ujJelszo2" name="ujJelszo2" type="password"
                                placeholder="••••••••"
                                value={jelszoForm.ujJelszo2}
                                onChange={handleJelszoValtozas}
                                disabled={jelszoTolt}
                                autoComplete="new-password"
                            />
                            {jelszoForm.ujJelszo2.length > 0 && jelszoForm.ujJelszo !== jelszoForm.ujJelszo2 && (
                                <p className="pr-mezo-hiba">A jelszavak nem egyeznek.</p>
                            )}
                        </div>

                        {jelszoHiba  && <div className="pr-hiba">{jelszoHiba}</div>}
                        {jelszoSiker && <div className="pr-siker">✓ Jelszó sikeresen megváltoztatva.</div>}

                        <button type="submit" className="pr-btn" disabled={jelszoTolt}>
                            {jelszoTolt ? <span className="pr-spinner"></span> : "Jelszó módosítása"}
                        </button>
                    </form>
                </div>

                {/* Fiók törlése */}
                <div className="pr-szekció-doboz pr-veszelyes">
                    <h2 className="pr-szekció-cim pr-veszelyes-cim">Figyelem!</h2>
                    <p>A fiók törlése visszavonhatatlan. Minden adata, beleértve az előrehaladási naplót, véglegesen törlésre kerül.</p>
                    <button className="pr-btn-torles">Fiók törlése</button>
                </div>

            </div>
        </div>
    );
}
