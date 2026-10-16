#!/bin/bash
S=$(cd "$(dirname "$0")" && pwd); cd ~/Developer/the-pantry-v2-b04-sB
F=scripts/data/house-recipes/batch-04-B$1.json
python3 $S/fs.py $S/c$1.txt && python3 $S/build.py $S/c$1.txt $F >/dev/null && npx tsx $S/fixdiets.mts $F
npm run -s catalogue:validate -- batch-04-B$1.json 2>&1 | grep -E "^FAIL|^  |Recipes failing|PASS" | cut -c1-260 | head -${2:-40}
