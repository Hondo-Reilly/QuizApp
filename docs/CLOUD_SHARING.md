# Cloud quiz sharing (plan)

Status: draft plan on branch `cloud-quizzes`. Nothing is implemented yet.

Users share a quiz from their library. QuizApp uploads it to the `quiz-app` namespace on `data.hjrsystems.com` (hjr-data) and shows an 8-digit share code. Anyone can type that code to import the quiz, and QuizApp later checks whether the sharer has published a newer version.

Both builds get the feature through the same shared UI, as `AGENTS.md` requires.

## Server contract used

From the hjr-data README, `quiz-app` namespace (public read, anonymous rate-limited write, 8-digit codes, 30-day default TTL extendable to 90, 100 MB, `.json` / `.quiz` only):

| Action | Request | Who |
| --- | --- | --- |
| Share | `POST /quiz-app`, raw `.quiz` body, `X-Filename`, `Content-Type` | anyone |
| Publish update | `PUT /quiz-app/<code>`, same body | `X-Manage-Token` |
| Keep alive | `PATCH /quiz-app/<code>` `{"ttl":"90d"}` | `X-Manage-Token` |
| Stop sharing | `DELETE /quiz-app/<code>` | `X-Manage-Token` |
| Preview | `GET /quiz-app/<code>/info` (version, filename, size, sha256, expiry) | public |
| Download | `GET /quiz-app/<code>` | public |
| Check for updates | `POST /quiz-app/check` `{"codes":[…]}`, up to 50 per call | public |

## Data model

Two optional fields on `QuizMetadata` (`shared/types.ts`), written by both stores (`electron/lib/fileStore.ts` index and `src/lib/browserLibrary.ts` library record):

```ts
/** Set on the sharer's copy. */
share?: {
  code: string;          // "12345678"
  manageToken: string;   // secret; never shown, never exported
  version: number;
  sha256: string;
  expiresAt: string | null;
  sharedAt: string;
};

/** Set on a copy imported from a code. */
cloudSource?: {
  code: string;
  version: number;
  sha256: string;
  checkedAt: string;
  available?: { version: number; sha256: string }; // newer version seen by /check
  gone?: boolean;                                   // /check said not_found or removed
};
```

Old records without these fields keep working. `exportQuiz` must not write `share.manageToken` into the downloaded `.quiz`.

## Code layout

- `shared/cloudShare.ts`: pure client. Base URL, code normalising (`1234 5678`, `1234-5678` → `12345678`), request builders, response parsing, `/check` batching (50 per call), error messages for 404 / 413 / 429 / quota. Takes a `fetch` so tests and both builds can inject one.
- `shared/quizApi.ts`: new methods
  - `shareQuiz(id)` → `{ code, expiresAt }` (upload, or reuse an existing share)
  - `publishQuizUpdate(id)` → PUT the current package with the manage token
  - `unshareQuiz(id)` → DELETE and clear `share`
  - `previewSharedQuiz(code)` → `/info`
  - `importSharedQuiz(code, folderId)` → download, import, set `cloudSource`
  - `checkSharedQuizzes()` → one `/check` pass over every `cloudSource` (and `share`, to refresh expiry), stores results, returns the snapshot
  - `updateSharedQuiz(id)` → download the newer version and replace the quiz **in place**
- Electron: `electron/ipc/cloudShare.ts` handlers using `net.fetch` in the main process (like `electron/lib/updates.ts`). This avoids CORS for the `file://` renderer, whose origin is `null`. Wired in `electron/preload.ts` and `shared/ipcChannels.ts`.
- Web: implemented in `src/lib/browserQuizApi.ts` with `window.fetch`. Needs `https://hondo-reilly.github.io` (and the Vite dev origin) in the namespace's `corsOrigins`.
- `src/api/quizApi.ts`: forward the new methods.

## Replace-in-place import

Both stores currently allocate a fresh id on every import (`allocateStorageId`). Updating a downloaded quiz needs a new path in each store, `replaceQuizBytes(id, bytes)`, that:

1. parses and validates the new package (same `readQuizFile` + `convertSvgImages`),
2. keeps the quiz `id`, `folderId`, attempts, and `cloudSource.code`,
3. swaps the quiz JSON and images atomically (remove old images that the new version no longer references),
4. refreshes title, description, question count in metadata.

Attempts store answers by question id, so old attempts keep working when questions are added. Review of an old attempt must tolerate question ids that no longer exist in the new version (check `ReviewPage` / `useSavedAttempt`).

The same helper serves the sharer's "Replace from file…" if we add it (see open questions).

## UI

All in shared screens:

- **Quiz card menu / quiz detail page:** "Share…" opens a dialog showing the code (`1234 5678`), a copy button, the expiry date, and "Stop sharing". On an already-shared quiz the same dialog shows "Publish update" when the local copy differs from the shared `sha256`.
- **Library header:** "Import quiz" becomes a small menu, "From file…" / "From share code…". The code dialog formats input as `1234 5678`, calls `/info` to show the filename and size, then imports into the current folder.
- **Update badge:** cards with `cloudSource.available` show "Update available"; the detail page offers "Update quiz" with the new version number. `gone` shows "No longer shared" and stops checking that code.
- **Checking:** `checkSharedQuizzes()` on Library mount, at most once every 6 hours (timestamp in `localStorage`, like other UI preferences), plus a manual "Check for updates" on the detail page. Codes that return `not_found` are dropped from future checks, as the server README asks.

## Expiry

Shares expire 30 days after upload or the last update. Plan: when the sharer's app runs `checkSharedQuizzes()`, any owned share expiring within 14 days gets `PATCH {"ttl":"90d"}`. The share dialog shows the current expiry. (Open question below.)

## Tests

- `tests/cloudShare.test.ts`: code normalising, request shapes, `/check` batching, error mapping, with a fake `fetch`.
- Store tests for `share` / `cloudSource` round-trip and replace-in-place (keeps id, folder, attempts; removes stale images) in both the file store and the IndexedDB store.
- `docs/TEST_PLAN.md`: manual steps for share → import on the other build → publish update → badge → update.

## Rollout

1. Shared client + types + tests.
2. Replace-in-place in both stores.
3. Electron IPC + preload, browser implementation.
4. UI: share dialog, import-from-code, badges.
5. Server: add the Pages origin to `corsOrigins`. Then the release checklist in `AGENTS.md`.
