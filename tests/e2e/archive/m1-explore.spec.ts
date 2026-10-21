// Jalon 1 — « Les prix autour de moi » : spec unique consolidée.
// Joué contre l'appli déployée, base réelle (Supabase). Seuls E1 et E2 interceptent la réponse (// MOCKED) ;
// A11Y-004 ne fait que ralentir une vraie réponse. Aucune capture n'écrase tests/e2e/delivery/ (preuves auditées).
import { test, expect, type Page } from "@playwright/test";
import { ALBI, autour, centre, choisir, croissant, glisser, km, lignes, lireLignes, ouvrirPrix, pastilleDegagee, pastilles, rest } from "../exploration/m1-test-snippets/_aides";

test.describe("M1 — Les prix autour de moi", () => {
  test.describe("US-1.1 — Ouvrir les prix", () => {
    test.describe("Happy Path", () => {
      test("US-1.1 — l'onglet Prix affiche carte et liste autour de ma position", async ({ page }) => {
        await page.goto("/trajets");
        await expect(page.getByRole("tab", { name: "Trajets" })).toHaveAttribute("aria-selected", "true");
        await page.getByRole("tab", { name: "Prix" }).click();
        await expect(lignes(page).first()).toBeVisible();
        const n = await lignes(page).count();
        expect(n).toBeGreaterThan(3);
        await expect(pastilles(page)).toHaveCount(n);
        expect(km(await centre(page), { lat: ALBI.latitude, lon: ALBI.longitude })).toBeLessThan(0.5);
      });
    });
    test.describe("Edge Case", () => {
      test.describe("position refusée", () => {
        test.use({ permissions: [] });
        test("US-1.1 — centrée sur Albi par défaut avec un message", async ({ page }) => {
          await page.goto("/trajets");
          await page.getByRole("tab", { name: "Prix" }).click();
          await expect(page.locator('[data-el="message-localisation"]')).toContainText("Active la localisation · carte centrée sur Albi");
          await expect(lignes(page).first()).toBeVisible();
          expect(km(await centre(page), { lat: ALBI.latitude, lon: ALBI.longitude })).toBeLessThan(0.5);
        });
        test("US-1.1 — centrée sur la dernière ville saisie", async ({ page }) => {
          await page.goto("/trajets");
          await page.getByLabel("Départ").fill("Castres");
          await page.getByLabel("Arrivée").focus();
          await expect.poll(() => page.evaluate(() => localStorage.getItem("pt-derniere-ville"))).toContain("Castres");
          await page.reload();
          await page.getByRole("tab", { name: "Prix" }).click();
          await expect(page.locator('[data-el="message-localisation"]')).toContainText("carte centrée sur Castres");
          await expect(lignes(page).first()).toBeVisible();
          expect(km(await centre(page), { lat: 43.6094, lon: 2.2455 })).toBeLessThan(1);
        });
      });
    });
  });

  test.describe("US-1.2 — Choisir mon carburant", () => {
    test.describe("Happy Path", () => {
      test("US-1.2 — Gazole : chaque ligne et pastille au prix gazole de la base", async ({ page }) => {
        await ouvrirPrix(page);
        await expect(page.locator('[data-el="titre-liste"]')).toHaveText("Stations · SP95-E10");
        await choisir(page, "Gazole");
        await expect(page.locator('[data-el="liste-stations"]')).toHaveAttribute("data-carburant", "Gazole");
        const l = await lireLignes(page);
        const db: { station_id: string; prix: number }[] = await rest(`prix?select=station_id,prix&carburant=eq.Gazole&rupture=is.false&station_id=in.(${l.map((x) => x.id).join(",")})`);
        const ref = new Map(db.map((d) => [d.station_id, Number(d.prix)]));
        for (const x of l) expect(x.prix).toBeCloseTo(ref.get(x.id)!, 3);
        const pins = await page.locator('[data-el="pastille-station"]').evaluateAll((e) => e.map((b) => [(b as HTMLElement).dataset.station!, b.textContent!]));
        for (const [id, t] of pins) expect(Number(t.replace(",", "."))).toBeCloseTo(ref.get(id)!, 3);
      });
    });
    test.describe("Edge Case", () => {
      test("US-1.2 — une station qui ne vend pas le carburant choisi disparaît", async ({ page }) => {
        const ids = (await autour()).map((s) => s.id).join(",");
        const e10 = await rest(`prix?select=station_id&carburant=eq.SP95-E10&rupture=is.false&prix=not.is.null&station_id=in.(${ids})`);
        const e85 = new Set((await rest(`prix?select=station_id&carburant=eq.E85&station_id=in.(${ids})`)).map((x: any) => x.station_id));
        const cible = e10.map((x: any) => x.station_id).find((id: string) => !e85.has(id));
        await ouvrirPrix(page);
        await expect(page.locator(`[data-el="ligne-station"][data-station="${cible}"]`)).toHaveCount(1);
        await choisir(page, "E85");
        await expect(page.locator('[data-el="liste-stations"]')).toHaveAttribute("data-carburant", "E85");
        await expect(page.locator(`[data-el="ligne-station"][data-station="${cible}"]`)).toHaveCount(0);
        await expect(page.locator(`[data-el="pastille-station"][data-station="${cible}"]`)).toHaveCount(0);
      });
    });
  });

  test.describe("US-1.3 — Voir les stations sur la carte", () => {
    test.describe("Happy Path", () => {
      test("US-1.3 — chaque pastille est à la position réelle de sa station, avec son prix", async ({ page }) => {
        await ouvrirPrix(page);
        const st = Object.fromEntries((await autour()).map((s) => [s.id, s]));
        const e = await page.evaluate((stations: any) => [...document.querySelectorAll<HTMLElement>('[data-el="pastille-station"]')].map((b) => {
          const s = stations[b.dataset.station!], pt = (window as any).__carte.project([s.lon, s.lat]);
          const m = document.querySelector(".map .gl")!.getBoundingClientRect(), r = b.getBoundingClientRect();
          return { dx: Math.abs(r.left + r.width / 2 - (m.left + pt.x)), dy: Math.abs(b.parentElement!.getBoundingClientRect().bottom - (m.top + pt.y)), t: b.textContent };
        }), st);
        expect(e.length).toBeGreaterThan(3);
        for (const x of e) { expect(x.dx).toBeLessThan(3); expect(x.dy).toBeLessThan(4); expect(x.t).toMatch(/^\d,\d{3}$/); }
      });
    });
    test.describe("Edge Case", () => {
      test("US-1.3 — déplacer la carte charge les stations de la nouvelle zone", async ({ page }) => {
        const appels: any[] = [];
        page.on("request", (r) => r.url().includes("/rpc/stations_autour") && appels.push(JSON.parse(r.postData() || "{}")));
        await ouvrirPrix(page);
        const avant = new Set((await lireLignes(page)).map((x) => x.id));
        const ec = await page.evaluate(() => {
          const m = (window as any).__carte, a = m.project([2.158, 44.05]), c = m.project(m.getCenter()), r = m.getContainer().getBoundingClientRect();
          const dx = c.x - a.x, dy = c.y - a.y, k = Math.min(1, (r.width - 60) / Math.abs(dx || 1), (r.height - 70) / Math.abs(dy || 1));
          return { dx: dx * k, dy: dy * k };
        });
        await glisser(page, ec.dx, ec.dy); // un seul glisser continu
        await expect.poll(() => appels.length).toBeGreaterThanOrEqual(2);
        await expect.poll(async () => (await lireLignes(page)).filter((x) => !avant.has(x.id)).length).toBeGreaterThan(0);
      });
    });
  });

  test.describe("US-1.4 — Toucher une pastille", () => {
    test.describe("Happy Path", () => {
      test("US-1.4 — toucher une pastille ouvre la fiche de cette station", async ({ page }) => {
        await ouvrirPrix(page);
        const id = await pastilleDegagee(page);
        const pin = page.locator(`[data-el="pastille-station"][data-station="${id}"]`);
        const label = (await pin.getAttribute("aria-label"))!;
        await pin.click();
        await expect(page.locator('[data-el="fiche-station"]')).toHaveAttribute("data-station", id);
        expect(label.startsWith((await page.locator("#sh-name").textContent())!)).toBe(true);
      });

      test("US-1.4 — moitié la moins chère en vert, l'autre en orange", async ({ page }) => {
        await ouvrirPrix(page);
        await choisir(page, "Gazole");
        await expect(page.locator('[data-el="carte-stations"]')).toHaveAttribute("data-pastilles", /\d+/);
        const pa = await page.locator('[data-el="pastille-station"]').evaluateAll((e) => e.map((b) => ({ v: Number(b.textContent!.replace(",", ".")), m: (b as HTMLElement).dataset.moitie })));
        const lo = pa.filter((x) => x.m === "lo"), hi = pa.filter((x) => x.m === "hi");
        expect(new Set(pa.map((x) => x.v)).size).toBeGreaterThan(1);
        expect(lo.length).toBeGreaterThan(0);
        expect(hi.length).toBeGreaterThan(0);
        expect(Math.max(...lo.map((x) => x.v))).toBeLessThan(Math.min(...hi.map((x) => x.v)));
        await expect(page.locator(".pin.lo").first()).toHaveCSS("box-shadow", /31, 138, 76/);
        await expect(page.locator(".pin.hi").first()).toHaveCSS("box-shadow", /194, 73, 29/);
      });
    });
  });

  test.describe("US-1.5 — Trier la liste", () => {
    test.describe("Happy Path", () => {
      test("US-1.5 — Plus proche puis Moins cher", async ({ page }) => {
        await ouvrirPrix(page);
        expect(croissant((await lireLignes(page)).map((x) => x.prix))).toBe(true);
        await page.getByRole("button", { name: "Plus proche", exact: true }).click();
        await expect(page.locator('[data-el="liste-stations"]')).toHaveAttribute("data-tri", "distance");
        expect(croissant((await lireLignes(page)).map((x) => x.km))).toBe(true);
        await page.getByRole("button", { name: "Moins cher", exact: true }).click();
        await expect(page.locator('[data-el="liste-stations"]')).toHaveAttribute("data-tri", "prix");
        expect(croissant((await lireLignes(page)).map((x) => x.prix))).toBe(true);
      });
    });
  });

  test.describe("US-1.6 — Lire une station dans la liste", () => {
    test.describe("Happy Path", () => {
      test("US-1.6 — une ligne montre enseigne, distance, ancienneté, écart et prix à 3 décimales ; la toucher ouvre la fiche", async ({ page }) => {
        await ouvrirPrix(page);
        const [l] = await lireLignes(page);
        const st = (await rest(`stations?select=enseigne,nom&id=eq.${l.id}`))[0];
        expect(l.nom).toContain(st.enseigne ?? st.nom);
        expect(l.meta).toMatch(/^[\d,]+ (km|m) · /);
        expect(l.meta).toMatch(/(il y a \d+ (min|h)|hier|à l'instant|prix du \d\d\/\d\d)/);
        expect(l.meta).toMatch(/[−+][\d,]+ c vs France|= France/);
        await expect(lignes(page).first().locator(".totem")).toHaveAttribute("aria-label", /^\d,\d{3} euros le litre$/);
        await lignes(page).first().click();
        await expect(page.locator("#sh-name")).toHaveText(l.nom);
      });
    });
  });

  test.describe("US-2.1 — Fermer la fiche", () => {
    test.describe("Happy Path", () => {
      for (const mode of ["bouton", "Échap"]) {
        test(`US-2.1 — fermer la fiche (${mode}) garde le carburant choisi`, async ({ page }) => {
          await ouvrirPrix(page);
          await choisir(page, "Gazole");
          await lignes(page).first().click();
          await expect(page.getByRole("dialog")).toBeVisible();
          if (mode === "bouton") await page.getByRole("button", { name: "Fermer la fiche" }).click();
          else await page.keyboard.press("Escape");
          await expect(page.getByRole("dialog")).toHaveCount(0);
          await expect(page.getByRole("button", { name: "Gazole", exact: true })).toHaveAttribute("aria-pressed", "true");
        });
      }
    });
  });

  test.describe("US-2.2 — Calculer un trajet vers la station", () => {
    test.describe("Happy Path", () => {
      test("US-2.2 — Coût d'un trajet jusqu'ici ouvre Trajets avec l'arrivée pré-remplie", async ({ page }) => {
        await ouvrirPrix(page);
        const [l] = await lireLignes(page);
        const s = (await rest(`stations?select=adresse,cp,ville&id=eq.${l.id}`))[0];
        await lignes(page).first().click();
        await page.getByRole("button", { name: "Coût d'un trajet jusqu'ici" }).click();
        await expect(page).toHaveURL(/\/trajets$/);
        await expect(page.getByRole("tab", { name: "Trajets" })).toHaveAttribute("aria-selected", "true");
        await expect(page.getByLabel("Arrivée")).toHaveValue(`${s.adresse}, ${s.cp} ${s.ville}`);
      });
    });
  });

  test.describe("US-1.E1 — Source des prix injoignable", () => {
    test.describe("Edge Case", () => {
      // MOCKED: page.route — coupure réseau de la lecture des prix (impossible à provoquer sur la vraie base)
      test("US-1.E1 — prix injoignables : message + Réessayer, puis retour normal", async ({ page }) => {
        test.setTimeout(60000);
        await page.route("**/rest/v1/prix*", (r) => r.abort());
        await page.goto("/");
        await expect(page.locator('[data-el="etat-erreur"]')).toContainText("Prix indisponibles pour l'instant");
        await expect(page.getByRole("button", { name: "Réessayer" })).toBeVisible();
        await expect(lignes(page)).toHaveCount(0);
        await expect(pastilles(page)).toHaveCount(0);
        await page.unroute("**/rest/v1/prix*");
        await page.getByRole("button", { name: "Réessayer" }).click();
        await expect(lignes(page).first()).toBeVisible();
      });
    });
  });

  test.describe("US-1.E2 — Aucune station pour ce carburant", () => {
    test.describe("Edge Case", () => {
      // MOCKED: page.route — réponse vide pour E85 (il existe de vraies stations E85 autour d'Albi)
      test("US-1.E2 — aucune station E85 : message et carte vide", async ({ page }) => {
        test.setTimeout(60000);
        await ouvrirPrix(page);
        await page.route("**/rest/v1/prix*carburant=eq.E85*", (r) => r.fulfill({ status: 200, contentType: "application/json", body: "[]" }));
        await choisir(page, "E85");
        await expect(page.locator('[data-el="etat-vide"]')).toHaveText("Aucune station ne vend ce carburant autour de vous.");
        await expect(pastilles(page)).toHaveCount(0);
        await page.unroute("**/rest/v1/prix*carburant=eq.E85*");
        await choisir(page, "SP95-E10");
        await choisir(page, "E85");
        await expect(lignes(page).first()).toBeVisible();
      });
    });
  });

  test.describe("US-1.E3 — Prix ancien signalé", () => {
    test.describe("Edge Case", () => {
      // Données réelles : une station du rayon dont le prix déclaré a plus de 48 h (choisie en base au moment du test)
      test("US-1.E3 — prix de plus de 48 h : « prix du JJ/MM » atténué", async ({ page }) => {
        const ids = (await autour()).map((s) => s.id).join(",");
        const limite = new Date(Date.now() - 48 * 3600e3).toISOString();
        let carb = "", vieux: any = null;
        for (const c of ["SP95-E10", "Gazole", "SP98", "E85", "GPLc", "SP95"]) {
          const r = await rest(`prix?select=station_id,maj&carburant=eq.${c}&rupture=is.false&prix=not.is.null&maj=lt.${limite}&station_id=in.(${ids})`);
          if (r.length) { carb = c; vieux = r[0]; break; }
        }
        // pas de skip silencieux : sans donnée réelle dans cet état, le test échoue et le dit
        expect(vieux, "aucune station réelle > 48 h dans le rayon aujourd'hui : fixture nécessaire").toBeTruthy();
        const jjmm = new Date(vieux.maj).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", timeZone: "Europe/Paris" });
        await ouvrirPrix(page);
        await choisir(page, carb);
        const a = page.locator(`[data-el="ligne-station"][data-station="${vieux.station_id}"] [data-el="anciennete"]`);
        await expect(a).toHaveText(`prix du ${jjmm}`);
        await expect(a).toHaveCSS("opacity", "0.8");
        await expect(a).toHaveCSS("color", "rgb(93, 99, 95)");
      });
    });
  });

  test.describe("US-1.E4 — Station en rupture", () => {
    test.describe("Edge Case", () => {
      // Données réelles : rupture temporaire de gazole déclarée dans le flux officiel
      test("US-1.E4 — une station en rupture de gazole n'apparaît pas en Gazole", async ({ page }) => {
        const ids = (await autour()).map((s) => s.id).join(",");
        const rup = await rest(`prix?select=station_id&carburant=eq.Gazole&rupture=is.true&station_id=in.(${ids})`);
        expect(rup.length, "aucune rupture gazole réelle dans le rayon aujourd'hui : fixture nécessaire").toBeGreaterThan(0);
        const id = rup[0].station_id;
        await ouvrirPrix(page);
        await choisir(page, "Gazole");
        await expect(page.locator('[data-el="liste-stations"]')).toHaveAttribute("data-carburant", "Gazole");
        const l = await lireLignes(page);
        expect(l.map((x) => x.id)).not.toContain(id);
        // libellé départagé sur toute la zone : aucune autre station de la liste ne porte le libellé de la station en rupture
        const autres = await rest(`prix?select=carburant&station_id=eq.${id}&rupture=is.false&prix=not.is.null`);
        await choisir(page, autres[0].carburant);
        const nom = await page.locator(`[data-el="ligne-station"][data-station="${id}"] .n`).textContent();
        await choisir(page, "Gazole");
        expect((await lireLignes(page)).map((x) => x.nom)).not.toContain(nom);
        expect(croissant(l.map((x) => x.prix))).toBe(true);
        await expect(page.locator(`[data-el="pastille-station"][data-station="${id}"]`)).toHaveCount(0);
      });
    });
  });

  test.describe("US-1.P1 — Recentrer sur ma position", () => {
    test.describe("Happy Path", () => {
      test("US-1.P1 — recentrer ramène la carte sur ma position et recharge la liste", async ({ page }) => {
        const appels: any[] = [];
        page.on("request", (r) => r.url().includes("/rpc/stations_autour") && appels.push(JSON.parse(r.postData() || "{}")));
        await ouvrirPrix(page);
        await glisser(page, -280, 0); // un glisser vers l'est
        await expect.poll(async () => km(await centre(page), { lat: ALBI.latitude, lon: ALBI.longitude })).toBeGreaterThan(4);
        await expect.poll(() => appels.length).toBeGreaterThanOrEqual(2);
        const n = appels.length;
        await page.getByRole("button", { name: "Recentrer sur ma position" }).click();
        await expect.poll(async () => km(await centre(page), { lat: ALBI.latitude, lon: ALBI.longitude })).toBeLessThan(0.1);
        await expect.poll(() => appels.length).toBeGreaterThan(n);
        expect(appels.at(-1).lat).toBeCloseTo(ALBI.latitude, 4);
        expect(appels.at(-1).rayon_m).toBe(10000);
      });
    });
  });

  test.describe("US-2.E1 — Carburant non vendu dans la fiche", () => {
    test.describe("Edge Case", () => {
      // Données réelles : station du rayon sans ligne GPLc en base
      test("US-2.E1 — la fiche affiche « non vendu » pour le GPLc", async ({ page }) => {
        const st = await autour();
        const gpl = new Set((await rest(`prix?select=station_id&carburant=eq.GPLc&station_id=in.(${st.map((s) => s.id).join(",")})`)).map((x: any) => x.station_id));
        await ouvrirPrix(page);
        const l = (await lireLignes(page)).find((x) => !gpl.has(x.id))!;
        await page.locator(`[data-el="ligne-station"][data-station="${l.id}"]`).click();
        await expect(page.locator('[data-el="tableau-prix"]')).toHaveAttribute("aria-busy", "false");
        await expect(page.locator('[data-carburant="GPLc"] [data-el="non-vendu"]')).toHaveText("non vendu");
      });
    });
  });

  test.describe("US-A11Y-001 — Navigation au clavier", () => {
    test.describe("Happy Path", () => {
      const focus = (p: Page) => p.evaluate(() => {
        const e = document.activeElement as HTMLElement, r = e.getBoundingClientRect(), s = getComputedStyle(e);
        const cadre = (e.closest(".map") ?? document.documentElement).getBoundingClientRect();
        const dans = r.width > 0 && r.left >= cadre.left - 1 && r.right <= cadre.right + 1 && r.top >= cadre.top - 1 && r.bottom <= cadre.bottom + 1 && r.top >= 0 && r.bottom <= innerHeight;
        const d = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
        return { i: [...document.querySelectorAll("*")].indexOf(e), txt: e.getAttribute("aria-label") || e.textContent || "",
          contour: s.outlineStyle !== "none" && parseFloat(s.outlineWidth) >= 2,
          visible: e.tagName === "CANVAS" ? dans : dans && !!d && (d === e || e.contains(d)) };
      });

      test("US-A11Y-001 — Tab / Maj+Tab : ordre de lecture, élément focalisé visible dans son cadre, contour visible", async ({ page }) => {
        await ouvrirPrix(page);
        await page.locator("body").click({ position: { x: 5, y: 5 } });
        const vus = [];
        for (let i = 0; i < 60; i++) {
          await page.keyboard.press("Tab");
          const o = await focus(page);
          expect(o.contour, `contour : ${o.txt}`).toBe(true);
          expect(o.visible, `visible dans son cadre : ${o.txt}`).toBe(true);
          vus.push(o);
          if (o.txt === "Prix") break;
        }
        expect(vus[0].txt).toBe("Gazole");
        expect(vus.map((v) => v.i)).toEqual([...vus.map((v) => v.i)].sort((a, b) => a - b));
        await page.keyboard.press("Shift+Tab");
        const back = await focus(page);
        expect(back.i).toBe(vus.at(-2)!.i);
        expect(back.visible && back.contour).toBe(true);
        await lignes(page).first().focus();
        await page.keyboard.press("Enter");
        await expect(page.locator("#sh-name")).toBeFocused();
        await page.keyboard.press("Tab");
        await expect(page.getByRole("button", { name: "Fermer la fiche" })).toBeFocused();
        await page.keyboard.press("Tab");
        await expect(page.getByRole("button", { name: "Coût d'un trajet jusqu'ici" })).toBeFocused();
      });
    });
  });

  test.describe("US-A11Y-002 — Focus de la fiche", () => {
    test.describe("Happy Path", () => {
      test("US-A11Y-002 — focus sur le titre à l'ouverture, retour sur l'élément ouvreur", async ({ page }) => {
        await ouvrirPrix(page);
        const ligne = lignes(page).nth(1);
        await ligne.focus();
        await page.keyboard.press("Enter");
        await expect(page.locator("#sh-name")).toBeFocused();
        await page.keyboard.press("Escape");
        await expect(ligne).toBeFocused();
      });
    });
  });

  test.describe("US-A11Y-003 — Échap ferme la fiche", () => {
    test.describe("Happy Path", () => {
      test("US-A11Y-003 — Échap ferme la fiche", async ({ page }) => {
        await ouvrirPrix(page);
        await lignes(page).first().click();
        await expect(page.getByRole("dialog")).toBeVisible();
        await page.keyboard.press("Escape");
        await expect(page.getByRole("dialog")).toHaveCount(0);
      });
    });
  });

  test.describe("US-A11Y-004 — Annonces lecteur d'écran", () => {
    test.describe("Happy Path", () => {
      test("US-A11Y-004 — pastilles et prix annoncés, boutons icônes libellés", async ({ page }) => {
        test.setTimeout(60000);
        await ouvrirPrix(page);
        const labels = await page.locator('[data-el="pastille-station"]').evaluateAll((e) => e.map((b) => b.getAttribute("aria-label")));
        expect(labels.length).toBeGreaterThan(3);
        for (const l of labels) expect(l).toMatch(/^.+, \d,\d{3} euros le litre, (moins|plus) cher$/);
        for (const t of await lignes(page).locator(".totem").evaluateAll((e) => e.map((x) => x.getAttribute("aria-label"))))
          expect(t).toMatch(/^\d,\d{3} euros le litre$/);
        // chargement de la fiche annoncé (réseau ralenti, vraie réponse)
        await page.route("**/rest/v1/prix?*station_id=eq.*", async (r) => { await new Promise((x) => setTimeout(x, 1200)); await r.continue(); });
        await lignes(page).first().click();
        await expect(page.locator('[data-el="tableau-prix"] [role="status"]')).toHaveText("Chargement des prix de la station…");
        await expect(page.locator('[data-el="tableau-prix"]')).toHaveAttribute("aria-busy", "false");
        const icones = await page.evaluate(() => [...document.querySelectorAll("button")].filter((b) => !b.textContent!.replace(/[✕\s]/g, "").length).map((b) => b.getAttribute("aria-label")));
        for (const l of icones) expect(l).toBeTruthy();
        expect(icones).toEqual(expect.arrayContaining(["Recentrer sur ma position", "Fermer la fiche"]));
      });
    });
  });

  test.describe("US-PERF-001 — Liste en 4G", () => {
    test.describe("Happy Path", () => {
      test("US-PERF-001 — liste affichée en moins de 2,5 s en 4G", async ({ page, context }) => {
        const cdp = await context.newCDPSession(page);
        await cdp.send("Network.enable");
        await cdp.send("Network.setCacheDisabled", { cacheDisabled: true });
        await cdp.send("Network.emulateNetworkConditions", { offline: false, latency: 85, downloadThroughput: (9 * 1024 * 1024) / 8, uploadThroughput: (1.5 * 1024 * 1024) / 8 });
        const t0 = Date.now();
        await page.goto("/", { waitUntil: "commit" });
        await lignes(page).first().waitFor();
        expect(Date.now() - t0).toBeLessThan(2500);
      });
    });
  });


  // ---- Streamline R2 : défauts relevés par le vérificateur indépendant (pt-streamline-verif) ----
  test.describe("Streamline R2 — écran Prix", () => {
    test("P3 / US-1.4 — prix à égalité : une coupure aussi proche de la moitié qui s'accorde avec l'écart « vs France » est retenue", async ({ page }) => {
      await ouvrirPrix(page);
      for (const c of ["E85", "Gazole", "GPLc"]) {
        await choisir(page, c);
        await expect(page.locator('[data-el="carte-stations"]')).toHaveAttribute("data-pastilles", /\d+/);
        await expect(page.locator('[data-el="ecart"]').first()).toBeVisible();
        // l'écart de chaque ligne (vert = sous la moyenne du pays) sert d'oracle
        const l = await lignes(page).evaluateAll((els) => els.map((e) => ({ id: (e as HTMLElement).dataset.station!, p: Number(e.querySelector(".totem")!.getAttribute("aria-label")!.match(/\d,\d{3}/)![0].replace(",", ".")), s: e.querySelector('[data-el="ecart"]')?.className.split(" ")[1] ?? "egal" })));
        const m = new Map(await page.locator('[data-el="pastille-station"]').evaluateAll((els) => els.map((b) => [(b as HTMLElement).dataset.station!, (b as HTMLElement).dataset.moitie!] as [string, string])));
        const t = l.slice().sort((a, b) => a.p - b.p);
        const n = t.length;
        if (new Set(t.map((x) => x.p)).size < 2) continue;
        const coupures = [];
        for (let k = 1; k < n; k++) if (t[k].p !== t[k - 1].p) coupures.push({ k, e: Math.abs(k - n / 2), d: t.reduce((s, x, i) => s + ((i < k && x.s === "hi") || (i >= k && x.s === "lo") ? 1 : 0), 0) });
        const eMin = Math.min(...coupures.map((x) => x.e));
        const dMin = Math.min(...coupures.filter((x) => x.e === eMin).map((x) => x.d));
        const k = coupures.find((x) => x.e === eMin && x.d === dMin)!.k;
        for (let i = 0; i < n; i++) expect(m.get(t[i].id), `${c} ${t[i].p}`).toBe(i < k ? "lo" : "hi");
      }
    });

    test.describe("P4 — position refusée", () => {
      test.use({ permissions: [] });
      test("P4 — position refusée : pas de point bleu « vous êtes ici » au centre de repli", async ({ page }) => {
        await page.goto("/");
        await expect(page.locator('[data-el="message-localisation"]')).toBeVisible();
        await expect(lignes(page).first()).toBeVisible();
        await expect(page.locator(".maplibregl-marker.me, .me")).toHaveCount(0);
      });
    });
    test("P4 — position GPS : le point bleu est là", async ({ page }) => {
      await ouvrirPrix(page);
      await expect(page.locator(".me")).toHaveCount(1);
    });

    test("P5 — fiche modale : aria-modal, Tab et Maj+Tab restent dans la fiche", async ({ page }) => {
      await ouvrirPrix(page);
      await lignes(page).first().click();
      const fiche = page.locator('[data-el="fiche-station"]');
      await expect(fiche).toHaveAttribute("aria-modal", "true");
      await expect(page.locator("#sh-name")).toBeFocused();
      for (const touche of ["Tab", "Tab", "Tab", "Tab", "Tab", "Shift+Tab", "Shift+Tab", "Shift+Tab", "Shift+Tab", "Shift+Tab"]) {
        await page.keyboard.press(touche);
        expect(await page.evaluate(() => !!document.activeElement?.closest('[data-el="fiche-station"]')), touche).toBe(true);
      }
    });

    test("P6 / US-1.E3 — plaque d'un prix ancien : contraste ≥ 4,5:1 sur la plaque", async ({ page }) => {
      await ouvrirPrix(page);
      const r = await page.evaluate(() => {
        document.body.insertAdjacentHTML("beforeend", '<span class="totem ancien" id="essai-ancien">1,234</span>');
        const e = document.getElementById("essai-ancien")!;
        // « rgb(r, g, b) » ou, pour un color-mix, « color(srgb r g b) » en 0..1
        const rgb = (s: string) => { const v = s.match(/[\d.]+/g)!.slice(0, 3).map(Number); return s.startsWith("color(") ? v.map((x) => x * 255) : v; };
        const lum = (c: number[]) => { const v = c.map((x) => { x /= 255; return x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4; }); return 0.2126 * v[0] + 0.7152 * v[1] + 0.0722 * v[2]; };
        const a = lum(rgb(getComputedStyle(e).color)), b = lum(rgb(getComputedStyle(e).backgroundColor));
        return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
      });
      expect(r).toBeGreaterThanOrEqual(4.5);
    });

    test("P7 — carte déplacée : l'en-tête nomme la zone ; recentrée : « Autour de moi »", async ({ page }) => {
      await ouvrirPrix(page);
      await expect(page.locator('[data-el="lieu"]')).toHaveText("Autour de moi");
      const ec = await page.evaluate(() => {
        const m = (window as any).__carte, a = m.project([1.897, 43.905]), c = m.project(m.getCenter()), r = m.getContainer().getBoundingClientRect();
        const dx = c.x - a.x, dy = c.y - a.y, k = Math.min(1, (r.width - 60) / Math.abs(dx || 1), (r.height - 70) / Math.abs(dy || 1));
        return { dx: dx * k, dy: dy * k };
      });
      await glisser(page, ec.dx, ec.dy);
      await expect(page.locator('[data-el="lieu"]')).toHaveText(/^Autour d(e |')(?!moi)/, { timeout: 15000 });
      await page.locator('[data-el="recentrer"]').click();
      await expect(page.locator('[data-el="lieu"]')).toHaveText("Autour de moi");
    });

    // MOCKED: page.route — coupure réseau de la lecture des prix (comme US-1.E1)
    test("P7 — prix en erreur : la légende « moins cher / plus cher » n'est pas affichée", async ({ page }) => {
      await page.route("**/rest/v1/prix*", (r) => r.abort());
      await page.goto("/");
      await expect(page.locator('[data-el="etat-erreur"]')).toBeVisible();
      await expect(page.locator('[data-el="legende"]')).toHaveCount(0);
      await page.unroute("**/rest/v1/prix*");
      await page.getByRole("button", { name: "Réessayer" }).click();
      await expect(lignes(page).first()).toBeVisible();
      await expect(page.locator('[data-el="legende"]')).toBeVisible();
    });
  });
});
