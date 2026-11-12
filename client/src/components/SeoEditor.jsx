import {editableSeo,publishSeo} from '../services/seoPublish.js';
import {imageUrl} from '../services/siteContent.js';
import {useEffect,useRef,useState} from 'react';
import {getSupabase} from '../services/supabase.js';
import {defaultContent,loadContent} from '../services/siteContent.js';
import {PLATFORM_HOSTNAME} from '../services/siteRouting.js';
import {PUBLIC_PAGES,seoPages,validateSeo,pageMetadata,pagePath,defaultSeo,SEO_TEXT_FIELDS,seoVariables,renderSeoTemplate,withSeoDefaults} from '../services/seo.js';
import {ImageField} from './AgentContentEditor.jsx';
export default function SeoEditor({agent,onDirtyChange}){
 const saveInProgress=useRef(false);
 const [socialPreviewUrl,setSocialPreviewUrl]=useState('');
 const [publicContent,setPublicContent]=useState({...defaultContent,name:agent.name});
 const [pages,setPages]=useState(null),[key,setKey]=useState('home'),[form,setForm]=useState(null),[baseline,setBaseline]=useState(null);
 const [file,setFile]=useState(null),[busy,setBusy]=useState(false),[processing,setProcessing]=useState(false),[error,setError]=useState(''),[message,setMessage]=useState(''),[retry,setRetry]=useState(0);
 const dirty=!!form && (JSON.stringify(editableSeo(form))!==JSON.stringify(editableSeo(baseline)) || !!file);
 useEffect(()=>{onDirtyChange(dirty);},[dirty,onDirtyChange]);
 useEffect(()=>{
  let active=true,detailsVersion=0;setError('');setPages(null);
  Promise.all([getSupabase().from('agent_page_seo').select('*').eq('site_id',agent.siteId),loadContent(agent.siteId)]).then(([{data,error},record])=>{
   if(!active)return;if(error){setError('Unable to load SEO settings. Run setup-seo-homepage.sql first.');return;}
   setPublicContent(record.exists?record.content:{...record.content,name:agent.name});
   const loaded=seoPages(data);setPages(loaded);setForm(loaded[0]);setBaseline(loaded[0]);setKey('home');setFile(null);
  }).catch(error=>{if(active)setError(error.message);});
  function refreshPublishedDetails(){const version=++detailsVersion;loadContent(agent.siteId).then(record=>{if(active && version===detailsVersion && record.exists)setPublicContent(record.content);}).catch(()=>{});}
  window.addEventListener('agent-content-saved',refreshPublishedDetails);
  window.addEventListener('focus',refreshPublishedDetails);
  return()=>{active=false;window.removeEventListener('agent-content-saved',refreshPublishedDetails);window.removeEventListener('focus',refreshPublishedDetails);};
 },[agent.siteId,retry]);
 useEffect(()=>{if(!file){setSocialPreviewUrl('');return;}const url=URL.createObjectURL(file);setSocialPreviewUrl(url);return()=>URL.revokeObjectURL(url);},[file]);
 useEffect(()=>{const protect=event=>{if(dirty){event.preventDefault();event.returnValue='';}};window.addEventListener('beforeunload',protect);return()=>window.removeEventListener('beforeunload',protect);},[dirty]);
 function update(field,value){setForm(old=>({...old,[field]:value}));setMessage('');setError('');}
 function choose(page){if(dirty && !window.confirm('Discard unsaved SEO changes?'))return;const selected=pages.find(row=>row.page_key===page);setKey(page);setForm(selected);setBaseline(selected);setFile(null);setError('');setMessage('');}
 async function save(event){
  event.preventDefault();if(saveInProgress.current)return;saveInProgress.current=true;setBusy(true);setError('');setMessage('');let uploaded;
  try{
   const value=validateSeo(form),client=getSupabase();
   if(file){const {data,error}=await client.auth.getUser();if(error || !data.user)throw Error('Sign in again to save.');uploaded=`${data.user.id}/social-${crypto.randomUUID()}.webp`;const result=await client.storage.from('agent-images').upload(uploaded,file,{contentType:'image/webp',upsert:false});if(result.error)throw Error('Unable to upload the social image.');value.social_path=uploaded;}
   const data=await publishSeo(client,agent.siteId,value);
   setPages(old=>old.map(row=>row.page_key===key?withSeoDefaults(data):row));setForm(withSeoDefaults(data));setBaseline(withSeoDefaults(data));setFile(null);setMessage('Published and verified. The previews match your saved SEO.');window.dispatchEvent(new Event('agent-seo-saved'));
  }catch(error){
   if(error.savedRow){setBaseline(withSeoDefaults(error.savedRow));setPages(old=>old.map(row=>row.page_key===key?withSeoDefaults(error.savedRow):row));}
   if(uploaded && error.saveMayHaveSucceeded){setForm(current=>({...current,social_path:uploaded}));setFile(null);}
   if(uploaded && !error.saveMayHaveSucceeded)await getSupabase().storage.from('agent-images').remove([uploaded]).catch(()=>{});
   setError(error.message);
  }
  finally{saveInProgress.current=false;setBusy(false);}
 }
 if(!pages || !form)return <section className="admin-account"><h2>Page SEO</h2>{error?<><p className="admin-error" role="alert">{error}</p><button className="admin-secondary" onClick={()=>setRetry(n=>n+1)}>Retry</button></>:<p>Loading SEO settings…</p>}</section>;
 const preview=pageMetadata(publicContent,form);
 const sharingImage=file?socialPreviewUrl:imageUrl(form.social_path || publicContent.heroPath || publicContent.photoPath);
 const variables=seoVariables(publicContent),focus=renderSeoTemplate(form.focus_keyword,publicContent);
 function restoreDefaults(){const defaults=defaultSeo(key),restored={...form,...Object.fromEntries(SEO_TEXT_FIELDS.map(field=>[field,defaults[field]]))};setForm(restored);setError('');setMessage(!file && JSON.stringify(editableSeo(restored))===JSON.stringify(editableSeo(baseline))?'Default SEO text is already saved.':'Default SEO text restored in the editor. Save & Publish SEO to apply it.');}
 return <section className="content-editor" aria-label="SEO editor"><div className="seo-editor-heading"><div><span className="admin-label">SEARCH AND SHARING</span><h2>Page SEO</h2></div><button type="button" className="admin-secondary" disabled={busy || processing} onClick={restoreDefaults}>Restore default SEO text</button></div><p>Each page has its own settings for this website. Metadata does not guarantee rankings or the exact Google snippet.</p>
  <label htmlFor="seo-page">Select a page</label><select id="seo-page" value={key} disabled={busy || processing} onChange={event=>choose(event.target.value)}>{PUBLIC_PAGES.map(([id,label])=><option key={id} value={id}>{label}</option>)}</select>
  <details className="seo-variable-guide"><summary>Dynamic SEO variables</summary><p>These variables use your published website details and stay up to date when those details change. You can keep them, combine them with your own text, or replace them.</p><div className="seo-variable-list">{Object.entries(variables).map(([name,value])=><div key={name}><code>{`{{${name}}}`}</code><span>{value}</span></div>)}</div><p className="platform-help">Social fields also accept <code>{'{{seo_title}}'}</code> and <code>{'{{meta_description}}'}</code> to follow this page’s published SEO text.</p></details>
  <form onSubmit={save}><fieldset disabled={busy || processing}>
   <label>Page slug<input value={form.slug} disabled={key==='home'} maxLength={80} onChange={e=>update('slug',e.target.value.toLowerCase())}/></label><small>{key==='home'?'The homepage stays at the website root.':'Old published slugs stay reserved and redirect to this page.'}</small>
   <label>SEO title<input value={form.title} maxLength={120} onChange={e=>update('title',e.target.value)}/></label><small>{preview.title.length} characters after variables are filled. About 50–60 is a writing guide, not a fixed Google limit.</small>
   <label>Meta description<textarea rows={3} value={form.description} maxLength={320} onChange={e=>update('description',e.target.value)}/></label><small>{preview.description.length} characters after variables are filled. Aim for a concise, specific summary. Fields you clear stay blank after saving. Use Restore default SEO text to bring back the templates.</small>
   <label>Focus keyword<input value={form.focus_keyword} maxLength={120} onChange={e=>update('focus_keyword',e.target.value)}/></label><p className="platform-help">Writing guidance only. We do not output a meta keywords tag.</p>
   {form.focus_keyword && <p className="platform-help">Focus phrase: <strong>{focus}</strong>. Phrase in title: {preview.title.toLowerCase().includes(focus.toLowerCase())?'Yes':'Not yet'}. Phrase in description: {preview.description.toLowerCase().includes(focus.toLowerCase())?'Yes':'Not yet'}. Use it naturally in relevant page content too.</p>}
   <label>Content category (optional)<input value={form.category} maxLength={80} onChange={e=>update('category',e.target.value)}/></label><label>Content tags (comma-separated, optional)<input value={form.tags} maxLength={500} onChange={e=>update('tags',e.target.value)}/></label><p className="platform-help">Organization labels for this page. These do not create blog archives or act as ranking keywords.</p>
   <label className="seo-checkbox"><input type="checkbox" checked={form.noindex} onChange={e=>update('noindex',e.target.checked)}/> Hide this page from search results (noindex)</label><p className="platform-help">The page remains publicly accessible. It is removed from the sitemap. Search engines must recrawl it to see the change.</p>
   <h3>Social-sharing settings</h3><label>Social title<input value={form.social_title} maxLength={120} onChange={e=>update('social_title',e.target.value)}/></label><label>Social description<textarea rows={3} value={form.social_description} maxLength={320} onChange={e=>update('social_description',e.target.value)}/></label>
   <ImageField kind="social" value={form.social_path} file={file} disabled={busy} onChange={newFile=>{setFile(newFile);setMessage('');setError('');}} onRemove={()=>{setFile(null);update('social_path','');}} onError={setError} onProcessing={setProcessing}/>
   <p className="platform-help">Without a social image, the homepage background or agent photo is used when available.</p>
  </fieldset>
  <div className="seo-preview-grid">
   <section aria-label="Search result preview"><h3 className="seo-preview-label">Search result preview</h3><div className="seo-preview seo-search-preview"><small>{agent.hostname || 'Your website'}{pagePath([form],key)}</small><h4 className="seo-preview-title">{preview.title || 'No SEO title set'}</h4><p>{preview.description || 'No meta description set'}</p></div></section>
   <section aria-label="Social-sharing preview"><h3 className="seo-preview-label">Social-sharing preview</h3><div className="seo-social-preview"><div className="seo-social-image">{sharingImage?<img src={sharingImage} alt="Social-sharing image preview"/>:<span>No sharing image selected</span>}</div><div className="seo-social-copy"><small>{agent.hostname || 'Your website'}</small><h4>{preview.socialTitle || 'No social title set'}</h4><p>{preview.socialDescription || 'No social description set'}</p></div></div></section>
  </div>
  <p className="platform-help">Previews update while you type. Save & Publish SEO applies them to your website. Social settings change the social card; focus phrases and tags do not change the search snippet.</p>
  <div className="seo-publish-feedback" aria-live="polite" aria-atomic="true">{error?<p className="admin-error" role="alert">{error}</p>:<p role="status">{busy?'Saving and confirming your SEO…':message || (dirty?'Unsaved SEO changes.':'No unsaved SEO changes.')}</p>}</div>
  <div className="editor-actions seo-publish-actions"><button className="admin-primary" disabled={busy || processing || !dirty}>{busy?'Publishing…':'Save & Publish SEO'}</button><button className="admin-secondary" type="button" disabled={busy || processing || !dirty} onClick={()=>{setForm(baseline);setFile(null);setError('');}}>Discard changes</button><a target="_blank" rel="noopener noreferrer" href={agent.hostname?`https://${agent.hostname}/sitemap.xml`:`https://${PLATFORM_HOSTNAME}/sitemap.xml?site=${encodeURIComponent(agent.siteId)}`}>View sitemap ↗</a></div>
 </form></section>;
}
