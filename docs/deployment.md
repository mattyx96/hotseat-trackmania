# Deployment

Hotseat is hosted on **Cloudflare Pages** with **Pages Functions** and a **D1** database. Everything is
static + a tiny API; there is no server to run and no secrets to manage.

| Thing | Value |
| --- | --- |
| Repo | https://github.com/mattyx96/hotseat-trackmania |
| Production | https://hotseat-trackmania.pages.dev |
| Pages project | `hotseat-trackmania` (production branch `main`) |
| D1 database | `hotseat` (`a0a7c71f-1023-429d-afd6-38e72c6a710c`, region EEUR) |
| Binding | `DB` → `hotseat` (see `wrangler.jsonc`) |

## One-time setup

```bash
wrangler login                                   # authenticate
wrangler d1 create hotseat                       # → copy database_id into wrangler.jsonc
wrangler pages project create hotseat-trackmania --production-branch main
npm run db:migrate:remote                        # apply migrations to the remote D1
```

`wrangler.jsonc` holds the project name, build output and the D1 binding:

```jsonc
{
  "name": "hotseat-trackmania",
  "pages_build_output_dir": "dist",
  "compatibility_date": "2026-09-20",
  "d1_databases": [
    { "binding": "DB", "database_name": "hotseat", "database_id": "…" }
  ]
}
```

## Deploying

Deploys are **manual**:

```bash
npm run deploy            # = npm run build && wrangler pages deploy dist
```

> **Branch behaviour:** `wrangler pages deploy` uses the **current git branch** as the deployment
> branch. On `main` it updates **production**; on any other branch it creates a **preview** at
> `https://<branch>.<project>.pages.dev` (e.g. `improvements.hotseat-trackmania.pages.dev`) and leaves
> production untouched. To force production from another branch, pass `--branch main`.

Check what's live:

```bash
wrangler pages deployment list --project-name hotseat-trackmania
```

## Database migrations

Migrations live in `migrations/` (numbered `.sql` files). Apply them per environment:

```bash
npm run db:migrate:local     # local dev D1 (persisted under .wrangler/)
npm run db:migrate:remote    # production D1
```

Add a migration with `wrangler d1 migrations create hotseat <name>`, edit the SQL, then apply it.

## Custom domain

Pages → `hotseat-trackmania` → **Custom domains** → add the domain. If DNS is on Cloudflare the record
is created automatically; otherwise add the CNAME Pages shows you.

## Rollback

Pages keeps previous deployments. In the dashboard open the project → **Deployments**, pick a good one
and **Rollback**. (Or redeploy a previous commit with `npm run deploy`.)

## Configuration & secrets

- **No secrets or env vars are required.** The API is authless and the only dependency is the D1
  binding.
- If you later enable **Git-integrated builds** (push-to-deploy), set:
  - Build command `npm run build`, output `dist`, and env `NODE_VERSION=22.12.0` (Vite 8 needs it);
  - the **D1 binding** in the project settings (Git builds don't read `wrangler.jsonc` bindings the
    same way the CLI does).

## Notes

- No SPA fallback is needed: the app has no client-side routes (tabs are component state).
- The frontend is static and unmetered; only `/api` requests are metered (see Cloudflare's Workers
  pricing). For a friends group this stays on the free tier.
