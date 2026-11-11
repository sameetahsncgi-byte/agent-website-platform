import test from 'node:test';
import assert from 'node:assert/strict';
import { makeAgentsHandler } from '../api/platform/agents.js';
import { makeCompletionHandler } from '../api/platform/complete-onboarding.js';
import { appOrigin, validateAgent } from '../server/platform.js';
const owner='11111111-1111-1111-1111-111111111111';
const agent='22222222-2222-2222-2222-222222222222';
const requestId='44444444-4444-4444-4444-444444444444';
const env={APP_URL:'https://platform.example.com'};
const input={action:'create',name:'Jordan',email:'agent@example.com',slug:'jordan',requestId};
function fixture(options={}){
 const calls=[]; const records=options.records||[];
 const client={
  auth:{
   getUser:async token=>{calls.push(['verify',token]);return options.badToken?{error:{}}:{data:{user:{id:options.actor||owner,email_confirmed_at:options.unconfirmed?null:'2026-11-10',app_metadata:options.passwordSaved?{agent_onboarding_password_set:true}:{}}}};},
   admin:{
    createUser:async body=>{calls.push(['create',body]);return options.createError?{error:{}}:{data:{user:{id:agent,email:body.email}}};},
    getUserById:async id=>({data:{user:{id,email:'agent@example.com',email_confirmed_at:options.confirmed?'2026-11-10':null}}}),
    generateLink:async body=>{calls.push(['link',body]);return options.linkError?{error:{}}:{data:{user:{id:options.linkUser||agent},properties:{hashed_token:'a'.repeat(64)}}};},
    updateUserById:async(id,body)=>{calls.push(['password',id,body]);return {error:options.passwordError?{}:null};},
    deleteUser:async id=>{calls.push(['delete',id]);return {error:null};},
   },
  },
  from(table){
   const filters=[];
   function result(single=false){
    let data=table==='platform_admins'?[{user_id:options.actor||owner,active:options.admin!==false}]:records;
    if(options.missingMembership&&table==='platform_admins')data=[];
    for(const [key,value]of filters)data=data.filter(row=>row[key]===value);
    return{data:single?(data[0]||null):data,error:options.schemaError&&table==='agent_onboarding'?{}:null};
   }
   const q={select:()=>q,eq:(key,value)=>{filters.push([key,value]);return q;},order:()=>q,limit:()=>q,maybeSingle:async()=>result(true),then:(resolve,reject)=>Promise.resolve(result()).then(resolve,reject)};return q;
  },
  rpc:async(name,args)=>{
   calls.push(['rpc',name,args]);
   if(name==='complete_agent_onboarding')return options.activationError?{error:{}}:{data:'site-jordan'};
   if(options.provisionError)return{error:options.provisionError};
   records.push({user_id:agent,site_id:'site-jordan',name:args.p_name,email:args.p_email,site_slug:args.p_slug,status:'invited',request_id:args.p_request_id,created_by:args.p_admin_id});
   return{data:'site-jordan'};
  },
 };
 function req(body=input,extra={}){return{method:'POST',headers:{authorization:'Bearer valid-token',origin:env.APP_URL,'content-type':'application/json'},body,...extra};}
 async function run(handler,request){const res={headers:{},setHeader(k,v){this.headers[k]=v;},status(n){this.code=n;return this;},json(data){this.body=data;return this;}};await handler(request,res);return res;}
 return{client,calls,records,req,run,agents:makeAgentsHandler({getClient:()=>client,env}),completion:makeCompletionHandler({getClient:()=>client,env})};
}
test('verified administrator can provision and get a private link without sending email',async()=>{
 const f=fixture();const res=await f.run(f.agents,f.req({...input,p_admin_id:'attacker',userId:'attacker'}));
 assert.equal(res.body.websiteUrl,'https://jordan.brokerage.sncgi.com/');
 assert.equal(res.code,201);assert.match(res.body.onboardingUrl,/^https:\/\/platform.example.com\/#\/onboarding\?token_hash=/);
 assert.equal(res.headers['Cache-Control'],'no-store, private');
 assert.equal(f.calls.find(c=>c[0]==='rpc')[2].p_admin_id,owner);
 assert.equal(f.calls.find(c=>c[0]==='rpc')[2].p_user_id,agent);
 assert.deepEqual(f.calls.find(c=>c[0]==='create')[1],{email:'agent@example.com',email_confirm:false});
 assert.equal(f.calls.find(c=>c[0]==='link')[1].type,'invite');
});
test('missing tokens, invalid tokens and ordinary agents cannot provision or list accounts',async()=>{
 for(const options of [{badToken:true},{admin:false},{missingMembership:true}]){
  const f=fixture(options);const res=await f.run(f.agents,f.req());assert.ok([401,403].includes(res.code));assert.ok(!f.calls.some(c=>c[0]==='create'));
  const listed=await f.run(f.agents,f.req(undefined,{method:'GET'}));assert.ok([401,403].includes(listed.code));
 }
 const f=fixture();const res=await f.run(f.agents,f.req(input,{headers:{origin:env.APP_URL,'content-type':'application/json'}}));assert.equal(res.code,401);
});
test('cross-origin requests, oversized bodies and invalid handles are rejected',async()=>{
 const f=fixture();let res=await f.run(f.agents,f.req(input,{headers:{authorization:'Bearer valid-token',origin:'https://attacker.example','content-type':'application/json'}}));assert.equal(res.code,403);
 res=await f.run(f.agents,f.req({...input,name:'x'.repeat(9000)}));assert.equal(res.code,413);
 for(const slug of ['admin','a','BAD_SLUG','-start','end-']){
  res=await f.run(f.agents,f.req({...input,slug}));assert.equal(res.code,400);
 }
 assert.ok(!f.calls.some(c=>c[0]==='create'));
});
test('existing handles and existing auth accounts are not overwritten',async()=>{
 const f=fixture({records:[{site_slug:'jordan'}]});assert.equal((await f.run(f.agents,f.req())).code,409);assert.ok(!f.calls.some(c=>c[0]==='create'));
 const g=fixture({createError:true});assert.equal((await g.run(g.agents,g.req())).code,409);assert.ok(!g.calls.some(c=>c[0]==='rpc'||c[0]==='delete'));
});
test('retrying one request returns a new link for the same pending account',async()=>{
 const record={...input,user_id:agent,site_id:'site-jordan',site_slug:'jordan',status:'invited',request_id:requestId,created_by:owner};
 const f=fixture({records:[record]});assert.equal((await f.run(f.agents,f.req())).code,200);assert.ok(!f.calls.some(c=>c[0]==='create'));
 assert.equal((await f.run(f.agents,f.req({...input,name:'Changed'}))).code,409);
});
test('only pending accounts get replacement links; accepted unfinished accounts use recovery',async()=>{
 const record={user_id:agent,name:'Jordan',email:'agent@example.com',site_slug:'jordan',status:'invited'};
 const f=fixture({records:[record],confirmed:true});assert.equal((await f.run(f.agents,f.req({action:'regenerate',userId:agent}))).code,200);assert.equal(f.calls.find(c=>c[0]==='link')[1].type,'recovery');
 const g=fixture({records:[{...record,status:'active'}]});assert.equal((await g.run(g.agents,g.req({action:'regenerate',userId:agent}))).code,409);assert.ok(!g.calls.some(c=>c[0]==='link'));
});
test('database failures roll back only known newly created unprovisioned accounts',async()=>{
 const f=fixture({provisionError:{code:'23505'}});assert.equal((await f.run(f.agents,f.req())).code,409);assert.deepEqual(f.calls.find(c=>c[0]==='delete'),['delete',agent]);
 const g=fixture({provisionError:{message:'network timeout'}});assert.equal((await g.run(g.agents,g.req())).code,503);assert.ok(!g.calls.some(c=>c[0]==='delete'));
 const h=fixture({schemaError:true});assert.equal((await h.run(h.agents,h.req())).code,503);assert.ok(!h.calls.some(c=>c[0]==='create'));
});
test('failed link generation retains the pending account for a safe retry',async()=>{
 const f=fixture({linkError:true});const res=await f.run(f.agents,f.req());assert.equal(res.code,502);assert.equal(f.records.length,1);assert.ok(!f.calls.some(c=>c[0]==='delete'));assert.ok(!JSON.stringify(res.body).includes('a'.repeat(64)));
});
test('completion activates only the verified caller, ignoring a supplied user ID',async()=>{
 const records=[{user_id:agent,site_id:'site-jordan',status:'invited'}];
 const f=fixture({actor:agent,admin:false,records});const res=await f.run(f.completion,f.req({userId:owner,password:'A-long-test-password'}));assert.equal(res.code,200);assert.deepEqual(f.calls.find(c=>c[0]==='rpc')[2],{p_user_id:agent});assert.equal(f.calls.find(c=>c[0]==='password')[1],agent);
 const g=fixture({badToken:true});assert.equal((await g.run(g.completion,g.req({}))).code,401);assert.ok(!g.calls.some(c=>c[0]==='rpc'));
 const h=fixture({actor:agent,records,activationError:true,passwordSaved:true});const failed=await h.run(h.completion,h.req({}));assert.equal(failed.code,403);assert.equal(failed.body.passwordSaved,true);
});
test('configuration rejects unsafe invitation origins and validates the request ID',()=>{
 for(const APP_URL of ['http://platform.example.com','https://platform.example.com/#/home','https://user:pass@example.com','https://example.com/path'])assert.throws(()=>appOrigin({APP_URL}));
 assert.equal(appOrigin({APP_URL:'https://platform.example.com/'}),env.APP_URL);
 assert.throws(()=>validateAgent({...input,requestId:'invalid'}));
});

test('password setup cannot modify unrelated or already activated accounts',async()=>{
 const f=fixture();assert.equal((await f.run(f.completion,f.req({password:'long-test-password'}))).code,403);assert.ok(!f.calls.some(c=>c[0]==='password'));
 const records=[{user_id:agent,site_id:'site-jordan',status:'active'}];
 const g=fixture({actor:agent,records});assert.equal((await g.run(g.completion,g.req({password:'long-test-password'}))).code,200);assert.ok(!g.calls.some(c=>c[0]==='password'));
 const h=fixture({actor:agent,records:[{...records[0],status:'invited'}],unconfirmed:true});assert.equal((await h.run(h.completion,h.req({password:'long-test-password'}))).code,403);assert.ok(!h.calls.some(c=>c[0]==='password'));
});
