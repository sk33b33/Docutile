/** Makes a string safe for use as part of a filename. */
export function sanitizeFilePart(value: string, fallback = "Pack"): string {
  const cleaned = value
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^A-Za-z0-9]+/g, " ")
    .trim()
    .split(" ")
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join("");
  return cleaned.slice(0, 60) || fallback;
}

export function isoDate(date: Date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** e.g. `AcmeLtd_SubmissionPack_2025-01-31.pdf` */
export function exportFileName(organisation: string, ext = "pdf", date: Date = new Date()): string {
  return `${sanitizeFilePart(organisation, "Organisation")}_SubmissionPack_${isoDate(date)}.${ext}`;
}
