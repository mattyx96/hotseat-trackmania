# Development

## Prerequisites

- **Node** ≥ 20.19 / ≥ 22.12 (Vite 8 / TS 6) and **npm**.
- **wrangler** (Cloudflare CLI) — install globally: `npm install -g wrangler`, then `wrangler login`.
  Needed only for the cloud API / deploys.

## Scripts

| Script | What it does |
| --- | --- |
| `npm run dev` | Vite dev server (UI + HMR) on `:5173`. |
| `npm run dev:api` | `wrangler pages dev dist` — Pages Functions + local D1 on `:8788`. |
| `npm run build` | Type-check (`tsc -b`) + production build to `dist/`. |
| `npm run preview` | Preview the production build. |
| `npm run typecheck:functions` | Type-check the Pages Functions. |
| `npm run lint` | `oxlint`. |
| `npm run db:migrate:local` | Apply D1 migrations to the local database. |
| `npm run db:migrate:remote` | Apply D1 migrations to the remote database. |
| `npm run deploy` | Build + `wrangler pages deploy dist`. |

## Local development

**UI only** (no API): `npm run dev`.

**Full stack** (API + local D1): the Vite server proxies `/api` to `wrangler pages dev` on `:8788`, so
run both in separate terminals:

```bash
npm run dev:api        # terminal 1 — functions + local D1 (:8788)
npm run dev            # terminal 2 — UI with HMR (:5173), /api proxied to :8788
```

If you prefer a single server, `npm run build && npm run dev:api` serves the built app and the API
together on `:8788`.

## Project layout

```
src/                    React app (see docs/architecture.md for responsibilities)
functions/              Cloudflare Pages Functions (the /api/sessions API)
migrations/             D1 migrations
public/                 favicon + static assets
wrangler.jsonc          Pages project name + D1 binding
docs/                   this documentation
```

## Conventions

- **Use the design system.** Build UI with `nebula-ds-react-library` components and `--nb-*` tokens.
  No hard-coded colours; the page/panels use the DS defaults (`--nb-background-primary`).
- **Light and dark must both look right.** Set `data-nb-theme` on `<html>` for portalled UI (dialogs,
  select menus, toasts) — the app already syncs this in `AppShell`.
- **Keep rules pure.** Turn/scoring logic lives in `src/lib/*` as pure functions so it's testable.
- **Match surrounding code** (naming, structure, formatting). Prettier-ish 2-space, single quotes.

## Verifying changes

1. `npm run build` and `npm run lint` (and `npm run typecheck:functions` if you touched `functions/`).
2. **Logic:** pure helpers (`src/lib/time.ts`, `track.ts`, `scoring.ts`) can be tested with Node's type
   stripping, e.g. `node --experimental-strip-types some-test.ts` importing them directly.
3. **UI:** render it. A headless Chrome is available
   (`"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --headless=new --screenshot=… URL`).
   The in-session browser tool is **not** connected, so there's no click-through — use screenshots and
   logic tests.
4. **API:** exercise it locally with `wrangler pages dev` + `fetch` (see [api.md](./api.md)).

## Branching & commits

- `main` is the production branch; feature work goes on a branch (e.g. `improvements`).
- Commits are plain, imperative summaries; group related changes.
- Deploying a non-`main` branch creates a **preview** deployment, not production (see
  [deployment.md](./deployment.md)).
