# Architecture and Implementation Notes

## Recommended structure
Keep the app modular. Exact paths may adapt to the existing repository.

- `src/app/` — routes and page layouts
- `src/components/layout/` — sidebar, header, responsive shell
- `src/components/packs/` — pack form, completeness summary, pack list
- `src/components/documents/` — document tile, dropzone, attached-file row, reorder list
- `src/components/templates/` — template selector and editor
- `src/components/ui/` — shared accessible UI primitives
- `src/lib/validation/` — file validation and pack completeness
- `src/lib/pdf/` — PDF merging and cover sheet generation
- `src/lib/storage/` — IndexedDB repository and migration/versioning
- `src/lib/activity/` — local activity event helpers
- `src/types/` — domain types
- `tests/` — unit and component tests

## State and persistence
- Keep transient interaction state in React state.
- Use a typed repository interface so IndexedDB can be replaced by a server API in a future hosted version.
- Store metadata separately from binary Blob data. Avoid localStorage for large files.
- Handle storage quota errors and failed reads/writes.
- Version IndexedDB schema and provide a graceful error path.
- Do not serialize Blob objects into JSON.

## Drag and drop
- Use `@dnd-kit` or a maintained equivalent.
- Support dragging a file from the operating system onto a specific slot.
- Support reordering document slots with a keyboard-accessible alternative.
- Do not confuse OS file drop with in-app slot reordering.
- Prevent accidental browser navigation when a file is dropped outside a valid drop target; handle global drag events carefully.

## PDF behavior
- Use `pdf-lib` for merging valid PDFs entirely in the browser.
- Validate PDF loading and catch malformed/password-protected files.
- If a cover sheet is generated, ensure its page is placed first and its contents order matches the actual merged files.
- Do not merge image, office, or arbitrary file formats by merely renaming them. Explain fallback options.
- Keep large-file operations responsive; use progress indicators where feasible.
- Revoke object URLs after use.

## Error handling
Provide actionable messages for:
- unsupported file type
- file exceeds size limit
- duplicate filename (warn, do not silently overwrite)
- PDF parse/merge failure
- storage quota exceeded
- draft not found
- export failed
- template changes affecting an existing pack

## Future hosted architecture
If a hosted multi-user product is requested later, propose a separate design review before implementation. Likely concerns include authentication, organisation tenancy, server-side file validation and malware scanning, private object storage, access control, encryption, retention/deletion policies, audit logging, backups, and authorised integrations. Do not bolt these on as cosmetic placeholders.
