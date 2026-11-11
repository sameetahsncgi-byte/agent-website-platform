import test from 'node:test';
import assert from 'node:assert/strict';
import { makeWebsitesHandler } from '../api/platform/websites.js';
import { makePublicWebsiteLoader } from '../src/services/publicWebsite.js';
import { agentWebsiteHref } from '../src/services/siteRouting.js';
import { normalizeHostname } from '../src/services/hostnames.js';
function fixture(options = {}) {
  const writes = []; const rpcCalls = [];
  const settings = { domain_locked: options.locked===true, publish_before_onboarding: true, site_id: 'site-yasir-fareed', enabled: true, subdomain_slug: 'yasir-fareed', hostname: 'yasir-agent-website-platform.vercel.app' };
  const profiles = [{ site_id: settings.site_id, name: 'Yasir Fareed', active: !options.pending, role: 'agent' }, { site_id: 'site-original', name: 'Original Agent', active: true, role: 'agent' }];
  const client = {
    rpc:async(name,args)=>{
      rpcCalls.push([name,args]);
      if(name==='set_agent_domain_lock'){settings.domain_locked=args.p_locked;return {data:{...settings}};}
      if(options.duplicate)return {error:{code:'23505'}};
      Object.assign(settings,{subdomain_slug:args.p_slug,hostname:args.p_slug+'.brokerage.sncgi.com'});
      return {data:{...settings}};
    },
    auth: { getUser: async () => options.invalid ? { error: {} } : { data: { user: { id: 'admin' } } } },
    from(table) {
      const filters = []; let update;
      const result = single => {
        if (update) { writes.push(update); if (options.duplicate) return { error: { code: '23505' } }; Object.assign(settings, update); }
        let data = table === 'platform_admins' ? [{ user_id: 'admin', active: !options.notAdmin }] : table === 'agent_profiles' ? profiles : table === 'agent_onboarding' ? [{site_id: settings.site_id, site_slug:'yasir-fareed', status: options.pending ? 'invited' : 'active'}] : [settings];
        for (const [key, value] of filters) data = data.filter(row => row[key] === value);
        return { data: single ? data[0] || null : data };
      };
      const q = { select: () => q, eq: (key, value) => { filters.push([key, value]); return q; }, order: () => q, limit: () => q,
        upsert: async (row, config) => { assert.equal(config.ignoreDuplicates, true); assert.deepEqual(row, { site_id: settings.site_id }); return {}; },
        update: value => { update = value; return q; }, maybeSingle: async () => result(true), then: (resolve, reject) => Promise.resolve(result(false)).then(resolve, reject) };
      return q;
    },
  };
  const handler = makeWebsitesHandler({ getClient: () => client, env: { APP_URL: 'https://agent-website-platform.vercel.app' } });
  return { writes, rpcCalls, settings, async run(body, extra = {}) {
    const req = { method: 'POST', headers: { authorization: 'Bearer verified', origin: 'https://agent-website-platform.vercel.app', 'content-type': 'application/json' }, body, ...extra };
    const res = { setHeader() {}, status(n) { this.code = n; return this; }, json(body) { this.body = body; return this; } };
    await handler(req, res); return res;
  } };
}
test('website control endpoints reject ordinary agents, expired tokens and cross-origin writes', async () => {
  for (const options of [{ notAdmin: true }, { invalid: true }]) {
    const f = fixture(options);
    assert.ok([401, 403].includes((await f.run({ action: 'set-enabled', siteId: 'site-yasir-fareed', enabled: false })).code));
    assert.ok([401, 403].includes((await f.run(undefined, { method: 'GET' })).code));
    assert.equal(f.writes.length, 0);
  }
  const f = fixture();
  assert.equal((await f.run({}, { headers: { authorization: 'Bearer verified', origin: 'https://evil.example', 'content-type': 'application/json' } })).code, 403);
});
test('disabling a website preserves hostname, profile and original agents are listed', async () => {
  const f = fixture();
  const res = await f.run({ action: 'set-enabled', siteId: 'site-yasir-fareed', enabled: false });
  assert.equal(res.code, 200); assert.equal(f.settings.enabled, false);
  assert.equal(f.settings.hostname, 'yasir-agent-website-platform.vercel.app');
  assert.deepEqual(Object.keys(f.writes[0]).sort(), ['enabled', 'updated_at']);
  const list = await f.run(undefined, { method: 'GET' });
  assert.equal(list.body.websites.length, 2);
  assert.equal(list.body.websites[1].enabled, true);
  assert.equal(list.body.websites[0].active, true);
});
test('hostnames are normalized, duplicates rejected, and removal actions are rejected', async () => {
  const f = fixture(); f.settings.enabled = false;
  assert.equal((await f.run({ action: 'set-hostname', siteId: 'site-yasir-fareed', hostname: ' YASIR.EXAMPLE.COM ' })).code, 200);
  assert.equal(f.settings.hostname, 'yasir.example.com'); assert.equal(f.settings.enabled, false);
  assert.equal((await f.run({ action: 'remove-hostname', siteId: 'site-yasir-fareed' })).code, 400);
  assert.equal(f.settings.hostname, 'yasir.example.com'); assert.equal(f.settings.enabled, false);
  assert.equal((await f.run({action:'set-hostname',siteId:'site-yasir-fareed',hostname:''})).code,400);
  assert.equal(f.writes.length,1);
  assert.equal((await fixture({ duplicate: true }).run({ action: 'set-hostname', siteId: 'site-yasir-fareed', hostname: 'taken.example.com' })).code, 409);
  for (const hostname of ['agent-website-platform.vercel.app', 'vercel.app', 'https://yasir.com', 'yasir.com/#/home', '*.yasir.com', 'evil.com:80', 'a@evil.com']) {
    assert.equal((await fixture().run({ action: 'set-hostname', siteId: 'site-yasir-fareed', hostname })).code, 400);
  }
  assert.equal(normalizeHostname('YASIR.COM'), 'yasir.com');
});
function publicFixture({ mapped = 'site-yasir-fareed', enabled = true, rpcError = false } = {}) {
  const calls = [];
  const load = makePublicWebsiteLoader({ defaultSiteId: 'site-agent001', platformHostname: 'agent-website-platform.vercel.app',
    getClient: () => ({ rpc: async (name, args) => { calls.push([name, args]); return { data: name === 'resolve_agent_hostname' ? mapped : enabled, error: rpcError ? {} : null }; } }),
    loadContent: async siteId => { calls.push(['content', siteId]); return { exists: true, content: { name: siteId } }; },
  });
  return { load, calls };
}
test('agent hostnames select only their mapped site and ignore query overrides', async () => {
  const f = publicFixture();
  const data = await f.load({ subdomain_slug: 'yasir-fareed', hostname: 'yasir-agent-website-platform.vercel.app', search: '?site=site-other' });
  assert.equal(data.siteId, 'site-yasir-fareed');
  assert.deepEqual(f.calls.at(-1), ['content', 'site-yasir-fareed']);
  assert.equal((await publicFixture().load({ hostname: 'agent-website-platform.vercel.app', search: '?site=site-jorden-muse' })).siteId, 'site-jorden-muse');
});
test('disabled query links, unknown hostnames and lookup failures never load another agent', async () => {
  for (const location of [{ hostname: 'agent-website-platform.vercel.app', search: '?site=site-yasir-fareed' }, { subdomain_slug: 'yasir-fareed', hostname: 'yasir-agent-website-platform.vercel.app', search: '' }]) {
    const f = publicFixture({ enabled: false }); assert.equal((await f.load(location)).exists, false); assert.ok(!f.calls.some(row => row[0] === 'content'));
  }
  const f = publicFixture({ mapped: null });
  assert.equal((await f.load({ hostname: 'unknown.example.com', search: '' })).exists, false);
  assert.equal(f.calls.length, 1);
  await assert.rejects(publicFixture({ rpcError: true }).load({ hostname: 'unknown.example.com', search: '' }), /Unable to resolve/);
});
test('dashboard links use assigned hostnames or the platform origin, never a different agent hostname', () => {
  const location = { hostname: 'other-agent.example.com', origin: 'https://other-agent.example.com' };
  assert.equal(agentWebsiteHref({ siteId: 'site-yasir-fareed', subdomain_slug: 'yasir-fareed', hostname: 'yasir-agent-website-platform.vercel.app' }, 'contact', location), 'https://yasir-agent-website-platform.vercel.app/#/contact');
  assert.equal(agentWebsiteHref({ siteId: 'site-yasir-fareed' }, 'home', location), 'https://agent-website-platform.vercel.app/?site=site-yasir-fareed#/home');
});

test('website management distinguishes a publicly live starter from pending editor access', async () => {
  const res = await fixture({pending:true}).run(undefined, {method:'GET'});
  assert.equal(res.code,200);
  assert.equal(res.body.websites[0].active,false);
  assert.equal(res.body.websites[0].publicEligible,true);
  assert.equal(res.body.websites[0].defaultHostname,'yasir-fareed.brokerage.sncgi.com');
});

test('Super Admin hostname changes use the atomic rename operation and verified actor',async()=>{
  const f=fixture();
  const result=await f.run({action:'set-hostname',siteId:'site-yasir-fareed',hostname:'RIZZ-SABBIR.brokerage.sncgi.com',p_actor:'forged'});
  assert.equal(result.code,200);
  assert.deepEqual(f.rpcCalls,[['set_agent_brokerage_hostname',{p_site_id:'site-yasir-fareed',p_slug:'rizz-sabbir',p_actor:'admin'}]]);
  assert.equal(f.writes.length,0);
  assert.equal(result.body.website.defaultHostname,'rizz-sabbir.brokerage.sncgi.com');
  const reread=await f.run(undefined,{method:'GET'});
  assert.equal(reread.body.websites[0].hostname,result.body.website.hostname);
  assert.equal(reread.body.websites[0].subdomainSlug,'rizz-sabbir');
  assert.equal((await fixture({duplicate:true}).run({action:'set-hostname',siteId:'site-yasir-fareed',hostname:'taken.brokerage.sncgi.com'})).code,409);
});

test('domain locks use a verified Super Admin actor and reject unauthorized callers',async()=>{
  const f=fixture();
  let result=await f.run({action:'set-domain-locked',siteId:'site-yasir-fareed',locked:true,p_actor:'forged'});
  assert.equal(result.code,200);assert.equal(result.body.website.domainLocked,true);
  assert.deepEqual(f.rpcCalls[0],['set_agent_domain_lock',{p_site_id:'site-yasir-fareed',p_locked:true,p_actor:'admin'}]);
  assert.equal(f.writes.length,0);
  result=await f.run(undefined,{method:'GET'});assert.equal(result.body.websites[0].domainLocked,true);
  result=await f.run({action:'set-domain-locked',siteId:'site-yasir-fareed',locked:false});assert.equal(result.body.website.domainLocked,false);
  assert.equal((await f.run({action:'set-domain-locked',siteId:'site-yasir-fareed',locked:'false'})).code,400);
  const agent=fixture({notAdmin:true});
  assert.equal((await agent.run({action:'set-domain-locked',siteId:'site-yasir-fareed',locked:false})).code,403);
  assert.equal(agent.rpcCalls.length,0);
});
