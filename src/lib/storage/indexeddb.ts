import { StorageError, type Repository } from "./repository";
import { deleteLegacyDatabase, migrateLegacyDatabase } from "./legacy";
import type { ActivityEvent, Pack, Settings, Template } from "@/types";

const DB_NAME = "docutile";
/** Bump when stores change and add a step to `upgrade`. */
const DB_VERSION = 1;

const STORES = { packs: "packs", blobs: "blobs", templates: "templates", activity: "activity", settings: "settings" } as const;

function toStorageError(err: unknown): StorageError {
  if (err instanceof StorageError) return err;
  const name = (err as { name?: string })?.name;
  if (name === "QuotaExceededError") {
    return new StorageError("Browser storage is full. Remove some files or free up space and try again.", "quota");
  }
  const msg = err instanceof Error ? err.message : "Unknown storage error";
  return new StorageError(`Browser storage failed: ${msg}`, "unknown");
}

function upgrade(db: IDBDatabase, oldVersion: number) {
  if (oldVersion < 1) {
    db.createObjectStore(STORES.packs, { keyPath: "id" });
    db.createObjectStore(STORES.blobs); // out-of-line keys
    db.createObjectStore(STORES.templates, { keyPath: "id" });
    db.createObjectStore(STORES.activity, { keyPath: "id" });
    db.createObjectStore(STORES.settings); // single record under key "settings"
  }
}

export class IndexedDbRepository implements Repository {
  private dbPromise: Promise<IDBDatabase> | null = null;

  private open(): Promise<IDBDatabase> {
    if (this.dbPromise) return this.dbPromise;
    this.dbPromise = new Promise((resolve, reject) => {
      if (typeof indexedDB === "undefined") {
        reject(new StorageError("This browser does not support local storage (IndexedDB). Drafts cannot be saved.", "unavailable"));
        return;
      }
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = (ev) => upgrade(req.result, ev.oldVersion);
      req.onsuccess = async () => {
        const db = req.result;
        db.onversionchange = () => db.close();
        // Move data saved under the old app name. Failure must never stop the app from opening.
        try {
          if ((await migrateLegacyDatabase(db)) > 0) await deleteLegacyDatabase();
        } catch {
          /* old data stays where it was */
        }
        resolve(db);
      };
      req.onerror = () =>
        reject(new StorageError("Could not open local storage. Private browsing may be blocking it.", "unavailable"));
      req.onblocked = () =>
        reject(new StorageError("Local storage is blocked by another open tab. Close other Docutile tabs and reload.", "unavailable"));
    });
    this.dbPromise.catch(() => { this.dbPromise = null; });
    return this.dbPromise;
  }

  private async tx<T>(
    stores: string[],
    mode: IDBTransactionMode,
    fn: (tx: IDBTransaction) => IDBRequest<T> | void,
  ): Promise<T | undefined> {
    const db = await this.open();
    return new Promise<T | undefined>((resolve, reject) => {
      let result: T | undefined;
      let tx: IDBTransaction;
      try {
        tx = db.transaction(stores, mode);
      } catch (e) {
        reject(toStorageError(e));
        return;
      }
      const req = fn(tx);
      if (req) req.onsuccess = () => { result = req.result; };
      tx.oncomplete = () => resolve(result);
      tx.onerror = () => reject(toStorageError(tx.error));
      tx.onabort = () => reject(toStorageError(tx.error));
    });
  }

  private async getAll<T>(store: string): Promise<T[]> {
    return ((await this.tx<T[]>([store], "readonly", (tx) => tx.objectStore(store).getAll())) ?? []) as T[];
  }

  listPacks() { return this.getAll<Pack>(STORES.packs); }
  async getPack(id: string) {
    return ((await this.tx<Pack>([STORES.packs], "readonly", (tx) => tx.objectStore(STORES.packs).get(id))) ?? null) as Pack | null;
  }
  async savePack(pack: Pack) { await this.tx([STORES.packs], "readwrite", (tx) => tx.objectStore(STORES.packs).put(pack)); }

  async deletePack(id: string) {
    const pack = await this.getPack(id);
    await this.tx([STORES.packs, STORES.blobs], "readwrite", (tx) => {
      pack?.slots.forEach((s) => s.files.forEach((f) => tx.objectStore(STORES.blobs).delete(f.blobKey)));
      tx.objectStore(STORES.packs).delete(id);
    });
  }

  async putBlob(key: string, blob: Blob) { await this.tx([STORES.blobs], "readwrite", (tx) => tx.objectStore(STORES.blobs).put(blob, key)); }
  async getBlob(key: string) {
    return ((await this.tx<Blob>([STORES.blobs], "readonly", (tx) => tx.objectStore(STORES.blobs).get(key))) ?? null) as Blob | null;
  }
  async deleteBlobs(keys: string[]) {
    if (!keys.length) return;
    await this.tx([STORES.blobs], "readwrite", (tx) => { keys.forEach((k) => tx.objectStore(STORES.blobs).delete(k)); });
  }

  listTemplates() { return this.getAll<Template>(STORES.templates); }
  async saveTemplate(t: Template) { await this.tx([STORES.templates], "readwrite", (tx) => tx.objectStore(STORES.templates).put(t)); }
  async deleteTemplate(id: string) { await this.tx([STORES.templates], "readwrite", (tx) => tx.objectStore(STORES.templates).delete(id)); }

  listActivity() { return this.getAll<ActivityEvent>(STORES.activity); }
  async addActivity(e: ActivityEvent) { await this.tx([STORES.activity], "readwrite", (tx) => tx.objectStore(STORES.activity).put(e)); }
  async deleteActivityForPack(packId: string) {
    const all = await this.listActivity();
    await this.tx([STORES.activity], "readwrite", (tx) => {
      all.filter((e) => e.packId === packId).forEach((e) => tx.objectStore(STORES.activity).delete(e.id));
    });
  }

  async getSettings() {
    return ((await this.tx<Settings>([STORES.settings], "readonly", (tx) => tx.objectStore(STORES.settings).get("settings"))) ?? null) as Settings | null;
  }
  async saveSettings(s: Settings) { await this.tx([STORES.settings], "readwrite", (tx) => tx.objectStore(STORES.settings).put(s, "settings")); }

  async clearAll() {
    const names = Object.values(STORES);
    await this.tx(names, "readwrite", (tx) => { names.forEach((n) => tx.objectStore(n).clear()); });
  }
}
