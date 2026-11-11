import { notifyWebsiteSettingsChanged } from '../services/websiteSync.js';
import { defaultAgentUrl } from '../services/agentSubdomains.js';
import { useState } from 'react';
import { adminPlatformRequest } from '../services/platformApi.js';
import '../styles/PlatformAdmin.css';
export default function AgentManager() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);
  const [copied, setCopied] = useState(false);
  const [form, setForm] = useState({ name:'', email:'', slug:'' });
  const [requestId, setRequestId] = useState(() => crypto.randomUUID());
  function update(key, value) {
    setForm(current => ({ ...current, [key]:value }));
    setRequestId(crypto.randomUUID()); setError('');
  }
  async function createAgent(event) {
    event.preventDefault(); setBusy(true); setError(''); setResult(null); setCopied(false);
    try {
      const data = await adminPlatformRequest('/api/platform/agents', { action:'create', ...form, requestId });
      setResult(data); setForm({ name:'', email:'', slug:'' }); setRequestId(crypto.randomUUID());
      notifyWebsiteSettingsChanged();
    } catch (error) { setError(error.message); }
    finally { setBusy(false); }
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
  </section>;
}
