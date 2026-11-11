import test from 'node:test';
import assert from 'node:assert/strict';
import { makeSubdomainRename, normalizeSubdomain } from '../src/services/subdomainRename.js';
test('agent rename calls only the authenticated self-service RPC with a normalized handle', async()=>{
  const calls=[];
  const rename=makeSubdomainRename(()=>({rpc:async(name,args)=>{calls.push([name,args]);return {data:{site_id:'site-original',subdomain_slug:args.p_slug,hostname:args.p_slug+'.brokerage.sncgi.com',enabled:false}}}}));
  const result=await rename(' Rizz-Sabbir ');
  assert.deepEqual(calls,[['rename_my_subdomain',{p_slug:'rizz-sabbir'}]]);
  assert.equal(result.site_id,'site-original');assert.equal(result.enabled,false);
});
test('invalid handles never call Supabase and conflict errors are understandable',async()=>{
  let calls=0;
  const rename=makeSubdomainRename(()=>({rpc:async()=>{calls++;return {error:{code:'23505',message:'private database details'}}}}));
  for(const value of ['ab','name--test','name.example.com','https://example.com','-name','name-','a'.repeat(41)]){
    assert.throws(()=>normalizeSubdomain(value));await assert.rejects(rename(value),/Use 3/);
  }
  assert.equal(calls,0);
  await assert.rejects(rename('taken-name'),/already used or reserved/);
  for(const [code,message]of [['42501',/active agent/],['22023',/reserved/],['PGRST202',/setup-editable-subdomains.sql/]]){
    await assert.rejects(makeSubdomainRename(()=>({rpc:async()=>({error:{code}})}))('valid-name'),message);
  }
});

test('database domain lock rejection shows the exact support message',async()=>{
  await assert.rejects(makeSubdomainRename(()=>({rpc:async()=>({error:{code:'P0423'}})}))('new-name'),/^Error: Domain is locked\. Please contact support\.$/);
});
