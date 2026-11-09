const { randomBytes, scrypt, timingSafeEqual, createHash } = require('node:crypto');
const { promisify } = require('node:util');
const fs = require('node:fs/promises');
const path = require('node:path');
const derive = promisify(scrypt);
const userFile = path.join(__dirname, 'data', 'agents.json');
async function passwordHash(password, salt = randomBytes(16).toString('hex')) {
  const hash = await derive(password, salt, 64);
  return { salt, hash: hash.toString('hex') };
}
async function readUsers(file = userFile) {
  try { return JSON.parse(await fs.readFile(file, 'utf8')); }
  catch (error) { if (error.code === 'ENOENT') return []; throw error; }
}
function createAuth({ usersFile = userFile, origin = 'http://localhost:5173', secure = false,
  ttl = 8 * 60 * 60 * 1000, now = Date.now } = {}) {
  const sessions = new Map(), attempts = new Map();
  const cookieName = 'agent_session';
  const cookieOptions = `Path=/api; HttpOnly; SameSite=Strict${secure ? '; Secure' : ''}`;
  const digest = value => createHash('sha256').update(value).digest('hex');
  const send = (res, status, body) => {
    res.statusCode = status;
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Cache-Control', 'no-store');
    res.end(JSON.stringify(body));
  };
  function token(req) {
    const match = (req.headers.cookie || '').split(';').map(item => item.trim()).find(item => item.startsWith(cookieName + '='));
    const value = match?.slice(cookieName.length + 1) || '';
    return /^[a-f0-9]{64}$/.test(value) ? value : '';
  }
  function clean() {
    for (const [key, value] of sessions) if (value.expires <= now()) sessions.delete(key);
    for (const [key, value] of attempts) if (value.until <= now()) attempts.delete(key);
  }
  async function requireAgent(req, res) {
    clean();
    const session = sessions.get(digest(token(req)));
    if (!session) { send(res, 401, { error: 'Please sign in to continue.' }); return null; }
    const agent = (await readUsers(usersFile)).find(user => user.id === session.id && user.active && user.role === 'agent');
    if (!agent) { send(res, 401, { error: 'Your account is unavailable. Contact your administrator.' }); return null; }
    return { id: agent.id, name: agent.name, role: agent.role, siteId: agent.siteId };
  }
  async function handle(req, res, next = () => send(res, 404, { error: 'Not found.' })) {
    const route = (req.originalUrl || req.url).split('?')[0];
    if (!['/api/auth/login', '/api/auth/session', '/api/auth/logout', '/api/admin/me'].includes(route)) return next();
    try {
      clean();
      res.setHeader('Cache-Control', 'no-store');
      if ((route === '/api/auth/login' || route === '/api/auth/logout') && req.method === 'POST') {
        if (req.headers.origin !== origin || req.headers['sec-fetch-site'] === 'cross-site') return send(res, 403, { error: 'This request is not allowed. Check APP_ORIGIN in server/.env.' });
      }
      if ((route === '/api/auth/session' || route === '/api/admin/me') && req.method === 'GET') {
        const agent = await requireAgent(req, res);
        if (agent) send(res, 200, { agent });
        return;
      }
      if (route === '/api/auth/logout' && req.method === 'POST') {
        sessions.delete(digest(token(req)));
        res.setHeader('Set-Cookie', `${cookieName}=; ${cookieOptions}; Max-Age=0`);
        return send(res, 200, { ok: true });
      }
      if (route !== '/api/auth/login' || req.method !== 'POST') return send(res, 405, { error: 'Method not allowed.' });
      const ip = req.socket.remoteAddress || 'local';
      const limit = attempts.get(ip) || { count: 0, until: now() + 15 * 60 * 1000 };
      if (limit.count >= 10) { res.setHeader('Retry-After', String(Math.ceil((limit.until - now()) / 1000))); return send(res, 429, { error: 'Too many sign-in attempts. Try again in 15 minutes.' }); }
      limit.count += 1; attempts.set(ip, limit);
      if (!(req.headers['content-type'] || '').startsWith('application/json')) return send(res, 415, { error: 'JSON is required.' });
      let body = req.body;
      if (body === undefined) {
        let raw = '';
        for await (const chunk of req) { raw += chunk; if (Buffer.byteLength(raw) > 4096) return send(res, 413, { error: 'Request too large.' }); }
        try { body = JSON.parse(raw); } catch { return send(res, 400, { error: 'Invalid JSON.' }); }
      }
      const id = typeof body?.id === 'string' ? body.id.trim().toLowerCase() : '';
      const password = typeof body?.password === 'string' ? body.password : '';
      if (!/^[a-z0-9_-]{3,40}$/.test(id) || !password || password.length > 128) return send(res, 400, { error: 'Enter a valid agent ID and password.' });
      const agent = (await readUsers(usersFile)).find(user => user.id === id);
      const candidate = await passwordHash(password, agent?.salt || '00000000000000000000000000000000');
      const stored = Buffer.from(agent?.hash || '00'.repeat(64), 'hex');
      const supplied = Buffer.from(candidate.hash, 'hex');
      const matches = stored.length === supplied.length && timingSafeEqual(stored, supplied);
      if (!agent || !matches || !agent.active || agent.role !== 'agent') return send(res, 401, { error: 'Agent ID or password is incorrect.' });
      attempts.delete(ip);
      sessions.delete(digest(token(req)));
      const sessionToken = randomBytes(32).toString('hex');
      sessions.set(digest(sessionToken), { id: agent.id, expires: now() + ttl });
      res.setHeader('Set-Cookie', `${cookieName}=${sessionToken}; ${cookieOptions}; Max-Age=${Math.floor(ttl / 1000)}`);
      return send(res, 200, { agent: { id: agent.id, name: agent.name, role: agent.role, siteId: agent.siteId } });
    } catch (error) {
      console.error('Authentication error:', error.code || error.name);
      if (!res.headersSent) send(res, 500, { error: 'Unable to process sign-in. Check the backend terminal.' });
    }
  }
  return { handle, requireAgent };
}
module.exports = { createAuth, passwordHash, readUsers, userFile };
