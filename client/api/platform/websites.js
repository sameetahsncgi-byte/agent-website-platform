import { defaultAgentHostname } from '../../src/services/agentSubdomains.js';
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
      const admin = await verifiedAdmin(req, client);
      if (req.method === 'GET') {
        const { data: profiles, error } = await client.from('agent_profiles').select('site_id, name, active, created_at').eq('role', 'agent').order('created_at', { ascending: false }).limit(500);
        if (error) throw httpError(503, 'Unable to load agent websites.');
        const { data: settings, error: settingsError } = await client.from('agent_website_settings').select('site_id, enabled, hostname, publish_before_onboarding, subdomain_slug, domain_locked');
        if (settingsError) throw httpError(503, 'Run setup-domain-locks.sql after the previous migrations in Supabase first.');
        const { data: onboarding, error: onboardingError } = await client.from('agent_onboarding').select('site_id, status, site_slug');
        if (onboardingError) throw httpError(503, 'Unable to load onboarding status.');
        const accounts = new Map((onboarding || []).map(row => [row.site_id, row]));
        const lookup = new Map((settings || []).map(row => [row.site_id, row]));
        return res.status(200).json({ websites: (profiles || []).map(profile => {
          const settings = lookup.get(profile.site_id);
          const account = accounts.get(profile.site_id);
          return { ...profile, enabled: settings?.enabled ?? true, hostname: settings?.hostname || null,
            domainLocked: settings?.domain_locked === true,
            subdomainSlug: settings?.subdomain_slug || account?.site_slug || '',
            defaultHostname: settings?.subdomain_slug || account?.site_slug ? defaultAgentHostname(settings?.subdomain_slug || account.site_slug) : null,
            publicEligible: profile.active || (settings?.publish_before_onboarding === true && account?.status === 'invited') };
        }) });
      }
      sameOrigin(req, env);
      const body = await readBody(req);
      if (!validSite(body.siteId)) throw httpError(400, 'Choose a valid website.');
      if (body.action === 'set-domain-locked') {
        if (typeof body.locked !== 'boolean') throw httpError(400, 'Choose a valid lock status.');
        const { data, error } = await client.rpc('set_agent_domain_lock', { p_site_id: body.siteId, p_locked: body.locked, p_actor: admin.id });
        if (error?.code === '42501') throw httpError(403, 'Active Super Admin access is required.');
        if (error?.code === 'P0002') throw httpError(404, 'Agent website not found.');
        if (error || !data) throw httpError(503, 'Unable to change the domain lock. Run setup-domain-locks.sql first.');
        return res.status(200).json({ website: { ...data, domainLocked: data.domain_locked === true } });
      }
      let change;
      if (body.action === 'set-enabled' && typeof body.enabled === 'boolean') change = { enabled: body.enabled };
      else if (body.action === 'set-hostname') {
        let hostname;
        try { hostname = normalizeHostname(body.hostname); } catch (error) { throw httpError(400, error.message); }
        if (hostname === platformHostname || hostname === 'vercel.app' || hostname.endsWith('.localhost')) throw httpError(400, 'Use an agent hostname, not the main platform address.');
        if (hostname.endsWith('.brokerage.sncgi.com')) {
          const slug = hostname.slice(0, -'.brokerage.sncgi.com'.length);
          const { data, error } = await client.rpc('rename_agent_subdomain', { p_site_id: body.siteId, p_slug: slug, p_actor: admin.id });
          if (error?.code === '23505') throw httpError(409, 'That website name is already used or reserved.');
          if (error?.code === '22023') throw httpError(400, 'Choose a valid website name of 3–40 lowercase letters, numbers or single hyphens.');
          if (error?.code === '42501') throw httpError(403, 'Administrator access is required.');
          if (error || !data) throw httpError(503, 'Unable to rename the subdomain. Run setup-editable-subdomains.sql first.');
          return res.status(200).json({ website: { ...data, domainLocked: data.domain_locked === true, subdomainSlug: data.subdomain_slug, defaultHostname: defaultAgentHostname(data.subdomain_slug) } });
        }
        change = { hostname };
      } else if (body.action === 'remove-hostname') change = { hostname: null };
      else throw httpError(400, 'Choose a supported website action.');
      const { data: profile, error: profileError } = await client.from('agent_profiles').select('site_id, role, active').eq('site_id', body.siteId).maybeSingle();
      if (profileError) throw httpError(503, 'Unable to verify the website.');
      if (!profile || profile.role !== 'agent') throw httpError(404, 'Agent website not found.');
      // Ensure a settings row exists without overwriting any existing field.
      const { error: ensureError } = await client.from('agent_website_settings').upsert({ site_id: body.siteId }, { onConflict: 'site_id', ignoreDuplicates: true });
      if (ensureError) throw httpError(503, 'Run setup-domain-locks.sql after the previous migrations in Supabase first.');
      const { data, error } = await client.from('agent_website_settings').update({ ...change, updated_at: new Date().toISOString() }).eq('site_id', body.siteId).select('site_id, enabled, hostname').maybeSingle();
      if (error?.code === '23514') throw httpError(409, 'A brokerage subdomain can only be assigned to the agent who reserved its handle.');
      if (error?.code === '23505') throw httpError(409, 'That hostname is already assigned to another agent.');
      if (error || !data) throw httpError(503, 'Unable to save the website settings.');
      return res.status(200).json({ website: data });
    } catch (error) { return sendError(res, error); }
  };
}
export default makeWebsitesHandler();
