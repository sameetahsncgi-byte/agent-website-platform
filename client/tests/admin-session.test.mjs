import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { makeSessionRequest } from '../src/services/platformApi.js';

test('admin and onboarding requests send only their own session token', async () => {
  const tokens = [];
  const fetchRequest = async (_path, options) => {
    tokens.push(options.headers.Authorization);
    return { ok: true, json: async () => ({ ok: true }) };
  };
  const client = token => ({ auth: { getSession: async () => ({ data: { session: token ? { access_token: token } : null } }) } });
  const adminRequest = makeSessionRequest(() => client('admin-token'), fetchRequest);
  const agentRequest = makeSessionRequest(() => client('agent-token'), fetchRequest);
  await adminRequest('/api/platform/agents');
  await agentRequest('/api/platform/complete-onboarding', { password: 'test-password-only' });
  assert.deepEqual(tokens, ['Bearer admin-token', 'Bearer agent-token']);
  await assert.rejects(makeSessionRequest(() => client(null), fetchRequest)('/api/platform/agents'), /session expired/);
  assert.equal(tokens.length, 2);
});

test('admin SDK initializes with a different storage key and reuses its own client', async () => {
  let source = await readFile(new URL('../src/services/adminSupabase.js', import.meta.url), 'utf8');
  source = source.replace("import { createClient } from '@supabase/supabase-js';", 'const createClient = (url, key, options) => ({ url, key, options });')
    .replaceAll('import.meta.env.VITE_SUPABASE_URL', "'https://example.supabase.co'")
    .replaceAll('import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY', "'sb_publishable_test'");
  const { getAdminSupabase } = await import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`);
  const admin = getAdminSupabase();
  assert.equal(getAdminSupabase(), admin);
  assert.equal(admin.options.auth.storageKey, 'agent-platform-super-admin-auth-v1');
  assert.equal(admin.options.auth.detectSessionInUrl, false);
  const agentSource = await readFile(new URL('../src/services/supabase.js', import.meta.url), 'utf8');
  assert.equal(agentSource.includes(admin.options.auth.storageKey), false);
});
