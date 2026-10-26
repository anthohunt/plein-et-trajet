#!/usr/bin/env python3
"""Jalon 6 — contrôles de l'APK de release, joués par le job `apk` (GitHub Actions).

1. Signature : `apksigner verify --print-certs` ; l'empreinte SHA-256 du certificat doit être celle du magasin de clés
   (calculée sur le VPS depuis le .p12, notée dans docs/pipeline/m6-journal.md, passée ici par EMPREINTE_SHA256).
2. Manifeste fusionné (`aapt2 dump xmltree`) : FOREGROUND_SERVICE, FOREGROUND_SERVICE_LOCATION, ACCESS_FINE_LOCATION,
   POST_NOTIFICATIONS, REQUEST_IGNORE_BATTERY_OPTIMIZATIONS (round 2), le service .TrajetService avec foregroundServiceType
   « location » (0x8), et PAS d'ACCESS_BACKGROUND_LOCATION.
Usage : controle-apk.py <apk> <rapport>   (sortie 1 si un contrôle échoue)
"""
import glob
import os
import re
import subprocess
import sys

apk, rapport = sys.argv[1], sys.argv[2]
attendu = os.environ["EMPREINTE_SHA256"].lower().replace(":", "")
sdk = os.environ.get("ANDROID_HOME") or os.environ["ANDROID_SDK_ROOT"]
outils = sorted(glob.glob(f"{sdk}/build-tools/*"), key=lambda d: [int(x) if x.isdigit() else 0 for x in re.split(r"[.-]", os.path.basename(d))])[-1]
lignes, ko = [f"build-tools : {outils}", f"APK : {apk}"], []


def constat(nom, ok, detail=""):
    lignes.append(f"{'OK ' if ok else 'KO '} {nom}" + (f" — {detail}" if detail else ""))
    if not ok:
        ko.append(nom)


sig = subprocess.run([f"{outils}/apksigner", "verify", "--verbose", "--print-certs", apk], capture_output=True, text=True)
lignes += ["", "$ apksigner verify --verbose --print-certs", sig.stdout.strip(), sig.stderr.strip(), ""]
empreintes = re.findall(r"certificate SHA-256 digest: ([0-9a-f]+)", sig.stdout)
constat("APK signé (apksigner verify)", sig.returncode == 0, f"code {sig.returncode}")
constat("empreinte SHA-256 du certificat = celle du magasin de clés", empreintes == [attendu], f"{empreintes} / attendu {attendu}")

xml = subprocess.run([f"{outils}/aapt2", "dump", "xmltree", "--file", "AndroidManifest.xml", apk], capture_output=True, text=True, check=True).stdout
with open(os.path.splitext(rapport)[0] + "-manifeste.txt", "w") as f:
    f.write(xml)

# éléments du manifeste : (nom, attributs) — un attribut est une ligne « A: …:nom(0x…)=valeur » sous sa ligne « E: »
elements = []
for l in xml.splitlines():
    m = re.match(r"\s*E: ([\w-]+)", l)
    if m:
        elements.append((m.group(1), {}))
        continue
    a = re.match(r"\s*A: (?:[^:]+:)*?(?:http://schemas.android.com/apk/res/android:)?([\w]+)\(0x[0-9a-f]+\)=(.*)", l)
    if a and elements:
        elements[-1][1][a.group(1)] = a.group(2)

permissions = sorted({re.sub(r'^"|".*$', "", at.get("name", "")) for n, at in elements if n == "uses-permission"})
lignes += ["permissions : " + ", ".join(permissions), ""]
for p in ["FOREGROUND_SERVICE", "FOREGROUND_SERVICE_LOCATION", "ACCESS_FINE_LOCATION", "POST_NOTIFICATIONS", "REQUEST_IGNORE_BATTERY_OPTIMIZATIONS"]:
    constat(f"permission {p}", f"android.permission.{p}" in permissions)
constat("PAS de ACCESS_BACKGROUND_LOCATION", "android.permission.ACCESS_BACKGROUND_LOCATION" not in permissions)

services = [(re.sub(r'^"|".*$', "", at.get("name", "")), at.get("foregroundServiceType", "")) for n, at in elements if n == "service"]
lignes += ["services : " + "; ".join(f"{s} foregroundServiceType={t or '—'}" for s, t in services), ""]
# foregroundServiceType est un drapeau : « location » vaut 0x8
loc = [s for s, t in services if re.search(r"0x0*8\b|location", t)]
constat("service de premier plan foregroundServiceType=location", bool(loc), ", ".join(loc) or "aucun")
constat("le service de localisation est TrajetService (seul)", loc == ["org.example.pleinettrajet.TrajetService"], ", ".join(loc) or "aucun")

with open(rapport, "w") as f:
    f.write("\n".join(lignes) + "\n")
print("\n".join(lignes))
sys.exit(1 if ko else 0)
