import React from 'react';
import ReactDOM from 'react-dom/client';
import { ClerkProvider } from '@clerk/clerk-react';
import { BrowserRouter } from 'react-router-dom';
import { App } from './App';
import { ToastProvider } from './shared/components/Toast';
import { readRuntimeConfig } from './config/runtime';
import { productBrowserTitleForHostname } from './config/urls';
import { isLocalAuthBypassEnabled } from './auth/localDevAuth';
import './styles.css';

const clerkPublishableKey = readRuntimeConfig('VITE_CLERK_PUBLISHABLE_KEY')
  ?? readRuntimeConfig('CLERK_PUBLISHABLE_KEY');
const localAuthBypass = isLocalAuthBypassEnabled(window.location.hostname);
const isTestEnvironment = (import.meta as unknown as { env?: { MODE?: string } }).env?.MODE === 'test';

document.title = productBrowserTitleForHostname(window.location.hostname);

function MissingClerkConfig() {
  return (
    <div style={{ padding: '24px', fontFamily: 'system-ui, sans-serif' }}>
      Configure VITE_CLERK_PUBLISHABLE_KEY no ambiente do frontend.
    </div>
  );
}

export function AppRoot({
  clerkPublishableKey,
  localAuthBypass
}: {
  clerkPublishableKey: string | undefined;
  localAuthBypass: boolean;
}) {
  if (localAuthBypass && !clerkPublishableKey) {
    return (
      <BrowserRouter>
        <ToastProvider>
          <App />
        </ToastProvider>
      </BrowserRouter>
    );
  }

  if (clerkPublishableKey) {
    return (
      <ClerkProvider publishableKey={clerkPublishableKey} signInUrl="/" afterSignOutUrl="/">
        <BrowserRouter>
          <ToastProvider>
            <App />
          </ToastProvider>
        </BrowserRouter>
      </ClerkProvider>
    );
  }

  return <MissingClerkConfig />;
}

if (!isTestEnvironment) {
  ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
      <AppRoot clerkPublishableKey={clerkPublishableKey} localAuthBypass={localAuthBypass} />
    </React.StrictMode>
  );
}
