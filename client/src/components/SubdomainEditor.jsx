import { notifyWebsiteSettingsChanged } from '../services/websiteSync.js';
import '../styles/PlatformAdmin.css';
import { useEffect, useState } from 'react';
import { defaultAgentUrl } from '../services/agentSubdomains.js';
import { renameMySubdomain } from '../services/subdomainRename.js';
export default function SubdomainEditor({agent,onChanged}) {
  const [value,setValue]=useState(agent.subdomainSlug || '');
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState('');
  const [message,setMessage]=useState('');
  useEffect(()=>setValue(agent.subdomainSlug || ''),[agent.subdomainSlug]);
  async function save(event) {
    event.preventDefault();
    if(agent.domainLocked){setError('Domain is locked. Please contact support.');return;}
    setBusy(true);setError('');setMessage('');
    try {
      const result=await renameMySubdomain(value);
      setValue(result.subdomain_slug);
      onChanged({...agent,subdomainSlug:result.subdomain_slug,hostname:result.hostname,websiteEnabled:result.enabled,domainLocked:result.domain_locked===true});
      setMessage('Website name saved. The previous brokerage address is now inactive.');
      notifyWebsiteSettingsChanged();
    }catch(error){setError(error.message);}finally{setBusy(false);}
  }
  return <section className="admin-account" aria-label="Website address"><h2>Your website address</h2>
    <p>Choose the name before .brokerage.sncgi.com. It must be unique.</p>
    {agent.subdomainSlug && <p><a href={defaultAgentUrl(agent.subdomainSlug)} target="_blank" rel="noopener noreferrer">Open my brokerage website ↗</a></p>}
    {agent.domainLocked && <p className="admin-error" role="status">Domain is locked. Please contact support.</p>}
    <form onSubmit={save}><label htmlFor="agent-subdomain">Website name</label>
      <div className="subdomain-input"><input id="agent-subdomain" value={value} onChange={e=>{setValue(e.target.value.toLowerCase());setError('');setMessage('');}} required minLength={3} maxLength={40} pattern="[a-z0-9]+(-[a-z0-9]+)*" spellCheck={false} autoCapitalize="none" autoComplete="off" disabled={busy || agent.domainLocked}/><span>.brokerage.sncgi.com</span></div>
      {value && <p className="platform-help">New address: {value}.brokerage.sncgi.com</p>}
      <button type="submit" className="admin-secondary" disabled={busy || agent.domainLocked}>{busy?'Saving…':'Save website name'}</button>
    </form>
    {agent.hostname && !agent.hostname.endsWith('.brokerage.sncgi.com') && <p>Your custom hostname stays primary. This changes your automatic brokerage address.</p>}
    {error && <p className="admin-error" role="alert">{error}</p>}{message && <p role="status">{message}</p>}
  </section>;
}
