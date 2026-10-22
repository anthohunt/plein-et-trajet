// Enregistreur web (jalon 5, T5.4 ; reprend src/lib/enRoute.ts du jalon 4) : watchPosition haute précision, points gardés
// en IndexedDB à chaque position, arrêt automatique après 10 min d'immobilité, calcul de fin de trajet sur le téléphone.
// Navigateur : l'instant d'un point est l'horloge de la page (Date.now()) à sa réception — les vitesses restent justes quand un
// test accélère l'horloge (Playwright page.clock), et la page au premier plan reçoit chaque position sans délai.
// Appli Android (jalon 6, round 2) : l'instant est l'heure du RELEVÉ, écrite par le service natif dans son journal. Datés à la
// réception, des relevés remis en rafale au passage en arrière-plan gonflaient les litres (audit r1, problème 1).
import { ajouterPosition, basculerPause, calculLocal, immobileDepuis, SEUIL_KM, type EtatPoints, type PointRoule } from "../../supabase/functions/_shared/roule.ts";
import type { EnCours, Enregistreur, IssueArret } from "./plateforme";
import type { TrajetV1 } from "./historique";
import { garderArrete } from "./historique";
import { CLE_ENREGISTREMENT, db } from "./stockage";
import { detailVoiture, nomVoiture, vehiculeDe, type VoitureV1 } from "./voiture";
import { paysDePosition } from "./donnees";
import { moyennesDuPays } from "./prixDuJour";
import { garderPrixChoisi, lirePrixChoisi } from "./prixChoisi";
import { Capacitor, type PluginListenerHandle } from "@capacitor/core";
import { T } from "./textes";
import { TrajetEnRoute, type ContenuNotification } from "./trajetEnRoute";

// Appli Android (jalon 6) : le GPS passe par le service de premier plan TrajetService (notification permanente), qui continue
// écran éteint, quand Waze ou Maps est devant, et même quand Android a tué l'appli (relancé par le système, il écrit ses relevés
// sans la page) ; dans le navigateur, watchPosition comme avant.
const natif = Capacitor.isNativePlatform();
let ecouteNative = false;
let ecouteReleves: Promise<PluginListenerHandle> | null = null;

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
  const acc = pos.coords.accuracy;
  const n = ajouterPosition(etat, t, pos.coords.latitude, pos.coords.longitude, pos.coords.altitude, v == null || !Number.isFinite(v) ? null : v * 3.6, acc > 0 && Number.isFinite(acc) ? acc : null);
  if (n !== etat) {
    etat = n;
    verifierImmobile(t);
    garder();
  }
  publier();
}

/** Une ligne du journal du service natif : relevé GPS (P) ou bouton de la notification (A) ; `n` = son numéro dans le journal. */
export type Entree = (
  | { type: "P"; t: number; lat: number; lon: number; altitude: number | null; kmh: number | null; precision: number | null }
  | { type: "A"; t: number; action: string }
) & { n?: number };

const nombreOuNull = (s: string | undefined) => (s == null || s === "" || !Number.isFinite(Number(s)) ? null : Number(s));
/** Lit le journal écrit par TrajetService.java (une ligne par événement, champs séparés par « ; ») ; les lignes non vides sont
 *  numérotées à partir de `premier`, comme le service les compte (JournalTrajet.java). */
export function lireJournal(texte: string, premier = 1): Entree[] {
  const out: Entree[] = [];
  let n = premier - 1;
  for (const l of texte.split("\n")) {
    if (l === "") continue;
    n++;
    const c = l.split(";");
    const t = Number(c[1]);
    if (!Number.isFinite(t)) continue;
    if (c[0] === "P" && c.length >= 4) {
      const lat = Number(c[2]);
      const lon = Number(c[3]);
      if (!Number.isFinite(lat) || !Number.isFinite(lon)) continue;
      out.push({ type: "P", t, lat, lon, altitude: nombreOuNull(c[4]), kmh: nombreOuNull(c[5]), precision: nombreOuNull(c[6]), n });
    } else if (c[0] === "A" && c[2]) out.push({ type: "A", t, action: c[2], n });
  }
  return out;
}

function avecReleve<E extends EtatPoints>(e: E, x: Extract<Entree, { type: "P" }>): E {
  return ajouterPosition(e, x.t, x.lat, x.lon, x.altitude, x.kmh, x.precision != null && x.precision > 0 ? x.precision : null);
}
/** Points d'une suite de relevés, chacun à l'instant du relevé (un relevé déjà vu ou plus ancien est ignoré). */
export function entreesEnPoints(entrees: Entree[]): PointRoule[] {
  let e: EtatPoints = { points: [], pauses: [], enPause: false, segment: 0 };
  for (const x of entrees) if (x.type === "P") e = avecReleve(e, x);
  return e.points;
}

/** Ce que l'application d'une ligne du journal lit et change dans l'état d'un trajet. */
export type EtatJournal = EtatPoints & { immobile: number | null; ignorerAvant: number; lu?: number; ligne?: number };

/**
 * Applique une ligne du journal, une seule fois. Round 3 (audit r2, problème 1) : l'ORDRE est le numéro de la ligne dans le
 * journal, pas son heure — un relevé est daté par le GNSS, un bouton par le service, et l'heure automatique d'Android laisse
 * jusqu'à 2 s entre les deux. L'heure garde son sens : un relevé mesuré avant une pause compte même écrit après le bouton, un
 * relevé de la pause écrit après la reprise ne compte pas, et une pause ne commence jamais avant le dernier point compté.
 */
export function appliquerEntree<E extends EtatJournal>(e: E, x: Entree): E {
  // état gardé avant le round 3 : seule l'heure de sa dernière ligne (`lu`) dit ce qui a été appliqué
  const vu = x.n != null && e.ligne != null ? x.n <= e.ligne : e.ligne == null && x.t <= (e.lu ?? -Infinity);
  if (vu) return e;
  let r = e;
  const pa = r.pauses[r.pauses.length - 1];
  if (x.type === "P") {
    if (!r.enPause) {
      if (!(pa && pa[1] != null && x.t <= pa[1])) r = avecReleve(r, x);
    } else if (pa && pa[1] == null && x.t < pa[0]) r = { ...avecReleve({ ...r, enPause: false }, x), enPause: true };
  } else {
    const t = Math.max(x.t, r.points[r.points.length - 1]?.[0] ?? -Infinity, r.enPause && pa ? pa[0] : -Infinity);
    if (x.action === "pause" && !r.enPause) r = basculerPause(r, t);
    else if (x.action === "reprendre" && r.enPause && r.immobile == null) r = basculerPause(r, t);
    else if (x.action === "reprendre-immobile" && r.immobile != null) r = { ...basculerPause({ ...r, immobile: null }, t), ignorerAvant: t };
  }
  return x.n != null ? { ...r, ligne: x.n, lu: undefined } : { ...r, lu: Math.max(x.t, r.lu ?? -Infinity) };
}
function appliquer(x: Entree) {
  if (!etat) return;
  etat = appliquerEntree(etat, x);
  if (x.type === "P") verifierImmobile(x.t);
}

// appli Android : écart heure des relevés − horloge de la page, mesuré sur le dernier relevé reçu en direct ; les boutons de
// l'appli (Pause, Reprendre) sont datés sur l'horloge des relevés, comme ceux de la notification
let ecartReleves = 0;
function instantBouton(e: EnCours): number {
  const t = Date.now();
  if (!natif) return t;
  const pa = e.pauses[e.pauses.length - 1];
  return Math.max(t + ecartReleves, (e.points[e.points.length - 1]?.[0] ?? -Infinity) + 1, e.enPause && pa ? pa[0] : -Infinity);
}

/** Contenu de la notification avant la première mise à jour par notifTrajet.ts. */
const contenuDeBase = (): ContenuNotification => ({
  titre: T.notifEnCours,
  texte: T.notificationTexte,
  enPause: false,
  immobile: false,
  reprendre: T.reprendre,
  cestFini: T.cestFini,
  pause: T.pause,
  arreter: T.arreterV1,
  titreEnCours: T.notifEnCours,
  titrePause: T.notifEnPause,
  gabarit: "",
  km: 0,
  euros: null,
  prix: null,
  l100ParVitesse: [],
  ligne: 0,
});

// relecture du journal en cours (réouverture de l'appli) : « Arrêter » l'attend, sinon la fin de trajet perdrait des points
let rattrapage: Promise<void> | null = null;
async function ecouterNatif() {
  if (ecouteNative || !etat) return;
  ecouteNative = true;
  const id = etat.id;
  // les lignes reçues en direct attendent que le journal soit relu : appliquées avant lui, elles feraient sauter les plus anciennes
  let tampon: Entree[] | null = [];
  ecouteReleves = TrajetEnRoute.addListener("releve", ({ ligne, n }) => {
    const x = lireJournal(ligne, n);
    for (const y of x) if (y.type === "P") ecartReleves = y.t - Date.now();
    if (tampon) tampon.push(...x);
    else if (x.length > 0) {
      x.forEach(appliquer);
      garder();
      publier();
    }
  });
  await ecouteReleves.catch(() => undefined);
  await TrajetEnRoute.demanderPermissions().catch(() => undefined);
  try {
    await TrajetEnRoute.demarrer({ id, contenu: contenuDeBase() });
  } catch {
    ecouteNative = false;
  }
  const j = await TrajetEnRoute.lire().catch(() => null);
  if (etat && etat.id === id) {
    if (j && j.id === id) lireJournal(j.texte).forEach(appliquer);
    tampon.forEach(appliquer);
    garder();
    publier();
  }
  tampon = null;
}

function ecouter() {
  if (natif && !ecouteNative) rattrapage = ecouterNatif();
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
  if (natif) TrajetEnRoute.arreter().catch(() => undefined);
  ecouteReleves?.then((h) => h.remove()).catch(() => undefined);
  ecouteReleves = null;
  ecouteNative = false;
  if (ecoute != null) navigator.geolocation.clearWatch(ecoute);
  if (horloge != null) window.clearInterval(horloge);
  ecoute = null;
  horloge = null;
}

function premierePosition(): Promise<GeolocationPosition> {
  return new Promise((ok, ko) => {
    if (!("geolocation" in navigator)) return ko({ code: 2 });
    navigator.geolocation.getCurrentPosition(ok, ko, { enableHighAccuracy: true, maximumAge: 0, timeout: 30000 }); // un GPS froid met parfois plus de 10 s
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
    // appli Android : tous les points viennent du service, à l'heure de leur relevé — la position de départ de la WebView (son
    // propre fournisseur, datée à sa réception) pouvait être en retard sur celles du service (run 39693288066 : trajet 2 à
    // +8,3 % de roule.ts sur le GPX, contre 6,64 L/100 = la référence avec les seuls relevés du service)
    const acc = pos.coords.accuracy;
    if (!natif) etat = ajouterPosition(etat, t, pos.coords.latitude, pos.coords.longitude, pos.coords.altitude, pos.coords.speed == null ? null : pos.coords.speed * 3.6, acc > 0 && Number.isFinite(acc) ? acc : null);
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
    etat = basculerPause(etat, instantBouton(etat));
    garder();
    publier();
  },
  reprendre() {
    if (!etat || !etat.enPause || etat.immobile != null) return;
    etat = basculerPause(etat, instantBouton(etat));
    garder();
    publier();
  },
  reprendreApresImmobile() {
    if (!etat || etat.immobile == null) return;
    const t = instantBouton(etat);
    etat = { ...basculerPause({ ...etat, immobile: null }, t), ignorerAvant: t };
    garder();
    publier();
  },

  async arreter(): Promise<IssueArret> {
    await rattrapage?.catch(() => undefined);
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
    // durcissement r1 (D2) : points GPS invalides écartés à la lecture ; un enregistrement dont plus aucun point n'est lisible est abandonné
    const fini = (n: unknown) => typeof n === "number" && Number.isFinite(n);
    const points = e.points.filter((p) => Array.isArray(p) && fini(p[0]) && fini(p[1]) && fini(p[2]) && fini(p[3]));
    if (e.points.length > 0 && points.length === 0) {
      await (await db()).delete("en_cours", CLE_ENREGISTREMENT).catch(() => undefined);
      return null;
    }
    etat = points.length === e.points.length ? e : { ...e, points };
    ecouter();
    publier();
    await rattrapage?.catch(() => undefined);
    return etat;
  },
  abonner(f: () => void) {
    abonnes.add(f);
    return () => abonnes.delete(f);
  },
  instantane: () => instant,
};

export type { PointRoule };
