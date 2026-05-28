import { useState, useEffect, useCallback, useRef } from "react";
import {
    adminAuthedFetch,
    adminTokenekMentese,
    adminKilepes,
    adminBelepveVan,
    apiUrl,
} from "../adminAuth";
import AdminVideoField from "../components/AdminVideoField";
import { inferVideoMod } from "../videoLink";
import "./Admin.css";

/** Ugyanazok az id-k, mint a Gyakorlatok oldalon. */
const TESTRESZ_OPCIok = [
    { id: "6", nev: "Vállak", oldal: "Előlnézet" },
    { id: "5", nev: "Has", oldal: "Előlnézet" },
    { id: "4", nev: "Csípő", oldal: "Előlnézet" },
    { id: "3", nev: "Comb", oldal: "Előlnézet" },
    { id: "2", nev: "Térd", oldal: "Előlnézet" },
    { id: "1", nev: "Boka", oldal: "Előlnézet" },
    { id: "11", nev: "Nyak", oldal: "Hátulnézet" },
    { id: "10", nev: "Felső hát / lapocka", oldal: "Hátulnézet" },
    { id: "9", nev: "Alsó hát / derék", oldal: "Hátulnézet" },
    { id: "8", nev: "Fartájék", oldal: "Hátulnézet" },
    { id: "7", nev: "Combhajlító", oldal: "Hátulnézet" },
];

const TIPUS_OPCIOK = [
    { id: "nyujtas", nev: "Nyújtás" },
    { id: "erosites", nev: "Erősítés" },
];

/** Tábla edit - szerver rekord másolata űrlapmezőkhöz (kulcs = id). */
function gySorAdatInicializalas(r) {
    return {
        gyakorlat_nev: r.gyakorlat_nev ?? "",
        testresz_id: String(r.testresz_id ?? ""),
        tipus: r.tipus ?? "nyujtas",
        leiras: r.leiras == null ? "" : String(r.leiras),
        ismetlesszam: r.ismetlesszam == null ? "" : String(r.ismetlesszam),
        video_link: r.video_link == null ? "" : String(r.video_link),
        video_mod: inferVideoMod(r.video_link),
    };
}

/** Egyforma kulcs a sorPiszka mapben (/pg → JSON miatt előfordulhat string vagy szám id). */
function gyIdStr(id) {
    return String(id);
}

/** Lista betöltése után tábla szerkesztő állapot törlése + újrakezdés. */
function piszkaGyListabol(lista) {
    const next = {};
    for (const r of lista) {
        next[gyIdStr(r.id)] = gySorAdatInicializalas(r);
    }
    return next;
}

const halozatiSzoveg = /failed to fetch|networkerror/i;

export default function Admin() {
    const [vanSession, setVanSession] = useState(adminBelepveVan);
    const [belepestolt, setBelepestolt] = useState(false);
    const [hiba, setHiba] = useState("");
    const [uzenet, setUzenet] = useState("");
    const [felhasznalo, setFelhasznalo] = useState("");
    const [jelszo, setJelszo] = useState("");
    const [gyLista, setGyLista] = useState([]);
    const [listaToltes, setListaToltes] = useState(false);
    const [mentesTolt, setMentesTolt] = useState(false);

    /** „egy”: űrlap; „csv”: fájl-import. */
    const [gyHozzaadasMod, setGyHozzaadasMod] = useState("egy");
    const [csvFile, setCsvFile] = useState(null);
    const [csvImportToltes, setCsvImportToltes] = useState(false);
    const [csvHibak, setCsvHibak] = useState([]);
    const csvInputRef = useRef(null);

    const [ujNev, setUjNev] = useState("");
    const [ujTestId, setUjTestId] = useState("6");
    const [ujTipus, setUjTipus] = useState("nyujtas");
    const [ujLeiras, setUjLeiras] = useState("");
    const [ujIsm, setUjIsm] = useState("");
    const [ujVideo, setUjVideo] = useState("");
    const [ujVideoMod, setUjVideoMod] = useState("url");
    const [ujVideoPending, setUjVideoPending] = useState(null);

    /** Tábla szerkesztés állapota soronként id alapján */
    const [sorPiszka, setSorPiszka] = useState({});
    /** Fájl mód: kiválasztott, de még nem feltöltött videó soronként */
    const [sorVideoPending, setSorVideoPending] = useState({});
    /** Mely sor mentése/törlése fut éppen */
    const [listaMuveletToltes, setListaMuveletToltes] = useState(null);

    useEffect(() => {
        const onValt = () => setVanSession(adminBelepveVan());
        window.addEventListener("admin-auth-change", onValt);
        return () => window.removeEventListener("admin-auth-change", onValt);
    }, []);

    const listaBetoltese = useCallback(async () => {
        if (!adminBelepveVan()) return;
        setListaToltes(true);
        setHiba("");
        try {
            const res = await adminAuthedFetch(apiUrl("/api/admin/gyakorlatok"));
            const adat = await res.json().catch(() => ({}));
            if (res.status === 401 || res.status === 403) {
                adminKilepes();
                setVanSession(false);
                setHiba(
                    res.status === 403 ? adat.message || "Nincs jogosultság." : "Munkamenet lejárt.",
                );
                setGyLista([]);
                setSorPiszka({});
                return;
            }
            if (!res.ok) {
                setHiba(adat.message || "A lista nem tölthető be.");
                return;
            }
            const lista = adat.gyakorlatok || [];
            setGyLista(lista);
            setSorPiszka(piszkaGyListabol(lista));
            setSorVideoPending({});
        } catch (err) {
            console.error(err);
            setHiba(
                halozatiSzoveg.test(err?.message || "") ? "Nem sikerült a kapcsolat." : "Ismeretlen hiba.",
            );
        } finally {
            setListaToltes(false);
        }
    }, []);

    useEffect(() => {
        if (vanSession) void listaBetoltese();
        else {
            setGyLista([]);
            setSorPiszka({});
        }
    }, [vanSession, listaBetoltese]);

    function piszkaMezoValt(gyId, kulcs, ertek) {
        const k = gyIdStr(gyId);
        setSorPiszka((p) => {
            const cur = p[k];
            if (!cur) return p;
            return {
                ...p,
                [k]: { ...cur, [kulcs]: ertek },
            };
        });
    }

    async function handleSorMentes(gyId) {
        const k = gyIdStr(gyId);
        const sor = gyLista.find((x) => gyIdStr(x.id) === k);
        const p = sorPiszka[k] ?? (sor ? gySorAdatInicializalas(sor) : null);
        const numId = sor != null ? Number(sor.id) : Number(gyId);
        if (!p || !sor || !Number.isInteger(numId) || numId < 1) {
            setHiba("A sor nem menthető - frissítse a listát, majd próbálja újra.");
            return;
        }
        if (p.video_mod === "file" && sorVideoPending[k]) {
            setHiba("A kiválasztott videót még fel kell tölteni, mielőtt menti a sort.");
            return;
        }
        setListaMuveletToltes({ id: numId, muvelet: "mentes" });
        setHiba("");
        setUzenet("");
        try {
            const res = await adminAuthedFetch(apiUrl(`/api/admin/gyakorlatok/${numId}`), {
                method: "PATCH",
                body: JSON.stringify({
                    gyakorlat_nev: p.gyakorlat_nev.trim(),
                    testresz_id: p.testresz_id,
                    tipus: p.tipus,
                    leiras: p.leiras,
                    ismetlesszam: String(p.ismetlesszam ?? "").trim() === "" ? null : Number(p.ismetlesszam),
                    video_link: typeof p.video_link === "string" ? p.video_link.trim() : p.video_link,
                }),
            });
            const adat = await res.json().catch(() => ({}));
            if (res.status === 401 || res.status === 403) {
                adminKilepes();
                setVanSession(false);
                setHiba(res.status === 403 ? adat.message || "Nincs jogosultság." : "Munkamenet lejárt.");
                return;
            }
            if (!res.ok) {
                setHiba(adat.message || "A sor mentése sikertelen.");
                return;
            }
            setUzenet(`Gyakorlat #${numId} mentve.`);
            await listaBetoltese();
        } catch (err) {
            console.error(err);
            setHiba(
                halozatiSzoveg.test(err?.message || "") ? "Nem sikerült a kapcsolat." : "Mentés sikertelen.",
            );
        } finally {
            setListaMuveletToltes(null);
        }
    }

    async function handleSorTorles(gyId, nevRogzitett) {
        const k = gyIdStr(gyId);
        const sor = gyLista.find((x) => gyIdStr(x.id) === k);
        const numId = sor != null ? Number(sor.id) : Number(gyId);
        if (!sor || !Number.isInteger(numId) || numId < 1) {
            setHiba("A sor nem törölhető - frissítse a listát, majd próbálja újra.");
            return;
        }
        if (
            !window.confirm(
                `Biztosan törli ezt a gyakorlatot?\n${nevRogzitett || `#${numId}`}\nHa már szerepel napi sorban, a törlés elutasításra kerül.`,
            )
        ) {
            return;
        }
        setListaMuveletToltes({ id: numId, muvelet: "torles" });
        setHiba("");
        setUzenet("");
        try {
            const res = await adminAuthedFetch(apiUrl(`/api/admin/gyakorlatok/${numId}`), {
                method: "DELETE",
            });
            const adat = await res.json().catch(() => ({}));
            if (res.status === 401 || res.status === 403) {
                adminKilepes();
                setVanSession(false);
                setHiba(res.status === 403 ? adat.message || "Nincs jogosultság." : "Munkamenet lejárt.");
                return;
            }
            if (res.status === 409 || !res.ok) {
                setHiba(adat.message || "Törlés nem sikerült.");
                return;
            }
            setUzenet(`Gyakorlat #${numId} törölve.`);
            await listaBetoltese();
        } catch (err) {
            console.error(err);
            setHiba(
                halozatiSzoveg.test(err?.message || "") ? "Nem sikerült a kapcsolat." : "Törlés sikertelen.",
            );
        } finally {
            setListaMuveletToltes(null);
        }
    }

    function modValtas(mod) {
        setGyHozzaadasMod(mod);
        setHiba("");
        setUzenet("");
        setCsvHibak([]);
        setCsvFile(null);
        if (csvInputRef.current) csvInputRef.current.value = "";
    }

    async function handleCsvImport() {
        setCsvImportToltes(true);
        setUzenet("");
        setCsvHibak([]);
        setHiba("");
        if (!csvFile) {
            setCsvImportToltes(false);
            setCsvHibak([
                {
                    sorszam: null,
                    uzenet: "Válasszon ki egy .csv fájlt, majd kattintson az importálásra.",
                },
            ]);
            return;
        }
        let szoveg;
        try {
            szoveg = await csvFile.text();
        } catch (err) {
            console.error(err);
            setCsvImportToltes(false);
            setCsvHibak([{ sorszam: null, uzenet: "A fájl nem olvasható be (hiba a böngészőben)." }]);
            return;
        }
        try {
            const res = await adminAuthedFetch(apiUrl("/api/admin/gyakorlatok/csv-import"), {
                method: "POST",
                body: JSON.stringify({ csv: szoveg }),
            });
            const adat = await res.json().catch(() => ({}));
            if (res.status === 401 || res.status === 403) {
                adminKilepes();
                setVanSession(false);
                setHiba(res.status === 403 ? adat.message || "Nincs jogosultság." : "Munkamenet lejárt.");
                setCsvImportToltes(false);
                return;
            }
            if (!res.ok) {
                if (Array.isArray(adat.hibak)) {
                    setCsvHibak(adat.hibak);
                } else {
                    setCsvHibak([
                        {
                            sorszam: null,
                            uzenet:
                                typeof adat.message === "string" && adat.message
                                    ? adat.message
                                    : `Import nem sikerült (${res.status}).`,
                        },
                    ]);
                }
                setCsvImportToltes(false);
                return;
            }
            if (!adat.ok || typeof adat.darab !== "number") {
                setCsvHibak([{ sorszam: null, uzenet: "Szerverhiba: hiányzik a darabszám a válaszban." }]);
                setCsvImportToltes(false);
                return;
            }
            setUzenet(`Sikerült importálni ${adat.darab} gyakorlatot.`);
            setCsvFile(null);
            setCsvHibak([]);
            if (csvInputRef.current) csvInputRef.current.value = "";
            await listaBetoltese();
        } catch (err) {
            console.error(err);
            setCsvHibak([
                {
                    sorszam: null,
                    uzenet: halozatiSzoveg.test(err?.message || "")
                        ? "Nem sikerült a kapcsolat."
                        : "Ismeretlen hiba az import közben.",
                },
            ]);
        }
        setCsvImportToltes(false);
    }

    async function handleAdminBelepes(e) {
        e.preventDefault();
        setBelepestolt(true);
        setHiba("");
        setUzenet("");
        if (!felhasznalo.trim() || !jelszo) {
            setHiba("Töltse ki a felhasználónév és jelszó mezőket.");
            setBelepestolt(false);
            return;
        }
        try {
            const res = await fetch(apiUrl("/api/admin/belepes"), {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    felhasznalonev: felhasznalo.trim(),
                    jelszo,
                }),
            });
            const adat = await res.json().catch(() => ({}));
            if (res.status === 403) {
                setHiba(adat.message || "Nincs jogosultság.");
                setJelszo("");
                setBelepestolt(false);
                return;
            }
            if (!res.ok) {
                setHiba(adat.message || "Belépés sikertelen.");
                setJelszo("");
                setBelepestolt(false);
                return;
            }
            adminTokenekMentese(adat);
            setVanSession(true);
            setJelszo("");
            setFelhasznalo("");
        } catch (err) {
            console.error(err);
            setHiba(
                halozatiSzoveg.test(err?.message || "") ? "Nem sikerült a kapcsolat." : "Belépés sikertelen.",
            );
        }
        setBelepestolt(false);
    }

    async function handleUjGyakorlat(e) {
        e.preventDefault();
        setMentesTolt(true);
        setHiba("");
        setCsvHibak([]);
        setUzenet("");
        if (!ujNev.trim()) {
            setHiba("A gyakorlat neve kötelező.");
            setMentesTolt(false);
            return;
        }
        if (ujVideoMod === "file" && ujVideoPending) {
            setHiba("A kiválasztott videót még fel kell tölteni, mielőtt menti a gyakorlatot.");
            setMentesTolt(false);
            return;
        }
        try {
            const res = await adminAuthedFetch(apiUrl("/api/admin/gyakorlatok"), {
                method: "POST",
                body: JSON.stringify({
                    gyakorlat_nev: ujNev.trim(),
                    testresz_id: ujTestId,
                    tipus: ujTipus,
                    leiras: ujLeiras,
                    ismetlesszam: String(ujIsm).trim() === "" ? null : Number(ujIsm),
                    video_link: String(ujVideo).trim(),
                }),
            });
            const adat = await res.json().catch(() => ({}));
            if (res.status === 401 || res.status === 403) {
                adminKilepes();
                setVanSession(false);
                setHiba(res.status === 403 ? adat.message || "Nincs jogosultság." : "Munkamenet lejárt.");
                setMentesTolt(false);
                return;
            }
            if (!res.ok) {
                setHiba(adat.message || "Mentés sikertelen.");
                setMentesTolt(false);
                return;
            }
            setUzenet("Gyakorlat elmentve.");
            setUjNev("");
            setUjLeiras("");
            setUjIsm("");
            setUjVideo("");
            setUjVideoMod("url");
            setUjVideoPending(null);
            await listaBetoltese();
        } catch (err) {
            console.error(err);
            setHiba(
                halozatiSzoveg.test(err?.message || "") ? "Nem sikerült a kapcsolat." : "Mentés sikertelen.",
            );
        }
        setMentesTolt(false);
    }

    if (!vanSession) {
        return (
            <div className="admin-bg">
                <div className="admin-max">
                    <div className="admin-login-kartya">
                        <span className="admin-eyebrow">Rehabology</span>
                        <h1 style={{ textAlign: "center" }}>Admin bejelentkezés</h1>

                        <form onSubmit={handleAdminBelepes}>
                            {hiba && (
                                <div className="admin-hiba" role="alert">
                                    {hiba}
                                </div>
                            )}
                            <div className="admin-mezogroup">
                                <label htmlFor="admin-user">Felhasználónév vagy e-mail</label>
                                <input
                                    id="admin-user"
                                    type="text"
                                    className="admin-input"
                                    autoComplete="username"
                                    value={felhasznalo}
                                    onChange={(e) => setFelhasznalo(e.target.value)}
                                    disabled={belepestolt}
                                />
                            </div>
                            <div className="admin-mezogroup">
                                <label htmlFor="admin-pw">Jelszó</label>
                                <input
                                    id="admin-pw"
                                    type="password"
                                    className="admin-input"
                                    autoComplete="current-password"
                                    value={jelszo}
                                    onChange={(e) => setJelszo(e.target.value)}
                                    disabled={belepestolt}
                                />
                            </div>
                            <button
                                type="submit"
                                className={`admin-btn primary ${belepestolt ? "szurke" : ""}`}
                                disabled={belepestolt}
                            >
                                {belepestolt ? <span className="admin-spinner"></span> : null}
                                Belépés
                            </button>
                        </form>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="admin-bg">
            <div className="admin-max">
                <header className="admin-cim-sor">
                    <div>
                        <span className="admin-eyebrow">Rehabology admin</span>
                        <h1>Gyakorlatok tára</h1>
                    </div>
                    <div style={{ display: "flex", gap: "0.5rem" }}>
                        <button type="button" className="admin-btn ghost" onClick={() => void listaBetoltese()}>
                            Lista frissítése
                        </button>
                        <button type="button" className="admin-btn ghost" onClick={() => adminKilepes()}>
                            Kilépés
                        </button>
                    </div>
                </header>

                <section className="admin-panel">
                    <h2 className="admin-szekcio-cim">Új gyakorlat</h2>
                    <div className="admin-tabs" role="tablist" aria-label="Felvitel módja">
                        <button
                            type="button"
                            role="tab"
                            aria-selected={gyHozzaadasMod === "egy"}
                            className={`admin-tab ${gyHozzaadasMod === "egy" ? "aktiv" : ""}`}
                            onClick={() => modValtas("egy")}
                        >
                            Egy gyakorlat
                        </button>
                        <button
                            type="button"
                            role="tab"
                            aria-selected={gyHozzaadasMod === "csv"}
                            className={`admin-tab ${gyHozzaadasMod === "csv" ? "aktiv" : ""}`}
                            onClick={() => modValtas("csv")}
                        >
                            CSV import
                        </button>
                    </div>

                    {uzenet && (
                        <div className="admin-info" role="status">
                            {uzenet}
                        </div>
                    )}
                    {hiba && (
                        <div className="admin-hiba" role="alert">
                            {hiba}
                        </div>
                    )}
                    {gyHozzaadasMod === "csv" &&
                        csvHibak.length > 0 &&
                        (csvHibak.length === 1 && csvHibak[0].sorszam == null ? (
                            <div className="admin-hiba" role="alert">
                                {csvHibak[0].uzenet}
                            </div>
                        ) : (
                            <div className="admin-hiba admin-hibalista-wrap" role="alert">
                                <strong>Az import nem sikerült ({csvHibak.length} probléma):</strong>
                                <ul className="admin-import-hibalista">
                                    {csvHibak.map((x, ix) => (
                                        <li key={ix}>
                                            {x.sorszam != null ? (
                                                <span className="admin-sorszam">{x.sorszam}. sor: </span>
                                            ) : null}
                                            <span>{x.uzenet}</span>
                                        </li>
                                    ))}
                                </ul>
                                <p className="admin-help" style={{ marginTop: "0.5rem", marginBottom: 0 }}>
                                    A sor száma a fájlban lévő fizikai sor (1 = fejléc; az első adatsor 2).
                                </p>
                            </div>
                        ))}

                    {gyHozzaadasMod === "egy" && (
                        <form onSubmit={handleUjGyakorlat}>
                            <div className="admin-grid">
                                <div className="admin-mezogroup">
                                    <label htmlFor="gy-nev">Gyakorlat neve *</label>
                                    <input
                                        id="gy-nev"
                                        className="admin-input"
                                        value={ujNev}
                                        onChange={(e) => setUjNev(e.target.value)}
                                        placeholder="Pl. Váll nyújtás falnál"
                                    />
                                </div>
                                <div className="admin-mezogroup">
                                    <label htmlFor="gy-test">Testrész</label>
                                    <select
                                        id="gy-test"
                                        className="admin-select"
                                        value={ujTestId}
                                        onChange={(e) => setUjTestId(e.target.value)}
                                    >
                                        {TESTRESZ_OPCIok.map((t) => (
                                            <option key={t.id} value={t.id}>
                                                {t.id} - {t.nev} ({t.oldal})
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                            <div className="admin-grid">
                                <div className="admin-mezogroup">
                                    <label htmlFor="gy-tip">Típus</label>
                                    <select
                                        id="gy-tip"
                                        className="admin-select"
                                        value={ujTipus}
                                        onChange={(e) => setUjTipus(e.target.value)}
                                    >
                                        {TIPUS_OPCIOK.map((t) => (
                                            <option key={t.id} value={t.id}>
                                                {t.nev}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div className="admin-mezogroup">
                                    <label htmlFor="gy-ism">Ismétlésszám (opcionális)</label>
                                    <input
                                        id="gy-ism"
                                        type="number"
                                        min="0"
                                        className="admin-input"
                                        value={ujIsm}
                                        onChange={(e) => setUjIsm(e.target.value)}
                                        placeholder="Pl. 10"
                                    />
                                </div>
                            </div>
                            <div className="admin-mezogroup">
                                <label htmlFor="gy-video-url">Videó (opcionális)</label>
                                <AdminVideoField
                                    id="gy-video-url"
                                    mod={ujVideoMod}
                                    onModChange={setUjVideoMod}
                                    value={ujVideo}
                                    onChange={setUjVideo}
                                    onPendingFileChange={setUjVideoPending}
                                />
                            </div>
                            <div className="admin-mezogroup">
                                <label htmlFor="gy-leir">Leírás</label>
                                <textarea
                                    id="gy-leir"
                                    className="admin-textarea"
                                    value={ujLeiras}
                                    onChange={(e) => setUjLeiras(e.target.value)}
                                    placeholder="Lépésről lépésre utasítások…"
                                />
                            </div>
                            <button
                                type="submit"
                                className={`admin-btn primary ${mentesTolt ? "szurke" : ""}`}
                                disabled={mentesTolt}
                            >
                                {mentesTolt ? <span className="admin-spinner"></span> : null}
                                Gyakorlat mentése
                            </button>
                        </form>
                    )}

                    {gyHozzaadasMod === "csv" && (
                        <div className="admin-csv-blokk">
                            <p className="admin-help" style={{ marginTop: 0 }}>
                                Az első sor legyen <strong>fejléc</strong>. Kötelező oszlopok (név számít, kis- és
                                nagybetű nem): <code>gyakorlat_nev</code>, <code>testresz_id</code>,{" "}
                                <code>tipus</code>. Opcionális: <code>leiras</code>, <code>ismetlesszam</code>,{" "}
                                <code>video_link</code>. Az <code>id</code> oszlop figyelmen kívül marad. A{" "}
                                <code>testresz_id</code> értéke 1–11 (pl. 6 = vállak). A <code>tipus</code> egyezzen
                                a rendszerben használt kulccsal:{" "}
                                {TIPUS_OPCIOK.map((t) => t.id).join(", ")}. Az egész fájl egy tranzakcióban kerül
                                be; ha bármelyik sor hibás, semmi nem kerül mentésre.
                            </p>
                            <div className="admin-csv-sor">
                                <input
                                    ref={csvInputRef}
                                    id="admin-csv-file"
                                    type="file"
                                    accept=".csv,text/csv,text/plain"
                                    className="admin-csv-rejtett"
                                    onChange={(e) => {
                                        const f = e.target.files?.[0] ?? null;
                                        setCsvFile(f);
                                        setCsvHibak([]);
                                        setUzenet("");
                                    }}
                                />
                                <label htmlFor="admin-csv-file" className="admin-btn ghost admin-csv-fajl-label">
                                    Fájl kiválasztása
                                </label>
                                <span className="admin-csv-fajlnev" title={csvFile?.name || ""}>
                                    {csvFile ? csvFile.name : "Nincs kiválasztott fájl"}
                                </span>
                                <button
                                    type="button"
                                    className={`admin-btn primary ${csvImportToltes ? "szurke" : ""}`}
                                    disabled={csvImportToltes}
                                    onClick={() => void handleCsvImport()}
                                >
                                    {csvImportToltes ? <span className="admin-spinner"></span> : null}
                                    Importálás
                                </button>
                            </div>
                        </div>
                    )}
                </section>

                <section className="admin-panel" style={{ marginTop: "1.5rem" }}>
                    <h2 className="admin-szekcio-cim">
                        Létező gyakorlatok ({listaToltes ? "…" : gyLista.length})
                    </h2>
                    {listaToltes && <p style={{ color: "#7a6590", fontSize: "0.9rem" }}>Betöltés…</p>}
                    {!listaToltes && gyLista.length === 0 && (
                        <p style={{ color: "#7a6590", fontSize: "0.9rem" }}>Még egy gyakorlat sincs tárolva.</p>
                    )}
                    {!listaToltes && gyLista.length > 0 && (
                        <div className="admin-tbl-wrap">
                            <table className="admin-tbl">
                                <thead>
                                    <tr>
                                        <th className="cell-id">ID</th>
                                        <th>Név</th>
                                        <th>Testrész</th>
                                        <th>Típus</th>
                                        <th className="cell-ism">Ismétlés</th>
                                        <th className="cell-video">Videó</th>
                                        <th>Leírás</th>
                                        <th className="cell-muv">Művelet</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {gyLista.map((r) => {
                                        const p = sorPiszka[gyIdStr(r.id)] ?? gySorAdatInicializalas(r);
                                        const zaroltEsEz =
                                            listaMuveletToltes != null &&
                                            Number(listaMuveletToltes.id) === Number(r.id);
                                        const tablaMuvFolyamat = listaMuveletToltes != null;
                                        return (
                                            <tr key={r.id}>
                                                <td className="cell-id">{r.id}</td>
                                                <td>
                                                    <input
                                                        className="admin-input admin-tbl-input"
                                                        aria-label={`${r.id} név`}
                                                        value={p.gyakorlat_nev}
                                                        onChange={(e) =>
                                                            piszkaMezoValt(r.id, "gyakorlat_nev", e.target.value)
                                                        }
                                                        disabled={zaroltEsEz}
                                                    />
                                                </td>
                                                <td>
                                                    <select
                                                        className="admin-select admin-tbl-input"
                                                        aria-label={`${r.id} testrész`}
                                                        value={p.testresz_id}
                                                        onChange={(e) =>
                                                            piszkaMezoValt(r.id, "testresz_id", e.target.value)
                                                        }
                                                        disabled={zaroltEsEz}
                                                    >
                                                        {TESTRESZ_OPCIok.map((t) => (
                                                            <option key={t.id} value={t.id}>
                                                                {t.id} - {t.nev}
                                                            </option>
                                                        ))}
                                                    </select>
                                                </td>
                                                <td>
                                                    <select
                                                        className="admin-select admin-tbl-input"
                                                        aria-label={`${r.id} típus`}
                                                        value={p.tipus}
                                                        onChange={(e) =>
                                                            piszkaMezoValt(r.id, "tipus", e.target.value)
                                                        }
                                                        disabled={zaroltEsEz}
                                                    >
                                                        {TIPUS_OPCIOK.map((t) => (
                                                            <option key={t.id} value={t.id}>
                                                                {t.nev}
                                                            </option>
                                                        ))}
                                                    </select>
                                                </td>
                                                <td className="cell-ism">
                                                    <input
                                                        type="number"
                                                        min={0}
                                                        className="admin-input admin-tbl-input admin-tbl-ism"
                                                        aria-label={`${r.id} ismétlés`}
                                                        value={p.ismetlesszam}
                                                        onChange={(e) =>
                                                            piszkaMezoValt(r.id, "ismetlesszam", e.target.value)
                                                        }
                                                        disabled={zaroltEsEz}
                                                        placeholder="-"
                                                    />
                                                </td>
                                                <td className="cell-video">
                                                    <AdminVideoField
                                                        id={`gy-video-${r.id}`}
                                                        compact
                                                        mod={p.video_mod ?? inferVideoMod(p.video_link)}
                                                        onModChange={(ujMod) =>
                                                            piszkaMezoValt(r.id, "video_mod", ujMod)
                                                        }
                                                        value={p.video_link}
                                                        onChange={(ertek) =>
                                                            piszkaMezoValt(r.id, "video_link", ertek)
                                                        }
                                                        onPendingFileChange={(fajl) =>
                                                            setSorVideoPending((prev) => ({
                                                                ...prev,
                                                                [gyIdStr(r.id)]: Boolean(fajl),
                                                            }))
                                                        }
                                                        disabled={zaroltEsEz}
                                                    />
                                                </td>
                                                <td>
                                                    <textarea
                                                        className="admin-textarea admin-tbl-textarea"
                                                        rows={2}
                                                        aria-label={`${r.id} leírás`}
                                                        value={p.leiras}
                                                        onChange={(e) =>
                                                            piszkaMezoValt(r.id, "leiras", e.target.value)
                                                        }
                                                        disabled={zaroltEsEz}
                                                    />
                                                </td>
                                                <td className="cell-muv">
                                                    <div className="admin-tbl-akcio-sor">
                                                        <button
                                                            type="button"
                                                            className={`admin-btn primary admin-btn-kompakt ${
                                                                zaroltEsEz &&
                                                                listaMuveletToltes?.muvelet === "mentes"
                                                                    ? "szurke"
                                                                    : ""
                                                            }`}
                                                            disabled={tablaMuvFolyamat}
                                                            onClick={() => void handleSorMentes(r.id)}
                                                        >
                                                            {zaroltEsEz &&
                                                            listaMuveletToltes?.muvelet === "mentes" ? (
                                                                <span className="admin-spinner"></span>
                                                            ) : null}
                                                            Mentés
                                                        </button>
                                                        <button
                                                            type="button"
                                                            className={`admin-btn veszely admin-btn-kompakt ${
                                                                zaroltEsEz &&
                                                            listaMuveletToltes?.muvelet === "torles"
                                                                    ? "szurke"
                                                                    : ""
                                                            }`}
                                                            disabled={tablaMuvFolyamat}
                                                            onClick={() =>
                                                                void handleSorTorles(
                                                                    r.id,
                                                                    r.gyakorlat_nev || `#${r.id}`,
                                                                )
                                                            }
                                                        >
                                                            {zaroltEsEz &&
                                                            listaMuveletToltes?.muvelet === "torles" ? (
                                                                <span className="admin-spinner"></span>
                                                            ) : null}
                                                            Törlés
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </section>
            </div>
        </div>
    );
}
