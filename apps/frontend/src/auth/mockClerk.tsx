import type { ReactNode } from 'react';

export function ClerkProvider({ children }: { children: ReactNode }) {
  return <>{children}</>;
}

export function SignIn() {
  return null;
}

export function useAuth() {
  return {
    getToken: async () => 'local-dev-auth-bypass',
    isLoaded: true,
    isSignedIn: true,
    signOut: async () => undefined
  };
}

export function useUser() {
  return {
    user: {
      id: 'iuser-supremo-default',
      fullName: 'Dev Financeiro',
      primaryEmailAddress: {
        emailAddress: 'local.dev@prymeira.test'
      }
    }
  };
}
