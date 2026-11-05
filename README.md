# Christmas Arcade Fighters

A playable, original Christmas fighting game built with **Phaser 3, strict TypeScript and Vite**. No accounts, backend, ads, external runtime APIs or paid assets. The three reference screenshots are preserved in the repository and are **never used as flattened gameplay layers**.

## Run locally

Use Node.js 22 or 24 and npm.

```sh
npm ci
npm run dev
```

Open the address printed by Vite. A phone on the same network can use the machine's network address. Landscape is recommended; portrait provides a dismissible rotation hint. HTTPS or localhost is required for service workers and some gamepads. Audio starts after an explicit interaction. Some browsers require a keyboard or touch interaction before gamepad-driven play can produce audio.

```sh
npm run typecheck
npm run lint
npm test
npm run build
npm run preview
npx playwright install --with-deps chromium
npm run test:browser
```

Browser tests use a locally installed `/usr/bin/chromium` when present, otherwise Playwright's Chromium. The runner builds and verifies `dist/`, then starts a development server on 4173 and a strict production static server under `/Christmas-Arcade-Fighters/` on 4180. Tests cover desktop, Android landscape and iPhone-sized landscape viewports **in Chromium**, not physical devices or Safari. Failure traces and screenshots are written to ignored `test-results/`.

## Ultimate Edition candidate

This branch upgrades the existing Phaser game. It is playable, but **not signed off as a finished premium release**. See [GAME_AUDIT.md](GAME_AUDIT.md), [GAME_PROGRESS.md](GAME_PROGRESS.md) and [the asset pipeline](docs/ASSET_PIPELINE.md) for evidence and open quality gates.

- **Arcade:** six real best-of-three bouts across six arenas, escalating decision difficulty, three limited continues, saved campaign, bonuses, phased Frost Jamie boss and character-specific endings.
- **Versus CPU:** select fighter, opponent, stage and difficulty.
- **Training:** adjustable dummy, hitbox display, hit/damage totals, explicit practice-only full meters, reset and an interactive six-step tutorial.
- **Local Versus:** independent P1/P2 keyboard or two gamepads. The supplied P2 scheme needs a numpad. One touchscreen does not provide two-player controls.
- **Survival:** one-round waves, escalating opponents, carried health with 20% recovery between waves, and a saved result on defeat.
- **High Scores:** ten validated local results including fighter, mode, bouts and completion result. No server or account.

Jamie is balanced with fire projectiles, a charge and ground wave; Nash is a slower heavyweight with a charge, clinch and launcher; Bucket uses snowballs, an evasive step and a spinning attack; Beardy uses counters, a defensive guard and an aerial reprisal. Each has a separate full-meter Super. Frost Jamie has original ice artwork, projectiles, spires, shielding and three aggression phases.

Village Square, Seaside Pier, Santa’s Workshop, Frozen Forest, Frozen Rooftops and Frost Fortress are playable. Original illustrated planes, snow, lighting and independently moving stage props replace the old primitive scenery. Full object-separated depth and additional wildlife/toy animation remain art-production gates.

## Controls

| Action | P1 default | P2 keyboard | Standard gamepad |
| --- | --- | --- | --- |
| Move | A / D | Left / Right | Stick / D-pad |
| Jump / crouch | W / S | Up / Down | Up / Down |
| Punch / kick | J / K | Numpad 1 / 2 | A / B |
| Block (hold) | L | Numpad 3 | LB |
| Special 1 | I | Numpad 5 | Y |
| Special 2 / 3 | O / P | Numpad 6 / 7 | Forward / down + Y |
| Super | Space | Numpad 4 | RB |
| Grab | U | Numpad 0 | X |
| Heavy modifier / dash | Left Shift / Right Shift | — | Right / left trigger |
| Pause | Escape | Escape | Start |

Forward + Punch/Kick gives a heavy attack. Crouch + attack gives a low attack; jump + attack gives an aerial attack. Neutral / forward / down + Special select three moves on touch/gamepad too. Grabs beat close guards. Specials consume their documented move cost; Supers consume a separate full 100-point meter. Confirmed attacks can cancel during specified windows. Inputs are buffered, and short press/release edges are retained until simulation consumption. Jump with joystick diagonals while another finger attacks.

Settings offer remapping, music/effects/announcer volume, mute, four difficulty levels, reduced effects, touch size/opacity/position and optional vibration. Device speech is a separately labelled, disabled fallback. Lost focus pauses fights and clears inputs. Two-player keyboard ghosting depends on hardware; two gamepads are preferable.

## Architecture and assets

- `src/combat/engine.ts`: deterministic 60 Hz simulation, hit/hurtboxes, startup/active/recovery, confirmed cancels, projectiles, scaling, juggle limits, guarding/counters, throws, invulnerability, hitstop, cinematic freeze, rounds and timeout/double KO.
- `src/fighters/data.ts`: character roles, stats, signature names and move data.
- `src/animation/clips.ts`: real pose selection tied to simulation timing. No whole-character rotation/scale tricks for attacks.
- `src/ai/cpu.ts`: seeded decisions with reaction budgets, range, recovery punishment, guarding, projectiles, meters and boss aggression phases. No future inputs or difficulty stat boosts.
- `src/progression/campaign.ts`: six-bout routes, limited continues, bonuses and survival escalation.
- `src/scenes/Arena.ts` and `src/art/pixel.ts`: Phaser presentation, required atlases, parallax and pooled particles. Failed required art loads stop at a retry screen.
- `src/ui/input.ts`: independent keyboard/gamepad/multi-pointer joystick input.
- `src/audio/sound.ts`: original nine procedural music loops, differentiated effects, lazy generated WAV announcements after audio unlock.
- `src/config/storage.ts`: version-2 validated local save, version-1 migration, campaign and leaderboard.
- `src/main.ts`: menu/match coordination, HUD, progression and offline registration. `window.__CAF__` returns copied read-only diagnostics, without force-win/health mutation hooks.

Original generated PNG masters are preserved in `assets/source/`; lossless runtime WebPs and manifests are committed in `public/`. `npm run assets:prepare` requires FFmpeg, but normal installation/build does not regenerate art. `npm run voices:generate` uses development-only eSpeak NG WASM and FFmpeg for twenty-two generic robotic WAV clips. No paid service is required. The synthesizer is not bundled into the game. These announcements are not represented as studio human voice performances.

Native-scale pose continuity, planted-foot alignment, directional jumps/landings, extended victory choreography, final mix and human balance require further review. Generated art is not automatically approved because it loads. The original reference WebPs remain reference-only; no commercial game sprites, music or code are used.

## PWA and offline

The production build registers a same-origin service worker scoped to the repository directory. Installation caches the shell, hashed JS/CSS, manifest and icon. After the first complete online load, reloads and gameplay work offline. HTML and all required assets are precached as one build-tagged release. A stable worker URL is checked without HTTP caching; complete new releases activate together and refresh an already controlled client once. Failed updates retain the working offline release. No external fonts or runtime services are required. Development mode does not register the worker. Clear site data to reset offline caches and saved progress.

The manifest requests standalone landscape display. Browser/OS installation and orientation support vary. Physical iOS/Safari installation and gamepad compatibility still need device testing. The web bundle and service boundaries are compatible with a later Capacitor wrapper; native Android/iOS projects are not included.

## GitHub Pages

The workflow in `.github/workflows/pages.yml` runs lint, unit tests, a strict production build and browser smoke tests, then deploys `dist/` on pushes to `main`. In repository **Settings → Pages**, select **GitHub Actions** as the source. Pull requests run checks without deploying. No tokens beyond the workflow's scoped built-in permissions are needed.

Vite uses `/Christmas-Arcade-Fighters/` for builds and previews, and `/` for development; production CSS, JavaScript, manifest and worker URLs resolve under the repository subdirectory. Browser tests exercise the actual built app at `/Christmas-Arcade-Fighters/` and reload it with the network disabled. The prior repair passed GitHub checks, but Pages configuration/deployment protections blocked publication. See DEPLOYMENT.md for the exact required repository settings. Feature branches and PRs do not deploy.

## Known limitations

- No physical phone, Safari/WebKit, Bluetooth controller or two physical gamepads were tested. Mobile viewport tests run in Chromium.
- Human balance, animation continuity, foreground depth, audio direction and sustained physical-device performance remain open gates.
- The initial atlas download and decoded texture memory need profiling on low-end phones; audio clips load lazily, fighter sheets currently preload.
- No network multiplayer, online leaderboard, rollback netcode or native Capacitor packaging is included.
- Offline play requires a completed initial online load. Very old browsers lacking Web Audio can play silently; browsers without service workers need a network connection.
- Live Pages verification is blocked by the current environment’s destination policy and repository settings; local subpath smoke tests do not establish live deployment success.

See [TESTING.md](TESTING.md) for the completed local verification record and device-testing limits.

See [DEPLOYMENT.md](DEPLOYMENT.md) for the confirmed Pages/environment configuration failure, required settings and deployment recovery checks.
