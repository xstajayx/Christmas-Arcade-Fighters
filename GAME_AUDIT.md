# Game audit — 5 November 2026

Scope: inspected combat/fighter/AI data, Phaser rendering, pixel generator and exported sheets, input, menus, persistence, audio, tests, build and Pages workflow. Reference assets are the three repository WebPs; no separate photographs, competing-game screenshots, production voice clips or finished animation atlases were supplied.

## Working foundation

- Strict TypeScript/Phaser 3/Vite; separate deterministic 60 Hz combat simulation and renderer.
- Four selectable fighters, four layered arenas, keyboard/gamepad/multi-pointer controls, pause on focus loss, best-of-three rounds, meter, hitstop, throws, timeout, trade/draw handling and dummy behaviours.
- Local saves with validation, synthesized original music/effects, offline versioned precache, explicit Pages base and artifact verification. The previous deployment repair is preserved.
- Existing unit and browser suites exercise real combat and built assets. They do not certify finished art, physical-device performance or studio audio.

## Incomplete and defects

- Twelve simple generated poses per fighter: most attacks use one contact pose, walking bobs instead of articulating legs, crouch/defeat use whole-image transforms. This fails the requested animation quality gate. The small block-based artwork is placeholder quality.
- Nash is currently the speedster and Bucket the heavyweight, opposite the new character specification.
- One special per fighter; no projectile simulation, cancel chains, heavy normals, counter window, separate super resource or boss system. Current combo display counts nearby hits, not guaranteed cancel sequences.
- Four-fight campaign ends at a normal mirror fighter; no six-level campaign, boss phases, bonus breakdown, continues, survival, CPU exhibition or leaderboard.
- Four stages lack the requested forest/fortress. Existing scenery is simplified procedural art.
- D-pad needs multiple directional touches for diagonals; no analog joystick, Super control, opacity/placement settings or vibration.
- Music is one short synthesized sequence; normal impacts share a sound; no recorded announcer, stage/boss tracks or cinematic Supers. No voice-generation tool is available in this session.
- Rendering allocates rectangles/tweens for every impact, switches textures every frame and uses wall-clock animation instead of simulation ticks.
- No interactive combat tutorial or training hitbox display. Several UI labels hard-code four stages/bouts.
- Prior Pages run was blocked by repository settings, not compilation. Do not remove environment protections to make release green; deployment still needs external configuration/access verification.

## Replace versus retain

Retain the engine, data-driven timing, Phaser scene, UI shell, input abstraction, save validation and Pages build/cache pipeline. Upgrade combat and mode flow in place. Replace fighter animation production/rendering with explicit clips and frame metadata; replace the per-hit particle allocation with a pool. Extend stage generation/layers instead of replacing the application or using a flattened reference screenshot.

## Missing production assets

Original multi-frame fighter atlases, boss animations, high-resolution portraits, final stage illustration layers, consistent announcer WAVs and final mixed stage/boss/ending audio. Image generation is available and will be used; generated assets must be inspected before integration. Speech synthesis is only an explicitly labelled optional fallback. Final likeness/animation/audio approval and physical phone testing remain production gates.

## Prioritised roadmap

A. Add cancel chains, three specials per fighter, real projectiles/counters/guard effects, Supers and deterministic regression tests. Correct character roles.
B. Generate original animation/portrait assets, define reusable frame clips and inspect atlases in motion; never mark an inadequate atlas finished.
C. Add move-specific audio/VFX, cinematic Super overlays, pooled particles and announcer clip manifest/fallback.
D. Extend to six layered stages with ambient motion and stage-specific palettes.
E. Implement six-bout campaign, phased Frost Jamie boss, bonuses, continues and endings with pure progression tests.
F. Add CPU exhibition, survival, local high scores, training hitboxes and interactive tutorial; implement a real multi-pointer joystick and adjustable controls.
G. Run strict build/lint/unit/browser/production checks, capture screenshots/video and update GAME_PROGRESS.md with evidence and unresolved quality gates. Release only a tested build; do not claim repository settings or live deployment were changed without evidence.

## Implementation follow-up

The initial “no voice-generation tool” finding was resolved with a development-only eSpeak NG WASM pipeline and FFmpeg. Twenty-two original robotic WAV clips are now committed; this is not a human/studio voice-quality sign-off. The original audit describes the starting repository, not the current feature branch. See `GAME_PROGRESS.md` and `TESTING.md` for implementation evidence and remaining production gates.
