# jbead-web

Modern web rewrite of JBead, focused on:
- no Java runtime required
- browser-first usage
- offline local persistence
- compatibility with existing `.jbb` files

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

## GitHub Pages

Deployment workflow is in `.github/workflows/deploy.yml`.
The Vite `base` path is computed from `GITHUB_REPOSITORY` during GitHub Actions builds.

## Migration Roadmap

1. Stabilize parser/serializer coverage for legacy `.jbb` samples.
2. Port core editing behaviors (line, fill, selection, rotate, mirror).
3. Add import/export UX and project browser in IndexedDB.
4. Add report and simulation views.
5. Add PWA caching and optional desktop packaging.

## License

GPLv3 (same as original JBead).
See `LICENSE` and `NOTICE`.
