import type { KeyboardEvent } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { T } from "../lib/textes";

export function BarreOnglets() {
  const nav = useNavigate();
  const { pathname } = useLocation();
  const prix = !pathname.startsWith("/trajets");
  // flèches gauche/droite : passer d'un onglet à l'autre (motif ARIA « tabs »)
  const fleches = (e: KeyboardEvent<HTMLElement>) => {
    if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
    e.preventDefault();
    const versPrix = !prix;
    nav(versPrix ? "/" : "/trajets");
    requestAnimationFrame(() => document.getElementById(versPrix ? "onglet-prix" : "onglet-trajets")?.focus());
  };
  return (
    <nav className="tabs" role="tablist" aria-label={T.sections} onKeyDown={fleches}>
      <button className="tab" role="tab" id="onglet-prix" aria-controls="panneau-prix" aria-selected={prix} tabIndex={prix ? 0 : -1} data-el="onglet-prix" onClick={() => nav("/")}>
        {T.ongletPrix}
      </button>
      <button className="tab" role="tab" id="onglet-trajets" aria-controls="panneau-trajets" aria-selected={!prix} tabIndex={prix ? -1 : 0} data-el="onglet-trajets" onClick={() => nav("/trajets")}>
        {T.ongletTrajets}
      </button>
    </nav>
  );
}
