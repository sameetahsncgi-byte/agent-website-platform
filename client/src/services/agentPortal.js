import {defaultAgentHostname} from './agentSubdomains.js';
export function agentPortalOrigin(slug){return `https://${defaultAgentHostname(slug)}`;}
export function agentAdminHref(agent){
 const slug=agent?.subdomainSlug || agent?.site_slug;
 return slug?`${agentPortalOrigin(slug)}/admin`:null;
}
export function invitationFromLocation(location){
 const hash=location.hash || '';
 const raw=hash.startsWith('#/onboarding')?hash.split('?')[1] || '':hash.replace(/^#/,'');
 const params=new URLSearchParams(raw),tokens=params.getAll('token_hash'),types=params.getAll('type');
 return tokens.length===1 && types.length===1 && /^[a-zA-Z0-9_-]{20,512}$/.test(tokens[0]) && ['invite','recovery'].includes(types[0])?{token:tokens[0],type:types[0]}:null;
}
