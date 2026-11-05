# V3 production visual review — 5 November 2026

Review target: compiled release `1793917841545`, served under `/Christmas-Arcade-Fighters/`. Unedited screenshots and silent real-time WebM recordings are in `docs/review-v3/`; `scripts/capture-v3.mjs` reproduces them. The capture fails if any uncaught page error is observed. Its first run discovered a real music-table error when starting a regular opponent in the two new arenas; this was fixed, covered by an audio-unlocked production regression and recorded again.

## What was reviewed

The menu has five large primary choices over the illustrated arena, with visible fullscreen/more-modes/help actions. Character selection shows the existing identities, original Rob/Santa designs and real-pose previews. A fresh mobile save shows the two boss silhouettes locked. Arena selection offers eight actual scenes.

The fighters occupy more of the stage than the prior fixed view. The jump/camera screenshot retains the player and the world framing; automated corner-separation checks also prove expansion while the HUD stays in place. Normal grounded poses share a consistent feet baseline and shadows. Wide poses use explicit anchors rather than clipping their hands to a uniform crop. The inspector screenshot exposes the source frame/anchor and collision overlays; debug rectangles in the initial throw/guard sequence are deliberately enabled by that inspector, not normal-game decoration.

The linked throw shows the defender attached above the attacker's position, then displaced on release. Directional guarding uses away movement rather than a separate block button. Every playable fighter's three specials and Super were driven through controls in training, using the visible FULL METERS button. Supers retain the fighters and scenery in view, with aura/lighting/particles and signature poses rather than a portrait interruption. Santa's North Pole and Rob's Collection Hall are distinct illustrated scenes.

Boss recordings start from explicitly declared saved levels 8 and 10, use a seeded CPU choosing actual keyboard inputs at real-time rendering speed, and never change health, timers, winners or progression. Both recorded encounters ended in player wins with the corresponding earned unlock; capture.json records these outcomes and an empty page-error list. They are encounter-review evidence, not a claimed full-route win. The separate `earned-championship-leaderboard.png` comes from the genuine ten-bout input-driven test, including both boss unlocks and save reload.

Mobile captures compare default controls with compact left-handed placement. Browser layout/input/fullscreen checks passed at Android and iPhone-sized landscape dimensions. These captures do not substitute for physical Safari, actual controllers or two-thumb comfort review.

## Limits and remaining direction

The recordings are silent and encoded at 25 FPS; this is not evidence of sustained 60 FPS gameplay on a physical phone. PCM integrity tests do not approve the announcer's robotic delivery or the final mix. All 31 clips still need an approved professional performance.

The runtime frame repair removes disconnected atlas debris and preserves connected bodies, but cannot reconstruct source anatomy/limbs already drawn imperfectly. Foot/world-speed matching, directional jump/dash extensions, richer heavy/victory animation, fully separated foreground depth, all-character human balance and mobile texture/download/thermal profiling remain open gates. The unpacked build is approximately 36 MiB and fighter textures currently preload. This review supports a playable release candidate and does not sign off premium production quality.
