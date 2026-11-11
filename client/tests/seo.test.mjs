import test from 'node:test';import assert from 'node:assert/strict';
import {makeSeoSiteHandler} from '../server/seoSite.js';
import {seoPages,validateSeo,escapeHtml,safeJson} from '../src/services/seo.js';
import {renderSite} from '../.server/entry-server.js';
const pages=seoPages([{page_key:'about',slug:'meet-your-agent',title:'Meet & greet <agent>',description:'A unique agent description.'},{page_key:'sold-listings',slug:'sold-listings',noindex:true}]);
function fixture({inactive=false,error=false}={}){
 const calls=[];
 const client={rpc:async(name,args)=>{calls.push([name,args]);return error?{error:{}}:{data:name==='resolve_agent_hostname'?args.requested_hostname==='one.example.com'?'site-one':args.requested_hostname==='two.example.com'?'site-two':null:name==='agent_website_is_active'?!inactive:args.requested_site==='site-one'?'one.example.com':'two.example.com'};},from(table){let site;const q={select:()=>q,eq:(key,value)=>{site=value;return q;},maybeSingle:async()=>({data:{site_id:site,name:site==='site-one'?'Agent One':'Agent Two',location:'Atlanta',bio:'Local expertise',email:'agent@example.com',phone:'123',hero_overlay:25,about_intro:'Distinct introduction'}}),then(resolve){return Promise.resolve({data:table==='agent_page_seo'?pages:[{slug:'about',page_key:'about'}]}).then(resolve);}};return q;}};
 const handler=makeSeoSiteHandler({getClient:()=>client,render:renderSite,template:async()=>'<html><head><title>Default</title></head><body><div id="root"></div></body></html>'});
 return {calls,async run(url='/',host='one.example.com',method='GET'){const res={headers:{},setHeader(key,value){this.headers[key]=value;},status(n){this.code=n;return this;},send(body){this.body=body;return this;},end(){this.body='';return this;}};await handler({url,method,headers:{host}},res);return res;}};
}
test('SEO validation blocks reserved slugs and scripts serialize safely',()=>{
 for(const slug of ['admin','onboarding','api','Bad Path','../about'])assert.throws(()=>validateSeo({page_key:'about',slug}));
 assert.equal(validateSeo({page_key:'home',slug:'anything'}).slug,'');
 assert.equal(escapeHtml('<script>'), '&lt;script&gt;');assert.ok(!safeJson({x:'</script><script>alert(1)</script>'}).includes('<'));
});
test('HTML contains tenant-specific rendered content and escaped metadata before JavaScript',async()=>{
 const one=await fixture().run('/meet-your-agent');assert.equal(one.code,200);
 assert.match(one.body,/<title>Meet &amp; greet &lt;agent&gt;<\/title>/);assert.match(one.body,/Hello, I/);assert.match(one.body,/Agent One/);assert.match(one.body,/canonical" href="https:\/\/one.example.com\/meet-your-agent/);assert.ok(!one.body.includes('Agent Two'));
 const two=await fixture().run('/meet-your-agent','two.example.com');assert.equal(two.code,200);assert.match(two.body,/Agent Two/);assert.ok(!two.body.includes('Agent One'));
});
test('old page slugs permanently redirect directly to the current slug',async()=>{
 const result=await fixture().run('/api/site?path=about');assert.equal(result.code,308);assert.equal(result.headers.Location,'/meet-your-agent');
 assert.equal((await fixture().run('/meet-your-agent/')).headers.Location,'/meet-your-agent');
});
test('sitemap is tenant scoped and excludes noindex pages and old routes',async()=>{
 const result=await fixture().run('/sitemap.xml');assert.equal(result.code,200);assert.match(result.body,/one.example.com\/meet-your-agent/);assert.ok(!result.body.includes('sold-listings'));assert.ok(!result.body.includes('two.example.com'));assert.ok(!result.body.includes('/about<'));
 const noindex=await fixture().run('/sold-listings');assert.equal(noindex.headers['X-Robots-Tag'],'noindex');assert.match(noindex.body,/content="noindex,follow"/);
});
test('unknown/disabled sites and pages fail closed; agent query overrides are ignored',async()=>{
 assert.equal((await fixture().run('/','unknown.example.com')).code,404);assert.equal((await fixture({inactive:true}).run()).code,404);assert.equal((await fixture({error:true}).run()).code,503);assert.equal((await fixture().run('/missing-page')).code,404);
 const result=await fixture().run('/?site=site-two');assert.match(result.body,/Agent One/);assert.ok(!result.body.includes('Agent Two'));
});
test('private routes emit noindex without loading public or admin account data',async()=>{
 const f=fixture();const result=await f.run('/super-admin','agent-website-platform.vercel.app');assert.equal(result.code,200);assert.equal(result.headers['X-Robots-Tag'],'noindex');assert.equal(f.calls.length,0);assert.ok(!result.body.includes('Agent One'));
 const robots=await fixture().run('/robots.txt');assert.match(robots.body,/Disallow: \/api\//);assert.match(robots.body,/Sitemap: https:\/\/one.example.com\/sitemap.xml/);
 const head=await fixture().run('/','one.example.com','HEAD');assert.equal(head.code,200);assert.equal(head.body,'');
});
