#!/bin/bash
# usage: _chk.sh A41  -> fix diets, show non-nutrition fails, list nutrition-only ids
cd ~/Developer/the-pantry-v2-b04-sA
f=batch-04-$1.json
node scripts/_fixdiets.mjs $f
npm run -s catalogue:validate -- $f 2>&1 > /tmp/v_$1.txt
grep -E "^FAIL" /tmp/v_$1.txt | grep -v "\[nutrition\]" | cut -c1-230
grep -E "PASS [0-9]" /tmp/v_$1.txt
grep -E "^FAIL.*\[nutrition\]" /tmp/v_$1.txt | awk '{print $2}' | sort -u > /tmp/nut_$1.txt
