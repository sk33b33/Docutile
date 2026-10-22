# Claude Code Instructions — Docutile

You are building **Docutile**, an enterprise-style document pack compilation web app. Read this file and all relevant files under `docs/` before coding.

## Working rules
1. First inspect the existing repository. If it is empty, scaffold the app. Do not overwrite existing work without checking.
2. Build a genuinely usable application, not just a static mockup. All visible controls must work or be clearly disabled with an explanation.
3. Work in small phases. After each phase, run available type checks, lint, tests, and build; fix failures before continuing.
4. The UI is deliberately futuristic: dark theme, translucent glass panels, neon cyan/violet glow, subtle ambient motion. Keep it accessible (WCAG AA contrast, visible focus, `prefers-reduced-motion` and `prefers-reduced-transparency` fallbacks, readable print output), responsive and consistent. Use the shared `.glass` / `.glass-strong` / `.glass-input` classes in `src/app/globals.css` instead of ad-hoc styles. No marketing-page copy or decorative illustrations.
5. Use sensible defaults and make decisions without asking the user questions unless blocked by a consequential ambiguity.
6. Keep components small and typed. Avoid one giant component. Use clear names and comments for non-obvious logic.
7. Never invent successful uploads, exports, emails, or submissions. Show honest status and error states.
8. Handle files defensively: validate allowed types and size, show understandable errors, avoid executing uploaded content, and revoke object URLs when no longer needed.
9. Do not send confidential documents to third-party APIs. No analytics or remote upload by default.
10. Do not commit secrets or hard-code credentials. Add `.env.example` only if environment variables are required.
11. Add tests for important logic, particularly required-document validation, ordering, file validation, and pack completeness.
12. If a feature depends on infrastructure not present (authentication, shared cloud storage, e-signature, email delivery, external submission), build a clear interface/placeholder and document what is needed rather than faking it.

## Preferred technical direction
- Next.js with App Router and TypeScript
- React
- Tailwind CSS
- Accessible component primitives (for example, shadcn/ui if compatible with the project)
- `@dnd-kit` for tile/document drag-and-drop and ordering
- `react-dropzone` or native accessible file input for file selection
- `pdf-lib` for combining compatible PDF files in-browser
- `lucide-react` for icons
- Vitest or the project’s existing test framework

Use current stable package versions compatible with one another. If the repository already uses a sensible stack, preserve it instead of migrating without reason.

## Product principles
- Required versus optional documents must always be obvious.
- Users must know what is missing before they can finalize a pack.
- Upload and drag-and-drop must both be supported.
- A file should not silently disappear when moved or replaced.
- The pack's document order must be explicit and controllable.
- Destructive actions require confirmation or a clear undo path.
- Provide keyboard-accessible alternatives to drag-and-drop.
- A pack must never be marked ready when required documents are missing.
- Provide helpful empty, loading, error, success, and disabled states.
- Support desktop-first workflows while remaining usable on tablets and phones.

## Completion definition
Do not stop at a landing page or static dashboard. Implement the end-to-end local MVP described in `docs/PRD.md`, document what is and is not implemented, and report exact commands and test results.
