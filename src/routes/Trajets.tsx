// S3 Trajets (formulaire + historique) et S4 Résultat du trajet.
import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { useLocation } from "react-router-dom";
import { T } from "../lib/textes";
import { geocoderLieu, geocoderVille } from "../lib/geocodage";
import { memoriserVille, type Lieu } from "../lib/position";
import { coutCarburant } from "../lib/calcul";
import { distanceKm } from "../lib/format";
import { moyenneNationale } from "../lib/donnees";
import { sessionAnonyme } from "../lib/session";
import { ErreurCalcul, enregistrerTrajet, estimerTrajet, listerTrajets, supprimerTrajet, type TrajetEnregistre } from "../lib/trajets";
import { useVoiture } from "../lib/useVoiture";
import { ChampLieu } from "../components/ChampLieu";
import { ChoixVoiture } from "../components/ChoixVoiture";
import { Historique, type EtatHistorique } from "../components/Historique";
import { Resultat, type EtatResultat } from "../components/Resultat";

type Phase = "formulaire" | "calcul" | "resultat";
interface Demande {
  depart: Lieu;
  arrivee: Lieu;
  vehiculeId: string;
  rejoue?: string; // id du trajet de l'historique rejoué
}
interface Erreurs {
  depart: string | null;
  arrivee: string | null;
  voiture: string | null;
}
const SANS_ERREUR: Erreurs = { depart: null, arrivee: null, voiture: null };

export default function Trajets() {
  const loc = useLocation();
  const arriveeInitiale = (loc.state as { arrivee?: string } | null)?.arrivee ?? "";
  const [depart, setDepart] = useState("");
  const [arrivee, setArrivee] = useState(arriveeInitiale);
  const [lieuDepart, setLieuDepart] = useState<Lieu | null>(null);
  const [lieuArrivee, setLieuArrivee] = useState<Lieu | null>(null);
  const [erreurs, setErreurs] = useState<Erreurs>(SANS_ERREUR);
  const [verif, setVerif] = useState(false);
  const [phase, setPhase] = useState<Phase>("formulaire");
  const [resultat, setResultat] = useState<EtatResultat | null>(null);
  const [libelleCalcul, setLibelleCalcul] = useState("");
  const [trajets, setTrajets] = useState<TrajetEnregistre[]>([]);
  const [etatHist, setEtatHist] = useState<EtatHistorique>("chargement");
  const [erreurSuppression, setErreurSuppression] = useState(false);
  const [erreurRejeu, setErreurRejeu] = useState(false);
  const voiture = useVoiture();
  const champDepart = useRef<HTMLInputElement>(null);
  const champArrivee = useRef<HTMLInputElement>(null);
  const controleur = useRef<AbortController | null>(null);
  const derniere = useRef<Demande | null>(null);
  const retourFocus = useRef<string | null>(null); // « calculer » ou « trajet:<id> » : l'élément qui a ouvert le résultat

  useEffect(() => () => controleur.current?.abort(), []);

  // la voiture choisie lève l'erreur « Choisis ta voiture »
  useEffect(() => {
    if (voiture.vehicule) setErreurs((er) => (er.voiture ? { ...er, voiture: null } : er));
  }, [voiture.vehicule]);

  useEffect(() => {
    if (arriveeInitiale) {
      setArrivee(arriveeInitiale);
      setLieuArrivee(null);
      champArrivee.current?.focus();
    }
  }, [arriveeInitiale]);

  const rafraichirHistorique = useCallback(async () => {
    try {
      setTrajets(await listerTrajets());
      setEtatHist("ok");
    } catch {
      setEtatHist("erreur");
    }
  }, []);

  useEffect(() => {
    sessionAnonyme()
      .then(rafraichirHistorique)
      .catch(() => setEtatHist("erreur"));
  }, [rafraichirHistorique]);

  // retour au formulaire : le focus revient sur l'élément qui avait lancé le calcul
  useEffect(() => {
    if (phase !== "formulaire" || !retourFocus.current) return;
    const cible = retourFocus.current;
    retourFocus.current = null;
    const el = cible === "calculer" ? document.getElementById("bouton-calculer") : document.querySelector<HTMLElement>(`button.go[data-trajet="${cible.slice(7)}"]`);
    el?.focus({ preventScroll: true });
  }, [phase]);

  // dernière ville saisie : sert de repli à l'écran Prix quand la position est refusée (US-1.1)
  const retenirVille = (texte: string, lieu: Lieu | null) => {
    if (lieu) return memoriserVille(lieu);
    geocoderVille(texte)
      .then((l) => l && memoriserVille(l))
      .catch(() => {
        /* géocodage injoignable : on garde la ville précédente */
      });
  };

  const lancer = async (d: Demande) => {
    derniere.current = d;
    const ctrl = new AbortController();
    controleur.current = ctrl;
    setLibelleCalcul(`${d.depart.label} ${T.fleche} ${d.arrivee.label}`);
    setPhase("calcul");
    requestAnimationFrame(() => document.getElementById("bouton-annuler")?.focus());
    const noms = { departLabel: d.depart.label, arriveeLabel: d.arrivee.label };
    try {
      const est = await estimerTrajet(d.depart, d.arrivee, d.vehiculeId, ctrl.signal);
      if (controleur.current !== ctrl) return; // annulé entre-temps
      const moyenne = await moyenneNationale(est.vehicule.carburant).catch(() => null);
      if (controleur.current !== ctrl) return;
      const cout = moyenne == null ? null : coutCarburant(est.litres, moyenne);
      let historiqueEchec = false;
      try {
        await enregistrerTrajet({ depart: d.depart, arrivee: d.arrivee, estimation: est, prixLitre: moyenne, cout });
      } catch {
        historiqueEchec = true;
      }
      if (controleur.current !== ctrl) return;
      await rafraichirHistorique();
      setResultat({ genre: "ok", donnees: { ...noms, estimation: est, moyenne, historiqueEchec, rejoue: !!d.rejoue } });
      setPhase("resultat");
    } catch (e) {
      if (controleur.current !== ctrl || (e instanceof ErreurCalcul && e.code === "annule")) return;
      const pasDeRoute = e instanceof ErreurCalcul && e.code === "pas_itineraire";
      const memeLieu = pasDeRoute && distanceKm(d.depart, d.arrivee) < 0.2;
      setResultat(pasDeRoute ? { genre: "pas_itineraire", ...noms, memeLieu } : { genre: "erreur", ...noms });
      setPhase("resultat");
    }
  };

  const annuler = () => {
    controleur.current?.abort();
    controleur.current = null;
    setPhase("formulaire");
  };

  const retour = () => {
    setResultat(null);
    setPhase("formulaire");
  };

  const calculer = async (e?: FormEvent) => {
    e?.preventDefault();
    if (verif || phase !== "formulaire") return;
    setVerif(true);
    const errs: Erreurs = { depart: null, arrivee: null, voiture: voiture.vehicule ? null : T.choisisVoiture };
    const resoudre = async (texte: string, lieu: Lieu | null): Promise<{ lieu: Lieu | null; erreur: string | null }> => {
      if (lieu) return { lieu, erreur: null };
      if (texte.trim().length < 2) return { lieu: null, erreur: T.lieuManquant };
      try {
        const l = await geocoderLieu(texte);
        return l ? { lieu: l, erreur: null } : { lieu: null, erreur: T.lieuIntrouvable };
      } catch {
        return { lieu: null, erreur: T.lieuVerifIndispo };
      }
    };
    const [rd, ra] = await Promise.all([resoudre(depart, lieuDepart), resoudre(arrivee, lieuArrivee)]);
    errs.depart = rd.erreur;
    errs.arrivee = ra.erreur;
    setErreurs(errs);
    setVerif(false);
    if (errs.depart || errs.arrivee || errs.voiture || !rd.lieu || !ra.lieu || !voiture.vehicule) {
      requestAnimationFrame(() => {
        if (errs.depart) champDepart.current?.focus();
        else if (errs.arrivee) champArrivee.current?.focus();
        else document.getElementById("voiture-marque")?.focus();
      });
      return;
    }
    setLieuDepart(rd.lieu);
    setLieuArrivee(ra.lieu);
    retourFocus.current = "calculer";
    await lancer({ depart: rd.lieu, arrivee: ra.lieu, vehiculeId: voiture.vehicule.id });
  };

  const rejouer = async (t: TrajetEnregistre) => {
    setErreurRejeu(false);
    if (!t.vehicule_id) {
      setErreurRejeu(true);
      return;
    }
    retourFocus.current = `trajet:${t.id}`;
    await lancer({
      depart: { lat: t.depart_lat, lon: t.depart_lon, label: t.depart_label },
      arrivee: { lat: t.arrivee_lat, lon: t.arrivee_lon, label: t.arrivee_label },
      vehiculeId: t.vehicule_id,
      rejoue: t.id,
    });
  };

  const supprimer = async (t: TrajetEnregistre) => {
    setErreurSuppression(false);
    try {
      await supprimerTrajet(t.id);
      setTrajets((l) => l.filter((x) => x.id !== t.id));
    } catch {
      setErreurSuppression(true);
    }
  };

  const inverser = () => {
    setDepart(arrivee);
    setArrivee(depart);
    setLieuDepart(lieuArrivee);
    setLieuArrivee(lieuDepart);
    setErreurs((er) => ({ ...er, depart: null, arrivee: null }));
  };

  if (phase === "calcul") {
    return (
      <section className="screen" data-screen="S4" data-etat="calcul" role="tabpanel" id="panneau-trajets" aria-labelledby="onglet-trajets">
        <div className="scroll">
          <h2 className="route">{libelleCalcul}</h2>
          <div className="calcul" data-el="calcul-en-cours">
            <p className="t" role="status">{T.calculEnCours}</p>
            <p className="d">{T.calculEnCoursDetail}</p>
            <div className="chargeur" aria-hidden="true"><i /></div>
            <button id="bouton-annuler" className="btn small" type="button" data-el="annuler-calcul" onClick={annuler}>
              {T.annuler}
            </button>
          </div>
        </div>
      </section>
    );
  }
  if (phase === "resultat" && resultat) {
    return <Resultat etat={resultat} onRetour={retour} onReessayer={() => derniere.current && lancer(derniere.current)} />;
  }

  return (
    <section className="screen" data-screen="S3" role="tabpanel" id="panneau-trajets" aria-labelledby="onglet-trajets">
      <div className="scroll">
        <h2 className="sec">{T.nouveauTrajet}</h2>
        <form className="form" onSubmit={calculer} noValidate>
          <fieldset className="fieldset">
            <legend className="sr-only">{T.nouveauTrajet}</legend>
            <ChampLieu
              id="dep"
              etiquette={T.depart}
              placeholder={T.departPlaceholder}
              dataEl="champ-depart"
              texte={depart}
              inputRef={champDepart}
              erreur={erreurs.depart}
              onTexte={(t) => {
                setDepart(t);
                setLieuDepart(null);
                setErreurs((er) => ({ ...er, depart: null }));
              }}
              onChoix={setLieuDepart}
              onSortie={() => depart.trim() && retenirVille(depart, lieuDepart)}
            />
            <button type="button" className="swap" data-el="inverser" aria-label={T.inverser} onClick={inverser}>
              <span aria-hidden="true">⇅</span>
            </button>
            <ChampLieu
              id="arr"
              etiquette={T.arrivee}
              placeholder={T.arriveePlaceholder}
              dataEl="champ-arrivee"
              texte={arrivee}
              inputRef={champArrivee}
              erreur={erreurs.arrivee}
              onTexte={(t) => {
                setArrivee(t);
                setLieuArrivee(null);
                setErreurs((er) => ({ ...er, arrivee: null }));
              }}
              onChoix={setLieuArrivee}
              onSortie={() => arrivee.trim() && retenirVille(arrivee, lieuArrivee)}
            />
          </fieldset>
          <ChoixVoiture v={voiture} erreur={erreurs.voiture} />
          <button id="bouton-calculer" className="btn" type="submit" data-el="bouton-calculer" aria-disabled={verif || undefined}>
            {verif ? T.verification : T.calculer}
          </button>
        </form>
        <Historique etat={etatHist} trajets={trajets} occupe={verif} erreurSuppression={erreurSuppression} erreurRejeu={erreurRejeu} onRejouer={rejouer} onSupprimer={supprimer} />
      </div>
    </section>
  );
}
