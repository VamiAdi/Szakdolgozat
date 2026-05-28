import { useState, useEffect } from "react";
import { authedFetch, apiUrl, useAuth, getUser } from "../auth";
import "./Gyakorlatok.css";

const TESTRESZEK = [
    { id: "6",  nev: "Vállak",              front: true,  cx: 65, cy: 88  },
    { id: "5",  nev: "Has",                 front: true,  cx: 100, cy: 158 },
    { id: "4",  nev: "Csípő",               front: true,  cx: 125, cy: 190 },
    { id: "3",  nev: "Comb",                front: true,  cx: 80, cy: 230 },
    { id: "2",  nev: "Térd",                front: true,  cx: 118, cy: 270 },
    { id: "1",  nev: "Boka",                front: true,  cx: 88, cy: 335 },
    { id: "11", nev: "Nyak",                front: false, cx: 100, cy: 57  },
    { id: "10", nev: "Felső hát / lapocka", front: false, cx: 100, cy: 110 },
    { id: "9",  nev: "Alsó hát / derék",    front: false, cx: 100, cy: 155 },
    { id: "8",  nev: "Fartájék",            front: false, cx: 120, cy: 190 },
    { id: "7",  nev: "Combhajlító",         front: false, cx: 82, cy: 240 },
];

const PROGRAM_OSSZEHIBA = "Sajnáljuk, a program most nem állítható össze. Próbálja újra később.";
const PROGRAM_HALOZAT_HIBA = "Nem sikerült kapcsolódni. Próbálja újra.";

const PROGRAMTIPUSOK = [
    {
        id: "nyujtas",
        nev: "Nyújtó program",
        ikon: "〜",
        leiras: "Feszültségoldó nyújtások, amelyek felszabadítják az összehúzódott izmokat és növelik a mozgástartományt.",
    },
    {
        id: "erosites",
        nev: "Erősítő program",
        ikon: "◈",
        leiras: "Célzott izomerősítés, amely stabilitást épít és megelőzi a panaszok visszatérését.",
    },
    {
        id: "komplex",
        nev: "Komplex rehabilitáció",
        ikon: "◎",
        leiras: "Szakemberek által összeállított, teljes körű program: mobilizáció, aktiváció és stabilizáció egyben.",
    },
];

const GYAKORLAT_TIPUS_CIMKE = {
    nyujtas: "Nyújtás",
    erosites: "Erősítés",
};

function gyakorlatTipusCimke(tipus) {
    if (tipus == null || String(tipus).trim() === "") return "";
    const k = String(tipus).trim().toLowerCase();
    return GYAKORLAT_TIPUS_CIMKE[k] ?? tipus;
}

import VideoEmbed from "../components/VideoEmbed";

function GyakorlatMedia({ videoLink }) {
    const hasVideo = videoLink != null && String(videoLink).trim() !== "";

    return (
        <div className={`gy-pl-video ${hasVideo ? "gy-pl-video--has-video" : ""}`}>
            {hasVideo ? (
                <div
                    className="gy-pl-video-inner"
                    onClick={(e) => e.preventDefault()}
                    onKeyDown={(e) => e.stopPropagation()}
                >
                    <VideoEmbed videoLink={videoLink} className="gy-pl-video-elem" />
                </div>
            ) : null}
        </div>
    );
}

function BodySVG({ view, kivalasztott, onKattint }) {
    const testreszek = TESTRESZEK.filter(t => t.front === (view === "front"));

    return (
        <svg viewBox="0 0 200 370" className="body-svg" xmlns="http://www.w3.org/2000/svg">
            {testreszek.map(t => (
                <g key={t.id} onClick={() => onKattint(t.id)} className="body-zone">
                    <circle
                        cx={t.cx}
                        cy={t.cy}
                        r="16"
                        className={`zone-circle ${kivalasztott.includes(t.id) ? "zone-active" : ""}`}
                    />
                    <text
                        x={t.cx}
                        y={t.cy}
                        className="zone-label"
                        textAnchor="middle"
                        dominantBaseline="central"
                    >
                        {kivalasztott.includes(t.id) ? "✓" : "+"}
                    </text>
                </g>
            ))}
        </svg>
    );
}

export default function Gyakorlatok() {
    const user = useAuth();

    const [kivalasztott, setKivalasztott] = useState([]);
    const [programTipus, setProgramTipus] = useState(null);
    const [allapot, setAllapot] = useState(() => (getUser() ? "betoltes" : "valasztas"));
    const [apiHiba, setApiHiba] = useState("");
    const [napiSor, setNapiSor] = useState([]);
    const [aktivProgram, setAktivProgram] = useState(null);

    useEffect(() => {
        let cancelled = false;
        (async () => {
            if (!user) {
                setAllapot("valasztas");
                return;
            }
            try {
                const res = await authedFetch(apiUrl("/api/profil/program"));
                const data = await res.json().catch(() => ({}));
                if (cancelled) return;

                if (res.ok && data.program) {
                    setAktivProgram(data.program);
                    const napiRes = await authedFetch(apiUrl("/api/napi-gyakorlat"));
                    const napiData = await napiRes.json().catch(() => ({}));
                    if (cancelled) return;
                    if (napiRes.ok) {
                        setNapiSor(napiData.napiSor || []);
                        setAllapot("eredmeny");
                        return;
                    }
                }
                setAllapot("valasztas");
            } catch (err) {
                console.error("Program / napi sor lekérése sikertelen:", err);
                if (!cancelled) setAllapot("valasztas");
            }
        })();
        return () => { cancelled = true; };
    }, [user]);

    const toggleTestresz = (id) => {
        setKivalasztott(prev =>
            prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id],
        );
    };

    const kivalasztottNevek = kivalasztott
        .map(id => TESTRESZEK.find(t => t.id === id)?.nev)
        .filter(Boolean);

    const bekuldhet = kivalasztott.length > 0 && programTipus !== null;
    const bejelentkezve = Boolean(user?.sub);

    const handleBekuldes = async () => {
        if (!bekuldhet) return;
        setAllapot("feldolgozas");
        setApiHiba("");

        try {
            if (!bejelentkezve) {
                const res = await fetch(apiUrl("/gyakorlatok"), {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        testreszek: kivalasztott,
                        tipus: programTipus,
                    }),
                });
                const data = await res.json().catch(() => ({}));
                if (!res.ok) {
                    setApiHiba(data.message || PROGRAM_OSSZEHIBA);
                    setAllapot("valasztas");
                    return;
                }
                setNapiSor(Array.isArray(data.napiSor) ? data.napiSor : []);
                setAktivProgram({ testreszek: [...kivalasztott], program_tipus: programTipus });
                setAllapot("eredmeny");
                return;
            }

            const res = await authedFetch(apiUrl("/api/profil/program"), {
                method: "POST",
                body: JSON.stringify({
                    testreszek: kivalasztott,
                    programTipus: programTipus,
                }),
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok) {
                console.error("Program mentés HTTP:", res.status, data);
                setApiHiba(data.message || PROGRAM_OSSZEHIBA);
                setAllapot("valasztas");
                return;
            }
            setNapiSor(data.napiSor || []);
            setAktivProgram(data.program || { testreszek: kivalasztott.map(String), program_tipus: programTipus });
            setAllapot("eredmeny");
        } catch (error) {
            console.error("Hiba a program mentésekor:", error);
            const uzenet = /failed to fetch|networkerror|load failed/i.test(error.message || "")
                ? PROGRAM_HALOZAT_HIBA
                : PROGRAM_OSSZEHIBA;
            setApiHiba(uzenet);
            setAllapot("valasztas");
        }
    };

    const handleUjra = () => {
        setKivalasztott([]);
        setProgramTipus(null);
        setApiHiba("");
        setNapiSor([]);
        setAktivProgram(null);
        setAllapot("valasztas");
    };

    const handleElvegezveValtas = async (napiId, ujErtek) => {
        if (napiId == null) return;
        setNapiSor(prev => prev.map(g => (g.id === napiId ? { ...g, elvegezve: ujErtek } : g)));
        try {
            const res = await authedFetch(apiUrl(`/api/napi-gyakorlat/${napiId}`), {
                method: "PATCH",
                body: JSON.stringify({ elvegezve: ujErtek }),
            });
            if (!res.ok) throw new Error("HTTP " + res.status);
        } catch (err) {
            console.error("Elvegezve frissítése sikertelen:", err);
            setNapiSor(prev => prev.map(g => (g.id === napiId ? { ...g, elvegezve: !ujErtek } : g)));
        }
    };

    if (allapot === "betoltes") {
        return (
            <div className="gy-page">
                <div className="gy-loading">
                    <div className="gy-spinner"></div>
                    <h2>Betöltés...</h2>
                </div>
            </div>
        );
    }

    if (allapot === "feldolgozas") {
        return (
            <div className="gy-page">
                <div className="gy-loading">
                    <div className="gy-spinner"></div>
                    <h2>Program összeállítása folyamatban...</h2>
                    <p>Szakembereink a kiválasztott területek alapján személyre szabják a gyakorlatokat.</p>
                    <div className="gy-tag-sor" style={{ justifyContent: "center", marginTop: "1.5rem" }}>
                        {kivalasztottNevek.map(nev => (
                            <span key={nev} className="gy-tag">{nev}</span>
                        ))}
                        <span className="gy-tag gy-tag-tipus">
                            {PROGRAMTIPUSOK.find(p => p.id === programTipus)?.nev}
                        </span>
                    </div>
                </div>
            </div>
        );
    }

    if (allapot === "eredmeny") {
        const aktivTipus = aktivProgram?.program_tipus || programTipus;
        const aktivTestreszek = aktivProgram?.testreszek || kivalasztott;
        const tipusNev = PROGRAMTIPUSOK.find(p => p.id === aktivTipus)?.nev;
        const tipusIkon = PROGRAMTIPUSOK.find(p => p.id === aktivTipus)?.ikon;
        const aktivTestreszNevek = aktivTestreszek
            .map(id => TESTRESZEK.find(t => t.id === String(id))?.nev)
            .filter(Boolean);

        const keszSzam = napiSor.filter(g => g.elvegezve).length;
        const rowKey = (g, idx) =>
            g.id != null ? g.id : `gy-${g.gyakorlat_id}-${idx}`;

        return (
            <div className="gy-page">
                <div className="gy-eredmeny-oldal">
                    <div className="gy-eredmeny-hero">
                        <span className="gy-eyebrow">
                            {bejelentkezve ? "Mai gyakorlatsor" : "Ajánlott gyakorlatok"}
                        </span>
                        <div className="gy-eredmeny-ikon">{tipusIkon}</div>
                        <h2>{tipusNev}</h2>
                        <div className="gy-tag-sor">
                            {aktivTestreszNevek.map(nev => (
                                <span key={nev} className="gy-tag">{nev}</span>
                            ))}
                        </div>
                        {!bejelentkezve && (
                            <p className="gy-guest-uzenet">
                                <a href="/belepes">Jelentkezzen be,</a> ha el szeretné menteni a programját,
                                napi személyes sort kapni és nyomon követni a teljesítést.
                            </p>
                        )}
                        {bejelentkezve && napiSor.length > 0 && (
                            <p className="gy-haladas-szoveg">
                                Haladás: <strong>{keszSzam} / {napiSor.length}</strong> gyakorlat elvégezve
                            </p>
                        )}
                    </div>

                    <div className="gy-eredmeny-lista">
                        {napiSor.length === 0 ? (
                            <div className="gy-hamarosan">
                                <span className="gy-hamarosan-ikon">◎</span>
                                <p>A megadott szempontokra nem találtunk gyakorlatot.</p>
                            </div>
                        ) : (
                            napiSor.map((gyakorlat, index) =>
                                bejelentkezve ? (
                                    <label
                                        key={rowKey(gyakorlat, index)}
                                        className={`gy-gyakorlat-kartya gy-kartya-belepve ${gyakorlat.elvegezve ? "kesz" : ""}`}
                                    >
                                        <div className="gy-pl-szam">{String(index + 1).padStart(2, "0")}</div>
                                        <GyakorlatMedia videoLink={gyakorlat.video_link} />
                                        <div className="gy-pl-info">
                                            <h3>{gyakorlat.gyakorlat_nev || "Gyakorlat"}</h3>
                                            <p>{gyakorlat.leiras}</p>
                                            <div className="gy-pl-meta">
                                                {gyakorlat.tipus && (
                                                    <span className="gy-tag">{gyakorlatTipusCimke(gyakorlat.tipus)}</span>
                                                )}
                                                {gyakorlat.ismetlesszam != null && (
                                                    <span className="gy-tag">{gyakorlat.ismetlesszam} ismétlés</span>
                                                )}
                                            </div>
                                        </div>
                                        <div className="gy-checkbox-wrap">
                                            <input
                                                type="checkbox"
                                                className="gy-checkbox"
                                                checked={!!gyakorlat.elvegezve}
                                                onChange={(e) =>
                                                    handleElvegezveValtas(gyakorlat.id, e.target.checked)
                                                }
                                                aria-label="Elvégezve"
                                            />
                                            <span className="gy-checkbox-cimke">
                                                {gyakorlat.elvegezve ? "Elvégezve" : "Elvégzem"}
                                            </span>
                                        </div>
                                    </label>
                                ) : (
                                    <div
                                        key={rowKey(gyakorlat, index)}
                                        className="gy-gyakorlat-kartya gy-vendeg"
                                    >
                                        <div className="gy-pl-szam">{String(index + 1).padStart(2, "0")}</div>
                                        <GyakorlatMedia videoLink={gyakorlat.video_link} />
                                        <div className="gy-pl-info">
                                            <h3>{gyakorlat.gyakorlat_nev || "Gyakorlat"}</h3>
                                            <p>{gyakorlat.leiras}</p>
                                            <div className="gy-pl-meta">
                                                {gyakorlat.tipus && (
                                                    <span className="gy-tag">{gyakorlatTipusCimke(gyakorlat.tipus)}</span>
                                                )}
                                                {gyakorlat.ismetlesszam != null && (
                                                    <span className="gy-tag">{gyakorlat.ismetlesszam} ismétlés</span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ),
                            )
                        )}
                    </div>

                    <button className="gy-btn-outline" onClick={handleUjra}>
                        ← Új program összeállítása
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="gy-page">

            <section className="gy-hero">
                <span className="gy-eyebrow">Gyakorlat-tár</span>
                <h1 className="gy-title">Melyik területen <em>érez panaszt?</em></h1>
                <p className="gy-sub">Jelölje be a fájdalmas testrész(ek)et, válasszon programtípust, és mi összeállítjuk az Önre szabott gyakorlatsort.</p>
            </section>

            {/* 1. lépés: Testtérkép */}
            <section className="gy-step">
                <div className="gy-step-fejlec">
                    <div className="gy-step-num">1</div>
                    <div>
                        <h2>Válassza ki az érintett testrészt</h2>
                        <p>Kattintson a <strong>+</strong> jelre. Több területet is kijelölhet egyszerre.</p>
                    </div>
                </div>

                <div className="gy-ket-test">
                    <div className="gy-test-oldal">
                        <p className="gy-test-label">Előlnézet</p>
                        <div className="body-svg-wrap">
                            <img
                                src="human-body-front.jpg"
                                alt=""
                                className="body-svg-hatter"
                                draggable="false"
                            />
                            <BodySVG
                                view="front"
                                kivalasztott={kivalasztott}
                                onKattint={toggleTestresz}
                            />
                        </div>
                    </div>

                    <div className="gy-test-oldal">
                        <p className="gy-test-label">Hátulnézet</p>
                        <div className="body-svg-wrap">
                            <img
                                src="/human-body-back.jpg"
                                alt=""
                                className="body-svg-hatter"
                                draggable="false"
                            />
                            <BodySVG
                                view="back"
                                kivalasztott={kivalasztott}
                                onKattint={toggleTestresz}
                            />
                        </div>
                    </div>
                </div>

                {kivalasztott.length > 0 && (
                    <div className="gy-kivalasztott">
                        <p className="gy-kivalasztott-label">Kijelölt területek:</p>
                        <div className="gy-tag-sor">
                            {kivalasztottNevek.map(nev => (
                                <span key={nev} className="gy-tag">{nev}</span>
                            ))}
                        </div>
                    </div>
                )}
            </section>

            {/* 2. lépés: Program típusa */}
            <section className="gy-step gy-step-alt">
                <div className="gy-step-fejlec">
                    <div className="gy-step-num">2</div>
                    <div>
                        <h2>Milyen típusú programot szeretne?</h2>
                        <p>Válasszon egyet az alábbi lehetőségek közül.</p>
                    </div>
                </div>

                <div className="gy-tipusok">
                    {PROGRAMTIPUSOK.map(tip => (
                        <button
                            key={tip.id}
                            className={`gy-tipus-card ${programTipus === tip.id ? "active" : ""}`}
                            onClick={() => setProgramTipus(tip.id)}
                        >
                            <span className="gy-tipus-ikon">{tip.ikon}</span>
                            <h3>{tip.nev}</h3>
                            <p>{tip.leiras}</p>
                            {programTipus === tip.id && <span className="gy-tipus-check">✓</span>}
                        </button>
                    ))}
                </div>
            </section>

            {/* 3. lépés: Beküldés */}
            <section className="gy-step gy-step-cta">
                <div className="gy-step-fejlec">
                    <div className={`gy-step-num ${!bekuldhet ? "szurke" : ""}`}>3</div>
                    <div>
                        <h2>Program összeállítása</h2>
                        <p>
                            {!kivalasztott.length && !programTipus
                                ? "Válasszon testrészt és programtípust a folytatáshoz."
                                : !kivalasztott.length
                                ? "Jelöljön be legalább egy testrészt."
                                : !programTipus
                                ? "Válasszon programtípust."
                                : `Minden kész — ${kivalasztottNevek.join(", ")} · ${PROGRAMTIPUSOK.find(p => p.id === programTipus)?.nev}`
                            }
                        </p>
                    </div>
                </div>

                {apiHiba && (
                    <p className="gy-api-hiba" role="alert">{apiHiba}</p>
                )}

                <button
                    className={`gy-btn-primary ${!bekuldhet ? "szurke" : ""}`}
                    onClick={handleBekuldes}
                    disabled={!bekuldhet}
                >
                    Gyakorlatsor összeállítása →
                </button>
            </section>

        </div>
    );
}
