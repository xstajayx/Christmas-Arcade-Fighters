# Christmas Arcade Fighters — V3: Arcade Evolution

An original Christmas fighter built with Phaser 3, strict TypeScript and Vite. V3 upgrades the existing game in place. It is a **playable release candidate**, with art, professional voice, human balance and physical-device approval still open. See [V3_PROGRESS.md](V3_PROGRESS.md).

## Play locally

Use Node.js 22 or 24:

```sh
npm ci
npm run dev
```

Landscape is recommended. Audio unlocks after a player gesture. Fullscreen uses the browser API where available and offers an immersive layout when unavailable. Safari/iPhone behavior still requires device review.

```sh
npm run typecheck
npm run lint
npm test
npm run build
npm run verify:dist
npm run test:browser
```

Browser checks use installed Chromium or Playwright Chromium. They exercise desktop and Android/iPhone-sized landscape viewports, not physical devices or Safari. A strict static server serves the compiled artifact under `/Christmas-Arcade-Fighters/`; source HTML must never be published directly.

## Campaign and modes

The Arcade route contains ten main fights:

| Level | Challenge |
| --- | --- |
| 1 | Village welcome |
| 2 | Speed and spacing |
| 3 | Projectile pressure |
| 4 | Guard and punish |
| 5 | Throw specialist |
| 6 | Confirm and cancel |
| 7 | Aggressive winter gauntlet |
| 8 | **The Rob Father** — major boss; unlocks his balanced playable profile |
| 9 | **Frost Challenge** — advanced rival |
| 10 | **Santa** — three-phase final boss; unlocks balanced Santa and the championship badge |

The route is data-driven: arena, opponent, AI style, decision difficulty, dialogue and unlock rewards are defined per fight. Three initial continues, a refill checkpoint after Rob Father, next-opponent/arena previews, bonuses, endings and local scores remain available. Boss difficulty comes from patterns and phase rules as well as a separate stat profile; unlocked characters use standard health/meter/recovery and do not inherit boss armour.

The primary arcade menu contains **Arcade, Versus, Training, Characters and Options**. Additional modes are in the secondary menu: CPU exhibition, local versus, survival, high scores and credits. Training includes configurable dummy behavior, explicit practice-only full meters, an interactive tutorial and a sprite inspector with frame, feet-anchor, pushbox, hitbox, hurtbox and camera overlays. Local versus needs independent keyboard controls or two gamepads; one touchscreen is not a two-player controller.

Eight arenas are selectable, including the Collection Hall and Santa’s Throne at the North Pole. Random arena selection is available outside the campaign. The ten campaign challenges reuse existing arenas where appropriate rather than adding filler stages.

## Controls

| Action | P1 keyboard | P2 keyboard | Standard gamepad |
| --- | --- | --- | --- |
| Move | A / D | Left / Right | Stick / D-pad |
| Jump / crouch | W / S | Up / Down | Up / Down |
| Punch / kick | J / K | Numpad 1 / 2 | South / east |
| Guard | Hold **away** from opponent | Hold away | Hold away |
| Low guard | Down + away | Down + away | Down + away |
| SP1 Dash | I | Numpad 5 | North (Y / Triangle) |
| SP2 Projectile | O | Numpad 6 | LB / L1 |
| Super | Space | Numpad 4 | RB |
| Grab / throw break | U | Numpad 0 | West |
| Heavy modifier | Left Shift | Numpad 8 | Right trigger |
| Dash | Right Shift | Numpad 9 | Left trigger |
| Pause | Escape | Escape | Start |

Holding away walks backwards outside a threat, then guards eligible incoming attacks. Low attacks beat standing guard; overheads beat crouching guard; mids can be guarded either way. Committed attacks cannot turn into instant guards. Throws beat normal guarding and require a grounded, eligible opponent in range. A successful grab links both bodies, lifts the defender and releases into a throw/landing; a fresh Grab can break the initial hold. Whiffs recover, and knockdown/throw immunity prevents immediate repeat throws.

Forward + Punch/Kick gives heavy attacks. Crouch + attack gives a low, and jump + attack gives an aerial attack. SP1 always dashes and SP2 always fires a projectile, including while holding a direction. Gamepad combat buttons can be reassigned in Controls. Specials spend their configured meter cost; Supers spend a separate full meter. Supers stay in the arena with aura, lighting, trails, impacts and camera feedback rather than a portrait pop-up.

Touch controls have six attack buttons (Punch, Kick, Grab, SP1 Dash, SP2 Projectile, Super), joystick diagonals and independent pointers. Options retain remapping, volume/mute, reduced effects, touch opacity/size/placement, vibration, compact layout and left-handed layout. Lost focus pauses combat and clears inputs.

## Engineering and asset pipeline

- `src/combat/engine.ts`: deterministic 60 Hz state, independent collision geometry, buffered confirmed cancels, projectiles, directional guarding, linked throws/breaks, armour windows and boss phases.
- `src/fighters/data.ts`: identities, standard/boss balance profiles, move data and ending dialogue.
- `src/camera/framing.ts`: pure two-fighter framing, safe expansion, smooth contraction and visibility bounds. Initial framing is 25% closer; the DOM HUD/touch controls never zoom with the world.
- `src/art/frames.ts`: exact-cell body isolation, normalization and explicit frame anchors; renderer mirroring compensates for per-frame pivots. Collision does not depend on transparent padding.
- `src/scenes/Arena.ts`: nearest-neighbor presentation, dynamic camera, pooled effects, integrated Supers and stage atmosphere.
- `src/progression/campaign.ts`: ten-level route, challenges, difficulty modifiers, scoring and survival.
- `src/config/storage.ts`: version-3 save, validated unlocks, badges and migration. Old Frost progress maps to level 9; old scores/settings/continues survive without granting unearned new bosses.
- `src/audio/sound.ts`: original procedural themes/effects and lazy manifest-based WAV announcements.

Original PNG masters remain in `assets/source/`. Runtime WebPs and WAVs are committed, so ordinary installation/build needs no generator or paid service. `npm run assets:prepare` and `npm run voices:generate` require FFmpeg; the latter uses development-only eSpeak NG WASM. It is not bundled into the browser. See [V3 asset notes](docs/V3_ASSETS.md) and [audio production requirements](docs/V3_AUDIO.md).

## Verification and release limits

Current master directive work: [V3_MASTER_PROGRESS.md](V3_MASTER_PROGRESS.md), [V3_MASTER_TEST_REPORT.md](V3_MASTER_TEST_REPORT.md) and [V3_MASTER_RELEASE_NOTES.md](V3_MASTER_RELEASE_NOTES.md).

Historical V3 evidence: see [TESTING.md](TESTING.md), [V3_PROGRESS.md](V3_PROGRESS.md) and `docs/review-v3/` for actual tests, screenshots and recordings. Generated sheets still need art direction for anatomy, foot planting, extended directional jumps/dashes and victory choreography. Robotic announcements are not a studio voice performance. Human balance, physical phones/Safari/controllers, sustained 60 FPS/thermal behavior and low-end texture/download budgets remain open gates.

The existing Pages workflow installs with `npm ci`, builds/tests the same `dist/` artifact and deploys only from main. Repository-subpath asset references and atomic complete-release offline caching are preserved. Feature branches/PRs do not deploy. See [DEPLOYMENT.md](DEPLOYMENT.md) for the separate repository settings and live-access limits; local success does not establish live publication.

No accounts, backend, external runtime APIs, copied commercial game assets, online multiplayer or online leaderboard are included. Network multiplayer, watch-CPU mode, custom round/timer options and additional filler arenas were deferred to prioritize the requested camera, animation, combat and boss work.
