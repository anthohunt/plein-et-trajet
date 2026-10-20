// Carte des stations : MapLibre GL sur fond Plan IGN (tuiles vectorielles de la Géoplateforme).
import { useEffect, useRef } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { prix3 } from "../lib/format";
import { T } from "../lib/textes";
import type { StationAffichee } from "./LigneStation";

const STYLE_IGN = "https://data.geopf.fr/annexes/ressources/vectorTiles/styles/PLAN.IGN/standard.json";

export interface Zone {
  lat: number;
  lon: number;
  rayonM: number;
}

interface Props {
  position: { lat: number; lon: number };
  stations: (StationAffichee & { moitie: "lo" | "hi" })[];
  selection: string | null;
  recentrage: number; // incrémenté pour demander un recentrage
  onDeplacement: (z: Zone) => void;
  onPastille: (s: StationAffichee, el: HTMLElement) => void;
}

function rayonVisible(map: maplibregl.Map): number {
  const c = map.getCenter();
  const ne = map.getBounds().getNorthEast();
  const r = c.distanceTo(ne);
  return Math.max(3000, Math.min(25000, r));
}

export default function CarteStations({ position, stations, selection, recentrage, onDeplacement, onPastille }: Props) {
  const conteneur = useRef<HTMLDivElement>(null);
  const carte = useRef<maplibregl.Map | null>(null);
  const marqueurs = useRef<maplibregl.Marker[]>([]);
  const moi = useRef<maplibregl.Marker | null>(null);
  const rappels = useRef({ onDeplacement, onPastille });
  rappels.current = { onDeplacement, onPastille };

  useEffect(() => {
    if (!conteneur.current) return;
    const map = new maplibregl.Map({
      container: conteneur.current,
      style: STYLE_IGN,
      center: [position.lon, position.lat],
      zoom: 11,
      attributionControl: { compact: true, customAttribution: "© IGN – Géoplateforme · prix : data.economie.gouv.fr" },
      dragRotate: false,
      pitchWithRotate: false,
      touchPitch: false,
      locale: {
        "AttributionControl.ToggleAttribution": "Afficher ou masquer les crédits",
        "AttributionControl.MapFeedback": "Signaler une erreur de carte",
        "Map.Title": T.carteStations,
        "Marker.Title": "Station",
      },
    });
    map.touchZoomRotate.disableRotation();
    // crédits repliés derrière le bouton « i » pour ne pas couvrir les pastilles
    map.once("load", () => conteneur.current?.querySelector(".maplibregl-ctrl-attrib")?.classList.remove("maplibregl-compact-show"));
    map.getCanvas().setAttribute("aria-label", T.carteStations);
    map.on("moveend", (e) => {
      // seulement les déplacements de l'utilisateur (glisser, zoom, clavier), pas les recentrages programmés
      if (!(e as { originalEvent?: unknown }).originalEvent) return;
      const c = map.getCenter();
      rappels.current.onDeplacement({ lat: c.lat, lon: c.lng, rayonM: rayonVisible(map) });
    });
    carte.current = map;
    const el = document.createElement("div");
    el.className = "me";
    el.title = T.vousEtesIci;
    el.setAttribute("role", "img");
    el.setAttribute("aria-label", T.vousEtesIci);
    moi.current = new maplibregl.Marker({ element: el }).setLngLat([position.lon, position.lat]).addTo(map);
    (window as unknown as { __carte?: maplibregl.Map }).__carte = map; // inspection par les tests e2e
    return () => {
      map.remove();
      carte.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // position de l'utilisateur
  useEffect(() => {
    moi.current?.setLngLat([position.lon, position.lat]);
  }, [position.lat, position.lon]);

  // recentrage demandé
  useEffect(() => {
    if (!recentrage || !carte.current) return;
    const reduit = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    carte.current[reduit ? "jumpTo" : "easeTo"]({ center: [position.lon, position.lat], zoom: 11, ...(reduit ? {} : { duration: 600 }) });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recentrage]);

  // pastilles
  useEffect(() => {
    const map = carte.current;
    if (!map) return;
    marqueurs.current.forEach((m) => m.remove());
    marqueurs.current = stations.map((s) => {
      const b = document.createElement("button");
      b.type = "button";
      b.className = `pin ${s.moitie}`;
      b.dataset.el = "pastille-station";
      b.dataset.station = s.id;
      b.dataset.moitie = s.moitie;
      const label = `${s.libelle}, ${prix3(s.prix)} euros le litre, ${s.moitie === "lo" ? T.legendeBas : T.legendeHaut}`;
      b.setAttribute("aria-label", label);
      b.textContent = prix3(s.prix);
      b.addEventListener("click", (ev) => {
        ev.stopPropagation();
        rappels.current.onPastille(s, b);
      });
      const m = new maplibregl.Marker({ element: b, anchor: "bottom", offset: [0, -8] }).setLngLat([s.lon, s.lat]).addTo(map);
      // MapLibre remplace aria-label par « Map marker » à l'ajout : on remet l'annonce station + prix
      b.setAttribute("aria-label", label);
      return m;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stations]);

  // pastille de la station ouverte
  useEffect(() => {
    marqueurs.current.forEach((m) => {
      const el = m.getElement();
      el.classList.toggle("on", el.dataset.station === selection);
    });
  }, [selection, stations]);

  return <div className="gl" ref={conteneur} />;
}
