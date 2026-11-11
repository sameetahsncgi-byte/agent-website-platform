import {agentAdminHref} from '../services/agentPortal.js';
import {useEffect,useRef,useState} from 'react';
import {agentWebsiteHref} from '../services/siteRouting.js';

export default function AgentWebsiteDialog({website,busy,error,message,save,regenerate,onClose}) {
  const dialog=useRef(null);
  const [hostname,setHostname]=useState(website.hostname || website.defaultHostname || '');
  const [baseline,setBaseline]=useState(website.hostname || website.defaultHostname || '');
  const [invitation,setInvitation]=useState(null);
  const [copied,setCopied]=useState(false);
  const [copyError,setCopyError]=useState('');
  const dirty=hostname!==baseline;
  const currentHostname=website.hostname || website.defaultHostname || '';
  const conflict=dirty && currentHostname!==baseline;
  const live=(website.publicEligible ?? website.active) && website.enabled;
  useEffect(()=>{
    const element=dialog.current;
    element.showModal();
    return ()=>element.close();
  },[]);
  useEffect(()=>{
    if(!dirty){setHostname(currentHostname);setBaseline(currentHostname);}
  },[currentHostname,dirty]);
  function close(){
    if(busy)return;
    if(dirty && !window.confirm('Discard the unsaved website address?'))return;
    onClose();
  }
  async function saveHostname(event){
    event.preventDefault();
    if(conflict)return;
    const updated=await save({action:'set-hostname',siteId:website.site_id,hostname});
    if(updated){setHostname(updated.hostname);setBaseline(updated.hostname);}
  }
  async function newLink(){
    if(invitation && !window.confirm('Generate another private setup link?'))return;
    const result=await regenerate(website.user_id);
    if(result){setInvitation(result);setCopied(false);setCopyError('');}
  }
  async function copy(){
    try{await navigator.clipboard.writeText(invitation.onboardingUrl);setCopied(true);setCopyError('');}
    catch{setCopyError('Select and copy the private link below.');}
  }
  return <dialog ref={dialog} className="agent-website-dialog" aria-labelledby="agent-edit-title" onCancel={event=>{event.preventDefault();close();}} onClick={event=>{if(event.target===event.currentTarget)close();}}>
    <div className="agent-dialog-header"><div><span className="admin-label">EDIT AGENT WEBSITE</span><h2 id="agent-edit-title">{website.name}</h2><p>{website.email || 'Login email unavailable'}</p></div><button type="button" className="admin-secondary" onClick={close} disabled={busy} aria-label="Close edit window">Close</button></div>
    {error && <p className="admin-error" role="alert">{error}</p>}
    {message && <p className="agent-dialog-message" role="status">{message}</p>}
    <section className="agent-dialog-section"><h3>Website address</h3>
      <form onSubmit={saveHostname}>
        <label htmlFor="edit-website-hostname">Website hostname</label>
        <input id="edit-website-hostname" value={hostname} onChange={event=>setHostname(event.target.value)} required maxLength={253} autoComplete="off" autoCapitalize="none" spellCheck={false} placeholder="name.brokerage.sncgi.com" disabled={busy}/>
        {conflict && <p className="admin-error" role="alert">The address changed in another dashboard. Your draft has been kept. <button type="button" className="admin-secondary" disabled={busy} onClick={()=>{setHostname(currentHostname);setBaseline(currentHostname);}}>Use current address</button></p>}
        <div className="website-control-actions"><button type="submit" className="admin-secondary" disabled={busy || conflict || !dirty}>{busy?'Please wait…':'Save hostname'}</button></div>
      </form>
      <p className="platform-help">Changing the brokerage name makes its previous address inactive. Custom domains must be connected in Vercel before saving.</p>
      {website.defaultHostname && <p className="platform-help">Brokerage address: {website.defaultHostname}</p>}
      {live && <a href={agentWebsiteHref({siteId:website.site_id,hostname:website.hostname || website.defaultHostname})} target="_blank" rel="noopener noreferrer">Visit website ↗</a>}
    </section>
    <section className="agent-dialog-section"><h3>Domain permissions</h3><p>{website.domainLocked?'Domain name is locked for this agent.':'The agent can change their website name.'}</p>
      <button type="button" className="admin-secondary" disabled={busy} aria-pressed={website.domainLocked===true} onClick={()=>save({action:'set-domain-locked',siteId:website.site_id,locked:!website.domainLocked})}>{website.domainLocked?'Unlock domain name':'Lock domain name'}</button>
      <p className="platform-help">Super Admin can update the address while it is locked.</p>
    </section>
    <section className="agent-dialog-section"><h3>Publishing</h3><p>{website.enabled?live?'Website is live.':'Website enabled; account access is disabled.':'Website is disabled.'}</p>
      <button type="button" className="admin-secondary" disabled={busy} onClick={()=>{
        if(website.enabled && !window.confirm(`Disable ${website.name}’s public website? Their account and content will be kept.`))return;
        save({action:'set-enabled',siteId:website.site_id,enabled:!website.enabled});
      }}>{website.enabled?'Disable website':'Enable website'}</button>
      <p className="platform-help">Disabling the public website keeps the account and editor available.</p>
    </section>
    {website.onboardingStatus==='invited' && website.user_id && <section className="agent-dialog-section"><h3>Account setup</h3><p>The agent has not completed onboarding.</p><button type="button" className="admin-secondary" disabled={busy} onClick={newLink}>Generate new onboarding link</button>
      {invitation && <div className="platform-link-result"><label htmlFor="agent-dialog-link">Share this setup link privately</label><textarea id="agent-dialog-link" rows={3} readOnly value={invitation.onboardingUrl} onFocus={event=>event.target.select()}/><button type="button" className="admin-secondary" onClick={copy}>{copied?'Copied':'Copy link'}</button><p className="platform-help">This link grants account access. It is single-use and expires according to your Supabase Auth settings.</p>{copyError && <p role="alert">{copyError}</p>}</div>}
    </section>}
    {agentAdminHref(website) && <p><a href={agentAdminHref(website)} target="_blank" rel="noopener noreferrer">Open agent admin portal ↗</a></p>}
    <p className="platform-help">Website ID: {website.site_id}</p>
  </dialog>;
}
