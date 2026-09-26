# Maintain both the web app and the Electron app

QuizApp ships as two builds of the same React UI:

- **Electron** is the Mac desktop app. `npm run dev` starts it. `npm run build:mac` packages it.
- **Web** is the browser app, including GitHub Pages. `npm run dev -- --web` starts it. `npm run build:web` builds it (`QUIZAPP_WEB=1`, Vite `base` `/QuizApp/`).

A change to a screen, quiz flow, or stored record must keep both working. Do not add a web-only or desktop-only page unless the feature cannot exist on the other side.

## Shared UI

Library, folders, quiz detail, setup, taking a quiz, grading, and review live in `src/`. Those screens should stay one implementation. Reach the platform through `src/api/quizApi.ts`, which calls `window.quizApi` inside Electron and `src/lib/browserQuizApi.ts` in the browser.

`isElectronApp()` in `src/lib/runtime.ts` is how UI tells the two apart. Use it to hide a control, not to fork a page.

## What each side stores

| Data | Electron | Web |
| --- | --- | --- |
| Quizzes, folders, attempts | Files in `userData` | IndexedDB (`src/lib/browserQuizApi.ts`) |
| Images from `.quiz` packages | `userData/quizzes/<id>.assets/`, served as `quizasset://` | IndexedDB records `asset:<id>:<path>` |
| Theme and setup choices | `localStorage` | `localStorage` (same keys) |

A new library or attempt field needs a matching read and write in both stores. Theme and setup preferences stay in `localStorage` only. Do not copy them into IndexedDB.

## Desktop only

Hide these on the web with `isElectronApp()`:

- Mobile mode (the Mac hosts a server for a phone on the same Wi-Fi)
- Update check and download
- Mac title bar, traffic lights, and the header's extra left padding
- Delete All App Data in the Mac app menu
- Save to PDF through the hidden Electron window. The web build prints with the browser dialog and the same HTML from `src/lib/printQuiz.ts`.

Adding a `quizApi` method means implementing it in `electron/preload.ts` and in `browserQuizApi`. On the web, a desktop-only method should no-op or reject with a clear error instead of calling Electron.

## Release checklist

1. Bump the version in `package.json` and `package-lock.json`. Keep the web and Mac builds on the same commit.
2. Run `npm test`, `npm run lint`, `npm run build:web`, and `npm run build:mac`. The Mac build must pass both asset checks: one on `dist/` and one inside the packaged `app.asar`. Packaging must not publish automatically.
3. Push the commit and wait for the **Verify builds** GitHub workflow to pass. Its Mac job packages the same Apple Silicon target used for the release.
4. Open the newly built app from `release/mac-arm64/QuizApp.app` or its DMG on a Mac and confirm the Library renders. Use a copy of user data when checking migrations or older records. Do not treat successful builds or asset checks as a substitute for this launch check.
5. Tag the verified commit, then publish a GitHub release with `release/QuizApp-VERSION-arm64.dmg`. Verify the uploaded asset name, version, size, and checksum. Include any required manual installation steps in the release notes.

Electron loads packaged HTML with `file://`, so desktop asset URLs must stay relative. Root-absolute `/assets/` URLs caused the blank-window failure in the v0.1.5 and v0.1.6 Mac releases.
