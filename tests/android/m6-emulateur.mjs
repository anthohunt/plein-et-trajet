// Jalon 6 — instrumentation de l'appli Android sur l'émulateur (GitHub Actions, API 34 google_apis x86_64).
// Deux scénarios, un par job : « principal » (dialogue d'autorisation natif, écran éteint avec Maps devant pendant 5 min,
// notification lue et pilotée, Pause / Reprendre / Arrêter, historique, processus tué puis rouvert) et « immobile » (trou de
// 90 s, immobile 10 min écran éteint).
// Pilotage : la position est rejouée par le fournisseur de test « gps » (`cmd location providers`, 1 point par seconde) — la
// classe Lecteur sait aussi alimenter la puce GPS simulée (console de l'émulateur), écartée pour les raisons notées plus bas ; l'interface
// native (dialogues, volet des notifications) par `uiautomator dump` + `input tap` ; la WebView de l'APK de débogage par
// Playwright (_android, CDP), qui lit aussi les points là où l'appli les écrit (IndexedDB « plein-et-trajet », magasin en_cours).
// Usage : node tests/android/m6-emulateur.mjs principal|immobile [dossier-sortie]
import { execFile, execFileSync, spawn } from "node:child_process";
import { appendFileSync, existsSync, mkdirSync, openSync, readFileSync, writeFileSync } from "node:fs";
import net from "node:net";
import os from "node:os";
import { promisify } from "node:util";
import { _android } from "@playwright/test";
import { lireGpx, voitureEea } from "../e2e/exploration/m5-aides.mjs";

const SCENARIO = process.argv[2] ?? "principal";
const OUT = process.argv[3] ?? "sortie-m6";
const PKG = "cloud.ingevision.pleinettrajet";
const MAPS = "com.google.android.apps.maps";
mkdirSync(OUT, { recursive: true });

const adb = (...a) => execFileSync("adb", a, { encoding: "utf8", maxBuffer: 256 << 20 }).trim();
const sh = (c) => adb("shell", c);
const shOk = (c) => {
  try {
    return sh(c);
  } catch (e) {
    return `ERREUR ${String(e.message).split("\n")[0]}`;
  }
};
const adbAsync = promisify(execFile);
const pause = (ms) => new Promise((r) => setTimeout(r, ms));
const T0 = Date.now();
const journal = (l) => {
  const s = `${String(Math.round((Date.now() - T0) / 1000)).padStart(5)}s ${l}`;
  console.log(s);
  appendFileSync(`${OUT}/journal-${SCENARIO}.txt`, s + "\n");
};
const verdicts = [];
const mesures = {};
const constat = (nom, ok, detail = "") => {
  verdicts.push(`${ok ? "OK " : "KO "} ${nom}${detail ? " — " + detail : ""}`);
  journal(verdicts.at(-1));
  return ok;
};
function finir(code) {
  writeFileSync(`${OUT}/verdicts-${SCENARIO}.txt`, verdicts.join("\n") + "\n");
  writeFileSync(`${OUT}/mesures-${SCENARIO}.json`, JSON.stringify(mesures, null, 1));
  try {
    if (shellTest) {
      shellTest.kill();
      journal(`remove-test-provider gps → ${shOk("cmd location providers remove-test-provider gps 2>&1") || "ok"}`);
    }
    logcat.kill();
  } catch {}
  process.exit(code ?? (verdicts.some((v) => v.startsWith("KO")) ? 1 : 0));
}
// garde-fou : aucun scénario ne doit dépasser 45 min
setTimeout(() => {
  constat("scénario terminé dans le temps imparti", false, "45 min dépassées");
  finir(2);
}, 45 * 60000).unref();

// journal complet du téléphone, du début à la fin (le tampon par défaut tourne en 20 min)
shOk("logcat -G 16M");
shOk("logcat -c");
const logcat = spawn("adb", ["logcat", "-v", "threadtime"], { stdio: ["ignore", openSync(`${OUT}/logcat-${SCENARIO}.txt`, "w"), "ignore"] });

function capture(nom) {
  const png = execFileSync("adb", ["exec-out", "screencap", "-p"], { maxBuffer: 64 << 20 });
  writeFileSync(`${OUT}/${nom}.png`, png);
  journal(`capture ${nom}.png (${png.length} o)`);
}

// ---------- GPS : rejeu d'un GPX dans la puce simulée, 1 point par seconde ----------
const KNOTS = 1.943844;
function distM(a, b) {
  const r = Math.PI / 180;
  const x = Math.sin(((b.lat - a.lat) * r) / 2) ** 2 + Math.cos(a.lat * r) * Math.cos(b.lat * r) * Math.sin(((b.lon - a.lon) * r) / 2) ** 2;
  return 2 * 6371000 * Math.asin(Math.sqrt(x));
}
// console de l'émulateur gardée ouverte : une position part en quelques ms, à cadence fixe. Avec `adb emu geo fix` (un processus
// par position, 0,5 à 2 s de latence variable — run 39664532821 : écarts de réception 0,47 à 2,07 s pour 1 s de tracé), les
// vitesses déduites (distance ÷ temps) oscillaient et gonflaient la consommation (20,8 L/100 au lieu de 6,1 avec la vitesse Doppler).
class Console {
  constructor(port = 5554) {
    this.port = port;
    this.pret = this.ouvrir();
  }
  ouvrir() {
    return new Promise((ok, ko) => {
      const jeton = `${os.homedir()}/.emulator_console_auth_token`;
      const s = net.connect(this.port, "127.0.0.1");
      s.setNoDelay(true);
      s.on("error", ko);
      s.once("connect", () => {
        if (existsSync(jeton)) s.write(`auth ${readFileSync(jeton, "utf8").trim()}\r\n`);
        s.on("data", () => undefined); // réponses « OK » ignorées
        this.s = s;
        ok(true);
      });
    });
  }
  async fix(lon, lat, kn) {
    await this.pret;
    this.s.write(`geo fix ${lon} ${lat} 170 8 ${kn}\r\n`);
  }
}
// fournisseur de test « gps » (cmd location providers) par un `adb shell` gardé ouvert : sert au scénario immobile, car la puce
// simulée RÉPÈTE la dernière position chaque seconde (run 39667270054 : pendant les 90 s du tunnel, l'appli recevait toujours la
// position d'entrée, « GPS perdu » n'apparaissait jamais) ; un fournisseur de test, lui, se tait quand on ne lui envoie rien.
let shellTest = null;
function fournisseurTest() {
  if (shellTest) return;
  for (const c of ["appops set com.android.shell android:mock_location allow", "appops set 2000 android:mock_location allow"]) journal(`${c} → ${shOk(c) || "ok"}`);
  journal(`aide : ${shOk("cmd location help 2>&1 | grep -iE 'test-provider' | head -8").replace(/\s+/g, " ")}`);
  journal(`add-test-provider gps → ${shOk("cmd location providers add-test-provider gps 2>&1") || "ok"}`);
  journal(`set-test-provider-enabled gps → ${shOk("cmd location providers set-test-provider-enabled gps true 2>&1") || "ok"}`);
  shellTest = spawn("adb", ["shell"], { stdio: ["pipe", "ignore", "ignore"] });
}
function fixTest(lon, lat) {
  shellTest.stdin.write(`cmd location providers set-test-provider-location gps --location ${lat},${lon} --accuracy 5\n`);
}
let consoleEmu = null;
async function envoyerFix(lon, lat, kn) {
  if (consoleEmu === null) {
    consoleEmu = new Console();
    await consoleEmu.pret.then(
      () => journal("console de l'émulateur ouverte (positions à cadence fixe)"),
      (e) => {
        journal(`console de l'émulateur indisponible (${e.message}) : repli sur adb emu`);
        consoleEmu = false;
      },
    );
  }
  if (consoleEmu) return consoleEmu.fix(lon, lat, kn);
  return adbAsync("adb", ["emu", "geo", "fix", lon, lat, "170", "8", kn]);
}

class Lecteur {
  constructor(pts, depuis = 0, source = "puce") {
    this.source = source; // « puce » : puce GPS simulée (console) ; « test » : fournisseur de test gps
    if (source === "test") fournisseurTest();
    this.pts = pts.slice(depuis);
    this.parS = new Map(this.pts.map((p, i) => [Math.round((p.t - this.pts[0].t) / 1000), i]));
    this.sMax = Math.round((this.pts.at(-1).t - this.pts[0].t) / 1000);
    this.s = 0; // seconde du tracé
    this.i = 0; // dernier point envoyé
    this.roule = false; // false : position tenue (vitesse 0), le temps du tracé n'avance pas
    this.gele = false; // true : rien n'est envoyé et le tracé n'avance pas (lecture d'un instant figé)
    this.actif = true;
    this.envois = 0;
    this.erreurs = 0;
    this.boucle = this.tourner();
  }
  kmJusqua(i) {
    let m = 0;
    for (let k = 1; k <= i; k++) m += distM(this.pts[k - 1], this.pts[k]);
    return m / 1000;
  }
  async tourner() {
    const t0 = Date.now();
    let tic = 0;
    while (this.actif) {
      tic++;
      let p = null;
      let v = 0;
      if (!this.gele) {
        if (this.roule && this.s < this.sMax) {
          this.s++;
          const i = this.parS.get(this.s);
          if (i != null) {
            p = this.pts[i];
            v = i > 0 ? distM(this.pts[i - 1], p) / Math.max(1, (p.t - this.pts[i - 1].t) / 1000) : 0;
            // garé : le tracé tremble de ±2 m sur place, une vraie puce (Doppler) dit 0 km/h
            if (i >= 5 && distM(this.pts[i - 5], p) < 10) v = 0;
            this.i = i;
          } // pas de point à cette seconde : trou du tracé (tunnel), la puce se tait
        } else p = this.pts[this.i];
      }
      if (p) {
        try {
          if (this.source === "test") fixTest(p.lon.toFixed(6), p.lat.toFixed(6));
          else await envoyerFix(p.lon.toFixed(6), p.lat.toFixed(6), (v * KNOTS).toFixed(2));
          this.envois++;
        } catch {
          this.erreurs++;
        }
      }
      await pause(Math.max(0, t0 + tic * 1000 - Date.now())); // cadence calée sur l'horloge, sans dérive
    }
  }
  async arreter() {
    this.actif = false;
    await this.boucle;
  }
}

// ---------- interface native : uiautomator ----------
const dexml = (s) => s.replace(/&#(\d+);/g, (_, n) => String.fromCharCode(+n)).replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&");
function noeuds() {
  let xml = "";
  for (let k = 0; k < 4 && !xml.includes("<node"); k++) {
    shOk("rm -f /sdcard/ui.xml");
    shOk("uiautomator dump /sdcard/ui.xml");
    xml = shOk("cat /sdcard/ui.xml");
  }
  return [...xml.matchAll(/<node [^>]*>/g)].map((m) => {
    const a = m[0];
    const g = (k) => dexml(a.match(new RegExp(` ${k}="([^"]*)"`))?.[1] ?? "");
    const b = g("bounds").match(/\[(\d+),(\d+)\]\[(\d+),(\d+)\]/);
    return { text: g("text"), desc: g("content-desc"), id: g("resource-id"), pkg: g("package"), x: b ? Math.round((+b[1] + +b[3]) / 2) : 0, y: b ? Math.round((+b[2] + +b[4]) / 2) : 0 };
  });
}
/** Ferme un éventuel « … isn't responding » de l'émulateur (CI lente) avant de continuer. */
function sansAnr(ns) {
  const attendre = ns.find((n) => /^(Wait|Attendre)$/i.test(n.text) && n.pkg === "android");
  if (attendre) {
    sh(`input tap ${attendre.x} ${attendre.y}`);
    journal("dialogue « ne répond pas » fermé (Attendre)");
    return true;
  }
  return false;
}
async function trouver(pred, essais = 10) {
  for (let k = 0; k < essais; k++) {
    const ns = noeuds();
    if (sansAnr(ns)) continue;
    const n = ns.find(pred);
    if (n) return n;
    await pause(800);
  }
  return null;
}
async function toucher(pred, nom, essais = 10) {
  const n = await trouver(pred, essais);
  if (!n) {
    journal(`introuvable à l'écran : ${nom}`);
    return null;
  }
  sh(`input tap ${n.x} ${n.y}`);
  journal(`touché « ${n.text || n.desc || n.id} » (${nom}) en ${n.x},${n.y}`);
  return n;
}
const texteEst = (re) => (n) => re.test(n.text) || re.test(n.desc);

// ---------- notification ----------
function lireNotif() {
  const d = shOk("dumpsys notification --noredact");
  const i = d.indexOf(`pkg=${PKG} user=`);
  if (i < 0) return null;
  const j = d.indexOf("NotificationRecord(", i + 20);
  const bloc = d.slice(i, j > 0 ? j : i + 8000);
  const titre = bloc.match(/android\.title=String \(([^)]*)\)/)?.[1] ?? null;
  const texte = bloc.match(/android\.text=String \(([^)]*)\)/)?.[1] ?? null;
  const actions = [...bloc.matchAll(/\[\d+\] "([^"]*)"/g)].map((m) => m[1]);
  const m = texte?.match(/(\d+) km\/h · ([\d,]+) km · ([\d,]+) €/);
  return { titre, texte, actions, kmh: m ? +m[1] : null, km: m ? +m[2].replace(",", ".") : null, euros: m ? +m[3].replace(",", ".") : null, lu: Date.now() };
}
const notifs = [];
function noterNotif(etiquette) {
  const n = lireNotif();
  notifs.push({ etiquette, ...n });
  writeFileSync(`${OUT}/notifications-${SCENARIO}.json`, JSON.stringify(notifs, null, 1));
  journal(`notification [${etiquette}] ${n ? `${n.titre} | ${n.texte} | ${n.actions.join(" / ")}` : "absente"}`);
  return n;
}
async function volet() {
  shOk("cmd statusbar expand-notifications");
  await pause(1500);
  // la notification du trajet doit montrer ses boutons : on la déplie si elle est repliée
  let ns = noeuds();
  if (!ns.some(texteEst(/^(Pause|Reprendre|Arrêter|C'est fini)$/i))) {
    const deplier = ns.find((n) => n.id === "android:id/expand_button");
    if (deplier) {
      sh(`input tap ${deplier.x} ${deplier.y}`);
      journal("notification dépliée");
      await pause(1000);
      ns = noeuds();
    }
  }
  return ns;
}
const fermerVolet = () => shOk("cmd statusbar collapse");
const premierPlan = () => (shOk("dumpsys activity activities | grep -E 'topResumedActivity|mResumedActivity'").split("\n")[0] ?? "").trim();
const ecranEtat = () => shOk("dumpsys power | grep -m1 mWakefulness=").trim();

// ---------- WebView ----------
let appareil = null;
async function page() {
  if (!appareil) [appareil] = await _android.devices();
  for (let k = 0; k < 60; k++) {
    const pid = Number(shOk(`pidof ${PKG}`)) || null;
    const vue = pid && appareil.webViews().find((w) => w.pkg() === PKG && w.pid() === pid);
    if (vue) return vue.page();
    await pause(1000);
  }
  throw new Error("WebView de l'appli introuvable");
}
const lancer = () => shOk(`monkey -p ${PKG} -c android.intent.category.LAUNCHER 1`);
const lireEnCours = (p) =>
  p.evaluate(
    () =>
      new Promise((ok) => {
        const q = indexedDB.open("plein-et-trajet");
        q.onerror = () => ok(null);
        q.onsuccess = () => {
          const r = q.result.transaction("en_cours").objectStore("en_cours").get("enregistrement");
          r.onsuccess = () => ok(r.result ?? null);
          r.onerror = () => ok(null);
        };
      }),
  );
const nombre = (s) => Number(String(s).replace(",", ".").replace(/[^\d.-]/g, ""));
const kmApp = async (p) => nombre(await p.locator('[data-el="direct-km"]').innerText());
function plusGrandTrou(points, a, b) {
  const ts = points.map((x) => x[0]).filter((t) => t >= a && t <= b);
  let max = 0;
  let ou = null;
  for (let k = 1; k < ts.length; k++)
    if (ts[k] - ts[k - 1] > max) {
      max = ts[k] - ts[k - 1];
      ou = ts[k - 1];
    }
  return { n: ts.length, maxS: max / 1000, ou };
}
function kmPoints(points, a, b) {
  const ps = points.filter((x) => x[0] >= a && x[0] <= b);
  let m = 0;
  for (let k = 1; k < ps.length; k++) if (ps[k][3] === ps[k - 1][3]) m += distM({ lat: ps[k - 1][1], lon: ps[k - 1][2] }, { lat: ps[k][1], lon: ps[k][2] });
  return m / 1000;
}

async function preparer(gpx, depuis, source = "puce") {
  const voiture = await voitureEea("5RBU0C");
  const lect = new Lecteur(lireGpx(gpx), depuis, source);
  lancer();
  let p = await page();
  await p.waitForLoadState();
  await p.evaluate((v) => localStorage.setItem("pt-voiture-v1", JSON.stringify(v)), voiture);
  await p.reload();
  await p.locator('[data-el="bouton-demarrer"]').waitFor({ timeout: 30000 });
  return { lect, p };
}
async function demarrer(p, lect) {
  await p.locator('[data-el="bouton-demarrer"]').click();
  await p.waitForURL(/\/en-route$/, { timeout: 60000 });
  lect.roule = true;
}

// =====================================================================================================================
async function principal() {
  // fournisseur de test gps ici aussi : la puce simulée rééchantillonne les positions à sa propre seconde (run 39671788190 :
  // 243 points en 316 s, 31 L/100 en fin de trajet), le fournisseur de test remet chaque position telle qu'envoyée (8,9 L/100)
  const { lect, p: p0 } = await preparer("albi-toulouse.gpx", 700, "test"); // départ après l'arrêt à la station (points 484-664)
  let p = p0;

  // V-1.3 — dialogues d'autorisation natifs, une fois (APK installé sans -g). Constaté au run 39655982353 : la localisation est
  // demandée dès l'ouverture (position de « Autour de moi »), les notifications au premier Démarrer.
  const vus = {};
  let clic = null;
  const limite = Date.now() + 75000;
  while (Date.now() < limite && !(vus.loc && vus.notif)) {
    if (!clic && (vus.loc || Date.now() > limite - 55000)) {
      await pause(1500);
      capture("V-1.3-A03-accueil");
      clic = p.locator('[data-el="bouton-demarrer"]').click();
      journal("Démarrer touché");
    }
    const ns = noeuds();
    if (sansAnr(ns)) continue;
    const loc = ns.find((n) => /permission_allow_foreground_only_button$/.test(n.id));
    const notif = ns.find((n) => /permission_allow_button$/.test(n.id));
    const message = ns.find((n) => /permission_message$/.test(n.id))?.text ?? "";
    if (loc && !vus.loc) {
      capture("V-1.3-A02-dialogue-localisation");
      sh(`input tap ${loc.x} ${loc.y}`);
      vus.loc = message || loc.text;
      journal(`dialogue localisation : « ${message} » → « ${loc.text} »`);
    } else if (notif && !vus.notif) {
      capture("V-1.3-A04-dialogue-notifications");
      sh(`input tap ${notif.x} ${notif.y}`);
      vus.notif = message || notif.text;
      journal(`dialogue notifications : « ${message} » → « ${notif.text} »`);
    } else if (vus.loc && /\/en-route$/.test(p.url()) && lireNotif()) break;
    await pause(700);
  }
  await clic?.catch(() => undefined);
  constat("V-1.3 dialogue d'autorisation de localisation natif (une fois)", !!vus.loc, vus.loc ?? "");
  constat("V-1.3 dialogue d'autorisation des notifications natif", !!vus.notif, vus.notif ?? "non vu");
  await p.waitForURL(/\/en-route$/, { timeout: 60000 });
  lect.roule = true;
  constat("V-1.3 Démarrer ouvre En route", true, p.url());

  // V-3.1 — direct dans l'appli
  await pause(30000);
  const km30 = await kmApp(p);
  const kmh = await p.locator('[data-el="vitesse"]').getAttribute("data-kmh");
  capture("V-3.1-A05-direct");
  constat("V-3.1 direct : km et vitesse comptés", km30 >= 0.2 && Number(kmh) > 10, `${km30} km, ${kmh} km/h après 30 s`);

  // V-3.4 — Pause dans l'appli : « En pause », km figés 10 s, Reprendre
  await p.locator('[data-el="bouton-pause"]').click();
  await p.locator('[data-screen="T3"][data-etat="pause"]').waitFor({ timeout: 5000 });
  const kmP1 = await kmApp(p);
  capture("V-3.4-A06-pause-appli");
  await pause(10000);
  const kmP2 = await kmApp(p);
  constat("V-3.4 pause dans l'appli : « En pause », km figés 10 s", kmP1 === kmP2 && /En pause/.test(await p.locator('[data-el="etat-enregistrement"]').innerText()), `${kmP1} → ${kmP2} km`);
  await p.locator('[data-el="bouton-pause"]').click();
  await p.locator('[data-screen="T3"][data-etat="enregistrement"]').waitFor({ timeout: 5000 });
  await pause(8000);
  const kmR = await kmApp(p);
  capture("V-3.4-A07-reprise-appli");
  constat("V-3.4 Reprendre dans l'appli : la distance repart", kmR > kmP2, `${kmP2} → ${kmR} km`);

  // V-5.1 — passer dans Stations pendant l'enregistrement : la distance continue
  const avantSt = await lireEnCours(p);
  await p.locator('[data-el="onglet-stations"]').click();
  await p.waitForURL(/\/stations$/, { timeout: 10000 });
  await pause(20000);
  capture("V-5.1-A08-stations");
  const pendantSt = await lireEnCours(p);
  await p.locator('[data-el="onglet-trajet"]').click();
  await p.waitForURL(/\/en-route$/, { timeout: 10000 });
  await pause(3000);
  capture("V-5.1-A09-retour-en-route");
  constat("V-5.1 Stations pendant l'enregistrement : les points continuent", pendantSt.points.length - avantSt.points.length >= 15, `${avantSt.points.length} → ${pendantSt.points.length} points en 20 s sur Stations`);

  // V-3.2 — écran éteint, Google Maps (ou Paramètres) devant, 5 min de tracé
  await pause(3000);
  capture("V-3.2-01-avant");
  const aMaps = shOk(`pm path ${MAPS}`).startsWith("package:");
  mesures.appliDevant = aMaps ? "Google Maps (com.google.android.apps.maps)" : "Paramètres (l'image n'a pas Google Maps)";
  const tOff = Date.now();
  const iOff = lect.i;
  shOk("input keyevent 3");
  if (aMaps) shOk(`monkey -p ${MAPS} -c android.intent.category.LAUNCHER 1`);
  else shOk("am start -a android.settings.SETTINGS");
  // capture quand l'appli devant a dessiné son écran (Maps met plusieurs secondes à son premier affichage)
  const dessine = await trouver((n) => n.pkg === (aMaps ? MAPS : "com.android.settings") && (n.text || n.desc), 20);
  journal(`appli devant dessinée : ${dessine ? `${dessine.pkg} « ${dessine.text || dessine.desc} »` : "rien de lisible"}`);
  await pause(1500);
  const devant = premierPlan();
  capture("V-3.2-A10-maps-devant");
  constat("V-3.2 autre appli au premier plan", !devant.includes(PKG), `${mesures.appliDevant} — ${devant}`);
  shOk("input keyevent 223"); // écran éteint
  await pause(3000);
  const eteint = ecranEtat();
  capture("V-3.2-A11-ecran-eteint");
  constat("V-3.2 écran éteint", /Asleep|Dozing/.test(eteint), eteint);
  for (let m = 1; m <= 5; m++) {
    await pause(60000);
    journal(`écran éteint depuis ${m} min — ${ecranEtat()} — GPS envoyés ${lect.envois}, erreurs ${lect.erreurs}`);
    noterNotif(`écran éteint ${m} min`);
  }
  shOk("input keyevent 224");
  shOk("wm dismiss-keyguard");
  await pause(2000);
  const tOn = Date.now();
  const iOn = lect.i;
  capture("V-3.2-A12-reveil");
  const e1 = await lireEnCours(p);
  const trou = plusGrandTrou(e1.points, tOff, tOn);
  const kmOffPts = kmPoints(e1.points, tOff, tOn);
  const kmOffGpx = lect.kmJusqua(iOn) - lect.kmJusqua(iOff);
  mesures.ecranEteint = { dureeS: (tOn - tOff) / 1000, points: trou.n, plusGrandTrouS: trou.maxS, kmPoints: +kmOffPts.toFixed(3), kmGpx: +kmOffGpx.toFixed(3) };
  writeFileSync(`${OUT}/points-ecran-eteint.json`, JSON.stringify(e1.points.filter((x) => x[0] >= tOff - 5000 && x[0] <= tOn + 5000)));
  constat("V-3.2 aucun trou > 15 s dans les points (IndexedDB en_cours) écran éteint + Maps", trou.n >= 0.6 * ((tOn - tOff) / 1000) && trou.maxS <= 15, `${trou.n} points en ${Math.round((tOn - tOff) / 1000)} s, plus grand trou ${trou.maxS} s`);
  constat("V-3.2 la distance couvre tout le temps écran éteint", kmOffPts / kmOffGpx > 0.97, `${kmOffPts.toFixed(2)} km comptés / ${kmOffGpx.toFixed(2)} km rejoués`);
  lancer();
  await pause(4000);
  capture("V-3.2-02-apres");
  await pause(5000);
  capture("V-3.3-01-avant");

  // V-3.3 — la notification, Maps devant : lue deux fois à 10 s, Pause / Reprendre / Arrêter sans ouvrir l'appli
  if (aMaps) shOk(`monkey -p ${MAPS} -c android.intent.category.LAUNCHER 1`);
  else shOk("am start -a android.settings.SETTINGS");
  await pause(3000);
  let ns = await volet();
  const n1 = noterNotif("lecture 1");
  capture("V-3.3-02-apres");
  constat("V-3.3 notification « Plein & Trajet » dans le volet", ns.some(texteEst(/^Plein & Trajet$/)), "nom de l'appli en tête de la notification");
  constat("V-3.3 notification : vitesse, km, € + Pause et Arrêter", n1?.kmh != null && n1?.euros != null && /^Pause$/i.test(n1.actions[0] ?? "") && /^Arrêter$/i.test(n1.actions[1] ?? ""), `${n1?.titre} | ${n1?.texte} | ${n1?.actions.join(" / ")}`);
  await pause(10000);
  const n2 = noterNotif("lecture 2 (+10 s)");
  capture("V-3.3-03-avant");
  constat("V-3.3 notification mise à jour (lectures à 10 s d'écart)", n2 && n1 && n2.texte !== n1.texte && n2.km > n1.km, `${n1?.texte} → ${n2?.texte}`);
  await toucher(texteEst(/^Pause$/i), "Pause de la notification");
  await pause(3000);
  ns = await volet();
  const n3 = noterNotif("après Pause");
  capture("V-3.3-04-apres");
  const devantPause = premierPlan();
  constat("V-3.3 Pause depuis la notification : « Trajet en pause », bouton « Reprendre », appli pas ouverte", n3?.titre === "Trajet en pause" && /^Reprendre$/i.test(n3.actions[0] ?? "") && !devantPause.includes(PKG), `${n3?.titre} | ${n3?.actions.join(" / ")} | devant : ${devantPause}`);
  await pause(30000);
  const n4 = noterNotif("pause +30 s");
  const e2 = await lireEnCours(p);
  capture("V-3.4-A13-pause-30s");
  constat("V-3.4 pause depuis la notification : km figés 30 s de tracé", n4?.km === n3?.km && e2.enPause === true, `${n3?.km} → ${n4?.km} km, enPause=${e2.enPause}, GPS rejoué jusqu'au point ${lect.i}`);
  await toucher(texteEst(/^Reprendre$/i), "Reprendre de la notification");
  await pause(10000);
  ns = await volet();
  const n5 = noterNotif("après Reprendre");
  capture("V-3.3-A14-reprise-notif");
  constat("V-3.3 Reprendre depuis la notification : « Trajet en cours », km repartent", n5?.titre === "Trajet en cours" && n5.km > n4.km && /^Pause$/i.test(n5.actions[0] ?? ""), `${n4?.km} → ${n5?.km} km`);
  await pause(5000);
  ns = await volet();
  capture("V-3.3-05-avant");

  // écart natif / web : la notification (direct) contre la fin de trajet (calculLocal de roule.ts), au même instant figé
  lect.gele = true;
  await pause(4000);
  const nF = noterNotif("figée avant Arrêter");
  const eF = await lireEnCours(p);
  const kmDirect = await kmApp(p).catch(() => null);
  const litresDirect = nombre(await p.locator('[data-el="direct-litres"]').innerText().catch(() => "NaN"));
  const prix = eF.prixChoisi ?? eF.moyennes?.[eF.voiture.carburant]?.prix ?? null;
  await toucher(texteEst(/^Arrêter$/i), "Arrêter de la notification");
  await p.waitForURL(/\/fin$/, { timeout: 30000 }).catch(() => undefined);
  const premierPlanFin = premierPlan();
  await p.locator('[data-el="titre-trajet"][data-noms="oui"]').waitFor({ timeout: 20000 }).catch(() => undefined);
  await pause(1500);
  capture("V-3.3-06-apres");
  lect.gele = false;
  lect.roule = false;
  constat("V-3.3 Arrêter depuis la notification : l'appli s'ouvre sur la fin de trajet", /\/fin$/.test(p.url()) && premierPlanFin.includes(PKG), `${p.url()} | ${premierPlanFin}`);
  constat("fin de trajet : noms des lieux en titre (pas de coordonnées)", (await p.locator('[data-el="titre-trajet"]').getAttribute("data-noms")) === "oui", await p.locator('[data-el="titre-trajet"]').innerText());
  const finKm = Number(await p.locator('[data-el="fin-km"]').getAttribute("data-km"));
  const finL = Number(await p.locator('[data-el="fin-litres"]').getAttribute("data-litres"));
  const litresNotif = prix && nF?.euros != null ? nF.euros / prix : null;
  mesures.ecart = {
    notification: { km: nF?.km, euros: nF?.euros, prix, litresDeduits: litresNotif },
    direct: { km: kmDirect, litres: litresDirect },
    fin: { km: finKm, litres: finL },
    ecartKmPct: nF?.km ? +((100 * Math.abs(nF.km - finKm)) / finKm).toFixed(2) : null,
    ecartLitresPct: litresNotif ? +((100 * Math.abs(litresNotif - finL)) / finL).toFixed(2) : null,
    ecartLitresDirectPct: litresDirect ? +((100 * Math.abs(litresDirect - finL)) / finL).toFixed(2) : null,
  };
  constat("écart km notification / fin de trajet < 3 %", mesures.ecart.ecartKmPct != null && mesures.ecart.ecartKmPct < 3, `${nF?.km} km vs ${finKm.toFixed(3)} km → ${mesures.ecart.ecartKmPct} %`);
  constat("écart litres notification / fin de trajet < 5 %", mesures.ecart.ecartLitresPct != null && mesures.ecart.ecartLitresPct < 5, `${litresNotif?.toFixed(3)} L (${nF?.euros} € / ${prix} €/L) vs ${finL.toFixed(3)} L → ${mesures.ecart.ecartLitresPct} % (direct à l'écran : ${litresDirect} L, ${mesures.ecart.ecartLitresDirectPct} %)`);
  constat("notification effacée après Arrêter", lireNotif() === null);

  // V-4.7 — Enregistrer, puis rouvrir l'appli : le trajet est dans l'historique
  const idTrajet = await p.locator('[data-screen="T4"]').getAttribute("data-trajet");
  await p.locator('[data-el="enregistrer-trajet"]').click();
  await p.waitForURL(/\/historique$/, { timeout: 10000 });
  await p.locator(`[data-el="historique"] [data-trajet="${idTrajet}"]`).waitFor({ timeout: 10000 });
  await pause(1500);
  capture("V-4.7-A15-historique");
  shOk(`am force-stop ${PKG}`);
  await pause(2000);
  lancer();
  p = await page();
  await p.locator('[data-el="onglet-historique"]').click({ timeout: 30000 });
  const garde = await p.locator(`[data-el="historique"] [data-trajet="${idTrajet}"]`).waitFor({ timeout: 15000 }).then(() => true, () => false);
  await pause(1000);
  capture("V-4.7-A16-historique-rouvert");
  constat("V-4.7 trajet enregistré présent dans l'historique après réouverture de l'appli", garde, idTrajet);

  // V-3.2 pas 3-4 — l'appli tuée pendant un trajet, puis rouverte : le trajet reprend avec tous ses points
  await p.locator('[data-el="onglet-trajet"]').click();
  await p.locator('[data-el="bouton-demarrer"]').waitFor({ timeout: 15000 });
  await demarrer(p, lect);
  await pause(40000);
  capture("V-3.2-03-avant");
  const avantKill = await lireEnCours(p);
  const pidof = () => (/^\d+$/.test(shOk(`pidof ${PKG}`)) ? shOk(`pidof ${PKG}`) : "");
  const pid1 = pidof();
  shOk(`am kill ${PKG}`);
  await pause(3000);
  const apresAmKill = pidof();
  mesures.arret = { pidAvant: pid1, pidApresAmKill: apresAmKill };
  journal(`am kill : processus ${pid1} → ${apresAmKill || "aucun"}`);
  if (apresAmKill) {
    // `am kill` n'arrête que les processus « sûrs à tuer » ; un processus avec un service de premier plan ne l'est pas.
    // Le système, lui, le tue quand la mémoire manque : SIGKILL, sans prévenir — c'est ce qu'on rejoue ici.
    const r = shOk(`run-as ${PKG} kill -9 ${apresAmKill}`);
    journal(`am kill sans effet (service de premier plan) : SIGKILL par run-as → ${r || "ok"}`);
  }
  await pause(3000);
  const pid2 = pidof();
  mesures.arret.pidApresSigkill = pid2;
  capture("V-3.2-A17-appli-tuee");
  constat("V-3.2 processus de l'appli arrêté", pid2 !== pid1, `${pid1} → ${pid2 || "aucun"}`);
  await pause(10000);
  lancer();
  p = await page();
  await p.waitForURL(/\/en-route$/, { timeout: 30000 }).catch(() => undefined);
  await pause(8000);
  const apres = await lireEnCours(p);
  capture("V-3.2-04-apres");
  const memes = apres && apres.id === avantKill.id && avantKill.points.every((x, k) => apres.points[k]?.[0] === x[0]);
  mesures.arret.points = { avant: avantKill.points.length, apres: apres?.points.length, memeTrajet: apres?.id === avantKill.id };
  constat("V-3.2 réouverture : le trajet en cours reprend avec tous ses points", /\/en-route$/.test(p.url()) && memes && apres.points.length > avantKill.points.length, `${avantKill.points.length} points avant → ${apres?.points.length} après, même trajet ${apres?.id === avantKill.id}`);
  constat("V-3.2 réouverture : la notification du trajet revient", (lireNotif()?.titre ?? "").startsWith("Trajet en cours"), lireNotif()?.texte ?? "absente");

  // V-3.5 — Arrêter dans l'appli : fin de trajet
  await p.locator('[data-el="bouton-arreter"]').click();
  await p.waitForURL(/\/fin$/, { timeout: 20000 });
  await p.locator('[data-el="titre-trajet"][data-noms="oui"]').waitFor({ timeout: 20000 }).catch(() => undefined);
  capture("V-3.5-A18-fin-appli");
  constat("V-3.5 Arrêter dans l'appli ouvre la fin de trajet", /\/fin$/.test(p.url()), await p.locator('[data-el="titre-trajet"]').innerText());
  await p.locator('[data-el="supprimer-neuf"]').click();
  await lect.arreter();
}

// =====================================================================================================================
async function immobile() {
  // V-3.E2 — trou de 90 s (tunnel) : « GPS perdu » puis distance complétée
  let { lect, p } = await preparer("albi-toulouse-tunnel-90s.gpx", 0, "test");
  await demarrer(p, lect);
  await pause(15000);
  capture("V-3.E2-A21-en-route");
  while (lect.s < 121 + 25) await pause(500); // le tracé se tait à la seconde 121, pour 90 s
  await p.locator('[data-el="gps-perdu"]').waitFor({ timeout: 10000 }).catch(() => undefined);
  capture("V-3.E2-A22-gps-perdu");
  const perdu = await p.locator('[data-el="gps-perdu"]').isVisible();
  const nP = noterNotif("tunnel");
  await volet();
  capture("V-3.E2-A23-notif-gps-perdu");
  fermerVolet();
  constat("V-3.E2 « GPS perdu » dans l'appli et la notification pendant le trou", perdu && nP?.titre === "Trajet en cours · GPS perdu", `${perdu} | ${nP?.titre}`);
  while (lect.s < 211 + 15) await pause(500);
  capture("V-3.E2-A24-gps-retrouve");
  constat("V-3.E2 signal retrouvé : « GPS perdu » disparaît", !(await p.locator('[data-el="gps-perdu"]').isVisible()));
  while (lect.s < lect.sMax) await pause(500);
  await pause(2000);
  const attendu = lect.kmJusqua(lect.pts.length - 1);
  await p.locator('[data-el="bouton-arreter"]').click();
  await p.waitForURL(/\/fin$/, { timeout: 20000 });
  await p.locator('[data-el="titre-trajet"][data-noms="oui"]').waitFor({ timeout: 20000 }).catch(() => undefined);
  capture("V-3.E2-A25-fin");
  const kmT = Number(await p.locator('[data-el="fin-km"]').getAttribute("data-km"));
  mesures.tunnel = { kmFin: kmT, kmTrace: +attendu.toFixed(3) };
  constat("V-3.E2 distance complétée à travers le trou de 90 s (écart < 3 %)", Math.abs(kmT - attendu) / attendu < 0.03, `${kmT.toFixed(3)} km vs ${attendu.toFixed(3)} km rejoués`);
  await p.locator('[data-el="supprimer-neuf"]').click();
  await p.locator('[data-el="bouton-demarrer"]').waitFor({ timeout: 15000 });
  await lect.arreter();

  // V-3.E1 — garé 10 min, écran éteint : la notification passe à « Immobile depuis 10 min » avec « C'est fini » / « Reprendre »
  lect = new Lecteur(lireGpx("albi-toulouse-immobile-11min.gpx"), 700, "test"); // immobile à partir de la seconde 74 du rejeu
  await demarrer(p, lect);
  await pause(20000);
  capture("V-3.E1-A26-en-route");
  shOk("input keyevent 3");
  shOk("input keyevent 223");
  const debutAttente = Date.now();
  let nI = null;
  while (Date.now() - debutAttente < 14 * 60000) {
    await pause(10000);
    nI = lireNotif();
    if (nI?.titre?.startsWith("Immobile")) break;
  }
  journal(`immobile : seconde du rejeu ${lect.s}, écran ${ecranEtat()}`);
  noterNotif("immobile");
  mesures.immobile = { secondeRejeu: lect.s, attenduVers: 74 + 600, titre: nI?.titre, actions: nI?.actions };
  constat("V-3.E1 notification « Immobile depuis 10 min » écran éteint, avec « Reprendre » et « C'est fini »", nI?.titre === "Immobile depuis 10 min : c'est fini ?" && nI.actions.includes("Reprendre") && nI.actions.includes("C'est fini"), `${nI?.titre} | ${nI?.actions?.join(" / ")} | seconde ${lect.s} (immobile depuis la seconde 74)`);
  shOk("input keyevent 224");
  shOk("wm dismiss-keyguard");
  lancer();
  await pause(4000);
  const alerte = await p.locator('[data-el="alerte-immobile"]').isVisible().catch(() => false);
  capture("V-3.E1-A27-immobile-appli");
  constat("V-3.E1 alerte d'immobilité dans l'appli", alerte);
  await volet();
  capture("V-3.E1-A28-notif-immobile");
  await toucher(texteEst(/^Reprendre$/i), "Reprendre (immobile) de la notification");
  await pause(4000);
  await volet();
  const nR = noterNotif("après Reprendre (immobile)");
  capture("V-3.E1-A29-reprise");
  fermerVolet();
  const etatR = await p.locator('[data-screen="T3"]').getAttribute("data-etat");
  constat("V-3.E1 « Reprendre » de la notification : l'enregistrement repart", nR?.titre === "Trajet en cours" && etatR === "enregistrement", `${nR?.titre} | écran ${etatR}`);
  await p.locator('[data-el="bouton-arreter"]').click();
  await p.waitForURL(/\/fin$/, { timeout: 20000 });
  await p.locator('[data-el="titre-trajet"][data-noms="oui"]').waitFor({ timeout: 20000 }).catch(() => undefined);
  capture("V-3.E1-A30-fin");
  await p.locator('[data-el="supprimer-neuf"]').click();
  await lect.arreter();
}

try {
  journal(`scénario ${SCENARIO} — écran ${ecranEtat()} — Maps ${shOk(`pm path ${MAPS}`) || "absent"}`);
  if (SCENARIO === "principal") await principal();
  else await immobile();
} catch (e) {
  constat("scénario sans exception", false, String(e?.stack ?? e).slice(0, 600));
  try {
    capture(`echec-${SCENARIO}`);
  } catch {}
}
finir();
