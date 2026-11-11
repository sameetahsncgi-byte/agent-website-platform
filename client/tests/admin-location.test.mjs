import test from 'node:test';
import assert from 'node:assert/strict';
import { isSuperAdminLocation, SUPER_ADMIN_URL } from '../src/services/adminLocation.js';

test('Super Admin accepts only the exact HTTPS platform origin', () => {
  assert.equal(isSuperAdminLocation(new URL(SUPER_ADMIN_URL)), true);
  for (const url of [
    'https://sameet.brokerage.sncgi.com/#/super-admin',
    'https://yasir.brokerage.sncgi.com/#/super-admin',
    'https://jorden-agent-website-platform.vercel.app/#/super-admin',
    'https://agent-website-platform-preview.vercel.app/#/super-admin',
    'http://agent-website-platform.vercel.app/#/super-admin',
    'https://agent-website-platform.vercel.app.evil.example/#/super-admin',
    'https://agent-website-platform.vercel.app:8443/#/super-admin',
    'http://localhost:5173/#/super-admin',
  ]) assert.equal(isSuperAdminLocation(new URL(url)), false, url);
  assert.equal(isSuperAdminLocation(null), false);
});

test('a blocked origin renders the canonical link without login or management controls', async () => {
  const { createServer } = await import('vite');
  const { renderToStaticMarkup } = await import('react-dom/server');
  const { createElement } = await import('react');
  const server = await createServer({ server: { middlewareMode: true }, appType: 'custom' });
  const previous = globalThis.location;
  try {
    const { default: SuperAdmin } = await server.ssrLoadModule('/src/pages/SuperAdmin.jsx');
    globalThis.location = new URL('https://sameet.brokerage.sncgi.com/#/super-admin');
    const html = renderToStaticMarkup(createElement(SuperAdmin));
    assert.match(html, /Super Admin is available only on the platform website/);
    assert.ok(html.includes(`href="${SUPER_ADMIN_URL}"`));
    assert.doesNotMatch(html, /<form|type="password"|Website management|Checking administrator access/);
    globalThis.location = new URL(SUPER_ADMIN_URL);
    const allowed = renderToStaticMarkup(createElement(SuperAdmin));
    assert.match(allowed, /Checking administrator access/);
    assert.doesNotMatch(allowed, /Super Admin is available only/);
  } finally {
    globalThis.location = previous;
    await server.close();
  }
});
