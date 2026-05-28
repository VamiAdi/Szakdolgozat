import './App.css';
import {
    BrowserRouter as Router,
    Routes,
    Route,
    useLocation,
} from "react-router-dom";
import ScrollToTop from "./ScrollToTop";
import NavBar from "./NavBar";
import Fooldal from "./pages/Fooldal"
import Gyakorlatok from "./pages/Gyakorlatok";
import HogyanMukodik from "./pages/HogyanMukodik";
import Rolunk from "./pages/Rolunk";
import Belepes from "./pages/Belepes";
import Profil from "./pages/Profil";
import Kapcsolat from "./pages/Kapcsolat";
import Footer from "./Footer";
import ProfilAdatok from "./pages/ProfilAdatok";
import VedettUt from "./VedettUt";
import Admin from "./pages/Admin";
import NotFound from "./pages/NotFound";


function Utak() {
    const { pathname } = useLocation();
    const adminOldal = pathname.startsWith("/admin");

    return (
        <>
            {!adminOldal && <NavBar />}
            <Routes>
                <Route path="/" element={<Fooldal />} />
                <Route path="/gyakorlatok" element={<Gyakorlatok />} />
                <Route path="/hogyan_mukodik" element={<HogyanMukodik />} />
                <Route path="/rolunk" element={<Rolunk />} />
                <Route path="/belepes" element={<Belepes />} />
                <Route path="/profil" element={<VedettUt><Profil /></VedettUt>} />
                <Route path="/kapcsolat" element={<Kapcsolat />} />
                <Route path="/profil/adatok" element={<VedettUt><ProfilAdatok /></VedettUt>} />
                <Route path="/admin" element={<Admin />} />
                <Route path="*" element={<NotFound />} />
            </Routes>
            {!adminOldal && <Footer />}
        </>
    );
}

function App() {
    return (
        <Router>
            <ScrollToTop />
            <Utak />
        </Router>
    );
/*return (
      <>
          <h1>
            Hello to my Szakdolgozat!
          </h1>
          <p>
            Itt remélhetőleg valami mesés fog félév végén állni
          </p>

      </>
  )*/
}

export default App
