import test from 'node:test';
import assert from 'node:assert/strict';
import { defaultAgentHostname, defaultAgentUrl } from '../src/services/agentSubdomains.js';
import { validateAgent } from '../server/platform.js';
test('chosen handles generate deterministic brokerage addresses', () => {
  assert.equal(defaultAgentUrl('yasir'), 'https://yasir.brokerage.sncgi.com/');
  assert.equal(defaultAgentHostname('musa-raza'), 'musa-raza.brokerage.sncgi.com');
  for (const slug of ['ya', 'Yasir', '-yasir', 'yasir-', 'a'.repeat(41), 'yasir/other', 'yasir--fareed']) assert.throws(() => defaultAgentHostname(slug), /Invalid/);
});
test('provisioning rejects handles that would break website ID routing', () => {
  assert.throws(() => validateAgent({name:'Yasir',email:'yasir@example.com',slug:'yasir--fareed',requestId:'11111111-1111-4111-8111-111111111111'}), /website handle/);
});
