// Jalon 6 — instrumentation de l'appli Android sur l'émulateur (GitHub Actions, API 34 google_apis x86_64).
// Trois scénarios, un par job : « principal » (dialogues d'autorisation natifs, proposition de batterie, écran éteint avec Maps
// devant pendant 5 min, notification lue et pilotée, Pause / Reprendre / Arrêter, historique, processus tué et laissé mort 70 s
// sans rouvrir l'appli), « immobile » (trou de 90 s, immobile 10 min écran éteint, Reprendre) et « fini » (immobile 10 min puis
// « C'est fini » depuis la notification). Round 2 : tout tourne sur l'APK de RELEASE signé (celui qu'on publie) ; sa WebView
// est rendue inspectable par `am start … --ez pt_inspecter true` (MainActivity), et `adb root` (image google_apis) lit le journal
// des relevés que le service natif écrit (files/trajet-en-cours.txt) et tue le processus.
// Pilotage : la position est rejouée par le fournisseur de test « gps » (`cmd location providers`, 1 point par seconde) — la
// classe Lecteur sait aussi alimenter la puce GPS simulée (console de l'émulateur), écartée pour les raisons notées plus bas ; l'interface
// native (dialogues, volet des notifications) par `uiautomator dump` + `input tap` ; la WebView par Playwright (_android, CDP),
// qui lit l'état de la page (IndexedDB « plein-et-trajet », magasin en_cours). Les points se lisent là où le service les écrit :
// son journal (journalNatif).
// Usage : node tests/android/m6-emulateur.mjs principal|immobile|fini [dossier-sortie]
import { execFile, execFileSync, spawn } from "node:child_process";
import { appendFileSync, existsSync, mkdirSync, openSync, readFileSync, writeFileSync } from "node:fs";
import net from "node:net";
import os from "node:os";
import { promisify } from "node:util";
import { _android } from "@playwright/test";
import { lireGpx, voitureEea } from "../e2e/exploration/m5-aides.mjs";
// node --experimental-strip-types : le module de calcul de l'appli, tel quel, pour la consommation de référence
const { calculLocal } = await import("../../supabase/functions/_shared/roule.ts");

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
      journal(`remove-test-provider gps → ${shOk(commeShell("cmd location providers remove-test-provider gps 2>&1")) || "ok"}`);
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
let prefixeTest = "";
// adb root (round 2) : uid 0 n'est pas l'appli de position fictive autorisée — les commandes passent par l'uid shell (2000)
const commeShell = (c) => (shOk("id -u") === "0" ? `su 2000 ${c}` : c);
function fournisseurTest() {
  if (shellTest) return;
  for (const c of ["appops set com.android.shell android:mock_location allow", "appops set 2000 android:mock_location allow"]) journal(`${c} → ${shOk(c) || "ok"}`);
  journal(`aide : ${shOk("cmd location help 2>&1 | grep -iE 'test-provider' | head -8").replace(/\s+/g, " ")}`);
  journal(`add-test-provider gps → ${shOk(commeShell("cmd location providers add-test-provider gps 2>&1")) || "ok"}`);
  journal(`set-test-provider-enabled gps → ${shOk(commeShell("cmd location providers set-test-provider-enabled gps true 2>&1")) || "ok"}`);
  prefixeTest = commeShell("");
  shellTest = spawn("adb", ["shell"], { stdio: ["pipe", "ignore", "ignore"] });
}
// round 2 : chaque position porte son heure (--time), à cadence fixe, comme une puce GNSS qui date ses relevés. Sans elle,
// l'heure était celle où le shell exécutait la commande : au lancement de Maps l'émulateur les retardait de plusieurs secondes
// puis les enchaînait (run 39687638983 : trou de 8,1 s puis pas de 625 km/h), et le service datait mal ces relevés.
let decalageAppareil = null; // horloge de l'émulateur − horloge du runner (ms)
function fixTest(lon, lat, t) {
  if (decalageAppareil == null) decalageAppareil = Number(shOk("date +%s%3N")) - Date.now() || 0;
  const heure = Math.round(t + decalageAppareil);
  shellTest.stdin.write(`${prefixeTest}cmd location providers set-test-provider-location gps --location ${lat},${lon} --accuracy 5 --time ${heure}\n`);
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
          if (this.source === "test") fixTest(p.lon.toFixed(6), p.lat.toFixed(6), t0 + tic * 1000);
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
const lancer = () => shOk(`am start -n ${PKG}/.MainActivity -a android.intent.action.MAIN -c android.intent.category.LAUNCHER --ez pt_inspecter true`);
const racine = shOk("id -u") === "0"; // adb root (job emulateur) : journal du service lisible, processus tuable
/** Journal écrit par le service natif TrajetService : relevés P (instant du relevé), boutons A, relances R. */
function journalNatif() {
  const txt = racine ? shOk(`cat /data/data/${PKG}/files/trajet-en-cours.txt`) : shOk(`run-as ${PKG} cat files/trajet-en-cours.txt`);
  return txt
    .split("\n")
    .map((l) => l.trim().split(";"))
    .filter((c) => ["P", "A", "R"].includes(c[0]) && Number.isFinite(+c[1]))
    .map((c) => ({ type: c[0], t: +c[1], lat: +c[2], lon: +c[3], quoi: c[2] }));
}
const pidof = () => {
  const r = shOk(`pidof ${PKG}`);
  return /^\d+$/.test(r) ? r : "";
};
function tuer(pid) {
  // le système tue l'appli quand la mémoire manque : SIGKILL, sans prévenir — c'est ce qu'on rejoue ici
  return racine ? shOk(`kill -9 ${pid}`) : shOk(`run-as ${PKG} kill -9 ${pid}`);
}
async function mapsDevant() {
  shOk(`monkey -p ${MAPS} -c android.intent.category.LAUNCHER 1`);
  // premier lancement : Maps propose de se connecter ; on passe, pour voir la carte (LOW 10 de l'audit r1)
  const passer = await trouver((n) => n.pkg === MAPS && /^(Skip|Ignorer|Not now|Plus tard|No thanks|Non merci|Later|Passer)$/i.test(n.text || n.desc), 8);
  if (passer) {
    sh(`input tap ${passer.x} ${passer.y}`);
    journal(`Maps : « ${passer.text || passer.desc} » touché`);
  }
  await pause(5000);
}
/** Proposition de batterie au premier Démarrer : explication dans l'appli, puis dialogue système accepté. */
async function repondreBatterie(p, nomAppli, nomSysteme) {
  const vu = {};
  const dlg = p.locator('[data-el="proposer-batterie"]');
  if (!(await dlg.waitFor({ timeout: 8000 }).then(() => true, () => false))) return vu;
  vu.appli = (await dlg.innerText()).replace(/\s+/g, " ");
  if (nomAppli) capture(nomAppli);
  await p.locator('[data-el="batterie-autoriser"]').click();
  const oui = await trouver((n) => n.pkg === "com.android.settings" && (n.id === "android:id/button1" || /^(Allow|Autoriser)$/i.test(n.text)), 15);
  if (oui) {
    vu.systeme = noeuds()
      .filter((n) => n.pkg === "com.android.settings" && n.text)
      .map((n) => n.text)
      .join(" | ");
    if (nomSysteme) capture(nomSysteme);
    sh(`input tap ${oui.x} ${oui.y}`);
    journal(`dialogue système de batterie : « ${vu.systeme} » → « ${oui.text} »`);
  }
  await pause(1500);
  vu.horsOptimisation = shOk("dumpsys deviceidle whitelist").includes(PKG);
  return vu;
}
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
/** Plus grand écart entre points de [a, b], le dernier point d'avant `a` compris (audit r1, LOW 6 : le trou à cheval sur `a`). */
function plusGrandTrou(points, a, b) {
  const tous = points.map((x) => x[0]);
  const avant = tous.filter((t) => t < a).at(-1);
  const ts = [...(avant != null ? [avant] : []), ...tous.filter((t) => t >= a && t <= b)];
  let max = 0;
  let ou = null;
  for (let k = 1; k < ts.length; k++)
    if (ts[k] - ts[k - 1] > max) {
      max = ts[k] - ts[k - 1];
      ou = ts[k - 1];
    }
  return { n: ts.length - (avant != null ? 1 : 0), maxS: max / 1000, ou, depuisAvantS: avant != null ? (a - avant) / 1000 : null };
}
function kmPoints(points, a, b) {
  const ps = points.filter((x) => x[0] >= a && x[0] <= b);
  let m = 0;
  for (let k = 1; k < ps.length; k++) if (ps[k][3] === ps[k - 1][3]) m += distM({ lat: ps[k - 1][1], lon: ps[k - 1][2] }, { lat: ps[k][1], lon: ps[k][2] });
  return m / 1000;
}

let voitureTest = null;
/** Consommation de référence : roule.ts sur le tronçon du GPX rejoué [i0, i1], aux heures du GPX (un enregistreur parfait). */
function reference(lect, i0, i1) {
  const pts = lect.pts.slice(i0, i1 + 1).map((x) => [x.t, x.lat, x.lon, 0]);
  const veh = { masse_kg: voitureTest.masse_kg, carburant: voitureTest.carburant, conso: voitureTest.conso_phases };
  const r = calculLocal(pts, [], veh, pts[0][0], pts[pts.length - 1][0]);
  return { km: +r.km.toFixed(3), litres: +r.litres.toFixed(4), l100: +((r.litres / r.km) * 100).toFixed(2), points: [i0, i1] };
}
async function preparer(gpx, depuis, source = "puce") {
  const voiture = await voitureEea("5RBU0C");
  voitureTest = voiture;
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
  const b = await repondreBatterie(p); // premier Démarrer du job seulement
  if (b.appli) journal(`batterie proposée : ${b.appli} | système ${b.systeme ?? "—"} | hors optimisation ${b.horsOptimisation}`);
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
  const limite = Date.now() + 90000;
  while (Date.now() < limite && !(vus.loc && vus.notif)) {
    if (!clic && (vus.loc || Date.now() > limite - 70000)) {
      await pause(1500);
      capture("V-1.3-A03-accueil");
      await p.locator('[data-el="bouton-demarrer"]').click();
      journal("Démarrer touché");
      // HIGH 3 de l'audit r1 : au premier Démarrer, sortir l'appli de l'optimisation de batterie (une fois)
      vus.batterie = await repondreBatterie(p, "V-3.2-A31-batterie-appli", "V-3.2-A32-batterie-systeme");
      clic = Promise.resolve();
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
  mesures.batterie = vus.batterie;
  constat("V-3.2 premier Démarrer : l'appli explique et propose de sortir de l'optimisation de batterie", !!vus.batterie?.appli, vus.batterie?.appli ?? "non vue");
  constat("V-3.2 dialogue système « optimisation de batterie » accepté : appli hors optimisation (deviceidle whitelist)", !!vus.batterie?.systeme && vus.batterie.horsOptimisation, `${vus.batterie?.systeme ?? "non vu"} | whitelist ${vus.batterie?.horsOptimisation}`);
  constat("V-1.3 dialogue d'autorisation des notifications natif", !!vus.notif, vus.notif ?? "non vu");
  await p.waitForURL(/\/en-route$/, { timeout: 60000 });
  lect.roule = true;
  const iDebut1 = lect.i;
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
  if (aMaps) await mapsDevant();
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
  // les points là où le service les écrit (son journal), et ce que la page en a gardé (IndexedDB)
  const jOff = journalNatif().filter((x) => x.type === "P");
  const trou = plusGrandTrou(jOff.map((x) => [x.t]), tOff, tOn);
  const trouPage = plusGrandTrou(e1.points, tOff, tOn);
  const kmOffPts = kmPoints(e1.points, tOff, tOn);
  const kmOffGpx = lect.kmJusqua(iOn) - lect.kmJusqua(iOff);
  mesures.ecranEteint = { dureeS: (tOn - tOff) / 1000, pointsJournal: trou.n, plusGrandTrouJournalS: trou.maxS, ou: trou.ou, pointsPage: trouPage.n, plusGrandTrouPageS: trouPage.maxS, kmPoints: +kmOffPts.toFixed(3), kmGpx: +kmOffGpx.toFixed(3) };
  writeFileSync(`${OUT}/points-ecran-eteint.json`, JSON.stringify({ journal: jOff.filter((x) => x.t >= tOff - 5000 && x.t <= tOn + 5000), page: e1.points.filter((x) => x[0] >= tOff - 5000 && x[0] <= tOn + 5000) }));
  constat("V-3.2 aucun trou > 15 s dans les points écrits par le service (journal), écran éteint + Maps, depuis le dernier point d'avant", trou.n >= 0.6 * ((tOn - tOff) / 1000) && trou.maxS <= 15, `${trou.n} points en ${Math.round((tOn - tOff) / 1000)} s, plus grand trou ${trou.maxS} s (page : ${trouPage.n} points, ${trouPage.maxS} s)`);
  constat("V-3.2 la distance couvre tout le temps écran éteint", kmOffPts / kmOffGpx > 0.97, `${kmOffPts.toFixed(2)} km comptés / ${kmOffGpx.toFixed(2)} km rejoués`);
  lancer();
  await pause(4000);
  capture("V-3.2-02-apres");
  await pause(5000);
  capture("V-3.3-01-avant");

  // V-3.3 — la notification, Maps devant : lue deux fois à 10 s, Pause / Reprendre / Arrêter sans ouvrir l'appli
  if (aMaps) await mapsDevant();
  else shOk("am start -a android.settings.SETTINGS");
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

  const iFin1 = lect.i;
  // écart direct / fin : la notification (direct de la PAGE, enDirect de roule.ts) contre la fin de trajet (calculLocal du même
  // module), au même instant figé — deux calculs JS. Le direct NATIF (service sans la page) se mesure plus bas, appli tuée.
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
  mesures.conso = { trajet1: { km: finKm, litres: finL, l100: +((finL / finKm) * 100).toFixed(2), reference: reference(lect, iDebut1, iFin1) } };
  constat("écart km notification (direct de la page) / fin de trajet < 3 %", mesures.ecart.ecartKmPct != null && mesures.ecart.ecartKmPct < 3, `${nF?.km} km vs ${finKm.toFixed(3)} km → ${mesures.ecart.ecartKmPct} %`);
  constat("écart litres notification (direct de la page) / fin de trajet < 5 %", mesures.ecart.ecartLitresPct != null && mesures.ecart.ecartLitresPct < 5, `${litresNotif?.toFixed(3)} L (${nF?.euros} € / ${prix} €/L) vs ${finL.toFixed(3)} L → ${mesures.ecart.ecartLitresPct} % (direct à l'écran : ${litresDirect} L, ${mesures.ecart.ecartLitresDirectPct} %)`);
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

  // V-3.2 pas 3-4 — l'appli tuée en route (Maps devant), LAISSÉE MORTE 70 s : le service relancé par le système continue
  // d'écrire les relevés sans la page ; à la réouverture, la page les relit (audit r1, HIGH 2)
  await p.locator('[data-el="onglet-trajet"]').click();
  await p.locator('[data-el="bouton-demarrer"]').waitFor({ timeout: 15000 });
  await demarrer(p, lect);
  const iDebut2 = lect.i;
  await pause(40000);
  capture("V-3.2-03-avant");
  const avantKill = await lireEnCours(p);
  if (aMaps) await mapsDevant();
  const pid1 = pidof();
  shOk(`am kill ${PKG}`);
  await pause(3000);
  const apresAmKill = pidof();
  mesures.arret = { racine, pidAvant: pid1, pidApresAmKill: apresAmKill };
  journal(`am kill : processus ${pid1} → ${apresAmKill || "aucun"} (un processus avec un service de premier plan n'est pas « sûr à tuer »)`);
  const tKill = Date.now();
  journal(`SIGKILL du processus ${apresAmKill || pid1} → ${tuer(apresAmKill || pid1) || "ok"}`);
  let pid2 = "";
  while (Date.now() - tKill < 30000) {
    pid2 = pidof();
    if (pid2 && pid2 !== pid1) break;
    await pause(250);
  }
  mesures.arret.pidRelance = pid2;
  mesures.arret.processusRelanceApresS = pid2 ? (Date.now() - tKill) / 1000 : null;
  journal(`services : ${shOk(`dumpsys activity services ${PKG} | grep -E 'ServiceRecord|isForeground|startRequested|restartCount' | head -6`).replace(/\s+/g, " ")}`);
  constat("V-3.2 processus tué (SIGKILL) puis relancé par le système sans ouvrir l'appli", !!pid2 && pid2 !== pid1 && !premierPlan().includes(PKG), `${pid1} → ${pid2 || "aucun"} en ${mesures.arret.processusRelanceApresS} s | devant : ${premierPlan()}`);
  await pause(25000);
  capture("V-3.2-A17-appli-tuee");
  await volet();
  const nT = noterNotif("appli tuée +30 s (service seul)");
  capture("V-3.2-A33-tuee-notif");
  fermerVolet();
  while (Date.now() - tKill < 70000) await pause(1000);
  // direct NATIF figé : le service seul, page absente (audit r1, MEDIUM 5)
  lect.gele = true;
  const tGele = Date.now();
  await pause(4000);
  const nNat = noterNotif("direct natif figé (page absente)");
  const jK = journalNatif();
  const tRouvre = Date.now();
  lancer();
  p = await page();
  await p.waitForURL(/\/en-route$/, { timeout: 30000 }).catch(() => undefined);
  await pause(6000);
  const nPage = noterNotif("direct de la page figé (rouverte)");
  const apres = await lireEnCours(p);
  capture("V-3.2-04-apres");
  // GPS figé au moins 17 s : au-delà de 15 s c'est un « trou » (ligne droite) ; plus court, le tracé reprendrait comme après
  // un arrêt, et l'accélération fictive qui suit compterait des litres (test, pas route)
  while (Date.now() - tGele < 17000) await pause(250);
  lect.gele = false;
  const pj = jK.filter((x) => x.type === "P");
  const dernierAvant = pj.filter((x) => x.t < tKill).at(-1)?.t ?? null;
  const premierApres = pj.find((x) => x.t > tKill)?.t ?? null;
  const relance = jK.find((x) => x.type === "R" && x.t > tKill)?.t ?? null;
  const fenetre = pj.filter((x) => x.t > tKill && x.t < tRouvre);
  const fenetrePage = (apres?.points ?? []).filter((x) => x[0] > tKill && x[0] < tRouvre);
  const memes = apres && apres.id === avantKill.id && avantKill.points.every((x, k) => apres.points[k]?.[0] === x[0]);
  mesures.arret.journal = {
    dernierPointAvantKill: dernierAvant,
    premierPointApres: premierApres,
    trouS: dernierAvant && premierApres ? (premierApres - dernierAvant) / 1000 : null,
    relanceServiceApresKillS: relance ? (relance - tKill) / 1000 : null,
    fenetreS: (tRouvre - tKill) / 1000,
    pointsJournalFenetre: fenetre.length,
    pointsPageFenetre: fenetrePage.length,
  };
  mesures.arret.points = { avant: avantKill.points.length, apres: apres?.points.length, memeTrajet: apres?.id === avantKill.id };
  writeFileSync(`${OUT}/journal-apres-kill.txt`, jK.map((x) => `${x.type};${x.t};${x.lat};${x.lon}`).join("\n"));
  constat("V-3.2 appli laissée morte ≥ 60 s sans être rouverte", tRouvre - tKill >= 60000, `${((tRouvre - tKill) / 1000).toFixed(1)} s`);
  constat("V-3.2 le service a écrit les relevés pendant que l'appli était morte (≥ 0,6 par seconde)", fenetre.length >= 0.6 * ((tRouvre - tKill) / 1000 - 15), `${fenetre.length} relevés dans le journal entre l'arrêt et la réouverture (${((tRouvre - tKill) / 1000).toFixed(1)} s, GPS figé les 4 dernières s)`);
  constat("V-3.2 trou dans les relevés dû à la mort du processus < 15 s", mesures.arret.journal.trouS != null && mesures.arret.journal.trouS < 15, `dernier relevé avant l'arrêt → premier après : ${mesures.arret.journal.trouS} s (service relancé ${mesures.arret.journal.relanceServiceApresKillS} s après le SIGKILL)`);
  constat("V-3.2 réouverture : le trajet reprend avec tous ses points, ceux écrits sans la page compris", /\/en-route$/.test(p.url()) && memes && fenetrePage.length >= fenetre.length, `${avantKill.points.length} points avant → ${apres?.points.length} après ; fenêtre : ${fenetrePage.length} dans la page / ${fenetre.length} dans le journal ; même trajet ${apres?.id === avantKill.id}`);
  constat("V-3.2 réouverture : la notification du trajet revient", (lireNotif()?.titre ?? "").startsWith("Trajet en cours"), lireNotif()?.texte ?? "absente");
  mesures.ecartNatif = {
    natif: { km: nNat?.km, euros: nNat?.euros, texte: nNat?.texte },
    page: { km: nPage?.km, euros: nPage?.euros, texte: nPage?.texte },
    pendantMort: { km: nT?.km, euros: nT?.euros, texte: nT?.texte },
    ecartKmPct: nNat?.km && nPage?.km ? +((100 * Math.abs(nNat.km - nPage.km)) / nPage.km).toFixed(2) : null,
    ecartEurosPct: nNat?.euros && nPage?.euros ? +((100 * Math.abs(nNat.euros - nPage.euros)) / nPage.euros).toFixed(2) : null,
  };
  constat("V-3.3 appli morte : la notification continue, calculée par le service (km qui montent)", nT?.km != null && nNat?.km != null && nNat.km > nT.km, `${nT?.texte} → ${nNat?.texte}`);
  constat("écart km direct natif (service, page absente) / direct de la page (rouverte) < 3 %", mesures.ecartNatif.ecartKmPct != null && mesures.ecartNatif.ecartKmPct < 3, `${nNat?.km} km vs ${nPage?.km} km → ${mesures.ecartNatif.ecartKmPct} %`);
  constat("écart € direct natif / direct de la page < 5 %", mesures.ecartNatif.ecartEurosPct != null && mesures.ecartNatif.ecartEurosPct < 5, `${nNat?.euros} € vs ${nPage?.euros} € → ${mesures.ecartNatif.ecartEurosPct} %`);

  // V-3.5 — Arrêter dans l'appli : fin de trajet
  const iFin2 = lect.i;
  await p.locator('[data-el="bouton-arreter"]').click();
  await p.waitForURL(/\/fin$/, { timeout: 20000 });
  await p.locator('[data-el="titre-trajet"][data-noms="oui"]').waitFor({ timeout: 20000 }).catch(() => undefined);
  capture("V-3.5-A18-fin-appli");
  constat("V-3.5 Arrêter dans l'appli ouvre la fin de trajet", /\/fin$/.test(p.url()), await p.locator('[data-el="titre-trajet"]').innerText());
  // HIGH 1 de l'audit r1 : le trajet 1 (bascules d'appli, écran éteint, volet) et le trajet 2 (appli tuée) consomment pareil
  const km2 = Number(await p.locator('[data-el="fin-km"]').getAttribute("data-km"));
  const l2 = Number(await p.locator('[data-el="fin-litres"]').getAttribute("data-litres"));
  const c = mesures.conso;
  c.trajet2 = { km: km2, litres: l2, l100: +((l2 / km2) * 100).toFixed(2), reference: reference(lect, iDebut2, iFin2) };
  for (const k of ["trajet1", "trajet2"]) c[k].ecartReferencePct = +((100 * (c[k].l100 - c[k].reference.l100)) / c[k].reference.l100).toFixed(1);
  c.ecartPct = +((100 * Math.abs(c.trajet1.l100 - c.trajet2.l100)) / c.trajet2.l100).toFixed(1);
  // les deux trajets ne roulent pas sur le même tronçon : on compare aussi chacun à roule.ts sur son tronçon du GPX
  constat("consommation du trajet 1 = celle du trajet 2 à ±10 %", c.ecartPct <= 10, `${c.trajet1.l100} L/100 (${c.trajet1.km.toFixed(2)} km) vs ${c.trajet2.l100} L/100 (${km2.toFixed(2)} km) → ${c.ecartPct} %`);
  constat("chaque trajet = roule.ts sur son tronçon du GPX (heures du GPX) à ±10 %", Math.abs(c.trajet1.ecartReferencePct) <= 10 && Math.abs(c.trajet2.ecartReferencePct) <= 10, `trajet 1 : ${c.trajet1.l100} vs ${c.trajet1.reference.l100} L/100 (${c.trajet1.ecartReferencePct} %) ; trajet 2 : ${c.trajet2.l100} vs ${c.trajet2.reference.l100} L/100 (${c.trajet2.ecartReferencePct} %)`);
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

// =====================================================================================================================
async function fini() {
  // V-3.E1 c2 — garé 10 min, écran éteint, puis « C'est fini » depuis la notification : la fin est datée du début de l'immobilité
  const { lect, p } = await preparer("albi-toulouse-immobile-11min.gpx", 700, "test");
  await demarrer(p, lect);
  await pause(20000);
  shOk("input keyevent 3");
  shOk("input keyevent 223");
  const debutAttente = Date.now();
  let nI = null;
  while (Date.now() - debutAttente < 14 * 60000) {
    await pause(10000);
    nI = lireNotif();
    if (nI?.titre?.startsWith("Immobile")) break;
  }
  const eI = await lireEnCours(p);
  journal(`immobile : seconde du rejeu ${lect.s}, immobile depuis ${eI?.immobile}`);
  shOk("input keyevent 224");
  shOk("wm dismiss-keyguard");
  await pause(2000);
  await volet();
  noterNotif("immobile (avant C'est fini)");
  capture("V-3.E1-A34-cest-fini-notif");
  const t = await toucher(texteEst(/^C'est fini$/i), "C'est fini de la notification");
  await p.waitForURL(/\/fin$/, { timeout: 30000 }).catch(() => undefined);
  await p.locator('[data-el="titre-trajet"][data-noms="oui"]').waitFor({ timeout: 20000 }).catch(() => undefined);
  await pause(1500);
  capture("V-3.E1-A35-fin-cest-fini");
  const arrete = await p.evaluate(
    () =>
      new Promise((ok) => {
        const q = indexedDB.open("plein-et-trajet");
        q.onerror = () => ok(null);
        q.onsuccess = () => {
          const r = q.result.transaction("en_cours").objectStore("en_cours").get("arrete");
          r.onsuccess = () => ok(r.result ?? null);
          r.onerror = () => ok(null);
        };
      }),
  );
  mesures.cestFini = { immobileDepuis: eI?.immobile, debut: eI?.debut, fin: arrete?.fin, dureeS: arrete?.duree_s, attenduS: eI ? (eI.immobile - eI.debut) / 1000 : null, sousTitre: await p.locator('[data-el="sous-titre-trajet"]').innerText().catch(() => null) };
  constat("V-3.E1 « C'est fini » depuis la notification : l'appli s'ouvre sur la fin de trajet", !!t && /\/fin$/.test(p.url()) && premierPlan().includes(PKG), `${p.url()} | ${premierPlan()}`);
  constat("V-3.E1 fin datée du début de l'immobilité (pas de l'instant du toucher)", eI?.immobile != null && arrete?.fin === eI.immobile && Math.abs(arrete.duree_s - (eI.immobile - eI.debut) / 1000) <= 1, `fin ${arrete?.fin} = immobile depuis ${eI?.immobile} ; durée ${arrete?.duree_s} s (attendu ${mesures.cestFini.attenduS} s) ; ${mesures.cestFini.sousTitre}`);
  await p.locator('[data-el="supprimer-neuf"]').click();
  await lect.arreter();
}

try {
  journal(`scénario ${SCENARIO} — écran ${ecranEtat()} — Maps ${shOk(`pm path ${MAPS}`) || "absent"}`);
  journal(`adb root : ${racine ? "oui" : "non"} ; APK installé : ${shOk(`dumpsys package ${PKG} | grep -E 'versionName|pkgFlags' | head -2`).replace(/\s+/g, " ")}`);
  if (SCENARIO === "principal") await principal();
  else if (SCENARIO === "fini") await fini();
  else await immobile();
} catch (e) {
  constat("scénario sans exception", false, String(e?.stack ?? e).slice(0, 600));
  try {
    capture(`echec-${SCENARIO}`);
  } catch {}
}
finir();
