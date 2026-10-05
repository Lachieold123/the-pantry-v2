#!/usr/bin/env bash
# Runs the whole Maestro suite (.maestro/) against The Pantry in Expo Go on the
# iOS Simulator. Double-click it in Finder, or run it from Terminal.
#
# What it does:
#   1. checks Xcode's simulator tools and the Maestro CLI are installed
#   2. boots an iPhone simulator if none is running
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

say "Checking for a running iPhone simulator"
if xcrun simctl list devices booted | grep -q "(Booted)"; then
  echo "A simulator is already running."
else
  UDID="$(xcrun simctl list devices available | grep -E '^[[:space:]]+iPhone' | head -n 1 | sed -E 's/.*\(([0-9A-Fa-f-]{36})\).*/\1/')"
  if [ -z "$UDID" ]; then
    echo "No iPhone simulator found. In Xcode, open Settings > Components and"
    echo "download an iOS simulator, then double-click this file again."
    finish 1
  fi
  echo "Booting simulator $UDID"
  xcrun simctl boot "$UDID" || finish 1
  xcrun simctl bootstatus "$UDID" -b >/dev/null 2>&1
fi
# Simulator.app lives inside Xcode, so open it by path.
open -a "$(xcode-select -p)/Applications/Simulator.app" 2>/dev/null ||
  open -a /Applications/Xcode.app/Contents/Developer/Applications/Simulator.app 2>/dev/null || true

if [ ! -d "$REPO_ROOT/node_modules" ]; then
  say "Installing npm packages (first run only)"
  npm install || finish 1
fi

mkdir -p "$OUT_DIR"

# The suite always runs against its own Metro on its own port, started
# non-interactively. Sharing the Metro in your Expo window is what broke the
# first runs: that one stops to ask about logging in, and nobody answers.
if curl -fs "$METRO_STATUS_URL" 2>/dev/null | grep -q "packager-status"; then
  echo "Something is already using port $METRO_PORT. Close the other Maestro run (or whatever uses it) and try again."
  finish 1
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
  maestro test .maestro/ -e METRO_URL="exp://127.0.0.1:$METRO_PORT" --format junit --output "$REPORT" --test-output-dir "$TEST_OUTPUT" 2>&1 | tee "$RUN_LOG"
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
