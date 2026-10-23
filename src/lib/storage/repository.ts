import type { ActivityEvent, Pack, Settings, Template } from "@/types";

/** Thrown for storage failures that the UI can describe to the user. */
export class StorageError extends Error {
  constructor(
    message: string,
    public readonly kind: "quota" | "unavailable" | "not_found" | "unknown",
  ) {
    super(message);
    this.name = "StorageError";
  }
}

/**
 * Persistence boundary. The local MVP implements this with IndexedDB; a hosted
 * version would implement it against a server API.
 */
export interface Repository {
  listPacks(): Promise<Pack[]>;
  getPack(id: string): Promise<Pack | null>;
  savePack(pack: Pack): Promise<void>;
  /** Deletes the pack and every blob it referenced. */
  deletePack(id: string): Promise<void>;

  putBlob(key: string, blob: Blob): Promise<void>;
  getBlob(key: string): Promise<Blob | null>;
  deleteBlobs(keys: string[]): Promise<void>;

  listTemplates(): Promise<Template[]>;
  saveTemplate(template: Template): Promise<void>;
  deleteTemplate(id: string): Promise<void>;

  listActivity(): Promise<ActivityEvent[]>;
  addActivity(event: ActivityEvent): Promise<void>;
  deleteActivityForPack(packId: string): Promise<void>;
  /** Removes every activity event. Packs, files and templates are untouched. */
  clearActivity(): Promise<void>;

  getSettings(): Promise<Settings | null>;
  saveSettings(settings: Settings): Promise<void>;

  clearAll(): Promise<void>;
}
