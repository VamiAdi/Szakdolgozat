import { useState } from "react";
import emailjs from "@emailjs/browser";
import { useAuth, getUser, teljesNevMegjelenites } from "../auth";
import "./Kapcsolat.css";

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

function kezdoForm(user) {
    return {
        nev: user ? teljesNevMegjelenites(user) : "",
        email: user?.email || "",
        targy: "",
        uzenet: "",
    };
}

function KapcsolatUrlap({ user }) {
    const [form, setForm] = useState(() => kezdoForm(user));
    const [status, setStatus] = useState("idle");

    const handleChange = (e) => {
        setForm({ ...form, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setStatus("loading");

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
            setForm(kezdoForm(getUser()));
        } catch (err) {
            console.error("EmailJS hiba:", err);
            setStatus("error");
        }
    };

    const isValid = form.nev && form.email && form.targy && form.uzenet;

    if (status === "success") {
        return (
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
        );
    }

    return (
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
    );
}

export default function Kapcsolat() {
    const user = useAuth();

    return (
        <div className="kap-page">

            <section className="kap-hero">
                <div className="kap-hero-inner">
                    <span className="kap-eyebrow">Kapcsolat</span>
                    <h1 className="kap-title">Kérdése van? <em>Írjon nekünk.</em></h1>
                    <p className="kap-subtitle">Szakembereink általában 1-2 munkanapon belül válaszolnak.</p>
                </div>
            </section>

            <section className="kap-body">
                <div className="kap-container">

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

                    <div className="kap-form-wrap">
                        <KapcsolatUrlap key={user?.sub ?? "guest"} user={user} />
                    </div>

                </div>
            </section>

        </div>
    );
}
