// Derniers trajets (S3) : recalcul au clic, suppression, état vide.
import { coutHistorique } from "../lib/historique";
import { dateCourte, fmt } from "../lib/calcul";
import type { TrajetEnregistre } from "../lib/trajets";
import { T } from "../lib/textes";

export type EtatHistorique = "chargement" | "ok" | "erreur";

interface Props {
  etat: EtatHistorique;
  trajets: TrajetEnregistre[];
  occupe: boolean;
  erreurSuppression: boolean;
  onRejouer: (t: TrajetEnregistre) => void;
  onSupprimer: (t: TrajetEnregistre) => void;
}

export function Historique({ etat, trajets, occupe, erreurSuppression, onRejouer, onSupprimer }: Props) {
  return (
    <section aria-labelledby="titre-historique" data-el="historique" data-etat={etat}>
      <h2 className="sec" id="titre-historique">{T.derniersTrajets}</h2>
      {etat === "chargement" && <p className="empty hist-msg" role="status">{T.histChargement}</p>}
      {etat === "erreur" && <p className="empty hist-msg" role="alert">{T.histErreur}</p>}
      {etat === "ok" && trajets.length === 0 && (
        <div className="hist-vide" data-el="historique-vide">
          <p className="t">{T.histVide}</p>
          <p className="d">{T.histVideInvite}</p>
        </div>
      )}
      {erreurSuppression && <p className="err-msg hist-msg" role="alert">{T.histSuppressionErreur}</p>}
      {etat === "ok" && trajets.length > 0 && (
        <ul className="hist" data-el="liste-historique">
          {trajets.map((t, i) => {
            const nom = `${t.depart_label} ${T.fleche} ${t.arrivee_label}`;
            return (
              <li className="hrow" key={t.id} data-trajet={t.id}>
                <button type="button" className="go" data-el={i === 0 ? "ligne-historique" : "ligne-historique-suite"} data-trajet={t.id} disabled={occupe} aria-label={T.rejouerTrajet(nom)} onClick={() => onRejouer(t)}>
                  <span className="t">{nom}</span>
                  <br />
                  <span className="m">
                    {fmt(t.km, 0)} {T.km} · {dateCourte(t.cree_le)}
                  </span>
                </button>
                <span className="c">{coutHistorique(t.cout)}</span>
                <button type="button" className="x" data-el={i === 0 ? "supprimer-trajet" : "supprimer-trajet-suite"} aria-label={T.supprimerTrajet(nom)} disabled={occupe} onClick={() => onSupprimer(t)}>
                  <span aria-hidden="true">✕</span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
