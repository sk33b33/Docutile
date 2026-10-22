"use client";

import { useRef, useState } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, Download, Eye, GripVertical, Pencil, Replace, Trash2, Upload, X } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { formatBytes, formatTypeList, getExtension } from "@/lib/format";
import { PREVIEWABLE } from "@/lib/download";
import type { AttachedFile, DocumentSlot } from "@/types";

export interface SlotTileHandlers {
  onFiles: (slot: DocumentSlot, files: File[], replaceFileId?: string) => void;
  onRemoveFile: (slot: DocumentSlot, file: AttachedFile) => void;
  onRenameFile: (slot: DocumentSlot, file: AttachedFile, name: string) => void;
  onMoveFile: (slot: DocumentSlot, from: number, to: number) => void;
  onPreview: (file: AttachedFile) => void;
  onDownload: (file: AttachedFile) => void;
  onEditSlot: (slot: DocumentSlot) => void;
  onRemoveSlot: (slot: DocumentSlot) => void;
  onMoveSlot: (from: number, to: number) => void;
  onDismissError: (slotId: string) => void;
}

interface Props extends SlotTileHandlers {
  slot: DocumentSlot;
  index: number;
  total: number;
  error?: string;
}

function hasFiles(e: React.DragEvent) {
  return Array.from(e.dataTransfer.types).includes("Files");
}

export function SlotTile(props: Props) {
  const { slot, index, total, error } = props;
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({ id: slot.id });
  const inputRef = useRef<HTMLInputElement>(null);
  const replaceRef = useRef<HTMLInputElement>(null);
  const [replaceId, setReplaceId] = useState<string | null>(null);
  const [over, setOver] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draftName, setDraftName] = useState("");

  const complete = slot.files.length > 0;
  const state = complete ? "Uploaded" : slot.required ? "Missing (required)" : "Empty (optional)";
  const accept = slot.acceptedTypes.map((t) => `.${t}`).join(",");

  const drop = (e: React.DragEvent) => {
    if (!hasFiles(e)) return;
    e.preventDefault();
    e.stopPropagation();
    setOver(false);
    const files = Array.from(e.dataTransfer.files);
    if (files.length) props.onFiles(slot, files);
  };

  function pick(e: React.ChangeEvent<HTMLInputElement>, replace?: string) {
    const files = Array.from(e.target.files ?? []);
    e.target.value = ""; // allow choosing the same file again
    if (files.length) props.onFiles(slot, files, replace);
  }

  function startRename(f: AttachedFile) {
    setEditingId(f.id);
    setDraftName(f.displayName);
  }
  function finishRename(f: AttachedFile) {
    if (draftName.trim() && draftName.trim() !== f.displayName) props.onRenameFile(slot, f, draftName);
    setEditingId(null);
  }

  const border = error
    ? "border-red-400"
    : over
      ? "border-teal-600 bg-teal-50"
      : complete
        ? "border-green-300"
        : slot.required
          ? "border-amber-300"
          : "border-slate-200";

  return (
    <li
      ref={setNodeRef}
      id={`slot-${slot.id}`}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`rounded-lg border-2 bg-white p-4 ${border} ${isDragging ? "z-10 opacity-80 shadow-lg" : ""}`}
      onDragEnter={(e) => { if (hasFiles(e)) { e.preventDefault(); setOver(true); } }}
      onDragOver={(e) => { if (hasFiles(e)) { e.preventDefault(); e.dataTransfer.dropEffect = "copy"; setOver(true); } }}
      onDragLeave={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setOver(false); }}
      onDrop={drop}
      aria-label={`${slot.name}, ${state}`}
    >
      <div className="flex items-start gap-2">
        <button
          ref={setActivatorNodeRef}
          {...attributes}
          {...listeners}
          aria-label={`Reorder ${slot.name}. Press space to pick up, arrow keys to move.`}
          className="-ml-1 mt-0.5 cursor-grab touch-none rounded p-1 text-slate-500 hover:bg-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-teal-600"
        >
          <GripVertical className="h-4 w-4" aria-hidden />
        </button>
        <div className="min-w-0 flex-1">
          <h3 className="break-words text-sm font-semibold text-slate-900"><span className="mr-1 text-slate-500">{index + 1}.</span>{slot.name}</h3>
          <div className="mt-1 flex flex-wrap gap-1">
            <Badge tone={slot.required ? "required" : "neutral"}>{slot.required ? "Required" : "Optional"}</Badge>
            <Badge tone={complete ? "success" : "neutral"}>{complete ? (slot.allowMultiple ? `${slot.files.length} file(s)` : "Uploaded") : "Empty"}</Badge>
          </div>
        </div>
        <div className="flex shrink-0 items-center">
          <Button size="sm" variant="ghost" onClick={() => props.onMoveSlot(index, index - 1)} disabled={index === 0} aria-label={`Move ${slot.name} earlier`}><ArrowLeft className="h-4 w-4" aria-hidden /></Button>
          <Button size="sm" variant="ghost" onClick={() => props.onMoveSlot(index, index + 1)} disabled={index === total - 1} aria-label={`Move ${slot.name} later`}><ArrowRight className="h-4 w-4" aria-hidden /></Button>
        </div>
      </div>

      {slot.description && <p className="mt-2 text-xs text-slate-600">{slot.description}</p>}

      {slot.files.length > 0 && (
        <ul className="mt-3 space-y-2">
          {slot.files.map((f, i) => (
            <li key={f.id} className="rounded-md border border-slate-200 bg-slate-50 p-2 text-sm">
              {editingId === f.id ? (
                <form onSubmit={(e) => { e.preventDefault(); finishRename(f); }} className="flex gap-1">
                  <input autoFocus value={draftName} onChange={(e) => setDraftName(e.target.value)} onKeyDown={(e) => e.key === "Escape" && setEditingId(null)} aria-label="Display label" className="min-w-0 flex-1 rounded border border-slate-300 px-2 py-1 text-sm" />
                  <Button size="sm" type="submit" variant="primary">Save</Button>
                  <Button size="sm" onClick={() => setEditingId(null)} aria-label="Cancel rename"><X className="h-4 w-4" aria-hidden /></Button>
                </form>
              ) : (
                <>
                  <p className="break-all font-medium text-slate-900">{f.displayName}</p>
                  <p className="text-xs text-slate-600">
                    {f.displayName !== f.originalName && <>{f.originalName} · </>}
                    {getExtension(f.originalName).toUpperCase()} · {formatBytes(f.sizeBytes)}
                  </p>
                </>
              )}
              <div className="mt-1 flex flex-wrap gap-1">
                {PREVIEWABLE.includes(getExtension(f.originalName)) && (
                  <Button size="sm" variant="ghost" onClick={() => props.onPreview(f)}><Eye className="h-4 w-4" aria-hidden /> Preview</Button>
                )}
                <Button size="sm" variant="ghost" onClick={() => props.onDownload(f)}><Download className="h-4 w-4" aria-hidden /> Download</Button>
                <Button size="sm" variant="ghost" onClick={() => startRename(f)} aria-label={`Rename label of ${f.displayName}`}><Pencil className="h-4 w-4" aria-hidden /> Label</Button>
                <Button size="sm" variant="ghost" onClick={() => { setReplaceId(f.id); replaceRef.current?.click(); }} aria-label={`Replace ${f.displayName}`}><Replace className="h-4 w-4" aria-hidden /> Replace</Button>
                <Button size="sm" variant="ghost" onClick={() => props.onRemoveFile(slot, f)} aria-label={`Remove ${f.displayName}`}><Trash2 className="h-4 w-4" aria-hidden /> Remove</Button>
                {slot.files.length > 1 && (
                  <>
                    <Button size="sm" variant="ghost" disabled={i === 0} onClick={() => props.onMoveFile(slot, i, i - 1)} aria-label={`Move ${f.displayName} up`}><ArrowUp className="h-4 w-4" aria-hidden /></Button>
                    <Button size="sm" variant="ghost" disabled={i === slot.files.length - 1} onClick={() => props.onMoveFile(slot, i, i + 1)} aria-label={`Move ${f.displayName} down`}><ArrowDown className="h-4 w-4" aria-hidden /></Button>
                  </>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      {(slot.files.length === 0 || slot.allowMultiple) && (
        <div className={`mt-3 rounded-md border border-dashed p-3 text-center text-xs ${over ? "border-teal-600 text-teal-800" : "border-slate-300 text-slate-600"}`}>
          <p>{over ? "Drop to add file" : `Drag a file here or`}</p>
          <Button size="sm" className="mt-1" onClick={() => inputRef.current?.click()}>
            <Upload className="h-4 w-4" aria-hidden /> {slot.files.length ? "Add another file" : "Choose file"}
          </Button>
          <p className="mt-1">{formatTypeList(slot.acceptedTypes)} · max {formatBytes(slot.maxFileSizeBytes)}</p>
        </div>
      )}
      {slot.files.length > 0 && !slot.allowMultiple && over && (
        <p className="mt-2 text-xs text-teal-800">Drop to replace the current file (you will be asked to confirm).</p>
      )}

      <input ref={inputRef} type="file" className="sr-only" tabIndex={-1} aria-hidden accept={accept} multiple={slot.allowMultiple} onChange={(e) => pick(e)} />
      <input ref={replaceRef} type="file" className="sr-only" tabIndex={-1} aria-hidden accept={accept} onChange={(e) => { const id = replaceId ?? undefined; setReplaceId(null); pick(e, id); }} />

      {error && (
        <div role="alert" className="mt-3 flex items-start gap-2 rounded border border-red-300 bg-red-50 p-2 text-xs text-red-900">
          <p className="flex-1">{error}</p>
          <button onClick={() => props.onDismissError(slot.id)} aria-label="Dismiss error"><X className="h-3.5 w-3.5" aria-hidden /></button>
        </div>
      )}

      <div className="mt-3 flex justify-end gap-1 border-t border-slate-100 pt-2">
        <Button size="sm" variant="ghost" onClick={() => props.onEditSlot(slot)}><Pencil className="h-4 w-4" aria-hidden /> Edit slot</Button>
        <Button size="sm" variant="ghost" onClick={() => props.onRemoveSlot(slot)} aria-label={`Delete slot ${slot.name}`}><Trash2 className="h-4 w-4" aria-hidden /> Delete slot</Button>
      </div>
    </li>
  );
}
