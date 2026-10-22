# Product Decisions and Defaults

These defaults keep the first build moving without blocking on discovery.

- Product name: Docutile (working name; easy to rename).
- Product type: desktop-first responsive web app.
- Initial deployment mode: local-first MVP running in the user's browser.
- User accounts: not included in MVP.
- Storage: IndexedDB for draft metadata and file blobs.
- Default per-file limit: 25 MB, configurable if straightforward.
- PDF output: merge compatible PDF files only.
- Office/image conversion: not claimed unless a real conversion pipeline is implemented.
- Default templates: Supplier onboarding, Client onboarding, Compliance review, General submission.
- Required-document rule: all required slots must be filled with valid files before the pack is ready.
- Optional slots never block readiness.
- External delivery: download/print in MVP; email and direct portal submission are future integrations.
- Activity log: local, informational, not immutable or compliance-grade.
- Visual tone: restrained enterprise UI, clear information hierarchy, accessible contrast, no decorative marketing visuals.
