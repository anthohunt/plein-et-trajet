// S1 Prix : sélecteur de carburant, carte des stations, liste triable ; S2 fiche station en feuille.
import { Suspense, lazy, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { SelecteurCarburant } from "../components/SelecteurCarburant";
import { LigneStation, type StationAffichee } from "../components/LigneStation";
import { FicheStation } from "../components/FicheStation";
import type { Zone } from "../components/CarteStations";
import { distanceKm, libellesStations, moitie, seuilMoitie, trier, type Carburant, type Tri } from "../lib/format";
import { infoPays, moyennesParPays, paysDePosition, prixCarburant, stationsAutour, tousPays, type PaysInfo, type Station } from "../lib/donnees";
import type { MoyennePays } from "../lib/pays";
import { prix3 } from "../lib/format";
import { memoriserVille, type Position } from "../lib/position";
import { T } from "../lib/textes";

const CarteStations = lazy(() => import("../components/CarteStations"));
const RAYON_INITIAL = 10_000;

interface Props {
  position: Position | null;
  carburant: Carburant;
  setCarburant: (c: Carburant) => void;
  tri: Tri;
  setTri: (t: Tri) => void;
}

type Etat = "chargement" | "pret" | "erreur";

export default function Prix({ position, carburant, setCarburant, tri, setTri }: Props) {
  const nav = useNavigate();
  const [zone, setZone] = useState<Zone | null>(null);
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

  const seuil = useMemo(() => seuilMoitie(affichees.map((s) => s.prix)), [affichees]);
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

  const recentrer = () => {
    if (!position) return;
    setRecentrage((x) => x + 1);
    setCadrer(true);
    setZone({ lat: position.lat, lon: position.lon, rayonM: RAYON_INITIAL });
  };

  return (
    <section className="screen" data-screen="S1" role="tabpanel" id="panneau-prix" aria-labelledby="onglet-prix">
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
              stations={pastilles}
              selection={ouverte?.id ?? null}
              recentrage={recentrage}
              cadrer={cadrer}
              onDeplacement={(z) => {
                setCadrer(false);
                setZone(z);
              }}
              onPastille={ouvrir}
            />
          </Suspense>
        )}
        <div className="legend" aria-hidden="true">
          <span><i style={{ background: "var(--cheap)" }} />{T.legendeBas}</span>
          <span><i style={{ background: "var(--dear)" }} />{T.legendeHaut}</span>
        </div>
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
            <p className="d">{T.prixIndisponiblesDetail}</p>
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
        <FicheStation
          station={ouverte}
          onFermer={fermer}
          onTrajet={(adresse) => {
            if (ouverte.ville) memoriserVille({ label: ouverte.ville, lat: ouverte.lat, lon: ouverte.lon });
            nav("/trajets", { state: { arrivee: adresse } });
          }}
        />
      )}
    </section>
  );
}
