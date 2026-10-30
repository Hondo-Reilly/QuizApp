# Cloud quiz sharing

Status: implemented on branch `cloud-quizzes`. Update checks need hjr-data's `main` deployed (file versions and `POST /check`); the server running on 2026-10-29 predates them.

Code: `shared/cloudShare.ts` (client), `electron/ipc/cloudShare.ts` (desktop), `src/lib/browserQuizApi.ts` (web), `src/components/share/` and `src/hooks/useShareActions.tsx` (UI). Tests: `tests/cloudShare.test.ts`, `tests/desktopReplaceQuiz.test.ts`.

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

## Decisions

- Always upload `.quiz` packages, even for quizzes without images.
- Base URL is fixed: `https://data.hjrsystems.com/quiz-app`. The web client stays on GitHub Pages.
- Sharers change a shared quiz with "Replace from file…" now, and with the editor (separate branch) later. Either way, "Publish update" is a separate, explicit step.
- No automatic expiry extension. The app shows the expiry and offers a manual "Extend" button.
- Recipients update only when they press "Update quiz".
- Deleting a shared quiz deletes it on the server too, after a warning.
- The manage token lives only in the sharer's local library. Another device or browser can't publish updates or stop sharing. Accepted for now.

## Code layout

- `shared/cloudShare.ts`: pure client. Base URL, code normalising (`1234 5678`, `1234-5678` → `12345678`), request builders, response parsing, `/check` batching (50 per call), error messages for 404 / 413 / 429 / quota. Takes a `fetch` so tests and both builds can inject one.
- `shared/quizApi.ts`: new methods
  - `shareQuiz(id)` → `{ code, expiresAt }` (upload, or reuse an existing share)
  - `publishQuizUpdate(id)` → PUT the current package with the manage token
  - `unshareQuiz(id)` → DELETE and clear `share`
  - `extendShare(id)` → `PATCH {"ttl":"90d"}`, update `share.expiresAt`
  - `replaceQuizFromFile(id)` → pick a file and replace the quiz in place (local only, no upload)
  - `previewSharedQuiz(code)` → `/info`
  - `importSharedQuiz(code, folderId)` → download, import, set `cloudSource`
  - `checkSharedQuizzes()` → one `/check` pass over every `cloudSource` (and `share`, to refresh expiry), stores results, returns the snapshot
  - `updateSharedQuiz(id)` → download the newer version and replace the quiz **in place**
- Electron: `electron/ipc/cloudShare.ts` handlers using `net.fetch` in the main process (like `electron/lib/updates.ts`). This avoids CORS for the `file://` renderer, whose origin is `null`. Wired in `electron/preload.ts` and `shared/ipcChannels.ts`.
- Web: implemented in `src/lib/browserQuizApi.ts` with `window.fetch`. Needs the CORS setup below.
- `src/api/quizApi.ts`: forward the new methods.

## Replace-in-place import

Both stores currently allocate a fresh id on every import (`allocateStorageId`). Updating a downloaded quiz needs a new path in each store, `replaceQuizBytes(id, bytes)`, that:

1. parses and validates the new package (same `readQuizFile` + `convertSvgImages`),
2. keeps the quiz `id`, `folderId`, attempts, and `cloudSource.code`,
3. swaps the quiz JSON and images atomically (remove old images that the new version no longer references),
4. refreshes title, description, question count in metadata.

Attempts store answers by question id, so old attempts keep working when questions are added. Review of an old attempt must tolerate question ids that no longer exist in the new version (check `ReviewPage` / `useSavedAttempt`).

The same helper serves the sharer's "Replace from file…" and, later, saves from the editor. After a replace, the local package's hash no longer matches `share.sha256`, so the share dialog offers "Publish update".

## UI

All in shared screens:

- **Quiz card menu / quiz detail page:** "Share…" opens a dialog showing the code (`1234 5678`), a copy button, the expiry date with an "Extend" button, and "Stop sharing". On an already-shared quiz the same dialog shows "Publish update" when the local copy differs from the shared `sha256`.
- **Quiz page:** the share buttons sit in the Questions action row: "Replace…" (replace from file), "Share…", and "Check updates", which becomes a blue "Update quiz" once a check finds a newer version. A line under the page header shows the share code, version and expiry, or the code the quiz was imported from, only when there is one.
- **Replace from file…:** on the card menu and quiz page, for any quiz. It replaces the quiz in place. On a shared quiz, it then points to "Publish update".
- **Delete:** deleting a shared quiz (or a folder that contains one) warns that the shared copy will also be deleted from the server, and that people who imported it will stop getting updates. On confirm: `DELETE` on the server first, then local delete. If the server call fails (offline, or the share already expired), offer "Delete locally anyway". A 404 counts as already deleted.
- **Library header:** "Import quiz" opens one dialog with a drop zone for `.json` / `.quiz` files, a "Browse files…" button, and a share code field. The code field formats input as `1234 5678`, calls `/info` to show the filename and size, then imports into the current folder. Dropped files go through `quizApi.importQuizFiles`, which takes their bytes on both platforms.
- **Sharing an imported quiz:** while its code still works and it hasn't been replaced from a file, the share dialog shows that original code to pass on, with "Share my own copy instead" to upload a separate copy.
- **Update badge:** cards with `cloudSource.available` show "Update available"; the detail page offers "Update quiz" with the new version number. `gone` shows "No longer shared" and stops checking that code.
- **Checking:** `checkSharedQuizzes()` on Library mount, at most once every 6 hours (a timestamp kept in memory for the session), plus a manual "Check updates" on the quiz page. Codes that return `not_found` are dropped from future checks, as the server README asks.

## Expiry

Shares expire 30 days after upload or the last update (the server resets the expiry on `PUT`). Nothing extends automatically. The share dialog shows the expiry, and "Extend" sends `PATCH {"ttl":"90d"}`. Quiz cards show a "Share expires soon" hint when an owned share has under 7 days left, and "Share expired" once the server reports it gone. Re-sharing an expired quiz uploads it again and gets a new code.

## CORS (web build only)

The web app runs at `https://hondo-reilly.github.io` and calls `https://data.hjrsystems.com`. Those are different origins, so the browser only lets the page read responses that carry the right CORS headers. The Mac app sends its requests from the Electron main process, which CORS doesn't apply to.

Every write, and `/check`, sends a custom header (`X-Filename`, `X-Manage-Token`) or a JSON body, or uses `PUT`/`PATCH`/`DELETE`. So the browser first sends an `OPTIONS` preflight. hjr-data must answer it, and the real request, with:

```
Access-Control-Allow-Origin: https://hondo-reilly.github.io
Access-Control-Allow-Methods: GET, HEAD, POST, PUT, PATCH, DELETE
Access-Control-Allow-Headers: Content-Type, X-Filename, X-TTL, X-Manage-Token
Vary: Origin
```

`quiz-app.corsOrigins` should contain:

- `https://hondo-reilly.github.io`: an origin has no path, so this covers `/QuizApp/`.
- `http://localhost:5173`: the Vite dev server for `npm run dev -- --web`.

hjr-data already sends these headers (`src/public.ts`). The live server allows the Pages origin. The dev origin is added to the seed on hjr-data's `cloud-quizzes` branch, and must be set on the running server with `ns update`.

Not needed: cookies or `Access-Control-Allow-Credentials` (the app authenticates with the manage-token header), and `Access-Control-Expose-Headers` (the app reads JSON bodies, not response headers).

## Tests

- `tests/cloudShare.test.ts`: code normalising, request shapes, `/check` batching, error mapping, with a fake `fetch`.
- Store tests for `share` / `cloudSource` round-trip and replace-in-place (keeps id, folder, attempts; removes stale images) in both the file store and the IndexedDB store.
- `docs/TEST_PLAN.md`: manual steps for share → import on the other build → publish update → badge → update.

## Rollout

1. Shared client + types + tests.
2. Replace-in-place in both stores.
3. Electron IPC + preload, browser implementation.
4. UI: share dialog, import-from-code, badges.
5. Server: add `http://localhost:5173` to the live `corsOrigins` (Pages origin already works). Then the release checklist in `AGENTS.md`.
