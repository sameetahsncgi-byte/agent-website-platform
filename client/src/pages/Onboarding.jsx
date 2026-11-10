import { websiteHref } from '../services/siteRouting.js';
import { useEffect, useState } from 'react';
import { getSupabase } from '../services/supabase.js';
import { platformRequest } from '../services/platformApi.js';
import '../styles/AgentAdmin.css';
import '../styles/PlatformAdmin.css';

function invitationFromUrl() {
  const params = new URLSearchParams(window.location.hash.split('?')[1] || '');
  const token = params.get('token_hash');
  const type = params.get('type');
  return token && /^[a-zA-Z0-9_-]{20,512}$/.test(token) && ['invite','recovery'].includes(type) ? { token, type } : null;
}
async function ownRecord(client) {
  const { data: userData, error: userError } = await client.auth.getUser();
  if (userError || !userData.user) return null;
  const { data, error } = await client.from('agent_onboarding').select('user_id, name, email, site_id, site_slug, status').eq('user_id',userData.user.id).maybeSingle();
  if (error) throw Error('Unable to load setup information. Contact your platform administrator.');
  return data;
}
export default function Onboarding() {
  const [invitation] = useState(invitationFromUrl);
  const [record, setRecord] = useState(null);
  const [checking, setChecking] = useState(!invitation);
  const [busy, setBusy] = useState(false);
  const [accepted, setAccepted] = useState(false);
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [complete, setComplete] = useState(false);
  const [passwordSaved, setPasswordSaved] = useState(false);
  useEffect(() => {
    // A link is consumed only after the recipient presses Continue.
    if (invitation) return;
    let active=true;
    Promise.resolve().then(()=>ownRecord(getSupabase())).then(data=>{ if(active){ setRecord(data);setComplete(data?.status==='active'); } })
      .catch(error=>{ if(active)setError(error.message); }).finally(()=>{ if(active)setChecking(false); });
    return ()=>{active=false;};
  }, [invitation]);
  async function accept() {
    setBusy(true);setError('');
    try {
      const client=getSupabase();
      const { error }=await client.auth.verifyOtp({token_hash:invitation.token,type:invitation.type});
      // Remove the credential from browser history after the verification attempt.
      window.history.replaceState(null,'',`${window.location.pathname}${window.location.search}#/onboarding`);
      if(error)throw Error('This link is expired, already used, or invalid. Ask your administrator for a new onboarding link.');
      const data=await ownRecord(client);
      if(!data)throw Error('No pending agent setup was found for this account. Contact your administrator.');
      setRecord(data);setAccepted(true);setComplete(data.status==='active');
    }catch(error){setError(error.message);}finally{setBusy(false);}
  }
  async function finish(event) {
    event.preventDefault();setBusy(true);setError('');
    try {
      if (!passwordSaved) {
        if(password.length<12 || password.length>128)throw Error('Use a password between 12 and 128 characters.');
        if(password!==confirm)throw Error('Your passwords do not match.');
      }
      await platformRequest('/api/platform/complete-onboarding',passwordSaved ? {} : { password });
      setPassword('');setConfirm('');setComplete(true);
    }catch(error){
      if(error.passwordSaved){setPasswordSaved(true);setPassword('');setConfirm('');}
      setError(error.message);
    }finally{setBusy(false);}
  }
  return <div className="agent-admin"><header className="admin-topbar"><span className="admin-wordmark"><span>SA</span> Your agent workspace</span></header>
    <main className="platform-onboarding"><section className="admin-login-card">
      <span className="admin-label">YOUR WEBSITE STARTS HERE</span>
      {checking ? <p role="status">Checking your setup…</p> : complete ? <><h1>You’re ready to begin.</h1><p>Your account is ready. Next, add your photo, biography and contact details in the agent editor.</p><a className="admin-primary" href={websiteHref(record.site_id, 'admin')}>Open my agent editor →</a><p className="platform-help">Your website has its own address. Add your details in the editor, then use View my website to open it.</p></> : invitation && !accepted && !record ? <><h1>A space for your next chapter.</h1><p>Accept your private invitation, then choose a password for your agent account.</p><p className="platform-help">Continue signs this browser into the invited account. Use a private window if you are already signed in as another agent or administrator.</p><button type="button" className="admin-primary" onClick={accept} disabled={busy}>{busy?'Checking invitation…':'Continue with invitation'}</button></> : record ? <><h1>Welcome, {record.name.split(' ')[0]}.</h1><p>Set the password for <strong>{record.email}</strong>.</p><form onSubmit={finish}><fieldset disabled={busy}>
        {passwordSaved ? <p>Your password is saved. Finish activating your account below.</p> : <><label htmlFor="onboard-password">New password</label><input id="onboard-password" type="password" autoComplete="new-password" minLength={12} maxLength={128} required value={password} onChange={e=>setPassword(e.target.value)}/>
        <label htmlFor="onboard-confirm">Confirm password</label><input id="onboard-confirm" type="password" autoComplete="new-password" minLength={12} maxLength={128} required value={confirm} onChange={e=>setConfirm(e.target.value)}/>
        <p className="platform-help">Use at least 12 characters. Your project’s additional password rules still apply.</p></>}<button className="admin-primary" type="submit" disabled={busy}>{busy?'Saving your account…':passwordSaved?'Finish activating account':'Set password & continue'}</button>
      </fieldset></form></> : <><h1>Open your invitation link.</h1><p>Use the private link your administrator shared. If it expired, request a new one.</p><a className="admin-back" href="#/admin">Already set up? Sign in →</a></>}
      {error && <p role="alert" className="admin-error">{error}</p>}
    </section></main>
  </div>;
}
