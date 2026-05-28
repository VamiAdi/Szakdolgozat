import { useNavigate } from "react-router-dom";
import "./HogyanMukodik.css";
import { useState } from "react";
import ExpertPortrait, { KATI_PORTRAIT, TOZSER_ANITA_PORTRAIT } from "../components/ExpertPortrait";

const faqs = [
    {
        q: "Mit tegyek, ha nem érzem a javulást?",
        a: "A rehabilitációs folyamat egyénenként különböző ütemben halad. Ha 3-4 hét rendszeres gyakorlás után sem tapasztal javulást, javasoljuk, hogy keresse fel személyesen a szakemberünket, vagy váltson egy másik, az Ön panaszaihoz jobban illeszkedő programra. A haladás napló segít az objektív értékelésben."
    },
    {
        q: "Lehet-e izomlázam a gyógytornától?",
        a: "Igen, enyhe izomláz teljesen normális jelenség, különösen az első 1-2 hétben. Ez azt jelzi, hogy az addig keveset használt izmok aktiválódnak. Ha az izomláz erős vagy 72 óránál tovább tart, csökkentse az ismétlésszámot, és adjon több pihenőidőt az izmoknak."
    },
    {
        q: "Kell-e bármilyen eszköz a gyakorlatokhoz?",
        a: "Programjaink nagy többsége teljesen eszközigény nélkül elvégezhető — csak egy kényelmes, sík felületre van szüksége. Néhány haladóbb gyakorlatnál javasolhatunk egy ellenállás szalagot vagy jógamatracot, de ezek mindig opcionálisak és feltüntetett helyettesítőkkel bírnak."
    }
];

export default function HogyanMukodik() {
    const navigate = useNavigate();
    const [openFaq, setOpenFaq] = useState(null);

    return (
        <div className="hm-page">

            {/* 1. Hero */}
            <section className="hm-hero">
                <div className="hm-hero-inner">
                    <span className="hm-eyebrow">Módszertan</span>
                    <h1 className="hm-hero-title">Nem csak torna –<br /><em>precízen felépített rehabilitáció</em></h1>
                    <p className="hm-hero-sub">Értse meg, mi történik a testében, és miért pont ezek a gyakorlatok hozzák el a hosszú távú enyhülést.</p>
                    <p className="hm-hero-body">Az irodai munka okozta panaszok nem egyik napról a másikra alakulnak ki – és a tartós gyógyulás sem azonnali. Módszertanunk a modern fizioterápia alapelveire épül, strukturált logika mentén, amelyet minden programunkba beépítünk.</p>
                    <div className="hm-arrow">↓</div>
                </div>
            </section>

            {/* 2. 3 Pillér */}
            <section className="hm-pillars">
                <div className="hm-container">
                    <h2 className="hm-section-title">A „Miért működik?" logika</h2>
                    <div className="hm-pillars-grid">
                        <div className="hm-pillar-card">
                            <div className="hm-pillar-icon">
                                <svg viewBox="0 0 48 48" fill="none"><circle cx="24" cy="24" r="20" stroke="#CE93D8" strokeWidth="2"/><path d="M16 24c0-4.4 3.6-8 8-8s8 3.6 8 8" stroke="#8E24AA" strokeWidth="2.5" strokeLinecap="round"/><path d="M20 28c0 2.2 1.8 4 4 4s4-1.8 4-4" stroke="#CE93D8" strokeWidth="2" strokeLinecap="round"/></svg>
                            </div>
                            <h3>Mobilizáció</h3>
                            <p className="hm-pillar-sub">Feszültségoldás</p>
                            <p>Az első lépés a statikus ülés okozta letapadások feloldása. Megnyitjuk a mozgástartományt, hogy a test képes legyen helyesen mozogni.</p>
                        </div>
                        <div className="hm-pillar-card hm-pillar-featured">
                            <div className="hm-pillar-icon">
                                <svg viewBox="0 0 48 48" fill="none"><circle cx="24" cy="24" r="20" stroke="#CE93D8" strokeWidth="2"/><path d="M24 14v6M24 28v6M14 24h6M28 24h6" stroke="#8E24AA" strokeWidth="2.5" strokeLinecap="round"/></svg>
                            </div>
                            <h3>Aktiváció</h3>
                            <p className="hm-pillar-sub">Az izmok „felébresztése"</p>
                            <p>Beindítjuk azokat a mélyizmokat, amelyek a gerinc tartásáért felelnek, és az ülőmunka során szinte teljesen kikapcsolnak.</p>
                        </div>
                        <div className="hm-pillar-card">
                            <div className="hm-pillar-icon">
                                <svg viewBox="0 0 48 48" fill="none"><circle cx="24" cy="24" r="20" stroke="#CE93D8" strokeWidth="2"/><path d="M24 16l6 10H18l6-10z" stroke="#8E24AA" strokeWidth="2" strokeLinejoin="round"/><path d="M18 26l-2 6M30 26l2 6" stroke="#CE93D8" strokeWidth="2" strokeLinecap="round"/></svg>
                            </div>
                            <h3>Stabilizáció</h3>
                            <p className="hm-pillar-sub">Hosszú távú védelem</p>
                            <p>Megerősítjük az ízületek körüli tartóizmokat. Ez a fázis építi fel azt a „páncélt", amely megvédi Önt a jövőbeli panaszoktól.</p>
                        </div>
                    </div>
                    <p className="hm-pillars-closing">Komplex programunk ezt a háromlépcsős logikai ívet követi a tartós eredményért.</p>
                </div>
            </section>

            {/* 3. Biztonság */}
            <section className="hm-safety">
                <div className="hm-container">
                    <h2 className="hm-section-title hm-title-dark">Az Ön biztonsága az első</h2>
                    <div className="hm-safety-grid">
                        <div className="hm-safety-text">
                            <p>Bár a gyakorlatokat szakemberek állították össze, az otthoni torna során elengedhetetlen a felelősségteljes használat. Kérjük, ismerje meg azokat a jelzéseket, amelyek esetén a tornát azonnal abba kell hagyni, és szakorvost kell felkeresni.</p>
                            <p>Programjaink fokozatosan épülnek fel — mindig a saját testének jelzéseire hallgatva haladjon, ne a program ütemezésére.</p>
                        </div>
                        <div className="hm-safety-cards">
                            <div className="hm-safety-card">
                                <div className="hm-safety-card-icon">⊘</div>
                                <h4>Mikor ne tornázzon?</h4>
                                <ul>
                                    <li>Láz vagy akut fertőzés esetén</li>
                                    <li>Friss sérülés (48 órán belül)</li>
                                    <li>Erős, éles, kisugárzó fájdalom</li>
                                    <li>Orvos által tiltott mozgás</li>
                                </ul>
                            </div>
                            <div className="hm-safety-card">
                                <div className="hm-safety-card-icon">!</div>
                                <h4>A „vészfék" szabály</h4>
                                <p>Ha a gyakorlat közben éles, szúró fájdalmat érez — különösen ha a végtagokba sugárzik —, azonnal hagyja abba és pihenjen. Ez nem az „érzés", amit keresünk.</p>
                            </div>
                        </div>
                    </div>
                    <button className="hm-btn-outline">
                        <a className="hm-link-to-faq" href="#hm-faq">
                            Gyakori kérdések a biztonságról →
                        </a>
                    </button>
                </div>
            </section>

            {/* 4. Folyamat lépések */}
            <section className="hm-steps">
                <div className="hm-container">
                    <h2 className="hm-section-title">Hogyan használja az alkalmazást?</h2>
                    <div className="hm-steps-row">
                        {[
                            { icon: "◎", title: "Terület kiválasztása", desc: "Kattintson a fájdalmas testrészre az interaktív testtérképen." },
                            { icon: "▶", title: "Instrukciók megismerése", desc: "Nézze meg a gyógytornász részletes videós bemutatóját." },
                            { icon: "♦", title: "Végrehajtás", desc: "Végezze el a gyakorlatot a lépésről lépésre szóló leírás alapján." },
                            { icon: "↗", title: "Haladás naplózása", desc: "Rögzítse az eredményt a személyes dashboardon." },
                        ].map((step, i) => (
                            <div className="hm-step" key={i}>
                                <div className="hm-step-icon">{step.icon}</div>
                                <h4>{step.title}</h4>
                                <p>{step.desc}</p>
                                {i < 3 && <div className="hm-step-arrow">→</div>}
                            </div>
                        ))}
                    </div>
                    <div className="hm-steps-cta">
                        <button className="hm-btn-primary" onClick={() => navigate("/gyakorlatok")}>
                            Próbálja ki a folyamatot
                        </button>
                    </div>
                </div>
            </section>

            {/* 5. Szakértők */}
            <section className="hm-experts">
                <div className="hm-container">
                    <h2 className="hm-section-title hm-title-dark">Ki garantálja a szakmaiságot?</h2>
                    <div className="hm-experts-grid">
                        <div className="hm-expert-card">
                            <ExpertPortrait src={KATI_PORTRAIT} alt="Páli Katalin arckép" size="sm" />
                            <div className="hm-expert-info">
                                <h4>Páli Katalin</h4>
                                <p className="hm-expert-title">MSc Fizioterápia</p>
                                <p className="hm-expert-focus">Budapesti Honvéd Sportegyesület gyógytornásza és a Testnevelési Egyetem óraadója. </p>
                            </div>
                        </div>
                        <div className="hm-expert-card">
                            <ExpertPortrait src={TOZSER_ANITA_PORTRAIT} alt="Tőzsér Anita arckép" size="sm" />
                            <div className="hm-expert-info">
                                <h4>Tőzsér Anita</h4>
                                <p className="hm-expert-title">MSc Fizioterápia, ötletgazda</p>
                                <p className="hm-expert-focus">Debreceni Egyetemi Atlétikai Club gyógytornásza.</p>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* 6. FAQ */}
            <section className="hm-faq" id="hm-faq">
                <div className="hm-container">
                    <h2 className="hm-section-title">Kérdések a módszertanról</h2>
                    <div className="hm-faq-list">
                        {faqs.map((item, i) => (
                            <div className="hm-faq-item" key={i}>
                                <button
                                    className={`hm-faq-q${openFaq === i ? " open" : ""}`}
                                    onClick={() => setOpenFaq(openFaq === i ? null : i)}
                                >
                                    <span>{item.q}</span>
                                    <span className="hm-faq-toggle">{openFaq === i ? "-" : "+"}</span>
                                </button>
                                {openFaq === i && (
                                    <div className="hm-faq-a">{item.a}</div>
                                )}
                            </div>
                        ))}
                    </div>
                    <p className="hm-faq-closing">Nem találja a választ? <button className="hm-link-btn" onClick={() => navigate("/kapcsolat")}>Írjon nekünk szakmai kérdést →</button></p>
                </div>
            </section>

            {/* 7. CTA */}
            <section className="hm-cta">
                <div className="hm-cta-inner">
                    <h2>Kész tenni az egészségéért?</h2>
                    <p>Válassza ki a problémás területet, és kezdje el a szakszerű, biztonságos tornát még ma.</p>
                    <button className="hm-btn-inverse" onClick={() => navigate("/gyakorlatok")}>
                        Ugrás a Gyakorlat-tárhoz
                    </button>
                </div>
            </section>

        </div>
    );
}
