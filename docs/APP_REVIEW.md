# QuizApp review

Rechecked: 2026-09-23 against commit `bd79111` and the current worktree (initial review: 2026-09-22). Scope: shared React quiz flow, Electron IPC and file storage, browser IndexedDB storage, mobile mode, printing, exports, build configuration, the main library UI, and code clarity. This remains a code review. The v0.2.0 Mac package's asset paths were inspected, but the packaged app, phone pairing, and browser print flow have not been manually tested end to end.

## Verification performed

- After findings 1, 2, and 4 through 10, plus the code-clarity split, `npm test` (35 tests) and `npm run lint` passed. `npm run build` and `npm run build:web` were run for the shared storage and schema changes. The [Verify builds workflow](https://github.com/Hondo-Reilly/QuizApp/actions/runs/35828903234) previously passed the web build and Mac package checks; it has not been rerun for these fixes.
- The initial review opened the web app through `npm run dev -- --web` and confirmed the library loaded. It also reproduced the old popup failure. That popup code has since been replaced; the new iframe print flow still needs a real print-dialog test.
- The [test plan](TEST_PLAN.md) now has an initial Vitest suite and a CI gate. Its storage, failure-path, browser journey, and Electron journey tests are still planned.

## Current status and priority

Findings **1, 2, and 4 through 10** are complete. Finding 3 still has a code fix whose print and cancel behavior is unverified. Finding numbers below stay stable so they can be compared with the initial review.

| Finding | Current status | Recheck |
| --- | --- | --- |
| 1. Unsafe imported IDs | **Complete** | Unsafe and reserved IDs are replaced on import. Desktop paths must stay inside the quizzes directory. |
| 2. Damaged desktop storage | **Complete** | A damaged index or attempts file is left unchanged and reported. Writes replace the live file atomically and keep a `.bak`. |
| 3. Web Save to PDF | **Code fix in place; verification pending** | The iframe replaced the failing popup, but a real print/cancel check is still needed. |
| 4. Duplicate question IDs | **Complete** | Import rejects a quiz whose question IDs repeat, and the error names the repeated ID. |
| 5. Mobile session access | **Complete** | Session, events, and mutation requests require the token from the QR URL. |
| 6. Failed attempt save | **Complete** | Finish stays on the quiz, shows the error, and offers Retry. Review opens only after the save succeeds. |
| 7. Desktop write races | **Complete** | Library writes and attempt writes each run on their own queue, on top of the atomic file replacement. |
| 8. Partial batch imports | **Complete** | A batch keeps every file that imported. The library refreshes, and the notice names each failure. |
| 9. Mobile answer patches | **Complete** | Answer and submit patches must match the question. Extra fields are rejected on both HTTP and IPC. |
| 10. Modal and keyboard access | **Complete** | The dialog takes focus, traps Tab, and restores focus. Quiz keys stay off while a dialog or control is focused. |

Other completed work: the P1/P2 component reuse items remain complete. The separate Mac blank-window packaging defect was fixed in [`vite.config.ts`](../vite.config.ts), with [build](../scripts/check-desktop-assets.mjs) and [package](../scripts/check-packaged-app.mjs) asset checks plus a regression test. Those changes prevent that specific release failure. Findings 1, 2, 4, and 5 are closed separately below.

## Findings

### 1. Critical: imported quiz IDs can overwrite or delete files outside the quiz library

**Status: Complete.**

A storage ID must match `[A-Za-z0-9][A-Za-z0-9_-]{0,63}` and must not be the reserved name `index` ([`shared/storageId.ts`](../shared/storageId.ts)). Both import paths call `allocateStorageId`: [`electron/lib/fileStore.ts`](../electron/lib/fileStore.ts) and [`src/lib/browserLibrary.ts`](../src/lib/browserLibrary.ts). An ID such as `../attempts` or `index` is replaced with a slug of the title. A safe ID that is not already taken, including an existing quiz such as `general-knowledge-sample`, is kept so a re-import does not duplicate it.

Desktop filenames go through [`electron/lib/quizPath.ts`](../electron/lib/quizPath.ts). `quizFile` in [`electron/lib/paths.ts`](../electron/lib/paths.ts) uses that helper. It refuses an unsafe ID and refuses a resolved path whose directory is not the quizzes directory. `getQuiz`, `deleteQuiz`, and folder deletion skip the filesystem when the ID is not safe, so an old unsafe catalog entry cannot unlink a file outside the library.

Verified by `tests/storageSafety.test.ts`: `../attempts` and `index` are rejected, a free safe ID is kept, and `quizFileInDir` throws before building a path outside the library. `npm test` (30 tests) and `npm run lint` passed.

### 2. High: damaged desktop storage is silently treated as empty, then overwritten

**Status: Complete.**

[`electron/lib/durableJson.ts`](../electron/lib/durableJson.ts) separates a missing file from a damaged one. `readJsonIfPresent` returns `undefined` only when the file is absent. A failed read or a JSON parse error throws `DamagedStoreError` and does not substitute an empty store. The index reader in [`electron/lib/fileStore.ts`](../electron/lib/fileStore.ts) and the attempts reader in [`electron/lib/attemptStore.ts`](../electron/lib/attemptStore.ts) use that helper. A valid version-1 array index still migrates. An index object is used only when it has a `folders` or `quizzes` array. Attempts JSON is refused unless `attempts` is an array. Numbers, strings, and `null` are refused.

`writeJsonAtomic` writes a temporary file in the same directory, flushes it, copies the current file to `filename.bak` when one exists, then renames the temporary file over the live file. Index and attempts writes use it. Because a damaged read throws, the next import or completed attempt does not replace the damaged file. The library load path already shows the thrown message through `useLibrary`.

Verified by `tests/storageSafety.test.ts`: invalid JSON is left byte-for-byte unchanged, a missing file returns `undefined`, and a second write keeps the previous contents in `.bak`.

### 3. Changed: the old web Save to PDF popup failure was addressed in code

**Evidence:** The previous implementation used `window.open("", "_blank", "noopener,noreferrer")`, which returned `null` in the initial browser smoke test. [`src/lib/browserLocal.ts`](../src/lib/browserLocal.ts) now creates an offscreen `iframe`, sets `srcdoc` to the printable HTML, and calls `frame.print()` after load.

**Status:** The specific popup failure no longer applies. The new path has not been tested with a real browser print dialog or PDF output. Its 60-second fallback resolves `true` even if `afterprint` never fires, so the return value alone does not prove printing occurred.

**Follow-up:** Verify print, Save as PDF, cancel, and blocked-print behavior in Chrome and Safari. Report failure distinctly from a user cancel if the product needs that distinction.

### 4. High: duplicate question IDs are accepted and merge answers and results

**Status: Complete.**

[`shared/schema.ts`](../shared/schema.ts) now rejects a quiz when `questions[].id` repeats. The Zod issue message is `Duplicate question id "<id>"`, so the import error names the repeated ID. `parseQuiz` is the shared gate for both the file store and the browser store, so the quiz never reaches either library.

Verified by `tests/sharedRules.test.ts`: a fixture with two questions set to `tf` fails parse, and the thrown message includes `Duplicate question id "tf"`.

### 5. High: any device on the local network can read and change an active mobile quiz

**Status: Complete.**

Each mobile session gets a 24-byte `base64url` token in [`electron/lib/mobileServer.ts`](../electron/lib/mobileServer.ts). The QR URL is `http://<lan>:<port>/?token=<token>`. `GET /session`, `GET /events`, and `POST /session` return 401 unless that token matches, compared with `timingSafeEqual` in [`electron/lib/mobileAccess.ts`](../electron/lib/mobileAccess.ts). When an `Origin` header is present it must match the request host; a missing `Origin` is allowed because the token is still required. `POST /session` requires a content type that starts with `application/json` and rejects a body over 64KB. The phone page in [`src/mobile/MobileQuiz.tsx`](../src/mobile/MobileQuiz.tsx) reads the token from the page query and sends it on the session fetch, the event stream, and each answer update. Static HTML, JavaScript, and CSS stay public so the phone can load the shell; the quiz itself comes from `/session`.

The session payload still includes answer keys for the phone that scanned the QR. Stripping answers from that payload was left for a later change. A device that does not have the token cannot read or change the session.

Verified by `tests/storageSafety.test.ts` for token match, a foreign origin, and JSON content type. The live QR pairing on a phone was not retested.

### 6. Medium: a failed attempt save still navigates to Review with no warning or retry

**Status: Complete.**

[`src/pages/TakeQuizPage.tsx`](../src/pages/TakeQuizPage.tsx) navigates to Review only after `saveAttempt` resolves. The timer and the mobile finish path use that same handler. If the save throws, the page stays on the quiz, shows “Could not save this attempt. Your answers are still on this page.” plus the storage error, and offers **Retry save**. A second finish click is ignored while a save is in flight. This applies to both the file store and IndexedDB because both go through `quizApi.saveAttempt`. Checked in the web app: a blocked save stayed on the last question with **Retry save**, and a later retry opened Review.

### 7. Medium: Electron library and attempt updates can race

**Status: Complete.**

[`electron/lib/mutationQueue.ts`](../electron/lib/mutationQueue.ts) runs one write at a time. Library imports, deletes, folder edits, and moves share one queue in [`electron/lib/fileStore.ts`](../electron/lib/fileStore.ts). Attempt saves and deletes share a separate queue in [`electron/lib/attemptStore.ts`](../electron/lib/attemptStore.ts). A library delete that also removes attempts waits on the attempt queue, so it cannot overwrite a save that is already in that queue. Writes still go through `writeJsonAtomic`.

Verified by `tests/reviewFixes.test.ts`: two overlapping saves that each read the file, wait, and append an id both remain in the final JSON. Without the queue the second write would drop the first.

### 8. Medium: a partially successful multi-file import is hidden in the UI

**Status: Complete.**

A multi-file import is deliberately partial. One bad file does not roll back the files that already imported, and the loop continues through the rest of the selection. [`shared/importBatch.ts`](../shared/importBatch.ts) builds one notice, for example `Imported 2 quizzes. Could not import broken.json: Duplicate question id "q1"`. Desktop ([`electron/ipc/quizLibrary.ts`](../electron/ipc/quizLibrary.ts)) and the browser ([`src/lib/browserQuizApi.ts`](../src/lib/browserQuizApi.ts)) both return `imported` and `failures`. [`src/hooks/useLibrary.ts`](../src/hooks/useLibrary.ts) refreshes the library when any file succeeded, then shows that notice.

Verified by `tests/reviewFixes.test.ts` for the summary text. The file picker itself was not exercised with a mixed selection.

### 9. Medium: mobile patches validate their label but not the answer value

**Status: Complete.**

[`shared/mobile.ts`](../shared/mobile.ts) now checks the patch shape and the live quiz. `isMobilePatch` allows only the keys for that patch type, a question id up to 128 characters, and an answer that is null, a boolean, a string up to 200 characters, or a list of up to 100 such strings. `mobilePatchIssue` then checks the session: a true/false answer must be boolean, a single choice must be one of that question’s choice ids, and a multi-answer list must be unique choice ids. Submit is rejected until that question has an answer. `applyMobilePatch` drops a patch that fails this check. The phone HTTP handler in [`electron/lib/mobileServer.ts`](../electron/lib/mobileServer.ts) returns 400 with the issue text. IPC uses the same check inside `patchMobileSession` before it changes the session.

Verified by `tests/mobileSession.test.ts`. A true/false string, a repeated multi-answer choice, an unknown choice id, and a submit with no answer are all refused. The session payload still includes answer keys for the paired phone; that was left out of this fix.

### 10. Low: the shared modal and keyboard shortcuts need accessibility cleanup

**Status: Complete.**

[`src/components/ui/Modal.tsx`](../src/components/ui/Modal.tsx) moves focus into the dialog when it opens, keeps Tab and Shift+Tab inside it, and returns focus to the previously focused element when it closes. The dialog is labelled by its heading. [`src/hooks/useQuizKeyboard.ts`](../src/hooks/useQuizKeyboard.ts) ignores Enter, arrows, and number keys while any `aria-modal` dialog is open, and also when the event target is a button, link, form control, or inside that dialog. Those keys still change answers and questions when focus is on the quiz page itself. Checked in the web app: the New folder dialog took focus, Tab stayed inside it, and Escape returned focus to New folder. ArrowRight did not change the question while Next question was focused, and it did advance the quiz when focus was on the page.

## Code clarity and editability

**Overall:** The app is reasonably navigable: quiz types, schema, and grading live in `shared/`; the React screens are in `src/pages/`; UI controls are mostly small components; and [`src/api/quizApi.ts`](../src/api/quizApi.ts) gives both builds one API entry point. The harder changes cross storage, session, and mobile boundaries. Those areas contain duplicated rules, broad modules, and state whose owner is not obvious. The priorities below describe editing cost and change risk; they do not change the severity ranking of the findings above.

| Priority | What changed | Where |
| --- | --- | --- |
| **P1 · Complete** | `QuizApi`, folder payloads, and `ImportResult` live in [`shared/quizApi.ts`](../shared/quizApi.ts). Preload and [`src/lib/browserQuizApi.ts`](../src/lib/browserQuizApi.ts) both implement that interface. [`src/api/quizApi.ts`](../src/api/quizApi.ts) calls `window.quizApi` when it is present and the browser adapter otherwise, with each method written out. | A new method is added to the shared interface and then to both adapters. |
| **P1 · Complete** | IndexedDB access is [`src/lib/idbRecords.ts`](../src/lib/idbRecords.ts). Library writes are [`src/lib/browserLibrary.ts`](../src/lib/browserLibrary.ts), attempts are [`src/lib/browserAttempts.ts`](../src/lib/browserAttempts.ts), and file picking plus print are [`src/lib/browserLocal.ts`](../src/lib/browserLocal.ts). [`browserQuizApi.ts`](../src/lib/browserQuizApi.ts) only composes those pieces. Import, quiz delete, and folder delete write the quiz record, library metadata, and attempt list in one transaction, and each transaction closes its database handle. | A storage change stays in the file for that record. |
| **P1 · Complete** | [`useQuizFinish`](../src/hooks/useQuizFinish.ts) owns the `idle`, `finishing`, and `saved` phases, the save error, grading, and navigation. [`TakeQuizPage`](../src/pages/TakeQuizPage.tsx) renders the quiz and calls that hook. [`installMobileSync`](../src/lib/mobileSync.ts) takes the remote-finish callback for the subscription it creates, instead of a module-level setter. | Finish behavior is read in the hook. The page does not persist the attempt itself. |
| **P2 · Complete** | [`useQuizSetup`](../src/hooks/useQuizSetup.ts) loads the quiz, keeps the existing `localStorage` keys, and starts the attempt. [`SetupSection`](../src/components/quiz/SetupSection.tsx) is the repeated heading block. The time-limit write still waits until settings for that quiz id have loaded. | The setup form in [`QuizSetupPage`](../src/pages/QuizSetupPage.tsx) is the visible controls only. |
| **P2 · Complete** | [`useQuizBrowseData`](../src/hooks/useQuizBrowseData.ts) and [`useSavedAttempt`](../src/hooks/useSavedAttempt.ts) own the cache read, refresh, loading flag, and error. Deleting a quiz or folder clears that quiz from [`quizPageCache`](../src/lib/quizPageCache.ts). A saved attempt is added to the cached list for its quiz. | Browse and attempt pages keep their own actions. |
| **P2 · Complete** | [`toMetadata`](../shared/library.ts) and [`collectDescendantFolderIds`](../shared/library.ts) are shared. Folder slugs use [`slugifyTitle`](../shared/storageId.ts). Desktop and browser stores only persist the results. | Covered by `tests/libraryRules.test.ts`. |
| **P2 · Complete** | Detail-page frames, section headers, page states, question-result cards, folder-dialog fields, quiz progress, and library-card layouts use shared components. | See [`COMPONENT_REUSE_REVIEW.md`](COMPONENT_REUSE_REVIEW.md). |
| **P3 · Complete** | Screens import [`useSessionStore`](../src/state/sessionStore.ts) directly. The unused `useQuizSession` alias and `Checkbox` component are removed. | No remaining one-line store alias. |

`npm test` (35 tests) and `npm run lint` passed after these moves. The web app still opens a library quiz, starts it from setup, and reaches Review after submit.

## Cleanup and maintenance

1. **Expand the test suite before changing storage (partly complete).** `npm test` now runs 35 passing checks. New cases cover unsafe and reserved quiz IDs, path containment, damaged JSON left in place, atomic replacement with a `.bak`, duplicate question IDs, mobile token and answer validation, overlapping desktop writes, partial-import summaries, and shared library metadata. Still missing: a browser journey that imports a mixed batch, and a UI test that forces `saveAttempt` to fail.
2. **Make browser writes transactional (complete).** Import, quiz delete, and folder delete now put the related IndexedDB records in one `changeRecords` call. A failed transaction does not leave the quiz file written without its library row.
3. **Scale browser attempt storage.** [`src/lib/browserAttempts.ts`](../src/lib/browserAttempts.ts) still stores every attempt in one array under one key and rewrites it for every save/delete. Use per-attempt records with a `quizId` index. Database handles are closed after each transaction.
4. **Centralize mirrored storage rules (complete).** Metadata and descendant-folder traversal live in [`shared/library.ts`](../shared/library.ts). Folder slugs use `slugifyTitle`.
5. **Define a lifecycle for the new quiz-page cache (partly complete).** Deleting a quiz or folder removes it from the cache, and a saved attempt is prepended to that quiz's cached list. The maps still live for the whole window and are not bounded. Import does not need a cache write because those quizzes were not loaded yet.
6. **Reduce build warnings.** Both builds still warn about Vite's CommonJS Node API and the module type of `postcss.config.js`. Update the configuration when doing build-tool maintenance; neither warning blocked this review.

## Suggested order of work

1. Protect desktop files: done in findings 1 and 2.
2. Add mobile session authorization and payload validation: done in findings 5 and 9.
3. Reject duplicate question IDs and keep a failed save on the quiz: done in findings 4 and 6.
4. Serialize desktop writes and report partial imports: done in findings 7 and 8. Browser transactions and cache invalidation remain in Cleanup.
5. Dialog focus and quiz-shortcut scoping: done in finding 10. The revised web print flow still needs a real print-dialog check.

All shared quiz or record changes should be verified in both `npm run build` and `npm run build:web`, as required by `AGENTS.md`.
