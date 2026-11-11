import { watchWebsiteSettings } from '../services/websiteSync.js';
import { defaultAgentUrl } from '../services/agentSubdomains.js';
import { useEffect, useState } from 'react';
import { adminPlatformRequest } from '../services/platformApi.js';
import '../styles/PlatformAdmin.css';
export default function AgentManager() {
  const [agents, setAgents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [listError, setListError] = useState('');
  const [result, setResult] = useState(null);
  const [copied, setCopied] = useState(false);
  const [form, setForm] = useState({ name:'', email:'', slug:'' });
  const [requestId, setRequestId] = useState(() => crypto.randomUUID());
  const [refresh, setRefresh] = useState(0);
  useEffect(() => {
    let active = true;
    setLoading(true); setListError('');
    adminPlatformRequest('/api/platform/agents').then(data => { if (active) setAgents(data.agents); })
      .catch(error => { if (active) setListError(error.message); })
      .finally(() => { if (active) setLoading(false); });
    const stop=watchWebsiteSettings(()=>{
      adminPlatformRequest('/api/platform/agents').then(data=>{if(active)setAgents(data.agents);}).catch(()=>{});
    });
    return () => { active = false; stop(); };
  }, [refresh]);
  function update(key, value) {
    setForm(current => ({ ...current, [key]:value }));
    setRequestId(crypto.randomUUID()); setError('');
  }
  async function createAgent(event) {
    event.preventDefault(); setBusy(true); setError(''); setResult(null); setCopied(false);
    try {
      const data = await adminPlatformRequest('/api/platform/agents', { action:'create', ...form, requestId });
      setResult(data); setForm({ name:'', email:'', slug:'' }); setRequestId(crypto.randomUUID());
    } catch (error) { setError(error.message); }
    finally { setBusy(false); setRefresh(value => value + 1); }
  }
  async function newLink(agent) {
    if (result && !window.confirm('Replace the currently displayed link with a new invitation link?')) return;
    setBusy(true); setError(''); setCopied(false);
    try { setResult(await adminPlatformRequest('/api/platform/agents', { action:'regenerate', userId:agent.user_id })); }
    catch (error) { setError(error.message); }
    finally { setBusy(false); setRefresh(value => value + 1); }
  }
  async function copyLink() {
    try { await navigator.clipboard.writeText(result.onboardingUrl); setCopied(true); }
    catch { setError('Automatic copying is unavailable. Select and copy the link below.'); }
  }
  return <section className="platform-agents" aria-label="Agent management">
    <div className="platform-section-heading"><div><span className="admin-label">AGENT ONBOARDING</span><h2>A website for their next chapter.</h2><p>Create an account and copy a private setup link. No invitation email is sent.</p></div></div>
    <div className="admin-account">
      <h2>Add an agent</h2>
      <form onSubmit={createAgent}>
        <fieldset disabled={busy} className="platform-fields">
          <label>Agent name<input value={form.name} onChange={e=>update('name',e.target.value)} required maxLength={100} autoComplete="off" placeholder="Jordan Muse"/></label>
          <label>Login email<input type="email" value={form.email} onChange={e=>update('email',e.target.value)} required maxLength={254} autoComplete="off" placeholder="agent@example.com"/></label>
          <label>Website handle<input value={form.slug} onChange={e=>update('slug',e.target.value.toLowerCase())} required minLength={3} maxLength={40} pattern="[a-z0-9]+(-[a-z0-9]+)*" autoCapitalize="none" spellCheck={false} autoComplete="off" placeholder="jordan-muse"/></label>
        </fieldset>
        {form.slug && <p className="platform-help">Website address: <strong>{form.slug}.brokerage.sncgi.com</strong></p>}
        <p className="platform-help">Creating an agent publishes their starter website immediately. They can personalize it after accepting the private onboarding link.</p>
        <button className="admin-primary platform-submit" type="submit" disabled={busy}>{busy ? 'Working…' : 'Create website & onboarding link'}</button>
      </form>
    </div>
    {error && <p role="alert" className="admin-error">{error}</p>}
    {result && <div className="platform-link-result" role="status">
      <p><strong>Public website: </strong><a href={result.websiteUrl || defaultAgentUrl(result.agent.site_slug)} target="_blank" rel="noopener noreferrer">{result.websiteUrl || defaultAgentUrl(result.agent.site_slug)}</a></p>
      <span className="admin-label">PRIVATE ONBOARDING LINK</span><h3>{result.agent.name}</h3><p>{result.agent.email}</p>
      <label htmlFor="generated-onboarding-link">Copy and share this link privately</label>
      <textarea id="generated-onboarding-link" rows={3} readOnly value={result.onboardingUrl} onFocus={e=>e.target.select()}/>
      <button type="button" className="admin-secondary" onClick={copyLink}>{copied ? 'Copied' : 'Copy link'}</button>
      <p className="platform-help">The link gives access to this agent account. Keep this separate from the public website address. It is single-use and expires according to your Supabase Auth email OTP settings. Share it with the intended agent. Generate a new link if needed.</p>
    </div>}
    <div className="admin-account">
      <div className="platform-table-heading"><h2>Agent accounts</h2><button className="admin-secondary" disabled={loading || busy} onClick={()=>setRefresh(value=>value+1)}>Refresh</button></div>
      {loading && <p role="status">Loading agent accounts…</p>}
      {listError && <p className="admin-error" role="alert">{listError}</p>}
      {!loading && !listError && !agents.length && <p>No agents created through this onboarding flow yet. Existing manually created agents remain unchanged.</p>}
      {!loading && !listError && agents.length > 0 && <div className="platform-table-scroll"><table><thead><tr><th>Agent</th><th>Website handle</th><th>Status</th><th>Action</th></tr></thead><tbody>{agents.map(agent=><tr key={agent.user_id}>
        <td><strong>{agent.name}</strong><small>{agent.email}</small></td><td>{agent.site_slug}</td><td><span className={`platform-status ${agent.status}`}>{agent.status === 'active' ? 'Account ready' : 'Invited / setup pending'}</span></td><td>{agent.status === 'invited' ? <button type="button" className="admin-secondary" disabled={busy} onClick={()=>newLink(agent)}>New link</button> : <span>Manage below</span>}</td>
      </tr>)}</tbody></table></div>}
      <p className="platform-help">Account ready means the invitation was accepted and a password was set. Starter websites are published before that step unless disabled. Use Website management below to manage the public address and enable or disable the website. Refresh that list after adding a new agent.</p>
    </div>
  </section>;
}
