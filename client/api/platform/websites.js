import { appOrigin, createServerClient, httpError, readBody, responseHeaders, sameOrigin, sendError, verifiedAdmin } from '../../server/platform.js';
import { normalizeHostname } from '../../src/services/hostnames.js';
const validSite = value => typeof value === 'string' && value.length <= 120 && /^site-[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value);
export function makeWebsitesHandler({ getClient = createServerClient, env = process.env } = {}) {
  return async (req, res) => {
    responseHeaders(res);
    try {
      if (!['GET', 'POST'].includes(req.method)) { res.setHeader('Allow', 'GET, POST'); throw httpError(405, 'Method not allowed.'); }
      const platformHostname = new URL(appOrigin(env)).hostname;
      const client = getClient(env);
      await verifiedAdmin(req, client);
      if (req.method === 'GET') {
        const { data: profiles, error } = await client.from('agent_profiles').select('site_id, name, active, created_at').eq('role', 'agent').order('created_at', { ascending: false }).limit(500);
        if (error) throw httpError(503, 'Unable to load agent websites.');
        const { data: settings, error: settingsError } = await client.from('agent_website_settings').select('site_id, enabled, hostname');
        if (settingsError) throw httpError(503, 'Run setup-website-controls.sql in Supabase first.');
        const lookup = new Map((settings || []).map(row => [row.site_id, row]));
        return res.status(200).json({ websites: (profiles || []).map(profile => ({ ...profile, enabled: lookup.get(profile.site_id)?.enabled ?? true, hostname: lookup.get(profile.site_id)?.hostname || null })) });
      }
      sameOrigin(req, env);
      const body = await readBody(req);
      if (!validSite(body.siteId)) throw httpError(400, 'Choose a valid website.');
      let change;
      if (body.action === 'set-enabled' && typeof body.enabled === 'boolean') change = { enabled: body.enabled };
      else if (body.action === 'set-hostname') {
        let hostname;
        try { hostname = normalizeHostname(body.hostname); } catch (error) { throw httpError(400, error.message); }
        if (hostname === platformHostname || hostname === 'vercel.app' || hostname.endsWith('.localhost')) throw httpError(400, 'Use an agent hostname, not the main platform address.');
        change = { hostname };
      } else if (body.action === 'remove-hostname') change = { hostname: null };
      else throw httpError(400, 'Choose a supported website action.');
      const { data: profile, error: profileError } = await client.from('agent_profiles').select('site_id, role, active').eq('site_id', body.siteId).maybeSingle();
      if (profileError) throw httpError(503, 'Unable to verify the website.');
      if (!profile || profile.role !== 'agent') throw httpError(404, 'Agent website not found.');
      // Ensure a settings row exists without overwriting any existing field.
      const { error: ensureError } = await client.from('agent_website_settings').upsert({ site_id: body.siteId }, { onConflict: 'site_id', ignoreDuplicates: true });
      if (ensureError) throw httpError(503, 'Run setup-website-controls.sql in Supabase first.');
      const { data, error } = await client.from('agent_website_settings').update({ ...change, updated_at: new Date().toISOString() }).eq('site_id', body.siteId).select('site_id, enabled, hostname').maybeSingle();
      if (error?.code === '23505') throw httpError(409, 'That hostname is already assigned to another agent.');
      if (error || !data) throw httpError(503, 'Unable to save the website settings.');
      return res.status(200).json({ website: data });
    } catch (error) { return sendError(res, error); }
  };
}
export default makeWebsitesHandler();
