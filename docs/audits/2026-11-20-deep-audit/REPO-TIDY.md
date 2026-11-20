# REPO-TIDY: worktrees and branches (REPO-16, REPO-17)

Written 20 Nov 2026. Nothing was deleted. "Contained" means `git branch --merged audit/deep-1120` lists it (every commit is already in the audit branch). The audit branch is itself not pushed (REPO-1), so push it before removing anything below: until then it is the only home of this history.

Not checked: whether each worktree folder has uncommitted files (the audit rule was read-only, and so is this). Run `git status --short` inside a folder before removing it.

## Worktrees (18)

| Folder | Branch (last commit) | In audit/deep-1120? | Recommendation |
|---|---|---|---|
| `~/Developer/the-pantry-v2` (repo root) | house-recipes-batch-01 (8 Oct) | yes | Keep: it is the main checkout the other worktrees hang off. Move it onto the branch you work from. |
| `the-pantry-v2-b04-merge` | house-recipes-batch-04-merge (17 Oct) | yes | Safe to remove once its folder is clean |
| `the-pantry-v2-b04-sA` | house-recipes-batch-04-sA (17 Oct) | yes | Safe to remove once clean |
| `the-pantry-v2-b04-sB` | house-recipes-batch-04-sB (17 Oct) | yes | Safe to remove once clean |
| `the-pantry-v2-b04-sC` | house-recipes-batch-04-sC (17 Oct) | yes | Safe to remove once clean |
| `the-pantry-v2-batch03` | house-recipes-batch-03 (12 Oct) | yes | Safe to remove once clean |
| `the-pantry-v2-batch04` | house-recipes-batch-04 (17 Oct) | yes | Safe to remove once clean |
| `the-pantry-v2-home-engine` | feature/home-engine (12 Oct) | yes | Safe to remove once clean |
| `the-pantry-v2-main` | main (17 Oct) | yes | Keep until main is brought up to date (it is the branch GitHub follows), then it is the working folder for main |
| `the-pantry-v2-overnight` | overnight/pantry-code-items (21 Oct) | yes | Safe to remove once clean |
| `the-pantry-v2-polish` | phase9-polish-audit-fixes (8 Oct) | yes (also on origin) | Safe to remove |
| `the-pantry-v2-preview` | preview-2026-10-08 (8 Oct) | yes (also on origin) | Safe to remove (its Metro log is the stale `expo-preview.log`) |
| `.claude/worktrees/agent-a6b1f078d88b29cbc` | cloud/07-source-link (12 Oct) | yes | Safe to remove once clean |
| `.claude/worktrees/agent-abe2967c33d9978b1` | cloud/11-deps (7 Oct) | yes | Safe to remove once clean |
| `.claude/worktrees/agent-ac0387532af91653e` | cloud/02-p5-cupboard (7 Oct) | yes | Safe to remove once clean |
| `.claude/worktrees/agent-ac2e37f73ad229589` | k38-paywall-terms (12 Oct) | yes | Safe to remove once clean |
| `.claude/worktrees/agent-af882234797ea88e9` | worktree-agent-af882234797ea88e9 (7 Oct) | yes | Safe to remove once clean |
| `.claude/worktrees/audit-1120` | audit/deep-1120 (today) | n/a | Keep: the audit work. Push it. |

## Local branches without a worktree

Upstream column: whether the branch exists on origin (pushed).

| Branch | Last commit | On origin? | In audit? | Recommendation |
|---|---|---|---|---|
| cloud/01-integration-check | 8 Oct | yes | yes | Safe to remove |
| cloud/03-p6-library | 12 Oct | yes | yes | Safe to remove |
| cloud/04-p7-onboarding | 12 Oct | yes | yes | Safe to remove |
| cloud/05-photo-size | 12 Oct | yes | yes | Safe to remove |
| cloud/06-credit-links | 12 Oct | yes | yes | Safe to remove |
| cloud/08-paywall-terms | 8 Oct | no | yes | Safe to remove (same work lives on as k38-paywall-terms) |
| cloud/09-sync-migrations | 12 Oct | yes | yes | Safe to remove |
| cloud/10-legal-drafts | 12 Oct | yes | yes | Safe to remove |
| cloud/12-feed | 12 Oct | yes | yes | Safe to remove |
| worktree-agent-a2d13d421ad98721e, a472cf97c39c73464, a5177a520e6730676, a919b08d371605c45, aa9e94bba57ebcd34, adef86cb4bcc5b47b | 7 Oct | no | yes | Safe to remove |
| worktree-agent-abe2967c33d9978b1, ac0387532af91653e, af882234797ea88e9 | 7 Oct | no | yes | Safe to remove, but the worktree folder above uses cloud/11-deps, cloud/02-p5-cupboard and its own name; remove the folder first |
| **worktree-agent-a6b1f078d88b29cbc** | 12 Oct | no | **no** (1 commit: `21e769c`) | Holds unique work: keep until docs fixer settles REPO-9. The commit is a parked copy of `docs/launch/APP-STORE-LISTING.md` (95 lines added, 141 removed). |
| **worktree-agent-a7835262a4f8f1885** | 12 Oct | no | **no** (1 commit: `2e196dd`) | Holds unique work: same parked listing file (REPO-9). Keep for now. |
| **worktree-agent-ac2e37f73ad229589** | 12 Oct | no | **no** (1 commit: `cd968c9`) | Holds unique work: same parked listing file (REPO-9). Keep for now. |

All three unmerged branches carry the same single-file change, a draft of the App Store listing. After the docs fixer decides which listing wins (REPO-9), they can go.

Also seen: local branches `main` (17 Oct, tracks origin/main), `house-recipes-batch-01`, `house-recipes-batch-03`, `house-recipes-batch-04` (and `-merge`, `-sA/B/C`), `feature/home-engine`, `overnight/pantry-code-items`, `phase9-polish-audit-fixes`, `preview-2026-10-08`: all contained in the audit branch (see worktree table). Before deleting `house-recipes-batch-03/04*`, `feature/home-engine` and `overnight/...` (no upstream), push `audit/deep-1120` so the commits exist on GitHub.

## Unused exports (not edited; `src/` belongs to another fixer)

- `plainKitchen`: `src/domain/testing/fixtures.ts:21`
- `purchasesConfigured`: `src/lib/purchases.ts:72`
- `refreshToday`: `src/lib/today.ts:60`

## Mac leftovers (REPO-17)

- `~/Developer/expo-preview.pid` holds `11446`; `ps` shows no such process. It sits in `~/Developer/`, not inside a repo folder, so it was **not** moved to the Bin (the rule was repo folders only). It and `expo-preview.log` (9 Oct, a tunnel run of the `-preview` worktree) are dead; safe for Lachlan to bin.
- `~/Developer/pantry-overnight/`: `brief.md` (4.8 KB), `run.sh` and `logs/`, last run 21 Oct. A one-off `claude -p` runner for the `overnight/pantry-code-items` branch. Not scheduled, not tied to anything now. Safe to bin once that branch is gone. Left alone.
- `~/Developer/the-pantry-v2*` folders total 2.3 GB (audit figure); removing the merged worktrees above is where the space comes back.
