import {useEffect,useState} from 'react';
import {getSupabase} from '../services/supabase.js';
import {defaultContent,loadContent} from '../services/siteContent.js';
import {PLATFORM_HOSTNAME} from '../services/siteRouting.js';
import {PUBLIC_PAGES,seoPages,validateSeo,pageMetadata,pagePath} from '../services/seo.js';
import {ImageField} from './AgentContentEditor.jsx';
export default function SeoEditor({agent,onDirtyChange}){
 const [publicContent,setPublicContent]=useState({...defaultContent,name:agent.name});
 const [pages,setPages]=useState(null),[key,setKey]=useState('home'),[form,setForm]=useState(null),[baseline,setBaseline]=useState(null);
 const [file,setFile]=useState(null),[busy,setBusy]=useState(false),[processing,setProcessing]=useState(false),[error,setError]=useState(''),[message,setMessage]=useState(''),[retry,setRetry]=useState(0);
 const dirty=!!form && (JSON.stringify(form)!==JSON.stringify(baseline) || !!file);
 useEffect(()=>{onDirtyChange(dirty);},[dirty,onDirtyChange]);
 useEffect(()=>{
  let active=true;setError('');setPages(null);
  Promise.all([getSupabase().from('agent_page_seo').select('*').eq('site_id',agent.siteId),loadContent(agent.siteId)]).then(([{data,error},record])=>{
   if(!active)return;if(error){setError('Unable to load SEO settings. Run setup-seo-homepage.sql first.');return;}
   setPublicContent(record.exists?record.content:{...record.content,name:agent.name});
   const loaded=seoPages(data);setPages(loaded);setForm(loaded[0]);setBaseline(loaded[0]);setKey('home');setFile(null);
  }).catch(error=>{if(active)setError(error.message);});return()=>{active=false;};
 },[agent.siteId,retry]);
 useEffect(()=>{const protect=event=>{if(dirty){event.preventDefault();event.returnValue='';}};window.addEventListener('beforeunload',protect);return()=>window.removeEventListener('beforeunload',protect);},[dirty]);
 function update(field,value){setForm(old=>({...old,[field]:value}));setMessage('');}
 function choose(page){if(dirty && !window.confirm('Discard unsaved SEO changes?'))return;const selected=pages.find(row=>row.page_key===page);setKey(page);setForm(selected);setBaseline(selected);setFile(null);setError('');setMessage('');}
 async function save(event){
  event.preventDefault();setBusy(true);setError('');setMessage('');let uploaded;
  try{
   const value=validateSeo(form),client=getSupabase();
   if(file){const {data,error}=await client.auth.getUser();if(error || !data.user)throw Error('Sign in again to save.');uploaded=`${data.user.id}/social-${crypto.randomUUID()}.webp`;const result=await client.storage.from('agent-images').upload(uploaded,file,{contentType:'image/webp',upsert:false});if(result.error)throw Error('Unable to upload the social image.');value.social_path=uploaded;}
   const {data,error}=await client.rpc('save_my_page_seo',{p_page_key:key,p_values:value});
   if(error)throw Error(error.code==='23505'?'That page slug is already used or reserved by another page.':error.code==='42501'?'Sign in with the active website owner account.':'SEO was not saved. Check the fields and database setup.');
   setPages(old=>old.map(row=>row.page_key===key?data:row));setForm(data);setBaseline(data);setFile(null);setMessage('SEO published. Changed page URLs redirect to the current slug.');window.dispatchEvent(new Event('agent-content-saved'));
  }catch(error){if(uploaded)await getSupabase().storage.from('agent-images').remove([uploaded]).catch(()=>{});setError(error.message);}
  finally{setBusy(false);}
 }
 if(!pages || !form)return <section className="admin-account"><h2>Page SEO</h2>{error?<><p className="admin-error" role="alert">{error}</p><button className="admin-secondary" onClick={()=>setRetry(n=>n+1)}>Retry</button></>:<p>Loading SEO settings…</p>}</section>;
 const preview=pageMetadata(publicContent,form);
 return <section className="content-editor" aria-label="SEO editor"><span className="admin-label">SEARCH AND SHARING</span><h2>Page SEO</h2><p>Each page has its own settings for this website. Metadata does not guarantee rankings or the exact Google snippet.</p>
  <label htmlFor="seo-page">Select a page</label><select id="seo-page" value={key} disabled={busy || processing} onChange={event=>choose(event.target.value)}>{PUBLIC_PAGES.map(([id,label])=><option key={id} value={id}>{label}</option>)}</select>
  <form onSubmit={save}><fieldset disabled={busy || processing}>
   <label>Page slug<input value={form.slug} disabled={key==='home'} maxLength={80} onChange={e=>update('slug',e.target.value.toLowerCase())}/></label><small>{key==='home'?'The homepage stays at the website root.':'Old published slugs stay reserved and redirect to this page.'}</small>
   <label>SEO title<input value={form.title} maxLength={120} onChange={e=>update('title',e.target.value)}/></label><small>{form.title.length} characters. About 50–60 is a writing guide, not a fixed Google limit.</small>
   <label>Meta description<textarea rows={3} value={form.description} maxLength={320} onChange={e=>update('description',e.target.value)}/></label><small>{form.description.length} characters. Aim for a concise, specific summary. Blank fields use agent-specific defaults.</small>
   <label>Focus keyword<input value={form.focus_keyword} maxLength={120} onChange={e=>update('focus_keyword',e.target.value)}/></label><p className="platform-help">Writing guidance only. We do not output a meta keywords tag.</p>
   {form.focus_keyword && <p className="platform-help">Phrase in title: {preview.title.toLowerCase().includes(form.focus_keyword.toLowerCase())?'Yes':'Not yet'}. Phrase in description: {preview.description.toLowerCase().includes(form.focus_keyword.toLowerCase())?'Yes':'Not yet'}. Use it naturally in relevant page content too.</p>}
   <label>Content category (optional)<input value={form.category} maxLength={80} onChange={e=>update('category',e.target.value)}/></label><label>Content tags (comma-separated, optional)<input value={form.tags} maxLength={500} onChange={e=>update('tags',e.target.value)}/></label><p className="platform-help">Organization labels for this page. These do not create blog archives or act as ranking keywords.</p>
   <label className="seo-checkbox"><input type="checkbox" checked={form.noindex} onChange={e=>update('noindex',e.target.checked)}/> Hide this page from search results (noindex)</label><p className="platform-help">The page remains publicly accessible. It is removed from the sitemap. Search engines must recrawl it to see the change.</p>
   <h3>Social-sharing preview</h3><label>Social title<input value={form.social_title} maxLength={120} onChange={e=>update('social_title',e.target.value)}/></label><label>Social description<textarea rows={3} value={form.social_description} maxLength={320} onChange={e=>update('social_description',e.target.value)}/></label>
   <ImageField kind="social" value={form.social_path} file={file} disabled={busy} onChange={setFile} onRemove={()=>{setFile(null);update('social_path','');}} onError={setError} onProcessing={setProcessing}/>
   <p className="platform-help">Without a social image, the homepage background or agent photo is used when available.</p>
  </fieldset><div className="seo-preview"><small>{agent.hostname || 'Your website'}{pagePath([form],key)}</small><h3>{preview.title}</h3><p>{preview.description}</p></div>
  {error && <p className="admin-error" role="alert">{error}</p>}{message && <p role="status">{message}</p>}
  <div className="editor-actions"><button className="admin-primary" disabled={busy || processing || !dirty}>{busy?'Publishing…':'Save & Publish SEO'}</button><button className="admin-secondary" type="button" disabled={busy || processing || !dirty} onClick={()=>{setForm(baseline);setFile(null);setError('');}}>Discard changes</button><a target="_blank" rel="noopener noreferrer" href={agent.hostname?`https://${agent.hostname}/sitemap.xml`:`https://${PLATFORM_HOSTNAME}/sitemap.xml?site=${encodeURIComponent(agent.siteId)}`}>View sitemap ↗</a></div>
 </form></section>;
}
