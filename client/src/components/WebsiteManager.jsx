import { notifyWebsiteSettingsChanged, watchWebsiteSettings } from '../services/websiteSync.js';
import { useEffect, useRef, useState } from 'react';
import { adminPlatformRequest } from '../services/platformApi.js';
import { agentWebsiteHref } from '../services/siteRouting.js';

function WebsiteRow({ website, busy, save }) {
  const [hostname, setHostname] = useState(website.hostname || '');
  const live = (website.publicEligible ?? website.active) && website.enabled;
  return <article className="website-control-row">
    <div><h3>{website.name}</h3><small>{website.site_id}</small><p><strong>{!website.enabled ? 'Website disabled' : live ? website.active ? 'Website enabled' : 'Website live · account setup pending' : 'Account access disabled'}</strong></p>
      <button className="admin-secondary" type="button" disabled={busy} onClick={() => {
        if (website.enabled && !window.confirm(`Disable ${website.name}’s public website? Their account and content will be kept.`)) return;
        save({ action: 'set-enabled', siteId: website.site_id, enabled: !website.enabled });
      }}>{website.enabled ? 'Disable website' : 'Enable website'}</button>
      <p><strong>{website.domainLocked ? 'Domain name locked for agent' : 'Agent can change domain name'}</strong></p>
      <button className="admin-secondary" type="button" aria-pressed={website.domainLocked===true} disabled={busy} onClick={()=>save({action:'set-domain-locked',siteId:website.site_id,locked:!website.domainLocked})}>{website.domainLocked?'Unlock domain name':'Lock domain name'}</button>
      {live && <p><a href={agentWebsiteHref({ siteId: website.site_id, hostname: website.hostname || website.defaultHostname })} target="_blank" rel="noopener noreferrer">Visit website ↗</a></p>}
      {website.defaultHostname && <p className="platform-help">Automatic address: <a href={`https://${website.defaultHostname}/`} target="_blank" rel="noopener noreferrer">{website.defaultHostname}</a></p>}
    </div>
    <form onSubmit={event => { event.preventDefault(); save({ action: 'set-hostname', siteId: website.site_id, hostname }); }}>
      <label htmlFor={`hostname-${website.site_id}`}>Website hostname</label>
      <input id={`hostname-${website.site_id}`} value={hostname} onChange={event => setHostname(event.target.value)} placeholder="yasir.brokerage.sncgi.com" required maxLength={253} autoComplete="off" autoCapitalize="none" spellCheck={false} disabled={busy}/>
      <div className="website-control-actions"><button className="admin-secondary" disabled={busy} type="submit">Save hostname</button>
      </div>
      <p className="platform-help">Saving a new brokerage.sncgi.com hostname renames this agent’s automatic address. The previous brokerage address stops working after a rename. No separate Vercel entry is needed. For a custom domain, connect it in Vercel and configure DNS before saving it here.</p>
    </form>
  </article>;
}
export default function WebsiteManager() {
  const busyRef=useRef(false);
  const listVersion=useRef(0);
  const [websites, setWebsites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    let active=true;
    let refreshing=false;
    async function reload(initial=false){
      if(refreshing || (busyRef.current && !initial)) return;
      refreshing=true;
      const version=++listVersion.current;
      if(initial){setLoading(true);setError('');}
      try {
        const data=await adminPlatformRequest('/api/platform/websites');
        if(active && version===listVersion.current)setWebsites(data.websites);
      }catch(error){if(active && initial)setError(error.message);}
      finally{refreshing=false;if(active && initial)setLoading(false);}
    }
    reload(true);
    const stop=watchWebsiteSettings(()=>reload());
    return ()=>{active=false;stop();};
  }, [revision]);
  async function save(body) {
    busyRef.current=true;listVersion.current++;
    setBusy(true); setError(''); setMessage('');
    try {
      const { website } = await adminPlatformRequest('/api/platform/websites', body);
      setWebsites(current => current.map(row => row.site_id === website.site_id ? { ...row, ...website } : row));
      notifyWebsiteSettingsChanged();
      setMessage(body.action === 'set-domain-locked' ? body.locked ? 'Domain name locked. The agent must contact support to change it.' : 'Domain name unlocked. The agent can change it again.' : body.action === 'set-hostname' ? 'Website address saved. Both dashboards refresh automatically within about 10 seconds.' : body.enabled ? 'Website enabled. Automatically published starter websites do not require the agent to finish onboarding first.' : 'Public website disabled. Agent login and content are preserved. Open pages recheck within about 30 seconds when visible, or on refresh.');
    } catch (error) { setError(error.message); }
    finally { busyRef.current=false;setBusy(false); }
  }
  return <section className="platform-agents" aria-label="Website management"><div className="admin-account">
    <div className="platform-table-heading"><h2>Website management</h2><button type="button" className="admin-secondary" disabled={busy || loading} onClick={() => setRevision(value => value + 1)}>Refresh websites</button></div>
    <p>Manage every agent’s public address and publishing status. Disabling a website keeps the account and editor available.</p>
    {message && <p role="status">{message}</p>}{error && <p className="admin-error" role="alert">{error}</p>}
    {loading ? <p role="status">Loading websites…</p> : websites.map(website => <WebsiteRow key={`${website.site_id}-${website.hostname}`} website={website} busy={busy} save={save}/>)}
    {!loading && !websites.length && !error && <p>No agent websites found.</p>}
  </div></section>;
}
