export const MB = 1024 * 1024;
export const DEFAULT_MAX_FILE_SIZE_BYTES = 25 * MB;

/** Default accepted extensions for a new slot. */
export const DEFAULT_ACCEPTED_TYPES = [
  "pdf", "docx", "doc", "xlsx", "xls", "pptx", "ppt", "png", "jpg", "jpeg", "txt",
];

/** Extensions that can be placed into the combined PDF in the browser. */
export const MERGEABLE_PDF_TYPES = ["pdf"];
export const MERGEABLE_IMAGE_TYPES = ["png", "jpg", "jpeg"];
export const MERGEABLE_TYPES = [...MERGEABLE_PDF_TYPES, ...MERGEABLE_IMAGE_TYPES];

export const MIME_BY_EXTENSION: Record<string, string> = {
  pdf: "application/pdf",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  doc: "application/msword",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  xls: "application/vnd.ms-excel",
  pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  ppt: "application/vnd.ms-powerpoint",
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  txt: "text/plain",
};

export const SUBMISSION_TYPES = [
  "Supplier onboarding",
  "Client onboarding",
  "Compliance review",
  "Tender / proposal",
  "General submission",
];
