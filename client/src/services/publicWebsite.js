import { selectedSiteId } from './siteRouting.js';
export function makePublicWebsiteLoader({ getClient, loadContent, defaultSiteId, platformHostname }) {
  return async function loadPublicWebsite(location) {
    const client = getClient();
    const host = location.hostname.toLowerCase();
    let siteId;
    if (host === platformHostname || ['localhost', '127.0.0.1', '[::1]'].includes(host)) {
      siteId = selectedSiteId(location.search, defaultSiteId);
    } else {
      // The hostname owns the site context. Ignore ?site= on agent domains.
      const { data, error } = await client.rpc('resolve_agent_hostname', { requested_hostname: host });
      if (error) throw Error('Unable to resolve website address.');
      siteId = data;
    }
    if (!siteId) return { exists: false };
    // This check also applies to signed-in owners, who may read unpublished
    // content in their editor under the separate owner SELECT policy.
    const { data: enabled, error } = await client.rpc('agent_website_is_active', { requested_site: siteId });
    if (error) throw Error('Unable to check website availability.');
    if (enabled !== true) return { exists: false };
    return { ...await loadContent(siteId), siteId };
  };
}
