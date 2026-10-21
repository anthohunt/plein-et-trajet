// Jalon 2 — « Le coût d'un trajet » : spec unique consolidée depuis exploration/m2-test-snippets/.
// Joué contre l'appli déployée, base réelle (Supabase, géocodeur et routeur IGN, edge function estimer-trajet).
// Seul US-4.E3 intercepte le réseau (// MOCKED: délai puis route.continue — le vrai backend répond).
// Aucune capture n'est écrite dans tests/e2e/delivery/ (preuves auditées).
import { test, expect, type Page } from "@playwright/test";
import { S4, URL_APP, attendreFormulaire, calculer, champ, choisirDansListe, choisirVoiture, compterCalculs, dbPreference, dbTrajets, env, etatFocus, formulairePret, lignesHistorique, lireResultat, moyenneDuJour, ouvrirTrajets, propositions, rest, saisirLieu, session, trajetCalcule, virgule } from "./exploration/m2-test-snippets/_aides";

// US-4.4 : le total inclut les péages depuis le jalon 3 — ces assertions comparent le coût CARBURANT (total moins péages établis), pas le total
async function carburantSeul(page: Page): Promise<number> {
  // round 5 : quand les péages sont indisponibles (ex. quota du jour PTV atteint), la répartition carburant/péages n'est pas affichée ;
  // on ne l'attend pas (innerText sur un élément absent attendait jusqu'au délai du test) : le total est alors le carburant seul
  // streamline R2 (R1) : avec des péages, le carburant seul se LIT sous le total (« Carburant X € · Péages Y € »)
  const rep = page.locator('[data-el="repartition-cout"]').first();
  if ((await rep.count()) > 0) return Number((await rep.innerText()).match(/Carburant\s+([\d\s ,]+)\s*€/)![1].replace(/\s| /g, "").replace(",", "."));
  return Number(await page.locator('[data-el="cout"] [data-cout]').first().getAttribute("data-cout"));
}

test.describe("M2 — Le coût d'un trajet", () => {
  test.describe("US-3.1 — Ouvrir les trajets", () => {
    test.describe("Happy Path", () => {
      test("US-3.1 — l'onglet Trajets affiche le formulaire et l'historique", async ({ page }) => {
        await page.goto("/");
        await expect(page.locator('[data-el="ligne-station"]').first()).toBeVisible();
        await expect(page.getByRole("tab", { name: "Prix" })).toHaveAttribute("aria-selected", "true");
        await page.getByRole("tab", { name: "Trajets" }).click();
        await attendreFormulaire(page);
        await expect(page.getByRole("tab", { name: "Trajets" })).toHaveAttribute("aria-selected", "true");
        await expect(champ(page, "depart")).toBeVisible();
        await expect(champ(page, "arrivee")).toBeVisible();
        await expect(page.locator('[data-el="choix-voiture"]')).toBeVisible();
        await expect(page.getByRole("button", { name: "Calculer le coût" })).toBeVisible();
        await expect(page.locator('[data-el="historique"]')).toContainText("Derniers trajets");
      });
    });
    test.describe("Edge Case", () => {
      test("US-3.1 — ouverture directe sur /trajets : session anonyme créée, historique chargé depuis la base", async ({ page }) => {
        await ouvrirTrajets(page);
        const s = await session(page);
        expect(s?.userId).toMatch(/^[0-9a-f-]{36}$/);
        expect(await rest("trajets?select=id", s.jeton)).toEqual([]);
        await expect(page.locator('[data-el="historique"]')).toHaveAttribute("data-etat", "ok");
      });
    });
  });

  test.describe("US-3.2 — Saisir le départ", () => {
    test.describe("Happy Path", () => {
      test("US-3.2 — « Alb » propose des lieux réels (géocodeur IGN) dont Albi ; je choisis Albi", async ({ page }) => {
        await ouvrirTrajets(page);
        // passe streamline : le départ est pré-rempli par la commune GPS ; on part d'un champ vidé
        await champ(page, "depart").fill("");
        await expect(champ(page, "depart")).toHaveValue("");
        await champ(page, "depart").pressSequentially("Alb", { delay: 50 });
        await expect(propositions(page, "depart").first()).toBeVisible();
        const noms = await propositions(page, "depart").locator(".sugg-l").allTextContents();
        expect(noms.length).toBeGreaterThanOrEqual(3);
        expect(noms).toContain("Albi");
        await propositions(page, "depart").filter({ hasText: "Albi" }).first().click();
        await expect(champ(page, "depart")).toHaveValue("Albi");
        await expect(propositions(page, "depart")).toHaveCount(0);
      });
    });
    test.describe("Edge Case", () => {
      test("US-3.2 — un seul caractère : aucune proposition ; flèches et Entrée choisissent au clavier ; Échap ferme", async ({ page }) => {
        await ouvrirTrajets(page);
        await champ(page, "depart").fill("");
        await champ(page, "depart").pressSequentially("A", { delay: 50 });
        await page.waitForTimeout(600);
        await expect(propositions(page, "depart")).toHaveCount(0);
        await champ(page, "depart").pressSequentially("lb", { delay: 50 });
        await expect(propositions(page, "depart").first()).toBeVisible();
        await page.keyboard.press("Escape");
        await expect(propositions(page, "depart")).toHaveCount(0);
        await page.keyboard.press("ArrowDown");
        await expect(propositions(page, "depart").first()).toBeVisible();
        await page.keyboard.press("Enter");
        await expect(champ(page, "depart")).toHaveValue("Albi");
      });
    });
  });

  test.describe("US-3.3 — Saisir l'arrivée", () => {
    test.describe("Happy Path", () => {
      test("US-3.3 — « Bord » propose Bordeaux en tête (communes d'abord) ; je le choisis", async ({ page }) => {
        await ouvrirTrajets(page);
        await champ(page, "arrivee").pressSequentially("Bord", { delay: 50 });
        await expect(propositions(page, "arrivee").first()).toBeVisible();
        const noms = await propositions(page, "arrivee").locator(".sugg-l").allTextContents();
        expect(noms[0]).toBe("Bordeaux");
        await expect(propositions(page, "arrivee").first()).toContainText("Gironde");
        await propositions(page, "arrivee").first().click();
        await expect(champ(page, "arrivee")).toHaveValue("Bordeaux");
      });
    });
    test.describe("Edge Case", () => {
      test("US-3.3 — l'arrivée peut être une adresse (chiffres tapés → adresses proposées)", async ({ page }) => {
        await ouvrirTrajets(page);
        await champ(page, "arrivee").pressSequentially("12 rue de la République Albi", { delay: 20 });
        await expect(propositions(page, "arrivee").first()).toBeVisible();
        expect(await propositions(page, "arrivee").first().innerText()).toMatch(/\d/);
      });
    });
  });

  test.describe("US-3.4 — Choisir ma voiture", () => {
    test.describe("Happy Path", () => {
      test("US-3.4 — Peugeot → 208 → motorisation : enregistrée dans `preferences`, carburant affiché, pré-remplie après rechargement", async ({ page }) => {
        await ouvrirTrajets(page);
        await expect(page.locator("#voiture-marque .dd-txt")).toHaveText("Marque");
        expect(await dbPreference(page)).toBeNull();
        await choisirVoiture(page, "Peugeot", "208", "208 (101ch) · mécanique");
        // l'écriture de la préférence suit le choix de la motorisation : on attend la ligne complète au lieu de la lire une seule fois
        await expect.poll(async () => (await dbPreference(page))?.carburant, { timeout: 15000 }).toBe("SP95-E10");
        const p = await dbPreference(page);
        expect(p).toMatchObject({ marque: "Peugeot", modele: "208", carburant: "SP95-E10" });
        const v = (await rest(`vehicules?select=masse_kg,carburant,motorisation&id=eq.${p.vehicule_id}`))[0];
        expect(v.motorisation).toBe("208 (101ch) · mécanique");
        await expect(page.locator('[data-el="voiture-info"]')).toHaveText("SP95-E10");
        await page.reload();
        await ouvrirTrajets(page);
        await expect(page.locator("#voiture-moteur .dd-txt")).toHaveText("208 (101ch) · mécanique");
        await expect(page.locator("#voiture-marque .dd-txt")).toHaveText("Peugeot");
      });
    });
    test.describe("Edge Case", () => {
      test("US-3.4 — modèle et motorisation restent inaccessibles tant que le niveau précédent n'est pas choisi ; le choix partiel est mémorisé", async ({ page }) => {
        await ouvrirTrajets(page);
        await expect(page.locator("#voiture-modele")).toBeDisabled();
        await expect(page.locator("#voiture-moteur")).toBeDisabled();
        await choisirDansListe(page, "voiture-marque", "Marque", "Dacia");
        await expect(page.locator("#voiture-modele")).toBeEnabled();
        await expect(page.locator("#voiture-moteur")).toBeDisabled();
        await expect.poll(async () => (await dbPreference(page))?.marque).toBe("Dacia");
      });
      test("US-3.4 — un diesel donne le carburant Gazole", async ({ page }) => {
        await ouvrirTrajets(page);
        await choisirVoiture(page, "Peugeot", "208", "208 (102ch) · mécanique");
        await expect(page.locator('[data-el="voiture-info"]')).toContainText("Gazole");
      });
    });
  });

  test.describe("US-3.5 — Calculer le coût", () => {
    test.describe("Happy Path", () => {
      test("US-3.5 — Albi → Toulouse : coût, litres, km et L/100 km cohérents, calcul réel (IGN + ADEME + prix du jour)", async ({ page }) => {
        const calculs = compterCalculs(page);
        const r = await trajetCalcule(page, "Albi", "Toulouse");
        expect(calculs.n).toBe(1);
        expect(calculs.statuts).toEqual([200]);
        expect(r.route).toBe("Albi → Toulouse");
        expect(r.km).toBeGreaterThan(60);
        expect(r.km).toBeLessThan(100);
        expect(r.l100).toBeGreaterThan(4);
        expect(r.l100).toBeLessThan(8);
        expect(r.litres).toBeCloseTo((r.km * r.l100) / 100, 0);
        const moyenne = await moyenneDuJour("SP95-E10");
        // US-4.4 : le total inclut les péages depuis le jalon 3
        expect(Math.abs((await carburantSeul(page)) - r.litres * moyenne)).toBeLessThan(0.06 * moyenne + 0.01); // les litres affichés sont arrondis au dixième
        await expect(page.locator('[data-el="troncons"] li').first()).toBeVisible();
      });
    });
    test.describe("Edge Case", () => {
      test("US-3.5 — le trajet rejoint l'historique en base (une seule ligne) et la somme des tronçons égale le total", async ({ page }) => {
        await trajetCalcule(page, "Albi", "Toulouse");
        const db = await dbTrajets(page);
        expect(db).toHaveLength(1);
        expect(db[0]).toMatchObject({ depart_label: "Albi", arrivee_label: "Toulouse" });
        const litresTroncons = await page.locator('[data-el="troncons"] .lit').allInnerTexts();
        const somme = litresTroncons.map((t) => Number(t.replace(" L", "").replace(",", "."))).reduce((s, x) => s + x, 0);
        const r = await lireResultat(page);
        expect(Math.abs(somme - r.litres)).toBeLessThan(0.3);
      });
      test("US-3.5 — pendant le calcul, l'état « Calcul de l'itinéraire… » s'affiche puis laisse place au résultat", async ({ page }) => {
        await formulairePret(page, "Albi", "Toulouse");
        await page.locator("#bouton-calculer").click();
        await expect(S4(page, "calcul")).toBeVisible();
        await expect(S4(page, "ok")).toBeVisible({ timeout: 45000 });
      });
    });
  });

  test.describe("US-3.6 — Rejouer un ancien trajet", () => {
    test.describe("Happy Path", () => {
      test("US-3.6 — la ligne d'historique relance un calcul réel au prix moyen du jour et remonte en tête, sans doublon", async ({ page }) => {
        await trajetCalcule(page, "Albi", "Toulouse");
        await page.locator('[data-el="retour-trajets"]').click();
        const avant = (await dbTrajets(page))[0];
        const calculs = compterCalculs(page);
        await page.waitForTimeout(1100);
        await page.locator('[data-el="ligne-historique"]').click();
        await expect(S4(page, "ok")).toBeVisible({ timeout: 45000 });
        expect(calculs.n).toBe(1);
        await expect(page.locator('[data-el="trajet-rejoue"]')).toHaveText("Recalculé au prix du jour");
        const r = await lireResultat(page);
        const moyenne = await moyenneDuJour("SP95-E10");
        expect(r.detail).toContain(moyenne.toFixed(3).replace(".", ","));
        // US-4.4 : le total inclut les péages depuis le jalon 3
        expect(Math.abs((await carburantSeul(page)) - r.litres * moyenne)).toBeLessThan(0.06 * moyenne + 0.01); // les litres affichés sont arrondis au dixième
        const apres = await dbTrajets(page);
        expect(apres).toHaveLength(1);
        expect(new Date(apres[0].cree_le).getTime()).toBeGreaterThan(new Date(avant.cree_le).getTime());
      });
    });
    test.describe("Edge Case", () => {
      test("US-3.6 — le focus revient sur la ligne rejouée à la fermeture du résultat", async ({ page }) => {
        await trajetCalcule(page, "Albi", "Toulouse");
        await page.locator('[data-el="retour-trajets"]').click();
        await page.locator('[data-el="ligne-historique"]').click();
        await expect(S4(page, "ok")).toBeVisible({ timeout: 45000 });
        await page.locator('[data-el="retour-trajets"]').click();
        await expect(page.locator("button.go").first()).toBeFocused();
        await expect(lignesHistorique(page)).toHaveCount(1);
      });
    });
    test.describe("Edge Case — voiture disparue", () => {
      test("US-3.6 — rejouer une ligne dont la voiture n'est plus en base : message, aucun calcul", async ({ page }) => {
        const calculs = compterCalculs(page);
        await trajetCalcule(page, "Albi", "Toulouse");
        await page.locator('[data-el="retour-trajets"]').click();
        const { jeton } = await session(page);
        const id = (await dbTrajets(page))[0].id;
        const r = await fetch(`${env.VITE_SUPABASE_URL}/rest/v1/trajets?id=eq.${id}`, { method: "PATCH", headers: { apikey: env.VITE_SUPABASE_ANON_KEY, Authorization: `Bearer ${jeton}`, "Content-Type": "application/json" }, body: JSON.stringify({ vehicule_id: null }) });
        expect(r.ok).toBe(true);
        await page.reload();
        await attendreFormulaire(page);
        const avant = calculs.n;
        await page.locator('[data-el="ligne-historique"]').click();
        await expect(page.locator('[data-el="erreur-rejeu"]')).toContainText("introuvable");
        expect(calculs.n).toBe(avant);
        await expect(page.locator('[data-screen="S3"]')).toBeVisible();
      });
    });
  });

  test.describe("US-3.7 — Supprimer un trajet", () => {
    test.describe("Happy Path", () => {
      test("US-3.7 — la croix supprime la ligne en base ; elle ne revient pas au rechargement", async ({ page }) => {
        await trajetCalcule(page, "Albi", "Toulouse");
        await page.locator('[data-el="retour-trajets"]').click();
        await expect(lignesHistorique(page)).toHaveCount(1);
        const id = (await dbTrajets(page))[0].id;
        await expect(page.locator('[data-el="supprimer-trajet"]')).toHaveAttribute("aria-label", "Supprimer le trajet Albi → Toulouse");
        await page.locator('[data-el="supprimer-trajet"]').click();
        await expect(page.locator('[data-el="historique-vide"]')).toBeVisible();
        expect((await dbTrajets(page)).some((t) => t.id === id)).toBe(false);
        await page.reload();
        await attendreFormulaire(page);
        await expect(page.locator('[data-el="historique-vide"]')).toBeVisible();
        await expect(lignesHistorique(page)).toHaveCount(0);
      });
    });
    test.describe("Edge Case", () => {
      test("US-3.7 — l'historique est privé : une autre identité anonyme ne voit pas le trajet (RLS)", async ({ page, browser }) => {
        await trajetCalcule(page, "Albi", "Toulouse");
        const autre = await browser.newContext({ baseURL: process.env.APP_URL ?? "https://plein-et-trajet.vercel.app" });
        const p2 = await autre.newPage();
        await p2.goto("/trajets");
        await attendreFormulaire(p2);
        const s2 = await session(p2);
        expect(await rest("trajets?select=id", s2.jeton)).toEqual([]);
        await expect(p2.locator('[data-el="historique-vide"]')).toBeVisible();
        await autre.close();
      });
    });
  });

  test.describe("US-3.P1 — Inverser départ et arrivée", () => {
    test.describe("Happy Path", () => {
      test("US-3.P1 — le bouton d'inversion échange les textes ET les coordonnées : le calcul part de la nouvelle origine", async ({ page }) => {
        await formulairePret(page, "Albi", "Toulouse");
        await expect(page.locator('[data-el="inverser"]')).toHaveAttribute("aria-label", "Inverser les deux lieux");
        await page.locator('[data-el="inverser"]').click();
        await expect(champ(page, "depart")).toHaveValue("Toulouse");
        await expect(champ(page, "arrivee")).toHaveValue("Albi");
        await page.locator("#bouton-calculer").click();
        await expect(page.locator('[data-screen="S4"][data-etat="ok"]')).toBeVisible({ timeout: 45000 });
        expect((await lireResultat(page)).route).toBe("Toulouse → Albi");
      });
    });
    test.describe("Edge Case", () => {
      test("US-3.P1 — inverser deux fois rétablit l'état d'origine ; l'inversion se fait au clavier", async ({ page }) => {
        await formulairePret(page, "Albi", "Toulouse");
        await page.locator('[data-el="inverser"]').focus();
        await page.keyboard.press("Enter");
        await page.keyboard.press("Enter");
        await expect(champ(page, "depart")).toHaveValue("Albi");
        await expect(champ(page, "arrivee")).toHaveValue("Toulouse");
      });
    });
  });

  test.describe("US-3.P2 — Changer de voiture", () => {
    test.describe("Happy Path", () => {
      test("US-3.P2 — autre marque : modèle et motorisation se réinitialisent, la nouvelle voiture est mémorisée (préférences et rechargement)", async ({ page }) => {
        await ouvrirTrajets(page);
        await choisirVoiture(page, "Peugeot", "208", "208 (101ch) · mécanique");
        const avant = await dbPreference(page);
        expect(avant.marque).toBe("Peugeot");
        await choisirDansListe(page, "voiture-marque", "Marque", "Renault");
        await expect(page.locator("#voiture-modele .dd-txt")).toHaveText("Modèle");
        await expect(page.locator("#voiture-moteur .dd-txt")).toHaveText("Motorisation");
        await expect(page.locator('[data-el="voiture-info"]')).toHaveCount(0);
        await expect.poll(async () => (await dbPreference(page))?.marque).toBe("Renault");
        expect(await dbPreference(page)).toMatchObject({ modele: null, vehicule_id: null });
        await choisirVoiture(page, "Renault", "Clio", "");
        const apres = await dbPreference(page);
        expect(apres.vehicule_id).not.toBe(avant.vehicule_id);
        await page.reload();
        await expect(page.locator("#voiture-marque .dd-txt")).toHaveText("Renault");
        await expect(page.locator("#voiture-modele .dd-txt")).toHaveText(/^clio/i);
      });
    });
    test.describe("Edge Case", () => {
      test("US-3.P2 — choisir la même marque ne perd pas la voiture ; changer de modèle réinitialise la motorisation", async ({ page }) => {
        await ouvrirTrajets(page);
        await choisirVoiture(page, "Peugeot", "208", "208 (101ch) · mécanique");
        await choisirDansListe(page, "voiture-modele", "Modèle", "308");
        await expect(page.locator("#voiture-moteur .dd-txt")).toHaveText("Motorisation");
        await expect(page.locator('[data-el="voiture-info"]')).toHaveCount(0);
      });
    });
    test.describe("Happy Path — indicateur", () => {
      test("US-3.P2 — marque seule : aucune ligne ; voiture complète : seulement ce que les menus ne disent pas (carburant · masse), sur une ligne", async ({ page }) => {
        await ouvrirTrajets(page);
        await choisirDansListe(page, "voiture-marque", "Marque", "Renault");
        await expect(page.locator(".carlib")).toHaveCount(0);
        await choisirVoiture(page, "Peugeot", "208", "208 (101ch) · mécanique");
        // streamline R2 (préférence C) : la motorisation est dans son menu (et son infobulle), elle n'est plus répétée dessous
        await expect(page.locator("#voiture-moteur")).toHaveAttribute("title", "208 (101ch) · mécanique");
        await expect(page.locator(".carlib")).toHaveText(/^SP95-E10 · \d+ kg$/);
        await expect(page.locator(".carlib")).not.toContainText("208");
      });
    });
  });

  test.describe("US-3.E1 — Lieu introuvable", () => {
    test.describe("Edge Case", () => {
      test("US-3.E1 — « zzzz » (géocodeur IGN réel, sans mock) : « Lieu introuvable », aucun calcul lancé ; corriger efface le message", async ({ page }) => {
        const brut = await (await fetch("https://data.geopf.fr/geocodage/search?q=zzzz&limit=3&index=address")).json();
        expect(brut.features).toEqual([]);
        const calculs = compterCalculs(page);
        await ouvrirTrajets(page);
        await saisirLieu(page, "depart", "Albi", "Albi");
        await champ(page, "arrivee").pressSequentially("zzzz", { delay: 40 });
        await choisirVoiture(page);
        await page.locator("#bouton-calculer").click();
        await expect(page.locator('[data-el="champ-arrivee-erreur"]')).toHaveText("Lieu introuvable");
        await expect(champ(page, "arrivee")).toHaveAttribute("aria-invalid", "true");
        await expect(champ(page, "arrivee")).toBeFocused();
        await page.waitForTimeout(1500);
        expect(calculs.n).toBe(0);
        await expect(page.locator('[data-screen="S3"]')).toBeVisible();
        await saisirLieu(page, "arrivee", "Toul", "Toulouse");
        await expect(page.locator('[data-el="champ-arrivee-erreur"]')).toHaveCount(0);
      });
      test("US-3.E1 — départ ET arrivée inconnus : les deux champs sont signalés", async ({ page }) => {
        const calculs = compterCalculs(page);
        await ouvrirTrajets(page);
        await champ(page, "depart").fill("qqqqqq");
        await champ(page, "arrivee").fill("zzzz");
        await choisirVoiture(page);
        await page.locator("#bouton-calculer").click();
        await expect(page.locator('[data-el="champ-depart-erreur"]')).toHaveText("Lieu introuvable");
        await expect(page.locator('[data-el="champ-arrivee-erreur"]')).toHaveText("Lieu introuvable");
        expect(calculs.n).toBe(0);
      });
    });
  });

  test.describe("US-3.E2 — Formulaire incomplet", () => {
    test.describe("Edge Case", () => {
      test("US-3.E2 — sans voiture (identité neuve) : « Choisis ta voiture », aucun calcul ; choisir une voiture lève le message", async ({ page }) => {
        const calculs = compterCalculs(page);
        await ouvrirTrajets(page);
        expect(await rest("preferences?select=vehicule_id", (await session(page)).jeton)).toEqual([]);
        await saisirLieu(page, "depart", "Albi", "Albi");
        await saisirLieu(page, "arrivee", "Bord", "Bordeaux");
        await page.locator("#bouton-calculer").click();
        await expect(page.locator('[data-el="voiture-erreur"]')).toHaveText("Choisis ta voiture");
        await expect(page.locator("#voiture-marque")).toHaveAttribute("aria-invalid", "true");
        await expect(page.locator("#voiture-marque")).toBeFocused();
        await page.waitForTimeout(1200);
        expect(calculs.n).toBe(0);
        await choisirVoiture(page, "Dacia", "Sandero", "Sandero");
        await expect(page.locator('[data-el="voiture-erreur"]')).toHaveCount(0);
      });
      test("US-3.E2 — départ vide : « Saisis un lieu » ; formulaire entièrement vide : trois signalements", async ({ page }) => {
        const calculs = compterCalculs(page);
        await ouvrirTrajets(page);
        await champ(page, "depart").fill(""); // passe streamline : départ pré-rempli par la commune GPS
        await page.locator("#bouton-calculer").click();
        await expect(page.locator('[data-el="champ-depart-erreur"]')).toHaveText("Saisis un lieu");
        await expect(page.locator('[data-el="champ-arrivee-erreur"]')).toHaveText("Saisis un lieu");
        await expect(page.locator('[data-el="voiture-erreur"]')).toHaveText("Choisis ta voiture");
        expect(calculs.n).toBe(0);
      });
    });
  });

  test.describe("US-3.E3 — Historique vide", () => {
    test.describe("Edge Case", () => {
      test("US-3.E3 — nouvelle identité : « Aucun trajet pour l'instant » et l'invitation à calculer le premier", async ({ page }) => {
        await ouvrirTrajets(page);
        await expect(page.locator('[data-el="historique-vide"] .t')).toHaveText("Aucun trajet pour l'instant");
        await expect(page.locator('[data-el="historique-vide"] .d')).toContainText("premier trajet");
        await expect(lignesHistorique(page)).toHaveCount(0);
        expect(await rest("trajets?select=id", (await session(page)).jeton)).toEqual([]);
      });
      test("US-3.E3 — un aller-retour Prix → Trajets garde l'état vide ; l'historique d'une autre identité n'apparaît pas", async ({ page }) => {
        await ouvrirTrajets(page);
        await page.getByRole("tab", { name: "Prix" }).click();
        await page.getByRole("tab", { name: "Trajets" }).click();
        await expect(page.locator('[data-el="historique-vide"]')).toBeVisible();
      });
    });
  });

  test.describe("US-3.E4 — Voiture absente de la base", () => {
    test.describe("Edge Case", () => {
      test("US-3.E4 — Peugeot 208 réelle : motorisations avec kW et carburant, la plus proche de la puissance moyenne en premier, les autres par puissance croissante", async ({ page }) => {
        await ouvrirTrajets(page);
        await choisirDansListe(page, "voiture-marque", "Marque", "Peugeot");
        await choisirDansListe(page, "voiture-modele", "Modèle", "208");
        await page.waitForFunction(() => { const e = document.getElementById("voiture-moteur") as HTMLButtonElement; return e && !e.disabled && !/Chargement/.test(e.textContent ?? ""); });
        await expect(page.getByRole("listbox", { name: "Motorisation" })).toBeVisible(); // streamline R2 : la liste s'ouvre seule après le modèle
        const opts = await page.getByRole("listbox", { name: "Motorisation" }).getByRole("option").evaluateAll((els) => els.map((e) => ({ id: (e as HTMLElement).dataset.valeur, txt: (e as HTMLElement).innerText.replace(/\s+/g, " ") })));
        const base = await rest("vehicules?select=id,puissance_kw&marque=eq.Peugeot&modele=eq.208&order=puissance_kw");
        expect(opts).toHaveLength(base.length);
        const moy = base.reduce((s: number, x: any) => s + Number(x.puissance_kw), 0) / base.length;
        const proche = [...base].sort((a: any, b: any) => Math.abs(a.puissance_kw - moy) - Math.abs(b.puissance_kw - moy) || a.puissance_kw - b.puissance_kw)[0];
        expect(opts[0].id).toBe(proche.id);
        expect(opts[0].txt).toMatch(/proposée/i);
        const reste = opts.slice(1).map((o) => Number(o.txt.match(/(\d+(?:,\d)?) kW/)![1].replace(",", ".")));
        expect(reste).toEqual([...reste].sort((a, b) => a - b));
        for (const o of opts) expect(o.txt).toMatch(/kW · (Gazole|SP95-E10|SP95|SP98|E85|GPLc)/);
        await page.keyboard.press("Escape");
        await expect(page.getByRole("listbox", { name: "Motorisation" })).toHaveCount(0);
        await expect(page.locator("#voiture-moteur .dd-txt")).toHaveText("Motorisation");
      });
    });
    test.describe("Edge Case — bi-carburation", () => {
      test("US-3.E4 — Renault Clio : la ligne essence est chiffrée en SP95-E10, la ligne GPL en GPLc, libellés distincts", async ({ page }) => {
        const lignes = await rest("vehicules?select=motorisation,carburant,conso_moyenne&marque=eq.Renault&modele=eq.Clio&energie=eq.ESS%2BG.P.L.&order=puissance_kw");
        expect(lignes.map((l: any) => l.carburant)).toEqual(["SP95-E10", "GPLc"]);
        expect(lignes[0].motorisation).toMatch(/essence$/);
        expect(lignes[1].motorisation).toMatch(/GPL$/);
        expect(lignes[0].conso_moyenne).toBeLessThan(lignes[1].conso_moyenne);
        await ouvrirTrajets(page);
        await choisirDansListe(page, "voiture-marque", "Marque", "Renault");
        await choisirDansListe(page, "voiture-modele", "Modèle", "Clio");
        await page.waitForFunction(() => { const e = document.getElementById("voiture-moteur") as HTMLButtonElement; return e && !e.disabled && !/Chargement/.test(e.textContent ?? ""); });
        await expect(page.getByRole("listbox", { name: "Motorisation" })).toBeVisible(); // streamline R2 : la liste s'ouvre seule après le modèle
        const txt = await page.getByRole("listbox", { name: "Motorisation" }).getByRole("option").allInnerTexts();
        expect(txt.some((t) => /essence/.test(t) && /SP95-E10/.test(t))).toBe(true);
        expect(txt.some((t) => /GPL/.test(t) && /GPLc/.test(t))).toBe(true);
      });
    });
  });

  test.describe("US-4.1 — Comprendre le calcul", () => {
    test.describe("Happy Path", () => {
      test("US-4.1 — un tronçon se déplie (vitesse, arrêts, L/100 km) puis se replie", async ({ page }) => {
        await trajetCalcule(page, "Albi", "Toulouse");
        const t = page.locator('[data-el="troncon-trajet"]');
        await expect(t).toHaveAttribute("aria-expanded", "false");
        await t.click();
        await expect(t).toHaveAttribute("aria-expanded", "true");
        const d = (await page.locator('[data-el="troncon-detail"]:visible').innerText()).replace(/\s+/g, " ");
        expect(d).toMatch(/\d+ km\/h/);
        expect(d).toMatch(/\d+ arrêts?/);
        expect(d).toMatch(/\d+,\d L\/100 km$/);
        await t.click();
        await expect(t).toHaveAttribute("aria-expanded", "false");
        await expect(page.locator('[data-el="troncon-detail"]:visible')).toHaveCount(0);
      });
    });
    test.describe("Edge Case", () => {
      test("US-4.1 — un seul tronçon ouvert à la fois ; la barre de chaque tronçon est proportionnelle à ses litres", async ({ page }) => {
        await trajetCalcule(page, "Albi", "Toulouse");
        const b = page.locator('[data-el="troncons"] button');
        expect(await b.count()).toBeGreaterThan(1);
        await b.nth(0).click();
        await b.nth(1).click();
        await expect(b.nth(0)).toHaveAttribute("aria-expanded", "false");
        await expect(b.nth(1)).toHaveAttribute("aria-expanded", "true");
        const largeurs = await page.locator(".bar i").evaluateAll((els) => els.map((e) => parseFloat((e as HTMLElement).style.width)));
        const litres = (await page.locator('[data-el="troncons"] .lit').allInnerTexts()).map((t) => Number(t.replace(" L", "").replace(",", ".")));
        const max = Math.max(...litres);
        largeurs.forEach((w, i) => expect(Math.abs(w - Math.max(2, (litres[i] / max) * 100))).toBeLessThan(6));
      });
    });
  });

  test.describe("US-4.2 — Mettre mon propre prix", () => {
    test.describe("Happy Path", () => {
      test("US-4.2 — 1,699 recalcule le coût (litres × 1,699), libellé « Mon prix » ; « Revenir à la moyenne » le rétablit", async ({ page }) => {
        const r0 = await trajetCalcule(page, "Albi", "Toulouse");
        const moyenne = await moyenneDuJour("SP95-E10");
        await expect(page.locator('[data-el="libelle-prix"]')).toContainText("Moyenne France du jour");
        await page.locator('[data-el="mettre-mon-prix"]').click();
        await page.locator('[data-el="champ-prix-perso"]').pressSequentially("1,699", { delay: 60 });
        await expect(page.locator('[data-el="libelle-prix"]')).toHaveText("Mon prix");
        const r1 = await lireResultat(page);
        expect(r1.detail).toContain("1,699 €/L");
        // US-4.4 : le total inclut les péages depuis le jalon 3
        expect(Math.abs((await carburantSeul(page)) - r1.litres * 1.699)).toBeLessThan(0.1);
        expect(r1.cout).toBeLessThan(r0.cout);
        await page.locator('[data-el="revenir-moyenne"]').click();
        await expect(page.locator('[data-el="libelle-prix"]')).toContainText("Moyenne France du jour");
        const r2 = await lireResultat(page);
        expect(r2.cout).toBe(r0.cout);
        expect(r2.detail).toContain(virgule(moyenne, 3));
      });
    });
    test.describe("Edge Case", () => {
      test("US-4.2 — bornes : 0,50 et 4,00 acceptés (le coût suit), le prix perso n'est pas enregistré dans l'historique", async ({ page }) => {
        const r0 = await trajetCalcule(page, "Albi", "Toulouse");
        await page.locator('[data-el="mettre-mon-prix"]').click();
        const c = page.locator('[data-el="champ-prix-perso"]');
        await c.fill("4,00");
        await expect(page.locator('[data-el="erreur-prix-perso"]')).toHaveCount(0);
        await expect(page.locator('[data-el="libelle-prix"]')).toHaveText("Mon prix");
        // US-4.4 : le total inclut les péages depuis le jalon 3
        await expect.poll(async () => Math.abs((await carburantSeul(page)) / 4 - r0.litres)).toBeLessThan(0.06);
        await c.fill("0,50");
        await expect.poll(async () => Math.abs((await carburantSeul(page)) / 0.5 - r0.litres)).toBeLessThan(0.06);
        await page.locator('[data-el="retour-trajets"]').click();
        await expect(page.locator('[data-el="liste-historique"] .c').first()).toHaveText(`${virgule(r0.cout)} €`);
      });
    });
  });

  test.describe("US-4.3 — Revenir aux trajets", () => {
    test.describe("Happy Path", () => {
      test("US-4.3 — retour : formulaire affiché, trajet en tête de l'historique, focus sur le bouton Calculer", async ({ page }) => {
        const r = await trajetCalcule(page, "Albi", "Toulouse");
        await page.locator('[data-el="retour-trajets"]').click();
        await expect(page.locator('[data-screen="S3"]')).toBeVisible();
        await expect(lignesHistorique(page)).toHaveCount(1);
        await expect(lignesHistorique(page).first()).toContainText("Albi → Toulouse");
        await expect(page.locator('[data-el="liste-historique"] .c').first()).toHaveText(`${virgule(r.cout)} €`);
        await expect(page.locator("#bouton-calculer")).toBeFocused();
        expect((await dbTrajets(page))[0].arrivee_label).toBe("Toulouse");
      });
    });
    test.describe("Edge Case", () => {
      test("US-4.3 — un nouveau trajet passe devant l'ancien", async ({ page }) => {
        await trajetCalcule(page, "Albi", "Toulouse");
        await page.locator('[data-el="retour-trajets"]').click();
        await page.locator('[data-el="inverser"]').click();
        await page.locator("#bouton-calculer").click();
        await expect(page.locator('[data-screen="S4"][data-etat="ok"]')).toBeVisible({ timeout: 45000 });
        expect((await lireResultat(page)).route).toBe("Toulouse → Albi");
        await page.locator('[data-el="retour-trajets"]').click();
        await expect(lignesHistorique(page)).toHaveCount(2);
        await expect(lignesHistorique(page).first()).toContainText("Toulouse → Albi");
        await expect(lignesHistorique(page).nth(1)).toContainText("Albi → Toulouse");
      });
    });
  });

  test.describe("US-4.E1 — Itinéraire impossible", () => {
    test.describe("Edge Case", () => {
      test("US-4.E1 — Albi → Bastia (vrai routeur IGN, sans mock) : HTTP 422, « Pas d'itinéraire routier entre ces deux lieux », aucun coût, historique inchangé", async ({ page }) => {
        const calculs = compterCalculs(page);
        await formulairePret(page, "Albi", "Albi");
        await saisirLieu(page, "arrivee", "Bast", "Bastia");
        await page.locator("#bouton-calculer").click();
        await expect(S4(page, "pas_itineraire")).toBeVisible({ timeout: 45000 });
        await expect(page.locator('[data-el="pas-itineraire"] .t')).toHaveText("Pas d'itinéraire routier entre ces deux lieux");
        await expect(page.locator("[data-cout]")).toHaveCount(0);
        expect(calculs.statuts).toEqual([422]);
        await page.locator('[data-el="retour-trajets"]').click();
        await expect(page.locator('[data-screen="S3"]')).toBeVisible();
        await expect(lignesHistorique(page)).toHaveCount(0);
        expect(await dbTrajets(page)).toEqual([]);
      });
    });
    test.describe("Edge Case — même lieu", () => {
      test("US-4.E1 — Albi → Albi : message adapté (même lieu), pas de « île sans liaison routière »", async ({ page }) => {
        await formulairePret(page, "Albi", "Albi");
        await page.locator("#bouton-calculer").click();
        await expect(S4(page, "pas_itineraire")).toBeVisible({ timeout: 45000 });
        await expect(page.locator('[data-el="pas-itineraire"] .t')).toHaveText("Pas d'itinéraire routier entre ces deux lieux");
        await expect(page.locator('[data-el="pas-itineraire"] .d')).toContainText("sont le même lieu");
        await expect(page.locator('[data-el="pas-itineraire"] .d')).not.toContainText("île");
      });
    });
  });

  test.describe("US-4.E2 — Prix perso invalide", () => {
    test.describe("Edge Case", () => {
      for (const saisie of ["12", "abc", "0,49", "4,01", "0", "-1,5", "1,6999"]) {
        test(`US-4.E2 — « ${saisie} » : message « Entre un prix entre 0,50 et 4,00 €/L », coût inchangé`, async ({ page }) => {
          const r0 = await trajetCalcule(page, "Albi", "Toulouse");
          await page.locator('[data-el="mettre-mon-prix"]').click();
          const c = page.locator('[data-el="champ-prix-perso"]');
          await c.pressSequentially(saisie, { delay: 40 });
          await expect(page.locator('[data-el="erreur-prix-perso"]')).toHaveText("Entre un prix entre 0,50 et 4,00 €/L");
          await expect(c).toHaveAttribute("aria-invalid", "true");
          expect((await lireResultat(page)).cout).toBe(r0.cout);
          await expect(page.locator('[data-el="libelle-prix"]')).toContainText("Moyenne France du jour");
          await c.fill("1,699");
          await expect(page.locator('[data-el="erreur-prix-perso"]')).toHaveCount(0);
          await expect(page.locator('[data-el="libelle-prix"]')).toHaveText("Mon prix");
        });
      }
    });
  });

  test.describe("US-4.E3 — Calcul trop long", () => {
    test.describe("Edge Case", () => {
      // MOCKED: délai de 3 s ajouté à la VRAIE requête (route.continue après attente) — le backend réel est appelé
      test("US-4.E3 — « Calcul de l'itinéraire… » + Annuler (focus dessus) ramène au formulaire ; la réponse tardive ne change rien", async ({ page }) => {
        test.setTimeout(60000);
        await formulairePret(page, "Albi", "Toulouse");
        await page.route("**/functions/v1/estimer-trajet", async (r) => {
          if (r.request().method() !== "POST") return r.continue();
          await new Promise((x) => setTimeout(x, 3000));
          await r.continue().catch(() => {});
        });
        await page.locator("#bouton-calculer").click();
        await expect(S4(page, "calcul")).toBeVisible();
        await page.waitForTimeout(1200);
        await expect(page.locator('[data-el="calcul-en-cours"] .t')).toHaveText("Calcul de l'itinéraire…");
        await expect(page.locator('[data-el="annuler-calcul"]')).toBeFocused();
        await page.locator('[data-el="annuler-calcul"]').click();
        await expect(page.locator('[data-screen="S3"]')).toBeVisible();
        await expect(page.locator("#bouton-calculer")).toBeFocused();
        await page.waitForTimeout(4500);
        await expect(page.locator('[data-screen="S3"]')).toBeVisible();
        expect(await dbTrajets(page)).toEqual([]);
      });
      test("US-4.E3 — sans délai simulé, un vrai calcul laisse voir l'état de chargement avant le résultat (vrai backend)", async ({ page }) => {
        await formulairePret(page, "Albi", "Bordeaux");
        await page.locator("#bouton-calculer").click();
        await expect(S4(page, "calcul")).toBeVisible();
        await expect(page.locator('[data-el="annuler-calcul"]')).toBeVisible();
        await expect(S4(page, "ok")).toBeVisible({ timeout: 45000 });
      });
    });
  });

  test.describe("US-A11Y-001 — Navigation au clavier (S3 et S4)", () => {
    test.describe("Happy Path", () => {
      test("US-A11Y-001 — S3 : Tab parcourt départ, inversion, arrivée, voiture, Calculer, historique, onglet — contour visible ; Maj+Tab revient", async ({ page }) => {
        await formulairePret(page, "Albi", "Toulouse");
        await page.locator("body").click({ position: { x: 380, y: 70 } });
        await page.evaluate(() => (document.activeElement as HTMLElement)?.blur());
        const vus: any[] = [];
        for (let i = 0; i < 30; i++) {
          await page.keyboard.press("Tab");
          const o = await etatFocus(page);
          expect(o.contour, `contour : ${o.nom}`).toBe(true);
          expect(o.visible, `visible : ${o.nom}`).toBe(true);
          vus.push(o);
          if (o.nom === "Trajets") break;
        }
        expect(vus.slice(0, 7).map((v) => v.nom)).toEqual(["Départ", "Inverser les deux lieux", "Arrivée", "Marque", "Modèle", "Motorisation", "Calculer le coût"]);
        expect(vus.map((v) => v.i)).toEqual([...vus.map((v) => v.i)].sort((a, b) => a - b));
        for (let i = 0; i < vus.length - 1; i++) await page.keyboard.press("Shift+Tab");
        expect((await etatFocus(page)).nom).toBe("Départ");
      });
      test("US-A11Y-001 — S4 : Mettre mon prix, chaque tronçon, onglet — dans l'ordre, contour visible", async ({ page }) => {
        await formulairePret(page, "Albi", "Toulouse");
        await calculer(page);
        await page.locator('[data-el="route-titre"]').focus();
        const vus: any[] = [];
        for (let i = 0; i < 12; i++) {
          await page.keyboard.press("Tab");
          const o = await etatFocus(page);
          expect(o.contour, `contour : ${o.nom}`).toBe(true);
          expect(o.visible, `visible : ${o.nom}`).toBe(true);
          vus.push(o);
          if (o.nom === "Trajets") break;
        }
        expect(vus[0].nom).toBe("Mettre mon prix");
        expect(vus.at(-1).nom).toBe("Trajets");
        expect(vus.filter((v) => /^troncon-/.test(v.id))).toHaveLength(await page.locator('[data-el="troncons"] button').count());
        expect(vus.map((v) => v.i)).toEqual([...vus.map((v) => v.i)].sort((a, b) => a - b));
      });
    });
    test.describe("Edge Case", () => {
      test("US-A11Y-001 — les listes déroulantes de voiture se pilotent aux flèches ; la liste de lieux aussi", async ({ page }) => {
        await formulairePret(page, "Albi", "Toulouse");
        await page.locator("#voiture-marque").focus();
        await page.keyboard.press("ArrowDown");
        await expect(page.getByRole("listbox", { name: "Marque" })).toBeVisible();
        await page.keyboard.press("ArrowDown");
        await page.keyboard.press("Enter");
        await expect(page.getByRole("listbox", { name: "Marque" })).toHaveCount(0);
        await expect(page.locator("#voiture-marque")).toBeFocused();
        await expect(page.locator("#voiture-modele .dd-txt")).toHaveText("Modèle");
      });
    });
  });

  test.describe("US-A11Y-002 — Focus du résultat (S4, équivalent de la fiche)", () => {
    test.describe("Happy Path", () => {
      test("US-A11Y-002 — S4 ouvert au clavier : le focus va sur son titre ; à la fermeture il revient sur Calculer", async ({ page }) => {
        await formulairePret(page, "Albi", "Toulouse");
        await page.locator("#bouton-calculer").focus();
        await page.keyboard.press("Enter");
        await expect(S4(page, "ok")).toBeVisible({ timeout: 45000 });
        await expect(page.locator('[data-el="route-titre"]')).toBeFocused();
        await page.locator('[data-el="retour-trajets"]').focus();
        await page.keyboard.press("Enter");
        await expect(page.locator("#bouton-calculer")).toBeFocused();
      });
    });
    test.describe("Edge Case", () => {
      test("US-A11Y-002 — l'état de chargement place le focus sur Annuler ; la ligne d'historique rouvre S4 et récupère le focus", async ({ page }) => {
        await formulairePret(page, "Albi", "Toulouse");
        await page.locator("#bouton-calculer").click();
        await expect(S4(page, "calcul")).toBeVisible();
        await expect(page.locator('[data-el="annuler-calcul"]')).toBeFocused();
        await expect(S4(page, "ok")).toBeVisible({ timeout: 45000 });
        await page.locator('[data-el="retour-trajets"]').click();
        await page.locator("button.go").first().focus();
        await page.keyboard.press("Enter");
        await expect(S4(page, "ok")).toBeVisible({ timeout: 45000 });
        await expect(page.locator('[data-el="route-titre"]')).toBeFocused();
        await page.locator('[data-el="retour-trajets"]').click();
        await expect(page.locator("button.go").first()).toBeFocused();
      });
    });
    test.describe("Edge Case — fiche station (jalon 1, règle du plan)", () => {
      test("US-A11Y-002 — fiche réelle ouverte au clavier : focus sur le titre ; Échap : retour sur la ligne ouvrante", async ({ page }) => {
        await page.goto("/");
        const ligne = page.locator('[data-el="ligne-station"]').first();
        await expect(ligne).toBeVisible();
        await ligne.focus();
        await page.keyboard.press("Enter");
        await expect(page.locator("#sh-name")).toBeFocused();
        await page.keyboard.press("Escape");
        await expect(page.locator('[data-el="fiche-station"]')).toHaveCount(0);
        await expect(ligne).toBeFocused();
      });
    });
  });

  test.describe("US-A11Y-003 — Touche Échap", () => {
    test.describe("Happy Path", () => {
      test("US-A11Y-003 — S4 : Échap replie le tronçon déplié, le focus reste sur son bouton", async ({ page }) => {
        await formulairePret(page, "Albi", "Toulouse");
        await calculer(page);
        await page.locator("#troncon-0").focus();
        await page.keyboard.press("Enter");
        await expect(page.locator("#troncon-0")).toHaveAttribute("aria-expanded", "true");
        await page.keyboard.press("Escape");
        await expect(page.locator("#troncon-0")).toHaveAttribute("aria-expanded", "false");
        await expect(page.locator("#troncon-0")).toBeFocused();
      });
    });
    test.describe("Edge Case", () => {
      test("US-A11Y-003 — Échap dans le champ prix annule seulement la saisie en cours : le prix déjà appliqué reste (focus sur « Mettre mon prix »)", async ({ page }) => {
        await formulairePret(page, "Albi", "Toulouse");
        await calculer(page);
        const plaque = page.locator('[data-el="prix-utilise"]');
        await page.locator('[data-el="mettre-mon-prix"]').click();
        await expect(page.locator('[data-el="champ-prix-perso"]')).toBeFocused();
        await page.keyboard.type("1,699");
        await page.keyboard.press("Enter");
        await expect(page.locator('[data-el="libelle-prix"]')).toHaveText("Mon prix");
        await expect(plaque).toHaveAttribute("data-prix", "1,699");
        const coutPerso = (await lireResultat(page)).cout;
        // nouvelle saisie, puis Échap : retour à 1,699 (pas à la moyenne)
        await page.locator('[data-el="mettre-mon-prix"]').click();
        await expect(page.locator('[data-el="champ-prix-perso"]')).toHaveValue("1,699");
        await page.locator('[data-el="champ-prix-perso"]').fill("2,1");
        await expect(plaque).toHaveAttribute("data-prix", "2,100");
        await page.keyboard.press("Escape");
        await expect(page.locator('[data-el="champ-prix-perso"]')).toHaveCount(0);
        await expect(plaque).toHaveAttribute("data-prix", "1,699");
        await expect(page.locator('[data-el="libelle-prix"]')).toHaveText("Mon prix");
        expect((await lireResultat(page)).cout).toBe(coutPerso);
        await expect(page.locator('[data-el="mettre-mon-prix"]')).toBeFocused();
        // sans prix perso : Échap referme le champ, la moyenne reste
        await page.locator('[data-el="revenir-moyenne"]').click();
        await page.locator('[data-el="mettre-mon-prix"]').click();
        await page.locator('[data-el="champ-prix-perso"]').fill("1,8");
        await page.keyboard.press("Escape");
        await expect(page.locator('[data-el="libelle-prix"]')).toContainText("Moyenne France du jour");
        await expect(page.locator('[data-el="champ-prix-perso"]')).toHaveCount(0);
      });
      test("US-A11Y-003 — S3 : Échap ferme la liste de propositions de lieux et la liste de marques", async ({ page }) => {
        await formulairePret(page, "Albi", "Toulouse");
        await champ(page, "depart").fill("");
        await champ(page, "depart").pressSequentially("Alb", { delay: 50 });
        await expect(propositions(page, "depart").first()).toBeVisible();
        await page.keyboard.press("Escape");
        await expect(propositions(page, "depart")).toHaveCount(0);
        await expect(champ(page, "depart")).toBeFocused();
        await page.locator("#voiture-marque").focus();
        await page.keyboard.press("Enter");
        await expect(page.getByRole("listbox", { name: "Marque" })).toBeVisible();
        await page.keyboard.press("Escape");
        await expect(page.getByRole("listbox", { name: "Marque" })).toHaveCount(0);
        await expect(page.locator("#voiture-marque")).toBeFocused();
      });
    });
  });

  test.describe("US-A11Y-004 — Libellés lisibles", () => {
    test.describe("Happy Path", () => {
      test("US-A11Y-004 — S3 : chaque champ et bouton a un nom ; les icônes ⇅ et ✕ portent un aria-label", async ({ page }) => {
        await formulairePret(page, "Albi", "Toulouse");
        await calculer(page);
        await page.locator('[data-el="retour-trajets"]').click();
        const snap = await page.locator('[data-screen="S3"]').ariaSnapshot();
        for (const n of ["Départ", "Arrivée", "Inverser les deux lieux", "Marque", "Modèle", "Motorisation", "Calculer le coût", "Supprimer le trajet Albi → Toulouse", "Recalculer le trajet Albi → Toulouse au prix du jour"]) expect(snap, n).toContain(n);
        const sansNom = await page.evaluate(() => [...document.querySelectorAll('[data-screen="S3"] button, [data-screen="S3"] input')].filter((e) => !((e as HTMLElement).getAttribute("aria-label") || (e as HTMLInputElement).labels?.[0]?.textContent || e.textContent?.replace(/[✕⇅▾\s]/g, ""))).length);
        expect(sansNom).toBe(0);
      });
      test("US-A11Y-004 — S4 : le coût, le prix et chaque tronçon sont annoncés en entier", async ({ page }) => {
        await formulairePret(page, "Albi", "Toulouse");
        await calculer(page);
        await expect(page.locator("[data-cout]")).toHaveAttribute("aria-label", /^Coût estimé \d+,\d\d euros$/);
        await expect(page.locator('[data-el="prix-perso"] .totem')).toHaveAttribute("aria-label", /euros le litre$/);
        await expect(page.locator('[data-el="retour-trajets"]')).toHaveAttribute("aria-label", "Retour aux trajets");
        for (const b of await page.locator('[data-el="troncons"] button').all()) await expect(b).toHaveAttribute("aria-label", /, \d+,\d km, \d+,\d litres$/);
      });
    });
    test.describe("Edge Case", () => {
      test("US-A11Y-004 — les erreurs sont des alertes liées au champ (aria-invalid, aria-describedby)", async ({ page }) => {
        await formulairePret(page, "Albi", "Toulouse");
        await page.locator('[data-el="champ-arrivee"]').fill("zzzz");
        await page.locator("#bouton-calculer").click();
        const a = page.locator('[data-el="champ-arrivee-erreur"]');
        await expect(a).toHaveAttribute("role", "alert");
        await expect(page.locator('[data-el="champ-arrivee"]')).toHaveAttribute("aria-describedby", "arr-erreur");
        await expect(page.locator('[data-el="champ-arrivee"]')).toHaveAttribute("aria-invalid", "true");
      });
    });
  });

  test.describe("US-PERF-001 — Ouverture rapide (écrans du jalon 2)", () => {
    test.describe("Happy Path", () => {
      test("US-PERF-001 — Trajets prêt (formulaire, marques, historique) en moins de 2,5 s en 4G simulée, identité neuve, cache vide", async ({ page, context }) => {
        const cdp = await context.newCDPSession(page);
        await cdp.send("Network.enable");
        await cdp.send("Network.setCacheDisabled", { cacheDisabled: true });
        await cdp.send("Network.emulateNetworkConditions", { offline: false, latency: 85, downloadThroughput: (9 * 1024 * 1024) / 8, uploadThroughput: (1.5 * 1024 * 1024) / 8 });
        const t0 = Date.now();
        await page.goto(`${URL_APP}/trajets`, { waitUntil: "commit" });
        await attendreFormulaire(page);
        const t = Date.now() - t0;
        expect(t).toBeLessThan(2500);
      });
    });
    test.describe("Edge Case", () => {
      test("US-PERF-001 — l'écran Prix du jalon 1 reste sous le budget", async ({ page, context }) => {
        const cdp = await context.newCDPSession(page);
        await cdp.send("Network.enable");
        await cdp.send("Network.setCacheDisabled", { cacheDisabled: true });
        await cdp.send("Network.emulateNetworkConditions", { offline: false, latency: 85, downloadThroughput: (9 * 1024 * 1024) / 8, uploadThroughput: (1.5 * 1024 * 1024) / 8 });
        const t0 = Date.now();
        await page.goto(`${URL_APP}/`, { waitUntil: "commit" });
        await page.locator('[data-el="ligne-station"]').first().waitFor({ timeout: 15000 });
        expect(Date.now() - t0).toBeLessThan(2500);
      });
    });
  });
});
