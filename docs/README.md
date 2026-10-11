# Hotseat docs

Documentation for **Hotseat**, a local-first Trackmania hotseat companion.

Start here:

| Doc | What's in it |
| --- | --- |
| [architecture.md](./architecture.md) | How it fits together, the design principles, and the decisions behind them. |
| [game-rules.md](./game-rules.md) | The product: turns, records, elimination, winners, scoring. |
| [data-model.md](./data-model.md) | Local (`AppData`) and cloud (D1) data shapes. |
| [api.md](./api.md) | The cloud-save HTTP API (Pages Functions). |
| [development.md](./development.md) | Scripts, local dev, conventions, how to verify changes. |
| [deployment.md](./deployment.md) | Cloudflare Pages + D1 setup, deploys, previews. |

Related, at the repo root:

- [`README.md`](../README.md) — what the app is and how to run it.
- [`HANDOVER.md`](../HANDOVER.md) — quick context for whoever picks the project up.
- [`IMPROVEMENTS.md`](../IMPROVEMENTS.md) — the open backlog.

**In one line:** all gameplay state lives in the browser (`localStorage`); a Cloudflare D1 database is an
*optional* cloud save/share layer, addressed by a short share code, with no accounts.
