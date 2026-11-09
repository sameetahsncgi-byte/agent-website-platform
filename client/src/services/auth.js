import { getSupabase } from './supabase.js';

function authError(message, status) {
  const error = Error(message);
  error.status = status;
  return error;
}

export function makeAuthRequest(getClient) {
  async function loadAgent(client) {
    const { data: sessionData, error: sessionError } = await client.auth.getSession();
    if (sessionError) throw authError('Unable to restore your session. Please sign in again.', 401);
    if (!sessionData.session) throw authError('Please sign in to continue.', 401);
    // getUser checks the token with Supabase; the local session alone is not authorization.
    const { data: userData, error: userError } = await client.auth.getUser();
    if (userError || !userData.user) throw authError('Your session expired. Please sign in again.', 401);
    const { data: profile, error: profileError } = await client.from('agent_profiles')
      .select('agent_id, name, site_id, role, active').eq('user_id', userData.user.id).maybeSingle();
    if (profileError) throw authError('Unable to load your agent profile. Run the database setup SQL and try again.', 503);
    if (!profile || !profile.active || profile.role !== 'agent') {
      await client.auth.signOut({ scope: 'local' });
      throw authError('Agent access has not been enabled for this account. Contact your administrator.', 403);
    }
    return { agent: { id: profile.agent_id, name: profile.name, role: profile.role, siteId: profile.site_id } };
  }
  return async function request(path, body) {
    const client = getClient();
    if (path === '/api/auth/login') {
      const email = (body?.id || '').trim();
      const password = body?.password || '';
      if (!email || !password) throw authError('Enter your email and password.', 400);
      const { error } = await client.auth.signInWithPassword({ email, password });
      if (error) throw authError(error.status === 429 ? 'Too many attempts. Please wait before trying again.' : 'Unable to sign in. Check your email, password, and that your email is confirmed.', error.status || 401);
      return loadAgent(client);
    }
    if (path === '/api/admin/me' || path === '/api/auth/session') return loadAgent(client);
    if (path === '/api/auth/logout') {
      const { error } = await client.auth.signOut({ scope: 'local' });
      if (error) throw authError('Unable to log out. Check your connection and try again.', error.status || 503);
      return { ok: true };
    }
    throw authError('Unsupported authentication action.', 404);
  };
}

// The existing portal calls this adapter; authentication now goes to Supabase.
export const authRequest = makeAuthRequest(getSupabase);
