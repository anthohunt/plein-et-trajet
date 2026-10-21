// Enregistreur web (jalon 5, T5.4 ; reprend src/lib/enRoute.ts du jalon 4) : watchPosition haute précision, points gardés
// en IndexedDB à chaque position, arrêt automatique après 10 min d'immobilité, calcul de fin de trajet sur le téléphone.
// L'instant d'un point est l'horloge de la page (Date.now()) à sa réception : les vitesses restent justes quand un test
// accélère l'horloge (Playwright page.clock), et l'écart avec l'horodatage du GPS est de l'ordre de la milliseconde.
import { ajouterPosition, basculerPause, calculLocal, immobileDepuis, SEUIL_KM, type PointRoule } from "../../supabase/functions/_shared/roule.ts";
import type { EnCours, Enregistreur, IssueArret } from "./plateforme";
import type { TrajetV1 } from "./historique";
import { garderArrete } from "./historique";
import { CLE_ENREGISTREMENT, db } from "./stockage";
import { detailVoiture, nomVoiture, vehiculeDe, type VoitureV1 } from "./voiture";
import { paysDePosition } from "./donnees";
import { moyennesDuPays } from "./prixDuJour";
import { garderPrixChoisi, lirePrixChoisi } from "./prixChoisi";
import { Capacitor } from "@capacitor/core";
import { BackgroundGeolocation } from "@capgo/background-geolocation";

// Appli Android (jalon 6) : le GPS passe par un service de premier plan (notification permanente), qui continue écran
// éteint et quand Waze ou Maps est devant ; dans le navigateur, watchPosition comme avant.
const natif = Capacitor.isNativePlatform();
let ecouteNative = false;

let etat: EnCours | null = null;
let instant = { etat: null as EnCours | null, maintenant: Date.now() };
let ecoute: number | null = null;
let horloge: number | null = null;
const abonnes = new Set<() => void>();

function publier() {
  instant = { etat, maintenant: Date.now() };
  abonnes.forEach((f) => f());
}
function garder() {
  const e = etat;
  db()
    .then(async (d) => {
      if (e) await d.put("en_cours", e, CLE_ENREGISTREMENT);
      else await d.delete("en_cours", CLE_ENREGISTREMENT);
    })
    .catch(() => undefined);
}

/** Arrêt automatique : 10 min sous 3 km/h dans 50 m → le trajet cesse de compter, l'alerte demande confirmation. */
function verifierImmobile(maintenant: number) {
  if (!etat || etat.enPause || etat.immobile != null) return;
  const d = immobileDepuis(etat.points, maintenant, etat.ignorerAvant);
  if (d == null) return;
  etat = { ...etat, immobile: d, enPause: true, pauses: [...etat.pauses, [d, null]], points: etat.points.filter((p) => p[0] <= d) };
  garder();
}

// un même relevé GPS remis deux fois par le navigateur (même horodatage), ou des relevés à moins de 250 ms : ignorés — sinon un
// point en double ferait croire à un arrêt puis à une ré-accélération
let dernierReleve = -Infinity;
const ECART_MIN_MS = 250;

function surPosition(pos: GeolocationPosition) {
  if (!etat) return;
  const t = Date.now();
  const dernier = etat.points[etat.points.length - 1];
  if (pos.timestamp <= dernierReleve || (dernier && t - dernier[0] < ECART_MIN_MS)) return;
  dernierReleve = pos.timestamp;
  const v = pos.coords.speed;
  const n = ajouterPosition(etat, t, pos.coords.latitude, pos.coords.longitude, pos.coords.altitude, v == null || !Number.isFinite(v) ? null : v * 3.6);
  if (n !== etat) {
    etat = n;
    verifierImmobile(t);
    garder();
  }
  publier();
}

function ecouterNatif() {
  if (ecouteNative) return;
  ecouteNative = true;
  BackgroundGeolocation.requestPermissions({ permissions: ["location", "notification"] })
    .catch(() => undefined)
    .then(() =>
      BackgroundGeolocation.start(
        { backgroundTitle: "Plein & Trajet", backgroundMessage: "Trajet en cours d'enregistrement", requestPermissions: true, stale: false, distanceFilter: 0 },
        (l) => {
          if (!l) return;
          surPosition({
            timestamp: l.time ?? Date.now(),
            coords: { latitude: l.latitude, longitude: l.longitude, altitude: l.altitude, speed: l.speed, accuracy: l.accuracy },
          } as unknown as GeolocationPosition);
        },
      ),
    )
    .catch(() => {
      ecouteNative = false;
    });
}

function ecouter() {
  if (natif) ecouterNatif();
  else if (ecoute == null && "geolocation" in navigator) {
    ecoute = navigator.geolocation.watchPosition(surPosition, () => undefined, { enableHighAccuracy: true, maximumAge: 0, timeout: 60000 });
  }
  if (horloge == null) {
    horloge = window.setInterval(() => {
      verifierImmobile(Date.now());
      publier();
    }, 1000);
  }
}
function taire() {
  if (ecouteNative) BackgroundGeolocation.stop().catch(() => undefined);
  ecouteNative = false;
  if (ecoute != null) navigator.geolocation.clearWatch(ecoute);
  if (horloge != null) window.clearInterval(horloge);
  ecoute = null;
  horloge = null;
}

function premierePosition(): Promise<GeolocationPosition> {
  return new Promise((ok, ko) => {
    if (!("geolocation" in navigator)) return ko({ code: 2 });
    navigator.geolocation.getCurrentPosition(ok, ko, { enableHighAccuracy: true, maximumAge: 0, timeout: 10000 });
  });
}

const id = () => (typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `t${Date.now()}${Math.random().toString(16).slice(2)}`);

export const enregistreurWeb: Enregistreur = {
  plateforme: natif ? "android" : "web",

  async demarrer(voiture: VoitureV1) {
    let pos: GeolocationPosition;
    try {
      pos = await premierePosition();
    } catch (e) {
      return { ok: false, erreur: (e as GeolocationPositionError)?.code === 1 ? "refusee" : "indisponible" };
    }
    const t = Date.now();
    const choisi = lirePrixChoisi();
    garderPrixChoisi(null); // le prix d'une station vaut pour ce trajet-ci
    etat = {
      version: 2,
      id: id(),
      debut: t,
      points: [],
      pauses: [],
      enPause: false,
      segment: 0,
      voiture,
      pays: "FR",
      moyennes: {},
      prixChoisi: choisi && choisi.carburant === voiture.carburant ? choisi.prix : null,
      immobile: null,
      ignorerAvant: -Infinity,
    };
    etat = ajouterPosition(etat, t, pos.coords.latitude, pos.coords.longitude, pos.coords.altitude, pos.coords.speed == null ? null : pos.coords.speed * 3.6);
    garder();
    ecouter();
    publier();
    // pays du départ et moyennes du jour : demandés au départ, gardés pour finir le trajet sans réseau
    const idTrajet = etat.id;
    (async () => {
      const p = await paysDePosition(pos.coords.latitude, pos.coords.longitude).catch(() => null);
      const pays = p?.code ?? "FR";
      const moyennes = await moyennesDuPays(pays).catch(() => ({}));
      if (!etat || etat.id !== idTrajet) return;
      etat = { ...etat, pays, moyennes };
      garder();
      publier();
    })();
    return { ok: true };
  },

  pause() {
    if (!etat || etat.enPause) return;
    etat = basculerPause(etat, Date.now());
    garder();
    publier();
  },
  reprendre() {
    if (!etat || !etat.enPause || etat.immobile != null) return;
    etat = basculerPause(etat, Date.now());
    garder();
    publier();
  },
  reprendreApresImmobile() {
    if (!etat || etat.immobile == null) return;
    const t = Date.now();
    etat = { ...basculerPause({ ...etat, immobile: null }, t), ignorerAvant: t };
    garder();
    publier();
  },

  async arreter(): Promise<IssueArret> {
    const e = etat;
    if (!e) return { tropCourt: 0 };
    taire();
    const fin = e.immobile ?? Math.max(e.points[e.points.length - 1]?.[0] ?? e.debut, e.enPause ? e.pauses[e.pauses.length - 1]?.[0] ?? e.debut : Date.now());
    const pauses = e.pauses.map(([a, b]) => [a, b ?? fin] as [number, number]);
    const points = e.points.filter((p) => p[0] <= fin);
    const r = calculLocal(points, pauses, vehiculeDe(e.voiture), e.debut, fin);
    etat = null;
    garder();
    publier();
    if (r.km < SEUIL_KM) return { tropCourt: r.km };
    const premier = points[0];
    const dernier = points[points.length - 1];
    const carb = e.voiture.carburant;
    const trajet: TrajetV1 = {
      id: e.id,
      debut: e.debut,
      fin,
      depart: { lat: premier[1], lon: premier[2], nom: null },
      arrivee: { lat: dernier[1], lon: dernier[2], nom: null },
      pays_depart: e.pays,
      km: r.km,
      litres: r.litres,
      carburant: carb,
      moyennes: e.moyennes,
      prix_litre: e.moyennes[carb]?.prix ?? null,
      prix_perso: e.prixChoisi,
      personnes: 1,
      vitesses: r.vitesses,
      consos: r.consos,
      conso_max: r.conso_max,
      vitesse_moy: r.vitesse_moy,
      accelerations: r.accelerations,
      duree_s: r.duree_s,
      voiture: { nom: nomVoiture(e.voiture), detail: detailVoiture(e.voiture), carburant: carb },
      enregistre: false,
    };
    await garderArrete(trajet).catch(() => undefined);
    return { trajet };
  },

  etat: () => etat,
  points: () => etat?.points ?? [],
  async effacer() {
    taire();
    etat = null;
    garder();
    publier();
  },
  changerPrix(prix: number | null) {
    if (!etat) return;
    etat = { ...etat, prixChoisi: prix };
    garder();
    publier();
  },
  async restaurer() {
    if (etat) return etat;
    const e = (await (await db()).get("en_cours", CLE_ENREGISTREMENT).catch(() => undefined)) as EnCours | undefined;
    if (!e || e.version !== 2 || !Array.isArray(e.points) || !e.voiture) return null;
    etat = e;
    ecouter();
    publier();
    return etat;
  },
  abonner(f: () => void) {
    abonnes.add(f);
    return () => abonnes.delete(f);
  },
  instantane: () => instant,
};

export type { PointRoule };
