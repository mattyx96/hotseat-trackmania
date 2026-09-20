import { generateCode } from '../../_lib/codes';
import { jsonError, parsePayload, readJson } from '../../_lib/validate';
import type { Env } from '../../_lib/types';

/** POST /api/sessions — create a cloud copy and return its short code. */
export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
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

  for (let attempt = 0; attempt < 5; attempt += 1) {
    const code = generateCode();
    try {
      await env.DB.prepare('INSERT INTO sessions (code, name, data) VALUES (?, ?, ?)')
        .bind(code, session.name, data)
        .run();
      return Response.json({ code }, { status: 201 });
    } catch (error) {
      // Code collision — try another one.
      if (!String(error).toUpperCase().includes('UNIQUE')) {
        return jsonError(500, 'Could not save the session.');
      }
    }
  }

  return jsonError(500, 'Could not allocate a share code, please retry.');
};
