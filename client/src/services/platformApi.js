import { getSupabase } from './supabase.js';
import { getAdminSupabase } from './adminSupabase.js';
export function makeSessionRequest(getClient, fetchRequest = fetch) {
  return async function request(path, body) {
    const { data, error } = await getClient().auth.getSession();
    if (error || !data.session) throw Error('Your session expired. Please sign in again.');
    let response;
    try {
      response = await fetchRequest(path, {
        method: body === undefined ? 'GET' : 'POST',
        headers: { Authorization: `Bearer ${data.session.access_token}`, ...(body === undefined ? {} : { 'Content-Type': 'application/json' }) },
        body: body === undefined ? undefined : JSON.stringify(body),
        cache: 'no-store',
        credentials: 'omit',
      });
    } catch { throw Error('Unable to reach the server. Check your connection and retry.'); }
    const result = await response.json().catch(() => null);
    if (!response.ok) {
      const failure = Error(result?.error || 'The server could not complete this request.');
      failure.passwordSaved = result?.passwordSaved === true;
      throw failure;
    }
    if (!result) throw Error('Unexpected server response. Make sure the API files were deployed.');
    return result;
  }
}

// Onboarding uses the agent session; platform management uses the administrator session.
export const platformRequest = makeSessionRequest(getSupabase);
export const adminPlatformRequest = makeSessionRequest(getAdminSupabase);
