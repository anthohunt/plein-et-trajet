// Passe streamline : captures avant/après de chaque écran à 390 px (hors suite : jouée par streamline.config.ts).
// Appli locale (APP_URL) ou déployée, base réelle. Seule simulation : la géolocalisation (GPX réel Albi → Toulouse).
// Chaque test supprime à la fin ses trajets, ses préférences et son compte anonyme ; l'administrateur est éphémère.
import { test, expect, type Page } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";
import {
  accorderVerrouEcran, arreterEtAttendre, champ, choisirVoiture, enregistrerDepuis, env, KM5, ouvrirTrajets, propositions, rouler, session, URL_APP,
} from "../exploration/m4-test-snippets/_aides";
// @ts-ignore — module JS sans types
import { creerAdminEphemere, supprimerAdminsEphemeres } from "../exploration/m3-aides.mjs";

const PHASE = process.env.PHASE ?? "avant";
const DOSSIER = path.resolve("docs/streamline", PHASE);
fs.mkdirSync(DOSSIER, { recursive: true });
const service = { apikey: env.SUPABASE_SERVICE_ROLE_KEY, Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}` };

async function capture(page: Page, nom: string, pleine = true) {
  await page.evaluate(() => Promise.race([Promise.all(document.getAnimations().filter((a) => a.effect?.getTiming().iterations !== Infinity).map((a) => a.finished.catch(() => {}))), new Promise((r) => setTimeout(r, 1500))]));
  // page entière : la zone qui défile est dépliée le temps de la capture
  if (pleine) await page.addStyleTag({ content: ".app{height:auto!important;overflow:visible!important} .scroll{overflow:visible!important}" });
  await page.screenshot({ path: path.join(DOSSIER, `${nom}.png`), fullPage: pleine });
  if (pleine) await page.reload().catch(() => {});
}

/** Ménage : trajets, préférences et compte anonyme de la page. */
async function menage(page: Page) {
  const s = await session(page).catch(() => null);
  if (!s?.userId) return;
  for (const t of ["trajets", "preferences"]) await fetch(`${env.SUPABASE_URL}/rest/v1/${t}?user_id=eq.${s.userId}`, { method: "DELETE", headers: service });
  await fetch(`${env.SUPABASE_URL}/auth/v1/admin/users/${s.userId}`, { method: "DELETE", headers: service });
}

async function lieu(page: Page, nom: string, texte: string, choix: string) {
  await champ(page, nom).click();
  await champ(page, nom).pressSequentially(texte, { delay: 40 });
  const o = propositions(page, nom).filter({ hasText: choix }).first();
  await expect(o).toBeVisible({ timeout: 20_000 });
  await o.click();
}

test.describe.configure({ mode: "serial" });

test("S1 Prix · S2 Fiche", async ({ page }) => {
  await page.goto(`${URL_APP}/`);
  await expect(page.locator('[data-el="ligne-station"]').first()).toBeVisible({ timeout: 20_000 });
  await capture(page, "01-prix", false);
  await capture(page, "01-prix-page");
  await expect(page.locator('[data-el="ligne-station"]').first()).toBeVisible({ timeout: 20_000 });
  await page.locator('[data-el="ligne-station"]').first().click();
  await expect(page.locator('[data-el="tableau-prix"]')).toHaveAttribute("aria-busy", "false");
  await capture(page, "02-fiche", false);
  await menage(page);
});

test("S2 Fiche → S3 Trajets (trajet jusqu'à la station)", async ({ page }) => {
  await ouvrirTrajets(page);
  await choisirVoiture(page); // voiture mémorisée, comme pour un habitué
  await page.waitForTimeout(2000); // écriture de la préférence
  await page.goto(`${URL_APP}/`);
  await expect(page.locator('[data-el="ligne-station"]').first()).toBeVisible({ timeout: 20_000 });
  await page.locator('[data-el="ligne-station"]').first().click();
  await page.locator('[data-el="bouton-trajet-station"]').click();
  await expect(page.locator('[data-screen="S3"]')).toBeVisible();
  await page.waitForTimeout(2500); // commune du départ (géocodage inverse)
  await page.screenshot({ path: path.join(DOSSIER, "16-trajet-depuis-fiche.png") });
  await menage(page);
});

test.describe("position refusée", () => {
  test.use({ permissions: [] });
  test("S1 Prix · position refusée", async ({ page }) => {
    await page.goto(`${URL_APP}/`);
    await expect(page.locator('[data-el="ligne-station"]').first()).toBeVisible({ timeout: 20_000 });
    await capture(page, "03-prix-position-refusee", false);
    await page.goto(`${URL_APP}/trajets`);
    await expect(page.locator('[data-el="historique"]')).toHaveAttribute("data-etat", /ok|erreur/, { timeout: 15000 });
    await choisirVoiture(page);
    await page.locator('[data-el="bouton-enregistrer"]').click();
    await expect(page.locator('[data-el="localisation-refusee"]')).toBeVisible({ timeout: 20_000 });
    await capture(page, "04-trajets-localisation-refusee");
    await menage(page);
  });
});

test.describe("Londres", () => {
  test.use({ geolocation: { latitude: 51.5074, longitude: -0.1278 } });
  test("S2 Fiche · Royaume-Uni", async ({ page }) => {
    await page.goto(`${URL_APP}/`);
    await expect(page.locator('[data-el="ligne-station"]').first()).toBeVisible({ timeout: 20_000 });
    await page.locator('[data-el="ligne-station"]').first().click();
    await expect(page.locator('[data-el="cours-du-jour"]')).toBeVisible({ timeout: 20_000 });
    await capture(page, "05-fiche-royaume-uni", false);
    await menage(page);
  });
});

test("S3 Trajets · S4 Résultat", async ({ page }) => {
  test.setTimeout(180_000);
  await ouvrirTrajets(page);
  await capture(page, "06-trajets-vide");
  await ouvrirTrajets(page);
  await choisirVoiture(page);
  await lieu(page, "depart", "Albi", "Albi");
  await lieu(page, "arrivee", "Barce", "Barcelone");
  // calcul ralenti de 4 s (la réponse reste la vraie) : capture de l'attente
  await page.route("**/functions/v1/estimer-trajet", async (r) => {
    await new Promise((x) => setTimeout(x, 4000));
    await r.continue();
  });
  await page.locator("#bouton-calculer").click();
  await expect(page.locator('[data-el="calcul-en-cours"]')).toBeVisible();
  await page.screenshot({ path: path.join(DOSSIER, "07-calcul.png") });
  await expect(page.locator('[data-screen="S4"][data-etat="ok"]')).toBeVisible({ timeout: 60_000 });
  await page.unroute("**/functions/v1/estimer-trajet");
  await page.screenshot({ path: path.join(DOSSIER, "08-resultat.png") });
  await page.addStyleTag({ content: ".app{height:auto!important;overflow:visible!important} .scroll{overflow:visible!important}" });
  await page.locator('[data-el="mettre-mon-prix"]').click();
  await page.locator('[data-el="troncon-trajet"]').click();
  await page.screenshot({ path: path.join(DOSSIER, "09-resultat-page.png"), fullPage: true });
  await page.locator('[data-el="retour-trajets"]').click();
  await expect(page.locator('[data-el="liste-historique"]')).toBeVisible();
  await capture(page, "10-trajets-historique");
  await menage(page);
});

test("S6 En route · S4 Résultat enregistré", async ({ page, context }) => {
  test.setTimeout(300_000);
  await enregistrerDepuis(page, context, KM5);
  await rouler(context, KM5, 20);
  await page.screenshot({ path: path.join(DOSSIER, "11-en-route.png"), fullPage: true });
  await page.reload();
  await expect(page.locator('[data-el="reprise-enregistrement"]')).toBeVisible({ timeout: 20_000 });
  await page.screenshot({ path: path.join(DOSSIER, "12-trajets-reprise.png") });
  await page.locator('[data-el="reprendre-enregistrement"]').click();
  await accorderVerrouEcran(context, page);
  await rouler(context, KM5 + 20, 60);
  await arreterEtAttendre(page);
  await page.addStyleTag({ content: ".app{height:auto!important;overflow:visible!important} .scroll{overflow:visible!important}" });
  await page.screenshot({ path: path.join(DOSSIER, "13-resultat-enregistre-page.png"), fullPage: true });
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
    await page.screenshot({ path: path.join(DOSSIER, "14-moteurs.png") });
    await page.addStyleTag({ content: ".app{height:auto!important;overflow:visible!important} .scroll{overflow:visible!important}" });
    await page.screenshot({ path: path.join(DOSSIER, "15-moteurs-page.png"), fullPage: true });
  } finally {
    await supprimerAdminsEphemeres();
  }
});
