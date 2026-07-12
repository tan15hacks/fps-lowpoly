# Polygon Outpost Version 1 Manual Smoke Test

Use a clean browser profile for the first pass and a profile with an existing save for persistence checks.

## Startup and menus

- Application opens without an uncaught console error.
- Animated outpost background renders.
- Play, Armory, Achievements, Statistics, Settings, How to Play, Credits, and Back controls work.
- Veteran is locked on a fresh save.
- Every settings control changes the stored value.
- Reset Progress requires confirmation.
- Save export downloads JSON; valid import restores it; malformed JSON is rejected.

## First run and controls

- First run shows the adaptive tutorial once.
- Tutorial can be completed or skipped.
- Desktop: WASD, mouse look, fire, aim, sprint, jump, reload, interaction, numbered weapon keys, wheel, and Escape work.
- Mobile: simultaneous movement, look, and fire work; all buttons respond; left-handed mode mirrors combat controls.
- Portrait shows the rotate overlay; landscape restores play.
- Player cannot cross the outer boundary, enter blocking props, fall through terrain, or remain stuck in a wall.

## Combat

- Pistol fires, reloads, clicks empty, and remains useful.
- SMG unlocks after wave 2 and supports automatic fire.
- Shotgun unlocks after wave 5 and reloads shell by shell.
- Walls block shots.
- Weak points produce critical markers and increased damage.
- Recoil, muzzle flash, hit reaction, particles, damage feedback, and audio appear.
- Runner, Brute, and Spitter attacks are visible and avoidable.
- Acid projectiles disappear and their ground hazard expires.
- Dead enemies stop attacking and are removed.

## Waves and systems

- All 15 waves start and complete in sequence.
- Active-enemy cap delays spawning without deleting queued enemies.
- Bosses spawn on waves 5, 10, and 15 with health bars and phase changes.
- Upgrade cards are unique and unavailable weapon upgrades do not appear.
- Power use cannot exceed 10.
- Turret targets only visible enemies and cannot finish distant waves alone.
- Fence damages and slows crossing enemies without hurting the player.
- Healing station has limited combat healing and between-wave healing.
- Ammo station supplies reserves between waves.
- Scanners activate lights and highlight nearby weak points.

## Lifecycle and results

- Escape pauses and resumes safely.
- Browser focus loss and page hiding pause the game.
- Restart and Main Menu require confirmation.
- Death offers a single 80-coin revive when eligible.
- Revive restores 50% health, grants temporary invulnerability, and moves the player to the safe courtyard.
- Victory appears after the wave-15 boss dies.
- Defeat and victory results show correct statistics and awarded credits.
- Permanent purchases, cosmetic ownership, achievements, statistics, and settings survive reload.
- Veteran unlocks after reaching wave 10 or winning.

## PWA and Android

- Production web build installs as a PWA.
- Installed PWA launches after network is disabled.
- New service-worker deployment shows an update control.
- Capacitor Android build remains playable offline.
- Android back closes gameplay state in this order: modal, pause, menu navigation, exit confirmation.
- Background/resume does not duplicate audio, enemies, projectiles, rewards, or timers.
