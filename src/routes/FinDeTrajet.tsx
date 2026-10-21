// T4 Fin de trajet (jalon 5, T5.5) : litres, km, L/100 km ; prix de l'essence (moyenne du jour du pays de départ, carburant de la
// voiture d'office ; compteur touchable pour mettre mon prix) ; coût ; personnes et part de chacun ; courbes de vitesse et de
// consommation ; Enregistrer / Supprimer (trajet neuf) ou Supprimer ce trajet (trajet rouvert). Tout est calculé sur le téléphone ;
// les noms des lieux se complètent au retour du réseau.
import { useCallback, useEffect, useRef, useState, type KeyboardEvent } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { CARBURANTS, partiesPrix, prix3, type Carburant } from "../lib/format";
import { fmt, validerPrix } from "../lib/calcul";
import {
  bornerPersonnes,
  changerCarburant,
  coutTrajet,
  enregistrerArrete,
  garderCorrection,
  lireArrete,
  lireTrajetV1,
  nomLieu,
  oublierArrete,
  partPersonne,
  prixUtilise,
  supprimerTrajetV1,
  type TrajetV1,
} from "../lib/historique";
import { completerNoms } from "../lib/nommer";
import { moyennesDuPays } from "../lib/prixDuJour";
import { tousPays, type PaysInfo } from "../lib/donnees";
import { Courbe } from "../components/Courbe";
import { T } from "../lib/textes";
import { useEnLigne } from "../lib/enLigne";

const dateLongue = (ms: number) => new Date(ms).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" });
const dureeTexte = (s: number) => T.dureeHeures(Math.floor(s / 3600), Math.floor((s % 3600) / 60));

export default function FinDeTrajet() {
  const nav = useNavigate();
  const loc = useLocation();
  const idRouvert = (loc.state as { id?: string } | null)?.id ?? null;
  const [t, setT] = useState<TrajetV1 | null>(null);
  const [absent, setAbsent] = useState(false);
  const [edition, setEdition] = useState(false);
  const [saisie, setSaisie] = useState("");
  const [erreurPrix, setErreurPrix] = useState(false);
  const [pays, setPays] = useState<Map<string, PaysInfo>>(new Map());
  // carburant demandé dont la moyenne du jour est en cours de lecture, ou introuvable (pas de réseau)
  const [carbAttente, setCarbAttente] = useState<{ c: Carburant; etat: "lecture" | "absente" } | null>(null);
  const courant = useRef<TrajetV1 | null>(null);
  const enLigne = useEnLigne();
  const titre = useRef<HTMLHeadingElement>(null);
  const champ = useRef<HTMLInputElement>(null);
  const compteur = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    tousPays().then(setPays).catch(() => undefined);
  }, []);

  useEffect(() => {
    let actif = true;
    (idRouvert ? lireTrajetV1(idRouvert) : lireArrete())
      .then((x) => {
        if (!actif) return;
        if (x) {
          courant.current = x;
          setT(x);
        }
        else setAbsent(true);
      })
      .catch(() => actif && setAbsent(true));
    return () => {
      actif = false;
    };
  }, [idRouvert]);

  useEffect(() => {
    if (t) titre.current?.focus({ preventScroll: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [t?.id]);

  /**
   * Garde chaque correction : historique (trajet rouvert) ou trajet arrêté en attente. Calculée sur le trajet courant (ref) et
   * écrite hors du rendu : une réponse qui arrive après qu'on a quitté l'écran est quand même gardée (V-6.4, round 2).
   */
  const changer = useCallback((f: (x: TrajetV1) => TrajetV1) => {
    const x = courant.current;
    if (!x) return;
    const n = f(x);
    courant.current = n;
    setT(n);
    garderCorrection(n).catch(() => undefined);
  }, []);

  // noms des lieux (géocodage inverse) et moyennes du jour manquantes : demandés maintenant, puis au retour du réseau
  const completer = useCallback(async () => {
    const x = t;
    if (!x) return;
    const nomme = await completerNoms(x).catch(() => null);
    if (nomme) changer((y) => ({ ...y, depart: nomme.depart, arrivee: nomme.arrivee }));
    if (!x.moyennes[x.carburant]) {
      const m = await moyennesDuPays(x.pays_depart).catch(() => null);
      if (m && Object.keys(m).length > 0) changer((y) => ({ ...y, moyennes: { ...m, ...y.moyennes }, prix_litre: y.prix_litre ?? m[y.carburant]?.prix ?? null }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [t?.id, t?.depart.nom, t?.arrivee.nom, t?.carburant, changer]);
  useEffect(() => {
    completer();
    window.addEventListener("online", completer);
    return () => window.removeEventListener("online", completer);
  }, [completer]);

  useEffect(() => {
    if (edition) {
      champ.current?.focus();
      champ.current?.select();
    }
  }, [edition]);

  if (absent) return <Navigate to={idRouvert ? "/historique" : "/"} replace />;
  if (!t) return <section className="screen" data-screen="T4" aria-busy="true" />;

  const rouvert = t.enregistre;
  const prix = prixUtilise(t);
  const cout = coutTrajet(t);
  const moyenne = t.moyennes[t.carburant];
  const nomPays = (c: string) => T.nomPays(c, pays.get(c)?.nom);
  const libellePrix =
    t.prix_perso != null ? T.monPrix : !moyenne ? T.prixInconnu : moyenne.pays !== t.pays_depart ? T.moyenneDuJourRepli(nomPays(t.pays_depart)) : T.moyenneDuJour(nomPays(moyenne.pays));
  const l100 = t.km > 0 ? (t.litres / t.km) * 100 : 0;
  const vmax = Math.max(1, ...t.vitesses);
  const cmax = Math.max(1, t.conso_max, ...t.consos);
  const route = `${nomLieu(t.depart)} ${T.fleche} ${nomLieu(t.arrivee)}`;

  // un carburant sans moyenne gardée : on lit celle du jour AVANT de changer ; introuvable, le carburant ne change pas
  const choisirCarburant = async (c: Carburant) => {
    const x = courant.current;
    if (!x || c === x.carburant) return;
    if (x.moyennes[c]) {
      setCarbAttente(null);
      return changer((y) => changerCarburant(y, c) ?? y);
    }
    setCarbAttente({ c, etat: "lecture" });
    const lues = await moyennesDuPays(x.pays_depart).catch(() => null);
    const y = courant.current;
    if (y && changerCarburant(y, c, lues)) {
      setCarbAttente(null);
      changer((z) => changerCarburant(z, c, lues) ?? z);
    } else setCarbAttente({ c, etat: "absente" });
  };
  const ouvrirEdition = () => {
    setSaisie(prix == null ? "" : prix3(prix));
    setErreurPrix(false);
    setEdition(true);
  };
  const fermerEdition = () => {
    setEdition(false);
    setErreurPrix(false);
    requestAnimationFrame(() => compteur.current?.focus());
  };
  const valider = () => {
    const v = validerPrix(saisie);
    if (!v.ok) return setErreurPrix(true);
    changer((x) => ({ ...x, prix_perso: v.valeur }));
    fermerEdition();
  };
  const touche = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      valider();
    } else if (e.key === "Escape") {
      e.preventDefault();
      e.stopPropagation();
      fermerEdition();
    }
  };

  const enregistrer = async () => {
    await enregistrerArrete(t);
    nav("/historique", { replace: true, state: { nouveau: t.id } });
  };
  const supprimerNeuf = async () => {
    await oublierArrete();
    nav("/", { replace: true });
  };
  const supprimerRouvert = async () => {
    await supprimerTrajetV1(t.id);
    nav("/historique", { replace: true });
  };

  return (
    <section className="screen" data-screen="T4" role="tabpanel" aria-labelledby={rouvert ? "onglet-historique" : "onglet-trajet"} data-trajet={t.id} data-enregistre={rouvert}>
      <div className="scroll">
        {rouvert && (
          <div className="rhead">
            <button className="back" type="button" data-el="retour-historique" aria-label={T.retourHistoriqueLabel} onClick={() => nav("/historique")}>
              {T.retourHistorique}
            </button>
          </div>
        )}
        <h2 className="route" tabIndex={-1} ref={titre} data-el="titre-trajet" data-noms={t.depart.nom && t.arrivee.nom ? "oui" : "non"}>
          {route}
        </h2>
        <p className="rsub" data-el="sous-titre-trajet">{T.sousTitreTrajet(dateLongue(t.debut), dureeTexte(t.duree_s), t.voiture.nom)}</p>
        {!enLigne && (
          <p className="hint" role="status" data-el="hors-ligne" style={{ margin: "6px 16px 0" }}>{T.horsLigneFin}</p>
        )}
        <div className="kpis">
          <div className="kpi"><b data-el="fin-litres" data-litres={t.litres}>{fmt(t.litres, 2)}</b><span>{T.litres}</span></div>
          <div className="kpi"><b data-el="fin-km" data-km={t.km}>{fmt(t.km, t.km < 100 ? 1 : 0)}</b><span>{T.km}</span></div>
          <div className="kpi"><b data-el="fin-l100">{fmt(l100, 1)}</b><span>{T.l100Moy}</span></div>
        </div>
        <div className="price" data-el="prix-apres" data-prix={prix ?? undefined} data-source={t.prix_perso != null ? "perso" : "moyenne"}>
          <div className="fuels" role="group" aria-label={T.carburant} data-el="carburant-apres" style={{ padding: "0 32px 0 0" }}>
            {CARBURANTS.map((c) => (
              <button key={c} type="button" className="fuel" aria-pressed={c === t.carburant} data-carburant={c} onClick={() => choisirCarburant(c)}>
                {c}
              </button>
            ))}
          </div>
          <div className="l">
            <span data-el="libelle-prix">{libellePrix}</span>
            <span>
              {edition ? (
                <span className="pedit">
                  <input
                    ref={champ}
                    inputMode="decimal"
                    aria-label={T.monPrixChamp}
                    aria-invalid={erreurPrix}
                    aria-describedby={erreurPrix ? "erreur-prix" : undefined}
                    value={saisie}
                    data-el="champ-prix"
                    onChange={(e) => {
                      setSaisie(e.target.value);
                      setErreurPrix(false);
                    }}
                    onKeyDown={touche}
                  />
                </span>
              ) : (
                <button type="button" className="pedit" ref={compteur} data-el="compteur-prix" aria-label={prix == null ? T.prixInconnu : T.modifierPrix(prix3(prix))} onClick={ouvrirEdition}>
                  {prix != null && (
                    <span className="totem" aria-hidden="true">
                      <span className="roll" key={`${t.carburant}-${prix}`}>
                        {partiesPrix(prix).base}
                        <sup>{partiesPrix(prix).fin}</sup>
                      </span>
                      <span className="u">{T.prixUnite}</span>
                    </span>
                  )}
                  <span className="pen" aria-hidden="true">{T.crayon}</span>
                </button>
              )}
            </span>
          </div>
          {carbAttente && (
            <p className={carbAttente.etat === "absente" ? "err-msg" : "hint"} role={carbAttente.etat === "absente" ? "alert" : "status"} data-el="carburant-attente" data-etat={carbAttente.etat} style={{ margin: 0 }}>
              {carbAttente.etat === "absente" ? T.carburantSansMoyenne(carbAttente.c) : T.carburantLecture(carbAttente.c)}
            </p>
          )}
          {erreurPrix && (
            <p className="err-msg" id="erreur-prix" role="alert" data-el="erreur-prix">{T.prixPersoErreur}</p>
          )}
          {t.prix_perso != null && !edition && (
            <button className="link" type="button" data-el="revenir-moyenne" onClick={() => changer((x) => ({ ...x, prix_perso: null }))}>
              {T.revenirMoyenneLabel}
            </button>
          )}
        </div>
        <div className="costbox" data-el="cout-trajet" data-cout={cout ?? undefined}>
          <span className="totem big">
            <span className="roll" key={String(cout)}>{cout == null ? T.vide : fmt(cout, 2)}</span>
            <span className="u">{T.eurosEssence}</span>
          </span>
        </div>
        <div className="stepper" data-el="personnes-apres" data-personnes={t.personnes}>
          <span id="lab-personnes">{T.personnes}</span>
          <div className="ctl" role="group" aria-labelledby="lab-personnes">
            <button type="button" aria-label={T.personneMoins} data-el="personnes-moins" disabled={t.personnes <= 1} onClick={() => changer((x) => ({ ...x, personnes: bornerPersonnes(x.personnes - 1) }))}>
              {T.signeMoins}
            </button>
            <b aria-live="polite">{t.personnes}</b>
            <button type="button" aria-label={T.personnePlus} data-el="personnes-plus" disabled={t.personnes >= 9} onClick={() => changer((x) => ({ ...x, personnes: bornerPersonnes(x.personnes + 1) }))}>
              {T.signePlus}
            </button>
          </div>
        </div>
        <p className="share" data-el="part-personne" style={{ margin: "10px 16px 0" }} data-part={cout != null && t.personnes > 1 ? partPersonne(cout, t.personnes) : undefined}>
          {t.personnes > 1 && cout != null ? (
            <>
              <b>{T.euros(fmt(partPersonne(cout, t.personnes), 2))}</b> {T.chacun}
            </>
          ) : t.personnes > 1 ? (
            T.vide
          ) : (
            T.seul
          )}
        </p>
        <div className="trace" data-el="courbe-vitesse" data-points={t.vitesses.length} data-moyenne={t.vitesse_moy} data-accelerations={t.accelerations}>
          <div className="h">
            <span>{T.courbeVitesseTitre}</span>
            <span data-el="info-vitesse">{T.vitesseMoyAcc(t.vitesse_moy, t.accelerations)}</span>
          </div>
          <Courbe valeurs={t.vitesses} max={Math.max(50, vmax) * 1.1} label={T.courbeVitesseLabel(t.vitesse_moy, Math.round(vmax))} couleur="var(--ink)" />
        </div>
        <div className="trace" data-el="courbe-conso" data-points={t.consos.length} data-moyenne={l100.toFixed(2)} data-pointe={cmax}>
          <div className="h">
            <span>{T.courbeConsoTitre}</span>
            <span data-el="info-conso">{T.consoMoyPointe(fmt(l100, 1), fmt(cmax, 1))}</span>
          </div>
          <Courbe valeurs={t.consos} max={cmax * 1.1} label={T.courbeConsoLabel(fmt(l100, 1), fmt(cmax, 1))} couleur="var(--dear)" />
        </div>
        {rouvert ? (
          <div style={{ margin: "14px 16px 20px" }}>
            <button className="btn ghost" type="button" data-el="supprimer-trajet" onClick={supprimerRouvert}>
              {T.supprimerCeTrajet}
            </button>
          </div>
        ) : (
          <div className="recbar" data-el="enregistrer-ou-supprimer">
            <button className="btn ghost" type="button" data-el="supprimer-neuf" onClick={supprimerNeuf}>
              {T.supprimer}
            </button>
            <button className="btn" type="button" data-el="enregistrer-trajet" onClick={enregistrer}>
              {T.enregistrerTrajet}
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
