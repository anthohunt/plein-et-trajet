import { chromium } from "playwright";
import { OPTIONS_CONTEXTE, URL_APP, ouvrirTrajets, saisirLieu, champ, propositions } from "./m3-aides.mjs";
const nav = await chromium.launch();
const c = await nav.newContext({ ...OPTIONS_CONTEXTE });
const p = await c.newPage();
await ouvrirTrajets(p);
await saisirLieu(p, "depart", "Albi", "Albi");
await champ(p, "arrivee").click();
await champ(p, "arrivee").pressSequentially("Barce", { delay: 40 });
await propositions(p, "arrivee").filter({ hasText: "Barcelone" }).first().waitFor({ timeout: 20000 });
await p.screenshot({ path: process.env.OUT + "/dbg1.png" });
await propositions(p, "arrivee").filter({ hasText: "Barcelone" }).first().click();
await p.waitForTimeout(1500);
await p.screenshot({ path: process.env.OUT + "/dbg2.png" });
try { await p.locator("#voiture-marque").click({ timeout: 4000 }); console.log("clic ok"); } catch (e) { console.log(String(e.message).slice(0, 700)); }
console.log(await p.evaluate(() => { const r = document.getElementById("voiture-marque").getBoundingClientRect(); const e = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2); return e.outerHTML.slice(0, 200) + " | " + document.getElementById("voiture-marque").disabled; }));
await nav.close();
