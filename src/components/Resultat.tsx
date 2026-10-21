// S4 Résultat du trajet : coût, litres, km, L/100 km, prix utilisé (« Mettre mon prix »), tronçons dépliables.
import { useEffect, useLayoutEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { euros, fmt, libelleType, validerPrix } from "../lib/calcul";
import { coutTotal, repartirCouts, type MoyennePays } from "../lib/pays";
import { prix3 } from "../lib/format";
import type { Estimation } from "../lib/trajets";
import { T } from "../lib/textes";
import { TotemPrix } from "./TotemPrix";
import { cheminCourbe } from "./EnRoute";

export interface DonneesResultat {
  departLabel: string;
  arriveeLabel: string;
  estimation: Estimation;
  moyennes: Map<string, MoyennePays>; // prix moyen du jour par pays (€/L) du carburant de la voiture
  historiqueEchec: boolean;
  rejoue: boolean; // trajet de l'historique recalculé au prix du jour (US-3.6)
  enregistre?: { vitesses: number[]; vitesse_moy: number; accelerations: number }; // jalon 4 : trajet enregistré en roulant
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
  const route = `${etat.genre === "ok" ? etat.donnees.departLabel : etat.departLabel} ${T.fleche} ${etat.genre === "ok" ? etat.donnees.arriveeLabel : etat.arriveeLabel}${etat.genre === "ok" && etat.donnees.enregistre ? ` ${T.enregistreSuffixe}` : ""}`;

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
            {etat.motif === "trop_long" && <p className="d">{T.tropLongDetail}</p>}
          </div>
        )}
        {etat.genre === "erreur" && (
          <div className="etat" data-el="calcul-impossible">
            <p className="t" role="alert">{T.calculImpossible}</p>
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
  const [editeur, setEditeur] = useState(false); // champ ouvert par « Mettre mon prix »
  const [saisie, setSaisie] = useState("");
  const [erreurPrix, setErreurPrix] = useState(false);
  const [ouvert, setOuvert] = useState<number | null>(null);
  const champ = useRef<HTMLInputElement>(null);
  const boutonPrix = useRef<HTMLButtonElement>(null);
  const persoAvant = useRef<number | null>(null); // prix en place à l'ouverture du champ : Échap y revient
  const fermeture = useRef(false); // Entrée ou Échap referment le champ : la sortie du champ qui suit n'applique rien
  const minuteur = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearTimeout(minuteur.current), []);

  const repartition = useMemo(() => repartirCouts(e.pays, d.moyennes, perso), [e.pays, d.moyennes, perso]);
  const multi = e.pays.length > 1;
  // plaque du prix : un seul pays, ou mon prix ; plusieurs pays au prix moyen → prix sur chaque ligne pays
  const prix = perso ?? (multi ? null : (repartition.lignes[0]?.prix ?? null));
  const seul = multi ? null : repartition.lignes[0]; // un seul pays : la section « Pays traversés » est masquée, sa note passe sous le prix
  const cout = coutTotal(repartition.carburant, e.peages);
  const libellePrix = multi ? T.moyennePaysParPays(e.vehicule.carburant) : e.pays[0]?.code === "FR" ? T.moyenneFrance(e.vehicule.carburant) : T.moyennePaysSeul(e.pays[0]?.nom ?? "", e.vehicule.carburant);
  const maxLitres = useMemo(() => Math.max(...e.troncons.map((t) => t.litres), 0.001), [e.troncons]);

  const rendreFocus = () => requestAnimationFrame(() => boutonPrix.current?.focus());
  const ouvrirEditeur = () => {
    persoAvant.current = perso;
    setSaisie(perso != null ? fmt(perso, 3) : "");
    setErreurPrix(false);
    fermeture.current = false;
    setEditeur(true);
  };
  // champ ouvert : curseur dedans et prix en place sélectionné AVANT la première frappe (une image plus tard, la frappe serait remplacée)
  useLayoutEffect(() => {
    if (!editeur) return;
    champ.current?.focus();
    champ.current?.select();
  }, [editeur]);
  const revenir = () => {
    window.clearTimeout(minuteur.current);
    fermeture.current = true;
    setPerso(null);
    setSaisie("");
    setErreurPrix(false);
    setEditeur(false);
    rendreFocus();
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
  /** Applique la saisie posée ; vrai si le champ peut se refermer (prix valable, ou champ vide). */
  const appliquerMaintenant = () => {
    window.clearTimeout(minuteur.current);
    if (saisie.trim() === "") return true;
    const r = validerPrix(saisie);
    if (r.ok) setPerso(r.valeur);
    return r.ok;
  };
  const toucheChamp = (ev: KeyboardEvent<HTMLInputElement>) => {
    if (ev.key === "Enter") {
      ev.preventDefault();
      if (appliquerMaintenant()) {
        fermeture.current = true;
        setEditeur(false);
        rendreFocus();
      }
    } else if (ev.key === "Escape") {
      // Échap annule seulement la saisie en cours : le prix en place à l'ouverture du champ revient
      ev.preventDefault();
      ev.stopPropagation();
      window.clearTimeout(minuteur.current);
      fermeture.current = true;
      setPerso(persoAvant.current);
      setSaisie("");
      setErreurPrix(false);
      setEditeur(false);
      rendreFocus();
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
        {repartition.carburant != null && e.peages.etat === "ok" && e.peages.total > 0 && (
          <span className="split" data-el="repartition-cout" data-carburant={repartition.carburant.toFixed(2)}>
            {T.carburant} <b>{euros(repartition.carburant)} {T.euro}</b> · {T.peagesCourt} <b>{euros(e.peages.total)} {T.euro}</b>
          </span>
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
          {prix != null && (
            <span data-el="prix-utilise" data-prix={prix3(prix)}>
              <TotemPrix prix={prix} cleAnim={prix3(prix)} />
            </span>
          )}
        </div>
        {seul && seul.prix != null && (seul.source === "ue" || seul.source === "estime" || (seul.source === "flux" && seul.code === "GB")) && (
          <span className="pl-note" data-el={seul.source === "ue" ? "prix-non-publie" : seul.source === "flux" ? "prix-flux-pays" : "prix-estime"}>
            {seul.source === "ue" ? T.prixNonPublie : seul.source === "flux" ? T.prixFluxPays((d.moyennes.get(seul.code)?.nb_stations ?? 0).toLocaleString("fr-FR")) : T.prixEstime}
          </span>
        )}
        <div className="l gauche">
          {editeur ? (
            <span className="perso-champ">
              <input
                id="perso"
                ref={champ}
                data-el="champ-prix-perso"
                inputMode="decimal"
                autoComplete="off"
                aria-label={`${T.monPrix} (${T.prixPersoLabel})`}
                value={saisie}
                aria-invalid={erreurPrix || undefined}
                aria-describedby={erreurPrix ? "perso-erreur" : undefined}
                onChange={(ev) => surSaisie(ev.target.value)}
                onBlur={() => !fermeture.current && appliquerMaintenant() && setEditeur(false)}
                onKeyDown={toucheChamp}
              />
              <span aria-hidden="true">{T.prixPersoLabel}</span>
            </span>
          ) : (
            <button ref={boutonPrix} className="link" type="button" data-el="mettre-mon-prix" onClick={ouvrirEditeur}>
              {T.mettreMonPrix}
            </button>
          )}
          {perso != null && (
            <button className="link" type="button" data-el="revenir-moyenne" aria-label={T.revenirMoyenneLabel} onMouseDown={(ev) => ev.preventDefault()} onClick={revenir}>
              {T.revenirMoyenne}
            </button>
          )}
        </div>
        {erreurPrix && (
          <p className="err-msg" id="perso-erreur" role="alert" data-el="erreur-prix-perso">
            {T.prixPersoErreur}
          </p>
        )}
      </div>
      {d.enregistre && (
        <div className="trace" data-el="courbe-vitesse">
          <div className="h">
            <span>{T.maVitesse}</span>
            <span data-el="vitesse-info" data-moy={d.enregistre.vitesse_moy} data-acc={d.enregistre.accelerations}>{T.vitesseInfo(d.enregistre.vitesse_moy, d.enregistre.accelerations)}</span>
          </div>
          <svg viewBox="0 0 300 70" preserveAspectRatio="none" role="img" aria-label={T.courbeTrajet} data-points={d.enregistre.vitesses.length}>
            <path d={cheminCourbe(d.enregistre.vitesses, 300, 70, Math.max(140, ...d.enregistre.vitesses))} fill="none" stroke="var(--ink)" strokeWidth="2" vectorEffect="non-scaling-stroke" />
          </svg>
        </div>
      )}
      {e.avertissements.includes("altimetrie_indisponible") && <p className="note" role="status">{T.altiIndispo}</p>}
      {d.historiqueEchec && <p className="note" role="status">{T.sauvegardeHistErreur}</p>}
      <h2 className="sec">{T.peagesTitre}</h2>
      <ul className="plist" data-el="detail-peages" data-etat={e.peages.etat}>
        {e.peages.etat === "ok" && e.peages.lignes.length === 0 && (
          <li className="pl"><span>{T.aucunPeage}</span><span className="lit">{euros(0)} {T.euro}</span></li>
        )}
        {e.peages.etat === "ok" && e.peages.lignes.map((l, i) => (
          <li className="pl" key={`${l.pays}-${i}`} data-el="ligne-peage">
            <span><b>{l.pays}</b> {l.libelle || T.peageSansNom}{l.fourchette ? T.peageFourchette : ""}</span>
            <span className="lit">{l.montant > 0 ? `${euros(l.montant)} ${T.euro}` : T.peageGratuit}</span>
          </li>
        ))}
        {e.peages.etat === "ok" && e.peages.lignes.length > 0 && (
          <li className="pl tot" data-el="total-peages"><span>{T.peagesTotal}</span><span className="lit">{euros(e.peages.total)} {T.euro}</span></li>
        )}
        {e.peages.etat === "indisponible" && (
          <li className="pl" data-el="peages-indisponibles"><span role="status">{e.peages.motif === "quota_fournisseur" ? T.peagesQuotaFournisseur(T.nomsFournisseursPeages[e.peages.fournisseur ?? ""] ?? e.peages.fournisseur ?? "", e.peages.jusqua ? T.heureCourte(e.peages.jusqua) : "demain") : e.peages.motif === "quota_atteint" ? T.peagesLimiteAtteinte : T.peagesIndisponibles}</span><span className="lit">—</span></li>
        )}
        {e.peages.vignettes.map((v) => (
          <li className="pl" key={v.pays} data-el="ligne-vignette"><span><b>{v.pays}</b> {v.libelle}</span></li>
        ))}
      </ul>
      {e.peages.etat === "indisponible" && <p className="note" data-el="peages-indisponibles-detail">{T.peagesHorsCout}</p>}
      {/* un seul pays : km, litres, prix et coût sont déjà en haut ; la section n'apprendrait rien (US-4.5) */}
      {multi && (
        <>
          <h2 className="sec">{T.paysTitre}</h2>
          <ul className="plist" data-el="pays-traverses">
            {repartition.lignes.map((l) => (
              <li className="pl" key={l.code} data-pays={l.code} data-source={l.source}>
                <span>
                  <b>{l.code}</b> {l.nom} · {Math.round(l.km)} {T.km} · {l.prix == null ? T.prixAbsent : T.paysLigne2(fmt(l.litres, 1), fmt(l.prix, 3))}
                  {l.source === "ue" && <small className="pl-note" data-el="prix-non-publie"> — {T.prixNonPublie}</small>}
                  {l.source === "flux" && l.code === "GB" && <small className="pl-note" data-el="prix-flux-pays"> — {T.prixFluxPays((d.moyennes.get(l.code)?.nb_stations ?? 0).toLocaleString("fr-FR"))}</small>}
                  {l.source === "estime" && <small className="pl-note"> — {T.prixEstime}</small>}
                </span>
                <span className="lit">{l.cout == null ? "—" : `${euros(l.cout)} ${T.euro}`}</span>
              </li>
            ))}
          </ul>
        </>
      )}
      {e.traversee_manche && <p className="note manche" data-el="manche-non-comptee">{T.mancheNonComptee}</p>}
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
                <span className="lit" aria-hidden="true">{fmt(t.litres, 1)} {T.litresCourt}</span>
              </button>
              <div className="det" id={`troncon-${i}-det`} hidden={!est} data-el="troncon-detail">
                {T.detailVitesse(t.vitesse_kmh)} · {T.detailArrets(t.arrets)}
                {t.denivele_m > 0 ? ` · ${T.detailDenivele(t.denivele_m)}` : ""} · {T.detailL100(fmt(t.l100, 1))}
              </div>
            </li>
          );
        })}
      </ul>
      {d.enregistre && <p className="note" data-el="note-roule">{T.noteRoule}</p>}
    </div>
  );
}
