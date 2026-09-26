const DB_NAME = "quizapp";
const DB_VERSION = 1;
const STORE = "records";

export const LIBRARY_KEY = "library";
export const ATTEMPTS_KEY = "attempts";

export function quizKey(id: string): string {
  return `quiz:${id}`;
}

/** A package image stored for a quiz, e.g. assetKey("q", "images/a.png"). */
export function assetKey(quizId: string, path: string): string {
  return `asset:${quizId}:${path}`;
}

/** A photo from an image-response answer, stored with its attempt. */
export function attemptPhotoKey(attemptId: string, name: string): string {
  return `attempt-photo:${attemptId}:${name}`;
}

let chain: Promise<unknown> = Promise.resolve();

export function run<T>(task: () => Promise<T>): Promise<T> {
  const next = chain.then(task, task);
  chain = next.then(
    () => undefined,
    () => undefined,
  );
  return next;
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE);
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("Could not open saved data."));
  });
}

function access<T>(
  mode: IDBTransactionMode,
  work: (store: IDBObjectStore) => () => T,
): Promise<T> {
  return openDb().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const tx = db.transaction(STORE, mode);
        const read = work(tx.objectStore(STORE));
        let settled = false;
        const finish = (settle: () => void) => {
          if (settled) return;
          settled = true;
          db.close();
          settle();
        };
        tx.oncomplete = () => finish(() => resolve(read()));
        tx.onerror = () =>
          finish(() => reject(tx.error ?? new Error("Could not save browser data.")));
        tx.onabort = () =>
          finish(() => reject(tx.error ?? new Error("Could not save browser data.")));
      }),
  );
}

export function readRecord<T>(key: string): Promise<T | undefined> {
  return access("readonly", (store) => {
    let value: T | undefined;
    const request = store.get(key);
    request.onsuccess = () => {
      value = request.result as T | undefined;
    };
    return () => value;
  });
}

export type RecordChange =
  | { key: string; value: unknown }
  | { key: string; delete: true };

export function deleteDatabase(): Promise<void> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.deleteDatabase(DB_NAME);
    request.onsuccess = () => resolve();
    request.onerror = () =>
      reject(request.error ?? new Error("Could not delete saved data."));
    request.onblocked = () =>
      reject(new Error("Could not delete saved data because it is still in use."));
  });
}

export function changeRecords(changes: readonly RecordChange[]): Promise<void> {
  return access("readwrite", (store) => {
    for (const change of changes) {
      if ("delete" in change) store.delete(change.key);
      else store.put(change.value, change.key);
    }
    return () => undefined;
  });
}
