# Ultimate Edition verification — 5 November 2026

The candidate was tested locally in managed Linux with installed Chromium. This is implementation evidence, not final premium art/audio/device approval.

| Check | Result |
| --- | --- |
| `npm ci` | Passed from lockfile |
| `npm run assets:prepare` | Passed; 13 committed PNG masters converted to lossless runtime WebPs |
| `npm run typecheck` / `npm run lint` | Passed |
| `npm test` | 46 passed: combat 22, Ultimate 16, storage 4, worker 4 |
| `npm run build` / `npm run verify:dist` | Passed; compiled JS/CSS, explicit repository base, matching complete-release worker, required atlases/arenas and 22 WAVs |
| Full `npx playwright test` | 48 passed, 6 intentional skips, 0 failures, 8.3 minutes |
| Score/stage focused browser rerun | 7 passed, 2 intentional skips, 0 failures, 1.4 minutes |
| Final visual/layout focused rerun | 8 passed, 4 intentional skips, 0 failures, 1.5 minutes |
| Portrait crop production rerun | 3 passed, 0 failures, 37.2 seconds |
| Lossless image validation | 13 PNG/WebP pairs have equivalent visible pixels on black and white composites; `docs/art-validation.json` |
| Voice validation | All 22 mono 22050 Hz PCM WAVs contain audio and no full-scale samples; `docs/voice-validation.json`. This is not listening approval |

The full browser run covered desktop 1440×1000, Android landscape 915×412 and iPhone-sized landscape 844×390, all in **Chromium**. Six skips are intentional: two desktop cases require visible touch controls; shared campaign/survival logic runs once on desktop rather than duplicating accelerated simulations on each mobile viewport. Mobile controls/layout and final-level loading run in both mobile configurations.

After the full pass, review found championship scores were saved only when opening the ending. The final code now records a championship at the win result itself. Type/lint/unit/build checks were repeated, followed by the focused browser rerun covering all six stage selections and the compiled Pages smoke test in all three viewports, plus the six-bout campaign. The campaign now asserts the championship exists **before** opening the ending and remains exactly one entry afterwards.

Final screenshot review then caught supplemental walking identities that disagreed with the base sheets. The walking atlas was regenerated to match the established Nash/Beardy designs, and signature sheets were aligned with those same bases. Super cut-ins were reframed and their enlarged portrait crop excludes neighboring-cell edge pixels. A compact desktop layout and production test were added for 1280×720 without game-surface clipping or page scrolling. Type/lint/unit/build/artifact checks passed again, followed by the final eight-check focused run: production loading and all three specials/Super in all three viewports, compact desktop framing, and six-bout campaign persistence. Four skips exclude desktop-only framing from mobile and duplicate campaign logic.

Coverage includes confirmed two-hit cancels through hitstop, whiff rejection, projectile lifetime/contact, counter/shield mechanics, separate Super costs/freezes/multi-hit contacts, valid signature pose rows, three boss phases, reaction budgets, real six-bout completion with limited continues, survival partial-health recovery, validated save migration/leaderboards, real CPU match results/rematch, independent keyboard sets, simulated standard gamepad input, joystick diagonals with another pointer attacking, very short press/release latching, all six interactive tutorial actions and a required-art failure retry screen.

The full six-bout automated playthrough uses Nash; it does not approve human balance or ending polish for every fighter. The browser driver uses actual keyboard events and the real scene/simulation with a seeded CPU choosing the player’s inputs. It accelerates simulation ticks rather than waiting for rendering. It does not mutate health, timers, winners or progression. Saved-final-level tests use explicitly declared storage fixtures; those tests alone do not prove full campaign completion.

Production tests serve the **built artifact** strictly under `/Christmas-Arcade-Fighters/`, reject missing-file HTML fallbacks, verify JS/CSS MIME types and styling, inspect nonblank canvas and all stage textures, load atlases/WAVs, unlock audio and execute attacks. Offline tests cover restart and stale legacy cache isolation; worker tests cover complete release caching, activation cleanup, failed-update rollback and mixed-release rejection.

`docs/review/` contains 18 unedited actual-production screenshots, a 104.2-second silent real-time WebM and capture metadata with no observed page errors. The short headless capture timing sample had median 33.3 ms / p95 33.4 ms; this is not a 60 FPS physical-device claim. `scripts/capture-review.mjs` reproduces the recording against a supplied `REVIEW_URL`; video needs Playwright’s FFmpeg (`npx playwright install ffmpeg`) or an equivalent configured local binary. Review observations are recorded separately in `docs/VISUAL_REVIEW.md`.

Not verified: physical Android/iPhone/Safari, physical controllers, sustained mobile 60 FPS/thermal behavior, final mix/listening, all planted-foot/anatomy/directional-jump/heavy/victory animation quality, broad human balance or live Pages publication. The initial runtime artifact occupies approximately 25 MiB unpacked; fighter sheets still preload and need low-end phone profiling. See `GAME_PROGRESS.md` for open gates.

---

## Historical baseline records

# Verification record — 4 November 2026

Tested locally in the managed Linux development environment. The final application source passed the following checks:

| Command | Result |
| --- | --- |
| `npm run lint` | Passed |
| `npm run build` | Passed, including strict TypeScript checking |
| `npm test` | 24 tests passed: 22 combat/AI and 2 persistence tests |
| `npm run test:browser` | 23 passed, 1 intentional skip, 0 failures; completed in 4.2 minutes |
| `git diff --check` | Passed |

Browser configurations: desktop 1440 × 1000, Android landscape 915 × 412, iPhone-sized landscape 844 × 390, all using the installed Chromium browser. The desktop multi-touch case is intentionally skipped because its touch controls are hidden; the actual two-pointer test passed in both mobile configurations using Chromium's touch input protocol.

Browser coverage includes initial loading, sprite-sheet registration, help and menu navigation, fighter/stage selection, match startup, keyboard movement/jump, pause/resume, persistent settings and remapped keys, all four stage selections, CPU victory through actual best-of-three combat, results/rematch, independent local-versus keyboard inputs, simulated standard gamepad menu/select/movement/attack input, saved arcade-bout restart, production repository-subdirectory hosting and service-worker-controlled offline reload/navigation. KO checks use real combat; no health mutation or force-win hooks are shipped.

Unit coverage includes startup/active/recovery gating, one contact per attack, high/low guard, grabs, meter costs/caps/gain, interruption, guard exclusion during attacks, repeated-input edges, movement/jump/landing/boundaries, simultaneous trades, double KO, draw rounds, timeout and best-of-three transitions, round state carry-over, hitstop, facing, juggle limits, deterministic replay, training health reset, CPU decisions and an actual CPU win, dummy behaviours and corrupt/unavailable storage.

The complete browser suite was rerun after the arcade flow and guard-state corrections. Earlier sprite registration, offline Vary-header matching and test input-release/timing issues were corrected before this final pass.

Not verified: physical Android/iPhone hardware, Safari/WebKit, installation on a physical home screen, Bluetooth or two physical controllers, native Capacitor builds, GitHub-hosted CI execution or publication. The repository includes the CI/Pages workflow, but it has not been pushed or deployed here. Current artwork is original animated placeholder art, not final portrait-quality pixel art. Human gameplay balancing and a dedicated final art pass remain necessary.

## Pages deployment repair — 4 November 2026

After reproducing installation with `npm ci`, the deployment repair passed type checking, ESLint, the production build, `npm run verify:dist`, 28 unit tests and 29 browser checks (one intentional desktop touch skip). The complete browser run finished in 4.2 minutes. The same compiled artifact was served by a strict static server at `/Christmas-Arcade-Fighters/`; missing paths returned 404 rather than HTML fallbacks.

New production checks cover hashed compiled JS/CSS references and MIME types, applied styling, a nonblank Phaser canvas, all fighter/stage textures, shipped PNG/manifest assets, audio unlock, character/stage selection, movement and damage through real inputs. Offline browser tests verify that stale legacy caches cannot override the active release. Four additional worker tests exercise a complete precache, version activation/owned cache cleanup, failed-update rollback and mixed-release rejection.

The public GitHub summaries confirm that the previous custom workflow's checks succeeded but `main` was rejected by the protected `github-pages` environment. A separate branch-based Pages workflow subsequently published the source branch. See DEPLOYMENT.md for evidence and the required repository settings. Local test success is not evidence of a successful live deployment; the repaired workflow separately verifies the live compiled release and runs its production browser smoke test after publishing.
