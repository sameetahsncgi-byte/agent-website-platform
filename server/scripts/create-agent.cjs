const readline = require('node:readline/promises');
const fs = require('node:fs/promises');
const path = require('node:path');
const { passwordHash, readUsers, userFile } = require('../auth.cjs');
async function main() {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  console.log('Create a local demo agent. Password input is visible in this terminal.');
  try {
    const id = (await rl.question('Agent ID (e.g. agent001): ')).trim().toLowerCase();
    const name = (await rl.question('Agent name: ')).trim();
    const password = await rl.question('Password (12–128 characters): ');
    const confirm = await rl.question('Confirm password: ');
    if (!/^[a-z0-9_-]{3,40}$/.test(id)) throw Error('Use 3–40 letters, numbers, underscores, or hyphens for the ID.');
    if (!name || name.length > 100) throw Error('Enter a name up to 100 characters.');
    if (password.length < 12 || password.length > 128) throw Error('Password must contain 12–128 characters.');
    if (password !== confirm) throw Error('Passwords do not match.');
    const agents = await readUsers();
    if (agents.some(agent => agent.id === id)) throw Error('That agent ID already exists.');
    agents.push({ id, name, role: 'agent', siteId: `site-${id}`, active: true, ...await passwordHash(password) });
    await fs.mkdir(path.dirname(userFile), { recursive: true });
    await fs.writeFile(userFile, JSON.stringify(agents, null, 2), { mode: 0o600 });
    console.log(`Created ${id}. Start the backend, then open http://localhost:5173/#/admin`);
  } finally { rl.close(); }
}
main().catch(error => { console.error(error.message); process.exitCode = 1; });
