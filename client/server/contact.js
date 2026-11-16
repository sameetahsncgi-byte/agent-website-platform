import {createHmac} from 'node:crypto';
import {createClient} from '@supabase/supabase-js';
import {readBody,httpError,responseHeaders} from './platform.js';

const interests=new Set(['Buying a home','Selling a home','A specific property','General information']);
export const validEmail=value=>typeof value==='string' && value.length<=254 && /^[A-Za-z0-9.!#$%&'*+/=?^_`{|}~-]+@[A-Za-z0-9](?:[A-Za-z0-9.-]*[A-Za-z0-9])?\.[A-Za-z]{2,}$/.test(value);
export function validateContact(body){
 const result={};
 for(const [key,max] of [['name',100],['email',254],['phone',50],['interest',60],['message',3000]]){
  if(typeof body[key]!=='string')throw httpError(400,'Please complete the form.');
  result[key]=body[key].trim();
  if(result[key].length>max || /[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/.test(result[key]) || (key!=='message' && /[\r\n]/.test(result[key])))throw httpError(400,'Please check your form entries.');
 }
 if(!result.name || !validEmail(result.email) || result.message.length<10 || !interests.has(result.interest))throw httpError(400,'Enter your name, a valid email, an interest and a message of at least 10 characters.');
 if(typeof body.token!=='string' || !body.token || body.token.length>2048)throw httpError(400,'Complete the security check and try again.');
 return result;
}
export function makeContactHandler({env=process.env,getClient,fetcher=fetch}={}){
 const call=(url,options)=>fetcher(url,{...options,signal:AbortSignal.timeout(8000)});
 return async(req,res)=>{
  responseHeaders(res);
  try{
   if(req.method!=='POST'){res.setHeader('Allow','POST');throw httpError(405,'Method not allowed.');}
   const host=String(req.headers.host || '').toLowerCase();
   if(!/^[a-z0-9]+(?:[.-][a-z0-9]+)*$/.test(host) || req.headers.origin!==`https://${host}`)throw httpError(403,'Submit the form from the website.');
   const body=await readBody(req);
   if(body.company)throw httpError(400,'Unable to submit this form.');
   const values=validateContact(body);
   if(!env.RESEND_API_KEY || !validEmail(env.CONTACT_FROM_EMAIL) || !env.TURNSTILE_SECRET_KEY || !env.SUPABASE_URL || !env.SUPABASE_SECRET_KEY)throw httpError(503,'The contact form is not available yet. Please use the agent’s email or phone.');
   const client=getClient?getClient():createClient(env.SUPABASE_URL,env.SUPABASE_SECRET_KEY,{auth:{persistSession:false,autoRefreshToken:false},global:{fetch:call}});
   const url=new URL(req.url,`https://${host}`);
   let siteId;
   if(host===(env.VITE_PLATFORM_HOSTNAME || 'agent-website-platform.vercel.app')){
    const ids=url.searchParams.getAll('site');
    if(ids.length>1 || (ids.length && !/^site-[a-z0-9]+(?:-[a-z0-9]+)*$/.test(ids[0])))throw httpError(400,'Invalid website.');
    siteId=ids[0] || env.VITE_AGENT_SITE_ID || 'site-agent001';
   }else{
    const result=await client.rpc('resolve_agent_hostname',{requested_hostname:host});
    if(result.error)throw Error('lookup');siteId=result.data;
   }
   if(!siteId)throw httpError(404,'Website unavailable.');
   const active=await client.rpc('agent_website_is_active',{requested_site:siteId});
   if(active.error)throw Error('lookup');if(!active.data)throw httpError(404,'Website unavailable.');
   // Never accept a recipient or agent identity from form input.
   const content=await client.from('agent_site_content').select('email,name').eq('site_id',siteId).maybeSingle();
   if(content.error)throw Error('lookup');
   if(!validEmail(content.data?.email))throw httpError(503,'Please contact the agent by phone.');
   const verification=await call('https://challenges.cloudflare.com/turnstile/v0/siteverify',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({secret:env.TURNSTILE_SECRET_KEY,response:body.token})});
   if(!verification.ok)throw Error('verification');
   const check=await verification.json();
   if(check.success!==true || check.hostname!==host || check.action!=='contact')throw httpError(400,'The security check expired. Please try again.');
   // Vercel supplies the forwarding header. No raw IP or message is stored here.
   const ip=String(req.headers['x-forwarded-for'] || '').split(',')[0].trim();
   if(!ip || ip.length>100)throw httpError(503,'Unable to submit right now. Please use email or phone.');
   const ipHash=createHmac('sha256',env.SUPABASE_SECRET_KEY).update(ip).digest('hex');
   const budget=Number(env.CONTACT_DAILY_LIMIT || 90);
   if(!Number.isInteger(budget) || budget<1 || budget>100000)throw Error('configuration');
   const limited=await client.rpc('consume_contact_quota',{p_site:siteId,p_ip_hash:ipHash,p_daily_limit:budget});
   if(limited.error)throw Error('quota');
   if(limited.data!==true){res.setHeader('Retry-After','600');throw httpError(429,'The form has reached its submission limit. Please try later or use email or phone.');}
   const mail=await call('https://api.resend.com/emails',{method:'POST',headers:{Authorization:`Bearer ${env.RESEND_API_KEY}`,'Content-Type':'application/json'},body:JSON.stringify({
    from:`SNCGI Website Enquiries <${env.CONTACT_FROM_EMAIL}>`,to:[content.data.email],reply_to:values.email,
    subject:`Website enquiry: ${values.interest}`,
    text:`New website enquiry for ${content.data.name || 'your website'}\nWebsite: https://${host}/${host===(env.VITE_PLATFORM_HOSTNAME || 'agent-website-platform.vercel.app')?'?site='+encodeURIComponent(siteId):''}\n\nName: ${values.name}\nEmail: ${values.email}\nPhone: ${values.phone || 'Not provided'}\nInterest: ${values.interest}\n\nMessage:\n${values.message}\n\nReply to this email to contact the visitor.`
   })});
   const receipt=await mail.json();
   if(!mail.ok || !receipt.id)throw Error('delivery');
   return res.status(200).json({ok:true});
  }catch(error){return res.status(error.status || 503).json({error:error.status?error.message:'We could not confirm your message was sent. Please use the agent’s email or phone, or try again later.'});}
 };
}
