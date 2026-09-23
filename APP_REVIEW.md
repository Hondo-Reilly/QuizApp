# QuizApp review

Reviewed: 2026-09-22. Scope: shared React quiz flow, Electron IPC and file storage, browser IndexedDB storage, mobile mode, printing, exports, build configuration, and the main library UI. This is a code review with a browser smoke test; it is not a full manual test of the packaged Mac app or phone pairing.

## Verification performed

- `npm run lint` — passed.
- `npm run build:web` — passed.
- `npm run build` — passed, including Electron main and preload bundles.
- Opened the web app through `npm run dev -- --web` and confirmed the library loads.
- Reproduced the browser popup behavior used by Save to PDF: `window.open("", "_blank", "noopener,noreferrer")` returned `null` on a user click. The temporary test page was removed afterward.
- No automated test suite is configured in `package.json`. The working tree was clean before this report.

## Findings, in priority order

### 1. Critical: imported quiz IDs can overwrite or delete files outside the quiz library

**Evidence:** [`shared/schema.ts`](shared/schema.ts#L66) accepts any nonempty `id`. [`electron/lib/paths.ts`](electron/lib/paths.ts#L12) joins that value directly into a filename. [`electron/lib/fileStore.ts`](electron/lib/fileStore.ts#L148) retains a supplied ID if it is not already in the index, then writes the resulting path at line 156. Delete and get use the same path at lines 118 and 126.

**Impact:** A quiz with `"id": "index"` writes to `quizzes/index.json`, colliding with the library index. An ID such as `"../attempts"` resolves to `userData/attempts.json`; longer traversal sequences can escape farther. Importing or deleting such a quiz can corrupt or remove unrelated files. The browser store does not use filesystem paths, but it accepts the same malformed IDs, so validation belongs in the shared format and at the desktop path boundary.

**Fix:** Define a safe quiz ID format, reject reserved names such as `index`, and generate an internal storage ID on import rather than trusting the JSON ID as a filename. Validate that resolved desktop paths remain directly inside `quizzesDir()` before every file operation. Handle already imported IDs during migration so existing legitimate quizzes remain accessible.

### 2. High: damaged desktop storage is silently treated as empty, then overwritten

**Evidence:** [`electron/lib/fileStore.ts`](electron/lib/fileStore.ts#L40) returns an empty index on *any* read or JSON parse failure (line 62). [`electron/lib/attemptStore.ts`](electron/lib/attemptStore.ts#L16) does the same for attempts (line 25). Both [`writeIndex`](electron/lib/fileStore.ts#L67) and [`writeAttempts`](electron/lib/attemptStore.ts#L30) write directly to the live JSON file.

**Impact:** A partial write, permission error, or malformed file makes the app appear empty. The next import, folder edit, or completed attempt can replace the old data, removing the chance to recover it from the original file. This is especially relevant because writes are not atomic.

**Fix:** Distinguish missing files from corrupt or unreadable files. Surface a recovery error without writing over them. Write to a temporary file in the same directory, flush, then atomically rename; keep a backup or recovery copy before migrations and destructive rewrites.

### 3. High: Save to PDF fails in the web build

**Evidence:** [`src/lib/browserStore.ts`](src/lib/browserStore.ts#L220) calls `window.open("", "_blank", "noopener,noreferrer")`, then returns `false` if the result is `null` (line 222). The browser smoke test reproduced `null` for that exact call after a user click. [`src/lib/printQuiz.ts`](src/lib/printQuiz.ts#L100) routes the web Save to PDF action through this method.

**Impact:** The print window cannot be written, so the web user never reaches the browser print dialog.

**Fix:** Open a same-origin blank popup in the click handler without `noopener`, populate it, then sever `popup.opener` before printing; or use a dedicated printable route/iframe that does not require a writable popup handle. Verify print and cancel behavior in Chrome and Safari.

### 4. High: duplicate question IDs are accepted and merge answers and results

**Evidence:** [`shared/schema.ts`](shared/schema.ts#L73) validates each question but never checks that `questions[].id` is unique across the quiz. [`src/state/sessionStore.ts`](src/state/sessionStore.ts#L58) builds the attempt order from IDs, while answers are keyed by ID (line 23). Grading also reads answers by ID in [`shared/grading.ts`](shared/grading.ts#L29).

**Impact:** Two distinct questions with the same ID share one answer and submission state. `currentQuestion()` selects the first matching question for both slots, and the score and review can be wrong on both platforms.

**Fix:** Add a quiz-level uniqueness refinement to the shared schema. Show the offending IDs in import errors. Add a regression case with two questions carrying the same ID.

### 5. High: any device on the local network can read and change an active mobile quiz

**Evidence:** [`electron/lib/mobileServer.ts`](electron/lib/mobileServer.ts#L55) binds to `0.0.0.0`. `GET /session` returns the full quiz object, including answer keys (lines 140–143); `POST /session` accepts state changes (lines 161–179). Neither endpoint checks a session token or request origin. The URL shown in the QR code has no secret in [`src/components/ui/MobileModeButton.tsx`](src/components/ui/MobileModeButton.tsx#L100).

**Impact:** Someone who can reach the Mac's port can retrieve questions and answers, submit or change answers, or finish the attempt. A web page on another device may also be able to send a simple POST even if it cannot read the response. The README discloses that the address is reachable on the same Wi-Fi, but it does not make these state-changing endpoints safe.

**Fix:** Generate an unguessable token for each session and require it on session, events, and mutation requests. Validate `Origin` and allowed content type for POST; add reasonable request limits. If answer secrecy matters during a quiz, send a phone-safe question payload and reveal only at the configured time.

### 6. Medium: a failed attempt save still navigates to Review with no warning or retry

**Evidence:** [`src/pages/TakeQuizPage.tsx`](src/pages/TakeQuizPage.tsx#L47) catches a failed `saveAttempt`, resets a local flag, and unconditionally navigates to Review in `finally` (line 60).

**Impact:** Review shows the in-memory grade, making the attempt look complete, but it is missing from Previous attempts. Leaving Review loses the only visible copy. This affects both the file and IndexedDB stores when storage is unavailable or full.

**Fix:** Keep the user on the finish screen on failure, show the error, and provide Retry. Navigate only after persistence succeeds, or explicitly label a temporary unsaved review and retain a retry path.

### 7. Medium: Electron library and attempt updates can race

**Evidence:** Desktop operations read a whole JSON file, modify an in-memory copy, and write it back in [`electron/lib/fileStore.ts`](electron/lib/fileStore.ts#L145) and [`electron/lib/attemptStore.ts`](electron/lib/attemptStore.ts#L34), with no serialized transaction. IPC handlers in [`electron/ipc/quizLibrary.ts`](electron/ipc/quizLibrary.ts#L50) and [`electron/ipc/attempts.ts`](electron/ipc/attempts.ts#L11) can run concurrently. The browser store has a `run()` queue, but desktop storage does not.

**Impact:** Concurrent imports, folder changes, or attempt operations can overwrite each other's index/attempt changes. An operation can report success while its data disappears from the final file.

**Fix:** Serialize desktop mutations per store, or move to a transactional store. Combine the queue with atomic file replacement. Add a concurrency regression test using simultaneous imports/saves.

### 8. Medium: a partially successful multi-file import is hidden in the UI

**Evidence:** [`electron/ipc/quizLibrary.ts`](electron/ipc/quizLibrary.ts#L38) imports files one by one, then returns only an error on a later failure (line 44), even though earlier files remain imported. The browser path includes `imported` on failure in [`src/lib/browserStore.ts`](src/lib/browserStore.ts#L249), but [`src/hooks/useLibrary.ts`](src/hooks/useLibrary.ts#L108) returns immediately on error without refreshing (line 114).

**Impact:** The library can contain newly imported quizzes while the screen still shows the old snapshot. The user may retry and create duplicates. Desktop also loses the count/list of successful files in its response.

**Fix:** Return successes and failures for each file on both platforms. Refresh after any successful import, even when later files fail, and show a summary. Decide and document whether a batch is deliberately partial or all-or-nothing.

### 9. Medium: mobile patches validate their label but not the answer value

**Evidence:** [`shared/mobile.ts`](shared/mobile.ts#L100) checks only that an `answer` patch has a string `questionId`; it does not validate `answer`. [`applyMobilePatch`](shared/mobile.ts#L62) stores the value as supplied. `submit` also accepts a question ID without checking that it has an answer (line 81).

**Impact:** A malformed client request can put invalid values into the desktop session, create confusing grading and UI states, or mark an unanswered question as submitted. This is easier to exploit because the mobile endpoint is unauthenticated.

**Fix:** Validate patch payloads against the active question type and choice IDs, require an answer before submit, and reject oversized or unexpected fields. Share the validator between HTTP and IPC entry points.

### 10. Low: the shared modal and keyboard shortcuts need accessibility cleanup

**Evidence:** [`src/components/ui/Modal.tsx`](src/components/ui/Modal.tsx#L21) handles Escape and scrolling but does not move focus into the dialog, trap Tab, or return focus when it closes. [`src/hooks/useQuizKeyboard.ts`](src/hooks/useQuizKeyboard.ts#L41) intercepts Enter and arrow keys whenever the target is not an input/textarea/select, including focused buttons and modal controls.

**Impact:** Keyboard users can interact with the quiz behind an open modal or lose their place. Arrow keys intended for page or control navigation may change questions.

**Fix:** Add a focus trap and restoration to the modal. Disable quiz shortcuts while a dialog is open or when the event target is an interactive control; consider scoping shortcuts to the quiz surface.

## Cleanup and maintenance

1. **Add a small test suite before changing storage.** Cover schema rejection (unsafe/reserved quiz IDs and duplicate question IDs), desktop path containment and corrupt-file recovery, browser and desktop import parity, attempt save failures, grading, and mobile patch validation. `package.json` currently has no test command.
2. **Make browser writes transactional.** [`src/lib/browserStore.ts`](src/lib/browserStore.ts#L168) writes quiz data, library metadata, and attempts in separate IndexedDB transactions. A quota or tab-close failure between writes can leave orphaned records. Keep related records in one transaction or implement recovery/reconciliation.
3. **Scale browser attempt storage.** [`src/lib/browserStore.ts`](src/lib/browserStore.ts#L91) stores every attempt in one array under one key and rewrites it for every save/delete. Use per-attempt records with a `quizId` index. Also close database handles after transactions to avoid retaining a new connection from every `openDb()` call.
4. **Centralize mirrored storage rules.** ID generation, slugging, metadata creation, and descendant-folder traversal are duplicated in [`electron/lib/fileStore.ts`](electron/lib/fileStore.ts) and [`src/lib/browserStore.ts`](src/lib/browserStore.ts). Move pure rules into `shared/` and test once, while keeping platform persistence separate.
5. **Reduce build warnings.** Both builds currently warn about Vite's CommonJS Node API and the module type of `postcss.config.js`. Update the configuration when doing build-tool maintenance; neither warning blocked this review.

## Suggested order of work

1. Protect desktop files: validate imported IDs and path containment, then add atomic writes and corrupt-file recovery.
2. Fix web printing and reject duplicate question IDs.
3. Add mobile session authorization and payload validation.
4. Make failed saves and partial imports visible and recoverable.
5. Add focused tests and address storage concurrency, browser transactions, and keyboard behavior.

All shared quiz or record changes should be verified in both `npm run build` and `npm run build:web`, as required by `AGENTS.md`.
