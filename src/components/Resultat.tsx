// S4 Résultat du trajet : coût, litres, km, L/100 km, prix utilisé (« Mettre mon prix »), tronçons dépliables.
import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { euros, fmt, libelleType, validerPrix } from "../lib/calcul";
import { coutTotal, repartirCouts, type MoyennePays } from "../lib/pays";
import { prix3 } from "../lib/format";
import type { Estimation } from "../lib/trajets";
import { T } from "../lib/textes";
import { TotemPrix } from "./TotemPrix";

export interface DonneesResultat {
  departLabel: string;
  arriveeLabel: string;
  estimation: Estimation;
  moyennes: Map<string, MoyennePays>; // prix moyen du jour par pays (€/L) du carburant de la voiture
  historiqueEchec: boolean;
  rejoue: boolean; // trajet de l'historique recalculé au prix du jour (US-3.6)
}
export type EtatResultat =
  | { genre: "ok"; donnees: DonneesResultat }
  | { genre: "pas_itineraire"; departLabel: string; arriveeLabel: string; memeLieu?: boolean }
  | { genre: "limite"; departLabel: string; arriveeLabel: string; motif: "trop_long" | "hors_couverture" }
  | { genre: "erreur"; departLabel: string; arriveeLabel: string };

interface Props {
  etat: EtatResultat;
  onRetour: () => void;
  onReessayer: () => void;
}

export function Resultat({ etat, onRetour, onReessayer }: Props) {
  const titre = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    titre.current?.focus({ preventScroll: true });
  }, []);
  const route = `${etat.genre === "ok" ? etat.donnees.departLabel : etat.departLabel} ${T.fleche} ${etat.genre === "ok" ? etat.donnees.arriveeLabel : etat.arriveeLabel}`;

  return (
    <section className="screen" data-screen="S4" role="tabpanel" id="panneau-trajets" aria-labelledby="onglet-trajets" data-etat={etat.genre}>
      <div className="scroll">
        <div className="rhead">
          <button className="back" type="button" data-el="retour-trajets" aria-label={T.retourTrajetsLabel} onClick={onRetour}>
            <span aria-hidden="true">{T.retourTrajets}</span>
          </button>
        </div>
        <h2 className="route" tabIndex={-1} ref={titre} data-el="route-titre">
          {route}
        </h2>
        {etat.genre === "ok" && <CorpsResultat d={etat.donnees} />}
        {etat.genre === "pas_itineraire" && (
          <div className="etat" data-el="pas-itineraire">
            <p className="t" role="alert">{T.pasItineraire}</p>
            <p className="d">{etat.memeLieu ? T.pasItineraireMemeLieu : T.pasItineraireDetail}</p>
          </div>
        )}
        {etat.genre === "limite" && (
          <div className="etat" data-el="limite-itineraire">
            <p className="t" role="alert">{etat.motif === "trop_long" ? T.tropLong : T.horsCouverture}</p>
            <p className="d">{etat.motif === "trop_long" ? T.tropLongDetail : T.horsCouvertureDetail}</p>
          </div>
        )}
        {etat.genre === "erreur" && (
          <div className="etat" data-el="calcul-impossible">
            <p className="t" role="alert">{T.calculImpossible}</p>
            <p className="d">{T.calculImpossibleDetail}</p>
            <button className="btn small" type="button" data-el="reessayer-calcul" onClick={onReessayer}>{T.reessayer}</button>
          </div>
        )}
      </div>
    </section>
  );
}

function CorpsResultat({ d }: { d: DonneesResultat }) {
  const e = d.estimation;
  const [perso, setPerso] = useState<number | null>(null);
  const [editeur, setEditeur] = useState(false);
  const [saisie, setSaisie] = useState("");
  const [erreurPrix, setErreurPrix] = useState(false);
  const [ouvert, setOuvert] = useState<number | null>(null);
  const champ = useRef<HTMLInputElement>(null);
  const boutonPrix = useRef<HTMLButtonElement>(null);
  const minuteur = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearTimeout(minuteur.current), []);

  const repartition = useMemo(() => repartirCouts(e.pays, d.moyennes, perso), [e.pays, d.moyennes, perso]);
  const multi = e.pays.length > 1;
  const prix = repartition.lignes[0]?.prix ?? null; // prix affiché dans la plaque : celui du premier pays (le départ)
  const carburantEuros = repartition.carburant;
  const cout = coutTotal(carburantEuros, e.peages);
  const libellePrix = multi ? T.moyennePaysParPays(e.vehicule.carburant) : e.pays[0]?.code === "FR" ? T.moyenneFrance(e.vehicule.carburant) : T.moyennePaysSeul(e.pays[0]?.nom ?? "", e.vehicule.carburant);
  const maxLitres = useMemo(() => Math.max(...e.troncons.map((t) => t.litres), 0.001), [e.troncons]);

  const ouvrirEditeur = () => {
    setEditeur(true);
    requestAnimationFrame(() => champ.current?.focus());
  };
  const revenir = () => {
    window.clearTimeout(minuteur.current);
    setPerso(null);
    setSaisie("");
    setErreurPrix(false);
    setEditeur(false);
    requestAnimationFrame(() => boutonPrix.current?.focus());
  };
  // Le prix saisi n'est appliqué qu'une fois la frappe posée (Entrée, sortie du champ ou 0,45 s sans touche) :
  // taper « 12 » ne passe pas par « 1 » ; une saisie refusée laisse le coût tel qu'il était.
  const surSaisie = (v: string) => {
    setSaisie(v);
    window.clearTimeout(minuteur.current);
    if (v.trim() === "") {
      setErreurPrix(false);
      return;
    }
    const r = validerPrix(v);
    if (!r.ok) {
      setErreurPrix(true);
      return;
    }
    setErreurPrix(false);
    minuteur.current = window.setTimeout(() => setPerso(r.valeur), 450);
  };
  const appliquerMaintenant = () => {
    window.clearTimeout(minuteur.current);
    const r = validerPrix(saisie);
    if (saisie.trim() !== "" && r.ok) setPerso(r.valeur);
  };
  const toucheChamp = (ev: KeyboardEvent<HTMLInputElement>) => {
    if (ev.key === "Enter") {
      ev.preventDefault();
      appliquerMaintenant();
    } else if (ev.key === "Escape") {
      ev.preventDefault();
      ev.stopPropagation();
      window.clearTimeout(minuteur.current);
      setErreurPrix(false);
      setSaisie(perso != null ? fmt(perso, 3) : "");
      if (perso == null) setEditeur(false);
      boutonPrix.current?.focus();
    }
  };
  // Échap replie le tronçon ouvert (US-A11Y-003)
  const toucheSection = (ev: KeyboardEvent<HTMLElement>) => {
    if (ev.key === "Escape" && ouvert != null) {
      const i = ouvert;
      setOuvert(null);
      document.getElementById(`troncon-${i}`)?.focus();
    }
  };

  return (
    <div onKeyDown={toucheSection}>
      {d.rejoue && <p className="rejoue" data-el="trajet-rejoue">{T.rejoue}</p>}
      <p className="rsub" data-el="voiture-resultat">
        {e.vehicule.libelle} · {e.vehicule.carburant}
      </p>
      <div className="costbox" data-el="cout">
        {cout == null ? (
          <p className="d" role="status">{T.moyenneIndisponible}</p>
        ) : (
          <span className="totem big" role="img" aria-label={T.coutEstime(euros(cout))} data-cout={cout.toFixed(2)}>
            <span className="roll" key={cout.toFixed(2)} aria-hidden="true">{euros(cout)}</span>
            <span className="u" aria-hidden="true">{T.euro}</span>
          </span>
        )}
        {prix != null && (
          <span className="split" data-el="detail-cout">
            {multi ? T.detailCoutPays(fmt(e.litres, 1), e.pays.length) : T.detailCout(fmt(e.litres, 1), fmt(prix, 3))}
          </span>
        )}
        {carburantEuros != null && e.peages.etat === "ok" && (
          <span className="split" data-el="repartition-cout">{T.carburantPeages(euros(carburantEuros), euros(e.peages.total))}</span>
        )}
      </div>
      <div className="kpis" data-el="indicateurs">
        <div className="kpi"><b data-el="kpi-litres">{fmt(e.litres, 1)}</b><span>{T.litres}</span></div>
        <div className="kpi"><b data-el="kpi-km">{fmt(e.km, 0)}</b><span>{T.km}</span></div>
        <div className="kpi"><b data-el="kpi-l100">{fmt(e.l100, 1)}</b><span>{T.l100}</span></div>
      </div>
      <div className="price" data-el="prix-perso">
        <div className="l">
          <span data-el="libelle-prix">{perso != null ? (multi ? T.monPrixTousPays : T.monPrix) : libellePrix}</span>
          {prix != null && <TotemPrix prix={prix} cleAnim={prix3(prix)} />}
        </div>
        <div className="l">
          <button ref={boutonPrix} className="link" type="button" data-el={perso != null ? "revenir-moyenne" : "mettre-mon-prix"} aria-expanded={perso == null ? editeur : undefined} onClick={() => {
            if (perso != null) revenir();
            else if (editeur) {
              window.clearTimeout(minuteur.current);
              setEditeur(false);
            } else ouvrirEditeur();
          }}>
            {perso != null ? T.revenirMoyenne : T.mettreMonPrix}
          </button>
          {editeur && (
            <span className="perso-champ">
              <label htmlFor="perso">{T.prixPersoLabel}</label>
              <input
                id="perso"
                ref={champ}
                data-el="champ-prix-perso"
                inputMode="decimal"
                autoComplete="off"
                placeholder={T.prixPersoPlaceholder}
                value={saisie}
                aria-invalid={erreurPrix || undefined}
                aria-describedby={erreurPrix ? "perso-erreur" : undefined}
                onChange={(ev) => surSaisie(ev.target.value)}
                onBlur={appliquerMaintenant}
                onKeyDown={toucheChamp}
              />
            </span>
          )}
        </div>
        {erreurPrix && (
          <p className="err-msg" id="perso-erreur" role="alert" data-el="erreur-prix-perso">
            {T.prixPersoErreur}
          </p>
        )}
      </div>
      {e.avertissements.includes("altimetrie_indisponible") && <p className="note" role="status">{T.altiIndispo}</p>}
      {d.historiqueEchec && <p className="note" role="status">{T.sauvegardeHistErreur}</p>}
      <h2 className="sec">{T.peagesTitre}</h2>
      <ul className="plist" data-el="detail-peages" data-etat={e.peages.etat}>
        {e.peages.etat === "ok" && e.peages.lignes.length === 0 && (
          <li className="pl"><span>{T.aucunPeage}</span><span className="lit">{euros(0)} {T.euro}</span></li>
        )}
        {e.peages.etat === "ok" && e.peages.lignes.map((l, i) => (
          <li className="pl" key={`${l.pays}-${i}`} data-el="ligne-peage">
            <span><b>{l.pays}</b> {l.libelle}</span>
            <span className="lit">{l.montant > 0 ? `${euros(l.montant)} ${T.euro}` : T.peageGratuit}</span>
          </li>
        ))}
        {e.peages.etat === "ok" && e.peages.lignes.length > 0 && (
          <li className="pl tot" data-el="total-peages"><span>{T.peagesTotal}</span><span className="lit">{euros(e.peages.total)} {T.euro}</span></li>
        )}
        {e.peages.etat === "indisponible" && (
          <li className="pl" data-el="peages-indisponibles"><span role="status">{T.peagesIndisponibles}</span><span className="lit">—</span></li>
        )}
        {e.peages.vignettes.map((v) => (
          <li className="pl" key={v.pays} data-el="ligne-vignette"><span><b>{v.pays}</b> {v.libelle}</span></li>
        ))}
      </ul>
      {e.peages.etat === "indisponible" && <p className="note" data-el="peages-indisponibles-detail">{T.peagesIndisponiblesDetail}</p>}
      <h2 className="sec">{T.paysTitre}</h2>
      <ul className="plist" data-el="pays-traverses">
        {repartition.lignes.map((l) => (
          <li className="pl" key={l.code} data-pays={l.code} data-source={l.source}>
            <span>
              <b>{l.code}</b> {l.nom} · {Math.round(l.km)} {T.km} · {l.prix == null ? T.prixAbsent : T.paysLigne2(fmt(l.litres, 1), fmt(l.prix, 3))}
              {l.source === "ue" && <small className="pl-note" data-el="prix-non-publie"> — {T.prixNonPublie}</small>}
              {l.source === "estime" && <small className="pl-note"> — {T.prixEstime}</small>}
            </span>
            <span className="lit">{l.cout == null ? "—" : `${euros(l.cout)} ${T.euro}`}</span>
          </li>
        ))}
      </ul>
      <h2 className="sec">{T.consommationTitre}</h2>
      <ul className="segs" data-el="troncons">
        {e.troncons.map((t, i) => {
          const nom = libelleType(t.type, t.voies);
          const est = ouvert === i;
          return (
            <li className="tr" key={`${t.pays ?? ""}-${t.type}-${i}`} data-troncon={t.type}>
              <button id={`troncon-${i}`} type="button" aria-expanded={est} aria-controls={`troncon-${i}-det`} data-el={i === 0 ? "troncon-trajet" : "troncon-trajet-suite"} aria-label={T.tronconLabel(nom, fmt(t.km, 1), fmt(t.litres, 1))} onClick={() => setOuvert(est ? null : i)}>
                <span className={"tag " + t.type} aria-hidden="true">{nom}</span>
                <span aria-hidden="true">
                  <span className="tn">
                    {t.voies.length > 0 ? `${t.voies.join(" / ")} · ` : ""}
                    {fmt(t.km, 1)} {T.km}
                    {multi && t.pays ? ` · ${t.pays}` : ""}
                  </span>
                  <span className="bar"><i style={{ width: `${Math.max(2, (t.litres / maxLitres) * 100)}%` }} /></span>
                </span>
                <span className="lit" aria-hidden="true">{fmt(t.litres, 1)} L</span>
              </button>
              <div className="det" id={`troncon-${i}-det`} hidden={!est} data-el="troncon-detail">
                {T.detailVitesse(t.vitesse_kmh)} · {T.detailArrets(t.arrets)}
                {t.denivele_m > 0 ? ` · ${T.detailDenivele(t.denivele_m)}` : ""} · {T.detailL100(fmt(t.l100, 1))}
              </div>
            </li>
          );
        })}
      </ul>
      <p className="note">{T.noteEstimation}</p>
    </div>
  );
}
