import { isValidCode, normalizeCode } from '../../_lib/codes';
import { jsonError, parsePayload, readJson } from '../../_lib/validate';
import type { Env } from '../../_lib/types';

function codeFrom(params: Record<string, string | string[]>): string | null {
  const raw = params.code;
  const value = Array.isArray(raw) ? raw[0] : raw;
  const code = normalizeCode(value ?? '');
  return isValidCode(code) ? code : null;
}

/** GET /api/sessions/:code — load a cloud session by its share code. */
export const onRequestGet: PagesFunction<Env, 'code'> = async ({ params, env }) => {
  const code = codeFrom(params);
  if (!code) return jsonError(400, 'Invalid share code.');

  const row = await env.DB.prepare('SELECT data FROM sessions WHERE code = ?')
    .bind(code)
    .first<{ data: string }>();
  if (!row) return jsonError(404, 'No session found for that code.');

  return Response.json({ ...JSON.parse(row.data), code });
};

/** PUT /api/sessions/:code — overwrite an existing cloud session (auto-save). */
export const onRequestPut: PagesFunction<Env, 'code'> = async ({ request, params, env }) => {
  const code = codeFrom(params);
  if (!code) return jsonError(400, 'Invalid share code.');

  let raw: unknown;
  try {
    raw = await readJson(request);
  } catch (error) {
    return jsonError(400, error instanceof Error ? error.message : 'Invalid JSON body.');
  }

  const parsed = parsePayload(raw);
  if (!parsed.ok) return jsonError(400, parsed.error);

  const { session, players } = parsed.payload;
  const data = JSON.stringify({ session, players });

  const result = await env.DB
    .prepare("UPDATE sessions SET name = ?, data = ?, updated_at = datetime('now') WHERE code = ?")
    .bind(session.name, data, code)
    .run();

  if (result.meta.changes === 0) return jsonError(404, 'No session found for that code.');
  return Response.json({ code });
};
