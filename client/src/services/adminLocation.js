// The management portal has one canonical origin. Never derive this from an
// agent hostname or user-controlled query parameters.
export const SUPER_ADMIN_ORIGIN = 'https://agent-website-platform.vercel.app';
export const SUPER_ADMIN_URL = `${SUPER_ADMIN_ORIGIN}/#/super-admin`;

export function isSuperAdminLocation(location = globalThis.location) {
  return location?.origin === SUPER_ADMIN_ORIGIN;
}
