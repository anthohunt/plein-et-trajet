// Aides communes de l'exploration du jalon 2 (run-m2.mjs) et des extraits Playwright (m2-test-snippets).
// Appli DÉPLOYÉE, base réelle. Aucune de ces aides ne simule le réseau ni la session.
import { expect } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const RACINE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
export const URL_APP = (process.env.APP_URL ?? "https://plein-et-trajet.vercel.app").replace(/\/$/, "");
export const ALBI = { latitude: 43.9289, longitude: 2.1464 };
export const env = Object.fromEntries(
  fs.readFileSync(path.join(RACINE, ".env.local"), "utf8").split("\n").filter((l) => l.includes("=") && !l.startsWith("#"))
    .map((l) => [l.slice(0, l.indexOf("=")), l.slice(l.indexOf("=") + 1).replace(/^"|"$/g, "")]),
);
export const OPTIONS_CONTEXTE = {
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 1,
  locale: "fr-FR",
  timezoneId: "Europe/Paris",
  geolocation: ALBI,
  permissions: ["geolocation"],
};

// ---- lecture de la base (clé anonyme publique, ou jeton de la session anonyme de la page) ----
export async function rest(chemin, jeton) {
  const r = await fetch(`${env.VITE_SUPABASE_URL}/rest/v1/${chemin}`, {
    headers: { apikey: env.VITE_SUPABASE_ANON_KEY, Authorization: `Bearer ${jeton ?? env.VITE_SUPABASE_ANON_KEY}` },
  });
  if (!r.ok) throw new Error(`REST ${r.status} ${chemin}`);
  return r.json();
}
/** Jeton et identifiant de la session anonyme de la page (stockée par supabase-js dans localStorage). */
export async function session(page) {
  const s = await page.evaluate(() => JSON.parse(localStorage.getItem("pt-auth") || "null"));
  return s ? { jeton: s.access_token, userId: s.user?.id } : null;
}
export async function moyenneDuJour(carburant) {
  const r = await rest(`moyennes_nationales?select=prix_moyen&carburant=eq.${encodeURIComponent(carburant)}&order=jour.desc&limit=1`);
  return Number(r[0].prix_moyen);
}
export const virgule = (n, d = 2) => n.toFixed(d).replace(".", ",");
export const nombreFr = (t) => Number(String(t).replace(/\s| /g, "").replace(",", "."));

// ---- gestes ----
export async function ouvrirTrajets(page) {
  await page.goto(`${URL_APP}/trajets`);
  await attendreFormulaire(page);
}
export async function attendreFormulaire(page) {
  await expect(page.locator('[data-screen="S3"]')).toBeVisible();
  await expect(page.locator("#voiture-marque")).toHaveText(/Marque|\w/, { timeout: 15000 });
  await expect(page.locator('[data-el="historique"]')).toHaveAttribute("data-etat", /ok|erreur/, { timeout: 15000 });
  await page.waitForFunction(() => !/Chargement/.test(document.querySelector("#voiture-marque")?.textContent ?? ""), null, { timeout: 15000 });
}
export const champ = (page, nom) => page.locator(`[data-el="champ-${nom}"]`);
export const propositions = (page, nom) => page.locator(`[data-el="champ-${nom}-propositions"] [role="option"]`);

/** Tape `texte` dans le champ (« depart » | « arrivee ») ; si `choix`, clique la proposition qui le contient. */
export async function saisirLieu(page, nom, texte, choix) {
  const c = champ(page, nom);
  await c.click();
  await c.fill("");
  await c.pressSequentially(texte, { delay: 30 });
  if (choix) {
    await expect(propositions(page, nom).filter({ hasText: choix }).first()).toBeVisible({ timeout: 10000 });
    await propositions(page, nom).filter({ hasText: choix }).first().click();
    await expect(c).toHaveValue(choix);
  }
}
async function attendreListeChargee(page, id) {
  await page.waitForFunction((i) => { const e = document.getElementById(i); return e && !e.disabled && !/Chargement/.test(e.textContent ?? ""); }, id, { timeout: 15000 });
}
export async function choisirDansListe(page, id, nom, option) {
  await attendreListeChargee(page, id);
  await page.locator(`#${id}`).click();
  const o = page.getByRole("listbox", { name: nom }).getByRole("option").filter({ hasText: option }).first();
  await expect(o).toBeVisible();
  await o.click();
  await expect(page.getByRole("listbox", { name: nom })).toHaveCount(0);
}
export async function choisirVoiture(page, marque = "Peugeot", modele = "208", moteur = "208 (101ch) · mécanique") {
  await choisirDansListe(page, "voiture-marque", "Marque", marque);
  await choisirDansListe(page, "voiture-modele", "Modèle", modele);
  await choisirDansListe(page, "voiture-moteur", "Motorisation", moteur);
  await expect(page.locator('[data-el="voiture-memorisee"]')).toBeVisible();
}
/** Touche Calculer et attend un état final : « ok » (résultat), « pas_itineraire », « erreur », ou « formulaire » (validation refusée). */
export async function calculer(page, { attendre = "ok" } = {}) {
  await page.locator("#bouton-calculer").click();
  if (attendre === "aucun") return;
  await expect(page.locator(`[data-screen="S4"][data-etat="${attendre}"]`)).toBeVisible({ timeout: 45000 });
}
export async function lireResultat(page) {
  const t = (s) => page.locator(s).first().innerText();
  return {
    route: ((await page.locator('[data-el="route-titre"]').first().textContent()) ?? "").replace(/\s+/g, " ").trim(),
    voiture: await t('[data-el="voiture-resultat"]'),
    cout: Number(await page.locator('[data-el="cout"] [data-cout]').getAttribute("data-cout")),
    litres: nombreFr(await t('[data-el="kpi-litres"]')),
    km: nombreFr(await t('[data-el="kpi-km"]')),
    l100: nombreFr(await t('[data-el="kpi-l100"]')),
    libellePrix: await t('[data-el="libelle-prix"]'),
    detail: await t('[data-el="detail-cout"]'),
  };
}
export const lignesHistorique = (page) => page.locator('[data-el="liste-historique"] li');
export async function attendreAnimations(page) {
  await page.evaluate(() => Promise.race([Promise.all(document.getAnimations().filter((a) => a.effect?.getTiming().iterations !== Infinity).map((a) => a.finished.catch(() => {}))), new Promise((r) => setTimeout(r, 1500))]));
}
/** Parcours Tab : liste des éléments focalisés (texte accessible, contour, visibilité). */
export async function etatFocus(page) {
  return page.evaluate(() => {
    const e = document.activeElement;
    const r = e.getBoundingClientRect();
    const s = getComputedStyle(e);
    const dans = r.width > 0 && r.height > 0 && r.top >= 0 && r.bottom <= innerHeight + 1 && r.left >= 0 && r.right <= innerWidth + 1;
    const f = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
    return {
      i: [...document.querySelectorAll("*")].indexOf(e),
      nom: e.getAttribute("aria-label") || e.labels?.[0]?.textContent || e.textContent?.trim().slice(0, 60) || e.id,
      id: e.id,
      contour: (s.outlineStyle !== "none" && parseFloat(s.outlineWidth) >= 2) || (s.textDecorationLine === "underline" && e.tagName === "H2"),
      visible: dans && !!f && (f === e || e.contains(f) || f.contains(e)),
    };
  });
}
