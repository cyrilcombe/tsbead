# Codex Context - jbead-web

## Goal
Modernize legacy JBead (Java/Swing) into a web app that:
- does not require Java runtime for end users,
- runs as static hosting (GitHub Pages),
- keeps compatibility with legacy `.jbb` files,
- stores projects locally (IndexedDB).

## Repositories / Paths
- Legacy Java reference: `/Users/cyrilcombe/Dev/perso/jbead`
- New web project: `/Users/cyrilcombe/Dev/perso/jbead-web`

## What was done
- Bootstrapped React + TypeScript + Vite project.
- Added dependencies:
  - runtime: `zustand`, `dexie`
  - tests: `vitest`, `@vitest/ui`, `@testing-library/react`, `jsdom`
- Added architecture folders:
  - `src/domain`
  - `src/io/jbb`
  - `src/storage`
  - `src/ui/canvas`
- Implemented initial editor shell:
  - state store (`src/domain/editorStore.ts`)
  - basic canvas painting (`src/ui/canvas/BeadCanvas.tsx`)
  - import/export `.jbb` and local autosave (`src/App.tsx`)
- Implemented JBB parser/serializer:
  - `src/io/jbb/format.ts`
- Added tests:
  - `src/io/jbb/format.test.ts`
  - `src/domain/editorStore.test.ts`
- Added legacy fixture:
  - `fixtures/hearts.jbb`
- Added docs and licensing:
  - `README.md`
  - `NOTICE`
  - `LICENSE` (copied from legacy project)
- Added GitHub Pages workflow:
  - `.github/workflows/deploy.yml`
- Updated `.gitignore` with IntelliJ patterns.

## Validation status
- `npm run test`: OK (all tests passing)
- `npm run build`: OK

## Important config notes
- `vite.config.ts` computes `base` from `GITHUB_REPOSITORY` when running in GitHub Actions.
- Current storage is local IndexedDB via Dexie (`src/storage/db.ts`).
- No backend required for current scope.

## Suggested next steps
1. Initialize git for `jbead-web` and push to a new public GitHub repo.
2. Enable GitHub Pages in repo settings (GitHub Actions source).
3. Implement missing editing tools parity with legacy app:
   - fill, select, line, rotate, mirror, undo/redo history.
4. Extend `.jbb` coverage with more fixtures from legacy `samples/`.
5. Add PWA offline cache (service worker) for stronger offline UX.

## License / attribution
- Keep GPLv3-compatible licensing.
- Keep attribution to original JBead project and author in NOTICE/README.
