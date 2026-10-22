# PackFlow

Document pack assembly for client and supplier submissions. Create a pack from a template (or a custom checklist), fill required/optional document tiles by picking or dragging files, resolve what is missing, reorder, review, and export a combined PDF.

**This is a local-first MVP.** Everything runs in your browser. No files are uploaded anywhere, there are no accounts, and nothing is emailed or submitted to third parties.

## Setup

Requires Node 20+ (developed on Node 22).

```bash
npm install
npm run dev        # http://localhost:3000
```

Quality gate (lint, typecheck, unit tests, production build):

```bash
npm run check
# or individually:
npm run lint
npm run typecheck
npm test
npm run build && npm start
```

## What is implemented

- **Dashboard**: recent packs, status (Draft / Ready / Exported), required-document progress, delete with confirmation, first-run empty state.
- **Create / edit pack**: name and organisation (required), submission type, reference, due date, notes; start from a built-in template, a saved template, or an empty custom checklist.
- **Pack builder**: responsive tile grid. Each tile shows Required/Optional and Empty/Uploaded as text badges (not colour alone), help text, accepted types and size limit.
  - Upload by file picker or by dragging a file from the OS onto a specific tile.
  - Validation: extension allow-list, size limit, empty-file check, and a content-signature check (a text file renamed `.pdf` is rejected). Invalid files are never counted as attached.
  - Duplicate file names produce a warning, not a silent overwrite.
  - Dropping onto an occupied single-file tile asks before replacing; the old file is deleted only after the new one is saved. Multi-file slots append.
  - Preview (PDF/PNG/JPG), download, replace, remove (with confirmation), rename display label, reorder files within multi-file slots.
  - Reorder tiles by dragging the grip handle (pointer or keyboard: Space, arrow keys, Space) **or** with the "Move earlier/later" buttons.
  - Add, edit and delete slots on a pack (required status, accepted types, size, multiple files).
- **Completeness**: live percentage and list of missing required documents (linked to their tiles). A pack is Ready only when every required slot has a file and the pack is not empty.
- **Review & export**: ordered contents; PDF with a generated cover sheet (pack name, organisation, reference, date, contents with page numbers); text manifest; browser print of the review page; predictable names (`AcmeLtd_SubmissionPack_2025-01-31.pdf`). Export buttons are disabled, and the export function itself refuses, while required documents are missing.
- **Templates**: four built-in templates (Supplier onboarding, Client onboarding, Compliance review, General submission). Built-ins are read-only; duplicate one to edit. Custom templates support add/rename/edit/delete/reorder slots and required status. Deleting a template warns how many packs used it. Packs hold their own copy of slots, so template edits never change existing packs.
- **Document library**: read-only index of every file stored in this browser, with download.
- **Activity**: local event log (pack created, files attached/replaced/removed, reorders, exports, ...).
- **Settings**: default maximum file size (25 MB by default), explanation of limits, and "Clear all local data" with confirmation.
- **Persistence**: IndexedDB (versioned) for pack metadata, templates, activity, settings, and file Blobs (stored as Blobs, never JSON). Changes save automatically. Quota and unavailable-storage errors are surfaced to the user.

## Limitations (please read)

- **PDF merging supports PDF, PNG and JPG only.** Images are placed on A4 pages. Word, Excel, PowerPoint and text files **cannot be converted in the browser**. They can be attached and validated, appear on the cover sheet under "Supplied separately (not included in this PDF)", and can be downloaded individually. Real conversion needs a server-side service (for example LibreOffice) that is not included.
- Password-protected or corrupt PDFs cannot be merged. The export stops and names the files at fault rather than producing a partial PDF.
- Data lives only in this browser profile: not encrypted by PackFlow, not backed up, not shared, and removed if browser data is cleared (or private browsing is closed).
- File validation is client-side and signature-based. It is not a malware scan and not a security boundary.
- Activity history is informational, not an immutable or compliance-grade audit trail.
- No authentication, roles, cloud collaboration, e-signature, email delivery, or portal submission. These are out of scope and are not simulated.
- Very large PDFs are merged on the main thread and may briefly freeze the tab.

## Tests

`npm test` runs Vitest unit tests covering file validation (type, size, empty, signature, duplicates), required-document completeness and readiness, slot/file ordering, template-to-pack copying, file-name sanitising, in-memory repository behaviour (blob cleanup, quota errors), and PDF merging against real PDFs/PNGs (order, page ranges, cover sheet spill-over, corrupt/missing files, non-mergeable files, non-Latin text).

The UI flow was also smoke-tested in headless Chromium against a production build: validation messages, picker upload, OS-style drag-and-drop onto a tile, replace confirmation, reorder, refresh persistence, review order, PDF download (page count and file name), export blocked when a required file is removed, and no horizontal overflow at 390px. That script is not committed (Playwright is not a project dependency).

## Layout

```
src/app/                 routes (dashboard, packs/new, packs/[id], packs/[id]/review, templates, library, activity, settings)
src/components/          layout, packs, documents (tile), templates (slot editor), ui primitives, providers
src/lib/validation/      file + pack validation
src/lib/pdf/             merge, cover sheet, manifest
src/lib/storage/         Repository interface, IndexedDB and in-memory implementations
src/types/               domain models
tests/                   unit tests
```

Persistence is behind the `Repository` interface (`src/lib/storage/repository.ts`) so a server API can replace IndexedDB later.

## Next steps for a hosted, production version

This needs its own design review before building. At minimum: authentication and organisation tenancy with role-based access; private object storage with encryption at rest and signed URLs; server-side file validation and malware scanning; a server-side conversion service for Office formats; immutable audit logging; retention and deletion policies; backups; and any email/portal submission built as a real, authorised integration that reports genuine success or failure.
