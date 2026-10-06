#!/usr/bin/env bash
# Runs the whole Maestro suite (.maestro/) against The Pantry in Expo Go on the
# iOS Simulator. Double-click it in Finder, or run it from Terminal.
#
# What it does:
#   1. checks Xcode's simulator tools and the Maestro CLI are installed
#   2. restarts an iPhone simulator (iOS 27 by default) so testing starts clean
#   3. installs npm packages if they're missing
#   4. starts its own Metro (port 8082, no questions asked) with Expo Go, and waits for it
#   5. runs every flow and writes the report and screenshots to
#      ~/Desktop/HQ/11-ThePantryV2/.transfer/
#   6. stops the Metro it started
set -uo pipefail

# Finder starts .command files in the home folder, so move to the repo root
# (this script lives in <repo>/scripts).
cd "$(dirname "$0")/.." || exit 1
REPO_ROOT="$(pwd)"

OUT_DIR="$HOME/Desktop/HQ/11-ThePantryV2/.transfer"
REPORT="$OUT_DIR/maestro-report.xml"
TEST_OUTPUT="$OUT_DIR/maestro-output"
METRO_LOG="$OUT_DIR/metro.log"
METRO_PORT=8082
METRO_STATUS_URL="http://127.0.0.1:$METRO_PORT/status"
METRO_PID=""

say() { printf '\n==> %s\n' "$*"; }

finish() {
  local code=$1
  if [ -n "$METRO_PID" ]; then
    say "Stopping Metro"
    # Metro runs in its own process group (see set -m below), so this stops
    # npx and every process it started.
    kill -TERM -- "-$METRO_PID" 2>/dev/null || kill -TERM "$METRO_PID" 2>/dev/null
    wait "$METRO_PID" 2>/dev/null
  fi
  # When double-clicked, keep the window open so the result can be read.
  if [ -t 0 ]; then
    printf '\n'
    read -r -p "Press Return to close this window. " _
  fi
  exit "$code"
}
trap 'finish 130' INT TERM

# Node from nvm, if that's how it was installed. Maestro's installer puts it in ~/.maestro/bin.
if [ -s "$HOME/.nvm/nvm.sh" ]; then
  # shellcheck disable=SC1091
  . "$HOME/.nvm/nvm.sh"
fi
export PATH="$PATH:$HOME/.maestro/bin"

# Maestro needs Java. Homebrew's OpenJDK is "keg-only": installed but not on the
# path, so macOS says "Unable to locate a Java Runtime". Find it and use it.
if ! /usr/libexec/java_home >/dev/null 2>&1; then
  for jdk in /opt/homebrew/opt/openjdk@21 /opt/homebrew/opt/openjdk@17 /opt/homebrew/opt/openjdk /usr/local/opt/openjdk@21 /usr/local/opt/openjdk@17 /usr/local/opt/openjdk; do
    if [ -x "$jdk/bin/java" ]; then
      export JAVA_HOME="$jdk/libexec/openjdk.jdk/Contents/Home"
      [ -d "$JAVA_HOME" ] || export JAVA_HOME="$jdk"
      export PATH="$jdk/bin:$PATH"
      break
    fi
  done
fi

say "Checking the tools"
if ! xcrun --find simctl >/dev/null 2>&1; then
  echo "Xcode isn't installed (or hasn't been opened yet)."
  echo "Install Xcode from the Mac App Store, open it once to finish setting up,"
  echo "then double-click this file again."
  finish 1
fi
if ! command -v maestro >/dev/null 2>&1; then
  echo "Maestro isn't installed. Open Terminal, paste this line and press Return:"
  echo
  echo '  curl -fsSL "https://get.maestro.mobile.dev" | bash'
  echo
  echo "When it finishes, close Terminal and double-click this file again."
  finish 1
fi
if ! java -version >/dev/null 2>&1; then
  echo "Java isn't installed. Open Terminal, paste this line and press Return:"
  echo
  echo '  brew install openjdk@17'
  echo
  echo "Then double-click this file again."
  finish 1
fi
if ! command -v npm >/dev/null 2>&1; then
  echo "Node.js isn't installed. Install Node 22 or later (from nodejs.org or nvm),"
  echo "then double-click this file again."
  finish 1
fi

say "Preparing an iPhone simulator"
echo "Maestro $(maestro --version 2>/dev/null | tail -n 1)"
# Which simulator: PANTRY_SIM_UDID if set, otherwise an iPhone on iOS 27 (the
# version on Lachlan's Mac; PANTRY_IOS=26 picks another), otherwise the first
# iPhone. Maestro 2.x connects to iOS 27 once it's up to date: if it can't,
# update it with  curl -fsSL "https://get.maestro.mobile.dev" | bash
IOS_VERSION="${PANTRY_IOS:-27}"
UDID="${PANTRY_SIM_UDID:-}"
if [ -z "$UDID" ]; then
  UDID="$(xcrun simctl list devices available | awk -v want="-- iOS $IOS_VERSION" 'index($0, want) == 1 {ok=1; next} /^--/ {ok=0} ok && /iPhone/ {print; exit}' | sed -E 's/.*\(([0-9A-Fa-f-]{36})\).*/\1/')"
fi
if [ -z "$UDID" ]; then
  UDID="$(xcrun simctl list devices available | grep -E '^[[:space:]]+iPhone' | tail -n 1 | sed -E 's/.*\(([0-9A-Fa-f-]{36})\).*/\1/')"
  echo "No iOS $IOS_VERSION iPhone simulator found, so using the newest one listed."
fi
if [ -z "$UDID" ]; then
  echo "No iPhone simulator found. In Xcode, open Settings > Components and"
  echo "download an iOS simulator, then double-click this file again."
  finish 1
fi
# Start clean every time: a simulator left running can hold a stale testing
# service, which stops Maestro's helper connecting.
echo "Restarting simulator $UDID ($(xcrun simctl list devices | grep "$UDID" | sed -E 's/^[[:space:]]+//; s/ \(.*//'), iOS $IOS_VERSION)"
xcrun simctl shutdown all >/dev/null 2>&1
xcrun simctl boot "$UDID" || finish 1
xcrun simctl bootstatus "$UDID" -b >/dev/null 2>&1
# Simulator.app lives inside Xcode, so open it by path.
open -a "$(xcode-select -p)/Applications/Simulator.app" 2>/dev/null ||
  open -a /Applications/Xcode.app/Contents/Developer/Applications/Simulator.app 2>/dev/null || true

# Install packages whenever the lock file is newer than what's installed: a pull
# that adds a package (as on 6 October) otherwise leaves the app unable to load,
# and every flow fails on a red error screen.
if [ ! -d "$REPO_ROOT/node_modules" ] || [ "$REPO_ROOT/package-lock.json" -nt "$REPO_ROOT/node_modules/.package-lock.json" ]; then
  say "Installing npm packages"
  npm install || finish 1
fi

mkdir -p "$OUT_DIR"

# The suite always runs against its own Metro on its own port, started
# non-interactively. Sharing the Metro in your Expo window is what broke the
# first runs: that one stops to ask about logging in, and nobody answers.
# A Metro left behind by an earlier run (a closed window, Ctrl+C) still holds
# the port. If what's there is Expo's Metro, stop it; anything else is left
# alone and named.
if curl -fs "$METRO_STATUS_URL" 2>/dev/null | grep -q "packager-status" || lsof -ti "tcp:$METRO_PORT" >/dev/null 2>&1; then
  for pid in $(lsof -ti "tcp:$METRO_PORT" 2>/dev/null); do
    if ps -o command= -p "$pid" | grep -qiE "expo|metro|node"; then
      echo "Stopping a Metro left over from an earlier run (process $pid)"
      kill -TERM "$pid" 2>/dev/null
    fi
  done
  sleep 2
  if lsof -ti "tcp:$METRO_PORT" >/dev/null 2>&1; then
    echo "Something else is using port $METRO_PORT:"
    lsof -i "tcp:$METRO_PORT" | head -n 3
    echo "Close it and try again."
    finish 1
  fi
fi
say "Starting a Metro for the tests on port $METRO_PORT (log: $METRO_LOG)"
# CI=1 makes Expo non-interactive: no questions, anonymous signing.
# --go opens the project in Expo Go, installing Expo Go on the simulator if needed.
# set -m gives the background job its own process group, so it can be stopped as a whole.
set -m
CI=1 npx expo start --go --ios --port "$METRO_PORT" </dev/null >"$METRO_LOG" 2>&1 &
METRO_PID=$!
set +m
echo "Waiting for Metro to answer on $METRO_STATUS_URL"
for _ in $(seq 1 180); do
  if curl -fs "$METRO_STATUS_URL" 2>/dev/null | grep -q "packager-status:running"; then
    break
  fi
  if ! kill -0 "$METRO_PID" 2>/dev/null; then
    echo "Metro stopped before it was ready. The last lines of its log:"
    tail -n 30 "$METRO_LOG"
    METRO_PID=""
    finish 1
  fi
  sleep 1
done
if ! curl -fs "$METRO_STATUS_URL" 2>/dev/null | grep -q "packager-status:running"; then
  echo "Metro didn't start within 3 minutes. The last lines of its log:"
  tail -n 30 "$METRO_LOG"
  finish 1
fi
echo "Waiting for Expo Go on the simulator"
for _ in $(seq 1 240); do
  xcrun simctl listapps booted 2>/dev/null | grep -q "host.exp.Exponent" && break
  sleep 1
done
if ! xcrun simctl listapps booted 2>/dev/null | grep -q "host.exp.Exponent"; then
  echo "Expo Go didn't install on the simulator. The last lines of Metro's log:"
  tail -n 30 "$METRO_LOG"
  finish 1
fi

say "Running the Maestro suite"
# The first run on a freshly booted simulator installs Maestro's helper app
# there, which can take a few minutes; the default wait is too short and the
# run fails before any flow starts ("iOS driver not ready in time"). Wait
# longer, and if it still times out, try once more: the helper is installed
# by then.
export MAESTRO_DRIVER_STARTUP_TIMEOUT=300000
RUN_LOG="$OUT_DIR/maestro-run.log"
RESULT=1
for attempt in 1 2; do
  rm -rf "$TEST_OUTPUT" "$REPORT"
  maestro --device "$UDID" test .maestro/ -e METRO_URL="exp://127.0.0.1:$METRO_PORT" --format junit --output "$REPORT" --test-output-dir "$TEST_OUTPUT" 2>&1 | tee "$RUN_LOG"
  RESULT=${PIPESTATUS[0]}
  if [ "$RESULT" -ne 0 ] && grep -q "iOS driver not ready" "$RUN_LOG" && [ "$attempt" -eq 1 ]; then
    say "Maestro's helper took too long to start. Trying once more"
    sleep 5
    continue
  fi
  break
done

if [ "$RESULT" -eq 0 ]; then
  say "All flows passed."
else
  say "Some flows failed."
fi
echo "Report:      $REPORT"
echo "Screenshots: $TEST_OUTPUT"
finish "$RESULT"
