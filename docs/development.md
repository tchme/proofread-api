# Development

## Install (unpacked)
1. Open `chrome://extensions` (`edge://extensions`, `browser://extensions` in Yandex Browser).
2. Turn on Developer mode, press Load unpacked («Загрузить распакованное») and pick this folder.
3. The settings page opens on first install: paste the API key and press «Сохранить». The model list then loads from the server, which also confirms the key.
4. After editing files press the reload icon on the extension's card and reload open pages. A page opened before the reload keeps the old content script; its requests then fail with «Расширение было обновлено…».

## Tests
- `node --test`: unit tests of `shared.js` (word diff, language check). Run before every commit.
- `PROOFREAD_KEY=… node scripts/smoke.js`: real requests through `api.js`: the model list, the four actions, a wrong key. `PROOFREAD_MODEL=<id>` tries another model.
- `PROOFREAD_KEY=… node scripts/bench.js [--runs=2] [--extra='{"reasoning_effort":"none"}'] [model …]`: streams one broken sentence (`PROOFREAD_TEXT` to change it) through every chat model, or the ones named, one request at a time, and prints the time to the first word, the total time, tokens and reasoning tokens. Use it before changing the default model or request fields.
- `PROOFREAD_KEY=… node scripts/e2e.js`: loads this folder into headless Chromium over CDP (`Extensions.loadUnpacked`, which needs `--remote-debugging-pipe` and `--enable-unsafe-extension-debugging`), serves a test page on a fake host through CDP Fetch and drives it with trusted mouse and key events. Covers: textarea fix + diff + replace, page-text translate without «Заменить текст», Esc, contenteditable menu + replace, Alt+T on Russian text (no request), a password field ignored, no click leaks to the page, no page errors. The default browser path is Chrome's; on the author's PC only Edge is installed: `CHROME="C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe"`.

## Not covered by the scripts (check by hand when touching these)
- Rich editors on real sites (Gmail, Telegram Web, VK). Google Docs draws text on a canvas and is not supported.
- The settings popup and the editor tab.
- Pages inside iframes, very long selections.

## Release
- Repo: `github.com/tchme/proofread-api` (private). Work happens on a branch; `main` holds released code only.
- Steps: bump `version` in `manifest.json`, commit, fast-forward `main` to the branch, run the tests (`node --test`, `scripts/e2e.js`), then `node scripts/release.js` on `main` (`--dry` stops before anything leaves the PC).
- The script refuses a dirty tree, a branch other than `main`, a tag that exists, failing unit tests. It takes the GitHub token from git's saved login for `tchme` (Git Credential Manager, `GCM_INTERACTIVE=never`, never printed), creates the repo (private) if it is missing, pushes `main` and the tag `v<version>`, creates the release with the commit subjects since the previous tag and uploads `proofread-api-<version>.zip`: the tree without `docs/`, `scripts/`, `test/`, `CLAUDE.md`, inside one folder `proofread-api/` (a fixed name, so every update unpacks into the same folder).
- No auto-update (the user's decision, 2026-11-20). People update by hand as `README.md` says: replace the files, then press reload on the extension's card. Without the reload the worker may keep running the old cached code even across browser restarts (measured in an earlier unpacked extension by the same author, not re-measured here).

## Conventions
- No build step and no dependencies. Plain scripts share globals: `shared.js` is listed before `content.js` in the manifest and loaded by the extension pages; `api.js` is `importScripts`-ed by the worker. Files that node also loads end with `if (typeof module === 'object') module.exports = …`.
- The prompts live in `api.js` (`PROMPTS` + `RULES`); after changing them run `scripts/smoke.js`.
- `shortcut:` comments mark known limits.
