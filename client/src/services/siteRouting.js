const sitePattern = /^site-[a-z0-9]+(?:-[a-z0-9]+)*$/;
export function validSiteId(value) {
  return typeof value === 'string' && value.length <= 120 && sitePattern.test(value);
}
export function selectedSiteId(search, defaultSiteId) {
  const params = new URLSearchParams(search);
  const sites = params.getAll('site');
  if (sites.length > 1 || (sites.length === 1 && !validSiteId(sites[0]))) {
    throw Error('Invalid website address.');
  }
  const siteId = sites.length ? sites[0] : defaultSiteId;
  if (!validSiteId(siteId)) throw Error('Invalid website address.');
  return siteId;
}
// Each website gets a public URL on this deployment. Never copy an invitation
// token or another site's query string into dashboard links.
export function websiteHref(siteId, page = 'home', pathname = window.location.pathname) {
  if (!validSiteId(siteId)) throw Error('Invalid website identity.');
  if (!/^[a-z]+(?:-[a-z]+)*$/.test(page)) throw Error('Invalid page.');
  return `${pathname}?${new URLSearchParams({ site: siteId })}#/${page}`;
}
