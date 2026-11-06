# V3 Ultimate master audit — 6 November 2026

Inspected baseline: commit 7fc0818, existing Phaser/TypeScript V3 candidate. This audit is based on source, existing tests/progress documents and available production captures in docs/review-v3. No new externally supplied gameplay video or settings screenshot accompanied this directive; previous repository captures are available. Earlier V3.1/V3.2 claims are not treated as evidence.

## Root causes and architecture

- Combat runs deterministic 60 Hz steps in src/combat/engine.ts, independently of Phaser rendering. Sprite feet render at simulation y+50. Runtime frames use per-pose pivots, exact connected-body extraction and compensated mirroring. See src/art/frames.ts and src/art/pixel.ts. Source anatomy/foot planting remains imperfect.
- Ground separation is a hardcoded 39 units while hurtboxes are 48 units and visible torsos are wider. Separation is applied after movement, splits correction equally and loses half the correction at corners. It does not preserve side order if fast movement crosses centres. Debug draws a separate hardcoded 39-unit rectangle. Attack boxes extend from x+13 and normal ranges are 49–75, with no shared geometry configuration.
- readAttack remaps SP1 to special2 when forward and special3 when crouching. Beardy SP1 is a functional timed counter and SP2 is a damage-reducing shield, but neither meets the new fixed dash/projectile contract. Inputs expose three specials on keyboard and one contextual special on touch; gamepads expose only SP1.
- Health is 96–144 and normal damage 7–25, before power/counter/combo modifiers. Meter uses fixed contact awards; combo scaling, six-contact knockdown and three-juggle cap already exist. Merely multiplying health/damage equally would not extend rounds.
- Walk animation uses animTick at 3–5 ticks per pose regardless of actual distance. Movement snaps immediately to target speed. Dash reuses stride poses. Additional authored dash/jump/victory sequences are still needed.
- Dynamic camera starts at 1.25, expands with separation/jumps, keeps DOM HUD/touch fixed and supports reduced effects. Linked delayed throws/breaks, away/down-away guard, integrated Supers and ten-level progression exist and need regression coverage.
- Settings are one long two-column form. No round-count/timer/shake settings. Saved version 3 validates settings, scores and genuine boss unlocks. Preserve its data and legacy migrations.
- Procedural stage/boss melodies exist. Voices are 31 robotic WAVs, with optional browser speech disabled by default. Async decoding can reorder requests; no priority/cooldown policy exists. Professional voice and composed music approval are outstanding, not completed by this audit.
- Pages workflow installs with npm ci, type/lint/unit/build/artifact/browser checks, then deploys exact dist only from main. Vite base and atomic service-worker cache releases are already implemented. Preserve them.

## Delivery order

Collision/range and shared debug geometry → distance-driven locomotion → fixed SP1/SP2 across inputs and separate boss repertoire → health/damage/HUD → tabbed options/mobile → announcer ordering/music → regression, visual evidence and release notes. Commit verified milestones. No merge/deploy until verified; professional art/audio/device gates remain explicit.

## Visual follow-up

The first revised push widths (62–74 units) passed mathematical separation but actual production captures still showed overlapping wide idle silhouettes. This was not accepted as a fix. Source alpha-component bounds were measured at runtime scale: original idle sheets span approximately 108–119 world units; contact punch frame 11 extends roughly 80 units forward from the feet pivot. Final physical widths are 120–124, with an 80-unit hurtbox covering the torso/lead guard. Punch endpoints are individually 84–86 (a small edge allowance); kicks extend through an explicit pixel strike glint to 92–94. Throws have a separate detection reach and interpolate the initial pull into their hold. CPU/dummy engagement thresholds and startup guard posture were updated to match the new spacing. Holding the wrong guard height still takes damage on contact.

The 39-unit and first 62–74-unit spacing passes are historical failures of visual fit, not evidence of completed art contact approval. Final screenshots and tests must accompany the final geometry.

During verification, origin/main advanced to merge 939f222 (PR #3), incorporating the audited V3 baseline. Its tree was identical to baseline 7fc0818, so the development branch fast-forwarded safely without source changes. The new PR contains only the master-directive additions. No claim about live Pages deployment follows from that Git merge alone.

Final debug audit: the purple pushbox had displayed 130 units vertically while separation activated only within 65 units. Both now use balance.pushHeight (65), with a boundary test, so the displayed geometry matches the actual rule. This does not change the previous gameplay threshold.
