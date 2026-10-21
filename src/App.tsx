import { useEffect, useMemo, useRef, useState } from "react";
import { Navigate, Route, Routes, useLocation, useNavigate } from "react-router-dom";
import { BarreOnglets } from "./components/BarreOnglets";
import Stations from "./routes/Stations";
import Trajet from "./routes/Trajet";
import MaVoiture from "./routes/MaVoiture";
import EnRoutePage from "./routes/EnRoutePage";
import FinDeTrajet from "./routes/FinDeTrajet";
import Historique from "./routes/Historique";
import Moteurs from "./routes/Moteurs";
import Admin from "./routes/Admin";
import { CARBURANTS, type Carburant, type Tri } from "./lib/format";
import { localiser, positionCourante, type Position } from "./lib/position";
import { enregistreur } from "./lib/plateforme";
import { lireArrete } from "./lib/historique";
import { useEnregistrement, useVoitureV1 } from "./lib/useEnregistrement";
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
  const voiture = useVoitureV1();
  const [carburant, setCarburantEtat] = useState<Carburant>(() => voiture?.carburant ?? carburantMemorise());
  const [tri, setTri] = useState<Tri>("prix");
  const [zone, setZone] = useState<string | null>(null); // carte déplacée : « Autour de <commune> »
  const nav = useNavigate();
  const { pathname } = useLocation();
  // pendant un trajet, Stations part de la dernière position enregistrée, pas de celle du lancement (la voiture a roulé)
  const { etat } = useEnregistrement();
  const dernier = etat?.points[etat.points.length - 1];
  const positionStations = useMemo(() => positionCourante(dernier ? [dernier] : undefined, position), [dernier?.[1], dernier?.[2], position]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    localiser().then(setPosition);
  }, []);

  // au lancement : un enregistrement gardé reprend (écran En route) ; un trajet arrêté non tranché revient (fin de trajet)
  const lance = useRef(false);
  useEffect(() => {
    if (lance.current) return;
    lance.current = true;
    (async () => {
      const e = await enregistreur().restaurer().catch(() => null);
      if (e) {
        if (pathname === "/") nav("/en-route", { replace: true });
        return;
      }
      const arrete = await lireArrete().catch(() => null);
      if (arrete && (pathname === "/" || pathname === "/en-route")) nav("/fin", { replace: true });
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // onglet Stations : le carburant de la voiture, d'office (V-5.2)
  useEffect(() => {
    if (pathname.startsWith("/stations") && voiture) setCarburantEtat(voiture.carburant);
  }, [pathname, voiture]);

  const setCarburant = (c: Carburant) => {
    setCarburantEtat(c);
    try {
      localStorage.setItem(CLE_CARBURANT, c);
    } catch {
      /* stockage indisponible */
    }
  };

  const lieu = zone ?? (position ? (position.source === "gps" ? T.autourDeMoi : position.label) : "…");

  return (
    <div className="app">
      <header className="top">
        <h1 className="brand">
          {T.marque} <b>{T.marqueEt}</b> {T.marqueFin}
        </h1>
        <div className="topr">
          <div className="where" data-el="lieu">{lieu}</div>
        </div>
      </header>
      <Routes>
        <Route path="/" element={<Trajet />} />
        <Route path="/voiture" element={<MaVoiture />} />
        <Route path="/en-route" element={<EnRoutePage />} />
        <Route path="/fin" element={<FinDeTrajet />} />
        <Route path="/historique" element={<Historique />} />
        <Route path="/stations" element={<Stations position={positionStations} onZone={setZone} carburant={carburant} setCarburant={setCarburant} tri={tri} setTri={setTri} />} />
        <Route path="/moteurs" element={<Moteurs />} />
        <Route path="/admin" element={<Admin />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <BarreOnglets />
    </div>
  );
}
