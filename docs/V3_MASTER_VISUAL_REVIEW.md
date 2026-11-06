# V3 Ultimate candidate visual review — 6 November 2026

Reviewed compiled release `1793965144771` under `/Christmas-Arcade-Fighters/`. `docs/review-master/` contains 44 unedited screenshots, a 94.60-second silent real-time WebM, capture metadata with no uncaught page errors and a separate 16-round CPU balance probe. The video is encoded at 25 FPS, not a physical-device frame-rate measurement. `scripts/capture-master.mjs` reproduces the review; it explicitly declares an unlocked-roster training fixture and uses the visible FULL METERS control. It never alters combat health, timers, winners or earned progression.

## Observations

The first mathematical pushbox repair was insufficient: the actual idle silhouettes still overlapped. That result was rejected. Final `jamie-spacing.png` and `santa-spacing.png` show distinct bodies/feet at close range rather than one fighter standing behind another. Physical widths now follow the 108–119-unit source stance scale with a little separation allowance. Normal endpoints were measured from the source frame/feet pivot; modest edge allowance and explicit pixel kick glints replace the previous too-short ranges. Broader all-pose contact/art approval remains open.

`collision-geometry.png` shows the actual engine push/hurt boxes independently of the larger sprite frame bounds, with readable gold/purple/green/red/pink/cyan legend and feet anchors. Hit and throw boxes appear only during their active windows; projectile boxes use the live projectile geometry. The larger sprite rectangle is deliberately labelled, not treated as a hurtbox. Debug text was moved into view rather than left behind the training HUD.

The linked-throw capture shows the defender lifted relative to the attacker; the initial pull now interpolates from the detected position. Damage remains delayed until release. The recording covers each playable fighter's SP2 while crouching, approach, SP1 dash and integrated Super. Beardy's projectile is an identifiable holly sprite with actual damage/lifetime tests, rather than a defensive green bubble.

Sampled sequential video frames confirm visible pose changes during approach; source code and runtime tests tie the cycle to 96 travelled world units rather than a fixed animation clock. Cadence is slower, but the source walk poses still have a running lean and need reauthoring for a natural slow walk. This review does not approve physical foot planting, source anatomy or fully authored directional jumps/dashes/victories.

Mobile options now separate Audio/Controls/Gameplay and Touch/Keyboard/Gamepad pages. Touch settings and Save & Return fit the landscape capture without the former long combined controls panel. Fullscreen has readable dark/gold contrast. Six independent combat buttons are distinct; the training toolbar uses the centre gap between narrowed training charge panels, above the fighters' faces, with redundant training-stat text hidden on small touch layouts. Both charge displays remain fixed while the world camera moves. Physical two-thumb comfort is still unverified.

## Limits

The recordings are silent. They do not approve announcer delivery, composition or final mixing. Existing voices remain robotic fallbacks, and the exact professional recording list is in V3_MASTER_RELEASE_NOTES.md. Existing scenery and source fighter drawings remain; this is not a claim that all source art was regenerated or polished.

Physical Safari/Android/iPhone/controllers, sustained 60 FPS, thermal/GPU/download budgets, broad human matchups and the 45–75-second typical human round target remain open. The final CPU probe measured 31–51 seconds, median 43, without timeouts. A successful fixture-based training review is separate from the genuine input-driven ten-bout progression tests.
