// Onglets de la V1 (jalon 5, T5.8) : Trajet, Stations, Historique. L'onglet Trajet ramène à l'écran En route quand un
// enregistrement tourne ; un trajet rouvert depuis l'historique garde l'onglet Historique sélectionné.
import type { KeyboardEvent } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { T } from "../lib/textes";
import { useEnregistrement } from "../lib/useEnregistrement";

type Onglet = "trajet" | "stations" | "historique";
const ORDRE: Onglet[] = ["trajet", "stations", "historique"];

export function ongletDe(pathname: string, depuisHistorique: boolean): Onglet | null {
  if (pathname.startsWith("/moteurs") || pathname.startsWith("/admin")) return null;
  if (pathname.startsWith("/stations")) return "stations";
  if (pathname.startsWith("/historique") || (pathname.startsWith("/fin") && depuisHistorique)) return "historique";
  return "trajet";
}

export function BarreOnglets() {
  const nav = useNavigate();
  const { pathname, state } = useLocation();
  const { etat } = useEnregistrement();
  const actif = ongletDe(pathname, !!(state as { depuisHistorique?: boolean } | null)?.depuisHistorique);
  const aller = (o: Onglet) => nav(o === "trajet" ? (etat ? "/en-route" : "/") : `/${o}`);
  const fleches = (e: KeyboardEvent<HTMLElement>) => {
    if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
    e.preventDefault();
    const i = ORDRE.indexOf(actif ?? "trajet");
    const o = ORDRE[(i + (e.key === "ArrowRight" ? 1 : ORDRE.length - 1)) % ORDRE.length];
    aller(o);
    requestAnimationFrame(() => document.getElementById(`onglet-${o}`)?.focus());
  };
  const libelles: Record<Onglet, string> = { trajet: T.ongletTrajet, stations: T.ongletStations, historique: T.ongletHistorique };
  return (
    <nav className="tabs tabs3" role="tablist" aria-label={T.sections} onKeyDown={fleches}>
      {ORDRE.map((o) => (
        <button
          key={o}
          className="tab"
          role="tab"
          id={`onglet-${o}`}
          aria-selected={actif === o}
          tabIndex={actif === o || (actif == null && o === "trajet") ? 0 : -1}
          data-el={`onglet-${o}`}
          onClick={() => aller(o)}
        >
          {libelles[o]}
        </button>
      ))}
    </nav>
  );
}
