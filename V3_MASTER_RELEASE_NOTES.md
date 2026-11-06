# V3 Ultimate candidate release notes — 6 November 2026

This is a verified-foundations development candidate. It is not premium completion or a production publication.

## Player changes

- Fighters maintain physical width and side order on the ground, including corners. Training debug uses the engine's push/hurt/hit/throw/projectile geometry and a colour legend.
- Walking follows distance travelled, accelerates/brakes and stops cycling against a wall. Dashing has a distinct state/pose sequence. The existing closer dynamic camera stays independent of HUD and touch controls.
- SP1 always dashes; SP2 always launches a projectile, regardless of direction. Keyboard I/O, touch SP1/SP2, gamepad Y/LB. Grab and Super stay separate. Playable bosses follow these rules; boss encounters retain their extra named attacks.
- Beardy fires a damaging pixel-art holly projectile instead of an unclear defensive effect.
- Normal health is approximately 1100–1350. Normal/special/Super damage, scaling and meter follow centralized tuning; bosses use separate profiles. No ordinary combo plus special can erase a full bar. Broad human balance remains open.
- Larger segmented special/Super displays expose actual charge, ready state and a ready sound. Effects respect reduced settings.
- Options are grouped into Audio, Controls and Gameplay. Round wins, timer and screen shake persist alongside existing key/touch/audio preferences. Fullscreen retains native/fallback handling. Six gamepad combat buttons can be reassigned; choosing an occupied button swaps the actions. Existing scores, campaign progress and earned unlocks remain.
- Announcements have priority, cooldown and async ordering protection. Stage motifs add bell partials and music changes fade in. These are procedural arrangements and robotic fallback voices, not professional audio approval.

## Exact outstanding professional recordings

Existing 31 robotic clips require approved replacement performances (full filename list in docs/V3_AUDIO.md). The consolidated directive additionally requires these performances/manifest integrations: `christmas-arcade-fighters` (CHRISTMAS ARCADE FIGHTERS!), `special-attack` (SPECIAL ATTACK!), `super-ready` (SUPER READY!), `super-attack` (SUPER ATTACK!), `christmas-arcade-champion` (CHRISTMAS ARCADE CHAMPION!). Current `super`/`congratulations` fallback calls are not claimed to satisfy those exact final recordings. Character-name, round/fight/counter/combo/KO/result/challenger/boss/final-battle recordings also require professional replacement. No high-quality voice-generation service or recording pack is available in this environment. Device speech remains optional and disabled by default.

## Remaining art, music and acceptance work

Source anatomy/foot planting, natural backward locomotion, directional jump/dash/heavy extensions, coordinated attacker/defender throw drawings, extended victories and convincing new launch poses for Nash/Beardy/Rob projectiles need further authored art. Existing appropriate source rows are reused; they are not new finished animation. Environments retain the existing illustrations/atmosphere and need final foreground-depth art direction. Finished festive compositions/mixes for Village, Pier, Workshop, Forest, Rooftops, Fortress, Rob and Santa/final phase still require composition/listening approval; existing original motifs remain functional, distinct placeholders for that production gate.

Physical two-thumb/Safari/controller testing, low-end texture/download budgets, sustained mobile frame rate/thermals and 45–75-second typical human round validation remain open. Browser viewports are Chromium simulations. See V3_MASTER_PROGRESS.md for every phase's status.

No merge or deployment is authorized by a passing local test alone. Existing GitHub Pages workflow/base/artifact/cache protections are preserved. Direct Pages and GitHub API access are unavailable under the current managed network policy; no live release or new PR is assumed.
