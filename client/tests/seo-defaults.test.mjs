import test from 'node:test';import assert from 'node:assert/strict';
import {PUBLIC_PAGES,SEO_TEXT_FIELDS,defaultSeo,withSeoDefaults,seoPages,pageMetadata,validateSeo} from '../src/services/seo.js';
const one={name:'Agent One',location:'Atlanta',brokerage:'SNCGI Realty',professionalTitle:'Real Estate Agent'};
test('all five pages have visible default SEO text and inherited social fields',()=>{
 for(const [key]of PUBLIC_PAGES){const row=defaultSeo(key);for(const field of SEO_TEXT_FIELDS)assert.ok(row[field].length>0,`${key} ${field}`);
 const meta=pageMetadata(one,row);for(const text of Object.values(meta)){assert.ok(!text.includes('{{'));assert.ok(!text.includes('undefined'));}
 assert.equal(meta.socialTitle,meta.title);assert.equal(meta.socialDescription,meta.description);}
});
test('saved blanks and custom text survive while missing fields receive defaults',()=>{
 const row=withSeoDefaults({page_key:'about',slug:'meet-one',title:'My custom title',description:' ',social_title:'My social title',noindex:true,social_path:'owner/social.webp'});
 assert.equal(row.title,'My custom title');assert.equal(row.social_title,'My social title');assert.equal(row.description,' ');
 assert.equal(row.slug,'meet-one');assert.equal(row.noindex,true);assert.equal(row.social_path,'owner/social.webp');assert.equal(seoPages([{page_key:'home',title:''}])[0].title,'');
});
test('variables follow published details independently for each agent',()=>{
 const row=defaultSeo('home');const first=pageMetadata(one,row),other=pageMetadata({...one,name:'Agent Two',location:'Boston'},row);
 assert.match(first.title,/Agent One.*Atlanta/);assert.match(other.title,/Agent Two.*Boston/);assert.ok(!other.description.includes('Atlanta'));
 assert.match(pageMetadata({...one,location:'Seattle'},row).title,/Seattle/);
 assert.equal(pageMetadata({...one,name:'Changed'}, {...row,title:'Fixed title'}).title,'Fixed title');
});
test('empty saves stay empty and unsupported or recursive template variables are rejected',()=>{
 assert.equal(validateSeo({...defaultSeo('about'),title:''}).title,'');
 assert.equal(pageMetadata(one,{...defaultSeo('home'),title:'',description:''}).title,'');
 assert.equal(pageMetadata(one,{...defaultSeo('home'),title:'',description:''}).description,'');
 assert.throws(()=>validateSeo({...defaultSeo('about'),title:'{{unknown_field}}'}),/Unknown SEO variable/);
 assert.throws(()=>validateSeo({...defaultSeo('about'),title:'{{seo_title}}'}),/Unknown SEO variable/);
 assert.equal(pageMetadata(one,{...defaultSeo('about'),social_title:'Talk to {{agent_name}}'}).socialTitle,'Talk to Agent One');
});
