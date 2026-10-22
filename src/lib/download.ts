/** Triggers a browser download for a Blob and releases the object URL afterwards. */
export function downloadBlob(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  a.rel = "noopener";
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

/** Extensions the browser can display safely from a blob: URL (no active content). */
export const PREVIEWABLE = ["pdf", "png", "jpg", "jpeg"];

/** Opens a PDF or image in a new tab. The URL is revoked after a delay. */
export function previewBlob(blob: Blob): void {
  const url = URL.createObjectURL(blob);
  window.open(url, "_blank", "noopener");
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}
