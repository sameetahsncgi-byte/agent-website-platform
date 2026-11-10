import test from 'node:test';
import assert from 'node:assert/strict';
import { makePlatformAuth } from '../src/services/platformAuth.js';
function fixture(options = {}) {
  const calls = [];
  const user = { id:'verified-user', email:'owner@example.com' };
  const client = {
    auth: {
      getSession:async()=>({data:{session: options.noSession ? null : {user:{id:'untrusted-local-user'}}}}),
      getUser:async()=>{calls.push('verified');return {data:{user},error:options.userError};},
      signInWithPassword:async body=>{calls.push(body);return {error:options.loginError};},
      signOut:async body=>{calls.push(body);return {error:options.logoutError};},
    },
    from(table){
      calls.push(table);
      const query={select:()=>query,eq:(key,value)=>{calls.push([key,value]);return query;},maybeSingle:async()=>({data: options.member === undefined ? {user_id:user.id,active:true} : options.member,error:options.memberError})};
      return query;
    },
  };
  return { auth:makePlatformAuth(()=>client),calls };
}
test('only a verified active platform administrator gets access',async()=>{
  const {auth,calls}=fixture();
  assert.deepEqual(await auth.current(),{id:'verified-user',email:'owner@example.com'});
  assert.ok(calls.includes('verified'));
  assert.ok(calls.includes('platform_admins'));
  assert.ok(calls.some(call=>Array.isArray(call)&&call[0]==='user_id'&&call[1]==='verified-user'));
});
test('no session does not query private membership',async()=>{
  const {auth,calls}=fixture({noSession:true});
  assert.equal(await auth.current(),null);assert.equal(calls.length,0);
});
test('agent accounts, disabled membership and mismatched membership are denied',async()=>{
  for(const member of [null,{user_id:'verified-user',active:false},{user_id:'other',active:true}]) {
    await assert.rejects(fixture({member}).auth.current(),error=>error.status===403);
  }
});
test('verification and membership errors do not grant access',async()=>{
  await assert.rejects(fixture({userError:{message:'invalid'}}).auth.current(),error=>error.status===401);
  await assert.rejects(fixture({memberError:{message:'missing table'}}).auth.current(),error=>error.status===503);
});
test('login verifies membership and preserves password characters',async()=>{
  const {auth,calls}=fixture();await auth.login(' owner@example.com ',' password with spaces ');
  assert.deepEqual(calls[0],{email:'owner@example.com',password:' password with spaces '});
  await assert.rejects(fixture({member:null}).auth.login('agent@example.com','password'),error=>error.status===403);
});
test('sign-in rate limits and failed logout are surfaced',async()=>{
  await assert.rejects(fixture({loginError:{status:429}}).auth.login('owner@example.com','password'),/Too many attempts/);
  await assert.rejects(fixture({logoutError:{status:503}}).auth.logout(),/Unable to log out/);
  const {auth,calls}=fixture();await auth.logout();assert.deepEqual(calls[0],{scope:'local'});
});
