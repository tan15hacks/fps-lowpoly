# Polygon Outpost

Polygon Outpost is a complete offline low-poly first-person wave-survival shooter built with Three.js and strict TypeScript. Defend a remote desert research outpost through 15 waves, defeat escalating bosses on waves 5, 10, and 15, choose temporary run upgrades, and decide how to distribute ten generator power units among five support systems.

## Version 1 feature set

- Complete main-menu-to-final-results game flow
- Procedural low-poly desert outpost with buildings, containers, barriers, crates, rocks, watchtower, generator, stations, perimeter fence, and eight concealed entry routes
- Desktop pointer-lock FPS controls and responsive multi-touch mobile controls
- Pistol, SMG, and shotgun with distinct firing, recoil, spread, ammunition, reload behavior, muzzle effects, weak-point critical hits, and synthesized audio
- Runner, Brute, Spitter, and three escalating boss encounters
- Obstacle-aware steering, line-of-sight checks, personal spacing, spawn pacing, active-enemy caps, and stuck recovery
- Fifteen handcrafted waves with controlled procedural timing
- Ten-unit power grid: turret, electric fence, healing station, ammo station, and scanner floodlights
- Twenty-five temporary upgrades in four rarity tiers
- Ten five-level permanent upgrade tracks
- Recruit, Soldier, and unlockable Veteran difficulty
- Coins, health, armor, ammunition, and power-cell pickups
- Score, combo, run results, lifetime statistics, 18 achievements, and six cosmetic weapon themes
- IndexedDB save storage with localStorage fallback, schema migration, corruption handling, import, and export
- Settings for graphics, sensitivity, FOV, motion comfort, mobile layout, UI scale, accessibility, audio, and gameplay feedback
- Installable offline PWA with a service worker and update notification
- Capacitor configuration and native Android back-button/app-state hooks
- Optional rewarded-ad architecture that remains hidden when no supported ad adapter is available
- Unit tests for combat math, reloads, ammunition, upgrades, power limits, rewards, scaling, saves, and reward deduplication

## Technology

- Three.js
- TypeScript with strict mode
- Vite
- Capacitor 7
- Browser-native collision and steering solution
- IndexedDB with localStorage fallback
- Web Audio API synthesis
- Vitest
- ESLint and Prettier

No remote backend, login, account, cloud save, API key, or network connection is required for normal gameplay.

## Folder structure

```text
fps-lowpoly/
├── public/
│   ├── icons/
│   ├── manifest.webmanifest
│   └── sw.js
├── src/
│   ├── combat/
│   ├── core/
│   ├── data/
│   ├── enemies/
│   ├── monetization/
│   ├── outpost/
│   ├── player/
│   ├── styles/
│   ├── types/
│   ├── ui/
│   ├── upgrades/
│   ├── utils/
│   ├── visuals/
│   ├── waves/
│   ├── weapons/
│   ├── world/
│   └── main.ts
├── tests/
├── capacitor.config.ts
├── eslint.config.js
├── index.html
├── package.json
├── tsconfig.json
└── vite.config.ts
```

## Install and run

Requirements:

- Node.js 20 or newer
- npm 10 or newer

```bash
npm install
npm run dev
```

Open the local URL printed by Vite. Click the rendered scene once to unlock browser audio and pointer lock.

## Validation commands

```bash
npm run typecheck
npm run lint
npm run test
npm run build
npm run preview
```

The production output is generated in `dist/`.

## Controls

### Desktop

| Action | Control |
| --- | --- |
| Move | W, A, S, D |
| Look | Mouse |
| Fire | Left mouse |
| Aim | Right mouse |
| Sprint | Shift |
| Jump | Space |
| Reload | R |
| Interact | E |
| Switch weapon | 1, 2, 3 or mouse wheel |
| Pause / release cursor | Escape |

### Mobile

Use the left joystick to move and drag the right half of the screen to look. Dedicated multi-touch buttons handle fire, aim, reload, jump, sprint, interaction, weapon switching, and pause. Landscape orientation is required; portrait mode displays a rotate-device screen. Safe-area insets are respected.

## Gameplay and balancing configuration

Major balance data is intentionally centralized:

- Weapons: `src/data/weapons.ts`
- Base enemy stats: `src/data/enemies.ts`
- Fifteen wave definitions: `src/data/waves.ts`
- Temporary upgrades: `src/data/upgrades.ts`
- Achievement targets: `src/data/achievements.ts`
- Difficulty scaling: `src/utils/difficulty.ts`
- Permanent costs: `src/upgrades/PermanentUpgradeManager.ts`
- Power costs: `src/outpost/PowerGrid.ts`
- Outpost system behavior: `src/outpost/*.ts`
- Reward formula: `src/utils/rewards.ts`

Strong enemy attacks use visible emissive telegraphs and recovery windows. Boss aggression rises below 50% health, and the wave-15 boss has an additional enraged phase. Mobile enemy counts are capped instead of deleting required wave enemies; the wave manager delays queued spawns until space is available.

## Save system

`SaveManager` uses IndexedDB as primary storage and mirrors a fallback copy in localStorage. Data includes:

- Permanent credits and upgrade levels
- Settings and accessibility preferences
- Tutorial completion
- Veteran unlock state
- Achievements and completion dates
- Lifetime statistics
- Cosmetic ownership and loadout
- Save schema version

Every load is migrated and sanitized. Upgrade levels are clamped to 0–5, credits cannot become negative, unknown or invalid cosmetic selections fall back to Standard, and malformed imported files are rejected. Purchases and completed runs trigger explicit saves.

Use **Settings → Export Save** to download JSON and **Settings → Import Save** to validate and restore it.

## PWA and offline use

The web manifest is in `public/manifest.webmanifest`; `public/sw.js` caches the application shell and runtime assets after production deployment. Service-worker registration occurs only in production, preventing stale development caching. A small reload control appears when a new service-worker version takes control.

Deploy the contents of `dist/` to any HTTPS static host. Capacitor builds use the same `dist/` output.

## Android / Capacitor setup

The repository includes `capacitor.config.ts` with:

- App name: `Polygon Outpost`
- Default application ID: `com.tan15hacks.polygonoutpost`
- Web directory: `dist`
- Secure Android scheme
- Native back-button and app-state handling

Generate the native Android project after installing dependencies:

```bash
npm run build
npm run cap:add
npm run cap:sync
npx cap open android
```

In Android Studio:

1. Allow Gradle synchronization to finish.
2. Set the app orientation to landscape in `android/app/src/main/AndroidManifest.xml` if the generated Capacitor template does not already inherit it:

   ```xml
   android:screenOrientation="sensorLandscape"
   ```

3. Confirm the package name in `capacitor.config.ts` before publishing. Changing it after the first store release creates a different application.
4. Test touch, audio pause/resume, backgrounding, back-button behavior, safe areas, and process recreation on physical phones and tablets.
5. Build an Android App Bundle with **Build → Generate Signed Bundle / APK → Android App Bundle**.
6. Keep signing keys and passwords outside this repository.

After every web change:

```bash
npm run cap:sync
```

## Optional rewarded advertisements

Version 1 does not require advertisements. Browser play remains complete without them, and unavailable ad buttons stay hidden.

Copy `.env.example` to `.env.local` when integrating a supported Capacitor AdMob plugin:

```env
VITE_ADMOB_ANDROID_APP_ID=
VITE_ADMOB_REWARDED_REVIVE_ID=
VITE_ADMOB_REWARDED_DOUBLE_CREDITS_ID=
VITE_ADMOB_REWARDED_REROLL_ID=
```

Never commit production identifiers, signing credentials, or service-account files. Development builds should use the official test IDs supplied by the selected advertisement SDK. `AdService`, `WebAdService`, `CapacitorAdService`, and `RewardGuard` define availability checks, successful-completion rewards, and duplicate-callback protection. Connect the actual plugin inside `CapacitorAdService` only after choosing and installing an official maintained adapter.

## Adding content

### Add a weapon

1. Extend `WeaponId` in `src/types/game.ts`.
2. Add its balance entry to `src/data/weapons.ts`.
3. Instantiate it in `WeaponManager`.
4. Add a procedural model builder and sound profile.
5. Add an unlock rule and any weapon-specific upgrades.
6. Add ammunition, reload, damage, and switching tests.

### Add an enemy

1. Extend `EnemyKind`.
2. Add base stats to `src/data/enemies.ts`.
3. Build the low-poly visual in `Enemy` or a dedicated subclass.
4. Add movement and attack logic in `EnemyManager`.
5. Add wave entries, drop balance, scoring, and statistics.
6. Verify obstacle navigation, line of sight, telegraphs, removal, and pooling behavior.

### Add a temporary upgrade

Add one entry to `src/data/upgrades.ts`, then implement its numerical effect at the relevant system call site. Set a rarity, stack cap, and optional required weapon. `UpgradeManager.draw` automatically prevents maxed or unavailable cards.

### Add a map

Create a class matching `OutpostMap` with a Three.js group, `CollisionWorld`, system nodes, safe revive position, and concealed spawn points. Keep gameplay collision boxes synchronized with visible blocking geometry.

## Asset licensing

All visible game models are assembled procedurally from Three.js geometry and the interface uses CSS. Sound effects and ambient tones are synthesized at runtime with Web Audio API. The repository does not contain copyrighted music, characters, logos, textures, or third-party art packs.

Three.js, Vite, Capacitor, TypeScript, Vitest, ESLint, and Prettier retain their respective upstream licenses.

## Troubleshooting

### Pointer lock does not start

Click directly on the 3D scene after starting a wave. Browsers require a user gesture.

### No sound

Click or tap once. Web Audio must be resumed after a user gesture. Also check master and effects volume.

### Mobile page moves or zooms

Gameplay uses `touch-action: none`, disabled user scaling, passive-event-safe controls, and overscroll prevention. Verify the page is opened from the production build rather than embedded inside another scrolling document.

### Black screen after Android sync

Run `npm run build`, verify `dist/index.html` exists, then run `npx cap sync android`. Confirm `webDir` remains `dist`.

### Service worker shows an old version

Close every installed PWA/browser tab, clear site data once, then reload. Development mode intentionally skips service-worker registration.

### Low frame rate

Select Low graphics, reduce resolution scale, disable shadows, reduce the active-enemy cap, disable damage numbers, and reduce camera effects.

## Google Play preparation checklist

- Change or confirm the final application ID before first release
- Generate the Android project and sync the latest `dist/`
- Provide adaptive launcher icons and Play Store feature graphics
- Test landscape on phone and tablet aspect ratios
- Test offline startup after first install
- Test app background/resume and Android back behavior
- Run typecheck, lint, tests, and production build
- Remove development advertisement test IDs from release builds
- Add production ad IDs only through environment configuration
- Create and securely back up a release signing key
- Build a signed AAB
- Complete Data Safety accurately; the base game has no account or backend
- Add a privacy policy if an advertisement SDK is enabled
- Complete content-rating and target-audience declarations
- Test internal-track installation before production rollout

## Known environment note

The initial repository was created in an execution environment without outbound package-registry access or Android Studio. Strict TypeScript validation was performed with the available TypeScript compiler. Run the full npm validation command set after `npm install`, then generate the native `android/` directory with Capacitor on a machine that has package and Android SDK access.
