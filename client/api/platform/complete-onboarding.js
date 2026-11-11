import { createServerClient, httpError, readBody, responseHeaders, appOrigin, onboardingOrigin, sendError, verifiedUser } from '../../server/platform.js';
export function makeCompletionHandler({ getClient = createServerClient, env = process.env } = {}) {
  return async function handler(req, res) {
    responseHeaders(res);
    let passwordSaved = false;
    try {
      if (req.method !== 'POST') { res.setHeader('Allow', 'POST'); throw httpError(405, 'Method not allowed.'); }
      const body = await readBody(req);
      const client = getClient(env);
      const user = await verifiedUser(req, client);
      const { data: record, error: recordError } = await client.from('agent_onboarding').select('user_id, site_id, site_slug, status').eq('user_id', user.id).maybeSingle();
      if (recordError) throw httpError(503, 'Unable to load onboarding information.');
      if (!record || !user.email_confirmed_at) throw httpError(403, 'Accept your agent invitation before setting a password.');
      const portalOrigin=await onboardingOrigin(client,record);
      // Keep legacy platform-origin invitations working. Any agent-domain
      // request must match THIS token-verified recipient's current portal.
      if(req.headers.origin!==appOrigin(env) && req.headers.origin!==portalOrigin)throw httpError(403,'Open the onboarding link for your own agent website.');
      if (record.status === 'invited') {
        passwordSaved = user.app_metadata?.agent_onboarding_password_set === true;
        if (!passwordSaved) {
          if (typeof body.password !== 'string' || body.password.length < 12 || body.password.length > 128) throw httpError(400, 'Use a password between 12 and 128 characters.');
          // Only the verified recipient's pending account is updated. Never trust
          // a user ID or role supplied in the request body. No password is logged.
          const { error } = await client.auth.admin.updateUserById(user.id, {
            password: body.password,
            app_metadata: { ...(user.app_metadata || {}), agent_onboarding_password_set: true },
          });
          if (error) throw httpError(400, 'Unable to save this password. Follow your project’s password requirements and try again.');
          passwordSaved = true;
        }
      }
      const { data: siteId, error } = await client.rpc('complete_agent_onboarding', { p_user_id: user.id });
      if (error) {
        return res.status(403).json({ error: passwordSaved ? 'Your password was saved, but account activation could not finish. Retry activation or contact your administrator.' : 'This account cannot be activated. Contact your platform administrator.', passwordSaved });
      }
      return res.status(200).json({ siteId,adminUrl:`${portalOrigin}/admin` });
    } catch (error) { return sendError(res, error); }
  };
}
export default makeCompletionHandler();
