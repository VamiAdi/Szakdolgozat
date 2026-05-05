import { useState, useEffect, useRef } from "react";
import emailjs from "@emailjs/browser";
import { useAuth, getUser, teljesNevMegjelenites } from "../auth";
import "./Kapcsolat.css";

// ─────────────────────────────────────────────
// EmailJS beállítások – ezeket cseréld ki a sajátjaidra!
// Regisztráció: https://www.emailjs.com
//
// 1. Hozz létre egy fiókot az emailjs.com oldalon
// 2. Add hozzá az email szolgáltatódat (pl. Gmail):
//    Email Services → Add New Service
// 3. Hozz létre egy email sablont:
//    Email Templates → Create New Template
//    A sablonban használd ezeket a változókat:
//    {{from_name}}, {{from_email}}, {{subject}}, {{message}}
// 4. Az alábbi három értéket másold be a dashboardról:
//    - PUBLIC_KEY:   Account → General → Public Key
//    - SERVICE_ID:  Email Services → a szolgáltatás neve melletti ID
//    - TEMPLATE_ID: Email Templates → a sablon neve melletti ID
// ─────────────────────────────────────────────

const EMAILJS_PUBLIC_KEY = import.meta.env.VITE_EMAILJS_PUBLIC_KEY;
const EMAILJS_SERVICE_ID = import.meta.env.VITE_EMAILJS_SERVICE_ID;
const EMAILJS_TEMPLATE_ID = import.meta.env.VITE_EMAILJS_TEMPLATE_ID;

const TARGYAK = [
    "Általános kérdés",
    "Szakmai / módszertani kérdés",
    "Technikai probléma",
    "Visszajelzés",
    "Egyéb",
];

export default function Kapcsolat() {
    const user = useAuth();
    const prefilledRef = useRef(false);
    const [form, setForm] = useState({
        nev: "",
        email: "",
        targy: "",
        uzenet: "",
    });
    const [status, setStatus] = useState("idle"); // idle | loading | success | error

    useEffect(() => {
        if (!user) {
            prefilledRef.current = false;
            return;
        }
        if (prefilledRef.current) return;
        prefilledRef.current = true;
        setForm((prev) => ({
            ...prev,
            nev: teljesNevMegjelenites(user),
            email: user.email || "",
        }));
    }, [user]);

    const handleChange = (e) => {
        setForm({ ...form, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setStatus("loading");

        console.log("Küldött adatok:", {
            from_name: form.nev,
            from_email: form.email,
            subject: form.targy,
            message: form.uzenet,
        });

        try {
            await emailjs.send(
                EMAILJS_SERVICE_ID,
                EMAILJS_TEMPLATE_ID,
                {
                    from_name: form.nev,
                    from_email: form.email,
                    subject: form.targy,
                    message: form.uzenet,
                },
                EMAILJS_PUBLIC_KEY
            );
            setStatus("success");
            const u = getUser();
            setForm({
                nev: teljesNevMegjelenites(u),
                email: u?.email || "",
                targy: "",
                uzenet: "",
            });
        } catch (err) {
            console.error("EmailJS hiba:", err);
            setStatus("error");
        }
    };

    const isValid = form.nev && form.email && form.targy && form.uzenet;

    return (
        <div className="kap-page">

            {/* Hero */}
            <section className="kap-hero">
                <div className="kap-hero-inner">
                    <span className="kap-eyebrow">Kapcsolat</span>
                    <h1 className="kap-title">Kérdése van? <em>Írjon nekünk.</em></h1>
                    <p className="kap-subtitle">Szakembereink általában 1-2 munkanapon belül válaszolnak.</p>
                </div>
            </section>

            {/* Tartalom */}
            <section className="kap-body">
                <div className="kap-container">

                    {/* Bal: info */}
                    <div className="kap-info">
                        <div className="kap-info-block">
                            <div className="kap-info-icon">✉</div>
                            <h3>E-mail</h3>
                            <p>info@rehabology.hu</p>
                        </div>
                        <div className="kap-info-block">
                            <div className="kap-info-icon">◷</div>
                            <h3>Válaszidő</h3>
                            <p>1-2 munkanap</p>
                        </div>
                        <div className="kap-info-block">
                            <div className="kap-info-icon">♦</div>
                            <h3>Szakmai kérdések</h3>
                            <p>Gyógytornász szakembereink személyesen válaszolnak minden módszertani kérdésre.</p>
                        </div>
                        <div className="kap-disclaimer">
                            <strong>Fontos:</strong> Ez az űrlap nem helyettesíti az orvosi konzultációt. Sürgős egészségügyi panasz esetén forduljon orvoshoz.
                        </div>
                    </div>

                    {/* Jobb: űrlap */}
                    <div className="kap-form-wrap">
                        {status === "success" ? (
                            <div className="kap-success">
                                <div className="kap-success-icon">✓</div>
                                <h3>Üzenet elküldve!</h3>
                                <p>Köszönjük megkeresését. Szakembereink hamarosan felveszik Önnel a kapcsolatot.</p>
                                <button
                                    className="kap-btn-outline"
                                    onClick={() => setStatus("idle")}
                                >
                                    Új üzenet írása
                                </button>
                            </div>
                        ) : (
                            <form className="kap-form" onSubmit={handleSubmit} noValidate>
                                <div className="kap-field">
                                    <label htmlFor="nev">Teljes név <span>*</span></label>
                                    <input
                                        id="nev"
                                        name="nev"
                                        type="text"
                                        placeholder="pl. Kovács Gergely"
                                        value={form.nev}
                                        onChange={handleChange}
                                        required
                                        disabled={status === "loading"}
                                    />
                                </div>

                                <div className="kap-field">
                                    <label htmlFor="email">E-mail cím <span>*</span></label>
                                    <input
                                        id="email"
                                        name="email"
                                        type="email"
                                        placeholder="pl. kovacs.gergely@email.hu"
                                        value={form.email}
                                        onChange={handleChange}
                                        required
                                        disabled={status === "loading"}
                                    />
                                </div>

                                <div className="kap-field">
                                    <label htmlFor="targy">Üzenet tárgya <span>*</span></label>
                                    <select
                                        id="targy"
                                        name="targy"
                                        value={form.targy}
                                        onChange={handleChange}
                                        required
                                        disabled={status === "loading"}
                                    >
                                        <option value="">Válasszon témát...</option>
                                        {TARGYAK.map((t) => (
                                            <option key={t} value={t}>{t}</option>
                                        ))}
                                    </select>
                                </div>

                                <div className="kap-field">
                                    <label htmlFor="uzenet">Üzenet <span>*</span></label>
                                    <textarea
                                        id="uzenet"
                                        name="uzenet"
                                        rows={5}
                                        placeholder="Írja le kérdését vagy megjegyzését..."
                                        value={form.uzenet}
                                        onChange={handleChange}
                                        required
                                        disabled={status === "loading"}
                                    />
                                </div>

                                {status === "error" && (
                                    <div className="kap-error">
                                        Sajnos hiba történt az elküldés során. Kérjük próbálja újra, vagy írjon közvetlenül az info@rehabology.hu címre.
                                    </div>
                                )}

                                <button
                                    type="submit"
                                    className="kap-btn-primary"
                                    disabled={!isValid || status === "loading"}
                                >
                                    {status === "loading" ? "Küldés..." : "Üzenet elküldése →"}
                                </button>
                            </form>
                        )}
                    </div>

                </div>
            </section>

        </div>
    );
}