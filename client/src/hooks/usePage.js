import {useAgent} from '../context/AgentContext.js';
import { useEffect, useState } from 'react';
import { pageAtPath,pagePath,seoPages,PUBLIC_PAGES,PRIVATE_PAGES } from '../services/seo.js';
export function pageFromHash(hash) {
  return hash.replace(/^#\/?/, '').split('?')[0].replace(/\/$/, '') || 'home';
}
export default function usePage(initialPage) {
  const {seoPages:pages}=useAgent();
  const [route, setRoute] = useState(() => ({ page: initialPage || (globalThis.location?.hash?.startsWith('#/') ? pageFromHash(globalThis.location.hash) : PRIVATE_PAGES.includes(globalThis.location?.pathname.replace(/^\/|\/$/g,'')) ? globalThis.location.pathname.replace(/^\/|\/$/g,'') : pageAtPath(globalThis.__SITE_BOOTSTRAP__?.seoPages || seoPages(),globalThis.location?.pathname || '/')), key: 0 }));
  useEffect(() => {
    const updatePage = () => {
      const hashPage=pageFromHash(window.location.hash);
      if(window.location.hash.startsWith('#/') && PUBLIC_PAGES.some(([key])=>key===hashPage)){
        window.location.assign(pagePath(pages || globalThis.__SITE_BOOTSTRAP__?.seoPages,hashPage)+window.location.search);return;
      }
      setRoute(current => ({ page: pageFromHash(window.location.hash), key: current.key + 1 }));
      window.scrollTo({ top: 0, behavior: 'instant' });
    };
    const navigate = event => {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const anchor = event.target.closest('a[href]');
      if (!anchor || anchor.target || anchor.hasAttribute('download')) return;
      const href = anchor.getAttribute('href');
      if (!href.startsWith('#/')) return;
      event.preventDefault(); window.history.pushState(null, '', href); updatePage();
    };
    document.addEventListener('click', navigate);
    window.addEventListener('hashchange', updatePage);
    window.addEventListener('popstate', updatePage);
    return () => { document.removeEventListener('click', navigate); window.removeEventListener('hashchange', updatePage); window.removeEventListener('popstate', updatePage); };
  }, [pages]);
  if(!initialPage && globalThis.location && !globalThis.location.hash.startsWith('#/') && !PRIVATE_PAGES.includes(globalThis.location.pathname.replace(/^\/|\/$/g,'')))return {...route,page:pageAtPath(pages || globalThis.__SITE_BOOTSTRAP__?.seoPages || seoPages(),globalThis.location.pathname)};
  return route;
}
