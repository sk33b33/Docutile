# Phased Build Plan

## Phase 1 — Foundation
- Inspect repository and scaffold Next.js + TypeScript + Tailwind if needed.
- Add linting, type checking, test runner, and a clear README.
- Implement app shell, navigation, typography, buttons, badges, dialogs, and toast/inline notification patterns.
- Add typed domain models and sample templates.
- Verify build and tests.

## Phase 2 — Pack workflow
- Dashboard with recent packs and create-pack flow.
- Pack metadata form.
- Template selection and custom checklist.
- Pack builder with responsive document tiles and completion summary.
- Add/remove/reorder slots and clear empty states.
- Verify required/optional logic with unit tests.

## Phase 3 — File handling
- Click-to-upload and OS drag/drop into specific slots.
- File type/size validation.
- Replace/remove/download/preview where supported.
- Handle duplicates and errors.
- Add IndexedDB persistence for metadata and Blob files.
- Test refresh persistence and quota/error paths.

## Phase 4 — Review and export
- Pack review screen with ordered contents.
- Merge compatible PDFs using `pdf-lib`.
- Add cover sheet if feasible.
- Print flow and predictable filenames.
- Provide honest fallback for non-PDF sources.
- Block final export when required items are missing.

## Phase 5 — Templates, activity, polish
- Template editor.
- Local activity log.
- Settings and clear-local-data flow.
- Responsive and keyboard-accessibility review.
- Loading, empty, success, and error states.
- Unit tests and smoke tests.

## Phase 6 — Final quality gate
- Run lint, typecheck, tests, and production build.
- Fix errors rather than hiding them.
- Check for dead links and inert buttons.
- Ensure no secrets or external uploads.
- Update README with exact commands and implemented limitations.
- Summarise what works and what remains for production.
