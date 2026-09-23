# QuizApp review

Rechecked: 2026-09-23 against commit `bd79111` and the current worktree (initial review: 2026-09-22). Scope: shared React quiz flow, Electron IPC and file storage, browser IndexedDB storage, mobile mode, printing, exports, build configuration, the main library UI, and code clarity. This remains a code review. The v0.2.0 Mac package's asset paths were inspected, but the packaged app, phone pairing, and browser print flow have not been manually tested end to end.

## Verification performed

- After findings 1, 2, 4, and 5, `npm test` (30 tests), `npm run lint`, `npm run build`, and `npm run build:web` passed. The earlier recheck had 23 tests. The [Verify builds workflow](https://github.com/Hondo-Reilly/QuizApp/actions/runs/35828903234) previously passed the web build and Mac package checks; it has not been rerun for these storage and mobile changes.
- The initial review opened the web app through `npm run dev -- --web` and confirmed the library loaded. It also reproduced the old popup failure. That popup code has since been replaced; the new iframe print flow still needs a real print-dialog test.
- The [test plan](TEST_PLAN.md) now has an initial Vitest suite and a CI gate. Its storage, failure-path, browser journey, and Electron journey tests are still planned.

## Current status and priority

Findings **1, 2, 4, and 5** are complete. Finding 3 still has a code fix whose print and cancel behavior is unverified. The remaining open findings are **6 → 7 → 9 → 8 → 10**. Finding numbers below stay stable so they can be compared with the initial review.

| Finding | Current status | Recheck |
| --- | --- | --- |
| 1. Unsafe imported IDs | **Complete** | Unsafe and reserved IDs are replaced on import. Desktop paths must stay inside the quizzes directory. |
| 2. Damaged desktop storage | **Complete** | A damaged index or attempts file is left unchanged and reported. Writes replace the live file atomically and keep a `.bak`. |
| 3. Web Save to PDF | **Code fix in place; verification pending** | The iframe replaced the failing popup, but a real print/cancel check is still needed. |
| 4. Duplicate question IDs | **Complete** | Import rejects a quiz whose question IDs repeat, and the error names the repeated ID. |
| 5. Mobile session access | **Complete** | Session, events, and mutation requests require the token from the QR URL. |
| 6. Failed attempt save | **Open** | The finish flow still navigates to Review in `finally`. |
| 7. Desktop write races | **Open** | File and attempt mutations still have no serialization or transaction. |
| 8. Partial batch imports | **Open** | A failure can still leave successful imports hidden until refresh. |
| 9. Mobile answer patches | **Open** | The validator still does not check answer values against the question. |
| 10. Modal and keyboard access | **Open** | Focus management and shortcut scoping are still missing. |

Other completed work: the P1/P2 component reuse items remain complete. The separate Mac blank-window packaging defect was fixed in [`vite.config.ts`](../vite.config.ts), with [build](../scripts/check-desktop-assets.mjs) and [package](../scripts/check-packaged-app.mjs) asset checks plus a regression test. Those changes prevent that specific release failure. Findings 1, 2, 4, and 5 are closed separately below.

## Findings

### 1. Critical: imported quiz IDs can overwrite or delete files outside the quiz library

**Status: Complete.**

A storage ID must match `[A-Za-z0-9][A-Za-z0-9_-]{0,63}` and must not be the reserved name `index` ([`shared/storageId.ts`](../shared/storageId.ts)). Both import paths call `allocateStorageId`: [`electron/lib/fileStore.ts`](../electron/lib/fileStore.ts) and [`src/lib/browserStore.ts`](../src/lib/browserStore.ts). An ID such as `../attempts` or `index` is replaced with a slug of the title. A safe ID that is not already taken, including an existing quiz such as `general-knowledge-sample`, is kept so a re-import does not duplicate it.

Desktop filenames go through [`electron/lib/quizPath.ts`](../electron/lib/quizPath.ts). `quizFile` in [`electron/lib/paths.ts`](../electron/lib/paths.ts) uses that helper. It refuses an unsafe ID and refuses a resolved path whose directory is not the quizzes directory. `getQuiz`, `deleteQuiz`, and folder deletion skip the filesystem when the ID is not safe, so an old unsafe catalog entry cannot unlink a file outside the library.

Verified by `tests/storageSafety.test.ts`: `../attempts` and `index` are rejected, a free safe ID is kept, and `quizFileInDir` throws before building a path outside the library. `npm test` (30 tests) and `npm run lint` passed.

### 2. High: damaged desktop storage is silently treated as empty, then overwritten

**Status: Complete.**

[`electron/lib/durableJson.ts`](../electron/lib/durableJson.ts) separates a missing file from a damaged one. `readJsonIfPresent` returns `undefined` only when the file is absent. A failed read or a JSON parse error throws `DamagedStoreError` and does not substitute an empty store. The index reader in [`electron/lib/fileStore.ts`](../electron/lib/fileStore.ts) and the attempts reader in [`electron/lib/attemptStore.ts`](../electron/lib/attemptStore.ts) use that helper. A valid version-1 array index still migrates. An index object is used only when it has a `folders` or `quizzes` array. Attempts JSON is refused unless `attempts` is an array. Numbers, strings, and `null` are refused.

`writeJsonAtomic` writes a temporary file in the same directory, flushes it, copies the current file to `filename.bak` when one exists, then renames the temporary file over the live file. Index and attempts writes use it. Because a damaged read throws, the next import or completed attempt does not replace the damaged file. The library load path already shows the thrown message through `useLibrary`.

Verified by `tests/storageSafety.test.ts`: invalid JSON is left byte-for-byte unchanged, a missing file returns `undefined`, and a second write keeps the previous contents in `.bak`.

### 3. Changed: the old web Save to PDF popup failure was addressed in code

**Evidence:** The previous implementation used `window.open("", "_blank", "noopener,noreferrer")`, which returned `null` in the initial browser smoke test. [`src/lib/browserStore.ts`](../src/lib/browserStore.ts#L220) now creates an offscreen `iframe`, sets `srcdoc` to the printable HTML, and calls `frame.print()` after load (lines 237–250).

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

**Evidence:** [`src/pages/TakeQuizPage.tsx`](../src/pages/TakeQuizPage.tsx#L49) catches a failed `saveAttempt`, resets a local flag, and unconditionally navigates to Review in `finally` (line 63). The new timer path also calls this same finish handler.

**Impact:** Review shows the in-memory grade, making the attempt look complete, but it is missing from Previous attempts. Leaving Review loses the only visible copy. This affects both the file and IndexedDB stores when storage is unavailable or full.

**Fix:** Keep the user on the finish screen on failure, show the error, and provide Retry. Navigate only after persistence succeeds, or explicitly label a temporary unsaved review and retain a retry path.

### 7. Medium: Electron library and attempt updates can race

**Evidence:** Desktop operations read a whole JSON file, modify an in-memory copy, and write it back in [`electron/lib/fileStore.ts`](../electron/lib/fileStore.ts#L145) and [`electron/lib/attemptStore.ts`](../electron/lib/attemptStore.ts#L34), with no serialized transaction. IPC handlers in [`electron/ipc/quizLibrary.ts`](../electron/ipc/quizLibrary.ts#L50) and [`electron/ipc/attempts.ts`](../electron/ipc/attempts.ts#L11) can run concurrently. The browser store has a `run()` queue, but desktop storage does not.

**Impact:** Concurrent imports, folder changes, or attempt operations can overwrite each other's index/attempt changes. An operation can report success while its data disappears from the final file.

**Fix:** Serialize desktop mutations per store, or move to a transactional store. Combine the queue with atomic file replacement. Add a concurrency regression test using simultaneous imports/saves.

### 8. Medium: a partially successful multi-file import is hidden in the UI

**Evidence:** [`electron/ipc/quizLibrary.ts`](../electron/ipc/quizLibrary.ts#L38) imports files one by one, then returns only an error on a later failure (line 44), even though earlier files remain imported. The browser path includes `imported` on failure in [`src/lib/browserStore.ts`](../src/lib/browserStore.ts#L267), but [`src/hooks/useLibrary.ts`](../src/hooks/useLibrary.ts#L108) returns immediately on error without refreshing (line 114).

**Impact:** The library can contain newly imported quizzes while the screen still shows the old snapshot. The user may retry and create duplicates. Desktop also loses the count/list of successful files in its response.

**Fix:** Return successes and failures for each file on both platforms. Refresh after any successful import, even when later files fail, and show a summary. Decide and document whether a batch is deliberately partial or all-or-nothing.

### 9. Medium: mobile patches validate their label but not the answer value

**Evidence:** [`shared/mobile.ts`](../shared/mobile.ts#L101) checks only that an `answer` patch has a string `questionId`; it does not validate `answer`. [`applyMobilePatch`](../shared/mobile.ts#L62) stores the value as supplied. `submit` also accepts a question ID without checking that it has an answer (line 82).

**Impact:** A malformed client request can put invalid values into the desktop session, create confusing grading and UI states, or mark an unanswered question as submitted. This is easier to exploit because the mobile endpoint is unauthenticated.

**Fix:** Validate patch payloads against the active question type and choice IDs, require an answer before submit, and reject oversized or unexpected fields. Share the validator between HTTP and IPC entry points.

### 10. Low: the shared modal and keyboard shortcuts need accessibility cleanup

**Evidence:** [`src/components/ui/Modal.tsx`](../src/components/ui/Modal.tsx#L21) handles Escape and scrolling but does not move focus into the dialog, trap Tab, or return focus when it closes. [`src/hooks/useQuizKeyboard.ts`](../src/hooks/useQuizKeyboard.ts#L41) intercepts Enter and arrow keys whenever the target is not an input/textarea/select, including focused buttons and modal controls.

**Impact:** Keyboard users can interact with the quiz behind an open modal or lose their place. Arrow keys intended for page or control navigation may change questions.

**Fix:** Add a focus trap and restoration to the modal. Disable quiz shortcuts while a dialog is open or when the event target is an interactive control; consider scoping shortcuts to the quiz surface.

## Code clarity and editability

**Overall:** The app is reasonably navigable: quiz types, schema, and grading live in `shared/`; the React screens are in `src/pages/`; UI controls are mostly small components; and [`src/api/quizApi.ts`](../src/api/quizApi.ts) gives both builds one API entry point. The harder changes cross storage, session, and mobile boundaries. Those areas contain duplicated rules, broad modules, and state whose owner is not obvious. The priorities below describe editing cost and change risk; they do not change the severity ranking of the findings above.

| Priority | What makes changes harder to follow | Improvement |
| --- | --- | --- |
| **P1** | The platform-neutral API type is inferred from [`electron/preload.ts`](../electron/preload.ts#L28), while browser code imports that type in [`src/api/quizApi.ts`](../src/api/quizApi.ts#L1) and [`src/lib/browserStore.ts`](../src/lib/browserStore.ts#L2). Folder payload types also live in preload, and `ImportResult` lives in an Electron IPC handler. The `Proxy` in `quizApi.ts` hides which adapter handles a call. | Put `QuizApi`, payloads, and import-result types in `shared/`; have preload and browser adapters implement that contract. Select the adapter explicitly at the API boundary. A developer adding a method should be able to find its type and both implementations without tracing Electron source from web code. |
| **P1** | [`src/lib/browserStore.ts`](../src/lib/browserStore.ts#L26) is about 450 lines and combines IndexedDB helpers, library and attempt operations, file picking, printing, update/mobile stubs, and the public adapter. A change to one concern requires reading much of the file. | Split by responsibility: IndexedDB transaction helper, library repository, attempt repository, browser import/print adapters, and a small `browserQuizApi` composition file. Keep one transaction boundary for related writes. Do this alongside the browser-storage fixes below so the split does not preserve the current partial-write behavior. |
| **P1** | [`TakeQuizPage`](../src/pages/TakeQuizPage.tsx#L25) owns quiz display plus a render-assigned finish ref, mobile-finish coordination, grading, persistence, retry flag, and navigation. The save outcome is currently swallowed by that flow (finding 6). [`src/lib/mobileSync.ts`](../src/lib/mobileSync.ts#L13) adds module-level flags, promise queues, and a mutable remote-finish callback. | Give quiz completion one named coordinator or hook with explicit states such as `finishing`, `saved`, and `saveError`. Give mobile sync an explicit owner and lifecycle rather than a global callback; keep the page focused on rendering and input actions. Fix failed-save behavior as part of this refactor. |
| **P2** | [`QuizSetupPage`](../src/pages/QuizSetupPage.tsx#L42) mixes quiz loading, several setup state values, two preference stores, mobile start, and the full settings form. Timer settings require a separate `timeSettingsQuizId` guard at lines 96–106. | Extract a `useQuizSetup` hook or small controller for loading, defaults, persistence, and `start` configuration. Keep the existing `localStorage` keys and the visible form; move repeated setting-group markup into small presentational components where useful. |
| **P2** | [`QuizBrowsePage`](../src/pages/QuizBrowsePage.tsx#L35) and [`QuizAttemptPage`](../src/pages/QuizAttemptPage.tsx#L56) each coordinate cached initial state, loading/error flags, `Promise.all` refreshes, and an `active` guard. Cache invalidation is also spread between pages and mutations. | Put the shared load/status pattern in focused data hooks, with explicit cache read, refresh, and invalidation rules. Keep page-specific operations in the pages. This makes stale-data behavior and error states easier to reason about. |
| **P2** | Library rules such as `slugify`, `toMetadata`, and descendant-folder collection appear in both [`electron/lib/fileStore.ts`](../electron/lib/fileStore.ts#L72) and [`src/lib/browserStore.ts`](../src/lib/browserStore.ts#L95). The implementations can drift as fields or folder behavior change. | Move pure library rules into `shared/` and test them once. Keep file and IndexedDB operations in their platform repositories. This also supports the storage and import fixes above. |
| **P2 · Complete** | Detail-page frames, section headers, page states, question-result cards, folder-dialog fields, quiz progress, and library-card layouts now use shared components. | See [`COMPONENT_REUSE_REVIEW.md`](COMPONENT_REUSE_REVIEW.md) for the implemented boundaries and visual review checklist. Future matching views should compose these components instead of copying their markup. |
| **P3** | [`src/hooks/useQuizSession.ts`](../src/hooks/useQuizSession.ts#L1) is a one-line alias for the Zustand store, while [`src/components/ui/Checkbox.tsx`](../src/components/ui/Checkbox.tsx) has no consumer. Both add names to search results without adding behavior. | Import the store directly or turn the alias into a genuine domain hook with selectors; remove `Checkbox` if it has no planned use. Keep this behind the behavior and architecture work above. |

Make these changes in small slices while addressing the higher-severity findings. Within each refactor, move contracts and pure helpers before splitting repositories or flow coordinators, then consolidate page presentation. Add focused tests around the behavior being moved; a file split alone does not prove that imports, attempts, timing, and mobile sync still work on both builds.

## Cleanup and maintenance

1. **Expand the test suite before changing storage (partly complete).** `npm test` now runs 30 passing checks. New cases cover unsafe and reserved quiz IDs, path containment, damaged JSON left in place, atomic replacement with a `.bak`, duplicate question IDs, and mobile token, origin, and content-type checks. Still missing: browser and desktop import parity, attempt-save failures, and mobile answer validation.
2. **Make browser writes transactional.** [`src/lib/browserStore.ts`](../src/lib/browserStore.ts#L168) writes quiz data, library metadata, and attempts in separate IndexedDB transactions. A quota or tab-close failure between writes can leave orphaned records. Keep related records in one transaction or implement recovery/reconciliation.
3. **Scale browser attempt storage.** [`src/lib/browserStore.ts`](../src/lib/browserStore.ts#L91) stores every attempt in one array under one key and rewrites it for every save/delete. Use per-attempt records with a `quizId` index. Also close database handles after transactions to avoid retaining a new connection from every `openDb()` call.
4. **Centralize mirrored storage rules.** ID generation, slugging, metadata creation, and descendant-folder traversal are duplicated in [`electron/lib/fileStore.ts`](../electron/lib/fileStore.ts) and [`src/lib/browserStore.ts`](../src/lib/browserStore.ts). Move pure rules into `shared/` and test once, while keeping platform persistence separate.
5. **Define a lifecycle for the new quiz-page cache.** [`src/lib/quizPageCache.ts`](../src/lib/quizPageCache.ts) holds quizzes and attempts in module-level maps. Quiz deletion in [`src/hooks/useLibrary.ts`](../src/hooks/useLibrary.ts#L121) does not invalidate them. Cached pages do refetch, but they can show stale data until that fetch completes, and the maps grow for the lifetime of the window. Invalidate on import/delete/save and consider a bounded cache or no cache for rarely visited pages.
6. **Reduce build warnings.** Both builds still warn about Vite's CommonJS Node API and the module type of `postcss.config.js`. Update the configuration when doing build-tool maintenance; neither warning blocked this review.

## Suggested order of work

1. Protect desktop files: done in findings 1 and 2.
2. Add mobile session authorization: done in finding 5. Payload validation remains finding 9.
3. Reject duplicate question IDs: done in finding 4. Failed saves remain finding 6.
4. Address storage concurrency, browser transactions, partial imports, and cache invalidation.
5. Verify the revised web print flow and improve keyboard behavior.

All shared quiz or record changes should be verified in both `npm run build` and `npm run build:web`, as required by `AGENTS.md`.
