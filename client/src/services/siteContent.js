import { getSupabase } from './supabase.js';
import { agent as defaults } from '../data/agent.js';

export const SITE_ID = import.meta.env?.VITE_AGENT_SITE_ID || 'site-agent001';
export const BUCKET = 'agent-images';
export const fields = {
  name: ['Full name', 100], professionalTitle: ['Professional title', 120],
  brokerage: ['Company / brokerage', 160], headline: ['Homepage headline', 180],
  bio: ['Short biography', 2000], aboutTitle: ['About section heading', 180],
  aboutIntro: ['About introduction', 2000], aboutStory: ['My story / approach', 10000],
  email: ['Public contact email', 254], phone: ['Phone number', 50],
  location: ['City / service area', 180], address: ['Office address', 400],
  website: ['Website link', 500], facebook: ['Facebook URL', 500],
  instagram: ['Instagram URL', 500], linkedin: ['LinkedIn URL', 500],
};
export const defaultContent = {
  ...defaults, professionalTitle: 'Real Estate Agent',
  aboutTitle: 'Your goals come first. Every step of the way.',
  aboutIntro: 'Home means something different to everyone. It might be a fresh start, room to grow, or a place that simply feels right.',
  aboutStory: 'From exploring neighborhoods to preparing for a sale, I focus on practical next steps that reflect your plans.',
  address: '', website: '', facebook: '', instagram: '', linkedin: '', photoPath: '', logoPath: '',
};
const column = key => key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
const keys = [...Object.keys(fields), 'photoPath', 'logoPath'];
const selection = ['site_id', 'updated_at', ...keys.map(column)].join(',');
export function fromRow(row) {
  return row ? { ...defaultContent, ...Object.fromEntries(keys.map(key => [key, row[column(key)] ?? ''])) } : { ...defaultContent };
}
export function validateContent(value) {
  const result = {};
  for (const [key, [label, limit]] of Object.entries(fields)) {
    result[key] = String(value[key] ?? '').trim();
    if (result[key].length > limit) throw Error(`${label} must be ${limit} characters or fewer.`);
  }
  for (const key of ['name', 'bio', 'email', 'phone', 'location']) {
    if (!result[key]) throw Error(`${fields[key][0]} is required.`);
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(result.email)) throw Error('Enter a valid public contact email.');
  for (const key of ['website', 'facebook', 'instagram', 'linkedin']) {
    if (!result[key]) continue;
    let url;
    try { url = new URL(result[key]); } catch { throw Error(`${fields[key][0]} must be a complete https:// URL.`); }
    if (url.protocol !== 'https:' || url.username || url.password) throw Error(`${fields[key][0]} must use https:// without login details.`);
  }
  return result;
}
export function imageUrl(path) {
  return path ? getSupabase().storage.from(BUCKET).getPublicUrl(path).data.publicUrl : '';
}
export async function loadContent(siteId = SITE_ID) {
  const { data, error } = await getSupabase().from('agent_site_content').select(selection).eq('site_id', siteId).maybeSingle();
  if (error) throw Error('Unable to load website content. Run setup-content.sql in Supabase and check your connection.');
  return { content: fromRow(data), exists: Boolean(data) };
}
export async function prepareImage(file) {
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) throw Error('Choose a JPG, PNG, or WebP image.');
  if (!file.size || file.size > 5 * 1024 * 1024) throw Error('Choose an image smaller than 5 MB.');
  const bitmap = await createImageBitmap(file).catch(() => { throw Error('This image could not be opened. Choose another image.'); });
  try {
    const ratio = Math.min(1, 1200 / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(bitmap.width * ratio));
    canvas.height = Math.max(1, Math.round(bitmap.height * ratio));
    canvas.getContext('2d').drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/webp', 0.82));
    if (!blob || blob.type !== 'image/webp' || blob.size > 1024 * 1024) throw Error('Please choose a smaller image. The optimized image must be under 1 MB.');
    return blob;
  } finally { bitmap.close(); }
}
export async function saveContent(siteId, value, files = {}, previous = {}) {
  const content = validateContent(value);
  const client = getSupabase();
  const { data, error } = await client.auth.getUser();
  if (error || !data.user) throw Error('Your session expired. Please sign in again.');
  const uploaded = [];
  const obsolete = [];
  const paths = {};
  try {
    for (const kind of ['photo', 'logo']) {
      const key = `${kind}Path`;
      paths[key] = value[key] || '';
      if (files[kind]) {
        const path = `${data.user.id}/${kind}-${crypto.randomUUID()}.webp`;
        const { error: uploadError } = await client.storage.from(BUCKET).upload(path, files[kind], { contentType: 'image/webp', upsert: false });
        if (uploadError) throw Error(`Unable to upload ${kind}. Check the image bucket setup and your connection.`);
        uploaded.push(path);
        paths[key] = path;
      }
      if (previous[key] && previous[key] !== paths[key]) obsolete.push(previous[key]);
    }
    const row = { site_id: siteId, ...Object.fromEntries(Object.entries({ ...content, ...paths }).map(([key, val]) => [column(key), val])) };
    const { data: saved, error: saveError } = await client.from('agent_site_content').upsert(row, { onConflict: 'site_id' }).select(selection).single();
    if (saveError) throw Error('Changes were not published. Check that your agent account is active and setup-content.sql has been run.');
    // Database commit succeeds before previously published images are removed.
    let cleanupWarning = false;
    if (obsolete.length) {
      try { const { error } = await client.storage.from(BUCKET).remove(obsolete); cleanupWarning = Boolean(error); }
      catch { cleanupWarning = true; }
    }
    window.dispatchEvent(new Event('agent-content-saved'));
    return { content: fromRow(saved), cleanupWarning };
  } catch (error) {
    if (uploaded.length) {
      try { await client.storage.from(BUCKET).remove(uploaded); } catch { /* Keep the original publish error. */ }
    }
    throw error;
  }
}
