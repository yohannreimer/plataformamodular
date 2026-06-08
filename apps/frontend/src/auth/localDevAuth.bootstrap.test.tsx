import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, test, vi } from 'vitest';

vi.mock('../App', () => ({
  App: () => <div>Demo app rendered</div>
}));

vi.mock('@clerk/clerk-react', () => ({
  ClerkProvider: () => {
    throw new Error('ClerkProvider should not render in local bypass without a Clerk key');
  }
}));

describe('local auth bypass bootstrap', () => {
  test('renders the app without a ClerkProvider when local bypass has no Clerk key', async () => {
    window.__PRYMEIRA_CONFIG__ = { VITE_LOCAL_AUTH_BYPASS: '1' };
    document.body.innerHTML = '<div id="root"></div>';

    const { AppRoot } = await import('../main');

    render(<AppRoot clerkPublishableKey={undefined} localAuthBypass={true} />);

    expect(screen.getByText('Demo app rendered')).toBeInTheDocument();
  });

  test('renders the missing Clerk config screen without local bypass or key', async () => {
    const { AppRoot } = await import('../main');

    render(<AppRoot clerkPublishableKey={undefined} localAuthBypass={false} />);

    expect(screen.getByText('Configure VITE_CLERK_PUBLISHABLE_KEY no ambiente do frontend.')).toBeInTheDocument();
  });
});
