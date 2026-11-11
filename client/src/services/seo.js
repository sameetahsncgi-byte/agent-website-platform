export const PUBLIC_PAGES=[['home','Home'],['about','About Me'],['contact','Contact'],['active-listings','Available Homes'],['sold-listings','Past Sales']];
export const PRIVATE_PAGES=['admin','login','super-admin','onboarding'];
export function defaultSeo(key){return {page_key:key,slug:key==='home'?'':key,title:'',description:'',focus_keyword:'',social_title:'',social_description:'',social_path:'',noindex:false,tags:'',category:''};}
export function seoPages(rows=[]){return PUBLIC_PAGES.map(([key])=>({...defaultSeo(key),...rows.find(row=>row.page_key===key)}));}
export function pagePath(pages,key){const page=pages?.find(row=>row.page_key===key);return key==='home'?'/':`/${page?.slug || key}`;}
export function pageAtPath(pages,path){return pages?.find(row=>pagePath(pages,row.page_key)===path)?.page_key || (path==='/'?'home':'not-found');}
export function validateSeo(value){
 const out={...defaultSeo(value.page_key),...value};
 for(const [key,max] of Object.entries({title:120,description:320,focus_keyword:120,social_title:120,social_description:320,tags:500,category:80})){
 out[key]=String(out[key] || '').trim();if(out[key].length>max)throw Error(`${key.replaceAll('_',' ')} must be ${max} characters or fewer.`);
 }
 out.slug=out.page_key==='home'?'':String(out.slug || '').trim().toLowerCase();
 if(out.page_key!=='home' && (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(out.slug) || out.slug.length>80 || ['home',...PRIVATE_PAGES,'api','assets','robots','sitemap','favicon'].includes(out.slug)))throw Error('Choose a valid, unreserved page slug using lowercase letters, numbers and single hyphens.');
 out.noindex=out.noindex===true;return out;
}
export function pageMetadata(agent,page){
 agent={...agent,name:agent.name || 'Real Estate Agent',location:agent.location || 'your local area',professionalTitle:agent.professionalTitle || 'Real Estate Agent',bio:agent.bio || ''};
 const label=PUBLIC_PAGES.find(([key])=>key===page.page_key)?.[1] || 'Page';
 const title=page.title || `${page.page_key==='home'?`${agent.name} | Real Estate in ${agent.location}`:`${label} | ${agent.name}`}`;
 const description=page.description || (page.page_key==='home'?`${agent.name}, ${agent.professionalTitle} serving ${agent.location}. ${agent.bio}`:`${label} — ${agent.name}, ${agent.professionalTitle} in ${agent.location}. ${agent.bio}`).slice(0,300);
 return {title,description,socialTitle:page.social_title || title,socialDescription:page.social_description || description};
}
export function escapeHtml(text){return String(text??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
export function safeJson(value){return JSON.stringify(value).replace(/</g,'\\u003c').replace(/\u2028/g,'\\u2028').replace(/\u2029/g,'\\u2029');}
