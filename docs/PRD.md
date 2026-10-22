# Product Requirements — Docutile

## 1. Product vision
Docutile is a corporate document compilation and submission-preparation tool. Users assemble a standardised document pack by uploading or dragging files into clearly labelled document tiles. The system checks completeness, supports ordering and review, and generates a collated PDF when the required documents are present.

## 2. Target users
- Operations and administration teams
- Compliance and onboarding coordinators
- Procurement and supplier onboarding teams
- Professional services teams preparing client packs
- Small and medium businesses that repeatedly submit similar document sets

## 3. Core workflow
1. User opens the dashboard and creates a new pack.
2. User enters pack name, client/organisation, reference number (optional), due date (optional), and submission type.
3. User chooses a template or starts from a custom checklist.
4. The app displays document tiles, each with a name, required/optional status, accepted file types, and upload/drop target.
5. User uploads files using file picker or drag-and-drop.
6. User can replace, remove, preview, rename the display label, and reorder attached documents.
7. The app updates completeness in real time and identifies missing required items.
8. User reviews the pack, fixes missing items, and previews the final document order.
9. If all required documents are present, user generates/downloads a collated PDF where technically supported, or downloads individual files/a manifest when a source file cannot be merged.
10. User can save a draft and return to it in the same browser.

## 4. MVP feature requirements

### Dashboard
- Corporate sidebar navigation: Dashboard, New Pack, Templates, Document Library (MVP-local), Activity, Settings.
- Show recent packs, status, last updated time, and progress.
- Primary CTA: Create new pack.
- Useful empty state for first-time users.

### Create/edit pack
- Required pack name and organisation/client name.
- Optional submission type, reference number, due date, and notes.
- Select a template or create a custom pack.
- Save draft and continue editing.

### Document templates
Provide editable starter templates, such as:
- Supplier onboarding
- Client onboarding
- Compliance review
- General submission

Each template defines ordered document slots. Each slot contains:
- Stable ID
- Display name
- Required/optional flag
- Help text / description
- Accepted types
- Maximum file size
- Optionality and order
- Whether multiple files are allowed (default false)

Template editing should allow adding, renaming, deleting, reordering slots, and changing required status. Do not allow deletion of a template currently in use without warning.

### Document tiles / upload
- Clear states: Empty required, Empty optional, Uploaded, Uploading (if applicable), Error.
- Each tile supports click-to-upload and drag/drop.
- Validate file type and size with a helpful error.
- Show file name, size, and type after attachment.
- Provide replace, remove, preview/download, and reorder controls.
- If multiple files per slot are enabled, show all files and allow ordering within the slot.
- Avoid accidental replacement when a file is dropped on an occupied tile: ask whether to replace or keep both where supported.
- Support keyboard operation; do not make drag-and-drop the only way to reorder.
- Default acceptable files: PDF, DOCX, DOC, XLSX, XLS, PPTX, PPT, PNG, JPG/JPEG, and TXT. State that arbitrary file types may not be mergeable into the final PDF.
- Set a configurable conservative file-size limit (default 25 MB per file) and explain it.

### Pack completeness and validation
- Show count and percentage of required slots completed.
- List missing required documents by name.
- Optional documents do not block readiness.
- Prevent final pack generation while required documents are missing.
- A file counts as present only after validation succeeds.
- Provide a clear ready/not-ready state.

### Ordering and preview
- Users can reorder slots/documents and see the resulting order.
- Preview includes pack metadata and ordered file list.
- PDF files can be merged in browser using `pdf-lib` when valid and supported.
- For non-PDF files, do not pretend they have been converted. Either implement reliable conversion with an explicit, documented service, or provide a clear fallback: download source files individually and produce a pack manifest/cover sheet. The local-first MVP should not require a paid external service.
- Generate a cover sheet with pack name, client/organisation, reference, generation date, and contents list if feasible.
- Offer print using the browser print flow where feasible.
- Make output filenames predictable and safe, e.g. `ClientName_SubmissionPack_YYYY-MM-DD.pdf`.

### Drafts and persistence
- Persist draft metadata and, where feasible, file blobs locally using IndexedDB.
- Explain local-browser storage limitations, including that clearing browser data can remove drafts and local storage is not team/cloud storage.
- If IndexedDB blob persistence proves too large for the initial implementation, implement metadata persistence and clearly warn users that uploaded files may not survive refresh; prefer implementing IndexedDB properly.
- Include delete draft with confirmation.
- No user account system in the local MVP.

### Activity
- Record local events such as pack created, file attached/replaced/removed, slot reordered, draft saved, and pack exported.
- Display timestamps and concise descriptions.
- Label this as local activity history, not a compliance-grade immutable audit trail.

### Settings
- Configure default file size limit if straightforward.
- Explain supported file types and local storage limitations.
- Provide a way to clear local app data with confirmation.

## 5. UX and visual direction
- Enterprise SaaS style: clean white/light-gray surfaces, navy text, restrained blue/teal accent, clear status colors, subtle borders, consistent spacing.
- Use a persistent left navigation on desktop and a compact mobile navigation.
- Use a strong page title and a clear primary action.
- Main pack builder should use a responsive grid of document tiles, with a pack summary/progress area.
- Distinguish required and optional slots without relying on color alone.
- Use concise, professional language.
- Use proper focus states, semantic labels, keyboard access, and adequate contrast.
- Avoid unnecessary animations, oversized rounded cards, gradients, decorative illustrations, and marketing copy.
- Show confirmation dialogs for destructive actions.
- Toasts or inline messages should report actual outcomes.

## 6. Data model (suggested)
- `Pack`: id, name, organisationName, submissionType, referenceNumber, dueDate, notes, templateId, status, createdAt, updatedAt, slots, activityEvents.
- `DocumentSlot`: id, templateSlotId, name, description, required, acceptedTypes, maxFileSizeBytes, allowMultiple, order, files.
- `AttachedFile`: id, originalName, displayName, mimeType, sizeBytes, lastModified, storageKey/blob reference, uploadedAt.
- `Template`: id, name, description, category, slots, createdAt, updatedAt.
- `ActivityEvent`: id, packId, type, message, timestamp.

Keep persistent models serialisable; store Blob data in IndexedDB rather than JSON/localStorage.

## 7. Security, privacy, and reliability
- Treat all files as untrusted input.
- Validate file metadata client-side and do not claim this is a substitute for server-side security in a future hosted version.
- Never execute uploaded files or render active HTML/SVG content as trusted markup.
- Do not log document contents.
- Do not transmit files externally by default.
- Make data-loss limitations visible.
- Do not claim legal compliance, certification, encryption at rest, or secure cloud storage unless actually implemented and verified.
- Avoid putting confidential client names or filenames in remote analytics (no analytics by default).

## 8. Out of scope for local MVP
- Real user authentication and roles
- Shared team workspaces / cloud database
- Automatic email sending
- Direct submission to third-party portals
- Electronic signatures
- OCR, AI extraction, document verification
- Guaranteed conversion of Word/Excel/PowerPoint to PDF
- Immutable compliance audit logging
- Billing and subscriptions

These may be future phases and must be designed as real integrations, not simulated successes.

## 9. MVP acceptance criteria
1. User can create a pack from a template and from a custom checklist.
2. Required and optional slots are clearly distinguished.
3. User can upload files through a picker and drag files onto the intended tile.
4. Invalid file types and oversized files show helpful errors and do not count as attached.
5. User can replace and remove files without silent data loss.
6. User can reorder slots and the order is reflected in preview/export.
7. Required-document completion updates immediately and accurately.
8. Finalization is blocked while required slots are missing.
9. Compatible PDFs can be merged into a downloadable PDF in correct order.
10. Unsupported source formats are handled honestly with a useful fallback.
11. Drafts and uploaded files persist across refresh where IndexedDB is implemented.
12. The app is responsive and usable with keyboard navigation.
13. Key validation and ordering logic has automated tests.
14. README documents setup, limitations, test commands, and future production requirements.
