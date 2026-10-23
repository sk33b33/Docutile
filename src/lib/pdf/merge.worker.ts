/// <reference lib="webworker" />
import { mergePack, type ExportOptions, type MergeProgress, type MergeResult } from "./merge";
import type { Pack } from "@/types";

export interface WorkerRequest {
  pack: Pack;
  /** Blobs by key, read from storage on the main thread (Blobs are cloned by reference, not copied). */
  blobs: Record<string, Blob>;
  options?: ExportOptions;
}

export type WorkerMessage =
  | { type: "progress"; progress: MergeProgress }
  | { type: "done"; result: MergeResult }
  | { type: "error"; message: string };

const ctx = self as unknown as DedicatedWorkerGlobalScope;

ctx.onmessage = async (e: MessageEvent<WorkerRequest>) => {
  const { pack, blobs, options } = e.data;
  try {
    const result = await mergePack(pack, async (k) => blobs[k] ?? null, new Date(), (progress) =>
      ctx.postMessage({ type: "progress", progress } satisfies WorkerMessage),
    options);
    // Transfer the output buffer instead of copying it.
    const transfer = result.bytes ? [result.bytes.buffer as ArrayBuffer] : [];
    ctx.postMessage({ type: "done", result } satisfies WorkerMessage, transfer);
  } catch (err) {
    ctx.postMessage({ type: "error", message: err instanceof Error ? err.message : String(err) } satisfies WorkerMessage);
  }
};
