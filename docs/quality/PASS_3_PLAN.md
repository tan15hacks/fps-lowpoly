# Pass 3 — Weapons and Combat Correctness

This pass repairs weapon state, reload behavior, hit calculation, recoil upgrades, life-steal accounting, and enemy projectile collision before balance work continues.

## Scope

- Capacity-aware magazine and shell reloads.
- Interruptible shotgun reload after at least one shell is available.
- Real weapon-switch lockout with Quick Sling scaling.
- Counterweight applied to camera recoil rather than bullet spread.
- Circular pellet spread with deterministic test support.
- Applied-damage clamping to remaining enemy health.
- Per-wave Biotic Recovery cap based on actual health restored.
- Swept projectile-versus-player collision.
- Valid source positions for projectile and hazard damage direction.
- Cover-safe projectile resolution.

## Acceptance criteria

- Extended magazines reload to their upgraded capacity.
- Shell reloads can be interrupted and never duplicate or lose reserve ammo.
- Firing and reloading are blocked during a weapon switch.
- Quick Sling reduces switch duration by 30% speed per stack.
- Counterweight reduces recoil by 18% per stack and does not change spread.
- Overkill damage is not counted in statistics or life steal.
- Biotic Recovery restores 2% of applied damage per stack, capped at 18 health per stack per wave.
- Pellet directions remain inside a circular spread radius.
- Projectiles cannot skip through the player between simulation points.
- Wall impacts resolve before player hits to avoid damage through cover.
- Typecheck, lint, automated tests, and production build pass before merge.

Hands-on weapon feel and balance tuning remain follow-up work after deployment.