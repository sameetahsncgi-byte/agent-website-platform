import { getSupabase } from './supabase.js';

function accessError(message, status) {
  const error = new Error(message);
  error.status = status;
  return error;
}

// This checks access to the UI. Future administrative APIs must independently
// verify the token and platform_admins membership on the server.
export function makePlatformAuth(getClient) {
  async function current() {
    const client = getClient();
    const { data: sessionData, error: sessionError } = await client.auth.getSession();
    if (sessionError) throw accessError('Unable to restore your session. Please sign in again.', 401);
    if (!sessionData.session) return null;

    const { data: userData, error: userError } = await client.auth.getUser();
    if (userError || !userData.user) throw accessError('Your session expired. Please sign in again.', 401);

    const { data: membership, error: membershipError } = await client.from('platform_admins')
      .select('user_id, active').eq('user_id', userData.user.id).maybeSingle();
    if (membershipError) throw accessError('Unable to check administrator access. Confirm the platform_admins SQL setup and try again.', 503);
    if (!membership?.active || membership.user_id !== userData.user.id) {
      throw accessError('This account does not have active Super Admin access. Use your separate administrator account.', 403);
    }
    return { id: userData.user.id, email: userData.user.email };
  }

  async function login(email, password) {
    const cleanEmail = email.trim();
    if (!cleanEmail || !password) throw accessError('Enter your email and password.', 400);
    const { error } = await getClient().auth.signInWithPassword({ email: cleanEmail, password });
    if (error) throw accessError(error.status === 429 ? 'Too many attempts. Please wait before trying again.' : 'Unable to sign in. Check your email and password.', error.status || 401);
    const account = await current();
    if (!account) throw accessError('Please sign in again.', 401);
    return account;
  }

  async function logout() {
    const { error } = await getClient().auth.signOut({ scope: 'local' });
    if (error) throw accessError('Unable to log out. Check your connection and try again.', error.status || 503);
  }

  return { current, login, logout };
}

export const platformAuth = makePlatformAuth(getSupabase);
