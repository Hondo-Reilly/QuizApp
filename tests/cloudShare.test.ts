import { describe, expect, it } from "vitest";
import {
  CHECK_BATCH,
  createCloudShare,
  formatShareCode,
  hasUnpublishedChanges,
  normalizeShareCode,
  originalShareCode,
  sha256Hex,
  sourceAfterReplace,
  withCloudFields,
  type CloudFetch,
  type CloudShareStore,
} from "@shared/cloudShare";
import type { QuizCloudSource, QuizMetadata } from "@shared/types";

const BASE = "https://share.test/quiz-app";

interface ServerFile {
  bytes: Uint8Array;
  version: number;
  sha256: string;
  token: string;
  expiresAt: string;
}

/** An in-memory stand-in for the hjr-data quiz-app namespace. */
function fakeServer() {
  const files = new Map<string, ServerFile>();
  const requests: { method: string; path: string; headers: Record<string, string>; body?: unknown }[] = [];
  let next = 10000000;
  let offline = false;

  const info = (code: string, file: ServerFile) => ({
    name: code,
    version: file.version,
    filename: `${code}.quiz`,
    size: file.bytes.length,
    contentType: "application/zip",
    sha256: file.sha256,
    createdAt: "2026-10-01T00:00:00.000Z",
    updatedAt: "2026-10-01T00:00:00.000Z",
    expiresAt: file.expiresAt,
  });
  const json = (status: number, body: unknown) =>
    new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
  const missing = () => json(404, { error: "not found" });

  const fetch: CloudFetch = async (url, init = {}) => {
    if (offline) throw new TypeError("fetch failed");
    const method = init.method ?? "GET";
    const path = url.slice(BASE.length);
    const headers = Object.fromEntries(
      Object.entries((init.headers ?? {}) as Record<string, string>).map(([k, v]) => [k.toLowerCase(), v]),
    );
    const body = init.body instanceof Uint8Array ? init.body : typeof init.body === "string" ? JSON.parse(init.body) : undefined;
    requests.push({ method, path, headers, body });

    if (method === "POST" && path === "") {
      const bytes = body as Uint8Array;
      const code = String(next++);
      const file = { bytes, version: 1, sha256: await sha256Hex(bytes), token: `tok-${code}`, expiresAt: "2026-11-30T00:00:00.000Z" };
      files.set(code, file);
      return json(201, { code, url: `${BASE}/${code}`, ...info(code, file), manageToken: file.token });
    }
    if (method === "POST" && path === "/check") {
      const results: Record<string, unknown> = {};
      for (const code of (body as { codes: string[] }).codes) {
        const file = files.get(code);
        results[code] = file ? { status: "ok", ...info(code, file) } : { status: "not_found" };
      }
      return json(200, { results });
    }
    const match = /^\/(\d{8})(\/info)?$/.exec(path);
    const file = match ? files.get(match[1]) : undefined;
    if (!match || !file) return missing();
    const code = match[1];
    if (method === "GET" && match[2]) return json(200, info(code, file));
    if (method === "GET") return new Response(file.bytes as BodyInit, { status: 200 });
    if (headers["x-manage-token"] !== file.token) return json(403, { error: "wrong manage token" });
    if (method === "PUT") {
      const bytes = body as Uint8Array;
      Object.assign(file, { bytes, version: file.version + 1, sha256: await sha256Hex(bytes) });
      return json(200, info(code, file));
    }
    if (method === "PATCH") {
      file.expiresAt = "2027-01-27T00:00:00.000Z";
      return json(200, info(code, file));
    }
    if (method === "DELETE") {
      files.delete(code);
      return new Response(null, { status: 204 });
    }
    return missing();
  };

  return {
    fetch,
    files,
    requests,
    setOffline: (value: boolean) => {
      offline = value;
    },
  };
}

/** An in-memory library. A quiz's "content" is just its bytes. */
function memoryStore() {
  const metas = new Map<string, QuizMetadata>();
  const content = new Map<string, Uint8Array>();
  let added = 0;

  const store: CloudShareStore = {
    getMeta: async (id) => metas.get(id) ?? null,
    listMeta: async () => [...metas.values()],
    exportPackage: async (id) => {
      const meta = metas.get(id);
      return meta ? { title: meta.title, bytes: content.get(id)! } : null;
    },
    updateCloudFields: async (ids, update) => {
      for (const id of ids) {
        const meta = metas.get(id);
        const fields = meta && update(meta);
        if (meta && fields) metas.set(id, withCloudFields(meta, fields));
      }
    },
    importBytes: async (bytes, folderId, _name, cloudSource) => {
      const id = `quiz-${++added}`;
      const meta: QuizMetadata = {
        id,
        title: `Imported ${added}`,
        questionCount: 1,
        importedAt: "2026-10-01T00:00:00.000Z",
        folderId,
        cloudSource,
      };
      metas.set(id, meta);
      content.set(id, bytes);
      return meta;
    },
    replaceBytes: async (id, bytes, _name, cloudSource?: QuizCloudSource) => {
      const meta = { ...metas.get(id)!, updatedAt: new Date().toISOString() };
      if (cloudSource) meta.cloudSource = cloudSource;
      metas.set(id, meta);
      content.set(id, bytes);
      return meta;
    },
  };

  const add = (id: string, bytes: Uint8Array) => {
    metas.set(id, {
      id,
      title: "Cell Biology",
      questionCount: 1,
      importedAt: "2026-10-01T00:00:00.000Z",
      folderId: null,
    });
    content.set(id, bytes);
  };

  return { store, metas, content, add };
}

const bytes = (...values: number[]) => new Uint8Array(values);
const NOW = new Date("2026-10-29T12:00:00.000Z");

function setup() {
  const server = fakeServer();
  const library = memoryStore();
  const cloud = createCloudShare(library.store, server.fetch, { baseUrl: BASE, now: () => NOW });
  return { server, library, cloud };
}

describe("share codes", () => {
  it("accepts 8 digits with spaces or a dash", () => {
    expect(normalizeShareCode("1234 5678")).toBe("12345678");
    expect(normalizeShareCode(" 1234-5678 ")).toBe("12345678");
    expect(normalizeShareCode("1234567")).toBeNull();
    expect(normalizeShareCode("1234abcd")).toBeNull();
    expect(formatShareCode("12345678")).toBe("1234 5678");
  });
});

describe("cloud sharing", () => {
  it("uploads a quiz once and keeps its code and manage token", async () => {
    const { server, library, cloud } = setup();
    library.add("cells", bytes(1, 2, 3));

    const share = await cloud.shareQuiz("cells");
    expect(share.code).toMatch(/^\d{8}$/);
    expect(share.manageToken).toBe(`tok-${share.code}`);
    expect(share.version).toBe(1);
    expect(library.metas.get("cells")?.share).toEqual(share);

    const upload = server.requests[0];
    expect(upload.method).toBe("POST");
    expect(upload.headers["content-type"]).toBe("application/zip");
    expect(upload.headers["x-filename"]).toBe("cell-biology.quiz");

    expect(await cloud.shareQuiz("cells")).toEqual(share);
    expect(server.requests).toHaveLength(1);
  });

  it("imports by code, then finds, downloads and applies a published update", async () => {
    const { server, library, cloud } = setup();
    library.add("cells", bytes(1, 2, 3));
    const share = await cloud.shareQuiz("cells");

    const preview = await cloud.previewSharedQuiz(formatShareCode(share.code));
    expect(preview).toMatchObject({ code: share.code, version: 1, size: 3 });

    const imported = await cloud.importSharedQuiz(`${share.code.slice(0, 4)}-${share.code.slice(4)}`, "folder-a");
    expect(imported.folderId).toBe("folder-a");
    expect(imported.cloudSource).toMatchObject({ code: share.code, version: 1, sha256: share.sha256 });
    await expect(cloud.importSharedQuiz(share.code, null)).rejects.toThrow(/already in your library/);

    await cloud.checkSharedQuizzes();
    expect(library.metas.get(imported.id)?.cloudSource?.available).toBeUndefined();

    library.content.set("cells", bytes(4, 5, 6, 7));
    const published = await cloud.publishQuizUpdate("cells");
    expect(published.code).toBe(share.code);
    expect(published.version).toBe(2);
    const put = server.requests.find((r) => r.method === "PUT")!;
    expect(put.headers["x-manage-token"]).toBe(share.manageToken);

    await cloud.checkSharedQuizzes();
    const available = library.metas.get(imported.id)?.cloudSource?.available;
    expect(available).toEqual({ version: 2, sha256: published.sha256 });

    const updated = await cloud.updateSharedQuiz(imported.id);
    expect(updated.id).toBe(imported.id);
    expect(updated.cloudSource).toMatchObject({ version: 2, sha256: published.sha256 });
    expect(updated.cloudSource?.available).toBeUndefined();
    expect(library.content.get(imported.id)).toEqual(bytes(4, 5, 6, 7));
  });

  it("checks at most 50 codes per request", async () => {
    const { server, library, cloud } = setup();
    for (let i = 0; i < CHECK_BATCH + 5; i++) {
      library.add(`q${i}`, bytes(i));
      await cloud.shareQuiz(`q${i}`);
    }
    server.requests.length = 0;
    await cloud.checkSharedQuizzes();
    const checks = server.requests.filter((r) => r.path === "/check");
    expect(checks.map((r) => (r.body as { codes: string[] }).codes.length)).toEqual([CHECK_BATCH, 5]);
  });

  it("marks codes the server lost and stops checking them", async () => {
    const { server, library, cloud } = setup();
    library.add("cells", bytes(1));
    const share = await cloud.shareQuiz("cells");
    const imported = await cloud.importSharedQuiz(share.code, null);
    server.files.delete(share.code);

    await cloud.checkSharedQuizzes();
    expect(library.metas.get(imported.id)?.cloudSource?.gone).toBe(true);
    expect(library.metas.get("cells")?.share?.gone).toBe(true);

    server.requests.length = 0;
    await cloud.checkSharedQuizzes();
    expect(server.requests).toHaveLength(0);
  });

  it("re-uploads a lapsed share with a new code", async () => {
    const { server, library, cloud } = setup();
    library.add("cells", bytes(1));
    const first = await cloud.shareQuiz("cells");
    server.files.delete(first.code);

    await expect(cloud.publishQuizUpdate("cells")).rejects.toThrow(/expired/);
    expect(library.metas.get("cells")?.share?.gone).toBe(true);
    await expect(cloud.extendQuizShare("cells")).rejects.toThrow(/expired/);

    const second = await cloud.shareQuiz("cells");
    expect(second.code).not.toBe(first.code);
    expect(second.gone).toBeUndefined();
  });

  it("extends a share to the longest expiry", async () => {
    const { server, library, cloud } = setup();
    library.add("cells", bytes(1));
    await cloud.shareQuiz("cells");
    const extended = await cloud.extendQuizShare("cells");
    expect(extended.expiresAt).toBe("2027-01-27T00:00:00.000Z");
    const patch = server.requests.find((r) => r.method === "PATCH")!;
    expect(patch.body).toEqual({ ttl: "90d" });
  });

  it("deletes the shared copy, and treats a missing one as deleted", async () => {
    const { server, library, cloud } = setup();
    library.add("a", bytes(1));
    library.add("b", bytes(2));
    const a = await cloud.shareQuiz("a");
    const b = await cloud.shareQuiz("b");

    await cloud.unshareQuiz("a");
    expect(server.files.has(a.code)).toBe(false);
    expect(library.metas.get("a")?.share).toBeUndefined();

    server.files.delete(b.code);
    await cloud.unshareQuiz("b");
    expect(library.metas.get("b")?.share).toBeUndefined();
  });

  it("keeps the share when the server cannot be reached", async () => {
    const { server, library, cloud } = setup();
    library.add("cells", bytes(1));
    await cloud.shareQuiz("cells");
    server.setOffline(true);
    await expect(cloud.unshareQuiz("cells")).rejects.toThrow(/Could not reach the share server/);
    expect(library.metas.get("cells")?.share).toBeDefined();
  });

  it("explains bad and unknown codes", async () => {
    const { cloud } = setup();
    await expect(cloud.previewSharedQuiz("12")).rejects.toThrow(/8 digits/);
    await expect(cloud.previewSharedQuiz("9999 9999")).rejects.toThrow(/No shared quiz has the code 9999 9999/);
  });
});

describe("unpublished changes", () => {
  const meta: QuizMetadata = {
    id: "q",
    title: "Q",
    questionCount: 1,
    importedAt: "2026-10-01T00:00:00.000Z",
    folderId: null,
    share: {
      code: "12345678",
      manageToken: "t",
      version: 1,
      sha256: "x",
      expiresAt: null,
      sharedAt: "2026-10-02T00:00:00.000Z",
      publishedAt: "2026-10-02T00:00:00.000Z",
    },
  };

  it("compares the last replace with the last upload", () => {
    expect(hasUnpublishedChanges(meta)).toBe(false);
    expect(hasUnpublishedChanges({ ...meta, updatedAt: "2026-10-01T12:00:00.000Z" })).toBe(false);
    expect(hasUnpublishedChanges({ ...meta, updatedAt: "2026-10-03T00:00:00.000Z" })).toBe(true);
  });
});

describe("older share servers", () => {
  it("treats a missing version as version 1", async () => {
    const server = fakeServer();
    const library = memoryStore();
    const fetchWithoutVersion: CloudFetch = async (url, init) => {
      const response = await server.fetch(url, init);
      if (!response.headers.get("Content-Type")?.includes("json")) return response;
      const body = (await response.json()) as Record<string, unknown>;
      delete body.version;
      return new Response(JSON.stringify(body), { status: response.status, headers: response.headers });
    };
    const cloud = createCloudShare(library.store, fetchWithoutVersion, { baseUrl: BASE, now: () => NOW });
    library.add("cells", bytes(1));
    expect((await cloud.shareQuiz("cells")).version).toBe(1);
  });
});

describe("passing on an imported quiz", () => {
  const source: QuizCloudSource = {
    code: "44332106",
    version: 1,
    sha256: "x",
    checkedAt: "2026-10-29T00:00:00.000Z",
  };
  const meta = (cloudSource?: QuizCloudSource): QuizMetadata => ({
    id: "q",
    title: "Q",
    questionCount: 1,
    importedAt: "2026-10-01T00:00:00.000Z",
    folderId: null,
    cloudSource,
  });

  it("offers the original code while it works and still matches", () => {
    expect(originalShareCode(meta(source))).toBe("44332106");
    expect(originalShareCode(meta())).toBeNull();
    expect(originalShareCode(meta({ ...source, gone: true }))).toBeNull();
    expect(originalShareCode(meta({ ...source, replacedLocally: true }))).toBeNull();
  });

  it("marks a source replaced from a file, and clears that on an update", () => {
    expect(sourceAfterReplace(source, undefined)).toEqual({ ...source, replacedLocally: true });
    expect(sourceAfterReplace(undefined, undefined)).toBeUndefined();
    const updated = { ...source, version: 2 };
    expect(sourceAfterReplace({ ...source, replacedLocally: true }, updated)).toBe(updated);
  });
});

describe("server answers", () => {
  it("refuses a code that is not 8 digits before using it in a URL", async () => {
    const server = fakeServer();
    const library = memoryStore();
    const badCode: CloudFetch = async (url, init) => {
      const response = await server.fetch(url, init);
      const body = (await response.json()) as Record<string, unknown>;
      return new Response(JSON.stringify({ ...body, code: "../admin", name: "../admin" }), {
        status: response.status,
        headers: response.headers,
      });
    };
    const cloud = createCloudShare(library.store, badCode, { baseUrl: BASE, now: () => NOW });
    library.add("cells", bytes(1));
    await expect(cloud.shareQuiz("cells")).rejects.toThrow(/does not understand/);
    expect(library.metas.get("cells")?.share).toBeUndefined();
  });
});
