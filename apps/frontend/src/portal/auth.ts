import type { PortalSessionData } from './types';

function storageKey(slug: string) {
  return `portal_auth_${slug}`;
}

export const portalSessionStore = {
  key: storageKey,
  save(slug: string, session: PortalSessionData) {
    const { token: _token, ...persistableSession } = session;
    window.localStorage.setItem(storageKey(slug), JSON.stringify(persistableSession));
  },
  read(slug: string): PortalSessionData | null {
    const raw = window.localStorage.getItem(storageKey(slug));
    if (!raw) return null;
    try {
      const parsed = JSON.parse(raw) as PortalSessionData;
      if (!parsed?.expires_at) return null;
      return parsed;
    } catch {
      return null;
    }
  },
  clear(slug: string) {
    window.localStorage.removeItem(storageKey(slug));
  }
};
