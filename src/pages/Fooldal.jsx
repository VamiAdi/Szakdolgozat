import { useNavigate } from "react-router-dom"; 
import "./Fooldal.css"


function Fooldal(){

    const navigate = useNavigate();


    // return (
    //     <div className="container">
    //             <h3>Szakértők által összeállított, célzott gyógytorna gyakorlatok a nappalijában...</h3>
    //             <h1>Szüntesse meg az ülőmunka okozta fájdalmat napi 10 percben</h1>
    //             <p>Nem egy általános fitneszprogramot kínálunk...</p>
    //             <button onClick={() => navigate("/gyakorlatok")}>
    //                 Gyakorlatok böngészése
    //             </button>
    //     </div>
    // );

    return (
        <div className="container">
            <div className="hero-inner">
                <span className="hero-eyebrow">Szakértők által összeállított program</span>
                <h1 className="hero-title">
                    Szüntesse meg az ülőmunka okozta fájdalmat <em>napi 10 percben</em>
                </h1>
                <div className="hero-divider"></div>
                <p className="hero-sub">
                    Nem egy általános fitneszprogramot kínálunk — célzott gyógytorna
                    gyakorlatokat a nappalijában, amelyek valóban működnek.
                </p>
                <button className="hero-btn" onClick={() => navigate("/gyakorlatok")}>
                    Gyakorlatok böngészése
                    <svg viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M3 8h10M9 4l4 4-4 4" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                </button>
                {/* <div className="hero-trust">
                    <svg viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg">
                        <path d="M8 1l1.8 3.6L14 5.3l-3 2.9.7 4.1L8 10.4l-3.7 1.9.7-4.1-3-2.9 4.2-.7z" fill="#AB47BC"/>
                    </svg>
                    Több ezer elégedett felhasználó bízik bennünk
                </div> */}
            </div>
        </div>
    );
}

export default Fooldal