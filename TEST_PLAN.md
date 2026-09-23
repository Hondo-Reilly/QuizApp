# QuizApp test plan

Updated: 2026-09-23. This plan covers the current shared React UI, browser app, Electron app, and phone companion. It complements [APP_REVIEW.md](APP_REVIEW.md) and [COMPONENT_REUSE_REVIEW.md](COMPONENT_REUSE_REVIEW.md). Priorities reflect the cost of a regression and the likelihood that a test will catch one; **P0** is the first suite to build, **P1** follows before broad refactors, and **P2** protects polish and maintenance work.

## Current baseline and test approach

There are no automated test files, test dependencies, or `test` script in `package.json`. `npm run lint` runs TypeScript checking, while `npm run build` and `npm run build:web` check the desktop and browser bundles. Those commands should remain required, but they do not exercise quiz behavior or persistence.

Use a small number of tests at each boundary:

- **Pure unit tests:** shared schema, grading, answer rules, shuffle, mobile session rules, time formatting, preferences, and export data.
- **Repository and API contract tests:** identical import, folder, quiz, and attempt scenarios against browser storage and Electron file storage. Give each test its own IndexedDB database or temporary `userData` directory; never touch a developer's library.
- **Component tests:** user-visible interactions and accessibility behavior, using roles and labels. Avoid snapshots of Tailwind markup or tests that only repeat a component's implementation.
- **End-to-end tests:** one complete browser quiz journey plus a narrower Electron journey, because a mocked API cannot prove routing, IndexedDB persistence, preload wiring, or packaging.
- **Manual release checks:** phone pairing on a real local network and actual print/PDF dialogs, which automated DOM tests cannot reliably certify.

Use a shared fixture with true/false, single-choice, and multiple-answer questions; another fixture should contain special characters for HTML/export tests. Keep separate malformed fixtures for duplicate question IDs, unsafe quiz IDs, invalid answer references, and bad mobile patches. Freeze time and random selection where needed; assert invariants such as “contains each selected question once” instead of a particular shuffle order. Reset Zustand state and localStorage after each test.

For tooling, choose a Vitest release compatible with this repository's **Vite 5** dependency, or upgrade Vite as a separate change before installing current Vitest. Current [Vitest requirements](https://vitest.dev/guide/) differ from its [Vite 5 era documentation](https://v2.vitest.dev/guide/). Use [React Testing Library](https://testing-library.com/docs/react-testing-library/intro/) for component behavior, [fake-indexeddb](https://github.com/dumbmatter/fakeIndexedDB) for fast browser-store tests, and [Playwright](https://playwright.dev/docs/intro) for real browser journeys. Its [Electron API](https://playwright.dev/docs/api/class-electron) can support a small desktop smoke suite. An in-memory IndexedDB test does **not** replace a real browser reload test.

## P0: protect quiz correctness and user data

| Target | Tests to implement | Why / acceptance |
| --- | --- | --- |
| [`shared/schema.ts`](shared/schema.ts), [`shared/grading.ts`](shared/grading.ts), [`shared/answers.ts`](shared/answers.ts) | Accept a valid fixture for every question type; reject missing/duplicate choice IDs and answer references outside the choices. Grade true, false, unanswered, incorrect, and multi-answer selections regardless of selection order; check total/correct/rounded percent and that `false` counts as answered. | The same rules govern both builds. These cases should pass now. |
| [`src/state/sessionStore.ts`](src/state/sessionStore.ts) | Start and reset a session; enforce requested question count, unique question order, choice shuffle without changing source quiz, navigation bounds, answer/submit state, deadline, and idempotent `markEnded`. | Catches grading and review drift when setup or session state changes. Use a fixed clock and controlled randomness. |
| [`electron/lib/fileStore.ts`](electron/lib/fileStore.ts), [`electron/lib/attemptStore.ts`](electron/lib/attemptStore.ts), [`src/lib/browserStore.ts`](src/lib/browserStore.ts) | Run a common contract: import, list/get, rename/move folders, delete folder descendants, save/get/list/delete attempts, and verify records after reopening the store. Include import ID collision and older index migration fixtures. | The two persistence backends must agree on shared records. Add an Electron preload/API smoke to ensure the renderer reaches the same contract. |
| [`src/pages/TakeQuizPage.tsx`](src/pages/TakeQuizPage.tsx), [`src/pages/ReviewPage.tsx`](src/pages/ReviewPage.tsx) | Complete a quiz, save exactly one attempt, open review and Previous attempts, and verify answer order/score after reload. Repeat for `after_each` and `at_end` reveal modes. | This is the main user journey; a pure grading test does not prove it. Start with a real-browser E2E test for the web build and a shorter Electron smoke. |
| [`src/lib/quizPreferences.ts`](src/lib/quizPreferences.ts), [`src/lib/quizTimeSettings.ts`](src/lib/quizTimeSettings.ts) | Preserve per-quiz setup choices across reload, use defaults for malformed localStorage, and clamp invalid time/count values. | Preferences belong in localStorage on both platforms; browser and desktop should present the same setup defaults. |

### P0 regression tests to add with the corresponding fixes

These describe desired behavior that the reviewed code does **not** currently guarantee. Add each test in the same change as its fix, or keep it explicitly skipped with an issue reference so CI has a meaningful green baseline.

| Existing review finding | Regression that must pass after the fix |
| --- | --- |
| [Unsafe imported IDs, finding 1](APP_REVIEW.md#1-critical-imported-quiz-ids-can-overwrite-or-delete-files-outside-the-quiz-library) | Import IDs such as `index` and `../attempts` cannot overwrite the library index or any path outside the quiz directory. Test parsing/import policy and path containment independently with a temporary root; assert the sentinel file remains intact. |
| [Corrupt storage, finding 2](APP_REVIEW.md#2-high-damaged-desktop-storage-is-silently-treated-as-empty-then-overwritten) | A malformed or unreadable index/attempt file reports a recovery error and preserves its bytes; missing files still initialize normally. Inject a failed write and verify the last valid data survives. |
| [Duplicate question IDs, finding 4](APP_REVIEW.md#4-high-duplicate-question-ids-are-accepted-and-merge-answers-and-results) | Parsing a quiz with two questions sharing an ID fails with a useful import error; distinct IDs keep independent answers and results. |
| [Failed attempt save, finding 6](APP_REVIEW.md#6-medium-a-failed-attempt-save-still-navigates-to-review-with-no-warning-or-retry) | Make `saveAttempt` reject. The user sees an error, stays able to retry without duplicating the attempt, and reaches Review only after a successful save. Exercise timer expiry through the same path. |
| [Mobile authorization and patch validation, findings 5 and 9](APP_REVIEW.md#5-high-any-device-on-the-local-network-can-read-and-change-an-active-mobile-quiz) | Reject unauthenticated GET/POST/events, malformed or oversized payloads, invalid choice IDs/answer types, and submit-without-answer; a valid paired phone can still answer and finish. Test the HTTP boundary and shared validator. |

## P1: platform boundaries and failure paths

| Target | Tests to implement | Why / acceptance |
| --- | --- | --- |
| [`shared/mobile.ts`](shared/mobile.ts), [`electron/lib/mobileServer.ts`](electron/lib/mobileServer.ts) | Test session creation, index clamp, revision increments, no-op repeated patches, submitted-answer lock, finish lock, stop event, and SSE snapshot order. | These current state rules should survive security changes. Start the server on an ephemeral port, close clients/server after each test, and test the actual HTTP boundary as well as pure patch rules. |
| [`src/lib/browserStore.ts`](src/lib/browserStore.ts), [`electron/lib/fileStore.ts`](electron/lib/fileStore.ts) | Inject an IndexedDB transaction abort/quota failure during import and prove quiz data and metadata stay consistent after the browser transaction fix. Run concurrent desktop imports/folder edits/attempt saves after serialization and assert that none disappear. For a multi-file batch, verify the UI refreshes and reports every success/failure. | Covers [storage race](APP_REVIEW.md#7-medium-electron-library-and-attempt-updates-can-race), [partial import](APP_REVIEW.md#8-medium-a-partially-successful-multi-file-import-is-hidden-in-the-ui), and the browser transaction cleanup. Mark desired post-fix cases as pending until their fixes land. |
| [`src/lib/printQuiz.ts`](src/lib/printQuiz.ts), [`src/lib/browserStore.ts`](src/lib/browserStore.ts) | Spy on the generated HTML sent to the print adapter: escape user text, include choices, and show or hide answers/answer key according to options. In a real browser, check that Print/Save as PDF and cancel complete without a stale iframe; inspect a generated PDF manually. On Electron, verify the hidden-window PDF path produces a file. | The old popup path was replaced, but the new iframe behavior is still unverified ([finding 3](APP_REVIEW.md#3-changed-the-old-web-save-to-pdf-popup-failure-was-addressed-in-code)). Do not treat a `true` return alone as proof of printed output. |
| [`src/lib/exportAttempt.ts`](src/lib/exportAttempt.ts) | Export one and all attempts: correct order/subset, selected answers, correct/wrong counts, schema version, filename slug, and JSON round trip; ensure export does not mutate the quiz or attempt. | Prevents downloaded records from silently changing format or showing the wrong questions. |
| [`src/lib/quizPageCache.ts`](src/lib/quizPageCache.ts), browse/attempt pages | Import, delete, and save while detail pages have cached data; verify the next render shows the latest quiz/attempt state and a deleted quiz is not flashed from cache. | Protects the cache lifecycle cleanup and loading/error transitions. |
| [`src/api/quizApi.ts`](src/api/quizApi.ts), [`electron/preload.ts`](electron/preload.ts) | Assert each API method has a browser and Electron implementation; in web smoke, desktop-only methods report a clear unsupported result rather than calling Electron. | Prevents an apparently shared screen from working on only one platform. Prefer a shared contract/type over a brittle test that simply counts names. |

## P2: reusable UI and accessibility

Test shared components through a representative view, then add focused tests only where the component owns behavior. Cover [`Modal`](src/components/ui/Modal.tsx) opening, Escape/close, initial focus, Tab containment, and focus restoration after the [accessibility fix](APP_REVIEW.md#10-low-the-shared-modal-and-keyboard-shortcuts-need-accessibility-cleanup). Cover [`useQuizKeyboard`](src/hooks/useQuizKeyboard.ts) for number keys, Enter and arrows, while ensuring shortcuts do not fire from inputs, buttons, or an open dialog. Cover folder dialogs and library cards for visible validation, click targets, and action buttons; cover [`QuizProgressHeader`](src/components/quiz/QuizProgressHeader.tsx) expiry exactly once and [`QuestionResultCard`](src/components/quiz/QuestionResultCard.tsx) readable result/explanation semantics. These are stronger checks than snapshots of the P1/P2 component extraction.

Include a short keyboard and screen-reader smoke pass on Library, Setup, Take quiz, Review, and dialogs after UI changes. Check focus order, headings, labels, error announcements, and contrast in light and dark themes. The manual pass is especially useful until the modal and global quiz shortcut behavior are corrected.

## Cross-platform release matrix

| Check | Web | Electron/Mac | Phone |
| --- | --- | --- | --- |
| Typecheck and build | `npm run lint`, `npm run build:web` | `npm run build`; `npm run build:mac` for a release candidate | Bundled by desktop build |
| Automated fast suite | Shared tests + browser repository/component tests | Shared tests + temporary-file repository tests | Pure mobile rules + HTTP/SSE integration |
| Automated journey | Import → folder → setup → take → review → reload → Previous attempts | Import → setup → take → saved attempt → reopen app | Pair → answer → desktop sync → finish |
| Manual release check | Chrome and Safari print/Save as PDF, cancel, and IndexedDB persistence | Open packaged Mac app; real PDF save; migrate existing user data from a copy | Pair a real phone on Wi-Fi; disconnect/reconnect, stop, and expired session |

Keep Electron and web checks on the same fixture and expected record shape. A change to a screen, quiz flow, or stored field is complete only when both builds pass their relevant checks, as required by `AGENTS.md`.

## Suggested rollout and CI gates

1. Add test scripts, a Vite-5-compatible runner, fixtures, and cleanup helpers. Make `npm test` run once and exit; keep a watch command separate. Put shared rules and session tests in the first PR.
2. Add browser and desktop repository contract tests before changing storage. Add the unsafe-ID, corruption, transaction, and concurrency regressions alongside their fixes.
3. Add React interaction tests around completion, retry, reveal modes, and the shared components. Add a Playwright web journey using an isolated browser context and reload.
4. Add HTTP/SSE mobile tests and a narrow Electron smoke test. Keep real print dialogs, phone pairing, and packaged-app migration on the release checklist.
5. On every PR, run typecheck, fast tests, `npm run build:web`, and `npm run build`. Run browser E2E on changes to shared UI/storage and Electron smoke on changes to preload, IPC, files, or quiz flow; run the full matrix before release.

Prefer assertions about user-visible state and persisted records over a global coverage percentage. Every fixed finding above should gain a regression test, and every new stored field should be read/written by both adapters and exercised in the common contract.
