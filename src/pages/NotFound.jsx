import { useNavigate, useLocation } from "react-router-dom";
import "./NotFound.css";

export default function NotFound() {
    const navigate = useNavigate();
    const { pathname } = useLocation();

    return (
        <div className="nf-page">
            <div className="nf-inner">
                <div className="nf-szam">404</div>
                <span className="nf-eyebrow">Oldal nem található</span>
                <h1 className="nf-cim">Ez az oldal nem létezik</h1>
                <p className="nf-szoveg">
                    A <code className="nf-url">{pathname}</code> címen nem találtunk tartalmat.
                    Lehet, hogy elgépelte a címet, vagy az oldalt áthelyezték.
                </p>
                <div className="nf-gombok">
                    <button className="nf-btn-primary" onClick={() => navigate("/")}>
                        Vissza a főoldalra
                    </button>
                    <button className="nf-btn-outline" onClick={() => navigate(-1)}>
                        ← Előző oldal
                    </button>
                </div>
            </div>
        </div>
    );
}
