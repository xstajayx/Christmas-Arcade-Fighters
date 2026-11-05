# V3: dynamic camera, directional combat and ten-level boss campaign

Fighters were framed too far away, action extraction leaked pixels across atlas rows, grabs caused immediate knockdown, and Supers used a portrait pop-up. V3 repairs the renderer’s extraction/anchors, adds a two-fighter camera, links attacker/defender during throws, replaces the guard button with away/down-away guarding, and keeps Supers inside the arena.

The requested ten-level route is implemented: seven regular challenges, Rob Father at 8, Frost Challenge at 9 and three-phase Santa at 10. Genuine boss wins unlock separate normalized playable profiles and a championship badge. Rob Father’s major-boss checkpoint refills continues to three. Old saves preserve scores/settings/continues and map saved Frost progress to level 9 without granting unearned boss unlocks.

The interface has five primary menu entries, secondary modes, fullscreen with fallback/aspect handling, compact/left-handed touch settings, real-pose character-select previews and a training sprite inspector. Two original bosses, their signature sheets and Collection Hall/North Pole scenes are included. Existing modes, controller support, repository-subpath builds and atomic offline release caching are preserved.

Validation and actual production captures are recorded in TESTING.md and docs/review-v3/. Type checking, ESLint, 63 unit checks, production build/artifact verification and an actual ten-bout browser playthrough passed. The complete browser regression passed: 64 passed, 8 intentional viewport/shared-logic skips, no failures (13.9 minutes). Recording then exposed an undefined music track for regular opponents in the two new boss arenas; both mappings were fixed. Core checks passed again, followed by 7 focused production/audio/campaign checks with 2 intentional skips and no failures (2.0 minutes).

This is a V3 release candidate, not a premium-quality sign-off. Thirty-one integrated robotically synthesized voice clips still need replacement by an approved professional performance. Source anatomy/foot planting/extended dash/jump/victory animation, fully authored foreground depth, all-character human balance, physical Safari/phones/controllers and sustained mobile texture/download/FPS budgets remain open gates in V3_PROGRESS.md. No placeholder boss recolours or forced-win hooks are used.

The published Ultimate main workflow is publicly successful (run 42093184431). This feature branch has not been deployed, and the environment blocks direct live Pages and PR API access. Existing deployment protections are preserved.
