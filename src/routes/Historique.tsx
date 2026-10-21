// T6 Historique (jalon 5, T5.6) : totaux (trajets, km, € essence), trajets du plus récent au plus ancien groupés par mois ;
// toucher une ligne rouvre sa fin de trajet pour la corriger ou la supprimer.
import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { coutTrajet, grouperParMois, listerTrajetsV1, nomLieu, partPersonne, totaux, type TrajetV1 } from "../lib/historique";
import { fmt } from "../lib/calcul";
import { T } from "../lib/textes";

const dateCourte = (ms: number) => new Date(ms).toLocaleDateString("fr-FR", { day: "numeric", month: "short" });

export default function Historique() {
  const nav = useNavigate();
  const loc = useLocation();
  const nouveau = (loc.state as { nouveau?: string } | null)?.nouveau ?? null;
  const [liste, setListe] = useState<TrajetV1[] | null>(null);
  const titre = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    listerTrajetsV1()
      .then(setListe)
      .catch(() => setListe([]));
  }, []);
  useEffect(() => {
    if (!liste) return;
    const ligne = nouveau ? (document.querySelector(`[data-trajet="${nouveau}"] button`) as HTMLElement | null) : null;
    (ligne ?? titre.current)?.focus({ preventScroll: true });
  }, [liste, nouveau]);

  const tot = totaux(liste ?? []);
  return (
    <section className="screen" data-screen="T6" role="tabpanel" aria-labelledby="onglet-historique" aria-busy={liste == null}>
      <div className="scroll">
        <h2 className="route" tabIndex={-1} ref={titre}>{T.historiqueTitre}</h2>
        <div className="kpis" data-el="totaux-historique" data-trajets={tot.trajets} data-km={tot.km} data-euros={tot.euros}>
          <div className="kpi"><b data-el="total-trajets">{tot.trajets}</b><span>{T.trajets}</span></div>
          <div className="kpi"><b data-el="total-km">{tot.km.toLocaleString("fr-FR")}</b><span>{T.km}</span></div>
          <div className="kpi"><b data-el="total-euros">{fmt(tot.euros, 2)}</b><span>{T.eurosEssence}</span></div>
        </div>
        <ul className="hist" data-el="historique" style={{ marginTop: 8 }}>
          {liste && liste.length === 0 && <li className="empty" data-el="historique-vide">{T.aucunTrajetV1}</li>}
          {grouperParMois(liste ?? []).map((g) => (
            <li key={g.mois} className="mois" data-mois={g.mois}>
              <h3 className="sgrp">{g.mois}</h3>
              <ul>
                {g.trajets.map((t) => {
                  const cout = coutTrajet(t);
                  const route = `${nomLieu(t.depart)} ${T.fleche} ${nomLieu(t.arrivee)}`;
                  return (
                    <li key={t.id} className={"hrow" + (t.id === nouveau ? " nouveau" : "")} data-trajet={t.id}>
                      <button type="button" className="go" aria-label={T.ouvrirTrajet(route)} onClick={() => nav("/fin", { state: { id: t.id, depuisHistorique: true } })}>
                        <span className="t">{route}</span>
                        <br />
                        <span className="m">
                          {T.ligneHistorique(dateCourte(t.debut), fmt(t.km, t.km < 100 ? 1 : 0))}
                          {t.personnes > 1 && cout != null && <span data-el="part-ligne"> · {T.partChacun(fmt(partPersonne(cout, t.personnes), 2))}</span>}
                        </span>
                      </button>
                      <span className="c" data-el="cout-ligne">{cout == null ? "—" : `${fmt(cout, 2)} €`}</span>
                    </li>
                  );
                })}
              </ul>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
