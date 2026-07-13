# Pass 4 — Enemy AI, Spawning, Bosses, and Waves

This pass stabilizes the complete enemy lifecycle and 15-wave campaign before outpost-system balancing.

## Scope

- Enforce one configured active-enemy limit across wave spawns and boss summons.
- Initialize summoned enemies through the same spawn path as normal enemies.
- Collision-resolve and crowd-check every spawn position.
- Rotate spawn gates to avoid repeated same-gate bursts.
- Interleave enemy groups and place the boss first on boss waves.
- Make wave queue construction deterministic under an injected random source.
- Prevent stale boss-phase timers from disabling newer armor phases.
- Replace blind stuck teleports with bounded collision-resolved recovery candidates.
- Keep remaining-enemy counts and wave completion accurate with summoned enemies.
- Prove that all 15 waves can progress under a low active cap.

## Acceptance criteria

- The active enemy count never exceeds the configured cap.
- Boss summons are reduced to the available capacity and are skipped at zero capacity.
- Every spawned enemy has valid scale, last-position, and spawn-animation state.
- Spawn positions remain inside arena bounds and outside collision geometry.
- Consecutive queued enemies do not reuse the same gate when alternatives exist.
- Bosses appear first on boss waves and normal groups are interleaved.
- New boss phases cannot be shortened by stale callbacks from earlier phases.
- Wave completion emits exactly once.
- A deterministic simulation completes waves 1 through 15 with an active limit of one.
- Typecheck, lint, tests, and production build pass before merge.

Physical playtesting remains necessary for final pathing feel, crowd pressure, and difficulty tuning.