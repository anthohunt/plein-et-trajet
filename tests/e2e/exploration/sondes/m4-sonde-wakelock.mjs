// Sonde : le verrou d'écran (Screen Wake Lock API) dans Chromium piloté par Playwright : état de la permission, visibilité, résultat.
// Essais : sans rien ; Browser.grantPermissions(wakeLockScreen) ; Browser.setPermission({name:"screen-wake-lock"}, granted) ; après un clic (activation).
import { chromium } from "@playwright/test";
const url = process.argv[2] ?? "http://localhost:4173/trajets";
const b = await chromium.launch(process.env.CHROME ? { executablePath: process.env.CHROME, headless: !process.env.VISIBLE } : {});
for (const mode of ["rien", "grant", "setPermission", "setPermission+clic"]) {
  const ctx = await b.newContext({ permissions: ["geolocation"] });
  const page = await ctx.newPage();
  await page.goto(url);
  const cdp = await ctx.newCDPSession(page);
  const { targetInfo } = await cdp.send("Target.getTargetInfo");
  const browserContextId = targetInfo.browserContextId; // sans lui, la permission irait au contexte par défaut, pas à celui de la page
  if (mode === "grant") await cdp.send("Browser.grantPermissions", { permissions: ["wakeLockScreen"], origin: new URL(url).origin, browserContextId });
  if (mode.startsWith("setPermission")) await cdp.send("Browser.setPermission", { permission: { name: "screen-wake-lock" }, setting: "granted", origin: new URL(url).origin, browserContextId });
  if (mode.endsWith("clic")) await page.mouse.click(10, 10);
  const r = await page.evaluate(async () => {
    let etat = "?";
    try { etat = (await navigator.permissions.query({ name: "screen-wake-lock" })).state; } catch (e) { etat = "query: " + e.message; }
    try { const s = await navigator.wakeLock.request("screen"); return `permission=${etat} visibilité=${document.visibilityState} focus=${document.hasFocus()} → ACCORDÉ (released=${s.released})`; } catch (e) { return `permission=${etat} visibilité=${document.visibilityState} focus=${document.hasFocus()} → refusé ${e.name}`; }
  });
  console.log(mode.padEnd(20), r);
  await ctx.close();
}
await b.close();
