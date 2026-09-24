import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { readInitialAccent } from "@/lib/accent";

let stored: Map<string, string>;

beforeEach(() => {
  stored = new Map();
  vi.stubGlobal("window", {
    localStorage: {
      getItem: (key: string) => stored.get(key) ?? null,
      setItem: (key: string, value: string) => stored.set(key, value),
    },
  });
});

afterEach(() => vi.unstubAllGlobals());

describe("accent color", () => {
  it("uses blue when nothing is stored", () => {
    expect(readInitialAccent()).toBe("blue");
  });

  it("keeps a stored accent", () => {
    stored.set("quizapp:accent", "pink");
    expect(readInitialAccent()).toBe("pink");
  });

  it("ignores an unknown stored value", () => {
    stored.set("quizapp:accent", "chartreuse");
    expect(readInitialAccent()).toBe("blue");
  });
});
