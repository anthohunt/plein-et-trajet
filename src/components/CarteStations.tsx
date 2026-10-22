// Carte des stations : MapLibre GL sur le fond « Positron » d'OpenFreeMap (tuiles vectorielles OpenMapTiles, données
// OpenStreetMap ; sans clé ni limite de requêtes, attribution demandée). Jalon 5 round 2 : le Plan IGN n'a de fond qu'en France,
// or la V1 montre aussi les stations d'Europe et du Royaume-Uni (V-5.7) ; ce fond couvre toute l'Europe.
// - cadrage automatique sur les stations (fitBounds) tant que l'utilisateur n'a pas déplacé la carte ;
// - pastilles qui se chevauchent : empilées vers le haut, une tige les relie à leur station ;
// - pastilles hors du cadre : retirées du parcours clavier et de l'arbre d'accessibilité.
import { useEffect, useRef } from "react";
import * as maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { prix3 } from "../lib/format";
import { T } from "../lib/textes";
import type { StationAffichee } from "./LigneStation";

const STYLE_FOND = "https://tiles.openfreemap.org/styles/positron";
const TIGE = 7; // px entre la pastille et la station
const MARGE = { top: 62, bottom: 36, left: 34, right: 34 };

export interface Zone {
  lat: number;
  lon: number;
  rayonM: number;
}

interface Props {
  position: { lat: number; lon: number };
  moi: boolean; // vrai seulement si la position vient du GPS : centre de repli (localisation refusée) = pas de « vous êtes ici »
  stations: (StationAffichee & { moitie: "lo" | "hi" })[];
  selection: string | null;
  recentrage: number; // incrémenté pour demander un recentrage
  cadrer: boolean; // vrai tant que la zone n'a pas été choisie en déplaçant la carte
  onDeplacement: (z: Zone) => void;
  onPastille: (s: StationAffichee, el: HTMLElement) => void;
}

interface Marque {
  m: maplibregl.Marker;
  bouton: HTMLButtonElement;
  tige: HTMLSpanElement;
  prix: number;
}

function rayonVisible(map: maplibregl.Map): number {
  const c = map.getCenter();
  const ne = map.getBounds().getNorthEast();
  return Math.max(3000, Math.min(25000, c.distanceTo(ne)));
}

/** Empile les pastilles qui se chevauchent et retire du parcours clavier celles qui sortent du cadre. */
function disposer(map: maplibregl.Map, marques: Marque[]) {
  const cadre = map.getContainer().getBoundingClientRect();
  // légende, bouton de recentrage, crédits : une pastille dessous n'est pas vraiment visible
  const obstacles = [...(map.getContainer().parentElement?.querySelectorAll(".legend, .recentre, .maplibregl-ctrl-attrib") ?? [])].map((e) => {
    const r = e.getBoundingClientRect();
    return { x1: r.left - cadre.left, x2: r.right - cadre.left, y1: r.top - cadre.top, y2: r.bottom - cadre.top };
  });
  const places: { x1: number; y1: number; x2: number; y2: number }[] = [];
  // zone très dense (plus de 80 stations) à petite échelle : les pastilles qui ne trouvent pas de place à moins de 24 px de leur station
  // sont masquées (elles restent dans la liste et reparaissent en zoomant) au lieu de former un amas de tiges illisible
  const dense = marques.length > 80 && map.getZoom() < 13.5;
  // les moins chères d'abord : elles gardent la place la plus proche de leur station
  for (const q of marques.slice().sort((a, b) => a.prix - b.prix)) {
    const pt = map.project(q.m.getLngLat());
    const w = q.bouton.offsetWidth || 48;
    const h = q.bouton.offsetHeight || 22;
    let decalage = 0;
    const rect = () => ({ x1: pt.x - w / 2 - 1, x2: pt.x + w / 2 + 1, y2: pt.y - TIGE - decalage + 1, y1: pt.y - TIGE - decalage - h - 1 });
    const chevauche = (r: ReturnType<typeof rect>) => places.some((o) => r.x1 < o.x2 && r.x2 > o.x1 && r.y1 < o.y2 && r.y2 > o.y1);
    while (chevauche(rect()) && decalage < (dense ? 24 : 160)) decalage += 3;
    const r = rect();
    const masquee = dense && chevauche(r);
    q.bouton.parentElement?.setAttribute("data-masquee", masquee ? "oui" : "non");
    if (masquee) {
      q.tige.style.height = `${TIGE}px`;
      q.bouton.tabIndex = -1;
      q.bouton.setAttribute("aria-hidden", "true");
      q.bouton.dataset.horsCadre = "oui";
      continue;
    }
    places.push(r);
    q.tige.style.height = `${TIGE + decalage}px`;
    const dedans =
      r.x1 >= 0 && r.x2 <= cadre.width && r.y1 >= 0 && pt.y <= cadre.height &&
      !obstacles.some((o) => r.x1 < o.x2 && r.x2 > o.x1 && r.y1 < o.y2 && r.y2 > o.y1);
    q.bouton.tabIndex = dedans ? 0 : -1;
    if (dedans) q.bouton.removeAttribute("aria-hidden");
    else q.bouton.setAttribute("aria-hidden", "true");
    q.bouton.dataset.horsCadre = dedans ? "non" : "oui";
    q.bouton.dataset.decalage = String(decalage);
  }
}

export default function CarteStations({ position, moi: estIci, stations, selection, recentrage, cadrer, onDeplacement, onPastille }: Props) {
  const conteneur = useRef<HTMLDivElement>(null);
  const carte = useRef<maplibregl.Map | null>(null);
  const marques = useRef<Marque[]>([]);
  const moi = useRef<maplibregl.Marker | null>(null);
  const rappels = useRef({ onDeplacement, onPastille });
  rappels.current = { onDeplacement, onPastille };

  useEffect(() => {
    if (!conteneur.current) return;
    const map = new maplibregl.Map({
      container: conteneur.current,
      style: STYLE_FOND,
      center: [position.lon, position.lat],
      zoom: 11,
      attributionControl: false,
      dragRotate: false,
      pitchWithRotate: false,
      touchPitch: false,
      locale: {
        "AttributionControl.ToggleAttribution": T.creditsBouton,
        "AttributionControl.MapFeedback": T.signalerCarte,
        "Map.Title": T.carteStations,
        "Marker.Title": T.marqueurStation,
      },
    });
    map.addControl(new maplibregl.AttributionControl({ compact: true, customAttribution: T.credits }), "bottom-right");
    // crédits repliés derrière le bouton « i » (ils couvraient légende et pastilles)
    const replier = () => conteneur.current?.querySelector(".maplibregl-ctrl-attrib")?.classList.remove("maplibregl-compact-show");
    replier();
    map.once("styledata", replier);
    map.once("load", replier);
    map.touchZoomRotate.disableRotation();
    map.getCanvas().setAttribute("aria-label", T.carteStations);
    // seulement les déplacements de l'utilisateur (glisser, zoom, clavier), pas les cadrages programmés :
    // le geste est repéré à son début (l'inertie qui le termine n'a plus d'événement d'origine)
    // jalon 5 (V-5.3) : un glissement de plus de 25 px (ou un zoom) propose « Rechercher dans cette zone », sans recharger
    let parUtilisateur = false;
    let depart: { centre: maplibregl.LngLat; zoom: number } | null = null;
    map.on("movestart", (e) => {
      if ((e as { originalEvent?: unknown }).originalEvent) {
        parUtilisateur = true;
        depart = depart ?? { centre: map.getCenter(), zoom: map.getZoom() };
      }
    });
    map.on("moveend", (e) => {
      disposer(map, marques.current);
      if (!parUtilisateur && !(e as { originalEvent?: unknown }).originalEvent) return;
      parUtilisateur = false;
      const avant = depart;
      if (!avant) return;
      const p = map.project(avant.centre);
      const cadre = map.getContainer();
      const glisse = Math.hypot(p.x - cadre.clientWidth / 2, p.y - cadre.clientHeight / 2);
      if (glisse <= 25 && Math.abs(map.getZoom() - avant.zoom) < 0.25) return;
      depart = null;
      const c = map.getCenter();
      rappels.current.onDeplacement({ lat: c.lat, lon: c.lng, rayonM: rayonVisible(map) });
    });
    map.on("resize", () => disposer(map, marques.current));
    carte.current = map;
    (window as unknown as { __carte?: maplibregl.Map }).__carte = map; // inspection par les tests e2e
    return () => {
      map.remove();
      carte.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // « vous êtes ici » : seulement quand la position vient du GPS
  useEffect(() => {
    const map = carte.current;
    if (!map) return;
    if (!estIci) {
      moi.current?.remove();
      moi.current = null;
      return;
    }
    if (!moi.current) {
      const el = document.createElement("div");
      el.className = "me";
      el.dataset.el = "vous-etes-ici";
      el.title = T.vousEtesIci;
      el.setAttribute("role", "img");
      el.setAttribute("aria-label", T.vousEtesIci);
      moi.current = new maplibregl.Marker({ element: el }).setLngLat([position.lon, position.lat]).addTo(map);
    } else moi.current.setLngLat([position.lon, position.lat]);
  }, [estIci, position.lat, position.lon]);

  // recentrage demandé : retour immédiat sur la position (le cadrage suit quand la liste est rechargée)
  useEffect(() => {
    if (!recentrage || !carte.current) return;
    carte.current.jumpTo({ center: [position.lon, position.lat], zoom: 11 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recentrage]);

  // pastilles
  useEffect(() => {
    const map = carte.current;
    if (!map) return;
    marques.current.forEach((q) => q.m.remove());
    marques.current = stations.map((s) => {
      const wrap = document.createElement("div");
      wrap.className = "pin-wrap";
      const b = document.createElement("button");
      b.type = "button";
      b.className = `pin ${s.moitie}`;
      b.dataset.el = "pastille-station";
      b.dataset.station = s.id;
      b.dataset.moitie = s.moitie;
      const label = T.annoncePastille(s.libelle, prix3(s.prix), s.moitie === "lo");
      b.textContent = prix3(s.prix);
      b.addEventListener("click", (ev) => {
        ev.stopPropagation();
        rappels.current.onPastille(s, b);
      });
      const tige = document.createElement("span");
      tige.className = `tige ${s.moitie}`;
      tige.setAttribute("aria-hidden", "true");
      wrap.append(b, tige);
      const m = new maplibregl.Marker({ element: wrap, anchor: "bottom" }).setLngLat([s.lon, s.lat]).addTo(map);
      // MapLibre pose « Map marker » sur l'élément du marqueur : l'annonce utile est sur le bouton
      wrap.removeAttribute("aria-label");
      wrap.removeAttribute("role");
      wrap.removeAttribute("tabindex");
      b.setAttribute("aria-label", label);
      return { m, bouton: b, tige, prix: s.prix };
    });
    if (cadrer && stations.length > 0) {
      // cadre centré sur l'utilisateur, à l'échelle des stations proches (≤ 4 km, au moins les 3 plus proches, au plus les 25 plus proches) ;
      // les plus lointaines restent dans la liste et apparaissent en dézoomant
      const proches = stations.slice().sort((a, c) => a.distanceKm - c.distanceKm);
      const coeur = proches.filter((x, i) => i < 3 || (x.distanceKm <= 4 && i < 25)); // zone dense : cadre resserré sur les 25 plus proches
      const b = new maplibregl.LngLatBounds([position.lon, position.lat], [position.lon, position.lat]);
      // points miroirs : le cadre reste centré sur la position de l'utilisateur
      coeur.forEach((x) => b.extend([x.lon, x.lat]).extend([2 * position.lon - x.lon, 2 * position.lat - x.lat]));
      const cam = map.cameraForBounds(b, { padding: MARGE, maxZoom: 13 });
      map.jumpTo({ center: [position.lon, position.lat], zoom: Math.max(10, Math.min(13, cam?.zoom ?? 11)) });
    }
    disposer(map, marques.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stations]);

  useEffect(() => {
    marques.current.forEach((q) => q.bouton.classList.toggle("on", q.bouton.dataset.station === selection));
  }, [selection, stations]);

  return <div className="gl" ref={conteneur} />;
}
