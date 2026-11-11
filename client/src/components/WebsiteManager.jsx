import {notifyWebsiteSettingsChanged,watchWebsiteSettings} from '../services/websiteSync.js';
import {useEffect,useRef,useState} from 'react';
import {adminPlatformRequest} from '../services/platformApi.js';
import {filterAgentWebsites,agentAccountStatus,agentWebsiteStatus} from '../services/agentDirectory.js';
import AgentWebsiteDialog from './AgentWebsiteDialog.jsx';

export function AgentWebsiteTable({websites,onEdit}) {
  return <div className="platform-table-scroll"><table><thead><tr><th>Agent</th><th>Website</th><th>Status</th><th>Action</th></tr></thead><tbody>{websites.map(website=><tr key={website.site_id}>
    <td><strong>{website.name}</strong><small>{website.email || 'Login email unavailable'}</small></td>
    <td className="agent-directory-host">{website.hostname || website.defaultHostname || 'Address not assigned'}</td>
    <td><span className={`platform-status ${website.enabled && (website.publicEligible ?? website.active)?'active':''}`}>{agentWebsiteStatus(website)}</span><small>{agentAccountStatus(website)}</small>{website.domainLocked && <small>Domain locked</small>}</td>
    <td><button type="button" className="admin-secondary" aria-haspopup="dialog" aria-label={`Edit ${website.name}`} onClick={event=>onEdit(website.site_id,event.currentTarget)}>Edit</button></td>
  </tr>)}</tbody></table></div>;
}

export default function WebsiteManager() {
  const busyRef=useRef(false),listVersion=useRef(0),returnFocus=useRef(null),searchInput=useRef(null);
  const [websites,setWebsites]=useState([]);
  const [loading,setLoading]=useState(true),[busy,setBusy]=useState(false);
  const [error,setError]=useState(''),[syncError,setSyncError]=useState(''),[message,setMessage]=useState('');
  const [revision,setRevision]=useState(0),[query,setQuery]=useState(''),[selectedId,setSelectedId]=useState(null);
  useEffect(()=>{
    let active=true,refreshing=false;
    async function reload(initial=false){
      if(refreshing || busyRef.current)return;
      refreshing=true;
      const version=++listVersion.current;
      if(initial)setLoading(true);
      try{
        const data=await adminPlatformRequest('/api/platform/websites');
        if(active && version===listVersion.current){setWebsites(data.websites);setSyncError('');}
      }catch(error){if(active && version===listVersion.current)setSyncError(error.message);}
      finally{refreshing=false;if(active && initial)setLoading(false);}
    }
    reload(true);
    const stop=watchWebsiteSettings(()=>reload());
    return ()=>{active=false;stop();};
  },[revision]);
  const selected=websites.find(row=>row.site_id===selectedId);
  const filtered=filterAgentWebsites(websites,query);
  function open(siteId,button){returnFocus.current=button;setError('');setMessage('');setSelectedId(siteId);}
  function close(){setSelectedId(null);setError('');setMessage('');const target=returnFocus.current;requestAnimationFrame(()=>{if(target?.isConnected)target.focus();else searchInput.current?.focus();});}
  async function mutate(path,body){
    if(busyRef.current)return null;
    busyRef.current=true;listVersion.current++;setBusy(true);setError('');setMessage('');
    try{return await adminPlatformRequest(path,body);}
    catch(error){setError(error.message);return null;}
    finally{busyRef.current=false;setBusy(false);}
  }
  async function save(body){
    const result=await mutate('/api/platform/websites',body);
    if(!result)return null;
    const {website}=result;
    setWebsites(rows=>rows.map(row=>row.site_id===website.site_id?{...row,...website}:row));
    setMessage(body.action==='set-hostname'?'Website address saved. The agent portal refreshes automatically.':body.action==='set-domain-locked'?body.locked?'Domain locked. The agent must contact support to change it.':'Domain unlocked. The agent can change it.':body.enabled?'Website enabled.':'Public website disabled. The account and content are preserved.');
    notifyWebsiteSettingsChanged();
    return website;
  }
  async function regenerate(userId){
    const result=await mutate('/api/platform/agents',{action:'regenerate',userId});
    if(result)setMessage('New private onboarding link generated.');
    return result;
  }
  return <section className="platform-agents" aria-label="Agent websites"><div className="admin-account">
    <div className="platform-table-heading"><h2>Agent websites</h2><button type="button" className="admin-secondary" disabled={busy || loading} onClick={()=>setRevision(value=>value+1)}>Refresh</button></div>
    <p>Find an agent, then select Edit to manage their website and account setup.</p>
    <label htmlFor="agent-directory-search">Search by name or email</label><input ref={searchInput} id="agent-directory-search" type="search" value={query} onChange={event=>setQuery(event.target.value)} placeholder="Enter an agent name or login email" autoComplete="off"/>
    {syncError && <p className="admin-error" role="alert">{syncError}</p>}
    {loading && <p role="status">Loading agents…</p>}
    <p className="platform-help" role="status">{filtered.length} of {websites.length} agents</p>
    {filtered.length>0 && <AgentWebsiteTable websites={filtered} onEdit={open}/>}
    {!loading && !syncError && !filtered.length && <p>{websites.length?'No agents match this name or email.':'No agent websites found. Create an agent above to get started.'}</p>}
    {selected && <AgentWebsiteDialog key={selected.site_id} website={selected} busy={busy} error={error} message={message} save={save} regenerate={regenerate} onClose={close}/>}
  </div></section>;
}
