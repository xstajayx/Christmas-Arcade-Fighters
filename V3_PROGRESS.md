# Arcade Evolution V3 production checklist

Branch: `feat/v3-arcade-evolution`, based on the merged Ultimate version on main. This is a **playable V3 candidate**, not final premium acceptance. Status as of 5 November 2026.

## Actual starting audit

The repository contained the Ultimate implementation, not the older procedural MVP at the beginning of GAME_AUDIT.md. The four originals had 48 base/action/walk poses plus 24 signature poses; Frost had separate sheets, six arenas and a six-bout campaign. The current code and tests were inspected directly before work.

Confirmed defects: action extraction read 270 pixels across 256-pixel rows; generated cells contained disconnected neighboring limbs; base/signature pivots differed and asymmetric mirroring could shift the body. The old camera moved scenery only. Grabs applied immediate knockdown without a linked defender. Guarding used a dedicated button. Supers used a static portrait panel. Saves capped progress at six and ignored unlocks.

## Implemented milestones and evidence

| Area | Status | Evidence / remaining gate |
| --- | --- | --- |
| Exact frame extraction / anchors | Complete implementation | Exact cell reads, connected-body isolation, preserved wide poses with explicit offsets/pivots, compensated mirroring, independent collision geometry. V3 unit checks cover orphan pixels, feet anchor and wide-frame retention |
| Dynamic camera | Complete implementation | Two-fighter midpoint/vertical framing, smooth contraction, safe expansion, jump/corner bounds, KO emphasis and reduced effects. HUD/touch controls remain separate DOM elements |
| Sprite inspector | Complete implementation | Optional training atlas/frame preview with frame box, feet anchor, pushbox, hitbox/hurtbox and camera viewport overlays; browser check exercises it |
| Linked grab / throw | Complete implementation | Delayed damage, attached/lifted defender, release, knockback/landing, whiff recovery, fresh-input break and immunity. Unit checks include corners and airborne ineligibility; real-input browser grab check passed on desktop |
| Directional guarding | Complete implementation | Away walks outside a threat; away/down-away guards eligible incoming high/mid/low attacks. Overhead and committed-attack rules tested. Block input/button removed, CPU/dummy/help/tutorial updated |
| Touch / fullscreen | Complete implementation | Five attack buttons, diagonal multi-touch, size/opacity/placement, compact and left-handed preferences. Native/fallback aspect checks passed across three layouts; physical-device review remains open |
| Main menu | Complete implementation | Five primary choices; secondary mode menu, real two-pose character-select breathing, locked silhouettes, large targets and version label. Production desktop/mobile screenshots reviewed |
| Integrated Supers / atmosphere | Complete implementation | Old portrait panel removed. Arena tint/aura, multi-hit effects, camera feedback and original move sheets stay in the fight. Existing stages add smoke, water glints, lighting, snow/mist/props and phase glow |
| Ten-level campaign | Complete implementation | Levels 1–7 regular challenges, Rob Father at 8, Frost Challenge at 9, Santa at 10; distinct AI styles, dialogue, previews, score/continues/ending and rewards. Seeded full-route unit playthrough passes |
| Rob Father | Complete implementation | Original base/signature art, Collection Hall, combo/dash/throw/Super mechanics, timed boss-only charge armour, two boss phases, separate standard profile |
| Santa | Complete implementation | Original art, North Pole throne, Gift Storm, Reindeer Rush, North Pole Freeze, heavy Crusher and Final Delivery; three phases, readable projectile bursts, recovery openings and final-phase music/lighting |
| Unlock / save migration | Complete implementation | Version 3, boss-win unlock conditions, normalized playable profiles, championship badge, validated persistence. Old Frost progress maps to level 9; legacy scores/settings/continues preserved without unearned boss unlocks |
| Core checks | Complete | Typecheck, ESLint and 63 unit tests passed; production build/artifact verification passed |
| Full browser verification | Complete | Full regression before final music-only fix: 64 passed, 8 intentional skips, 0 failures in 13.9 minutes. Final production/audio/campaign checks are recorded in TESTING.md. Genuine ten-bout campaign, both unlocks/reload, balanced Rob, inspector limits, throws, fullscreen and production/offline checks passed across the three Chromium layouts |
| Real visual evidence | Complete candidate review | 28 production screenshots and three silent real-time WebMs; final build capture reports no page errors and both genuine boss wins/unlocks. See docs/V3_VISUAL_REVIEW.md for observations and limits |
| Professional announcer | Blocked | Thirty-one original robotic WAVs are integrated with volume, lazy decoding and offline manifest. No approved projected human/high-quality voice performance is available. Exact replacement clip list in docs/V3_AUDIO.md |
| Final art / human balance | In progress | Runtime clipping repair cannot recreate source limbs/anatomy already imperfectly authored. More directional jump/dash/heavy/victory frames, foot/world-speed alignment, mix and human balance direction remain open |
| Physical / mobile performance | Blocked | No physical Android/iPhone/Safari/controllers. Browser viewport checks do not approve two-thumb comfort, sustained 60 FPS or thermal/GPU/download budgets. All fighter sheets currently preload |
| Live release / PR API | Blocked | Git access works; current environment policy excludes api.github.com and the live Pages host. Latest published Ultimate main run 42093184431 is publicly successful; V3 is not published. Do not infer V3 publication from local tests or bypass environment protection |

## Balance and scope decisions

Boss/playable identities share assets but not unfair advantages. Rob Father’s charge armour is confined to startup frames 4–10 and absent from the playable profile. Bosses have visible recovery openings; Santa’s shorten across phases. The first automated balance probe showed the three-boss gauntlet left too few punish opportunities. Recovery/phase-shield windows were adjusted and the real ten-bout seeded combat test now completes within the explicit initial/earned continue budget. This is evidence of reproducibility, not all-character human balance approval.

Eight actual arenas support ten different campaign challenges. Random stage selection, controllers, persistent mix options, previews and fullscreen were adopted. Watch-CPU mode, custom round/timer options and two additional filler arenas were deferred to prioritize camera/animation/combat quality; they are not advertised as functional.

Normal build/CI uses committed WebPs/WAVs; no generator or paid service is needed at runtime. Original PNG masters and a reproducible FFmpeg pipeline are retained. See docs/V3_ASSETS.md, docs/V3_AUDIO.md and TESTING.md. Preserve the existing Vite subpath, tested `dist/` artifact deployment and complete-release service-worker caching. No feature branch publication or premium completion is claimed without the remaining review gates.

Super QA found early launches could exhaust the juggle cap before Santa’s fourth hit. Supers now reserve launch for the finisher and use a strong final knockback; boss Supers expose longer recovery. The major-boss checkpoint refills continues to three, with no infinite retry allowance. The Frost Challenge uses a distinct advanced-rival balance profile rather than the former final-boss health. Tests exercise the genuine earned credit budget.

Production recording caught an undefined music track when a regular opponent was selected on either new boss arena. The arena-to-theme table now includes both stages. A production regression explicitly starts each with audio unlocked in every layout; recording errors are treated as failures.
