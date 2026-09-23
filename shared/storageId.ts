const SAFE_STORAGE_ID = /^[A-Za-z0-9][A-Za-z0-9_-]{0,63}$/;
const RESERVED_STORAGE_IDS = new Set(["index"]);

export function isSafeStorageId(id: string): boolean {
  return SAFE_STORAGE_ID.test(id) && !RESERVED_STORAGE_IDS.has(id);
}

export function slugifyTitle(input: string): string {
  return (
    input
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 48) || "quiz"
  );
}

export function allocateStorageId(
  preferred: string | undefined,
  title: string,
  taken: ReadonlySet<string>,
  randomSuffix: () => string,
): string {
  if (preferred && isSafeStorageId(preferred) && !taken.has(preferred)) {
    return preferred;
  }
  const base = slugifyTitle(title);
  if (isSafeStorageId(base) && !taken.has(base)) return base;
  let id = "";
  do {
    id = `${base}-${randomSuffix()}`.slice(0, 64);
  } while (!isSafeStorageId(id) || taken.has(id));
  return id;
}
