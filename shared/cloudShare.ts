import { slugifyTitle } from "./storageId";
import type { QuizCloudSource, QuizMetadata, QuizShare, SharedQuizInfo } from "./types";

/** The quiz-app namespace on hjr-data. Uploads get 8-digit codes and expire. */
export const CLOUD_SHARE_URL = "https://data.hjrsystems.com/quiz-app";

/** The server answers /check for at most this many codes per request. */
export const CHECK_BATCH = 50;

/** The longest expiry the namespace allows. */
const EXTEND_TTL = "90d";

export type CloudFetch = (url: string, init?: RequestInit) => Promise<Response>;

export class CloudShareError extends Error {
  constructor(
    message: string,
    readonly status?: number,
  ) {
    super(message);
    this.name = "CloudShareError";
  }
}

/** Accepts "12345678", "1234 5678" or "1234-5678". Null when it is not 8 digits. */
export function normalizeShareCode(input: string): string | null {
  const digits = input.replace(/[\s-]/g, "");
  return /^\d{8}$/.test(digits) ? digits : null;
}

export function formatShareCode(code: string): string {
  return code.length === 8 ? `${code.slice(0, 4)} ${code.slice(4)}` : code;
}

/** True once the server no longer has the shared file. */
export function shareLapsed(share: QuizShare, now = new Date()): boolean {
  if (share.gone) return true;
  return share.expiresAt !== null && Date.parse(share.expiresAt) <= now.getTime();
}

/** True when the local quiz changed after its shared version was uploaded. */
export function hasUnpublishedChanges(meta: QuizMetadata): boolean {
  if (!meta.share || !meta.updatedAt) return false;
  return Date.parse(meta.updatedAt) > Date.parse(meta.share.publishedAt);
}

/** Share fields to change on a stored quiz. Undefined keeps a field; null removes it. */
export interface CloudFields {
  share?: QuizShare | null;
  cloudSource?: QuizCloudSource | null;
}

export function withCloudFields(meta: QuizMetadata, fields: CloudFields): QuizMetadata {
  const next = { ...meta };
  if (fields.share === null) delete next.share;
  else if (fields.share) next.share = fields.share;
  if (fields.cloudSource === null) delete next.cloudSource;
  else if (fields.cloudSource) next.cloudSource = fields.cloudSource;
  return next;
}

/** What the share client needs from the Electron file store or the browser store. */
export interface CloudShareStore {
  getMeta(id: string): Promise<QuizMetadata | null>;
  listMeta(): Promise<QuizMetadata[]>;
  exportPackage(id: string): Promise<{ title: string; bytes: Uint8Array } | null>;
  /**
   * Changes the share fields of each listed quiz from its stored metadata at
   * write time. Quizzes that no longer exist are skipped.
   */
  updateCloudFields(
    ids: readonly string[],
    update: (meta: QuizMetadata) => CloudFields | null,
  ): Promise<void>;
  importBytes(
    bytes: Uint8Array,
    folderId: string | null,
    sourceName: string,
    cloudSource: QuizCloudSource,
  ): Promise<QuizMetadata>;
  /** Replaces a quiz's content in place, keeping its id, folder and attempts. */
  replaceBytes(
    id: string,
    bytes: Uint8Array,
    sourceName: string,
    cloudSource?: QuizCloudSource,
  ): Promise<QuizMetadata>;
}

export interface CloudShare {
  /** Uploads a quiz, or returns its current share if it is still live. */
  shareQuiz(id: string): Promise<QuizShare>;
  /** Uploads the local quiz over its shared version, keeping the code. */
  publishQuizUpdate(id: string): Promise<QuizShare>;
  /** Moves the expiry to the longest the server allows from now. */
  extendQuizShare(id: string): Promise<QuizShare>;
  /** Deletes the shared file. A file the server no longer has counts as deleted. */
  unshareQuiz(id: string): Promise<void>;
  previewSharedQuiz(code: string): Promise<SharedQuizInfo>;
  importSharedQuiz(code: string, folderId: string | null): Promise<QuizMetadata>;
  /** Asks the server about every code in the library and records what changed. */
  checkSharedQuizzes(): Promise<void>;
  /** Downloads the newest version of an imported quiz and replaces it in place. */
  updateSharedQuiz(id: string): Promise<QuizMetadata>;
}

const UNREACHABLE =
  "Could not reach the share server. Check your internet connection and try again.";
const BAD_CODE = "Share codes are 8 digits, like 1234 5678.";
const EXPIRED =
  "This share has expired, so its code no longer works. Share the quiz again to get a new code.";

function describeFailure(status: number, message: string): string {
  switch (status) {
    case 404:
      return "The share server has no quiz with that code. It may have expired.";
    case 410:
      return "This shared quiz was removed from the share server.";
    case 413:
      return "This quiz is larger than the 100 MB the share server accepts.";
    case 403:
      return "This library is not allowed to change that shared quiz.";
    case 429:
      return `The share server is limiting requests (${message || "too many requests"}). Try again later.`;
    default:
      return message
        ? `The share server could not do this: ${message}`
        : `The share server could not do this (error ${status}).`;
  }
}

async function serverMessage(response: Response): Promise<string> {
  try {
    const body = (await response.json()) as { error?: unknown };
    return typeof body.error === "string" ? body.error : "";
  } catch {
    return "";
  }
}

function parseInfo(body: unknown): SharedQuizInfo {
  const info = (body ?? {}) as Record<string, unknown>;
  const code = info.code ?? info.name;
  if (typeof code !== "string" || typeof info.sha256 !== "string") {
    throw new CloudShareError("The share server sent an answer QuizApp does not understand.");
  }
  return {
    code,
    // Servers from before file versions leave it out; sha256 still tells versions apart.
    version: typeof info.version === "number" ? info.version : 1,
    filename: typeof info.filename === "string" ? info.filename : `${code}.quiz`,
    size: typeof info.size === "number" ? info.size : 0,
    sha256: info.sha256,
    updatedAt: typeof info.updatedAt === "string" ? info.updatedAt : "",
    expiresAt: typeof info.expiresAt === "string" ? info.expiresAt : null,
  };
}

export async function sha256Hex(bytes: Uint8Array): Promise<string> {
  const digest = await globalThis.crypto.subtle.digest("SHA-256", bytes as BufferSource);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

function packageName(title: string): string {
  return `${slugifyTitle(title) || "quiz"}.quiz`;
}

export function createCloudShare(
  store: CloudShareStore,
  fetchImpl: CloudFetch,
  options: { baseUrl?: string; now?: () => Date } = {},
): CloudShare {
  const baseUrl = options.baseUrl ?? CLOUD_SHARE_URL;
  const now = options.now ?? (() => new Date());

  async function call(path: string, init: RequestInit = {}): Promise<Response> {
    let response: Response;
    try {
      response = await fetchImpl(`${baseUrl}${path}`, init);
    } catch {
      throw new CloudShareError(UNREACHABLE);
    }
    if (response.ok) return response;
    throw new CloudShareError(
      describeFailure(response.status, await serverMessage(response)),
      response.status,
    );
  }

  async function requireMeta(id: string): Promise<QuizMetadata> {
    const meta = await store.getMeta(id);
    if (!meta) throw new CloudShareError("Quiz not found.");
    return meta;
  }

  async function requireLiveShare(id: string): Promise<QuizShare> {
    const { share } = await requireMeta(id);
    if (!share) throw new CloudShareError("This quiz is not shared.");
    if (shareLapsed(share, now())) throw new CloudShareError(EXPIRED);
    return share;
  }

  async function requirePackage(id: string): Promise<{ title: string; bytes: Uint8Array }> {
    const exported = await store.exportPackage(id);
    if (!exported) throw new CloudShareError("Quiz not found.");
    return exported;
  }

  /** Records that the server lost a share, then reports it. */
  async function lapse(id: string, code: string): Promise<never> {
    await store.updateCloudFields([id], (meta) =>
      meta.share?.code === code ? { share: { ...meta.share, gone: true } } : null,
    );
    throw new CloudShareError(EXPIRED, 404);
  }

  function requireCode(input: string): string {
    const code = normalizeShareCode(input);
    if (!code) throw new CloudShareError(BAD_CODE);
    return code;
  }

  async function info(code: string): Promise<SharedQuizInfo> {
    try {
      return parseInfo(await (await call(`/${code}/info`)).json());
    } catch (err) {
      if (err instanceof CloudShareError && err.status === 404) {
        throw new CloudShareError(
          `No shared quiz has the code ${formatShareCode(code)}. Check the code, or ask for a new one if it expired.`,
          404,
        );
      }
      throw err;
    }
  }

  async function download(code: string): Promise<{ info: SharedQuizInfo; bytes: Uint8Array; sha256: string }> {
    const found = await info(code);
    const bytes = new Uint8Array(await (await call(`/${code}`)).arrayBuffer());
    // Hash what arrived, in case a new version landed between the two requests.
    return { info: found, bytes, sha256: await sha256Hex(bytes) };
  }

  return {
    async shareQuiz(id) {
      const meta = await requireMeta(id);
      if (meta.share && !shareLapsed(meta.share, now())) return meta.share;
      const exported = await requirePackage(id);
      const response = await call("", {
        method: "POST",
        headers: {
          "Content-Type": "application/zip",
          "X-Filename": packageName(exported.title),
        },
        body: exported.bytes as BodyInit,
      });
      const body = (await response.json()) as { manageToken?: unknown };
      const uploaded = parseInfo(body);
      if (typeof body.manageToken !== "string") {
        throw new CloudShareError("The share server did not return a manage token.");
      }
      const at = now().toISOString();
      const share: QuizShare = {
        code: uploaded.code,
        manageToken: body.manageToken,
        version: uploaded.version,
        sha256: uploaded.sha256,
        expiresAt: uploaded.expiresAt,
        sharedAt: at,
        publishedAt: at,
      };
      await store.updateCloudFields([id], () => ({ share }));
      return share;
    },

    async publishQuizUpdate(id) {
      const share = await requireLiveShare(id);
      const exported = await requirePackage(id);
      let response: Response;
      try {
        response = await call(`/${share.code}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/zip",
            "X-Filename": packageName(exported.title),
            "X-Manage-Token": share.manageToken,
          },
          body: exported.bytes as BodyInit,
        });
      } catch (err) {
        if (err instanceof CloudShareError && err.status === 404) return lapse(id, share.code);
        throw err;
      }
      const uploaded = parseInfo(await response.json());
      const next: QuizShare = {
        ...share,
        version: uploaded.version,
        sha256: uploaded.sha256,
        expiresAt: uploaded.expiresAt,
        publishedAt: now().toISOString(),
      };
      await store.updateCloudFields([id], () => ({ share: next }));
      return next;
    },

    async extendQuizShare(id) {
      const share = await requireLiveShare(id);
      let response: Response;
      try {
        response = await call(`/${share.code}`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            "X-Manage-Token": share.manageToken,
          },
          body: JSON.stringify({ ttl: EXTEND_TTL }),
        });
      } catch (err) {
        if (err instanceof CloudShareError && err.status === 404) return lapse(id, share.code);
        throw err;
      }
      const extended = parseInfo(await response.json());
      const next: QuizShare = { ...share, expiresAt: extended.expiresAt };
      await store.updateCloudFields([id], () => ({ share: next }));
      return next;
    },

    async unshareQuiz(id) {
      const { share } = await requireMeta(id);
      if (!share) return;
      if (!share.gone) {
        try {
          await call(`/${share.code}`, {
            method: "DELETE",
            headers: { "X-Manage-Token": share.manageToken },
          });
        } catch (err) {
          if (!(err instanceof CloudShareError && err.status === 404)) throw err;
        }
      }
      await store.updateCloudFields([id], () => ({ share: null }));
    },

    async previewSharedQuiz(input) {
      return info(requireCode(input));
    },

    async importSharedQuiz(input, folderId) {
      const code = requireCode(input);
      const existing = (await store.listMeta()).find(
        (meta) => meta.cloudSource?.code === code && !meta.cloudSource.gone,
      );
      if (existing) {
        throw new CloudShareError(
          `"${existing.title}" is already in your library from this code. Open it to check for updates.`,
        );
      }
      const { info: found, bytes, sha256 } = await download(code);
      return store.importBytes(bytes, folderId, found.filename, {
        code,
        version: found.version,
        sha256,
        checkedAt: now().toISOString(),
      });
    },

    async checkSharedQuizzes() {
      const metas = await store.listMeta();
      const codes = new Set<string>();
      for (const meta of metas) {
        if (meta.cloudSource && !meta.cloudSource.gone) codes.add(meta.cloudSource.code);
        if (meta.share && !meta.share.gone) codes.add(meta.share.code);
      }
      if (codes.size === 0) return;

      type CheckResult = { status: string; version?: number; sha256?: string; expiresAt?: string | null };
      const results = new Map<string, CheckResult>();
      const list = [...codes];
      for (let start = 0; start < list.length; start += CHECK_BATCH) {
        const batch = list.slice(start, start + CHECK_BATCH);
        const response = await call("/check", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ codes: batch }),
        });
        const body = (await response.json()) as { results?: Record<string, CheckResult> };
        for (const code of batch) {
          const result = body.results?.[code];
          if (result && typeof result.status === "string") results.set(code, result);
        }
      }

      const checkedAt = now().toISOString();
      const ids = metas.filter((meta) => meta.cloudSource || meta.share).map((meta) => meta.id);
      await store.updateCloudFields(ids, (meta) => {
        const fields: CloudFields = {};
        const source = meta.cloudSource;
        const sourceResult = source && !source.gone ? results.get(source.code) : undefined;
        if (source && sourceResult) {
          if (sourceResult.status === "ok" && typeof sourceResult.sha256 === "string") {
            const next: QuizCloudSource = { ...source, checkedAt };
            delete next.available;
            if (sourceResult.sha256 !== source.sha256) {
              next.available = {
                version: sourceResult.version ?? source.version + 1,
                sha256: sourceResult.sha256,
              };
            }
            fields.cloudSource = next;
          } else if (sourceResult.status !== "ok") {
            fields.cloudSource = { ...source, checkedAt, gone: true };
          }
        }
        const share = meta.share;
        const shareResult = share && !share.gone ? results.get(share.code) : undefined;
        if (share && shareResult) {
          fields.share =
            shareResult.status === "ok"
              ? { ...share, expiresAt: shareResult.expiresAt ?? share.expiresAt }
              : { ...share, gone: true };
        }
        return fields.cloudSource || fields.share ? fields : null;
      });
    },

    async updateSharedQuiz(id) {
      const { cloudSource } = await requireMeta(id);
      if (!cloudSource) throw new CloudShareError("This quiz was not imported from a share code.");
      let downloaded: Awaited<ReturnType<typeof download>>;
      try {
        downloaded = await download(cloudSource.code);
      } catch (err) {
        if (err instanceof CloudShareError && (err.status === 404 || err.status === 410)) {
          await store.updateCloudFields([id], (meta) =>
            meta.cloudSource ? { cloudSource: { ...meta.cloudSource, gone: true } } : null,
          );
          throw new CloudShareError("This quiz is no longer shared, so it cannot be updated.", err.status);
        }
        throw err;
      }
      return store.replaceBytes(id, downloaded.bytes, downloaded.info.filename, {
        code: cloudSource.code,
        version: downloaded.info.version,
        sha256: downloaded.sha256,
        checkedAt: now().toISOString(),
      });
    },
  };
}
