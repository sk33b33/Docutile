"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { DEFAULT_MAX_FILE_SIZE_BYTES } from "@/lib/constants";
import { newId } from "@/lib/id";
import { parseBackup, remapForImport } from "@/lib/backup";
import { BackupPasswordRequired, decryptBlob, isEncryptedBackup } from "@/lib/backup-crypto";
import { BUILT_IN_TEMPLATES, mergeTemplates } from "@/lib/templates";
import { IndexedDbRepository } from "@/lib/storage/indexeddb";
import type { Repository } from "@/lib/storage/repository";
import type { ActivityEvent, ActivityType, Pack, Settings, Template } from "@/types";

type LoadState = "loading" | "ready" | "error";

interface AppContextValue {
  repo: Repository;
  /** The signed-in Google account, or null when sign-in is not configured. */
  user: SignedInUser | null;
  loadState: LoadState;
  loadError: string | null;
  packs: Pack[];
  templates: Template[];
  /** Ids of templates with a saved copy; for built-ins this means "customised". */
  customisedTemplateIds: string[];
  activity: ActivityEvent[];
  settings: Settings;
  /** Persists a pack (updating `updatedAt`) and refreshes in-memory state. Throws StorageError on failure. */
  savePack: (pack: Pack) => Promise<Pack>;
  deletePack: (id: string) => Promise<void>;
  /** Validates a backup file and adds its pack under new ids. Throws BackupError or StorageError. */
  importBackup: (file: Blob, password?: string) => Promise<Pack>;
  /** Copies a pack as a new draft, with or without its files. Throws StorageError on failure. */
  duplicatePack: (id: string, withFiles: boolean) => Promise<Pack>;
  saveTemplate: (t: Template) => Promise<void>;
  deleteTemplate: (id: string) => Promise<void>;
  saveSettings: (s: Settings) => Promise<void>;
  /** Deletes the local activity history only. Throws StorageError on failure. */
  clearActivity: () => Promise<void>;
  log: (type: ActivityType, message: string, packId?: string | null) => Promise<void>;
  clearAllData: () => Promise<void>;
  reload: () => Promise<void>;
}

const AppContext = createContext<AppContextValue | null>(null);

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within AppProvider");
  return ctx;
}

const byUpdatedDesc = (a: Pack, b: Pack) => b.updatedAt.localeCompare(a.updatedAt);

export interface SignedInUser {
  email: string;
  name: string | null;
  image: string | null;
  /** ISO time the sign-in session ends (from Auth.js); null if unknown. */
  expires: string | null;
}

export function AppProvider({ children, storageName, user }: { children: ReactNode; storageName?: string; user?: SignedInUser | null }) {
  const repo = useMemo<Repository>(() => new IndexedDbRepository(storageName), [storageName]);
  const [loadState, setLoadState] = useState<LoadState>("loading");
  const [loadError, setLoadError] = useState<string | null>(null);
  const [packs, setPacks] = useState<Pack[]>([]);
  const [savedTemplates, setSavedTemplates] = useState<Template[]>([]);
  const [activity, setActivity] = useState<ActivityEvent[]>([]);
  const [settings, setSettings] = useState<Settings>({ defaultMaxFileSizeBytes: DEFAULT_MAX_FILE_SIZE_BYTES });
  const started = useRef(false);

  const reload = useCallback(async () => {
    try {
      const [p, t, a, s] = await Promise.all([repo.listPacks(), repo.listTemplates(), repo.listActivity(), repo.getSettings()]);
      setPacks(p.sort(byUpdatedDesc));
      setSavedTemplates(t);
      setActivity(a.sort((x, y) => y.timestamp.localeCompare(x.timestamp)));
      if (s) setSettings(s);
      setLoadState("ready");
      setLoadError(null);
    } catch (e) {
      setLoadState("error");
      setLoadError(e instanceof Error ? e.message : "Local storage could not be opened.");
    }
  }, [repo]);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    void reload();
  }, [reload]);

  const log = useCallback(
    async (type: ActivityType, message: string, packId: string | null = null) => {
      const event: ActivityEvent = { id: newId("evt"), packId, type, message, timestamp: new Date().toISOString() };
      try {
        await repo.addActivity(event);
        setActivity((prev) => [event, ...prev]);
      } catch {
        // Activity is informational; never block the user's action on it.
      }
    },
    [repo],
  );

  const savePack = useCallback(
    async (pack: Pack) => {
      const next = { ...pack, updatedAt: new Date().toISOString() };
      await repo.savePack(next);
      setPacks((prev) => [next, ...prev.filter((p) => p.id !== next.id)].sort(byUpdatedDesc));
      return next;
    },
    [repo],
  );

  const deletePack = useCallback(
    async (id: string) => {
      await repo.deletePack(id);
      await repo.deleteActivityForPack(id);
      setPacks((prev) => prev.filter((p) => p.id !== id));
      setActivity((prev) => prev.filter((e) => e.packId !== id));
    },
    [repo],
  );

  const importBackup = useCallback(
    async (file: Blob, password?: string) => {
      let source = file;
      if (await isEncryptedBackup(file)) {
        if (!password) throw new BackupPasswordRequired();
        source = await decryptBlob(file, password);
      }
      const { pack, blobs } = remapForImport(await parseBackup(source));
      const written: string[] = [];
      try {
        for (const [key, blob] of blobs) {
          await repo.putBlob(key, blob);
          written.push(key);
        }
        const saved = await savePack(pack);
        await log("pack_created", `Imported pack "${saved.name}" from a backup file`, saved.id);
        return saved;
      } catch (e) {
        await repo.deleteBlobs(written).catch(() => undefined); // no half-imported files left behind
        throw e;
      }
    },
    [repo, savePack, log],
  );

  const duplicatePack = useCallback(
    async (id: string, withFiles: boolean) => {
      const source = packs.find((p) => p.id === id);
      if (!source) throw new Error("That pack no longer exists.");
      const written: string[] = [];
      try {
        const slots = [];
        for (const s of source.slots) {
          const files = [];
          if (withFiles) {
            for (const f of s.files) {
              const blob = await repo.getBlob(f.blobKey);
              if (!blob) throw new Error(`"${f.displayName}" is missing from this browser's storage, so the pack cannot be copied with its files.`);
              const blobKey = newId("blob");
              await repo.putBlob(blobKey, blob);
              written.push(blobKey);
              files.push({ ...f, id: newId("file"), blobKey });
            }
          }
          slots.push({ ...s, id: newId("slot"), files });
        }
        const ts = new Date().toISOString();
        const copy: Pack = { ...source, id: newId("pack"), name: `${source.name} (copy)`, status: "draft", createdAt: ts, updatedAt: ts, exportedAt: null, slots };
        const saved = await savePack(copy);
        await log("pack_created", `Duplicated "${source.name}"${withFiles ? " with its files" : " without files"}`, saved.id);
        return saved;
      } catch (e) {
        await repo.deleteBlobs(written).catch(() => undefined);
        throw e;
      }
    },
    [packs, repo, savePack, log],
  );

  const clearActivity = useCallback(async () => {
    await repo.clearActivity();
    setActivity([]);
  }, [repo]);

  const saveTemplate = useCallback(
    async (t: Template) => {
      await repo.saveTemplate(t);
      setSavedTemplates((prev) => [...prev.filter((x) => x.id !== t.id), t]);
    },
    [repo],
  );

  const deleteTemplate = useCallback(
    async (id: string) => {
      await repo.deleteTemplate(id);
      setSavedTemplates((prev) => prev.filter((x) => x.id !== id));
    },
    [repo],
  );

  const saveSettings = useCallback(
    async (s: Settings) => {
      await repo.saveSettings(s);
      setSettings(s);
    },
    [repo],
  );

  const clearAllData = useCallback(async () => {
    await repo.clearAll();
    setPacks([]);
    setSavedTemplates([]);
    setActivity([]);
    setSettings({ defaultMaxFileSizeBytes: DEFAULT_MAX_FILE_SIZE_BYTES });
  }, [repo]);

  const templates = useMemo(() => mergeTemplates(BUILT_IN_TEMPLATES, savedTemplates), [savedTemplates]);
  const customisedTemplateIds = useMemo(() => savedTemplates.map((t) => t.id), [savedTemplates]);

  const value: AppContextValue = {
    repo, user: user ?? null, loadState, loadError, packs, templates, customisedTemplateIds, activity, settings,
    savePack, deletePack, importBackup, duplicatePack, clearActivity, saveTemplate, deleteTemplate, saveSettings, log, clearAllData, reload,
  };
  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}
