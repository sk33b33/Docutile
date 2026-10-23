import { orderedEntries } from "../packs";
import { canMerge, mergePack, type ExportOptions, type MergeProgress, type MergeResult } from "./merge";
import type { WorkerMessage, WorkerRequest } from "./merge.worker";
import type { Pack } from "@/types";

export interface MergeOptions {
  exportOptions?: ExportOptions;
  onProgress?: (p: MergeProgress) => void;
  signal?: AbortSignal;
}

export class MergeCancelledError extends Error {
  constructor() {
    super("Export cancelled.");
    this.name = "MergeCancelledError";
  }
}

/**
 * Merges a pack off the main thread so the UI stays responsive for large files.
 * Falls back to the main thread only if Web Workers are unavailable.
 */
export async function mergePackOffThread(
  pack: Pack,
  loadBlob: (key: string) => Promise<Blob | null>,
  { onProgress, signal, exportOptions }: MergeOptions = {},
): Promise<MergeResult> {
  if (signal?.aborted) throw new MergeCancelledError();

  if (typeof Worker === "undefined") {
    return mergePack(pack, loadBlob, new Date(), onProgress, exportOptions);
  }

  // Read stored blobs here (async IndexedDB reads do not block the UI). Missing blobs are simply absent,
  // and mergePack reports them as failures.
  const blobs: Record<string, Blob> = {};
  for (const e of orderedEntries(pack.slots)) {
    if (!canMerge(e.file.originalName)) continue;
    if (signal?.aborted) throw new MergeCancelledError();
    const blob = await loadBlob(e.file.blobKey);
    if (blob) blobs[e.file.blobKey] = blob;
  }

  return new Promise<MergeResult>((resolve, reject) => {
    const worker = new Worker(new URL("./merge.worker.ts", import.meta.url), { type: "module" });
    const cleanup = () => {
      signal?.removeEventListener("abort", onAbort);
      worker.terminate();
    };
    const onAbort = () => { cleanup(); reject(new MergeCancelledError()); };
    signal?.addEventListener("abort", onAbort);

    worker.onmessage = (ev: MessageEvent<WorkerMessage>) => {
      const msg = ev.data;
      if (msg.type === "progress") onProgress?.(msg.progress);
      else if (msg.type === "done") { cleanup(); resolve(msg.result); }
      else { cleanup(); reject(new Error(msg.message)); }
    };
    worker.onerror = (ev) => { cleanup(); reject(new Error(ev.message || "The export worker failed to start.")); };
    worker.postMessage({ pack, blobs, options: exportOptions } satisfies WorkerRequest);
  });
}
