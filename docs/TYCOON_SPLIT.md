# Library Tycoon split plan

## Scope and current layout

This is a plan only. No game code or HTML has been changed.

`games/library-tycoon/game.js` is currently 1,808 lines. It contains four consecutive classic-script blocks:

1. Lines 1–1727: game data/state, simulation, rendering, controls, save/load, and startup.
2. Lines 1728–1754: asynchronous leaderboard rendering through `window.maktabaAuth`.
3. Lines 1755–1790: `MPGame.init()` configuration.
4. Lines 1791–1808: optional `ML.tutorial()` configuration.

The page loads the shared data/learning/settings/modal/header/shell scripts before the game. It loads `game.js` and then `../../assets/auth.js` at the end of the body. Preserve that dependency order when replacing the single game script.

## Proposed files

Use ordinary ordered `<script src>` files, not `type="module"`. The existing code relies on top-level classic-script bindings and functions that are shared between blocks. Keep each binding declared exactly once. Details of the global contract and load order are below.

| File | Move into it | Shared globals read | Globals/state written |
|---|---|---|---|
| `data.js` | Static definitions: `SECTIONS`, `STAFF_DEF`, `ACQ_ITEMS`, `CRISES`, `ACHIEVEMENTS`, `QUESTS`, `MOCK_LB`, `TIPS`, `TUTORIAL_STEPS`; level names, requirements and perks currently initialized on `G`; map dimensions and fixed-cell layout (`COL`, `ROW`, `idx`, `FIXED_CELLS`). | None at definition time. | Those constants. Keep the existing IDs, values, order, and array contents unchanged. |
| `state.js` | Shared helpers `rand`, `clamp`, `fmt`; the complete initial `G` object and its initialization defaults. | Level configuration from `data.js`. | `G`; this is the one mutable game-state object used by every feature. |
| `economy.js` | `addFinance`, `calcPenaltiesAndBonuses`, `VISITOR_EVENTS`, `doMonthlyCycle`, and `checkLevelUp`. | `G`, `SECTIONS`, `STAFF_DEF`, `ACQ_ITEMS`, `rand`, `clamp`, `fmt`; UI/log functions; mission functions. | Mutates budget, satisfaction, quality, collections, score, monthly totals/history, achievements, and service counters on `G`. |
| `map.js` | `renderMap`, `renderMapInfoBar`, `renderMapLegend`, `renderMSBSidebar`, `renderPenaltyBox`; visitor movement and placement helpers: `MAX_VISITORS`, `visitorDots`, `visitorLayer`, `initVisitorLayer`, `getCellPos`, `getWalkableCells`, `getRoomCells`, `spawnVisitor`, `scheduleVisitorMove`, `moveVisitor`, `tickVisitors`. | `G`, map/section definitions, `STAFF_DEF`, `rand`, `fmt`; finance, logging, toast, achievement, quest, and staff-render functions. | Mutates `G.mapCells` and `G.selectedSection`; creates/removes map and visitor DOM. |
| `staff.js` | `renderStaffOnMap` and `renderHR`, including hire/fire event handlers and staff-card rendering. | `G`, `STAFF_DEF`, `SECTIONS`, `fmt`; finance, logging, toast, achievement, map, HUD, and quest functions. | Mutates `G.staff`, `G.staffMorale`, `G.staffServiceCount`, and monthly ledger state. |
| `procurement.js` | `renderAcquisition` and its purchase/confirmation handlers. | `G`, `ACQ_ITEMS`, `SECTIONS`, `STAFF_DEF`, `clamp`, `fmt`; log, finance, toast, floating-number, HUD, and quest functions. | Mutates budget, acquisition counts, collections, quality, satisfaction, score, finance ledger, and achievement state on `G`. |
| `crises.js` | `crisisTimer`, `triggerCrisis`, and `resolveCrisis`. | `G`, `CRISES`, `rand`, `clamp`, `fmt`; log, toast, floating-number, HUD, quest, and achievement functions. | Mutates crisis flags/cooldown/count and crisis-related budget, quality, satisfaction, collections, and score on `G`; owns the crisis countdown timer. |
| `missions.js` | `unlockAchievement`, `renderAchievements`, `checkQuests`, `renderQuestsWidget`, `renderNowTask`, and `updateQuestsBadge`. Keep the static achievement and quest definitions in `data.js`. | `G`, `ACHIEVEMENTS`, `QUESTS`, `fmt`; logging, toast, and badge/UI functions. | Mutates `G.achievements` and each quest's `done` flag; updates achievement, quest, and sidebar DOM. |
| `ui.js` | Logging and presentation helpers: `allLogs`, `_lastLogMsg`, `_prevHUD`, `_unreadLog`, `_activeSTab`, `addLog`, `renderLog`, `showToast`, `floatNum`, `flashHUD`, `renderHUD`, `renderAnalytics`, and `showMonthlyReport`. Also `renderLeaderboard`, `tipIdx`, `footerMsgs`, `footerIdx`, `rotateTip`, `rotateFooter`, `showWelcome`, `tutorialStep`, `showTutorialStep`, and `runTutorial`. Keep `showWinScreen` and `endGame` intact here initially because they combine state transitions with DOM updates. | `G`, static definitions, `fmt`, `clamp`, `rand`; game/economy/mission functions; DOM IDs in `index.html`. | DOM, log buffers, unread counts, tip/footer/tutorial cursors; `addLog` also increments `G.logCount`; `endGame` marks `G.gameOver` and stops timers. |
| `save.js` | `SAVE_KEY`, `saveGame`, `loadGame`, and the two-minute autosave interval. | `G`, `SAVE_KEY`, `paused`, `gameLoop`, rendering functions, logging/toast functions. | Reads/writes `localStorage` and restores the existing `G` fields; keep save/load callable by `main.js`. |
| `main.js` | `gameTick`, `initGame`, `gameLoop`, `paused`, `tickCount`; event wiring for tabs, speed, pause, sidebar tabs, log filters, keyboard shortcuts, save/load, and naming; the `DOMContentLoaded` boot; all four original script-block integrations (`maktabaAuth` leaderboard, `MPGame.init`, and optional `ML.tutorial`). | All earlier modules plus `MPGame`, `ML`, `window.maktabaAuth`, and the page DOM. | Starts the game and intervals, binds listeners, and coordinates feature modules. Do not register these listeners or start intervals from multiple files. |

`endGame` and `checkLevelUp` span game rules and presentation. For a low-risk extraction, move each function intact first—`endGame` to `ui.js`, `checkLevelUp` to `economy.js`—rather than splitting either body between modules. Their cross-module calls should remain late-bound.

## Load order

Keep the existing shared scripts first, in their current order. Replace the single `game.js` tag with these game scripts, then leave `auth.js` after them:

1. `data.js`
2. `state.js`
3. `economy.js`
4. `map.js`
5. `staff.js`
6. `procurement.js`
7. `crises.js`
8. `missions.js`
9. `ui.js`
10. `save.js`
11. `main.js`
12. `../../assets/auth.js`

Use normal parser-ordered script tags: no `async`, no `defer`, and no `type="module"` for this first split. Function bodies call across feature boundaries, but those calls occur after all scripts have loaded. `main.js` must remain last among game modules so every function and binding exists before boot begins. The leaderboard callback runs on `DOMContentLoaded`; keeping `auth.js` after `main.js` still makes `window.maktabaAuth` available before that event fires.

## Global and HTML contracts

- The current source uses top-level classic-script declarations. `G` is a top-level `const`, not `window.G`; the `MPGame.init()` block separately checks `window.G` before returning status. Preserve current behavior during extraction and do not assume that assigning `G` to `window` is behavior-neutral.
- `window.maktabaAuth.getLeaderboard()` is called by the second original block. The `auth.js` script currently loads after `game.js`; preserve that relationship and keep the callback registered before `DOMContentLoaded`.
- `MPGame.init()` must execute after `MPGame` is loaded and after game definitions exist. The tutorial registration is conditional on `window.ML` and must remain optional.
- There are no inline `onclick` handlers in `index.html` that call game functions. Its inline `onfocus`, `onblur`, `onmouseover`, and `onmouseout` attributes only style `this`. Existing game actions are wired with `addEventListener` in `game.js`; keep them in `main.js` or their owning feature module.
- All module URLs must remain relative to this game page so the site continues to work at a repository subpath and on any static server.

## Save compatibility — must not change

- Keep the key exactly `maktaba_save_v4`.
- Keep the saved object shape and field names exactly: `budget`, `satisfaction`, `quality`, `collections`, `score`, `day`, `month`, `year`, `level`, `libraryName`, `mapCells`, `staff`, `staffMorale`, `staffServiceCount`, `acqCounts`, `pendingQualityGains`, `totalServiced`, `totalRejected`, `crisisManaged`, `achievements`, `monthlyHistory`, `gameSpeed`, and `savedAt`.
- Keep the current load defaults for `libraryName`, `pendingQualityGains`, `crisisManaged`, and `gameSpeed`; old saves may omit some of those fields.
- Do not add transient timers, logs, visitor DOM state, or quest completion flags to the save snapshot as part of this split.

## Risks and verification points for the implementation phase

1. **Shared mutable state:** simulation functions mutate the same `G`, nested objects, arrays, and DOM. Do not clone or replace `G` in feature modules; preserve object identity and the order of render/update calls.
2. **Classic-script scope:** each file shares the page's global lexical environment. Keep declarations unique and load in the order above. Wrapping files in separate IIFEs or changing them to ES modules would hide bindings that other files currently reference.
3. **Cross-module calls:** `doMonthlyCycle`, map placement, hiring, procurement, crisis resolution, quests, and save restoration call several render/log/finance functions. Extract whole functions without changing their call sequence; test each area after extraction.
4. **Timer/listener lifecycle:** `gameLoop`, the crisis timer, visitor timeouts, autosave, tip/footer/leaderboard intervals, and several `DOMContentLoaded` listeners are separate. Initialize each once; preserve the current clear/restart behavior.
5. **Overlapping UI and rules:** `checkLevelUp`, `endGame`, `showWinScreen`, and monthly reporting mix state changes with DOM rendering. Keep these functions intact until the first extraction has been verified.
6. **Authentication integration:** the leaderboard block awaits `window.maktabaAuth.getLeaderboard()`. Keep `auth.js` loaded before `DOMContentLoaded`; do not turn a missing auth dependency into an empty success result during the split.
7. **Static hosting:** do not introduce Node `require`, filesystem reads, bundler-only aliases, or fetch-based module loading. The existing relative script paths must resolve under GitHub Pages project URLs.
8. **Verification:** after each file is extracted, check `node --check` on the changed scripts and load the game in a browser with the console monitored. After all extractions, verify fresh start, map placement, hiring, procurement, crises, month rollover, pause/speed controls, save/load of a pre-split `maktaba_save_v4` snapshot, and `tools/check-links.js`.
