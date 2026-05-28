import { useNavigate } from "react-router-dom";
import "./Fooldal.css"


function Fooldal(){
    const navigate = useNavigate();

    return (
        <div className="container">
            <div className="hero-inner">
                <span className="hero-eyebrow">Szakértők által összeállított program</span>
                <h1 className="hero-title">
                    Szüntesse meg az ülőmunka okozta fájdalmat <em>napi 10 percben</em>
                </h1>
                <div className="hero-divider"></div>
                <p className="hero-sub">
                    Nem egy általános fitneszprogramot kínálunk - célzott gyógytorna
                    gyakorlatokat a nappalijában, amelyek valóban működnek.
                </p>
                <button className="hero-btn" onClick={() => navigate("/gyakorlatok")}>
                    Gyakorlatok böngészése
                    <svg viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M3 8h10M9 4l4 4-4 4" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                </button>
            </div>
        </div>
    );
}

export default Fooldal
