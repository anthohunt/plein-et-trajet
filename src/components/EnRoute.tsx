// T3 En route (jalon 5, T5.4) : vitesse et sa courbe des 3 dernières minutes, km, litres, € essence, durée, km/h moyens,
// L/100 km ; « GPS perdu » après 15 s sans position ; Pause / Reprendre ; Arrêter ; alerte d'immobilité (10 min) avec
// « Reprendre » et « C'est fini ». Le coût en direct est au prix choisi (« Utiliser ce prix »), sinon à la moyenne du jour du
// pays de départ pour le carburant de la voiture.
import { useEffect, useMemo, useRef, useState } from "react";
import { fmt } from "../lib/calcul";
import { enDirect } from "../../supabase/functions/_shared/roule.ts";
import { enregistreur, type EnCours } from "../lib/plateforme";
import { tousPays, type PaysInfo } from "../lib/donnees";
import { nomVoiture, vehiculeDe } from "../lib/voiture";
import { T } from "../lib/textes";
import { Courbe } from "./Courbe";
import { useEnLigne } from "../lib/enLigne";

export const dureeTexte = (s: number) => `${Math.floor(s / 3600)}:${String(Math.floor((s % 3600) / 60)).padStart(2, "0")}`;

/** Prix du coût en direct : celui d'une station (« Utiliser ce prix »), sinon la moyenne du jour du pays de départ. */
export function prixDirect(e: EnCours): { prix: number; source: "perso" | "moyenne"; pays: string } | null {
  if (e.prixChoisi != null) return { prix: e.prixChoisi, source: "perso", pays: e.pays };
  const m = e.moyennes[e.voiture.carburant];
  return m ? { prix: m.prix, source: "moyenne", pays: m.pays } : null;
}

type EtatVerrou = "attente" | "actif" | "indisponible";

export function EnRoute({ e, maintenant, onArreter }: { e: EnCours; maintenant: number; onArreter: () => void }) {
  const [verrou, setVerrou] = useState<EtatVerrou>("attente");
  const [pays, setPays] = useState<Map<string, PaysInfo>>(new Map());
  const titre = useRef<HTMLHeadingElement>(null);
  const alerte = useRef<HTMLDivElement>(null);
  const rec = enregistreur();
  const enLigne = useEnLigne();

  useEffect(() => {
    titre.current?.focus({ preventScroll: true });
    tousPays().then(setPays).catch(() => undefined);
  }, []);

  // verrou d'écran (navigateur) : redemandé au retour sur la page
  useEffect(() => {
    let sentinelle: WakeLockSentinel | null = null;
    let fini = false;
    const demander = async () => {
      if (!("wakeLock" in navigator)) return setVerrou("indisponible");
      try {
        sentinelle = await navigator.wakeLock.request("screen");
        if (fini) return void sentinelle.release().catch(() => undefined);
        setVerrou("actif");
      } catch {
        if (!fini) setVerrou("indisponible");
      }
    };
    const visible = () => document.visibilityState === "visible" && demander();
    demander();
    document.addEventListener("visibilitychange", visible);
    return () => {
      fini = true;
      document.removeEventListener("visibilitychange", visible);
      sentinelle?.release().catch(() => undefined);
    };
  }, []);

  useEffect(() => {
    if (e.immobile != null) alerte.current?.focus();
  }, [e.immobile]);

  const d = useMemo(() => enDirect(e.points, e.pauses, e.debut, maintenant, vehiculeDe(e.voiture), e.enPause), [e, maintenant]);
  const prix = prixDirect(e);
  const euros = prix ? d.litres * prix.prix : null;
  const moy = d.dureeS >= 60 && d.km > 0 ? Math.round(d.km / (d.dureeS / 3600)) : null;
  const nomPays = (c: string) => T.nomPays(c, pays.get(c)?.nom);
  const immobile = e.immobile != null;
  const etatTexte = immobile ? T.immobileEtat : e.enPause ? T.enPause : T.enregistrement;

  return (
    <section className="screen" data-screen="T3" role="tabpanel" aria-labelledby="onglet-trajet" data-etat={immobile ? "immobile" : e.enPause ? "pause" : d.gpsPerdu ? "gps-perdu" : "enregistrement"} data-points={e.points.length} data-dernier-point={e.points[e.points.length - 1]?.[0]}>
      <div className="scroll">
        <h2 className="sr-only" tabIndex={-1} ref={titre}>{T.enregistrement}</h2>
        <div className="recstate">
          <span className={"on" + (e.enPause ? " pause" : "") + (immobile ? " immobile" : "")} data-el="etat-enregistrement" role="status">
            {!e.enPause && <i aria-hidden="true" />}
            {etatTexte}
          </span>
          <span data-el="voiture-en-route">{nomVoiture(e.voiture)}</span>
        </div>
        <div className="live" data-el="vitesse-direct">
          <div className="sr-only">{T.vitesse}</div>
          <div className="speed">
            <span className="totem" data-el="vitesse" data-kmh={d.vitesse}>
              <span>{d.vitesse}</span>
              <span className="u">{T.kmh}</span>
            </span>
          </div>
          <Courbe className="spark" valeurs={d.courbe} max={Math.max(50, ...d.courbe) * 1.1} /* plancher 50 km/h : une courbe de ville occupe le cadre */ hauteur={56} label={T.courbeDirect} couleur="var(--accent)" el="courbe-direct" />
          <div className="lgrid">
            <div><b data-el="direct-km">{fmt(d.km, 1)}</b><span>{T.km}</span></div>
            <div><b data-el="direct-litres">{fmt(d.litres, 2)}</b><span>{T.litres}</span></div>
            <div><b data-el="direct-euros">{euros == null ? T.vide : fmt(euros, 2)}</b><span>{T.eurosEssence}</span></div>
          </div>
          <div className="lgrid">
            <div><b data-el="direct-duree">{dureeTexte(d.dureeS)}</b><span>{T.duree}</span></div>
            <div><b data-el="direct-moyenne">{moy == null ? T.vide : moy}</b><span>{T.kmhMoy}</span></div>
            <div><b data-el="direct-l100">{d.l100 == null ? T.vide : fmt(d.l100, 1)}</b><span>{T.l100}</span></div>
          </div>
        </div>
        <p className="hint" data-el="ecran-eteint" data-plateforme={rec.plateforme} data-verrou={verrou}>
          {rec.plateforme === "android" ? T.ecranEteintAndroid : T.ecranEteintWeb}
        </p>
        {!enLigne && (
          <p className="hint" role="status" data-el="hors-ligne">{T.horsLigneEnRoute}</p>
        )}
        {d.gpsPerdu && !immobile && (
          <p className="hint gps" role="alert" data-el="gps-perdu">{T.gpsPerduV1}</p>
        )}
        <p className="hint" data-el="prix-direct" data-prix={prix?.prix} data-source={prix?.source}>
          {!prix
            ? T.prixDirectAttente
            : prix.source === "perso"
              ? T.prixDirectMonPrix(fmt(prix.prix, 3))
              : prix.pays !== e.pays
                ? T.prixDirectMoyenneRepli(nomPays(e.pays), fmt(prix.prix, 3))
                : T.prixDirectMoyenne(nomPays(prix.pays), fmt(prix.prix, 3))}
        </p>
        {immobile && (
          <div className="alert" role="alertdialog" aria-labelledby="titre-immobile" tabIndex={-1} ref={alerte} data-el="alerte-immobile" data-depuis={e.immobile ?? undefined}>
            <b id="titre-immobile">{T.immobileTitre}</b>
            <div className="r">
              <button className="btn ghost" type="button" data-el="immobile-reprendre" onClick={() => rec.reprendreApresImmobile()}>
                {T.reprendre}
              </button>
              <button className="btn" type="button" data-el="immobile-fini" onClick={onArreter}>
                {T.cestFini}
              </button>
            </div>
          </div>
        )}
        {!immobile && (
          <div className="recbar">
            <button className="btn ghost" type="button" data-el="bouton-pause" onClick={() => (e.enPause ? rec.reprendre() : rec.pause())}>
              {e.enPause ? T.reprendre : T.pause}
            </button>
            <button className="btn" type="button" data-el="bouton-arreter" onClick={onArreter}>
              {T.arreterV1}
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
