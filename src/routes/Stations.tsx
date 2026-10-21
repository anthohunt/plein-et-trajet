// T5 Stations (jalon 5, T5.7 ; ex-S1 Prix) : sélecteur de carburant (celui de la voiture d'office), carte des stations,
// « Rechercher dans cette zone » après un glissement (pas de rechargement automatique), liste triable ; fiche station en
// feuille avec « Utiliser ce prix » ; bandeau « Trajet en cours » pendant un enregistrement.
import { Suspense, lazy, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { enDirect } from "../../supabase/functions/_shared/roule.ts";
import { enregistreur } from "../lib/plateforme";
import { useEnregistrement, useVoitureV1 } from "../lib/useEnregistrement";
import { garderPrixChoisi } from "../lib/prixChoisi";
import { vehiculeDe } from "../lib/voiture";
import { prixDirect } from "../components/EnRoute";
import { fmt } from "../lib/calcul";
import { SelecteurCarburant } from "../components/SelecteurCarburant";
import { LigneStation, type StationAffichee } from "../components/LigneStation";
import { FicheStation } from "../components/FicheStation";
import type { Zone } from "../components/CarteStations";
import { distanceKm, libellesStations, moitie, seuilMoitie, trier, type Carburant, type Tri } from "../lib/format";
import { infoPays, moyennesParPays, paysDePosition, prixCarburant, stationsAutour, tousPays, type PaysInfo, type Station } from "../lib/donnees";
import type { MoyennePays } from "../lib/pays";
import { prix3 } from "../lib/format";
import { type Position } from "../lib/position";
import { communeDuLieu } from "../lib/geocodage";
import { T } from "../lib/textes";

const CarteStations = lazy(() => import("../components/CarteStations"));
const RAYON_INITIAL = 10_000;

interface Props {
  position: Position | null;
  onZone: (libelle: string | null) => void; // en-tête : zone de la carte quand on l'a déplacée, null = autour de la position
  carburant: Carburant;
  setCarburant: (c: Carburant) => void;
  tri: Tri;
  setTri: (t: Tri) => void;
}

type Etat = "chargement" | "pret" | "erreur";

export default function Stations({ position, onZone, carburant, setCarburant, tri, setTri }: Props) {
  const nav = useNavigate();
  const voiture = useVoitureV1();
  const { etat: enCours, maintenant } = useEnregistrement();
  const [zone, setZone] = useState<Zone | null>(null);
  const [zoneProposee, setZoneProposee] = useState<Zone | null>(null); // carte glissée : « Rechercher dans cette zone »
  const [stations, setStations] = useState<Station[] | null>(null);
  // prix lus pour un carburant donné : jamais affichés sous le titre d'un autre carburant
  const [prix, setPrix] = useState<{ carburant: Carburant; parStation: Map<string, { prix: number; maj: string | null }> } | null>(null);
  const [moyennes, setMoyennes] = useState<Map<string, MoyennePays>>(new Map());
  const [sansFlux, setSansFlux] = useState<{ nom: string; moyenne: number | null; statut: "non_branche" | "aucun" } | null>(null);
  const [pays, setPays] = useState<Map<string, PaysInfo>>(new Map());
  useEffect(() => {
    tousPays().then(setPays).catch(() => setPays(new Map()));
  }, []);
  const [etat, setEtat] = useState<Etat>("chargement");
  const [essai, setEssai] = useState(0);
  const [ouverte, setOuverte] = useState<StationAffichee | null>(null);
  const [recentrage, setRecentrage] = useState(0);
  const [cadrer, setCadrer] = useState(true);
  const ouvreur = useRef<HTMLElement | null>(null);
  const requete = useRef(0);

  // zone initiale = position (GPS ou repli)
  useEffect(() => {
    if (position && !zone) setZone({ lat: position.lat, lon: position.lon, rayonM: RAYON_INITIAL });
  }, [position, zone]);

  // stations de la zone puis prix du carburant
  useEffect(() => {
    if (!zone) return;
    const n = ++requete.current;
    setEtat("chargement");
    (async () => {
      try {
        const st = await stationsAutour(zone.lat, zone.lon, zone.rayonM);
        if (n !== requete.current) return;
        const lignes = await prixCarburant(carburant, st.map((s) => s.id));
        if (n !== requete.current) return;
        setStations(st);
        setPrix({ carburant, parStation: new Map(lignes.filter((l) => l.prix != null).map((l) => [l.station_id, { prix: l.prix as number, maj: l.maj }])) });
        setEtat("pret");
      } catch {
        if (n !== requete.current) return;
        setEtat("erreur");
      }
    })();
  }, [zone, carburant, essai]);

  useEffect(() => {
    let actif = true;
    moyennesParPays(carburant).then((m) => actif && setMoyennes(m)).catch(() => actif && setMoyennes(new Map()));
    return () => {
      actif = false;
    };
  }, [carburant]);

  // aucune station dans la zone : si la position est dans un pays qui ne publie pas ses prix station par station, on le dit (US-1.8)
  useEffect(() => {
    setSansFlux(null);
    if (etat !== "pret" || !stations || stations.length > 0 || !zone) return;
    let actif = true;
    (async () => {
      const p = await paysDePosition(zone.lat, zone.lon);
      if (!actif || !p || p.code === "FR") return;
      const info = await infoPays(p.code);
      if (!actif || info?.statut_flux === "branche") return;
      const m = await moyennesParPays(carburant).catch(() => new Map<string, MoyennePays>());
      if (actif) setSansFlux({ nom: info?.nom ?? p.nom, moyenne: m.get(p.code)?.prix_moyen ?? null, statut: info?.statut_flux === "non_branche" ? "non_branche" : "aucun" });
    })();
    return () => {
      actif = false;
    };
  }, [etat, stations, zone, carburant]);

  const affichees = useMemo(() => {
    if (etat === "erreur" || !stations || !prix || prix.carburant !== carburant || !position) return [];
    const l: StationAffichee[] = [];
    const vendues = stations.filter((s) => prix.parStation.has(s.id)); // non vendu ou en rupture : absente de la carte et de la liste
    // libellés départagés sur TOUTES les stations de la zone : un libellé désigne la même station quel que soit le carburant
    const libelles = libellesStations(stations);
    for (const s of vendues) {
      const p = prix.parStation.get(s.id)!;
      l.push({ ...s, libelle: libelles.get(s.id)!, prix: p.prix, maj: p.maj, distanceKm: distanceKm(position, s) });
    }
    return l;
  }, [etat, stations, prix, position, carburant]);

  // à égalité de coupures, la moyenne du pays départage : une pastille ne contredit pas l'écart « vs France » de sa ligne
  const moyenneZone = moyennes.get(affichees[0]?.pays ?? "FR")?.prix_moyen ?? null;
  const seuil = useMemo(() => seuilMoitie(affichees.map((s) => s.prix), moyenneZone), [affichees, moyenneZone]);
  const pastilles = useMemo(() => affichees.map((s) => ({ ...s, moitie: moitie(s.prix, seuil) })), [affichees, seuil]);
  const liste = useMemo(() => trier(affichees, tri), [affichees, tri]);

  const ouvrir = useCallback((s: StationAffichee, el: HTMLElement) => {
    ouvreur.current = el;
    setOuverte(s);
  }, []);

  const fermer = useCallback(() => {
    const id = ouverte?.id;
    setOuverte(null);
    // le focus revient sur l'élément qui a ouvert la fiche ; si la liste a été redessinée entre-temps, sur la ligne de la même station
    const rendre = () => {
      const el = ouvreur.current;
      const cible = el && el.isConnected ? el : id ? (document.querySelector(`[data-station="${id}"]`) as HTMLElement | null) : null;
      cible?.focus();
      return !!cible && document.activeElement === cible;
    };
    requestAnimationFrame(() => {
      if (!rendre()) setTimeout(rendre, 80);
    });
  }, [ouverte]);

  useEffect(() => {
    if (!ouverte) return;
    const k = (e: KeyboardEvent) => {
      if (e.key === "Escape") fermer();
    };
    document.addEventListener("keydown", k);
    return () => document.removeEventListener("keydown", k);
  }, [ouverte, fermer]);

  // carte déplacée : l'en-tête nomme la commune au centre de la carte (« Autour de Gaillac ») ; recentrée ou quittée : la position
  const zoneNommee = useRef<AbortController | null>(null);
  const nommerZone = (z: Zone | null) => {
    zoneNommee.current?.abort();
    if (!z) return onZone(null);
    const c = new AbortController();
    zoneNommee.current = c;
    communeDuLieu(z.lat, z.lon, c.signal).then((l) => !c.signal.aborted && onZone(l ? T.autourDe(l.label) : T.carteDeplacee));
  };
  useEffect(() => () => {
    zoneNommee.current?.abort();
    onZone(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const rechercherZone = () => {
    if (!zoneProposee) return;
    setCadrer(false);
    setZone(zoneProposee);
    nommerZone(zoneProposee);
    setZoneProposee(null);
  };

  // « Utiliser ce prix » : prix du trajet en cours (retour à l'écran En route), sinon du prochain trajet (retour à l'accueil)
  const utiliserPrix = (prix: number, station: string) => {
    if (!voiture) return;
    if (enCours) {
      enregistreur().changerPrix(prix);
      nav("/en-route");
    } else {
      garderPrixChoisi({ prix, carburant: voiture.carburant, station });
      nav("/");
    }
  };
  const coutEnCours = useMemo(() => {
    if (!enCours) return null;
    const p = prixDirect(enCours);
    if (!p) return null;
    return enDirect(enCours.points, enCours.pauses, enCours.debut, maintenant, vehiculeDe(enCours.voiture), enCours.enPause).litres * p.prix;
  }, [enCours, maintenant]);

  const recentrer = () => {
    if (!position) return;
    setZoneProposee(null);
    nommerZone(null);
    setRecentrage((x) => x + 1);
    setCadrer(true);
    setZone({ lat: position.lat, lon: position.lon, rayonM: RAYON_INITIAL });
  };

  return (
    <section className="screen" data-screen="T5" role="tabpanel" id="panneau-stations" aria-labelledby="onglet-stations">
      {enCours && (
        <div className="ongoing" data-el="retour-trajet" role="status">
          <span>
            <span aria-hidden="true">● </span>
            {coutEnCours == null ? T.trajetEnCoursSansPrix : T.trajetEnCours(fmt(coutEnCours, 2))}
          </span>
        </div>
      )}
      <SelecteurCarburant valeur={carburant} onChange={setCarburant} />
      {position?.motif && (
        <p className="notice" role="status" data-el="message-localisation">
          {position.motif === "refusee" ? T.positionRefusee(position.label) : T.positionIndisponible(position.label)}
        </p>
      )}
      <div className="map" data-el="carte-stations" data-pastilles={etat === "pret" && prix?.carburant === carburant ? pastilles.length : undefined} aria-busy={etat === "chargement"}>
        {position && (
          <Suspense fallback={<div className="map-load">{T.chargement}</div>}>
            <CarteStations
              position={position}
              moi={position.source === "gps"}
              stations={pastilles}
              selection={ouverte?.id ?? null}
              recentrage={recentrage}
              cadrer={cadrer}
              onDeplacement={(z) => setZoneProposee(z)}
              onPastille={ouvrir}
            />
          </Suspense>
        )}
        {etat !== "erreur" && (
          <div className="legend" aria-hidden="true" data-el="legende">
            <span><i style={{ background: "var(--cheap)" }} />{T.legendeBas}</span>
            <span><i style={{ background: "var(--dear)" }} />{T.legendeHaut}</span>
          </div>
        )}
        {zoneProposee && (
          <button type="button" className="zone" data-el="rechercher-zone" onClick={rechercherZone}>
            {T.rechercherZone}
          </button>
        )}
        <button type="button" className="recentre" aria-label={T.recentrer} title={T.recentrer} data-el="recentrer" onClick={recentrer}>
          <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="4" />
            <path d="M12 2v3M12 19v3M2 12h3M19 12h3" />
          </svg>
        </button>
      </div>
      <div className="listhead">
        <h2 className="sec" data-el="titre-liste">{T.stations(carburant)}</h2>
        <div className="seg" role="group" aria-label={T.trier} data-el="tri-liste">
          <button type="button" aria-pressed={tri === "prix"} onClick={() => setTri("prix")}>{T.moinsCher}</button>
          <button type="button" aria-pressed={tri === "distance"} onClick={() => setTri("distance")}>{T.plusProche}</button>
        </div>
      </div>
      <div className="scroll" aria-live="polite" aria-busy={etat === "chargement"}>
        {etat === "erreur" ? (
          <div className="etat" data-el="etat-erreur" role="alert">
            <p className="t">{T.prixIndisponibles}</p>
            <button type="button" className="btn small" onClick={() => setEssai((x) => x + 1)}>{T.reessayer}</button>
          </div>
        ) : etat === "chargement" && (!stations || prix?.carburant !== carburant) ? (
          <p className="etat d">{T.chargement}</p>
        ) : liste.length === 0 && etat === "pret" && sansFlux ? (
          <div className="etat" data-el="pays-sans-flux">
            <p className="t" role="status">{sansFlux.statut === "non_branche" ? T.paysNonBranche : T.paysSansFlux}</p>
            <p className="d" data-el="prix-moyen-national">
              {sansFlux.moyenne == null ? T.paysSansFluxAucuneMoyenne : T.paysSansFluxMoyenne(sansFlux.nom, carburant, prix3(sansFlux.moyenne))}
            </p>
          </div>
        ) : liste.length === 0 && etat === "pret" ? (
          <p className="etat empty" data-el="etat-vide">{T.aucuneStation}</p>
        ) : (
          <ul className="rows" data-el="liste-stations" data-tri={tri} data-carburant={carburant}>
            {liste.map((s) => (
              <LigneStation key={s.id} s={s} moyenne={moyennes.get(s.pays ?? "FR")?.prix_moyen ?? null} nomPays={s.pays && s.pays !== "FR" ? pays.get(s.pays)?.nom : undefined} carburant={carburant} onOuvrir={ouvrir} />
            ))}
          </ul>
        )}
      </div>
      {ouverte && (
        <FicheStation station={ouverte} onFermer={fermer} carburantVoiture={voiture?.carburant ?? null} onUtiliserPrix={(p) => utiliserPrix(p, ouverte.libelle)} />
      )}
    </section>
  );
}
