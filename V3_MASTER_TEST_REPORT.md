# V3 Ultimate master verification — 6 November 2026

Final candidate: feat/v3-master-foundations, based on main's V3 merge 939f222. Final compiled release: `1793965144771`, served strictly under `/Christmas-Arcade-Fighters/`.

| Check | Observed result |
|---|---|
| TypeScript / ESLint | Passed |
| Unit tests | 69 passed: combat 22, campaign/Ultimate 15, V3 17, master foundations 7, storage 4, worker 4 |
| Build / verify:dist | Passed; compiled JS/CSS, eight scenes, required art and 31 voice clips, repository base and matching release worker |
| Complete browser matrix | Recovered as passed with no failed tests from test-results/.last-run.json after executor restoration; evidence in docs/review-master/full-browser-result.json. Configured matrix has 78 cases across desktop, Android and iPhone-sized Chromium layouts, with intentional touch/duplicate-simulation/desktop-layout skips. Terminal totals were not retained |
| Final debug-alignment focused regression | 9 passed, 0 failures, 1.8 minutes; compiled production, sprite inspector and linked throw/separation in all three layouts |
| Production visual review | 44 unedited screenshots and silent real-time video; final metadata in docs/review-master/. See docs/V3_MASTER_VISUAL_REVIEW.md |
| CPU duration probe | 16 seeded normal-v-normal rounds: 31–51 seconds, median 43, no timeouts. Human 45–75-second target remains unapproved |

The complete browser run used release `1793926536129`. The only subsequent application change aligns the debug pushbox height with the existing 65-unit separation threshold through a shared constant. The default gameplay threshold is unchanged. A new unit check covers the 64/65-unit vertical boundary. Final type/lint/unit/build/artifact checks and production/inspector/throw browser checks cover this correction.

The matrix exercises genuine input-driven ten-bout campaign completion, both boss unlocks, save reload and balanced playable profiles; survival health recovery; keyboard/gamepad/touch inputs; standing/low guards; linked throws; fullscreen; all stages and required art; audio startup; stale-cache isolation and failed-update protections. Declared saved-level/unlocked-roster fixtures are separate loading/visual checks and do not prove earned progression.

Master tests cover non-overlapping grounded pushboxes under opposing dash/corner pressure, per-fighter contact at non-overlapping spacing, farther kick reach, whiffs, mirrored boxes, direction-independent SP1/SP2, distance-driven walking/wall planting, full-health combo safety and announcer priority/cooldown/stale decode tokens. Browser checks reassign Punch to gamepad button 1, verify the automatic Kick swap, reload the mapping and confirm the mapped button triggers Punch. Mobile checks assert disjoint targets for all six attacks.

Earlier tests used obsolete 96-health, 24-point survival recovery and I-as-projectile assumptions. Those were corrected without suppressing their actual damage/recovery/input checks. A focused regression then passed 20 cases with four intentional skips. Subsequent production visual review rejected insufficient initial spacing despite mathematical separation; final silhouette widths, contact endpoints, CPU engagement, guard posture and interpolated throw pull were repaired and covered by the completed matrix. Boss recovery openings remain readable, and the campaign keeps its real limited continue budget.

Physical Safari/phones/controllers, sustained frame rate/thermal/GPU/download budgets, professional voice/listening, finished compositions/mix and all-character human art/balance approval remain open. Recordings are silent, encoded at 25 FPS and are not physical 60 FPS approval.
