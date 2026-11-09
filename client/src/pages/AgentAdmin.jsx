import { useEffect, useState } from 'react';
import { authRequest } from '../services/auth.js';
import { getSupabase } from '../services/supabase.js';
import '../styles/AgentAdmin.css';

export default function AgentAdmin() {
  const [agent, setAgent] = useState(null);
  const [checking, setChecking] = useState(true);
  const [error, setError] = useState('');
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
  async function login(event) {
    event.preventDefault(); setBusy(true); setError('');
    try { const data = await authRequest('/api/auth/login', { id, password }); setAgent(data.agent); setPassword(''); }
    catch (error) { setError(error.message); }
    finally { setBusy(false); }
  }
  async function logout() {
    setBusy(true); setError('');
    try { await authRequest('/api/auth/logout', {}); setAgent(null); setPassword(''); }
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
    <header className="admin-topbar"><a href="#/home" className="admin-wordmark"><span>SA</span> Agent workspace</a><a href="#/home">View website ↗</a></header>
    {checking ? <main className="admin-loading" role="status">Checking your session…</main> : agent ?
      <main className="admin-workspace">
        <aside className="admin-sidebar"><span className="admin-label">WORKSPACE</span><a href="#/admin" aria-current="page">Overview</a><a href="#/about">View About Me ↗</a><a href="#/contact">View Contact ↗</a><p>Signed in as<br/><strong>{agent.id}</strong></p><button onClick={logout} disabled={busy} className="admin-secondary">{busy ? 'Please wait…' : 'Log out'}</button></aside>
        <section className="admin-overview"><span className="admin-label">YOUR AGENT PORTAL</span><h1>Welcome, {agent.name}.</h1><p>Your workspace is ready. This first version gives you a protected agent account.</p>
          {error && <p role="alert" className="admin-error">{error}</p>}
          <div className="admin-account"><span className="admin-status">Signed in</span><h2>Account details</h2><dl><div><dt>Agent ID</dt><dd>{agent.id}</dd></div><div><dt>Role</dt><dd>Agent</dd></div><div><dt>Website ID</dt><dd>{agent.siteId}</dd></div></dl><button className="admin-secondary" onClick={refreshSession} disabled={busy}>Check session</button></div>
          <div className="admin-modules"><article><span className="admin-label">NEXT STEP</span><h2>About Me</h2><p>Your profile and biography editor will be added here.</p><a href="#/about">View current page ↗</a></article><article><span className="admin-label">NEXT STEP</span><h2>Contact information</h2><p>Your phone, email, and contact editor will be added here.</p><a href="#/contact">View current page ↗</a></article></div>
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
