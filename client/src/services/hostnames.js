export function normalizeHostname(value) {
  const host = typeof value === 'string' ? value.trim().toLowerCase() : '';
  if (host.length > 253 || !host.includes('.') || !host.split('.').every(label => /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(label)) || !/^[a-z]/.test(host.split('.').at(-1))) {
    throw Error('Enter only a hostname, such as yasir-agent-website-platform.vercel.app. Do not include https://, paths, ports or wildcards.');
  }
  return host;
}
