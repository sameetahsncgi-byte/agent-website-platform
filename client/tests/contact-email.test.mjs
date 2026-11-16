import test from 'node:test';
import assert from 'node:assert/strict';
import {makeContactHandler} from '../server/contact.js';

function fixture(options={}){
 const calls=[],emails=[];
 const env={SUPABASE_URL:'https://db.example.com',SUPABASE_SECRET_KEY:'secret-test',RESEND_API_KEY:'re-test',CONTACT_FROM_EMAIL:'forms@notify.example.com',TURNSTILE_SECRET_KEY:'ts-test',...options.env};
 const client={rpc:async(name,args)=>{
  calls.push([name,args]);
  if(options.dbError)return {error:{message:'private error'}};
  return {data:name==='resolve_agent_hostname'?(options.unknown?null:'site-yasir'):name==='agent_website_is_active'?!options.disabled:!options.limited};
 },from:()=>{const q={select:()=>q,eq:(field,id)=>{calls.push(['content',id]);return q;},maybeSingle:async()=>({data:{email:options.recipient??'agent@example.com',name:'Yasir'}})};return q;}};
 const fetcher=async(url,request)=>{
  if(url.includes('siteverify'))return {ok:true,json:async()=>({success:!options.bot,hostname:options.wrongHost?'other.example.com':'yasir.brokerage.sncgi.com',action:options.wrongAction?'login':'contact'})};
  emails.push(JSON.parse(request.body));
  if(options.networkError)throw Error('private network error');
  return {ok:!options.mailError,json:async()=>options.mailError?{message:'private provider error'}:{id:'email-id'}};
 };
 const handler=makeContactHandler({env,getClient:()=>client,fetcher});
 const req={method:'POST',url:'/api/contact',headers:{host:'yasir.brokerage.sncgi.com',origin:'https://yasir.brokerage.sncgi.com','content-type':'application/json','x-forwarded-for':'192.0.2.1'},body:{name:'Visitor',email:'visitor@example.com',phone:'',interest:'Buying a home',message:'I would like to arrange a viewing.',token:'verified-token',company:''}};
 const res={headers:{},setHeader(k,v){this.headers[k]=v;},status(code){this.statusCode=code;return this;},json(value){this.body=value;return this;}};
 return {req,res,calls,emails,run:()=>handler(req,res)};
}
test('contact routes to the saved agent email and replies go to the visitor',async()=>{
 const f=fixture();f.req.body.to='attacker@example.com';f.req.body.siteId='site-other';await f.run();
 assert.equal(f.res.statusCode,200);assert.deepEqual(f.emails[0].to,['agent@example.com']);assert.equal(f.emails[0].reply_to,'visitor@example.com');
 assert.ok(f.calls.some(([name,id])=>name==='content' && id==='site-yasir'));
 const quota=f.calls.find(([name])=>name==='consume_contact_quota')[1];assert.match(quota.p_ip_hash,/^[a-f0-9]{64}$/);assert.ok(!JSON.stringify(quota).includes('192.0.2.1'));
});
test('an agent contact email change is used by the next request',async()=>{const f=fixture({recipient:'new-agent@example.org'});await f.run();assert.deepEqual(f.emails[0].to,['new-agent@example.org']);});
for(const [name,options,status] of [
 ['unknown hostname',{unknown:true},404],['disabled website',{disabled:true},404],['database failure',{dbError:true},503],
 ['invalid recipient',{recipient:'not-an-email'},503],['failed bot check',{bot:true},400],['wrong token hostname',{wrongHost:true},400],['wrong token action',{wrongAction:true},400],['quota exhausted',{limited:true},429],
 ['missing email configuration',{env:{RESEND_API_KEY:''}},503]
])test(`${name} never sends email`,async()=>{const f=fixture(options);await f.run();assert.equal(f.res.statusCode,status);assert.equal(f.emails.length,0);});
test('provider and network failures never display a false success or expose provider errors',async()=>{
 for(const option of [{mailError:true},{networkError:true}]){const f=fixture(option);await f.run();assert.equal(f.res.statusCode,503);assert.ok(!f.res.body.ok);assert.ok(!f.res.body.error.includes('private'));}
});
test('validation rejects header injection, short message, oversize body, missing token and honeypot',async()=>{
 for(const change of [{email:'a@example.com\r\nBcc: x@example.com'},{name:'Hello\nBcc:'},{message:'short'},{message:'a'.repeat(9000)},{token:''},{company:'spam'}]){
  const f=fixture();Object.assign(f.req.body,change);await f.run();assert.ok([400,413].includes(f.res.statusCode));assert.equal(f.emails.length,0);
 }
});
test('cross-origin and unsupported methods fail before database or mail access',async()=>{
 const f=fixture();f.req.headers.origin='https://other.example.com';await f.run();assert.equal(f.res.statusCode,403);assert.equal(f.calls.length,0);
 const g=fixture();g.req.method='GET';await g.run();assert.equal(g.res.statusCode,405);assert.equal(g.calls.length,0);
});
test('missing trusted IP fails closed',async()=>{const f=fixture();delete f.req.headers['x-forwarded-for'];await f.run();assert.equal(f.res.statusCode,503);assert.equal(f.emails.length,0);});
