import { useEffect, useState } from 'react';
import { isSuperAdminLocation, SUPER_ADMIN_URL } from '../services/adminLocation.js';
import { getAdminSupabase } from '../services/adminSupabase.js';
import { platformAuth } from '../services/platformAuth.js';
import '../styles/AgentAdmin.css';
import WebsiteManager from '../components/WebsiteManager.jsx';
import AgentManager from '../components/AgentManager.jsx';
import '../styles/PlatformAdmin.css';

export default function SuperAdmin() {
  if (!isSuperAdminLocation()) {
    return <div className="agent-admin">
      <header className="admin-topbar"><span className="admin-wordmark"><span>SA</span> Platform administration</span></header>
      <main className="admin-overview platform-workspace">
        <section className="admin-account" aria-label="Super Admin location">
          <h1>Open the platform website</h1>
          <p>Super Admin is available only on the platform website.</p>
          <a className="admin-secondary" href={SUPER_ADMIN_URL}>Open Super Admin ↗</a>
        </section>
      </main>
    </div>;
  }
  // Mount authentication and management components only at the allowed origin.
  return <PlatformSuperAdmin />;
}

function PlatformSuperAdmin() {
  const [admin, setAdmin] = useState(null);
  const [checking, setChecking] = useState(true);
  const [busy, setBusy] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [revision, setRevision] = useState(0);

  useEffect(() => {
    let active = true;
    setChecking(true);
    platformAuth.current()
      .then(account => { if (active) { setAdmin(account); setError(''); } })
      .catch(error => { if (active) { setAdmin(null); setError(error.message); } })
      .finally(() => { if (active) setChecking(false); });
    return () => { active = false; };
  }, [revision]);

  useEffect(() => {
    let subscription;
    try {
      ({ data: { subscription } } = getAdminSupabase().auth.onAuthStateChange(event => {
        if (event === 'SIGNED_OUT') setAdmin(null);
        // Revalidate outside the Supabase callback through the effect above.
        if (['SIGNED_OUT', 'SIGNED_IN', 'TOKEN_REFRESHED'].includes(event)) {
          setAdmin(null);
          setRevision(value => value + 1);
        }
      }));
    } catch { /* The access check displays configuration errors. */ }
    return () => subscription?.unsubscribe();
  }, []);

  async function login(event) {
    event.preventDefault();
    setBusy(true); setError('');
    try { setAdmin(await platformAuth.login(email, password)); }
    catch (error) { setAdmin(null); setError(error.message); }
    finally { setPassword(''); setBusy(false); }
  }

  async function logout() {
    setBusy(true); setError('');
    try { await platformAuth.logout(); setAdmin(null); }
    catch (error) { setError(error.message); }
    finally { setBusy(false); }
  }

  return <div className="agent-admin">
    <header className="admin-topbar">
      <span className="admin-wordmark"><span>SA</span> Platform administration</span>
      <a href="#/home">View website ↗</a>
    </header>
    {checking ? <main className="admin-loading" role="status">Checking administrator access…</main> : admin ?
      <main className="admin-overview platform-workspace">
        <span className="admin-label">SUPER ADMIN</span><h1>Your platform workspace.</h1>
        <div className="admin-account">
          <span className="admin-status">Access verified</span><h2>You’re signed in.</h2><p>{admin.email}</p>
          <p>Manage agent accounts and generate private onboarding links.</p>
          {error && <p className="admin-error" role="alert">{error}</p>}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
            <button type="button" className="admin-secondary" onClick={() => setRevision(value => value + 1)} disabled={busy}>Check access</button>
            <button type="button" className="admin-secondary" onClick={logout} disabled={busy}>{busy ? 'Please wait…' : 'Log out'}</button>
          </div>
        </div>
        <AgentManager key={admin.id} />
        <WebsiteManager key={`websites-${admin.id}`} />
      </main> : <main className="admin-login-layout">
        <section className="admin-login-intro">
          <span className="admin-label">PLATFORM MANAGEMENT</span><h1>One workspace.<br/>Every agent.</h1>
          <p>Sign in with your separate Super Admin account.</p><div className="admin-intro-note">Platform owner access</div>
        </section>
        <section className="admin-login-card">
          <span className="admin-label">ADMINISTRATOR ACCESS</span><h2>Welcome back.</h2><p>Use the administrator account enabled in Supabase.</p>
          <form onSubmit={login}>
            <label htmlFor="super-admin-email">Email address</label>
            <input id="super-admin-email" type="email" name="username" autoComplete="username" autoCapitalize="none" spellCheck={false} required maxLength={254} value={email} onChange={event => setEmail(event.target.value)} />
            <label htmlFor="super-admin-password">Password</label>
            <div className="admin-password"><input id="super-admin-password" type={showPassword ? 'text' : 'password'} name="password" autoComplete="current-password" required value={password} onChange={event => setPassword(event.target.value)} />
              <button type="button" aria-controls="super-admin-password" aria-pressed={showPassword} onClick={() => setShowPassword(value => !value)}>{showPassword ? 'Hide' : 'Show'}</button>
            </div>
            {error && <p className="admin-error" role="alert">{error}</p>}
            <button type="submit" className="admin-primary" disabled={busy}>{busy ? 'Signing in…' : 'Sign in'}</button>
          </form>
          <p className="admin-help">Agent accounts cannot access this workspace.</p>
          <button type="button" className="admin-retry" onClick={() => setRevision(value => value + 1)} disabled={busy}>Retry access check</button>
        </section>
      </main>}
  </div>;
}
