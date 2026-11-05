# Original asset pipeline and quality gates

PNG masters are preserved in `assets/source/`. Four fighter atlases, an icy boss atlas, supplementary actions and walking atlases, five signature atlases and a six-panel arena illustration were generated for this project using the supplied original reference for direction. They are original generated assets, not copied commercial game characters. Character photos and competing-game screenshots were not present in the supplied files.

Run `npm run assets:prepare` with FFmpeg installed to reproduce the lossless WebP runtime files. Pixel colours/alpha were compared against the PNG masters composited on black and white after conversion. No package download, image service or generator is needed at runtime. `npm ci` and `npm run build` use the committed assets directly.

Each base fighter sheet is 1536×1024, an 8×4 grid of 192×256 cells, facing right, feet pivot `(0.45,0.953125)`. The four playable atlases are composed in memory with one eight-pose row from `actions.webp` and one eight-pose stride from `walk.webp`, producing forty-eight frames per fighter. The supplementary row has a documented -12px vertical placement correction. Frost Jamie has his own thirty-two-frame sheet, ice moves and three AI phases. Metadata and ordering are in `public/asset-manifest.json` and `src/animation/clips.ts`.

Normals use explicit anticipation, extension, contact, retraction and recovery frames mapped to simulation timing. No whole-image scaling/rotation is used to simulate punches, kicks, crouching or defeat. Forward/back walking uses eight stride poses (reverse ordering for backwards movement). Low, airborne and throw actions use the additional atlas, rather than standing-kick placeholders.

Five dedicated 1536×1024 signature atlases use a 6×4 grid of 256×256 cells, one six-pose row per special and Super. Their pivot is `(105/256,244/256)`. Rendering switches sheets for the signature state and maps anticipation, contact and recovery independently. Supers alternate contact poses on the actual multi-hit cadence. Visual review identified inconsistent walking-row identities and a misleading attempted signature correction. Final sheets follow the authoritative base designs: Nash’s grey tracksuit and Beardy’s ginger beard/green coat.

The arena atlas contains six original illustrations. Rendering splits distant/midground/ground planes and adds independently moving atmosphere, gifts, lights, mist and a sleigh. Those depth bands are a practical interim composition, not a claim of fully hand-separated object layers. Further authored foreground objects, wildlife animation and environmental depth polish remain open.

## Recorded/generated audio

`npm run voices:generate` uses the development-only `@echogarden/espeak-ng-emscripten` package and FFmpeg. It generates original generic robotic English announcements at 22050 Hz mono, with consistent filtering and loudness processing. No celebrity imitation or external voice API is used. The synthesizer is not bundled into the browser game. Twenty-two WAVs and their manifest are committed, loaded lazily after audio unlock and cached for offline use.

This is an original synthesized announcer, **not a studio human voice pack**. Device speech is an optional disabled-by-default fallback. Nine original short procedural music loops and character-specific effects are implemented in Web Audio. A composer/voice director still needs to approve the final mix and longer soundtrack.

## Gates that remain open

- Review all poses at native scale and in motion; correct baseline drift, minor cell-edge clipping and consistency in generated anatomy/clothes.
- Separate all directional jumps/landings, dash-specific motion and longer multi-pose victory clips. Heavy attacks reuse some normal/source poses; these need dedicated extended clips. Walking and signatures now have dedicated sheets, but smooth continuity is not assumed from frame count.
- Add boss-specific low/aerial/throw supplemental poses; his base sheet is separate, but some clip mappings reuse base actions.
- Check planted-foot/world-speed alignment and contact endpoints on physical phones. Do not mark all four fighters finished from atlas screenshots alone.
- Human listening, balance and physical Android/iPhone/Safari/controller/performance sign-off.

Required-art loading errors display a retry screen. They do not silently substitute the former rectangle fighters. The final game is not labelled premium-complete while these gates remain open.
