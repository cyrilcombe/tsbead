# jbead-web

Modern web rewrite of JBead, focused on:
- no Java runtime required
- browser-first usage
- offline local persistence
- compatibility with existing `.jbb` files

## File Format Scope

- Supported in web app: `.jbb`
- Not planned in web app: `.dbb` legacy format

## Tech Stack

- React + TypeScript + Vite
- Zustand for editor state
- Dexie/IndexedDB for local storage
- Vitest for tests

## Development

```bash
npm install
npm run dev
```

## Tests

```bash
npm run test
```

## Build

```bash
npm run build
```

## Print / PDF

- Use `Print...` in the app header (or `Cmd/Ctrl+P`) to print visible panes.
- Use your browser print dialog destination `Save as PDF` to export a PDF.

## GitHub Pages

Deployment workflow is in `.github/workflows/deploy.yml`.
The Vite `base` path is computed from `GITHUB_REPOSITORY` during GitHub Actions builds.

## Migration Roadmap

1. Stabilize parser/serializer coverage for legacy `.jbb` samples.
2. Port core editing behaviors (line, fill, selection, rotate, mirror).
3. Add import/export UX and project browser in IndexedDB.
4. Add report and simulation views.
5. Add PWA caching and optional desktop packaging.

## Legacy Parity Tracking

See `/Users/cyrilcombe/Dev/perso/jbead-web/docs/LEGACY_PARITY_TRACKER.md` for the exhaustive Java feature inventory and task breakdown.

## License

GPLv3 (same as original JBead).
See `LICENSE` and `NOTICE`.
