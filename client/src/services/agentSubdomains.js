export const AGENT_DOMAIN_SUFFIX = 'brokerage.sncgi.com';
export function defaultAgentHostname(slug) {
  if (typeof slug !== 'string' || !/^[a-z0-9][a-z0-9-]{1,38}[a-z0-9]$/.test(slug) || slug.includes('--')) throw Error('Invalid website handle.');
  return `${slug}.${AGENT_DOMAIN_SUFFIX}`;
}
export function defaultAgentUrl(slug) {
  return `https://${defaultAgentHostname(slug)}/`;
}
