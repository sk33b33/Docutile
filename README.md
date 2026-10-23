# Docutile

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
- **Templates**: four built-in templates (Supplier onboarding, Client onboarding, Compliance review, General submission). Built-ins are editable too: saving changes stores a customised copy, and "Reset to default" restores the original. Templates support add/rename/edit/delete/reorder slots and required status. Deleting a template warns how many packs used it. Packs hold their own copy of slots, so template edits never change existing packs.
- **Services catalogue**: the Templates page ("Services & templates") lists every service by category and subcategory, with its document tiles, official form numbers, and how complete the source's checklist is (Official list / Partly published / Form only). "Create pack" on any service preselects it. Categories: General business (Procurement, Operations, Compliance, General), South African DOJ (**Estates**: 9 services; **Trusts**: 13 services), Master of the High Court: other services (**Guardian's Fund**: 12; **Curators and tutors**: 3; **Insolvent estates**: 16) and South African Courts (**Maintenance**: 9 services; **Domestic violence**: 7 services).
- **South African DOJ checklists** (transcribed from justice.gov.za, read 2026-10-22; each links to its source page and says how much of its list the source publishes). Tiles show official form numbers (for example Form J294). Items the source lists without a condition are required; conditional ones ("if there is a will", "if married") are optional with the condition in the help text, and can be switched to required in the pack builder. Documents are limited to PDF and scans (PNG/JPG) so the whole pack can be merged, except the trust beneficial ownership spreadsheet. Original wills and bonds must still be handed in on paper where the Master requires it. This is a preparation aid, not legal advice.
  - **Estates (9):** report an estate over R250 000; report an estate under R250 000; report the estate of a person not living in South Africa; liquidation and distribution account; object to an account; certified copies; section 42(2) endorsement; section 80 endorsement; funds from a bank for funeral purposes.
  - **Trusts (13):** register an inter vivos trust; register a testamentary trust (including the JM21 stated case); change trustees, change auditor, amend bond of security, and general amendments (the four J401 amendment types); update trustee contact details; beneficial ownership register; report a terminated trust; report a dormant trust; deregister a terminated trust; request information on a trust; certified copies.
  - **Courts, Maintenance (9):** apply for a maintenance order (official document list), plus the eight other maintenance forms (B, G, I, K, M, N, P, Q) as form-only services.
  - **Courts, Domestic violence (7):** apply for a protection order (Form 06, J480, under the 2022 Regulations); report suspected domestic violence (Form 03); vary or set aside an order (Form 38); report a contravention (Form 35); second warrant of arrest (Form 34); safety monitoring notice (Form 09); alternative manner of service (Form 41).
  - Verified against primary documents on 2026-10-23: the JM21 memorandum, the J401 form, the Durban Master's Office estate checklist, and the DOJ domestic violence and maintenance forms pages. This replaced an outdated 2011 protection-order page that used superseded form numbers.
  - Each source note warns when a checklist was read more than 90 days ago.
  - **Master's other divisions (31, a separate category):** the Guardian's Fund (claims by account holders, owners of capital, untraced beneficiaries, executors, liquidators and creditors; allowances and school fees, with the DOJ's own requirement lists), curators and tutors (J197 and the notice forms), and insolvent estates (the liquidation notice, bond and national-list forms, mostly form-only because the DOJ publishes no supporting-document list).
  - Services where the DOJ publishes nothing but a form are labelled "Form only" and offer a single optional supporting-documents tile.
- **Installable and offline (PWA):** a web app manifest with icons and a service worker let you install Docutile on a phone or desktop. The worker caches only the app itself (never your documents, which stay in IndexedDB), saves each page you open so it reloads offline, and shows a friendly offline page for pages it has not seen. Production builds only. After an update, a message asks you to reload. Limit: a page you have never opened cannot load offline.
- **Splash screen:** a full-screen "Tap to enter" splash with the centred Docutile logo, shown once per browser session. The whole screen is one button (tap, click, Enter or Space), it takes focus on load, the app behind it is inert until you enter, and reduced motion skips the animation.
- **Visual design:** dark futuristic theme with translucent glass panels, glow and ambient motion, with reduced-motion and reduced-transparency fallbacks and a plain print stylesheet.
- **Document library**: read-only index of every file stored in this browser, with download.
- **Activity**: local event log (pack created, files attached/replaced/removed, reorders, exports, ...), with a "Clear activity" button (confirmation required; packs and files are not affected).
- **Settings**: default maximum file size (25 MB by default), explanation of limits, and "Clear all local data" with confirmation.
- **Backup and import**: "Export backup" on a pack downloads one `.docutile` file (pack details plus every file); "Import backup" on the dashboard validates it strictly (header, sizes, and each file's content against its extension) and adds it as a new draft under fresh ids, so nothing is overwritten. Backups are not encrypted.
- **Persistence**: IndexedDB (versioned) for pack metadata, templates, activity, settings, and file Blobs (stored as Blobs, never JSON). Changes save automatically. Quota and unavailable-storage errors are surfaced to the user. Data saved under the pre-rename `packflow` database is migrated once to `docutile`.

## Limitations (please read)

- **PDF merging supports PDF, PNG and JPG only.** Images are placed on A4 pages. Word, Excel, PowerPoint and text files **cannot be converted in the browser**. They can be attached and validated, appear on the cover sheet under "Supplied separately (not included in this PDF)", and can be downloaded individually. Real conversion needs a server-side service (for example LibreOffice) that is not included.
- Password-protected or corrupt PDFs cannot be merged. The export stops and names the files at fault rather than producing a partial PDF.
- Backups are plain files, not encrypted. Data otherwise lives only in this browser profile: not encrypted by Docutile, not backed up, not shared, and removed if browser data is cleared (or private browsing is closed).
- File validation is client-side and signature-based. It is not a malware scan and not a security boundary.
- Activity history is informational, not an immutable or compliance-grade audit trail.
- No authentication, roles, cloud collaboration, e-signature, email delivery, or portal submission. These are out of scope and are not simulated.
- PDF merging runs in a Web Worker so the page stays responsive on large packs, and an export can be cancelled. Very large packs are still limited by browser memory, since every file is held in memory while merging.

## Maintenance and monitoring

- **DOJ source check** (`npm run check:sources`): re-reads every official page the checklists came from and fails if a page is unreachable, a form number named in a checklist disappears, a page's "Updated" stamp moves past the one recorded, or the set of form numbers on a page changes from `tests/live/source-snapshot.json`. After reviewing a change and updating the checklists, run `npm run check:sources:update`. It runs weekly in GitHub Actions (`sources.yml`). It needs `curl`, and `pdftotext` (poppler-utils) for PDF sources.
- **Security**: `npm run audit` fails on high or critical advisories in production dependencies (currently none). `security.yml` runs it weekly and on dependency changes, and lists development-tool advisories without failing: the one open item is `braces`, reached only through ESLint's Next config, which does not ship. Dependabot proposes weekly npm and GitHub Actions updates.
- CI uses least-privilege permissions, cancels superseded runs, and runs actions on Node 24.

## Tests

`npm test` runs Vitest unit tests covering file validation (type, size, empty, signature, duplicates), required-document completeness and readiness, slot/file ordering, template-to-pack copying, file-name sanitising, in-memory repository behaviour (blob cleanup, quota errors), and PDF merging against real PDFs/PNGs (order, page ranges, cover sheet spill-over, corrupt/missing files, non-mergeable files, non-Latin text).

`npm run test:e2e` runs Playwright end-to-end tests (in `e2e/`) against a production build: validation messages, picker upload, OS-style drag-and-drop onto a tile, replace confirmation, reorder, refresh persistence, review order, PDF download (page count and file name), export blocked when a required file is removed, custom slots, and no horizontal overflow at 390px. First run `npx playwright install chromium`, or point `PW_CHROMIUM_PATH` at an existing Chromium binary.

Accessibility is checked in `e2e/a11y.spec.ts`: axe-core (WCAG 2.0/2.1/2.2 A and AA plus best-practice rules) runs on every page and on the key states (form errors, populated builder, dialogs, mobile menu), plus keyboard tests for tile reordering and dialog focus/Escape, reflow at 320 CSS px on every main page (WCAG 1.4.10), and checks that reduced-motion and forced-colours preferences are honoured. Automated checks cannot catch everything; a manual screen-reader pass (NVDA/VoiceOver) has not been done.

`npm run test:e2e:large` runs the slow large-file tests (opt-in, ~2 minutes): a 24.5 MB PDF is accepted and a 25.5 MB one rejected at the 25 MB limit, and a pack of five ~24 MB PDFs (~120 MB) is stored, survives a refresh, and exports. Measured in headless Chromium: 4.1 s to export, output the same size as the input, longest page stall 226 ms. Larger packs than that are untested and limited by browser memory.

GitHub Actions (`.github/workflows/ci.yml`) runs lint, typecheck, unit tests and build, then the e2e tests, on every push to `main` and on pull requests.

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
