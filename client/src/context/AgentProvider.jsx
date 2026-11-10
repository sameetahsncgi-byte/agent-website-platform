import { useEffect, useState } from 'react';
import { AgentContext } from './AgentContext.js';
import { defaultContent, loadContent } from '../services/siteContent.js';

export default function AgentProvider({ children }) {
  const [content, setContent] = useState(defaultContent);
  const [status, setStatus] = useState('loading');
  useEffect(() => {
    let active = true;
    let request = 0;
    async function reload() {
      const version = ++request;
      try {
        const result = await loadContent();
        if (active && version === request) { setContent(result.content); setStatus(result.exists ? 'ready' : 'missing'); }
      } catch { if (active && version === request) setStatus('error'); }
    }
    reload();
    window.addEventListener('agent-content-saved', reload);
    window.addEventListener('focus', reload);
    return () => { active = false; window.removeEventListener('agent-content-saved', reload); window.removeEventListener('focus', reload); };
  }, []);
  const name = content.name || defaultContent.name;
  const initials = name.trim().split(/\s+/).slice(0, 2).map(word => word[0]).join('').toUpperCase();
  return <AgentContext.Provider value={{ ...content, initials, contentStatus: status }}>{children}</AgentContext.Provider>;
}
