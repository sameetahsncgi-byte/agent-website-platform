import test from 'node:test';
import assert from 'node:assert/strict';
import { defaultContent, validateContent, fromRow } from '../src/services/siteContent.js';
test('allows ordinary contact details and preserves line breaks', () => {
  const value = validateContent({ ...defaultContent, bio: ' My story\nSecond line ', linkedin: 'https://www.linkedin.com/in/example/' });
  assert.equal(value.bio, 'My story\nSecond line');
  assert.equal(value.linkedin, 'https://www.linkedin.com/in/example/');
});
test('rejects unsafe links, missing fields and oversized biographies', () => {
  for (const website of ['javascript:alert(1)', 'http://example.com', 'https://user:password@example.com', 'example.com']) assert.throws(() => validateContent({ ...defaultContent, website }));
  assert.throws(() => validateContent({ ...defaultContent, name: '  ' }), /Full name is required/);
  assert.throws(() => validateContent({ ...defaultContent, email: 'invalid' }), /valid public contact email/);
  assert.throws(() => validateContent({ ...defaultContent, bio: 'x'.repeat(2001) }), /2000/);
});
test('database mapping preserves intentionally cleared optional values', () => {
  const content = fromRow({ name: 'Jordan', brokerage: '', photo_path: 'user/photo.webp', about_story: 'Two\nparagraphs' });
  assert.equal(content.name, 'Jordan'); assert.equal(content.brokerage, '');
  assert.equal(content.photoPath, 'user/photo.webp'); assert.equal(content.aboutStory, 'Two\nparagraphs');
});
