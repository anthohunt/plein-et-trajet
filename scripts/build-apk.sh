#!/usr/bin/env bash
# Construit l'APK de release signé sur le VPS, sans la CI GitHub (bloquée par la facturation depuis le 22/10/2026).
# Usage : lourd --nom apk scripts/build-apk.sh   → android/app/build/outputs/apk/release/app-release.apk
set -euo pipefail
cd "$(dirname "$0")/.."
export ANDROID_HOME=/home/claude/android-sdk ANDROID_SDK_ROOT=/home/claude/android-sdk JAVA_HOME=/home/claude/android-sdk/jdk
export PATH="$JAVA_HOME/bin:$ANDROID_HOME/platform-tools:$PATH"
set -a; . ./.env.local; . /home/claude/flux/secrets/plein-et-trajet-release.env; set +a
export ANDROID_KEYSTORE_FILE=/home/claude/flux/secrets/plein-et-trajet-release.p12
export GRADLE_OPTS="-Xmx2g -Dorg.gradle.workers.max=2"
npm run build
npx cap sync android
cd android
./gradlew assembleRelease testReleaseUnitTest --no-daemon --console=plain
"$ANDROID_HOME/build-tools/36.0.0/apksigner" verify --print-certs app/build/outputs/apk/release/app-release.apk | head -3
sha256sum app/build/outputs/apk/release/app-release.apk
