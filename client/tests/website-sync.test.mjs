import test from 'node:test';
import assert from 'node:assert/strict';
import { watchWebsiteSettings, notifyWebsiteSettingsChanged } from '../src/services/websiteSync.js';
import { makeAuthRequest } from '../src/services/auth.js';
test('dashboard sync refreshes on local changes, other tabs, focus and visible polling, then cleans up',()=>{
  const previousWindow=globalThis.window,previousDocument=globalThis.document;
  const window=new EventTarget();let tick,cleared=false,stored;
  window.setInterval=callback=>{tick=callback;return 7;};window.clearInterval=id=>{cleared=id===7;};
  window.localStorage={setItem:(key,value)=>{stored={key,value};}};
  globalThis.window=window;globalThis.document={visibilityState:'visible'};
  try{
    let count=0;const stop=watchWebsiteSettings(()=>count++);
    notifyWebsiteSettingsChanged();assert.equal(count,1);assert.equal(stored.key,'agent-website-settings-changed');
    const event=new Event('storage');Object.defineProperty(event,'key',{value:stored.key});window.dispatchEvent(event);assert.equal(count,2);
    window.dispatchEvent(new Event('focus'));tick();assert.equal(count,4);
    globalThis.document.visibilityState='hidden';tick();assert.equal(count,4);
    stop();window.dispatchEvent(new Event('focus'));assert.equal(count,4);assert.equal(cleared,true);
  }finally{globalThis.window=previousWindow;globalThis.document=previousDocument;}
});
test('agent settings reload returns the same current hostname and lock shown in Super Admin',async()=>{
  const settings={hostname:'first.brokerage.sncgi.com',subdomain_slug:'first',domain_locked:false,enabled:true};
  const client={auth:{getSession:async()=>({data:{session:{}}}),getUser:async()=>({data:{user:{id:'owner'}}})},from(table){const query={select:()=>query,eq:()=>query,maybeSingle:async()=>({data:table==='agent_profiles'?{agent_id:'agent',name:'Owner',site_id:'site-stable',role:'agent',active:true}:settings})};return query;}};
  const request=makeAuthRequest(()=>client);
  const initial=(await request('/api/admin/me')).agent;assert.equal(initial.domainLocked,false);
  Object.assign(settings,{hostname:'changed.brokerage.sncgi.com',subdomain_slug:'changed',domain_locked:true});
  const current=(await request('/api/admin/me')).agent;
  assert.equal(current.siteId,initial.siteId);assert.equal(current.hostname,'changed.brokerage.sncgi.com');assert.equal(current.subdomainSlug,'changed');assert.equal(current.domainLocked,true);
});
