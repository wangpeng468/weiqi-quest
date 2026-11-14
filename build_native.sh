#!/usr/bin/env bash
# Supply actual Android SDK android.jar and R8/D8 jar. No hand-written DEX.
set -euo pipefail
cd "$(dirname "$0")"
: "${ANDROID_JAR:?Set ANDROID_JAR to an Android API 33+ platform android.jar}"
: "${D8_JAR:?Set D8_JAR to the R8/D8 compiler jar}"
mkdir -p build/classes build/dex
find build/classes -name '*.class' -delete
javac --release 8 -encoding UTF-8 -cp "$ANDROID_JAR" -d build/classes src/org/weiqi/memory/MainActivity.java
jar --create --file build/app-classes.jar -C build/classes .
java -cp "$D8_JAR" com.android.tools.r8.D8 --release --min-api 26 --lib "$ANDROID_JAR" --output build/dex build/app-classes.jar
cp build/dex/classes.dex classes.dex
python package_apk.py
