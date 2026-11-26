# MaktabaPlay Structure Migration Plan

Status: Phases 6 (`classification-race`), 10 (`hangman`), 14 (`library-tycoon`), and 21 (`hangman` fixes) are implemented. Hangman's page, shared foundations, and the term bank are in their target folders; remaining game moves and shared asset moves are still planned.

## Conventions and scope

- Paths below are relative to the repository root. Runtime links must not start with `/`; this preserves the GitHub Pages `/<repo>/` prefix.
- Game pages live at `games/<name>/index.html`. From that directory, root pages and shared resources are reached with `../../`, for example `../../index.html` and `../../shared/js/game-shell.js`.
- Shared scripts and data will be classic JavaScript files that assign named values to `window`. Load each data script before the game script; do not use `fetch()` for data or rely on JSON files.
- The inventory covers application, documentation, and backend files in the current worktree. `.git`, root `node_modules/`, `.freebuff/`, and `.qodo/` are repository metadata, ignored dependencies, or local tool state; leave them where they are and do not migrate their contents.
- File sizes for the data arrays below are the literal array source span (lines and UTF-8 bytes), not item counts or compressed sizes. Inline block line counts exclude the opening/closing tags and their immediately adjacent newlines.

## Target layout

```text
index.html
about.html
contact.html
partners.html
profile.html
404.html                         # new; no current source file
games/
  hangman/{index.html, game.js, game.css}
  ladder-classification/{index.html, game.js, game.css}
  book-detective/{index.html, game.js, game.css}
  shelf-sorter/{index.html, game.js, game.css}
  silsilat-alfahras-tree/{index.html, game.js, game.css}
  minigames/{index.html, game.js, game.css, match-concepts.html}
  library-tycoon/{index.html, game.js, game.css}
  classification-race/{index.html, game.js, game.css}
  traffic-controller/{index.html, game.js, game.css}
shared/
  js/{utils, storage, modal, sfx, end-screen, howto, game-shell,
      game-header, game-settings, auth}.js
  css/{design-system, game-components, game-header, game-polish,
       game-shell, responsive, style}.css
data/                            # plain JS globals; no JSON fetching
assets/
  icons/{dis, github, link}.png
tools/check-links.js             # local page link and duplicate-script checker
docs/
server/                          # backend remains isolated and disabled
```

`match-concepts.html` is a second page inside the `minigames` folder, not a tenth game folder. The proposed path is `games/minigames/match-concepts.html`; link it from `games/minigames/index.html`. A repository search found no current link to `match-concepts.html`.

## Current files and destinations

### Root pages and games

| Current file | Planned destination |
|---|---|
| `.gitignore` | `.gitignore` (retain at root) |
| `README.md` | `README.md` (retain at root) |
| `index.html` | `index.html` (retain at root; update game links) |
| `about.html` | `about.html` |
| `contact.html` | `contact.html` |
| `partners.html` | `partners.html` |
| `profile.html` | `profile.html` |
| `games/hangman/index.html`, `games/hangman/game.js`, `games/hangman/game.css` | Same paths (Phases 10 and 21 complete) |
| `ladder-classification.html` | `games/ladder-classification/index.html` |
| `book-detective.html` | `games/book-detective/index.html` |
| `shelf-sorter.html` | `games/shelf-sorter/index.html` |
| `silsilat_alfahras_tree.html` | `games/silsilat-alfahras-tree/index.html` |
| `minigames.html` | `games/minigames/index.html` |
| `match-concepts.html` | `games/minigames/match-concepts.html` |
| `games/library-tycoon/index.html`, `games/library-tycoon/game.js`, `games/library-tycoon/game.css` | Same paths (Phase 14 complete) |
| `games/classification-race/index.html`, `games/classification-race/game.js`, `games/classification-race/game.css` | Same paths (Phase 6 complete) |
| `traffic-controller.html` | `games/traffic-controller/index.html` |
| `404.html` | New root page; no current file |

For the remaining primary games, move inline game logic and game-specific styles into `game.js` and `game.css` while keeping markup in `index.html`. Hangman, Classification Race, and Library Tycoon have already been split into those files. The separate match-concepts page remains a sibling page under `games/minigames/`.

### Current assets

| Current file | Planned destination |
|---|---|
| `assets/style.css` | `shared/css/style.css` |
| `assets/css/design-system.css` | `shared/css/design-system.css` |
| `assets/css/game-components.css` | `shared/css/game-components.css` |
| `assets/css/game-header.css` | `shared/css/game-header.css` |
| `assets/css/game-polish.css` | `shared/css/game-polish.css` |
| `assets/css/game-shell.css` | `shared/css/game-shell.css` |
| `assets/css/responsive.css` | `shared/css/responsive.css` |
| `assets/js/game-header.js` | `shared/js/game-header.js` |
| `assets/js/game-modal.js` | `shared/js/modal.js` |
| `assets/js/game-settings.js` | `shared/js/game-settings.js`; extract its Web Audio sound engine into `shared/js/sfx.js` |
| `assets/js/game-shell.js` | `shared/js/game-shell.js`; extract results-screen code into `shared/js/end-screen.js` |
| `assets/learning.js` | Split tutorial/how-to behavior into `shared/js/howto.js` and its progress/review persistence into `shared/js/storage.js` |
| `assets/auth.js` | `shared/js/auth.js` only if the legacy auth UI is retained; see risks below |
| `data/library-terms.js` | Same path (moved for Phase 21) |
| `assets/ladder-questions.js` | `data/ladder-questions.js` |
| `icons/dis.png` | `assets/icons/dis.png` |
| `icons/github.png` | `assets/icons/github.png` |
| `icons/link.png` | `assets/icons/link.png` |

`shared/js/utils.js`, `shared/js/storage.js`, `shared/js/sfx.js`, and `shared/js/end-screen.js` are now present as Hangman foundations; `shared/js/howto.js` is still planned. The existing game header, modal, settings, and shell modules remain under `assets/js/` until the shared-asset migration.

### Documentation, backend, and local data

| Current file | Planned destination |
|---|---|
| `docs/DATABASE_ADMIN.md` | `docs/DATABASE_ADMIN.md` |
| `docs/DATABASE_TOOLS.md` | `docs/DATABASE_TOOLS.md` |
| `docs/FRONTEND_MIGRATION.md` | `docs/FRONTEND_MIGRATION.md` |
| `docs/PHASE1.md` | `docs/PHASE1.md` |
| `docs/PHASE2.md` | `docs/PHASE2.md` |
| `docs/SECURITY.md` | `docs/SECURITY.md` |
| `docs/STRUCTURE.md` | `docs/STRUCTURE.md` (this plan) |
| `server/.env.example` | `server/.env.example` |
| `server/admin-dashboard.html` | `server/admin-dashboard.html` |
| `server/admin.html` | `server/admin.html` |
| `server/package-lock.json` | `server/package-lock.json` |
| `server/package.json` | `server/package.json` |
| `server/server.js` | `server/server.js` |
| `server/public/.gitkeep` | `server/public/.gitkeep` |
| `maktaba.db` | Proposed `server/maktaba.db`; this is ignored local data, so back it up and verify it before any manual move. Do not commit it. |

There are no current files for `tools/`, `data/` (as a directory), `shared/`, or the new `404.html`; those destinations are to be created. No current image files were found besides the three root `icons/*.png` files listed above. The previously removed duplicate HTML copies and `snake.jpg` are not present in the current worktree and have no destination.

## Relative paths that need changes

The following local references are interpreted relative to the HTML document URL, not the JavaScript file that contains them. Once a game is nested below `games/<name>/`, the current root-relative-to-page paths will no longer resolve to the intended files.

1. **Homepage game links.** `index.html` currently links to the old root filenames. Replace each `href` with the directory URL (no leading slash):

   | Current `href` | New destination |
   |---|---|
   | `games/hangman/` | `games/hangman/` (already updated) |
   | `ladder-classification.html` | `games/ladder-classification/` |
   | `book-detective.html` | `games/book-detective/` |
   | `shelf-sorter.html` | `games/shelf-sorter/` |
   | `silsilat_alfahras_tree.html` | `games/silsilat-alfahras-tree/` |
   | `minigames.html` | `games/minigames/` |
   | `games/library-tycoon/` | `games/library-tycoon/` (already updated) |
   | `games/classification-race/` | `games/classification-race/` (already updated) |
   | `traffic-controller.html` | `games/traffic-controller/` |

2. **Shared stylesheet and scripts.** Root pages (`index`, `about`, `contact`, `partners`, `profile`) currently use `assets/style.css` and/or `assets/auth.js`; change these to `shared/css/style.css` and `shared/js/auth.js` if auth is retained. Game pages currently reference:
   - `assets/style.css`
   - `assets/css/design-system.css`, `game-components.css`, `game-header.css`, `game-polish.css`, `game-shell.css`, `responsive.css`
   - `assets/js/game-header.js`, `game-modal.js`, `game-settings.js`, `game-shell.js`
   - `assets/learning.js` and `assets/auth.js`; Hangman now loads `data/library-terms.js`
   - `assets/ladder-questions.js` in `ladder-classification.html`

   Update each `<link>`/`<script>` to its destination. From a game page use `../../shared/css/...`, `../../shared/js/...`, or `../../data/...`; from root pages use `shared/...` or `data/...`. Load data scripts before `game.js`. Hangman uses the new shared modules and `/data/library-terms.js`; its remaining shell and visual assets, as well as those in Classification Race and Library Tycoon, are still loaded from `../../assets/...`.

3. **Images.** `contact.html` refers to `icons/github.png`, `icons/link.png`, and `icons/dis.png`; update them to `assets/icons/...`.

4. **Root navigation from games.** Existing game-page links to `index.html`, `contact.html`, and `partners.html` must point to `../../index.html`, `../../contact.html`, and `../../partners.html`. Root-page navigation among `index.html`, `about.html`, `contact.html`, and `partners.html` remains valid.

5. **Generated navigation in shared JavaScript.** `assets/js/game-shell.js` and `assets/js/game-header.js` now choose `../../index.html` (and the matching profile path) when the current page is under `games/`, while retaining root paths for unmoved games. `assets/auth.js` still generates a `profile.html` link and redirects to `index.html` on logout; those paths need the same nested-page treatment when additional games move. Avoid hard-coding a leading `/`, which would discard the GitHub Pages repository prefix.

6. **Base-path/API issue.** `assets/auth.js` calls `/api/register`, `/api/login`, `/api/user/...`, `/api/score`, and `/api/leaderboard`. These root-absolute API URLs do not preserve `/<repo>/`, and the backend is disabled/not available on GitHub Pages. This is not a relative-link fix; decide whether to remove/disable these controls or redesign them for the local-first frontend.

7. **Backend admin pages.** `server/admin.html` now uses `../assets/style.css` and `../index.html` for its local links. It stays in the backend tree and is not part of the static-game path rewrite. The current Express static root is `server/public`, so these admin files are not generally exposed as static pages; keep that separate from the GitHub Pages navigation.

External Google Fonts URLs and fragment references such as `url(#mpScoreGrad)` are not local paths and are not changed by this directory move.

## Inline `<style>` and `<script>` inventory

Counts are per current HTML file; each list item is the line count of one inline block in source order. External `<script src="...">` tags and `style="..."` attributes are not included. `server/admin*.html` are counted for inventory but remain backend files.

| Current HTML file | Inline `<style>` blocks (lines) | Inline `<script>` blocks (lines) |
|---|---:|---:|
| `index.html` | 296 | 39 |
| `about.html` | 51 | — |
| `contact.html` | 225 | — |
| `partners.html` | 109 | — |
| `profile.html` | 138 | 55 |
| `games/hangman/index.html` | — (moved to `game.css`) | — (moved to `game.js`; updated in Phase 21) |
| `ladder-classification.html` | 646 | 656 |
| `book-detective.html` | 147 | 790 |
| `shelf-sorter.html` | 599 | 664 |
| `silsilat_alfahras_tree.html` | 587 | 471 |
| `minigames.html` | 255 | 462 |
| `match-concepts.html` | 130 | 234 |
| `games/library-tycoon/index.html` | — (moved to `game.css`) | — (four ordered blocks moved to `game.js`) |
| `games/classification-race/index.html` | — (moved to `game.css`, 258 lines) | — (moved to `game.js`, 457 lines) |
| `traffic-controller.html` | 261 | 1142, 21, 17 |
| `server/admin-dashboard.html` | 306 | 232 |
| `server/admin.html` | 56 | 83 |

The game-page inline blocks are the candidates for `game.css`/`game.js`; preserve their existing order and DOM timing. Root-page inline blocks are recorded here but are not part of the game-file extraction. `404.html` has no source blocks because it does not exist yet.

## Inline data arrays to externalize

These are content/configuration arrays found in inline scripts in game HTML. Move plain data into game-specific `.js` files under `data/`, assign unique `window` globals, and load them before the consuming game script. Sizes are current literal source spans.

| Current file and array | Size | Proposed data module/global |
|---|---:|---|
| `games/hangman/game.js` — `data.questions` (26 entries) | 28 lines / 7,715 B | `data/hangman.js` / `window.HANGMAN_QUESTIONS` |
| `book-detective.html` — `CASES` | 350 lines / 24,515 B | `data/book-detective.js` / `window.MARC_CASES` |
| `games/classification-race/game.js` — `DC` | 12 lines / 541 B | `data/classification-race.js` / `window.CLASSIFICATION_RACE_DC` |
| `games/classification-race/game.js` — `BDB` | 26 lines / 2,103 B | `data/classification-race.js` / `window.CLASSIFICATION_RACE_BDB` |
| `minigames.html` — `PAIRS` | 12 lines / 1,312 B | `data/minigames.js` / `window.MINIGAME_PAIRS` |
| `minigames.html` — `allConcepts` | 26 lines / 2,079 B | `data/minigames.js` / `window.MINIGAME_CONCEPTS` |
| `match-concepts.html` — `allConcepts` | 26 lines / 1,917 B | `data/match-concepts.js` / `window.MATCH_CONCEPTS` |
| `shelf-sorter.html` — `SHELVES` | 12 lines / 1,256 B | `data/shelf-sorter.js` / `window.SHELVES` |
| `shelf-sorter.html` — `BOOK_POOL` | 51 lines / 3,315 B | `data/shelf-sorter.js` / `window.BOOK_POOL` |
| `shelf-sorter.html` — `CALL_SETS` | 32 lines / 2,539 B | `data/shelf-sorter.js` / `window.CALL_SETS` |
| `silsilat_alfahras_tree.html` — `CHALLENGES` | 12 lines / 2,839 B | `data/silsilat-alfahras-tree.js` / `window.TREE_CHALLENGES` |
| `silsilat_alfahras_tree.html` — `STAGES` | 32 lines / 1,185 B | `data/silsilat-alfahras-tree.js` / `window.TREE_STAGES` |
| `traffic-controller.html` — `ZONES` | 18 lines / 820 B | `data/traffic-controller.js` / `window.TRAFFIC_ZONES` |
| `traffic-controller.html` — `PATRON_TYPES` | 42 lines / 1,502 B | `data/traffic-controller.js` / `window.PATRON_TYPES` |
| `games/library-tycoon/game.js` — `STAFF_DEF` | 6 lines / 1,250 B | `data/library-tycoon.js` / `window.STAFF_DEF` |
| `games/library-tycoon/game.js` — `ACQ_ITEMS` | 9 lines / 1,628 B | `data/library-tycoon.js` / `window.ACQ_ITEMS` |
| `games/library-tycoon/game.js` — `CRISES` | 32 lines / 4,314 B | `data/library-tycoon.js` / `window.CRISES` |
| `games/library-tycoon/game.js` — `VISITOR_EVENTS` | 35 lines / 4,408 B | Keep behavior in game code or refactor before extraction; see risks |
| `games/library-tycoon/game.js` — `ACHIEVEMENTS` | 10 lines / 549 B | `data/library-tycoon.js` / `window.ACHIEVEMENTS` |
| `games/library-tycoon/game.js` — `QUESTS` | 10 lines / 1,926 B | Keep predicates in game code or refactor before extraction; see risks |
| `games/library-tycoon/game.js` — `MOCK_LB` | 6 lines / 350 B | `data/library-tycoon.js` / `window.MOCK_LEADERBOARD` |
| `games/library-tycoon/game.js` — `TIPS` | 12 lines / 988 B | `data/library-tycoon.js` / `window.LIBRARY_TIPS` |
| `games/library-tycoon/game.js` — `TUTORIAL_STEPS` | 6 lines / 494 B | `data/library-tycoon.js` / `window.TUTORIAL_STEPS` |

Two existing data scripts are already separate from game HTML and should move to `data/` rather than be rewritten as JSON:

- `assets/ladder-questions.js` (28,958 B) defines `window.LADDER_CATS` and `window.LADDER_BANK`.
- `data/library-terms.js` (30,791 B) defines the 355-line `TERMS` array (28,411 B) and exports `window.LIBRARY_TERMS`, `window.LIBRARY_TERM_BY_ID`, `window.LIBRARY_FIELDS`, and `window.LIBRARY_SOURCES`.

Presentation/runtime arrays such as color palettes, SVG part IDs, dice symbols, animation positions, and temporary queues are not question banks; leave them in game code unless a later review finds a clear shared use. `traffic-controller.html` also has a small `leafData` rendering array (7 lines / 351 B), which is visual configuration rather than a question bank.

## Risks and implementation order

1. **Path depth and deployment prefix:** validate every link under both a root static server and a nested URL like `https://<user>.github.io/<repo>/`. A leading slash would escape the repo prefix; game pages need `../../` to reach root `shared/`, `data/`, `assets/`, and public pages.
2. **Global script ordering:** data files must assign stable, unique `window` names and load before `game.js`. Library Tycoon now combines four classic-script blocks in their original order with separators; keep that order and check for lexical-name collisions when future files are combined.
3. **Behavior-bearing arrays:** `games/library-tycoon/game.js`'s `VISITOR_EVENTS` entries are functions using game-local state/helpers; `QUESTS` also contains predicates that close over local game state. Moving these as plain global data breaks their closures. Keep functions in `game.js` or change the interface deliberately.
4. **Mutable defaults:** Hangman's initial `data.questions` and the library tycoon mock leaderboard are mutated at runtime. Preserve reset/default behavior and avoid treating runtime state as shared immutable data.
5. **Local-first/auth mismatch:** `assets/auth.js` calls unavailable backend APIs. Its destination is unresolved until deciding whether the auth/profile controls are removed, made local-only, or remain intentionally unavailable.
6. **Minigames boundary:** `match-concepts.html` is currently an unlinked standalone page. The proposed minigames subpage needs a new link and must use the same relative shared/data paths as its parent folder.
7. **Large inline extraction:** Library Tycoon has the largest stylesheet and script; its four inline scripts were combined in source order with separator comments. Preserve that order, event wiring, and responsive styles.
8. **Database safety:** root `maktaba.db` is ignored local data. Back it up and verify the intended server database before any migration; never include it in Git.
9. **Backend isolation:** keep `server/` separate from GitHub Pages output. `server/admin*.html` are not game pages and are not served from the empty `server/public/` directory.
10. **New pages/tooling:** `404.html`, `tools/`, and `shared/js/utils.js` have no current sources. Their contents and checks must be designed separately; no build step or JSON fetch should be introduced.
