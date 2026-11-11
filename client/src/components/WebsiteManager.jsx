import { useEffect, useState } from 'react';
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
      {live && <p><a href={agentWebsiteHref({ siteId: website.site_id, hostname: website.hostname || website.defaultHostname })} target="_blank" rel="noopener noreferrer">Visit website ↗</a></p>}
      {website.defaultHostname && <p className="platform-help">Automatic address: <a href={`https://${website.defaultHostname}/`} target="_blank" rel="noopener noreferrer">{website.defaultHostname}</a></p>}
    </div>
    <form onSubmit={event => { event.preventDefault(); save({ action: 'set-hostname', siteId: website.site_id, hostname }); }}>
      <label htmlFor={`hostname-${website.site_id}`}>Website hostname</label>
      <input id={`hostname-${website.site_id}`} value={hostname} onChange={event => setHostname(event.target.value)} placeholder="yasir.brokerage.sncgi.com" required maxLength={253} autoComplete="off" autoCapitalize="none" spellCheck={false} disabled={busy}/>
      <div className="website-control-actions"><button className="admin-secondary" disabled={busy} type="submit">Save hostname</button>
      {website.hostname && <button className="admin-secondary" disabled={busy} type="button" onClick={() => {
        if (window.confirm('Remove this hostname mapping? The automatic brokerage address and original platform link will still work if the website is enabled.')) save({ action: 'remove-hostname', siteId: website.site_id });
      }}>Remove mapping</button>}</div>
      <p className="platform-help">Automatic brokerage.sncgi.com addresses use the shared wildcard; no separate Vercel entry is needed. For a custom domain, connect it in Vercel and configure DNS before saving it here.</p>
    </form>
  </article>;
}
export default function WebsiteManager() {
  const [websites, setWebsites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    let active = true;
    setLoading(true); setError('');
    adminPlatformRequest('/api/platform/websites').then(data => { if (active) setWebsites(data.websites); })
      .catch(error => { if (active) setError(error.message); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [revision]);
  async function save(body) {
    setBusy(true); setError(''); setMessage('');
    try {
      const { website } = await adminPlatformRequest('/api/platform/websites', body);
      setWebsites(current => current.map(row => row.site_id === website.site_id ? { ...row, ...website } : row));
      setMessage(body.action === 'set-hostname' ? 'Primary hostname saved. Automatic brokerage addresses use the wildcard. Other custom addresses must also be connected in Vercel.' : body.action === 'remove-hostname' ? 'Hostname mapping removed. Remove the unused address in Vercel too if it is no longer needed.' : body.enabled ? 'Website enabled. Automatically published starter websites do not require the agent to finish onboarding first.' : 'Public website disabled. Agent login and content are preserved. Open pages recheck within about 30 seconds when visible, or on refresh.');
    } catch (error) { setError(error.message); }
    finally { setBusy(false); }
  }
  return <section className="platform-agents" aria-label="Website management"><div className="admin-account">
    <div className="platform-table-heading"><h2>Website management</h2><button type="button" className="admin-secondary" disabled={busy || loading} onClick={() => setRevision(value => value + 1)}>Refresh websites</button></div>
    <p>Manage every agent’s public address and publishing status. Disabling a website keeps the account and editor available.</p>
    {message && <p role="status">{message}</p>}{error && <p className="admin-error" role="alert">{error}</p>}
    {loading ? <p role="status">Loading websites…</p> : websites.map(website => <WebsiteRow key={`${website.site_id}-${website.hostname}`} website={website} busy={busy} save={save}/>)}
    {!loading && !websites.length && !error && <p>No agent websites found.</p>}
  </div></section>;
}
