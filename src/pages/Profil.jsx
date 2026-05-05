import { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth, teljesNevMegjelenites, authedFetch, apiUrl } from "../auth";
import "./Profil.css";

const HONAP_NEVEK = [
    "Január","Február","Március","Április","Május","Június",
    "Július","Augusztus","Szeptember","Október","November","December"
];
const NAP_NEVEK = ["H","K","Sze","Cs","P","Szo","V"];

/** A naptárban ennél korábbi hónapra nem lehet lapozni (január = 0). */
const NAPTAR_LEGKORABBI_EV = 2026;
const NAPTAR_LEGKORABBI_HONAP = 0;

function datumKulcs(ev, honap, nap) {
    return `${ev}-${String(honap + 1).padStart(2,"0")}-${String(nap).padStart(2,"0")}`;
}

function Naptar({ haladas }) {
    const ma = new Date();
    const [ev, setEv] = useState(ma.getFullYear());
    const [honap, setHonap] = useState(ma.getMonth());

    const elozoHonap = () => {
        if (ev === NAPTAR_LEGKORABBI_EV && honap === NAPTAR_LEGKORABBI_HONAP) return;
        if (honap === 0) { setEv(e => e - 1); setHonap(11); }
        else setHonap(h => h - 1);
    };
    const kovetkezoHonap = () => {
        const most = new Date();
        if (ev > most.getFullYear() || (ev === most.getFullYear() && honap >= most.getMonth())) return;
        if (honap === 11) { setEv(e => e + 1); setHonap(0); }
        else setHonap(h => h + 1);
    };

    const jovobeli = ev > ma.getFullYear() || (ev === ma.getFullYear() && honap >= ma.getMonth());
    const legkorabbiHonap =
        ev === NAPTAR_LEGKORABBI_EV && honap === NAPTAR_LEGKORABBI_HONAP;

    const napok = useMemo(() => {
        const elsoNap = new Date(ev, honap, 1).getDay();
        // Hétfőtől induljon (0=H ... 6=V)
        const eltolasMH = (elsoNap + 6) % 7;
        const napokSzama = new Date(ev, honap + 1, 0).getDate();
        return { eltolasMH, napokSzama };
    }, [ev, honap]);

    // Statisztika az aktuális hónapra
    const honapiTeljes = useMemo(() => {
        return Object.entries(haladas).filter(([k, v]) => {
            const [kev, khonap] = k.split("-");
            return parseInt(kev) === ev && parseInt(khonap) === honap + 1 && v === "teljes";
        }).length;
    }, [haladas, ev, honap]);

    return (
        <div className="pr-naptar">
            {/* Fejléc */}
            <div className="pr-naptar-fejlec">
                <button
                    className={`pr-nav-gomb ${legkorabbiHonap ? "letiltva" : ""}`}
                    onClick={elozoHonap}
                    disabled={legkorabbiHonap}
                >
                    ‹
                </button>
                <span className="pr-honap-cim">{HONAP_NEVEK[honap]} {ev}</span>
                <button
                    className={`pr-nav-gomb ${jovobeli ? "letiltva" : ""}`}
                    onClick={kovetkezoHonap}
                    disabled={jovobeli}
                >›</button>
            </div>

            {/* Napok nevei */}
            <div className="pr-naptar-grid">
                {NAP_NEVEK.map(n => (
                    <div key={n} className="pr-nap-nev">{n}</div>
                ))}

                {/* Üres cellák az első nap előtt */}
                {Array.from({ length: napok.eltolasMH }).map((_, i) => (
                    <div key={`ures-${i}`} className="pr-nap-cella ures" />
                ))}

                {/* Napok */}
                {Array.from({ length: napok.napokSzama }, (_, i) => i + 1).map(nap => {
                    const kulcs = datumKulcs(ev, honap, nap);
                    const allapot = haladas[kulcs];
                    const maE = nap === ma.getDate() && honap === ma.getMonth() && ev === ma.getFullYear();
                    const jovoE = new Date(ev, honap, nap) > ma;
                    return (
                        <div
                            key={nap}
                            className={`pr-nap-cella ${allapot || ""} ${maE ? "ma" : ""} ${jovoE ? "jovobeli" : ""}`}
                            title={allapot === "teljes" ? "Teljesített nap" : allapot === "reszleges" ? "Részlegesen teljesített" : ""}
                        >
                            <span className="pr-nap-szam">{nap}</span>
                        </div>
                    );
                })}
            </div>

            {/* Jelmagyarázat */}
            <div className="pr-jelmagyjarat">
                <div className="pr-jelm-elem">
                    <span className="pr-jelm-szin teljes"></span>
                    <span>Minden gyakorlat teljesítve</span>
                </div>
                <div className="pr-jelm-elem">
                    <span className="pr-jelm-szin reszleges"></span>
                    <span>Részlegesen teljesítve</span>
                </div>
            </div>

            <p className="pr-honap-stat">
                Ebben a hónapban <strong>{honapiTeljes} teljes napot</strong> teljesített.
            </p>
        </div>
    );
}

export default function Profil() {
    const navigate = useNavigate();
    const user = useAuth();
    const nev = teljesNevMegjelenites(user);

    const [haladas, setHaladas] = useState({});

    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                const res = await authedFetch(apiUrl("/api/profil/haladas"));
                if (!res.ok) return;
                const data = await res.json();
                if (!cancelled) setHaladas(data || {});
            } catch (err) {
                console.error("Haladás lekérése sikertelen:", err);
            }
        })();
        return () => {
            cancelled = true;
        };
    }, [user?.sub]);

    // Összesítő statisztikák
    const teljesNapok   = Object.values(haladas).filter(v => v === "teljes").length;
    const reszlegesNapok = Object.values(haladas).filter(v => v === "reszleges").length;
    const osszes        = teljesNapok + reszlegesNapok;

    // Jelenlegi sorozat (streak) számítása
    const streak = useMemo(() => {
        let s = 0;
        const ma = new Date();
        for (let i = 0; i < 365; i++) {
            const d = new Date(ma);
            d.setDate(ma.getDate() - i);
            const k = datumKulcs(d.getFullYear(), d.getMonth(), d.getDate());
            if (haladas[k] === "teljes") s++;
            else break;
        }
        return s;
    }, [haladas]);

    // const monogram = (nev || "?").trim().charAt(0).toUpperCase() || "?";

    return (
        <div className="pr-page">

            {/* Fejléc */}
            <section className="pr-hero">
                <div className="pr-hero-inner">
                    {/* <div className="pr-avatar">{monogram}</div> */}
                    <div className="pr-hero-szoveg">
                        <span className="pr-eyebrow">Profil</span>
                        <h1 className="pr-cim">{nev || "Profil"}</h1>
                    </div>
                    <button
                        className="pr-adatok-gomb"
                        onClick={() => navigate("/profil/adatok")}
                    >
                        Adatok szerkesztése →
                    </button>
                </div>
            </section>

            <div className="pr-tartalom">

                {/* Statisztikák */}
                <div className="pr-statisztikak">
                    <div className="pr-stat-kartya">
                        <span className="pr-stat-szam">{teljesNapok}</span>
                        <span className="pr-stat-nev">Teljes nap</span>
                    </div>
                    <div className="pr-stat-kartya">
                        <span className="pr-stat-szam">{reszlegesNapok}</span>
                        <span className="pr-stat-nev">Részleges nap</span>
                    </div>
                    <div className="pr-stat-kartya">
                        <span className="pr-stat-szam">{osszes}</span>
                        <span className="pr-stat-nev">Összes aktív nap</span>
                    </div>
                    <div className="pr-stat-kartya kiemelve">
                        <span className="pr-stat-szam">{streak}</span>
                        <span className="pr-stat-nev">Jelenlegi sorozat 🔥</span>
                    </div>
                </div>

                {/* Naptár */}
                <Naptar haladas={haladas} />

            </div>
        </div>
    );
}
