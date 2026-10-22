import { StorageError, type Repository } from "./repository";
import type { ActivityEvent, Pack, Settings, Template } from "@/types";

/** In-memory repository, used by unit tests. Data is structured-cloned like IndexedDB. */
export class MemoryRepository implements Repository {
  private packs = new Map<string, Pack>();
  private blobs = new Map<string, Blob>();
  private templates = new Map<string, Template>();
  private activity = new Map<string, ActivityEvent>();
  private settings: Settings | null = null;
  /** Set to simulate a full disk on blob writes. */
  failBlobWrites = false;

  async listPacks() { return structuredClone([...this.packs.values()]); }
  async getPack(id: string) { const p = this.packs.get(id); return p ? structuredClone(p) : null; }
  async savePack(pack: Pack) { this.packs.set(pack.id, structuredClone(pack)); }
  async deletePack(id: string) {
    const p = this.packs.get(id);
    p?.slots.forEach((s) => s.files.forEach((f) => this.blobs.delete(f.blobKey)));
    this.packs.delete(id);
  }
  async putBlob(key: string, blob: Blob) {
    if (this.failBlobWrites) throw new StorageError("Storage quota exceeded.", "quota");
    this.blobs.set(key, blob);
  }
  async getBlob(key: string) { return this.blobs.get(key) ?? null; }
  async deleteBlobs(keys: string[]) { keys.forEach((k) => this.blobs.delete(k)); }
  async listTemplates() { return structuredClone([...this.templates.values()]); }
  async saveTemplate(t: Template) { this.templates.set(t.id, structuredClone(t)); }
  async deleteTemplate(id: string) { this.templates.delete(id); }
  async listActivity() { return structuredClone([...this.activity.values()]); }
  async addActivity(e: ActivityEvent) { this.activity.set(e.id, structuredClone(e)); }
  async deleteActivityForPack(packId: string) {
    for (const [k, v] of this.activity) if (v.packId === packId) this.activity.delete(k);
  }
  async getSettings() { return this.settings; }
  async saveSettings(s: Settings) { this.settings = { ...s }; }
  async clearAll() {
    this.packs.clear(); this.blobs.clear(); this.templates.clear(); this.activity.clear(); this.settings = null;
  }
}
