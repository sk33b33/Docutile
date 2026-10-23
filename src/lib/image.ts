/**
 * Browser-side image tidy-up: rotate, crop and shrink a phone photo or scan before it goes into a pack.
 * Everything runs locally on a canvas; nothing is uploaded.
 */
export type Rotation = 0 | 90 | 180 | 270;

/** Percentages (0-45) trimmed from each edge of the rotated image. */
export interface CropInsets {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

export interface ImageEdit {
  rotation: Rotation;
  crop: CropInsets;
  /** Longest side in pixels after editing, or null to keep the size. Never upscales. */
  maxSide: number | null;
}

export const NO_CROP: CropInsets = { top: 0, right: 0, bottom: 0, left: 0 };
export const MAX_CROP_PERCENT = 45;

export function nextRotation(r: Rotation, dir: "left" | "right"): Rotation {
  return ((r + (dir === "right" ? 90 : 270)) % 360) as Rotation;
}

export interface Size { width: number; height: number }

/** Output size for a rotation, crop and shrink. Pure, so it can be unit tested. */
export function outputSize(source: Size, edit: ImageEdit): Size {
  const rotated: Size = edit.rotation % 180 === 0 ? source : { width: source.height, height: source.width };
  const clamp = (v: number) => Math.min(MAX_CROP_PERCENT, Math.max(0, v));
  const keepW = 1 - (clamp(edit.crop.left) + clamp(edit.crop.right)) / 100;
  const keepH = 1 - (clamp(edit.crop.top) + clamp(edit.crop.bottom)) / 100;
  let w = Math.max(1, Math.round(rotated.width * keepW));
  let h = Math.max(1, Math.round(rotated.height * keepH));
  if (edit.maxSide && Math.max(w, h) > edit.maxSide) {
    const scale = edit.maxSide / Math.max(w, h);
    w = Math.max(1, Math.round(w * scale));
    h = Math.max(1, Math.round(h * scale));
  }
  return { width: w, height: h };
}

function makeCanvas(w: number, h: number): HTMLCanvasElement {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  return c;
}

/** Draws the edited image onto `target` (sized by `outputSize`, optionally limited further for previews). */
export function renderEdit(bitmap: ImageBitmap, edit: ImageEdit, target: HTMLCanvasElement, previewMaxSide?: number) {
  const src: Size = { width: bitmap.width, height: bitmap.height };
  const limit = previewMaxSide ? Math.min(previewMaxSide, edit.maxSide ?? previewMaxSide) : edit.maxSide;
  const out = outputSize(src, { ...edit, maxSide: limit });
  const rotated: Size = edit.rotation % 180 === 0 ? src : { width: src.height, height: src.width };

  // 1) rotate into an intermediate canvas
  const mid = makeCanvas(rotated.width, rotated.height);
  const mctx = mid.getContext("2d")!;
  mctx.translate(rotated.width / 2, rotated.height / 2);
  mctx.rotate((edit.rotation * Math.PI) / 180);
  mctx.drawImage(bitmap, -src.width / 2, -src.height / 2);

  // 2) crop and scale into the target
  const clamp = (v: number) => Math.min(MAX_CROP_PERCENT, Math.max(0, v));
  const sx = (rotated.width * clamp(edit.crop.left)) / 100;
  const sy = (rotated.height * clamp(edit.crop.top)) / 100;
  const sw = rotated.width - sx - (rotated.width * clamp(edit.crop.right)) / 100;
  const sh = rotated.height - sy - (rotated.height * clamp(edit.crop.bottom)) / 100;
  target.width = out.width;
  target.height = out.height;
  const tctx = target.getContext("2d")!;
  tctx.imageSmoothingQuality = "high";
  tctx.drawImage(mid, sx, sy, sw, sh, 0, 0, out.width, out.height);
}

export type OutputFormat = "image/png" | "image/jpeg";

export function canvasToBlob(canvas: HTMLCanvasElement, type: OutputFormat, quality = 0.88): Promise<Blob> {
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("The image could not be encoded."))), type, type === "image/jpeg" ? quality : undefined),
  );
}

/** Opens an image honouring its EXIF orientation. Throws a readable error for corrupt files. */
export async function openImage(blob: Blob): Promise<ImageBitmap> {
  try {
    return await createImageBitmap(blob, { imageOrientation: "from-image" });
  } catch {
    throw new Error("This image could not be opened. It may be damaged.");
  }
}

/** "scan.png" + "image/jpeg" -> "scan.jpg" */
export function renameForFormat(name: string, type: OutputFormat): string {
  const base = name.replace(/\.[^.]+$/, "");
  return `${base}.${type === "image/png" ? "png" : "jpg"}`;
}
