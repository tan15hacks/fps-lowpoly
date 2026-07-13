# Pass 2 — Player Controls and Camera

This pass stabilizes desktop and mobile input, camera behavior, and touch aiming before combat balance work begins.

## Scope

- Track the active input modality instead of treating every touchscreen-capable device as touch-only.
- Allow pointer lock and desktop sensitivity on hybrid touchscreen laptops/tablets using a mouse.
- Pause safely when desktop pointer lock is unexpectedly lost.
- Prevent the click used to acquire pointer lock from firing a shot.
- Accumulate mobile look deltas so high-frequency pointer events are not dropped.
- Add a radial joystick deadzone and response curve.
- Clamp abnormal look spikes after interruptions.
- Smooth aim-down-sights field of view and reset camera state between runs.
- Reset vertical movement state on safe teleport/revive.
- Implement bounded touch aim assist when the existing Aim Assist setting is enabled.
- Debounce wheel weapon switching.
- Ignore gameplay keyboard shortcuts while an editable form control has focus.
- Add deterministic tests for control math and input modality decisions.

## Acceptance criteria

- Mouse aiming works on touchscreen-capable desktop and hybrid devices.
- Touch controls remain usable and can become active after a touch interaction.
- Acquiring pointer lock does not consume ammunition.
- Losing pointer lock during active desktop play pauses the game.
- Mobile drag distance is accumulated rather than overwritten between simulation ticks.
- Small joystick drift inside the deadzone produces zero movement.
- ADS FOV transitions smoothly and returns to the configured FOV when released or when a run ends.
- Touch aim assist only adjusts a shot inside a small angular cone and never targets through obstacles.
- Wheel input changes one weapon per deliberate scroll interval.
- Typecheck, lint, tests, and production build pass before merge.

Physical-device feel testing remains required after deployment because automated checks cannot judge final sensitivity and ergonomics.