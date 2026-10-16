#!/bin/bash
# usage: zz-run.sh C04  (source in /private/tmp/claude-501/c/c04.txt)
N=$1; L=$(echo $N | tr A-Z a-z); F=scripts/data/house-recipes/batch-04-$N.json
cd ~/Developer/the-pantry-v2-b04-sC
python3 scripts/zz-build.py /private/tmp/claude-501/c/$L.txt $F >/dev/null
npx tsx scripts/zz-fixdiets.mts $F
NUTRI_DEBUG=1 npm run -s catalogue:validate -- batch-04-$N.json 2>&1 | grep '^NUTRI' > /private/tmp/claude-501/c/nutri.txt
python3 scripts/zz-rescale.py $F /private/tmp/claude-501/c/nutri.txt
npm run -s catalogue:validate -- batch-04-$N.json 2>&1 | grep -E "^(FAIL|PASS|Recipes failing)" | head -${2:-40}
