import { getSupabase } from './supabase.js';
export function normalizeSubdomain(value) {
  const slug=String(value || '').trim().toLowerCase();
  if(slug.length<3 || slug.length>40 || !/^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug)) throw Error('Use 3–40 lowercase letters, numbers or single hyphens. Enter only the part before .brokerage.sncgi.com.');
  return slug;
}
export function subdomainError(error) {
  if(error?.code==='23505') return 'That website name is already used or reserved. Choose another.';
  if(error?.code==='42501') return 'Sign in with an active agent account to change your website name.';
  if(error?.code==='22023') return 'Choose a valid website name. Admin, api, www and other system names are reserved.';
  return 'Unable to change the website name. Check your connection and confirm setup-editable-subdomains.sql was installed.';
}
export function makeSubdomainRename(getClient) {
  return async value=>{
    const slug=normalizeSubdomain(value);
    const {data,error}=await getClient().rpc('rename_my_subdomain',{p_slug:slug});
    if(error || !data)throw Error(subdomainError(error));
    return data;
  };
}
export const renameMySubdomain=makeSubdomainRename(getSupabase);
