import {createClient} from '@supabase/supabase-js';
import {PUBLIC_PAGES,PRIVATE_PAGES,seoPages,pagePath,pageMetadata,escapeHtml,safeJson} from '../src/services/seo.js';
const xml=escapeHtml;
export function makeSeoSiteHandler({getClient,render,template,env=process.env}={}){
 return async(req,res)=>{
  res.setHeader('Cache-Control','private, no-store');res.setHeader('X-Content-Type-Options','nosniff');
  const finish=(status,body,type='text/html; charset=utf-8')=>{res.setHeader('Content-Type',type);res.status(status);return req.method==='HEAD'?res.end():res.send(body);};
  const failure=(status,title)=>{res.setHeader('X-Robots-Tag','noindex');return finish(status,`<!doctype html><html><head><meta name="robots" content="noindex"><title>${escapeHtml(title)}</title></head><body><h1>${escapeHtml(title)}</h1></body></html>`);};
  try{
   if(!['GET','HEAD'].includes(req.method)){res.setHeader('Allow','GET, HEAD');return failure(405,'Method not allowed');}
   const host=String(req.headers.host || '').toLowerCase();
   if(!/^[a-z0-9.-]+$/.test(host))return failure(400,'Invalid website address');
   const request=new URL(req.url,`https://${host}`);
   const paths=request.searchParams.getAll('path');
   if(paths.length>1)return failure(400,'Invalid page address');
   let pathname=paths.length?'/'+paths[0]:request.pathname;
   try{pathname=decodeURIComponent(pathname);}catch{return failure(400,'Invalid page address');}
   if(pathname.includes('..') || pathname.includes('\\') || /[?#\x00-\x1f]/.test(pathname))return failure(400,'Invalid page address');
   const privatePage=PRIVATE_PAGES.find(key=>pathname===`/${key}` || pathname===`/${key}/`);
   const html=await template();
   if(privatePage){res.setHeader('X-Robots-Tag','noindex');return finish(200,html.replace(/<title>[\s\S]*?<\/title>/,'<title>Account access</title><meta name="robots" content="noindex">'));}
   const client=getClient?getClient():createClient(env.VITE_SUPABASE_URL || env.SUPABASE_URL,env.VITE_SUPABASE_PUBLISHABLE_KEY,{auth:{persistSession:false,autoRefreshToken:false},global:{fetch:(url,options)=>fetch(url,{...options,signal:AbortSignal.timeout(8000)})}});
   const platform=env.VITE_PLATFORM_HOSTNAME || 'agent-website-platform.vercel.app';
   let siteId;
   if(host===platform){const ids=request.searchParams.getAll('site');if(ids.length>1 || (ids.length && !/^site-[a-z0-9]+(?:-[a-z0-9]+)*$/.test(ids[0])))return failure(400,'Invalid website');siteId=ids[0] || env.VITE_AGENT_SITE_ID || 'site-agent001';}
   else{const result=await client.rpc('resolve_agent_hostname',{requested_hostname:host});if(result.error)throw result.error;siteId=result.data;}
   if(!siteId)return failure(404,'Website unavailable');
   const eligibility=await client.rpc('agent_website_is_active',{requested_site:siteId});if(eligibility.error)throw eligibility.error;if(!eligibility.data)return failure(404,'Website unavailable');
   const [contentResult,seoResult,routesResult,primaryResult]=await Promise.all([
    client.from('agent_site_content').select('*').eq('site_id',siteId).maybeSingle(),
    client.from('agent_page_seo').select('*').eq('site_id',siteId),
    client.from('agent_page_routes').select('slug,page_key').eq('site_id',siteId),
    client.rpc('public_agent_primary_hostname',{requested_site:siteId})
   ]);
   if([contentResult,seoResult,routesResult,primaryResult].some(row=>row.error))throw Error('Website data unavailable');
   if(!contentResult.data)return failure(404,'Website unavailable');
   const pages=seoPages(seoResult.data),primary=primaryResult.data;
   const origin=primary && /^[a-z0-9.-]+$/.test(primary)?`https://${primary}`:`https://${host}`;
   const siteQuery=!primary && host===platform?'?site='+encodeURIComponent(siteId):'';
   if(pathname==='/robots.txt')return finish(200,`User-agent: *\nDisallow: /api/\nSitemap: https://${host}/sitemap.xml\n`,'text/plain; charset=utf-8');
   if(pathname==='/sitemap.xml'){
    const entries=pages.filter(page=>!page.noindex).map(page=>`<url><loc>${xml(origin+pagePath(pages,page.page_key)+siteQuery)}</loc></url>`).join('');
    return finish(200,`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${entries}</urlset>`,'application/xml; charset=utf-8');
   }
   const slug=pathname.replace(/^\//,'').replace(/\/$/,'');
   const page=pages.find(p=>p.slug===slug) || pages.find(p=>p.page_key===(routesResult.data || []).find(r=>r.slug===slug)?.page_key);
   if(!page)return failure(404,'Page not found');
   const currentPath=pagePath(pages,page.page_key);
   if(pathname!==currentPath){
    const query=new URLSearchParams(request.search);query.delete('path');
    const tail=query.size?'?'+query.toString():'';
    res.setHeader('Location',currentPath+tail);return finish(308,'');
   }
   const rendered=await render(contentResult.data,pages,page.page_key,origin,siteQuery);
   const meta=pageMetadata(rendered.content,page),canonical=origin+currentPath+siteQuery;
   const assetPath=page.social_path || rendered.content.heroPath || rendered.content.photoPath;
   const image=assetPath?`${env.VITE_SUPABASE_URL || env.SUPABASE_URL}/storage/v1/object/public/agent-images/${assetPath.split('/').map(encodeURIComponent).join('/')}`:null;
   const tags=`<title>${escapeHtml(meta.title)}</title><meta name="description" content="${escapeHtml(meta.description)}"><link rel="canonical" href="${escapeHtml(canonical)}"><meta name="robots" content="${page.noindex?'noindex,follow':'index,follow'}"><meta property="og:type" content="website"><meta property="og:title" content="${escapeHtml(meta.socialTitle)}"><meta property="og:description" content="${escapeHtml(meta.socialDescription)}"><meta property="og:url" content="${escapeHtml(canonical)}"><meta name="twitter:card" content="${image?'summary_large_image':'summary'}"><meta name="twitter:title" content="${escapeHtml(meta.socialTitle)}"><meta name="twitter:description" content="${escapeHtml(meta.socialDescription)}">${image?`<meta property="og:image" content="${escapeHtml(image)}"><meta name="twitter:image" content="${escapeHtml(image)}">`:''}`;
   if(page.noindex)res.setHeader('X-Robots-Tag','noindex');
   const boot={content:rendered.content,siteId,seoPages:pages,page:page.page_key,primaryOrigin:origin,siteQuery};
   return finish(200,html.replace(/<title>[\s\S]*?<\/title>/,()=>tags).replace('<div id="root"></div>',()=>`<div id="root">${rendered.html}</div><script>window.__SITE_BOOTSTRAP__=${safeJson(boot)};</script>`));
  }catch{return failure(503,'Website temporarily unavailable');}
 };
}
