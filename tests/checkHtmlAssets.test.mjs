import { describe, expect, it } from "vitest";
import { checkHtmlAssets } from "../scripts/check-html-assets.mjs";

describe("packaged HTML asset references", () => {
  const exists = (relative) => relative === "assets/app.js";

  it("accepts a relative asset included in the package", async () => {
    await expect(checkHtmlAssets(
      '<script src="./assets/app.js"></script>',
      "index.html",
      exists,
    )).resolves.toBeUndefined();
  });

  it("rejects the root-absolute path that caused blank Mac windows", async () => {
    await expect(checkHtmlAssets(
      '<script src="/assets/app.js"></script>',
      "index.html",
      exists,
    )).rejects.toThrow("root-absolute asset URL");
  });

  it("rejects missing and escaping assets", async () => {
    await expect(checkHtmlAssets(
      '<script src="./assets/missing.js"></script>',
      "index.html",
      exists,
    )).rejects.toThrow("missing asset");
    await expect(checkHtmlAssets(
      '<script src="../../outside.js"></script>',
      "index.html",
      exists,
    )).rejects.toThrow("outside dist");
  });
});
