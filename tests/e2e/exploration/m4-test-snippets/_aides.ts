// Aides des extraits Playwright du jalon 4 (appli déployée, base réelle). Réexporte les aides de m4-aides.mjs.
// Seule simulation : la géolocalisation du navigateur, rejouée depuis le GPX réel Albi → Toulouse (1 point par seconde d'horloge).
import { expect, test, type BrowserContext, type Page } from "@playwright/test";
// @ts-ignore — module JS sans types
import * as a from "../m4-aides.mjs";

export const {
  URL_APP, env, rest, session, virgule, nombreFr, ouvrirTrajets, attendreFormulaire, champ, propositions, choisirVoiture, lireResultat, LONDRES,
  lireGpx, indexAuKm, demarrerRejeu, attendreFinRejeu, accorderVerrouEcran, S6, lireDirect, lancerEnregistrement, arreterEtAttendre, trajetsDeLaPage,
} = a as any;
export { expect, test };

export const PTS = lireGpx();
export const KM5 = indexAuKm(PTS, 5); // N88 à la sortie d'Albi, ≈ 74 km/h : 1 km en moins d'une minute
export const position = (i: number) => ({ latitude: PTS[i].lat, longitude: PTS[i].lon });

/** Écran Trajets, voiture choisie, verrou d'écran accordé, enregistrement lancé à la position `i` du GPX. */
export async function enregistrerDepuis(page: Page, context: BrowserContext, i: number) {
  await context.setGeolocation(position(i));
  await ouvrirTrajets(page);
  await accorderVerrouEcran(context, page);
  await choisirVoiture(page);
  await lancerEnregistrement(page);
}
/** Rejoue `n` secondes du GPX à partir de `i` et attend la fin. */
export async function rouler(context: BrowserContext, i: number, n: number) {
  const r = demarrerRejeu(context, PTS, { debut: i, fin: i + n });
  await attendreFinRejeu(r);
  return r;
}
