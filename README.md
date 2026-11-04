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

## What is playable

- **Arcade:** four consecutive bouts (the other three fighters, then a mirror rival), saved bout progress, ending, clear count and personal best. Pick difficulty before starting. A win unlocks the next bout; a loss offers rematch. All fighters and stages are available from the beginning.
- **Training:** no timer, health restored after KO, standing/blocking/attacking/jumping/random dummy, hit and damage totals, reset.
- **Versus:** two independent keyboard mappings, or two gamepads. **A keyboard with a numpad or two gamepads is needed for the supplied two-player scheme.** One touchscreen alone does not provide two-player controls. Both players can select the same fighter.
- Four fighters with different health, movement, damage, reach and specials: Jamie's Holly Haymaker, Nash's dashing Polar Rush, Bucket's low Snowball Slam and Beardy's launching Yuletide Uppercut.
- Four separate layered arenas: Village Square, Seaside Pier, Santa's Workshop and Frozen Rooftops. Snow, parallax, tree lights, wheel lights and workshop conveyor gifts animate independently of the fighters.
- Fixed-step combat, high/low guarding, throws, airborne attacks, meter, hitstop, knockback, combos, juggle cap, round wins, double KO, timeout, rematch, pause, synthesized music/effects and persistent settings.

## Controls

| Action | P1 default | P2 keyboard | Standard gamepad |
| --- | --- | --- | --- |
| Move | A / D | Left / Right | Stick / D-pad |
| Jump / crouch | W / S | Up / Down | Up / Down |
| Punch | J | Numpad 1 | A / south |
| Kick | K | Numpad 2 | B / east |
| Block (hold) | L | Numpad 3 | LB |
| Special | I | Numpad 5 | Y / north |
| Grab | U | Numpad 0 | X / west |
| Pause | Escape | Escape | Start |

Crouch + attack makes a low attack; jump + attack makes an aerial attack. Hold block for high attacks and crouch + block for lows. Grabs beat guards at close range. Specials cost 40 meter; both landing and receiving hits build it. Attack buttons trigger on a fresh press, rather than automatically repeating while held. A nine-frame buffer accepts presses just before recovery ends. Touch direction and attack buttons support simultaneous pointers; each captures and releases independently. Size is adjustable in Settings.

P1 keyboard bindings are remappable; duplicates and unsupported keys are rejected. Arrow keys remain reserved for P2 to keep the local keyboard sets independent. Arrow keys navigate menus, Tab also works, and Enter activates the focused button. Gamepad directions and A navigate menus. Native selects can use the keyboard or touch. Lost focus/backgrounding pauses a fight and clears held input.

## Architecture

- `src/combat/engine.ts`: serializable deterministic 60 Hz state machine; no Phaser, DOM, audio or wall-clock dependency. Snapshots hit contacts before damage for consistent trades. A per-move latch prevents repeat damage; hitstop freezes simulation, startup/active/recovery frames gate hits, pushboxes prevent ground overlap. Rounds use health percentage at timeout, draws replay without awarding a point. Combo damage scales, juggle hits cap at three, and knockdown/recovery have invulnerability. Stun is shorter than a repeated attack cycle to prevent basic button-loop infinites.
- `src/fighters/data.ts`: fighter statistics, move timings, levels, ranges, costs, launch/dash properties. Add fighter data here before supplying new art.
- `src/ai/cpu.ts`: seeded finite-decision CPU. Difficulty changes decision delay, guard probability and aggression. It approaches, retreats, blocks visible attacks, punishes recovery and spends meter; it does not read future inputs or change health/damage. AI decisions share the same input and simulation path as the player.
- `src/scenes/Arena.ts`: Phaser presentation, generated textures, fighter poses, parallax, particles, snow and camera shake. A bounded accumulator consumes simulation steps independently of render rate; excess wall time is capped after stalls to avoid a spiral.
- `src/art/pixel.ts`: original deterministic pixel-art generator; independent stage layers and transparent fighter sheets.
- `src/ui/input.ts`: separate keyboard, gamepad and multi-pointer touch input.
- `src/main.ts`: menu/match coordinator, round HUD, settings, progression and service-worker registration. `window.__CAF__` exposes **read-only copied diagnostics** to tests; it cannot mutate health or force KOs.
- `src/audio/sound.ts`: original oscillator-based score and effects, browser-compliant unlock and volume/mute.
- `src/config/storage.ts`: versioned, validated local save; corrupt/blocked storage falls back to defaults. No data is transmitted.

## Artwork and replacement

**The fighter art is coherent, animated procedural placeholder art, not finished portrait-quality likenesses.** No separate character photographs were present. Features follow the supplied screenshots (Jamie's red knit, Nash's tracksuit and brown fringe, Bucket's green hat/glasses, Beardy's green coat and beard). The stages are original simplified pixel environments; they are not a claim of matching the reference's illustration quality. No commercial fighting-game sprites or music were copied.

See `public/asset-manifest.json` for dimensions, ordering, pivots and fallback details. Exported runtime sheets are in `public/sprites/` and match the generator. Each fighter sheet is **1344 × 128**, twelve horizontal **112 × 128** transparent frames:

| Frame | Pose |
| --- | --- |
| 0 / 1 | Idle / walking alternate |
| 2 / 3 | Crouch / jump |
| 4 / 5 | Punch or grab / kick, low or aerial |
| 6 / 7 | Guard / hitstun or knockdown |
| 8 / 9 | Special / anticipation |
| 10 / 11 | Victory / defeat |

Pivot is `(0.5, 0.97)`, facing right; Phaser mirrors facing left. Rendering scale is 1.45 with nearest-neighbour sampling. To replace art, retain frame dimensions and pivot, preload a local sheet under a new key, then swap the corresponding generated texture key. Keep the local generator as fallback on load error. Tune combat hurtboxes and hitboxes with the new silhouette; visuals do not determine collision. Stages are 800 × 450 with separate distant, midground and ground textures. The world floor is simulation Y=300 and presentation Y=350. Original reference WebPs remain reference-only.

Audio uses a 32-step original melody and synthesized effects. A production art pass can add more in-between poses, character-specific move choreography, richer dithering, unique impact samples and a longer soundtrack without changing the simulation.

## PWA and offline

The production build registers a same-origin service worker scoped to the repository directory. Installation caches the shell, hashed JS/CSS, manifest and icon. After the first complete online load, reloads and gameplay work offline. HTML and all required assets are precached as one build-tagged release. A stable worker URL is checked without HTTP caching; complete new releases activate together and refresh an already controlled client once. Failed updates retain the working offline release. No external fonts or runtime services are required. Development mode does not register the worker. Clear site data to reset offline caches and saved progress.

The manifest requests standalone landscape display. Browser/OS installation and orientation support vary. Physical iOS/Safari installation and gamepad compatibility still need device testing. The web bundle and service boundaries are compatible with a later Capacitor wrapper; native Android/iOS projects are not included.

## GitHub Pages

The workflow in `.github/workflows/pages.yml` runs lint, unit tests, a strict production build and browser smoke tests, then deploys `dist/` on pushes to `main`. In repository **Settings → Pages**, select **GitHub Actions** as the source. Pull requests run checks without deploying. No tokens beyond the workflow's scoped built-in permissions are needed.

Vite uses `/Christmas-Arcade-Fighters/` for builds and previews, and `/` for development; production CSS, JavaScript, manifest and worker URLs resolve under the repository subdirectory. Browser tests exercise the actual built app at `/Christmas-Arcade-Fighters/` and reload it with the network disabled. The workflow is supplied but has not been executed or published from this workspace. Publishing requires committing/pushing and repository Pages configuration.

## Known limitations

- Placeholder art needs a dedicated pixel-artist pass for final likenesses, more expressive animation, hand-dithering and stage detail.
- No physical phone, Safari, Bluetooth controller or two physical gamepads were tested here. Emulated touch and separate keyboard inputs are testable locally.
- Keyboard ghosting can restrict simultaneous local-versus combinations on some hardware; two gamepads are preferable.
- No network multiplayer, online leaderboard, rollback netcode, native Capacitor packaging or commercial asset licensing pipeline is included.
- Combat is an approachable original system; it still needs human balance/playtesting. Special moves are melee/dash attacks, not projectile systems.
- Offline play requires a completed initial online load. Very old browsers lacking Web Audio can play silently; browsers without service workers need a network connection.

See [TESTING.md](TESTING.md) for the completed local verification record and device-testing limits.

See [DEPLOYMENT.md](DEPLOYMENT.md) for the confirmed Pages/environment configuration failure, required settings and deployment recovery checks.
