// Fiche station (S2) : feuille montante, tous les carburants ou « non vendu », focus et Échap.
import { useEffect, useRef, useState } from "react";
import { CARBURANTS, anciennete, distance } from "../lib/format";
import { prixStation, type LignePrix } from "../lib/donnees";
import { T } from "../lib/textes";
import { TotemPrix } from "./TotemPrix";
import type { StationAffichee } from "./LigneStation";

interface Props {
  station: StationAffichee;
  onFermer: () => void;
  onTrajet: (adresse: string) => void;
}

export function adresseComplete(s: { adresse: string | null; cp: string | null; ville: string | null }): string {
  return [s.adresse, [s.cp, s.ville].filter(Boolean).join(" ")].filter(Boolean).join(", ");
}

export function FicheStation({ station, onFermer, onTrajet }: Props) {
  const titre = useRef<HTMLHeadingElement>(null);
  const [lignes, setLignes] = useState<LignePrix[] | null>(null);
  const [erreur, setErreur] = useState(false);

  useEffect(() => {
    titre.current?.focus({ preventScroll: true });
  }, [station.id]);

  useEffect(() => {
    let actif = true;
    setLignes(null);
    setErreur(false);
    prixStation(station.id)
      .then((l) => actif && setLignes(l))
      .catch(() => actif && setErreur(true));
    return () => {
      actif = false;
    };
  }, [station.id]);

  const parCarburant = new Map((lignes ?? []).map((l) => [l.carburant, l]));
  const derniereMaj = (lignes ?? [])
    .map((l) => l.maj)
    .filter((m): m is string => !!m)
    .sort()
    .pop();
  const services = [...(station.automate_24_24 ? [T.automate] : []), ...station.services.filter((x) => x !== "Automate CB 24/24")];

  return (
    <div className="sheet" role="dialog" aria-modal="false" aria-labelledby="sh-name" data-el="fiche-station" data-station={station.id}>
      <div className="grip" aria-hidden="true" />
      <div className="sh-head">
        <div>
          <h3 className="sh-name" id="sh-name" tabIndex={-1} ref={titre}>
            {station.libelle}
          </h3>
          <div className="meta" data-el="fiche-adresse">
            <span>{adresseComplete(station)}</span>
            <span>{distance(station.distanceKm)}</span>
          </div>
        </div>
        <button className="x" type="button" data-el="fermer-fiche" aria-label={T.fermerFiche} onClick={onFermer}>
          <span aria-hidden="true">✕</span>
        </button>
      </div>
      {erreur ? (
        <p className="etat d" role="alert">{T.ficheErreur}</p>
      ) : (
        <div className="board" data-el="tableau-prix" aria-busy={lignes == null}>
          {lignes == null && <span className="sr-only" role="status">{T.chargementFiche}</span>}
          {CARBURANTS.map((c) => {
            const l = parCarburant.get(c);
            const age = l?.maj ? anciennete(l.maj) : null;
            return (
              <div key={c} style={{ display: "contents" }} data-carburant={c}>
                <span className="lab">{c}</span>
                {lignes == null ? (
                  <span className="na" aria-label={T.chargementPrixStation}>…</span>
                ) : !l || l.prix == null || l.rupture ? (
                  <span className="na" data-el="non-vendu">{l?.rupture ? T.rupture : T.nonVendu}</span>
                ) : (
                  <TotemPrix prix={l.prix} ancien={age?.ancien} />
                )}
              </div>
            );
          })}
        </div>
      )}
      <div className="meta" data-el="fiche-meta">
        {derniereMaj && <span>{T.majPrix(anciennete(derniereMaj).texte)}</span>}
        {services.length > 0 && <span>{services.slice(0, 5).join(" · ")}</span>}
        {station.nom && <span>{station.nom}</span>}
      </div>
      <div style={{ marginTop: 12 }}>
        <button className="btn" type="button" data-el="bouton-trajet-station" onClick={() => onTrajet(adresseComplete(station))}>
          {T.trajetJusquIci}
        </button>
      </div>
    </div>
  );
}
