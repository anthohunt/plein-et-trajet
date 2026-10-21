// Jalon 3 — « Péages, Europe et moteurs » : spec unique consolidée depuis exploration/m3-test-snippets/ (extraits conservés).
// Jouée contre l'appli déployée, base réelle (Supabase, Vault, Stadia/Valhalla, PTV, flux officiels des pays). Aucune interception réseau.
// Garde-fous : le globalSetup (exploration/m3-global.mjs) lit les vraies clés en mémoire, crée un administrateur ÉPHÉMÈRE et restaure
// tout à la fin ; les histoires qui modifient la table moteurs sont en série et sous verrou (modifieLesMoteurs).
// Quota PTV : le seul test qui appelle PTV hors du cache des péages est le recalcul indépendant de US-4.4 (2 transactions) ;
// les tests de l'écran Moteurs (US-5.3 enregistrer la vraie clé, US-5.4 tester) passent par la fonction moteurs, comme organisé par le bâtisseur.
// BLOQUÉ-CLÉ : US-5.5 (HERE) et US-5.E3 forme du plan (HERE) restent en test.skip, faute de clé HERE.
import fs from "node:fs";
import path from "node:path";
import { test, expect, ALBI_, appelerMoteurs, attendreFormulaire, BARCELONE, BARCELONE_, BELGRADE, BORDEAUX, BRUXELLES, calculer, carburantAffiche, carte, CASTRES, champ, choisirLieu, choisirVoiture, cleEnMemoire, connecterAdmin, cout, empreinteCles, env, estimerDirect, etatCarte, etatFocus, formulaire, injecterCle, LAUSANNE, lignesListe, lireEtatReel, lireResultat, MILAN, modifieLesMoteurs, moyenneDuJour, nombre, ouvrirMoteurs, ouvrirTrajets, peagesSurTraceDirect, propositions, rest, restService, S4, saisirLieu, session, sqlGestion, URL_APP, virgule } from "./exploration/m3-test-snippets/_aides";

test.describe("M3 — Péages, Europe et moteurs", () => {
  test.describe("US-1.8 — Stations hors de France", () => {
    test.describe("Happy Path", () => {
      test.use({ geolocation: BARCELONE });
      test("US-1.8 — à Barcelone : stations espagnoles en liste et sur la carte, prix = flux officiel MITECO", async ({ page }) => {
        await page.goto("/");
        await page.locator('[data-el="selecteur-carburant"] button', { hasText: "Gazole" }).click();
        await expect(page.locator('[data-el="liste-stations"]')).toHaveAttribute("data-carburant", "Gazole", { timeout: 20000 });
        const lignes = page.locator('[data-el="ligne-station"]');
        await expect(lignes.first()).toBeVisible({ timeout: 20000 });
        const n = await lignes.count();
        expect(n).toBeGreaterThan(10);
        expect(Number(await page.locator('[data-el="carte-stations"]').getAttribute("data-pastilles"))).toBe(n);
        const id = (await lignes.first().getAttribute("data-station"))!;
        expect(id).toMatch(/^ES-/);
        const flux = await (await fetch(`${URL_APP}/api/relais-es`)).json();
        const st = flux.ListaEESSPrecio.find((x: any) => `ES-${x.IDEESS}` === id);
        expect(st).toBeTruthy();
        expect(nombre(await lignes.first().locator(".totem").getAttribute("aria-label"))).toBeCloseTo(Number(st["Precio Gasoleo A"].replace(",", ".")), 2);
        await expect(page.locator('[data-el="ecart"]').first()).toContainText("vs Espagne");
      });
    });
    test.describe("Edge Case", () => {
      test.use({ geolocation: BRUXELLES });
      test("US-1.8 — à Bruxelles (pas de flux) : « Ce pays ne publie pas les prix station par station » et le prix moyen national", async ({ page }) => {
        await page.goto("/");
        await expect(page.locator('[data-el="pays-sans-flux"]')).toBeVisible({ timeout: 30000 });
        await expect(page.locator('[data-el="pays-sans-flux"]')).toContainText("Ce pays ne publie pas les prix station par station");
        const be = Number((await rest("moyennes_nationales?select=prix_moyen&pays=eq.BE&carburant=eq.SP95-E10&order=jour.desc&limit=1"))[0].prix_moyen);
        await expect(page.locator('[data-el="prix-moyen-national"]')).toContainText(`Belgique · SP95-E10 : ${virgule(be, 3)} €/L`);
      });
    });
    for (const [nom, latitude, longitude, prefixe] of [["Rome", 41.9028, 12.4964, "IT-"], ["Lisbonne", 38.7223, -9.1393, "PT-"], ["Vienne", 48.2082, 16.3738, "AT-"], ["Ljubljana", 46.0569, 14.5058, "SI-"], ["Zagreb", 45.815, 15.9819, "HR-"]] as [string, number, number, string][]) {
      test.describe(`Happy Path — ${nom}`, () => {
        test.use({ geolocation: { latitude, longitude } });
        test(`US-1.8 — à ${nom} : stations officielles du pays (${prefixe}…), pas de message « pays sans flux »`, async ({ page }) => {
          await page.goto("/");
          await page.locator('[data-el="selecteur-carburant"] button', { hasText: "Gazole" }).click();
          await expect(page.locator('[data-el="liste-stations"]')).toHaveAttribute("data-carburant", "Gazole", { timeout: 30000 });
          const l = page.locator('[data-el="ligne-station"]');
          await expect(l.first()).toBeVisible({ timeout: 30000 });
          const ids = await l.evaluateAll((els) => els.map((e) => e.getAttribute("data-station")!));
          expect(ids.length).toBeGreaterThan(0);
          expect(ids.every((i) => i.startsWith(prefixe))).toBe(true);
          await expect(page.locator('[data-el="pays-sans-flux"]')).toHaveCount(0);
          expect(await l.first().locator(".totem").getAttribute("aria-label")).toMatch(/^\d,\d{3} euros le litre$/);
        });
      });
    }
    test.describe("Edge Case (pays non branché : libellé vrai)", () => {
      test.use({ geolocation: { latitude: 52.52, longitude: 13.405 } });
      test("US-1.8 — à Berlin : « Prix station par station pas encore disponibles pour ce pays », jamais « ne publie pas »", async ({ page }) => {
        await page.goto("/");
        await expect(page.locator('[data-el="pays-sans-flux"]')).toContainText("Prix station par station pas encore disponibles pour ce pays", { timeout: 30000 });
        await expect(page.locator('[data-el="pays-sans-flux"]')).not.toContainText("ne publie pas");
      });
    });
    test.describe("Edge Case (France inchangée)", () => {
      test("US-1.8 — à Albi : toujours des stations françaises, écart « vs France »", async ({ page }) => {
        await page.goto("/");
        await expect(page.locator('[data-el="ligne-station"]').first()).toBeVisible({ timeout: 20000 });
        await expect(page.locator('[data-el="ecart"]').first()).toContainText("vs France");
        expect(await page.locator('[data-el="ligne-station"]').first().getAttribute("data-station")).not.toMatch(/^ES-/);
      });
    });
  });

  test.describe("US-3.8 — Partir à l'étranger", () => {
    test.describe("Happy Path", () => {
      test("US-3.8 — « Barce » propose Barcelone (Espagne) ; le calcul traverse la France puis l'Espagne", async ({ page }) => {
        await ouvrirTrajets(page);
        await saisirLieu(page, "depart", "Albi", "Albi");
        await champ(page, "arrivee").pressSequentially("Barce", { delay: 40 });
        const o = propositions(page, "arrivee").filter({ hasText: "Barcelone" }).first();
        await expect(o).toBeVisible({ timeout: 20000 });
        await expect(o).toContainText("Espagne");
        await o.click();
        await choisirVoiture(page);
        await calculer(page);
        expect((await lignesListe(page, "pays-traverses")).map((l: any) => l.pays)).toEqual(["FR", "ES"]);
        const r = await lireResultat(page);
        expect(r.km).toBeGreaterThan(440);
        expect(r.km).toBeLessThan(500);
        expect(r.route).toMatch(/ALBI.*BARCELONE/i);
      });
    });
    test.describe("Edge Case", () => {
      test("US-3.8 — un texte absurde reste « Lieu introuvable » (le géocodeur étranger tolérant ne l'emporte pas)", async ({ page }) => {
        await ouvrirTrajets(page);
        await saisirLieu(page, "depart", "Albi", "Albi");
        await champ(page, "arrivee").fill("zzzz");
        await choisirVoiture(page);
        await page.locator("#bouton-calculer").click();
        await expect(champ(page, "arrivee-ligne").or(page.locator('[data-el="champ-arrivee-erreur"]'))).toBeVisible();
        await expect(page.locator('[data-el="champ-arrivee-erreur"]')).toHaveText("Lieu introuvable");
        await expect(page.locator('[data-screen="S4"]')).toHaveCount(0);
      });
      test("US-3.8 — Albi → Rome (> 1 200 km, tracé découpé pour Valhalla) aboutit : France puis Italie", async ({ page }) => {
        await formulaire(page, ALBI_, ["Rome", "Rome", "Italie"]);
        await calculer(page);
        expect((await lignesListe(page, "pays-traverses")).map((l: any) => l.pays)).toEqual(["FR", "IT"]);
        expect((await lireResultat(page)).km).toBeGreaterThan(1200);
      });
      test("US-3.8 — Albi → Lisbonne (> 1 200 km) aboutit : France, Espagne, Portugal", async ({ page }) => {
        await formulaire(page, ALBI_, ["Lisb", "Lisbonne", "Portugal"]);
        await calculer(page);
        expect((await lignesListe(page, "pays-traverses")).map((l: any) => l.pays)).toEqual(["FR", "ES", "PT"]);
      });
    });
  });

  test.describe("US-4.4 — Voir les péages", () => {
    test.describe("Happy Path", () => {
      test("US-4.4 — Albi → Barcelone : chaque section en euros TTC (« gratuit » si 0), total des péages ajouté au coût (montants réels PTV)", async ({ page }) => {
        await formulaire(page, ALBI_, BARCELONE_);
        await calculer(page);
        const l = await lignesListe(page, "detail-peages");
        const lignes = l.filter((x: any) => /^[A-Z]{2} /.test(x.texte) && x.montant && !/Total péages/.test(x.texte));
        expect(lignes.length).toBeGreaterThan(0);
        for (const x of lignes) expect(x.montant).toMatch(/^(\d+,\d{2} €|gratuit)$/);
        const total = nombre(l.find((x: any) => /Total péages/.test(x.texte)).montant);
        expect(total).toBeCloseTo(lignes.reduce((s: number, x: any) => s + (x.montant === "gratuit" ? 0 : nombre(x.montant)), 0), 2);
        // passe streamline : plus de ligne « Carburant · Péages » ; somme des pays (carburant) + total péages = coût affiché
        const pays = await lignesListe(page, "pays-traverses");
        expect(pays.reduce((s: number, x: any) => s + nombre(x.montant), 0) + total).toBeCloseTo(await cout(page), 2);
        await expect(page.locator('[data-el="peages-indisponibles"]')).toHaveCount(0);
      });
      // Recalcul INDÉPENDANT (round 4) : le tracé est redemandé à Stadia (même fournisseur que la prod), échantillonné par un code écrit à part,
      // puis tarifé par un appel direct à PTV (clés lues en mémoire) + TVA du pays. Il ne réutilise ni la requête ni le code de l'Edge Function.
      // Round 5 (audit round 3, HIGH 1 d) : c'est le SEUL test qui appelle PTV hors du cache (4 transactions par passage : Barcelone + Milan,
      // une par l'appli et une en direct) ; tous les autres calculs passent par l'appli, dont le cache par tracé ne repaie pas un trajet déjà tarifé.
      // Étape 4.4 : l'entrée de cache de ces deux tracés est oubliée avant le calcul, pour comparer deux réponses PTV du MÊME moment.
      // Sans cela, l'écran montrait la réponse mise en cache à 00:01Z (79,70 €, « BAILLARGUES - ARLES » 7,30 €) alors que PTV rend à 01:12Z,
      // sur le même tracé, deux sections (« BAILLARGUES - NIMES-O » 3,40 € + « ARLES - GARONS » 1,40 €) : 77,20 €.
      test("US-4.4 — Albi → Barcelone et Albi → Milan : péages tarifés sur LE tracé affiché (recalcul indépendant, mêmes sections, pas de Fréjus hors tracé)", async ({ page }) => {
        test.skip(!(await cleEnMemoire("ptv")) || !(await cleEnMemoire("stadia")), "clé PTV ou Stadia absente : le manager doit la remettre");
        for (const [arrivee, point, fin] of [[BARCELONE_, { lat: 41.3874, lon: 2.1686 }, "41\\.3\\d\\d,2\\.1\\d\\d"], [MILAN, { lat: 45.4642, lon: 9.19 }, "45\\.4\\d\\d,9\\.1\\d\\d"]] as const) {
          // clé de cache : fournisseur|départ|points de passage|arrivée (3 décimales) ; départ = Albi du géocodeur (43,930 ; 2,136)
          await sqlGestion(`delete from public.cache_peages where cle ~ '^ptv\\|43\\.93\\d,2\\.13\\d\\|.*\\|${fin}$'`);
          await formulaire(page, ALBI_, arrivee);
          await calculer(page);
          const l = await lignesListe(page, "detail-peages");
          const d = await peagesSurTraceDirect({ lat: 43.9289, lon: 2.1464 }, point);
          expect(nombre(l.find((x: any) => /Total péages/.test(x.texte)).montant)).toBeCloseTo(d.total, 2);
          const affichees = l.filter((x: any) => /^[A-Z]{2} /.test(x.texte) && !/Total péages/.test(x.texte)).map((x: any) => x.texte);
          expect(affichees).toHaveLength(d.lignes.length);
          // une section de péage n'existe que sur une voie du tracé : le Fréjus n'est tarifé que si le tracé passe par l'A43 / le tunnel
          const tracePasseAuFrejus = d.voies.some((v: string) => /Fréjus|^A ?43$/.test(v));
          expect(affichees.some((t: string) => /Fréjus/.test(t))).toBe(tracePasseAuFrejus);
          await page.goto("/");
        }
      });
      // Round 5 (audit round 3, LOW 5) : stabilité ×2, versionnée. Le 2e calcul du même trajet est servi par le cache des péages : même montant,
      // mêmes sections, aucun appel au fournisseur (consigne : ne pas épuiser le quota PTV).
      test("US-4.4 — stabilité ×2 : deux calculs Albi → Barcelone rendent les mêmes péages ; le second vient du cache (aucun appel PTV)", async () => {
        const a = await estimerDirect({ lat: 43.9289, lon: 2.1464 }, { lat: 41.3874, lon: 2.1686 });
        const b = await estimerDirect({ lat: 43.9289, lon: 2.1464 }, { lat: 41.3874, lon: 2.1686 });
        expect(a.statut).toBe(200);
        expect(b.statut).toBe(200);
        expect(a.corps.peages.etat, `péages : ${a.corps.peages.motif ?? ""}`).toBe("ok");
        expect(b.corps.peages.total).toBe(a.corps.peages.total);
        expect(b.corps.peages.lignes).toEqual(a.corps.peages.lignes);
        expect(b.corps.peages.cache).toBe(true);
      });
    });
    test.describe("Edge Case", () => {
      test("US-4.4 — trajet sans autoroute payante (Albi → Castres) : « Aucun péage sur cet itinéraire » 0,00 €, total = carburant", async ({ page }) => {
        await formulaire(page, ALBI_, CASTRES);
        await calculer(page);
        const l = await lignesListe(page, "detail-peages");
        expect(l).toHaveLength(1);
        expect(l[0].texte).toContain("Aucun péage sur cet itinéraire");
        expect(l[0].montant).toBe("0,00 €");
        expect(await carburantAffiche(page)).toBeCloseTo(await cout(page), 2); // aucun péage : le coût est le carburant seul
      });
    });
  });

  test.describe("US-4.5 — Voir les pays traversés", () => {
    test.describe("Happy Path", () => {
      test("US-4.5 — Albi → Milan : km, litres, prix du jour et coût par pays ; Σ coûts pays = coût carburant", async ({ page }) => {
        await formulaire(page, ALBI_, MILAN);
        await calculer(page);
        const l = await lignesListe(page, "pays-traverses");
        expect(l.map((x: any) => x.pays)).toEqual(["FR", "IT"]);
        for (const x of l) expect(x.texte).toMatch(/\d+ km · \d+,\d L · \d,\d{3} €\/L.*\d+,\d{2} €$/);
        const somme = l.reduce((s: number, x: any) => s + nombre(x.montant), 0);
        expect(somme).toBeCloseTo(await carburantAffiche(page), 2);
        const fr = Number((await rest("moyennes_nationales?select=prix_moyen&pays=eq.FR&carburant=eq.SP95-E10&order=jour.desc&limit=1"))[0].prix_moyen);
        const it = Number((await rest("moyennes_nationales?select=prix_moyen&pays=eq.IT&carburant=eq.SP95-E10&order=jour.desc&limit=1"))[0].prix_moyen);
        expect(l[0].texte).toContain(virgule(fr, 3));
        expect(l[1].texte).toContain(virgule(it, 3));
        // les litres des pays additionnés = litres du trajet (à l'arrondi près)
        const litres = l.reduce((s: number, x: any) => s + nombre(x.texte.match(/(\d+,\d) L/)[1]), 0);
        expect(litres).toBeCloseTo((await lireResultat(page)).litres, 0);
      });
    });
    test.describe("Edge Case", () => {
      test("US-4.5 — prix perso : appliqué à tous les pays, somme des coûts pays = nouveau coût", async ({ page }) => {
        await formulaire(page, ALBI_, MILAN);
        await calculer(page);
        await page.locator('[data-el="mettre-mon-prix"]').click();
        await page.locator('[data-el="champ-prix-perso"]').fill("1,699");
        await page.locator('[data-el="champ-prix-perso"]').press("Enter");
        await expect(page.locator('[data-el="libelle-prix"]')).toHaveText("Mon prix (tous pays)");
        const l = await lignesListe(page, "pays-traverses");
        expect(l.every((x: any) => x.texte.includes("1,699"))).toBe(true);
        expect(l.reduce((s: number, x: any) => s + nombre(x.montant), 0)).toBeCloseTo(await carburantAffiche(page), 2);
      });
      test("US-4.5 — trajet 100 % France : une seule ligne France, libellé « Moyenne France du jour »", async ({ page }) => {
        await formulaire(page, ALBI_, ["Castr", "Castres", "Tarn"]);
        await calculer(page);
        expect((await lignesListe(page, "pays-traverses")).map((x: any) => x.pays)).toEqual(["FR"]);
        await expect(page.locator('[data-el="libelle-prix"]')).toContainText("Moyenne France du jour");
      });
    });
  });

  test.describe("US-4.E4 — Péages indisponibles", () => {
    modifieLesMoteurs();
    test.describe("Edge Case", () => {
      test("US-4.E4 — péages confiés à HERE (aucune clé : service réellement en erreur) : coût carburant affiché, rien ajouté ; retour à PTV : le même trajet retrouve ses péages", async ({ page }) => {
        await restService("moteurs?service=eq.peages", { method: "PATCH", body: JSON.stringify({ actif: "here", secours: null }) });
        await formulaire(page, ALBI_, BORDEAUX);
        await calculer(page);
        const r = await lireResultat(page);
        const moy = await moyenneDuJour("SP95-E10");
        expect(Math.abs(r.cout - r.litres * moy)).toBeLessThan(0.06 * moy + 0.01); // litres affichés arrondis au dixième (même tolérance que M2)
        await expect(page.locator('[data-el="peages-indisponibles"]')).toContainText("Péages non disponibles pour l'instant");
        await expect(page.locator('[data-el="total-peages"]')).toHaveCount(0);
        await expect(page.locator('[data-el="repartition-cout"]')).toHaveCount(0);
        await restService("moteurs?service=eq.peages", { method: "PATCH", body: JSON.stringify({ actif: "ptv", secours: null }) });
        await page.locator('[data-el="retour-trajets"]').click();
        await page.locator('[data-el="liste-historique"] li', { hasText: "Bordeaux" }).first().locator("button.go").click();
        await expect(page.locator('[data-screen="S4"][data-etat="ok"]')).toBeVisible({ timeout: 60000 });
        await expect(page.locator('[data-el="peages-indisponibles"]')).toHaveCount(0);
        await expect(page.locator('[data-el="total-peages"]')).toBeVisible();
      });
    });
  });

  test.describe("US-4.E5 — Vignette sur le trajet", () => {
    test.describe("Edge Case", () => {
      test("US-4.E5 — Albi → Lausanne traverse la Suisse : « Vignette suisse obligatoire (non comptée) »", async ({ page }) => {
        await formulaire(page, ALBI_, LAUSANNE);
        await calculer(page);
        await expect(page.locator('[data-el="ligne-vignette"]')).toHaveCount(1);
        await expect(page.locator('[data-el="ligne-vignette"]')).toContainText("Vignette suisse obligatoire (non comptée)");
        expect((await lignesListe(page, "pays-traverses")).map((x: any) => x.pays)).toContain("CH");
      });
      test("US-4.E5 — pas de vignette pour un trajet France → Espagne", async ({ page }) => {
        await formulaire(page, ALBI_, BARCELONE_);
        await calculer(page);
        await expect(page.locator('[data-el="ligne-vignette"]')).toHaveCount(0);
      });
    });
  });

  test.describe("US-4.E6 — Pays sans prix moyen", () => {
    test.describe("Edge Case", () => {
      test("US-4.E6 — Albi → Belgrade (1 960 km) : la Serbie porte « prix non publié — moyenne européenne appliquée » et le prix de la moyenne UE", async ({ page }) => {
        await formulaire(page, ALBI_, BELGRADE);
        await calculer(page);
        const l = await lignesListe(page, "pays-traverses");
        expect(l.map((x: any) => x.pays)).toEqual(["FR", "IT", "SI", "HR", "RS"]);
        const rs = l.find((x: any) => x.pays === "RS");
        expect(rs).toBeTruthy();
        expect(rs.texte).toContain("prix non publié — moyenne européenne appliquée");
        const eu = Number((await rest("moyennes_nationales?select=prix_moyen&pays=eq.EU&carburant=eq.SP95-E10&order=jour.desc&limit=1"))[0].prix_moyen);
        expect(rs.texte).toContain(virgule(eu, 3));
        expect(l.filter((x: any) => x.pays !== "RS").every((x: any) => !x.texte.includes("prix non publié"))).toBe(true);
        expect(l.reduce((s: number, x: any) => s + nombre(x.montant), 0)).toBeCloseTo(await carburantAffiche(page), 2);
      });
    });
  });

  test.describe("US-5.1 — Ouvrir les moteurs", () => {
    test.describe("Happy Path", () => {
      test("US-5.1 — connecté par lien magique : ⚙ visible ; il ouvre l'écran Moteurs et ses 6 services", async ({ page }) => {
        await connecterAdmin(page, { vers: "accueil" });
        const s = await session(page);
        const u = await (await fetch(`${env.SUPABASE_URL}/auth/v1/user`, { headers: { apikey: env.VITE_SUPABASE_ANON_KEY, Authorization: `Bearer ${s.jeton}` } })).json();
        expect(u.app_metadata.role).toBe("admin");
        await ouvrirMoteurs(page);
        expect((await page.locator('[data-el="moteur"] h3').allInnerTexts()).map((t) => t.split("\n")[0].trim())).toEqual(["PRIX DES STATIONS", "PRIX MOYENS PAR PAYS", "ITINÉRAIRE", "PÉAGES", "VOITURES", "RECHERCHE DE LIEUX"]);
        await expect(page.locator('[data-el="etat-moteur"]')).toHaveCount(6);
        await expect(page.locator('[data-el="bouton-moteurs"]')).toHaveAttribute("aria-pressed", "true");
      });
    });
    test.describe("Edge Case", () => {
      test("US-5.1 — l'adresse /moteurs ouverte par le lien magique affiche directement S5 ; « ← Retour » revient aux prix", async ({ page }) => {
        await connecterAdmin(page);
        await expect(page.locator('[data-el="moteur"]')).toHaveCount(6, { timeout: 20000 });
        await page.locator('[data-el="retour-moteurs"]').click();
        await expect(page.locator('[data-screen="S1"]')).toBeVisible();
      });
      // Round 5 (audit round 3, LOW 5) : tenue de S5 à 390 et 360 px, versionnée (mesurée à la main aux rounds 3 et 4).
      for (const largeur of [390, 360]) {
        test(`US-5.1 — à ${largeur} px : rien ne dépasse de l'écran Moteurs, pastilles entières, texte d'aide du champ clé entier`, async ({ page }) => {
          await page.setViewportSize({ width: largeur, height: 844 });
          await connecterAdmin(page);
          await expect(page.locator('[data-el="moteur"]')).toHaveCount(6, { timeout: 20000 });
          await expect(page.locator('[data-el="etat-moteur"]').first()).not.toHaveText("Test en cours…");
          const m = await page.evaluate(() => {
            const ecran = document.querySelector('[data-screen="S5"]') as HTMLElement;
            const hors = [...ecran.querySelectorAll("*")].filter((e) => {
              const r = e.getBoundingClientRect();
              return r.width > 0 && !e.closest(".sr-only") && (r.left < -0.5 || r.right > window.innerWidth + 0.5);
            }).map((e) => (e as HTMLElement).dataset.el ?? e.tagName);
            const pastillesCoupees = [...document.querySelectorAll('[data-el="etat-moteur"]')].filter((e) => (e as HTMLElement).scrollWidth > (e as HTMLElement).clientWidth + 1).length;
            // largeur du texte d'aide (placeholder) mesurée dans la police du champ, comparée à la place disponible
            const ctx = document.createElement("canvas").getContext("2d")!;
            const aides = [...document.querySelectorAll('input[type="password"]')].map((i) => {
              const s = getComputedStyle(i);
              ctx.font = `${s.fontStyle} ${s.fontWeight} ${s.fontSize} ${s.fontFamily}`;
              const place = (i as HTMLElement).clientWidth - parseFloat(s.paddingLeft) - parseFloat(s.paddingRight);
              return { aide: (i as HTMLInputElement).placeholder, deborde: ctx.measureText((i as HTMLInputElement).placeholder).width > place };
            });
            return { scroll: document.documentElement.scrollWidth, hors, pastillesCoupees, aides };
          });
          expect(m.scroll).toBeLessThanOrEqual(largeur);
          expect(m.hors).toEqual([]);
          expect(m.pastillesCoupees).toBe(0);
          expect(m.aides.length).toBeGreaterThan(0);
          expect(m.aides.filter((x) => x.deborde).map((x) => x.aide)).toEqual([]);
        });
      }
    });
  });

  test.describe("US-5.2 — Choisir le fournisseur", () => {
    modifieLesMoteurs();
    test.describe("Happy Path", () => {
      test("US-5.2 — HERE (clé requise) → « Clé à coller » ; IGN (sans clé) → « Prêt · sans clé »", async ({ page }) => {
        await connecterAdmin(page);
        await expect(page.locator('[data-el="moteur"]')).toHaveCount(6, { timeout: 20000 });
        await carte(page, "peages").locator('[data-el="choix-fournisseur"]').selectOption("here");
        await expect(etatCarte(page, "peages")).toHaveText("Clé à coller");
        await carte(page, "itineraire").locator("select").first().selectOption("itineraire-ign");
        await expect(etatCarte(page, "itineraire")).toHaveText("Prêt · sans clé");
        await expect(carte(page, "peages").locator('[data-el="champ-cle"]')).toBeVisible();
        await expect(carte(page, "itineraire").locator("input")).toHaveCount(0);
      });
    });
    test.describe("Edge Case", () => {
      test("US-5.2 — choisir sans enregistrer ne change rien côté serveur (l'actif reste PTV)", async ({ page }) => {
        await connecterAdmin(page);
        await expect(page.locator('[data-el="moteur"]')).toHaveCount(6, { timeout: 20000 });
        await carte(page, "peages").locator('[data-el="choix-fournisseur"]').selectOption("here");
        await page.reload();
        await expect(page.locator('[data-el="moteur"]')).toHaveCount(6, { timeout: 20000 });
        await expect(carte(page, "peages").locator('[data-el="choix-fournisseur"]')).toHaveValue("ptv");
      });
    });
  });

  const FAUSSE = "FAUX-CLE-ESSAI-8e4a";
  test.describe("US-5.3 — Coller la clé", () => {
    modifieLesMoteurs();
    test.use({ permissions: ["geolocation", "clipboard-read", "clipboard-write"] }); // pour COLLER la clé (presse-papiers + Ctrl+V)
    test.describe("Happy Path", () => {
      test("US-5.3 — je colle la VRAIE clé PTV et j'enregistre : testée, rangée chiffrée dans Vault (même valeur), le champ n'affiche que ••••+4", async ({ page }) => {
        const reel = await lireEtatReel(); // en mémoire seulement ; jamais écrite dans un fichier, un log ni une sortie
        test.skip(!reel.cles.ptv, "aucune clé PTV enregistrée : le manager doit la remettre");
        const [{ updated_at: avant }] = await sqlGestion("select updated_at from vault.decrypted_secrets where name = 'cle_ptv'");
        await connecterAdmin(page);
        await expect(page.locator('[data-el="moteur"]')).toHaveCount(6, { timeout: 20000 });
        const champ = carte(page, "peages").locator('[data-el="champ-cle"]');
        await page.evaluate((v) => navigator.clipboard.writeText(v), reel.cles.ptv);
        await champ.focus();
        await page.keyboard.press("Control+V");
        expect((await champ.inputValue()) === reel.cles.ptv).toBe(true); // booléen : la valeur n'apparaît jamais dans un message d'échec
        await page.evaluate(() => navigator.clipboard.writeText(""));
        await carte(page, "peages").locator('[data-el="enregistrer-moteur"]').click();
        await expect(etatCarte(page, "peages")).toHaveText("Enregistré · utilisé dès le prochain calcul", { timeout: 45000 });
        expect(await champ.inputValue()).toBe("");
        await expect(champ).toHaveAttribute("placeholder", `Clé ••••${reel.cles.ptv.slice(-4)} · coller pour changer`);
        const [v] = await sqlGestion("select updated_at, secret is distinct from decrypted_secret as chiffre from vault.decrypted_secrets where name = 'cle_ptv'");
        expect(v.chiffre).toBe(true);
        expect(v.updated_at > avant).toBe(true);
        expect((await cleEnMemoire("ptv")) === reel.cles.ptv).toBe(true);
      });
      test("US-5.3 — la vraie clé PTV est rangée dans Vault (chiffrée) ; le champ n'affiche que ses 4 derniers caractères ; la clé n'est jamais dans la page ni le réseau", async ({ page }) => {
        const reel = await lireEtatReel(); // en mémoire seulement
        test.skip(!reel.cles.ptv, "aucune clé PTV enregistrée : le manager doit la remettre");
        const reponses: string[] = [];
        page.on("response", async (r) => { if (/supabase\.co/.test(r.url())) reponses.push(await r.text().catch(() => "")); });
        await connecterAdmin(page);
        await expect(page.locator('[data-el="moteur"]')).toHaveCount(6, { timeout: 20000 });
        const champ = carte(page, "peages").locator('[data-el="champ-cle"]');
        await expect(champ).toHaveAttribute("type", "password");
        await expect(champ).toHaveAttribute("placeholder", /^Clé ••••.{4} · coller pour changer$/);
        expect(await champ.inputValue()).toBe("");
        const [{ fin }] = await sqlGestion("select fin from public.cles_fournisseurs where fournisseur = 'ptv'");
        expect(reel.cles.ptv.endsWith(fin)).toBe(true);
        const [v] = await sqlGestion("select secret is distinct from decrypted_secret as chiffre from vault.decrypted_secrets where name = 'cle_ptv'");
        expect(v.chiffre).toBe(true);
        reponses.length = 0;
        await page.reload();
        await expect(page.locator('[data-el="moteur"]')).toHaveCount(6, { timeout: 20000 });
        // comparaisons BOOLÉENNES seulement (audit round 3, MEDIUM 2) : un not.toContain(cle) en échec imprimerait la clé ;
        // en cas d'échec, le message ne nomme que le fournisseur concerné
        const contenu = await page.content();
        const champs = (await page.locator("input").evaluateAll((els) => els.map((e: any) => e.value + "|" + e.placeholder))).join("\n");
        for (const [fournisseur, cle] of Object.entries(reel.cles) as [string, string][]) {
          expect(contenu.includes(cle), `clé ${fournisseur} présente dans la page`).toBe(false);
          expect(champs.includes(cle), `clé ${fournisseur} présente dans un champ`).toBe(false);
          expect(reponses.some((t) => t.includes(cle)), `clé ${fournisseur} présente dans une réponse réseau`).toBe(false);
        }
        expect(reponses.some((t) => /"cle_fin":"[^"]{4}"/.test(t))).toBe(true);
      });
    });
    test.describe("Edge Case", () => {
      test("US-5.3 — une clé collée est TESTÉE avant d'être écrite : la clé factice est refusée (401), la vraie clé reste en place", async ({ page }) => {
        const avant = await empreinteCles();
        await connecterAdmin(page);
        await expect(page.locator('[data-el="moteur"]')).toHaveCount(6, { timeout: 20000 });
        await carte(page, "peages").locator('[data-el="champ-cle"]').fill(FAUSSE);
        await carte(page, "peages").locator('[data-el="enregistrer-moteur"]').click();
        // refus écrit une seule fois (audit round 2, LOW 8)
        await expect(etatCarte(page, "peages")).toHaveText("Clé refusée par PTV (401) · clé non enregistrée, ancienne clé conservée · fournisseur actif inchangé", { timeout: 45000 });
        expect(await empreinteCles()).toBe(avant);
      });
    });
  });

  test.describe("US-5.4 — Tester la connexion", () => {
    modifieLesMoteurs();
    test.describe("Happy Path", () => {
      test("US-5.4 — clé PTV valide : un vrai calcul Albi → Barcelone part vers PTV, l'état affiche « Connecté »", async ({ page }) => {
        test.skip(!(await lireEtatReel()).cles.ptv, "aucune clé PTV enregistrée : le manager doit la remettre");
        await connecterAdmin(page);
        await expect(page.locator('[data-el="moteur"]')).toHaveCount(6, { timeout: 20000 });
        await carte(page, "peages").locator('[data-el="tester-connexion"]').click();
        await expect(etatCarte(page, "peages")).toContainText("Connecté · test Albi → Barcelone OK", { timeout: 60000 });
        await expect(etatCarte(page, "peages")).toHaveAttribute("data-etat", "ok");
      });
      test("US-5.4 — l'itinéraire se teste aussi : « Connecté · test Albi → Toulouse OK »", async ({ page }) => {
        await connecterAdmin(page);
        await expect(page.locator('[data-el="moteur"]')).toHaveCount(6, { timeout: 20000 });
        await carte(page, "itineraire").locator('[data-el="tester-connexion-itineraire"]').click();
        await expect(etatCarte(page, "itineraire")).toContainText("Connecté · test Albi → Toulouse OK", { timeout: 40000 });
      });
    });
    test.describe("Edge Case", () => {
      test("US-5.4 — HERE sans clé : « Aucune clé : colle-la d'abord » (aucun appel à HERE)", async ({ page }) => {
        await connecterAdmin(page);
        await expect(page.locator('[data-el="moteur"]')).toHaveCount(6, { timeout: 20000 });
        await carte(page, "peages").locator('[data-el="choix-fournisseur"]').selectOption("here");
        await carte(page, "peages").locator('[data-el="tester-connexion"]').click();
        await expect(etatCarte(page, "peages")).toHaveText("Aucune clé : colle-la d'abord");
        await expect(etatCarte(page, "peages")).toHaveAttribute("data-etat", "ko");
      });
    });
  });

  test.describe("US-5.5 — Enregistrer le moteur", () => {
    modifieLesMoteurs();
    test.describe("Happy Path", () => {
      test("US-5.5 — BLOQUÉ-CLÉ : HERE enregistré, Albi → Barcelone a des péages HERE sans redéploiement", async () => {
        test.info().annotations.push({ type: "BLOQUÉ-CLÉ", description: "il manque une clé HERE valide" });
        test.skip(true, "BLOQUÉ-CLÉ : aucune clé HERE n'existe ; le moteur actif est relu à chaque appel (table moteurs + Vault), la bascule n'a pas pu être vue avec de vrais montants");
      });
      test("US-5.5 — un fournisseur sans clé s'enregistre et devient actif aussitôt (itinéraire → IGN), puis retour à Valhalla", async ({ page }) => {
        await connecterAdmin(page);
        await expect(page.locator('[data-el="moteur"]')).toHaveCount(6, { timeout: 20000 });
        const c = carte(page, "itineraire");
        await c.locator("select").first().selectOption("itineraire-ign");
        await c.locator('[data-el="choix-secours-itineraire"]').selectOption(""); // sans secours : le moteur IGN seul ne couvre que la France
        await c.locator('[data-el="enregistrer-moteur-itineraire"]').click();
        await expect(etatCarte(page, "itineraire")).toContainText("Enregistré · utilisé dès le prochain calcul", { timeout: 30000 });
        expect((await restService("moteurs?select=actif&service=eq.itineraire")).corps[0].actif).toBe("itineraire-ign");
        // sans redéploiement : un trajet à l'étranger est refusé par le moteur IGN (France seule)…
        await formulaire(page, ALBI_, BARCELONE_);
        await page.locator("#bouton-calculer").click();
        await expect(page.locator('[data-el="limite-itineraire"]')).toContainText("Ce fournisseur d'itinéraire ne couvre que la France", { timeout: 30000 });
        // …et accepté dès que Stadia (clé réelle) est rétabli
        await connecterAdmin(page);
        await expect(page.locator('[data-el="moteur"]')).toHaveCount(6, { timeout: 20000 });
        await carte(page, "itineraire").locator("select").first().selectOption("stadia");
        await carte(page, "itineraire").locator('[data-el="enregistrer-moteur-itineraire"]').click();
        await expect(etatCarte(page, "itineraire")).toContainText("Enregistré", { timeout: 40000 });
        await formulaire(page, ALBI_, BARCELONE_);
        await calculer(page);
        await expect(page.locator('[data-el="pays-traverses"] li')).toHaveCount(2);
      });
    });
    test.describe("Edge Case", () => {
      test("US-5.5 — HERE sans clé : l'enregistrement est refusé et PTV reste le moteur actif", async ({ page }) => {
        await connecterAdmin(page);
        await expect(page.locator('[data-el="moteur"]')).toHaveCount(6, { timeout: 20000 });
        await carte(page, "peages").locator('[data-el="choix-fournisseur"]').selectOption("here");
        await carte(page, "peages").locator('[data-el="enregistrer-moteur"]').click();
        await expect(etatCarte(page, "peages")).toContainText("Aucune clé : colle-la d'abord", { timeout: 30000 });
        expect((await restService("moteurs?select=actif&service=eq.peages")).corps[0].actif).toBe("ptv");
      });
    });
  });

  test.describe("US-5.6 — Où trouver ma clé", () => {
    test.describe("Happy Path", () => {
      test("US-5.6 — PTV : lien « Où trouver ma clé » (nouvel onglet) vers developer.myptv.com avec la consigne « API Keys » ; le lien charge", async ({ page, context }) => {
        await connecterAdmin(page);
        await expect(page.locator('[data-el="moteur"]')).toHaveCount(6, { timeout: 20000 });
        const lien = carte(page, "peages").locator('[data-el="lien-cle"] a');
        await expect(lien).toHaveText("Où trouver ma clé");
        await expect(lien).toHaveAttribute("href", "https://developer.myptv.com/en");
        await expect(lien).toHaveAttribute("target", "_blank");
        await expect(lien).toHaveAttribute("rel", "noopener noreferrer");
        await expect(carte(page, "peages").locator('[data-el="consigne-cle"]')).toContainText("API Keys");
        const [onglet] = await Promise.all([context.waitForEvent("page"), lien.click()]);
        await onglet.waitForLoadState("domcontentloaded");
        expect(onglet.url()).toContain("developer.myptv.com");
        expect(await onglet.title()).toMatch(/PTV/i);
        await onglet.close();
      });
      test("US-5.6 — Stadia (choisi pour l'itinéraire) : lien vers client.stadiamaps.com/dashboard/", async ({ page }) => {
        await connecterAdmin(page);
        await expect(page.locator('[data-el="moteur"]')).toHaveCount(6, { timeout: 20000 });
        await carte(page, "itineraire").locator("select").first().selectOption("stadia");
        await expect(carte(page, "itineraire").locator('[data-el="lien-cle"] a')).toHaveAttribute("href", "https://client.stadiamaps.com/dashboard/");
        await expect(carte(page, "itineraire").locator('[data-el="lien-cle"] a')).toHaveAttribute("target", "_blank");
      });
      test("US-5.6 — HERE (secours des péages) et Tankerkönig (stations) ont leur lien", async ({ page }) => {
        await connecterAdmin(page);
        await expect(page.locator('[data-el="moteur"]')).toHaveCount(6, { timeout: 20000 });
        await carte(page, "peages").locator('[data-el="choix-fournisseur"]').selectOption("here");
        await expect(carte(page, "peages").locator('[data-el="lien-cle"] a')).toHaveAttribute("href", "https://platform.here.com/access/apps");
        await carte(page, "prix").locator("select").first().selectOption("tankerkoenig");
        await expect(carte(page, "prix").locator('[data-el="lien-cle"] a')).toHaveAttribute("href", "https://creativecommons.tankerkoenig.de/");
      });
    });
    test.describe("Edge Case", () => {
      test("US-5.6 — un fournisseur sans clé (Voitures, Prix moyens) n'a aucun lien", async ({ page }) => {
        await connecterAdmin(page);
        await expect(page.locator('[data-el="moteur"]')).toHaveCount(6, { timeout: 20000 });
        for (const s of ["voitures", "moyennes", "lieux"]) await expect(carte(page, s).locator('[data-el="lien-cle"]')).toHaveCount(0);
      });
      test("US-5.6 — le lien et la consigne viennent de la fonction moteurs (table fournisseurs), pas du composant", async ({ page }) => {
        await connecterAdmin(page);
        await expect(page.locator('[data-el="moteur"]')).toHaveCount(6, { timeout: 20000 });
        const { jeton } = await session(page);
        const r = await appelerMoteurs(jeton, { action: "lister" });
        const fs_ = r.corps.moteurs.flatMap((m: any) => m.fournisseurs);
        expect(fs_.find((f: any) => f.id === "ptv").url_cle).toBe("https://developer.myptv.com/en");
        expect(fs_.find((f: any) => f.id === "ptv").consigne_cle).toContain("API Keys");
        expect(fs_.filter((f: any) => !f.cle_requise).every((f: any) => f.url_cle === null && f.consigne_cle === null)).toBe(true);
        // rien en dur dans l'interface : aucune de ces adresses dans le code source du front
        const src = ["src/routes/Moteurs.tsx", "src/lib/textes.ts", "src/lib/moteurs.ts"].map((f) => fs.readFileSync(path.resolve(f), "utf8")).join("\n");
        for (const u of ["myptv.com", "stadiamaps.com", "platform.here.com", "tankerkoenig.de"]) expect(src).not.toContain(u);
      });
    });
  });

  // l'onglet Trajets crée la connexion anonyme de l'appareil
  async function ouvrirEnVisiteur(page: import("@playwright/test").Page) {
    await page.goto("/trajets");
    await attendreFormulaire(page);
    await page.getByRole("tab", { name: "Prix" }).click();
    await expect(page.locator('[data-el="ligne-station"]').first()).toBeVisible({ timeout: 20000 });
  }

  test.describe("US-5.E1 — Moteurs invisibles aux visiteurs", () => {
    test.describe("Edge Case", () => {
      test("US-5.E1 — visiteur anonyme : pas de bouton ⚙ ; /moteurs renvoie aux prix", async ({ page }) => {
        await page.goto("/");
        await expect(page.locator('[data-el="ligne-station"]').first()).toBeVisible({ timeout: 20000 });
        await expect(page.locator('[data-el="bouton-moteurs"]')).toHaveCount(0);
        await page.goto("/moteurs");
        await expect(page.locator('[data-screen="S1"]')).toBeVisible({ timeout: 15000 });
        await expect(page.locator('[data-screen="S5"]')).toHaveCount(0);
        expect(new URL(page.url()).pathname).toBe("/");
      });
      test("US-5.E1 — le serveur refuse toute lecture et écriture de la table des moteurs (RLS), des clés et de la fonction", async ({ page }) => {
        await ouvrirEnVisiteur(page);
        const { jeton } = await session(page);
        const h = { apikey: env.VITE_SUPABASE_ANON_KEY, Authorization: `Bearer ${jeton}`, "Content-Type": "application/json", Prefer: "return=representation" };
        const base = `${env.SUPABASE_URL}/rest/v1`;
        expect((await restService("moteurs?select=service")).corps).toHaveLength(6);
        expect(await (await fetch(`${base}/moteurs?select=service`, { headers: h })).json()).toEqual([]);
        expect((await fetch(`${base}/moteurs`, { method: "POST", headers: h, body: JSON.stringify({ service: "pirate", nom: "x", description: "x", actif: "ptv" }) })).status).toBeGreaterThanOrEqual(400);
        expect(await (await fetch(`${base}/moteurs?service=eq.peages`, { method: "PATCH", headers: h, body: JSON.stringify({ actif: "here" }) })).json()).toEqual([]);
        expect(await (await fetch(`${base}/moteurs?service=eq.peages`, { method: "DELETE", headers: h })).json()).toEqual([]);
        expect((await fetch(`${base}/cles_fournisseurs?select=*`, { headers: h })).status).toBeGreaterThanOrEqual(400);
        expect((await fetch(`${base}/rpc/moteur_cle`, { method: "POST", headers: h, body: JSON.stringify({ p_fournisseur: "ptv" }) })).status).toBeGreaterThanOrEqual(400);
        expect((await appelerMoteurs(jeton, { action: "lister" })).statut).toBe(403);
        expect((await appelerMoteurs(env.VITE_SUPABASE_ANON_KEY, { action: "lister" })).statut).toBe(401);
        expect((await restService("moteurs?select=actif&service=eq.peages")).corps[0].actif).toBe("ptv");
      });
      test("US-5.E1 — un utilisateur ne peut pas se donner le rôle admin (user_metadata ignoré)", async ({ page }) => {
        await ouvrirEnVisiteur(page);
        const { jeton } = await session(page);
        const r = await fetch(`${env.SUPABASE_URL}/auth/v1/user`, { method: "PUT", headers: { apikey: env.VITE_SUPABASE_ANON_KEY, Authorization: `Bearer ${jeton}`, "Content-Type": "application/json" }, body: JSON.stringify({ data: { role: "admin" } }) });
        expect(r.status).toBeLessThan(500);
        const s2 = await (await fetch(`${env.SUPABASE_URL}/auth/v1/token?grant_type=refresh_token`, { method: "POST", headers: { apikey: env.VITE_SUPABASE_ANON_KEY, "Content-Type": "application/json" }, body: JSON.stringify({ refresh_token: (await page.evaluate(() => JSON.parse(localStorage.getItem("pt-auth")!).refresh_token)) }) })).json();
        expect((await appelerMoteurs(s2.access_token, { action: "lister" })).statut).toBe(403);
        await page.goto("/");
        await expect(page.locator('[data-el="bouton-moteurs"]')).toHaveCount(0);
      });
    });
  });

  test.describe("US-5.E2 — Clé refusée", () => {
    modifieLesMoteurs();
    test.describe("Edge Case", () => {
      test("US-5.E2 — clé PTV invalide : le vrai PTV répond 401 → « Clé refusée par PTV (401) »", async ({ page }) => {
        await connecterAdmin(page);
        await expect(page.locator('[data-el="moteur"]')).toHaveCount(6, { timeout: 20000 });
        await carte(page, "peages").locator('[data-el="champ-cle"]').fill("cle-invalide-0000-zz91");
        await carte(page, "peages").locator('[data-el="tester-connexion"]').click();
        await expect(etatCarte(page, "peages")).toHaveText("Clé refusée par PTV (401)", { timeout: 30000 });
        await expect(etatCarte(page, "peages")).toHaveAttribute("data-etat", "ko");
      });
      test("US-5.E2 — Enregistrer avec une clé HERE invalide garde PTV actif", async ({ page }) => {
        const avant = await empreinteCles();
        await connecterAdmin(page);
        await expect(page.locator('[data-el="moteur"]')).toHaveCount(6, { timeout: 20000 });
        await carte(page, "peages").locator('[data-el="choix-fournisseur"]').selectOption("here");
        await carte(page, "peages").locator('[data-el="champ-cle"]').fill("cle-invalide-here-5512");
        await carte(page, "peages").locator('[data-el="enregistrer-moteur"]').click();
        await expect(etatCarte(page, "peages")).toContainText("Clé refusée par HERE (401)", { timeout: 30000 });
        await expect(etatCarte(page, "peages")).toContainText("fournisseur actif inchangé");
        await expect(etatCarte(page, "peages")).toContainText("clé non enregistrée");
        expect((await restService("moteurs?select=actif&service=eq.peages")).corps[0].actif).toBe("ptv");
        expect(await empreinteCles()).toBe(avant);
        await page.reload();
        await expect(page.locator('[data-el="moteur"]')).toHaveCount(6, { timeout: 20000 });
        await expect(carte(page, "peages").locator('[data-el="choix-fournisseur"]')).toHaveValue("ptv");
      });
    });
  });

  test.describe("US-5.E3 — Bascule de secours", () => {
    modifieLesMoteurs();
    test.describe("Edge Case", () => {
      test("US-5.E3 — BLOQUÉ-CLÉ (forme du plan) : PTV tombe, les péages viennent de HERE", async () => {
        test.info().annotations.push({ type: "BLOQUÉ-CLÉ", description: "il manque une clé HERE valide" });
        test.skip(true, "BLOQUÉ-CLÉ : la forme du plan (PTV principal → HERE secours) exige une clé HERE valide ; la bascule réelle d'un principal en panne vers un secours qui répond est vérifiée par le test suivant (HERE refusé → PTV)");
      });
      test("US-5.E3 — bascule RÉELLE : HERE principal (clé factice, vrai 401), PTV secours (vraie clé) : les péages s'affichent et l'écran Moteurs note la bascule avec l'heure", async ({ page }) => {
        await injecterCle("here", "FAUX-HERE-CLE-0002");
        await restService("moteurs?service=eq.peages", { method: "PATCH", body: JSON.stringify({ actif: "here", secours: "ptv", bascule_le: null, bascule_de: null, bascule_vers: null }) });
        await formulaire(page, ALBI_, BORDEAUX);
        await calculer(page);
        await expect(page.locator('[data-el="peages-indisponibles"]')).toHaveCount(0);
        await expect(page.locator('[data-el="total-peages"]')).toBeVisible();
        await connecterAdmin(page);
        await expect(page.locator('[data-el="moteur"]')).toHaveCount(6, { timeout: 20000 });
        await expect(carte(page, "peages").locator('[data-el="bascule"]')).toHaveText(/^Bascule HERE → PTV Developer le \d{2}\/\d{2} \d{2}:\d{2}$/);
        await expect(carte(page, "peages").locator('[data-el="incident"]')).toContainText("HERE : clé refusée (401)");
      });
    });
  });

  test.describe("US-A11Y-001 — Navigation au clavier (jalon 3)", () => {
    test.describe("Happy Path", () => {
      test("US-A11Y-001 — écran Moteurs : Tab parcourt tous les contrôles dans l'ordre de lecture, contour visible", async ({ page }) => {
        await connecterAdmin(page);
        await expect(page.locator('[data-el="moteur"]')).toHaveCount(6, { timeout: 20000 });
        await page.locator("body").click({ position: { x: 5, y: 5 } });
        const ordre: any[] = [];
        for (let i = 0; i < 40; i++) {
          await page.keyboard.press("Tab");
          const e = await etatFocus(page);
          ordre.push(e);
          if (e.id.startsWith("onglet")) break;
        }
        expect(ordre.length).toBeGreaterThan(15);
        expect(ordre.every((e) => e.contour && e.nom)).toBe(true);
        const i = (id: string) => ordre.findIndex((e) => e.id === id);
        expect(i("mot-prix-f")).toBeLessThan(i("mot-itineraire-f"));
        expect(i("mot-itineraire-f")).toBeLessThan(i("mot-peages-f"));
        expect(i("mot-peages-f")).toBeLessThan(i("mot-lieux-f"));
      });
    });
    test.describe("Happy Path (S1, S3, S4)", () => {
      async function tab(page: import("@playwright/test").Page, max = 60) {
        await page.locator("body").click({ position: { x: 5, y: 5 } });
        const o: any[] = [];
        for (let i = 0; i < max; i++) {
          await page.keyboard.press("Tab");
          const e = await etatFocus(page);
          o.push(e);
          if (e.id.startsWith("onglet")) break;
        }
        return o;
      }
      test("US-A11Y-001 — S3 Trajets : départ, arrivée, voiture, calcul dans l'ordre de lecture, contour visible", async ({ page }) => {
        await ouvrirTrajets(page);
        const o = await tab(page);
        expect(o.every((e) => e.contour && e.nom)).toBe(true);
        const i = (id: string) => o.findIndex((e) => e.id === id);
        expect(i("dep")).toBeLessThan(i("arr"));
        expect(i("arr")).toBeLessThan(i("voiture-marque"));
        expect(i("voiture-marque")).toBeLessThan(i("bouton-calculer"));
      });
      test("US-A11Y-001 — S4 Résultat : retour, prix perso, tronçons atteints avec contour visible", async ({ page }) => {
        await formulaire(page, ALBI_, CASTRES);
        await calculer(page);
        const o = await tab(page);
        expect(o.every((e) => e.contour && e.nom)).toBe(true);
        expect(o.findIndex((e) => e.id === "troncon-0")).toBeGreaterThan(0);
      });
      test("US-A11Y-001 — S1 Prix : tous les contrôles ont un contour visible", async ({ page }) => {
        await page.goto("/");
        await expect(page.locator('[data-el="ligne-station"]').first()).toBeVisible({ timeout: 20000 });
        const o = await tab(page);
        expect(o.every((e) => e.contour && e.nom)).toBe(true);
      });
    });
    test.describe("Edge Case", () => {
      test("US-A11Y-001 — Maj+Tab revient au contrôle précédent", async ({ page }) => {
        await connecterAdmin(page);
        await expect(page.locator('[data-el="moteur"]')).toHaveCount(6, { timeout: 20000 });
        await page.keyboard.press("Tab");
        await page.keyboard.press("Tab");
        const a = await etatFocus(page);
        await page.keyboard.press("Shift+Tab");
        expect((await etatFocus(page)).i).not.toBe(a.i);
      });
    });
  });

  test.describe("US-A11Y-002 — Focus de la fiche (jalon 3)", () => {
    test.use({ geolocation: BARCELONE });
    test.describe("Happy Path", () => {
      test("US-A11Y-002 — fiche d'une station espagnole : focus sur son titre, retour sur la ligne à la fermeture", async ({ page }) => {
        await page.goto("/");
        await page.locator('[data-el="selecteur-carburant"] button', { hasText: "Gazole" }).click();
        await expect(page.locator('[data-el="liste-stations"]')).toHaveAttribute("data-carburant", "Gazole", { timeout: 20000 });
        await page.waitForTimeout(1500); // liste stabilisée (prix, moyennes) avant de retenir la première ligne
        const ligne = page.locator('[data-el="ligne-station"]').first();
        const id = await ligne.getAttribute("data-station");
        await ligne.focus();
        await page.keyboard.press("Enter");
        await expect(page.getByRole("dialog")).toBeVisible();
        expect(await page.evaluate(() => document.activeElement?.tagName)).toMatch(/^H\d$/);
        await page.getByRole("button", { name: "Fermer la fiche" }).click();
        await expect.poll(() => page.evaluate(() => document.activeElement?.getAttribute("data-station"))).toBe(id); // le focus est rendu à l'image suivante
      });
    });
  });

  test.describe("US-A11Y-003 — Touche Échap (jalon 3)", () => {
    test.describe("Happy Path", () => {
      test.use({ geolocation: BARCELONE });
      test("US-A11Y-003 — Échap ferme la fiche d'une station espagnole", async ({ page }) => {
        await page.goto("/");
        await expect(page.locator('[data-el="ligne-station"]').first()).toBeVisible({ timeout: 20000 });
        await page.locator('[data-el="ligne-station"]').first().focus();
        await page.keyboard.press("Enter");
        await expect(page.getByRole("dialog")).toBeVisible();
        await page.keyboard.press("Escape");
        await expect(page.getByRole("dialog")).toHaveCount(0);
      });
    });
    test.describe("Edge Case", () => {
      test("US-A11Y-003 — Échap replie un tronçon d'un trajet Europe et lui rend le focus", async ({ page }) => {
        await formulaire(page, ALBI_, BARCELONE_);
        await calculer(page);
        const t = page.locator("#troncon-4");
        await t.focus();
        await page.keyboard.press("Enter");
        await expect(t).toHaveAttribute("aria-expanded", "true");
        await page.keyboard.press("Escape");
        await expect(t).toHaveAttribute("aria-expanded", "false");
        await expect(t).toBeFocused();
      });
    });
    test.describe("Edge Case (S3)", () => {
      test("US-A11Y-003 — S3 : Échap ferme la liste de propositions de lieux (« Barce » propose Barcelone)", async ({ page }) => {
        await ouvrirTrajets(page);
        await saisirLieu(page, "depart", "Albi", "Albi");
        await champ(page, "arrivee").pressSequentially("Barce", { delay: 40 });
        await expect(propositions(page, "arrivee").first()).toBeVisible({ timeout: 20000 });
        await page.keyboard.press("Escape");
        await expect(propositions(page, "arrivee")).toHaveCount(0);
      });
    });
  });

  test.describe("US-A11Y-004 — Libellés lisibles (jalon 3)", () => {
    test.describe("Happy Path", () => {
      test.use({ geolocation: BARCELONE });
      test("US-A11Y-004 — pastilles et prix des stations espagnoles annoncés en euros", async ({ page }) => {
        await page.goto("/");
        await expect(page.locator('[data-el="pastille-station"]').first()).toBeVisible({ timeout: 20000 });
        const pastilles = await page.locator('[data-el="pastille-station"]').evaluateAll((els) => els.map((e) => e.getAttribute("aria-label") ?? ""));
        expect(pastilles.length).toBeGreaterThan(5);
        expect(pastilles.every((p) => /, \d,\d{3} euros le litre, (moins cher|plus cher)$/.test(p))).toBe(true);
        const prix = await page.locator('[data-el="ligne-station"] .totem').evaluateAll((els) => els.map((e) => e.getAttribute("aria-label") ?? ""));
        expect(prix.every((p) => /euros le litre/.test(p))).toBe(true);
      });
    });
    test.describe("Happy Path (S3, S4)", () => {
      test("US-A11Y-004 — S3 : chaque champ et bouton a un nom, l'inversion est nommée", async ({ page }) => {
        await ouvrirTrajets(page);
        const sansNom = await page.evaluate(() => [...document.querySelectorAll("[data-screen='S3'] button, [data-screen='S3'] select, [data-screen='S3'] input")].filter((e: any) => !(e.getAttribute("aria-label") || e.labels?.[0]?.textContent?.trim() || e.textContent?.trim())).length);
        expect(sansNom).toBe(0);
        await expect(page.locator('[data-el="inverser"]')).toHaveAttribute("aria-label", "Inverser les deux lieux");
      });
      test("US-A11Y-004 — S4 : tronçons « nom, km, litres », plaques de prix en euros, retour nommé (trajet Europe)", async ({ page }) => {
        await formulaire(page, ALBI_, BARCELONE_);
        await calculer(page);
        const troncons = await page.locator('[data-el="troncons"] button').evaluateAll((els) => els.map((e) => e.getAttribute("aria-label") ?? ""));
        expect(troncons.length).toBeGreaterThan(5);
        expect(troncons.every((l) => /, \d+,\d km, \d+,\d litres$/.test(l))).toBe(true);
        const plaques = await page.locator("[data-screen='S4'] .totem").evaluateAll((els) => els.map((e) => e.getAttribute("aria-label") ?? ""));
        expect(plaques.length).toBeGreaterThan(0);
        expect(plaques.every((l) => /euros/.test(l))).toBe(true);
        await expect(page.locator('[data-el="retour-trajets"]')).toHaveAttribute("aria-label", "Retour aux trajets");
      });
    });
    test.describe("Edge Case", () => {
      test("US-A11Y-004 — écran Moteurs : chaque contrôle a un nom, le bouton ⚙ est nommé", async ({ page }) => {
        await connecterAdmin(page);
        await expect(page.locator('[data-el="moteur"]')).toHaveCount(6, { timeout: 20000 });
        const sansNom = await page.evaluate(() => [...document.querySelectorAll("button, select, input")].filter((e: any) => !(e.getAttribute("aria-label") || e.labels?.[0]?.textContent?.trim() || e.textContent?.trim())).length);
        expect(sansNom).toBe(0);
        await expect(page.locator('[data-el="bouton-moteurs"]')).toHaveAttribute("aria-label", "Moteurs (administration)");
      });
    });
  });

  test.describe("US-PERF-001 — Ouverture rapide (jalon 3)", () => {
    test.describe("Happy Path", () => {
      test.use({ geolocation: BARCELONE });
      test("US-PERF-001 — 4G émulée à Barcelone : la liste des stations s'affiche en moins de 2,5 s", async ({ page, context }) => {
        const cdp = await context.newCDPSession(page);
        await cdp.send("Network.enable");
        await cdp.send("Network.emulateNetworkConditions", { offline: false, latency: 150, downloadThroughput: (1.6 * 1024 * 1024) / 8, uploadThroughput: (750 * 1024) / 8 });
        const t0 = Date.now();
        await page.goto(`${URL_APP}/`, { waitUntil: "commit" });
        await page.locator('[data-el="ligne-station"]').first().waitFor({ timeout: 30000 });
        expect(Date.now() - t0).toBeLessThan(2500);
      });
    });
    test.describe("Edge Case", () => {
      test("US-PERF-001 — l'écran Moteurs n'alourdit pas l'ouverture : le code de S5 n'est pas chargé pour un visiteur (aucune requête moteurs)", async ({ page }) => {
        const appels: string[] = [];
        page.on("request", (r) => { if (/functions\/v1\/moteurs|\/moteurs/.test(r.url()) && !r.url().endsWith("/moteurs")) appels.push(r.url()); });
        await page.goto("/");
        await expect(page.locator('[data-el="ligne-station"]').first()).toBeVisible({ timeout: 20000 });
        expect(appels).toEqual([]);
      });
    });
  });
});
