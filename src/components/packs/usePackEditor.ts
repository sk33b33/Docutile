"use client";

import { useCallback, useEffect, useRef } from "react";
import { useApp } from "@/components/providers/AppProvider";
import { newId } from "@/lib/id";
import { moveItem } from "@/lib/ordering";
import { newCustomSlot, statusFor, trimMeta, type PackMetaInput } from "@/lib/packs";
import { validateFile } from "@/lib/validation/files";
import { computeCompleteness } from "@/lib/validation/pack";
import { MIME_BY_EXTENSION } from "@/lib/constants";
import { getExtension } from "@/lib/format";
import type { AttachedFile, DocumentSlot, Pack, WaitingNote } from "@/types";
import type { SlotDraft } from "@/components/templates/SlotEditorDialog";

export interface AttachResult {
  attached: AttachedFile | null;
  error?: string;
  warnings: string[];
}

/**
 * All pack mutations. Every operation persists before reporting success, and
 * throws (StorageError etc.) if persistence fails, leaving stored data unchanged.
 */
export function usePackEditor(packId: string) {
  const { packs, repo, savePack, log } = useApp();
  const pack = packs.find((p) => p.id === packId) ?? null;

  // Latest saved pack, so back-to-back operations (multi-file drops) do not use stale state.
  const latest = useRef<Pack | null>(pack);
  useEffect(() => {
    if (pack) latest.current = pack;
  }, [pack]);
  const queue = useRef<Promise<unknown>>(Promise.resolve());

  /** Serialises mutations so concurrent operations cannot overwrite each other. */
  const run = useCallback(<T,>(fn: (current: Pack) => Promise<T>): Promise<T> => {
    const next = queue.current.then(async () => {
      if (!latest.current) throw new Error("Pack not found.");
      return fn(latest.current);
    });
    queue.current = next.catch(() => undefined);
    return next;
  }, []);

  const commit = useCallback(
    async (current: Pack, slots: DocumentSlot[], content = true): Promise<Pack> => {
      const status = content ? statusFor(computeCompleteness(slots).ready) : current.status;
      const saved = await savePack({ ...current, slots, status, exportedAt: content ? null : current.exportedAt });
      latest.current = saved;
      return saved;
    },
    [savePack],
  );

  const mapSlot = (slots: DocumentSlot[], slotId: string, fn: (s: DocumentSlot) => DocumentSlot) =>
    slots.map((s) => (s.id === slotId ? fn(s) : s));

  const allNames = (slots: DocumentSlot[]) => slots.flatMap((s) => s.files.map((f) => f.originalName));

  /** Validates and stores a file. With `replaceFileId`, the old file is removed only after the new one is saved. */
  const attachFile = useCallback(
    (slotId: string, file: File, replaceFileId?: string): Promise<AttachResult> =>
      run(async (current) => {
        const slot = current.slots.find((s) => s.id === slotId);
        if (!slot) return { attached: null, error: "That document slot no longer exists.", warnings: [] };
        const others = allNames(current.slots).filter((n) => n !== slot.files.find((f) => f.id === replaceFileId)?.originalName);
        const check = await validateFile(file, slot, others);
        if (!check.ok) return { attached: null, error: check.error, warnings: [] };

        const ext = getExtension(file.name);
        const oldFile = replaceFileId ? slot.files.find((f) => f.id === replaceFileId) : undefined;
        const attached: AttachedFile = {
          id: newId("file"),
          originalName: file.name,
          // Replacing a file keeps a label the user chose; an unrenamed file takes the new file name.
          displayName: oldFile && oldFile.displayName !== oldFile.originalName ? oldFile.displayName : file.name,
          mimeType: MIME_BY_EXTENSION[ext] ?? file.type ?? "application/octet-stream",
          sizeBytes: file.size,
          lastModified: file.lastModified,
          blobKey: newId("blob"),
          uploadedAt: new Date().toISOString(),
        };
        const old = replaceFileId ? slot.files.find((f) => f.id === replaceFileId) : undefined;
        await repo.putBlob(attached.blobKey, file);
        try {
          const slots = mapSlot(current.slots, slotId, (s) => ({
            ...s,
            files: old ? s.files.map((f) => (f.id === old.id ? attached : f)) : [...s.files, attached],
            waiting: undefined, // the document has arrived

          }));
          await commit(current, slots);
        } catch (e) {
          await repo.deleteBlobs([attached.blobKey]).catch(() => undefined);
          throw e;
        }
        if (old) await repo.deleteBlobs([old.blobKey]).catch(() => undefined);
        await log(old ? "file_replaced" : "file_attached", `${old ? "Replaced" : "Attached"} "${file.name}" in "${slot.name}"`, current.id);
        return { attached, warnings: check.warnings };
      }),
    [run, repo, commit, log],
  );

  const removeFile = useCallback(
    (slotId: string, fileId: string) =>
      run(async (current) => {
        const slot = current.slots.find((s) => s.id === slotId);
        const file = slot?.files.find((f) => f.id === fileId);
        if (!slot || !file) return;
        await commit(current, mapSlot(current.slots, slotId, (s) => ({ ...s, files: s.files.filter((f) => f.id !== fileId) })));
        await repo.deleteBlobs([file.blobKey]).catch(() => undefined);
        await log("file_removed", `Removed "${file.displayName}" from "${slot.name}"`, current.id);
      }),
    [run, repo, commit, log],
  );

  const renameFile = useCallback(
    (slotId: string, fileId: string, displayName: string) =>
      run(async (current) => {
        const name = displayName.trim();
        if (!name) return;
        await commit(current, mapSlot(current.slots, slotId, (s) => ({ ...s, files: s.files.map((f) => (f.id === fileId ? { ...f, displayName: name } : f)) })));
        await log("file_renamed", `Renamed a document label to "${name}"`, current.id);
      }),
    [run, commit, log],
  );

  /** Marks a missing document as applied for / on its way (or clears the note). It never counts as present. */
  const setWaiting = useCallback(
    (slotId: string, waiting: Omit<WaitingNote, "since"> | null) =>
      run(async (current) => {
        const slot = current.slots.find((s) => s.id === slotId);
        if (!slot) return;
        const note: WaitingNote | undefined = waiting ? { ...waiting, since: new Date().toISOString() } : undefined;
        await commit(current, mapSlot(current.slots, slotId, (s) => ({ ...s, waiting: note })));
        await log("slot_updated", waiting ? `Marked "${slot.name}" as waiting: ${waiting.note}` : `Cleared the waiting note on "${slot.name}"`, current.id);
      }),
    [run, commit, log],
  );

  const moveFile = useCallback(
    (slotId: string, from: number, to: number) =>
      run(async (current) => {
        const slot = current.slots.find((s) => s.id === slotId);
        if (!slot) return;
        await commit(current, mapSlot(current.slots, slotId, (s) => ({ ...s, files: moveItem(s.files, from, to) })));
        await log("slot_reordered", `Reordered files in "${slot.name}"`, current.id);
      }),
    [run, commit, log],
  );

  const moveSlot = useCallback(
    (from: number, to: number) =>
      run(async (current) => {
        const slot = current.slots[from];
        if (!slot) return;
        await commit(current, moveItem(current.slots, from, to));
        await log("slot_reordered", `Moved "${slot.name}" to position ${to + 1}`, current.id);
      }),
    [run, commit, log],
  );

  const addSlot = useCallback(
    (draft: SlotDraft) =>
      run(async (current) => {
        await commit(current, [...current.slots, newCustomSlot(draft)]);
        await log("slot_added", `Added document slot "${draft.name}"`, current.id);
      }),
    [run, commit, log],
  );

  const updateSlot = useCallback(
    (slotId: string, draft: SlotDraft) =>
      run(async (current) => {
        await commit(current, mapSlot(current.slots, slotId, (s) => ({ ...s, ...draft })));
        await log("slot_updated", `Updated document slot "${draft.name}"`, current.id);
      }),
    [run, commit, log],
  );

  const removeSlot = useCallback(
    (slotId: string) =>
      run(async (current) => {
        const slot = current.slots.find((s) => s.id === slotId);
        if (!slot) return;
        await commit(current, current.slots.filter((s) => s.id !== slotId));
        await repo.deleteBlobs(slot.files.map((f) => f.blobKey)).catch(() => undefined);
        await log("slot_removed", `Removed document slot "${slot.name}" (${slot.files.length} file(s))`, current.id);
      }),
    [run, repo, commit, log],
  );

  const updateMeta = useCallback(
    (meta: PackMetaInput) =>
      run(async (current) => {
        const saved = await savePack({ ...current, ...trimMeta(meta) });
        latest.current = saved;
        await log("pack_updated", `Updated details of "${saved.name}"`, current.id);
      }),
    [run, savePack, log],
  );

  const saveDraft = useCallback(
    () =>
      run(async (current) => {
        const saved = await savePack(current);
        latest.current = saved;
        await log("draft_saved", `Saved draft "${current.name}"`, current.id);
      }),
    [run, savePack, log],
  );

  const markExported = useCallback(
    (fileName: string) =>
      run(async (current) => {
        const saved = await savePack({ ...current, status: "exported", exportedAt: new Date().toISOString() });
        latest.current = saved;
        await log("pack_exported", `Exported "${fileName}"`, current.id);
      }),
    [run, savePack, log],
  );

  return { pack, attachFile, setWaiting, removeFile, renameFile, moveFile, moveSlot, addSlot, updateSlot, removeSlot, updateMeta, saveDraft, markExported };
}
