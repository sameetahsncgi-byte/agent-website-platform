import test from 'node:test';import assert from 'node:assert/strict';
import {publishSeo,editableSeo} from '../src/services/seoPublish.js';import {defaultSeo} from '../src/services/seo.js';
function fixture(options={}){
 let saved={site_id:'site-one',...defaultSeo('about')};const calls=[];
 const client={auth:{getUser:async()=>({data:{user:{id:'user-one'}}})},from(table){const q={select:()=>q,eq:()=>q,maybeSingle:async()=>table==='agent_profiles'?{data:{site_id:options.wrongAccount?'site-two':'site-one',role:'agent',active:true}}:options.readError?{error:{message:'offline'}}:{data:options.noReadRow?null:{...saved}}};return q;},rpc:async(name,args)=>{calls.push([name,args]);if(options.timeout)return new Promise(()=>{});if(options.rpcError)return {error:{code:'42501'}};saved={...args.p_values,page_key:args.p_page_key,updated_at:'new timestamp',defaults_initialized:true};if(options.rewrite)saved.title='Old database default';return {data:{...saved}};}};
 return {client,calls};
}
test('publishing confirms the committed row and sends the expected site context',async()=>{
 const f=fixture(),draft={...defaultSeo('about'),title:'New search title',social_title:'New social title'};
 const row=await publishSeo(f.client,'site-one',draft);assert.equal(row.title,draft.title);assert.equal(row.social_title,draft.social_title);assert.equal(f.calls[0][1].p_values.site_id,'site-one');
});
test('cleared text remains blank through save/read verification',async()=>{
 const f=fixture(),draft={...defaultSeo('about'),title:'',description:'',social_title:'',social_description:''};
 const row=await publishSeo(f.client,'site-one',draft);assert.equal(row.title,'');assert.equal(row.description,'');
});
test('a database refill is reported instead of falsely marking the draft published',async()=>{
 const f=fixture({rewrite:true});await assert.rejects(publishSeo(f.client,'site-one',{...defaultSeo('about'),title:''}),e=>e.saveMayHaveSucceeded===true && e.savedRow.title==='Old database default' && /different SEO values/.test(e.message));
});
test('failed readback does not falsely confirm a save or claim no save occurred',async()=>{
 for(const options of [{readError:true},{noReadRow:true}])await assert.rejects(publishSeo(fixture(options).client,'site-one',defaultSeo('about')),e=>e.saveMayHaveSucceeded===true && /could not be confirmed/.test(e.message));
});
test('an account switch is rejected before any write',async()=>{
 const f=fixture({wrongAccount:true});await assert.rejects(publishSeo(f.client,'site-one',defaultSeo('about')),/account changed/);assert.equal(f.calls.length,0);
});
test('a stalled save stops the waiting state and leaves confirmation uncertain',async()=>{
 const f=fixture({timeout:true});await assert.rejects(publishSeo(f.client,'site-one',defaultSeo('about'),{timeoutMs:10}),e=>e.saveMayHaveSucceeded===true && /timed out/.test(e.message));
});
test('dirty comparison ignores timestamps but includes search and social edits',()=>{
 const base=defaultSeo('about');assert.deepEqual(editableSeo({...base,updated_at:'a'}),editableSeo({...base,updated_at:'b',defaults_initialized:true}));assert.notDeepEqual(editableSeo(base),editableSeo({...base,social_title:'Changed'}));
});
