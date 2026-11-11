import { defaultAgentUrl } from '../../src/services/agentSubdomains.js';
import { appOrigin, createServerClient, httpError, isUuid, makeInvitation, readBody, responseHeaders, sameOrigin, sendError, validateAgent, verifiedAdmin } from '../../server/platform.js';
const columns = 'user_id, site_id, name, email, site_slug, status, created_at, completed_at';
export function makeAgentsHandler({ getClient = createServerClient, env = process.env } = {}) {
  return async function handler(req, res) {
    responseHeaders(res);
    try {
      if (!['GET', 'POST'].includes(req.method)) { res.setHeader('Allow', 'GET, POST'); throw httpError(405, 'Method not allowed.'); }
      appOrigin(env);
      const client = getClient(env);
      const admin = await verifiedAdmin(req, client);
      if (req.method === 'GET') {
        const { data, error } = await client.from('agent_onboarding').select(columns).order('created_at', { ascending: false }).limit(500);
        if (error) throw httpError(503, 'Run setup-onboarding.sql in Supabase before using agent management.');
        return res.status(200).json({ agents: data || [] });
      }
      sameOrigin(req, env);
      const body = await readBody(req);
      if (body.action === 'regenerate') {
        if (!isUuid(body.userId)) throw httpError(400, 'Choose a valid agent.');
        const { data: record, error } = await client.from('agent_onboarding').select(columns).eq('user_id', body.userId).maybeSingle();
        if (error) throw httpError(503, 'Unable to load the invitation.');
        if (!record) throw httpError(404, 'Agent not found.');
        const invitation = await makeInvitation(client, record, env);
        return res.status(200).json({ agent: record, onboardingUrl: invitation.url, websiteUrl: defaultAgentUrl(record.site_slug) });
      }
      if (body.action !== 'create') throw httpError(400, 'Choose a supported action.');
      const input = validateAgent(body);
      // Retrying the same submitted form cannot create another account.
      const { data: previous, error: previousError } = await client.from('agent_onboarding').select(`${columns}, request_id, created_by`).eq('request_id', input.requestId).maybeSingle();
      if (previousError) throw httpError(503, 'Run setup-onboarding.sql in Supabase before creating agents.');
      if (previous) {
        if (previous.created_by !== admin.id || previous.name !== input.name || previous.email !== input.email || previous.site_slug !== input.slug) throw httpError(409, 'This form request was already used. Refresh and try again.');
        const invitation = await makeInvitation(client, previous, env);
        return res.status(200).json({ agent: previous, onboardingUrl: invitation.url, websiteUrl: defaultAgentUrl(previous.site_slug) });
      }
      const { data: used, error: usedError } = await client.from('agent_onboarding').select('site_slug').eq('site_slug', input.slug).maybeSingle();
      if (usedError) throw httpError(503, 'Unable to check the website handle.');
      if (used) throw httpError(409, 'That website handle is already reserved. Choose another.');
      // createUser rejects an existing email; existing accounts are never taken over.
      const { data: created, error: createError } = await client.auth.admin.createUser({ email: input.email, email_confirm: false });
      if (createError || !created?.user) throw httpError(409, 'Unable to create this account. The email may already be registered. Use a new agent email, or refresh the list for an existing pending invitation.');
      const userId = created.user.id;
      const { data: siteId, error: provisionError } = await client.rpc('provision_agent_website', {
        p_user_id: userId, p_admin_id: admin.id, p_name: input.name,
        p_email: input.email, p_slug: input.slug, p_request_id: input.requestId,
      });
      if (provisionError) {
        // Roll back only the brand-new, unprovisioned account from this request.
        // Never remove an account if an ambiguous network failure may have committed.
        const { data: provisioned, error: checkError } = await client.from('agent_onboarding').select(columns).eq('user_id', userId).maybeSingle();
        if (checkError) throw httpError(503, 'Account setup needs review. Check Authentication and onboarding records before retrying.');
        if (provisioned) {
          const invitation = await makeInvitation(client, provisioned, env);
          return res.status(201).json({ agent: provisioned, onboardingUrl: invitation.url, websiteUrl: defaultAgentUrl(provisioned.site_slug) });
        }
        if (!/^[0-9A-Z]{5}$/.test(provisionError.code || '')) throw httpError(503, 'Account setup needs review. Refresh the list before retrying; the database result was uncertain.');
        const { error: cleanupError } = await client.auth.admin.deleteUser(userId);
        if (cleanupError) throw httpError(503, 'Account setup needs review. A new unprovisioned account could not be cleaned up.');
        throw httpError(409, 'Unable to reserve this website. Check the SQL setup, choose another handle and try again.');
      }
      const record = { user_id: userId, site_id: siteId, name: input.name, email: input.email, site_slug: input.slug, status: 'invited' };
      const invitation = await makeInvitation(client, record, env);
      return res.status(201).json({ agent: record, onboardingUrl: invitation.url, websiteUrl: defaultAgentUrl(record.site_slug) });
    } catch (error) { return sendError(res, error); }
  };
}
export default makeAgentsHandler();
