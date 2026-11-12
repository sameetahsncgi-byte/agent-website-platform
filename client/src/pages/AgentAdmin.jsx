import {agentAdminHref} from '../services/agentPortal.js';
import SeoEditor from '../components/SeoEditor.jsx';
import { watchWebsiteSettings } from '../services/websiteSync.js';
import SubdomainEditor from '../components/SubdomainEditor.jsx';
import { useEffect, useRef, useState } from 'react';
import { agentWebsiteHref } from '../services/siteRouting.js';
import { authRequest } from '../services/auth.js';
import { getSupabase } from '../services/supabase.js';
import '../styles/AgentAdmin.css';
import AgentContentEditor from '../components/AgentContentEditor.jsx';

export default function AgentAdmin() {
  const syncVersion=useRef(0);
  const [panel,setPanel]=useState('website');
  const [agent, setAgent] = useState(null);
  const [seoDirty,setSeoDirty]=useState(false);
  const [editorDirty, setEditorDirty] = useState(false);
  const [checking, setChecking] = useState(true);
  const [error, setError] = useState('');
  const [syncError, setSyncError] = useState('');
  const [busy, setBusy] = useState(false);
  const [id, setId] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let active = true;
    authRequest('/api/admin/me').then(data => { if (active) setAgent(data.agent); })
      .catch(error => { if (active && error.status !== 401) setError(error.message); })
      .finally(() => { if (active) setChecking(false); });
    let subscription;
    try {
      ({ data: { subscription } } = getSupabase().auth.onAuthStateChange(event => {
        if (active && event === 'SIGNED_OUT') setAgent(null);
      }));
    } catch { /* Missing configuration is reported by authRequest above. */ }
    return () => { active = false; subscription?.unsubscribe(); };
  }, [attempt]);
  useEffect(() => {
    if(!agent?.id) return;
    let active=true;
    const id=agent.id;
    let refreshing=false;
    async function refreshWebsiteSettings(){
      if(refreshing)return;
      refreshing=true;
      const version=++syncVersion.current;
      try {
        const data=await authRequest('/api/admin/me');
        if(active && version===syncVersion.current){setAgent(current=>current?.id===id?data.agent:current);setSyncError('');}
      } catch(error) {
        if(active && version===syncVersion.current){
          if([401,403].includes(error.status)){setAgent(null);setError(error.message);}
          else setSyncError('Website settings could not refresh. '+error.message);
        }
      } finally { refreshing=false; }
    }
    const stop=watchWebsiteSettings(refreshWebsiteSettings);
    return ()=>{active=false;stop();};
  },[agent?.id]);
  function domainChanged(updated){syncVersion.current++;setAgent(updated);}
  async function login(event) {
    event.preventDefault(); setBusy(true); setError('');
    try { const data = await authRequest('/api/auth/login', { id, password }); setAgent(data.agent); setPassword(''); }
    catch (error) { setError(error.message); }
    finally { setBusy(false); }
  }
  async function logout() {
    if ((editorDirty || seoDirty) && !window.confirm('Log out and discard your unsaved changes?')) return;
    setEditorDirty(false);
    setBusy(true); setError('');
    try { await authRequest('/api/auth/logout', {}); setAgent(null); setPassword('');setSeoDirty(false);setPanel('website'); }
    catch (error) { setError(error.message); }
    finally { setBusy(false); }
  }
  async function refreshSession() {
    setBusy(true); setError('');
    try { const data = await authRequest('/api/admin/me'); setAgent(data.agent); }
    catch (error) { if (error.status === 401 || error.status === 403) setAgent(null); setError(error.message); }
    finally { setBusy(false); }
  }
  return <div className="agent-admin">
    <header className="admin-topbar"><span className="admin-wordmark"><span>SA</span> Agent workspace</span>{agent && <a href={agentWebsiteHref(agent)} target="_blank" rel="noopener noreferrer">View my website ↗</a>}</header>
    {checking ? <main className="admin-loading" role="status">Checking your session…</main> : agent ?
      <main className="admin-workspace">
        <aside className="admin-sidebar"><span className="admin-label">WORKSPACE</span><nav aria-label="Agent workspace sections">
          <button id="workspace-editor-nav" type="button" className="admin-section-link" aria-current={panel==='website'?'page':undefined} aria-controls="workspace-editor-panel" onClick={()=>setPanel('website')}>Website editor</button>
          <button id="workspace-seo-nav" type="button" className="admin-section-link" aria-current={panel==='seo'?'page':undefined} aria-controls="workspace-seo-panel" onClick={()=>setPanel('seo')}>Site SEO</button>
        </nav><p>Signed in as<br/><strong>{agent.id}</strong></p><button onClick={logout} disabled={busy} className="admin-secondary">{busy ? 'Please wait…' : 'Log out'}</button></aside>
        <section className="admin-overview"><span className="admin-label">YOUR AGENT PORTAL</span><h1>{panel==='seo'?'Site SEO':`Welcome, ${agent.name}.`}</h1><p>{panel==='seo'?'Manage page titles, descriptions, URLs and social previews for your website.':'Manage your About Me page, contact details, and website images.'}</p>
          {error && <p role="alert" className="admin-error">{error}</p>}
          <section id="workspace-editor-panel" className="admin-module-panel" aria-labelledby="workspace-editor-nav" hidden={panel!=='website'}>
          <div className="admin-account"><span className="admin-status">Signed in</span><h2>Account details</h2><dl><div><dt>Agent ID</dt><dd>{agent.id}</dd></div><div><dt>Role</dt><dd>Agent</dd></div><div><dt>Website ID</dt><dd>{agent.siteId}</dd></div></dl><p>Your website: <a href={agentWebsiteHref(agent)} target="_blank" rel="noopener noreferrer">{agentWebsiteHref(agent)}</a></p><button className="admin-secondary" onClick={refreshSession} disabled={busy}>Check session</button></div>
          {agentAdminHref(agent) && window.location.origin!==new URL(agentAdminHref(agent)).origin && <p className="admin-error" role="status">Your agent admin portal is <a href={agentAdminHref(agent)}>{agentAdminHref(agent)}</a>. Open it and sign in there to use your own website address. Your current unsaved edits are kept here until you leave.</p>}
          {!agent.websiteEnabled && <p className="admin-error" role="status">Your public website is disabled by the platform administrator. You can still edit and save your content here.</p>}
          {syncError && <p className="admin-error" role="alert">{syncError}</p>}
          <SubdomainEditor key={`subdomain-${agent.siteId}`} agent={agent} onChanged={domainChanged} />
          <AgentContentEditor key={agent.siteId} agent={agent} onDirtyChange={setEditorDirty} />
          </section>
          <section id="workspace-seo-panel" className="admin-module-panel" aria-labelledby="workspace-seo-nav" hidden={panel!=='seo'}>
            <SeoEditor key={`seo-${agent.siteId}`} agent={agent} onDirtyChange={setSeoDirty}/>
          </section>
        </section>
      </main> : <main className="admin-login-layout"><section className="admin-login-intro"><span className="admin-label">A SPACE FOR YOUR NEXT CHAPTER</span><h1>Your website.<br/>Your workspace.</h1><p>Sign in to your agent account to access your website dashboard.</p><div className="admin-intro-note">Agent portal · Online demo</div></section>
      <section className="admin-login-card"><span className="admin-label">AGENT ACCESS</span><h2>Welcome back.</h2><p>Enter the email and password created in Supabase Authentication.</p>
        <form onSubmit={login}><label htmlFor="agent-id">Email address</label><input id="agent-id" type="email" name="username" autoComplete="username" autoCapitalize="none" spellCheck="false" maxLength={254} required value={id} onChange={event => setId(event.target.value)} placeholder="you@example.com" />
          <label htmlFor="agent-password">Password</label><div className="admin-password"><input id="agent-password" name="password" type={showPassword ? 'text' : 'password'} autoComplete="current-password" maxLength={128} required value={password} onChange={event => setPassword(event.target.value)} /><button type="button" aria-controls="agent-password" aria-pressed={showPassword} onClick={() => setShowPassword(value => !value)}>{showPassword ? 'Hide' : 'Show'}</button></div>
          {error && <div className="admin-error" role="alert">{error}</div>}
          <button className="admin-primary" type="submit" disabled={busy}>{busy ? 'Signing in…' : 'Sign in →'}</button>
        </form><p className="admin-help">Need access or a password reset? Contact your administrator.</p><a href="#/home" className="admin-back">← Return to website</a>
        {error && <button type="button" className="admin-retry" onClick={() => { setError(''); setChecking(true); setAttempt(value => value + 1); }}>Retry connection</button>}
      </section></main>}
  </div>;
}
