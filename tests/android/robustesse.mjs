// Plan de tests de robustesse (docs/pipeline/plan-tests-robustesse-android.md), niveau 3 : scénarios durs sur l'émulateur.
// Chaque passe : appli réinstallée, autorisations de la VARIANTE, trajet démarré sur un vrai tracé (albi-toulouse.gpx, 1 position
// par seconde par le fournisseur de test « gps »), appli renvoyée en arrière-plan écran éteint, puis la PERTURBATION du scénario,
// une fenêtre d'observation sans rouvrir l'appli, et enfin la réouverture. On mesure là où ça se joue : le journal des relevés
// écrit par le service (files/trajet-en-cours.txt), l'état du service, les notifications, le journal de diagnostic
// (files/diagnostic.txt) et le trajet relu par la page.
// Pièces reprises de tests/android/m6-emulateur.mjs (rejeu GPS par fournisseur de test, uiautomator, WebView par Playwright).
// Usage : node tests/android/robustesse.mjs <scenario> <variante> [sortie] [apk]
//   scénarios : temoin tue forcestop doze restreint revoque gpscoupe notifs reboot maj recents rendu tunnel long
//   variantes : base (précise + notifications + hors optimisation de batterie) | sansbatterie | toujours (base + « Toujours »)
import { execFileSync, spawn } from "node:child_process";
import { appendFileSync, mkdirSync, openSync, readFileSync, writeFileSync } from "node:fs";
import { _android } from "@playwright/test";
import { lireGpx } from "../e2e/exploration/m5-aides.mjs";

const SCENARIO = process.argv[2] ?? "temoin";
const VARIANTE = process.argv[3] ?? "base";
const OUT = process.argv[4] ?? `sortie-robustesse/${SCENARIO}-${VARIANTE}`;
const APK = process.argv[5] ?? "../v1.1.apk";
const PKG = "cloud.ingevision.pleinettrajet";
const NOM = `${SCENARIO}-${VARIANTE}`;
mkdirSync(OUT, { recursive: true });

const adb = (...a) => execFileSync("adb", a, { encoding: "utf8", maxBuffer: 256 << 20, timeout: 180000 }).trim();
const sh = (c) => adb("shell", c);
const shOk = (c) => {
  try {
    return sh(c);
  } catch (e) {
    return `ERREUR ${String(e.message).split("\n")[0]}`;
  }
};
const pause = (ms) => new Promise((r) => setTimeout(r, ms));
const T0 = Date.now();
const journal = (l) => {
  const s = `${String(Math.round((Date.now() - T0) / 1000)).padStart(5)}s ${l}`;
  console.log(s);
  appendFileSync(`${OUT}/journal.txt`, s + "\n");
};
const verdicts = [];
const mesures = { scenario: SCENARIO, variante: VARIANTE };
const constat = (nom, ok, detail = "") => {
  verdicts.push(`${ok ? "OK " : "KO "} ${nom}${detail ? " — " + detail : ""}`);
  journal(verdicts.at(-1));
  return ok;
};
let logcat = null;
let lect = null;
function finir(code) {
  writeFileSync(`${OUT}/verdicts.txt`, verdicts.join("\n") + "\n");
  writeFileSync(`${OUT}/mesures.json`, JSON.stringify(mesures, null, 1));
  try {
    if (lect) lect.actif = false;
    if (shellTest) shellTest.kill();
    logcat?.kill();
  } catch {}
  process.exit(code ?? (verdicts.some((v) => v.startsWith("KO")) ? 1 : 0));
}
setTimeout(() => {
  constat("scénario terminé dans le temps imparti", false, "90 min dépassées");
  finir(2);
}, 90 * 60000).unref();
process.on("uncaughtException", (e) => {
  constat("scénario sans erreur du banc", false, String(e?.stack ?? e).split("\n").slice(0, 3).join(" | "));
  finir(3);
});
process.on("unhandledRejection", (e) => {
  constat("scénario sans erreur du banc", false, String(e?.message ?? e).split("\n")[0]);
  finir(3);
});

function capture(nom) {
  try {
    writeFileSync(`${OUT}/${nom}.png`, execFileSync("adb", ["exec-out", "screencap", "-p"], { maxBuffer: 64 << 20 }));
  } catch {}
}

// ---------- GPS : fournisseur de test « gps », 1 position par seconde, datée ----------
function distM(a, b) {
  const r = Math.PI / 180;
  const x = Math.sin(((b.lat - a.lat) * r) / 2) ** 2 + Math.cos(a.lat * r) * Math.cos(b.lat * r) * Math.sin(((b.lon - a.lon) * r) / 2) ** 2;
  return 2 * 6371000 * Math.asin(Math.sqrt(x));
}
let shellTest = null;
const commeShell = (c) => `su 2000 ${c}`;
function fournisseurTest() {
  for (const c of ["appops set com.android.shell android:mock_location allow", "appops set 2000 android:mock_location allow"]) shOk(c);
  shOk(commeShell("cmd location providers add-test-provider gps 2>&1"));
  shOk(commeShell("cmd location providers set-test-provider-enabled gps true 2>&1"));
  if (shellTest) shellTest.kill();
  // l'ancien shell tué ne doit pas effacer le nouveau en sortant (course constatée au scénario gpscoupe du 24/10)
  const nouveau = spawn("adb", ["shell"], { stdio: ["pipe", "ignore", "ignore"] });
  nouveau.on("exit", () => {
    if (shellTest === nouveau) shellTest = null;
  });
  shellTest = nouveau;
}
let decalage = null;
function mesurerDecalage() {
  let mieux = null;
  for (let k = 0; k < 7; k++) {
    const t1 = Date.now();
    const d = Number(shOk("date +%s%3N"));
    const t2 = Date.now();
    if (Number.isFinite(d) && (!mieux || t2 - t1 < mieux.rtt)) mieux = { rtt: t2 - t1, decalage: d - (t1 + t2) / 2 };
  }
  return mieux?.decalage ?? 0;
}
class Lecteur {
  constructor(pts, depuis) {
    fournisseurTest();
    this.pts = pts.slice(depuis);
    this.i = 0;
    this.roule = false;
    this.silence = false; // tunnel : le fournisseur se tait
    this.actif = true;
    this.envois = 0;
    this.boucle = this.tourner();
  }
  async tourner() {
    const t0 = Date.now();
    let tic = 0;
    while (this.actif) {
      tic++;
      if (this.roule && this.i < this.pts.length - 1) this.i++;
      const p = this.pts[this.i];
      if (!this.silence && shellTest) {
        if (decalage == null) decalage = mesurerDecalage();
        const t = Math.round(t0 + tic * 1000 + decalage);
        try {
          shellTest.stdin.write(`${commeShell("")}cmd location providers set-test-provider-location gps --location ${p.lat.toFixed(6)},${p.lon.toFixed(6)} --accuracy 5 --time ${t}\n`);
          this.envois++;
        } catch {}
      }
      await pause(Math.max(0, t0 + tic * 1000 - Date.now()));
    }
  }
}

// ---------- interface native ----------
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
function notifs() {
  const d = shOk("dumpsys notification --noredact");
  const out = [];
  let i = d.indexOf(`pkg=${PKG} user=`);
  while (i >= 0) {
    const j = d.indexOf("NotificationRecord(", i + 20);
    const bloc = d.slice(i, j > 0 ? j : i + 8000);
    out.push({ titre: bloc.match(/android\.title=String \(([^)]*)\)/)?.[1] ?? null, texte: bloc.match(/android\.text=String \(([^)]*)\)/)?.[1] ?? null, canal: bloc.match(/channel=([\w-]+)/)?.[1] ?? null });
    i = d.indexOf(`pkg=${PKG} user=`, i + 20);
  }
  return out;
}
const ALERTE = /interrompu|bloquée/i; // « Trajet interrompu » (relance refusée) ou « position bloquée » (bridage sans « Toujours »)
const alerte = () => notifs().find((n) => ALERTE.test(n.titre ?? ""));
const notifTrajet = () => notifs().find((n) => !ALERTE.test(n.titre ?? ""));
const pidof = () => {
  const r = shOk(`pidof ${PKG}`);
  return /^\d+$/.test(r.split(" ")[0]) ? r.split(" ")[0] : "";
};
const serviceVivant = () => /TrajetService/.test(shOk(`dumpsys activity services ${PKG}`));
const lire = (f) => shOk(`cat /data/data/${PKG}/files/${f} 2>/dev/null`);
function journalNatif() {
  return lire("trajet-en-cours.txt")
    .split("\n")
    .map((l) => l.trim().split(";"))
    .filter((c) => ["P", "A", "R"].includes(c[0]) && Number.isFinite(+c[1]))
    .map((c) => ({ type: c[0], t: +c[1] }));
}
function diagnostic() {
  return lire("diagnostic.txt")
    .split("\n")
    .filter(Boolean)
    .map((l) => {
      const [t, type, ...r] = l.split(";");
      return { t: +t, type, detail: r.join(";") };
    });
}
/** Plus grand trou entre relevés du journal du service dans [a, b], le dernier relevé d'avant a compris. */
function trou(a, b) {
  const ts = journalNatif().filter((x) => x.type === "P").map((x) => x.t);
  const avant = ts.filter((t) => t < a).at(-1);
  const dans = [...(avant != null ? [avant] : []), ...ts.filter((t) => t >= a && t <= b)];
  let max = 0;
  for (let k = 1; k < dans.length; k++) max = Math.max(max, dans[k] - dans[k - 1]);
  const dernier = dans.at(-1);
  if (dernier != null) max = Math.max(max, b - dernier); // un enregistrement mort jusqu'au bout de la fenêtre compte
  return { points: dans.length - (avant != null ? 1 : 0), maxS: Math.round(max / 100) / 10 };
}

// ---------- WebView ----------
let appareil = null;
async function page() {
  if (!appareil) {
    const tous = await _android.devices();
    appareil = tous.find((x) => !process.env.ANDROID_SERIAL || x.serial() === process.env.ANDROID_SERIAL) ?? tous[0];
  }
  for (let k = 0; k < 60; k++) {
    const pid = Number(pidof()) || null;
    // la DERNIÈRE vue du processus : après la perte du moteur de rendu, l'ancienne page fermée reste listée (scénario rendu, 24/10)
    const vue = pid && appareil.webViews().filter((w) => w.pkg() === PKG && w.pid() === pid).at(-1);
    if (vue) {
      const pg = await vue.page();
      if (await pg.evaluate(() => 1).then(() => true, () => false)) return pg;
    }
    await pause(1000);
  }
  throw new Error("WebView de l'appli introuvable");
}
const lancer = () => shOk(`am start -n ${PKG}/.MainActivity -a android.intent.action.MAIN -c android.intent.category.LAUNCHER --ez pt_inspecter true`);
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

// ---------- préparation ----------
async function preparer() {
  adb("root");
  await pause(2000);
  adb("wait-for-device");
  shOk("input keyevent KEYCODE_WAKEUP");
  shOk("wm dismiss-keyguard");
  shOk("settings put global stay_on_while_plugged_in 0");
  shOk("dumpsys battery reset");
  shOk(`pm uninstall ${PKG}`);
  journal(`installation : ${adb("install", "-r", APK).split("\n").at(-1)}`);
  const perms = ["android.permission.ACCESS_FINE_LOCATION", "android.permission.ACCESS_COARSE_LOCATION", "android.permission.POST_NOTIFICATIONS"];
  if (VARIANTE === "toujours") perms.push("android.permission.ACCESS_BACKGROUND_LOCATION");
  for (const x of perms) shOk(`pm grant ${PKG} ${x}`);
  if (VARIANTE !== "sansbatterie") shOk(`dumpsys deviceidle whitelist +${PKG}`);
  mesures.etatDepart = { perms, horsOptimisation: shOk("dumpsys deviceidle whitelist").includes(PKG) };
  shOk("logcat -G 16M");
  shOk("logcat -c");
  logcat = spawn("adb", ["logcat", "-v", "threadtime"], { stdio: ["ignore", openSync(`${OUT}/logcat.txt`, "w"), "ignore"] });
  const voiture = JSON.parse(readFileSync(new URL("./voiture-5RBU0C.json", import.meta.url), "utf8"));
  lect = new Lecteur(lireGpx("albi-toulouse.gpx"), 700);
  for (let essai = 1; ; essai++) {
    try {
      lancer();
      const p = await page();
      await p.waitForLoadState();
      await p.evaluate((v) => {
        localStorage.setItem("pt-voiture-v1", JSON.stringify(v));
        localStorage.setItem("pt-batterie-proposee", "1");
      }, voiture);
      await p.reload();
      await p.locator('[data-el="bouton-demarrer"]').waitFor({ timeout: 30000 });
      return p;
    } catch (e) {
      if (essai >= 3) throw e;
      journal(`ouverture ${essai} perdue (${String(e.message).split("\n")[0]})`);
      await pause(8000);
    }
  }
}
async function demarrer(p) {
  lect.roule = true;
  await p.locator('[data-el="bouton-demarrer"]').click();
  const toujours = p.locator('[data-el="proposer-toujours"]');
  const vu = await toujours.waitFor({ timeout: 5000 }).then(() => true, () => false);
  mesures.proposerToujours = vu;
  if (VARIANTE === "toujours") constat("« Toujours » déjà accordée : pas de proposition au Démarrer", !vu);
  else constat("« Toujours » manquante : l'appli la propose au Démarrer", vu);
  if (vu) {
    capture("proposer-toujours");
    await p.locator('[data-el="toujours-plus-tard"]').click();
  }
  await p.waitForURL(/\/en-route$/, { timeout: 60000 });
  await pause(40000);
  const e = await lireEnCours(p);
  mesures.trajetId = e?.id;
  constat("trajet démarré : relevés écrits par le service", trou(Date.now() - 30000, Date.now()).points >= 20, `${trou(Date.now() - 30000, Date.now()).points} relevés en 30 s`);
}
function arrierePlan() {
  shOk("input keyevent KEYCODE_HOME");
  shOk("input keyevent KEYCODE_SLEEP");
}

// ---------- scénarios ----------
// Chacun rend { fenetreMs, attendu } après avoir lancé sa perturbation ; la fenêtre d'observation commence à tP.
const scenarios = {
  async temoin() {
    return { fenetreMs: 5 * 60000, attendu: "continu" };
  },
  async tue() {
    // le système tue l'appli faute de mémoire : SIGKILL ; personne ne la rouvre pendant 3 min
    const pid = pidof();
    journal(`SIGKILL ${pid} → ${shOk(`kill -9 ${pid}`) || "ok"}`);
    return { fenetreMs: 3 * 60000, attendu: "relance" };
  },
  async forcestop() {
    // ce que font les surcouches agressives (et « Forcer l'arrêt ») : tout est arrêté, aucune relance possible
    journal(`am force-stop → ${shOk(`am force-stop ${PKG}`) || "ok"}`);
    return { fenetreMs: 2 * 60000, attendu: "arret-inevitable" };
  },
  async doze() {
    shOk("dumpsys battery unplug");
    shOk("dumpsys deviceidle enable deep");
    journal(`force-idle → ${shOk("dumpsys deviceidle force-idle deep")}`);
    return { fenetreMs: 15 * 60000, attendu: "continu", pendant: () => shOk("dumpsys deviceidle step deep") };
  },
  async restreint() {
    shOk("dumpsys battery unplug");
    journal(`fond restreint → ${shOk(`cmd appops set ${PKG} RUN_ANY_IN_BACKGROUND ignore`) || "ok"} | compartiment restricted → ${shOk(`am set-standby-bucket ${PKG} restricted`) || "ok"}`);
    return { fenetreMs: 10 * 60000, attendu: "continu-ou-signale" };
  },
  async revoque() {
    journal(`localisation retirée → ${shOk(`pm revoke ${PKG} android.permission.ACCESS_FINE_LOCATION`) || "ok"} ${shOk(`pm revoke ${PKG} android.permission.ACCESS_COARSE_LOCATION`) || "ok"}`);
    return { fenetreMs: 90000, attendu: "arret-inevitable" };
  },
  async gpscoupe() {
    journal(`localisation du téléphone coupée → ${shOk("cmd location set-location-enabled false") || "ok"}`);
    await pause(60000);
    journal(`remise → ${shOk("cmd location set-location-enabled true") || "ok"}`);
    fournisseurTest();
    return { fenetreMs: 3 * 60000, attendu: "trou-puis-reprise", trouToléréS: 75 };
  },
  async notifs() {
    journal(`notifications retirées → ${shOk(`pm revoke ${PKG} android.permission.POST_NOTIFICATIONS`) || "ok"}`);
    return { fenetreMs: 3 * 60000, attendu: "continu-ou-signale" };
  },
  async reboot() {
    lect.actif = false;
    journal("redémarrage du téléphone");
    shOk("reboot");
    await pause(15000);
    adb("wait-for-device");
    for (let k = 0; k < 60 && shOk("getprop sys.boot_completed") !== "1"; k++) await pause(3000);
    adb("root");
    await pause(3000);
    adb("wait-for-device");
    lect = new Lecteur(lireGpx("albi-toulouse.gpx"), 900);
    lect.roule = true;
    appareil = null; // l'appareil vu par Playwright avant le redémarrage n'existe plus
    shOk("input keyevent KEYCODE_WAKEUP");
    shOk("wm dismiss-keyguard");
    return { fenetreMs: 2 * 60000, attendu: "arret-inevitable" };
  },
  async maj() {
    journal(`mise à jour en route : ${adb("install", "-r", APK).split("\n").at(-1)}`);
    return { fenetreMs: 2 * 60000, attendu: "arret-inevitable" };
  },
  async recents() {
    lancer();
    await pause(3000);
    const tache = shOk(`dumpsys activity recents | grep -m1 -E "Recent #0.*${PKG}"`).match(/#(\d+)\s*:?\s*(?:type|mUserId|A=)/)?.[1] ?? shOk(`am stack list | grep -m1 ${PKG}`).match(/taskId=(\d+)/)?.[1];
    journal(`tâche ${tache} retirée des récents → ${shOk(`cmd activity task remove ${tache}`) || shOk(`am stack remove ${tache}`) || "ok"}`);
    arrierePlan();
    return { fenetreMs: 3 * 60000, attendu: "continu" };
  },
  async rendu() {
    const r = shOk(`ps -A -o PID,NAME | grep -E "${PKG}:sandboxed|webview.*sandbox|isolated" | head -3`);
    journal(`processus de rendu : ${r.replace(/\s+/g, " ")}`);
    for (const pid of r.split("\n").map((l) => l.trim().split(/\s+/)[0]).filter((x) => /^\d+$/.test(x))) shOk(`kill -9 ${pid}`);
    return { fenetreMs: 2 * 60000, attendu: "continu" };
  },
  async tunnel() {
    lect.silence = true;
    journal("tunnel : plus aucune position pendant 3 min");
    await pause(180000);
    lect.silence = false;
    return { fenetreMs: 2 * 60000, attendu: "trou-puis-reprise", trouToléréS: 185 };
  },
  async long() {
    shOk("dumpsys battery unplug");
    return { fenetreMs: 60 * 60000, attendu: "continu" };
  },
};

// =====================================================================================================================
const s = scenarios[SCENARIO];
if (!s) {
  console.error(`scénario inconnu : ${SCENARIO}`);
  process.exit(4);
}
journal(`=== ${NOM} — Android ${shOk("getprop ro.build.version.release")} (${shOk("getprop ro.build.version.sdk")}) — APK ${APK}`);
let p = await preparer().catch((e) => {
  constat("préparation de l'appli (banc)", false, String(e?.message ?? e).split("\n")[0]);
  finir(3);
});
await demarrer(p);
arrierePlan();
await pause(20000);
const pidAvant = pidof();
const tP = Date.now();
const r = await s();
mesures.attendu = r.attendu;
const tFin = tP + r.fenetreMs;
let alerteVue = null;
let pidApres = "";
while (Date.now() < tFin) {
  r.pendant?.();
  alerteVue ??= alerte() ?? null;
  const pid = pidof();
  if (pid && pid !== pidAvant) pidApres = pid;
  await pause(15000);
}
const tO = Date.now();
const t = trou(tP - 10000, tO);
const d = diagnostic();
mesures.fenetre = { s: (tO - tP) / 1000, pidAvant, pidApres, serviceVivant: serviceVivant(), notifTrajet: notifTrajet() ?? null, alerte: alerteVue, trou: t };
journal(`fenêtre : ${JSON.stringify(mesures.fenetre)}`);
capture("fin-fenetre");

// réouverture : le trajet est-il toujours là, le diagnostic dit-il ce qui s'est passé ?
shOk("input keyevent KEYCODE_WAKEUP");
shOk("wm dismiss-keyguard");
if (SCENARIO === "revoque") for (const x of ["ACCESS_FINE_LOCATION", "ACCESS_COARSE_LOCATION"]) shOk(`pm grant ${PKG} android.permission.${x}`);
lancer();
p = await page();
await p.waitForURL(/\/en-route$/, { timeout: 30000 }).catch(() => undefined);
await pause(15000);
const apres = await lireEnCours(p).catch(() => null);
const d2 = diagnostic();
writeFileSync(`${OUT}/diagnostic.txt`, lire("diagnostic.txt"));
writeFileSync(`${OUT}/trajet-en-cours.txt`, lire("trajet-en-cours.txt"));
capture("reouverture");
const morts = d2.filter((x) => x.type === "MORT").map((x) => x.detail.match(/raison=(\S+)/)?.[1]);
mesures.reouverture = { url: p.url(), memeTrajet: apres?.id === mesures.trajetId, points: apres?.points?.length ?? null, morts, envoi: d2.some((x) => x.type === "ENVOI"), types: [...new Set(d2.map((x) => x.type))] };
journal(`réouverture : ${JSON.stringify(mesures.reouverture)}`);

// verdicts
constat("trajet gardé et repris à la réouverture", mesures.reouverture.memeTrajet && /en-route/.test(p.url()), `${p.url()} | même trajet ${mesures.reouverture.memeTrajet}`);
constat("diagnostic tenu (création, démarrage, GPS, battement de vie)", ["SERVICE", "GPS", "VIE"].every((x) => d2.some((y) => y.type === x)), mesures.reouverture.types.join(","));
// une notification « Trajet en cours » qui reste affichée alors que rien ne s'enregistre n'est PAS un signal (constaté au scénario
// restreint du 24/10 : 596 s sans relevé, notification toujours là) ; seule l'alerte « Trajet interrompu » prévient
const silencieux = t.maxS > 10 && !alerteVue;
if (r.attendu === "continu") constat(`enregistrement continu pendant la perturbation (trou max ≤ 5 s)`, t.maxS <= 5, `trou max ${t.maxS} s, ${t.points} relevés`);
else if (r.attendu === "relance") constat("appli tuée : le service repart seul, trou ≤ 30 s, ou alerte « Trajet interrompu »", t.maxS <= 30 || !!alerteVue, `trou max ${t.maxS} s | relancé ${pidApres || "non"} | alerte ${alerteVue ? "oui" : "non"}`);
else if (r.attendu === "trou-puis-reprise") constat(`trou attendu puis reprise seule (trou ≤ ${r.trouToléréS} s)`, t.maxS <= r.trouToléréS, `trou max ${t.maxS} s`);
else if (r.attendu === "continu-ou-signale") constat("continu, ou arrêt signalé par l'alerte (jamais silencieux)", t.maxS <= 5 || !silencieux, `trou max ${t.maxS} s | alerte ${alerteVue ? "oui" : "non"} | notif trajet ${JSON.stringify(mesures.fenetre.notifTrajet?.titre ?? null)}`);
else if (r.attendu === "arret-inevitable") constat("arrêt inévitable : raison lisible au diagnostic et trajet gardé", (morts.length > 0 || d2.some((x) => x.type === "ALERTE" || x.type === "ERREUR")) && mesures.reouverture.memeTrajet, `morts ${morts.join(",") || "aucune"} | trou ${t.maxS} s`);
constat("pas d'arrêt silencieux (trou > 10 s sans alerte « Trajet interrompu »)", ["arret-inevitable", "trou-puis-reprise"].includes(r.attendu) || !silencieux, `trou ${t.maxS} s`);
finir();
