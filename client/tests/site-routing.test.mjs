import test from 'node:test';
import assert from 'node:assert/strict';
import { selectedSiteId, websiteHref } from '../src/services/siteRouting.js';

test('each public URL selects its own website independently of login', () => {
  assert.equal(selectedSiteId('', 'site-agent001'), 'site-agent001');
  assert.equal(selectedSiteId('?site=site-jorden-muse', 'site-agent001'), 'site-jorden-muse');
  assert.equal(selectedSiteId('?site=site-other-agent', 'site-agent001'), 'site-other-agent');
});
test('invalid or ambiguous site addresses never silently use the default agent', () => {
  for (const search of ['?site=', '?site=../agent001', '?site=site-a&site=site-b', '?site=https://example.com', '?site=site-JORDEN', `?site=site-${'a'.repeat(130)}`]) {
    assert.throws(() => selectedSiteId(search, 'site-agent001'), /Invalid website/);
  }
});
test('dashboard links use the authenticated site and preserve it through public page navigation', () => {
  for (const page of ['home', 'about', 'contact', 'admin']) {
    const href = websiteHref('site-jorden-muse', page, '/');
    assert.equal(href, `/?site=site-jorden-muse#/${page}`);
    const url = new URL(href, 'https://example.com/?site=site-agent001#/admin?token_hash=private');
    assert.equal(url.searchParams.get('site'), 'site-jorden-muse');
    assert.equal(url.href.includes('token_hash'), false);
    url.hash = '#/contact';
    assert.equal(selectedSiteId(url.search, 'site-agent001'), 'site-jorden-muse');
  }
});
