import {SEO_TEXT_FIELDS,validateSeo} from './seo.js';
export function editableSeo(value={}){
 return {page_key:String(value.page_key || ''),slug:String(value.slug || ''),...Object.fromEntries(SEO_TEXT_FIELDS.map(field=>[field,String(value[field] ?? '')])),social_path:String(value.social_path || ''),noindex:value.noindex===true};
}
export async function publishSeo(client,siteId,draft,{timeoutMs=20000}={}){
 let attempted=false,committed=false,expired=false,timer;
 const guard=()=>{if(expired)throw Error('Save confirmation timed out. Your draft is kept. Check the published page before retrying.');};
 async function work(){
  const values=editableSeo(validateSeo(draft));
  const {data:userData,error:userError}=await client.auth.getUser();guard();
  if(userError || !userData?.user)throw Error('Your session expired. Sign in again.');
  const {data:profile,error:profileError}=await client.from('agent_profiles').select('site_id, active, role').eq('user_id',userData.user.id).maybeSingle();guard();
  if(profileError)throw Error('Unable to confirm your website account. Your draft is kept.');
  if(!profile?.active || profile.role!=='agent' || profile.site_id!==siteId)throw Error('The signed-in account changed. Reload and sign in to the correct agent account before publishing.');
  attempted=true;
  const result=await client.rpc('save_my_page_seo',{p_page_key:values.page_key,p_values:{...values,site_id:siteId}});
  if(result.error){
   const failure=Error(result.error.code==='23505'?'That page slug is already used or reserved by another page.':result.error.code==='42501'?'Sign in with the active website owner account.':'SEO could not be saved. Your draft is kept. Check the fields and database setup.');
   failure.definitelyNotSaved=/^[0-9A-Z]{5}$/.test(result.error.code || '');throw failure;
  }
  committed=true;guard();
  // Read the committed record, rather than displaying success from an optimistic
  // local state or accepting an older trigger's rewritten defaults silently.
  const {data:saved,error}=await client.from('agent_page_seo').select('*').eq('site_id',siteId).eq('page_key',values.page_key).maybeSingle();guard();
  if(error || !saved || saved.site_id!==siteId || saved.page_key!==values.page_key)throw Error('The save request completed, but the saved values could not be confirmed. Your draft is kept. Check the published page or retry.');
  const actual=editableSeo(saved);
  if(JSON.stringify(actual)!==JSON.stringify(values)){
   const failure=Error('The database returned different SEO values. Your draft is kept. Run the latest setup-seo-defaults.sql and setup-seo-save-verification.sql, then retry.');
   failure.savedRow=saved;throw failure;
  }
  return saved;
 }
 try{
  return await Promise.race([work(),new Promise((_,reject)=>{timer=setTimeout(()=>{expired=true;reject(Error('Save confirmation timed out. Your draft is kept. Check the published page before retrying.'));},timeoutMs);})]);
 }catch(error){error.saveMayHaveSucceeded=committed || (attempted && !error.definitelyNotSaved);throw error;}
 finally{clearTimeout(timer);}
}
