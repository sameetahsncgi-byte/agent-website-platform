import { createClient } from '@supabase/supabase-js';

export function httpError(status, message) {
  const error = new Error(message);
  error.status = status;
  return error;
}
export function appOrigin(env = process.env) {
  try {
    const url = new URL(env.APP_URL);
    if (url.protocol !== 'https:' || url.username || url.password || url.search || url.hash || url.pathname !== '/') throw Error();
    return url.origin;
  } catch { throw httpError(503, 'Set APP_URL to your public production HTTPS website address in Vercel.'); }
}
export function createServerClient(env = process.env) {
  if (!env.SUPABASE_URL || !env.SUPABASE_SECRET_KEY) throw httpError(503, 'Server Supabase settings are missing in Vercel.');
  let privileged = env.SUPABASE_SECRET_KEY.startsWith('sb_secret_');
  if (!privileged) {
    try { privileged = JSON.parse(Buffer.from(env.SUPABASE_SECRET_KEY.split('.')[1], 'base64url').toString('utf8')).role === 'service_role'; } catch { /* Not a legacy service-role key. */ }
  }
  if (!privileged) throw httpError(503, 'The server requires a Supabase secret key, not a publishable or anon key.');
  return createClient(env.SUPABASE_URL, env.SUPABASE_SECRET_KEY, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}
export function responseHeaders(res) {
  res.setHeader('Cache-Control', 'no-store, private');
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader('X-Content-Type-Options', 'nosniff');
}
export function sameOrigin(req, env) {
  if (req.headers.origin !== appOrigin(env)) throw httpError(403, 'Use the production website address to perform this action.');
}
export async function verifiedUser(req, client) {
  const header = req.headers.authorization || '';
  if (!/^Bearer [^\s]+$/.test(header) || header.length > 8192) throw httpError(401, 'Sign in to continue.');
  const { data, error } = await client.auth.getUser(header.slice(7));
  if (error || !data?.user) throw httpError(401, 'Your session expired. Sign in again.');
  return data.user;
}
export async function verifiedAdmin(req, client) {
  const user = await verifiedUser(req, client);
  const { data, error } = await client.from('platform_admins').select('user_id, active').eq('user_id', user.id).maybeSingle();
  if (error) throw httpError(503, 'Unable to verify administrator access.');
  if (!data?.active || data.user_id !== user.id) throw httpError(403, 'Active Super Admin access is required.');
  return user;
}
export async function readBody(req) {
  if (!(req.headers['content-type'] || '').toLowerCase().startsWith('application/json')) throw httpError(415, 'Send a JSON request.');
  let body = req.body;
  if (body === undefined) {
    const chunks = []; let size = 0;
    for await (const chunk of req) {
      size += Buffer.byteLength(chunk);
      if (size > 8192) throw httpError(413, 'Request is too large.');
      chunks.push(Buffer.from(chunk));
    }
    body = Buffer.concat(chunks).toString('utf8');
  }
  if (Buffer.isBuffer(body)) body = body.toString('utf8');
  if (typeof body === 'string') {
    if (Buffer.byteLength(body) > 8192) throw httpError(413, 'Request is too large.');
    try { body = JSON.parse(body); } catch { throw httpError(400, 'Invalid JSON request.'); }
  }
  if (!body || typeof body !== 'object' || Array.isArray(body)) throw httpError(400, 'Invalid request body.');
  if (Buffer.byteLength(JSON.stringify(body)) > 8192) throw httpError(413, 'Request is too large.');
  return body;
}
export const isUuid = value => typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
const reserved = new Set(['admin','api','app','auth','www','login','super-admin','onboarding','support','mail']);
export function validateAgent(body) {
  const name = typeof body.name === 'string' ? body.name.trim() : '';
  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
  const slug = typeof body.slug === 'string' ? body.slug.trim().toLowerCase() : '';
  if (!name || name.length > 100) throw httpError(400, 'Enter an agent name of 100 characters or fewer.');
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw httpError(400, 'Enter a valid agent email.');
  if (!/^[a-z0-9][a-z0-9-]{1,38}[a-z0-9]$/.test(slug) || slug.includes('--') || reserved.has(slug)) throw httpError(400, 'Use a unique website handle of 3–40 lowercase letters, numbers or hyphens. Avoid reserved names.');
  if (!isUuid(body.requestId)) throw httpError(400, 'Refresh the form and try again.');
  return { name, email, slug, requestId: body.requestId };
}
export async function makeInvitation(client, record, env) {
  if (record.status !== 'invited') throw httpError(409, 'This agent has already completed onboarding.');
  const { data: accountData, error: accountError } = await client.auth.admin.getUserById(record.user_id);
  if (accountError || !accountData?.user || accountData.user.email?.toLowerCase() !== record.email) throw httpError(409, 'The agent account no longer matches this invitation.');
  // An accepted invitation with unfinished setup needs a recovery link.
  const type = accountData.user.email_confirmed_at ? 'recovery' : 'invite';
  const { data, error } = await client.auth.admin.generateLink({ type, email: record.email });
  if (error || !data?.properties?.hashed_token || data.user?.id !== record.user_id) throw httpError(502, 'Unable to generate the link. The pending account is saved; use New link to try again.');
  const params = new URLSearchParams({ token_hash: data.properties.hashed_token, type });
  return { url: `${appOrigin(env)}/#/onboarding?${params}`, type };
}
export function sendError(res, error) {
  return res.status(error.status || 500).json({ error: error.status ? error.message : 'Unable to complete the request. Try again shortly.' });
}
