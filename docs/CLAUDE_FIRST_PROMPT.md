Read `CLAUDE.md`, `docs/PRD.md`, `docs/ARCHITECTURE.md`, and `docs/IMPLEMENTATION_PLAN.md` fully.

Implement Docutile as a functional local-first MVP, not a static mockup. Work through the implementation phases in order. Inspect the repository first, preserve sensible existing choices, and create the app if the repository is empty.

Use Next.js App Router, TypeScript, Tailwind, accessible UI components, `@dnd-kit`, and `pdf-lib` where compatible. Support upload by picker and operating-system drag-and-drop onto individual required/optional document tiles. Implement truthful validation, completion checks, ordering, IndexedDB persistence for drafts and file blobs, and PDF merging for compatible PDF files. Clearly handle unsupported formats rather than pretending to convert them.

Do not send uploaded documents to external services. Do not fake authentication, cloud collaboration, email, or third-party submission. Every visible control should work or explain why it is disabled.

After each phase, run lint, type checks, tests, and build where available. Fix failures before proceeding. Finish by updating the README with setup instructions, exact commands, test results, feature limitations, and the next steps required for a secure hosted production version.
