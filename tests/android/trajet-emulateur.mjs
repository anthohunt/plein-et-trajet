// Jalon 6 — trajet réel dans l'appli Android, sur l'émulateur (GitHub Actions) : voiture EEA, Démarrer, GPS qui avance à
// ~90 km/h (adb emu geo fix), appli en arrière-plan et écran éteint, notification lue (vitesse, km, €), « Arrêter » de la
// notification → fin de trajet avec les km parcourus. La WebView de l'APK de débogage est pilotée par Playwright (CDP).
import { execSync } from "node:child_process";
import { writeFileSync } from "node:fs";
import { _android } from "@playwright/test";
import { voitureEea } from "../e2e/exploration/m5-aides.mjs";

const PKG = "cloud.ingevision.pleinettrajet";
const sh = (c) => execSync(c, { encoding: "utf8" }).trim();
const pause = (ms) => new Promise((r) => setTimeout(r, ms));
const verdicts = [];
const constat = (nom, ok, detail = "") => {
  verdicts.push(`${ok ? "OK " : "KO "} ${nom}${detail ? " — " + detail : ""}`);
  console.log(verdicts[verdicts.length - 1]);
};

// départ Albi, cap à l'ouest, 25 m par seconde (90 km/h)
let lat = 43.92833, lon = 2.145916;
const avancer = () => {
  lon -= 25 / (111320 * Math.cos((lat * Math.PI) / 180));
  sh(`adb emu geo fix ${lon.toFixed(6)} ${lat.toFixed(6)} 170`);
};
const rouler = async (s) => { for (let i = 0; i < s; i++) { avancer(); await pause(1000); } };

async function page() {
  const [appareil] = await _android.devices();
  const vue = await appareil.webView({ pkg: PKG }, { timeout: 60000 });
  return vue.page();
}

const voiture = await voitureEea("5RBU0C");
sh(`adb emu geo fix ${lon} ${lat} 170`);
sh(`adb shell monkey -p ${PKG} -c android.intent.category.LAUNCHER 1`);
let p = await page();
await p.waitForLoadState();
await p.evaluate((v) => localStorage.setItem("pt-voiture-v1", JSON.stringify(v)), voiture);
await p.reload();
await p.locator('[data-el="bouton-demarrer"]').waitFor({ timeout: 30000 });
sh("adb shell screencap -p /sdcard/1-accueil.png");
await p.locator('[data-el="bouton-demarrer"]').click();
await p.waitForURL(/\/en-route$/, { timeout: 20000 });
constat("Démarrer ouvre En route", true);
await rouler(40);
const km1 = Number((await p.locator('[data-el="direct-km"]').innerText()).replace(",", "."));
constat("km comptés appli devant", km1 > 0.5, `${km1} km après 40 s`);
sh("adb shell screencap -p /sdcard/2-en-route.png");

// arrière-plan + écran éteint
sh("adb shell input keyevent 3");
sh("adb shell input keyevent 26");
await rouler(60);
const notif = sh("adb shell dumpsys notification --noredact | grep -A40 'pkg=" + PKG + "' | grep -E 'android.title|android.text|actions' | head -6 || true");
writeFileSync("notification.txt", notif);
constat("notification avec km/h, km et €", /km\/h/.test(notif) && /km ·/.test(notif) && /€/.test(notif), notif.replace(/\s+/g, " ").slice(0, 200));
sh("adb shell input keyevent 26");
sh("adb shell input keyevent 82");
sh("adb shell cmd statusbar expand-notifications");
await pause(1500);
sh("adb shell screencap -p /sdcard/3-notification.png");
sh("adb shell cmd statusbar collapse");

// « Arrêter » de la notification : même intent que son bouton
sh(`adb shell am start -n ${PKG}/.MainActivity --es pt_action arreter`);
p = await page();
await p.waitForURL(/\/fin$/, { timeout: 20000 }).catch(() => undefined);
const url = p.url();
constat("Arrêter (notification) ouvre la fin de trajet", /\/fin$/.test(url), url);
await pause(2000);
sh("adb shell screencap -p /sdcard/4-fin.png");
const txt = await p.locator("body").innerText().catch(() => "");
const km = txt.match(/(\d+[,.]\d)\s*km/);
const kmFin = km ? Number(km[1].replace(",", ".")) : 0;
constat("km écran éteint gardés (≈ 2,5 km attendus)", kmFin > 1.8, `${kmFin} km`);
for (const f of ["1-accueil", "2-en-route", "3-notification", "4-fin"]) sh(`adb pull /sdcard/${f}.png ${f}.png`);
writeFileSync("verdicts.txt", verdicts.join("\n") + "\n");
process.exit(verdicts.some((v) => v.startsWith("KO")) ? 1 : 0);
