import { useEffect, useState } from "react";
import { Route, Routes, useLocation, useNavigate } from "react-router-dom";
import { BarreOnglets } from "./components/BarreOnglets";
import Prix from "./routes/Prix";
import Trajets from "./routes/Trajets";
import Moteurs from "./routes/Moteurs";
import Admin from "./routes/Admin";
import { useAdmin } from "./lib/admin";
import { CARBURANTS, type Carburant, type Tri } from "./lib/format";
import { localiser, type Position } from "./lib/position";
import { T } from "./lib/textes";

const CLE_CARBURANT = "pt-carburant";

function carburantMemorise(): Carburant {
  try {
    const c = localStorage.getItem(CLE_CARBURANT);
    if (c && (CARBURANTS as readonly string[]).includes(c)) return c as Carburant;
  } catch {
    /* stockage indisponible */
  }
  return "SP95-E10";
}

export default function App() {
  const [position, setPosition] = useState<Position | null>(null);
  const [carburant, setCarburantEtat] = useState<Carburant>(carburantMemorise);
  const [tri, setTri] = useState<Tri>("prix");
  const { admin } = useAdmin();
  const nav = useNavigate();
  const { pathname } = useLocation();

  useEffect(() => {
    localiser().then(setPosition);
  }, []);

  const setCarburant = (c: Carburant) => {
    setCarburantEtat(c);
    try {
      localStorage.setItem(CLE_CARBURANT, c);
    } catch {
      /* stockage indisponible */
    }
  };

  const lieu = position ? (position.source === "gps" ? T.autourDeMoi : position.label) : "…";

  return (
    <div className="app">
      <header className="top">
        <h1 className="brand">
          {T.marque} <b>{T.marqueEt}</b> {T.marqueFin}
        </h1>
        <div className="topr">
          <div className="where" data-el="lieu">{lieu}</div>
          {admin && (
            <button type="button" className="gear" data-el="bouton-moteurs" aria-label={T.moteursBouton} title={T.moteursTitre} aria-pressed={pathname.startsWith("/moteurs")} onClick={() => nav("/moteurs")}>
              <span aria-hidden="true">⚙</span>
            </button>
          )}
        </div>
      </header>
      <Routes>
        <Route path="/trajets" element={<Trajets position={position} />} />
        <Route path="/moteurs" element={<Moteurs />} />
        <Route path="/admin" element={<Admin />} />
        <Route path="*" element={<Prix position={position} carburant={carburant} setCarburant={setCarburant} tri={tri} setTri={setTri} />} />
      </Routes>
      <BarreOnglets />
    </div>
  );
}
