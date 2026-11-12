export const PUBLIC_PAGES=[['home','Home'],['about','About Me'],['contact','Contact'],['active-listings','Available Homes'],['sold-listings','Past Sales']];
export const PRIVATE_PAGES=['admin','login','super-admin','onboarding'];
export const SEO_TEXT_DEFAULTS={
  "home": {
    "title": "{{agent_name}} | Real Estate in {{service_area}}",
    "description": "Buy or sell a home in {{service_area}} with {{agent_name}} at {{brokerage}}. Explore properties and get personal guidance for your next move.",
    "focus_keyword": "{{service_area}} real estate",
    "category": "Real Estate",
    "tags": "{{service_area}}, buying a home, selling a home",
    "social_title": "{{seo_title}}",
    "social_description": "{{meta_description}}"
  },
  "about": {
    "title": "About {{agent_name}} | {{brokerage}}",
    "description": "Meet {{agent_name}}, your {{professional_title}} serving {{service_area}}. Learn about their approach to buying and selling with {{brokerage}}.",
    "focus_keyword": "{{agent_name}}",
    "category": "About Your Agent",
    "tags": "{{agent_name}}, {{brokerage}}, local real estate agent",
    "social_title": "{{seo_title}}",
    "social_description": "{{meta_description}}"
  },
  "contact": {
    "title": "Contact {{agent_name}} | {{service_area}} Real Estate",
    "description": "Contact {{agent_name}} at {{brokerage}} for help buying or selling in {{service_area}}. Ask a question or discuss your next real estate move.",
    "focus_keyword": "contact {{agent_name}}",
    "category": "Contact",
    "tags": "{{agent_name}}, {{service_area}}, real estate advice",
    "social_title": "{{seo_title}}",
    "social_description": "{{meta_description}}"
  },
  "active-listings": {
    "title": "Homes for Sale in {{service_area}} | {{agent_name}}",
    "description": "Explore available homes in {{service_area}} with {{agent_name}} at {{brokerage}}. Get property details and guidance for your home search.",
    "focus_keyword": "homes for sale in {{service_area}}",
    "category": "Available Homes",
    "tags": "{{service_area}}, homes for sale, property search",
    "social_title": "{{seo_title}}",
    "social_description": "{{meta_description}}"
  },
  "sold-listings": {
    "title": "Past Sales in {{service_area}} | {{agent_name}}",
    "description": "View past property sales featured by {{agent_name}} in {{service_area}}. Contact {{brokerage}} to discuss your own buying or selling plans.",
    "focus_keyword": "past sales in {{service_area}}",
    "category": "Past Sales",
    "tags": "{{service_area}}, sold homes, past property sales",
    "social_title": "{{seo_title}}",
    "social_description": "{{meta_description}}"
  }
};
export const SEO_TEXT_FIELDS=['title','description','focus_keyword','social_title','social_description','tags','category'];
export function defaultSeo(key){return {page_key:key,slug:key==='home'?'':key,...SEO_TEXT_DEFAULTS[key],social_path:'',noindex:false};}
export function withSeoDefaults(page){
 const defaults=defaultSeo(page.page_key),result={...defaults,...page};
 for(const field of SEO_TEXT_FIELDS)if(result[field]===undefined || result[field]===null)result[field]=defaults[field] || '';
 return result;
}
export function seoPages(rows=[]){return PUBLIC_PAGES.map(([key])=>withSeoDefaults({...defaultSeo(key),...rows.find(row=>row.page_key===key)}));}
export function seoVariables(agent={}){return {agent_name:agent.name || 'Real Estate Agent',service_area:agent.location || 'your local area',brokerage:agent.brokerage || 'your brokerage',professional_title:agent.professionalTitle || 'Real Estate Agent'};}
export function renderSeoTemplate(template,agent,extra={}){
 const variables={...seoVariables(agent),...extra};
 return String(template || '').replace(/\{\{\s*([a-z_]+)\s*\}\}/g,(whole,key)=>Object.hasOwn(variables,key)?variables[key]:whole);
}
export function pagePath(pages,key){const page=pages?.find(row=>row.page_key===key);return key==='home'?'/':`/${page?.slug || key}`;}
export function pageAtPath(pages,path){return pages?.find(row=>pagePath(pages,row.page_key)===path)?.page_key || (path==='/'?'home':'not-found');}
export function validateSeo(value){
 const out={...defaultSeo(value.page_key),...value};
 if(!PUBLIC_PAGES.some(([key])=>key===out.page_key))throw Error('Choose a valid SEO page.');
 for(const [key,max] of Object.entries({title:120,description:320,focus_keyword:120,social_title:120,social_description:320,tags:500,category:80})){
 out[key]=String(out[key] || '').trim();if(out[key].length>max)throw Error(`${key.replaceAll('_',' ')} must be ${max} characters or fewer.`);
 }
 out.slug=out.page_key==='home'?'':String(out.slug || '').trim().toLowerCase();
 if(out.page_key!=='home' && (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(out.slug) || out.slug.length>80 || ['home',...PRIVATE_PAGES,'api','assets','robots','sitemap','favicon'].includes(out.slug)))throw Error('Choose a valid, unreserved page slug using lowercase letters, numbers and single hyphens.');
 const allowed=Object.keys(seoVariables());
 for(const field of SEO_TEXT_FIELDS){
  const available=field.startsWith('social_')?[...allowed,'seo_title','meta_description']:allowed;
  for(const match of out[field].matchAll(/\{\{([^{}]+)\}\}/g))if(!available.includes(match[1].trim()))throw Error(`Unknown SEO variable: ${match[0]}. Use one of the listed variables.`);
 }
 out.noindex=out.noindex===true;return withSeoDefaults(out);
}
export function pageMetadata(agent,page){
 const filled=withSeoDefaults(page);
 const title=renderSeoTemplate(filled.title,agent),description=renderSeoTemplate(filled.description,agent);
 const inherited={seo_title:title,meta_description:description};
 return {title,description,socialTitle:renderSeoTemplate(filled.social_title,agent,inherited),socialDescription:renderSeoTemplate(filled.social_description,agent,inherited)};
}
export function escapeHtml(text){return String(text??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
export function safeJson(value){return JSON.stringify(value).replace(/</g,'\\u003c').replace(/\u2028/g,'\\u2028').replace(/\u2029/g,'\\u2029');}
