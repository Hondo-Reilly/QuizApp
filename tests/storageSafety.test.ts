import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  DamagedStoreError,
  readJsonIfPresent,
  writeJsonAtomic,
} from "../electron/lib/durableJson";
import { quizFileInDir } from "../electron/lib/quizPath";
import {
  mobileJsonContentType,
  mobileOriginAllowed,
  mobileTokensMatch,
} from "../electron/lib/mobileAccess";
import { allocateStorageId, isSafeStorageId } from "@shared/storageId";

describe("quiz storage ids", () => {
  it("rejects traversal, reserved, and empty ids", () => {
    expect(isSafeStorageId("../attempts")).toBe(false);
    expect(isSafeStorageId("index")).toBe(false);
    expect(isSafeStorageId("")).toBe(false);
    expect(isSafeStorageId("general-knowledge-sample")).toBe(true);
  });

  it("replaces an unsafe import id and keeps a free safe id", () => {
    const taken = new Set<string>();
    expect(allocateStorageId("../attempts", "History", taken, () => "abc")).toBe(
      "history",
    );
    expect(allocateStorageId("index", "History", taken, () => "abc")).toBe(
      "history",
    );
    expect(allocateStorageId("kept-id", "History", taken, () => "abc")).toBe(
      "kept-id",
    );
  });

  it("keeps a quiz file directly inside the library directory", () => {
    const dir = path.join(os.tmpdir(), "quiz-library");
    expect(quizFileInDir(dir, "kept-id")).toBe(path.resolve(dir, "kept-id.json"));
    expect(() => quizFileInDir(dir, "../attempts")).toThrow(/not safe/);
  });
});

describe("durable json storage", () => {
  it("leaves a damaged file in place and refuses to treat it as empty", async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), "quiz-store-"));
    const file = path.join(dir, "attempts.json");
    await fs.writeFile(file, "{not json", "utf-8");
    await expect(readJsonIfPresent(file)).rejects.toBeInstanceOf(DamagedStoreError);
    expect(await fs.readFile(file, "utf-8")).toBe("{not json");
  });

  it("replaces a file atomically and keeps the previous copy", async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), "quiz-store-"));
    const file = path.join(dir, "index.json");
    await writeJsonAtomic(file, { version: 1 });
    await writeJsonAtomic(file, { version: 2 });
    expect(JSON.parse(await fs.readFile(file, "utf-8"))).toEqual({ version: 2 });
    expect(JSON.parse(await fs.readFile(`${file}.bak`, "utf-8"))).toEqual({
      version: 1,
    });
    expect(await readJsonIfPresent(path.join(dir, "missing.json"))).toBeUndefined();
  });
});

describe("mobile session access", () => {
  it("requires the session token, a matching origin, and JSON", () => {
    expect(mobileTokensMatch("secret-token", "secret-token")).toBe(true);
    expect(mobileTokensMatch("other-token", "secret-token")).toBe(false);
    expect(mobileTokensMatch(null, "secret-token")).toBe(false);
    expect(mobileOriginAllowed(undefined, "192.168.1.8:4321")).toBe(true);
    expect(mobileOriginAllowed("http://192.168.1.8:4321", "192.168.1.8:4321")).toBe(
      true,
    );
    expect(mobileOriginAllowed("http://evil.example", "192.168.1.8:4321")).toBe(
      false,
    );
    expect(mobileJsonContentType("application/json; charset=utf-8")).toBe(true);
    expect(mobileJsonContentType("text/plain")).toBe(false);
  });
});
