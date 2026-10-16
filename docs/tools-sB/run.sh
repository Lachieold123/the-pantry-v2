#!/bin/bash
# usage: run.sh NN  (chunk file c$NN.txt -> batch-04-B$NN.json)
S=/private/tmp/claude-501/-Users-lachlanoldfield-telegram-bot/d976cd07-caa7-4382-85a6-af608edc7c1e/scratchpad; cd ~/Developer/the-pantry-v2-b04-sB
python3 $S/build.py $S/c$1.txt scripts/data/house-recipes/batch-04-B$1.json >/dev/null && npx tsx $S/fixdiets.mts scripts/data/house-recipes/batch-04-B$1.json
npm run -s catalogue:validate -- batch-04-B$1.json 2>&1 | grep -E "^FAIL|^PASS|Recipes failing"
