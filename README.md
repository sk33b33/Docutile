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
- **CIPC checklists (58 services)**: transcribed from CIPC's own pages and forms, read 2026-10-27. Tiles carry the official form numbers (CoR14.1, CoR39, CK2, TM6, P1, D7, RF1 ...). As with the DOJ, items listed without a condition are required and conditional ones are optional with the condition in the help text. Each service shows "After you lodge the pack" steps, with the CIPC address to e-mail where CIPC gives one. Fees are not shown on tiles because they change: see CIPC's Forms and Fees pages.
  - **Companies and close corporations (37):** from CIPC's "forms and supporting documents required" list (the 2021 edition, still hosted on cipc.co.za), its current Forms and Fees pages and its 2026 e-mail address list. Some e-mail addresses on the 2021 list have since changed, so steps quote the 2026 list where it has one; director changes are not on it, and that tile says so.
  - **Intellectual property (21: trade marks 11, patents 4, designs 5, copyright 1):** CIPC's registration pages publish no document lists. Maintenance processes (assignments, licensees, restoration, address and name changes, renewals) come from CIPC's own "maintain" pages. For the four application forms (TM1, P1, D1, RF1) and the PCT entry form (P25), the list is the one printed on the form itself of what the application is accompanied by. Those are tick-lists and CIPC does not say which items every application needs, so only the core items are required and the service is marked "Partly published". Copyright is only registrable for cinematograph films; other works are protected automatically.
  - **Not included:** annual returns, beneficial ownership filing, B-BBEE certificates, co-operative registration, the other copyright forms (assignee, licensee, opposition), the Inventor Assistance Programme and IP litigation. Review these checklists with someone who files with CIPC before relying on them.
- **Services catalogue**: the Templates page ("Services & templates") lists every service by category and subcategory, with its document tiles, official form numbers, and how complete the source's checklist is (Official list / Partly published / Form only). "Create pack" on any service preselects it. Categories: General business (Procurement, Operations, Compliance, General), South African DOJ (**Estates**: 9 services; **Trusts**: 13 services), Master of the High Court: other services (**Guardian's Fund**: 12; **Curators and tutors**: 3; **Insolvent estates**: 16) South African Courts (**Maintenance**: 9 services; **Domestic violence**: 7 services) and **CIPC** (58 services in eleven groups: Register a company, Company names, Company changes, Close corporations, Conversions, Winding up and deregistration, Business rescue, Trade marks, Patents, Designs, Copyright).
- **South African DOJ checklists** (transcribed from justice.gov.za, read 2026-10-22; each links to its source page and says how much of its list the source publishes). Tiles show official form numbers (for example Form J294). Items the source lists without a condition are required; conditional ones ("if there is a will", "if married") are optional with the condition in the help text, and can be switched to required in the pack builder. Documents are limited to PDF and scans (PNG/JPG) so the whole pack can be merged, except the trust beneficial ownership spreadsheet. Original wills and bonds must still be handed in on paper where the Master requires it. This is a preparation aid, not legal advice.
  - **Estates (9):** report an estate over R250 000; report an estate under R250 000; report the estate of a person not living in South Africa; liquidation and distribution account; object to an account; certified copies; section 42(2) endorsement; section 80 endorsement; funds from a bank for funeral purposes.
  - **Trusts (13):** register an inter vivos trust; register a testamentary trust (including the JM21 stated case); change trustees, change auditor, amend bond of security, and general amendments (the four J401 amendment types); update trustee contact details; beneficial ownership register; report a terminated trust; report a dormant trust; deregister a terminated trust; request information on a trust; certified copies.
  - **Courts, Maintenance (9):** apply for a maintenance order (official document list), plus the eight other maintenance forms (B, G, I, K, M, N, P, Q) as form-only services.
  - **Courts, Domestic violence (7):** apply for a protection order (Form 06, J480, under the 2022 Regulations); report suspected domestic violence (Form 03); vary or set aside an order (Form 38); report a contravention (Form 35); second warrant of arrest (Form 34); safety monitoring notice (Form 09); alternative manner of service (Form 41).
  - Verified against primary documents on 2026-10-23: the JM21 memorandum, the J401 form, the Durban Master's Office estate checklist, and the DOJ domestic violence and maintenance forms pages. This replaced an outdated 2011 protection-order page that used superseded form numbers.
  - Each source note warns when a checklist was read more than 90 days ago.
  - **Master's other divisions (31, a separate category):** the Guardian's Fund (claims by account holders, owners of capital, untraced beneficiaries, executors, liquidators and creditors; allowances and school fees, with the DOJ's own requirement lists), curators and tutors (J197 and the notice forms), and insolvent estates (the liquidation notice, bond and national-list forms, mostly form-only because the DOJ publishes no supporting-document list).
  - Services where the DOJ publishes nothing but a form are labelled "Form only" and offer a single optional supporting-documents tile.
- **Installable and offline (PWA):** a web app manifest with icons and a service worker let you install Docutile on a phone or desktop. The worker caches only the app itself (never your documents, which stay in IndexedDB), saves each page you open so it reloads offline, and shows a friendly offline page for pages it has not seen. Production builds only. After an update, a message asks you to reload. The worker script is left to the browser's own cache (a service worker would strip its configuration), and if a web worker cannot start for any reason, export falls back to merging on the main thread. Limit: a page you have never opened cannot load offline.
- **Sign-in with Google (optional, off until you configure it):** a sign-in screen with a "Continue with Google" button (real Google OAuth with PKCE, via Auth.js). When switched on, signed-out visitors are redirected to it, a signed-in account sees its name and a Sign out button, and **each Google account gets its own separate packs and files in the browser**. The first account to sign in takes over anything saved before sign-in existed. The email box on the screen is deliberately disabled and says why: email and password sign-in needs an account database and an email service, which this version does not have. See "Sign-in with Google" below.
- **Splash screen:** a full-screen "Tap to enter" splash with the centred Docutile logo, shown once per browser session. The whole screen is one button (tap, click, Enter or Space), it takes focus on load, the app behind it is inert until you enter, and reduced motion skips the animation.
- **Visual design:** dark futuristic theme with translucent glass panels, glow and ambient motion, with reduced-motion and reduced-transparency fallbacks and a plain print stylesheet.
- **Document library**: read-only index of every file stored in this browser, with download.
- **Activity**: local event log (pack created, files attached/replaced/removed, reorders, exports, ...), with a "Clear activity" button (confirmation required; packs and files are not affected).
- **Settings**: default maximum file size (25 MB by default), explanation of limits, and "Clear all local data" with confirmation.
- **Backup and import**: "Export backup" on a pack downloads one `.docutile` file (pack details plus every file); "Import backup" on the dashboard validates it strictly (header, sizes, and each file's content against its extension) and adds it as a new draft under fresh ids, so nothing is overwritten. Backups are not encrypted.
- **Persistence**: IndexedDB (versioned) for pack metadata, templates, activity, settings, and file Blobs (stored as Blobs, never JSON). Changes save automatically. Quota and unavailable-storage errors are surfaced to the user. Data saved under the pre-rename `packflow` database is migrated once to `docutile`.
- **Service explorer (dashboard)**: "Start a pack" steps through category, then subcategory, then service, then the service's document tiles. Each step is a ring of translucent neon tiles (a different glow per category) or, with the List button, a grid. Drag or flick the ring with a finger or mouse: it coasts, slows, and the nearest tile locks into the centre, grows, and hovers. Arrow keys and Previous/Next/Open buttons do the same without a pointer. Text that is longer than a tile scrolls inside it instead of being cut off: with the mouse wheel while hovering, with a finger on a touchscreen, or with the arrow keys once the tile has focus. A "Scroll for more" cue shows while text is hidden, and a tile whose text fits does not capture the wheel, so the page scrolls as normal. A sideways drag still spins the ring. A document tile opens to a fixed detail card with a Back button. Nothing is saved until "Start a pack" is used. With reduced motion, the list is the default and the ring does not coast or hover. The choice of view is remembered in this browser.
- **Dashboard pack tiles**: each tile says what the pack is applying for (the service or checklist it was started from, for example "Applying for: Report a deceased estate: over R250 000"). A draft has a "Continue editing" button that reopens the builder where you left off; a pack that is ready or exported has "Open".
- **Light and dark theme**: a Dark / Light / Device switch on the dashboard. **Device** follows the operating system's light or dark setting and changes live when that setting changes (for example at sunset); Dark and Light stay as chosen. Dark is the default until you pick something. The choice is remembered in this browser and applied before the page paints, so there is no flash. The light theme flips Tailwind's colour scales and the glass surfaces, keeps the neon glow, and is checked against the same accessibility audit as the dark one (contrast included).
- **Document library sorting**: a "Sort by" menu: date added (newest or oldest first), file name (A to Z or Z to A, with numbers in natural order), pack name (A to Z or Z to A), size (largest or smallest first) and file type. It works together with the search box.
- **Official portals (dashboard side panel)**: links to the official online portals of each main category, each opening the official site in a new tab: DOJ Online (deceased estates, protection and maintenance orders, the Guardian's Fund online deposit), the Master's Trust Beneficial Ownership Register and ICMS web portal, and CIPC's BizPortal, e-Services, IPOnline and enquiries site. They are plain links: Docutile never signs you in to them, never sees a password and sends nothing to them. General business has no official portal, so it has none. The panel is a carousel by default, one tile per official site (DOJ Online is one tile that says it serves the DOJ, the Master and the Courts), each tile a real link that opens the official site in a new tab with no link back to Docutile; dragging or flicking the ring never opens anything. A Carousel / List switch (remembered in this browser; reduced motion starts on the list) shows the same portals grouped by category. The pop-out menu keeps the grouped list. On a wide screen the panel sits beside the explorer; on a narrower one it sits between the explorer and your packs. The weekly source check confirms each portal still answers and is still named on the official page that lists it. (BizPortal and CIPC's enquiries site could not be verified from the build machine, so they are reported, not failed.)
- **Pop-out menu**: a slide-out panel with every option in one place: the pages, the official portals, the theme switch and the account (sign-out). It opens from the button beside the logo on a desktop (the permanent sidebar stays) and from the menu button on a phone. It closes with Escape, the X, a click outside, a link or the browser Back button, and focus returns to the button that opened it.
- **Docubuddy (built-in assistant)**: a chat button on every page. It answers from Docutile's own checklists and your own packs, with **no outside AI service**: it runs in the browser, never reads your files and sends nothing anywhere (a browser test watches the network while it answers). It can: list what a service needs (required and optional documents, form numbers, the official source, the steps after lodging), explain a form number and where it is used, understand everyday wording ("my father died", "my husband is abusing me", "I want to start a business"), say what is missing from the pack on screen or from a pack you name, list what is due soonest, and say where to send a pack with the official portals for it. When several services fit it asks which; when it does not know it says so and offers the closest services instead of guessing; it declines legal advice; and when someone describes being harmed it puts a safety note first. Answers are drawn as plain text (typed HTML is never run) and follow the same rules as the checklists they come from: requirements change, and it is a preparation aid, not legal advice. It is not a free-form chatbot: it understands the kinds of questions above. An optional AI-model version (questions sent to an AI service, switched on only with an API key, never with file contents) has been considered and is **on hold**: it is not built, and nothing in Docutile contacts an AI service.
- **Backup reminder**: the dashboard shows a banner when a pack that holds files has changed since its last backup (or was never backed up) and that backup, or the pack's creation, is 7 or more days old. It can be postponed for 7 days. Backup times are kept in this browser's settings; nothing is sent anywhere.
- **Printable cover sheet**: "Cover sheet" on a pack opens a plain black-on-white checklist of every tile in order (required or optional, attached, waiting or missing, with form numbers and file names) for paper submissions or a hand-over. The exported PDF has its own cover sheet and contents page as well.
- **After you lodge the pack**: services whose DOJ source describes the process (the two deceased-estate reports, maintenance orders and protection orders) show a short list of what happens next. It is summarised from that source and copied into the pack when it is created, so packs made before this feature do not show it.

## Limitations (please read)

- **PDF merging supports PDF, PNG and JPG only.** Images are placed on A4 pages. Word, Excel, PowerPoint and text files **cannot be converted in the browser**. They can be attached and validated, appear on the cover sheet under "Supplied separately (not included in this PDF)", and can be downloaded individually. Real conversion needs a server-side service (for example LibreOffice) that is not included.
- Password-protected or corrupt PDFs cannot be merged. The export stops and names the files at fault rather than producing a partial PDF.
- Backups are plain files, not encrypted. Data otherwise lives only in this browser profile: not encrypted by Docutile, not backed up, not shared, and removed if browser data is cleared (or private browsing is closed).
- File validation is client-side and signature-based. It is not a malware scan and not a security boundary.
- Activity history is informational, not an immutable or compliance-grade audit trail.
- No authentication, roles, cloud collaboration, e-signature, email delivery, or portal submission. These are out of scope and are not simulated.
- PDF merging runs in a Web Worker so the page stays responsive on large packs, and an export can be cancelled. Very large packs are still limited by browser memory, since every file is held in memory while merging.

## Sign-in with Google

Sign-in is **off** until all three credentials exist, so a site without them behaves as before (the sign-in screen then says it is not switched on, and the Google button is disabled). To switch it on:

1. In [Google Cloud Console](https://console.cloud.google.com/), create or pick a project, then **APIs & Services → OAuth consent screen**. Choose *External* (or *Internal* for a Google Workspace), give the app a name and support email, and keep the scopes to `openid`, `email` and `profile`. While the app is in *Testing*, only the test users you list can sign in; click *Publish app* for everyone.
2. **APIs & Services → Credentials → Create credentials → OAuth client ID → Web application.** Under *Authorised redirect URIs* add `https://YOUR-SITE/api/auth/callback/google` (for this project: `https://docutile.vercel.app/api/auth/callback/google`) and, for local development, `http://localhost:3000/api/auth/callback/google`. Copy the *Client ID* and *Client secret*.
3. In Vercel: **Project → Settings → Environment Variables**, add for *Production*: `AUTH_SECRET` (generate with `openssl rand -base64 32`), `AUTH_GOOGLE_ID` and `AUTH_GOOGLE_SECRET`. Optionally `ALLOWED_EMAILS` (comma-separated addresses) and/or `ALLOWED_DOMAINS` (comma-separated domains) to restrict who may sign in; with neither, any Google-verified account may. Then redeploy.
4. Locally, copy `.env.example` to `.env.local` and fill the same values.

What sign-in does and does not do:

- It gates access to the app and separates each account's data **inside one browser**. It does **not** encrypt what is stored on the device, and it does not sync anything: packs and files still live only in that browser, so the same Google account on another device starts empty. Use encrypted backups to move packs.
- Docutile receives only your name and email from Google. Documents are never sent to a server. Sessions are signed cookies (7 days); there is no user database.
- The gate only *reads* the session cookie; page requests never re-send it, so a slow response cannot undo a sign-out or an account switch. Only the sign-in and sign-out endpoints set it.
- Only Google-verified email addresses are accepted. Open-redirect style `callbackUrl` values are ignored.
- Offline use works from the last signed-in session on that device. Signing out deletes the saved page copies.
- Not available: email-and-password or email-link sign-in (needs an account database and an email service), and password reset.

## Maintenance and monitoring

- **Source check** (`npm run check:sources`): for the DOJ and CIPC checklists, re-reads every official page and PDF the checklists came from and fails if a page is unreachable, a form number named in a checklist disappears, a page's "Updated" stamp moves past the one recorded, or the set of form numbers on a page changes from `tests/live/source-snapshot.json`. After reviewing a change and updating the checklists, run `npm run check:sources:update`. It runs weekly in GitHub Actions (`sources.yml`). It needs `curl`, and `pdftotext` (poppler-utils) for PDF sources. For CIPC, the form numbers on its forms pages are read from the forms list only (every CIPC page also carries popups that name forms), and the check confirms every CIPC form a tile names is on that list, apart from a few that only CIPC's application forms or maintenance pages mention (listed in the test).
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
