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
