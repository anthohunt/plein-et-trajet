#!/usr/bin/env bash
# Construit l'APK Android de release signe. Usage : scripts/build-apk.sh
# Variables a definir (voir .env.example) :
#   ANDROID_HOME / ANDROID_SDK_ROOT, JAVA_HOME (JDK 21)
#   ANDROID_KEYSTORE_FILE, ANDROID_KEYSTORE_PASSWORD, ANDROID_KEY_ALIAS (votre magasin de cles : ne jamais le commiter)
#   VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY (dans .env.local)
set -euo pipefail
cd "$(dirname "$0")/.."
: "${ANDROID_HOME:?definir ANDROID_HOME}" "${JAVA_HOME:?definir JAVA_HOME}"
: "${ANDROID_KEYSTORE_FILE:?definir ANDROID_KEYSTORE_FILE}"
export ANDROID_SDK_ROOT="$ANDROID_HOME"
export PATH="$JAVA_HOME/bin:$ANDROID_HOME/platform-tools:$PATH"
[ -f .env.local ] && { set -a; . ./.env.local; set +a; }
export GRADLE_OPTS="${GRADLE_OPTS:--Xmx2g -Dorg.gradle.workers.max=2}"
npm run build
npx cap sync android
cd android
./gradlew assembleRelease testReleaseUnitTest --no-daemon --console=plain
APKSIGNER=$(ls "$ANDROID_HOME"/build-tools/*/apksigner | sort -V | tail -1)
"$APKSIGNER" verify --print-certs app/build/outputs/apk/release/app-release.apk | head -3
sha256sum app/build/outputs/apk/release/app-release.apk
