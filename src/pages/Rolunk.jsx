import "./Rolunk.css";
import ExpertPortrait, { KATI_PORTRAIT, TOZSER_ANITA_PORTRAIT } from "../components/ExpertPortrait";

const CSAPAT = [
    {
        nev: "Páli Katalin",
        szerep: "MSc Fizioterápia",
        bio: "Budapesti Honvéd Sportegyesület gyógytornásza és a Testnevelési Egyetem óraadója.",
        foto: KATI_PORTRAIT,
        fotoAlt: "Páli Katalin arckép",
    },
    {
        nev: "Tőzsér Anita",
        szerep: "MSc Fizioterápia, ötletgazda",
        bio: "Debreceni Egyetemi Atlétikai Club gyógytornásza.",
        foto: TOZSER_ANITA_PORTRAIT,
        fotoAlt: "Tőzsér Anita arckép",
    },
];

export default function Rolunk() {
    return (
        <div className="ro-page">

            {/* Hero */}
            <section className="ro-hero">
                <span className="ro-eyebrow">Rólunk</span>
                <h1 className="ro-title">Akik mögötte <em>állnak</em></h1>
            </section>

            {/* Csapat */}
            <section className="ro-team">
                <div className="ro-team-grid">
                    {CSAPAT.map((tag, i) => (
                        <div className="ro-card" key={i}>
                            <ExpertPortrait
                                src={tag.foto}
                                alt={tag.fotoAlt ?? tag.nev}
                                size="md"
                            />
                            <h3>{tag.nev}</h3>
                            <p className="ro-szerep">{tag.szerep}</p>
                            <p className="ro-bio">{tag.bio}</p>
                        </div>
                    ))}
                </div>
            </section>

            {/* Értékek */}
            <section className="ro-values">
                <div className="ro-values-grid">
                    {[
                        { ikon: "◎", cim: "Szakmaiság ", leiras: "Gyakorlataink tárát képzett gyógytornászok és fizioterápiás szakemberek állítják össze, a legfrissebb tudományos irányelvek alapján." },
                        { ikon: "♦", cim: "Biztonság", leiras: "Hiszünk abban, hogy az otthoni torna csak akkor hatékony, ha felelősségteljesen végzik. Ezért minden programunkba beépítettük a szükséges biztonsági útmutatókat." },
                        { ikon: "↗", cim: "Elérhetőség", leiras: "A rehabilitáció nem lehet privilégium. Célunk, hogy minőségi gyógytornász tudás bárhonnan, bármikor elérhető legyen - a nappaliban is." },
                    ].map((e, i) => (
                        <div className="ro-value" key={i}>
                            <span className="ro-value-ikon">{e.ikon}</span>
                            <h4>{e.cim}</h4>
                            <p>{e.leiras}</p>
                        </div>
                    ))}
                </div>
            </section>

        </div>
    );
}
