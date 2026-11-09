import { useEffect, useState } from 'react';
export function pageFromHash(hash) {
  return hash.replace(/^#\/?/, '').split('?')[0].replace(/\/$/, '') || 'home';
}
export default function usePage() {
  const [route, setRoute] = useState(() => ({ page: pageFromHash(window.location.hash), key: 0 }));
  useEffect(() => {
    const updatePage = () => {
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
  }, []);
  return route;
}
