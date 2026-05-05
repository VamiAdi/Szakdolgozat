import { NavLink } from "react-router-dom";
import "./Footer.css";

export default function Footer() {
    const ev = new Date().getFullYear();

    return (
        <footer className="footer">
            <div className="footer-inner">

                <div className="footer-logo">
                    <span className="footer-logo-text">Rehab<span>ology</span></span>
                    <p>Szakértői gyógytorna a nappalidban.</p>
                </div>

                <nav className="footer-nav">
                    <NavLink to="/gyakorlatok">Gyakorlatok</NavLink>
                    <NavLink to="/hogyan_mukodik">Hogyan működik?</NavLink>
                    <NavLink to="/rolunk">Rólunk</NavLink>
                    <NavLink to="/kapcsolat">Kapcsolat</NavLink>
                </nav>

                <div className="footer-bottom">
                    <span>© {ev} Rehabology. Minden jog fenntartva.</span>
                    <div className="footer-legal">
                        <NavLink to="/adatvedelem">Adatvédelem</NavLink>
                        <NavLink to="/aszf">ÁSZF</NavLink>
                    </div>
                </div>

            </div>
        </footer>
    );
}