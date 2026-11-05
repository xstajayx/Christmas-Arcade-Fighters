# GitHub Pages deployment audit and recovery

Expected site: https://xstajayx.github.io/Christmas-Arcade-Fighters/

## Confirmed cause

The custom Vite workflow already installed dependencies, built `dist/`, tested it and uploaded a compiled artifact. The source `index.html` intentionally refers to `/src/main.ts` for Vite development; publishing that file directly cannot run the game.

The public run summaries establish why the compiled artifact did not reach the site:

- [Custom workflow run 41919798143](https://github.com/xstajayx/Christmas-Arcade-Fighters/actions/runs/41919798143): checks succeeded and produced the artifact; deployment failed with **Branch "main" is not allowed to deploy to github-pages due to environment protection rules**.
- [Separate Pages run 41920297273](https://github.com/xstajayx/Christmas-Arcade-Fighters/actions/runs/41920297273): the built-in branch-based Pages pipeline successfully published the source commit `fe3b6db` from `codex/christmas-arcade-fighters`. This serves uncompiled HTML rather than the Vite artifact.

The environment in which this repair was prepared can read Git and public GitHub web summaries but blocks `api.github.com` and `xstajayx.github.io`. Direct Pages API inspection and live URL verification were therefore unavailable locally. No API/website success is inferred from Git access.

## Required repository settings

1. **Settings → Environments → github-pages → Deployment branches and tags**: allow `main` according to the repository's chosen protection policy. Keep required reviewers if desired; approve a pending deployment through the normal review mechanism. The workflow does not remove or bypass protection rules.
2. **Settings → Pages → Build and deployment → Source: GitHub Actions**. Do not publish the source branch/root or select `/docs`. The workflow's `configure` job audits Pages and requests `build_type: workflow` using its scoped Pages permission. If organization policy denies that change, set the source manually, then rerun.
3. Push to `main`, or run **Check and deploy arcade → Run workflow → main**. A feature branch or PR runs checks but never publishes.

## Deployment contract

- `npm ci` installs the exact lockfile. Type checking, lint and unit tests must pass.
- `npm run build` generates the production artifact with `/Christmas-Arcade-Fighters/` as its explicit base. The development server still uses `/`.
- `npm run verify:dist` rejects source-module references, wrong base URLs, missing compiled JS/CSS, missing public assets and a worker/HTML release mismatch.
- Playwright serves that exact `dist/` under the expected path with a strict static server. A missing asset is a real 404 rather than an HTML fallback. The artifact is not rebuilt between smoke testing and upload.
- `actions/upload-pages-artifact` uploads **only `dist/`**. The `configure` job selects workflow publishing; the protected `deploy` job uses `actions/deploy-pages`.
- After deployment, the workflow checks the live release marker and JS/CSS MIME types, allowing a short CDN propagation interval, then runs a real browser smoke test against the live URL. Failure traces are uploaded as `live-pages-results`.

Local reproduction:

```sh
npm ci
npm run typecheck
npm run lint
npm test
npm run test:browser
# test:browser builds, verifies dist and runs all browser tests
npm run preview
# preview serves the production repository path
```

The production smoke test verifies compiled links, CSS positioning, a nonblank Phaser canvas, all playable/boss/action/signature atlases and six sets of stage textures, reachable WebP/WAV/manifest assets, a running audio context, fighter/stage selection, movement and damage from a real attack. Offline restart and stale-cache isolation have separate checks.

## Cache updates and recovery

Each build emits a matching HTML release marker and a generated worker containing the exact artifact's file list. The worker fully precaches and validates the release before activation; an incomplete/mismatched install retains the previous offline release. Shell and hashed assets always come from the same cache. Only this game's cache is read; migration deletes owned legacy caches without touching other apps.

Registration uses a stable `sw.js` URL with `updateViaCache: none`. A newly activated worker reloads an already controlled client once to load the complete new version. Offline visits keep the last successful version. If a tab still predates the repair, close/reopen it or reload online; clearing site data is a last resort and also removes local scores/settings.

A source-HTML deployment cannot be fixed by clearing browser cache alone. It must be replaced by the tested compiled Pages artifact. Confirm the workflow's final live smoke test succeeds before calling the live deployment repaired.

## Latest observed repository run — 5 November 2026

Latest fetched `main` is `2d6a384`; its intervening commits added and then deleted a separate Jekyll workflow, leaving the tracked file tree identical to the prior repair base. [Check and deploy arcade run 41926643345](https://github.com/xstajayx/Christmas-Arcade-Fighters/actions/runs/41926643345), triggered by that deletion, is publicly marked **Cancelled**; its annotation says it was canceled by the repository owner. It is not evidence of successful publication. The earlier protection/configuration failures above remain historical evidence; current Pages settings and live site health cannot be inspected through this environment’s blocked API/live destinations. The Ultimate feature branch has not been deployed.
