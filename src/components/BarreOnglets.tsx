import { useLocation, useNavigate } from "react-router-dom";
import { T } from "../lib/textes";

export function BarreOnglets() {
  const nav = useNavigate();
  const { pathname } = useLocation();
  const prix = !pathname.startsWith("/trajets");
  return (
    <nav className="tabs" role="tablist" aria-label="Sections">
      <button className="tab" role="tab" aria-selected={prix} data-el="onglet-prix" onClick={() => nav("/")}>
        {T.ongletPrix}
      </button>
      <button className="tab" role="tab" aria-selected={!prix} data-el="onglet-trajets" onClick={() => nav("/trajets")}>
        {T.ongletTrajets}
      </button>
    </nav>
  );
}
