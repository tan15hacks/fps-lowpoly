# Pass 0 — Defect Inventory and Stabilization Baseline

Date: 2026-07-13  
Audited branch: `main`  
Production URL: `https://tan15hacks.github.io/fps-lowpoly/`

## Purpose

Pass 0 freezes feature work and establishes a traceable repair backlog before stabilization begins. This inventory is based on a source audit of the deployed Version 1 code and the existing automated checks.

No gameplay behavior is intentionally changed in this pass. Items marked **Confirmed** have a direct defect path visible in source. Items marked **Runtime verification** are high-confidence risks that still require reproduction on the deployed build or a physical device.

## Severity definitions

| Severity | Meaning |
| --- | --- |
| P0 — Blocker | Can soft-lock a run, corrupt lifecycle state, or make repeated play unreliable. Must be repaired first. |
| P1 — Major | Breaks an advertised system, causes significant performance/resource growth, or risks lost progress. |
| P2 — Gameplay | Produces incorrect balance, statistics, feedback, or partially nonfunctional features. |
| P3 — Polish | Visual, clarity, accessibility, or future-integration problem that does not currently block play. |

## Executive summary

| Severity | Count | Primary areas |
| --- | ---: | --- |
| P0 | 4 | Android lifecycle, death flow, run cleanup, reset flow |
| P1 | 9 | mobile state, enemy cap, saves, performance, CI reproducibility, integration coverage |
| P2 | 10 | upgrades, settings, statistics, projectiles, outpost feedback |
| P3 | 3 | stale UI state, menu visuals, dormant advertisement control |
| **Total** | **26** | |

## P0 — Blockers

### PO-001 — Backgrounding can resume an already paused run

- **Status:** Confirmed
- **Area:** Android lifecycle / state machine
- **Evidence:** `src/main.ts` calls `game.handleBackButton()` whenever `appStateChange.isActive` becomes false. `Game.handleBackButton()` resumes a run when its state is already `paused`.
- **Reproduction:** Pause a run, then background the Android application.
- **Expected:** The run remains paused while the app is inactive.
- **Observed from control flow:** Backgrounding routes through a back-button toggle and can change `paused` to `playing`.
- **Target pass:** Pass 1

### PO-002 — Closing the death dialog with Android Back soft-locks the run

- **Status:** Confirmed
- **Area:** Death / revive flow
- **Evidence:** `Game.handleBackButton()` removes `deathDialog` and clears its reference without restoring gameplay or ending the run. `handleDeath()` previously changed the run state to `paused`.
- **Reproduction:** Die on Android, then press Back while the revive/end-run dialog is visible.
- **Expected:** Back should either leave the dialog open, return to a defined pause state, or require an explicit end-run action.
- **Observed from control flow:** The only revive/end controls are removed while the run remains paused.
- **Target pass:** Pass 1

### PO-003 — Restarting or starting another run leaves old weapon models attached

- **Status:** Confirmed
- **Area:** Run cleanup / rendering
- **Evidence:** `WeaponManager.dispose()` removes weapon models from the camera, but `Game.abandonRun()` never calls it. The same camera is reparented into the next player and carries old weapon children with it.
- **Reproduction:** Start a run, return to menu or restart, then start another run several times.
- **Expected:** Exactly one active set of weapon models exists.
- **Observed from control flow:** Every run adds three more models to the persistent camera.
- **Impact:** Overlapping weapons, additional draw calls, retained geometry/material references, and worsening performance after repeated restarts.
- **Target pass:** Pass 1

### PO-004 — Reset Progress from paused Settings does not terminate or restore the active run

- **Status:** Confirmed
- **Area:** UI state / save reset
- **Evidence:** The paused Settings modal calls `showMain()` after reset. It does not remove the modal, call `onMainMenu`, abandon the run, show the hidden root, or restore the pause screen.
- **Reproduction:** Pause a run → Settings → Reset Progress → confirm.
- **Expected:** Reset should explicitly abandon the run and return to a visible clean main menu, or be disabled during a run.
- **Observed from control flow:** A hidden main-menu DOM is rendered while the active run remains paused and overlays can remain mounted.
- **Target pass:** Pass 1

## P1 — Major defects and risks

### PO-005 — Multiple Play clicks can create overlapping asynchronous run starts

- **Status:** Runtime verification
- **Area:** Run initialization
- **Evidence:** `startRun()` awaits audio unlock before setting an in-progress guard. Difficulty buttons remain enabled and call it without debouncing.
- **Risk:** Rapid taps can interleave `abandonRun()` and construction of multiple run systems, amplifying PO-003 and other cleanup leaks.
- **Target pass:** Pass 1

### PO-006 — Held mobile inputs can remain active after controls are hidden

- **Status:** Confirmed control-flow risk
- **Area:** Mobile controls
- **Evidence:** `MobileControls.show(false)` only changes a CSS class. `InputManager.snapshot()` resets one-shot mobile inputs but does not reset `fire`, `aim`, or `sprint`. Pointer release is not guaranteed when an element is hidden during pause, death, or wave transition.
- **Expected:** Hiding controls clears all held actions and pointer ownership.
- **Risk:** The player may resume firing, aiming, or sprinting without touching the screen.
- **Target pass:** Pass 1 / Pass 2

### PO-007 — Boss summons bypass the configured active-enemy cap

- **Status:** Confirmed
- **Area:** Waves / performance
- **Evidence:** Boss summons directly construct and push Runner enemies inside `EnemyManager`. They do not pass through `WaveManager.maxActive()` and only check total array length against a hard-coded value of 38.
- **Expected:** Every spawn source respects the current `maxEnemies` setting and mobile cap.
- **Impact:** Frame-rate drops, crowding, inconsistent difficulty, and cap values that do not match the Settings UI.
- **Target pass:** Pass 4 / Pass 8

### PO-008 — Run cleanup retains resources and delayed callbacks

- **Status:** Confirmed
- **Area:** Memory / lifecycle
- **Evidence:** Enemy groups are removed without disposing their unique geometries. Scanner, fence, boss-phase, and hit-flash `setTimeout` callbacks can continue after a run is abandoned. `WeaponManager.dispose()` is not invoked.
- **Expected:** A run owns a disposable resource scope; abandoning it cancels timers and disposes or pools all run-owned objects.
- **Impact:** Memory growth and callbacks mutating detached objects over repeated runs.
- **Target pass:** Pass 1 / Pass 8

### PO-009 — A failed IndexedDB write can cause progress rollback on the next launch

- **Status:** Confirmed design risk
- **Area:** Persistence
- **Evidence:** Saves are written to localStorage first and IndexedDB second. On load, any IndexedDB value is always preferred over localStorage. There is no revision or timestamp comparison.
- **Scenario:** localStorage succeeds, IndexedDB transaction fails, then a future load restores the older IndexedDB record and ignores the newer fallback.
- **Target pass:** Pass 7

### PO-010 — Imported saves do not sanitize nested statistics, achievements, or booleans

- **Status:** Confirmed
- **Area:** Save validation
- **Evidence:** Migration shallow-merges `stats` and `achievements`; most values are not type-checked, clamped, or normalized. Boolean settings are spread without coercion.
- **Expected:** Every imported field is schema-validated and normalized before reaching UI or arithmetic code.
- **Impact:** Negative/invalid progress, broken formatting, impossible achievements, or runtime type errors.
- **Target pass:** Pass 7

### PO-011 — localStorage failures are not contained

- **Status:** Confirmed
- **Area:** Persistence reliability
- **Evidence:** `saveNow()` calls `localStorage.setItem()` outside a try/catch. Several callers intentionally discard the returned promise.
- **Expected:** Storage failures should be caught, reported, and fall back to the remaining storage backend.
- **Impact:** Unhandled promise rejection and silent loss of persistence in restricted/private/quota-limited environments.
- **Target pass:** Pass 7

### PO-012 — Graphics settings can request excessive render resolution on mobile

- **Status:** Confirmed configuration risk
- **Area:** Performance
- **Evidence:** High quality allows device pixel ratio up to 2, then multiplies it by a user `resolutionScale` up to 1.5, producing effective DPR 3.
- **Expected:** Resolution scale should be bounded by a device-aware pixel budget.
- **Impact:** Extremely high fill-rate cost, heat, battery drain, and low frame rate on high-density phones/tablets.
- **Target pass:** Pass 8

### PO-013 — CI and deployments are not reproducible because no lockfile exists

- **Status:** Confirmed
- **Area:** Build infrastructure
- **Evidence:** Workflows run `npm install`; the repository has no `package-lock.json` and therefore cannot use deterministic `npm ci`.
- **Expected:** A committed lockfile and `npm ci` for CI/Pages builds.
- **Impact:** Dependency drift can change or break builds without source changes.
- **Target pass:** Pass 1 infrastructure

### PO-014 — Critical lifecycle and gameplay flows have no automated integration coverage

- **Status:** Confirmed
- **Area:** Testing
- **Evidence:** Existing tests cover isolated math/managers, but there is no browser test harness for start/restart/menu, pause/background/resume, death/revive, 15-wave progression, mobile input release, or save lifecycle.
- **Expected:** Browser-level smoke coverage for the state transitions that currently contain P0 defects.
- **Target pass:** Pass 1, expanded in every later pass

## P2 — Gameplay correctness and incomplete advertised behavior

### PO-015 — Lifetime Coins Collected subtracts coins spent on revive

- **Status:** Confirmed
- **Area:** Statistics
- **Evidence:** The run tracks both `coins` and `coinsCollected`, but `commitRun()` adds the remaining `coins` balance to lifetime `coinsCollected`.
- **Expected:** Lifetime collection uses the cumulative collected value regardless of spending.
- **Target pass:** Pass 5

### PO-016 — Quick Sling upgrade has no gameplay effect

- **Status:** Confirmed
- **Area:** Temporary upgrades
- **Evidence:** Upgrade id `switch` is offered and stackable, but weapon switching is instantaneous and no switch timing reads this stack.
- **Expected:** Implement switch duration/animation affected by the upgrade, or remove/replace the card.
- **Target pass:** Pass 3 / Pass 5

### PO-017 — Counterweight does not reduce camera recoil as described

- **Status:** Confirmed
- **Area:** Temporary upgrades / weapon feel
- **Evidence:** Upgrade id `recoil` reduces shot spread. `PlayerCamera.addRecoil()` receives fixed values and does not read the upgrade.
- **Expected:** The card description and actual recoil/spread effects must agree.
- **Target pass:** Pass 3 / Pass 5

### PO-018 — Biotic Recovery is not capped per wave

- **Status:** Confirmed
- **Area:** Temporary upgrades / balance
- **Evidence:** The card says healing is capped per wave, but implementation only caps healing per individual hit and has no wave accumulator.
- **Impact:** Automatic weapons and shotgun pellets can generate substantially more healing than advertised.
- **Target pass:** Pass 5

### PO-019 — Aim Assist setting is exposed but unused

- **Status:** Confirmed
- **Area:** Controls / accessibility
- **Evidence:** The setting is stored and rendered in Settings, but shot creation and camera look do not consult it.
- **Expected:** Implement a bounded mobile/optional assist or remove the toggle until functional.
- **Target pass:** Pass 2 / Pass 3

### PO-020 — Several defined settings cannot be changed in the UI

- **Status:** Confirmed
- **Area:** Settings / accessibility
- **Evidence:** `aimSensitivity`, `shadowQuality`, `crosshairSize`, and `crosshairOpacity` exist and are applied or sanitized, but no controls are generated for them.
- **Target pass:** Pass 6

### PO-021 — Graphics Quality is only partially applied after startup

- **Status:** Confirmed
- **Area:** Settings / rendering
- **Evidence:** Antialiasing is selected only when the renderer is constructed. Changing quality later adjusts pixel ratio limits but cannot update antialiasing and does not apply the existing recommended-quality/enemy-cap helpers.
- **Expected:** Clearly define restart-required settings or implement a complete live quality preset.
- **Target pass:** Pass 6 / Pass 8

### PO-022 — Turret damage statistics can over-report actual damage

- **Status:** Confirmed
- **Area:** Outpost / statistics
- **Evidence:** The turret ignores the value returned by `Enemy.takeDamage()` and reports configured damage even when boss armor reduces it or remaining health is lower.
- **Expected:** Statistics use applied damage.
- **Target pass:** Pass 5

### PO-023 — Power-cell pickup does not affect power

- **Status:** Confirmed
- **Area:** Pickups / player communication
- **Evidence:** The pickup kind is `power`, but collection grants armor and coins instead of capacity, temporary energy, or a documented power-grid effect.
- **Expected:** Rename/retheme it or implement an explicit power mechanic.
- **Target pass:** Pass 3 / Pass 5

### PO-024 — Projectile hit feedback has no valid source direction and can tunnel

- **Status:** Confirmed / runtime verification
- **Area:** Enemy projectiles
- **Evidence:** Projectile hits report only damage; `Game` supplies the player position as the damage source, producing a zero direction vector. Player collision checks only the projectile's new point rather than the swept segment.
- **Impact:** Missing directional feedback and possible missed hits during frame spikes.
- **Target pass:** Pass 3 / Pass 4

## P3 — Polish and dormant-path defects

### PO-025 — Veteran locked UI state is not cleared after unlocking

- **Status:** Confirmed
- **Area:** Menu state
- **Evidence:** `showMain()` sets `root.dataset.veteran = 'locked'` when locked but never removes the attribute when the save becomes unlocked.
- **Target pass:** Pass 6

### PO-026 — Powered outpost visuals can remain active on the main-menu scene

- **Status:** Runtime verification
- **Area:** Visual state cleanup
- **Evidence:** `abandonRun()` does not reset power allocation visuals before returning to the shared menu map.
- **Target pass:** Pass 1 / Pass 9

### PO-027 — Double Credits result button has no handler

- **Status:** Confirmed dormant path
- **Area:** Monetization abstraction
- **Evidence:** `showResults()` can render a `data-double` button when advertisements become available, but no click listener is attached.
- **Current impact:** None while the unavailable advertisement service keeps the button hidden.
- **Target pass:** Deferred until monetization integration

## Runtime verification matrix

The following checks are required before Pass 1 starts and after each stabilization change:

| Environment | Required baseline |
| --- | --- |
| Desktop Chromium, 1920×1080 | Boot, first tutorial, start wave, pause/resume, die/end, restart ×5 |
| Laptop Chromium, 1366×768 | Menu/HUD fit, pointer lock, pause/settings/reset path |
| Android phone landscape | Multitouch move/look/fire, Back behavior, background/resume, death dialog |
| Android tablet landscape | HUD fit, simultaneous controls, performance with cap 20/35 |
| Installed PWA | Offline relaunch, update activation, save retention |

For every reproduced issue, record:

1. Build commit SHA.
2. Browser/device and resolution.
3. Fresh or existing save.
4. Exact reproduction steps.
5. Expected and actual result.
6. Console error and performance capture when applicable.

## Pass 1 execution order

1. Replace toggle-based lifecycle handling with explicit `pauseForLifecycle`, `resumeFromPause`, and modal rules.
2. Repair death-dialog Back behavior.
3. Add a single-run initialization guard.
4. Introduce a complete run-disposal contract and call `WeaponManager.dispose()`.
5. Clear mobile held inputs and pointer captures whenever controls hide.
6. Repair Reset Progress behavior during an active run.
7. Add browser integration tests for start/restart/menu, pause/background, and death flow.
8. Commit a lockfile and move workflows to `npm ci`.
9. Run restart-cycle memory/draw-call checks before beginning Pass 2.

## Pass 0 exit criteria

- [x] Source-level issue inventory created.
- [x] Issues classified by severity and target pass.
- [x] P0 repair order defined.
- [x] Runtime verification matrix defined.
- [ ] Desktop baseline observations recorded.
- [ ] Physical Android phone/tablet baseline observations recorded.

The two unchecked items require interactive browser/device testing and remain the first activity of Pass 1. They do not block merging this documentation-only Pass 0 inventory.