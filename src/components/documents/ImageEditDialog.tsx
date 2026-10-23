"use client";

import { useEffect, useRef, useState } from "react";
import { RotateCcw, RotateCw } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { inputClass } from "@/components/ui/Field";
import { formatBytes, getExtension } from "@/lib/format";
import {
  NO_CROP, MAX_CROP_PERCENT, canvasToBlob, nextRotation, openImage, renameForFormat, renderEdit,
  type CropInsets, type ImageEdit, type OutputFormat, type Rotation,
} from "@/lib/image";
import type { AttachedFile, DocumentSlot } from "@/types";

interface Props {
  target: { slot: DocumentSlot; file: AttachedFile } | null;
  loadBlob: (key: string) => Promise<Blob | null>;
  onSave: (file: File) => Promise<void>;
  onClose: () => void;
}

const SIDES: { label: string; value: number | null }[] = [
  { label: "Keep original size", value: null },
  { label: "Large (2400 px)", value: 2400 },
  { label: "Medium (1600 px)", value: 1600 },
  { label: "Small (1000 px)", value: 1000 },
];

function Editor({ slot, file, loadBlob, onSave, onClose }: { slot: DocumentSlot; file: AttachedFile; loadBlob: Props["loadBlob"]; onSave: Props["onSave"]; onClose: () => void }) {
  const [bitmap, setBitmap] = useState<ImageBitmap | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [rotation, setRotation] = useState<Rotation>(0);
  const [crop, setCrop] = useState<CropInsets>(NO_CROP);
  const [maxSide, setMaxSide] = useState<number | null>(null);
  const [toJpeg, setToJpeg] = useState(false);
  const [estimate, setEstimate] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const preview = useRef<HTMLCanvasElement>(null);

  const ext = getExtension(file.originalName);
  const isPng = ext === "png";
  const canConvert = isPng && slot.acceptedTypes.some((t) => t === "jpg" || t === "jpeg");
  const format: OutputFormat = isPng && !(toJpeg && canConvert) ? "image/png" : "image/jpeg";
  const edit: ImageEdit = { rotation, crop, maxSide };

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const blob = await loadBlob(file.blobKey);
        if (!blob) throw new Error("The stored image could not be found in this browser.");
        const bmp = await openImage(blob);
        if (alive) setBitmap(bmp);
      } catch (e) {
        if (alive) setError(e instanceof Error ? e.message : "The image could not be opened.");
      }
    })();
    return () => { alive = false; };
  }, [file.blobKey, loadBlob]);

  // Live preview, plus a debounced estimate of the saved size.
  useEffect(() => {
    if (!bitmap || !preview.current) return;
    renderEdit(bitmap, { rotation, crop, maxSide }, preview.current, 640);
    let alive = true;
    const t = setTimeout(async () => {
      const full = document.createElement("canvas");
      renderEdit(bitmap, { rotation, crop, maxSide }, full);
      const blob = await canvasToBlob(full, format).catch(() => null);
      if (alive && blob) setEstimate(blob.size);
    }, 350);
    return () => { alive = false; clearTimeout(t); };
  }, [bitmap, rotation, crop, maxSide, format]);

  async function save() {
    if (!bitmap) return;
    setSaving(true);
    try {
      const canvas = document.createElement("canvas");
      renderEdit(bitmap, edit, canvas);
      const blob = await canvasToBlob(canvas, format);
      await onSave(new File([blob], renameForFormat(file.originalName, format), { type: format, lastModified: Date.now() }));
    } catch (e) {
      setError(e instanceof Error ? e.message : "The edited image could not be saved.");
      setSaving(false);
    }
  }

  const slider = (key: keyof CropInsets, label: string) => (
    <div key={key}>
      <label htmlFor={`crop-${key}`} className="flex justify-between text-xs text-slate-200"><span>{label}</span><span>{crop[key]}%</span></label>
      <input id={`crop-${key}`} type="range" min={0} max={MAX_CROP_PERCENT} value={crop[key]} onChange={(e) => setCrop({ ...crop, [key]: Number(e.target.value) })} className="w-full" />
    </div>
  );

  if (error) {
    return (
      <div className="space-y-4">
        <p role="alert" className="text-red-200">{error}</p>
        <div className="flex justify-end"><Button onClick={onClose}>Close</Button></div>
      </div>
    );
  }
  if (!bitmap) return <p role="status" className="text-slate-300">Opening image…</p>;

  const changed = rotation !== 0 || maxSide !== null || Object.values(crop).some(Boolean) || format !== (isPng ? "image/png" : "image/jpeg");

  return (
    <div className="space-y-4">
      <div className="flex justify-center rounded-lg border border-white/15 bg-black/30 p-2">
        <canvas ref={preview} aria-label={`Preview of ${file.displayName} with your changes`} role="img" className="max-h-72 max-w-full object-contain" />
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Button size="sm" onClick={() => setRotation(nextRotation(rotation, "left"))}><RotateCcw className="h-4 w-4" aria-hidden /> Rotate left</Button>
        <Button size="sm" onClick={() => setRotation(nextRotation(rotation, "right"))}><RotateCw className="h-4 w-4" aria-hidden /> Rotate right</Button>
        <Button size="sm" variant="ghost" onClick={() => { setRotation(0); setCrop(NO_CROP); setMaxSide(null); setToJpeg(false); }} disabled={!changed}>Reset</Button>
      </div>
      <fieldset className="grid grid-cols-2 gap-x-4 gap-y-2">
        <legend className="mb-1 text-sm font-medium text-slate-100">Crop (trim from each edge)</legend>
        {slider("top", "Top")}{slider("bottom", "Bottom")}{slider("left", "Left")}{slider("right", "Right")}
      </fieldset>
      <div>
        <label htmlFor="img-size" className="mb-1 block text-sm font-medium text-slate-100">Shrink to save space</label>
        <select id="img-size" className={inputClass} value={maxSide ?? ""} onChange={(e) => setMaxSide(e.target.value ? Number(e.target.value) : null)}>
          {SIDES.map((s) => <option key={s.label} value={s.value ?? ""}>{s.label}</option>)}
        </select>
      </div>
      {canConvert && (
        <label className="flex items-center gap-2 text-sm text-slate-200">
          <input type="checkbox" checked={toJpeg} onChange={(e) => setToJpeg(e.target.checked)} /> Save as JPEG (much smaller for photos)
        </label>
      )}
      <p role="status" className="text-xs text-slate-300">
        Original {formatBytes(file.sizeBytes)}{estimate !== null && <> · after your changes about {formatBytes(estimate)}</>}. The edited image replaces the current file in this pack; the original on your computer is not touched.
      </p>
      <div className="flex justify-end gap-2">
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="primary" onClick={save} disabled={saving || !changed}>{saving ? "Saving…" : "Save image"}</Button>
      </div>
    </div>
  );
}

export function ImageEditDialog({ target, loadBlob, onSave, onClose }: Props) {
  return (
    <Dialog open={!!target} title="Edit image" onClose={onClose}>
      {target && <Editor key={target.file.id} slot={target.slot} file={target.file} loadBlob={loadBlob} onSave={onSave} onClose={onClose} />}
    </Dialog>
  );
}
