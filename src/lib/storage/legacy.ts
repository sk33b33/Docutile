/**
 * One-time migration from the pre-rename "packflow" IndexedDB to "docutile".
 * Copies every store, and removes the old database only after the copy succeeded.
 * If anything fails the old database is left untouched, so nothing can be lost.
 */
export const LEGACY_DB_NAME = "packflow";

const STORE_NAMES = ["packs", "blobs", "templates", "activity", "settings"] as const;

const wrap = <T,>(req: IDBRequest<T>) =>
  new Promise<T>((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });

const done = (tx: IDBTransaction) =>
  new Promise<void>((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });

function openLegacy(): Promise<IDBDatabase | null> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(LEGACY_DB_NAME);
    // The old database should already exist at version 1. If this fires, it did not: do not create it.
    req.onupgradeneeded = () => req.transaction?.abort();
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => (req.error?.name === "AbortError" ? resolve(null) : reject(req.error));
    req.onblocked = () => resolve(null);
  });
}

/** Returns the number of records copied (0 if there was nothing to do). */
export async function migrateLegacyDatabase(target: IDBDatabase): Promise<number> {
  // indexedDB.databases() is missing in some older browsers; without it we cannot detect the old DB safely.
  if (typeof indexedDB.databases !== "function") return 0;
  const existing = await indexedDB.databases();
  if (!existing.some((d) => d.name === LEGACY_DB_NAME)) return 0;

  // Never overwrite data that already lives in the new database.
  const existingPacks = await wrap(target.transaction("packs", "readonly").objectStore("packs").count());
  if (existingPacks > 0) return 0;

  const legacy = await openLegacy();
  if (!legacy) return 0;
  try {
    if (!STORE_NAMES.every((n) => legacy.objectStoreNames.contains(n))) return 0;
    const rtx = legacy.transaction([...STORE_NAMES], "readonly");
    const packs = await wrap(rtx.objectStore("packs").getAll());
    const templates = await wrap(rtx.objectStore("templates").getAll());
    const activity = await wrap(rtx.objectStore("activity").getAll());
    const settings = await wrap(rtx.objectStore("settings").get("settings"));
    const blobKeys = await wrap(rtx.objectStore("blobs").getAllKeys());
    const blobs = await Promise.all(blobKeys.map((k) => wrap(rtx.objectStore("blobs").get(k))));

    const wtx = target.transaction([...STORE_NAMES], "readwrite");
    packs.forEach((p) => wtx.objectStore("packs").put(p));
    templates.forEach((t) => wtx.objectStore("templates").put(t));
    activity.forEach((a) => wtx.objectStore("activity").put(a));
    if (settings) wtx.objectStore("settings").put(settings, "settings");
    blobKeys.forEach((k, i) => wtx.objectStore("blobs").put(blobs[i], k));
    await done(wtx);
    return packs.length + templates.length + activity.length + blobKeys.length + (settings ? 1 : 0);
  } finally {
    legacy.close();
  }
}

export function deleteLegacyDatabase(): Promise<void> {
  return new Promise((resolve) => {
    const req = indexedDB.deleteDatabase(LEGACY_DB_NAME);
    req.onsuccess = () => resolve();
    req.onerror = () => resolve(); // leftover legacy data is harmless
    req.onblocked = () => resolve();
  });
}
