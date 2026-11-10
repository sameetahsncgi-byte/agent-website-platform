import { useEffect, useState } from 'react';
import { AgentContext } from './AgentContext.js';
import { getSupabase } from '../services/supabase.js';
import { makePublicWebsiteLoader } from '../services/publicWebsite.js';
import { PLATFORM_HOSTNAME } from '../services/siteRouting.js';
import { defaultContent, loadContent, SITE_ID } from '../services/siteContent.js';

const loadPublicWebsite = makePublicWebsiteLoader({ getClient: getSupabase, loadContent, defaultSiteId: SITE_ID, platformHostname: PLATFORM_HOSTNAME });

export default function AgentProvider({ children }) {
  const [content, setContent] = useState(defaultContent);
  const [status, setStatus] = useState('loading');
  useEffect(() => {
    let active = true;
    let request = 0;
    async function reload() {
      const version = ++request;
      try {
        const result = await loadPublicWebsite(window.location);
        if (active && version === request) { if (result.content) setContent(result.content); setStatus(result.exists ? 'ready' : 'missing'); }
      } catch { if (active && version === request) setStatus('error'); }
    }
    reload();
    const timer = window.setInterval(() => { if (document.visibilityState === 'visible') reload(); }, 30000);
    window.addEventListener('agent-content-saved', reload);
    window.addEventListener('focus', reload);
    return () => { active = false; window.clearInterval(timer); window.removeEventListener('agent-content-saved', reload); window.removeEventListener('focus', reload); };
  }, []);
  const name = content.name || defaultContent.name;
  const initials = name.trim().split(/\s+/).slice(0, 2).map(word => word[0]).join('').toUpperCase();
  return <AgentContext.Provider value={{ ...content, initials, contentStatus: status }}>{children}</AgentContext.Provider>;
}
