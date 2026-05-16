import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import React from 'react';
import { afterEach, beforeEach, vi } from 'vitest';

vi.mock('@clerk/clerk-react', () => ({
  ClerkProvider: ({ children }: { children: React.ReactNode }) => React.createElement(React.Fragment, null, children),
  SignIn: () => React.createElement('div', { 'data-testid': 'clerk-sign-in' }),
  useAuth: () => ({
    getToken: vi.fn().mockResolvedValue('test-clerk-token'),
    isLoaded: true,
    isSignedIn: true,
    signOut: vi.fn().mockResolvedValue(undefined)
  }),
  useUser: () => ({
    user: {
      id: 'user_test',
      fullName: 'Yohann Reimer',
      primaryEmailAddress: {
        emailAddress: 'yohannreimer20@gmail.com'
      }
    }
  })
}));

function createMemoryStorage(): Storage {
  const values = new Map<string, string>();
  return {
    get length() {
      return values.size;
    },
    clear() {
      values.clear();
    },
    getItem(key: string) {
      return values.has(key) ? values.get(key)! : null;
    },
    key(index: number) {
      return Array.from(values.keys())[index] ?? null;
    },
    removeItem(key: string) {
      values.delete(key);
    },
    setItem(key: string, value: string) {
      values.set(key, value);
    }
  };
}

function clearStorage(storage: Storage | undefined) {
  if (!storage) return;
  if (typeof storage.clear === 'function') {
    storage.clear();
    return;
  }
  for (let index = storage.length - 1; index >= 0; index -= 1) {
    const key = storage.key(index);
    if (key) storage.removeItem(key);
  }
}

beforeEach(() => {
  Object.defineProperty(window, 'localStorage', {
    value: createMemoryStorage(),
    configurable: true
  });
  Object.defineProperty(window, 'sessionStorage', {
    value: createMemoryStorage(),
    configurable: true
  });
});

afterEach(() => {
  cleanup();
  clearStorage(window.localStorage);
  clearStorage(window.sessionStorage);
});
