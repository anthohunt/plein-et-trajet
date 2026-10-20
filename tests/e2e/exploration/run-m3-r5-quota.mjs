// Round 5 (audit round 3, HIGH 1) : captures RÉELLES sur la prod pendant que PTV est en dépassement de quota du jour
// (403 GENERAL_QUOTA_EXCEEDED). Rien n'est simulé : aucune clé ni table n'est touchée ; administrateur éphémère supprimé en finally.
// Sorties : tests/e2e/delivery/ et m3-captures-brutes/ (brutes sans étiquette ; ces deux écrans n'en portent pas non plus).
import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright";
import { expect } from "@playwright/test";
import { RACINE, OPTIONS_CONTEXTE, attendreAnimations, calculer, choisirVoiture, champ, ouvrirTrajets, propositions, saisirLieu, connecterAdmin, carte, etatCarte, creerAdminEphemere, supprimerAdminsEphemeres, adminsEphemeresRestants } from "./m3-aides.mjs";

const LIVRAISON = path.join(RACINE, "tests/e2e/delivery");
const BRUTES = path.join(RACINE, "tests/e2e/exploration/m3-captures-brutes");
const nav = await chromium.launch();
const sorties = [];
async function prendre(page, nom) {
  await attendreAnimations(page);
  const brute = await page.screenshot();
  const liv = await page.screenshot();
  fs.writeFileSync(path.join(BRUTES, nom), brute);
  fs.writeFileSync(path.join(LIVRAISON, nom), liv);
  sorties.push(nom);
}
try {
  // 1) écran Résultat : visiteur anonyme, Albi → Barcelone
  const A = await nav.newContext(OPTIONS_CONTEXTE);
  const pa = await A.newPage();
  await ouvrirTrajets(pa);
  await saisirLieu(pa, "depart", "Albi", "Albi");
  const c = champ(pa, "arrivee");
  await c.click();
  await c.pressSequentially("Barce", { delay: 30 });
  await propositions(pa, "arrivee").filter({ hasText: "Espagne" }).filter({ hasText: "Barcelone" }).first().click();
  await choisirVoiture(pa);
  const rep = pa.waitForResponse((r) => r.url().includes("/functions/v1/estimer-trajet"), { timeout: 90000 });
  await calculer(pa);
  const corps = await (await rep).json();
  console.log("estimer-trajet peages =", JSON.stringify({ etat: corps.peages.etat, motif: corps.peages.motif, fournisseur: corps.peages.fournisseur, jusqua: corps.peages.jusqua }));
  expect(corps.peages.motif).toBe("quota_fournisseur");
  const bloc = pa.locator('[data-el="peages-indisponibles"]');
  await expect(bloc).toContainText("PTV : quota du jour atteint — péages indisponibles jusqu'à");
  await expect(pa.locator('[data-el="total-peages"]')).toHaveCount(0);
  await pa.locator('[data-el="detail-peages"]').evaluate((e) => e.scrollIntoView({ block: "center" }));
  console.log("S4 :", await bloc.innerText(), "|", await pa.locator('[data-el="peages-indisponibles-detail"]').innerText());
  await prendre(pa, "US-4.E4-E2-01-quota-ptv.png");

  // 2) écran Moteurs : administrateur éphémère, Tester la connexion sur PTV (vrai appel, refusé pour quota)
  await creerAdminEphemere();
  const B = await nav.newContext(OPTIONS_CONTEXTE);
  const pb = await B.newPage();
  await connecterAdmin(pb);
  await expect(pb.locator('[data-el="moteur"]')).toHaveCount(6, { timeout: 20000 });
  console.log("S5 à l'ouverture :", await etatCarte(pb, "peages").innerText());
  const rt = pb.waitForResponse((r) => r.url().includes("/functions/v1/moteurs") && r.request().postData()?.includes("tester"), { timeout: 60000 });
  await carte(pb, "peages").locator('[data-el="tester-connexion"]').click();
  const t = await (await rt).json();
  console.log("moteurs tester =", JSON.stringify(t));
  expect(t.code).toBe("quota_fournisseur");
  await expect(etatCarte(pb, "peages")).toContainText("PTV : quota du jour atteint — péages indisponibles jusqu'à");
  await expect(etatCarte(pb, "peages")).not.toContainText("refusée");
  console.log("S5 après Tester :", await etatCarte(pb, "peages").innerText(), "| incident :", await carte(pb, "peages").locator('[data-el="incident"]').innerText().catch(() => "—"));
  await carte(pb, "peages").scrollIntoViewIfNeeded();
  await prendre(pb, "US-5.E2-E2-01-quota-ptv.png");
} finally {
  await supprimerAdminsEphemeres();
  console.log("administrateurs éphémères restants :", await adminsEphemeresRestants());
  await nav.close();
  console.log("captures :", sorties.join(", "));
}
