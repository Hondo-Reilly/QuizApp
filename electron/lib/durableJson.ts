import fs from "node:fs/promises";
import path from "node:path";

export class DamagedStoreError extends Error {
  constructor(filePath: string) {
    super(
      `Saved data is damaged and was left unchanged (${path.basename(filePath)}).`,
    );
    this.name = "DamagedStoreError";
  }
}

export async function readJsonIfPresent(
  filePath: string,
): Promise<unknown | undefined> {
  try {
    await fs.access(filePath);
  } catch {
    return undefined;
  }
  let raw: string;
  try {
    raw = await fs.readFile(filePath, "utf-8");
  } catch {
    throw new DamagedStoreError(filePath);
  }
  try {
    return JSON.parse(raw) as unknown;
  } catch {
    throw new DamagedStoreError(filePath);
  }
}

export async function writeJsonAtomic(
  filePath: string,
  value: unknown,
): Promise<void> {
  const dir = path.dirname(filePath);
  await fs.mkdir(dir, { recursive: true });
  const tmp = path.join(
    dir,
    `.${path.basename(filePath)}.${process.pid}-${Date.now()}.tmp`,
  );
  const handle = await fs.open(tmp, "w");
  try {
    await handle.writeFile(JSON.stringify(value, null, 2), "utf-8");
    await handle.sync();
  } catch (err) {
    await handle.close();
    await fs.unlink(tmp).catch(() => undefined);
    throw err;
  }
  await handle.close();
  try {
    await fs.access(filePath);
    await fs.copyFile(filePath, `${filePath}.bak`);
  } catch {
    // The first write has no previous file to keep.
  }
  try {
    await fs.rename(tmp, filePath);
  } catch (err) {
    await fs.unlink(tmp).catch(() => undefined);
    throw err;
  }
}
