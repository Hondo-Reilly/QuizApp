const APP_STORAGE_PREFIX = "quizapp:";

export function clearAppLocalStorage(
  storage: Pick<Storage, "length" | "key" | "removeItem">,
): void {
  const keys: string[] = [];
  for (let i = 0; i < storage.length; i += 1) {
    const key = storage.key(i);
    if (key?.startsWith(APP_STORAGE_PREFIX)) keys.push(key);
  }
  for (const key of keys) storage.removeItem(key);
}
