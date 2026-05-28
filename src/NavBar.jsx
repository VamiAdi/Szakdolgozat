import { NavLink, useNavigate } from "react-router-dom";
import { useAuth, kijelentkeztet } from "./auth";
import './App.css';


function NavBar() {
    const user = useAuth();
    const navigate = useNavigate();

    const handleKilepes = () => {
        kijelentkeztet();
        navigate("/", { replace: true });
    };

    return (
        <>
            <nav className="nav-bar">
                <div className="nav-left">
                    <NavLink to="/">
                        <img src="/RehabologyLogo.png" alt="Rehabology Logo" height="75px" />
                    </NavLink>
                </div>
                <div className="nav-right">
                    <NavLink
                        className={({ isActive }) => isActive ? "nav-link active" : "nav-link"}
                        to="/gyakorlatok"
                    >
                        Gyakorlatok
                    </NavLink>
                    <NavLink
                        className={({ isActive }) => isActive ? "nav-link active" : "nav-link"}
                        to="/hogyan_mukodik"
                    >
                        Hogyan működik?
                    </NavLink>
                    <NavLink
                        className={({ isActive }) => isActive ? "nav-link active" : "nav-link"}
                        to="/rolunk"
                    >
                        Rólunk
                    </NavLink>
                    <NavLink
                        className={({ isActive }) => isActive ? "nav-link active" : "nav-link"}
                        to="/kapcsolat"
                    >
                        Kapcsolat
                    </NavLink>

                    {user ? (
                        <>
                            <NavLink
                                className={({ isActive }) =>
                                    isActive ? "nav-button nav-button-active" : "nav-button"
                                }
                                to="/profil"
                                title={user.email}
                            >
                                {user.firstName || user.name || "Profil"}
                            </NavLink>
                            <button
                                type="button"
                                className="nav-link nav-link-button"
                                onClick={handleKilepes}
                            >
                                Kilépés
                            </button>
                        </>
                    ) : (
                        <NavLink
                            className={({ isActive }) =>
                                isActive ? "nav-button nav-button-active" : "nav-button"
                            }
                            to="/belepes"
                        >
                            Belépés
                        </NavLink>
                    )}
                </div>
            </nav>
        </>
    );
}

export default NavBar
