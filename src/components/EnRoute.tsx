// S6 En route : enregistrement en cours — vitesse et sa courbe des 3 dernières minutes, distance, litres, coût, durée, arrêts, L/100 km ;
// verrou d'écran (Screen Wake Lock) avec repli déclaré ; « GPS perdu » après 15 s sans position ; Pause / Reprendre ; Arrêter.
import { useEffect, useMemo, useRef, useState, type Dispatch, type SetStateAction } from "react";
import { fmt } from "../lib/calcul";
import { ajouterPosition, basculerPause, garderEnCours, type EnregistrementEnCours } from "../lib/enRoute";
import { enDirect } from "../../supabase/functions/_shared/roule.ts";
import { T } from "../lib/textes";

interface Props {
  e: EnregistrementEnCours;
  setE: Dispatch<SetStateAction<EnregistrementEnCours | null>>;
  prix: { valeur: number; pays: string } | null; // prix moyen du jour du pays du départ
  onArreter: () => void;
}

type EtatVerrou = "attente" | "actif" | "indisponible";

export function cheminCourbe(vals: number[], w: number, h: number, max: number): string {
  if (vals.length === 0) return "";
  const n = Math.max(vals.length - 1, 1);
  return vals.map((v, i) => `${i ? "L" : "M"}${((i / n) * w).toFixed(1)} ${(h - 2 - (Math.min(v, max) / max) * (h - 6)).toFixed(1)}`).join(" ");
}

export const dureeTexte = (s: number) => `${Math.floor(s / 3600)}:${String(Math.floor((s % 3600) / 60)).padStart(2, "0")}`;

export function EnRoute({ e, setE, prix, onArreter }: Props) {
  const [maintenant, setMaintenant] = useState(() => Date.now());
  const [verrou, setVerrou] = useState<EtatVerrou>("attente");
  const titre = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    titre.current?.focus({ preventScroll: true });
  }, []);

  // positions : une par mise à jour du GPS, gardées sur le téléphone à chaque ajout
  useEffect(() => {
    if (!("geolocation" in navigator)) return;
    const id = navigator.geolocation.watchPosition(
      (pos) =>
        setE((prec) => {
          if (!prec) return prec;
          const n = ajouterPosition(prec, pos.timestamp || Date.now(), pos.coords.latitude, pos.coords.longitude);
          if (n !== prec) garderEnCours(n);
          return n;
        }),
      () => {
        /* signal perdu : l'écran le dit après 15 s sans position */
      },
      { enableHighAccuracy: true, maximumAge: 0, timeout: 60000 },
    );
    return () => navigator.geolocation.clearWatch(id);
  }, [setE]);

  // horloge de l'écran : rafraîchit vitesse, courbe et compteurs chaque seconde
  useEffect(() => {
    const t = window.setInterval(() => setMaintenant(Date.now()), 1000);
    return () => window.clearInterval(t);
  }, []);

  // verrou d'écran : redemandé au retour sur la page (le navigateur le relâche quand la page est cachée)
  useEffect(() => {
    let sentinelle: WakeLockSentinel | null = null;
    let fini = false;
    const demander = async () => {
      if (!("wakeLock" in navigator)) {
        setVerrou("indisponible");
        return;
      }
      try {
        sentinelle = await navigator.wakeLock.request("screen");
        if (fini) {
          sentinelle.release().catch(() => undefined);
          return;
        }
        setVerrou("actif");
        sentinelle.addEventListener("release", () => {
          if (!fini && document.visibilityState === "visible") setVerrou("indisponible");
        });
      } catch {
        if (!fini) setVerrou("indisponible");
      }
    };
    const visible = () => {
      if (document.visibilityState === "visible") demander();
    };
    demander();
    document.addEventListener("visibilitychange", visible);
    return () => {
      fini = true;
      document.removeEventListener("visibilitychange", visible);
      sentinelle?.release().catch(() => undefined);
    };
  }, []);

  const d = useMemo(() => enDirect(e.points, e.pauses, e.debut, maintenant, e.veh, e.enPause), [e, maintenant]);
  const euros = prix ? d.litres * prix.valeur : null;
  const courbeMax = Math.max(140, ...d.courbe);
  const sansSignal = d.dernierPointMs != null ? Math.round((maintenant - d.dernierPointMs) / 1000) : 0;

  const pause = () => {
    setE((prec) => {
      if (!prec) return prec;
      const n = basculerPause(prec, Date.now());
      garderEnCours(n);
      return n;
    });
  };

  return (
    <section className="screen" data-screen="S6" role="tabpanel" id="panneau-trajets" aria-labelledby="onglet-trajets" data-etat={e.enPause ? "pause" : d.gpsPerdu ? "gps-perdu" : "enregistrement"}>
      <div className="scroll">
        <h2 className="sr-only" tabIndex={-1} ref={titre}>{T.enregistrement}</h2>
        <div className="recstate">
          <span className={"on" + (e.enPause ? " pause" : "")} data-el="etat-enregistrement" role="status">
            {!e.enPause && <i aria-hidden="true" />}
            {e.enPause ? T.enPause : T.enregistrement}
          </span>
          <span data-el="voiture-en-route">{e.vehiculeLibelle}</span>
        </div>
        {d.gpsPerdu && (
          <div className="gps-perdu" role="alert" data-el="gps-perdu">
            <b>{T.gpsPerdu}</b>
            <span>{T.gpsPerduDetail(sansSignal)}</span>
          </div>
        )}
        <div className="live" data-el="vitesse-direct">
          <div className="lab">{T.vitesse}</div>
          <div className="speed">
            <span className="totem" data-el="vitesse" data-kmh={d.vitesse}>
              <span>{d.vitesse}</span>
              <span className="u">{T.kmh}</span>
            </span>
          </div>
          <svg className="spark" viewBox="0 0 300 56" preserveAspectRatio="none" role="img" aria-label={T.courbeDirect} data-el="courbe-direct" data-points={d.courbe.length}>
            <path d={cheminCourbe(d.courbe, 300, 56, courbeMax)} fill="none" stroke="var(--accent)" strokeWidth="2" vectorEffect="non-scaling-stroke" />
          </svg>
          <div className="lgrid">
            <div><b data-el="direct-km">{fmt(d.km, 1)}</b><span>{T.km}</span></div>
            <div><b data-el="direct-litres">{fmt(d.litres, 2)}</b><span>{T.litres}</span></div>
            <div><b data-el="direct-euros">{euros == null ? "—" : fmt(euros, 2)}</b><span>{T.eurosCarburant}</span></div>
          </div>
          <div className="lgrid">
            <div><b data-el="direct-duree">{dureeTexte(d.dureeS)}</b><span>{T.duree}</span></div>
            <div><b data-el="direct-arrets">{d.arrets}</b><span>{T.arretsCourt}</span></div>
            <div><b data-el="direct-l100">{d.l100 == null ? "—" : fmt(d.l100, 1)}</b><span>{T.l100}</span></div>
          </div>
        </div>
        <p className="note rec-note" data-el="direct-sans-montees">{T.directSansMontees}</p>
        <p className="note" data-el="ecran-allume" data-verrou={verrou}>
          {verrou === "indisponible" ? T.ecranVerrouIndispo : verrou === "attente" ? T.ecranVerrouAttente : T.ecranAllume}
        </p>
        <p className="note" data-el="prix-direct">{prix ? T.prixDuJourPays(prix.pays, fmt(prix.valeur, 3)) : T.prixDuJourAbsent}</p>
        <div className="recbar">
          <button className="btn ghost" type="button" data-el="bouton-pause" onClick={pause}>
            {e.enPause ? T.reprendre : T.pause}
          </button>
          <button className="btn" type="button" data-el="bouton-arreter" onClick={onArreter}>
            {T.arreter}
          </button>
        </div>
      </div>
    </section>
  );
}
