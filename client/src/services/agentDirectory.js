export function filterAgentWebsites(websites, query) {
  const search=String(query || '').trim().toLowerCase();
  if (!search) return websites;
  return websites.filter(agent=>[agent.name,agent.email].some(value=>String(value || '').toLowerCase().includes(search)));
}
export function agentAccountStatus(agent) {
  if (!agent.active) return agent.onboardingStatus==='invited' ? 'Setup pending' : 'Account access disabled';
  return 'Account ready';
}
export function agentWebsiteStatus(agent) {
  if (!agent.enabled) return 'Website disabled';
  return (agent.publicEligible ?? agent.active) ? 'Website live' : 'Website unavailable';
}
