# Ultimate Edition production checklist

Status as of 5 November 2026. **This is a playable production candidate, not a premium-release sign-off.** “Complete” below describes a tested implementation, not automatic artistic approval. Main’s published files have not been replaced by this branch.

| Milestone | Status | Evidence / remaining gate |
| --- | --- | --- |
| Audit | Complete | `GAME_AUDIT.md`: architecture, original defects, retained systems and roadmap |
| A Combat implementation | Complete | 22 combat regressions plus Ultimate tests: fixed-step movement, contact/guard, hitstop, buffered confirmed cancels, projectiles, counters, shields, juggle limits, separate Super meter, multi-hit attacks, phase changes and seeded six-bout completion |
| A Human balance | In progress | Seeded CPU progression is reproducible; this is not evidence of competitive balance or enjoyable difficulty for all four human-played characters |
| B Fighter artwork / animation | In progress | Original masters, 48 base/action/walk poses per playable fighter plus 24 signature poses; Frost 32+24. Six-pose normals/signatures, eight-pose walks, real low/air/throw poses, simulation-clock timing. Lossless conversions checked in `docs/art-validation.json`. Directional jumps, dash-specific/extended heavy/victory clips, anatomy, baseline and foot planting still need production polish |
| C Specials / Supers / particles | Complete | Three distinct specials and named full-meter Super per fighter, six-pose signature rows, cut-ins, darkening, multi-contact impacts, reduced-effects controls and bounded particle/missile pools; Ultimate unit/browser coverage |
| C Audio implementation | Complete | 22 committed original robotic WAVs, lazy decode after unlock, independent mix settings, nine procedural themes and differentiated impacts. `docs/voice-validation.json` checks PCM integrity/non-silence/clipping. Browser tests check running audio context |
| C Final sound direction | In progress | No human listening/studio-performance approval; synthesized pack and short procedural loops are explicitly disclosed |
| D Six playable arenas | In progress | Six original illustrated arenas, background/midground/ground planes, parallax, snow, mist, gifts, sleigh and lights. All textures verified under production base. Band splitting is not fully authored object-depth separation; foreground/wildlife/elf/mechanical-toy animation remains open |
| E Campaign / boss implementation | Complete | Six real input-driven bouts, best of three, limited continues, bonuses/next arena preview, saved progress, character endings and leaderboard. Frost has own sheets, ice mechanics, three aggression/guard phases, introduction, boss music and Jamie-specific dialogue |
| E Boss pattern direction | In progress | Phase parameters and ice moves work; bespoke authored phase sequences and broader human fairness review remain open |
| F Modes / controls / menus implementation | Complete | Arcade, CPU exhibition, training lab, local versus, survival carry-health, high scores, tutorial, settings, gamepad mapping, joystick diagonals/simultaneous attack, short-tap latching, safe areas and saved preferences; unit/browser coverage |
| F Physical usability | Blocked | No physical Android/iPhone/Safari/controllers available; mobile viewport checks use Chromium |
| G Reproducible installation/build | Complete | `npm ci`, strict typecheck, lint, 46 unit tests, production build and `verify:dist` passed |
| G Browser regression implementation | Complete | Full run: 48 passed / 6 intentional skips; score/stage rerun: 7 passed / 2 skips; final art/layout/production/campaign rerun: 8 passed / 4 skips. `TESTING.md` records scope and sequence |
| G Visual evidence / initial review | Complete | 18 unedited production screenshots, 104.2-second silent WebM, capture metadata with no observed page errors and `docs/VISUAL_REVIEW.md`. This does not close the animation/art/device gates |
| G Mobile performance / asset loading | In progress | Source texture copies released, bounded pools and reduced effects implemented. Audio is lazy; fighter sheets preload. Download/texture budgets and sustained 60 FPS on low-end physical phones are not signed off |
| GitHub PR creation | Blocked | `gh pr list` returned `Post https://api.github.com/graphql: Forbidden`; API destination policy prevents authenticated PR operations in this session. Git access is separate |
| GitHub Pages publication | Blocked | Prior Pages source/configuration/protected-environment failures documented in `DEPLOYMENT.md`. Live domain and GitHub API are blocked by this environment’s destination policy. Do not bypass protection rules or claim live verification |
| Premium final acceptance | In progress | Implemented game and recorded evidence must be judged alongside the art/audio/balance/physical-device and deployment gates above |

## Asset production evidence

The image-generation tool produced original base fighters, icy boss, actions, walking cycles, dedicated signatures and environments. Visual review caught walking-row identities that disagreed with the base atlases. Final sheets follow the established base designs (Nash’s grey tracksuit and Beardy’s ginger beard/green coat); unrelated generated variants are excluded. PNG masters remain outside the runtime output; normal builds use committed lossless WebPs. Required-art failures show a retry screen rather than primitive replacements. See `docs/ASSET_PIPELINE.md`.

## Release policy

The existing tested Pages build, explicit repository base, complete-release worker caching and PR-without-deploy rules remain intact. The feature branch must pass local checks and retain the open quality-gate disclosures. A passing local smoke test does not establish a successful GitHub Pages publication.
