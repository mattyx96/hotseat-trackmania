# API

The cloud-save API is implemented as **Cloudflare Pages Functions** in [`functions/`](../functions).
It is served from the **same origin** as the app (no CORS), and stores data in the D1 database `hotseat`
(binding `DB`).

## Share codes

- Generated **server-side** on create: **8 characters** from `23456789ABCDEFGHJKMNPQRSTVWXYZ`
  (no `0 1 I L O U`, to avoid ambiguity when read aloud or typed).
- Validated on read/update as **6–12** characters of that alphabet.
- The code **is the capability**: anyone with it can read *and overwrite* that session. There is no
  listing endpoint and no auth.

## `POST /api/sessions`

Create a cloud copy. Body is a [`CloudPayload`](./data-model.md#local-state-appdata)
(`{ session, players }`).

```http
POST /api/sessions
Content-Type: application/json

{ "session": { … }, "players": [ … ] }
```

| Response | Body |
| --- | --- |
| `201 Created` | `{ "code": "B4YJMJGW" }` |
| `400 Bad Request` | `{ "error": "Missing session." }` |
| `500` | `{ "error": "Could not allocate a share code, please retry." }` |

Codes are retried up to 5× on a `UNIQUE` collision.

## `GET /api/sessions/:code`

```http
GET /api/sessions/B4YJMJGW
```

| Response | Body |
| --- | --- |
| `200 OK` | `{ "session": { … }, "players": [ … ], "code": "B4YJMJGW" }` |
| `400 Bad Request` | `{ "error": "Invalid share code." }` |
| `404 Not Found` | `{ "error": "No session found for that code." }` |

## `PUT /api/sessions/:code`

Overwrite an existing session (used by the client's debounced auto-save). Body is the same
`CloudPayload`; the row must already exist.

| Response | Body |
| --- | --- |
| `200 OK` | `{ "code": "B4YJMJGW" }` |
| `400 Bad Request` | `{ "error": "Invalid share code." }` / validation error |
| `404 Not Found` | `{ "error": "No session found for that code." }` |

## Validation & limits

`functions/_lib/validate.ts`:

- Body must be a JSON object with a `session` object and a `players` array.
- Required session fields: `id`, `name`, `playerIds[]`, `tracks[]`, numeric `turnDurationMs`.
- `players` ≤ **64**; each needs a string `id` and `name`.
- `session.name` truncated to 120 chars; player names to 60.
- Body size cap: **256 KB** (`Payload is too large.`).
- `session.shareCode` is forced to `null` before storing.

## Client usage

`src/lib/cloud.ts` wraps the endpoints:

- `createCloudSession(session, players)` → `POST` → returns the code.
- `updateCloudSession(code, session, players)` → `PUT`.
- `fetchCloudSession(code)` → `GET` → `{ payload, code }`.
- `extractCode(input)` accepts a bare code or a full `…?session=CODE` link.
- `buildPayload(session, players)` strips `shareCode` and keeps only the players the session uses.

The app **auto-saves** (debounced ~1.5 s) any session that has a `shareCode`, and imports a session on
startup from a `?session=<code>` deep link.

## Local development

`wrangler pages dev` serves the functions + a local D1 on **http://localhost:8788**; `vite dev` proxies
`/api` there (see [development.md](./development.md)). Example:

```bash
npm run build && npm run dev:api            # functions + local D1 on :8788
curl -s localhost:8788/api/sessions/ZZZZZZZZ   # -> 404 {"error":"No session found for that code."}
```
