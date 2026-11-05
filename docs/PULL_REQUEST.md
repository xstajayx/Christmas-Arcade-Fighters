# Expand arcade combat, animation and campaign — production candidate

The original game had limited shared poses, one special per fighter, a four-bout mirror campaign and three modes. This change upgrades the existing Phaser/TypeScript application in place with original frame-based art, three distinct specials and a named Super per fighter, six arenas, a six-bout campaign and phased Frost Jamie boss.

It also adds CPU exhibition, survival carry-health, a persistent leaderboard, an interactive tutorial, a training hitbox lab, real multi-pointer joystick input, buffered short taps, configurable controls and an offline-generated robotic announcer pack. The existing compiled `dist/` Pages deployment, repository base and complete-release caching remain intact. Required-art failures show a retry screen. Championship scores persist before the ending opens.

Validation: reproducible `npm ci`, asset conversion, typecheck, lint, 46 unit tests, production build and artifact verification. The full browser suite passed 48 checks with six documented skips; focused reruns cover subsequent score/visual/compact-layout changes. See TESTING.md for exact counts and evidence. Actual-production screenshots and a silent gameplay recording are in docs/review/.

This is deliberately a **production candidate**, not a claim of premium completion. Extended animation/foot-planting continuity, authored foreground depth, human listening/balance, low-end physical-phone performance, Safari and physical controllers remain open gates in GAME_PROGRESS.md. Announcements are synthesized robotic clips, not studio performances. Fighter sheets currently preload; the unpacked runtime artifact is approximately 25 MiB.

The latest observed main workflow was canceled. Live Pages and GitHub API operations are blocked by this environment’s destination policy; this branch has not been deployed. No environment protection rules are bypassed.
