// Streamline R2 : captures avant / après / prod à 390 px des défauts corrigés (rendu pt-streamline-verif).
// Hors suite : PHASE=avant|apres|prod npx playwright test -c tests/e2e/streamline/streamline.config.ts captures-r2
// Appli locale (APP_URL) ou déployée, base réelle ; seule simulation : la géolocalisation, et la coupure des prix de la capture 15 (// MOCKED).
// Chaque test supprime à la fin ses trajets, ses préférences et son compte anonyme ; l'administrateur est éphémère.
import { test, expect, type Page } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";
import { accorderVerrouEcran, champ, choisirVoiture, enregistrerDepuis, env, KM5, ouvrirTrajets, propositions, rouler, session, URL_APP } from "../exploration/m4-test-snippets/_aides";
// @ts-ignore — module JS sans types
import { creerAdminEphemere, supprimerAdminsEphemeres } from "../exploration/m3-aides.mjs";

const PHASE = process.env.PHASE ?? "avant";
const DOSSIER = path.resolve("docs/streamline/r2", PHASE);
fs.mkdirSync(DOSSIER, { recursive: true });
const service = { apikey: env.SUPABASE_SERVICE_ROLE_KEY, Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}` };
const PLEINE = ".app{height:auto!important;overflow:visible!important} .scroll{overflow:visible!important}";

async function calme(page: Page) {
  await page.evaluate(() => Promise.race([Promise.all(document.getAnimations().filter((a) => a.effect?.getTiming().iterations !== Infinity).map((a) => a.finished.catch(() => {}))), new Promise((r) => setTimeout(r, 1500))]));
}
async function shot(page: Page, nom: string, pleine = false) {
  await calme(page);
  if (pleine) await page.addStyleTag({ content: PLEINE });
  await page.screenshot({ path: path.join(DOSSIER, `${nom}.png`), fullPage: pleine });
}
async function menage(page: Page) {
  const s = await session(page).catch(() => null);
  if (!s?.userId) return;
  for (const t of ["trajets", "preferences"]) await fetch(`${env.SUPABASE_URL}/rest/v1/${t}?user_id=eq.${s.userId}`, { method: "DELETE", headers: service });
  await fetch(`${env.SUPABASE_URL}/auth/v1/admin/users/${s.userId}`, { method: "DELETE", headers: service });
}
async function lieu(page: Page, nom: string, texte: string, choix: string, contexte?: string) {
  await champ(page, nom).click();
  await champ(page, nom).fill("");
  await champ(page, nom).pressSequentially(texte, { delay: 40 });
  let o = propositions(page, nom).filter({ hasText: choix });
  if (contexte) o = o.filter({ hasText: contexte });
  await expect(o.first()).toBeVisible({ timeout: 20_000 });
  await o.first().click();
}
async function trajet(page: Page, arrivee: [string, string, string]) {
  await ouvrirTrajets(page);
  await choisirVoiture(page);
  await lieu(page, "depart", "Albi", "Albi", "Tarn");
  await lieu(page, "arrivee", ...arrivee);
  await page.locator("#bouton-calculer").click();
  await expect(page.locator('[data-screen="S4"][data-etat="ok"]')).toBeVisible({ timeout: 60_000 });
}

test.describe.configure({ mode: "serial" });

test("S4 Résultat : coût, prix perso, pays, tronçons", async ({ page }) => {
  test.setTimeout(240_000);
  await trajet(page, ["Bord", "Bordeaux", "Gironde"]); // péages servis par le cache
  await shot(page, "01-resultat-peages");
  await page.locator('[data-el="mettre-mon-prix"]').click();
  await page.locator('[data-el="prix-perso"]').scrollIntoViewIfNeeded();
  await shot(page, "02-resultat-champ-prix");
  await page.locator('[data-el="champ-prix-perso"]').fill("1,699");
  await page.keyboard.press("Enter");
  await shot(page, "03-resultat-mon-prix");
  await page.locator('[data-el="troncons"]').scrollIntoViewIfNeeded();
  await page.locator('[data-el="troncons"]').screenshot({ path: path.join(DOSSIER, "06-troncons.png") });
  await page.locator('[data-el="retour-trajets"]').click();
  await page.locator('[data-el="champ-arrivee"]').fill("");
  await lieu(page, "arrivee", "Castr", "Castres", "Tarn");
  await page.locator("#bouton-calculer").click();
  await expect(page.locator('[data-screen="S4"][data-etat="ok"]')).toBeVisible({ timeout: 60_000 });
  await shot(page, "04-resultat-un-pays", true);
  await page.reload();
  await menage(page);
});

test("S4 Résultat : plusieurs pays", async ({ page }) => {
  test.setTimeout(180_000);
  await trajet(page, ["Milan", "Milan", "Italie"]);
  await shot(page, "05-resultat-milan", true);
  await page.reload();
  await menage(page);
});

test("S3 Trajets : départ GPS, ⇅, voiture", async ({ page }) => {
  test.setTimeout(120_000);
  await ouvrirTrajets(page);
  await expect(champ(page, "depart")).toHaveValue(/\w/, { timeout: 15_000 }).catch(() => {});
  await page.locator("#voiture-marque").click();
  await page.getByRole("listbox", { name: "Marque" }).getByRole("option").filter({ hasText: "Peugeot" }).first().click();
  await page.waitForTimeout(1500);
  await shot(page, "09-voiture-liste-modeles");
  await page.keyboard.press("Escape");
  await page.locator("body").click({ position: { x: 5, y: 5 } });
  await choisirVoiture(page);
  await champ(page, "arrivee").focus();
  await shot(page, "07-trajets-formulaire");
  await champ(page, "depart").fill("");
  await page.locator("#bouton-calculer").click();
  await expect(page.locator('[data-el="champ-depart-erreur"]')).toBeVisible();
  await shot(page, "08-trajets-erreur");
  await menage(page);
});

test("S6 En route", async ({ page, context }) => {
  test.setTimeout(240_000);
  await enregistrerDepuis(page, context, KM5);
  await rouler(context, KM5, 15);
  await shot(page, "10-en-route", true);
  await page.reload();
  await page.locator('[data-el="arreter-enregistrement"]').click().catch(() => {});
  await page.waitForTimeout(3000);
  await menage(page);
});

test("S6 En route : repli du verrou d'écran", async ({ page, context }) => {
  test.setTimeout(180_000);
  await context.setGeolocation({ latitude: 43.9289, longitude: 2.1464 });
  await ouvrirTrajets(page);
  await choisirVoiture(page);
  await page.locator('[data-el="bouton-enregistrer"]').click();
  await expect(page.locator('[data-screen="S6"]')).toBeVisible({ timeout: 30_000 });
  await page.waitForTimeout(3000);
  await shot(page, "11-en-route-repli");
  await page.locator('[data-el="bouton-arreter"]').click();
  await page.waitForTimeout(3000);
  await menage(page);
});

test("S1 Prix : E85, carte déplacée", async ({ page }) => {
  await page.goto(`${URL_APP}/`);
  await expect(page.locator('[data-el="ligne-station"]').first()).toBeVisible({ timeout: 20_000 });
  await page.getByRole("group", { name: "Carburant" }).getByRole("button", { name: "E85", exact: true }).click();
  await expect(page.locator('[data-el="titre-liste"]')).toHaveText("Stations · E85");
  await expect(page.locator('[data-el="ecart"]').first()).toBeVisible();
  await shot(page, "12-prix-e85");
  const b = (await page.locator('[data-el="carte-stations"]').boundingBox())!;
  await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2 + 30);
  await page.mouse.down();
  for (let i = 1; i <= 12; i++) await page.mouse.move(b.x + b.width / 2 + i * 14, b.y + b.height / 2 + 30 - i * 3);
  await page.mouse.up();
  await page.waitForTimeout(3000);
  await shot(page, "13-prix-deplace");
  await menage(page);
});

test.describe("position refusée", () => {
  test.use({ permissions: [] });
  test("S1 Prix : position refusée", async ({ page }) => {
    await page.goto(`${URL_APP}/`);
    await expect(page.locator('[data-el="ligne-station"]').first()).toBeVisible({ timeout: 20_000 });
    await shot(page, "14-prix-position-refusee");
    await menage(page);
  });
});

test("S1 Prix : prix en erreur", async ({ page }) => {
  // MOCKED: page.route — coupure de la lecture des prix (impossible à provoquer sur la vraie base)
  await page.route("**/rest/v1/prix*", (r) => r.abort());
  await page.goto(`${URL_APP}/`);
  await expect(page.locator('[data-el="etat-erreur"]')).toBeVisible({ timeout: 20_000 });
  await page.waitForTimeout(2500);
  await shot(page, "15-prix-erreur");
  await page.unroute("**/rest/v1/prix*");
  await menage(page);
});

test("S5 Moteurs", async ({ page }) => {
  test.setTimeout(120_000);
  const email = await creerAdminEphemere();
  try {
    const r = await fetch(`${env.SUPABASE_URL}/auth/v1/admin/generate_link`, { method: "POST", headers: { ...service, "Content-Type": "application/json" }, body: JSON.stringify({ type: "magiclink", email }) });
    const lien = (await r.json()).action_link as string;
    const v = await fetch(lien, { redirect: "manual" });
    const hash = (v.headers.get("location") ?? "").split("#")[1];
    await page.goto(`${URL_APP}/moteurs#${hash}`);
    await expect(page.locator('[data-el="moteur"]')).toHaveCount(6, { timeout: 30_000 });
    await page.locator('[data-service="peages"]').scrollIntoViewIfNeeded();
    await shot(page, "16-moteurs-peages");
  } finally {
    await supprimerAdminsEphemeres();
  }
});
